// Global variables
let canvas, ctx;
let gridSize = 40; // Size of a grid cell in pixels
let animationId = null;
let isAnimating = false;
let vertices = [];
let originalVertices = [];
let transformationMatrix = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1]
];
let animationPhase = 0; // 0: start -> min scale, 1: min scale -> original
let animationProgress = 0;
const animationSpeed = 0.01;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get canvas and set up context
    canvas = document.getElementById('coordinate-plane');
    ctx = canvas.getContext('2d');
    
    // Set canvas size
    resizeCanvas();
    
    // Event listeners
    document.getElementById('draw-btn').addEventListener('click', drawParallelogram);
    document.getElementById('start-btn').addEventListener('click', startAnimation);
    document.getElementById('stop-btn').addEventListener('click', stopAnimation);
    document.getElementById('grid-size').addEventListener('change', function() {
        gridSize = parseInt(this.value);
        drawCoordinatePlane();
        if (vertices.length) {
            drawShape(vertices);
        }
    });
    document.getElementById('save-matrix-btn').addEventListener('click', saveTransformationMatrix);
    document.getElementById('save-image-btn').addEventListener('click', saveImage);
    
    // Initial draw of coordinate plane
    drawCoordinatePlane();
    
    // Window resize event
    window.addEventListener('resize', resizeCanvas);
});

function resizeCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;
    drawCoordinatePlane();
    if (vertices.length) {
        drawShape(vertices);
    }
}

function drawCoordinatePlane() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set origin at the center of canvas
    const originX = Math.floor(canvas.width / 2);
    const originY = Math.floor(canvas.height / 2);
    
    // Draw grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    
    // Calculate grid boundaries
    const maxX = Math.ceil(canvas.width / gridSize);
    const maxY = Math.ceil(canvas.height / gridSize);
    
    // Draw vertical lines
    for (let i = -maxX; i <= maxX; i++) {
        ctx.beginPath();
        const x = originX + i * gridSize;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    // Draw horizontal lines
    for (let i = -maxY; i <= maxY; i++) {
        ctx.beginPath();
        const y = originY + i * gridSize;
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
    // Draw axes
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    
    // X-axis
    ctx.beginPath();
    ctx.moveTo(0, originY);
    ctx.lineTo(canvas.width, originY);
    ctx.stroke();
    
    // Y-axis
    ctx.beginPath();
    ctx.moveTo(originX, 0);
    ctx.lineTo(originX, canvas.height);
    ctx.stroke();
    
    // Draw axis arrows
    ctx.fillStyle = '#000000';
    
    // X-axis arrow
    ctx.beginPath();
    ctx.moveTo(canvas.width - 15, originY - 5);
    ctx.lineTo(canvas.width - 5, originY);
    ctx.lineTo(canvas.width - 15, originY + 5);
    ctx.fill();
    
    // Y-axis arrow
    ctx.beginPath();
    ctx.moveTo(originX - 5, 15);
    ctx.lineTo(originX, 5);
    ctx.lineTo(originX + 5, 15);
    ctx.fill();
    
    // Label axes
    ctx.font = '14px Arial';
    ctx.fillText('X', canvas.width - 20, originY - 10);
    ctx.fillText('Y', originX + 10, 20);
    
    // Add coordinates markers
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    // X-axis markers
    for (let i = -Math.floor(maxX / 2); i <= Math.floor(maxX / 2); i++) {
        if (i === 0) continue;
        const x = originX + i * gridSize;
        ctx.beginPath();
        ctx.moveTo(x, originY - 5);
        ctx.lineTo(x, originY + 5);
        ctx.stroke();
        ctx.fillText(i.toString(), x, originY + 6);
    }
    
    // Y-axis markers
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = -Math.floor(maxY / 2); i <= Math.floor(maxY / 2); i++) {
        if (i === 0) continue;
        const y = originY - i * gridSize;
        ctx.beginPath();
        ctx.moveTo(originX - 5, y);
        ctx.lineTo(originX + 5, y);
        ctx.stroke();
        ctx.fillText(i.toString(), originX - 6, y);
    }
    
    // Mark origin (0,0)
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText('0', originX - 6, originY + 6);
}

