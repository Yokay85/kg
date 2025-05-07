const imageLoader = document.getElementById('imageLoader');
const originalCanvas = document.getElementById('originalCanvas');
const processedCanvas = document.getElementById('processedCanvas');
const originalCtx = originalCanvas.getContext('2d');
const processedCtx = processedCanvas.getContext('2d');
const infoBox = document.getElementById('infoBox');

const cmykToHslBtn = document.getElementById('cmykToHslBtn');
const hslToCmykBtn = document.getElementById('hslToCmykBtn');
const integrityCheckBtn = document.getElementById('integrityCheckBtn');
const modifyYellowBtn = document.getElementById('modifyYellowBtn');
const saveImageBtn = document.getElementById('saveImageBtn');
// conversionChainBtn removed
const lightnessSlider = document.getElementById('lightnessIncrease');
const lightnessValueSpan = document.getElementById('lightnessValue');

let originalImageData = null;
let currentImage = new Image();
let processedImageDataForInfo = null; // Store the latest processed data for info display
let selection = { startX: 0, startY: 0, endX: 0, endY: 0, isSelecting: false };
let selectionRectDiv = null; // Div element for visual feedback

// --- Image Loading ---
imageLoader.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        currentImage = new Image();
        currentImage.onload = () => {
            // Set canvas dimensions
            originalCanvas.width = processedCanvas.width = currentImage.width;
            originalCanvas.height = processedCanvas.height = currentImage.height;

            // Draw image on original canvas
            originalCtx.drawImage(currentImage, 0, 0);
            originalImageData = originalCtx.getImageData(0, 0, originalCanvas.width, originalCanvas.height);

            // Clear processed canvas initially
            processedCtx.clearRect(0, 0, processedCanvas.width, processedCanvas.height);
            processedImageDataForInfo = null; // Reset processed data on new image
            infoBox.textContent = 'Наведіть курсор на зображення для інформації про піксель.';
            // Reset selection on new image load
            resetSelection();
        }
        currentImage.src = event.target.result;
    }
    reader.readAsDataURL(file);
});

// --- Selection Logic ---
function getCanvasCoordinates(event) {
    const rect = originalCanvas.getBoundingClientRect();
    const scaleX = originalCanvas.width / rect.width;
    const scaleY = originalCanvas.height / rect.height;
    const x = Math.floor((event.clientX - rect.left) * scaleX);
    const y = Math.floor((event.clientY - rect.top) * scaleY);
    return { x: Math.max(0, Math.min(originalCanvas.width, x)), y: Math.max(0, Math.min(originalCanvas.height, y)) };
}

function resetSelection() {
    selection.isSelecting = false;
    selection.startX = 0;
    selection.startY = 0;
    selection.endX = 0;
    selection.endY = 0;
    if (selectionRectDiv) {
        selectionRectDiv.remove();
        selectionRectDiv = null;
    }
}

originalCanvas.addEventListener('mousedown', (e) => {
    if (!originalImageData) return;
    selection.isSelecting = true;
    const coords = getCanvasCoordinates(e);
    selection.startX = coords.x;
    selection.startY = coords.y;
    selection.endX = coords.x; // Initialize end coords
    selection.endY = coords.y;

    // Create visual feedback div if it doesn't exist
    if (!selectionRectDiv) {
        selectionRectDiv = document.createElement('div');
        selectionRectDiv.id = 'selectionRectangle';
        document.body.appendChild(selectionRectDiv);
    }

    const canvasRect = originalCanvas.getBoundingClientRect();
    selectionRectDiv.style.left = `${e.clientX}px`;
    selectionRectDiv.style.top = `${e.clientY}px`;
    selectionRectDiv.style.width = '0px';
    selectionRectDiv.style.height = '0px';
    selectionRectDiv.style.display = 'block'; // Make it visible
});

