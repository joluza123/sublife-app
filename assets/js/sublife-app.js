document.addEventListener('DOMContentLoaded', function () {
    // =========================================================================
    // CONFIGURACIÓN EDITABLE DE SUBLIFE (Catálogo de Prendas, Márgenes y DTF)
    // =========================================================================
    const SUBLIFE_CONFIG = {
        brandName: 'SUBLIFE',
        whatsappNumber: '584129292352', // Reemplaza con el número de WhatsApp de SUBLIFE (código país + número sin +)
        currencySymbol: '$',
        pxPerInch: 25,
        // Margen adicional (%) sobre el costo DTF (ej: 0.20 = +20% de margen)
        dtfMarginPercent: 0.20,
        products: [
            {
                id: 'franela_algodon',
                name: 'Franela Algodón SUBLIFE',
                description: 'Corte clásico cómodo, ideal para uso diario y estampado DTF.',
                basePrice: 12.00,
                coverImage: 'assets/images/franela_front.png',
                mockups: {
                    front:        'assets/images/franela_front.png',
                    back:         'assets/images/franela_back.png',
                    sleeve_left:  'assets/images/franela_sleeve_left.png',
                    sleeve_right: 'assets/images/franela_sleeve_right.png'
                }
            },
            {
                id: 'franela_oversize',
                name: 'Franela Oversize SUBLIFE',
                description: 'Caída amplia y hombros caídos con estilo urbano.',
                basePrice: 16.00,
                coverImage: 'assets/images/oversize_front.png',
                mockups: {
                    front:        'assets/images/oversize_front.png',
                    back:         'assets/images/oversize_back.png',
                    sleeve_left:  'assets/images/oversize_sleeve_left.png',
                    sleeve_right: 'assets/images/oversize_sleeve_right.png'
                }
            },
            {
                id: 'hoodie_sublife',
                name: 'Hoodie SUBLIFE',
                description: 'Sudadera con capucha y bolsillo canguro para clima fresco.',
                basePrice: 24.00,
                coverImage: 'assets/images/hoodie_front.png',
                mockups: {
                    front:        'assets/images/hoodie_front.png',
                    back:         'assets/images/hoodie_back.png',
                    sleeve_left:  'assets/images/hoodie_sleeve_left.png',
                    sleeve_right: 'assets/images/hoodie_sleeve_right.png'
                }
            }
        ],
        sizeTiers: [
            { label: '2x2',   w: 2.0,  h: 2.0,  price: 0.79 },
            { label: '4x2',   w: 4.0,  h: 2.0,  price: 1.49 },
            { label: '3x3',   w: 3.0,  h: 3.0,  price: 1.79 },
            { label: '5x3',   w: 5.0,  h: 3.0,  price: 2.29 },
            { label: '4x4',   w: 4.0,  h: 4.0,  price: 2.29 },
            { label: '5x5',   w: 5.0,  h: 5.0,  price: 2.99 },
            { label: '6x6',   w: 6.0,  h: 6.0,  price: 3.89 },
            { label: '7x7',   w: 7.0,  h: 7.0,  price: 4.69 },
            { label: '8x8',   w: 8.0,  h: 8.0,  price: 5.39 },
            { label: '9x9',   w: 9.0,  h: 9.0,  price: 6.19 },
            { label: '10x10', w: 10.0, h: 10.0, price: 6.99 },
            { label: '11x11', w: 11.0, h: 11.0, price: 7.79 },
            { label: '11x14', w: 11.0, h: 14.0, price: 8.99 },
            { label: '12x17', w: 12.0, h: 17.0, price: 11.49 }
        ],
        zoneLabels: {
            front: 'Pecho',
            back: 'Espalda',
            sleeve_left: 'Manga Izq.',
            sleeve_right: 'Manga Der.'
        }
    };

    const BASE_WIDTH  = 400;
    const BASE_HEIGHT = 500;
    const sym         = SUBLIFE_CONFIG.currencySymbol;
    const pxPerInch   = SUBLIFE_CONFIG.pxPerInch;

    const canvasElement = document.getElementById('zlCanvas');
    if (!canvasElement || typeof fabric === 'undefined') {
        console.error('No se encontró #zlCanvas o fabric.js no cargó.');
        return;
    }

    const canvas = new fabric.Canvas('zlCanvas', {
        width: BASE_WIDTH,
        height: BASE_HEIGHT,
        backgroundColor: '#f8fafc'
    });

    let selectedProduct = SUBLIFE_CONFIG.products[0];
    let currentView     = 'front';
    let currentZoom     = 1;
    let isRestoring     = false;

    let designsByView = {
        front: null,
        back: null,
        sleeve_left: null,
        sleeve_right: null
    };

    function getTierPriceWithMargin(tier) {
        const base = parseFloat(tier.price) || 0;
        const margin = parseFloat(SUBLIFE_CONFIG.dtfMarginPercent) || 0;
        return +(base * (1 + margin)).toFixed(2);
    }

    function matchTierForInches(wIn, hIn) {
        const w = Math.max(0.1, parseFloat(wIn) || 0.1);
        const h = Math.max(0.1, parseFloat(hIn) || 0.1);

        for (let i = 0; i < SUBLIFE_CONFIG.sizeTiers.length; i++) {
            const tier = SUBLIFE_CONFIG.sizeTiers[i];
            const tw = parseFloat(tier.w) || 0;
            const th = parseFloat(tier.h) || 0;
            const fitsNormal  = (w <= tw + 0.05 && h <= th + 0.05);
            const fitsRotated = (w <= th + 0.05 && h <= tw + 0.05);
            if (fitsNormal || fitsRotated) {
                return tier;
            }
        }
        return SUBLIFE_CONFIG.sizeTiers[SUBLIFE_CONFIG.sizeTiers.length - 1];
    }

    function getObjectInchesAndTier(obj) {
        const bound = obj.getBoundingRect(true, true);
        const screenBound = obj.getBoundingRect(false, true);
        const wIn = Math.max(0.1, +(bound.width / pxPerInch).toFixed(1));
        const hIn = Math.max(0.1, +(bound.height / pxPerInch).toFixed(1));
        const tier = matchTierForInches(wIn, hIn);
        return {
            wIn: wIn,
            hIn: hIn,
            tier: tier,
            price: getTierPriceWithMargin(tier),
            bound: screenBound
        };
    }

    function positionFloatingBadge(obj, info) {
        const badge = document.getElementById('zl-floating-badge');
        if (!badge) return;

        if (!obj || !info) {
            badge.style.display = 'none';
            return;
        }

        const upperCanvas = canvas.upperCanvasEl;
        const offsetLeft = upperCanvas ? upperCanvas.offsetLeft : 0;
        const offsetTop  = upperCanvas ? upperCanvas.offsetTop : 0;

        const centerX = offsetLeft + info.bound.left + (info.bound.width / 2);
        const topY    = offsetTop + Math.max(18, info.bound.top);

        badge.innerHTML =
            info.wIn.toFixed(1) + '" × ' + info.hIn.toFixed(1) + '"' +
            '  |  ' + info.tier.label +
            '  |  <span style="color:#4ade80;">+' + sym + info.price.toFixed(2) + '</span>';

        badge.style.left = centerX + 'px';
        badge.style.top  = topY + 'px';
        badge.style.display = 'block';
    }

    function evaluateStateCost(state) {
        if (!state || !Array.isArray(state.objects) || state.objects.length === 0) {
            return { hasDesign: false, wIn: 0, hIn: 0, tier: null, price: 0 };
        }

        let minX = null, minY = null, maxX = null, maxY = null;
        state.objects.forEach(function (obj) {
            const w = parseFloat(obj.width) || 0;
            const h = parseFloat(obj.height) || 0;
            const sx = Math.abs(parseFloat(obj.scaleX) || 1);
            const sy = Math.abs(parseFloat(obj.scaleY) || 1);
            const effW = w * sx;
            const effH = h * sy;
            if (effW <= 0 || effH <= 0) return;

            const x1 = parseFloat(obj.left) || 0;
            const y1 = parseFloat(obj.top) || 0;
            const x2 = x1 + effW;
            const y2 = y1 + effH;

            minX = minX === null ? x1 : Math.min(minX, x1);
            minY = minY === null ? y1 : Math.min(minY, y1);
            maxX = maxX === null ? x2 : Math.max(maxX, x2);
            maxY = maxY === null ? y2 : Math.max(maxY, y2);
        });

        if (minX === null || maxX === null) {
            return { hasDesign: false, wIn: 0, hIn: 0, tier: null, price: 0 };
        }

        const wIn = Math.max(0.1, +((maxX - minX) / pxPerInch).toFixed(1));
        const hIn = Math.max(0.1, +((maxY - minY) / pxPerInch).toFixed(1));
        const tier = matchTierForInches(wIn, hIn);

        return {
            hasDesign: true,
            wIn: wIn,
            hIn: hIn,
            tier: tier,
            price: getTierPriceWithMargin(tier)
        };
    }

    function calculateFullQuote() {
        const breakdown = [];
        let dtfExtra = 0;

        Object.keys(SUBLIFE_CONFIG.zoneLabels).forEach(function (viewKey) {
            const calc = evaluateStateCost(designsByView[viewKey]);
            if (calc.hasDesign && calc.tier) {
                dtfExtra += calc.price;
                breakdown.push(
                    SUBLIFE_CONFIG.zoneLabels[viewKey] + ': ' +
                    calc.wIn.toFixed(1) + '"×' + calc.hIn.toFixed(1) + '" (' +
                    calc.tier.label + ' — +' + sym + calc.price.toFixed(2) + ')'
                );
            }
        });

        const basePrice  = parseFloat(selectedProduct.basePrice) || 0;
        const grandTotal = +(basePrice + dtfExtra).toFixed(2);

        return {
            basePrice: basePrice,
            dtfExtra: +dtfExtra.toFixed(2),
            grandTotal: grandTotal,
            breakdown: breakdown
        };
    }

    function updateSummaryAndBadge() {
        const activeObj = canvas.getActiveObject();
        if (activeObj) {
            positionFloatingBadge(activeObj, getObjectInchesAndTier(activeObj));
        } else {
            positionFloatingBadge(null, null);
        }

        const quote = calculateFullQuote();
        const baseEl  = document.getElementById('zlBasePriceLabel');
        const extraEl = document.getElementById('zlDtfExtraLabel');
        const totalEl = document.getElementById('zlGrandTotalLabel');
        const zonesEl = document.getElementById('zlZonesBreakdown');

        if (baseEl)  baseEl.textContent  = sym + quote.basePrice.toFixed(2);
        if (extraEl) extraEl.textContent = '+' + sym + quote.dtfExtra.toFixed(2);
        if (totalEl) totalEl.textContent = sym + quote.grandTotal.toFixed(2);
        if (zonesEl) {
            zonesEl.innerHTML = quote.breakdown.length
                ? quote.breakdown.join('<br>')
                : 'Ningún diseño agregado aún';
        }
    }

    function syncCurrentViewState() {
        if (isRestoring) return;
        if (currentView && designsByView.hasOwnProperty(currentView)) {
            designsByView[currentView] = canvas.toDatalessJSON(['selectable', 'evented']);
        }
        updateSummaryAndBadge();
    }

    canvas.on('object:added', syncCurrentViewState);
    canvas.on('object:removed', syncCurrentViewState);
    canvas.on('object:modified', syncCurrentViewState);
    canvas.on('object:scaling', syncCurrentViewState);
    canvas.on('object:moving', syncCurrentViewState);
    canvas.on('object:rotating', syncCurrentViewState);
    canvas.on('selection:created', updateSummaryAndBadge);
    canvas.on('selection:updated', updateSummaryAndBadge);
    canvas.on('selection:cleared', function () {
        positionFloatingBadge(null, null);
    });

    function drawFallbackGarmentBackground(viewLabel, onDone) {
        const c = document.createElement('canvas');
        c.width = BASE_WIDTH;
        c.height = BASE_HEIGHT;
        const ctx = c.getContext('2d');

        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

        ctx.fillStyle = '#e2e8f0';
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(135, 60);
        ctx.lineTo(265, 60);
        ctx.lineTo(355, 120);
        ctx.lineTo(325, 190);
        ctx.lineTo(285, 170);
        ctx.lineTo(285, 445);
        ctx.lineTo(115, 445);
        ctx.lineTo(115, 170);
        ctx.lineTo(75, 190);
        ctx.lineTo(45, 120);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.ellipse(200, 62, 34, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#334155';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(selectedProduct.name + ' — ' + viewLabel, BASE_WIDTH / 2, 476);

        const bgImg = new fabric.Image(c, {
            originX: 'left',
            originY: 'top',
            left: 0,
            top: 0
        });
        canvas.setBackgroundImage(bgImg, function () {
            canvas.renderAll();
            if (typeof onDone === 'function') onDone();
        });
    }

    function applyBackgroundForView(viewKey, onDone) {
        const viewLabel = SUBLIFE_CONFIG.zoneLabels[viewKey] || viewKey;
        const imgUrl = selectedProduct.mockups[viewKey];

        drawFallbackGarmentBackground(viewLabel, function () {
            if (!imgUrl) {
                if (typeof onDone === 'function') onDone();
                return;
            }

            const realImg = new Image();
            realImg.onload = function () {
                if (!realImg.width || !realImg.height) {
                    if (typeof onDone === 'function') onDone();
                    return;
                }
                const fabricBg = new fabric.Image(realImg, {
                    scaleX: BASE_WIDTH / realImg.width,
                    scaleY: BASE_HEIGHT / realImg.height,
                    originX: 'left',
                    originY: 'top'
                });
                canvas.setBackgroundImage(fabricBg, function () {
                    canvas.renderAll();
                    if (typeof onDone === 'function') onDone();
                });
            };
            realImg.onerror = function () {
                if (typeof onDone === 'function') onDone();
            };
            realImg.src = imgUrl;
        });
    }

    function loadMockup(viewKey) {
        if (currentView && designsByView.hasOwnProperty(currentView)) {
            designsByView[currentView] = canvas.toDatalessJSON(['selectable', 'evented']);
        }

        currentView = viewKey;
        positionFloatingBadge(null, null);

        isRestoring = true;
        canvas.discardActiveObject();
        canvas.getObjects().slice().forEach(function (obj) {
            canvas.remove(obj);
        });

        const savedState = designsByView[viewKey];

        if (savedState && Array.isArray(savedState.objects) && savedState.objects.length > 0) {
            fabric.util.enlivenObjects(savedState.objects, function (enlivenedObjects) {
                enlivenedObjects.forEach(function (obj) {
                    canvas.add(obj);
                });
                applyBackgroundForView(viewKey, function () {
                    isRestoring = false;
                    canvas.renderAll();
                    updateSummaryAndBadge();
                });
            });
        } else {
            applyBackgroundForView(viewKey, function () {
                isRestoring = false;
                canvas.renderAll();
                updateSummaryAndBadge();
            });
        }
    }

    // Navegación entre Catálogo y Personalizador
    const catalogSection    = document.getElementById('sl-catalog-view');
    const customizerSection = document.getElementById('sl-customizer-view');
    const catalogGrid       = document.getElementById('sl-catalog-grid');
    const activeBadge       = document.getElementById('slActiveProductBadge');

    function openCustomizerForProduct(productId) {
        const found = SUBLIFE_CONFIG.products.find(p => p.id === productId);
        if (!found) return;

        selectedProduct = found;
        designsByView = {
            front: null,
            back: null,
            sleeve_left: null,
            sleeve_right: null
        };

        if (activeBadge) {
            activeBadge.textContent = selectedProduct.name + ' (' + sym + selectedProduct.basePrice.toFixed(2) + ')';
        }

        document.querySelectorAll('.zl-btn-tab').forEach(t => t.classList.remove('active'));
        const frontTab = document.querySelector('.zl-btn-tab[data-view="front"]');
        if (frontTab) frontTab.classList.add('active');

        catalogSection.style.display = 'none';
        customizerSection.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });

        applyZoomLevel(1);
        updateSummaryAndBadge();
        loadMockup('front');
    }

    function renderCatalog() {
        if (!catalogGrid) return;
        catalogGrid.innerHTML = '';

        SUBLIFE_CONFIG.products.forEach(function (prod) {
            const card = document.createElement('div');
            card.className = 'sl-product-card';

            const imgSrc = prod.coverImage || prod.mockups.front || 'assets/images/franela_front.png';

            card.innerHTML =
                '<div class="sl-product-thumb">' +
                    '<img src="' + imgSrc + '" alt="' + prod.name + '" onerror="this.src=\'assets/images/franela_front.png\'; this.onerror=null;">' +
                '</div>' +
                '<div class="sl-product-body">' +
                    '<h3 class="sl-product-title">' + prod.name + '</h3>' +
                    '<p class="sl-product-desc">' + (prod.description || '') + '</p>' +
                    '<div class="sl-product-price">' + sym + parseFloat(prod.basePrice).toFixed(2) + '</div>' +
                    '<button type="button" class="sl-btn-customize" data-product-id="' + prod.id + '">Personalizar prenda</button>' +
                '</div>';

            card.querySelector('.sl-btn-customize').addEventListener('click', function () {
                openCustomizerForProduct(this.getAttribute('data-product-id'));
            });

            catalogGrid.appendChild(card);
        });
    }

    document.getElementById('slBackToCatalogBtn').addEventListener('click', function () {
        customizerSection.style.display = 'none';
        catalogSection.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    function applyZoomLevel(newZoom) {
        currentZoom = Math.max(1, Math.min(2.5, +newZoom.toFixed(2)));
        const scaledW = Math.round(BASE_WIDTH * currentZoom);
        const scaledH = Math.round(BASE_HEIGHT * currentZoom);

        const stage = document.getElementById('zl-canvas-stage');
        const scrollBox = document.getElementById('zl-canvas-scroll-box');
        if (stage) {
            stage.style.width = scaledW + 'px';
            stage.style.height = scaledH + 'px';
        }
        if (scrollBox) {
            scrollBox.style.justifyContent = currentZoom > 1 ? 'flex-start' : 'center';
        }

        canvas.setDimensions({ width: scaledW, height: scaledH });
        canvas.setZoom(currentZoom);
        canvas.calcOffset();
        canvas.renderAll();

        document.getElementById('zlZoomLevelLabel').textContent = Math.round(currentZoom * 100) + '%';
        updateSummaryAndBadge();
    }

    document.getElementById('zlZoomInBtn').addEventListener('click', function () {
        applyZoomLevel(currentZoom + 0.25);
    });
    document.getElementById('zlZoomOutBtn').addEventListener('click', function () {
        applyZoomLevel(currentZoom - 0.25);
    });
    document.getElementById('zlZoomResetBtn').addEventListener('click', function () {
        applyZoomLevel(1);
    });

    function colorDistance(r1, g1, b1, r2, g2, b2) {
        const dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
        return Math.sqrt(dr * dr + dg * dg + db * db);
    }

    function getEdgeCandidateColors(data, w, h) {
        const candidates = [];
        [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]].forEach(function (pt) {
            const idx = (pt[1] * w + pt[0]) * 4;
            if (data[idx + 3] > 20) {
                candidates.push({ r: data[idx], g: data[idx + 1], b: data[idx + 2] });
            }
        });
        return candidates.length ? candidates : [{ r: 255, g: 255, b: 255 }];
    }

    function matchesAnyBg(r, g, b, bgColors, tolerance) {
        for (let i = 0; i < bgColors.length; i++) {
            const c = bgColors[i];
            if (colorDistance(r, g, b, c.r, c.g, c.b) <= tolerance) return true;
        }
        return false;
    }

    function processImageRemoveBgAndCrop(fabricImgObj, tolerance) {
        const imgEl = fabricImgObj.getElement();
        const srcW = imgEl.naturalWidth || imgEl.width;
        const srcH = imgEl.naturalHeight || imgEl.height;
        if (!srcW || !srcH) return;

        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = srcW;
        tempCanvas.height = srcH;
        tempCtx.drawImage(imgEl, 0, 0, srcW, srcH);

        const imgData = tempCtx.getImageData(0, 0, srcW, srcH);
        const data = imgData.data;
        const bgColors = getEdgeCandidateColors(data, srcW, srcH);

        const totalPixels = srcW * srcH;
        const visited = new Uint8Array(totalPixels);
        const queue = new Int32Array(totalPixels);
        let head = 0, tail = 0;

        function tryEnqueue(x, y) {
            if (x < 0 || x >= srcW || y < 0 || y >= srcH) return;
            const pIdx = y * srcW + x;
            if (visited[pIdx]) return;
            const cIdx = pIdx * 4;
            if (data[cIdx + 3] === 0) {
                visited[pIdx] = 1;
                queue[tail++] = pIdx;
                return;
            }
            if (matchesAnyBg(data[cIdx], data[cIdx + 1], data[cIdx + 2], bgColors, tolerance)) {
                visited[pIdx] = 1;
                data[cIdx + 3] = 0;
                queue[tail++] = pIdx;
            }
        }

        for (let x = 0; x < srcW; x++) { tryEnqueue(x, 0); tryEnqueue(x, srcH - 1); }
        for (let y = 0; y < srcH; y++) { tryEnqueue(0, y); tryEnqueue(srcW - 1, y); }

        while (head < tail) {
            const pIdx = queue[head++];
            const x = pIdx % srcW;
            const y = (pIdx - x) / srcW;
            tryEnqueue(x + 1, y);
            tryEnqueue(x - 1, y);
            tryEnqueue(x, y + 1);
            tryEnqueue(x, y - 1);
        }

        const internalTol = Math.max(35, tolerance * 0.65);
        for (let pIdx = 0; pIdx < totalPixels; pIdx++) {
            if (visited[pIdx]) continue;
            const cIdx = pIdx * 4;
            if (data[cIdx + 3] > 0 && matchesAnyBg(data[cIdx], data[cIdx + 1], data[cIdx + 2], bgColors, internalTol)) {
                data[cIdx + 3] = 0;
            }
        }

        tempCtx.putImageData(imgData, 0, 0);

        let minX = srcW, minY = srcH, maxX = -1, maxY = -1;
        for (let y = 0; y < srcH; y++) {
            for (let x = 0; x < srcW; x++) {
                if (data[(y * srcW + x) * 4 + 3] > 20) {
                    if (x < minX) minX = x;
                    if (y < minY) minY = y;
                    if (x > maxX) maxX = x;
                    if (y > maxY) maxY = y;
                }
            }
        }

        if (maxX < minX || maxY < minY) return;

        const pad = 2;
        minX = Math.max(0, minX - pad);
        minY = Math.max(0, minY - pad);
        maxX = Math.min(srcW - 1, maxX + pad);
        maxY = Math.min(srcH - 1, maxY + pad);

        const cropW = maxX - minX + 1;
        const cropH = maxY - minY + 1;

        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = cropW;
        croppedCanvas.height = cropH;
        croppedCanvas.getContext('2d').drawImage(tempCanvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);

        const centerPt = fabricImgObj.getCenterPoint();
        const prevScaleX = fabricImgObj.scaleX;
        const prevScaleY = fabricImgObj.scaleY;

        const croppedImgEl = new Image();
        croppedImgEl.onload = function () {
            const newImg = new fabric.Image(croppedImgEl, {
                originX: 'center',
                originY: 'center',
                left: centerPt.x,
                top: centerPt.y,
                scaleX: prevScaleX,
                scaleY: prevScaleY,
                width: cropW,
                height: cropH
            });
            newImg.setCoords();
            canvas.remove(fabricImgObj);
            canvas.add(newImg);
            canvas.setActiveObject(newImg);
            canvas.renderAll();
            syncCurrentViewState();
        };
        croppedImgEl.src = croppedCanvas.toDataURL('image/png');
    }

    document.querySelectorAll('.zl-btn-tab').forEach(function (tab) {
        tab.addEventListener('click', function () {
            document.querySelectorAll('.zl-btn-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            loadMockup(this.getAttribute('data-view'));
        });
    });

    document.getElementById('zlUploadImage').addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (f) {
            fabric.Image.fromURL(f.target.result, function (img) {
                img.scaleToWidth(110);
                img.set({ left: 150, top: 150 });
                canvas.add(img);
                canvas.setActiveObject(img);
                canvas.renderAll();
                processImageRemoveBgAndCrop(img, 78);
            });
        };
        reader.readAsDataURL(file);
    });

    document.getElementById('zlDeleteSelected').addEventListener('click', function () {
        const activeObj = canvas.getActiveObject();
        if (activeObj) {
            canvas.remove(activeObj);
            canvas.discardActiveObject();
            canvas.renderAll();
            syncCurrentViewState();
        }
    });

    document.getElementById('zlDownloadPreviewBtn').addEventListener('click', function () {
        canvas.discardActiveObject();
        canvas.renderAll();
        const prevZoom = currentZoom;
        applyZoomLevel(1);
        const link = document.createElement('a');
        link.download = 'sublife-' + selectedProduct.id + '-' + currentView + '.png';
        link.href = canvas.toDataURL({ format: 'png', quality: 1 });
        link.click();
        applyZoomLevel(prevZoom);
    });

    document.getElementById('zlSendWhatsAppBtn').addEventListener('click', function () {
        const quote = calculateFullQuote();
        const size  = document.getElementById('zlSizeSelect').value;
        const color = document.getElementById('zlColorSelect').value;

        let lines = [
            '¡Hola *' + SUBLIFE_CONFIG.brandName + '*! 👋 Quiero pedir una prenda personalizada:',
            '',
            '• *Prenda:* ' + selectedProduct.name,
            '• *Talla:* ' + size,
            '• *Color:* ' + color,
            '• *Precio prenda base:* ' + sym + quote.basePrice.toFixed(2)
        ];

        if (quote.breakdown.length > 0) {
            lines.push('');
            lines.push('*Estampados DTF:*');
            quote.breakdown.forEach(function (item) {
                lines.push('  - ' + item);
            });
            lines.push('• *Subtotal estampado:* +' + sym + quote.dtfExtra.toFixed(2));
        }

        lines.push('');
        lines.push('*TOTAL ESTIMADO:* ' + sym + quote.grandTotal.toFixed(2));
        lines.push('');
        lines.push('_(Adjunto mi vista previa y archivos del diseño)_');

        const url = 'https://wa.me/' + SUBLIFE_CONFIG.whatsappNumber + '?text=' + encodeURIComponent(lines.join('\n'));
        window.open(url, '_blank');
    });

    // Inicia mostrando el catálogo de prendas SUBLIFE
    renderCatalog();
});
