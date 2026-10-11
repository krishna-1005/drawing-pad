import asyncio
import json
import logging
import re
import socket
from pathlib import Path
from typing import Dict, Any, Set, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger("phone_drawing_pad")

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Phone Drawing Pad", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_no_cache_headers(request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

# Setup base directory paths
BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"
PHONE_DIR = FRONTEND_DIR / "phone"
LAPTOP_DIR = FRONTEND_DIR / "laptop"

# Live dynamic HTML endpoints with cache busting
@app.get("/laptop")
@app.get("/laptop/")
async def serve_laptop():
    index_file = LAPTOP_DIR / "index.html"
    if not index_file.exists():
        raise HTTPException(status_code=404, detail="Laptop UI not found")
    content = index_file.read_text(encoding="utf-8")
    mtime = int(index_file.stat().st_mtime)
    content = re.sub(r'style\.css(?:\?[^"]*)?', f'style.css?v={mtime}', content)
    content = re.sub(r'app\.js(?:\?[^"]*)?', f'app.js?v={mtime}', content)
    return HTMLResponse(
        content,
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )

@app.get("/phone")
@app.get("/phone/")
async def serve_phone():
    index_file = PHONE_DIR / "index.html"
    if not index_file.exists():
        raise HTTPException(status_code=404, detail="Phone UI not found")
    content = index_file.read_text(encoding="utf-8")
    mtime = int(index_file.stat().st_mtime)
    content = re.sub(r'style\.css(?:\?[^"]*)?', f'style.css?v={mtime}', content)
    content = re.sub(r'app\.js(?:\?[^"]*)?', f'app.js?v={mtime}', content)
    return HTMLResponse(
        content,
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )

# Mount static file directories
if PHONE_DIR.exists():
    app.mount("/static/phone", StaticFiles(directory=str(PHONE_DIR)), name="static_phone")
    app.mount("/phone", StaticFiles(directory=str(PHONE_DIR), html=True), name="phone_page")
if LAPTOP_DIR.exists():
    app.mount("/static/laptop", StaticFiles(directory=str(LAPTOP_DIR)), name="static_laptop")
    app.mount("/laptop", StaticFiles(directory=str(LAPTOP_DIR), html=True), name="laptop_page")


def get_local_ip() -> str:
    """
    Finds the laptop's primary local IPv4 address connected to the Wi-Fi/LAN network.
    """
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Connecting to a public IP doesn't send data, but selects the active network interface IP
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = "127.0.0.1"
    finally:
        s.close()
    return ip


def print_startup_banner(port: int = 8080):
    """
    Displays the network connection banner in the console.
    """
    ip = get_local_ip()
    banner = f"""
========================================
 PHONE DRAWING PAD
========================================

Laptop interface:
http://{ip}:{port}/laptop

Phone interface:
http://{ip}:{port}/phone

Make sure both devices are connected
to the same Wi-Fi network.
========================================
"""
    print(banner)
    logger.info(f"Server started on http://{ip}:{port}")


