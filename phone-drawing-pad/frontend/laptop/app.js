/**
 * Phone Drawing Pad - Laptop Desktop Engine
 * Reconstructs incoming phone strokes with exact aspect-ratio preservation,
 * uniform brush scaling, 6 distinct brush renderers, and undo/redo history sync.
 */

(function () {
    'use strict';

    // DOM Elements
    const canvas = document.getElementById('laptop-canvas');
    const ctx = canvas.getContext('2d');
    const canvasWrapper = document.getElementById('canvas-wrapper');

    // Header Badges & Actions
    const phoneStatusBadge = document.getElementById('phone-status-badge');
    const phoneStatusText = document.getElementById('phone-status-text');
    const btnToggleGrid = document.getElementById('btn-toggle-grid');
    const btnToggleDebug = document.getElementById('btn-toggle-debug');
    const btnCloseDebug = document.getElementById('btn-close-debug');
    const debugDrawer = document.getElementById('debug-drawer');
    const btnClearLaptop = document.getElementById('btn-clear-laptop');
    const btnSave = document.getElementById('btn-save');
    const btnFullscreen = document.getElementById('btn-fullscreen');
    const eventCounterBadge = document.getElementById('event-counter');

    // Debug Panel Elements
    const statPhoneStatus = document.getElementById('stat-phone-status');
    const statPackets = document.getElementById('stat-packets');
    const statTool = document.getElementById('stat-tool');
    const statPointer = document.getElementById('stat-pointer');
    const debugNormCoords = document.getElementById('debug-norm-coords');
    const debugPxCoords = document.getElementById('debug-px-coords');
    const debugPressure = document.getElementById('debug-pressure');
    const debugColorSize = document.getElementById('debug-color-size');
    const logConsole = document.getElementById('log-console');

    // State
    let socket = null;
    let isConnected = false;
    let packetCount = 0;

    // Stroke History & Aspect Ratio State
    let strokeHistory = []; // Array of complete stroke objects
    let redoHistory = [];   // Array of undone stroke objects
    let activeStrokesMap = new Map(); // stroke_id -> stroke object currently in progress
    let lastPhoneAspect = 0.462; // Default phone aspect ratio fallback

    // Developer Adapter Hook
    window.PhoneDrawingPad = {
        onStrokeEvent: null
    };

    // ----------------------------------------------------
    // Canvas & High-DPI Resolution Handling
    // ----------------------------------------------------
    function setupCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvasWrapper.getBoundingClientRect();

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        ctx.scale(dpr, dpr);
        redrawAllStrokes();
    }

    window.addEventListener('resize', setupCanvas);
    window.addEventListener('DOMContentLoaded', () => {
        setupCanvas();
        initUI();
        connectWebSocket();
    });

    // ----------------------------------------------------
    // Aspect-Ratio Preserving Math Helper
    // ----------------------------------------------------
    function getAspectMapping(phoneAspect) {
        const rect = canvasWrapper.getBoundingClientRect();
        const laptopWidth = rect.width;
        const laptopHeight = rect.height;
        const laptopAspect = laptopWidth / Math.max(1, laptopHeight);

        let targetWidth, targetHeight, offsetX, offsetY;

        if (phoneAspect > laptopAspect) {
            // Phone is wider than laptop canvas -> pillarbox vertically
            targetWidth = laptopWidth;
            targetHeight = laptopWidth / phoneAspect;
            offsetX = 0;
            offsetY = (laptopHeight - targetHeight) / 2;
        } else {
            // Phone is taller than laptop canvas -> letterbox horizontally
            targetHeight = laptopHeight;
            targetWidth = laptopHeight * phoneAspect;
            offsetX = (laptopWidth - targetWidth) / 2;
            offsetY = 0;
        }

        return {
            laptopWidth,
            laptopHeight,
            targetWidth,
            targetHeight,
            offsetX,
            offsetY,
            phoneAspect
        };
    }

    // ----------------------------------------------------
    // UI Controls
    // ----------------------------------------------------
    function initUI() {
        btnToggleGrid.addEventListener('click', () => {
            canvasWrapper.classList.toggle('grid-pattern');
            btnToggleGrid.classList.toggle('active');
            redrawAllStrokes();
        });

        btnToggleDebug.addEventListener('click', () => {
            debugDrawer.classList.toggle('hidden');
            btnToggleDebug.classList.toggle('active');
        });

        btnCloseDebug.addEventListener('click', () => {
            debugDrawer.classList.add('hidden');
            btnToggleDebug.classList.remove('active');
        });

        btnClearLaptop.addEventListener('click', () => {
            strokeHistory = [];
            redoHistory = [];
            activeStrokesMap.clear();
            redrawAllStrokes();
            logMessage('Laptop canvas cleared.', 'info');
        });

        btnSave.addEventListener('click', () => {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const tCtx = tempCanvas.getContext('2d');

            // Dark background for PNG output
            tCtx.fillStyle = '#121826';
            tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            tCtx.drawImage(canvas, 0, 0);

            const link = document.createElement('a');
            link.download = `phone-drawing-${Date.now()}.png`;
            link.href = tempCanvas.toDataURL('image/png');
            link.click();
            logMessage('Saved drawing as PNG.', 'info');
        });

        btnFullscreen.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => console.error(err));
            } else if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        });
    }

    function logMessage(text, type = 'info') {
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        const timestamp = new Date().toLocaleTimeString();
        entry.textContent = `[${timestamp}] ${text}`;
        logConsole.appendChild(entry);
        logConsole.scrollTop = logConsole.scrollHeight;

        while (logConsole.children.length > 50) {
            logConsole.removeChild(logConsole.firstChild);
        }
    }

    // ----------------------------------------------------
    // WebSocket Client & Event Dispatcher
    // ----------------------------------------------------
    function connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}/ws?role=laptop`;

        try {
            socket = new WebSocket(wsUrl);

            socket.onopen = () => {
                isConnected = true;
                logMessage('Connected to FastAPI WebSocket server.', 'info');
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    handleWebSocketMessage(data);
                } catch (err) {
                    console.error('Failed to parse WS message:', err);
                }
            };

            socket.onclose = () => {
                isConnected = false;
                updatePhoneConnectionUI(false, 0);
                logMessage('Connection lost. Retrying in 2 seconds...', 'error');
                setTimeout(connectWebSocket, 2000);
            };

            socket.onerror = (err) => {
                console.error('WebSocket Error:', err);
                socket.close();
            };
        } catch (err) {
            console.error('WebSocket Exception:', err);
            setTimeout(connectWebSocket, 2000);
        }
    }

    function handleWebSocketMessage(data) {
        packetCount++;
        eventCounterBadge.textContent = packetCount;
        statPackets.textContent = packetCount;

        // Developer callback hook
        if (typeof window.PhoneDrawingPad.onStrokeEvent === 'function') {
            try { window.PhoneDrawingPad.onStrokeEvent(data); } catch (e) {}
        }

        if (data.type === 'status') {
            updatePhoneConnectionUI(data.phone_connected, data.phone_count);
            return;
        }

        if (data.type === 'sync_history') {
            lastPhoneAspect = data.aspect_ratio || lastPhoneAspect;
            strokeHistory = data.strokes || [];
            redoHistory = [];
            activeStrokesMap.clear();
            redrawAllStrokes();
            logMessage(`Synchronized full history (${strokeHistory.length} strokes).`, 'info');
            return;
        }

        if (data.type === 'undo') {
            if (strokeHistory.length > 0) {
                redoHistory.push(strokeHistory.pop());
                redrawAllStrokes();
                logMessage('Undo executed from phone.', 'info');
            }
            return;
        }

        if (data.type === 'redo') {
            if (redoHistory.length > 0) {
                strokeHistory.push(redoHistory.pop());
                redrawAllStrokes();
                logMessage('Redo executed from phone.', 'info');
            }
            return;
        }

        if (data.type === 'clear') {
            strokeHistory = [];
            redoHistory = [];
            activeStrokesMap.clear();
            redrawAllStrokes();
            logMessage('Clear canvas executed from phone.', 'info');
            return;
        }

        if (data.type === 'stroke_start') {
            lastPhoneAspect = data.aspect_ratio || lastPhoneAspect;
            const stroke = {
                stroke_id: data.stroke_id,
                brush: data.brush,
                color: data.color,
                size: data.size,
                opacity: data.opacity,
                pressure_enabled: data.pressure_enabled,
                smoothing: data.smoothing,
                phone_width: data.phone_width,
                phone_height: data.phone_height,
                aspect_ratio: data.aspect_ratio,
                points: data.points || []
            };

            activeStrokesMap.set(data.stroke_id, stroke);
            redrawAllStrokes();
            updateDebugMetrics(data, stroke.points[0]);
            return;
        }

        if (data.type === 'stroke_points' || data.type === 'stroke') {
            lastPhoneAspect = data.aspect_ratio || lastPhoneAspect;
            let stroke = activeStrokesMap.get(data.stroke_id);
            if (!stroke) {
                stroke = {
                    stroke_id: data.stroke_id,
                    brush: data.brush || 'pen',
                    color: data.color || '#000000',
                    size: data.size || 12,
                    opacity: data.opacity || 1.0,
                    pressure_enabled: data.pressure_enabled !== false,
                    smoothing: data.smoothing || 'medium',
                    phone_width: data.phone_width || 390,
                    phone_height: data.phone_height || 844,
                    aspect_ratio: data.aspect_ratio || 0.462,
                    points: []
                };
                activeStrokesMap.set(data.stroke_id, stroke);
            }

            if (data.points && Array.isArray(data.points)) {
                stroke.points.push(...data.points);
            } else if (data.x !== undefined && data.y !== undefined) {
                stroke.points.push({ x: data.x, y: data.y, pressure: data.pressure || 0.5 });
            }

            redrawAllStrokes();
            const lastPt = stroke.points[stroke.points.length - 1];
            updateDebugMetrics(data, lastPt);
            return;
        }

        if (data.type === 'stroke_end') {
            const stroke = activeStrokesMap.get(data.stroke_id);
            if (stroke) {
                strokeHistory.push(stroke);
                activeStrokesMap.delete(data.stroke_id);
            }
            redrawAllStrokes();
            return;
        }
    }

    function updatePhoneConnectionUI(isConnected, count) {
        if (isConnected) {
            phoneStatusBadge.className = 'phone-status-badge status-online';
            phoneStatusText.textContent = `PHONE CONNECTED (${count})`;
            statPhoneStatus.textContent = 'Connected';
            statPhoneStatus.className = 'stat-val val-active';
        } else {
            phoneStatusBadge.className = 'phone-status-badge status-offline';
            phoneStatusText.textContent = 'AWAITING PHONE...';
            statPhoneStatus.textContent = 'Disconnected';
            statPhoneStatus.className = 'stat-val val-inactive';
        }
    }

    function updateDebugMetrics(data, pt) {
        statTool.textContent = data.brush || 'Pen';
        statPointer.textContent = data.pressure_enabled ? 'Stylus/Touch' : 'Touch';
        if (pt) {
            debugNormCoords.textContent = `${pt.x.toFixed(3)}, ${pt.y.toFixed(3)}`;
            debugPressure.textContent = (pt.pressure || 0.5).toFixed(2);
        }
        debugColorSize.textContent = `${data.color || '#000000'} / ${data.size || 12}px`;
    }

    // ----------------------------------------------------
    // Full Canvas Redraw with Aspect-Ratio Bounding Box
    // ----------------------------------------------------
    function redrawAllStrokes() {
        const rect = canvasWrapper.getBoundingClientRect();
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();

        const mapping = getAspectMapping(lastPhoneAspect);

        // Draw active phone viewport bounding box guide
        drawPhoneBoundsGuide(mapping);

        // Render completed strokes
        for (const stroke of strokeHistory) {
            renderStrokeOnLaptop(stroke, mapping);
        }

        // Render active strokes in progress
        for (const [id, stroke] of activeStrokesMap.entries()) {
            renderStrokeOnLaptop(stroke, mapping);
        }
    }

    function drawPhoneBoundsGuide(mapping) {
        ctx.save();
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.25)';
        ctx.setLineDash([6, 6]);
        ctx.lineWidth = 2;
        ctx.strokeRect(mapping.offsetX, mapping.offsetY, mapping.targetWidth, mapping.targetHeight);
        ctx.restore();
    }

    // ----------------------------------------------------
    // Modular Stroke Renderer for Laptop
    // ----------------------------------------------------
    function renderStrokeOnLaptop(stroke, mapping) {
        if (!stroke.points || stroke.points.length === 0) return;

        // Uniform brush scaling
        const phoneW = stroke.phone_width || (stroke.phone_height * stroke.aspect_ratio) || 390;
        const scaleFactor = mapping.targetWidth / Math.max(1, phoneW);
        const scaledSize = Math.max(1.0, stroke.size * scaleFactor);

        // Convert normalized points to laptop pixel coordinates in target region
        const pixelPoints = stroke.points.map(p => ({
            px: mapping.offsetX + p.x * mapping.targetWidth,
            py: mapping.offsetY + p.y * mapping.targetHeight,
            pressure: p.pressure
        }));

        ctx.save();

        const brush = stroke.brush || 'pen';
        const color = stroke.color || '#000000';
        const opacity = stroke.opacity || 1.0;

        const points = applySmoothingFilter(pixelPoints, stroke.smoothing || 'medium');

        if (brush === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            renderPenStroke(points, 'rgba(0,0,0,1)', scaledSize, 1.0);
        } else if (brush === 'pen') {
            ctx.globalCompositeOperation = 'source-over';
            renderPenStroke(points, color, scaledSize, opacity);
        } else if (brush === 'pencil') {
            ctx.globalCompositeOperation = 'source-over';
            renderPencilStroke(points, color, scaledSize, opacity);
        } else if (brush === 'marker') {
            ctx.globalCompositeOperation = 'source-over';
            renderMarkerStroke(points, color, scaledSize, opacity);
        } else if (brush === 'soft') {
            ctx.globalCompositeOperation = 'source-over';
            renderSoftBrushStroke(points, color, scaledSize, opacity);
        } else if (brush === 'airbrush') {
            ctx.globalCompositeOperation = 'source-over';
            renderAirbrushStroke(points, color, scaledSize, opacity);
        }

        ctx.restore();
    }

    function applySmoothingFilter(points, level) {
        if (level === 'off' || points.length <= 2) return points;

        let iterations = 1;
        if (level === 'medium') iterations = 2;
        if (level === 'high') iterations = 3;

        let result = points;
        for (let iter = 0; iter < iterations; iter++) {
            const smoothed = [result[0]];
            for (let i = 0; i < result.length - 1; i++) {
                const p0 = result[i];
                const p1 = result[i + 1];

                const q = {
                    px: 0.75 * p0.px + 0.25 * p1.px,
                    py: 0.75 * p0.py + 0.25 * p1.py,
                    pressure: 0.75 * p0.pressure + 0.25 * p1.pressure
                };
                const r = {
                    px: 0.25 * p0.px + 0.75 * p1.px,
                    py: 0.25 * p0.py + 0.75 * p1.py,
                    pressure: 0.25 * p0.pressure + 0.75 * p1.pressure
                };

                smoothed.push(q, r);
            }
            smoothed.push(result[result.length - 1]);
            result = smoothed;
        }

        return result;
    }

    // --- 1. PEN RENDERER ---
    function renderPenStroke(points, color, baseSize, opacity) {
        ctx.globalAlpha = opacity;
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (points.length === 1) {
            const p = points[0];
            const size = baseSize * (0.3 + 0.7 * p.pressure);
            ctx.beginPath();
            ctx.arc(p.px, p.py, size / 2, 0, Math.PI * 2);
            ctx.fill();
            return;
        }

        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            const size = baseSize * (0.3 + 0.7 * p2.pressure);

            ctx.lineWidth = size;
            ctx.beginPath();
            ctx.moveTo(p1.px, p1.py);
            ctx.lineTo(p2.px, p2.py);
            ctx.stroke();
        }
    }

    // --- 2. PENCIL RENDERER ---
    function renderPencilStroke(points, color, baseSize, opacity) {
        ctx.globalAlpha = opacity * 0.65;
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineCap = 'round';

        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            const size = Math.max(1, baseSize * (0.2 + 0.6 * p2.pressure));

            ctx.lineWidth = size;
            ctx.beginPath();
            ctx.moveTo(p1.px, p1.py);
            ctx.lineTo(p2.px, p2.py);
            ctx.stroke();

            const dist = Math.hypot(p2.px - p1.px, p2.py - p1.py);
            const steps = Math.ceil(dist / 3);
            for (let s = 0; s < steps; s++) {
                const t = s / Math.max(1, steps);
                const nx = p1.px + (p2.px - p1.px) * t + (Math.random() - 0.5) * (size * 0.4);
                const ny = p1.py + (p2.py - p1.py) * t + (Math.random() - 0.5) * (size * 0.4);
                ctx.fillRect(nx, ny, 1, 1);
            }
        }
    }

    // --- 3. MARKER RENDERER ---
    function renderMarkerStroke(points, color, baseSize, opacity) {
        ctx.globalAlpha = opacity * 0.45;
        ctx.strokeStyle = color;
        ctx.lineCap = 'square';
        ctx.lineJoin = 'miter';

        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];

            ctx.lineWidth = baseSize * 1.2;
            ctx.beginPath();
            ctx.moveTo(p1.px, p1.py);
            ctx.lineTo(p2.px, p2.py);
            ctx.stroke();
        }
    }

    // --- 4. SOFT BRUSH RENDERER ---
    function renderSoftBrushStroke(points, color, baseSize, opacity) {
        ctx.globalAlpha = opacity * 0.4;
        ctx.fillStyle = color;

        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            const size = baseSize * (0.4 + 0.6 * p2.pressure);

            const dist = Math.hypot(p2.px - p1.px, p2.py - p1.py);
            const steps = Math.ceil(dist / Math.max(1, size * 0.25));

            for (let s = 0; s <= steps; s++) {
                const t = s / Math.max(1, steps);
                const cx = p1.px + (p2.px - p1.px) * t;
                const cy = p1.py + (p2.py - p1.py) * t;

                const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
                grad.addColorStop(0, color);
                grad.addColorStop(1, 'transparent');

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    // --- 5. AIRBRUSH RENDERER ---
    function renderAirbrushStroke(points, color, baseSize, opacity) {
        ctx.globalAlpha = opacity * 0.5;
        ctx.fillStyle = color;

        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            const radius = (baseSize / 2) * (0.4 + 0.6 * p.pressure);
            const density = Math.floor(radius * 4);

            for (let d = 0; d < density; d++) {
                const angle = Math.random() * Math.PI * 2;
                const r = Math.random() * radius;
                const px = p.px + r * Math.cos(angle);
                const py = p.py + r * Math.sin(angle);
                ctx.fillRect(px, py, 1.5, 1.5);
            }
        }
    }

})();
