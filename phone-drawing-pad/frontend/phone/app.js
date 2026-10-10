/**
 * Phone Drawing Pad — Phone Client v3
 *
 * Responsibilities (modularised):
 *   1. InputManager        — Pointer Events, coalesced input, gesture detection
 *   2. CanvasManager       — DPI scaling, zoom/pan transform, grid overlay
 *   3. BrushEngine         — 6 distinct brush renderers
 *   4. StrokeManager       — Active stroke, history (undo/redo), full-redraw
 *   5. SmoothingFilter     — Chaikin subdivision
 *   6. UIController        — DOM bindings, settings, brush preview
 *   7. NetworkClient       — WebSocket connect/reconnect/send
 *
 * Preserved from previous versions:
 *   - Normalized coordinate transmission
 *   - Pointer Events API + getCoalescedEvents()
 *   - aspect_ratio metadata for laptop aspect-preserving mapping
 *   - stroke_start / stroke_points / stroke_end / undo / redo / clear / sync_history protocol
 */

(function () {
    'use strict';

    // ================================================================
    //  DOM REFERENCES
    // ================================================================
    const $  = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const canvasEl        = $('#drawing-canvas');
    const ctx             = canvasEl.getContext('2d');
    const viewport        = $('#canvas-viewport');
    const gridOverlay     = $('#grid-overlay');
    const previewCanvas   = $('#preview-canvas');
    const previewCtx      = previewCanvas.getContext('2d');

    // Top bar
    const btnUndo         = $('#btn-undo');
    const btnRedo         = $('#btn-redo');
    const btnSettings     = $('#btn-settings');
    const connBadge       = $('#connection-badge');
    const connText        = $('#conn-text');

    // Brush strip
    const brushBtns       = $$('.brush-btn');

    // Sliders
    const sliderSize      = $('#slider-size');
    const sizeVal         = $('#size-val');
    const sliderOpacity   = $('#slider-opacity');
    const opacityVal      = $('#opacity-val');
    const quickSizeBtns   = $$('#quick-sizes button');

    // Colors
    const colorDots       = $$('.color-dot');
    const customColorIn   = $('#input-custom-color');

    // Smoothing
    const smoothBtns      = $$('.smooth-btn');

    // Secondary
    const btnZoomFit      = $('#btn-zoom-fit');
    const btnGridToggle   = $('#btn-grid-toggle');
    const btnClear        = $('#btn-clear');

    // Settings
    const settingsPanel   = $('#settings-panel');
    const btnCloseSettings= $('#btn-close-settings');
    const btnPressure     = $('#btn-pressure');
    const selectGridSize  = $('#select-grid-size');
    const selectBg        = $('#select-bg');
    const btnFullReset    = $('#btn-full-reset');

    // Modal
    const clearModal      = $('#clear-modal');
    const btnModalCancel  = $('#btn-modal-cancel');
    const btnModalConfirm = $('#btn-modal-confirm');

    // ================================================================
    //  STATE
    // ================================================================
    let currentBrush    = 'pen';
    let currentColor    = localStorage.getItem('pdp_color')   || '#000000';
    let currentSize     = parseInt(localStorage.getItem('pdp_size') || '12', 10);
    let currentOpacity  = parseFloat(localStorage.getItem('pdp_opacity') || '1.0');
    let currentSmoothing= localStorage.getItem('pdp_smooth')  || 'medium';
    let pressureEnabled = localStorage.getItem('pdp_pressure') !== 'false';
    let previousBrush   = 'pen';
    let canvasBg        = localStorage.getItem('pdp_bg') || '#111726';
    let gridSize        = parseInt(localStorage.getItem('pdp_gridsize') || '24', 10);
    let gridVisible     = false;

    // Zoom / pan state
    let zoomScale  = 1;
    let panX       = 0;
    let panY       = 0;

    // Internal canvas pixel dimensions (CSS pixels, before DPI)
    let cssW = 0;
    let cssH = 0;

    // Drawing state
    let isDrawing    = false;
    let currentStroke = null;

    // Pinch/pan gesture tracking
    let gestureActive = false;
    let gestureStartDist = 0;
    let gestureStartScale = 1;
    let gestureStartPanX = 0;
    let gestureStartPanY = 0;
    let gestureStartMidX = 0;
    let gestureStartMidY = 0;
    let activePointers = new Map();  // pointerId -> {x, y}

    // History
    let strokeHistory = [];
    let redoHistory   = [];

    // WebSocket
    let socket      = null;
    let wsConnected = false;
    let reconnAttempts = 0;
    let pingTimer   = null;

    // ================================================================
    //  1. CANVAS MANAGER  — DPI scaling, zoom/pan, resize
    // ================================================================
    function getCanvasRect() {
        return viewport.getBoundingClientRect();
    }

    function setupCanvas() {
        const dpr  = window.devicePixelRatio || 1;
        const rect = getCanvasRect();
        cssW = rect.width;
        cssH = rect.height;

        canvasEl.width  = cssW * dpr;
        canvasEl.height = cssH * dpr;
        canvasEl.style.width  = cssW + 'px';
        canvasEl.style.height = cssH + 'px';

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        applyCanvasTransform();
        redrawAll();
    }

    function applyCanvasTransform() {
        // The canvas element itself is transformed for zoom/pan.
        // The drawing coordinates inside ctx are always in unscaled CSS-pixel space.
        canvasEl.style.transformOrigin = '0 0';
        canvasEl.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomScale})`;
    }

    function resetView() {
        zoomScale = 1;
        panX = 0;
        panY = 0;
        applyCanvasTransform();
    }

    function updateGridOverlay() {
        if (gridVisible) {
            gridOverlay.classList.remove('hidden');
            gridOverlay.style.backgroundSize = `${gridSize}px ${gridSize}px`;
        } else {
            gridOverlay.classList.add('hidden');
        }
    }

    window.addEventListener('resize', setupCanvas);

    // ================================================================
    //  2. INPUT MANAGER  — Pointer events, gesture detection
    // ================================================================
    function getNormPoint(e) {
        /* Returns a point with normalized coords (0..1) relative to the
           *logical* canvas area (before zoom/pan).  Also provides px coords
           for immediate local rendering. */
        const rect = getCanvasRect();
        // Convert screen coords to canvas-local coords accounting for zoom/pan
        const localX = (e.clientX - rect.left - panX) / zoomScale;
        const localY = (e.clientY - rect.top  - panY) / zoomScale;

        let pressure = 0.5;
        if (pressureEnabled && e.pressure !== undefined && e.pressure > 0) {
            pressure = e.pressure;
        } else if (!pressureEnabled) {
            pressure = 1.0;
        }

        return {
            x: Math.max(0, Math.min(1, localX / cssW)),
            y: Math.max(0, Math.min(1, localY / cssH)),
            px: localX,
            py: localY,
            pressure
        };
    }

    // --- Pointer lifecycle ---
    function onPointerDown(e) {
        // Track pointer for gesture detection
        activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        // If two fingers are down, start gesture mode (zoom/pan)
        if (activePointers.size === 2) {
            startGesture();
            // Cancel any in-progress stroke
            if (isDrawing && currentStroke) {
                cancelCurrentStroke();
            }
            return;
        }

        // If gesture is active, ignore additional pointers for drawing
        if (gestureActive || activePointers.size > 1) return;

        if (e.button !== undefined && e.button !== 0) return;
        e.preventDefault();

        isDrawing = true;
        redoHistory = [];

        const pt = getNormPoint(e);
        currentStroke = {
            stroke_id: `s_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
            brush:     currentBrush,
            color:     currentColor,
            size:      currentSize,
            opacity:   currentOpacity,
            pressure_enabled: pressureEnabled,
            smoothing: currentSmoothing,
            phone_width:  cssW,
            phone_height: cssH,
            aspect_ratio: cssW / Math.max(1, cssH),
            points: [pt]
        };

        renderIncremental(currentStroke, [pt]);
        wsSend({
            type: 'stroke_start',
            stroke_id: currentStroke.stroke_id,
            brush: currentStroke.brush,
            color: currentStroke.color,
            size:  currentStroke.size,
            opacity: currentStroke.opacity,
            pressure_enabled: currentStroke.pressure_enabled,
            smoothing: currentStroke.smoothing,
            phone_width:  currentStroke.phone_width,
            phone_height: currentStroke.phone_height,
            aspect_ratio: currentStroke.aspect_ratio,
            points: [{ x: pt.x, y: pt.y, pressure: pt.pressure }]
        });
    }

    function onPointerMove(e) {
        // Update tracked pointer
        if (activePointers.has(e.pointerId)) {
            activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        }

        // Handle gesture
        if (gestureActive && activePointers.size >= 2) {
            handleGestureMove();
            return;
        }

        if (!isDrawing || !currentStroke) return;
        if (activePointers.size > 1) return; // Don't draw during multi-touch
        e.preventDefault();

        const rawEvents = (e.getCoalescedEvents && e.getCoalescedEvents().length > 0)
            ? e.getCoalescedEvents() : [e];

        const newPts = [];
        for (const evt of rawEvents) {
            const pt = getNormPoint(evt);
            newPts.push(pt);
            currentStroke.points.push(pt);
        }

        if (newPts.length > 0) {
            renderIncremental(currentStroke, currentStroke.points);
            wsSend({
                type: 'stroke_points',
                stroke_id: currentStroke.stroke_id,
                brush: currentStroke.brush,
                color: currentStroke.color,
                size:  currentStroke.size,
                opacity: currentStroke.opacity,
                pressure_enabled: currentStroke.pressure_enabled,
                smoothing: currentStroke.smoothing,
                phone_width:  currentStroke.phone_width,
                phone_height: currentStroke.phone_height,
                aspect_ratio: currentStroke.aspect_ratio,
                points: newPts.map(p => ({ x: p.x, y: p.y, pressure: p.pressure }))
            });
        }
    }

    function onPointerUp(e) {
        activePointers.delete(e.pointerId);

        // End gesture if fingers lifted
        if (gestureActive && activePointers.size < 2) {
            gestureActive = false;
        }

        if (!isDrawing || !currentStroke) return;
        e.preventDefault();

        isDrawing = false;
        if (currentStroke.points.length > 0) {
            strokeHistory.push(currentStroke);
            updateUndoRedoUI();
        }
        wsSend({ type: 'stroke_end', stroke_id: currentStroke.stroke_id });
        currentStroke = null;
    }

    function cancelCurrentStroke() {
        if (currentStroke) {
            wsSend({ type: 'stroke_end', stroke_id: currentStroke.stroke_id });
        }
        isDrawing = false;
        currentStroke = null;
        redrawAll();
    }

    // --- Pinch-to-zoom / two-finger pan ---
    function startGesture() {
        gestureActive = true;
        const pts = Array.from(activePointers.values());
        if (pts.length < 2) return;
        gestureStartDist  = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        gestureStartScale = zoomScale;
        gestureStartPanX  = panX;
        gestureStartPanY  = panY;
        gestureStartMidX  = (pts[0].x + pts[1].x) / 2;
        gestureStartMidY  = (pts[0].y + pts[1].y) / 2;
    }

    function handleGestureMove() {
        const pts = Array.from(activePointers.values());
        if (pts.length < 2) return;
        const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        const midX = (pts[0].x + pts[1].x) / 2;
        const midY = (pts[0].y + pts[1].y) / 2;

        // Scale
        const ratio = dist / Math.max(1, gestureStartDist);
        zoomScale = Math.max(0.25, Math.min(8, gestureStartScale * ratio));

        // Pan
        panX = gestureStartPanX + (midX - gestureStartMidX);
        panY = gestureStartPanY + (midY - gestureStartMidY);

        applyCanvasTransform();
    }

    // Attach listeners
    viewport.addEventListener('pointerdown',   onPointerDown,   { passive: false });
    viewport.addEventListener('pointermove',   onPointerMove,   { passive: false });
    viewport.addEventListener('pointerup',     onPointerUp,     { passive: false });
    viewport.addEventListener('pointercancel', onPointerUp,     { passive: false });
    viewport.addEventListener('pointerleave',  onPointerUp,     { passive: false });

    // Prevent default touch behaviour that could scroll the page
    viewport.addEventListener('touchstart', e => { if (e.touches.length === 1) e.preventDefault(); }, { passive: false });

    // ================================================================
    //  3. BRUSH ENGINE  — 6 distinct renderers
    // ================================================================
    const BrushEngine = {
        dispatch(strokeData, pixelPts) {
            if (pixelPts.length === 0) return;
            ctx.save();
            const pts = SmoothingFilter.apply(pixelPts, strokeData.smoothing);
            const b = strokeData.brush;
            if (b === 'eraser') {
                ctx.globalCompositeOperation = 'destination-out';
                this.pen(pts, 'rgba(0,0,0,1)', strokeData.size, 1.0);
            } else {
                ctx.globalCompositeOperation = 'source-over';
                if (b === 'pen')      this.pen(pts, strokeData.color, strokeData.size, strokeData.opacity);
                else if (b === 'pencil')  this.pencil(pts, strokeData.color, strokeData.size, strokeData.opacity);
                else if (b === 'marker')  this.marker(pts, strokeData.color, strokeData.size, strokeData.opacity);
                else if (b === 'soft')    this.soft(pts, strokeData.color, strokeData.size, strokeData.opacity);
                else if (b === 'airbrush')this.airbrush(pts, strokeData.color, strokeData.size, strokeData.opacity);
                else                      this.pen(pts, strokeData.color, strokeData.size, strokeData.opacity);
            }
            ctx.restore();
        },

        /** PEN — crisp solid line, round caps, pressure → width */
        pen(pts, color, size, opacity) {
            ctx.globalAlpha = opacity;
            ctx.strokeStyle = color;
            ctx.fillStyle   = color;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            if (pts.length === 1) {
                const s = size * (0.3 + 0.7 * pts[0].pressure);
                ctx.beginPath(); ctx.arc(pts[0].px, pts[0].py, s/2, 0, Math.PI*2); ctx.fill();
                return;
            }
            for (let i = 0; i < pts.length - 1; i++) {
                const s = size * (0.3 + 0.7 * pts[i+1].pressure);
                ctx.lineWidth = s;
                ctx.beginPath();
                ctx.moveTo(pts[i].px, pts[i].py);
                ctx.lineTo(pts[i+1].px, pts[i+1].py);
                ctx.stroke();
            }
        },

        /** PENCIL — textured, lower opacity, graphite grain */
        pencil(pts, color, size, opacity) {
            ctx.globalAlpha = opacity * 0.6;
            ctx.strokeStyle = color;
            ctx.fillStyle   = color;
            ctx.lineCap = 'round';
            for (let i = 0; i < pts.length - 1; i++) {
                const p1 = pts[i], p2 = pts[i+1];
                const s = Math.max(1, size * (0.2 + 0.6 * p2.pressure));
                ctx.lineWidth = s;
                ctx.beginPath(); ctx.moveTo(p1.px, p1.py); ctx.lineTo(p2.px, p2.py); ctx.stroke();
                // Texture scatter
                const dist = Math.hypot(p2.px - p1.px, p2.py - p1.py);
                const steps = Math.ceil(dist / 3);
                for (let k = 0; k < steps; k++) {
                    const t = k / Math.max(1, steps);
                    ctx.fillRect(
                        p1.px + (p2.px-p1.px)*t + (Math.random()-.5)*s*.5,
                        p1.py + (p2.py-p1.py)*t + (Math.random()-.5)*s*.5,
                        1, 1
                    );
                }
            }
        },

        /** MARKER — semi-transparent chisel, square caps, overlapping buildup */
        marker(pts, color, size, opacity) {
            ctx.globalAlpha = opacity * 0.4;
            ctx.strokeStyle = color;
            ctx.lineCap  = 'square';
            ctx.lineJoin = 'miter';
            for (let i = 0; i < pts.length - 1; i++) {
                ctx.lineWidth = size * 1.3;
                ctx.beginPath();
                ctx.moveTo(pts[i].px, pts[i].py);
                ctx.lineTo(pts[i+1].px, pts[i+1].py);
                ctx.stroke();
            }
        },

        /** SOFT BRUSH — radial-gradient stamps for blurred edge */
        soft(pts, color, size, opacity) {
            ctx.globalAlpha = opacity * 0.35;
            for (let i = 0; i < pts.length - 1; i++) {
                const p1 = pts[i], p2 = pts[i+1];
                const s = size * (0.4 + 0.6 * p2.pressure);
                const dist = Math.hypot(p2.px-p1.px, p2.py-p1.py);
                const steps = Math.max(1, Math.ceil(dist / Math.max(1, s*0.25)));
                for (let k = 0; k <= steps; k++) {
                    const t = k / steps;
                    const cx = p1.px + (p2.px-p1.px)*t;
                    const cy = p1.py + (p2.py-p1.py)*t;
                    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, s/2);
                    g.addColorStop(0, color);
                    g.addColorStop(1, 'transparent');
                    ctx.fillStyle = g;
                    ctx.beginPath(); ctx.arc(cx, cy, s/2, 0, Math.PI*2); ctx.fill();
                }
            }
        },

        /** AIRBRUSH — atomised particle spray */
        airbrush(pts, color, size, opacity) {
            ctx.globalAlpha = opacity * 0.45;
            ctx.fillStyle = color;
            for (const p of pts) {
                const r = (size/2) * (0.4 + 0.6 * p.pressure);
                const density = Math.floor(r * 4);
                for (let d = 0; d < density; d++) {
                    const a = Math.random() * Math.PI * 2;
                    const dist = Math.random() * r;
                    ctx.fillRect(p.px + dist*Math.cos(a), p.py + dist*Math.sin(a), 1.5, 1.5);
                }
            }
        }
    };

    // ================================================================
    //  4. SMOOTHING FILTER  — Chaikin subdivision
    // ================================================================
    const SmoothingFilter = {
        apply(pts, level) {
            if (level === 'off' || pts.length <= 2) return pts;
            let iters = level === 'low' ? 1 : level === 'medium' ? 2 : 3;
            let r = pts;
            for (let n = 0; n < iters; n++) {
                const s = [r[0]];
                for (let i = 0; i < r.length - 1; i++) {
                    const a = r[i], b = r[i+1];
                    s.push({
                        px: .75*a.px + .25*b.px,
                        py: .75*a.py + .25*b.py,
                        pressure: .75*a.pressure + .25*b.pressure
                    }, {
                        px: .25*a.px + .75*b.px,
                        py: .25*a.py + .75*b.py,
                        pressure: .25*a.pressure + .75*b.pressure
                    });
                }
                s.push(r[r.length-1]);
                r = s;
            }
            return r;
        }
    };

    // ================================================================
    //  5. STROKE MANAGER  — history, redraw
    // ================================================================
    function redrawAll() {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
        ctx.restore();

        // Fill background
        ctx.save();
        ctx.fillStyle = canvasBg;
        ctx.fillRect(0, 0, cssW, cssH);
        ctx.restore();

        for (const stroke of strokeHistory) {
            renderComplete(stroke);
        }
        // Re-render the in-progress stroke if any
        if (currentStroke && currentStroke.points.length > 0) {
            renderComplete(currentStroke);
        }
        updateUndoRedoUI();
    }

    /** Render a complete stroke from its normalised point data */
    function renderComplete(stroke) {
        const pxPts = stroke.points.map(p => ({
            px: (p.px !== undefined) ? p.px : p.x * cssW,
            py: (p.py !== undefined) ? p.py : p.y * cssH,
            pressure: p.pressure
        }));
        BrushEngine.dispatch(stroke, pxPts);
    }

    /** Incremental render of the full in-progress stroke (clears & redraws all for compositing correctness) */
    function renderIncremental(stroke, allPts) {
        // For compositing operations (eraser) and brush blending to be correct,
        // we must redraw from scratch. For performance with many strokes,
        // a more sophisticated dirty-rect system could be added later.
        redrawAll();
    }

    function handleUndo() {
        if (strokeHistory.length === 0) return;
        redoHistory.push(strokeHistory.pop());
        redrawAll();
        wsSend({ type: 'undo' });
    }

    function handleRedo() {
        if (redoHistory.length === 0) return;
        strokeHistory.push(redoHistory.pop());
        redrawAll();
        wsSend({ type: 'redo' });
    }

    function handleClear() {
        strokeHistory = [];
        redoHistory = [];
        redrawAll();
        wsSend({ type: 'clear' });
    }

    function updateUndoRedoUI() {
        btnUndo.disabled = strokeHistory.length === 0;
        btnRedo.disabled = redoHistory.length === 0;
    }

    // ================================================================
    //  6. UI CONTROLLER  — DOM bindings, settings, brush preview
    // ================================================================
    function initUI() {
        // Restore persisted values
        sliderSize.value = currentSize;
        sizeVal.textContent = currentSize + 'px';
        sliderOpacity.value = Math.round(currentOpacity * 100);
        opacityVal.textContent = Math.round(currentOpacity * 100) + '%';
        customColorIn.value = currentColor.length === 7 ? currentColor : '#000000';
        selectGridSize.value = gridSize;
        selectBg.value = canvasBg;
        viewport.style.backgroundColor = canvasBg;
        updatePressureUI();
        highlightActiveSmoothing();
        highlightActiveBrush();
        highlightActiveColor();
        highlightActiveQuickSize();
        updateBrushPreview();

        // ---- Brush strip ----
        brushBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const b = btn.dataset.brush;
                if (b === 'eraser' && currentBrush !== 'eraser') previousBrush = currentBrush;
                currentBrush = b;
                highlightActiveBrush();
                updateBrushPreview();
            });
        });

        // ---- Size slider + quick sizes ----
        sliderSize.addEventListener('input', () => {
            currentSize = parseInt(sliderSize.value, 10);
            sizeVal.textContent = currentSize + 'px';
            localStorage.setItem('pdp_size', currentSize);
            highlightActiveQuickSize();
            updateBrushPreview();
        });

        quickSizeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                currentSize = parseInt(btn.dataset.size, 10);
                sliderSize.value = currentSize;
                sizeVal.textContent = currentSize + 'px';
                localStorage.setItem('pdp_size', currentSize);
                highlightActiveQuickSize();
                updateBrushPreview();
            });
        });

        // ---- Opacity slider ----
        sliderOpacity.addEventListener('input', () => {
            currentOpacity = parseInt(sliderOpacity.value, 10) / 100;
            opacityVal.textContent = Math.round(currentOpacity * 100) + '%';
            localStorage.setItem('pdp_opacity', currentOpacity);
            updateBrushPreview();
        });

        // ---- Color palette ----
        colorDots.forEach(dot => {
            dot.addEventListener('click', () => {
                currentColor = dot.dataset.color;
                localStorage.setItem('pdp_color', currentColor);
                highlightActiveColor();
                if (currentBrush === 'eraser') {
                    currentBrush = previousBrush || 'pen';
                    highlightActiveBrush();
                }
                updateBrushPreview();
            });
        });
        customColorIn.addEventListener('input', () => {
            currentColor = customColorIn.value;
            localStorage.setItem('pdp_color', currentColor);
            colorDots.forEach(d => d.classList.remove('active'));
            if (currentBrush === 'eraser') {
                currentBrush = previousBrush || 'pen';
                highlightActiveBrush();
            }
            updateBrushPreview();
        });

        // ---- Smoothing ----
        smoothBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                currentSmoothing = btn.dataset.smooth;
                localStorage.setItem('pdp_smooth', currentSmoothing);
                highlightActiveSmoothing();
            });
        });

        // ---- Zoom / Fit ----
        btnZoomFit.addEventListener('click', resetView);

        // ---- Grid toggle ----
        btnGridToggle.addEventListener('click', () => {
            gridVisible = !gridVisible;
            btnGridToggle.classList.toggle('active', gridVisible);
            updateGridOverlay();
        });

        // ---- Clear with confirmation ----
        btnClear.addEventListener('click', () => clearModal.classList.remove('hidden'));
        btnModalCancel.addEventListener('click', () => clearModal.classList.add('hidden'));
        btnModalConfirm.addEventListener('click', () => { clearModal.classList.add('hidden'); handleClear(); });

        // ---- Undo / Redo ----
        btnUndo.addEventListener('click', handleUndo);
        btnRedo.addEventListener('click', handleRedo);

        // ---- Settings panel ----
        btnSettings.addEventListener('click', () => settingsPanel.classList.remove('hidden'));
        btnCloseSettings.addEventListener('click', () => settingsPanel.classList.add('hidden'));

        btnPressure.addEventListener('click', () => {
            pressureEnabled = !pressureEnabled;
            localStorage.setItem('pdp_pressure', pressureEnabled);
            updatePressureUI();
        });

        selectGridSize.addEventListener('change', () => {
            gridSize = parseInt(selectGridSize.value, 10);
            localStorage.setItem('pdp_gridsize', gridSize);
            updateGridOverlay();
        });

        selectBg.addEventListener('change', () => {
            canvasBg = selectBg.value;
            localStorage.setItem('pdp_bg', canvasBg);
            viewport.style.backgroundColor = canvasBg;
            redrawAll();
        });

        btnFullReset.addEventListener('click', () => {
            strokeHistory = [];
            redoHistory = [];
            resetView();
            redrawAll();
            wsSend({ type: 'clear' });
            settingsPanel.classList.add('hidden');
        });
    }

    function highlightActiveBrush() {
        brushBtns.forEach(b => b.classList.toggle('active', b.dataset.brush === currentBrush));
    }

    function highlightActiveColor() {
        colorDots.forEach(d => d.classList.toggle('active', d.dataset.color.toLowerCase() === currentColor.toLowerCase()));
    }

    function highlightActiveSmoothing() {
        smoothBtns.forEach(b => b.classList.toggle('active', b.dataset.smooth === currentSmoothing));
    }

    function highlightActiveQuickSize() {
        quickSizeBtns.forEach(b => b.classList.toggle('active', parseInt(b.dataset.size,10) === currentSize));
    }

    function updatePressureUI() {
        btnPressure.textContent = pressureEnabled ? 'ON' : 'OFF';
        btnPressure.classList.toggle('active', pressureEnabled);
    }

    /** Draws a small live preview of the current brush/color/size/opacity */
    function updateBrushPreview() {
        const w = 40, h = 40;
        previewCtx.clearRect(0, 0, w, h);
        // Background
        previewCtx.fillStyle = canvasBg;
        previewCtx.fillRect(0, 0, w, h);

        const fakePts = [
            { px: 8,  py: 32, pressure: 0.4 },
            { px: 14, py: 20, pressure: 0.6 },
            { px: 20, py: 14, pressure: 0.8 },
            { px: 28, py: 10, pressure: 1.0 },
            { px: 34, py: 8,  pressure: 0.7 }
        ];

        const previewSize = Math.min(currentSize, 18);
        previewCtx.save();
        if (currentBrush === 'eraser') {
            // Show eraser preview as a dotted circle
            previewCtx.strokeStyle = '#ff6b6b';
            previewCtx.setLineDash([2, 2]);
            previewCtx.lineWidth = 1.5;
            previewCtx.beginPath();
            previewCtx.arc(20, 20, Math.min(previewSize, 14), 0, Math.PI*2);
            previewCtx.stroke();
        } else {
            previewCtx.globalAlpha = currentOpacity;
            previewCtx.strokeStyle = currentColor;
            previewCtx.fillStyle   = currentColor;
            previewCtx.lineCap = 'round';
            previewCtx.lineJoin = 'round';
            previewCtx.lineWidth = previewSize * 0.5;
            previewCtx.beginPath();
            previewCtx.moveTo(fakePts[0].px, fakePts[0].py);
            for (let i = 1; i < fakePts.length; i++) {
                previewCtx.lineTo(fakePts[i].px, fakePts[i].py);
            }
            previewCtx.stroke();
        }
        previewCtx.restore();
    }

    // ================================================================
    //  7. NETWORK CLIENT  — WebSocket
    // ================================================================
    function connectWS() {
        const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
        const url   = `${proto}//${location.host}/ws?role=phone`;
        setConnUI('connecting', 'Connecting…');

        try {
            socket = new WebSocket(url);
            socket.onopen = () => {
                wsConnected = true;
                reconnAttempts = 0;
                setConnUI('connected', 'Connected');
                startPing();
                // Sync full history on connect
                wsSend({
                    type: 'sync_history',
                    phone_width:  cssW,
                    phone_height: cssH,
                    aspect_ratio: cssW / Math.max(1, cssH),
                    strokes: strokeHistory
                });
            };
            socket.onmessage = (ev) => {
                try { const m = JSON.parse(ev.data); /* pong etc */ } catch(e) {}
            };
            socket.onclose = () => {
                wsConnected = false;
                stopPing();
                setConnUI('disconnected', 'Disconnected');
                scheduleReconn();
            };
            socket.onerror = () => socket.close();
        } catch(e) { scheduleReconn(); }
    }

    function scheduleReconn() {
        reconnAttempts++;
        setTimeout(() => { if (!wsConnected) connectWS(); },
                   Math.min(5000, 1000 * Math.pow(1.5, reconnAttempts)));
    }

    function startPing() {
        stopPing();
        pingTimer = setInterval(() => {
            if (wsConnected && socket.readyState === WebSocket.OPEN)
                socket.send(JSON.stringify({ type: 'ping' }));
        }, 15000);
    }
    function stopPing() { if (pingTimer) { clearInterval(pingTimer); pingTimer = null; } }

    function wsSend(data) {
        if (wsConnected && socket && socket.readyState === WebSocket.OPEN)
            socket.send(JSON.stringify(data));
    }

    function setConnUI(state, text) {
        connText.textContent = text;
        connBadge.className = 'conn-badge conn-' + state;
    }

    // ================================================================
    //  BOOT
    // ================================================================
    window.addEventListener('DOMContentLoaded', () => {
        setupCanvas();
        initUI();
        connectWS();
    });

})();