originalCanvas.addEventListener('mousemove', (e) => {
    // Display pixel info (moved outside selection logic)
    displayPixelInfo(originalCanvas, originalImageData, e);

    if (!selection.isSelecting) return;

    const coords = getCanvasCoordinates(e);
    selection.endX = coords.x;
    selection.endY = coords.y;

    // Update visual feedback div
    const canvasRect = originalCanvas.getBoundingClientRect();
    const startClientX = canvasRect.left + (selection.startX / (originalCanvas.width / canvasRect.width));
    const startClientY = canvasRect.top + (selection.startY / (originalCanvas.height / canvasRect.height));

    const currentX = e.clientX;
    const currentY = e.clientY;

    const left = Math.min(startClientX, currentX);
    const top = Math.min(startClientY, currentY);
    const width = Math.abs(startClientX - currentX);
    const height = Math.abs(startClientY - currentY);

    selectionRectDiv.style.left = `${left}px`;
    selectionRectDiv.style.top = `${top}px`;
    selectionRectDiv.style.width = `${width}px`;
    selectionRectDiv.style.height = `${height}px`;
});

originalCanvas.addEventListener('mouseup', (e) => {
    if (!selection.isSelecting) return;
    selection.isSelecting = false;
    // Optional: Hide rectangle after selection, or keep it until next selection starts
    if (selectionRectDiv) {
        selectionRectDiv.style.display = 'none';
    }
    console.log('Selected region:', getSelectedRegion());
});

// Handle mouse leaving the canvas during selection
document.addEventListener('mouseup', (e) => {
    // If mouseup happens outside the canvas while selecting, finalize selection
    if (selection.isSelecting && e.target !== originalCanvas) {
        selection.isSelecting = false;
        console.log('Selected region (mouseup outside):', getSelectedRegion());
    }
});

function getSelectedRegion() {
    if (selection.startX === selection.endX || selection.startY === selection.endY) {
        return null; // No actual area selected
    }
    const x = Math.min(selection.startX, selection.endX);
    const y = Math.min(selection.startY, selection.endY);
    const width = Math.abs(selection.endX - selection.startX);
    const height = Math.abs(selection.endY - selection.startY);
    return { x, y, width, height };
}

// --- Color Conversion Functions ---
function rgbToCmyk(r, g, b) {
    /* Mathematical formula:
     * r, g, b ∈ [0, 255]
     * r' = r/255, g' = g/255, b' = b/255
     * k = 1 - max(r', g', b')
     * if k = 1 (black): c = m = y = 0
     * else: c = (1-r'-k)/(1-k), m = (1-g'-k)/(1-k), y = (1-b'-k)/(1-k)
     * c, m, y, k ∈ [0, 1]
     */
    // Normalize RGB values to [0, 1]
    const r1 = r / 255;
    const g1 = g / 255;
    const b1 = b / 255;
    
    // Calculate K (black)
    const k = 1 - Math.max(r1, g1, b1);
    
    // Handle special case - pure black
    if (k === 1) {
        return [0, 0, 0, 1];
    }
    
    // Calculate C, M, Y
    const c = (1 - r1 - k) / (1 - k);
    const m = (1 - g1 - k) / (1 - k);
    const y = (1 - b1 - k) / (1 - k);
    
    return [c, m, y, k];
}

function cmykToRgb(c, m, y, k) {
    /* Mathematical formula:
     * c, m, y, k ∈ [0, 1]
     * r = 255 × (1-c) × (1-k)
     * g = 255 × (1-m) × (1-k)
     * b = 255 × (1-y) × (1-k)
     * r, g, b ∈ [0, 255]
     */
    const r = 255 * (1 - c) * (1 - k);
    const g = 255 * (1 - m) * (1 - k);
    const b = 255 * (1 - y) * (1 - k);
    
    return [Math.round(r), Math.round(g), Math.round(b)];
}

function rgbToHsl(r, g, b) {
    /* Mathematical formula:
     * r, g, b ∈ [0, 255]
     * r' = r/255, g' = g/255, b' = b/255
     * Cmax = max(r', g', b')
     * Cmin = min(r', g', b')
     * Δ = Cmax - Cmin
     * 
     * Lightness: L = (Cmax + Cmin) / 2
     * 
     * Saturation: 
     * if Δ = 0: S = 0
     * else: S = Δ / (1 - |2L - 1|)
     * 
     * Hue:
     * if Δ = 0: H = 0
     * if Cmax = r': H = ((g' - b') / Δ) % 6
     * if Cmax = g': H = (b' - r') / Δ + 2
     * if Cmax = b': H = (r' - g') / Δ + 4
     * H = H × 60°
     * 
     * For our implementation, H ∈ [0, 1] instead of [0, 360]
     */
    
    // Normalize RGB values to [0, 1]
    r /= 255; 
    g /= 255; 
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    
    // Calculate lightness
    const l = (max + min) / 2;
    
    // Achromatic case (gray)
    if (d === 0) {
        return [0, 0, l];
    }
    
    // Calculate saturation
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    // Calculate hue
    let h;
    switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
    
    return [h, s, l]; // H [0, 1], S [0, 1], L [0, 1]
}

