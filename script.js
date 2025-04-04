import { html, render } from 'lit-html';

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('drawingCanvas');
    const ctx = canvas.getContext('2d');
    const clearBtn = document.getElementById('clearCanvas');
    const colorInput = document.getElementById('colorInput');
    const brushSizeInput = document.getElementById('brushSize');
    const promptInput = document.getElementById('promptInput');
    const aiGeneratedImage = document.getElementById('aiGeneratedImage');
    const imageDescription = document.getElementById('imageDescription');
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    // Drawing state
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let drawingHistory = [];
    let currentStroke = [];
    
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
            color: colorInput.value,
            size: brushSizeInput.value
        });
    }
    
    function draw(e) {
        if (!isDrawing) return;
        
        const { offsetX, offsetY } = getCoords(e);
        
        // Draw line
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeStyle = colorInput.value;
        ctx.lineWidth = brushSizeInput.value;
        
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(offsetX, offsetY);
        ctx.stroke();
        
        // Add to current stroke
        currentStroke.push({
            x: offsetX,
            y: offsetY,
            color: colorInput.value,
            size: brushSizeInput.value
        });
        
        lastX = offsetX;
        lastY = offsetY;
    }
    
    function stopDrawing() {
        if (!isDrawing) return;
        isDrawing = false;
        
        // Add the completed stroke to history
        if (currentStroke.length > 0) {
            drawingHistory.push([...currentStroke]);
            analyzeDrawingAndGenerateImage();
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
                
                ctx.beginPath();
                ctx.moveTo(previous.x, previous.y);
                ctx.lineTo(current.x, current.y);
                ctx.stroke();
            }
        });
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
            
            // Generate image based on analysis and prompt
            const generatedImageUrl = await generateImage(promptInput.value, analysis);
            
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
    
    async function generateImage(prompt, drawingAnalysis) {
        // More weight on the prompt, use drawing analysis only for style inspiration
        const enhancedPrompt = `High-quality detailed rendering of "${prompt}". Use these style elements for inspiration: ${drawingAnalysis}`;
        
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
    
    clearBtn.addEventListener('click', clearCanvas);
    
    // Initial state setup
    clearCanvas();
    
    // Generate image when prompt changes and there's existing drawing
    promptInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter' && drawingHistory.length > 0) {
            analyzeDrawingAndGenerateImage();
        }
    });
});