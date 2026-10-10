# Phone Drawing Pad

> Turn your smartphone into a wireless drawing tablet for your computer and Krita.

Phone Drawing Pad is an open-source system that turns any Android or iOS web browser into a low-latency, real-time wireless drawing tablet for your laptop or desktop computer over your local Wi-Fi network.

---

## 🎨 What's New in Version 2.1 — Krita Integration

- **🖌️ Direct Krita Canvas Painting**: Draw continuous strokes on your smartphone screen and watch them render directly onto your active **Krita** paint layer in real-time.
- **🔌 Dedicated PyKrita Docker Plugin**: Native Krita plugin with connection status indicator, server IP/port inputs, connect/disconnect buttons, and log console.
- **⚡ Lightweight WebSocket Connection**: Zero third-party desktop dependencies; directly bridges local FastAPI server with Krita's PyKrita API.

---

## 🌟 Features in Version 2.0

- **📐 Aspect-Ratio Preserving Renderer**: Geometric shapes (e.g., circles drawn on your phone) remain perfectly circular on your laptop regardless of screen dimension or aspect ratio differences (portrait & landscape).
- **🖌️ 6 Distinct Brush Engines**:
  - **Pen**: Crisp, smooth lines with pressure scaling.
  - **Pencil**: Textured graphite grain appearance.
  - **Marker**: Semi-transparent chisel stroke with overlapping layer build-up.
  - **Soft Brush**: Blurred radial gradient stamps.
  - **Airbrush**: Atomized particle spray simulation.
  - **Eraser**: Pixel clearing using `destination-out` compositing.
- **↩️ Stroke-Level Undo & Redo**: Full stroke stack history with instant bidirectional synchronization across devices.
- **〰️ Line Smoothing & Stabilization**: Chaikin subdivision algorithm with 4 smoothing levels (Off, Low, Medium, High) for zero-gap, butter-smooth lines.
- **💧 Opacity Control**: 0–100% opacity slider supported across all brush types.
- **⚡ Dynamic Pressure Sensitivity**: Support for pressure-sensitive styluses (S-Pen, Apple Pencil) with toggle control.
- **⚠️ Accidental Clear Protection**: Modal confirmation dialog for canvas clearing.

---

## 🏗️ Architecture

```text
Phone Browser
      ↓ (Touch / Pointer Events)
WebSocket
      ↓ (Normalized Coordinates 0.0 - 1.0)
FastAPI Python Server (Port 8080)
      ├──→ Laptop Web Canvas (Preview)
      └──→ Krita Python Plugin (PyKrita Docker)
                 ↓ (QPainter Rasterization)
            Active Krita Paint Layer
```

---

## 🎨 Krita Integration Guide

### Architecture

```text
Phone
 ↓
WebSocket
 ↓
Python server
 ↓
Krita plugin
 ↓
Krita canvas
```

### Installation

1. Copy the plugin files from `krita_plugin/`:
   - Copy `krita_plugin/phone_drawing_pad/` folder into Krita's `pykrita/` directory.
   - Copy `krita_plugin/phone_drawing_pad/phone_drawing_pad.desktop` into Krita's `pykrita/` directory.

   **Location of `pykrita` directory**:
   - **Windows**: `%APPDATA%\krita\pykrita\`
   - **Linux**: `~/.local/share/krita/pykrita/`
   - **macOS**: `~/Library/Application Support/krita/pykrita/`

2. Enable the plugin in Krita:
   - Open Krita and go to **Settings** → **Configure Krita...** → **Python Plugin Manager**.
   - Check **Phone Drawing Pad** and click **OK**.
   - Restart Krita.

3. Open the Docker:
   - Go to **Settings** → **Dockers** → select **Phone Drawing Pad**.

4. Connect to Server:
   - Start the server: `python backend/main.py`
   - In the Krita **Phone Drawing Pad** docker, click **[ Connect ]**.
   - Open `http://<LAPTOP_IP>:8080/phone` on your smartphone and start drawing directly onto Krita!

For full detailed setup, step-by-step screenshots, and troubleshooting, see [krita_plugin/README.md](krita_plugin/README.md).

---

## 🛠️ Tech Stack

- **Backend**: Python 3.9+, FastAPI, WebSockets, Uvicorn, Pydantic
- **Krita Plugin**: PyKrita API, PyQt5, QPainter, QImage, Socket WebSockets
- **Phone Frontend**: HTML5 Canvas, CSS3 (Glassmorphism & Mobile UX), Vanilla JavaScript, Pointer Events API
- **Laptop Frontend**: HTML5 Canvas, CSS3 (Dark Theme), Vanilla JavaScript, Responsive Layouts

---

## ⚙️ How It Works & Aspect Ratio Math

1. **Capture & Aspect Ratio Calculation**: The phone calculates `aspect_ratio = phoneWidth / phoneHeight` and normalizes touch coordinates `(x, y)` (`0.0 -> 1.0`).
2. **Transmission**: Stroke metadata (`brush`, `color`, `size`, `opacity`, `pressure_enabled`, `smoothing`, `aspect_ratio`, `points`) is transmitted via WebSockets.
3. **Krita Coordinate Translation**:
   ```python
   krita_x = normalized_x * document_width
   krita_y = normalized_y * document_height
   ```
4. **Laptop Aspect-Ratio Preserving Mapping**:
   The laptop calculates uniform scaling and letterboxing/pillarboxing offsets:
   ```javascript
   if (phoneAspect > laptopAspect) {
       targetWidth = laptopWidth;
       targetHeight = laptopWidth / phoneAspect;
       offsetX = 0;
       offsetY = (laptopHeight - targetHeight) / 2;
   } else {
       targetHeight = laptopHeight;
       targetWidth = laptopHeight * phoneAspect;
       offsetX = (laptopWidth - targetWidth) / 2;
       offsetY = 0;
   }
   
   // Pixel Coordinate Mapping
   laptopX = offsetX + x * targetWidth;
   laptopY = offsetY + y * targetHeight;
   ```

---

## 🚀 Installation & Running Locally

```bash
git clone https://github.com/your-username/phone-drawing-pad.git
cd phone-drawing-pad

# Install dependencies
pip install -r backend/requirements.txt

# Start the FastAPI server
python backend/main.py
```

Terminal Output:

```text
========================================
 PHONE DRAWING PAD
========================================

Laptop interface:
http://192.168.0.100:8080/laptop

Phone interface:
http://192.168.0.100:8080/phone

Make sure both devices are connected
to the same Wi-Fi network.
========================================
```

---

## 📱 Connecting Phone and Devices

1. Open `http://<LAPTOP_IP>:8080/phone` on your smartphone/tablet.
2. For Laptop Preview: Open `http://<LAPTOP_IP>:8080/laptop` on your laptop web browser.
3. For Krita Drawing: Open Krita, open the **Phone Drawing Pad** docker, and click **[ Connect ]**.
4. Draw on your phone screen—your strokes will render directly in real time!

---

## 🗺️ Roadmap

- [x] Phone drawing canvas
- [x] Real-time WebSocket communication
- [x] Laptop drawing preview
- [x] Aspect-ratio preserving coordinate mapping
- [x] 6 distinct brush engines (Pen, Pencil, Marker, Soft Brush, Airbrush, Eraser)
- [x] Stroke-level Undo / Redo history stack
- [x] Line smoothing & stabilization algorithms
- [x] Pressure sensitivity controls
- [x] Krita integration (V2.1)
- [ ] USB connection
- [ ] Android native app
- [ ] Desktop application
- [ ] Virtual pen/mouse input

---

## 📄 License

This project is open-source under the [MIT License](LICENSE).