function hslToRgb(h, s, l) {
    /* Mathematical formula:
     * h ∈ [0, 1], s ∈ [0, 1], l ∈ [0, 1]
     * 
     * if s = 0: r = g = b = l (achromatic/gray)
     * else:
     *   q = l < 0.5 ? l × (1 + s) : l + s - l × s
     *   p = 2 × l - q
     *   
     *   r = hue2rgb(p, q, h + 1/3)
     *   g = hue2rgb(p, q, h)
     *   b = hue2rgb(p, q, h - 1/3)
     *   
     *   where hue2rgb(p, q, t) =
     *     if t < 0: t = t + 1
     *     if t > 1: t = t - 1
     *     if t < 1/6: return p + (q - p) × 6 × t
     *     if t < 1/2: return q
     *     if t < 2/3: return p + (q - p) × (2/3 - t) × 6
     *     else: return p
     *     
     * r, g, b are then scaled to [0, 255]
     */
    
    // Achromatic case (gray)
    if (s === 0) {
        const val = Math.round(l * 255);
        return [val, val, val];
    }
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    
    const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
    }
    
    const r = hue2rgb(p, q, h + 1/3);
    const g = hue2rgb(p, q, h);
    const b = hue2rgb(p, q, h - 1/3);
    
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// --- Pixel Info Display ---
function displayPixelInfo(canvas, imageData, event) {
    if (!imageData) {
        infoBox.textContent = 'Наведіть курсор на зображення для інформації про піксель.';
        return;
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((event.clientX - rect.left) * scaleX);
    const y = Math.floor((event.clientY - rect.top) * scaleY);

    if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) {
        infoBox.textContent = 'Наведіть курсор на зображення для інформації про піксель.';
        return;
    }

    const pixelIndex = (y * canvas.width + x) * 4;
    const data = imageData.data;
    const r = data[pixelIndex];
    const g = data[pixelIndex + 1];
    const b = data[pixelIndex + 2];
    const a = data[pixelIndex + 3];

    const [c, m, cy, k] = rgbToCmyk(r, g, b);
    const [h, s, l] = rgbToHsl(r, g, b);

    const canvasName = canvas === originalCanvas ? 'Оригінал' : 'Оброблене';

    infoBox.textContent = `Джерело:     ${canvasName}\n` +
                          `Координати: (${x}, ${y})\n` +
                          `RGB:        (${r}, ${g}, ${b}, ${a})\n` +
                          `CMYK:       (${c.toFixed(2)}, ${m.toFixed(2)}, ${cy.toFixed(2)}, ${k.toFixed(2)})\n` +
                          `HSL:        (${(h * 360).toFixed(1)}°, ${(s * 100).toFixed(1)}%, ${(l * 100).toFixed(1)}%)`;
}

originalCanvas.addEventListener('mousemove', (e) => {
    // Only display pixel info, selection handled separately
    displayPixelInfo(originalCanvas, originalImageData, e);
});

processedCanvas.addEventListener('mousemove', (e) => {
    // Use the stored processed image data if available
    if (!processedImageDataForInfo) {
        // Fallback: try to get data directly from context if nothing is stored
        // This might be slow and might not reflect the *last* operation if canvas wasn't updated
        try {
            processedImageDataForInfo = processedCtx.getImageData(0, 0, processedCanvas.width, processedCanvas.height);
        } catch (error) {
            console.error("Could not get image data from processed canvas", error);
            infoBox.textContent = 'Не вдалося отримати дані пікселя з обробленого зображення.';
            return;
        }
    }
    displayPixelInfo(processedCanvas, processedImageDataForInfo, e);
});

function resetInfoBox() {
    infoBox.textContent = 'Наведіть курсор на зображення для інформації про піксель.';
}

originalCanvas.addEventListener('mouseleave', resetInfoBox);
processedCanvas.addEventListener('mouseleave', resetInfoBox);

