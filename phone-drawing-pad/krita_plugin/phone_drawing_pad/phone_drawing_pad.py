import json
import socket
import sys
import time
import traceback
from typing import Optional, Tuple

from PyQt5.QtCore import QObject, QThread, pyqtSignal, pyqtSlot, Qt, QPointF, QByteArray
from PyQt5.QtGui import QImage, QPainter, QPen, QColor, QBrush
from krita import Extension, Krita


class WebSocketWorkerThread(QThread):
    """
    Background worker thread handling the WebSocket connection to the Phone Drawing Pad server.
    Emits Qt signals when connection status changes or stroke events arrive.
    """
    signal_status = pyqtSignal(bool, str)     # (is_connected, log_message)
    signal_stroke_event = pyqtSignal(dict)    # (event_dict)

    def __init__(self, host: str = "127.0.0.1", port: int = 8080, parent=None):
        super().__init__(parent)
        self.host = host
        self.port = port
        self.running = True
        self.sock: Optional[socket.socket] = None
        self.is_connected = False

    def stop(self):
        """Signals the thread to disconnect and stop running."""
        self.running = False
        self.close_socket()

    def close_socket(self):
        if self.sock:
            try:
                self.sock.shutdown(socket.SHUT_RDWR)
            except Exception:
                pass
            try:
                self.sock.close()
            except Exception:
                pass
            self.sock = None

    def make_websocket_frame(self, payload_str: str) -> bytes:
        """Encodes text payload into a masked WebSocket client frame."""
        data = payload_str.encode('utf-8')
        length = len(data)
        hdr = bytearray([0x81]) # FIN + Text frame
        mask = bytes([0x35, 0x91, 0x12, 0x74]) # 4-byte masking key

        if length < 126:
            hdr.append(0x80 | length)
        elif length <= 65535:
            hdr.append(0x80 | 126)
            hdr.extend(length.to_bytes(2, byteorder='big'))
        else:
            hdr.append(0x80 | 127)
            hdr.extend(length.to_bytes(8, byteorder='big'))

        hdr.extend(mask)
        masked = bytearray(length)
        for i in range(length):
            masked[i] = data[i] ^ mask[i % 4]
        return bytes(hdr + masked)

    def read_exact(self, num_bytes: int, leftover_buf: bytearray) -> Optional[bytes]:
        """Reads exactly num_bytes from leftover_buf or from the socket."""
        while len(leftover_buf) < num_bytes:
            if not self.sock or not self.running:
                return None
            try:
                chunk = self.sock.recv(4096)
                if not chunk:
                    return None
                leftover_buf.extend(chunk)
            except (socket.timeout, BlockingIOError):
                continue
            except Exception:
                return None

        result = bytes(leftover_buf[:num_bytes])
        del leftover_buf[:num_bytes]
        return result

    def read_websocket_frame(self, leftover_buf: bytearray) -> Optional[str]:
        """Reads and decodes a single WebSocket text frame."""
        hdr = self.read_exact(2, leftover_buf)
        if not hdr:
            return None

        b1, b2 = hdr[0], hdr[1]
        opcode = b1 & 0x0F

        # 0x8 = Connection Close
        if opcode == 0x8:
            return None

        is_masked = bool(b2 & 0x80)
        length = b2 & 0x7F

        if length == 126:
            len_bytes = self.read_exact(2, leftover_buf)
            if not len_bytes:
                return None
            length = int.from_bytes(len_bytes, byteorder='big')
        elif length == 127:
            len_bytes = self.read_exact(8, leftover_buf)
            if not len_bytes:
                return None
            length = int.from_bytes(len_bytes, byteorder='big')

        mask_key = None
        if is_masked:
            mask_key = self.read_exact(4, leftover_buf)
            if not mask_key:
                return None

        payload_bytes = self.read_exact(length, leftover_buf)
        if payload_bytes is None:
            return None

        if is_masked and mask_key:
            unmasked = bytearray(len(payload_bytes))
            for i in range(len(payload_bytes)):
                unmasked[i] = payload_bytes[i] ^ mask_key[i % 4]
            payload_bytes = bytes(unmasked)

        try:
            return payload_bytes.decode('utf-8')
        except UnicodeDecodeError:
            return None

    def run(self):
        """Main socket client loop."""
        while self.running:
            self.is_connected = False
            try:
                self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                self.sock.settimeout(5.0)
                self.sock.connect((self.host, self.port))

                # Send WebSocket HTTP Upgrade Handshake
                handshake_req = (
                    f"GET /ws?role=krita HTTP/1.1\r\n"
                    f"Host: {self.host}:{self.port}\r\n"
                    f"Upgrade: websocket\r\n"
                    f"Connection: Upgrade\r\n"
                    f"Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n"
                    f"Sec-WebSocket-Version: 13\r\n\r\n"
                )
                self.sock.sendall(handshake_req.encode('utf-8'))

                # Read HTTP Response Headers
                buf = bytearray()
                while b"\r\n\r\n" not in buf:
                    if not self.running:
                        return
                    try:
                        chunk = self.sock.recv(2048)
                        if not chunk:
                            raise ConnectionError("Server closed connection during handshake")
                        buf.extend(chunk)
                    except socket.timeout:
                        continue

                header_end = buf.find(b"\r\n\r\n") + 4
                headers_str = buf[:header_end].decode('utf-8', errors='ignore')
                leftover_buf = buf[header_end:]

                if "101" not in headers_str.split('\r\n')[0]:
                    raise ConnectionError(f"Server rejected WebSocket upgrade: {headers_str.splitlines()[0]}")

                # Send client identification payload
                init_payload = json.dumps({"type": "client", "client": "krita"})
                self.sock.sendall(self.make_websocket_frame(init_payload))

                self.is_connected = True
                self.signal_status.emit(True, f"Connected to server at {self.host}:{self.port}")

                # Receive frames
                self.sock.settimeout(1.0)
                while self.running and self.is_connected:
                    frame_str = self.read_websocket_frame(leftover_buf)
                    if frame_str is None:
                        break

                    try:
                        event_data = json.loads(frame_str)
                        self.signal_stroke_event.emit(event_data)
                    except json.JSONDecodeError:
                        continue

            except Exception as err:
                if self.running:
                    self.signal_status.emit(False, f"Connection error: {err}")
            finally:
                self.is_connected = False
                self.close_socket()

            if not self.running:
                break

            # Pause before attempting reconnect
            time.sleep(2.0)

        self.signal_status.emit(False, "Worker thread stopped.")


