/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 */

/**
 * @fileoverview Virtual gamepad joystick implementation for touch-based game controls
 * @version 1.0.0
 */

'use strict';

/**
 * @class VirtualGamePadJoystick
 * @description Creates and manages a virtual joystick for mobile game controls
 */

class VirtualGamePadJoystick {
    /**
     * @constructor
     * @param {Object} options - Joystick configuration
     * @param {string} [options.type] - Joystick type identifier
     * @param {number} options.x - X position in viewport width units
     * @param {number} options.y - Y position in viewport height units
     */
    constructor(options) {
        // Only initialize if mobile
        if (!this.checkIfMobile()) {
            return;
        }
    
        this.frameId = null;
        this._pointerId = null;
        this._mounted = false;
        this.dragging = false;
        this.coordinates = null;
        
        // Create container element
        this.element = document.createElement('div');
        this.element.className = 'virtual-joystick';
        
        this.element.id = `virtual-joystick-${options.type || ''}`;
        this.element.style.position = 'absolute';
        this.element.style.left = `${options.x}vw`;
        this.element.style.bottom = `${options.y}vh`;
    
        // Create base and stick elements
        this._baseElement = document.createElement('div');
        this._baseElement.className = 'joystick-base';
    
        this._stickElement = document.createElement('div');
        this._stickElement.className = 'joystick-stick';
    
        // Force initial position
        this._stickElement.style.transform = 'translate(-50%, -50%)';
        this._stickElement.style.left = '50%';
        this._stickElement.style.top = '50%';
    
        // Create a wrapper for the stick to handle movements
        this._stickWrapper = document.createElement('div');
        this._stickWrapper.className = 'joystick-stick-wrapper';
        this._stickWrapper.style.position = 'absolute';
        this._stickWrapper.style.width = '100%';
        this._stickWrapper.style.height = '100%';
        this._stickWrapper.style.transform = 'translate(0, 0)';
    
        // Append elements
        this._stickWrapper.appendChild(this._stickElement);
        this._baseElement.appendChild(this._stickWrapper);
        this.element.appendChild(this._baseElement);
    
        // Bind methods
        this._pointerDown = this._pointerDown.bind(this);
        this._pointerMove = this._pointerMove.bind(this);
        this._pointerUp = this._pointerUp.bind(this);
    
        // Add event listeners
        this._stickElement.addEventListener('pointerdown', this._pointerDown);
    
        // Set initial visibility based on stored state
        const controlsVisible = localStorage.getItem('controlsVisible');
        if (controlsVisible !== null) {
            this.element.style.display = controlsVisible === 'true' ? 'block' : 'none';
        }
        
        // Make sure the widgetsContainer exists and is properly positioned
        const virtualControlsContainer = document.getElementById('virtualControlsContainer');
        if (virtualControlsContainer) {
            // Ensure virtualControlsContainer has the correct CSS
            virtualControlsContainer.style.position = 'absolute';
            virtualControlsContainer.style.left = '0';
            virtualControlsContainer.style.right = '0';
            virtualControlsContainer.style.top = '0';
            virtualControlsContainer.style.bottom = '0';
            virtualControlsContainer.style.pointerEvents = 'none';
            virtualControlsContainer.style.zIndex = '9999';
            
            virtualControlsContainer.appendChild(this.element);
            console.log('Joystick added to widgets container');
        } else {
            console.error('virtualControlsContainer not found');
        }
    
        this._mounted = true;
        this.options = options;
    
        // Add CSS for the joystick if not already added
        if (!document.getElementById('joystickStyles')) {
            this._addJoystickStyles();
        }
    }
    
    /**
     * @method checkIfMobile
     * @returns {boolean} True if device is mobile
     */
    checkIfMobile() {
        return window.innerWidth <= 768 || /Mobi|Android|iPhone/i.test(navigator.userAgent);
    }

