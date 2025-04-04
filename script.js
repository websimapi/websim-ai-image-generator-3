import { html, render } from 'lit-html';

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('drawingCanvas');
    const ctx = canvas.getContext('2d');
    const clearBtn = document.getElementById('clearCanvas');
    const colorInput = document.getElementById('colorInput');
    const brushSizeInput = document.getElementById('brushSize');
    const brushSizeDisplay = document.getElementById('brushSizeDisplay');
    const opacityRange = document.getElementById('opacityRange');
    const opacityDisplay = document.getElementById('opacityDisplay');
    const undoButton = document.getElementById('undoButton');
    const brushTool = document.getElementById('brushTool');
    const eraserTool = document.getElementById('eraserTool');
    const fillTool = document.getElementById('fillTool');
    const colorPresets = document.querySelectorAll('.color-preset');
    const promptInput = document.getElementById('promptInput');
    const aiGeneratedImage = document.getElementById('aiGeneratedImage');
    const imageDescription = document.getElementById('imageDescription');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const generateButton = document.getElementById('generateButton');
    
    // Drawing state
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let drawingHistory = [];
    let currentStroke = [];
    let currentTool = 'brush';
    let strokeOpacity = 1;
    let paths = []; // Store vector paths
    
    // Set canvas size
    function resizeCanvas() {
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = 400;
        
        // If we resize, we need to redraw
        if (drawingHistory.length > 0) {
            redrawCanvas();
        } else {
            // Clear with white background
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    
    // Update tool displays
    function updateBrushSizeDisplay() {
        brushSizeDisplay.textContent = `${brushSizeInput.value}px`;
    }
    
    function updateOpacityDisplay() {
        opacityDisplay.textContent = `${Math.round(opacityRange.value * 100)}%`;
        strokeOpacity = parseFloat(opacityRange.value);
    }
    
    // Tool selection
    function setActiveTool(tool) {
        currentTool = tool;
        document.querySelectorAll('.tool-button[data-tool]').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`.tool-button[data-tool="${tool}"]`).classList.add('active');
        
        // Update cursor based on tool
        if (tool === 'eraser') {
            canvas.style.cursor = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'20\' height=\'20\' viewBox=\'0 0 24 24\'%3E%3Cpath fill=\'%23000000\' d=\'M16.24,3.56L21.19,8.5C21.97,9.29 21.97,10.55 21.19,11.34L12,20.53C10.44,22.09 7.91,22.09 6.34,20.53L2.81,17C2.03,16.21 2.03,14.95 2.81,14.16L13.41,3.56C14.2,2.78 15.46,2.78 16.24,3.56M4.22,15.58L7.76,19.11C8.54,19.9 9.8,19.9 10.59,19.11L14.12,15.58L9.17,10.63L4.22,15.58Z\'/%3E%3C/svg%3E") 0 16, auto';
        } else if (tool === 'fill') {
            canvas.style.cursor = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'20\' height=\'20\' viewBox=\'0 0 24 24\'%3E%3Cpath fill=\'%23000000\' d=\'M19,11.5C19,11.5 17,13.67 17,15A2,2 0 0,0 19,17A2,2 0 0,0 21,15C21,13.67 19,11.5 19,11.5M5.21,10L10,5.21L14.79,10M16.56,8.94L7.62,0L6.21,1.41L8.59,3.79L3.44,8.94C2.85,9.53 2.85,10.48 3.44,11.06L8.94,16.56C9.23,16.85 9.62,17 10,17C10.38,17 10.77,16.85 11.06,16.56L16.56,11.06C17.15,10.48 17.15,9.53 16.56,8.94Z\'/%3E%3C/svg%3E") 0 16, auto';
        } else {
            canvas.style.cursor = 'crosshair';
        }
    }
    
    // Drawing functions
    function startDrawing(e) {
        const { offsetX, offsetY } = getCoords(e);
        
        if (currentTool === 'fill') {
            floodFill(Math.floor(offsetX), Math.floor(offsetY), colorInput.value);
            return;
        }
        
        isDrawing = true;
        lastX = offsetX;
        lastY = offsetY;
        currentStroke = [];
        
        // Add a point to the current stroke
        currentStroke.push({
            x: offsetX,
            y: offsetY,
            color: currentTool === 'eraser' ? '#FFFFFF' : colorInput.value,
            size: brushSizeInput.value,
            opacity: currentTool === 'eraser' ? 1 : strokeOpacity,
            tool: currentTool
        });
    }
    
    function draw(e) {
        if (!isDrawing) return;
        
        const { offsetX, offsetY } = getCoords(e);
        
        // Draw line
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeStyle = currentTool === 'eraser' ? '#FFFFFF' : colorInput.value;
        ctx.lineWidth = brushSizeInput.value;
        ctx.globalAlpha = currentTool === 'eraser' ? 1 : strokeOpacity;
        
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(offsetX, offsetY);
        ctx.stroke();
        
        // Add to current stroke
        currentStroke.push({
            x: offsetX,
            y: offsetY,
            color: currentTool === 'eraser' ? '#FFFFFF' : colorInput.value,
            size: brushSizeInput.value,
            opacity: currentTool === 'eraser' ? 1 : strokeOpacity,
            tool: currentTool
        });
        
        lastX = offsetX;
        lastY = offsetY;
    }
    
    function stopDrawing() {
        if (!isDrawing) return;
        isDrawing = false;
        ctx.globalAlpha = 1;
        
        // Add the completed stroke to history
        if (currentStroke.length > 0) {
            drawingHistory.push([...currentStroke]);
        }
    }
    
    function undoLastStroke() {
        if (drawingHistory.length > 0) {
            drawingHistory.pop();
            redrawCanvas();
        }
    }
    
    function getCoords(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        if (e.type.includes('touch')) {
            const touch = e.touches[0] || e.changedTouches[0];
            return {
                offsetX: (touch.clientX - rect.left) * scaleX,
                offsetY: (touch.clientY - rect.top) * scaleY
            };
        } else {
            return {
                offsetX: (e.clientX - rect.left) * scaleX,
                offsetY: (e.clientY - rect.top) * scaleY
            };
        }
    }
    
    function clearCanvas() {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawingHistory = [];
        currentStroke = [];
        
        // Reset the generated image display
        aiGeneratedImage.style.display = 'none';
        document.querySelector('.placeholder').style.display = 'block';
        imageDescription.innerHTML = '<p>Draw on the canvas to see the AI interpretation</p>';
    }
    
    function redrawCanvas() {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Redraw all strokes
        drawingHistory.forEach(stroke => {
            if (stroke.length < 1) return;
            
            // Handle fill operations
            if (stroke[0].type === 'fill') {
                floodFill(stroke[0].x, stroke[0].y, stroke[0].color);
                return;
            }
            
            // Handle regular strokes
            if (stroke.length < 2) return;
            
            for (let i = 1; i < stroke.length; i++) {
                const current = stroke[i];
                const previous = stroke[i-1];
                
                ctx.lineJoin = 'round';
                ctx.lineCap = 'round';
                ctx.strokeStyle = current.color;
                ctx.lineWidth = current.size;
                ctx.globalAlpha = current.opacity;
                
                ctx.beginPath();
                ctx.moveTo(previous.x, previous.y);
                ctx.lineTo(current.x, current.y);
                ctx.stroke();
            }
        });
        
        ctx.globalAlpha = 1;
    }
    
    // New function for fill tool
    function floodFill(x, y, fillColor) {
        // Create a new path for this fill
        const newPath = {
            type: 'fill',
            x,
            y,
            color: fillColor,
            opacity: strokeOpacity
        };
        
        paths.push(newPath);
        drawingHistory.push([{
            type: 'fill',
            x,
            y,
            color: fillColor,
            opacity: strokeOpacity,
            tool: 'fill'
        }]);
        
        // Get image data for color matching
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Get the color at the target pixel
        const targetPos = (y * canvas.width + x) * 4;
        const targetR = data[targetPos];
        const targetG = data[targetPos + 1];
        const targetB = data[targetPos + 2];
        
        // Parse the fill color
        const parsedFillColor = parseColor(fillColor);
        
        // Set up the queue for flood fill
        const queue = [[x, y]];
        const visited = new Set();
        const key = `${x},${y}`;
        visited.add(key);
        
        // Tolerance for color matching
        const tolerance = 20;
        
        while (queue.length > 0) {
            const [px, py] = queue.shift();
            const pos = (py * canvas.width + px) * 4;
            
            // Set the pixel color
            data[pos] = parsedFillColor.r;
            data[pos + 1] = parsedFillColor.g;
            data[pos + 2] = parsedFillColor.b;
            data[pos + 3] = Math.round(255 * strokeOpacity);
            
            // Check neighboring pixels
            const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
            
            for (const [dx, dy] of directions) {
                const nx = px + dx;
                const ny = py + dy;
                
                // Check if within canvas bounds
                if (nx < 0 || nx >= canvas.width || ny < 0 || ny >= canvas.height) {
                    continue;
                }
                
                const nkey = `${nx},${ny}`;
                if (visited.has(nkey)) {
                    continue;
                }
                
                // Check if the color is similar to the target color
                const npos = (ny * canvas.width + nx) * 4;
                const nr = data[npos];
                const ng = data[npos + 1];
                const nb = data[npos + 2];
                
                if (
                    Math.abs(nr - targetR) <= tolerance &&
                    Math.abs(ng - targetG) <= tolerance &&
                    Math.abs(nb - targetB) <= tolerance
                ) {
                    queue.push([nx, ny]);
                    visited.add(nkey);
                }
            }
        }
        
        // Apply the filled image data
        ctx.putImageData(imageData, 0, 0);
    }
    
    // Helper function to parse color string to RGB
    function parseColor(colorStr) {
        // For hex color strings
        if (colorStr.startsWith('#')) {
            const r = parseInt(colorStr.slice(1, 3), 16);
            const g = parseInt(colorStr.slice(3, 5), 16);
            const b = parseInt(colorStr.slice(5, 7), 16);
            return { r, g, b };
        }
        
        // For rgb/rgba strings
        if (colorStr.startsWith('rgb')) {
            const match = colorStr.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
            if (match) {
                return {
                    r: parseInt(match[1]),
                    g: parseInt(match[2]),
                    b: parseInt(match[3])
                };
            }
        }
        
        // Default to black if parsing fails
        return { r: 0, g: 0, b: 0 };
    }
    
    // AI Analysis and Image Generation
    async function analyzeDrawingAndGenerateImage() {
        if (!promptInput.value.trim()) {
            alert('Please enter a prompt first!');
            return;
        }
        
        showLoadingOverlay();
        
        try {
            // First get canvas data URL
            const imageDataUrl = canvas.toDataURL('image/png');
            
            // Analyze the drawing
            const analysis = await analyzeDrawing(imageDataUrl);
            
            // Update description
            updateImageDescription(analysis);
            
            // Create enhanced prompt that prioritizes the user's input
            const enhancedPrompt = await createEnhancedPrompt(promptInput.value, analysis);
            
            // Generate image based on the enhanced prompt
            const generatedImageUrl = await generateImage(enhancedPrompt);
            
            // Display the generated image
            displayGeneratedImage(generatedImageUrl);
        } catch (error) {
            console.error('Error in image generation process:', error);
            imageDescription.innerHTML = `<p class="error">Error: ${error.message}</p>`;
        } finally {
            hideLoadingOverlay();
        }
    }
    
    async function analyzeDrawing(imageDataUrl) {
        const completion = await websim.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You analyze drawings and describe the visual elements in terms of colors, shapes, and compositions. Be concise but descriptive."
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Analyze this drawing and describe its main visual elements. Focus on colors, shapes, positioning, and overall style. Keep it brief."
                        },
                        {
                            type: "image_url",
                            image_url: { url: imageDataUrl }
                        }
                    ]
                }
            ]
        });
        
        return completion.content;
    }
    
    async function createEnhancedPrompt(userPrompt, drawingAnalysis) {
        const completion = await websim.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are an expert at creating image generation prompts. Your task is to combine a user's intention with style elements from their drawing. The user's intention/prompt should be the PRIMARY focus, with drawing elements only influencing style aspects like colors, composition, and mood. Create a detailed prompt that will generate a high-quality image matching the user's request but styled according to their drawing."
                },
                {
                    role: "user",
                    content: `User's prompt: "${userPrompt}"\n\nDrawing analysis: ${drawingAnalysis}\n\nCreate an enhanced image generation prompt that prioritizes the user's intention while incorporating style elements from their drawing. Focus on making a high-quality, detailed result.`
                }
            ]
        });
        
        return completion.content;
    }
    
    async function generateImage(enhancedPrompt) {
        const result = await websim.imageGen({
            prompt: enhancedPrompt,
            aspect_ratio: "1:1"
        });
        
        return result.url;
    }
    
    function updateImageDescription(analysisText) {
        const template = html`
            <h3>Drawing Analysis</h3>
            <p>${analysisText}</p>
        `;
        render(template, imageDescription);
    }
    
    function displayGeneratedImage(imageUrl) {
        document.querySelector('.placeholder').style.display = 'none';
        aiGeneratedImage.src = imageUrl;
        aiGeneratedImage.style.display = 'block';
    }
    
    function showLoadingOverlay() {
        loadingOverlay.style.display = 'flex';
    }
    
    function hideLoadingOverlay() {
        loadingOverlay.style.display = 'none';
    }
    
    // Event listeners
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    // Touch events for mobile
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        startDrawing(e);
    });
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        draw(e);
    });
    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        stopDrawing();
    });
    
    // Tool event listeners
    clearBtn.addEventListener('click', clearCanvas);
    undoButton.addEventListener('click', undoLastStroke);
    
    brushSizeInput.addEventListener('input', updateBrushSizeDisplay);
    opacityRange.addEventListener('input', updateOpacityDisplay);
    
    brushTool.addEventListener('click', () => setActiveTool('brush'));
    eraserTool.addEventListener('click', () => setActiveTool('eraser'));
    fillTool.addEventListener('click', () => setActiveTool('fill'));
    
    colorPresets.forEach(preset => {
        preset.addEventListener('click', () => {
            const color = preset.getAttribute('data-color');
            colorInput.value = color;
            setActiveTool('brush'); // Switch to brush when selecting a color
        });
    });
    
    // Add generate button event listener
    generateButton.addEventListener('click', () => {
        if (drawingHistory.length > 0) {
            analyzeDrawingAndGenerateImage();
        } else {
            alert('Please draw something on the canvas first!');
        }
    });
    
    // Initial state setup
    clearCanvas();
    updateBrushSizeDisplay();
    updateOpacityDisplay();
    setActiveTool('brush');
    
    // Generate image on Enter key in prompt input
    promptInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter' && drawingHistory.length > 0) {
            analyzeDrawingAndGenerateImage();
        }
    });
});