function drawParallelogram() {
    // Get input values
    const x1 = parseFloat(document.getElementById('x1').value);
    const y1 = parseFloat(document.getElementById('y1').value);
    const x2 = parseFloat(document.getElementById('x2').value);
    const y2 = parseFloat(document.getElementById('y2').value);
    const x3 = parseFloat(document.getElementById('x3').value);
    const y3 = parseFloat(document.getElementById('y3').value);
    const x4 = parseFloat(document.getElementById('x4').value);
    const y4 = parseFloat(document.getElementById('y4').value);
    
    // Validate inputs
    if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2) || 
        isNaN(x3) || isNaN(y3) || isNaN(x4) || isNaN(y4)) {
        showError('Будь ласка, введіть всі координати вершин.');
        return;
    }
    
    // Create array of vertices
    const newVertices = [
        [x1, y1, 1],
        [x2, y2, 1],
        [x3, y3, 1],
        [x4, y4, 1]
    ];
    
    // Check if the shape is a parallelogram
    if (!isParallelogram(newVertices)) {
        showError('Введені точки не утворюють паралелограм. Будь ласка, перевірте координати.');
        return;
    }
    
    // Clear previous error message
    showError('');
    
    // Set vertices and redraw
    vertices = newVertices;
    originalVertices = JSON.parse(JSON.stringify(vertices));
    
    // Reset animation
    animationPhase = 0;
    animationProgress = 0;
    
    // Redraw coordinate plane and shape
    drawCoordinatePlane();
    drawShape(vertices);
}

function isParallelogram(points) {
    // Check if opposite sides are parallel and equal
    // For a parallelogram, vectors AB and DC should be equal, and vectors BC and AD should be equal
    const vectors = [
        [points[1][0] - points[0][0], points[1][1] - points[0][1]],  // AB
        [points[2][0] - points[1][0], points[2][1] - points[1][1]],  // BC
        [points[3][0] - points[2][0], points[3][1] - points[2][1]],  // DC
        [points[0][0] - points[3][0], points[0][1] - points[3][1]]   // AD
    ];
    
    const tolerance = 0.001; // Tolerance for floating point comparisons
    
    // Check if AB = DC (opposite sides)
    const isABEqualDC = 
        Math.abs(vectors[0][0] - (-vectors[2][0])) < tolerance && 
        Math.abs(vectors[0][1] - (-vectors[2][1])) < tolerance;
    
    // Check if BC = AD (opposite sides)
    const isBCEqualAD = 
        Math.abs(vectors[1][0] - (-vectors[3][0])) < tolerance && 
        Math.abs(vectors[1][1] - (-vectors[3][1])) < tolerance;
    
    return isABEqualDC && isBCEqualAD;
}

function drawShape(shapeVertices) {
    const originX = Math.floor(canvas.width / 2);
    const originY = Math.floor(canvas.height / 2);
    
    ctx.beginPath();
    
    // Move to first vertex
    const startX = originX + shapeVertices[0][0] * gridSize;
    const startY = originY - shapeVertices[0][1] * gridSize;
    ctx.moveTo(startX, startY);
    
    // Draw lines to each vertex
    for (let i = 1; i < shapeVertices.length; i++) {
        const x = originX + shapeVertices[i][0] * gridSize;
        const y = originY - shapeVertices[i][1] * gridSize;
        ctx.lineTo(x, y);
    }
    
    // Close the path
    ctx.closePath();
    
    // Fill with semi-transparent color
    ctx.fillStyle = 'rgba(100, 150, 255, 0.5)';
    ctx.fill();
    
    // Draw outline
    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw vertices as points
    ctx.fillStyle = 'red';
    for (let i = 0; i < shapeVertices.length; i++) {
        const x = originX + shapeVertices[i][0] * gridSize;
        const y = originY - shapeVertices[i][1] * gridSize;
        
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Label vertices
        ctx.fillStyle = 'black';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(String.fromCharCode(65 + i), x, y - 5); // Label A, B, C, D
        ctx.fillStyle = 'red';
    }
}

