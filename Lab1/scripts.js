const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Set actual size in memory (scaled to account for extra pixel density)
const dpr = window.devicePixelRatio || 1;
canvas.width = canvas.offsetWidth * dpr;
canvas.height = canvas.offsetHeight * dpr;

// Normalize coordinate system to use CSS pixels
ctx.scale(dpr, dpr);

// Coordinate plane variables
let scale = 40; // pixels per unit
let offsetX = canvas.width / (2 * dpr);
let offsetY = canvas.height / (2 * dpr);
let animationId = null;
let isAnimating = false;

// Array to store all triangles
let triangles = [];

// Draw the coordinate plane
function drawGrid() {
    ctx.clearRect(0, 0, canvas.width/dpr, canvas.height/dpr);
    
    // Draw grid lines
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    
    // Vertical lines
    for (let x = offsetX % scale; x < canvas.width/dpr; x += scale) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height/dpr);
        ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = offsetY % scale; y < canvas.height/dpr; y += scale) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width/dpr, y);
        ctx.stroke();
    }
    
    // Draw axes
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    
    // X-axis
    ctx.beginPath();
    ctx.moveTo(0, offsetY);
    ctx.lineTo(canvas.width/dpr, offsetY);
    ctx.stroke();
    
    // Y-axis
    ctx.beginPath();
    ctx.moveTo(offsetX, 0);
    ctx.lineTo(offsetX, canvas.height/dpr);
    ctx.stroke();
    
    // Draw numbers
    ctx.fillStyle = '#000';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // X-axis numbers
    for (let x = Math.ceil(-offsetX / scale) * scale; x < (canvas.width/dpr - offsetX); x += scale) {
        if (x === 0) continue;
        const xPos = offsetX + x;
        const value = x / scale;
        ctx.fillText(value.toString(), xPos, offsetY + 20);
    }
    
    // Y-axis numbers
    for (let y = Math.ceil(-offsetY / scale) * scale; y < (canvas.height/dpr - offsetY); y += scale) {
        if (y === 0) continue;
        const yPos = offsetY + y;
        const value = -y / scale;
        ctx.fillText(value.toString(), offsetX - 20, yPos);
    }
    
    // Draw origin label
    ctx.fillText('0', offsetX - 10, offsetY + 20);
    
    // Draw arrow heads
    drawArrow(canvas.width/dpr - 10, offsetY, 1, 0); // X-axis arrow
    drawArrow(offsetX, 10, 0, -1); // Y-axis arrow
    
    // X and Y labels
    ctx.fillText('X', canvas.width/dpr - 10, offsetY - 20);
    ctx.fillText('Y', offsetX + 20, 10);
    
    // Draw all triangles
    drawTriangles();
}

function drawArrow(x, y, dirX, dirY) {
    const arrowSize = 15;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    // Calculate the points for the arrow head based on direction
    if (Math.abs(dirX) > Math.abs(dirY)) {
        // Horizontal arrow (X-axis)
        const xOffset = dirX * arrowSize;
        ctx.lineTo(x - xOffset, y - arrowSize/2);
        ctx.lineTo(x - xOffset, y + arrowSize/2);
    } else {
        // Vertical arrow (Y-axis)
        const yOffset = dirY * arrowSize;
        ctx.lineTo(x - arrowSize/2, y - yOffset);
        ctx.lineTo(x + arrowSize/2, y - yOffset);
    }
    
    ctx.closePath();
    ctx.fill();
}

// Convert graph coordinates to canvas coordinates
function graphToCanvas(x, y) {
    return {
        x: offsetX + x * scale,
        y: offsetY - y * scale
    };
}

// Convert canvas coordinates to graph coordinates
function canvasToGraph(x, y) {
    return {
        x: (x - offsetX) / scale,
        y: (offsetY - y) / scale
    };
}

// Calculate the third vertex of an equilateral triangle
function calculateThirdVertex(x1, y1, x2, y2) {
    // Vector from point 1 to point 2
    const dx = x2 - x1;
    const dy = y2 - y1;
    
    // Rotate this vector by 60 degrees (π/3 radians) to get the third point
    // Rotation matrix for 60 degrees:
    // [ cos(60°)  -sin(60°) ] = [ 0.5  -0.866 ]
    // [ sin(60°)   cos(60°) ]   [ 0.866  0.5  ]
    
    const x3 = x1 + 0.5 * dx - Math.sqrt(3) / 2 * dy;
    const y3 = y1 + Math.sqrt(3) / 2 * dx + 0.5 * dy;
    
    return { x: x3, y: y3 };
}

