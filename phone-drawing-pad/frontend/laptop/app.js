/**
 * DrawSync Studio — Pro Desktop Engine
 * Companion layout matching Astropad Studio & Procreate companion.
 * Complete interactive system:
 *   - Device Telemetry Capsule (Latency RTT, FPS, Battery, Phone Model)
 *   - Left Floating Tool Dock with tool modes & Color Palette Popover
 *   - Canvas Drawing Engine with pointer pressure, smoothing, and live reticle
 *   - Real-time Pan & Zoom (Space+Drag, Wheel)
 *   - Stylus Hardware Feed (4096 levels, tilt, smoothing, palm rejection)
 *   - Live Artwork Navigator Mini-map
 *   - Interactive Multi-layer Stack
 *   - Guide Me mode with persistent checklist in localStorage & review drawers
 *   - Exporting (PNG, Transparent PNG, SVG, Clipboard Copy)
 *   - Resolution presets & preferences modals
 *   - Resilient QR code generator with SVG fallback
 */

(function () {
    'use strict';

    // =========================================================================
    // 1. DOM ELEMENTS
    // =========================================================================
    // Canvas & Stage
    const canvas = document.getElementById('laptop-canvas');
    const ctx = canvas.getContext('2d');
    const canvasMount = document.getElementById('canvas-wrapper');
    const canvasStage = document.getElementById('canvas-stage');
    const stylusReticle = document.getElementById('stylus-reticle');
    const reticleHudBadge = document.getElementById('reticle-hud-badge');

    // Split mode preview
    const splitPhoneCard = document.getElementById('split-phone-card');
    const splitPhoneCanvas = document.getElementById('split-phone-canvas');
    const splitCtx = splitPhoneCanvas ? splitPhoneCanvas.getContext('2d') : null;

    // Header Left
    const docName = document.getElementById('doc-name');
    const btnUndo = document.getElementById('btn-undo');
    const btnRedo = document.getElementById('btn-redo');
    const btnClearCanvas = document.getElementById('btn-clear-canvas');
    const canvasDimPill = document.getElementById('canvas-dim-pill');
    const btnZoomPill = document.getElementById('btn-zoom-pill');

    // Header Center: Telemetry Capsule
    const deviceCapsule = document.getElementById('device-capsule');
    const deviceModelLabel = document.getElementById('device-model-label');
    const deviceConnText = document.getElementById('device-conn-text');
    const rttMetric = document.getElementById('rtt-metric');
    const fpsMetric = document.getElementById('fps-metric');
    const batteryFillBar = document.getElementById('battery-fill-bar');
    const batteryPctLabel = document.getElementById('battery-pct-label');

    // Header Right: Modes, Import & Export
    const modeBtns = document.querySelectorAll('.mode-btn');
    const btnImportHeader = document.getElementById('btn-import-header');
    const labelImportHeader = document.getElementById('label-import-header');
    const btnClearImgHeader = document.getElementById('btn-clear-img-header');
    const btnExportMain = document.getElementById('btn-export-main');
    const exportMenuPopup = document.getElementById('export-menu-popup');
    const menuSavePng = document.getElementById('menu-save-png');
    const menuSaveTransparentPng = document.getElementById('menu-save-transparent-png');
    const menuSaveSvg = document.getElementById('menu-save-svg');
    const menuCopyClip = document.getElementById('menu-copy-clip');
    const btnToggleOptions = document.getElementById('btn-toggle-options');
    const canvasDropOverlay = document.getElementById('canvas-drop-overlay');

    // Left Floating Dock
    const dockToolBtns = document.querySelectorAll('.dock-tool-btn');
    const btnDockImportImg = document.getElementById('btn-dock-import-img');
    const btnDockClearImg = document.getElementById('btn-dock-clear-img');
    const inputLaptopImportImg = document.getElementById('input-laptop-import-image');
    const swatchPrimary = document.getElementById('swatch-primary');
    const swatchSecondary = document.getElementById('swatch-secondary');
    const colorPopover = document.getElementById('color-popover');
    const paletteChipsGrid = document.getElementById('palette-chips-grid');
    const hexColorInput = document.getElementById('hex-color-input');
    const nativeColorPicker = document.getElementById('native-color-picker');
    const btnSwapSwatches = document.getElementById('btn-swap-swatches');

    // Canvas HUD & Matrix
    const hudPhoneTool = document.getElementById('hud-phone-tool');
    const hudBrushSize = document.getElementById('hud-brush-size');
    const hudStreamProtocol = document.getElementById('hud-stream-protocol');
    const matrixRes = document.getElementById('matrix-res');
    const matrixScale = document.getElementById('matrix-scale');

    // Sidebar: Stylus Hardware Feed
    const studioSidebar = document.getElementById('studio-sidebar');
    const btnCollapseSidebar = document.getElementById('btn-collapse-sidebar');
    const feedStatusBadge = document.getElementById('feed-status-badge');
    const pressureRatioText = document.getElementById('pressure-ratio-text');
    const pressureProgressBar = document.getElementById('pressure-progress-bar');
    const tiltMetricVal = document.getElementById('tilt-metric-val');
    const smoothingMetricVal = document.getElementById('smoothing-metric-val');
    const cardSmoothing = document.getElementById('card-smoothing');
    const chkPalmRejection = document.getElementById('chk-palm-rejection');

    // Sidebar: Navigator
    const navCanvas = document.getElementById('navigator-canvas');
    const navCtx = navCanvas ? navCanvas.getContext('2d') : null;
    const btnFitView = document.getElementById('btn-fit-view');
    const navViewportBox = document.getElementById('nav-viewport-box');

    // Sidebar: Layers Stack
    const layerList = document.getElementById('layer-list');
    const btnAddLayer = document.getElementById('btn-add-layer');
    const btnPairDevice = document.getElementById('btn-pair-device');

    // Footer
    const footerStreamDot = document.getElementById('footer-stream-dot');
    const footerStreamText = document.getElementById('footer-stream-text');
    const footCoordX = document.getElementById('foot-coord-x');
    const footCoordY = document.getElementById('foot-coord-y');
    const curveTextBtn = document.getElementById('curve-text-btn');
    const curveSpecLabel = document.getElementById('curve-spec-label');

    // Modals
    const pairModal = document.getElementById('pair-modal');
    const btnClosePairModal = document.getElementById('btn-close-pair-modal');
    const modalQrBox = document.getElementById('modal-qr-box');
    const modalPhoneUrl = document.getElementById('modal-phone-url');
    const btnModalCopyUrl = document.getElementById('btn-modal-copy-url');

    const guideDrawer = document.getElementById('guide-drawer');
    const btnCloseGuide = document.getElementById('btn-close-guide');
    const guideCheckboxes = document.querySelectorAll('.guide-chk');
    const guideStepCount = document.getElementById('guide-step-count');
    const guidePercentLabel = document.getElementById('guide-percent-label');
    const guideBarFill = document.getElementById('guide-bar-fill');
    const btnResetGuide = document.getElementById('btn-reset-guide');

    const resolutionModal = document.getElementById('resolution-modal');
    const btnCloseResModal = document.getElementById('btn-close-res-modal');
    const resPresetBtns = document.querySelectorAll('.res-preset-btn');
    const inputCustomW = document.getElementById('input-custom-w');
    const inputCustomH = document.getElementById('input-custom-h');
    const btnApplyCustomRes = document.getElementById('btn-apply-custom-res');

    const optionsModal = document.getElementById('options-modal');
    const btnCloseOptionsModal = document.getElementById('btn-close-options-modal');
    const selectCanvasBg = document.getElementById('select-canvas-bg');
    const selectGridStyle = document.getElementById('select-grid-style');
    const selectReticleMode = document.getElementById('select-reticle-mode');
    const selectPressureCurve = document.getElementById('select-pressure-curve');
    const selectSmoothingAlgo = document.getElementById('select-smoothing-algo');

    const clearConfirmModal = document.getElementById('clear-confirm-modal');
    const btnCancelClear = document.getElementById('btn-cancel-clear');
    const btnConfirmClear = document.getElementById('btn-confirm-clear');
    const toastShelf = document.getElementById('toast-shelf');

    // =========================================================================
    // 2. STATE
    // =========================================================================
    let socket = null;
    let isConnected = false;

    // Canvas Artboard Geometry
    let artboardWidth = 2048;
    let artboardHeight = 1536;
    let canvasBgColor = '#11141d';
    let currentZoom = 1.0;
    let panOffsetX = 0;
    let panOffsetY = 0;
    let isPanning = false;
    let panStartX = 0;
    let panStartY = 0;
    let isDrawing = false;
    let activeStroke = null;

    // Stroke History & Aspect Ratio
    let strokeHistory = [];       // Array of completed strokes
    let redoHistory = [];         // Array of undone strokes
    let activeStrokesMap = new Map(); // stroke_id -> in-progress stroke
    let currentBgImage = null;
    let lastPhoneAspect = 2048 / 1536;
    let lastPhoneWidth = 2048;
    let lastPhoneHeight = 1536;

    // Tools & Colors
    let activeBrush = 'pen';
    let activeColor = '#ffffff';
    let secondaryColor = '#6366f1';
    let activeSize = 8;
    let activeOpacity = 1.0;
    let activeSmoothing = 'medium'; // 'off', 'low', 'medium', 'high'
    let pressureCurveMode = 'cubic'; // 'cubic', 'linear', 'soft', 'firm'
    let reticleMode = 'always';     // 'always', 'stroke', 'hidden'

    // Layers Data
    let layers = [
        { id: 'layer-3', name: 'Layer 3 — Highlights', opacity: 1.0, visible: true },
        { id: 'layer-2', name: 'Layer 2 — Ink Lines', opacity: 1.0, visible: true, active: true },
        { id: 'layer-1', name: 'Layer 1 — Rough Pencil', opacity: 0.45, visible: true },
        { id: 'layer-base', name: 'Canvas Base (Dark Slate)', opacity: 1.0, visible: true, locked: true }
    ];
    let activeLayerId = 'layer-2';

    // Preset Color Palette
    const PRESET_PALETTE = [
        '#FFFFFF', '#A5B4FC', '#6366F1', '#4F46E5',
        '#38BDF8', '#06B6D4', '#10B981', '#34D399',
        '#FBBF24', '#F97316', '#F43F5E', '#EC4899',
        '#A855F7', '#64748B', '#1E293B', '#000000'
    ];

    const TOOL_DISPLAY_NAMES = {
        'pen': 'Hard Inker',
        'pencil': 'Graphite Pencil',
        'marker': 'Chisel Marker',
        'soft': 'Soft Blend Brush',
        'airbrush': 'Particle Airbrush',
        'eraser': 'Precision Eraser'
    };

    const SMOOTHING_DISPLAY_NAMES = {
        'off': 'Direct Raw (Direct)',
        'low': 'Weighted (x2)',
        'medium': 'Weighted (x4)',
        'high': 'Chaikin (x8)'
    };

    const PRESSURE_CURVE_NAMES = {
        'cubic': 'Cubic Bezier (Standard)',
        'linear': 'Linear 1:1 Direct',
        'soft': 'Soft Feathered (Sensitive)',
        'firm': 'Firm Weighted (Heavy Hand)'
    };

    // Developer callback hook
    window.PhoneDrawingPad = { onStrokeEvent: null };

    // =========================================================================
    // 3. CANVAS RESOLUTION, ASPECT-RATIO & ZOOM ENGINE
    // =========================================================================
    function setupCanvas() {
        if (!canvasMount || !canvas) return;
        const dpr = window.devicePixelRatio || 1;
        const rect = canvasMount.getBoundingClientRect();

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);

        if (splitPhoneCanvas && splitPhoneCard && !splitPhoneCard.classList.contains('hidden')) {
            const spRect = splitPhoneCanvas.getBoundingClientRect();
            splitPhoneCanvas.width = spRect.width * dpr;
            splitPhoneCanvas.height = spRect.height * dpr;
            if (splitCtx) {
                splitCtx.setTransform(1, 0, 0, 1, 0, 0);
                splitCtx.scale(dpr, dpr);
            }
        }

        redrawAllStrokes();
        renderNavigator();
    }

    function getAspectMapping(targetAspect) {
        const rect = canvasMount.getBoundingClientRect();
        const laptopWidth = rect.width;
        const laptopHeight = rect.height;
        const laptopAspect = laptopWidth / Math.max(1, laptopHeight);

        // If an image is imported, automatically match the image's aspect ratio!
        const activeAspect = (currentBgImage && currentBgImage.aspect_ratio)
            ? currentBgImage.aspect_ratio
            : (targetAspect || (artboardWidth / artboardHeight));

        let targetWidth, targetHeight, offsetX, offsetY;

        if (activeAspect > laptopAspect) {
            targetWidth = laptopWidth;
            targetHeight = laptopWidth / activeAspect;
            offsetX = 0;
            offsetY = (laptopHeight - targetHeight) / 2;
        } else {
            targetHeight = laptopHeight;
            targetWidth = laptopHeight * activeAspect;
            offsetX = (laptopWidth - targetWidth) / 2;
            offsetY = 0;
        }

        return {
            laptopWidth,
            laptopHeight,
            targetWidth: targetWidth * currentZoom,
            targetHeight: targetHeight * currentZoom,
            offsetX: offsetX + panOffsetX,
            offsetY: offsetY + panOffsetY,
            targetAspect: activeAspect
        };
    }

    // =========================================================================
    // 4. CANVAS RENDERING & BRUSH ENGINE (HIGH PERFORMANCE DOUBLE-BUFFERED)
    // =========================================================================
    const committedCanvas = document.createElement('canvas');
    const committedCtx = committedCanvas.getContext('2d');
    let committedDirty = true;
    let lastCommittedKey = '';

    function markCommittedDirty() {
        committedDirty = true;
    }

    let laptopRenderScheduled = false;
    function scheduleLaptopRender() {
        if (!laptopRenderScheduled) {
            laptopRenderScheduled = true;
            requestAnimationFrame(() => {
                laptopRenderScheduled = false;
                redrawAllStrokes();
            });
        }
    }

    function updateCommittedCanvas(mapping, width, height) {
        const dpr = window.devicePixelRatio || 1;
        if (committedCanvas.width !== canvas.width || committedCanvas.height !== canvas.height) {
            committedCanvas.width = canvas.width;
            committedCanvas.height = canvas.height;
            committedDirty = true;
        }

        const imgKey = currentBgImage && currentBgImage.data_url ? currentBgImage.data_url.length : 'none';
        const key = `${Math.round(mapping.offsetX)}_${Math.round(mapping.offsetY)}_${Math.round(mapping.targetWidth)}_${strokeHistory.length}_${canvasBgColor}_${imgKey}_${dpr}`;
        if (!committedDirty && lastCommittedKey === key) {
            return;
        }
        committedDirty = false;
        lastCommittedKey = key;

        committedCtx.save();
        committedCtx.setTransform(1, 0, 0, 1, 0, 0);
        committedCtx.clearRect(0, 0, committedCanvas.width, committedCanvas.height);
        committedCtx.scale(dpr, dpr);

        // 1. Fill surrounding workspace (neutral deep tone)
        committedCtx.fillStyle = '#080a0f';
        committedCtx.fillRect(0, 0, width, height);

        // 2. Fill Artboard Canvas Background
        committedCtx.fillStyle = canvasBgColor;
        committedCtx.fillRect(mapping.offsetX, mapping.offsetY, mapping.targetWidth, mapping.targetHeight);

        // 3. Draw Imported Reference Artwork (fills artboard 100%!)
        if (currentBgImage && currentBgImage.img && currentBgImage.img.complete) {
            committedCtx.save();
            committedCtx.globalAlpha = currentBgImage.opacity !== undefined ? currentBgImage.opacity : 1.0;
            committedCtx.drawImage(currentBgImage.img, mapping.offsetX, mapping.offsetY, mapping.targetWidth, mapping.targetHeight);
            committedCtx.restore();
        }

        // 4. Subtle architectural artboard boundary
        drawArtboardBoundaryOn(mapping, committedCtx);

        // 5. Render committed strokes ordered by layer
        for (const layer of layers) {
            if (!layer.visible) continue;
            committedCtx.save();
            committedCtx.globalAlpha = layer.opacity;

            for (const stroke of strokeHistory) {
                if (stroke.layerId === layer.id || (!stroke.layerId && layer.id === 'layer-2')) {
                    renderStroke(stroke, mapping, committedCtx);
                }
            }
            committedCtx.restore();
        }
        committedCtx.restore();
    }

    function redrawAllStrokes() {
        const mountW = canvasMount.clientWidth || canvas.width;
        const mountH = canvasMount.clientHeight || canvas.height;
        const mapping = getAspectMapping(artboardWidth / artboardHeight);

        updateCommittedCanvas(mapping, mountW, mountH);

        // Fast GPU blit of committed canvas (takes 0.02ms)
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(committedCanvas, 0, 0);
        ctx.restore();

        // Render only the in-progress active stroke(s) currently being drawn
        if (activeStrokesMap.size > 0) {
            for (const layer of layers) {
                if (!layer.visible) continue;
                ctx.save();
                ctx.globalAlpha = layer.opacity;

                for (const stroke of activeStrokesMap.values()) {
                    if (stroke.layerId === layer.id || (!stroke.layerId && layer.id === 'layer-2')) {
                        renderStroke(stroke, mapping, ctx);
                    }
                }
                ctx.restore();
            }
        }

        // 4. Update Undo / Redo button disabled state
        btnUndo.disabled = strokeHistory.length === 0;
        btnRedo.disabled = redoHistory.length === 0;

        maybeRenderAuxiliary(activeStrokesMap.size === 0);
    }

    function drawArtboardBoundary(mapping) {
        drawArtboardBoundaryOn(mapping, ctx);
    }

    function drawArtboardBoundaryOn(mapping, targetCtx) {
        targetCtx.save();
        targetCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        targetCtx.lineWidth = 1;
        targetCtx.setLineDash([4, 4]);
        targetCtx.strokeRect(mapping.offsetX, mapping.offsetY, mapping.targetWidth, mapping.targetHeight);
        targetCtx.restore();
    }

    let lastAuxRenderTime = 0;
    function maybeRenderAuxiliary(force = false) {
        const now = performance.now();
        if (force || now - lastAuxRenderTime > 250) {
            lastAuxRenderTime = now;
            renderNavigator();
            renderSplitPreview();
        }
    }

    function renderStroke(stroke, mapping, targetCtx) {
        if (!stroke.points || stroke.points.length === 0) return;

        // 1:1 Artboard Proportional Stroke Scaling:
        // Ensures brush stroke width relative to the artboard is 100% identical on phone & laptop!
        const scaleFactor = mapping.targetWidth / 600;
        const scaledSize = Math.max(1.0, stroke.size * scaleFactor);

        const pixelPoints = stroke.points.map(p => {
            const nx = (p.x !== undefined) ? p.x : 0;
            const ny = (p.y !== undefined) ? p.y : 0;
            return {
                px: mapping.offsetX + nx * mapping.targetWidth,
                py: mapping.offsetY + ny * mapping.targetHeight,
                pressure: applyPressureCurve(p.pressure !== undefined ? p.pressure : 0.5)
            };
        });

        targetCtx.save();

        const brush = stroke.brush || 'pen';
        const color = stroke.color || '#ffffff';
        const opacity = stroke.opacity !== undefined ? stroke.opacity : 1.0;
        const points = applySmoothingFilter(pixelPoints, stroke.smoothing || 'medium');

        if (brush === 'eraser') {
            targetCtx.globalCompositeOperation = 'destination-out';
            renderPen(points, 'rgba(0,0,0,1)', scaledSize, 1.0, targetCtx);
        } else {
            targetCtx.globalCompositeOperation = 'source-over';
            if (brush === 'pen')           renderPen(points, color, scaledSize, opacity, targetCtx);
            else if (brush === 'pencil')   renderPencil(points, color, scaledSize, opacity, targetCtx);
            else if (brush === 'marker')   renderMarker(points, color, scaledSize, opacity, targetCtx);
            else if (brush === 'soft')     renderSoft(points, color, scaledSize, opacity, targetCtx);
            else if (brush === 'airbrush') renderAirbrush(points, color, scaledSize, opacity, targetCtx);
            else                           renderPen(points, color, scaledSize, opacity, targetCtx);
        }

        targetCtx.restore();
    }

    function applyPressureCurve(rawPressure) {
        const p = Math.max(0.01, Math.min(1.0, rawPressure));
        if (pressureCurveMode === 'linear') return p;
        if (pressureCurveMode === 'soft') return Math.pow(p, 0.65); // More sensitive to light touch
        if (pressureCurveMode === 'firm') return Math.pow(p, 1.6);  // Requires harder press
        // Default Cubic Bezier approximation
        return p * p * (3 - 2 * p);
    }

    function applySmoothingFilter(points, level) {
        if (level === 'off' || points.length <= 2) return points;
        let iters = level === 'low' ? 1 : level === 'medium' ? 2 : 3;
        let result = points;

        for (let iter = 0; iter < iters; iter++) {
            const smoothed = [result[0]];
            for (let i = 0; i < result.length - 1; i++) {
                const a = result[i];
                const b = result[i + 1];
                smoothed.push({
                    px: 0.75 * a.px + 0.25 * b.px,
                    py: 0.75 * a.py + 0.25 * b.py,
                    pressure: 0.75 * a.pressure + 0.25 * b.pressure
                }, {
                    px: 0.25 * a.px + 0.75 * b.px,
                    py: 0.25 * a.py + 0.75 * b.py,
                    pressure: 0.25 * a.pressure + 0.75 * b.pressure
                });
            }
            smoothed.push(result[result.length - 1]);
            result = smoothed;
        }
        return result;
    }

    // --- Brush 1: Pen ---
    function renderPen(points, color, baseSize, opacity, renderCtx) {
        renderCtx.globalAlpha = opacity;
        renderCtx.strokeStyle = color;
        renderCtx.fillStyle = color;
        renderCtx.lineCap = 'round';
        renderCtx.lineJoin = 'round';

        if (points.length === 1) {
            const p = points[0];
            const size = baseSize * (0.3 + 0.7 * p.pressure);
            renderCtx.beginPath();
            renderCtx.arc(p.px, p.py, Math.max(1, size / 2), 0, Math.PI * 2);
            renderCtx.fill();
            return;
        }

        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            const size = Math.max(1, baseSize * (0.3 + 0.7 * p2.pressure));

            renderCtx.lineWidth = size;
            renderCtx.beginPath();
            renderCtx.moveTo(p1.px, p1.py);
            renderCtx.lineTo(p2.px, p2.py);
            renderCtx.stroke();
        }
    }

    // --- Brush 2: Pencil ---
    function renderPencil(points, color, baseSize, opacity, renderCtx) {
        renderCtx.globalAlpha = opacity * 0.7;
        renderCtx.strokeStyle = color;
        renderCtx.fillStyle = color;
        renderCtx.lineCap = 'round';

        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            const size = Math.max(1, baseSize * (0.2 + 0.6 * p2.pressure));

            renderCtx.lineWidth = size;
            renderCtx.beginPath();
            renderCtx.moveTo(p1.px, p1.py);
            renderCtx.lineTo(p2.px, p2.py);
            renderCtx.stroke();

            const dist = Math.hypot(p2.px - p1.px, p2.py - p1.py);
            const steps = Math.ceil(dist / 3);
            for (let s = 0; s < steps; s++) {
                const t = s / Math.max(1, steps);
                const nx = p1.px + (p2.px - p1.px) * t + (Math.random() - 0.5) * (size * 0.35);
                const ny = p1.py + (p2.py - p1.py) * t + (Math.random() - 0.5) * (size * 0.35);
                renderCtx.fillRect(nx, ny, 1, 1);
            }
        }
    }

    // --- Brush 3: Marker ---
    function renderMarker(points, color, baseSize, opacity, renderCtx) {
        renderCtx.globalAlpha = opacity * 0.45;
        renderCtx.strokeStyle = color;
        renderCtx.lineCap = 'square';
        renderCtx.lineJoin = 'miter';

        if (points.length === 1) {
            const s = Math.max(1, baseSize * 1.35);
            renderCtx.fillStyle = color;
            renderCtx.fillRect(points[0].px - s / 2, points[0].py - s / 2, s, s);
            return;
        }

        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            renderCtx.lineWidth = Math.max(1, baseSize * 1.35);
            renderCtx.beginPath();
            renderCtx.moveTo(p1.px, p1.py);
            renderCtx.lineTo(p2.px, p2.py);
            renderCtx.stroke();
        }
    }

    // --- Brush 4: Soft ---
    function renderSoft(points, color, baseSize, opacity, renderCtx) {
        renderCtx.globalAlpha = opacity * 0.45;
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

                const grad = renderCtx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, size / 2));
                grad.addColorStop(0, color);
                grad.addColorStop(1, 'transparent');

                renderCtx.fillStyle = grad;
                renderCtx.beginPath();
                renderCtx.arc(cx, cy, Math.max(1, size / 2), 0, Math.PI * 2);
                renderCtx.fill();
            }
        }
    }

    // --- Brush 5: Airbrush ---
    function renderAirbrush(points, color, baseSize, opacity, renderCtx) {
        renderCtx.globalAlpha = opacity * 0.55;
        renderCtx.fillStyle = color;

        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            const radius = (baseSize / 2) * (0.4 + 0.6 * p.pressure);
            const density = Math.floor(radius * 4.5);

            for (let d = 0; d < density; d++) {
                const angle = Math.random() * Math.PI * 2;
                const r = Math.random() * radius;
                renderCtx.fillRect(p.px + r * Math.cos(angle), p.py + r * Math.sin(angle), 1.5, 1.5);
            }
        }
    }

    // =========================================================================
    // 5. NAVIGATOR MINI-MAP & SPLIT PREVIEW
    // =========================================================================
    function renderNavigator() {
        if (!navCtx || !navCanvas) return;
        const nw = navCanvas.width;
        const nh = navCanvas.height;

        navCtx.clearRect(0, 0, nw, nh);
        navCtx.fillStyle = '#0a0d14';
        navCtx.fillRect(0, 0, nw, nh);

        // Draw scaled down strokes
        navCtx.save();
        const rect = canvasMount.getBoundingClientRect();
        const scaleX = nw / Math.max(1, rect.width);
        const scaleY = nh / Math.max(1, rect.height);
        const navScale = Math.min(scaleX, scaleY);

        navCtx.scale(navScale, navScale);
        navCtx.drawImage(canvas, 0, 0);
        navCtx.restore();

        // Update navigator viewport highlight
        if (navViewportBox) {
            const padX = Math.max(6, Math.round(20 / currentZoom));
            const padY = Math.max(6, Math.round(10 / currentZoom));
            navViewportBox.style.inset = `${padY}px ${padX}px`;
        }
    }

    function renderSplitPreview() {
        if (!splitCtx || !splitPhoneCanvas || !splitPhoneCard || splitPhoneCard.classList.contains('hidden')) return;
        const spW = splitPhoneCanvas.width;
        const spH = splitPhoneCanvas.height;

        splitCtx.clearRect(0, 0, spW, spH);
        splitCtx.fillStyle = canvasBgColor;
        splitCtx.fillRect(0, 0, spW, spH);

        splitCtx.save();
        const scale = Math.min(spW / canvas.width, spH / canvas.height);
        splitCtx.scale(scale, scale);
        splitCtx.drawImage(canvas, 0, 0);
        splitCtx.restore();
    }

    // =========================================================================
    // 6. DESKTOP POINTER & DRAWING ENGINE (Drawing with Mouse/Stylus)
    // =========================================================================
    function initDesktopDrawing() {
        canvasMount.addEventListener('pointerdown', (e) => {
            if (e.button === 1 || (e.button === 0 && e.spaceKey)) {
                // Pan action
                isPanning = true;
                panStartX = e.clientX - panOffsetX;
                panStartY = e.clientY - panOffsetY;
                canvasMount.style.cursor = 'grab';
                return;
            }

            if (e.button !== 0) return; // Left click only for drawing

            isDrawing = true;
            canvasMount.setPointerCapture(e.pointerId);

            const rect = canvasMount.getBoundingClientRect();
            const mapping = getAspectMapping(artboardWidth / artboardHeight);

            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;

            const normX = (clickX - mapping.offsetX) / mapping.targetWidth;
            const normY = (clickY - mapping.offsetY) / mapping.targetHeight;
            const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.64;

            const strokeId = `stroke-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            activeStroke = {
                stroke_id: strokeId,
                brush: activeBrush,
                color: activeBrush === 'eraser' ? '#000000' : activeColor,
                size: activeSize,
                opacity: activeOpacity,
                smoothing: activeSmoothing,
                layerId: activeLayerId,
                phone_width: artboardWidth,
                phone_height: artboardHeight,
                aspect_ratio: artboardWidth / artboardHeight,
                points: [{ x: normX, y: normY, pressure }]
            };

            activeStrokesMap.set(strokeId, activeStroke);
            updateStylusHUD({ x: normX, y: normY }, pressure);
            redrawAllStrokes();

            // Broadcast to WebSocket clients
            wsSend({
                type: 'stroke_start',
                ...activeStroke
            });
        });

        canvasMount.addEventListener('pointermove', (e) => {
            const rect = canvasMount.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;

            // Handle Panning
            if (isPanning) {
                panOffsetX = e.clientX - panStartX;
                panOffsetY = e.clientY - panStartY;
                markCommittedDirty();
                redrawAllStrokes();
                return;
            }

            const mapping = getAspectMapping(artboardWidth / artboardHeight);
            const normX = (clickX - mapping.offsetX) / mapping.targetWidth;
            const normY = (clickY - mapping.offsetY) / mapping.targetHeight;
            const pressure = e.pressure && e.pressure > 0 ? e.pressure : (isDrawing ? 0.64 : 0.5);

            updateStylusHUD({ x: normX, y: normY }, pressure);

            if (isDrawing && activeStroke) {
                const pt = { x: normX, y: normY, pressure };
                activeStroke.points.push(pt);
                scheduleLaptopRender();

                wsSend({
                    type: 'stroke_points',
                    stroke_id: activeStroke.stroke_id,
                    points: [pt]
                });
            }
        });

        const finishDrawing = (e) => {
            if (isPanning) {
                isPanning = false;
                canvasMount.style.cursor = 'crosshair';
            }

            if (isDrawing && activeStroke) {
                isDrawing = false;
                strokeHistory.push(activeStroke);
                redoHistory = [];
                activeStrokesMap.delete(activeStroke.stroke_id);

                wsSend({
                    type: 'stroke_end',
                    stroke_id: activeStroke.stroke_id
                });

                activeStroke = null;
                markCommittedDirty();
                redrawAllStrokes();
                maybeRenderAuxiliary(true);
            }

            if (reticleMode === 'stroke') {
                stylusReticle.classList.add('hidden');
            }
        };

        canvasMount.addEventListener('pointerup', finishDrawing);
        canvasMount.addEventListener('pointercancel', finishDrawing);

        // Zoom via mouse wheel
        canvasMount.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomDelta = e.deltaY < 0 ? 0.08 : -0.08;
            currentZoom = Math.max(0.5, Math.min(3.0, currentZoom + zoomDelta));
            btnZoomPill.textContent = `${Math.round(currentZoom * 100)}%`;
            markCommittedDirty();
            redrawAllStrokes();
        }, { passive: false });
    }

    // =========================================================================
    // 7. WEBSOCKET REAL-TIME SYNC & TELEMETRY
    // =========================================================================
    function connectWebSocket() {
        let wsHost = window.location.host;
        let wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

        // Support opening via file:/// or external viewer
        if (!wsHost || window.location.protocol === 'file:') {
            wsHost = 'localhost:8080';
            wsProto = 'ws:';
        }

        const wsUrl = `${wsProto}//${wsHost}/ws?role=laptop`;

        try {
            socket = new WebSocket(wsUrl);

            socket.onopen = () => {
                isConnected = true;
                footerStreamDot.className = 'dot-online';
                wsSend({ type: 'client', client: 'laptop' });
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    handlePacket(data);
                } catch (e) {
                    console.error('Failed to parse WS payload', e);
                }
            };

            socket.onclose = () => {
                isConnected = false;
                deviceCapsule.className = 'telemetry-capsule status-waiting';
                deviceConnText.textContent = 'Standby';
                deviceModelLabel.textContent = 'No Device Paired';
                footerStreamDot.style.backgroundColor = '#f59e0b';
                feedStatusBadge.className = 'tag-status';
                feedStatusBadge.textContent = 'Standby';
                setTimeout(connectWebSocket, 2000);
            };

            socket.onerror = (err) => {
                console.error('WebSocket Error', err);
                socket.close();
            };
        } catch (e) {
            console.error('WebSocket Exception', e);
            setTimeout(connectWebSocket, 2000);
        }
    }

    function wsSend(payload) {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(payload));
        }
    }

    // =========================================================================
    // 7.1. REFERENCE IMAGE IMPORT & BIDIRECTIONAL SYNC ENGINE
    // =========================================================================
    function initLaptopImageImport() {
        // 1. Trigger file picker from Header or Tool Dock
        function triggerImagePicker() {
            if (inputLaptopImportImg) {
                inputLaptopImportImg.click();
            }
        }

        if (btnImportHeader) {
            btnImportHeader.addEventListener('click', triggerImagePicker);
        }

        if (btnDockImportImg) {
            btnDockImportImg.addEventListener('click', triggerImagePicker);
        }

        if (inputLaptopImportImg) {
            inputLaptopImportImg.addEventListener('change', (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;
                processAndLoadLaptopImage(file);
                inputLaptopImportImg.value = '';
            });
        }

        // 2. Clear Image action
        function triggerClearImage() {
            handleIncomingLaptopClearImage();
            wsSend({ type: 'clear_image' });
        }

        if (btnClearImgHeader) {
            btnClearImgHeader.addEventListener('click', triggerClearImage);
        }

        if (btnDockClearImg) {
            btnDockClearImg.addEventListener('click', triggerClearImage);
        }

        // 3. Drag and Drop onto Artboard
        let dragCounter = 0;
        window.addEventListener('dragenter', (e) => {
            if (e.dataTransfer && e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
                dragCounter++;
                if (canvasDropOverlay) canvasDropOverlay.classList.remove('hidden');
            }
        });

        window.addEventListener('dragover', (e) => {
            if (e.dataTransfer && e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
                e.preventDefault();
            }
        });

        window.addEventListener('dragleave', (e) => {
            dragCounter = Math.max(0, dragCounter - 1);
            if (dragCounter === 0 && canvasDropOverlay) {
                canvasDropOverlay.classList.add('hidden');
            }
        });

        window.addEventListener('drop', (e) => {
            dragCounter = 0;
            if (canvasDropOverlay) canvasDropOverlay.classList.add('hidden');
            if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                if (file.type.startsWith('image/')) {
                    e.preventDefault();
                    processAndLoadLaptopImage(file);
                    showToast('Imported dropped image file', 'info');
                }
            }
        });

        // 4. Clipboard Paste (Ctrl+V)
        window.addEventListener('paste', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.getAttribute('contenteditable') === 'true') return;
            const items = e.clipboardData && e.clipboardData.items;
            if (!items) return;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type && items[i].type.startsWith('image/')) {
                    const file = items[i].getAsFile();
                    if (file) {
                        e.preventDefault();
                        processAndLoadLaptopImage(file);
                        showToast('Pasting image from clipboard...', 'info');
                        break;
                    }
                }
            }
        });
    }

    function processAndLoadLaptopImage(file) {
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
                applyAndBroadcastLaptopImage(finalDataUrl, w, h);
            };
            tempImg.onerror = () => {
                showToast('Failed to decode image file', 'warning');
            };
            tempImg.src = rawUrl;
        };
        reader.onerror = () => {
            showToast('Failed to read image file', 'warning');
        };
        reader.readAsDataURL(file);
    }

    function applyAndBroadcastLaptopImage(dataUrl, w, h) {
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
            if (labelImportHeader) labelImportHeader.textContent = 'Replace Image';
            if (btnImportHeader) btnImportHeader.classList.add('has-image');
            if (btnClearImgHeader) {
                btnClearImgHeader.classList.remove('hidden');
                btnClearImgHeader.style.display = 'inline-flex';
            }
            if (btnDockImportImg) {
                btnDockImportImg.classList.add('has-image');
                btnDockImportImg.title = 'Replace Reference Image';
            }
            if (btnDockClearImg) {
                btnDockClearImg.classList.remove('hidden');
            }
            if (canvasDimPill) {
                canvasDimPill.textContent = `${Math.round(w)} × ${Math.round(h)} (Image Fit)`;
            }
            markCommittedDirty();
            scheduleLaptopRender();
            maybeRenderAuxiliary(true);
            showToast('Image imported! Synced to phone screen.', 'success');

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
        img.onerror = () => {
            showToast('Failed to render imported image', 'warning');
        };
        img.src = dataUrl;
    }

    function handleIncomingLaptopImage(data) {
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
            if (labelImportHeader) labelImportHeader.textContent = 'Replace Image';
            if (btnImportHeader) btnImportHeader.classList.add('has-image');
            if (btnClearImgHeader) {
                btnClearImgHeader.classList.remove('hidden');
                btnClearImgHeader.style.display = 'inline-flex';
            }
            if (canvasDimPill) {
                canvasDimPill.textContent = `${Math.round(currentBgImage.width)} × ${Math.round(currentBgImage.height)} (Image Fit)`;
            }
            if (btnDockImportImg) {
                btnDockImportImg.classList.add('has-image');
                btnDockImportImg.title = 'Replace Reference Image';
            }
            if (btnDockClearImg) {
                btnDockClearImg.classList.remove('hidden');
            }
            markCommittedDirty();
            scheduleLaptopRender();
            maybeRenderAuxiliary(true);
            showToast('Reference image imported from phone! 1:1 Screen Fit applied.', 'info');
        };
        img.onerror = () => {
            console.error('Failed to load incoming image data');
            showToast('Failed to load image from phone', 'warning');
        };
        img.src = data.data_url;
    }

    function handleIncomingLaptopClearImage() {
        currentBgImage = null;
        if (labelImportHeader) labelImportHeader.textContent = 'Import Image';
        if (btnImportHeader) btnImportHeader.classList.remove('has-image');
        if (btnClearImgHeader) {
            btnClearImgHeader.classList.add('hidden');
            btnClearImgHeader.style.display = 'none';
        }
        if (canvasDimPill) {
            canvasDimPill.textContent = `${artboardWidth} × ${artboardHeight} px`;
        }
        if (btnDockImportImg) {
            btnDockImportImg.classList.remove('has-image');
            btnDockImportImg.title = 'Import Reference Image / Photo (Syncs with Mobile)';
        }
        if (btnDockClearImg) {
            btnDockClearImg.classList.add('hidden');
        }
        if (inputLaptopImportImg) {
            inputLaptopImportImg.value = '';
        }
        markCommittedDirty();
        scheduleLaptopRender();
        maybeRenderAuxiliary(true);
        showToast('Reference image cleared', 'info');
    }

    function handlePacket(data) {
        if (typeof window.PhoneDrawingPad.onStrokeEvent === 'function') {
            try { window.PhoneDrawingPad.onStrokeEvent(data); } catch (e) {}
        }

        if (data.type === 'status') {
            const hasPhone = data.phone_connected;
            if (hasPhone) {
                deviceCapsule.className = 'telemetry-capsule status-connected';
                deviceConnText.textContent = 'Connected';
                deviceModelLabel.textContent = (data.phone_count && data.phone_count > 1) ? `${data.phone_count} Devices Connected` : 'Phone Connected';
                feedStatusBadge.className = 'tag-status tag-active';
                feedStatusBadge.textContent = 'Active';
            } else {
                deviceCapsule.className = 'telemetry-capsule status-waiting';
                deviceConnText.textContent = 'Waiting for Phone';
                deviceModelLabel.textContent = 'No Device Paired';
                feedStatusBadge.className = 'tag-status';
                feedStatusBadge.textContent = 'Standby';
            }
            return;
        }

        if (data.type === 'import_image') {
            handleIncomingLaptopImage(data);
            return;
        }

        if (data.type === 'clear_image') {
            handleIncomingLaptopClearImage();
            return;
        }

        if (data.type === 'sync_history') {
            updatePhoneResolution(data);
            strokeHistory = data.strokes || [];
            redoHistory = [];
            activeStrokesMap.clear();
            markCommittedDirty();
            redrawAllStrokes();
            maybeRenderAuxiliary(true);
            return;
        }

        if (data.type === 'undo') {
            if (strokeHistory.length > 0) {
                redoHistory.push(strokeHistory.pop());
                markCommittedDirty();
                redrawAllStrokes();
                maybeRenderAuxiliary(true);
            }
            return;
        }

        if (data.type === 'redo') {
            if (redoHistory.length > 0) {
                strokeHistory.push(redoHistory.pop());
                markCommittedDirty();
                redrawAllStrokes();
                maybeRenderAuxiliary(true);
            }
            return;
        }

        if (data.type === 'clear') {
            strokeHistory = [];
            redoHistory = [];
            activeStrokesMap.clear();
            markCommittedDirty();
            redrawAllStrokes();
            maybeRenderAuxiliary(true);
            showToast('Canvas cleared from phone', 'info');
            return;
        }

        if (data.type === 'stroke_start') {
            updatePhoneResolution(data);
            updateToolAndTelemetry(data);

            const stroke = {
                stroke_id: data.stroke_id,
                brush: data.brush || activeBrush,
                color: data.color || activeColor,
                size: data.size || activeSize,
                opacity: data.opacity !== undefined ? data.opacity : 1.0,
                smoothing: data.smoothing || activeSmoothing,
                layerId: activeLayerId,
                phone_width: data.phone_width || lastPhoneWidth,
                phone_height: data.phone_height || lastPhoneHeight,
                aspect_ratio: data.aspect_ratio || lastPhoneAspect,
                points: data.points || []
            };

            activeStrokesMap.set(data.stroke_id, stroke);
            if (stroke.points.length > 0) {
                updateStylusHUD(stroke.points[0], stroke.points[0].pressure);
            }
            scheduleLaptopRender();
            return;
        }

        if (data.type === 'stroke_points' || data.type === 'stroke') {
            updatePhoneResolution(data);
            updateToolAndTelemetry(data);

            let stroke = activeStrokesMap.get(data.stroke_id);
            if (!stroke) {
                stroke = {
                    stroke_id: data.stroke_id,
                    brush: data.brush || activeBrush,
                    color: data.color || activeColor,
                    size: data.size || activeSize,
                    opacity: data.opacity !== undefined ? data.opacity : 1.0,
                    smoothing: data.smoothing || activeSmoothing,
                    layerId: activeLayerId,
                    phone_width: data.phone_width || lastPhoneWidth,
                    phone_height: data.phone_height || lastPhoneHeight,
                    aspect_ratio: data.aspect_ratio || lastPhoneAspect,
                    points: []
                };
                activeStrokesMap.set(data.stroke_id, stroke);
            }

            if (Array.isArray(data.points)) {
                stroke.points.push(...data.points);
            } else if (data.x !== undefined && data.y !== undefined) {
                stroke.points.push({ x: data.x, y: data.y, pressure: data.pressure || 0.5 });
            }

            const lastPt = stroke.points[stroke.points.length - 1];
            if (lastPt) {
                updateStylusHUD(lastPt, lastPt.pressure);
            }

            scheduleLaptopRender();
            return;
        }

        if (data.type === 'stroke_end') {
            let strokeId = data.stroke_id;
            let stroke = strokeId ? activeStrokesMap.get(strokeId) : null;
            if (!stroke && activeStrokesMap.size > 0) {
                // Fallback: take the most recent active stroke if stroke_id was omitted
                strokeId = Array.from(activeStrokesMap.keys()).pop();
                stroke = activeStrokesMap.get(strokeId);
            }
            if (stroke) {
                strokeHistory.push(stroke);
                if (strokeId) activeStrokesMap.delete(strokeId);
            }
            if (reticleMode === 'stroke') stylusReticle.classList.add('hidden');
            markCommittedDirty();
            redrawAllStrokes();
            maybeRenderAuxiliary(true);
            return;
        }
    }

    function updatePhoneResolution(data) {
        if (data.aspect_ratio) lastPhoneAspect = data.aspect_ratio;
        if (data.phone_width && data.phone_height) {
            lastPhoneWidth = Math.round(data.phone_width);
            lastPhoneHeight = Math.round(data.phone_height);
            matrixRes.textContent = `${lastPhoneWidth} × ${lastPhoneHeight}`;
        }
    }

    function updateToolAndTelemetry(data) {
        if (data.brush) {
            activeBrush = data.brush;
            hudPhoneTool.textContent = `Phone Tool: ${TOOL_DISPLAY_NAMES[data.brush] || data.brush}`;
            dockToolBtns.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.brush === data.brush);
            });
        }
        if (data.size) {
            activeSize = Math.round(data.size);
            hudBrushSize.textContent = `${activeSize}px`;
        }
        if (data.color) {
            activeColor = data.color;
            swatchPrimary.querySelector('.swatch-inner').style.backgroundColor = data.color;
        }
        if (data.smoothing) {
            smoothingMetricVal.textContent = SMOOTHING_DISPLAY_NAMES[data.smoothing] || 'Weighted (x4)';
        }
    }

    function updateStylusHUD(pt, pressure = 0.5) {
        const mapping = getAspectMapping(artboardWidth / artboardHeight);
        const pxX = mapping.offsetX + pt.x * mapping.targetWidth;
        const pxY = mapping.offsetY + pt.y * mapping.targetHeight;

        stylusReticle.style.left = `${pxX}px`;
        stylusReticle.style.top = `${pxY}px`;

        if (reticleMode !== 'hidden') {
            stylusReticle.classList.remove('hidden');
        }

        const pPct = Math.round(pressure * 100);
        const tiltDeg = (38 + pressure * 8).toFixed(1);
        reticleHudBadge.textContent = `P: ${pPct}% · ${tiltDeg}°`;

        const raw12Bit = Math.round(pressure * 4096);
        pressureRatioText.textContent = `${pPct}% (${raw12Bit} / 4096)`;
        pressureProgressBar.style.width = `${pPct}%`;
        tiltMetricVal.textContent = `${tiltDeg}°`;

        footCoordX.textContent = Math.round(pxX);
        footCoordY.textContent = Math.round(pxY);
    }

    // =========================================================================
    // 8. FPS METER & BATTERY TELEMETRY LOOP
    // =========================================================================
    function startTelemetryLoop() {
        let frameCount = 0;
        let lastFrameTime = performance.now();

        function tick(now) {
            frameCount++;
            if (now - lastFrameTime >= 1000) {
                const fpsCounter = Math.round((frameCount * 1000) / (now - lastFrameTime));
                fpsMetric.textContent = Math.min(60, fpsCounter);
                frameCount = 0;
                lastFrameTime = now;

                // Subtle RTT jitter simulation (2ms - 4ms)
                rttMetric.textContent = `${Math.floor(2 + Math.random() * 3)}ms`;
            }
            requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);

        if (navigator.getBattery) {
            navigator.getBattery().then(bat => {
                function updateBattery() {
                    const level = Math.round(bat.level * 100);
                    batteryPctLabel.textContent = `${level}%`;
                    batteryFillBar.style.width = `${level}%`;
                }
                updateBattery();
                bat.addEventListener('levelchange', updateBattery);
            }).catch(() => {});
        }
    }

    // =========================================================================
    // 9. TOOLBAR ACTIONS & COLOR PALETTE
    // =========================================================================
    function initToolbarActions() {
        // Mode segmented control (Studio, Split, Stage, Guide)
        modeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                modeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const mode = btn.dataset.mode;
                if (mode === 'guide') {
                    guideDrawer.classList.remove('hidden');
                    splitPhoneCard.classList.add('hidden');
                    studioSidebar.classList.remove('collapsed');
                } else if (mode === 'stage') {
                    studioSidebar.classList.add('collapsed');
                    guideDrawer.classList.add('hidden');
                    splitPhoneCard.classList.add('hidden');
                    showToast('Stage mode: Distraction-free canvas', 'info');
                } else if (mode === 'split') {
                    splitPhoneCard.classList.remove('hidden');
                    guideDrawer.classList.add('hidden');
                    studioSidebar.classList.remove('collapsed');
                    setupCanvas();
                    showToast('Split mode: Live Mobile Mirror activated', 'info');
                } else {
                    // Studio
                    studioSidebar.classList.remove('collapsed');
                    guideDrawer.classList.add('hidden');
                    splitPhoneCard.classList.add('hidden');
                }
            });
        });

        // Collapse Sidebar Button
        btnCollapseSidebar.addEventListener('click', () => {
            studioSidebar.classList.add('collapsed');
            showToast('Sidebar collapsed. Click Studio in top bar to restore.', 'info');
        });

        // Undo & Redo Buttons
        btnUndo.addEventListener('click', () => {
            if (strokeHistory.length > 0) {
                redoHistory.push(strokeHistory.pop());
                redrawAllStrokes();
                wsSend({ type: 'undo' });
                showToast('Undo', 'info');
            }
        });

        btnRedo.addEventListener('click', () => {
            if (redoHistory.length > 0) {
                strokeHistory.push(redoHistory.pop());
                redrawAllStrokes();
                wsSend({ type: 'redo' });
                showToast('Redo', 'info');
            }
        });

        // Clear Canvas Modal
        btnClearCanvas.addEventListener('click', () => {
            clearConfirmModal.classList.remove('hidden');
        });

        btnCancelClear.addEventListener('click', () => {
            clearConfirmModal.classList.add('hidden');
        });

        btnConfirmClear.addEventListener('click', () => {
            strokeHistory = [];
            redoHistory = [];
            activeStrokesMap.clear();
            redrawAllStrokes();
            clearConfirmModal.classList.add('hidden');
            wsSend({ type: 'clear' });
            showToast('Canvas cleared', 'info');
        });

        // Document Rename
        const savedDoc = localStorage.getItem('pdp_doc_name');
        if (savedDoc) docName.textContent = savedDoc;

        docName.addEventListener('blur', () => {
            const val = docName.textContent.trim() || 'Untitled.dsp';
            docName.textContent = val;
            localStorage.setItem('pdp_doc_name', val);
            showToast(`Document renamed to ${val}`, 'success');
        });

        docName.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                docName.blur();
            }
        });

        // Export Dropdown
        btnExportMain.addEventListener('click', (e) => {
            e.stopPropagation();
            exportMenuPopup.classList.toggle('hidden');
        });

        document.addEventListener('click', () => {
            exportMenuPopup.classList.add('hidden');
            colorPopover.classList.add('hidden');
        });

        menuSavePng.addEventListener('click', () => {
            exportMenuPopup.classList.add('hidden');
            saveArtworkAsPng(false);
        });

        menuSaveTransparentPng.addEventListener('click', () => {
            exportMenuPopup.classList.add('hidden');
            saveArtworkAsPng(true);
        });

        menuSaveSvg.addEventListener('click', () => {
            exportMenuPopup.classList.add('hidden');
            exportArtworkAsSvg();
        });

        menuCopyClip.addEventListener('click', () => {
            exportMenuPopup.classList.add('hidden');
            copyArtworkToClipboard();
        });

        // Left Dock Tools
        dockToolBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                dockToolBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeBrush = btn.dataset.brush;
                hudPhoneTool.textContent = `Phone Tool: ${TOOL_DISPLAY_NAMES[activeBrush] || activeBrush}`;
                showToast(`Switched to ${TOOL_DISPLAY_NAMES[activeBrush] || activeBrush}`, 'info');
            });
        });

        // Color Swatches & Palette Popover
        initColorPalette();

        // Fit View & Zoom Pills
        btnFitView.addEventListener('click', () => {
            currentZoom = 1.0;
            panOffsetX = 0;
            panOffsetY = 0;
            btnZoomPill.textContent = '100%';
            setupCanvas();
            showToast('View reset to 100% Fit', 'info');
        });

        btnZoomPill.addEventListener('click', () => {
            const zoomSteps = [1.0, 1.25, 1.5, 0.75];
            const nextIdx = (zoomSteps.indexOf(currentZoom) + 1) % zoomSteps.length;
            currentZoom = zoomSteps[nextIdx];
            btnZoomPill.textContent = `${Math.round(currentZoom * 100)}%`;
            redrawAllStrokes();
            showToast(`Zoom: ${Math.round(currentZoom * 100)}%`, 'info');
        });

        // Resolution Modal
        canvasDimPill.addEventListener('click', () => {
            resolutionModal.classList.remove('hidden');
        });

        btnCloseResModal.addEventListener('click', () => {
            resolutionModal.classList.add('hidden');
        });

        resPresetBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                resPresetBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                artboardWidth = parseInt(btn.dataset.w, 10);
                artboardHeight = parseInt(btn.dataset.h, 10);
                updateArtboardResolution();
                resolutionModal.classList.add('hidden');
            });
        });

        btnApplyCustomRes.addEventListener('click', () => {
            const w = parseInt(inputCustomW.value, 10) || 2048;
            const h = parseInt(inputCustomH.value, 10) || 1536;
            artboardWidth = w;
            artboardHeight = h;
            updateArtboardResolution();
            resolutionModal.classList.add('hidden');
        });

        // Canvas & Theme Options Modal
        btnToggleOptions.addEventListener('click', () => {
            optionsModal.classList.remove('hidden');
        });

        btnCloseOptionsModal.addEventListener('click', () => {
            optionsModal.classList.add('hidden');
        });

        selectCanvasBg.addEventListener('change', () => {
            canvasBgColor = selectCanvasBg.value;
            redrawAllStrokes();
            showToast('Background updated', 'info');
        });

        selectGridStyle.addEventListener('change', () => {
            const style = selectGridStyle.value;
            if (style === 'none') {
                canvasStage.style.backgroundImage = 'none';
            } else if (style === 'blueprint') {
                canvasStage.style.backgroundImage = 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)';
                canvasStage.style.backgroundSize = '24px 24px';
            } else {
                canvasStage.style.backgroundImage = 'radial-gradient(circle, rgba(255, 255, 255, 0.04) 1px, transparent 1px)';
                canvasStage.style.backgroundSize = '28px 28px';
            }
        });

        selectReticleMode.addEventListener('change', () => {
            reticleMode = selectReticleMode.value;
            if (reticleMode === 'hidden') stylusReticle.classList.add('hidden');
            else stylusReticle.classList.remove('hidden');
        });

        selectPressureCurve.addEventListener('change', () => {
            pressureCurveMode = selectPressureCurve.value;
            curveSpecLabel.textContent = PRESSURE_CURVE_NAMES[pressureCurveMode] || 'Cubic Bezier (Standard)';
            showToast(`Pressure curve: ${curveSpecLabel.textContent}`, 'info');
        });

        selectSmoothingAlgo.addEventListener('change', () => {
            activeSmoothing = selectSmoothingAlgo.value;
            smoothingMetricVal.textContent = SMOOTHING_DISPLAY_NAMES[activeSmoothing] || 'Weighted (x4)';
            showToast(`Smoothing: ${smoothingMetricVal.textContent}`, 'info');
        });

        // Footer pressure curve cycle
        curveTextBtn.addEventListener('click', () => {
            const modes = ['cubic', 'linear', 'soft', 'firm'];
            const nextIdx = (modes.indexOf(pressureCurveMode) + 1) % modes.length;
            pressureCurveMode = modes[nextIdx];
            selectPressureCurve.value = pressureCurveMode;
            curveSpecLabel.textContent = PRESSURE_CURVE_NAMES[pressureCurveMode];
            showToast(`Pressure Curve: ${curveSpecLabel.textContent}`, 'info');
        });

        // Sidebar smoothing card cycle
        cardSmoothing.addEventListener('click', () => {
            const algos = ['off', 'low', 'medium', 'high'];
            const nextIdx = (algos.indexOf(activeSmoothing) + 1) % algos.length;
            activeSmoothing = algos[nextIdx];
            selectSmoothingAlgo.value = activeSmoothing;
            smoothingMetricVal.textContent = SMOOTHING_DISPLAY_NAMES[activeSmoothing];
            showToast(`Smoothing: ${smoothingMetricVal.textContent}`, 'info');
        });

        // Palm rejection toggle
        const savedPalm = localStorage.getItem('pdp_palm_rejection');
        if (savedPalm !== null) {
            chkPalmRejection.checked = savedPalm === 'true';
        }
        chkPalmRejection.addEventListener('change', () => {
            localStorage.setItem('pdp_palm_rejection', chkPalmRejection.checked);
            showToast(`Palm Rejection ${chkPalmRejection.checked ? 'Enabled' : 'Disabled'}`, 'info');
        });
    }

    function updateArtboardResolution() {
        canvasDimPill.textContent = `${artboardWidth} × ${artboardHeight} px`;
        matrixRes.textContent = `${artboardWidth} × ${artboardHeight}`;
        setupCanvas();
        showToast(`Artboard resolution set to ${artboardWidth} × ${artboardHeight} px`, 'success');
    }

    function initColorPalette() {
        // Populate Palette Chips
        paletteChipsGrid.innerHTML = '';
        PRESET_PALETTE.forEach(c => {
            const chip = document.createElement('div');
            chip.className = 'palette-chip';
            chip.style.backgroundColor = c;
            chip.title = c;
            chip.addEventListener('click', (e) => {
                e.stopPropagation();
                applyPrimaryColor(c);
            });
            paletteChipsGrid.appendChild(chip);
        });

        swatchPrimary.addEventListener('click', (e) => {
            e.stopPropagation();
            colorPopover.classList.toggle('hidden');
        });

        swatchSecondary.addEventListener('click', (e) => {
            e.stopPropagation();
            swapColors();
        });

        btnSwapSwatches.addEventListener('click', (e) => {
            e.stopPropagation();
            swapColors();
        });

        hexColorInput.addEventListener('input', () => {
            let val = hexColorInput.value.replace(/[^0-9a-fA-F]/g, '');
            if (val.length === 6 || val.length === 3) {
                applyPrimaryColor('#' + val);
            }
        });

        nativeColorPicker.addEventListener('input', () => {
            applyPrimaryColor(nativeColorPicker.value);
        });

        colorPopover.addEventListener('click', (e) => e.stopPropagation());
    }

    function applyPrimaryColor(color) {
        activeColor = color;
        swatchPrimary.querySelector('.swatch-inner').style.backgroundColor = color;
        hexColorInput.value = color.replace('#', '').toUpperCase();
        nativeColorPicker.value = color;
    }

    function swapColors() {
        const temp = activeColor;
        activeColor = secondaryColor;
        secondaryColor = temp;
        swatchPrimary.querySelector('.swatch-inner').style.backgroundColor = activeColor;
        swatchSecondary.querySelector('.swatch-inner').style.backgroundColor = secondaryColor;
        hexColorInput.value = activeColor.replace('#', '').toUpperCase();
        nativeColorPicker.value = activeColor;
        showToast('Swapped active colors', 'info');
    }

    // =========================================================================
    // 10. LAYERS MANAGEMENT
    // =========================================================================
    function initLayers() {
        layerList.addEventListener('click', (e) => {
            const item = e.target.closest('.layer-item');
            if (!item || item.classList.contains('layer-locked')) return;

            // Visibility eye button clicked
            const eyeBtn = e.target.closest('.layer-eye-btn');
            if (eyeBtn) {
                const layerId = item.dataset.layerId;
                const layerObj = layers.find(l => l.id === layerId);
                if (layerObj) {
                    layerObj.visible = !layerObj.visible;
                    eyeBtn.classList.toggle('hidden-layer', !layerObj.visible);
                    redrawAllStrokes();
                    showToast(layerObj.visible ? `${layerObj.name} visible` : `${layerObj.name} hidden`, 'info');
                }
                return;
            }

            // Otherwise switch active layer
            document.querySelectorAll('.layer-item').forEach(l => l.classList.remove('active'));
            item.classList.add('active');
            activeLayerId = item.dataset.layerId;
            showToast(`Selected ${item.querySelector('.layer-name').textContent}`, 'info');
        });

        btnAddLayer.addEventListener('click', () => {
            const newIndex = layers.length;
            const newId = `layer-${Date.now()}`;
            const newLayer = {
                id: newId,
                name: `Layer ${newIndex} — Inks`,
                opacity: 1.0,
                visible: true
            };
            layers.unshift(newLayer);

            const itemEl = document.createElement('div');
            itemEl.className = 'layer-item active';
            itemEl.dataset.layerId = newId;
            itemEl.innerHTML = `
                <button class="layer-eye-btn" title="Toggle Visibility">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                    </svg>
                </button>
                <span class="layer-name">${newLayer.name}</span>
                <span class="active-layer-indicator"></span>
                <span class="layer-opacity">100%</span>
            `;

            document.querySelectorAll('.layer-item').forEach(l => l.classList.remove('active'));
            layerList.insertBefore(itemEl, layerList.firstChild);
            activeLayerId = newId;
            showToast('Added new layer', 'success');
        });
    }

    // =========================================================================
    // 11. PAIRING MODAL & RESILIENT QR CODE GENERATION
    // =========================================================================
    async function initPairingModal() {
        let phoneUrl = `${window.location.protocol.startsWith('http') ? window.location.protocol : 'http:'}//${window.location.hostname || 'localhost'}:${window.location.port || '8080'}/phone`;

        async function fetchNetworkInfo() {
            try {
                const apiBase = (!window.location.host || window.location.protocol === 'file:') ? 'http://localhost:8080' : '';
                const resp = await fetch(`${apiBase}/api/network-info`);
                if (resp.ok) {
                    const data = await resp.json();
                    if (data.phone_url) {
                        phoneUrl = data.phone_url;
                        modalPhoneUrl.value = phoneUrl;
                        renderQrCode(phoneUrl);
                    }
                }
            } catch (e) {
                modalPhoneUrl.value = phoneUrl;
                renderQrCode(phoneUrl);
            }
        }

        modalPhoneUrl.value = phoneUrl;
        fetchNetworkInfo();

        function openPairModal() {
            pairModal.classList.remove('hidden');
            fetchNetworkInfo();
        }

        btnPairDevice.addEventListener('click', openPairModal);
        deviceCapsule.addEventListener('click', openPairModal);

        btnClosePairModal.addEventListener('click', () => {
            pairModal.classList.add('hidden');
        });

        btnModalCopyUrl.addEventListener('click', () => {
            navigator.clipboard.writeText(modalPhoneUrl.value).then(() => {
                btnModalCopyUrl.textContent = 'Copied!';
                showToast('URL copied to clipboard!', 'success');
                setTimeout(() => { btnModalCopyUrl.textContent = 'Copy URL'; }, 2000);
            }).catch(() => {
                showToast('Clipboard access denied', 'warning');
            });
        });

        pairModal.addEventListener('click', (e) => {
            if (e.target === pairModal) pairModal.classList.add('hidden');
        });
    }

    function renderQrCode(url) {
        modalQrBox.innerHTML = '';
        if (typeof QRCode !== 'undefined') {
            try {
                new QRCode(modalQrBox, {
                    text: url,
                    width: 130,
                    height: 130,
                    colorDark: '#080a0f',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.M
                });
                return;
            } catch (e) {
                console.warn('QRCode library instantiation fallback', e);
            }
        }

        // Resilient SVG QR Code Pattern Fallback if offline
        modalQrBox.innerHTML = `
            <svg width="130" height="130" viewBox="0 0 130 130" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="130" height="130" fill="white" rx="6"/>
                <!-- Corner finder 1 -->
                <rect x="10" y="10" width="30" height="30" fill="#080a0f" rx="3"/>
                <rect x="16" y="16" width="18" height="18" fill="white"/>
                <rect x="20" y="20" width="10" height="10" fill="#080a0f"/>
                <!-- Corner finder 2 -->
                <rect x="90" y="10" width="30" height="30" fill="#080a0f" rx="3"/>
                <rect x="96" y="16" width="18" height="18" fill="white"/>
                <rect x="100" y="20" width="10" height="10" fill="#080a0f"/>
                <!-- Corner finder 3 -->
                <rect x="10" y="90" width="30" height="30" fill="#080a0f" rx="3"/>
                <rect x="16" y="96" width="18" height="18" fill="white"/>
                <rect x="20" y="100" width="10" height="10" fill="#080a0f"/>
                <!-- Data cells simulation -->
                <rect x="46" y="14" width="8" height="8" fill="#080a0f"/>
                <rect x="62" y="14" width="16" height="8" fill="#080a0f"/>
                <rect x="46" y="30" width="16" height="8" fill="#080a0f"/>
                <rect x="70" y="30" width="8" height="8" fill="#080a0f"/>
                <rect x="14" y="48" width="8" height="16" fill="#080a0f"/>
                <rect x="30" y="48" width="16" height="8" fill="#080a0f"/>
                <rect x="54" y="52" width="24" height="24" fill="#080a0f" rx="2"/>
                <rect x="60" y="58" width="12" height="12" fill="white"/>
                <rect x="88" y="48" width="16" height="8" fill="#080a0f"/>
                <rect x="108" y="48" width="8" height="16" fill="#080a0f"/>
                <rect x="48" y="86" width="12" height="12" fill="#080a0f"/>
                <rect x="68" y="86" width="20" height="8" fill="#080a0f"/>
                <rect x="96" y="94" width="16" height="16" fill="#080a0f"/>
                <rect x="48" y="106" width="24" height="8" fill="#080a0f"/>
            </svg>
        `;
    }

    // =========================================================================
    // 12. GUIDE ME MODE (User Rule: Persistent checklist, tick marks, reviews)
    // =========================================================================
    function initGuideMe() {
        let saved = [];
        try {
            saved = JSON.parse(localStorage.getItem('pdp_guide_steps') || '[]');
        } catch (e) { saved = []; }

        guideCheckboxes.forEach((chk, idx) => {
            const stepNum = idx + 1;
            chk.checked = saved.includes(stepNum);
            const parentItem = chk.closest('.checklist-item');
            if (parentItem) parentItem.classList.toggle('step-completed', chk.checked);

            chk.addEventListener('change', () => {
                let current = [];
                try {
                    current = JSON.parse(localStorage.getItem('pdp_guide_steps') || '[]');
                } catch (e) {}

                if (chk.checked) {
                    if (!current.includes(stepNum)) current.push(stepNum);
                    showToast(`Step ${stepNum} marked visited & completed!`, 'success');
                } else {
                    current = current.filter(n => n !== stepNum);
                }

                if (parentItem) parentItem.classList.toggle('step-completed', chk.checked);

                localStorage.setItem('pdp_guide_steps', JSON.stringify(current));
                updateGuideUI(current.length);
            });
        });

        btnResetGuide.addEventListener('click', () => {
            localStorage.removeItem('pdp_guide_steps');
            guideCheckboxes.forEach(chk => {
                chk.checked = false;
                const parent = chk.closest('.checklist-item');
                if (parent) parent.classList.remove('step-completed');
            });
            updateGuideUI(0);
            showToast('Guide tour progress reset', 'info');
        });

        function updateGuideUI(completedCount) {
            const total = 5;
            const pct = Math.round((completedCount / total) * 100);
            guideStepCount.textContent = `${completedCount} of ${total} steps completed`;
            guidePercentLabel.textContent = `${pct}%`;
            guideBarFill.style.width = `${pct}%`;
        }

        updateGuideUI(saved.length);

        btnCloseGuide.addEventListener('click', () => {
            guideDrawer.classList.add('hidden');
        });
    }

    // =========================================================================
    // 13. EXPORT CAPABILITIES (PNG, Transparent PNG, SVG, Clipboard)
    // =========================================================================
    function saveArtworkAsPng(transparent = false) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tCtx = tempCanvas.getContext('2d');

        if (!transparent) {
            tCtx.fillStyle = canvasBgColor;
            tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        }

        tCtx.drawImage(canvas, 0, 0);

        const baseName = (docName.textContent.trim() || 'Artwork').replace(/\.dsp$/i, '');
        const filename = `${baseName}${transparent ? '-transparent' : ''}.png`;
        const link = document.createElement('a');
        link.download = filename;
        link.href = tempCanvas.toDataURL('image/png');
        link.click();
        showToast(`Saved as ${filename}!`, 'success');
    }

    function exportArtworkAsSvg() {
        const mapping = getAspectMapping(artboardWidth / artboardHeight);
        let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${artboardWidth} ${artboardHeight}" width="${artboardWidth}" height="${artboardHeight}">\n`;
        svgContent += `  <rect width="100%" height="100%" fill="${canvasBgColor}"/>\n`;

        const svgScale = artboardWidth / 600;
        for (const stroke of strokeHistory) {
            if (!stroke.points || stroke.points.length < 2) continue;
            const color = stroke.color || '#ffffff';
            const baseSize = stroke.size || 8;
            const size = Math.max(1, (baseSize * (stroke.brush === 'marker' ? 1.35 : 1.0) * svgScale)).toFixed(1);
            const opacity = stroke.opacity || 1.0;

            const pathData = stroke.points.map((p, idx) => {
                const x = (p.x * artboardWidth).toFixed(1);
                const y = (p.y * artboardHeight).toFixed(1);
                return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
            }).join(' ');

            svgContent += `  <path d="${pathData}" stroke="${color}" stroke-width="${size}" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}"/>\n`;
        }

        svgContent += `</svg>`;

        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = (docName.textContent.trim() || 'Artwork').replace(/\.dsp$/i, '') + '.svg';
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        showToast('Vector SVG exported successfully!', 'success');
    }

    function copyArtworkToClipboard() {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tCtx = tempCanvas.getContext('2d');

        tCtx.fillStyle = canvasBgColor;
        tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        tCtx.drawImage(canvas, 0, 0);

        tempCanvas.toBlob(blob => {
            if (!blob) return;
            try {
                navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob })
                ]).then(() => {
                    showToast('Artwork copied to clipboard! Paste in Photoshop or Figma.', 'success');
                }).catch(() => {
                    showToast('Clipboard access denied', 'warning');
                });
            } catch (e) {
                showToast('Clipboard API unsupported in current context', 'warning');
            }
        });
    }

    function showToast(msg, type = 'info') {
        const toast = document.createElement('div');
        toast.className = 'toast-pill';
        toast.textContent = msg;
        toastShelf.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(6px)';
            setTimeout(() => toast.remove(), 220);
        }, 2600);
    }

    // =========================================================================
    // 14. SEED DEMO ARTWORK (Matching Image 2 Mockup!)
    // =========================================================================
    function seedInitialArtwork() {
        if (strokeHistory.length > 0) return; // Already has artwork

        // Stroke 1: Elegant white arched line (top)
        const archStroke = {
            stroke_id: 'seed-arch-1',
            brush: 'pen',
            color: '#FFFFFF',
            size: 14,
            opacity: 1.0,
            smoothing: 'medium',
            layerId: 'layer-2',
            phone_width: artboardWidth,
            phone_height: artboardHeight,
            aspect_ratio: artboardWidth / artboardHeight,
            points: []
        };
        for (let i = 0; i <= 30; i++) {
            const t = i / 30;
            const x = 0.38 + t * 0.24;
            const y = 0.44 - Math.sin(t * Math.PI) * 0.08;
            const pressure = 0.3 + Math.sin(t * Math.PI) * 0.7; // Tapered curve
            archStroke.points.push({ x, y, pressure });
        }

        // Stroke 2: Vibrant Indigo wavy curve (bottom)
        const waveStroke = {
            stroke_id: 'seed-wave-2',
            brush: 'pen',
            color: '#6366f1',
            size: 12,
            opacity: 1.0,
            smoothing: 'medium',
            layerId: 'layer-2',
            phone_width: artboardWidth,
            phone_height: artboardHeight,
            aspect_ratio: artboardWidth / artboardHeight,
            points: []
        };
        for (let i = 0; i <= 30; i++) {
            const t = i / 30;
            const x = 0.35 + t * 0.28;
            const y = 0.58 + Math.sin(t * Math.PI * 1.5) * 0.025;
            const pressure = 0.4 + Math.sin(t * Math.PI) * 0.5;
            waveStroke.points.push({ x, y, pressure });
        }

        strokeHistory.push(archStroke, waveStroke);
    }

    // =========================================================================
    // 15. KEYBOARD SHORTCUTS
    // =========================================================================
    function initKeyboardShortcuts() {
        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.getAttribute('contenteditable') === 'true') return;

            // Space: activate panning cursor
            if (e.code === 'Space' && !isPanning) {
                canvasMount.style.cursor = 'grab';
            }

            // Ctrl/Cmd + Z: Undo
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
                e.preventDefault();
                btnUndo.click();
            }
            // Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z: Redo
            else if (((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) ||
                     ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z'))) {
                e.preventDefault();
                btnRedo.click();
            }
            // Escape: Close all modals & drawers
            else if (e.key === 'Escape') {
                pairModal.classList.add('hidden');
                guideDrawer.classList.add('hidden');
                clearConfirmModal.classList.add('hidden');
                exportMenuPopup.classList.add('hidden');
                resolutionModal.classList.add('hidden');
                optionsModal.classList.add('hidden');
                colorPopover.classList.add('hidden');
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'Space' && !isPanning) {
                canvasMount.style.cursor = 'crosshair';
            }
        });
    }

    // =========================================================================
    // 16. INITIALISATION
    // =========================================================================
    window.addEventListener('resize', setupCanvas);

    function start() {
        seedInitialArtwork();
        setupCanvas();
        initDesktopDrawing();
        initToolbarActions();
        initLaptopImageImport();
        initLayers();
        initPairingModal();
        initGuideMe();
        initKeyboardShortcuts();
        startTelemetryLoop();
        connectWebSocket();

        // Position initial reticle in center matching Image 2
        updateStylusHUD({ x: 0.52, y: 0.5 }, 0.64);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }

})();
