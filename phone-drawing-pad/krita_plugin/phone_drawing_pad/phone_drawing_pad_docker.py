import sys
from PyQt5.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit,
    QPushButton, QTextEdit, QFrame, QGroupBox
)
from PyQt5.QtCore import Qt, pyqtSlot
from PyQt5.QtGui import QFont
from krita import DockWidget, DockWidgetFactoryBase, Krita

DOCKER_ID = "phone_drawing_pad_docker"


class PhoneDrawingPadDocker(DockWidget):
    """
    Krita Docker widget for controlling the Phone Drawing Pad WebSocket connection.
    Displays server parameters, connection controls, live status, and error logs.
    """
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Phone Drawing Pad")

        main_widget = QWidget(self)
        layout = QVBoxLayout(main_widget)
        layout.setContentsMargins(10, 10, 10, 10)
        layout.setSpacing(10)

        # Title / Header
        title_label = QLabel("Phone Drawing Pad v2.1")
        title_font = QFont()
        title_font.setBold(True)
        title_font.setPointSize(11)
        title_label.setFont(title_font)
        title_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(title_label)

        # Server Address Group
        form_group = QGroupBox("WebSocket Server")
        form_layout = QVBoxLayout(form_group)

        # Server Host
        lbl_server = QLabel("Server:")
        self.input_server = QLineEdit("127.0.0.1")
        self.input_server.setPlaceholderText("e.g. 192.168.1.100 or 127.0.0.1")
        form_layout.addWidget(lbl_server)
        form_layout.addWidget(self.input_server)

        # Server Port
        lbl_port = QLabel("Port:")
        self.input_port = QLineEdit("8080")
        self.input_port.setPlaceholderText("8080")
        form_layout.addWidget(lbl_port)
        form_layout.addWidget(self.input_port)

        layout.addWidget(form_group)

        # Action Buttons Layout
        btn_layout = QHBoxLayout()
        self.btn_connect = QPushButton("Connect")
        self.btn_connect.setStyleSheet("""
            QPushButton {
                background-color: #4f46e5;
                color: white;
                font-weight: bold;
                padding: 6px 12px;
                border-radius: 4px;
            }
            QPushButton:hover {
                background-color: #4338ca;
            }
            QPushButton:disabled {
                background-color: #6b7280;
            }
        """)
        self.btn_connect.clicked.connect(self.on_connect_clicked)

        self.btn_disconnect = QPushButton("Disconnect")
        self.btn_disconnect.setEnabled(False)
        self.btn_disconnect.setStyleSheet("""
            QPushButton {
                background-color: #dc2626;
                color: white;
                font-weight: bold;
                padding: 6px 12px;
                border-radius: 4px;
            }
            QPushButton:hover {
                background-color: #b91c1c;
            }
            QPushButton:disabled {
                background-color: #6b7280;
            }
        """)
        self.btn_disconnect.clicked.connect(self.on_disconnect_clicked)

        btn_layout.addWidget(self.btn_connect)
        btn_layout.addWidget(self.btn_disconnect)
        layout.addLayout(btn_layout)

        # Connection Status Indicator
        self.lbl_status = QLabel("Status: ● Disconnected")
        status_font = QFont()
        status_font.setBold(True)
        self.lbl_status.setFont(status_font)
        self.lbl_status.setStyleSheet("color: #ef4444;")
        layout.addWidget(self.lbl_status)

        # Status & Error Log Console
        lbl_log = QLabel("Log Console:")
        layout.addWidget(lbl_log)
        self.log_box = QTextEdit()
        self.log_box.setReadOnly(True)
        self.log_box.setMaximumHeight(130)
        self.log_box.setStyleSheet("background-color: #1e1e1e; color: #d4d4d4; font-family: monospace; font-size: 10px;")
        layout.addWidget(self.log_box)

        layout.addStretch()
        self.setWidget(main_widget)

        self.append_log("Plugin loaded. Ready to connect.")

    def canvasChanged(self, canvas):
        """Called by Krita when active canvas changes."""
        pass

    def append_log(self, text: str):
        """Appends a timestamped message to the log box."""
        self.log_box.append(text)
        self.log_box.verticalScrollBar().setValue(self.log_box.verticalScrollBar().maximum())

    def update_status(self, connected: bool, message: str):
        """Updates the status badge and log window."""
        if connected:
            self.lbl_status.setText(f"Status: ● Connected ({message})")
            self.lbl_status.setStyleSheet("color: #10b981;")
            self.btn_connect.setEnabled(False)
            self.btn_disconnect.setEnabled(True)
            self.input_server.setEnabled(False)
            self.input_port.setEnabled(False)
        else:
            self.lbl_status.setText("Status: ● Disconnected")
            self.lbl_status.setStyleSheet("color: #ef4444;")
            self.btn_connect.setEnabled(True)
            self.btn_disconnect.setEnabled(False)
            self.input_server.setEnabled(True)
            self.input_port.setEnabled(True)

        if message:
            self.append_log(message)

    @pyqtSlot()
    def on_connect_clicked(self):
        host = self.input_server.text().strip() or "127.0.0.1"
        port_str = self.input_port.text().strip() or "8080"
        try:
            port = int(port_str)
        except ValueError:
            self.append_log("Error: Port must be an integer.")
            return

        extension = self.get_extension()
        if extension:
            self.lbl_status.setText("Status: ● Connecting...")
            self.lbl_status.setStyleSheet("color: #f59e0b;")
            self.btn_connect.setEnabled(False)
            self.append_log(f"Initiating connection to ws://{host}:{port}/ws...")
            extension.connect_server(host, port, self)
        else:
            self.append_log("Error: PhoneDrawingPadExtension not found.")

    @pyqtSlot()
    def on_disconnect_clicked(self):
        extension = self.get_extension()
        if extension:
            extension.disconnect_server()
            self.update_status(False, "Disconnected by user.")

    def get_extension(self):
        """Finds active PhoneDrawingPadExtension from Krita instance."""
        app = Krita.instance()
        extensions = app.extensions()
        for ext in extensions:
            if hasattr(ext, "is_phone_drawing_pad"):
                return ext
        return None


class PhoneDrawingPadDockerFactory(DockWidgetFactoryBase):
    """
    Factory for instantiating PhoneDrawingPadDocker in Krita.
    """
    def __init__(self):
        super().__init__()
        self.dockPosition = DockWidgetFactoryBase.DockRight

    def getDockWidgetId(self):
        return DOCKER_ID

    def createDockWidget(self):
        return PhoneDrawingPadDocker()