// Draw all triangles
function drawTriangles() {
    triangles.forEach(triangle => {
        drawTriangle(triangle);
    });
}

// Draw a single triangle
function drawTriangle(triangle) {
    const { x1, y1, x2, y2, x3, y3, color, vertexStyle } = triangle;
    
    // Convert to canvas coordinates
    const p1 = graphToCanvas(x1, y1);
    const p2 = graphToCanvas(x2, y2);
    const p3 = graphToCanvas(x3, y3);
    
    // Draw triangle
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.closePath();
    
    ctx.fillStyle = color;
    ctx.fill();
    
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Draw vertices
    drawVertex(p1.x, p1.y, vertexStyle);
    drawVertex(p2.x, p2.y, vertexStyle);
    drawVertex(p3.x, p3.y, vertexStyle);
}

// Draw a vertex as a square or circle
function drawVertex(x, y, style) {
    const size = 6;
    ctx.fillStyle = '#000';
    
    if (style === 'square') {
        ctx.fillRect(x - size/2, y - size/2, size, size);
    } else { // circle
        ctx.beginPath();
        ctx.arc(x, y, size/2, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Handle dragging of the coordinate plane
function handleDrag(e) {
    if (isAnimating) return;
    
    const rect = canvas.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;
    const startOffsetX = offsetX;
    const startOffsetY = offsetY;
    
    function move(e) {
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        offsetX = startOffsetX + (x - startX);
        offsetY = startOffsetY + (y - startY);
        drawGrid();
    }
    
    function stopDrag() {
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', stopDrag);
    }
    
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', stopDrag);
}

// Add a new triangle
function addTriangle() {
    const x1 = parseFloat(document.getElementById('x1').value);
    const y1 = parseFloat(document.getElementById('y1').value);
    const x2 = parseFloat(document.getElementById('x2').value);
    const y2 = parseFloat(document.getElementById('y2').value);
    const color = document.getElementById('fillColor').value;
    const vertexStyle = document.getElementById('vertexStyle').value;
    
    if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) {
        alert('Please enter valid coordinates');
        return;
    }
    
    // Calculate third vertex
    const thirdVertex = calculateThirdVertex(x1, y1, x2, y2);
    
    // Add triangle to array
    const triangle = {
        x1, y1, x2, y2,
        x3: thirdVertex.x, y3: thirdVertex.y,
        color,
        vertexStyle
    };
    
    triangles.push(triangle);
    
    // Update the display
    updateTriangleList();
    drawGrid();
    
    // Clear the input fields
    document.getElementById('x1').value = '';
    document.getElementById('y1').value = '';
    document.getElementById('x2').value = '';
    document.getElementById('y2').value = '';
}

// Update the triangle list display
function updateTriangleList() {
    const list = document.getElementById('triangleList');
    list.innerHTML = '';
    
    triangles.forEach((triangle, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            Triangle ${index + 1}
            <div>
                <button class="delete-triangle" data-index="${index}">Delete</button>
            </div>
        `;
        list.appendChild(li);
    });
    
    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-triangle').forEach(button => {
        button.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            triangles.splice(index, 1);
            updateTriangleList();
            drawGrid();
        });
    });
}

// Animate the coordinate plane (example animation)
function animate() {
    // Example animation - rotate the coordinate system
    offsetX += 1;
    offsetY = canvas.height / (2 * dpr) + Math.sin(Date.now() / 1000) * 50;
    
    drawGrid();
    
    if (isAnimating) {
        animationId = requestAnimationFrame(animate);
    }
}

// Event listeners
canvas.addEventListener('mousedown', handleDrag);

document.getElementById('reset').addEventListener('click', function() {
    scale = 40;
    offsetX = canvas.width / (2 * dpr);
    offsetY = canvas.height / (2 * dpr);
    drawGrid();
});

document.getElementById('clear').addEventListener('click', function() {
    scale = 40;
    offsetX = canvas.width / (2 * dpr);
    offsetY = canvas.height / (2 * dpr);
    triangles = [];
    updateTriangleList();
    drawGrid();
});

document.getElementById('addTriangle').addEventListener('click', addTriangle);

// Initial draw when the page loads
window.addEventListener('load', function() {
    drawGrid();
    updateTriangleList();
});

