
/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 */

/**
 * @fileoverview Controller Layout Editor for Web Sharing Demo
 * @description Manages the layout and positioning of virtual game controller elements
 * @requires VirtualButton
 */

/**
 * Manages the layout and configuration of virtual game controller elements
 * @class ControllerLayoutEditor
 */
class ControllerLayoutEditor {
    /**
     * Initializes the controller layout editor
     * @constructor
     * @throws {Error} When required DOM elements are not found
     */
    constructor() {
        this.editMode = false;
        this.setupEditButton();
        // Increase delay to ensure controls are fully created
        setTimeout(() => this.loadSavedLayout(), 1000);
    }

    /**
     * Loads the saved controller layout from localStorage
     * @method loadSavedLayout
     * @returns {void}
     */
    loadSavedLayout() {
        const savedLayout = localStorage.getItem('controller-layout');
        if (savedLayout) {
            try {
                const layout = JSON.parse(savedLayout);
                console.log('Loading layout:', layout);
    
                // Load button positions
                layout.buttons?.forEach(buttonData => {
                    if (!buttonData.id) {
                        console.warn('Button data missing ID:', buttonData);
                        return;
                    }
                    const button = document.getElementById(buttonData.id);
                    if (button) {
                        console.log(`Positioning button ${buttonData.id}:`, {
                            x: buttonData.x,
                            y: buttonData.y
                        });
                        button.style.left = `${buttonData.x}vw`;
                        button.style.bottom = `${buttonData.y}vh`;
                    } else {
                        console.warn(`Button not found: ${buttonData.id}`);
                    }
                });
    
                // Load joystick positions
                layout.joysticks?.forEach(joystickData => {
                    if (!joystickData.id) {
                        console.warn('Joystick data missing ID:', joystickData);
                        return;
                    }
                    const joystick = document.getElementById(joystickData.id);
                    if (joystick) {
                        console.log(`Positioning joystick ${joystickData.id}:`, {
                            x: joystickData.x,
                            y: joystickData.y
                        });
                        joystick.style.left = `${joystickData.x}vw`;
                        joystick.style.bottom = `${joystickData.y}vh`;
                    } else {
                        console.warn(`Joystick not found: ${joystickData.id}`);
                    }
                });
            } catch (error) {
                console.error('Error loading saved layout:', error);
            }
        }
    }

    /**
     * Sets up the edit button and its event listeners
     * @method setupEditButton
     * @returns {void}
     */
    setupEditButton() {
        const editButton = document.getElementById('editControlsButton');
        if (editButton) {
            editButton.addEventListener('click', () => this.toggleEditMode());
        } else {
            console.warn('Edit controls button not found');
        }
    }

    /**
     * Scales all virtual buttons by a given factor
     * @method scaleButtons
     * @param {number} [scale=1.25] - Scale factor to apply to buttons
     * @returns {void}
     */
    scaleButtons(scale = 1.25) {
        const buttons = document.querySelectorAll('.virtual-button');
        buttons.forEach(buttonElement => {
            const virtualButton = VirtualButton.instances.get(buttonElement.id);
            if (virtualButton) {
                const currentTransform = buttonElement.style.transform;
                const currentScale = currentTransform ? parseFloat(currentTransform.match(/scale\((.*?)\)/)[1]) : 1;
                const newScale = currentScale * scale;
                buttonElement.style.transform = `scale(${newScale})`;
                
                // Update the virtual button's position with the new scale
                const options = {
                    x: parseFloat(buttonElement.style.left) * 24,
                    y: parseFloat(buttonElement.style.bottom) * 10.8
                };
                virtualButton.updatePosition(options);
            }
        });
    }

