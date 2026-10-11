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
    const reticleOuterRing = document.getElementById('reticle-outer-ring') || (stylusReticle ? stylusReticle.querySelector('.reticle-outer-ring') : null);
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

    // Header & HUD Color Elements
    const btnHeaderColor = document.getElementById('btn-header-color');
    const headerColorIndicator = document.getElementById('header-color-indicator');
    const headerColorName = document.getElementById('header-color-name');
    const btnHudColor = document.getElementById('btn-hud-color');
    const hudColorSwatch = document.getElementById('hud-color-swatch');
    const hudColorHex = document.getElementById('hud-color-hex');
    const hudQuickPalette = document.getElementById('hud-quick-palette');
    const hudNativeColor = document.getElementById('hud-native-color');
    const btnDockColor = document.getElementById('btn-dock-color');
    const dockColorBubble = document.getElementById('dock-color-bubble');

    // Shapes Elements
    const btnDockShape = document.getElementById('btn-dock-shape');
    const dockShapeIcon = document.getElementById('dock-shape-icon');
    const shapesPopover = document.getElementById('shapes-popover');
    const popoverActiveShapeName = document.getElementById('popover-active-shape-name');
    const shapesGrid = document.getElementById('shapes-grid');

    // Smart Text Box Elements
    const btnDockText = document.getElementById('btn-dock-text');
    const smartTextOverlay = document.getElementById('smart-text-overlay');
    const smartTextToolbar = document.getElementById('smart-text-toolbar');
    const smartTextCard = document.getElementById('smart-text-card');
    const smartTextDragBar = document.getElementById('smart-text-drag-bar');
    const tbDragHandle = document.getElementById('tb-drag-handle');
    const dragBarSizeBadge = document.getElementById('drag-bar-size-badge');
    const smartTextInput = document.getElementById('smart-text-input');
    const textFontFamily = document.getElementById('text-font-family');
    const btnTextSizeDown = document.getElementById('btn-text-size-down');
    const btnTextSizeUp = document.getElementById('btn-text-size-up');
    const textSizeVal = document.getElementById('text-size-val');
    const textStyleChips = document.querySelectorAll('.text-style-chip');
    const autoMarginBadge = document.getElementById('auto-margin-badge');
    const marginMetricText = document.getElementById('margin-metric-text');
    const btnTextDelete = document.getElementById('btn-text-delete');
    const btnTextDone = document.getElementById('btn-text-done');

    // Canvas HUD & Matrix
    const hudPhoneTool = document.getElementById('hud-phone-tool');
    const hudBrushSize = document.getElementById('hud-brush-size');
    const btnHudSize = document.getElementById('btn-hud-size');
    const hudSizePopover = document.getElementById('hud-size-popover');
    const popoverSizeDisplay = document.getElementById('popover-size-display');
    const popoverSizeSlider = document.getElementById('popover-size-slider');
    const popoverQuickSizeBtns = document.querySelectorAll('.quick-sz-btn');
    const btnDockSize = document.getElementById('btn-dock-size');
    const dockSizePillText = document.getElementById('dock-size-pill-text');
    const hudStreamProtocol = document.getElementById('hud-stream-protocol');
    const matrixRes = document.getElementById('matrix-res');
    const matrixScale = document.getElementById('matrix-scale');

    // Sidebar: Stylus Hardware Feed
    const studioSidebar = document.getElementById('studio-sidebar');
    const btnCollapseSidebar = document.getElementById('btn-collapse-sidebar');
    const feedStatusBadge = document.getElementById('feed-status-badge');
    const pressureRatioText = document.getElementById('pressure-ratio-text');
    const pressureProgressBar = document.getElementById('pressure-progress-bar');
    const sidebarSizeMetricVal = document.getElementById('sidebar-size-metric-val');
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
    window.strokeHistory = strokeHistory;
    window.getStrokeHistory = () => strokeHistory;
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
    let activeSize = parseInt(localStorage.getItem('pdp_size') || '8', 10);
    let activeOpacity = 1.0;
    let activeSmoothing = 'medium'; // 'off', 'low', 'medium', 'high'
    let pressureCurveMode = 'cubic'; // 'cubic', 'linear', 'soft', 'firm'
    let reticleMode = 'always';     // 'always', 'stroke', 'hidden'
    let lastStylusScreenX = null;
    let lastStylusScreenY = null;

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
        'eraser': 'Precision Eraser',
        'bucket': 'Paint Bucket Fill',
        'shape': 'Shape',
        'text': 'Smart Text Box'
    };

    const SHAPE_SVGS = {
        'circle': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg>`,
        'rectangle': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="1"/></svg>`,
        'line': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="20" x2="20" y2="4"/></svg>`,
        'arrow': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="19" x2="19" y2="5"/><polyline points="10 5 19 5 19 14"/></svg>`,
        'triangle': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><polygon points="12 3 21 20 3 20"/></svg>`,
        'star': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
        'diamond': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><polygon points="12 2 22 12 12 22 2 12"/></svg>`
    };

    let activeShape = 'circle';
    let isDrawingShape = false;
    let shapeStartNorm = null;
    let shapeCurrentNorm = null;
    let inProgressShapePts = null;
    let remoteShapePreview = null;

    // Smart Text State
    let activeTextFontSize = 28;
    let activeTextFontFamily = 'Inter, sans-serif';
    let activeTextBoxStyle = 'glass';
    let editingTextStroke = null;
    let textEditorNormPos = null;

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
                if (stroke === editingTextStroke) continue; // Hide underlying stroke while live card editor is active
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
                    const matchesLayer = stroke.layerId ? (stroke.layerId === layer.id) : (layer.id === (activeLayerId || 'layer-2'));
                    if (matchesLayer) {
                        renderStroke(stroke, mapping, ctx);
                    }
                }
                ctx.restore();
            }
        }

        // Render in-progress shape preview while dragging locally
        if (isDrawingShape && inProgressShapePts && inProgressShapePts.length > 1) {
            renderStroke({
                brush: 'pen',
                color: activeColor,
                size: activeSize,
                opacity: activeOpacity,
                smoothing: 'off',
                points: inProgressShapePts
            }, mapping, ctx);
        }

        // Render in-progress remote shape preview streamed from mobile in real time
        if (remoteShapePreview && remoteShapePreview.points && remoteShapePreview.points.length > 1) {
            renderStroke({
                brush: 'pen',
                color: remoteShapePreview.color || activeColor,
                size: remoteShapePreview.size || activeSize,
                opacity: remoteShapePreview.opacity !== undefined ? remoteShapePreview.opacity : 1.0,
                smoothing: 'off',
                points: remoteShapePreview.points
            }, mapping, ctx);
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

    // =========================================================================
    // SMART TEXT BOX CANVAS RENDERING & HIT-TESTING
    // =========================================================================
    function renderTextStroke(stroke, mapping, targetCtx) {
        if (!stroke.text) return;
        targetCtx.save();
        targetCtx.globalAlpha = stroke.opacity !== undefined ? stroke.opacity : 1.0;

        const scaleFactor = mapping.targetWidth / 600;
        const fontSize = Math.max(8, (stroke.fontSize || 28) * scaleFactor);
        const fontFamily = stroke.fontFamily || 'Inter, sans-serif';
        targetCtx.font = `${fontSize}px ${fontFamily}`;
        targetCtx.textBaseline = 'top';

        const paddingX = (stroke.boxPaddingX || 18) * scaleFactor;
        const paddingY = (stroke.boxPaddingY || 14) * scaleFactor;
        const radius = (stroke.borderRadius || 14) * scaleFactor;
        const lineHeight = fontSize * 1.35;

        // Custom box dimensions if user resized, else auto-measured
        let targetBoxW = stroke.boxWidth ? stroke.boxWidth * scaleFactor : 0;
        let targetBoxH = stroke.boxHeight ? stroke.boxHeight * scaleFactor : 0;

        // Smart multiline wrapping if explicit width is given
        const rawLines = String(stroke.text || '').split('\n');
        const lines = [];
        const maxLineWidth = targetBoxW > 0 ? Math.max(40 * scaleFactor, targetBoxW - paddingX * 2) : 100000;

        for (const rawLine of rawLines) {
            if (!rawLine) {
                lines.push('');
                continue;
            }
            if (targetBoxW > 0 && targetCtx.measureText(rawLine).width > maxLineWidth) {
                const words = rawLine.split(' ');
                let curLine = words[0];
                for (let w = 1; w < words.length; w++) {
                    const testLine = curLine + ' ' + words[w];
                    if (targetCtx.measureText(testLine).width <= maxLineWidth) {
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
            const w = targetCtx.measureText(line).width;
            if (w > maxTextW) maxTextW = w;
        }

        const totalTextH = lines.length * lineHeight;
        const boxW = Math.max(targetBoxW || (90 * scaleFactor), maxTextW + paddingX * 2);
        const boxH = Math.max(targetBoxH || (38 * scaleFactor), totalTextH + paddingY * 2);

        const boxX = mapping.offsetX + stroke.x * mapping.targetWidth;
        const boxY = mapping.offsetY + stroke.y * mapping.targetHeight;

        // Update stroke.normBounds for accurate hit testing and selection
        stroke.normBounds = {
            x: stroke.x,
            y: stroke.y,
            w: boxW / mapping.targetWidth,
            h: boxH / mapping.targetHeight
        };

        // Draw Box Shape Container if style is not 'none'
        const boxStyle = stroke.boxStyle || 'glass';
        if (boxStyle !== 'none') {
            targetCtx.beginPath();
            if (targetCtx.roundRect) {
                targetCtx.roundRect(boxX, boxY, boxW, boxH, radius);
            } else {
                targetCtx.rect(boxX, boxY, boxW, boxH);
            }

            if (boxStyle === 'glass') {
                targetCtx.fillStyle = 'rgba(18, 24, 38, 0.88)';
                targetCtx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                targetCtx.shadowBlur = 16 * scaleFactor;
                targetCtx.shadowOffsetY = 6 * scaleFactor;
                targetCtx.fill();
                targetCtx.shadowColor = 'transparent';
                targetCtx.lineWidth = Math.max(1, 1.5 * scaleFactor);
                targetCtx.strokeStyle = 'rgba(99, 102, 241, 0.55)';
                targetCtx.stroke();
            } else if (boxStyle === 'neon') {
                targetCtx.fillStyle = 'rgba(12, 15, 26, 0.94)';
                targetCtx.fill();
                targetCtx.lineWidth = Math.max(1.5, 2 * scaleFactor);
                targetCtx.strokeStyle = stroke.color || '#6366f1';
                targetCtx.shadowColor = stroke.color || '#6366f1';
                targetCtx.shadowBlur = 18 * scaleFactor;
                targetCtx.stroke();
                targetCtx.shadowColor = 'transparent';
            } else if (boxStyle === 'solid') {
                targetCtx.fillStyle = '#1e2337';
                targetCtx.shadowColor = 'rgba(0, 0, 0, 0.4)';
                targetCtx.shadowBlur = 12 * scaleFactor;
                targetCtx.shadowOffsetY = 4 * scaleFactor;
                targetCtx.fill();
                targetCtx.shadowColor = 'transparent';
                targetCtx.lineWidth = Math.max(1, 1.5 * scaleFactor);
                targetCtx.strokeStyle = '#3b4261';
                targetCtx.stroke();
            } else if (boxStyle === 'clean') {
                targetCtx.fillStyle = 'rgba(255, 255, 255, 0.04)';
                targetCtx.fill();
                targetCtx.lineWidth = Math.max(1, 1.5 * scaleFactor);
                targetCtx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
                targetCtx.stroke();
            }
        }

        // Draw Text Lines with crisp rendering
        targetCtx.fillStyle = stroke.color || '#ffffff';
        for (let i = 0; i < lines.length; i++) {
            const lineX = boxX + paddingX;
            const lineY = boxY + paddingY + i * lineHeight;
            targetCtx.fillText(lines[i], lineX, lineY);
        }

        targetCtx.restore();
    }

    function findTextStrokeAt(normX, normY, mapping) {
        for (let i = strokeHistory.length - 1; i >= 0; i--) {
            const s = strokeHistory[i];
            if (!s.isText) continue;
            if (!s.normBounds) {
                const scaleFactor = mapping.targetWidth / 600;
                const approxW = Math.max(90 * scaleFactor, (s.boxWidth || 180) * scaleFactor);
                const approxH = Math.max(38 * scaleFactor, (s.boxHeight || 60) * scaleFactor);
                s.normBounds = {
                    x: s.x,
                    y: s.y,
                    w: approxW / mapping.targetWidth,
                    h: approxH / mapping.targetHeight
                };
            }
            const b = s.normBounds;
            if (normX >= b.x && normX <= b.x + b.w && normY >= b.y && normY <= b.y + b.h) {
                return { stroke: s, index: i };
            }
        }
        return null;
    }

    function renderStroke(stroke, mapping, targetCtx) {
        if (stroke.isText) {
            renderTextStroke(stroke, mapping, targetCtx);
            return;
        }

        if (stroke.isFill && stroke.fillCanvas) {
            const rx = mapping.offsetX + (stroke.normBounds ? stroke.normBounds.x * mapping.targetWidth : stroke.bounds.x);
            const ry = mapping.offsetY + (stroke.normBounds ? stroke.normBounds.y * mapping.targetHeight : stroke.bounds.y);
            const rw = stroke.normBounds ? stroke.normBounds.w * mapping.targetWidth : stroke.bounds.w;
            const rh = stroke.normBounds ? stroke.normBounds.h * mapping.targetHeight : stroke.bounds.h;

            targetCtx.save();
            targetCtx.globalAlpha = stroke.opacity !== undefined ? stroke.opacity : 1.0;
            targetCtx.drawImage(stroke.fillCanvas, rx, ry, rw, rh);
            targetCtx.restore();
            return;
        }

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

            if (activeBrush === 'bucket') {
                e.preventDefault();
                const rect = canvasMount.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const clickY = e.clientY - rect.top;
                performAnimatedFloodFill(clickX, clickY, activeColor, true);
                return;
            }

            if (activeBrush === 'shape') {
                e.preventDefault();
                canvasMount.setPointerCapture(e.pointerId);
                isDrawingShape = true;
                const rect = canvasMount.getBoundingClientRect();
                const mapping = getAspectMapping(artboardWidth / artboardHeight);
                const clickX = e.clientX - rect.left;
                const clickY = e.clientY - rect.top;
                shapeStartNorm = {
                    x: (clickX - mapping.offsetX) / mapping.targetWidth,
                    y: (clickY - mapping.offsetY) / mapping.targetHeight
                };
                shapeCurrentNorm = { ...shapeStartNorm };
                return;
            }

            if (activeBrush === 'text') {
                e.preventDefault();
                const rect = canvasMount.getBoundingClientRect();
                const mapping = getAspectMapping(artboardWidth / artboardHeight);
                const clickX = e.clientX - rect.left;
                const clickY = e.clientY - rect.top;
                const normX = (clickX - mapping.offsetX) / mapping.targetWidth;
                const normY = (clickY - mapping.offsetY) / mapping.targetHeight;

                // If text overlay is open, clicking canvas commits it
                if (smartTextOverlay && !smartTextOverlay.classList.contains('hidden')) {
                    commitSmartText();
                    return;
                }

                // Hit test: did user click an existing text box on canvas?
                const hit = findTextStrokeAt(normX, normY, mapping);
                if (hit) {
                    openSmartTextEditor(hit.stroke.x, hit.stroke.y, hit.stroke);
                } else {
                    openSmartTextEditor(normX, normY, null);
                }
                return;
            }

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
            updateStylusHUD({ x: normX, y: normY, tilt_x: e.tiltX, tilt_y: e.tiltY }, pressure, e);
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
            const pressure = e.pressure && e.pressure > 0 ? e.pressure : (isDrawing ? 0.64 : 0);

            if (activeBrush === 'text') {
                const hit = findTextStrokeAt(normX, normY, mapping);
                canvasMount.style.cursor = hit ? 'pointer' : 'text';
                updateStylusHUD({ x: normX, y: normY, tilt_x: e.tiltX, tilt_y: e.tiltY }, 0, e);
                return;
            }

            updateStylusHUD({ x: normX, y: normY, tilt_x: e.tiltX, tilt_y: e.tiltY }, pressure, e);

            if (isDrawingShape && shapeStartNorm) {
                shapeCurrentNorm = { x: normX, y: normY };
                if (e.shiftKey) {
                    const dx = shapeCurrentNorm.x - shapeStartNorm.x;
                    const dy = shapeCurrentNorm.y - shapeStartNorm.y;
                    const side = Math.max(Math.abs(dx), Math.abs(dy));
                    shapeCurrentNorm.x = shapeStartNorm.x + (dx >= 0 ? side : -side);
                    shapeCurrentNorm.y = shapeStartNorm.y + (dy >= 0 ? side : -side);
                }
                inProgressShapePts = generateShapePoints(activeShape, shapeStartNorm, shapeCurrentNorm);
                redrawAllStrokes();
                if (inProgressShapePts && inProgressShapePts.length > 1) {
                    wsSend({
                        type: 'shape_preview',
                        shape: activeShape,
                        color: activeColor,
                        size: activeSize,
                        opacity: activeOpacity,
                        points: inProgressShapePts
                    });
                }
                return;
            }

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

            if (isDrawingShape && shapeStartNorm && shapeCurrentNorm) {
                isDrawingShape = false;
                const shapePts = inProgressShapePts && inProgressShapePts.length > 2 
                    ? inProgressShapePts 
                    : generateShapePoints(activeShape, shapeStartNorm, shapeCurrentNorm);
                inProgressShapePts = null;
                shapeStartNorm = null;
                shapeCurrentNorm = null;

                if (shapePts && shapePts.length > 2) {
                    const strokeId = `shape-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                    const shapeStroke = {
                        stroke_id: strokeId,
                        brush: 'pen',
                        isShape: true,
                        shapeType: activeShape,
                        color: activeColor,
                        size: activeSize,
                        opacity: activeOpacity,
                        smoothing: 'off',
                        layerId: activeLayerId,
                        phone_width: artboardWidth,
                        phone_height: artboardHeight,
                        aspect_ratio: artboardWidth / artboardHeight,
                        points: shapePts
                    };

                    strokeHistory.push(shapeStroke);
                    redoHistory = [];
                    markCommittedDirty();
                    redrawAllStrokes();

                    wsSend({
                        type: 'stroke_start',
                        ...shapeStroke,
                        points: [shapePts[0]]
                    });
                    wsSend({
                        type: 'stroke_points',
                        stroke_id: strokeId,
                        points: shapePts.slice(1)
                    });
                    wsSend({
                        type: 'stroke_end',
                        stroke_id: strokeId
                    });
                }
                return;
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

        // Zoom via mouse wheel (or Alt+wheel / Shift+wheel to change brush size)
        canvasMount.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (e.altKey || e.shiftKey) {
                const delta = e.deltaY < 0 ? (activeSize < 10 ? 1 : 2) : (activeSize <= 10 ? -1 : -2);
                setLaptopBrushSize(activeSize + delta);
                showToast(`Brush size: ${activeSize}px`, 'info');
                return;
            }
            const zoomDelta = e.deltaY < 0 ? 0.08 : -0.08;
            currentZoom = Math.max(0.5, Math.min(3.0, currentZoom + zoomDelta));
            btnZoomPill.textContent = `${Math.round(currentZoom * 100)}%`;
            markCommittedDirty();
            redrawAllStrokes();
            updateStylusReticleSize();
        }, { passive: false });
    }

    // =========================================================================
    // 6.1. SMART TEXT BOX & DYNAMIC AUTO-EXTENDING CARD ENGINE
    // =========================================================================
    let customBoxWidth = null;
    let customBoxHeight = null;
    let isMovingTextCard = false;
    let isResizingTextCard = false;
    let activeResizeHandle = null;
    let moveStartPointer = { x: 0, y: 0 };
    let moveStartOverlayPos = { left: 0, top: 0 };
    let resizeStartPointer = { x: 0, y: 0 };
    let resizeStartDimensions = { w: 0, h: 0 };
    let resizeStartOverlayPos = { left: 0, top: 0 };
    let resizeStartFontSize = 28;

    function updateSmartBoxDimensions(preserveCustomSize = true) {
        if (!smartTextInput || !smartTextCard) return;

        // Apply font family, size and color
        smartTextInput.style.fontFamily = activeTextFontFamily;
        smartTextInput.style.fontSize = `${activeTextFontSize}px`;
        smartTextInput.style.color = activeColor;
        if (textSizeVal) textSizeVal.textContent = `${activeTextFontSize}px`;

        // Auto-detect optimal margins & padding proportional to font size
        const paddingX = Math.round(Math.max(16, activeTextFontSize * 0.72));
        const paddingY = Math.round(Math.max(12, activeTextFontSize * 0.52));
        const borderRadius = Math.round(Math.max(10, activeTextFontSize * 0.42));

        // Apply dynamically to card shape container so it extends naturally
        smartTextCard.style.padding = `${paddingY}px ${paddingX}px`;
        smartTextCard.style.borderRadius = `${borderRadius}px`;
        smartTextCard.className = `smart-text-card box-style-${activeTextBoxStyle}`;

        if (preserveCustomSize && customBoxWidth) {
            smartTextCard.style.width = `${customBoxWidth}px`;
        } else if (!preserveCustomSize) {
            customBoxWidth = null;
            smartTextCard.style.width = 'max-content';
        }

        if (preserveCustomSize && customBoxHeight) {
            smartTextCard.style.minHeight = `${customBoxHeight}px`;
        } else if (!preserveCustomSize) {
            customBoxHeight = null;
            smartTextCard.style.minHeight = 'auto';
        }

        // Live dimensions readout & auto-margin badge
        const curW = Math.round(customBoxWidth || smartTextCard.offsetWidth || 140);
        const curH = Math.round(customBoxHeight || smartTextCard.offsetHeight || 60);

        if (dragBarSizeBadge) {
            dragBarSizeBadge.textContent = `${curW}×${curH}`;
        }
        if (marginMetricText) {
            marginMetricText.textContent = `Auto Margin: ${paddingX}×${paddingY}px`;
        }

        // Custom neon styling with activeColor
        if (activeTextBoxStyle === 'neon') {
            smartTextCard.style.borderColor = activeColor;
            smartTextCard.style.boxShadow = `0 0 24px ${activeColor}88, inset 0 0 12px ${activeColor}28`;
        } else {
            smartTextCard.style.borderColor = '';
            smartTextCard.style.boxShadow = '';
        }
    }

    function openSmartTextEditor(normX, normY, existingStroke) {
        if (!smartTextOverlay) return;

        textEditorNormPos = { x: Math.max(0, Math.min(0.9, normX)), y: Math.max(0, Math.min(0.9, normY)) };
        editingTextStroke = existingStroke || null;

        if (existingStroke) {
            smartTextInput.innerText = existingStroke.text || '';
            activeTextFontSize = existingStroke.fontSize || 28;
            activeTextFontFamily = existingStroke.fontFamily || 'Inter, sans-serif';
            activeTextBoxStyle = existingStroke.boxStyle || 'glass';
            customBoxWidth = existingStroke.boxWidth || null;
            customBoxHeight = existingStroke.boxHeight || null;
            if (existingStroke.color) {
                activeColor = existingStroke.color;
                applyPrimaryColor(activeColor, false);
            }
        } else {
            smartTextInput.innerText = '';
            customBoxWidth = null;
            customBoxHeight = null;
        }

        if (textFontFamily) textFontFamily.value = activeTextFontFamily;
        if (textStyleChips) {
            textStyleChips.forEach(chip => {
                chip.classList.toggle('active', chip.dataset.style === activeTextBoxStyle);
            });
        }

        updateSmartBoxDimensions(true);

        // Position overlay on screen
        const mapping = getAspectMapping(artboardWidth / artboardHeight);
        const px = mapping.offsetX + textEditorNormPos.x * mapping.targetWidth;
        const py = mapping.offsetY + textEditorNormPos.y * mapping.targetHeight;

        smartTextOverlay.style.left = `${Math.max(12, Math.min(canvasMount.clientWidth - 260, px))}px`;
        smartTextOverlay.style.top = `${Math.max(12, Math.min(canvasMount.clientHeight - 120, py))}px`;

        smartTextOverlay.classList.remove('hidden');

        // Redraw canvas so existing text is hidden while editor is open
        markCommittedDirty();
        redrawAllStrokes();

        setTimeout(() => {
            if (smartTextInput) {
                smartTextInput.focus();
                // Move cursor to end of text
                const range = document.createRange();
                const sel = window.getSelection();
                range.selectNodeContents(smartTextInput);
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }, 50);
    }

    function commitSmartText() {
        if (!smartTextOverlay || smartTextOverlay.classList.contains('hidden')) return;

        const rawText = (smartTextInput ? smartTextInput.innerText : '').trim();

        if (!rawText) {
            // If empty text, delete if editing
            if (editingTextStroke) {
                const idx = strokeHistory.indexOf(editingTextStroke);
                if (idx !== -1) strokeHistory.splice(idx, 1);
            }
            closeSmartTextEditor();
            return;
        }

        const mapping = getAspectMapping(artboardWidth / artboardHeight);
        const scaleFactor = mapping.targetWidth / 600;
        const fontSize = Math.max(8, activeTextFontSize * scaleFactor);
        ctx.font = `${fontSize}px ${activeTextFontFamily}`;

        const lines = rawText.split('\n');
        let maxTextW = 0;
        for (const line of lines) {
            const w = ctx.measureText(line).width;
            if (w > maxTextW) maxTextW = w;
        }

        const padX = Math.round(Math.max(16, activeTextFontSize * 0.72));
        const padY = Math.round(Math.max(12, activeTextFontSize * 0.52));
        const radius = Math.round(Math.max(10, activeTextFontSize * 0.42));
        const lineHeight = fontSize * 1.35;
        const totalTextH = lines.length * lineHeight;

        const calculatedW = Math.max(90, Math.round((maxTextW / scaleFactor) + padX * 2));
        const calculatedH = Math.max(38, Math.round((totalTextH / scaleFactor) + padY * 2));

        const boxW = customBoxWidth ? Math.max(customBoxWidth, calculatedW) : calculatedW;
        const boxH = customBoxHeight ? Math.max(customBoxHeight, calculatedH) : calculatedH;

        const stroke = editingTextStroke || {
            stroke_id: `txt_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
            isText: true,
            layerId: activeLayerId
        };

        stroke.isText = true;
        stroke.text = rawText;
        stroke.x = textEditorNormPos ? textEditorNormPos.x : 0.3;
        stroke.y = textEditorNormPos ? textEditorNormPos.y : 0.3;
        stroke.fontSize = activeTextFontSize;
        stroke.fontFamily = activeTextFontFamily;
        stroke.color = activeColor;
        stroke.boxStyle = activeTextBoxStyle;
        stroke.boxPaddingX = padX;
        stroke.boxPaddingY = padY;
        stroke.borderRadius = radius;
        stroke.boxWidth = boxW;
        stroke.boxHeight = boxH;
        stroke.normBounds = {
            x: stroke.x,
            y: stroke.y,
            w: (boxW * scaleFactor) / mapping.targetWidth,
            h: (boxH * scaleFactor) / mapping.targetHeight
        };

        if (!strokeHistory.includes(stroke)) {
            strokeHistory.push(stroke);
        }
        redoHistory = [];

        // Broadcast over WebSocket to sync with mobile & others
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
            layerId: stroke.layerId,
            timestamp: Date.now()
        });

        closeSmartTextEditor();
        showToast('Text box saved to artboard', 'success');
    }

    function deleteCurrentText() {
        if (editingTextStroke) {
            const idx = strokeHistory.indexOf(editingTextStroke);
            if (idx !== -1) {
                strokeHistory.splice(idx, 1);
                showToast('Text box deleted', 'info');
            }
        }
        closeSmartTextEditor();
    }

    function closeSmartTextEditor() {
        if (!smartTextOverlay) return;
        smartTextOverlay.classList.add('hidden');
        editingTextStroke = null;
        customBoxWidth = null;
        customBoxHeight = null;
        markCommittedDirty();
        redrawAllStrokes();
        maybeRenderAuxiliary(true);
    }

    function initSmartTextEngine() {
        if (!smartTextInput) return;

        smartTextInput.addEventListener('input', () => {
            updateSmartBoxDimensions(true);
        });

        smartTextInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                commitSmartText();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                closeSmartTextEditor();
            }
        });

        if (textFontFamily) {
            textFontFamily.addEventListener('change', () => {
                activeTextFontFamily = textFontFamily.value;
                updateSmartBoxDimensions(true);
            });
        }

        if (btnTextSizeDown) {
            btnTextSizeDown.addEventListener('click', (e) => {
                e.stopPropagation();
                activeTextFontSize = Math.max(12, activeTextFontSize - 4);
                updateSmartBoxDimensions(true);
            });
        }

        if (btnTextSizeUp) {
            btnTextSizeUp.addEventListener('click', (e) => {
                e.stopPropagation();
                activeTextFontSize = Math.min(120, activeTextFontSize + 4);
                updateSmartBoxDimensions(true);
            });
        }

        textStyleChips.forEach(chip => {
            chip.addEventListener('click', (e) => {
                e.stopPropagation();
                textStyleChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                activeTextBoxStyle = chip.dataset.style;
                updateSmartBoxDimensions(true);
            });
        });

        if (btnTextDelete) {
            btnTextDelete.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteCurrentText();
            });
        }

        if (btnTextDone) {
            btnTextDone.addEventListener('click', (e) => {
                e.stopPropagation();
                commitSmartText();
            });
        }

        // =============================================================
        // DRAG TO MOVE ENGINE (Drag Bar, Toolbar Grip, or Card Border)
        // =============================================================
        function attachCardMoveHandler(element) {
            if (!element) return;
            element.addEventListener('pointerdown', (e) => {
                // If clicking an editable, button, handle, or select, ignore
                if (e.target === smartTextInput ||
                    e.target.closest('.card-handle') ||
                    e.target.closest('.text-tb-action-btn') ||
                    e.target.closest('.text-tb-btn') ||
                    e.target.closest('.text-style-chip') ||
                    e.target.closest('select')) {
                    return;
                }
                if (e.button !== 0 && e.pointerType === 'mouse') return;

                e.preventDefault();
                e.stopPropagation();

                isMovingTextCard = true;
                moveStartPointer = { x: e.clientX, y: e.clientY };
                moveStartOverlayPos = {
                    left: parseFloat(smartTextOverlay.style.left) || 0,
                    top: parseFloat(smartTextOverlay.style.top) || 0
                };

                if (smartTextDragBar) smartTextDragBar.classList.add('is-dragging');
                if (tbDragHandle) tbDragHandle.classList.add('is-dragging');
                if (smartTextCard) smartTextCard.classList.add('is-moving');

                try {
                    element.setPointerCapture(e.pointerId);
                } catch (err) {}

                const onPointerMove = (ev) => {
                    if (!isMovingTextCard) return;
                    const dx = ev.clientX - moveStartPointer.x;
                    const dy = ev.clientY - moveStartPointer.y;

                    let newLeft = moveStartOverlayPos.left + dx;
                    let newTop = moveStartOverlayPos.top + dy;

                    const maxL = Math.max(20, canvasMount.clientWidth - 80);
                    const maxT = Math.max(20, canvasMount.clientHeight - 60);
                    newLeft = Math.max(4, Math.min(maxL, newLeft));
                    newTop = Math.max(4, Math.min(maxT, newTop));

                    smartTextOverlay.style.left = `${newLeft}px`;
                    smartTextOverlay.style.top = `${newTop}px`;

                    const mapping = getAspectMapping(artboardWidth / artboardHeight);
                    const normX = Math.max(0, Math.min(1.0, (newLeft - mapping.offsetX) / mapping.targetWidth));
                    const normY = Math.max(0, Math.min(1.0, (newTop - mapping.offsetY) / mapping.targetHeight));
                    textEditorNormPos = { x: normX, y: normY };

                    if (editingTextStroke) {
                        editingTextStroke.x = normX;
                        editingTextStroke.y = normY;
                        if (editingTextStroke.normBounds) {
                            editingTextStroke.normBounds.x = normX;
                            editingTextStroke.normBounds.y = normY;
                        }
                    }
                };

                const onPointerUp = (ev) => {
                    isMovingTextCard = false;
                    if (smartTextDragBar) smartTextDragBar.classList.remove('is-dragging');
                    if (tbDragHandle) tbDragHandle.classList.remove('is-dragging');
                    if (smartTextCard) smartTextCard.classList.remove('is-moving');

                    try {
                        element.releasePointerCapture(ev.pointerId);
                    } catch (err) {}

                    window.removeEventListener('pointermove', onPointerMove);
                    window.removeEventListener('pointerup', onPointerUp);
                    window.removeEventListener('pointercancel', onPointerUp);
                };

                window.addEventListener('pointermove', onPointerMove);
                window.addEventListener('pointerup', onPointerUp);
                window.addEventListener('pointercancel', onPointerUp);
            });
        }

        attachCardMoveHandler(smartTextDragBar);
        attachCardMoveHandler(tbDragHandle);
        attachCardMoveHandler(smartTextCard);

        // =============================================================
        // RESIZE HANDLES ENGINE (8-Point Corner & Edge Resizing)
        // =============================================================
        const handles = smartTextCard ? smartTextCard.querySelectorAll('.card-handle') : [];
        handles.forEach(handle => {
            handle.addEventListener('pointerdown', (e) => {
                if (e.button !== 0 && e.pointerType === 'mouse') return;
                e.preventDefault();
                e.stopPropagation();

                const handleType = handle.dataset.handle;
                isResizingTextCard = true;
                activeResizeHandle = handleType;

                resizeStartPointer = { x: e.clientX, y: e.clientY };
                resizeStartDimensions = {
                    w: smartTextCard.offsetWidth,
                    h: smartTextCard.offsetHeight
                };
                resizeStartOverlayPos = {
                    left: parseFloat(smartTextOverlay.style.left) || 0,
                    top: parseFloat(smartTextOverlay.style.top) || 0
                };
                resizeStartFontSize = activeTextFontSize;

                handle.classList.add('is-active');
                smartTextCard.classList.add('is-resizing');

                try {
                    handle.setPointerCapture(e.pointerId);
                } catch (err) {}

                const isCorner = handleType.includes('top-') || handleType.includes('bottom-');

                const onPointerMove = (ev) => {
                    if (!isResizingTextCard) return;
                    const dx = ev.clientX - resizeStartPointer.x;
                    const dy = ev.clientY - resizeStartPointer.y;

                    let newW = resizeStartDimensions.w;
                    let newH = resizeStartDimensions.h;
                    let newLeft = resizeStartOverlayPos.left;
                    let newTop = resizeStartOverlayPos.top;

                    if (handleType === 'bottom-right') {
                        newW = Math.max(90, resizeStartDimensions.w + dx);
                        newH = Math.max(38, resizeStartDimensions.h + dy);
                    } else if (handleType === 'bottom-left') {
                        newW = Math.max(90, resizeStartDimensions.w - dx);
                        newH = Math.max(38, resizeStartDimensions.h + dy);
                        newLeft = resizeStartOverlayPos.left + (resizeStartDimensions.w - newW);
                    } else if (handleType === 'top-right') {
                        newW = Math.max(90, resizeStartDimensions.w + dx);
                        newH = Math.max(38, resizeStartDimensions.h - dy);
                        newTop = resizeStartOverlayPos.top + (resizeStartDimensions.h - newH);
                    } else if (handleType === 'top-left') {
                        newW = Math.max(90, resizeStartDimensions.w - dx);
                        newH = Math.max(38, resizeStartDimensions.h - dy);
                        newLeft = resizeStartOverlayPos.left + (resizeStartDimensions.w - newW);
                        newTop = resizeStartOverlayPos.top + (resizeStartDimensions.h - newH);
                    } else if (handleType === 'edge-right') {
                        newW = Math.max(90, resizeStartDimensions.w + dx);
                    } else if (handleType === 'edge-left') {
                        newW = Math.max(90, resizeStartDimensions.w - dx);
                        newLeft = resizeStartOverlayPos.left + (resizeStartDimensions.w - newW);
                    } else if (handleType === 'edge-bottom') {
                        newH = Math.max(38, resizeStartDimensions.h + dy);
                    } else if (handleType === 'edge-top') {
                        newH = Math.max(38, resizeStartDimensions.h - dy);
                        newTop = resizeStartOverlayPos.top + (resizeStartDimensions.h - newH);
                    }

                    if (isCorner && ev.shiftKey) {
                        const scale = newW / resizeStartDimensions.w;
                        activeTextFontSize = Math.round(Math.max(12, Math.min(120, resizeStartFontSize * scale)));
                    }

                    customBoxWidth = Math.round(newW);
                    customBoxHeight = Math.round(newH);

                    smartTextCard.style.width = `${customBoxWidth}px`;
                    smartTextCard.style.minHeight = `${customBoxHeight}px`;

                    if (newLeft !== resizeStartOverlayPos.left || newTop !== resizeStartOverlayPos.top) {
                        smartTextOverlay.style.left = `${newLeft}px`;
                        smartTextOverlay.style.top = `${newTop}px`;
                        const mapping = getAspectMapping(artboardWidth / artboardHeight);
                        textEditorNormPos = {
                            x: Math.max(0, Math.min(1.0, (newLeft - mapping.offsetX) / mapping.targetWidth)),
                            y: Math.max(0, Math.min(1.0, (newTop - mapping.offsetY) / mapping.targetHeight))
                        };
                    }

                    updateSmartBoxDimensions(true);
                };

                const onPointerUp = (ev) => {
                    isResizingTextCard = false;
                    activeResizeHandle = null;
                    handle.classList.remove('is-active');
                    smartTextCard.classList.remove('is-resizing');

                    try {
                        handle.releasePointerCapture(ev.pointerId);
                    } catch (err) {}

                    window.removeEventListener('pointermove', onPointerMove);
                    window.removeEventListener('pointerup', onPointerUp);
                    window.removeEventListener('pointercancel', onPointerUp);
                };

                window.addEventListener('pointermove', onPointerMove);
                window.addEventListener('pointerup', onPointerUp);
                window.addEventListener('pointercancel', onPointerUp);
            });
        });

        if (smartTextOverlay) {
            smartTextOverlay.addEventListener('pointerdown', (e) => e.stopPropagation());
        }

        document.addEventListener('pointerdown', (e) => {
            if (smartTextOverlay && !smartTextOverlay.classList.contains('hidden')) {
                if (!smartTextOverlay.contains(e.target) && e.target !== btnDockText && !canvasMount.contains(e.target)) {
                    commitSmartText();
                }
            }
        });
    }

    // =========================================================================
    // COLOR BUCKET / ANIMATED FLOOD FILL ENGINE
    // =========================================================================
    let isFillAnimating = false;

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
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const actx = new AudioContext();
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
        } catch (e) {
            // Audio policy ignore
        }
    }

    function handleIncomingLaptopFill(data) {
        const mapping = getAspectMapping(artboardWidth / artboardHeight);
        const clickX = mapping.offsetX + (data.x !== undefined ? data.x : 0.5) * mapping.targetWidth;
        const clickY = mapping.offsetY + (data.y !== undefined ? data.y : 0.5) * mapping.targetHeight;
        performAnimatedFloodFill(clickX, clickY, data.color || activeColor, false);
    }

    function performAnimatedFloodFill(clickX, clickY, fillColorHex = activeColor, broadcast = true) {
        if (isFillAnimating) return;
        const mapping = getAspectMapping(artboardWidth / artboardHeight);
        const dpr = window.devicePixelRatio || 1;

        const mountW = canvasMount.clientWidth || canvas.width;
        const mountH = canvasMount.clientHeight || canvas.height;
        updateCommittedCanvas(mapping, mountW, mountH);

        const W = committedCanvas.width;
        const H = committedCanvas.height;

        const artLeft = Math.max(0, Math.floor(mapping.offsetX * dpr));
        const artTop = Math.max(0, Math.floor(mapping.offsetY * dpr));
        const artRight = Math.min(W - 1, Math.ceil((mapping.offsetX + mapping.targetWidth) * dpr));
        const artBottom = Math.min(H - 1, Math.ceil((mapping.offsetY + mapping.targetHeight) * dpr));

        const startX = Math.round(clickX * dpr);
        const startY = Math.round(clickY * dpr);

        if (startX < artLeft || startX > artRight || startY < artTop || startY > artBottom) {
            return;
        }

        const imgData = committedCtx.getImageData(0, 0, W, H);
        const data = imgData.data;

        const startIdx = (startY * W + startX) * 4;
        const targetR = data[startIdx];
        const targetG = data[startIdx + 1];
        const targetB = data[startIdx + 2];
        const targetA = data[startIdx + 3];

        const fillRgba = hexToRgba(fillColorHex);

        const diffStart = Math.abs(targetR - fillRgba.r) + Math.abs(targetG - fillRgba.g) + Math.abs(targetB - fillRgba.b);
        if (diffStart < 14) {
            return;
        }

        const tolerance = 42;
        function matchPixel(idx) {
            const dr = Math.abs(data[idx] - targetR);
            const dg = Math.abs(data[idx + 1] - targetG);
            const db = Math.abs(data[idx + 2] - targetB);
            const da = Math.abs(data[idx + 3] - targetA);
            return (dr + dg + db + da) <= tolerance * 4;
        }

        // High-performance Scanline Flood Fill
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

        // Build pre-rendered offscreen canvas matching the exact contour of the enclosed shape
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
                    fData[lIdx + 3] = Math.round(activeOpacity * 255);
                }
            }
        }
        fCtx.putImageData(fImg, 0, 0);

        playDropSound();

        const strokeId = `fill-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const normX = (clickX - mapping.offsetX) / mapping.targetWidth;
        const normY = (clickY - mapping.offsetY) / mapping.targetHeight;

        if (broadcast) {
            wsSend({
                type: 'fill',
                stroke_id: strokeId,
                x: normX,
                y: normY,
                color: fillColorHex,
                tolerance: 42,
                layerId: activeLayerId
            });
        }

        // =====================================================================
        // ANIMATIVE INK BLOOM & RIPPLE EXPANSION
        // =====================================================================
        isFillAnimating = true;
        const animStart = performance.now();
        const animDuration = 320;
        const maxRadiusCss = Math.max(12, maxDist / dpr);

        function animateBloom(now) {
            const elapsed = now - animStart;
            const progress = Math.min(1.0, elapsed / animDuration);
            const ease = 1 - Math.pow(1 - progress, 2);
            const currentRadius = Math.max(8, maxRadiusCss * ease);

            // Redraw base committed scene
            redrawAllStrokes();

            // Render animated clipping expansion of the filled shape
            ctx.save();
            ctx.beginPath();
            ctx.arc(clickX, clickY, currentRadius, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(
                fillCanvas,
                minX / dpr,
                minY / dpr,
                bw / dpr,
                bh / dpr
            );
            ctx.restore();

            // Luminous shockwave ripple ring at the expanding wavefront
            ctx.save();
            ctx.beginPath();
            ctx.arc(clickX, clickY, currentRadius, 0, Math.PI * 2);
            ctx.strokeStyle = fillColorHex;
            ctx.lineWidth = Math.max(1, 3.5 * (1 - progress));
            ctx.globalAlpha = Math.max(0, 0.75 * (1 - progress));
            ctx.stroke();

            // Center droplet splash ring
            const centerRippleR = Math.min(24, currentRadius * 0.4);
            ctx.beginPath();
            ctx.arc(clickX, clickY, centerRippleR, 0, Math.PI * 2);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = Math.max(1, 2 * (1 - progress));
            ctx.globalAlpha = Math.max(0, 0.5 * (1 - progress));
            ctx.stroke();
            ctx.restore();

            if (progress < 1.0) {
                requestAnimationFrame(animateBloom);
            } else {
                isFillAnimating = false;
                const fillItem = {
                    stroke_id: strokeId,
                    type: 'fill',
                    isFill: true,
                    layerId: activeLayerId,
                    color: fillColorHex,
                    opacity: activeOpacity,
                    normX: normX,
                    normY: normY,
                    fillCanvas: fillCanvas,
                    bounds: {
                        x: minX / dpr,
                        y: minY / dpr,
                        w: bw / dpr,
                        h: bh / dpr
                    },
                    normBounds: {
                        x: (minX / dpr - mapping.offsetX) / mapping.targetWidth,
                        y: (minY / dpr - mapping.offsetY) / mapping.targetHeight,
                        w: (bw / dpr) / mapping.targetWidth,
                        h: (bh / dpr) / mapping.targetHeight
                    }
                };

                strokeHistory.push(fillItem);
                redoHistory = [];
                markCommittedDirty();
                redrawAllStrokes();
                showToast(`Filled region with ${fillColorHex}`, 'info');
            }
        }

        requestAnimationFrame(animateBloom);
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

    function handleIncomingLaptopTextElement(data) {
        const mapping = getAspectMapping(artboardWidth / artboardHeight);
        const scaleFactor = mapping.targetWidth / 600;
        const padX = data.box_padding_x || 18;
        const padY = data.box_padding_y || 14;
        const radius = data.border_radius || 14;
        const boxW = data.box_width || 200;
        const boxH = data.box_height || 80;

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
                w: (boxW * scaleFactor) / mapping.targetWidth,
                h: (boxH * scaleFactor) / mapping.targetHeight
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
                layerId: data.layerId || 'layer-2',
                normBounds: {
                    x: data.x,
                    y: data.y,
                    w: (boxW * scaleFactor) / mapping.targetWidth,
                    h: (boxH * scaleFactor) / mapping.targetHeight
                }
            };
            strokeHistory.push(newStroke);
        }
        markCommittedDirty();
        redrawAllStrokes();
        maybeRenderAuxiliary(true);
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

        if (data.type === 'tool_update') {
            updateToolAndTelemetry(data);
            return;
        }

        if (data.type === 'fill') {
            handleIncomingLaptopFill(data);
            return;
        }

        if (data.type === 'text_element') {
            handleIncomingLaptopTextElement(data);
            return;
        }

        if (data.type === 'pointer_hover') {
            updateStylusHUD(data, data.pressure || 0);
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

        if (data.type === 'shape_preview') {
            remoteShapePreview = {
                brush: 'pen',
                color: data.color || activeColor,
                size: data.size || activeSize,
                opacity: data.opacity !== undefined ? data.opacity : 1.0,
                smoothing: 'off',
                points: data.points || []
            };
            scheduleLaptopRender();
            return;
        }

        if (data.type === 'stroke_start') {
            remoteShapePreview = null;
            try { updatePhoneResolution(data); } catch (_) {}
            try { updateToolAndTelemetry(data); } catch (_) {}

            const stroke = {
                stroke_id: data.stroke_id,
                brush: data.brush || activeBrush,
                color: data.color || activeColor,
                size: data.size || activeSize,
                opacity: data.opacity !== undefined ? data.opacity : 1.0,
                smoothing: data.smoothing || activeSmoothing,
                layerId: activeLayerId || 'layer-2',
                phone_width: data.phone_width || lastPhoneWidth,
                phone_height: data.phone_height || lastPhoneHeight,
                aspect_ratio: data.aspect_ratio || lastPhoneAspect,
                points: data.points || []
            };

            activeStrokesMap.set(data.stroke_id, stroke);
            if (stroke.points.length > 0) {
                try { updateStylusHUD(stroke.points[0], stroke.points[0].pressure); } catch (_) {}
            }
            scheduleLaptopRender();
            return;
        }

        if (data.type === 'stroke_points' || data.type === 'stroke') {
            try { updatePhoneResolution(data); } catch (_) {}

            let stroke = activeStrokesMap.get(data.stroke_id);
            if (!stroke) {
                stroke = {
                    stroke_id: data.stroke_id,
                    brush: data.brush || activeBrush,
                    color: data.color || activeColor,
                    size: data.size || activeSize,
                    opacity: data.opacity !== undefined ? data.opacity : 1.0,
                    smoothing: data.smoothing || activeSmoothing,
                    layerId: activeLayerId || 'layer-2',
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
                try { updateStylusHUD(lastPt, lastPt.pressure); } catch (_) {}
            }

            scheduleLaptopRender();
            return;
        }

        if (data.type === 'stroke_end') {
            remoteShapePreview = null;
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
        if (data.shape && activeShape !== data.shape) {
            selectActiveShape(data.shape, false);
        }
        if (data.brush && activeBrush !== data.brush) {
            activeBrush = data.brush;
            if (activeBrush === 'shape') {
                hudPhoneTool.textContent = `Phone Tool: Shape (${activeShape.charAt(0).toUpperCase() + activeShape.slice(1)})`;
            } else {
                hudPhoneTool.textContent = `Phone Tool: ${TOOL_DISPLAY_NAMES[data.brush] || data.brush}`;
            }
            dockToolBtns.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.brush === data.brush);
            });
            if (reticleOuterRing) {
                reticleOuterRing.classList.toggle('reticle-eraser', data.brush === 'eraser');
                reticleOuterRing.classList.toggle('reticle-bucket', data.brush === 'bucket');
            }
        }
        if (data.size && activeSize !== Math.round(data.size)) {
            setLaptopBrushSize(data.size, false);
        }
        if (data.color && activeColor.toLowerCase() !== data.color.toLowerCase()) {
            applyPrimaryColor(data.color, false);
        }
        if (data.smoothing && smoothingMetricVal.textContent !== SMOOTHING_DISPLAY_NAMES[data.smoothing]) {
            smoothingMetricVal.textContent = SMOOTHING_DISPLAY_NAMES[data.smoothing] || 'Weighted (x4)';
        }
    }

    function updateStylusReticleSize() {
        if (!reticleOuterRing) return;
        const mapping = getAspectMapping(artboardWidth / artboardHeight);
        const scaleFactor = (mapping.targetWidth / 600) * currentZoom;
        const pixelDiameter = Math.max(6, Math.round(activeSize * scaleFactor));

        reticleOuterRing.style.width = `${pixelDiameter}px`;
        reticleOuterRing.style.height = `${pixelDiameter}px`;
    }

    function setLaptopBrushSize(newSize, broadcast = true) {
        activeSize = Math.max(1, Math.min(200, Math.round(newSize)));
        if (hudBrushSize) hudBrushSize.textContent = `${activeSize}px`;
        if (dockSizePillText) dockSizePillText.textContent = `${activeSize}px`;
        if (popoverSizeDisplay) popoverSizeDisplay.textContent = `${activeSize}px`;
        if (popoverSizeSlider) popoverSizeSlider.value = activeSize;
        if (sidebarSizeMetricVal) sidebarSizeMetricVal.textContent = `${activeSize}px`;

        if (btnDockSize) btnDockSize.title = `Brush Size: ${activeSize}px (Click to Adjust, or press [ / ])`;

        document.querySelectorAll('.quick-sz-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.sz, 10) === activeSize);
        });

        localStorage.setItem('pdp_size', activeSize);
        updateStylusReticleSize();

        // Update HUD badge with newly chosen brush size immediately (size and pressure only, no angle)
        if (reticleHudBadge) {
            const isDown = isDrawing;
            const pPct = isDown ? 100 : 0;
            const pLabel = isDown ? `P: ${pPct}%` : 'Hover';
            reticleHudBadge.innerHTML = `<span class="badge-size">${activeSize}px</span> · <span class="badge-pressure">${pLabel}</span>`;
        }

        if (broadcast) {
            wsSend({
                type: 'tool_update',
                brush: activeBrush,
                size: activeSize,
                color: activeColor,
                opacity: activeOpacity,
                smoothing: activeSmoothing
            });
        }
    }

    function updateStylusHUD(pt, pressure = 0, eventData = null) {
        if (!pt) return;
        const mapping = getAspectMapping(artboardWidth / artboardHeight);
        const normX = pt.x !== undefined ? pt.x : 0.5;
        const normY = pt.y !== undefined ? pt.y : 0.5;
        const pxX = mapping.offsetX + normX * mapping.targetWidth;
        const pxY = mapping.offsetY + normY * mapping.targetHeight;

        stylusReticle.style.left = `${pxX}px`;
        stylusReticle.style.top = `${pxY}px`;

        if (reticleMode !== 'hidden') {
            stylusReticle.classList.remove('hidden');
        }

        lastStylusScreenX = pxX;
        lastStylusScreenY = pxY;

        const pPct = Math.round(pressure * 100);

        // Format Reticle HUD Badge: Chosen Brush Size & Pressure or Paint Bucket
        if (activeBrush === 'bucket') {
            reticleHudBadge.innerHTML = `<span class="badge-size">Fill Bucket</span> · <span class="badge-pressure" style="color:${activeColor}; font-weight:700;">${activeColor}</span>`;
        } else {
            const pressureLabel = pressure > 0.02 ? `P: ${pPct}%` : 'Hover';
            reticleHudBadge.innerHTML = `<span class="badge-size">${activeSize}px</span> · <span class="badge-pressure">${pressureLabel}</span>`;
        }

        // Update sidebar hardware feed & footer telemetry
        const raw12Bit = Math.round(pressure * 4096);
        if (pressureRatioText) pressureRatioText.textContent = `${pPct}% (${raw12Bit} / 4096)`;
        if (pressureProgressBar) pressureProgressBar.style.width = `${pPct}%`;
        if (sidebarSizeMetricVal) sidebarSizeMetricVal.textContent = `${activeSize}px`;

        if (footCoordX) footCoordX.textContent = Math.round(pxX);
        if (footCoordY) footCoordY.textContent = Math.round(pxY);

        // Update Reticle Size to match current brush size
        updateStylusReticleSize();
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
            if (shapesPopover) shapesPopover.classList.add('hidden');
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
                const bType = btn.dataset.brush;
                if (!bType) return;
                dockToolBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeBrush = bType;
                if (reticleOuterRing) {
                    reticleOuterRing.classList.toggle('reticle-eraser', activeBrush === 'eraser');
                    reticleOuterRing.classList.toggle('reticle-bucket', activeBrush === 'bucket');
                }
                hudPhoneTool.textContent = `Tool: ${TOOL_DISPLAY_NAMES[activeBrush] || activeBrush}`;
                showToast(`Switched to ${TOOL_DISPLAY_NAMES[activeBrush] || activeBrush}`, 'info');

                wsSend({
                    type: 'tool_update',
                    brush: activeBrush,
                    size: activeSize,
                    color: activeColor,
                    opacity: activeOpacity,
                    smoothing: activeSmoothing
                });
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

    // =========================================================================
    // 9. SHAPES ENGINE & COLOR PALETTE
    // =========================================================================
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

    function selectActiveShape(shapeName, broadcast = true) {
        if (!SHAPE_SVGS[shapeName]) shapeName = 'circle';
        activeShape = shapeName;
        activeBrush = 'shape';

        // Update Shapes dock button icon and title to the chosen shape
        if (dockShapeIcon) {
            dockShapeIcon.innerHTML = SHAPE_SVGS[shapeName];
        }
        if (btnDockShape) {
            btnDockShape.title = `Shapes: ${shapeName.charAt(0).toUpperCase() + shapeName.slice(1)} (Click to select shape or press U)`;
            dockToolBtns.forEach(b => b.classList.remove('active'));
            btnDockShape.classList.add('active');
        }
        if (popoverActiveShapeName) {
            popoverActiveShapeName.textContent = shapeName.toUpperCase();
        }

        // Update active class on shape grid buttons
        if (shapesGrid) {
            shapesGrid.querySelectorAll('.shape-opt-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.shape === shapeName);
            });
        }

        if (hudPhoneTool) {
            hudPhoneTool.textContent = `Tool: Shape (${shapeName.charAt(0).toUpperCase() + shapeName.slice(1)})`;
        }

        updateStylusReticleSize();
        if (lastStylusScreenX !== null) {
            const mapping = getAspectMapping(artboardWidth / artboardHeight);
            const nx = (lastStylusScreenX - mapping.offsetX) / mapping.targetWidth;
            const ny = (lastStylusScreenY - mapping.offsetY) / mapping.targetHeight;
            updateStylusHUD({ x: nx, y: ny }, 0.0);
        }

        showToast(`Shape selected: ${shapeName.charAt(0).toUpperCase() + shapeName.slice(1)}`, 'info');

        if (broadcast) {
            wsSend({
                type: 'tool_update',
                brush: 'shape',
                shape: activeShape,
                size: activeSize,
                color: activeColor,
                opacity: activeOpacity,
                smoothing: activeSmoothing
            });
        }
    }

    function initShapes() {
        if (btnDockShape) {
            btnDockShape.addEventListener('click', (e) => {
                e.stopPropagation();
                activeBrush = 'shape';
                dockToolBtns.forEach(b => b.classList.remove('active'));
                btnDockShape.classList.add('active');
                if (shapesPopover) shapesPopover.classList.toggle('hidden');
                if (hudPhoneTool) hudPhoneTool.textContent = `Tool: Shape (${activeShape.charAt(0).toUpperCase() + activeShape.slice(1)})`;
            });
        }

        if (shapesGrid) {
            shapesGrid.addEventListener('click', (e) => {
                const optBtn = e.target.closest('.shape-opt-btn');
                if (!optBtn) return;
                e.stopPropagation();
                const shape = optBtn.dataset.shape;
                selectActiveShape(shape, true);
                if (shapesPopover) shapesPopover.classList.add('hidden');
            });
        }

        if (shapesPopover) {
            shapesPopover.addEventListener('click', (e) => e.stopPropagation());
        }
    }

    function initColorPalette() {
        // Populate Dock Palette Chips
        if (paletteChipsGrid) {
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
        }

        // HUD Quick Palette Chips (Click any dot to immediately pick color!)
        if (hudQuickPalette) {
            hudQuickPalette.querySelectorAll('.hud-color-chip').forEach(chip => {
                chip.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const chosen = chip.dataset.color;
                    applyPrimaryColor(chosen);
                    showToast(`Color selected: ${chosen}`, 'info');
                });
            });
        }

        // HUD Custom Color Picker (<input type="color">)
        if (hudNativeColor) {
            hudNativeColor.addEventListener('input', () => {
                applyPrimaryColor(hudNativeColor.value);
            });
            hudNativeColor.addEventListener('change', () => {
                applyPrimaryColor(hudNativeColor.value);
                showToast(`Color selected: ${hudNativeColor.value}`, 'info');
            });
        }

        // Toggle Color Popover
        function toggleColorPopover(e) {
            e.stopPropagation();
            colorPopover.classList.toggle('hidden');
        }

        if (swatchPrimary) swatchPrimary.addEventListener('click', toggleColorPopover);
        if (btnDockColor) btnDockColor.addEventListener('click', toggleColorPopover);
        if (btnHudColor) btnHudColor.addEventListener('click', toggleColorPopover);
        if (btnHeaderColor) btnHeaderColor.addEventListener('click', toggleColorPopover);

        if (swatchSecondary) {
            swatchSecondary.addEventListener('click', (e) => {
                e.stopPropagation();
                swapColors();
            });
        }

        if (btnSwapSwatches) {
            btnSwapSwatches.addEventListener('click', (e) => {
                e.stopPropagation();
                swapColors();
            });
        }

        if (hexColorInput) {
            hexColorInput.addEventListener('input', () => {
                let val = hexColorInput.value.replace(/[^0-9a-fA-F]/g, '');
                if (val.length === 6 || val.length === 3) {
                    applyPrimaryColor('#' + val);
                }
            });
        }

        if (nativeColorPicker) {
            nativeColorPicker.addEventListener('input', () => {
                applyPrimaryColor(nativeColorPicker.value);
            });
        }

        if (colorPopover) {
            colorPopover.addEventListener('click', (e) => e.stopPropagation());
        }

        // Apply initial color state
        applyPrimaryColor(activeColor, false);
    }

    function applyPrimaryColor(color, broadcast = true) {
        if (!color) return;
        activeColor = color.toUpperCase();
        if (swatchPrimary) swatchPrimary.querySelector('.swatch-inner').style.backgroundColor = activeColor;
        if (hexColorInput) hexColorInput.value = activeColor.replace('#', '');
        if (nativeColorPicker) nativeColorPicker.value = activeColor.length === 7 ? activeColor : '#6366F1';
        if (hudColorSwatch) hudColorSwatch.style.backgroundColor = activeColor;
        if (hudColorHex) hudColorHex.textContent = activeColor;
        if (headerColorIndicator) headerColorIndicator.style.backgroundColor = activeColor;
        if (headerColorName) headerColorName.textContent = activeColor;
        if (dockColorBubble) dockColorBubble.style.backgroundColor = activeColor;
        if (hudNativeColor) hudNativeColor.value = activeColor.length === 7 ? activeColor : '#6366F1';

        // Highlight active chip in quick palette
        if (hudQuickPalette) {
            hudQuickPalette.querySelectorAll('.hud-color-chip').forEach(chip => {
                chip.classList.toggle('active', chip.dataset.color.toUpperCase() === activeColor);
            });
        }
        if (paletteChipsGrid) {
            paletteChipsGrid.querySelectorAll('.palette-chip').forEach(chip => {
                chip.classList.toggle('active', (chip.title || '').toUpperCase() === activeColor);
            });
        }

        if (broadcast) {
            wsSend({
                type: 'tool_update',
                color: activeColor,
                size: activeSize,
                brush: activeBrush,
                opacity: activeOpacity,
                smoothing: activeSmoothing
            });
        }

        // Update Stylus HUD if bucket, shape or hover is active
        if (lastStylusScreenX !== null) {
            const mapping = getAspectMapping(artboardWidth / artboardHeight);
            const nx = (lastStylusScreenX - mapping.offsetX) / mapping.targetWidth;
            const ny = (lastStylusScreenY - mapping.offsetY) / mapping.targetHeight;
            updateStylusHUD({ x: nx, y: ny }, 0.0);
        }
    }

    function swapColors() {
        const temp = activeColor;
        activeColor = secondaryColor;
        secondaryColor = temp;
        applyPrimaryColor(activeColor, true);
        if (swatchSecondary) swatchSecondary.querySelector('.swatch-inner').style.backgroundColor = secondaryColor;
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
            if (stroke.isText) {
                const sX = stroke.x * artboardWidth;
                const sY = stroke.y * artboardHeight;
                const fontSize = Math.max(10, (stroke.fontSize || 28) * svgScale);
                const padX = (stroke.boxPaddingX || 18) * svgScale;
                const padY = (stroke.boxPaddingY || 14) * svgScale;
                const radius = (stroke.borderRadius || 14) * svgScale;
                const boxW = (stroke.boxWidth || 200) * svgScale;
                const boxH = (stroke.boxHeight || 80) * svgScale;
                const color = stroke.color || '#ffffff';
                const boxStyle = stroke.boxStyle || 'glass';

                let bgFill = 'none';
                let strokeAttr = '';
                if (boxStyle === 'glass') {
                    bgFill = 'rgba(18, 24, 38, 0.88)';
                    strokeAttr = 'stroke="rgba(99, 102, 241, 0.55)" stroke-width="1.5"';
                } else if (boxStyle === 'neon') {
                    bgFill = 'rgba(12, 15, 26, 0.94)';
                    strokeAttr = `stroke="${color}" stroke-width="2"`;
                } else if (boxStyle === 'solid') {
                    bgFill = '#1e2337';
                    strokeAttr = 'stroke="#3b4261" stroke-width="1.5"';
                } else if (boxStyle === 'clean') {
                    bgFill = 'rgba(255, 255, 255, 0.04)';
                    strokeAttr = 'stroke="rgba(255, 255, 255, 0.35)" stroke-width="1.5"';
                }

                svgContent += `  <g transform="translate(${sX.toFixed(1)}, ${sY.toFixed(1)})">\n`;
                if (boxStyle !== 'none') {
                    svgContent += `    <rect width="${boxW.toFixed(1)}" height="${boxH.toFixed(1)}" rx="${radius.toFixed(1)}" fill="${bgFill}" ${strokeAttr}/>\n`;
                }
                const lines = String(stroke.text || '').split('\n');
                const lineHeight = fontSize * 1.35;
                lines.forEach((ln, lIdx) => {
                    const textY = padY + (lIdx + 0.85) * lineHeight;
                    const safeText = ln.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    svgContent += `    <text x="${padX.toFixed(1)}" y="${textY.toFixed(1)}" font-family="${stroke.fontFamily || 'sans-serif'}" font-size="${fontSize.toFixed(1)}" fill="${color}">${safeText}</text>\n`;
                });
                svgContent += `  </g>\n`;
                continue;
            }

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
            // [ and ]: Decrease / increase brush size
            if (e.key === '[') {
                e.preventDefault();
                const delta = activeSize <= 6 ? 1 : (activeSize <= 20 ? 2 : 4);
                setLaptopBrushSize(activeSize - delta);
                showToast(`Brush size: ${activeSize}px`, 'info');
            } else if (e.key === ']') {
                e.preventDefault();
                const delta = activeSize < 6 ? 1 : (activeSize < 20 ? 2 : 4);
                setLaptopBrushSize(activeSize + delta);
                showToast(`Brush size: ${activeSize}px`, 'info');
            }
            // Tool Shortcuts: G (Paint Bucket), U (Shapes), T (Text), C (Color), B (Pen / Brush), E (Eraser)
            if (!e.ctrlKey && !e.metaKey && !e.altKey) {
                if (e.key === 'g' || e.key === 'G') {
                    e.preventDefault();
                    const bucketBtn = document.querySelector('.dock-tool-btn[data-brush="bucket"]');
                    if (bucketBtn) bucketBtn.click();
                } else if (e.key === 'u' || e.key === 'U') {
                    e.preventDefault();
                    if (btnDockShape) btnDockShape.click();
                } else if (e.key === 't' || e.key === 'T') {
                    e.preventDefault();
                    if (btnDockText) btnDockText.click();
                } else if (e.key === 'c' || e.key === 'C') {
                    e.preventDefault();
                    colorPopover.classList.toggle('hidden');
                } else if (e.key === 'b' || e.key === 'B') {
                    e.preventDefault();
                    const penBtn = document.querySelector('.dock-tool-btn[data-brush="pen"]');
                    if (penBtn) penBtn.click();
                } else if (e.key === 'e' || e.key === 'E') {
                    e.preventDefault();
                    const eraserBtn = document.querySelector('.dock-tool-btn[data-brush="eraser"]');
                    if (eraserBtn) eraserBtn.click();
                }
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
                if (shapesPopover) shapesPopover.classList.add('hidden');
                if (hudSizePopover) hudSizePopover.classList.add('hidden');
                if (smartTextOverlay) closeSmartTextEditor();
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
        initShapes();
        initSmartTextEngine();
        initBrushSizeControls();
        initLaptopImageImport();
        initLayers();
        initPairingModal();
        initGuideMe();
        initKeyboardShortcuts();
        startTelemetryLoop();
        connectWebSocket();

        // Initialize reticle size and position matching initial artboard
        setLaptopBrushSize(activeSize, false);
        updateStylusHUD({ x: 0.52, y: 0.5 }, 0.0);
    }

    function initBrushSizeControls() {
        function toggleSizePopover(e) {
            e.stopPropagation();
            if (hudSizePopover) {
                hudSizePopover.classList.toggle('hidden');
                if (!hudSizePopover.classList.contains('hidden') && popoverSizeSlider) {
                    popoverSizeSlider.value = activeSize;
                    if (popoverSizeDisplay) popoverSizeDisplay.textContent = `${activeSize}px`;
                }
            }
        }

        if (btnHudSize) {
            btnHudSize.addEventListener('click', toggleSizePopover);
        }
        if (btnDockSize) {
            btnDockSize.addEventListener('click', toggleSizePopover);
        }

        if (popoverSizeSlider) {
            popoverSizeSlider.addEventListener('input', (e) => {
                setLaptopBrushSize(e.target.value);
            });
        }

        popoverQuickSizeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                setLaptopBrushSize(btn.dataset.sz);
            });
        });

        if (hudSizePopover) {
            hudSizePopover.addEventListener('click', (e) => e.stopPropagation());
        }

        document.addEventListener('click', () => {
            if (hudSizePopover) hudSizePopover.classList.add('hidden');
            if (shapesPopover) shapesPopover.classList.add('hidden');
            if (colorPopover) colorPopover.classList.add('hidden');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }

})();
