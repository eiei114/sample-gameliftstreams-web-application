
/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 */

/**
 * Controls Toggle Module
 * Manages visibility of virtual controls and stream container interaction.
 * 
 * Features:
 * - Toggles visibility of virtual buttons and joysticks
 * - Manages stream container touch events
 * - Persists visibility state in localStorage
 * - Provides global access to visibility control
 * 
 * Elements Required:
 * - #viewControlsButton: Toggle button element
 * - #virtualControlsContainer: Stream container element
 * - .virtual-button: Virtual button elements
 * - .virtual-joystick: Virtual joystick elements
 * 
 * @function updateControlsVisibility
 * @param {boolean} visible - Sets visibility state of controls
 * @global
 */

document.addEventListener('DOMContentLoaded', () => {
    const viewControlsButton = document.getElementById('viewControlsButton');
    const streamContainer = document.getElementById('virtualControlsContainer');
    
    // Only proceed if the button exists
    if (viewControlsButton) {
        let controlsVisible = true;

        // Function to update visibility of all controls
        function updateControlsVisibility(visible) {
            const displayValue = visible ? 'block' : 'none';
            
            // Use getElementsByClassName for live HTMLCollection
            const virtualButtons = document.getElementsByClassName('virtual-button');
            const virtualJoysticks = document.getElementsByClassName('virtual-joystick');
            
            Array.from(virtualButtons).forEach(button => {
                button.style.display = displayValue;
            });

            Array.from(virtualJoysticks).forEach(joystick => {
                joystick.style.display = displayValue;
            });

            // Toggle stream container touch events
            if (streamContainer) {
                streamContainer.style.pointerEvents = visible ? 'none' : 'auto';
                streamContainer.style.touchAction = visible ? 'none' : 'auto';
            }

            viewControlsButton.classList.toggle('controls-hidden', !visible);
            localStorage.setItem('controlsVisible', visible);
        }

        viewControlsButton.addEventListener('click', () => {
            controlsVisible = !controlsVisible;
            updateControlsVisibility(controlsVisible);
        });

        // Set initial state from localStorage
        const savedState = localStorage.getItem('controlsVisible');
        if (savedState !== null) {
            controlsVisible = savedState === 'true';
            updateControlsVisibility(controlsVisible);
        }

        // Make updateControlsVisibility available globally
        window.updateControlsVisibility = updateControlsVisibility;
    }
});
