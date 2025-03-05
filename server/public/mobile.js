
/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 */

/**
 * Detects if the current device is mobile based on user agent and touch capabilities.
 * @returns {boolean} True if device is mobile, false otherwise
 */
function checkIfMobile() {
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    const isMobileDevice = mobileRegex.test(navigator.userAgent);
    
    const isChromeMobile = (
        navigator.userAgent.includes('Chrome') && 
        (
            ('maxTouchPoints' in navigator && navigator.maxTouchPoints > 0) ||
            ('ontouchstart' in window) ||
            window.matchMedia('(hover: none)').matches ||
            window.matchMedia('(pointer: coarse)').matches
        )
    );

    return isMobileDevice || isChromeMobile;
}

/**
 * Manages display orientation for mobile devices and desktop.
 * @returns {boolean} True if orientation is correct (landscape or desktop), false if portrait
 */
function handleOrientation() {
    const rotateMessage = document.querySelector('.rotate-message');
    const appSetup = document.getElementById('appSetup');
    
    if (checkIfMobile()) {
        if (window.matchMedia("(orientation: portrait)").matches) {
            // Portrait mode
            console.log('Portrait mode - showing rotate message');
            
            if (appSetup) appSetup.style.display = 'none';
            if (rotateMessage) {
                rotateMessage.style.display = 'flex';
                rotateMessage.style.position = 'fixed';
                rotateMessage.style.zIndex = '9999';
            }
            
            return false; // Indicate that the device is not in the correct orientation
        } else {
            // Landscape mode
            console.log('Landscape mode - showing app');
            
            if (rotateMessage) rotateMessage.style.display = 'none';
            if (appSetup) appSetup.style.display = 'block';
            
            return true; // Indicate that the device is in the correct orientation
        }
    } else {
        // Desktop version
        if (rotateMessage) rotateMessage.style.display = 'none';
        if (appSetup) appSetup.style.display = 'block';
        return true; // Always return true for desktop
    }
}

/**
 * Updates virtual button positions based on screen dimensions.
 */
function updateButtonPositions() {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // Update positions based on screen size
    document.querySelectorAll('.virtual-button').forEach(button => {
        // Add logic to adjust positions based on screen size
        const currentLeft = parseInt(button.style.left);
        const currentBottom = parseInt(button.style.bottom);
        
        // Adjust positions maintaining relative spacing
        if (currentLeft > screenWidth / 2) {
            button.style.left = `${screenWidth - (screenWidth - currentLeft)}px`;
        }
        if (currentBottom > screenHeight / 2) {
            button.style.bottom = `${screenHeight - (screenHeight - currentBottom)}px`;
        }
    });
}

/**
 * Stream controls interface for managing virtual control visibility.
 * @namespace
 */
const StreamControls = {
    hide: function() {
        const streamControlsContainer = document.getElementById('virtualStreamControlsContainer');
        if (streamControlsContainer) {
            streamControlsContainer.style.display = 'none';
            streamControlsContainer.style.visibility = 'hidden';
        }
    },

    show: function() {
        const streamControlsContainer = document.getElementById('virtualStreamControlsContainer');
        if (streamControlsContainer) {
            streamControlsContainer.style.display = 'flex';
            streamControlsContainer.style.visibility = 'visible';
            streamControlsContainer.offsetHeight; // Force reflow
        }
    },

    isHidden: function() {
        const container = document.getElementById('virtualStreamControlsContainer');
        return !container || 
               container.style.display === 'none' || 
               container.style.visibility === 'hidden' ||
               !container.style.display;
    }
};

/**
 * Initializes mobile hamburger menu and handles control visibility toggles.
 * Includes orientation change and resize handlers.
 */
function initializeHamburgerMenu() {
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const streamControlsContainer = document.getElementById('virtualStreamControlsContainer');
    
    // More reliable orientation check
    const checkOrientation = () => {
        if (window.screen && window.screen.orientation) {
            return !window.screen.orientation.type.includes('portrait');
        }
        return window.innerHeight < window.innerWidth;
    };

    console.log('Initializing hamburger menu...', {
        orientation: checkOrientation() ? 'landscape' : 'portrait',
        containerExists: !!streamControlsContainer,
        containerDisplay: streamControlsContainer?.style.display,
        containerVisibility: streamControlsContainer?.style.visibility
    });
    
    // Initially hide controls
    StreamControls.hide();
    
    if (checkIfMobile()) {
        console.log('Mobile device detected');
        hamburgerMenu.style.display = 'block';

        const toggleControls = function(e) {
            console.log('Toggle triggered by:', e.type);
            e.preventDefault();
            e.stopPropagation();
            
            // Use the more reliable orientation check
            const isLandscape = checkOrientation();
            
            if (!isLandscape) {
                console.log('Portrait mode - controls disabled');
                StreamControls.hide();
                return;
            }
            
            // Force refresh container reference
            const currentContainer = document.getElementById('virtualStreamControlsContainer');
            const isHidden = currentContainer?.style.display === 'none' || 
                        currentContainer?.style.visibility === 'hidden' ||
                        !currentContainer?.style.display;
            
            console.log('Toggle state:', {
                isHidden: isHidden,
                containerDisplay: currentContainer?.style.display,
                containerVisibility: currentContainer?.style.visibility
            });
            
            if (isHidden) {
                console.log('Showing controls');
                // Ensure controls are created if they don't exist
                if (!currentContainer || currentContainer.children.length === 0) {
                    createStreamControls();
                }
                // Use requestAnimationFrame to ensure DOM updates
                requestAnimationFrame(() => {
                    StreamControls.show();
                });
            } else {
                console.log('Hiding controls');
                requestAnimationFrame(() => {
                    StreamControls.hide();
                });
            }
        };

        // Remove any existing listeners
        hamburgerMenu.removeEventListener('touchstart', toggleControls);
        hamburgerMenu.removeEventListener('click', toggleControls);
        
        // Add new listeners with proper options
        hamburgerMenu.addEventListener('touchstart', toggleControls, { 
            passive: false,
            capture: true 
        });
        hamburgerMenu.addEventListener('click', toggleControls, {
            capture: true
        });
        
        // Add orientation change handler
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                const isLandscape = checkOrientation();
                if (!isLandscape) {
                    StreamControls.hide();
                } else if (streamControlsContainer?.style.visibility === 'visible') {
                    createStreamControls();
                    StreamControls.show();
                }
            }, 300);
        });

        // Add resize handler with debouncing
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                const isLandscape = checkOrientation();
                if (!isLandscape) {
                    StreamControls.hide();
                } else if (streamControlsContainer?.style.visibility === 'visible') {
                    createStreamControls();
                    StreamControls.show();
                }
            }, 250);
        });
    }
}