function startAnimation() {
    if (vertices.length === 0) {
        showError('Спочатку намалюйте паралелограм.');
        return;
    }
    
    if (isAnimating) return;
    
    isAnimating = true;
    document.getElementById('start-btn').disabled = true;
    document.getElementById('stop-btn').disabled = false;
    
    // Start animation loop
    animateTransformation();
}

function stopAnimation() {
    if (!isAnimating) return;
    
    isAnimating = false;
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    
    document.getElementById('start-btn').disabled = false;
    document.getElementById('stop-btn').disabled = true;
}

function animateTransformation() {
    // Get the pivot point index
    const pivotIndex = parseInt(document.getElementById('pivot-point').value);
    // Get scale factor
    const scaleFactor = parseFloat(document.getElementById('scale-factor').value);
    
    if (isNaN(scaleFactor) || scaleFactor <= 1) {
        showError('Коефіцієнт зменшення має бути більшим за 1.');
        stopAnimation();
        return;
    }
    
    // Clear previous error message
    showError('');
    
    // Calculate minimum scale
    const minScale = 1 / scaleFactor;
    
    // Update animation progress
    if (animationPhase === 0) {
        // Зменшення масштабу і обертання
        animationProgress += animationSpeed;
        
        // Якщо досягнуто мінімального масштабу, переходимо до фази збільшення
        if (1 - (1 - minScale) * animationProgress <= minScale) {
            animationPhase = 1;
        }
    } else {
        // Збільшення масштабу і продовження обертання
        animationProgress += animationSpeed;
        
        // Якщо зробили повний оберт (360 градусів), починаємо спочатку
        if (animationProgress >= 2) { // 2 = повний оберт (0 до 2π)
            animationProgress = 0;
            animationPhase = 0;
        }
    }
    
    // Calculate current angle based on animation progress
    const maxAngle = 2 * Math.PI; // 360 degrees for full rotation
    const currentAngle = animationProgress * maxAngle;
    
    // Calculate current scale based on animation phase
    let currentScale;
    if (animationPhase === 0) {
        // Фаза зменшення масштабу
        currentScale = 1 - (1 - minScale) * animationProgress;
    } else {
        // Фаза збільшення масштабу
        const scaleProgress = (animationProgress - 1) / 1; // normalization to [0,1]
        currentScale = minScale + (1 - minScale) * scaleProgress;
    }
    
    // Get the pivot point
    const pivotPoint = originalVertices[pivotIndex];
    
    // Create transformation matrix for current state
    const currentMatrix = calculateTransformationMatrix(currentAngle, currentScale, pivotPoint);
    transformationMatrix = currentMatrix;
    
    // Apply transformation to get current vertices
    const currentVertices = applyTransformation(originalVertices, currentMatrix);
    
    // Redraw
    drawCoordinatePlane();
    drawShape(currentVertices);
    
    // Continue animation if still running
    if (isAnimating) {
        animationId = requestAnimationFrame(animateTransformation);
    }
}

function calculateTransformationMatrix(angle, scale, pivotPoint) {
    // Step 1: Translate to pivot point
    const tx = -pivotPoint[0];
    const ty = -pivotPoint[1];
    
    const translateToPivot = [
        [1, 0, tx],
        [0, 1, ty],
        [0, 0, 1]
    ];
    
    // Step 2: Rotate and scale
    // Changed rotation direction to clockwise (negative angle)
    const cosA = Math.cos(-angle);
    const sinA = Math.sin(-angle);
    
    const rotateAndScale = [
        [scale * cosA, -scale * sinA, 0],
        [scale * sinA, scale * cosA, 0],
        [0, 0, 1]
    ];
    
    // Step 3: Translate back from pivot point
    const translateBack = [
        [1, 0, pivotPoint[0]],
        [0, 1, pivotPoint[1]],
        [0, 0, 1]
    ];
    
    // Combine transformations: translateBack * rotateAndScale * translateToPivot
    const temp = multiplyMatrices(rotateAndScale, translateToPivot);
    return multiplyMatrices(translateBack, temp);
}