// --- Helper function for processing image data ---
function processImage(processor, region = null) { // Added optional region parameter
    if (!originalImageData) {
        alert('Будь ласка, спочатку завантажте зображення.');
        return null;
    }
    const width = originalCanvas.width;
    const height = originalCanvas.height;
    // Create new image data for processing, or use existing if modifying in place (not recommended for most ops)
    const processedImageData = processedCtx.createImageData(width, height);
    const originalData = originalImageData.data;
    const processedData = processedImageData.data;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const r = originalData[i];
            const g = originalData[i + 1];
            const b = originalData[i + 2];
            const a = originalData[i + 3];

            let isInRegion = true;
            if (region) {
                isInRegion = x >= region.x && x < region.x + region.width &&
                             y >= region.y && y < region.y + region.height;
            }

            if (isInRegion) {
                const [newR, newG, newB, newA] = processor(r, g, b, a, x, y); // Pass coords to processor
                processedData[i] = newR;
                processedData[i + 1] = newG;
                processedData[i + 2] = newB;
                processedData[i + 3] = newA;
            } else {
                // Copy original pixel if outside region
                processedData[i] = r;
                processedData[i + 1] = g;
                processedData[i + 2] = b;
                processedData[i + 3] = a;
            }
        }
    }

    processedCtx.putImageData(processedImageData, 0, 0);
    processedImageDataForInfo = processedImageData; // Store for info display
    return processedImageData;
}

// --- Button Event Listeners ---
cmykToHslBtn.addEventListener('click', () => {
    console.log('CMYK -> HSL button clicked');
    processImage((r, g, b, a) => {
        // RGB -> CMYK -> RGB -> HSL -> RGB
        const cmyk1 = rgbToCmyk(r, g, b);
        const rgb1 = cmykToRgb(...cmyk1);
        const hsl = rgbToHsl(...rgb1);
        const rgb2 = hslToRgb(...hsl);
        return [...rgb2, a];
    });
});

hslToCmykBtn.addEventListener('click', () => {
    console.log('HSL -> CMYK button clicked');
    processImage((r, g, b, a) => {
        // RGB -> HSL -> RGB -> CMYK -> RGB
        const hsl = rgbToHsl(r, g, b);
        const rgb1 = hslToRgb(...hsl);
        const cmyk = rgbToCmyk(...rgb1);
        const rgb2 = cmykToRgb(...cmyk);
        return [...rgb2, a];
    });
});

// Integrity check button handler
integrityCheckBtn.addEventListener('click', () => {
    console.log('Integrity Check button clicked');
    checkImageIntegrity();
});

