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
    const btnFullscreen   = $('#btn-fullscreen');
    const btnThemeQuick   = $('#btn-theme-quick');
    const zoomBadge       = $('#zoom-badge');
    const zoomText        = $('#zoom-text');

    // Studio Dock & Drawers
    const dockDrawer      = $('#dock-drawer');
    const drawerPanes     = $$('.drawer-pane');
    const tabTriggerSize  = $('#tab-trigger-size');
    const tabTriggerColor = $('#tab-trigger-color');
    const tabTriggerTools = $('#tab-trigger-tools');
    const dockSizeLabel   = $('#dock-size-label');
    const dockColorBubble = $('#dock-color-bubble');

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
    const btnImportImgPhone   = $('#btn-import-img-phone');
    const labelImportImgPhone = $('#label-import-img-phone');
    const btnClearImgPhone    = $('#btn-clear-img-phone');
    const inputImportImage    = $('#input-import-image');

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
    let currentColor    = localStorage.getItem('pdp_color')   || '#ffffff';
    let currentSize     = parseInt(localStorage.getItem('pdp_size') || '12', 10);
    let currentOpacity  = parseFloat(localStorage.getItem('pdp_opacity') || '1.0');
    let currentSmoothing= localStorage.getItem('pdp_smooth')  || 'medium';
    let pressureEnabled = localStorage.getItem('pdp_pressure') !== 'false';
    let previousBrush   = 'pen';

    // Shapes State & Icons
    let currentShape = 'circle';
    let isPhoneDrawingShape = false;
    let phoneShapeStart = null;
    let phoneShapeCurrent = null;
    let inProgressPhoneShapePts = null;
    let phoneShapeStrokeId = null;
    let remotePhoneShapePreview = null;

    const SHAPE_SVGS = {
        'circle': `<svg class="tool-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="9"/></svg>`,
        'rectangle': `<svg class="tool-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="4" width="18" height="16" rx="1"/></svg>`,
        'line': `<svg class="tool-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="4" y1="20" x2="20" y2="4"/></svg>`,
        'arrow': `<svg class="tool-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="19" x2="19" y2="5"/><polyline points="10 5 19 5 19 14"/></svg>`,
        'triangle': `<svg class="tool-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><polygon points="12 3 21 20 3 20"/></svg>`,
        'star': `<svg class="tool-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
        'diamond': `<svg class="tool-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><polygon points="12 2 22 12 12 22 2 12"/></svg>`
    };
    let canvasBg        = localStorage.getItem('pdp_bg') || '#111726';
    let gridSize        = parseInt(localStorage.getItem('pdp_gridsize') || '24', 10);
    let gridVisible     = false;
    let currentBgImage  = null;
    let phoneFitMode    = localStorage.getItem('pdp_fit_mode') || 'auto';
    let activeArtboardAspect = 2048 / 1536;

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

        if (zoomBadge && zoomText) {
            if (zoomScale !== 1 || panX !== 0 || panY !== 0) {
                zoomBadge.classList.remove('hidden');
                zoomText.textContent = Math.round(zoomScale * 100) + '%';
            } else {
                zoomBadge.classList.add('hidden');
            }
        }
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
    //  2. ARTBOARD & INPUT MANAGER — Unified 1:1 Aspect Ratio Mapping
    // ================================================================
    function getPhoneArtboardMapping() {
        const viewW = cssW;
        const viewH = cssH;
        const viewAspect = viewW / Math.max(1, viewH);

        let targetAspect;
        if (phoneFitMode === 'phone') {
            targetAspect = viewAspect;
        } else if (phoneFitMode === 'landscape') {
            targetAspect = 16 / 9;
        } else {
            // 'auto': match imported image aspect ratio if present, or active artboard
            if (currentBgImage && currentBgImage.aspect_ratio) {
                targetAspect = currentBgImage.aspect_ratio;
            } else {
                targetAspect = activeArtboardAspect || (2048 / 1536);
            }
        }

        let artW, artH, artX, artY;
        if (targetAspect > viewAspect) {
            artW = viewW;
            artH = viewW / targetAspect;
            artX = 0;
            artY = (viewH - artH) / 2;
        } else {
            artH = viewH;
            artW = viewH * targetAspect;
            artX = (viewW - artW) / 2;
            artY = 0;
        }

        return {
            viewW,
            viewH,
            artW,
            artH,
            artX,
            artY,
            targetAspect
        };
    }

    let lastNormPtX = null;
    let lastNormPtY = null;
    let lastHoverTime = 0;

    function getNormPoint(e) {
        const rect = getCanvasRect();
        const localX = (e.clientX - rect.left - panX) / zoomScale;
        const localY = (e.clientY - rect.top  - panY) / zoomScale;

        const mapping = getPhoneArtboardMapping();
        const normX = (localX - mapping.artX) / Math.max(1, mapping.artW);
        const normY = (localY - mapping.artY) / Math.max(1, mapping.artH);

        let pressure = 0.5;
        if (pressureEnabled && e.pressure !== undefined && e.pressure > 0) {
            pressure = e.pressure;
        } else if (!pressureEnabled) {
            pressure = 1.0;
        }

        const tiltX = (e.tiltX !== undefined) ? e.tiltX : 0;
        const tiltY = (e.tiltY !== undefined) ? e.tiltY : 0;
        const altitude = (e.altitudeAngle !== undefined) ? Math.round(e.altitudeAngle * 180 / Math.PI) : null;
        const azimuth = (e.azimuthAngle !== undefined) ? Math.round((e.azimuthAngle * 180 / Math.PI + 360) % 360) : null;

        let angle = 0;
        let tilt = 0;
        if (tiltX !== 0 || tiltY !== 0) {
            tilt = Math.round(Math.hypot(tiltX, tiltY));
            angle = Math.round((Math.atan2(tiltY, tiltX) * 180 / Math.PI + 360) % 360);
        } else if (altitude !== null && azimuth !== null) {
            tilt = Math.round(90 - altitude);
            angle = azimuth;
        } else if (lastNormPtX !== null && lastNormPtY !== null) {
            const dX = normX - lastNormPtX;
            const dY = normY - lastNormPtY;
            if (Math.hypot(dX, dY) > 0.002) {
                angle = Math.round(((Math.atan2(dY, dX) * 180 / Math.PI + 360) % 360) * 10) / 10;
                tilt = Math.round(30 + Math.min(1.0, Math.hypot(dX, dY) * 25) * 35);
            }
        }
        lastNormPtX = normX;
        lastNormPtY = normY;

        return {
            x: Math.max(-0.2, Math.min(1.2, normX)),
            y: Math.max(-0.2, Math.min(1.2, normY)),
            px: localX,
            py: localY,
            pressure,
            tilt_x: tiltX,
            tilt_y: tiltY,
            altitude,
            azimuth,
            angle,
            tilt
        };
    }

    // --- Pointer lifecycle ---
    function onPointerDown(e) {
        if (viewport.setPointerCapture) {
            try { viewport.setPointerCapture(e.pointerId); } catch (_) {}
        }

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

        // Close any floating drawer while drawing for clean canvas
        closeAllDrawers();

        if (e.button !== undefined && e.button !== 0) return;
        e.preventDefault();

        // Check if color bucket / paint fill tool is active
        if (currentBrush === 'bucket') {
            const pt = getNormPoint(e);
            performPhoneAnimatedFill(pt.x, pt.y, currentColor, true);
            return;
        }

        // Check if shapes tool is active
        if (currentBrush === 'shape') {
            isPhoneDrawingShape = true;
            phoneShapeStart = getNormPoint(e);
            phoneShapeCurrent = { ...phoneShapeStart };
            phoneShapeStrokeId = `s_shape_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
            inProgressPhoneShapePts = generateShapePoints(currentShape, phoneShapeStart, phoneShapeCurrent);
            return;
        }

        // Check if text tool is active
        if (currentBrush === 'text') {
            const pt = getNormPoint(e);
            handlePhoneTextTap(pt);
            return;
        }

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
            points: [{
                x: pt.x,
                y: pt.y,
                pressure: pt.pressure,
                tilt_x: pt.tilt_x,
                tilt_y: pt.tilt_y,
                angle: pt.angle,
                tilt: pt.tilt
            }]
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

        if (isPhoneDrawingShape && phoneShapeStart) {
            e.preventDefault();
            phoneShapeCurrent = getNormPoint(e);
            inProgressPhoneShapePts = generateShapePoints(currentShape, phoneShapeStart, phoneShapeCurrent);
            scheduleLocalRedraw();
            if (inProgressPhoneShapePts && inProgressPhoneShapePts.length > 1) {
                wsSend({
                    type: 'shape_preview',
                    shape: currentShape,
                    color: currentColor,
                    size: currentSize,
                    opacity: currentOpacity,
                    points: inProgressPhoneShapePts
                });
            }
            return;
        }

        if (!isDrawing || !currentStroke) {
            if (activePointers.size <= 1) {
                const now = performance.now();
                if (now - lastHoverTime > 35) {
                    lastHoverTime = now;
                    const pt = getNormPoint(e);
                    wsSend({
                        type: 'pointer_hover',
                        x: pt.x,
                        y: pt.y,
                        pressure: 0,
                        tilt_x: pt.tilt_x,
                        tilt_y: pt.tilt_y,
                        angle: pt.angle,
                        tilt: pt.tilt
                    });
                }
            }
            return;
        }
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
            scheduleLocalRedraw();
            // Direct zero-latency WebSocket stream to laptop as finger moves
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
                points: newPts.map(p => ({
                    x: p.x,
                    y: p.y,
                    pressure: p.pressure,
                    tilt_x: p.tilt_x,
                    tilt_y: p.tilt_y,
                    angle: p.angle,
                    tilt: p.tilt
                }))
            });
        }
    }

    function onPointerUp(e) {
        if (viewport.releasePointerCapture) {
            try { viewport.releasePointerCapture(e.pointerId); } catch (_) {}
        }
        activePointers.delete(e.pointerId);

        // End gesture if fingers lifted
        if (gestureActive && activePointers.size < 2) {
            gestureActive = false;
        }

        if (isPhoneDrawingShape && phoneShapeStart && phoneShapeCurrent) {
            isPhoneDrawingShape = false;
            const pts = inProgressPhoneShapePts || generateShapePoints(currentShape, phoneShapeStart, phoneShapeCurrent);
            inProgressPhoneShapePts = null;
            phoneShapeStart = null;
            phoneShapeCurrent = null;

            if (pts && pts.length > 2) {
                const strokeId = phoneShapeStrokeId || `s_shape_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
                phoneShapeStrokeId = null;
                const shapeStroke = {
                    stroke_id: strokeId,
                    brush: 'pen',
                    isShape: true,
                    shapeType: currentShape,
                    color: currentColor,
                    size: currentSize,
                    opacity: currentOpacity,
                    pressure_enabled: false,
                    smoothing: 'off',
                    phone_width: cssW,
                    phone_height: cssH,
                    aspect_ratio: cssW / Math.max(1, cssH),
                    points: pts
                };
                strokeHistory.push(shapeStroke);
                redoHistory = [];
                updateUndoRedoUI();
                redrawAll();
                wsSend({
                    type: 'stroke_start',
                    ...shapeStroke,
                    points: [pts[0]]
                });
                wsSend({
                    type: 'stroke_points',
                    stroke_id: strokeId,
                    points: pts.slice(1)
                });
                wsSend({
                    type: 'stroke_end',
                    stroke_id: strokeId
                });
            }
            return;
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
        redrawAll();
    }

    function cancelCurrentStroke() {
        if (viewport.releasePointerCapture) {
            try { viewport.releasePointerCapture(); } catch (_) {}
        }
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
    viewport.addEventListener('pointerleave',  (e) => {
        if (e.pointerType === 'mouse') onPointerUp(e);
    }, { passive: false });

    // Prevent default touch behaviour that could scroll the page or delay pointer events
    viewport.addEventListener('touchstart', e => { if (e.touches.length === 1) e.preventDefault(); }, { passive: false });
    viewport.addEventListener('touchmove', e => { if (e.touches.length === 1) e.preventDefault(); }, { passive: false });

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
            ctx.globalAlpha = opacity * 0.45;
            ctx.strokeStyle = color;
            ctx.lineCap  = 'square';
            ctx.lineJoin = 'miter';
            if (pts.length === 1) {
                const s = Math.max(1, size * 1.35);
                ctx.fillStyle = color;
                ctx.fillRect(pts[0].px - s / 2, pts[0].py - s / 2, s, s);
                return;
            }
            for (let i = 0; i < pts.length - 1; i++) {
                ctx.lineWidth = Math.max(1, size * 1.35);
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

        const mapping = getPhoneArtboardMapping();

        // 1. Fill surrounding workspace (neutral deep tone)
        ctx.save();
        ctx.fillStyle = '#080a0f';
        ctx.fillRect(0, 0, cssW, cssH);

        // 2. Fill Artboard Canvas
        ctx.fillStyle = canvasBg;
        ctx.fillRect(mapping.artX, mapping.artY, mapping.artW, mapping.artH);

        // 3. Draw imported reference image (fills the active artboard 100%!)
        if (currentBgImage && currentBgImage.img && currentBgImage.img.complete) {
            ctx.save();
            ctx.globalAlpha = currentBgImage.opacity !== undefined ? currentBgImage.opacity : 1.0;
            ctx.drawImage(currentBgImage.img, mapping.artX, mapping.artY, mapping.artW, mapping.artH);
            ctx.restore();
        }

        // 4. Subtle artboard boundary frame
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(mapping.artX, mapping.artY, mapping.artW, mapping.artH);
        ctx.restore();

        // 5. Draw completed and in-progress strokes
        for (const stroke of strokeHistory) {
            if (stroke === phoneEditingTextStroke) continue; // Hide underlying stroke while editor is open
            renderComplete(stroke);
        }
        if (currentStroke && currentStroke.points.length > 0) {
            renderComplete(currentStroke);
        }
        for (const stroke of remoteStrokesMap.values()) {
            renderComplete(stroke);
        }

        // Render in-progress shape preview while dragging
        if (isPhoneDrawingShape && inProgressPhoneShapePts && inProgressPhoneShapePts.length > 1) {
            renderComplete({
                brush: 'pen',
                color: currentColor,
                size: currentSize,
                opacity: currentOpacity,
                smoothing: 'off',
                points: inProgressPhoneShapePts
            });
        }

        // Render in-progress remote shape preview from counterpart device
        if (remotePhoneShapePreview && remotePhoneShapePreview.points && remotePhoneShapePreview.points.length > 1) {
            renderComplete(remotePhoneShapePreview);
        }

        updateUndoRedoUI();
    }

    /** Render a complete stroke from its normalised point data */
    function renderComplete(stroke) {
        if (!stroke) return;
        const mapping = getPhoneArtboardMapping();

        if (stroke.isText) {
            renderPhoneTextStroke(stroke, mapping);
            return;
        }

        if (stroke.isFill && stroke.fillCanvas && stroke.normBounds) {
            ctx.save();
            ctx.globalAlpha = stroke.opacity !== undefined ? stroke.opacity : 1.0;
            const destX = mapping.artX + stroke.normBounds.x * mapping.artW;
            const destY = mapping.artY + stroke.normBounds.y * mapping.artH;
            const destW = stroke.normBounds.w * mapping.artW;
            const destH = stroke.normBounds.h * mapping.artH;
            ctx.drawImage(stroke.fillCanvas, destX, destY, destW, destH);
            ctx.restore();
            return;
        }

        if (!stroke.points || stroke.points.length === 0) return;

        const pxPts = stroke.points.map(p => {
            const nx = p.x !== undefined ? p.x : 0;
            const ny = p.y !== undefined ? p.y : 0;
            return {
                px: mapping.artX + nx * mapping.artW,
                py: mapping.artY + ny * mapping.artH,
                pressure: p.pressure
            };
        });

        // 1:1 Artboard Proportional Stroke Scaling:
        // Ensures brush stroke width relative to the artboard is 100% identical on phone & laptop!
        const scaleFactor = mapping.artW / 600;
        const scaledStroke = {
            ...stroke,
            size: Math.max(1.0, stroke.size * scaleFactor)
        };

        BrushEngine.dispatch(scaledStroke, pxPts);
    }

    // ================================================================
    //  PHONE SMART TEXT BOX ENGINE
    // ================================================================
    let phoneTextFontSize = 24;
    let phoneTextBoxStyle = 'glass';
    let phoneEditingTextStroke = null;
    let phoneTextNormPos = null;

    let customPhoneBoxWidth = null;
    let customPhoneBoxHeight = null;
    let isMovingPhoneCard = false;
    let isResizingPhoneCard = false;

    const phoneTextOverlay = document.getElementById('phone-text-overlay');
    const phoneTextToolbar = document.getElementById('phone-text-toolbar');
    const phoneTextCard = document.getElementById('phone-text-card');
    const phoneTextDragBar = document.getElementById('phone-text-drag-bar');
    const phoneSizeBadge = document.getElementById('phone-size-badge');
    const phoneTextInput = document.getElementById('phone-text-input');
    const btnPhoneTextSizeDown = document.getElementById('btn-phone-text-size-down');
    const btnPhoneTextSizeUp = document.getElementById('btn-phone-text-size-up');
    const phoneTextSizeVal = document.getElementById('phone-text-size-val');
    const phoneTextStyleChips = document.querySelectorAll('.phone-text-style-chip');
    const btnPhoneTextDel = document.getElementById('btn-phone-text-del');
    const btnPhoneTextDone = document.getElementById('btn-phone-text-done');

    function renderPhoneTextStroke(stroke, mapping) {
        if (!stroke.text) return;
        ctx.save();
        ctx.globalAlpha = stroke.opacity !== undefined ? stroke.opacity : 1.0;

        const scaleFactor = mapping.artW / 600;
        const fontSize = Math.max(8, (stroke.fontSize || 22) * scaleFactor);
        const fontFamily = stroke.fontFamily || 'Inter, sans-serif';
        ctx.font = `${fontSize}px ${fontFamily}`;
        ctx.textBaseline = 'top';

        const paddingX = (stroke.boxPaddingX || 16) * scaleFactor;
        const paddingY = (stroke.boxPaddingY || 12) * scaleFactor;
        const radius = (stroke.borderRadius || 12) * scaleFactor;
        const lineHeight = fontSize * 1.35;

        let targetBoxW = stroke.boxWidth ? stroke.boxWidth * scaleFactor : 0;
        let targetBoxH = stroke.boxHeight ? stroke.boxHeight * scaleFactor : 0;

        // Auto word-wrap if width constrained
        const rawLines = String(stroke.text || '').split('\n');
        const lines = [];
        const maxLineWidth = targetBoxW > 0 ? Math.max(30 * scaleFactor, targetBoxW - paddingX * 2) : 100000;

        for (const rawLine of rawLines) {
            if (!rawLine) {
                lines.push('');
                continue;
            }
            if (targetBoxW > 0 && ctx.measureText(rawLine).width > maxLineWidth) {
                const words = rawLine.split(' ');
                let curLine = words[0];
                for (let w = 1; w < words.length; w++) {
                    const testLine = curLine + ' ' + words[w];
                    if (ctx.measureText(testLine).width <= maxLineWidth) {
                        curLine = testLine;
                    } else {
                        lines.push(curLine);
                        curLine = words[w];
                    }
                }
                lines.push(curLine);
            } else {
                lines.push(rawLine);
            }
        }

        let maxTextW = 0;
        for (const line of lines) {
            const w = ctx.measureText(line).width;
            if (w > maxTextW) maxTextW = w;
        }

        const totalTextH = lines.length * lineHeight;
        const boxW = Math.max(targetBoxW || (70 * scaleFactor), maxTextW + paddingX * 2);
        const boxH = Math.max(targetBoxH || (30 * scaleFactor), totalTextH + paddingY * 2);

        const boxX = mapping.artX + stroke.x * mapping.artW;
        const boxY = mapping.artY + stroke.y * mapping.artH;

        stroke.normBounds = {
            x: stroke.x,
            y: stroke.y,
            w: boxW / mapping.artW,
            h: boxH / mapping.artH
        };

        const boxStyle = stroke.boxStyle || 'glass';
        if (boxStyle !== 'none') {
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(boxX, boxY, boxW, boxH, radius);
            } else {
                ctx.rect(boxX, boxY, boxW, boxH);
            }

            if (boxStyle === 'glass') {
                ctx.fillStyle = 'rgba(18, 24, 38, 0.88)';
                ctx.fill();
                ctx.lineWidth = Math.max(1, 1.5 * scaleFactor);
                ctx.strokeStyle = 'rgba(99, 102, 241, 0.55)';
                ctx.stroke();
            } else if (boxStyle === 'neon') {
                ctx.fillStyle = 'rgba(12, 15, 26, 0.94)';
                ctx.fill();
                ctx.lineWidth = Math.max(1.5, 2 * scaleFactor);
                ctx.strokeStyle = stroke.color || '#6366f1';
                ctx.shadowColor = stroke.color || '#6366f1';
                ctx.shadowBlur = 12 * scaleFactor;
                ctx.stroke();
                ctx.shadowColor = 'transparent';
            } else if (boxStyle === 'solid') {
                ctx.fillStyle = '#1e2337';
                ctx.fill();
                ctx.lineWidth = Math.max(1, 1.5 * scaleFactor);
                ctx.strokeStyle = '#3b4261';
                ctx.stroke();
            } else if (boxStyle === 'clean') {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
                ctx.fill();
                ctx.lineWidth = Math.max(1, 1.5 * scaleFactor);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
                ctx.stroke();
            }
        }

        ctx.fillStyle = stroke.color || '#ffffff';
        for (let i = 0; i < lines.length; i++) {
            const lineX = boxX + paddingX;
            const lineY = boxY + paddingY + i * lineHeight;
            ctx.fillText(lines[i], lineX, lineY);
        }

        ctx.restore();
    }

    function findPhoneTextStrokeAt(normX, normY) {
        const mapping = getPhoneArtboardMapping();
        for (let i = strokeHistory.length - 1; i >= 0; i--) {
            const s = strokeHistory[i];
            if (!s.isText) continue;
            if (!s.normBounds) {
                const scaleFactor = mapping.artW / 600;
                const approxW = Math.max(70 * scaleFactor, (s.boxWidth || 180) * scaleFactor);
                const approxH = Math.max(30 * scaleFactor, (s.boxHeight || 60) * scaleFactor);
                s.normBounds = {
                    x: s.x,
                    y: s.y,
                    w: approxW / mapping.artW,
                    h: approxH / mapping.artH
                };
            }
            const b = s.normBounds;
            if (normX >= b.x && normX <= b.x + b.w && normY >= b.y && normY <= b.y + b.h) {
                return { stroke: s, index: i };
            }
        }
        return null;
    }

    function handlePhoneTextTap(pt) {
        if (phoneTextOverlay && !phoneTextOverlay.classList.contains('hidden')) {
            commitPhoneText();
            return;
        }

        const hit = findPhoneTextStrokeAt(pt.x, pt.y);
        if (hit) {
            openPhoneTextEditor(hit.stroke.x, hit.stroke.y, hit.stroke);
        } else {
            openPhoneTextEditor(pt.x, pt.y, null);
        }
    }

    function updatePhoneSmartBoxDimensions(preserveCustomSize = true) {
        if (!phoneTextInput || !phoneTextCard) return;

        phoneTextInput.style.fontSize = `${phoneTextFontSize}px`;
        phoneTextInput.style.color = currentColor;
        if (phoneTextSizeVal) phoneTextSizeVal.textContent = `${phoneTextFontSize}px`;

        const padX = Math.round(Math.max(14, phoneTextFontSize * 0.72));
        const padY = Math.round(Math.max(10, phoneTextFontSize * 0.52));
        const radius = Math.round(Math.max(10, phoneTextFontSize * 0.42));

        phoneTextCard.style.padding = `${padY}px ${padX}px`;
        phoneTextCard.style.borderRadius = `${radius}px`;
        phoneTextCard.className = `phone-text-card box-style-${phoneTextBoxStyle}`;

        if (preserveCustomSize && customPhoneBoxWidth) {
            phoneTextCard.style.width = `${customPhoneBoxWidth}px`;
        } else if (!preserveCustomSize) {
            customPhoneBoxWidth = null;
            phoneTextCard.style.width = 'max-content';
        }

        if (preserveCustomSize && customPhoneBoxHeight) {
            phoneTextCard.style.minHeight = `${customPhoneBoxHeight}px`;
        } else if (!preserveCustomSize) {
            customPhoneBoxHeight = null;
            phoneTextCard.style.minHeight = 'auto';
        }

        const curW = Math.round(customPhoneBoxWidth || phoneTextCard.offsetWidth || 120);
        const curH = Math.round(customPhoneBoxHeight || phoneTextCard.offsetHeight || 50);
        if (phoneSizeBadge) {
            phoneSizeBadge.textContent = `${curW}×${curH}`;
        }

        if (phoneTextBoxStyle === 'neon') {
            phoneTextCard.style.borderColor = currentColor;
            phoneTextCard.style.boxShadow = `0 0 20px ${currentColor}88`;
        } else {
            phoneTextCard.style.borderColor = '';
            phoneTextCard.style.boxShadow = '';
        }
    }

    function openPhoneTextEditor(normX, normY, existingStroke) {
        if (!phoneTextOverlay) return;

        phoneTextNormPos = { x: Math.max(0, Math.min(0.85, normX)), y: Math.max(0, Math.min(0.85, normY)) };
        phoneEditingTextStroke = existingStroke || null;

        if (existingStroke) {
            phoneTextInput.innerText = existingStroke.text || '';
            phoneTextFontSize = existingStroke.fontSize || 24;
            phoneTextBoxStyle = existingStroke.boxStyle || 'glass';
            customPhoneBoxWidth = existingStroke.boxWidth || null;
            customPhoneBoxHeight = existingStroke.boxHeight || null;
            if (existingStroke.color) currentColor = existingStroke.color;
        } else {
            phoneTextInput.innerText = '';
            customPhoneBoxWidth = null;
            customPhoneBoxHeight = null;
        }

        if (phoneTextStyleChips) {
            phoneTextStyleChips.forEach(chip => {
                chip.classList.toggle('active', chip.dataset.style === phoneTextBoxStyle);
            });
        }

        updatePhoneSmartBoxDimensions(true);

        const mapping = getPhoneArtboardMapping();
        const px = mapping.artX + phoneTextNormPos.x * mapping.artW;
        const py = mapping.artY + phoneTextNormPos.y * mapping.artH;

        phoneTextOverlay.style.left = `${Math.max(10, Math.min(window.innerWidth - 200, px))}px`;
        phoneTextOverlay.style.top = `${Math.max(10, Math.min(window.innerHeight - 140, py))}px`;

        phoneTextOverlay.classList.remove('hidden');
        redrawAll();

        setTimeout(() => {
            if (phoneTextInput) {
                phoneTextInput.focus();
                const range = document.createRange();
                const sel = window.getSelection();
                range.selectNodeContents(phoneTextInput);
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }, 60);
    }

    function commitPhoneText() {
        if (!phoneTextOverlay || phoneTextOverlay.classList.contains('hidden')) return;

        const rawText = (phoneTextInput ? phoneTextInput.innerText : '').trim();

        if (!rawText) {
            if (phoneEditingTextStroke) {
                const idx = strokeHistory.indexOf(phoneEditingTextStroke);
                if (idx !== -1) strokeHistory.splice(idx, 1);
            }
            closePhoneTextEditor();
            return;
        }

        const mapping = getPhoneArtboardMapping();
        const scaleFactor = mapping.artW / 600;
        const fontSize = Math.max(8, phoneTextFontSize * scaleFactor);
        ctx.font = `${fontSize}px Inter, sans-serif`;

        const lines = rawText.split('\n');
        let maxTextW = 0;
        for (const line of lines) {
            const w = ctx.measureText(line).width;
            if (w > maxTextW) maxTextW = w;
        }

        const padX = Math.round(Math.max(16, phoneTextFontSize * 0.72));
        const padY = Math.round(Math.max(12, phoneTextFontSize * 0.52));
        const radius = Math.round(Math.max(10, phoneTextFontSize * 0.42));
        const lineHeight = fontSize * 1.35;
        const totalTextH = lines.length * lineHeight;

        const calculatedW = Math.max(80, Math.round((maxTextW / scaleFactor) + padX * 2));
        const calculatedH = Math.max(34, Math.round((totalTextH / scaleFactor) + padY * 2));

        const boxW = customPhoneBoxWidth ? Math.max(customPhoneBoxWidth, calculatedW) : calculatedW;
        const boxH = customPhoneBoxHeight ? Math.max(customPhoneBoxHeight, calculatedH) : calculatedH;

        const stroke = phoneEditingTextStroke || {
            stroke_id: `txt_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
            isText: true
        };

        stroke.isText = true;
        stroke.text = rawText;
        stroke.x = phoneTextNormPos ? phoneTextNormPos.x : 0.2;
        stroke.y = phoneTextNormPos ? phoneTextNormPos.y : 0.3;
        stroke.fontSize = phoneTextFontSize;
        stroke.fontFamily = 'Inter, sans-serif';
        stroke.color = currentColor;
        stroke.boxStyle = phoneTextBoxStyle;
        stroke.boxPaddingX = padX;
        stroke.boxPaddingY = padY;
        stroke.borderRadius = radius;
        stroke.boxWidth = boxW;
        stroke.boxHeight = boxH;
        stroke.normBounds = {
            x: stroke.x,
            y: stroke.y,
            w: (boxW * scaleFactor) / mapping.artW,
            h: (boxH * scaleFactor) / mapping.artH
        };

        if (!strokeHistory.includes(stroke)) {
            strokeHistory.push(stroke);
        }
        redoHistory = [];

        wsSend({
            type: 'text_element',
            stroke_id: stroke.stroke_id,
            text: stroke.text,
            x: stroke.x,
            y: stroke.y,
            font_size: stroke.fontSize,
            font_family: stroke.fontFamily,
            color: stroke.color,
            box_style: stroke.boxStyle,
            box_width: stroke.boxWidth,
            box_height: stroke.boxHeight,
            box_padding_x: stroke.boxPaddingX,
            box_padding_y: stroke.boxPaddingY,
            border_radius: stroke.borderRadius,
            timestamp: Date.now()
        });

        closePhoneTextEditor();
    }

    function deletePhoneText() {
        if (phoneEditingTextStroke) {
            const idx = strokeHistory.indexOf(phoneEditingTextStroke);
            if (idx !== -1) {
                strokeHistory.splice(idx, 1);
            }
        }
        closePhoneTextEditor();
    }

    function closePhoneTextEditor() {
        if (!phoneTextOverlay) return;
        phoneTextOverlay.classList.add('hidden');
        phoneEditingTextStroke = null;
        customPhoneBoxWidth = null;
        customPhoneBoxHeight = null;
        redrawAll();
    }

    function initPhoneTextEngine() {
        if (!phoneTextInput) return;

        phoneTextInput.addEventListener('input', () => {
            updatePhoneSmartBoxDimensions(true);
        });

        if (btnPhoneTextSizeDown) {
            btnPhoneTextSizeDown.addEventListener('click', (e) => {
                e.stopPropagation();
                phoneTextFontSize = Math.max(12, phoneTextFontSize - 4);
                updatePhoneSmartBoxDimensions(true);
            });
        }

        if (btnPhoneTextSizeUp) {
            btnPhoneTextSizeUp.addEventListener('click', (e) => {
                e.stopPropagation();
                phoneTextFontSize = Math.min(80, phoneTextFontSize + 4);
                updatePhoneSmartBoxDimensions(true);
            });
        }

        phoneTextStyleChips.forEach(chip => {
            chip.addEventListener('click', (e) => {
                e.stopPropagation();
                phoneTextStyleChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                phoneTextBoxStyle = chip.dataset.style;
                updatePhoneSmartBoxDimensions(true);
            });
        });

        if (btnPhoneTextDel) {
            btnPhoneTextDel.addEventListener('click', (e) => {
                e.stopPropagation();
                deletePhoneText();
            });
        }

        if (btnPhoneTextDone) {
            btnPhoneTextDone.addEventListener('click', (e) => {
                e.stopPropagation();
                commitPhoneText();
            });
        }

        // Move handle for phone text card
        function attachPhoneMoveHandler(elem) {
            if (!elem) return;
            elem.addEventListener('pointerdown', (e) => {
                if (e.target === phoneTextInput || e.target.closest('.phone-card-handle') || e.target.closest('.phone-text-tb-btn') || e.target.closest('.phone-text-style-chip')) return;
                e.preventDefault();
                e.stopPropagation();

                isMovingPhoneCard = true;
                const startX = e.clientX;
                const startY = e.clientY;
                const startLeft = parseFloat(phoneTextOverlay.style.left) || 0;
                const startTop = parseFloat(phoneTextOverlay.style.top) || 0;

                elem.classList.add('is-dragging');
                if (phoneTextCard) phoneTextCard.classList.add('is-moving');

                try { elem.setPointerCapture(e.pointerId); } catch(err) {}

                const onMove = (ev) => {
                    if (!isMovingPhoneCard) return;
                    const dx = ev.clientX - startX;
                    const dy = ev.clientY - startY;

                    const maxL = Math.max(10, window.innerWidth - 60);
                    const maxT = Math.max(10, window.innerHeight - 60);
                    const newLeft = Math.max(4, Math.min(maxL, startLeft + dx));
                    const newTop = Math.max(4, Math.min(maxT, startTop + dy));

                    phoneTextOverlay.style.left = `${newLeft}px`;
                    phoneTextOverlay.style.top = `${newTop}px`;

                    const mapping = getPhoneArtboardMapping();
                    phoneTextNormPos = {
                        x: Math.max(0, Math.min(1.0, (newLeft - mapping.artX) / mapping.artW)),
                        y: Math.max(0, Math.min(1.0, (newTop - mapping.artY) / mapping.artH))
                    };
                };

                const onUp = (ev) => {
                    isMovingPhoneCard = false;
                    elem.classList.remove('is-dragging');
                    if (phoneTextCard) phoneTextCard.classList.remove('is-moving');
                    try { elem.releasePointerCapture(ev.pointerId); } catch(err) {}
                    window.removeEventListener('pointermove', onMove);
                    window.removeEventListener('pointerup', onUp);
                    window.removeEventListener('pointercancel', onUp);
                };

                window.addEventListener('pointermove', onMove);
                window.addEventListener('pointerup', onUp);
                window.addEventListener('pointercancel', onUp);
            });
        }

        attachPhoneMoveHandler(phoneTextDragBar);
        attachPhoneMoveHandler(phoneTextCard);

        // Resize handles for phone text card
        const phoneHandles = phoneTextCard ? phoneTextCard.querySelectorAll('.phone-card-handle') : [];
        phoneHandles.forEach(h => {
            h.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                isResizingPhoneCard = true;
                const handleType = h.dataset.handle;
                const startX = e.clientX;
                const startY = e.clientY;
                const startW = phoneTextCard.offsetWidth;
                const startH = phoneTextCard.offsetHeight;
                const startLeft = parseFloat(phoneTextOverlay.style.left) || 0;
                const startTop = parseFloat(phoneTextOverlay.style.top) || 0;

                phoneTextCard.classList.add('is-resizing');
                try { h.setPointerCapture(e.pointerId); } catch(err) {}

                const onMove = (ev) => {
                    if (!isResizingPhoneCard) return;
                    const dx = ev.clientX - startX;
                    const dy = ev.clientY - startY;

                    let newW = startW;
                    let newH = startH;
                    let newLeft = startLeft;
                    let newTop = startTop;

                    if (handleType === 'bottom-right') {
                        newW = Math.max(70, startW + dx);
                        newH = Math.max(30, startH + dy);
                    } else if (handleType === 'bottom-left') {
                        newW = Math.max(70, startW - dx);
                        newH = Math.max(30, startH + dy);
                        newLeft = startLeft + (startW - newW);
                    } else if (handleType === 'top-right') {
                        newW = Math.max(70, startW + dx);
                        newH = Math.max(30, startH - dy);
                        newTop = startTop + (startH - newH);
                    } else if (handleType === 'top-left') {
                        newW = Math.max(70, startW - dx);
                        newH = Math.max(30, startH - dy);
                        newLeft = startLeft + (startW - newW);
                        newTop = startTop + (startH - newH);
                    }

                    customPhoneBoxWidth = Math.round(newW);
                    customPhoneBoxHeight = Math.round(newH);

                    phoneTextCard.style.width = `${customPhoneBoxWidth}px`;
                    phoneTextCard.style.minHeight = `${customPhoneBoxHeight}px`;

                    if (newLeft !== startLeft || newTop !== startTop) {
                        phoneTextOverlay.style.left = `${newLeft}px`;
                        phoneTextOverlay.style.top = `${newTop}px`;
                        const mapping = getPhoneArtboardMapping();
                        phoneTextNormPos = {
                            x: Math.max(0, Math.min(1.0, (newLeft - mapping.artX) / mapping.artW)),
                            y: Math.max(0, Math.min(1.0, (newTop - mapping.artY) / mapping.artH))
                        };
                    }

                    updatePhoneSmartBoxDimensions(true);
                };

                const onUp = (ev) => {
                    isResizingPhoneCard = false;
                    phoneTextCard.classList.remove('is-resizing');
                    try { h.releasePointerCapture(ev.pointerId); } catch(err) {}
                    window.removeEventListener('pointermove', onMove);
                    window.removeEventListener('pointerup', onUp);
                    window.removeEventListener('pointercancel', onUp);
                };

                window.addEventListener('pointermove', onMove);
                window.addEventListener('pointerup', onUp);
                window.addEventListener('pointercancel', onUp);
            });
        });

        if (phoneTextOverlay) {
            phoneTextOverlay.addEventListener('pointerdown', (e) => e.stopPropagation());
        }
    }

    let localRedrawScheduled = false;
    function scheduleLocalRedraw() {
        if (!localRedrawScheduled) {
            localRedrawScheduled = true;
            requestAnimationFrame(() => {
                localRedrawScheduled = false;
                redrawAll();
            });
        }
    }

    /** Incremental render of the full in-progress stroke throttled by rAF */
    function renderIncremental(stroke, allPts) {
        scheduleLocalRedraw();
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
    //  GEOMETRIC SHAPES GENERATOR
    // ================================================================
    function generateShapePoints(shapeType, p1, p2) {
        const minX = Math.min(p1.x, p2.x);
        const maxX = Math.max(p1.x, p2.x);
        const minY = Math.min(p1.y, p2.y);
        const maxY = Math.max(p1.y, p2.y);
        const cx = (p1.x + p2.x) / 2;
        const cy = (p1.y + p2.y) / 2;
        const rx = Math.abs(p2.x - p1.x) / 2;
        const ry = Math.abs(p2.y - p1.y) / 2;

        if (rx < 0.002 && ry < 0.002) return [];

        const pts = [];

        if (shapeType === 'circle') {
            const steps = 64;
            for (let i = 0; i <= steps; i++) {
                const theta = (i / steps) * Math.PI * 2;
                pts.push({
                    x: cx + rx * Math.cos(theta),
                    y: cy + ry * Math.sin(theta),
                    pressure: 0.8
                });
            }
        } else if (shapeType === 'rectangle') {
            const corners = [
                { x: minX, y: minY },
                { x: maxX, y: minY },
                { x: maxX, y: maxY },
                { x: minX, y: maxY },
                { x: minX, y: minY }
            ];
            for (let i = 0; i < 4; i++) {
                const c1 = corners[i], c2 = corners[i + 1];
                for (let s = 0; s < 12; s++) {
                    const t = s / 12;
                    pts.push({
                        x: c1.x + (c2.x - c1.x) * t,
                        y: c1.y + (c2.y - c1.y) * t,
                        pressure: 0.8
                    });
                }
            }
            pts.push({ x: corners[0].x, y: corners[0].y, pressure: 0.8 });
        } else if (shapeType === 'triangle') {
            const corners = [
                { x: cx, y: minY },
                { x: maxX, y: maxY },
                { x: minX, y: maxY },
                { x: cx, y: minY }
            ];
            for (let i = 0; i < 3; i++) {
                const c1 = corners[i], c2 = corners[i + 1];
                for (let s = 0; s < 14; s++) {
                    const t = s / 14;
                    pts.push({
                        x: c1.x + (c2.x - c1.x) * t,
                        y: c1.y + (c2.y - c1.y) * t,
                        pressure: 0.8
                    });
                }
            }
            pts.push({ x: corners[0].x, y: corners[0].y, pressure: 0.8 });
        } else if (shapeType === 'line') {
            const steps = 20;
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                pts.push({
                    x: p1.x + (p2.x - p1.x) * t,
                    y: p1.y + (p2.y - p1.y) * t,
                    pressure: 0.8
                });
            }
        } else if (shapeType === 'arrow') {
            const steps = 20;
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                pts.push({
                    x: p1.x + (p2.x - p1.x) * t,
                    y: p1.y + (p2.y - p1.y) * t,
                    pressure: 0.8
                });
            }
            const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
            const headLen = Math.min(0.06, Math.hypot(p2.x - p1.x, p2.y - p1.y) * 0.28);
            const a1 = angle - Math.PI / 6;
            const a2 = angle + Math.PI / 6;
            pts.push({ x: p2.x - headLen * Math.cos(a1), y: p2.y - headLen * Math.sin(a1), pressure: 0.8 });
            pts.push({ x: p2.x, y: p2.y, pressure: 0.8 });
            pts.push({ x: p2.x - headLen * Math.cos(a2), y: p2.y - headLen * Math.sin(a2), pressure: 0.8 });
        } else if (shapeType === 'star') {
            const pointsCount = 5;
            const outerR = Math.max(rx, ry);
            const innerR = outerR * 0.42;
            const starCorners = [];
            for (let i = 0; i < pointsCount * 2; i++) {
                const r = i % 2 === 0 ? outerR : innerR;
                const a = (i / (pointsCount * 2)) * Math.PI * 2 - Math.PI / 2;
                starCorners.push({ x: cx + r * Math.cos(a) * (rx / (outerR || 1)), y: cy + r * Math.sin(a) * (ry / (outerR || 1)) });
            }
            starCorners.push({ ...starCorners[0] });
            for (let i = 0; i < starCorners.length - 1; i++) {
                const c1 = starCorners[i], c2 = starCorners[i + 1];
                for (let s = 0; s < 6; s++) {
                    const t = s / 6;
                    pts.push({
                        x: c1.x + (c2.x - c1.x) * t,
                        y: c1.y + (c2.y - c1.y) * t,
                        pressure: 0.8
                    });
                }
            }
            pts.push({ x: starCorners[0].x, y: starCorners[0].y, pressure: 0.8 });
        } else if (shapeType === 'diamond') {
            const corners = [
                { x: cx, y: minY },
                { x: maxX, y: cy },
                { x: cx, y: maxY },
                { x: minX, y: cy },
                { x: cx, y: minY }
            ];
            for (let i = 0; i < 4; i++) {
                const c1 = corners[i], c2 = corners[i + 1];
                for (let s = 0; s < 12; s++) {
                    const t = s / 12;
                    pts.push({
                        x: c1.x + (c2.x - c1.x) * t,
                        y: c1.y + (c2.y - c1.y) * t,
                        pressure: 0.8
                    });
                }
            }
            pts.push({ x: corners[0].x, y: corners[0].y, pressure: 0.8 });
        }

        return pts;
    }

    // ================================================================
    //  COLOR BUCKET / ANIMATED FLOOD FILL ENGINE
    // ================================================================
    let isPhoneFillAnimating = false;

    function hexToRgba(hex) {
        let c = (hex || '#ffffff').replace('#', '');
        if (c.length === 3) c = c.split('').map(x => x + x).join('');
        const num = parseInt(c, 16);
        return {
            r: (num >> 16) & 255,
            g: (num >> 8) & 255,
            b: num & 255,
            a: 255
        };
    }

    function playDropSound() {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            const actx = new AudioCtx();
            const osc = actx.createOscillator();
            const gain = actx.createGain();
            osc.type = 'sine';
            const now = actx.currentTime;
            osc.frequency.setValueAtTime(580, now);
            osc.frequency.exponentialRampToValueAtTime(260, now + 0.16);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
            osc.connect(gain);
            gain.connect(actx.destination);
            osc.start(now);
            osc.stop(now + 0.2);
        } catch (e) {}
    }

    function performPhoneAnimatedFill(normX, normY, fillColorHex = currentColor, broadcast = true) {
        if (isPhoneFillAnimating) return;
        const mapping = getPhoneArtboardMapping();
        const dpr = window.devicePixelRatio || 1;

        redrawAll();

        const W = canvasEl.width;
        const H = canvasEl.height;

        const artLeft = Math.max(0, Math.floor(mapping.artX * dpr));
        const artTop = Math.max(0, Math.floor(mapping.artY * dpr));
        const artRight = Math.min(W - 1, Math.ceil((mapping.artX + mapping.artW) * dpr));
        const artBottom = Math.min(H - 1, Math.ceil((mapping.artY + mapping.artH) * dpr));

        const clickCssX = mapping.artX + normX * mapping.artW;
        const clickCssY = mapping.artY + normY * mapping.artH;
        const startX = Math.round(clickCssX * dpr);
        const startY = Math.round(clickCssY * dpr);

        if (startX < artLeft || startX > artRight || startY < artTop || startY > artBottom) {
            return;
        }

        const imgData = ctx.getImageData(0, 0, W, H);
        const data = imgData.data;

        const startIdx = (startY * W + startX) * 4;
        const targetR = data[startIdx];
        const targetG = data[startIdx + 1];
        const targetB = data[startIdx + 2];
        const targetA = data[startIdx + 3];

        const fillRgba = hexToRgba(fillColorHex);
        const diffStart = Math.abs(targetR - fillRgba.r) + Math.abs(targetG - fillRgba.g) + Math.abs(targetB - fillRgba.b);
        if (diffStart < 14) return;

        const tolerance = 42;
        function matchPixel(idx) {
            const dr = Math.abs(data[idx] - targetR);
            const dg = Math.abs(data[idx + 1] - targetG);
            const db = Math.abs(data[idx + 2] - targetB);
            const da = Math.abs(data[idx + 3] - targetA);
            return (dr + dg + db + da) <= tolerance * 4;
        }

        const visited = new Uint8Array(W * H);
        const stack = [startX, startY];
        let minX = startX, maxX = startX, minY = startY, maxY = startY;
        let maxDist = 0;
        let filledCount = 0;

        while (stack.length > 0) {
            const cy = stack.pop();
            const cx = stack.pop();

            let lx = cx;
            while (lx >= artLeft && !visited[cy * W + lx] && matchPixel((cy * W + lx) * 4)) {
                lx--;
            }
            lx++;

            let rx = cx;
            while (rx <= artRight && !visited[cy * W + rx] && matchPixel((cy * W + rx) * 4)) {
                rx++;
            }
            rx--;

            if (lx > rx) continue;

            if (lx < minX) minX = lx;
            if (rx > maxX) maxX = rx;
            if (cy < minY) minY = cy;
            if (cy > maxY) maxY = cy;

            let scanAbove = true;
            let scanBelow = true;

            for (let x = lx; x <= rx; x++) {
                const idx = cy * W + x;
                visited[idx] = 1;
                filledCount++;

                const d = Math.hypot(x - startX, cy - startY);
                if (d > maxDist) maxDist = d;

                if (cy > artTop) {
                    const aIdx = (cy - 1) * W + x;
                    if (!visited[aIdx] && matchPixel(aIdx * 4)) {
                        if (scanAbove) {
                            stack.push(x, cy - 1);
                            scanAbove = false;
                        }
                    } else {
                        scanAbove = true;
                    }
                }

                if (cy < artBottom) {
                    const bIdx = (cy + 1) * W + x;
                    if (!visited[bIdx] && matchPixel(bIdx * 4)) {
                        if (scanBelow) {
                            stack.push(x, cy + 1);
                            scanBelow = false;
                        }
                    } else {
                        scanBelow = true;
                    }
                }
            }
        }

        if (filledCount < 4) return;

        const bw = maxX - minX + 1;
        const bh = maxY - minY + 1;
        const fillCanvas = document.createElement('canvas');
        fillCanvas.width = bw;
        fillCanvas.height = bh;
        const fCtx = fillCanvas.getContext('2d');
        const fImg = fCtx.createImageData(bw, bh);
        const fData = fImg.data;

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                if (visited[y * W + x] === 1) {
                    const lIdx = ((y - minY) * bw + (x - minX)) * 4;
                    fData[lIdx] = fillRgba.r;
                    fData[lIdx + 1] = fillRgba.g;
                    fData[lIdx + 2] = fillRgba.b;
                    fData[lIdx + 3] = Math.round(currentOpacity * 255);
                }
            }
        }
        fCtx.putImageData(fImg, 0, 0);

        playDropSound();

        const strokeId = `fill-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        if (broadcast) {
            wsSend({
                type: 'fill',
                stroke_id: strokeId,
                x: normX,
                y: normY,
                color: fillColorHex,
                tolerance: 42
            });
        }

        isPhoneFillAnimating = true;
        const animStart = performance.now();
        const animDuration = 320;
        const maxRadiusCss = Math.max(12, maxDist / dpr);

        function animateBloom(now) {
            const elapsed = now - animStart;
            const progress = Math.min(1.0, elapsed / animDuration);
            const ease = 1 - Math.pow(1 - progress, 2);
            const currentRadius = Math.max(8, maxRadiusCss * ease);

            redrawAll();

            ctx.save();
            ctx.beginPath();
            ctx.arc(clickCssX, clickCssY, currentRadius, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(
                fillCanvas,
                minX / dpr,
                minY / dpr,
                bw / dpr,
                bh / dpr
            );
            ctx.restore();

            // Luminous shockwave ripple ring
            ctx.save();
            ctx.beginPath();
            ctx.arc(clickCssX, clickCssY, currentRadius, 0, Math.PI * 2);
            ctx.strokeStyle = fillColorHex;
            ctx.lineWidth = Math.max(1, 3.5 * (1 - progress));
            ctx.globalAlpha = Math.max(0, 0.75 * (1 - progress));
            ctx.stroke();

            // Center droplet splash ring
            const centerRippleR = Math.min(24, currentRadius * 0.4);
            ctx.beginPath();
            ctx.arc(clickCssX, clickCssY, centerRippleR, 0, Math.PI * 2);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = Math.max(1, 2 * (1 - progress));
            ctx.globalAlpha = Math.max(0, 0.5 * (1 - progress));
            ctx.stroke();
            ctx.restore();

            if (progress < 1.0) {
                requestAnimationFrame(animateBloom);
            } else {
                isPhoneFillAnimating = false;
                const fillItem = {
                    stroke_id: strokeId,
                    type: 'fill',
                    isFill: true,
                    color: fillColorHex,
                    opacity: currentOpacity,
                    normX: normX,
                    normY: normY,
                    fillCanvas: fillCanvas,
                    normBounds: {
                        x: (minX / dpr - mapping.artX) / mapping.artW,
                        y: (minY / dpr - mapping.artY) / mapping.artH,
                        w: (bw / dpr) / mapping.artW,
                        h: (bh / dpr) / mapping.artH
                    }
                };
                strokeHistory.push(fillItem);
                redoHistory = [];
                redrawAll();
            }
        }

        requestAnimationFrame(animateBloom);
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
        customColorIn.value = currentColor.length === 7 ? currentColor : '#ffffff';
        selectGridSize.value = gridSize;
        selectBg.value = canvasBg;
        viewport.style.backgroundColor = canvasBg;
        updatePressureUI();
        highlightActiveSmoothing();
        highlightActiveBrush();
        highlightActiveColor();
        highlightActiveQuickSize();
        updateBrushPreview();

        // ---- Broadcast tool state to laptop ----
        function broadcastToolUpdate() {
            wsSend({
                type: 'tool_update',
                brush: currentBrush,
                shape: currentShape,
                size: currentSize,
                color: currentColor,
                opacity: currentOpacity,
                smoothing: currentSmoothing
            });
        }

        // ---- Brush strip ----
        brushBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const b = btn.dataset.brush;
                if (b === 'shape') {
                    currentBrush = 'shape';
                    highlightActiveBrush();
                    toggleDrawer('drawer-shapes', btn);
                    broadcastToolUpdate();
                    return;
                }
                if (b === 'eraser' && currentBrush !== 'eraser') previousBrush = currentBrush;
                currentBrush = b;
                highlightActiveBrush();
                updateBrushPreview();
                broadcastToolUpdate();
            });
        });

        // ---- Shapes Drawer Selection ----
        const phoneShapeCards = $$('.phone-shape-card');
        const phoneShapeIconWrap = $('#phone-shape-icon-wrap');
        const phoneShapeText = $('#phone-shape-text');

        phoneShapeCards.forEach(card => {
            card.addEventListener('click', (e) => {
                e.stopPropagation();
                const sh = card.dataset.shape;
                if (!sh) return;
                currentShape = sh;
                currentBrush = 'shape';
                if (phoneShapeIconWrap && SHAPE_SVGS[sh]) {
                    phoneShapeIconWrap.innerHTML = SHAPE_SVGS[sh];
                }
                if (phoneShapeText) {
                    phoneShapeText.textContent = sh.charAt(0).toUpperCase() + sh.slice(1);
                }
                phoneShapeCards.forEach(c => c.classList.toggle('active', c.dataset.shape === sh));
                highlightActiveBrush();
                closeAllDrawers();
                broadcastToolUpdate();
            });
        });

        // ---- Size slider + quick sizes ----
        sliderSize.addEventListener('input', () => {
            currentSize = parseInt(sliderSize.value, 10);
            sizeVal.textContent = currentSize + 'px';
            if (dockSizeLabel) dockSizeLabel.textContent = currentSize + 'px';
            localStorage.setItem('pdp_size', currentSize);
            highlightActiveQuickSize();
            updateBrushPreview();
            broadcastToolUpdate();
        });

        quickSizeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                currentSize = parseInt(btn.dataset.size, 10);
                sliderSize.value = currentSize;
                sizeVal.textContent = currentSize + 'px';
                if (dockSizeLabel) dockSizeLabel.textContent = currentSize + 'px';
                localStorage.setItem('pdp_size', currentSize);
                highlightActiveQuickSize();
                updateBrushPreview();
                broadcastToolUpdate();
            });
        });

        // ---- Opacity slider ----
        sliderOpacity.addEventListener('input', () => {
            currentOpacity = parseInt(sliderOpacity.value, 10) / 100;
            opacityVal.textContent = Math.round(currentOpacity * 100) + '%';
            localStorage.setItem('pdp_opacity', currentOpacity);
            updateBrushPreview();
            broadcastToolUpdate();
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
                broadcastToolUpdate();
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
            broadcastToolUpdate();
        });

        // ---- Smoothing ----
        smoothBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                currentSmoothing = btn.dataset.smooth;
                localStorage.setItem('pdp_smooth', currentSmoothing);
                highlightActiveSmoothing();
                broadcastToolUpdate();
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
        btnClear.addEventListener('click', () => { clearModal.classList.remove('hidden'); clearModal.style.display = 'flex'; });
        btnModalCancel.addEventListener('click', () => { clearModal.classList.add('hidden'); clearModal.style.display = 'none'; });
        btnModalConfirm.addEventListener('click', () => { clearModal.classList.add('hidden'); clearModal.style.display = 'none'; handleClear(); });

        // ---- Undo / Redo ----
        btnUndo.addEventListener('click', handleUndo);
        btnRedo.addEventListener('click', handleRedo);

        // ---- Settings panel ----
        btnSettings.addEventListener('click', () => { settingsPanel.classList.remove('hidden'); settingsPanel.style.display = 'flex'; });
        btnCloseSettings.addEventListener('click', () => { settingsPanel.classList.add('hidden'); settingsPanel.style.display = 'none'; });

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
            settingsPanel.style.display = 'none';
        });

        // ---- Drawer Tab Triggers ----
        if (tabTriggerSize)  tabTriggerSize.addEventListener('click',  (e) => { e.stopPropagation(); toggleDrawer('drawer-size', tabTriggerSize); });
        if (tabTriggerColor) tabTriggerColor.addEventListener('click', (e) => { e.stopPropagation(); toggleDrawer('drawer-color', tabTriggerColor); });
        if (tabTriggerTools) tabTriggerTools.addEventListener('click', (e) => { e.stopPropagation(); toggleDrawer('drawer-tools', tabTriggerTools); });

        // Click outside drawer to close
        viewport.addEventListener('click', () => closeAllDrawers());

        // ---- Zen Fullscreen Toggle ----
        if (btnFullscreen) {
            btnFullscreen.addEventListener('click', () => {
                if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                    const de = document.documentElement;
                    if (de.requestFullscreen) de.requestFullscreen();
                    else if (de.webkitRequestFullscreen) de.webkitRequestFullscreen();
                    btnFullscreen.classList.add('active');
                } else {
                    if (document.exitFullscreen) document.exitFullscreen();
                    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
                    btnFullscreen.classList.remove('active');
                }
            });
        }

        // ---- Canvas Background Quick Cycle ----
        if (btnThemeQuick) {
            btnThemeQuick.addEventListener('click', () => {
                const themes = ['#111726', '#06080d', '#ffffff', '#1e293b'];
                let nextIdx = (themes.indexOf(canvasBg) + 1) % themes.length;
                canvasBg = themes[nextIdx];
                localStorage.setItem('pdp_bg', canvasBg);
                viewport.style.backgroundColor = canvasBg;
                if (selectBg) selectBg.value = canvasBg;
                redrawAll();
            });
        }

        // ---- Screen Fit Mode Buttons ----
        const fitBtns = $$('.fit-btn');
        if (fitBtns.length > 0) {
            fitBtns.forEach(b => {
                b.classList.toggle('active', b.dataset.fit === phoneFitMode);
                b.addEventListener('click', () => {
                    fitBtns.forEach(btn => btn.classList.remove('active'));
                    b.classList.add('active');
                    phoneFitMode = b.dataset.fit;
                    localStorage.setItem('pdp_fit_mode', phoneFitMode);
                    redrawAll();
                });
            });
        }

        // ---- Reference Artwork / Image Import ----
        if (btnImportImgPhone && inputImportImage) {
            btnImportImgPhone.addEventListener('click', () => {
                inputImportImage.click();
            });
            inputImportImage.addEventListener('change', (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;
                processAndLoadImage(file);
                inputImportImage.value = '';
            });
        }

        if (btnClearImgPhone) {
            btnClearImgPhone.addEventListener('click', () => {
                handleIncomingClearImage();
                wsSend({ type: 'clear_image' });
            });
        }

        // ---- Zoom Badge Reset ----
        if (zoomBadge) {
            zoomBadge.addEventListener('click', resetView);
        }
    }

    function processAndLoadImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const rawUrl = e.target.result;
            const tempImg = new Image();
            tempImg.onload = () => {
                const maxDim = 1600;
                let w = tempImg.naturalWidth || 800;
                let h = tempImg.naturalHeight || 600;
                if (w > maxDim || h > maxDim) {
                    if (w > h) {
                        h = Math.round((h * maxDim) / w);
                        w = maxDim;
                    } else {
                        w = Math.round((w * maxDim) / h);
                        h = maxDim;
                    }
                }
                const compCanvas = document.createElement('canvas');
                compCanvas.width = w;
                compCanvas.height = h;
                const compCtx = compCanvas.getContext('2d');
                compCtx.drawImage(tempImg, 0, 0, w, h);
                const finalDataUrl = compCanvas.toDataURL('image/jpeg', 0.88);
                applyAndBroadcastImage(finalDataUrl, w, h);
            };
            tempImg.onerror = () => {
                console.error('Failed to decode image');
            };
            tempImg.src = rawUrl;
        };
        reader.readAsDataURL(file);
    }

    function applyAndBroadcastImage(dataUrl, w, h) {
        const img = new Image();
        img.onload = () => {
            currentBgImage = {
                img,
                data_url: dataUrl,
                width: w,
                height: h,
                aspect_ratio: w / Math.max(1, h),
                fit: 'contain',
                opacity: 1.0
            };
            activeArtboardAspect = w / Math.max(1, h);
            if (labelImportImgPhone) labelImportImgPhone.textContent = 'Replace Image';
            if (btnClearImgPhone) {
                btnClearImgPhone.classList.remove('hidden');
                btnClearImgPhone.style.display = 'flex';
            }
            redrawAll();
            wsSend({
                type: 'import_image',
                data_url: dataUrl,
                width: w,
                height: h,
                aspect_ratio: w / Math.max(1, h),
                fit: 'contain',
                opacity: 1.0
            });
        };
        img.src = dataUrl;
    }

    function handleIncomingImage(data) {
        if (!data || !data.data_url) return;
        const img = new Image();
        img.onload = () => {
            currentBgImage = {
                img,
                data_url: data.data_url,
                width: data.width || img.naturalWidth,
                height: data.height || img.naturalHeight,
                aspect_ratio: data.aspect_ratio || (img.naturalWidth / Math.max(1, img.naturalHeight)),
                fit: data.fit || 'contain',
                opacity: data.opacity !== undefined ? data.opacity : 1.0
            };
            activeArtboardAspect = currentBgImage.aspect_ratio;
            if (labelImportImgPhone) labelImportImgPhone.textContent = 'Replace Image';
            if (btnClearImgPhone) {
                btnClearImgPhone.classList.remove('hidden');
                btnClearImgPhone.style.display = 'flex';
            }
            redrawAll();
        };
        img.src = data.data_url;
    }

    function handleIncomingClearImage() {
        currentBgImage = null;
        if (labelImportImgPhone) labelImportImgPhone.textContent = 'Import Image';
        if (btnClearImgPhone) {
            btnClearImgPhone.classList.add('hidden');
            btnClearImgPhone.style.display = 'none';
        }
        if (inputImportImage) inputImportImage.value = '';
        redrawAll();
    }

    // ---- Remote Laptop Drawing Listeners ----
    let remoteStrokesMap = new Map();

    function handleRemoteStrokeStart(data) {
        const stroke = {
            stroke_id: data.stroke_id,
            brush: data.brush || 'pen',
            color: data.color || '#ffffff',
            size: data.size || 8,
            opacity: data.opacity !== undefined ? data.opacity : 1.0,
            smoothing: data.smoothing || 'medium',
            phone_width: data.phone_width || cssW,
            phone_height: data.phone_height || cssH,
            aspect_ratio: data.aspect_ratio || (cssW / Math.max(1, cssH)),
            points: (data.points || []).map(p => ({
                x: p.x,
                y: p.y,
                px: p.x * cssW,
                py: p.y * cssH,
                pressure: p.pressure !== undefined ? p.pressure : 0.5
            }))
        };
        remoteStrokesMap.set(data.stroke_id, stroke);
        scheduleLocalRedraw();
    }

    function handleRemoteStrokePoints(data) {
        let stroke = remoteStrokesMap.get(data.stroke_id);
        if (!stroke) {
            handleRemoteStrokeStart(data);
            stroke = remoteStrokesMap.get(data.stroke_id);
        }
        if (stroke) {
            if (Array.isArray(data.points)) {
                for (const p of data.points) {
                    stroke.points.push({
                        x: p.x,
                        y: p.y,
                        px: p.x * cssW,
                        py: p.y * cssH,
                        pressure: p.pressure !== undefined ? p.pressure : 0.5
                    });
                }
            } else if (data.x !== undefined && data.y !== undefined) {
                stroke.points.push({
                    x: data.x,
                    y: data.y,
                    px: data.x * cssW,
                    py: data.y * cssH,
                    pressure: data.pressure !== undefined ? data.pressure : 0.5
                });
            }
            scheduleLocalRedraw();
        }
    }

    function handleRemoteStrokeEnd(data) {
        const strokeId = data.stroke_id;
        const stroke = strokeId ? remoteStrokesMap.get(strokeId) : (remoteStrokesMap.size > 0 ? Array.from(remoteStrokesMap.values())[0] : null);
        if (stroke) {
            strokeHistory.push(stroke);
            if (strokeId) remoteStrokesMap.delete(strokeId);
            else remoteStrokesMap.clear();
        }
        redrawAll();
    }

    function toggleDrawer(paneId, triggerBtn) {
        if (!dockDrawer) return;
        const targetPane = $(`#${paneId}`);
        const isCurrentlyOpen = !dockDrawer.classList.contains('hidden') && dockDrawer.style.display !== 'none' && targetPane && !targetPane.classList.contains('hidden') && targetPane.style.display !== 'none';

        drawerPanes.forEach(p => {
            p.classList.add('hidden');
            p.style.display = 'none';
        });
        $$('.dock-tab-btn').forEach(b => b.classList.remove('active'));

        if (isCurrentlyOpen) {
            dockDrawer.classList.add('hidden');
            dockDrawer.style.display = 'none';
        } else if (targetPane) {
            dockDrawer.classList.remove('hidden');
            dockDrawer.style.display = 'block';
            targetPane.classList.remove('hidden');
            targetPane.style.display = 'block';
            if (triggerBtn) triggerBtn.classList.add('active');
        }
    }

    function closeAllDrawers() {
        if (!dockDrawer) return;
        dockDrawer.classList.add('hidden');
        dockDrawer.style.display = 'none';
        drawerPanes.forEach(p => {
            p.classList.add('hidden');
            p.style.display = 'none';
        });
        $$('.dock-tab-btn').forEach(b => b.classList.remove('active'));
    }

    function highlightActiveBrush() {
        brushBtns.forEach(b => b.classList.toggle('active', b.dataset.brush === currentBrush));
    }

    function highlightActiveColor() {
        colorDots.forEach(d => d.classList.toggle('active', d.dataset.color.toLowerCase() === currentColor.toLowerCase()));
        if (dockColorBubble) dockColorBubble.style.backgroundColor = currentColor;
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
        } else if (currentBrush === 'bucket') {
            previewCtx.globalAlpha = currentOpacity;
            previewCtx.fillStyle = currentColor;
            previewCtx.beginPath();
            previewCtx.arc(20, 20, 11, 0, Math.PI * 2);
            previewCtx.fill();
            previewCtx.strokeStyle = 'rgba(255,255,255,0.5)';
            previewCtx.lineWidth = 1.5;
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
        let host = location.host;
        if (!host || location.protocol === 'file:') {
            host = 'localhost:8080';
        }
        const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
        const url   = `${proto}//${host}/ws?role=phone`;
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
                // Sync active tool and brush settings on connect
                wsSend({
                    type: 'tool_update',
                    brush: currentBrush,
                    size: currentSize,
                    color: currentColor,
                    opacity: currentOpacity,
                    smoothing: currentSmoothing
                });
            };
            socket.onmessage = (ev) => {
                try {
                    const m = JSON.parse(ev.data);
                    if (m.type === 'fill') {
                        performPhoneAnimatedFill(m.x, m.y, m.color, false);
                    } else if (m.type === 'import_image') {
                        handleIncomingImage(m);
                    } else if (m.type === 'clear_image') {
                        handleIncomingClearImage();
                    } else if (m.type === 'clear') {
                        strokeHistory = [];
                        redoHistory = [];
                        currentStroke = null;
                        remoteStrokesMap.clear();
                        redrawAll();
                    } else if (m.type === 'undo') {
                        if (strokeHistory.length > 0) {
                            redoHistory.push(strokeHistory.pop());
                            redrawAll();
                        }
                    } else if (m.type === 'redo') {
                        if (redoHistory.length > 0) {
                            strokeHistory.push(redoHistory.pop());
                            redrawAll();
                        }
                    } else if (m.type === 'tool_update') {
                        if (m.size !== undefined) {
                            currentSize = Math.round(m.size);
                            sliderSize.value = currentSize;
                            sizeVal.textContent = currentSize + 'px';
                            if (dockSizeLabel) dockSizeLabel.textContent = currentSize + 'px';
                            localStorage.setItem('pdp_size', currentSize);
                            highlightActiveQuickSize();
                        }
                        if (m.shape) {
                            currentShape = m.shape;
                            const phoneShapeIconWrap = $('#phone-shape-icon-wrap');
                            const phoneShapeText = $('#phone-shape-text');
                            if (phoneShapeIconWrap && SHAPE_SVGS[m.shape]) {
                                phoneShapeIconWrap.innerHTML = SHAPE_SVGS[m.shape];
                            }
                            if (phoneShapeText) {
                                phoneShapeText.textContent = m.shape.charAt(0).toUpperCase() + m.shape.slice(1);
                            }
                            $$('.phone-shape-card').forEach(c => c.classList.toggle('active', c.dataset.shape === m.shape));
                        }
                        if (m.brush) {
                            currentBrush = m.brush;
                            highlightActiveBrush();
                        }
                        if (m.color) {
                            currentColor = m.color;
                            localStorage.setItem('pdp_color', currentColor);
                            highlightActiveColor();
                        }
                        if (m.opacity !== undefined) {
                            currentOpacity = m.opacity;
                            sliderOpacity.value = Math.round(currentOpacity * 100);
                            opacityVal.textContent = Math.round(currentOpacity * 100) + '%';
                            localStorage.setItem('pdp_opacity', currentOpacity);
                        }
                        if (m.smoothing) {
                            currentSmoothing = m.smoothing;
                            highlightActiveSmoothing();
                        }
                        updateBrushPreview();
                    } else if (m.type === 'text_element') {
                        handleIncomingPhoneTextElement(m);
                    } else if (m.type === 'shape_preview') {
                        remotePhoneShapePreview = {
                            brush: 'pen',
                            color: m.color || '#ffffff',
                            size: m.size || 8,
                            opacity: m.opacity !== undefined ? m.opacity : 1.0,
                            smoothing: 'off',
                            points: (m.points || []).map(p => ({
                                x: p.x,
                                y: p.y,
                                px: p.x * cssW,
                                py: p.y * cssH,
                                pressure: 0.8
                            }))
                        };
                        scheduleLocalRedraw();
                    } else if (m.type === 'stroke_start') {
                        remotePhoneShapePreview = null;
                        handleRemoteStrokeStart(m);
                    } else if (m.type === 'stroke_points' || m.type === 'stroke') {
                        handleRemoteStrokePoints(m);
                    } else if (m.type === 'stroke_end') {
                        remotePhoneShapePreview = null;
                        handleRemoteStrokeEnd(m);
                    }
                } catch(e) {}
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

    function handleIncomingPhoneTextElement(data) {
        const mapping = getPhoneArtboardMapping();
        const scaleFactor = mapping.artW / 600;
        const padX = data.box_padding_x || 16;
        const padY = data.box_padding_y || 12;
        const radius = data.border_radius || 12;
        const boxW = data.box_width || 180;
        const boxH = data.box_height || 60;

        let existing = strokeHistory.find(s => s.stroke_id === data.stroke_id);
        if (existing) {
            existing.text = data.text;
            existing.x = data.x;
            existing.y = data.y;
            existing.fontSize = data.font_size;
            existing.fontFamily = data.font_family;
            existing.color = data.color;
            existing.boxStyle = data.box_style;
            existing.boxPaddingX = padX;
            existing.boxPaddingY = padY;
            existing.borderRadius = radius;
            existing.boxWidth = boxW;
            existing.boxHeight = boxH;
            existing.normBounds = {
                x: data.x,
                y: data.y,
                w: (boxW * scaleFactor) / mapping.artW,
                h: (boxH * scaleFactor) / mapping.artH
            };
        } else {
            const newStroke = {
                stroke_id: data.stroke_id,
                isText: true,
                text: data.text,
                x: data.x,
                y: data.y,
                fontSize: data.font_size,
                fontFamily: data.font_family,
                color: data.color,
                boxStyle: data.box_style,
                boxPaddingX: padX,
                boxPaddingY: padY,
                borderRadius: radius,
                boxWidth: boxW,
                boxHeight: boxH,
                normBounds: {
                    x: data.x,
                    y: data.y,
                    w: (boxW * scaleFactor) / mapping.artW,
                    h: (boxH * scaleFactor) / mapping.artH
                }
            };
            strokeHistory.push(newStroke);
        }
        redrawAll();
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
        initPhoneTextEngine();
        connectWS();
    });

})();