function multiplyMatrices(m1, m2) {
    const result = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0]
    ];
    
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            for (let k = 0; k < 3; k++) {
                result[i][j] += m1[i][k] * m2[k][j];
            }
        }
    }
    
    return result;
}

function applyTransformation(points, matrix) {
    const result = [];
    
    for (let i = 0; i < points.length; i++) {
        const x = points[i][0];
        const y = points[i][1];
        const z = points[i][2];
        
        const newX = matrix[0][0] * x + matrix[0][1] * y + matrix[0][2] * z;
        const newY = matrix[1][0] * x + matrix[1][1] * y + matrix[1][2] * z;
        const newZ = matrix[2][0] * x + matrix[2][1] * y + matrix[2][2] * z;
        
        result.push([newX, newY, newZ]);
    }
    
    return result;
}

function showError(message) {
    const errorElement = document.getElementById('error-message');
    errorElement.textContent = message;
}

function saveTransformationMatrix() {
    if (transformationMatrix.length === 0) {
        showError('Немає матриці для збереження. Спочатку запустіть анімацію.');
        return;
    }
    
    // Format the matrix as a string
    let matrixText = "Transformation Matrix:\n";
    for (let i = 0; i < transformationMatrix.length; i++) {
        matrixText += "[ ";
        for (let j = 0; j < transformationMatrix[i].length; j++) {
            matrixText += transformationMatrix[i][j].toFixed(4) + " ";
        }
        matrixText += "]\n";
    }
    
    // Create a blob and download
    const blob = new Blob([matrixText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transformation_matrix.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function saveImage() {
    if (vertices.length === 0) {
        showError('Спочатку намалюйте паралелограм.');
        return;
    }
    
    // Create a temporary canvas with only the original shape
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Draw coordinate plane
    const tempOriginX = Math.floor(tempCanvas.width / 2);
    const tempOriginY = Math.floor(tempCanvas.height / 2);
    
    // Draw grid and axes
    tempCtx.fillStyle = 'white';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    // Draw original shape only
    tempCtx.beginPath();
    
    // Move to first vertex
    const startX = tempOriginX + originalVertices[0][0] * gridSize;
    const startY = tempOriginY - originalVertices[0][1] * gridSize;
    tempCtx.moveTo(startX, startY);
    
    // Draw lines to each vertex
    for (let i = 1; i < originalVertices.length; i++) {
        const x = tempOriginX + originalVertices[i][0] * gridSize;
        const y = tempOriginY - originalVertices[i][1] * gridSize;
        tempCtx.lineTo(x, y);
    }
    
    // Close the path
    tempCtx.closePath();
    
    // Fill with color
    tempCtx.fillStyle = 'rgba(100, 150, 255, 0.9)';
    tempCtx.fill();
    
    // Draw outline
    tempCtx.strokeStyle = 'blue';
    tempCtx.lineWidth = 2;
    tempCtx.stroke();
    
    // Draw vertices
    tempCtx.fillStyle = 'red';
    for (let i = 0; i < originalVertices.length; i++) {
        const x = tempOriginX + originalVertices[i][0] * gridSize;
        const y = tempOriginY - originalVertices[i][1] * gridSize;
        
        tempCtx.beginPath();
        tempCtx.arc(x, y, 5, 0, Math.PI * 2);
        tempCtx.fill();
        
        // Label vertices
        tempCtx.fillStyle = 'black';
        tempCtx.font = '14px Arial';
        tempCtx.textAlign = 'center';
        tempCtx.textBaseline = 'bottom';
        tempCtx.fillText(String.fromCharCode(65 + i), x, y - 5);
        tempCtx.fillStyle = 'red';
    }
    
    // Create download link
    const imageURL = tempCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = imageURL;
    a.download = 'parallelogram.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}