// Function to check image integrity
function checkImageIntegrity() {
    if (!originalImageData || !processedImageDataForInfo) {
        alert('Потрібно завантажити та обробити зображення перед перевіркою цілісності.');
        return;
    }

    const originalData = originalImageData.data;
    const processedData = processedImageDataForInfo.data;
    const totalPixels = originalData.length / 4;  // Each pixel has 4 values (RGBA)
    
    let identicalPixels = 0;
    let totalColorDifference = 0;
    let maxDifference = 0;
    
    // More detailed statistics
    let diffHistogram = [0, 0, 0, 0, 0]; // 0, 0-1, 1-5, 5-20, >20
    
    for (let i = 0; i < originalData.length; i += 4) {
        const originalRGB = [originalData[i], originalData[i + 1], originalData[i + 2]];
        const processedRGB = [processedData[i], processedData[i + 1], processedData[i + 2]];
        
        // Calculate Euclidean distance between RGB colors
        const difference = Math.sqrt(
            Math.pow(originalRGB[0] - processedRGB[0], 2) +
            Math.pow(originalRGB[1] - processedRGB[1], 2) +
            Math.pow(originalRGB[2] - processedRGB[2], 2)
        );
        
        // Count identical pixels with stricter threshold
        if (difference < 0.001) { // Use much smaller threshold to detect true identity
            identicalPixels++;
        }
        
        // Update difference histogram
        if (difference === 0) diffHistogram[0]++;
        else if (difference < 1) diffHistogram[1]++;
        else if (difference < 5) diffHistogram[2]++;
        else if (difference < 20) diffHistogram[3]++;
        else diffHistogram[4]++;
        
        totalColorDifference += difference;
        maxDifference = Math.max(maxDifference, difference);
    }
    
    const percentageIdentical = (identicalPixels / totalPixels * 100).toFixed(2);
    const averageDifference = (totalColorDifference / totalPixels).toFixed(2);
    
    // Display results in the info box
    infoBox.textContent = `Результати перевірки цілісності:\n\n` +
                         `Загальна кількість пікселів: ${totalPixels}\n` +
                         `Ідентичні пікселі: ${identicalPixels} (${percentageIdentical}%)\n` +
                         `Середня різниця: ${averageDifference} (діапазон 0-442)\n` +
                         `Максимальна різниця: ${maxDifference.toFixed(2)}\n\n` +
                         `Розподіл різниць:\n` +
                         `0: ${diffHistogram[0]}\n` +
                         `0-1: ${diffHistogram[1]}\n` +
                         `1-5: ${diffHistogram[2]}\n` +
                         `5-20: ${diffHistogram[3]}\n` +
                         `>20: ${diffHistogram[4]}\n\n` +
                         `Примітка: ідеальна конверсія має 100% ідентичних пікселів.\n` +
                         `Різниця показує втрату інформації при перетворенні.`;
                         
    // Highlight the results visually
    if (percentageIdentical >= 99) {
        infoBox.textContent += `\n\nВідмінно! Перетворення зберегло інформацію з високою точністю.`;
    } else if (percentageIdentical >= 95) {
        infoBox.textContent += `\n\nДобре. Незначна втрата інформації при перетворенні.`;
    } else if (percentageIdentical >= 90) {
        infoBox.textContent += `\n\nЗадовільно. Помітна втрата інформації при перетворенні.`;
    } else {
        infoBox.textContent += `\n\nУвага! Значна втрата інформації при перетворенні.`;
    }
}

modifyYellowBtn.addEventListener('click', () => {
    console.log('Modify Yellow button clicked');
    if (!originalImageData) { alert('Будь ласка, спочатку завантажте зображення.'); return; }

    const selectedRegion = getSelectedRegion();
    if (!selectedRegion) {
        alert('Будь ласка, спочатку виділіть область на оригінальному зображенні.');
        return;
    }

    const lightnessChange = parseFloat(lightnessSlider.value);
    console.log(`Applying lightness change: ${lightnessChange} to region:`, selectedRegion);

    // Expanded yellow hue range for better coverage
    const yellowHueMin = 40 / 360; // Expanded range from 40° (slightly orange-yellow)
    const yellowHueMax = 80 / 360; // Expanded range to 80° (greenish-yellow)
    
    processImage((r, g, b, a, x, y) => {
        // Convert to HSL for easier color manipulation
        const [h, s, l] = rgbToHsl(r, g, b);
        
        // Calculate how "yellow" the color is (proximity to yellow hue)
        const isYellowHue = (h >= yellowHueMin && h <= yellowHueMax);
        
        // Higher saturation yellows get more effect
        if (isYellowHue && s > 0.15) {
            // Apply brightness adjustment based on how "yellow" it is
            // More saturated yellows get more adjustment
            const adjustmentFactor = s * lightnessChange;
            
            // Adjust lightness but keep between 0.0 and 1.0
            const newL = Math.max(0.0, Math.min(1.0, l + adjustmentFactor));
            
            // Convert back to RGB
            const [newR, newG, newB] = hslToRgb(h, s, newL);
            return [newR, newG, newB, a];
        } else {
            return [r, g, b, a];
        }
    }, selectedRegion); // Pass the selected region
});

saveImageBtn.addEventListener('click', () => {
    if (!processedCanvas.width || !processedCanvas.height || processedCtx.getImageData(0, 0, 1, 1).data[3] === 0) {
         alert('Немає обробленого зображення для збереження.');
         return;
    }
    console.log('Save Image button clicked');
    const link = document.createElement('a');
    link.download = 'processed_image.png';
    link.href = processedCanvas.toDataURL('image/png');
    link.click();
});

// --- Slider Event Listener ---
lightnessSlider.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value).toFixed(2);
    if (value > 0) {
        lightnessValueSpan.textContent = `+${value}`;
    } else {
        lightnessValueSpan.textContent = value;
    }
});
