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
        } else {
            canvas.style.cursor = 'crosshair';
        }
    }
    
    // Drawing functions
    function startDrawing(e) {
        isDrawing = true;
        const { offsetX, offsetY } = getCoords(e);
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