class PhoneDrawingPadExtension(Extension):
    """
    Krita Python Extension for Phone Drawing Pad.
    Receives stroke events from the WebSocket worker thread and renders lines onto the active Krita paint layer.
    """
    def __init__(self, parent=None):
        super().__init__(parent)
        self.is_phone_drawing_pad = True
        self.worker: Optional[WebSocketWorkerThread] = None
        self.active_docker = None
        self.last_point: Optional[Tuple[float, float]] = None
        self.warned_no_doc = False
        self.warned_no_paint_layer = False

    def setup(self):
        """Called by Krita on application startup."""
        pass

    def connect_server(self, host: str, port: int, docker=None):
        """Starts WebSocket connection worker thread."""
        self.active_docker = docker
        self.disconnect_server()

        self.warned_no_doc = False
        self.warned_no_paint_layer = False

        self.worker = WebSocketWorkerThread(host, port)
        self.worker.signal_status.connect(self.on_worker_status)
        self.worker.signal_stroke_event.connect(self.on_stroke_event)
        self.worker.start()

    def disconnect_server(self):
        """Stops WebSocket connection worker thread."""
        if self.worker:
            self.worker.signal_status.disconnect()
            self.worker.signal_stroke_event.disconnect()
            self.worker.stop()
            self.worker.wait(1000)
            self.worker = None

        if self.active_docker:
            self.active_docker.update_status(False, "Disconnected from server.")

    @pyqtSlot(bool, str)
    def on_worker_status(self, is_connected: bool, message: str):
        if self.active_docker:
            self.active_docker.update_status(is_connected, message)

    @pyqtSlot(dict)
    def on_stroke_event(self, data: dict):
        """Slot executed on main thread when a stroke event arrives from WebSocket."""
        event_type = data.get("type")
        if not event_type:
            return

        app = Krita.instance()
        doc = app.activeDocument()

        # Error Handling: Active document check
        if doc is None:
            if not self.warned_no_doc:
                self.warned_no_doc = True
                if self.active_docker:
                    self.active_docker.append_log("Warning: No active document open in Krita.")
            return
        else:
            self.warned_no_doc = False

        node = doc.activeNode()

        # Error Handling: Active paint layer check
        if node is None:
            if not self.warned_no_paint_layer:
                self.warned_no_paint_layer = True
                if self.active_docker:
                    self.active_docker.append_log("Warning: No layer selected in Krita.")
            return
        elif node.type() != "paintlayer":
            if not self.warned_no_paint_layer:
                self.warned_no_paint_layer = True
                if self.active_docker:
                    self.active_docker.append_log(f"Warning: Selected layer '{node.name()}' is a {node.type()}, not a paint layer.")
            return
        else:
            self.warned_no_paint_layer = False

        doc_w = doc.width()
        doc_h = doc.height()
        if doc_w <= 0 or doc_h <= 0:
            return

        color_hex = str(data.get("color", "#000000"))
        size = float(data.get("size", 5.0))

        # Reset stroke tracking on end or clear
        if event_type == "stroke_end" or event_type == "clear":
            self.last_point = None
            return

        # Extract normalized points array
        points = data.get("points", [])
        if not points and ("x" in data and "y" in data):
            points = [{"x": data["x"], "y": data["y"]}]

        if not points:
            return

        # Process and draw incoming points
        for pt in points:
            try:
                nx = float(pt.get("x", 0.0))
                ny = float(pt.get("y", 0.0))
            except (ValueError, TypeError):
                continue

            kx = nx * doc_w
            ky = ny * doc_h

            if event_type == "stroke_start" and self.last_point is None:
                self.last_point = (kx, ky)

            if self.last_point is None:
                self.last_point = (kx, ky)
            else:
                self.draw_line_segment(node, doc, self.last_point[0], self.last_point[1], kx, ky, color_hex, size)
                self.last_point = (kx, ky)

    def draw_line_segment(self, node, doc, x1: float, y1: float, x2: float, y2: float, color_hex: str = "#000000", size: float = 5.0):
        """
        Renders a line segment onto the active paint layer using QPainter anti-aliased rasterization.
        Updates Krita layer pixel data and refreshes doc projection.
        """
        doc_w = doc.width()
        doc_h = doc.height()

        pad = max(4, int(size) + 4)
        left = max(0, int(min(x1, x2) - pad))
        top = max(0, int(min(y1, y2) - pad))
        right = min(doc_w, int(max(x1, x2) + pad + 1))
        bottom = min(doc_h, int(max(y1, y2) + pad + 1))

        w = right - left
        h = bottom - top
        if w <= 0 or h <= 0:
            return

        existing_bytes = node.pixelData(left, top, w, h)
        if not existing_bytes or len(existing_bytes) != w * h * 4:
            img = QImage(w, h, QImage.Format_ARGB32)
            img.fill(Qt.transparent)
        else:
            img = QImage(bytes(existing_bytes), w, h, QImage.Format_RGBA8888).copy()

        painter = QPainter(img)
        painter.setRenderHint(QPainter.Antialiasing, True)

        pen = QPen(QColor(color_hex), float(size), Qt.SolidLine, Qt.RoundCap, Qt.RoundJoin)
        painter.setPen(pen)

        lx1 = x1 - left
        ly1 = y1 - top
        lx2 = x2 - left
        ly2 = y2 - top

        if abs(lx2 - lx1) < 0.1 and abs(ly2 - ly1) < 0.1:
            painter.setBrush(QBrush(QColor(color_hex)))
            painter.drawEllipse(QPointF(lx1, ly1), size / 2.0, size / 2.0)
        else:
            painter.drawLine(QPointF(lx1, ly1), QPointF(lx2, ly2))

        painter.end()

        ptr = img.bits()
        ptr.setsize(img.byteCount())
        new_bytes = QByteArray(bytes(ptr))

        node.setPixelData(new_bytes, left, top, w, h)
        doc.refreshProjection()