    /**
     * @private
     * @method _addJoystickStyles
     * @description Adds required CSS styles for joystick
     */
    _addJoystickStyles() {
        const style = document.createElement('style');
        style.id = 'joystickStyles';
        style.textContent = `
            .joystick-stick {
                position: relative;
                transform: translate(0px, 0px);
                transition: transform 0.1s ease-out;
                will-change: transform;
            }
            .joystick-stick.dragging {
                transition: none;
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * @private
     * @method _updatePos
     * @param {Object} coordinates - Position coordinates
     */
    _updatePos(coordinates) {
        this.frameId = window.requestAnimationFrame(() => {
            if (this._mounted && this._stickWrapper) {
                this.coordinates = coordinates;
                
                // Update wrapper position
                this._stickWrapper.style.transform = 
                    `translate(${coordinates.relativeX}px, ${coordinates.relativeY}px)`;
    
                // Handle directional input
                this._handleDirectionalInput(coordinates.direction, coordinates.distance);
    
                // Call move callback if provided
                if (this.options.onMove) {
                    this.options.onMove({
                        type: "move",
                        x: (coordinates.relativeX * 2) / this._parentRect.width,
                        y: -((coordinates.relativeY * 2) / this._parentRect.height),
                        direction: coordinates.direction,
                        distance: coordinates.distance
                    });
                }
            }
        });
    }
    
    /**
     * @private
     * @method _handleDirectionalInput
     * @param {string} direction - Movement direction
     * @param {number} distance - Movement distance
     */
    _handleDirectionalInput(direction, distance) {
        // Only trigger if the joystick is moved significantly
        if (distance < 20) return;
    
        // Define which keys to simulate based on direction
        const keyMapping = {
            'FORWARD': 'ArrowUp',
            'BACKWARD': 'ArrowDown',
            'LEFT': 'ArrowLeft',
            'RIGHT': 'ArrowRight'
        };
    
        // Release all keys first
        Object.values(keyMapping).forEach(key => {
            const keyUpEvent = new KeyboardEvent('keyup', {
                key: key,
                code: key,
                bubbles: true,
                cancelable: true
            });
            document.getElementById('streamVideoElement').dispatchEvent(keyUpEvent);
        });
    
        // Press the new direction key
        const keyCode = keyMapping[direction];
        if (keyCode) {
            const keyDownEvent = new KeyboardEvent('keydown', {
                key: keyCode,
                code: keyCode,
                bubbles: true,
                cancelable: true
            });
            document.getElementById('streamVideoElement').dispatchEvent(keyDownEvent);
        }
    }

    /**
     * @private
     * @method _pointerDown
     * @param {PointerEvent} e - Pointer event
     */
    _pointerDown(e) {
        this._parentRect = this._baseElement.getBoundingClientRect();
        this.dragging = true;

        window.addEventListener('pointerup', this._pointerUp);
        window.addEventListener('pointermove', this._pointerMove);
        this._pointerId = e.pointerId;
        this._stickElement.setPointerCapture(e.pointerId);

        // Call start callback if provided
        if (this.options.onStart) {
            this.options.onStart({
                type: "start"
            });
        }
    }

    /**
     * @private
     * @method _pointerUp
     * @param {PointerEvent} event - Pointer event
     */
    _pointerUp = (event) => {
        if (event.pointerId !== this._pointerId) return;
        
        this.dragging = false;
        
        if (this.frameId) {
            window.cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }

         // Reset wrapper position
        if (this._stickWrapper) {
            this._stickWrapper.style.transform = 'translate(0, 0)';
        }
        
        // Reset stick position
        if (this._stickElement) {
            this._stickElement.classList.remove('moving');
            this._stickElement.style.setProperty('--move-x', '0px');
            this._stickElement.style.setProperty('--move-y', '0px');
        }
    
        this.coordinates = {
            relativeX: 0,
            relativeY: 0,
            direction: null,
            distance: 0
        };
    
        window.removeEventListener('pointerup', this._pointerUp);
        window.removeEventListener('pointermove', this._pointerMove);
        this._pointerId = null;
    
        // Release directional keys
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].forEach(key => {
            const keyEvent = new KeyboardEvent('keyup', {
                key: key,
                code: key,
                bubbles: true,
                cancelable: true
            });
            document.getElementById('streamVideoElement').dispatchEvent(keyEvent);
        });
    
        if (this.options.onStop) {
            this.options.onStop({
                type: "stop"
            });
        }
    
        if (this.options.onMove) {
            this.options.onMove({
                type: "move",
                x: 0,
                y: 0,
                direction: null,
                distance: 0
            });
        }
    }  

    /**
     * @private
     * @method _getDirection
     * @param {number} atan2 - Angle in radians
     * @returns {string} Direction ('FORWARD'|'RIGHT'|'LEFT'|'BACKWARD')
     * @description Converts angle to cardinal direction based on predefined boundaries
     */
    _getDirection(atan2) {
        const TopRight = 2.35619449;
        const TopLeft = -2.35619449;
        const BottomRight = 0.785398163;
        const BottomLeft = -0.785398163;

        if (atan2 > TopRight || atan2 < TopLeft) {
            return "FORWARD";
        } else if (atan2 < TopRight && atan2 > BottomRight) {
            return "RIGHT";
        } else if (atan2 < BottomLeft) {
            return "LEFT";
        }
        return "BACKWARD";
    }

    /**
     * @private
     * @method _distance
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {number} Euclidean distance
     * @description Calculates distance from origin to point (x,y)
     */
    _distance(x, y) {
        return Math.hypot(x, y);
    }

    /**
     * @private
     * @method _distanceToPercentile
     * @param {number} distance - Raw distance value
     * @returns {number} Percentage value (0-100)
     * @description Converts distance to percentage based on parent container size
     */
    _distanceToPercentile(distance) {
        const percentageBaseSize = (distance / (this._parentRect.width / 2)) * 100;
        return Math.min(percentageBaseSize, 100);
    }

    /**
     * @private
     * @method _pointerMove
     * @param {PointerEvent} event - Pointer movement event
     * @description Handles pointer movement and updates joystick position/direction
     * @fires KeyboardEvent When direction changes
     */
    _pointerMove = (event) => {
        event.preventDefault();
        if (this.dragging) {
            if (event.pointerId !== this._pointerId) return;
    
            const absoluteX = event.clientX;
            const absoluteY = event.clientY;
            let relativeX = absoluteX - this._parentRect.left - this._parentRect.width / 2;
            let relativeY = absoluteY - this._parentRect.top - this._parentRect.height / 2;
            
            const dist = this._distance(relativeX, relativeY);
            let radius = this._parentRect.width / 2;
            
            if (dist > radius) {
                const scale = radius / dist;
                relativeX *= scale;
                relativeY *= scale;
            }
    
            const atan2 = Math.atan2(relativeX, relativeY);
            const newDirection = this._getDirection(atan2);
    
            // Update position and immediately trigger directional input
            this._updatePos({
                relativeX,
                relativeY,
                distance: this._distanceToPercentile(dist),
                direction: newDirection
            });
    
            // Release previous direction keys if direction has changed
            if (this.coordinates && this.coordinates.direction !== newDirection) {
                ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].forEach(key => {
                    const keyEvent = new KeyboardEvent('keyup', {
                        key: key,
                        code: key,
                        bubbles: true,
                        cancelable: true
                    });
                    document.getElementById('streamVideoElement').dispatchEvent(keyEvent);
                });
            }
        }
    }

    /**
     * @method destroy
     * @description Cleans up joystick instance and removes from DOM
     * @returns {void}
     */
    destroy() {
        this._mounted = false;
        if (this.frameId !== null) {
            window.cancelAnimationFrame(this.frameId);
        }
        this.element.remove();
    }
}

/**
 * @function initJoysticks
 * @description Initializes dual virtual joysticks for game control
 * @returns {void}
 * 
 * @example
 * // Creates two joysticks with default event handlers
 * initJoysticks();
 */
function initJoysticks() {
    // Create left joystick
    const leftJoystick = new VirtualGamePadJoystick({
        x: 1.3,
        y: 2.3,
        type: 'left',
        onMove: (event) => console.log('Left joystick move:', event),
        onStart: (event) => console.log('Left joystick start:', event),
        onStop: (event) => console.log('Left joystick stop:', event)
    });

    // Create right joystick
    const rightJoystick = new VirtualGamePadJoystick({
        x: 84.8,
        y: 2.9,
        type: 'right',
        onMove: (event) => console.log('Right joystick move:', event),
        onStart: (event) => console.log('Right joystick start:', event),
        onStop: (event) => console.log('Right joystick stop:', event)
    });
}

/**
 * @typedef {Object} JoystickConfig
 * @property {number} x - X position in viewport width percentage
 * @property {number} y - Y position in viewport height percentage
 * @property {'left'|'right'} type - Joystick type identifier
 * @property {function} onMove - Movement event handler
 * @property {function} onStart - Touch start event handler
 * @property {function} onStop - Touch end event handler
 */

// Auto-initialization
/**
 * @description Initializes joysticks when DOM is ready
 * @listens {Event} DOMContentLoaded
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initJoysticks);
} else {
    initJoysticks();
}

