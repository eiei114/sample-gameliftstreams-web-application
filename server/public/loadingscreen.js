
/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 */

/**
 * @fileoverview Stream Loading UI Page
 * @version 1.0.0
 */

/** @const {number} Maintains 16:9 display ratio */
const aspectRatio = 16/9;

let loadingFlag = false;
let startTime = new Date();
let animationFrameId = null;

/**
 * Initializes and displays the loading screen canvas with touch/click interaction.
 * @throws {Error} If canvas element or context is invalid
 */
function LoadingScreenStart() {
    try {
        const canvas = document.getElementById("loadingScreenCanvas");
        if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
            throw new Error("Invalid canvas element");
        }

        // Validate canvas context
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            throw new Error("Unable to get canvas context");
        }

        startTime = new Date();
        loadingFlag = true;
        
        // Sanitize style values
        const safeStyles = {
            width: "100%",
            height: "100%",
            aspectRatio: aspectRatio.toString(),
            display: "block",
            position: "relative",
            zIndex: "4",
            pointerEvents: "auto"
        };

        // Apply sanitized styles
        Object.assign(canvas.style, safeStyles);

        // Add event listeners with error handling
        addEventListeners(canvas);

        animationFrameId = window.requestAnimationFrame(LoadingScreenAnimation);
    } catch (error) {
        console.error('Loading screen initialization failed:', error);
        // Ensure clean state on error
        loadingFlag = false;
        animationFrameId = null;
    }
}

/**
 * Attaches touch and mouse event listeners to the loading screen canvas.
 * @param {HTMLCanvasElement} canvas - The loading screen canvas element
 * @private
 */
function addEventListeners(canvas) {
    if (!canvas) return;

    const boundHandleInteraction = handleInteraction.bind(null);
    
    canvas.addEventListener('touchstart', boundHandleInteraction, { 
        passive: false,
        capture: true // Ensure event capture
    });
    
    canvas.addEventListener('mousedown', boundHandleInteraction, {
        capture: true
    });

    // Store references for cleanup
    canvas._boundHandleInteraction = boundHandleInteraction;
}

/**
 * Handles touch/click interactions within the loading screen canvas.
 * @param {Event} event - Mouse or touch event
 * @private
 */
function handleInteraction(event) {
    if (!event || !event.target) return;
    
    event.preventDefault();
    
    const canvas = event.target;
    if (!(canvas instanceof HTMLCanvasElement)) return;

    const rect = canvas.getBoundingClientRect();
    if (!rect) return;
    
    // Sanitize coordinates
    let x = 0, y = 0;
    
    try {
        if (event.type === 'touchstart' && event.touches?.[0]) {
            x = Math.max(0, event.touches[0].clientX - rect.left);
            y = Math.max(0, event.touches[0].clientY - rect.top);
        } else {
            x = Math.max(0, event.clientX - rect.left);
            y = Math.max(0, event.clientY - rect.top);
        }

        // Validate coordinates are within bounds
        x = Math.min(x, canvas.width);
        y = Math.min(y, canvas.height);

        const centerX = canvas.width / 2;
        const centerY = canvas.height * 0.4;
        const radius = Math.min(canvas.width, canvas.height) / 2;

        const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));

        if (distance <= radius) {
            console.log("Interaction within the touch area");
        }
    } catch (error) {
        console.error('Error handling interaction:', error);
    }
}

/**
 * Animates the loading screen with pulsing "Tap Here" text.
 * @private
 */
function LoadingScreenAnimation() {
    try {
        const canvas = document.getElementById("loadingScreenCanvas");
        if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
            throw new Error("Invalid canvas element");
        }

        const ctx = canvas.getContext("2d");
        if (!ctx) {
            throw new Error("Unable to get canvas context");
        }

        // Sanitize dimensions
        canvas.width = Math.min(Math.max(window.innerWidth, 300), 4096); // Add upper limit
        canvas.height = Math.min(Math.max(canvas.width / aspectRatio, 200), 2160);

        // Clear canvas before drawing
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Secure drawing operations
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Sanitize font size
        const fontSize = Math.min(Math.max(canvas.width / 12, 32), 96);
        ctx.font = `${fontSize}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Validate timing calculations
        const currentTime = new Date();
        const elapsedTime = Math.max(0, currentTime - startTime);
        const pulsePeriodMs = 3000;
        const triangleWave = Math.abs((elapsedTime % pulsePeriodMs) - pulsePeriodMs / 2) / pulsePeriodMs;
        
        ctx.globalAlpha = Math.min(Math.max(0.2 + 2.0 * triangleWave, 0), 1.0);

        // Secure text rendering
        ctx.fillStyle = "white";
        const text = "Tap Here";
        ctx.fillText(text, canvas.width / 2, canvas.height * 0.4);

        // Touch area indicator
        ctx.globalAlpha = 0.1;
        ctx.beginPath();
        const touchRadius = Math.min(canvas.width, canvas.height) / 2;
        ctx.arc(canvas.width / 2, canvas.height * 0.4, touchRadius, 0, 2 * Math.PI);
        ctx.fill();

        if (loadingFlag) {
            animationFrameId = window.requestAnimationFrame(LoadingScreenAnimation);
        }
    } catch (error) {
        console.error('Animation error:', error);
        LoadingScreenStop();
    }
}

/**
 * Stops the loading screen animation and cleans up resources.
 */
function LoadingScreenStop() {
    try {
        loadingFlag = false;
        
        if (animationFrameId) {
            window.cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }

        const canvas = document.getElementById("loadingScreenCanvas");
        if (canvas) {
            // Clean up event listeners
            if (canvas._boundHandleInteraction) {
                canvas.removeEventListener('touchstart', canvas._boundHandleInteraction, true);
                canvas.removeEventListener('mousedown', canvas._boundHandleInteraction, true);
                delete canvas._boundHandleInteraction;
            }

            // Clear canvas
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }

            canvas.style.display = "none";
        }
    } catch (error) {
        console.error('Error stopping loading screen:', error);
    }
}

// Export functions if using modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        LoadingScreenStart,
        LoadingScreenStop
    };
}