    /**
     * Toggles the edit mode state
     * @method toggleEditMode
     * @returns {void}
    */
    toggleEditMode() {
        console.log('Toggle edit mode called');
        this.editMode = !this.editMode;
        const editButton = document.getElementById('editControlsButton');
        if (editButton) {
            const buttonText = editButton.querySelector('span');
            if (buttonText) {
                buttonText.textContent = this.editMode ? 'Save Layout' : 'Edit Layout';
            }
            editButton.classList.toggle('editing', this.editMode);
        } else {
            console.warn('Edit controls button not found');
        }
    
        if (this.editMode) {
            this.enableEditMode();
        } else {
            this.disableEditMode();
        }
    }    

    /**
     * Enables edit mode and shows visual indicators
     * @method enableEditMode
     * @returns {void}
    */
    enableEditMode() {
        // Show edit mode indicator
        const indicator = document.createElement('div');
        indicator.id = 'editModeIndicator';
        indicator.innerHTML = `
            <div style="position: fixed; bottom: 20px; left: 50%; 
                        transform: translateX(-50%);
                        background: rgba(0,0,0,0.8); color: #fff; 
                        padding: 10px; border-radius: 4px; z-index: 10000;">
                Drag controllers to reposition them
            </div>
        `;
        document.body.appendChild(indicator);

        // Add visual feedback for draggable elements
        const controls = document.querySelectorAll('.virtual-button, .virtual-joystick');
        controls.forEach(control => {
            this.makeElementDraggable(control);
            // Add a subtle highlight to show elements are draggable
            control.style.boxShadow = '0 0 8px rgba(76, 175, 80, 0.5)';
        });

        // Add grid background to help with alignment
        document.body.style.backgroundImage = `
            linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)
        `;
        document.body.style.backgroundSize = '20px 20px';
    }

    /**
     * Makes an element draggable with touch and mouse support
     * @method makeElementDraggable
     * @param {HTMLElement} element - The element to make draggable
     * @returns {void}
     */
    makeElementDraggable(element) {
        element.style.cursor = 'move';
        
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;

        const dragStart = (e) => {
            if (e.target === element || element.contains(e.target)) {
                isDragging = true;
                if (e.type === 'touchstart') {
                    initialX = e.touches[0].clientX - element.offsetLeft;
                    initialY = e.touches[0].clientY - element.offsetTop;
                } else {
                    initialX = e.clientX - element.offsetLeft;
                    initialY = e.clientY - element.offsetTop;
                }
            }
        };

        const drag = (e) => {
            if (isDragging) {
                e.preventDefault();
                if (e.type === 'touchmove') {
                    currentX = e.touches[0].clientX - initialX;
                    currentY = e.touches[0].clientY - initialY;
                } else {
                    currentX = e.clientX - initialX;
                    currentY = e.clientY - initialY;
                }
    
                // Update position using vw and vh
                const vw = (currentX / window.innerWidth) * 100;
                const vh = ((window.innerHeight - currentY - element.offsetHeight) / window.innerHeight) * 100;
                element.style.left = `${vw}vw`;
                element.style.bottom = `${vh}vh`;
    
                // Optional: Show coordinates while dragging
                const coordsDisplay = document.getElementById('editModeIndicator');
                if (coordsDisplay) {
                    coordsDisplay.innerHTML = `
                        <div style="position: fixed; bottom: 20px; left: 50%; 
                                    transform: translateX(-50%);
                                    background: rgba(0,0,0,0.8); color: #fff; 
                                    padding: 10px; border-radius: 4px; z-index: 10000;">
                            Position - X: ${vw.toFixed(2)}vw, Y: ${vh.toFixed(2)}vh
                        </div>
                    `;
                }
            }
        };

        const dragEnd = () => {
            isDragging = false;
        };

        // Store the event listeners on the element so we can remove them later
        element._dragListeners = { dragStart, drag, dragEnd };

        // Add the event listeners for both mouse and touch events
        element.addEventListener('mousedown', dragStart);
        element.addEventListener('touchstart', dragStart);
        document.addEventListener('mousemove', drag);
        document.addEventListener('touchmove', drag);
        document.addEventListener('mouseup', dragEnd);
        document.addEventListener('touchend', dragEnd);
    }

