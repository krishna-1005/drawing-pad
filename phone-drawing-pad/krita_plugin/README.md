# Phone Drawing Pad — Krita Integration (V2.1)

Turn your smartphone into a real-time drawing tablet that inputs strokes directly onto your active Krita canvas over a local Wi-Fi WebSocket connection.

---

## 🏗️ Architecture Flow

```text
Phone Browser
      ↓ (Touch / Pointer Events)
WebSocket
      ↓ (Normalized Coordinates 0.0 - 1.0)
FastAPI Python Server (Port 8080)
      ↓ (Relay)
Krita Python Plugin (PyKrita Docker)
      ↓ (QPainter Rasterization)
Active Krita Paint Layer
      ↓
Real-Time Canvas Output
```

---

## 📁 Plugin Folder Structure

```text
krita_plugin/
├── phone_drawing_pad/
│   ├── __init__.py
│   ├── phone_drawing_pad.py
│   ├── phone_drawing_pad.desktop
│   └── phone_drawing_pad_docker.py
└── README.md
```

---

## 🛠️ Installation Instructions

### Step 1: Locate Krita's Python Plugin Directory (`pykrita`)

Open Krita, go to **Settings** → **Manage Resources...** → click **Open Resource Folder**.  
Inside the opened resource folder, locate or open the `pykrita` directory.

Alternatively, navigate directly to the `pykrita` directory on your OS:

- **Windows**:
  `%APPDATA%\krita\pykrita\`
  *(e.g., `C:\Users\<YourUsername>\AppData\Roaming\krita\pykrita\`)*

- **Linux**:
  `~/.local/share/krita/pykrita/`

- **macOS**:
  `~/Library/Application Support/krita/pykrita/`

---

### Step 2: Copy Plugin Files into `pykrita`

Copy the following contents from the repository's `krita_plugin/` folder into Krita's `pykrita/` directory:

1. Copy the `phone_drawing_pad` folder → into `pykrita/phone_drawing_pad/`
2. Copy `phone_drawing_pad.desktop` → into `pykrita/phone_drawing_pad.desktop` (Place it both inside `pykrita/` root and `pykrita/phone_drawing_pad/`)

Your `pykrita` directory structure should look like this:

```text
pykrita/
├── phone_drawing_pad.desktop
└── phone_drawing_pad/
    ├── __init__.py
    ├── phone_drawing_pad.py
    ├── phone_drawing_pad.desktop
    └── phone_drawing_pad_docker.py
```

---

### Step 3: Enable Plugin in Krita Settings

1. Start (or restart) **Krita**.
2. Go to **Settings** → **Configure Krita...**
3. Select **Python Plugin Manager** from the left menu.
4. Locate **Phone Drawing Pad** in the list and check the checkbox next to it to enable it.
5. Click **OK** and restart **Krita**.

---

### Step 4: Open the Docker Widget

1. Open Krita.
2. In the top menu, go to **Settings** → **Dockers** → select **Phone Drawing Pad**.
3. A new panel titled **Phone Drawing Pad** will appear in your Krita UI.

---

## 🚀 How to Connect and Use

1. **Start the Python Server**:
   ```bash
   python backend/main.py
   ```
   Note the server address (e.g., `127.0.0.1` and port `8080`).

2. **Open Krita Canvas**:
   - Create a new document (`File` -> `New`).
   - Ensure a **Paint Layer** is selected in the Layers Docker.

3. **Connect Krita Plugin**:
   - In the **Phone Drawing Pad** docker:
     - Set Server: `127.0.0.1` (or your laptop's local IP)
     - Set Port: `8080`
     - Click **[ Connect ]**.
   - Confirm status shows `Status: ● Connected`.

4. **Connect Phone**:
   - Open your phone browser and visit `http://<laptop_ip>:8080/phone`.
   - Start drawing on your phone screen!

5. **Watch the Magic**:
   - Your continuous touch line appears directly on your active Krita paint layer in real-time.

---

## 🧪 Testing Procedure

1. Launch Krita and open a new document (e.g., 1000 x 1000 px).
2. Create/select a standard Paint Layer (`Layer 1`).
3. Open the **Phone Drawing Pad** Docker.
4. Launch the FastAPI server (`python backend/main.py`).
5. Open the phone interface on your smartphone (or in a second browser window at `http://127.0.0.1:8080/phone`).
6. Click **[ Connect ]** in the Krita Docker.
7. Draw a line on the phone interface.
8. **Success Criterion**: The line appears directly on the Krita canvas in real-time. Laptop browser canvas preview is NOT required for this test.

---

## ⚠️ Troubleshooting & Error Handling

- **`Warning: No active document open in Krita.`**:
  Open or create a new document in Krita before drawing on the phone.

- **`Warning: Selected layer is not a paint layer.`**:
  Select a standard **Paint Layer** in Krita's Layers panel (vector, group, or file layers cannot receive raw pixel painting).

- **`Connection refused` / `Server unavailable`**:
  Ensure `python backend/main.py` is running and firewall rules allow connections on port 8080.