# Connection Manager for WebSockets
class ConnectionManager:
    def __init__(self):
        self.phone_connections: Set[WebSocket] = set()
        self.laptop_connections: Set[WebSocket] = set()
        self.krita_connections: Set[WebSocket] = set()
        self.current_image_state: Optional[Dict[str, Any]] = None

    async def connect(self, websocket: WebSocket, role: str):
        await websocket.accept()
        if role == "phone":
            self.phone_connections.add(websocket)
            logger.info(f"Phone connected. Total phones: {len(self.phone_connections)}")
            await self.broadcast_status()
        elif role == "laptop":
            self.laptop_connections.add(websocket)
            logger.info(f"Laptop connected. Total laptops: {len(self.laptop_connections)}")
            await self.send_status(websocket)
        elif role == "krita":
            self.krita_connections.add(websocket)
            logger.info(f"Krita connected. Total Krita clients: {len(self.krita_connections)}")
            await self.send_status(websocket)

        # Sync active background image if one exists
        if self.current_image_state:
            try:
                await websocket.send_text(json.dumps(self.current_image_state))
            except Exception:
                pass

    def disconnect(self, websocket: WebSocket, role: str):
        if role == "phone" and websocket in self.phone_connections:
            self.phone_connections.remove(websocket)
            logger.info(f"Phone disconnected. Remaining phones: {len(self.phone_connections)}")
            asyncio.create_task(self.broadcast_status())
        elif role == "laptop" and websocket in self.laptop_connections:
            self.laptop_connections.remove(websocket)
            logger.info(f"Laptop disconnected. Remaining laptops: {len(self.laptop_connections)}")
        elif role == "krita" and websocket in self.krita_connections:
            self.krita_connections.remove(websocket)
            logger.info(f"Krita disconnected. Remaining Krita clients: {len(self.krita_connections)}")
            asyncio.create_task(self.broadcast_status())

    async def broadcast_status(self):
        """Broadcasts current phone/laptop/krita connection counts to all display clients."""
        status_payload = json.dumps({
            "type": "status",
            "phone_connected": len(self.phone_connections) > 0,
            "phone_count": len(self.phone_connections),
            "laptop_count": len(self.laptop_connections),
            "krita_count": len(self.krita_connections)
        })
        disconnected = set()
        for client_ws in (self.laptop_connections | self.krita_connections):
            try:
                await client_ws.send_text(status_payload)
            except Exception:
                disconnected.add(client_ws)
        
        for ws in disconnected:
            self.laptop_connections.discard(ws)
            self.krita_connections.discard(ws)

    async def send_status(self, websocket: WebSocket):
        status_payload = json.dumps({
            "type": "status",
            "phone_connected": len(self.phone_connections) > 0,
            "phone_count": len(self.phone_connections),
            "laptop_count": len(self.laptop_connections),
            "krita_count": len(self.krita_connections)
        })
        try:
            await websocket.send_text(status_payload)
        except Exception:
            pass

    async def broadcast_stroke(self, message: str, sender: WebSocket):
        """Relays stroke payload from a phone to all connected laptop and Krita clients."""
        disconnected = set()
        for client_ws in (self.laptop_connections | self.krita_connections):
            try:
                await client_ws.send_text(message)
            except Exception:
                disconnected.add(client_ws)

        for ws in disconnected:
            self.laptop_connections.discard(ws)
            self.krita_connections.discard(ws)

    async def broadcast_to_others(self, message: str, sender: WebSocket):
        """Relays payload to all other connected clients regardless of role."""
        all_clients = (self.phone_connections | self.laptop_connections | self.krita_connections)
        disconnected = set()
        for client_ws in all_clients:
            if client_ws == sender:
                continue
            try:
                await client_ws.send_text(message)
            except Exception:
                disconnected.add(client_ws)

        for ws in disconnected:
            self.phone_connections.discard(ws)
            self.laptop_connections.discard(ws)
            self.krita_connections.discard(ws)


manager = ConnectionManager()

# Basic WebSocket validation helpers
HEX_COLOR_REGEX = re.compile(r"^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$")
VALID_BRUSHES = {"pen", "pencil", "marker", "soft", "airbrush", "eraser", "bucket", "shape"}
VALID_SHAPES = {"circle", "rectangle", "line", "arrow", "triangle", "star", "diamond"}
VALID_SMOOTHING = {"off", "low", "medium", "high"}