    /**
     * Disables edit mode and removes visual indicators
     * @method disableEditMode
     * @returns {void}
     */
    disableEditMode() {
        const indicator = document.getElementById('editModeIndicator');
        if (indicator) indicator.remove();
    
        // Remove draggable functionality from all controls
        const controls = document.querySelectorAll('.virtual-button, .virtual-joystick');
        controls.forEach(control => {
            if (control._dragListeners) {
                control.removeEventListener('mousedown', control._dragListeners.dragStart);
                control.removeEventListener('touchstart', control._dragListeners.dragStart);
                document.removeEventListener('mousemove', control._dragListeners.drag);
                document.removeEventListener('touchmove', control._dragListeners.drag);
                document.removeEventListener('mouseup', control._dragListeners.dragEnd);
                document.removeEventListener('touchend', control._dragListeners.dragEnd);
                control.style.cursor = 'default';
                control.style.boxShadow = 'none';
                delete control._dragListeners;
            }
        });
    
        // Save positions to localStorage
        this.saveControllerLayout();
    
        // Remove grid background
        document.body.style.backgroundImage = 'none';
    
        // Show save confirmation
        this.showSaveConfirmation();
    }
    
    /**
     * Saves the current positions of virtual buttons and joysticks to localStorage.
     * Collects positions of elements with classes 'virtual-button' and 'virtual-joystick',
     * converts their positions from vw/vh units to numbers, and stores them as a JSON string
     * under the key 'controller-layout'.
     * 
     * @returns {void}
     * 
     * Storage format:
     * {
     *   buttons: [{ id: string, x: number, y: number }],
     *   joysticks: [{ id: string, x: number, y: number }]
     * }
     */
    saveControllerLayout() {
        const layout = {
            buttons: Array.from(document.querySelectorAll('.virtual-button')).map(button => {
                const x = parseFloat(button.style.left);
                const y = parseFloat(button.style.bottom);
                console.log('Saving button:', button.id, { left: x + 'vw', bottom: y + 'vh' });
                return {
                    id: button.id,
                    x: x,
                    y: y
                };
            }),
            joysticks: Array.from(document.querySelectorAll('.virtual-joystick')).map(joystick => {
                const x = parseFloat(joystick.style.left);
                const y = parseFloat(joystick.style.bottom);
                console.log('Saving joystick:', joystick.id, { left: x + 'vw', bottom: y + 'vh' });
                return {
                    id: joystick.id,
                    x: x,
                    y: y
                };
            })
        };
    
        localStorage.setItem('controller-layout', JSON.stringify(layout));
        console.log('Full layout saved:', layout);
    }      

    /**
     * Displays a temporary confirmation message when layout is saved.
     * Creates a floating notification at the bottom of the screen that 
     * automatically disappears after 2 seconds. Also logs the saved layout
     * to the console for debugging purposes.
     * 
     * @returns {void}
     */
    showSaveConfirmation() {
        const confirmation = document.createElement('div');
        confirmation.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            color: #4CAF50;
            padding: 15px 30px;
            border-radius: 4px;
            z-index: 10000;
        `;
        confirmation.textContent = '✓ Layout saved';
        document.body.appendChild(confirmation);

        // Log the current layout to console for debugging
        const savedLayout = localStorage.getItem('controller-layout');
        console.log('Saved layout in localStorage:', JSON.parse(savedLayout));

        setTimeout(() => confirmation.remove(), 2000);
    }
}

// Initialize the editor after the virtual controls are created
document.addEventListener('DOMContentLoaded', () => {
    // Wait for virtual controls to be created
    setTimeout(() => {
        window.controllerEditor = new ControllerLayoutEditor();
    }, 500);
});

// Make the ControllerLayoutEditor available globally
window.controllerEditor = new ControllerLayoutEditor();