def validate_stroke_event(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Validates and sanitizes incoming stroke and control events from WebSocket clients.
    Returns cleaned dict or None if invalid.
    """
    if not isinstance(data, dict):
        return None
    
    event_type = data.get("type")
    valid_types = {
        "stroke_start", "stroke_points", "stroke", "stroke_end", 
        "undo", "redo", "clear", "sync_history", "ping", "client",
        "import_image", "clear_image", "tool_update", "pointer_hover",
        "fill", "shape_preview"
    }
    if event_type not in valid_types:
        return None

    # Handle live interactive shape preview streaming
    if event_type == "shape_preview":
        raw_points = data.get("points", [])
        clean_points = []
        if isinstance(raw_points, list):
            for pt in raw_points[:120]:
                if isinstance(pt, dict):
                    x = max(-0.5, min(1.5, float(pt.get("x", 0.0))))
                    y = max(-0.5, min(1.5, float(pt.get("y", 0.0))))
                    clean_points.append({"x": round(x, 6), "y": round(y, 6), "pressure": 0.8})
        shape = str(data.get("shape", "circle"))
        if shape not in VALID_SHAPES:
            shape = "circle"
        color = str(data.get("color", "#ffffff"))
        if not HEX_COLOR_REGEX.match(color):
            color = "#ffffff"
        return {
            "type": "shape_preview",
            "shape": shape,
            "color": color,
            "size": round(max(1.0, min(200.0, float(data.get("size", 12)))), 2),
            "opacity": round(max(0.0, min(1.0, float(data.get("opacity", 1.0)))), 3),
            "points": clean_points
        }

    # Handle image import & clear events
    if event_type == "import_image":
        data_url = data.get("data_url", "")
        if not isinstance(data_url, str) or not (data_url.startswith("data:image/") or data_url.startswith("data:application/octet-stream")):
            return None
        w = max(1.0, float(data.get("width", 800)))
        h = max(1.0, float(data.get("height", 600)))
        aspect = float(data.get("aspect_ratio", w / h))
        return {
            "type": "import_image",
            "data_url": data_url,
            "width": w,
            "height": h,
            "aspect_ratio": aspect,
            "fit": str(data.get("fit", "contain")),
            "opacity": max(0.0, min(1.0, float(data.get("opacity", 1.0))))
        }

    if event_type == "clear_image":
        return {"type": "clear_image"}

    # Handle tool and brush settings synchronization across devices
    if event_type == "tool_update":
        brush = str(data.get("brush", "pen"))
        if brush not in VALID_BRUSHES:
            brush = "pen"
        color = str(data.get("color", "#ffffff"))
        if not HEX_COLOR_REGEX.match(color):
            color = "#ffffff"
        size = max(1.0, min(200.0, float(data.get("size", 12))))
        opacity = max(0.0, min(1.0, float(data.get("opacity", 1.0))))
        smoothing = str(data.get("smoothing", "medium"))
        if smoothing not in VALID_SMOOTHING:
            smoothing = "medium"
        res = {
            "type": "tool_update",
            "brush": brush,
            "color": color,
            "size": round(size, 2),
            "opacity": round(opacity, 3),
            "smoothing": smoothing
        }
        if "shape" in data:
            shape = str(data["shape"])
            if shape in VALID_SHAPES:
                res["shape"] = shape
        return res

    if event_type == "pointer_hover":
        return {
            "type": "pointer_hover",
            "x": round(float(data.get("x", 0.0)), 6),
            "y": round(float(data.get("y", 0.0)), 6),
            "pressure": round(max(0.0, min(1.0, float(data.get("pressure", 0.0)))), 4),
            "tilt_x": round(float(data.get("tilt_x", 0.0)), 2),
            "tilt_y": round(float(data.get("tilt_y", 0.0)), 2),
            "angle": round(float(data.get("angle", 0.0)), 2),
            "tilt": round(float(data.get("tilt", 0.0)), 2),
            "size": round(max(1.0, min(200.0, float(data.get("size", 12)))), 2),
            "brush": str(data.get("brush", "pen"))
        }

    if event_type == "fill":
        color = str(data.get("color", "#ffffff"))
        if not HEX_COLOR_REGEX.match(color):
            color = "#ffffff"
        return {
            "type": "fill",
            "stroke_id": str(data.get("stroke_id", "")),
            "x": round(float(data.get("x", 0.0)), 6),
            "y": round(float(data.get("y", 0.0)), 6),
            "color": color,
            "tolerance": int(data.get("tolerance", 32)),
            "layerId": str(data.get("layerId", "layer-2"))
        }

    # Handle simple control events
    if event_type in ["ping", "clear", "undo", "redo"]:
        return {"type": event_type}

    if event_type == "stroke_end":
        return {
            "type": "stroke_end",
            "stroke_id": str(data.get("stroke_id", ""))
        }

    if event_type == "client":
        return {
            "type": "client",
            "client": str(data.get("client", "krita"))
        }

    # Handle full history sync
    if event_type == "sync_history":
        strokes = data.get("strokes")
        if not isinstance(strokes, list):
            return None
        return {
            "type": "sync_history",
            "phone_width": float(data.get("phone_width", 390)),
            "phone_height": float(data.get("phone_height", 844)),
            "aspect_ratio": float(data.get("aspect_ratio", 0.462)),
            "strokes": strokes[:500]  # Cap history length
        }

    # Validate stroke / stroke_start / stroke_points
    try:
        stroke_id = str(data.get("stroke_id", ""))
        brush = str(data.get("brush", "pen"))
        if brush not in VALID_BRUSHES:
            brush = "pen"

        color = str(data.get("color", "#000000"))
        if not HEX_COLOR_REGEX.match(color):
            color = "#000000"

        size = max(1.0, min(200.0, float(data.get("size", 12))))
        opacity = max(0.0, min(1.0, float(data.get("opacity", 1.0))))
        pressure_enabled = bool(data.get("pressure_enabled", True))
        
        smoothing = str(data.get("smoothing", "medium"))
        if smoothing not in VALID_SMOOTHING:
            smoothing = "medium"

        phone_width = float(data.get("phone_width", 390.0))
        phone_height = float(data.get("phone_height", 844.0))
        aspect_ratio = float(data.get("aspect_ratio", phone_width / max(1.0, phone_height)))

        # Points array validation
        raw_points = data.get("points", [])
        clean_points = []
        if isinstance(raw_points, list):
            for pt in raw_points[:100]: # Cap points per packet
                if isinstance(pt, dict):
                    x = max(-0.5, min(1.5, float(pt.get("x", 0.0))))
                    y = max(-0.5, min(1.5, float(pt.get("y", 0.0))))
                    pressure = max(0.0, min(1.0, float(pt.get("pressure", 0.5))))
                    pt_dict = {
                        "x": round(x, 6),
                        "y": round(y, 6),
                        "pressure": round(pressure, 4)
                    }
                    if "tilt_x" in pt:
                        pt_dict["tilt_x"] = round(float(pt["tilt_x"]), 2)
                    if "tilt_y" in pt:
                        pt_dict["tilt_y"] = round(float(pt["tilt_y"]), 2)
                    if "angle" in pt:
                        pt_dict["angle"] = round(float(pt["angle"]), 2)
                    if "tilt" in pt:
                        pt_dict["tilt"] = round(float(pt["tilt"]), 2)
                    clean_points.append(pt_dict)

        # Single point fallback for legacy stroke event
        if not clean_points and ("x" in data and "y" in data):
            x = max(-0.5, min(1.5, float(data.get("x", 0.0))))
            y = max(-0.5, min(1.5, float(data.get("y", 0.0))))
            pressure = max(0.0, min(1.0, float(data.get("pressure", 0.5))))
            pt_dict = {
                "x": round(x, 6),
                "y": round(y, 6),
                "pressure": round(pressure, 4)
            }
            if "tilt_x" in data:
                pt_dict["tilt_x"] = round(float(data["tilt_x"]), 2)
            if "tilt_y" in data:
                pt_dict["tilt_y"] = round(float(data["tilt_y"]), 2)
            if "angle" in data:
                pt_dict["angle"] = round(float(data["angle"]), 2)
            if "tilt" in data:
                pt_dict["tilt"] = round(float(data["tilt"]), 2)
            clean_points.append(pt_dict)

        return {
            "type": event_type,
            "stroke_id": stroke_id,
            "brush": brush,
            "color": color,
            "size": round(size, 2),
            "opacity": round(opacity, 3),
            "pressure_enabled": pressure_enabled,
            "smoothing": smoothing,
            "phone_width": round(phone_width, 2),
            "phone_height": round(phone_height, 2),
            "aspect_ratio": round(aspect_ratio, 6),
            "points": clean_points,
            "timestamp": data.get("timestamp")
        }
    except (ValueError, TypeError):
        return None


# HTTP Routes
@app.get("/api/network-info")
def get_network_info():
    """Returns local network IP addresses and precomputed phone connection URLs."""
    local_ip = get_local_ip()
    all_ips = []
    try:
        _, _, ips = socket.gethostbyname_ex(socket.gethostname())
        for ip in ips:
            if not ip.startswith("127.") and ip not in all_ips:
                all_ips.append(ip)
    except Exception:
        pass
    if local_ip not in all_ips and not local_ip.startswith("127."):
        all_ips.insert(0, local_ip)
    if not all_ips:
        all_ips = [local_ip]

    return {
        "primary_ip": local_ip,
        "port": 8080,
        "all_ips": all_ips,
        "phone_url": f"http://{local_ip}:8080/phone",
        "laptop_url": f"http://{local_ip}:8080/laptop"
    }


@app.get("/")
def get_root():
    """Landing page offering choices to launch Phone or Laptop interface."""
    ip = get_local_ip()
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Phone Drawing Pad</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
            :root {{
                --bg-gradient: radial-gradient(circle at 50% 0%, #1a1e29 0%, #0d0f14 100%);
                --card-bg: rgba(255, 255, 255, 0.04);
                --card-border: rgba(255, 255, 255, 0.08);
                --accent-primary: #6366f1;
                --accent-hover: #4f46e5;
                --accent-phone: #10b981;
                --text-main: #f3f4f6;
                --text-muted: #9ca3af;
            }}
            * {{
                box-sizing: border-box;
                margin: 0;
                padding: 0;
            }}
            body {{
                font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
                background: var(--bg-gradient);
                color: var(--text-main);
                min-height: 100vh;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 2rem;
            }}
            .container {{
                max-width: 640px;
                width: 100%;
                text-align: center;
            }}
            .logo {{
                font-size: 2.5rem;
                font-weight: 700;
                background: linear-gradient(135deg, #a5b4fc 0%, #6366f1 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                margin-bottom: 0.5rem;
            }}
            .subtitle {{
                color: var(--text-muted);
                font-size: 1.1rem;
                margin-bottom: 2.5rem;
            }}
            .grid {{
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 1.5rem;
            }}
            @media (max-width: 600px) {{
                .grid {{
                    grid-template-columns: 1fr;
                }}
            }}
            .card {{
                background: var(--card-bg);
                border: 1px solid var(--card-border);
                border-radius: 16px;
                padding: 2rem 1.5rem;
                text-decoration: none;
                color: var(--text-main);
                transition: all 0.25s ease;
                display: flex;
                flex-direction: column;
                align-items: center;
                backdrop-filter: blur(12px);
            }}
            .card:hover {{
                transform: translateY(-4px);
                border-color: rgba(99, 102, 241, 0.4);
                box-shadow: 0 12px 30px -10px rgba(99, 102, 241, 0.3);
            }}
            .icon {{
                font-size: 3rem;
                margin-bottom: 1rem;
            }}
            .card-title {{
                font-size: 1.3rem;
                font-weight: 600;
                margin-bottom: 0.5rem;
            }}
            .card-desc {{
                font-size: 0.9rem;
                color: var(--text-muted);
            }}
            .ip-box {{
                margin-top: 2.5rem;
                background: rgba(0, 0, 0, 0.3);
                border: 1px dashed var(--card-border);
                border-radius: 12px;
                padding: 1rem;
                font-family: monospace;
                font-size: 0.95rem;
                color: #a5b4fc;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1 class="logo">🎨 Phone Drawing Pad</h1>
            <p class="subtitle">Turn your smartphone into a wireless drawing tablet for your laptop & Krita</p>
            <div class="grid">
                <a href="/phone" class="card">
                    <div class="icon">📱</div>
                    <div class="card-title">Phone Canvas</div>
                    <div class="card-desc">Open on your smartphone/tablet to draw</div>
                </a>
                <a href="/laptop" class="card">
                    <div class="icon">💻</div>
                    <div class="card-title">Laptop Preview</div>
                    <div class="card-desc">Open on your laptop to display drawings</div>
                </a>
            </div>
            <div class="ip-box">
                Server IP: http://{ip}:8080<br>
                Ensure both devices are on the same Wi-Fi network.
            </div>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)


@app.get("/phone")
def get_phone():
    """Serves the phone drawing interface."""
    phone_index = PHONE_DIR / "index.html"
    if phone_index.exists():
        return HTMLResponse(content=phone_index.read_text(encoding="utf-8"))
    raise HTTPException(status_code=404, detail="Phone interface file not found")


@app.get("/laptop")
def get_laptop():
    """Serves the laptop preview interface."""
    laptop_index = LAPTOP_DIR / "index.html"
    if laptop_index.exists():
        return HTMLResponse(
            content=laptop_index.read_text(encoding="utf-8"),
            headers={"Cache-Control": "no-cache, no-store, must-revalidate"}
        )
    raise HTTPException(status_code=404, detail="Laptop interface file not found")


@app.get("/style.css")
def get_root_style():
    f = LAPTOP_DIR / "style.css"
    if f.exists():
        return HTMLResponse(content=f.read_text(encoding="utf-8"), media_type="text/css")
    raise HTTPException(status_code=404, detail="style.css not found")


@app.get("/app.js")
def get_root_app():
    f = LAPTOP_DIR / "app.js"
    if f.exists():
        return HTMLResponse(content=f.read_text(encoding="utf-8"), media_type="application/javascript")
    raise HTTPException(status_code=404, detail="app.js not found")


@app.get("/qrcode.min.js")
def get_root_qrcode():
    f = LAPTOP_DIR / "qrcode.min.js"
    if f.exists():
        return HTMLResponse(content=f.read_text(encoding="utf-8"), media_type="application/javascript")
    raise HTTPException(status_code=404, detail="qrcode.min.js not found")


# WebSocket Endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, role: str = "phone"):
    """
    Unified WebSocket endpoint for phone input, laptop display, and Krita plugin.
    Query param `role`: 'phone', 'laptop', or 'krita'.
    """
    current_role = role
    await manager.connect(websocket, current_role)
    try:
        while True:
            raw_data = await websocket.receive_text()
            
            # Limit message payload length (10 MB limit for high-res images)
            if len(raw_data) > 10485760:
                continue

            try:
                parsed_json = json.loads(raw_data)
            except json.JSONDecodeError:
                continue

            validated_event = validate_stroke_event(parsed_json)
            if validated_event is None:
                continue

            # Handle PING
            if validated_event["type"] == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
                continue

            # Handle client identification payload
            if validated_event["type"] == "client":
                client_type = validated_event.get("client")
                if client_type == "krita" and current_role != "krita":
                    manager.disconnect(websocket, current_role)
                    current_role = "krita"
                    await manager.connect(websocket, current_role)
                continue

            # Handle image import & clear synchronization across both devices
            if validated_event["type"] == "import_image":
                manager.current_image_state = validated_event
                await manager.broadcast_to_others(json.dumps(validated_event), websocket)
                continue

            if validated_event["type"] == "clear_image":
                manager.current_image_state = None
                await manager.broadcast_to_others(json.dumps(validated_event), websocket)
                continue

            # Broadcast stroke or clear actions
            if current_role == "phone":
                await manager.broadcast_stroke(json.dumps(validated_event), websocket)
            else:
                # Desktop drawing or clear action relayed to phone/krita
                await manager.broadcast_to_others(json.dumps(validated_event), websocket)

    except WebSocketDisconnect:
        manager.disconnect(websocket, current_role)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket, current_role)


# Display network IP banner on startup
@app.on_event("startup")
async def startup_event():
    print_startup_banner()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)
