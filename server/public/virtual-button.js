/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 */

/**
 * @fileoverview Virtual Button implementation for game controls
 */

/**
 * Represents a virtual button control element
 * @class VirtualButton
 */

class VirtualButton {
    /** @static {Map} Store of button instances */
    static instances = new Map();

    /**
     * Creates a new virtual button
     * @param {Object} options - Button configuration options
     * @param {string} options.svgName - Name of the SVG to use
     * @param {string} options.direction - Button direction ('up', 'down', 'left', 'right')
     * @param {number} options.x - X position of button
     * @param {number} options.y - Y position of button
     */
    constructor(options) {
        this.options = options;
        this.element = document.createElement('div');
        this.element.className = 'virtual-button';
        this.element.id = `virtual-${options.svgName}`;
        
        this.controlsEnabled = true;
        this.isToggling = false;

        this.isPressed = false;
        this.moveInterval = null;
        this.direction = options.direction; // 'up', 'down', 'left', 'right'
        
        const svgString = this.getSVGString(options.svgName);
        this.element.innerHTML = svgString;
        // Add virtual gamepad support
        if (!window.virtualGamepad) {
            window.virtualGamepad = new VirtualGamepad();
            const originalGetGamepads = navigator.getGamepads.bind(navigator);
            navigator.getGamepads = function() {
                const gamepads = originalGetGamepads();
                gamepads[0] = window.virtualGamepad;
                return gamepads;
            };
        }

        // Map button names to gamepad button indices
        this.buttonMapping = {
            'buttonA': 0,
            'buttonB': 1,
            'buttonX': 2,
            'buttonY': 3,
            'dPadUp': 12,
            'dPadDown': 13,
            'dPadLeft': 14,
            'dPadRight': 15
        };

        this.buttonIndex = this.buttonMapping[options.svgName];

        // Set initial visibility based on stored state
        const controlsVisible = localStorage.getItem('controlsVisible');
        if (controlsVisible !== null) {
            this.element.style.display = controlsVisible === 'true' ? 'block' : 'none';
        }


        // Event handlers
        this.element.addEventListener('touchmove', (e) => {
            if (!window.controllerEditor || !window.controllerEditor.editMode) {
                e.preventDefault();
                this.handleMove(e);
            }
        }, false);

        this.element.addEventListener('mousemove', (e) => {
            if (!window.controllerEditor || !window.controllerEditor.editMode) {
                e.preventDefault();
                if (this.isPressed) {
                    this.handleMove(e);
                }
            }
        }, false);

        this.element.addEventListener('touchstart', (e) => {
            if (!window.controllerEditor || !window.controllerEditor.editMode) {
                e.preventDefault();
            }
            this.handleTouchStart(e);
        }, false);
        
        this.element.addEventListener('touchend', (e) => {
            if (!window.controllerEditor || !window.controllerEditor.editMode) {
                e.preventDefault();
            }
            this.handleTouchEnd(e);
        }, false);

        this.element.addEventListener('mousedown', (e) => {
            if (!window.controllerEditor || !window.controllerEditor.editMode) {
                e.preventDefault();
            }
            this.handleTouchStart(e);
        }, false);

        this.element.addEventListener('mouseup', (e) => {
            if (!window.controllerEditor || !window.controllerEditor.editMode) {
                e.preventDefault();
            }
            this.handleTouchEnd(e);
        }, false);
        
        const virtualControlsContainer = document.getElementById('virtualControlsContainer');
        if (virtualControlsContainer) {
            virtualControlsContainer.appendChild(this.element);
        }

        VirtualButton.instances.set(this.element.id, this);

        this.updatePosition(options);
    }

    /**
     * Updates the button's position
     * @param {Object} options - Position options
     * @param {number} options.x - X position in viewport width units
     * @param {number} options.y - Y position in viewport height units
     */
    updatePosition(options) {
        const x = options.x;
        const y = options.y;
        
        this.element.style.left = `${x}vw`;
        this.element.style.bottom = `${y}vh`;
        
        // If you're still using a scale factor, you can keep it:
        const scaleFactor = Math.min(window.innerWidth / 2400, window.innerHeight / 1080);
        this.element.style.transform = `scale(${scaleFactor * 1.25})`; // 1.25 for 25% larger
    }

    /**
     * Gets SVG string for button
     * @param {string} buttonName - Name of the button
     * @returns {string} SVG markup
     */
    getSVGString(buttonName) {
        return `
            <div class="button-container">
                <div class="button-svg">
                    ${this.getButtonSVGContent(buttonName)}
                </div>
            </div>
        `;
    }

    /**
     * Gets SVG content for specific button type
     * @param {string} buttonName - Name of the button
     * @returns {string} SVG content
     */
    getButtonSVGContent(buttonName, isPressed) {
        // Object containing your custom SVG code for each button
        const customSVGs = {
            buttonA: `
                <svg width="81" height="81" viewBox="0 0 81 81" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="40.3496" cy="40.1094" r="37.5" fill="#FFFFFF" fill-opacity="0.2" stroke="#FFFFFF" stroke-width="3"/>
                <path d="M46.59 55.1094L44.63 48.7894H35.15L33.27 55.1094H26.99L36.75 27.3894H43.35L53.11 55.1094H46.59ZM36.43 44.4694H43.39L39.87 32.8694L36.43 44.4694Z" fill="#FFFFFF"/>
                </svg>                
                `,
            buttonB:`
                <svg width="81" height="81" viewBox="0 0 81 81" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="40.9355" cy="40.0938" r="37.5" fill="#FFFFFF" fill-opacity="0.2" stroke="#FFFFFF" stroke-width="3"/>
                <path d="M31.3348 55.0938V27.3737H41.2948C43.9614 27.3737 46.1081 28.0537 47.7348 29.4137C49.3881 30.7737 50.2148 32.5471 50.2148 34.7337C50.2148 36.0937 49.8948 37.2671 49.2548 38.2537C48.6414 39.2137 47.7214 39.9604 46.4948 40.4937C48.2014 41.0004 49.4948 41.8404 50.3748 43.0137C51.2814 44.1604 51.7348 45.5737 51.7348 47.2537C51.7348 49.6537 50.8414 51.5604 49.0548 52.9737C47.2681 54.3871 44.8681 55.0938 41.8548 55.0938H31.3348ZM37.0148 43.0137V50.8137H41.7348C44.4548 50.8137 45.8148 49.5337 45.8148 46.9737C45.8148 44.3337 44.3614 43.0137 41.4548 43.0137H37.0148ZM37.0148 31.6537V38.9337H40.4948C43.0814 38.9337 44.3748 37.7337 44.3748 35.3337C44.3748 32.8804 43.1881 31.6537 40.8148 31.6537H37.0148Z" fill="#FFFFFF"/>
                </svg>
                `,
            buttonX: `
                <svg width="81" height="81" viewBox="0 0 81 81" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="40.5332" cy="40.0938" r="37.5" fill="#FFFFFF" fill-opacity="0.2" stroke="#FFFFFF" stroke-width="3"/>
                <path d="M46.0124 55.0938L40.2124 44.8537L34.4924 55.0938H27.8924L36.8924 40.6937L28.5724 27.3737H35.3324L40.4124 36.3737L45.4924 27.3737H52.0924L43.6524 40.6137L52.7724 55.0938H46.0124Z" fill="#FFFFFF"/>
                </svg>                
                `,
            buttonY: `
                <svg width="81" height="81" viewBox="0 0 81 81" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="40.3496" cy="40.8281" r="37.5" fill="#FFFFFF" fill-opacity="0.2" stroke="#FFFFFF" stroke-width="3"/>
                <path d="M37.1088 55.8281V45.5881L27.9488 28.1081H34.5488L40.2288 41.0681L46.0688 28.1081H52.3488L43.0288 45.6681V55.8281H37.1088Z" fill="#FFFFFF"/>
                </svg>                
                `,
            dPadUp: `
                <svg width="64" height="94" viewBox="0 0 64 94" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M30.2284 88.9199L27.6316 91.7105L2.70477 67.1637L5.49175 64.1688L30.4185 88.7156C31.6926 89.9702 33.7102 89.9389 34.9469 88.6453L58.3584 64.1573C58.9515 63.537 59.2838 62.7017 59.2838 61.8316V8.04873C59.2838 6.21692 57.8403 4.73194 56.0596 4.73194H7.72133C5.94063 4.73194 4.49709 6.21692 4.49709 8.04874V61.7728C4.49709 62.6776 4.8564 63.5431 5.49175 64.1688L2.70477 67.1637C1.27524 65.756 0.466797 63.8086 0.466797 61.7728V8.04874C0.466797 3.92715 3.71476 0.585938 7.72133 0.585938H56.0596C60.0661 0.585938 63.3141 3.92714 63.3141 8.04873V61.8316C63.3141 63.7893 62.5663 65.6687 61.2319 67.0644L58.4565 64.2566L61.2318 67.0645L37.8204 91.5525C35.0378 94.463 30.4982 94.5334 27.6316 91.7105L30.2284 88.9199Z" fill="#FFFFFF"/>
                <path fill-rule="evenodd" clip-rule="evenodd" d="M7.72228 4.73438H56.0605C57.8412 4.73438 59.2848 6.21936 59.2848 8.05117V61.834C59.2848 62.7041 58.9524 63.5394 58.3593 64.1598L34.9479 88.6478C33.7111 89.9414 31.6935 89.9726 30.4195 88.718L5.4927 64.1712C4.85735 63.5456 4.49805 62.6801 4.49805 61.7753V8.05118C4.49805 6.21936 5.94159 4.73438 7.72228 4.73438ZM32.7888 11.397C31.2307 11.397 29.9676 12.6601 29.9676 14.2182V28.7272C29.9676 30.2853 31.2307 31.5484 32.7888 31.5484C34.347 31.5484 35.6101 30.2853 35.6101 28.7272V14.2182C35.6101 12.6601 34.347 11.397 32.7888 11.397Z" fill="#FFFFFF" fill-opacity="0.2"/>
                </svg>                         
                `,
            dPadDown: `
                <svg width="64" height="94" viewBox="0 0 64 94" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M33.5528 4.90824L36.1497 2.11761L61.0765 26.6644L58.2895 29.6593L33.3627 5.11256C32.0886 3.85792 30.0711 3.88922 28.8343 5.1828L5.42288 29.6708C4.82979 30.2912 4.49743 31.1264 4.49743 31.9965L4.49743 85.7794C4.49743 87.6112 5.94097 89.0962 7.72167 89.0962L56.0599 89.0962C57.8406 89.0962 59.2842 87.6112 59.2842 85.7794L59.2842 32.0553C59.2842 31.1505 58.9248 30.285 58.2895 29.6593L61.0765 26.6644C62.506 28.0721 63.3144 30.0195 63.3144 32.0553L63.3145 85.7794C63.3145 89.901 60.0665 93.2422 56.0599 93.2422L7.72167 93.2422C3.7151 93.2422 0.467136 89.901 0.467136 85.7794L0.467131 31.9965C0.467131 30.0388 1.21497 28.1595 2.54938 26.7637L5.3247 29.5715L2.54939 26.7637L25.9609 2.27565C28.7435 -0.634915 33.283 -0.705312 36.1497 2.1176L33.5528 4.90824Z" fill="#FFFFFF"/>
                <path fill-rule="evenodd" clip-rule="evenodd" d="M56.059 89.0938L7.72072 89.0938C5.94002 89.0938 4.49648 87.6088 4.49648 85.777L4.49647 31.9941C4.49647 31.124 4.82884 30.2887 5.42192 29.6684L28.8334 5.18035C30.0701 3.88677 32.0877 3.85548 33.3618 5.11011L58.2885 29.6569C58.9239 30.2825 59.2832 31.1481 59.2832 32.0528L59.2832 85.7769C59.2832 87.6088 57.8397 89.0938 56.059 89.0938ZM30.9924 82.4312C32.5505 82.4312 33.8136 81.1681 33.8136 79.61L33.8136 65.1009C33.8136 63.5428 32.5505 62.2797 30.9924 62.2797C29.4343 62.2797 28.1712 63.5428 28.1712 65.1009L28.1712 79.61C28.1712 81.1681 29.4343 82.4312 30.9924 82.4312Z" fill="#FFFFFF" fill-opacity="0.2"/>
                </svg>  
                `,
            dPadLeft: `
                <svg width="94" height="64" viewBox="0 0 94 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M88.4726 33.8165L91.2633 36.4134L66.7165 61.3401L63.7215 58.5532L88.2683 33.6264C89.5229 32.3523 89.4916 30.3347 88.1981 29.098L63.71 5.68655C63.0897 5.09347 62.2544 4.76111 61.3843 4.76111L7.60147 4.7611C5.76965 4.7611 4.28467 6.20464 4.28467 7.98534L4.28467 56.3236C4.28467 58.1043 5.76965 59.5478 7.60147 59.5478L61.3256 59.5478C62.2304 59.5478 63.0959 59.1885 63.7215 58.5532L66.7165 61.3401C65.3087 62.7697 63.3613 63.5781 61.3256 63.5781L7.60147 63.5781C3.47989 63.5781 0.138672 60.3302 0.138672 56.3236L0.138673 7.98534C0.138673 3.97878 3.47988 0.730808 7.60147 0.730808L61.3843 0.730809C63.3421 0.730809 65.2214 1.47865 66.6172 2.81306L63.8094 5.58838L66.6172 2.81307L91.1052 26.2245C94.0158 29.0071 94.0862 33.5467 91.2633 36.4134L88.4726 33.8165Z" fill="#FFFFFF"/>
                <path fill-rule="evenodd" clip-rule="evenodd" d="M4.2832 56.3226L4.2832 7.98439C4.2832 6.20369 5.76819 4.76015 7.6 4.76015L61.3829 4.76015C62.253 4.76015 63.0882 5.09252 63.7086 5.6856L88.1966 29.0971C89.4902 30.3338 89.5215 32.3514 88.2668 33.6254L63.7201 58.5522C63.0944 59.1876 62.2289 59.5469 61.3241 59.5469L7.6 59.5469C5.76819 59.5469 4.2832 58.1033 4.2832 56.3226ZM10.9489 31.2592C10.9489 32.8173 12.212 34.0804 13.7701 34.0804L28.2792 34.0804C29.8373 34.0804 31.1004 32.8173 31.1004 31.2592C31.1004 29.7011 29.8373 28.438 28.2792 28.438L13.7701 28.438C12.212 28.438 10.9489 29.7011 10.9489 31.2592Z" fill="#FFFFFF" fill-opacity="0.2"/>
                </svg>            
                `,
            dPadRight: `
                <svg width="94" height="64" viewBox="0 0 94 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M5.12894 30.4882L2.33831 27.8913L26.8851 2.96454L29.88 5.75151L5.33326 30.6783C4.07862 31.9524 4.10991 33.9699 5.4035 35.2067L29.8915 58.6181C30.5119 59.2112 31.3471 59.5436 32.2172 59.5436L86.0001 59.5436C87.8319 59.5436 89.3169 58.1 89.3169 56.3193L89.3169 7.9811C89.3169 6.2004 87.8319 4.75686 86.0001 4.75686L32.276 4.75686C31.3712 4.75686 30.5057 5.11616 29.88 5.75151L26.8851 2.96454C28.2928 1.535 30.2402 0.72656 32.276 0.72656L86.0001 0.726562C90.1217 0.726562 93.4629 3.97452 93.4629 7.9811L93.4629 56.3193C93.4629 60.3259 90.1217 63.5739 86.0001 63.5739L32.2172 63.5739C30.2595 63.5739 28.3802 62.826 26.9844 61.4916L29.7922 58.7163L26.9844 61.4916L2.49635 38.0801C-0.41422 35.2975 -0.484612 30.758 2.3383 27.8913L5.12894 30.4882Z" fill="#FFFFFF"/>
                <path fill-rule="evenodd" clip-rule="evenodd" d="M89.3184 7.98205L89.3184 56.3203C89.3184 58.101 87.8334 59.5445 86.0016 59.5445L32.2187 59.5445C31.3486 59.5445 30.5133 59.2122 29.893 58.6191L5.40496 35.2076C4.11137 33.9709 4.08008 31.9533 5.33472 30.6792L29.8815 5.75247C30.5072 5.11712 31.3727 4.75781 32.2775 4.75781L86.0016 4.75781C87.8334 4.75781 89.3184 6.20135 89.3184 7.98205ZM82.6526 33.0455C82.6526 31.4873 81.3895 30.2243 79.8314 30.2243L65.3224 30.2242C63.7642 30.2242 62.5011 31.4873 62.5011 33.0455C62.5011 34.6036 63.7642 35.8667 65.3223 35.8667L79.8314 35.8667C81.3895 35.8667 82.6526 34.6036 82.6526 33.0455Z" fill="#FFFFFF" fill-opacity="0.2"/>
                </svg>                       
                `,
            buttonL: `
                <svg width="106" height="64" viewBox="0 0 106 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M4.98829 34.742L4.99173 48.9227C4.99173 51.921 5.79171 54.5939 7.43558 56.4873C9.03601 58.3306 11.6539 59.6876 15.8479 59.6874L15.8585 59.6874C22.5955 59.6872 30.2029 59.6869 42.9726 59.6988C49.2988 59.7047 60.1009 59.6982 68.9212 59.6929C73.7156 59.69 77.9244 59.6874 80.5106 59.6874C83.944 59.6874 86.1764 58.4837 88.1601 56.2911C90.1797 54.0587 91.8791 50.8813 94.0951 46.7377C94.2086 46.5255 94.3235 46.3107 94.4398 46.0933C94.8505 45.326 95.2612 44.5673 95.6668 43.8178C97.6143 40.2196 99.4465 36.8344 100.62 33.7385C102.068 29.917 102.205 27.2941 101.099 25.5447C100.295 24.275 99.4908 22.9341 98.6691 21.5643C96.6308 18.1666 94.4863 14.5917 91.9883 11.4862C88.4915 7.13916 84.7787 4.35232 80.5106 4.35232L46.2537 4.35232C37.0165 4.35232 23.4438 8.8471 15.31 13.5773C9.76379 16.8026 4.98844 24.6054 4.98829 34.742C4.98829 34.7418 4.98829 34.7421 4.98829 34.742ZM0.942892 48.9232L0.939452 34.7425C0.939451 23.4346 6.2641 14.1542 13.2746 10.0772C21.8431 5.09429 36.1156 0.303484 46.2537 0.303488L80.5106 0.303486C86.6856 0.303486 91.4416 4.34683 95.1431 8.94849C97.8277 12.2859 100.209 16.2544 102.294 19.7303C103.078 21.0363 103.82 22.2727 104.52 23.3801C106.736 26.8822 105.914 31.1937 104.406 35.1733C103.127 38.5489 101.132 42.2315 99.183 45.8291C98.7878 46.5587 98.3944 47.2848 98.0094 48.0041C97.8566 48.2896 97.7049 48.5736 97.5541 48.856C95.4558 52.7849 93.5305 56.3901 91.1625 59.0074C88.485 61.967 85.1936 63.7362 80.5106 63.7362C77.9294 63.7362 73.7242 63.7388 68.9323 63.7417C60.1094 63.747 49.2973 63.7536 42.9688 63.7477C30.201 63.7357 22.5954 63.736 15.859 63.7362L15.848 63.7362C10.7068 63.7364 6.88434 62.0282 4.37826 59.1417C1.91573 56.3054 0.942979 52.583 0.942892 48.9232C0.942892 48.923 0.942892 48.9233 0.942892 48.9232Z" fill="#FFFFFF"/>
                <path d="M80.5096 2.32889L46.2527 2.32889C36.5651 2.32889 22.6425 6.97168 14.2913 11.8282C8.01292 15.4794 2.96289 24.0206 2.96289 34.743L2.96633 48.9242C2.96633 55.5824 6.51174 61.7132 15.847 61.7128L15.8576 61.7128C22.5944 61.7126 30.2008 61.7123 42.9698 61.7242C52.735 61.7334 73.1707 61.7128 80.5096 61.7128C88.626 61.7128 91.5571 55.7671 96.2236 47.0497C100.89 38.3324 106.131 29.7149 102.808 24.4634C97.4471 15.9893 90.9528 2.32889 80.5096 2.32889Z" fill="#FFFFFF" fill-opacity="0.25"/>
                <path d="M51.2578 42.4228V21.6328H58.7278C60.7278 21.6328 62.3378 22.1428 63.5578 23.1628C64.7978 24.1828 65.4178 25.5128 65.4178 27.1528C65.4178 28.1728 65.1778 29.0528 64.6978 29.7928C64.2378 30.5128 63.5478 31.0728 62.6278 31.4728C63.9078 31.8528 64.8778 32.4828 65.5378 33.3628C66.2178 34.2228 66.5578 35.2828 66.5578 36.5428C66.5578 38.3428 65.8878 39.7728 64.5478 40.8328C63.2078 41.8928 61.4078 42.4228 59.1478 42.4228H51.2578ZM55.5178 33.3628V39.2128H59.0578C61.0978 39.2128 62.1178 38.2528 62.1178 36.3328C62.1178 34.3528 61.0278 33.3628 58.8478 33.3628H55.5178ZM55.5178 24.8428V30.3028H58.1278C60.0678 30.3028 61.0378 29.4028 61.0378 27.6028C61.0378 25.7628 60.1478 24.8428 58.3678 24.8428H55.5178Z" fill="#FFFFFF"/>
                <path d="M34.9688 42.4228V21.6328H39.4688V38.8228H48.5888V42.4228H34.9688Z" fill="#FFFFFF"/>
                </svg>
                `,
            buttonR: `
                <svg width="106" height="65" viewBox="0 0 106 65" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M101.342 35.406L101.338 49.5868C101.338 52.585 100.538 55.2579 98.8945 57.1513C97.2941 58.9947 94.6762 60.3516 90.4822 60.3515L90.4716 60.3515C83.7346 60.3512 76.1272 60.3509 63.3574 60.3629C57.0312 60.3688 46.2291 60.3623 37.4088 60.3569C32.6145 60.354 28.4056 60.3515 25.8195 60.3515C22.386 60.3515 20.1537 59.1478 18.17 56.9552C16.1503 54.7228 14.451 51.5453 12.235 47.4018C12.1215 47.1895 12.0066 46.9747 11.8903 46.7574C11.4795 45.9901 11.0689 45.2314 10.6632 44.4819C8.71577 40.8837 6.8836 37.4985 5.71034 34.4025C4.26214 30.5811 4.12483 27.9582 5.23158 26.2088C6.03491 24.939 6.83931 23.5981 7.66099 22.2284C9.69926 18.8307 11.8438 15.2557 14.3418 12.1503C17.8385 7.80323 21.5514 5.01638 25.8195 5.01638L60.0764 5.01639C69.3136 5.01638 82.8863 9.51116 91.02 14.2413C96.5663 17.4667 101.342 25.2695 101.342 35.406C101.342 35.4059 101.342 35.4062 101.342 35.406ZM105.387 49.5872L105.391 35.4065C105.391 24.0986 100.066 14.8182 93.0555 10.7413C84.487 5.75835 70.2145 0.967547 60.0764 0.96755L25.8195 0.967549C19.6444 0.967548 14.8885 5.01089 11.187 9.61256C8.50238 12.95 6.12142 16.9184 4.03595 20.3944C3.25239 21.7003 2.51055 22.9368 1.80999 24.0441C-0.405623 27.5462 0.416147 31.8578 1.92426 35.8373C3.2035 39.2129 5.1983 42.8955 7.1471 46.4932C7.54231 47.2228 7.93563 47.9489 8.32071 48.6682C8.47351 48.9537 8.6252 49.2377 8.77599 49.52C10.8742 53.449 12.7996 57.0542 15.1675 59.6715C17.8451 62.6311 21.1365 64.4003 25.8195 64.4003C28.4007 64.4003 32.6058 64.4029 37.3978 64.4058C46.2206 64.4111 57.0328 64.4176 63.3612 64.4117C76.1291 64.3998 83.7346 64.4001 90.4711 64.4003L90.4821 64.4003C95.6233 64.4005 99.4457 62.6922 101.952 59.8057C104.414 56.9694 105.387 53.2471 105.387 49.5872C105.387 49.5871 105.387 49.5874 105.387 49.5872Z" fill="#FFFFFF"/>
                <path d="M25.8204 2.99295L60.0774 2.99295C69.765 2.99295 83.6876 7.63574 92.0387 12.4923C98.3172 16.1435 103.367 24.6847 103.367 35.407L103.364 49.5882C103.364 56.2465 99.8183 62.3772 90.4831 62.3769L90.4725 62.3769C83.7357 62.3766 76.1293 62.3763 63.3603 62.3883C53.595 62.3974 33.1594 62.3769 25.8204 62.3769C17.704 62.3769 14.773 56.4311 10.1065 47.7138C5.43993 38.9964 0.199396 30.3789 3.52176 25.1275C8.88296 16.6533 15.3773 2.99295 25.8204 2.99295Z" fill="#FFFFFF" fill-opacity="0.25"/>
                <path d="M36.9664 43.3672V22.5772H44.9764C47.1364 22.5772 48.8464 23.1472 50.1064 24.2872C51.3664 25.4272 51.9964 26.9772 51.9964 28.9372C51.9964 30.1372 51.6664 31.2172 51.0064 32.1772C50.3464 33.1372 49.4164 33.8872 48.2164 34.4272L53.3764 43.3672H48.7264L44.2264 35.2972H41.2864V43.3672H36.9664ZM41.2864 32.1772H44.4064C46.5064 32.1772 47.5564 31.1172 47.5564 28.9972C47.5564 26.9172 46.5264 25.8772 44.4664 25.8772H41.2864V32.1772ZM56.068 43.3672V22.5772H63.538C65.538 22.5772 67.148 23.0872 68.368 24.1072C69.608 25.1272 70.228 26.4572 70.228 28.0972C70.228 29.1172 69.988 29.9972 69.508 30.7372C69.048 31.4572 68.358 32.0172 67.438 32.4172C68.718 32.7972 69.688 33.4272 70.348 34.3072C71.028 35.1672 71.368 36.2272 71.368 37.4872C71.368 39.2872 70.698 40.7172 69.358 41.7772C68.018 42.8372 66.218 43.3672 63.958 43.3672H56.068ZM60.328 34.3072V40.1572H63.868C65.908 40.1572 66.928 39.1972 66.928 37.2772C66.928 35.2972 65.838 34.3072 63.658 34.3072H60.328ZM60.328 25.7872V31.2472H62.938C64.878 31.2472 65.848 30.3472 65.848 28.5472C65.848 26.7072 64.958 25.7872 63.178 25.7872H60.328Z" fill="#FFFFFF"/>
                </svg>
                `,
            buttonZL: `
                <svg width="92" height="102" viewBox="0 0 92 102" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M9.61387 10.2652C9.57741 11.2383 9.87453 12.4506 10.6459 13.8733C14.204 20.4363 16.145 29.037 16.913 37.578C17.6833 46.1432 17.2907 54.8402 16.0475 61.7003C14.169 72.0659 10.7407 78.1346 6.59398 84.8359C4.75888 87.8015 4.73928 90.8788 5.81062 93.1414C6.86925 95.3771 9.04217 96.954 12.031 96.954H48.2799C52.3033 96.954 56.7947 95.4788 61.3484 92.8744C65.8847 90.2799 70.3608 86.6335 74.3161 82.4727C78.2706 78.3126 81.6584 73.6866 84.047 69.1702C86.4509 64.6248 87.7648 60.3385 87.7648 56.8214V22.4615C87.7648 15.0947 85.67 10.7729 82.9705 8.26903C80.2377 5.73432 76.5573 4.75692 72.8138 4.75692H22.986C16.0307 4.75692 12.3305 6.16287 10.7261 7.77341C9.98407 8.51825 9.6485 9.34128 9.61387 10.2652ZM7.7822 4.84073C10.6101 2.002 15.7746 0.601562 22.986 0.601562H72.8138C77.2176 0.601562 82.0515 1.74909 85.7963 5.22241C89.5743 8.72658 91.9202 14.2959 91.9202 22.4615V56.8214C91.9202 61.2744 90.2923 66.2495 87.7203 71.1129C85.1328 76.0053 81.5104 80.9356 77.3278 85.3356C73.146 89.7348 68.3582 93.6522 63.4114 96.4815C58.4819 99.3008 53.2708 101.109 48.2799 101.109H12.031C7.39162 101.109 3.7817 98.5663 2.05501 94.9197C0.341024 91.2999 0.533644 86.7327 3.06042 82.6493C7.09634 76.1271 10.2158 70.5768 11.9587 60.9593C13.1291 54.5012 13.5145 46.1807 12.7744 37.9502C12.0321 29.6955 10.1744 21.7222 6.99284 15.8538C5.98277 13.9908 5.38919 12.0372 5.46143 10.1096C5.5355 8.13286 6.30802 6.32053 7.7822 4.84073Z" fill="#FFFFFF"/>
                <path d="M72.814 2.67969H22.9862C8.81958 2.67969 5.25678 8.29246 8.81958 14.864C15.5593 27.2954 16.4169 48.012 14.0033 61.3303C12.1926 71.3218 8.91874 77.1313 4.82742 83.7431C0.465548 90.792 4.403 99.0321 12.0312 99.0321H48.2801C66.3088 99.0321 89.8427 72.762 89.8427 56.8219V22.4619C89.8427 6.92955 80.9613 2.67969 72.814 2.67969Z" fill="#FFFFFF" fill-opacity="0.25"/>
                <path d="M52.9394 54.9541V37.7641H46.6094V34.1641H63.7694V37.7641H57.4394V54.9541H52.9394Z" fill="#FFFFFF"/>
                <path d="M33.8535 54.9541V34.1641H38.3535V51.3541H47.4735V54.9541H33.8535Z" fill="#FFFFFF"/>
                </svg>
                `,
            buttonZR: `
                <svg width="92" height="102" viewBox="0 0 92 102" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M82.7455 10.3668C82.782 11.3398 82.4848 12.5521 81.7135 13.9749C78.1553 20.5379 76.2144 29.1386 75.4463 37.6796C74.6761 46.2448 75.0687 54.9418 76.3119 61.8019C78.1904 72.1674 81.6187 78.2362 85.7654 84.9374C87.6005 87.9031 87.6201 90.9804 86.5488 93.2429C85.4901 95.4786 83.3172 97.0556 80.3284 97.0556H44.0795C40.0561 97.0556 35.5647 95.5804 31.011 92.976C26.4747 90.3815 21.9986 86.7351 18.0433 82.5742C14.0888 78.4141 10.701 73.7882 8.31241 69.2718C5.90849 64.7263 4.59457 60.44 4.59457 56.923V22.563C4.59457 15.1962 6.6894 10.8744 9.38892 8.37059C12.1217 5.83589 15.8021 4.85849 19.5456 4.85849H69.3734C76.3286 4.85849 80.0289 6.26444 81.6333 7.87498C82.3753 8.61981 82.7109 9.44284 82.7455 10.3668ZM84.5772 4.94229C81.7492 2.10356 76.5848 0.703125 69.3734 0.703125H19.5456C15.1418 0.703125 10.3079 1.85065 6.56312 5.32397C2.7851 8.82814 0.439209 14.3975 0.439209 22.563V56.923C0.439209 61.376 2.06703 66.351 4.63912 71.2144C7.22653 76.1068 10.849 81.0372 15.0316 85.4371C19.2134 89.8364 24.0011 93.7537 28.948 96.583C33.8775 99.4024 39.0886 101.211 44.0795 101.211H80.3284C84.9678 101.211 88.5777 98.6678 90.3044 95.0212C92.0184 91.4015 91.8257 86.8343 89.299 82.7509C85.263 76.2287 82.1436 70.6784 80.4007 61.0609C79.2303 54.6027 78.8449 46.2823 79.585 38.0518C80.3273 29.7971 82.185 21.8238 85.3665 15.9554C86.3766 14.0923 86.9702 12.1387 86.8979 10.2112C86.8239 8.23442 86.0514 6.4221 84.5772 4.94229Z" fill="#FFFFFF"/>
                <path d="M19.5453 2.78125H69.3732C83.5398 2.78125 87.1026 8.39402 83.5398 14.9656C76.8001 27.397 75.9425 48.1135 78.3561 61.4318C80.1668 71.4234 83.4406 77.2329 87.532 83.8446C91.8938 90.8936 87.9564 99.1337 80.3281 99.1337H44.0793C26.0506 99.1337 2.51666 72.8636 2.51666 56.9234V22.5635C2.51666 7.03111 11.3981 2.78125 19.5453 2.78125Z" fill="#FFFFFF" fill-opacity="0.25"/>
                <path d="M26.6344 54.1484V33.3584H34.6444C36.8044 33.3584 38.5144 33.9284 39.7744 35.0684C41.0344 36.2084 41.6644 37.7584 41.6644 39.7184C41.6644 40.9184 41.3344 41.9984 40.6744 42.9584C40.0144 43.9184 39.0844 44.6684 37.8844 45.2084L43.0444 54.1484H38.3944L33.8944 46.0784H30.9544V54.1484H26.6344ZM30.9544 42.9584H34.0744C36.1744 42.9584 37.2244 41.8984 37.2244 39.7784C37.2244 37.6984 36.1944 36.6584 34.1344 36.6584H30.9544V42.9584ZM50.0259 54.1484V36.9584H43.6959V33.3584H60.8559V36.9584H54.5259V54.1484H50.0259Z" fill="#FFFFFF"/>
                </svg>
                `,
            buttonSelect: `
                <svg width="143" height="55" viewBox="0 0 143 55" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="2" width="139" height="51" rx="25.5" fill="#FFFFFF" fill-opacity="0.25" stroke="#FFFFFF" stroke-width="4"/>
                <path d="M29.02 29.516C27.3587 28.9 26.164 28.1533 25.436 27.276C24.708 26.38 24.344 25.2507 24.344 23.888C24.344 22.1333 24.988 20.7333 26.276 19.688C27.5827 18.6427 29.328 18.12 31.512 18.12C33.3413 18.12 35.1333 18.456 36.888 19.128V22.32C35.0773 21.76 33.3973 21.48 31.848 21.48C29.6453 21.48 28.544 22.1893 28.544 23.608C28.544 24.1307 28.7307 24.56 29.104 24.896C29.496 25.232 30.2147 25.5867 31.26 25.96L33.332 26.716C35.068 27.3507 36.3 28.0973 37.028 28.956C37.7747 29.796 38.148 30.8973 38.148 32.26C38.148 34.1827 37.4573 35.704 36.076 36.824C34.6947 37.9253 32.8 38.476 30.392 38.476C29.3467 38.476 28.3013 38.3733 27.256 38.168C26.2107 37.9813 25.3147 37.72 24.568 37.384V34.192C25.5013 34.472 26.5 34.696 27.564 34.864C28.628 35.032 29.5893 35.116 30.448 35.116C31.5493 35.116 32.3987 34.92 32.996 34.528C33.5933 34.1173 33.892 33.5387 33.892 32.792C33.892 32.2133 33.7053 31.756 33.332 31.42C32.9773 31.084 32.2493 30.7107 31.148 30.3L29.02 29.516ZM41.6189 38V18.596H54.3869V21.844H45.8189V26.436H52.7909V29.684H45.8189V34.752H54.3869V38H41.6189ZM57.8064 38V18.596H62.0064V34.64H70.5184V38H57.8064ZM73.0095 38V18.596H85.7775V21.844H77.2095V26.436H84.1815V29.684H77.2095V34.752H85.7775V38H73.0095ZM102.762 37.496C101.25 38.0747 99.5608 38.364 97.6942 38.364C94.5395 38.364 92.1502 37.524 90.5262 35.844C88.9022 34.1453 88.0902 31.6627 88.0902 28.396C88.0902 25.1667 88.9395 22.6653 90.6382 20.892C92.3368 19.1187 94.7262 18.232 97.8062 18.232C99.4488 18.232 101.007 18.4933 102.482 19.016V22.32C100.783 21.9467 99.3928 21.76 98.3102 21.76C96.3688 21.76 94.9128 22.2733 93.9422 23.3C92.9902 24.3267 92.5142 25.8947 92.5142 28.004V28.648C92.5142 30.7387 92.9808 32.2973 93.9142 33.324C94.8475 34.332 96.2755 34.836 98.1982 34.836C99.2808 34.836 100.802 34.6213 102.762 34.192V37.496ZM109.881 38V21.956H103.973V18.596H119.989V21.956H114.081V38H109.881Z" fill="#FFFFFF"/>
                </svg>
            `,
            buttonStart: `
                <svg width="143" height="55" viewBox="0 0 143 55" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="2" width="139" height="51" rx="25.5" fill="#FFFFFF" fill-opacity="0.25" stroke="#FFFFFF" stroke-width="4"/>
                <path d="M35.02 29.516C33.3587 28.9 32.164 28.1533 31.436 27.276C30.708 26.38 30.344 25.2507 30.344 23.888C30.344 22.1333 30.988 20.7333 32.276 19.688C33.5827 18.6427 35.328 18.12 37.512 18.12C39.3413 18.12 41.1333 18.456 42.888 19.128V22.32C41.0773 21.76 39.3973 21.48 37.848 21.48C35.6453 21.48 34.544 22.1893 34.544 23.608C34.544 24.1307 34.7307 24.56 35.104 24.896C35.496 25.232 36.2147 25.5867 37.26 25.96L39.332 26.716C41.068 27.3507 42.3 28.0973 43.028 28.956C43.7747 29.796 44.148 30.8973 44.148 32.26C44.148 34.1827 43.4573 35.704 42.076 36.824C40.6947 37.9253 38.8 38.476 36.392 38.476C35.3467 38.476 34.3013 38.3733 33.256 38.168C32.2107 37.9813 31.3147 37.72 30.568 37.384V34.192C31.5013 34.472 32.5 34.696 33.564 34.864C34.628 35.032 35.5893 35.116 36.448 35.116C37.5493 35.116 38.3987 34.92 38.996 34.528C39.5933 34.1173 39.892 33.5387 39.892 32.792C39.892 32.2133 39.7053 31.756 39.332 31.42C38.9773 31.084 38.2493 30.7107 37.148 30.3L35.02 29.516ZM51.6229 38V21.956H45.7149V18.596H61.7309V21.956H55.8229V38H51.6229ZM74.2786 38L72.9066 33.576H66.2706L64.9546 38H60.5586L67.3906 18.596H72.0106L78.8426 38H74.2786ZM67.1666 30.552H72.0386L69.5746 22.432L67.1666 30.552ZM81.2517 38V18.596H88.7277C90.7437 18.596 92.3397 19.128 93.5157 20.192C94.6917 21.256 95.2797 22.7027 95.2797 24.532C95.2797 25.652 94.9717 26.66 94.3557 27.556C93.7397 28.452 92.8717 29.152 91.7517 29.656L96.5677 38H92.2277L88.0277 30.468H85.2837V38H81.2517ZM85.2837 27.556H88.1957C90.1557 27.556 91.1357 26.5667 91.1357 24.588C91.1357 22.6467 90.1744 21.676 88.2517 21.676H85.2837V27.556ZM103.084 38V21.956H97.1758V18.596H113.192V21.956H107.284V38H103.084Z" fill="#FFFFFF"/>
                </svg>
            `,
        };

        return customSVGs[buttonName] || `
            <svg width="81" height="81" viewBox="0 0 81 81" fill="none" xmlns="http://www.w3.org/2000/svg">
                <!-- Default fallback SVG here -->
            </svg>`;
    }

    /**
     * Handles touch start events
     * @param {TouchEvent|MouseEvent} e - Touch or mouse event
     * @private
     */
    handleTouchStart(e) {
        e.preventDefault(); // Prevent default touch behaviors
        if (!this.controlsEnabled || this.isToggling) return;
        
        this.isPressed = true;
        if (this.buttonIndex !== undefined && window.virtualGamepad) {
            window.virtualGamepad.setButton(this.buttonIndex, true);
        }
        
        // Only start continuous movement for d-pad buttons
        if (this.isDPadButton()) {
            this.startContinuousMove();
        }
        
        this.element.querySelector('.button-svg').classList.add('pressed');

        if (window.myGameLiftStreams && this.keyCode) {
            const keyEvent = new KeyboardEvent('keydown', {
                key: this.keyCode,
                code: this.keyCode,
                keyCode: this.keyCodeNum,
                which: this.keyCodeNum,
                bubbles: true,
                cancelable: true
            });
            document.getElementById('streamVideoElement').dispatchEvent(keyEvent);
        }
    }

    startContinuousMove() {
        if (this.moveInterval) return;

        const moveSpeed = 16; // Adjust this value to control movement speed
        
        this.moveInterval = setInterval(() => {
            if (!this.isPressed) return;
            
            // Emit movement event based on direction
            const event = new CustomEvent('dpadMove', {
                detail: {
                    direction: this.direction,
                    speed: moveSpeed
                }
            });
            document.dispatchEvent(event);
        }, 16); // ~60fps update rate
    }

    stopContinuousMove() {
        if (this.moveInterval) {
            clearInterval(this.moveInterval);
            this.moveInterval = null;
        }
    }

    isDPadButton() {
        return ['dPadUp', 'dPadDown', 'dPadLeft', 'dPadRight'].includes(this.element.id.replace('virtual-', ''));
    }

    /**
     * Handles move events
     * @param {TouchEvent|MouseEvent} e - Touch or mouse event
     * @private
     */
    handleMove(e) {
        e.preventDefault();
        if (!this.controlsEnabled || !this.isPressed) return;
        
        const touch = e.touches[0];
        if (!touch) return;
        
        // Check if touch is still within button bounds
        const rect = this.element.getBoundingClientRect();
        const isInside = (
            touch.clientX >= rect.left &&
            touch.clientX <= rect.right &&
            touch.clientY >= rect.top &&
            touch.clientY <= rect.bottom
        );
        
        if (this.buttonIndex !== undefined && window.virtualGamepad) {
            window.virtualGamepad.setButton(this.buttonIndex, isInside);
        }
        if (!this.isDPadButton()) return;
        
        if (!this.controlsEnabled || !this.isPressed) return;
        
        // You might want to keep or modify move handling depending on your needs
        if (this.buttonIndex !== undefined) {
            window.virtualGamepad.setButton(this.buttonIndex, true);
        }
        
    }

    /**
     * Handles touch end events
     * @param {TouchEvent|MouseEvent} e - Touch or mouse event
     * @private
     */
    handleTouchEnd(e) {
        e.preventDefault();
        if (!this.controlsEnabled || this.isToggling) return;
        
        this.isPressed = false;
        if (this.buttonIndex !== undefined && window.virtualGamepad) {
            window.virtualGamepad.setButton(this.buttonIndex, false);
        }

        this.stopContinuousMove();

        if (this.element && this.element.classList) {
            this.element.classList.remove('active');
        }

        //this.element.querySelector('.button-svg').classList.remove('pressed');

        const buttonSvg = this.element?.querySelector('.button-svg');
        if (buttonSvg) {
            buttonSvg.classList.remove('pressed');
        }

        if (window.myGameLiftStreams && this.keyCode) {
            const keyEvent = new KeyboardEvent('keyup', {
                key: this.keyCode,
                code: this.keyCode,
                keyCode: this.keyCodeNum,
                which: this.keyCodeNum,
                bubbles: true,
                cancelable: true
            });
            document.getElementById('streamVideoElement').dispatchEvent(keyEvent);
        }
    }

    setKeyCode(keyCode, keyCodeNum) {
        this.keyCode = keyCode;
        this.keyCodeNum = keyCodeNum;
    }

    cleanup() {
        if (window.virtualGamepad) {
            // Reset all buttons and axes
            window.virtualGamepad.axes.fill(0);
            window.virtualGamepad.buttons.forEach(btn => {
                btn.pressed = false;
                btn.touched = false;
                btn.value = 0;
            });
        }
        this.isPressed = false;
    }
    
}

/**
 * Creates and initializes virtual buttons for game controls
 * Configures position and type for each directional and action button
 * 
 * @function createButtons
 * @returns {void}
 * @throws {Error} When button creation fails
 */
function createButtons() {
    const containerHeight = window.innerHeight;
    const buttons = [
        // Original D-pad buttons
        {
            svgName: 'dPadUp',
            x: 24,
            y: 26,
            keyCode: 'ArrowUp',
            keyCodeNum: 38
        },
        {
            svgName: 'dPadDown',
            x: 24,
            y: 11,
            keyCode: 'ArrowDown',
            keyCodeNum: 40
        },
        {
            svgName: 'dPadLeft',
            x: 18,
            y: 23.5,
            keyCode: 'ArrowLeft',
            keyCodeNum: 37
        },
        {
            svgName: 'dPadRight',
            x: 26.5,
            y: 23.5,
            keyCode: 'ArrowRight',
            keyCodeNum: 39
        },

        // Right side - Face buttons (diamond pattern)
        {
            svgName: 'buttonA',
            x: 63.6,
            y: 9.15,
            keyCode: 'KeyA',
            keyCodeNum: 65
        },
        {
            svgName: 'buttonB',
            x: 68,
            y: 18.7,
            keyCode: 'KeyB',
            keyCodeNum: 66
        },
        {
            svgName: 'buttonX',
            x: 58.7,
            y: 18.8,
            keyCode: 'KeyX',
            keyCodeNum: 88
        },
        {
            svgName: 'buttonY',
            x: 63.3,
            y: 29.5,
            keyCode: 'KeyY',
            keyCodeNum: 89
        },

        // Top buttons - Shoulders and triggers
        {
            svgName: 'buttonL',
            x: 2.39,
            y: 39.9,
            keyCode: 'KeyQ',
            keyCodeNum: 81
        },
        {
            svgName: 'buttonR',
            x: 86.26,
            y: 36.35,
            keyCode: 'KeyE',
            keyCodeNum: 69
        },
        {
            svgName: 'buttonZL',
            x: 3.32,
            y: 49.84,
            keyCode: 'KeyZ',
            keyCodeNum: 90
        },
        {
            svgName: 'buttonZR',
            x: 86.87,
            y: 46.27,
            keyCode: 'KeyC',
            keyCodeNum: 67
        },

        // Center buttons - Select/Start
        {
            svgName: 'buttonSelect',
            x: 23.34,  // Left of center
            y: 1.9,  // Lower middle
            keyCode: 'Backspace',
            keyCodeNum: 8
        },
        {
            svgName: 'buttonStart',
            x: 59.5,  // Right of center
            y: 1.1,  // Lower middle
            keyCode: 'Enter',
            keyCodeNum: 13
        }
    ];

    buttons.forEach(btnConfig => {
        const button = new VirtualButton(btnConfig);
        button.setKeyCode(btnConfig.keyCode, btnConfig.keyCodeNum);
    });

    // Add IDs to joysticks when creating them
    const joysticks = document.querySelectorAll('.virtual-joystick');
    joysticks.forEach((joystick, index) => {
        joystick.id = `virtual-joystick-${joystick.getAttribute('type') || index}`;
    });
}

// Add resize handling to maintain positions when window is resized
window.addEventListener('resize', () => {
    const buttons = document.querySelectorAll('.virtual-button');
    buttons.forEach(buttonElement => {
        const virtualButton = VirtualButton.instances.get(buttonElement.id);
        if (virtualButton) {
            const options = {
                x: parseFloat(buttonElement.style.left),
                y: parseFloat(buttonElement.style.bottom)
            };
            virtualButton.updatePosition(options);
        }
    });
});

/**
 * Initializes virtual controls for the game interface
 * Sets up buttons, joystick, and layout editor for touch/mouse controls
 * 
 * @function initVirtualControls
 * @returns {void}
 * @throws {Error} When control initialization fails
 */
function initVirtualControls() {
    const waitForGameLiftStreams = setInterval(() => {
        if (window.myGameLiftStreams) {
            clearInterval(waitForGameLiftStreams);
            createButtons();
        }
    }, 100);
}

// Initialize when the document is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVirtualControls);
} else {
    initVirtualControls();
}

/**
 * @class StreamControlButton
 * @extends VirtualButton
 * @description Manages stream control buttons and their interactions
 */
class StreamControlButton extends VirtualButton {
    /**
     * Creates a new stream control button
     * @param {Object} options - Button configuration options
     * @param {string} options.id - Button identifier
     */
    constructor(options) {
        super(options);
        
        this.element.className = 'virtual-button stream-control-button';
        this.element.id = options.id;
        
        this.isMobile = checkIfMobile();
        
        if (!this.isMobile) {
            this.hideControls();
            this.toggleTouchBlockOverlay(false);
            return; // Exit after hiding controls on desktop
        } else {
            this.showControls();
            this.toggleTouchBlockOverlay(true);
            //this.initializeHamburgerMenu();
        }
    }    

    /**
     * Gets SVG string for stream control button
     * @param {string} buttonType - Type of button to render
     * @returns {string} SVG markup string
     */
    getSVGString(buttonType) {
        const svg = this.getStreamControlSVG(buttonType);
        console.log(`SVG content for ${buttonType}:`, svg); // Debug line
        return svg;
    }    

    /**
     * Handles touch/click events on stream control buttons
     * @param {Event} e - Touch or mouse event
     * @private
     */
    handleTouchStart(e) {
        if (this.element.id === 'streamingTerminate') {
            if (typeof window.appTerminateStream === 'function') {
                window.appTerminateStream();
            }
        } else if (this.element.id === 'viewControlsButton') {
            this.toggleControlsVisibility();
        } else if (this.element.id === 'editControlsButton') {
            this.toggleEditMode();
        } else if (this.element.id === 'enableTouchButton') {
            this.toggleTouchControls();
        }
    }
    
    /**
     * Toggles visibility of virtual controls container
     * @returns {void}
     */
    toggleControlsVisibility() {
        const controlsContainer = document.getElementById('virtualControlsContainer');
        if (controlsContainer) {
            const isVisible = window.getComputedStyle(controlsContainer).visibility === 'visible';
            controlsContainer.style.visibility = isVisible ? 'hidden' : 'visible';
            controlsContainer.style.display = isVisible ? 'none' : 'block';
        }
    }
    
    /**
     * Toggles edit mode for controller layout
     * @returns {void}
     */
    toggleEditMode() {
        if (window.controllerEditor) {
            window.controllerEditor.toggleEditMode();
        } else {
            console.warn('ControllerLayoutEditor not initialized');
        }
    }

    /**
     * Toggles touch block overlay for mobile devices
     * @param {boolean} [show=false] - Whether to show or hide the overlay
     * @returns {HTMLElement|void} The overlay element if created
     */
    toggleTouchBlockOverlay(show = false) {
        // If it's desktop, don't show the overlay regardless of the show parameter
        if (!checkIfMobile()) {
            return;
        }
    
        const overlay = document.getElementById('touchBlockOverlay') || document.createElement('div');
        const videoElement = document.getElementById('streamVideoElement');
        
        if (!overlay.id) {
            overlay.id = 'touchBlockOverlay';
            overlay.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 2;
                background: transparent;
                display: none;
                pointer-events: auto;
            `;
            // Append to video element's parent container instead of body
            if (videoElement && videoElement.parentElement) {
                videoElement.parentElement.appendChild(overlay);
            }
        }
        overlay.style.display = show ? 'block' : 'none';
        return overlay;
    }        
    
    /**
     * Toggles touch controls and input handling
     * @returns {void}
     */
    toggleTouchControls() {
        const controlsContainer = document.getElementById('virtualControlsContainer');
        if (controlsContainer) {
            const isVisible = window.getComputedStyle(controlsContainer).visibility === 'visible';
            const newState = !isVisible;
            
            controlsContainer.style.visibility = newState ? 'visible' : 'hidden';
            controlsContainer.style.display = newState ? 'block' : 'none';

            this.toggleTouchBlockOverlay(newState);
            
            if (window.myGameLiftStreams) {
                if (!newState) {
                    window.myGameLiftStreams.detachInput();
                    this.element.innerHTML = this.getSVGString('disableTouch');

                    setTimeout(() => {
                        window.myGameLiftStreams.attachInput();
                        console.log("Touch enabled, controls hidden");
                    }, 50);
                } else {
                    window.myGameLiftStreams.detachInput();
                    this.element.innerHTML = this.getSVGString('enableTouch');
                    setTimeout(() => {
                        window.myGameLiftStreams.attachInput();
                        console.log("Controls visible, touch disabled");
                    }, 50);
                }
            }
            
            console.log(newState ? "Controls visible" : "Controls hidden");
        }
    }

    /**
     * Gets SVG content for stream control buttons
     * @param {string} buttonType - Type of control button
     * @returns {string} SVG markup for the specified button type
     * @throws {Error} When invalid button type is provided
     * 
     * @example
     * getStreamControlSVG('streamingTerminate') // Returns terminate button SVG
     * getStreamControlSVG('viewControls') // Returns view controls button SVG
     */
    getStreamControlSVG(buttonType) {
        const svgs = {
            terminate: `
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="1" width="78" height="78" rx="24" fill="#242424" stroke="white" stroke-width="3"/>
                <path d="M26.6062 37V28.2727H32.4869V29.794H28.4513V31.8736H32.1843V33.3949H28.4513V35.4787H32.5039V37H26.6062ZM35.6839 28.2727L37.4439 31.2472H37.5121L39.2805 28.2727H41.3643L38.701 32.6364L41.424 37H39.3018L37.5121 34.0213H37.4439L35.6541 37H33.5405L36.272 32.6364L33.5916 28.2727H35.6839ZM44.3771 28.2727V37H42.532V28.2727H44.3771ZM45.5629 29.794V28.2727H52.7305V29.794H50.0586V37H48.2347V29.794H45.5629ZM27.9634 46.0938C27.9038 45.8864 27.82 45.7031 27.712 45.544C27.604 45.3821 27.4719 45.2457 27.3157 45.1349C27.1623 45.0213 26.9862 44.9347 26.7873 44.875C26.5913 44.8153 26.3739 44.7855 26.1353 44.7855C25.6893 44.7855 25.2972 44.8963 24.9592 45.1179C24.6239 45.3395 24.3626 45.6619 24.1751 46.0852C23.9876 46.5057 23.8938 47.0199 23.8938 47.6278C23.8938 48.2358 23.9862 48.7528 24.1708 49.179C24.3555 49.6051 24.6168 49.9304 24.9549 50.1548C25.293 50.3764 25.6921 50.4872 26.1523 50.4872C26.57 50.4872 26.9265 50.4134 27.2219 50.2656C27.5202 50.1151 27.7475 49.9034 27.9038 49.6307C28.0629 49.358 28.1424 49.0355 28.1424 48.6634L28.5174 48.7188H26.2674V47.3295H29.9194V48.429C29.9194 49.196 29.7575 49.8551 29.4336 50.4062C29.1097 50.9545 28.6637 51.3778 28.0955 51.6761C27.5273 51.9716 26.8768 52.1193 26.1438 52.1193C25.3256 52.1193 24.6069 51.9389 23.9876 51.5781C23.3683 51.2145 22.8853 50.6989 22.5387 50.0312C22.195 49.3608 22.0231 48.5653 22.0231 47.6449C22.0231 46.9375 22.1254 46.3068 22.3299 45.7528C22.5373 45.196 22.8271 44.7244 23.1992 44.3381C23.5714 43.9517 24.0046 43.6577 24.4989 43.456C24.9933 43.2543 25.5288 43.1534 26.1055 43.1534C26.5998 43.1534 27.06 43.2259 27.4862 43.3707C27.9123 43.5128 28.2901 43.7145 28.6197 43.9759C28.9521 44.2372 29.2234 44.5483 29.4336 44.9091C29.6438 45.267 29.7788 45.6619 29.8384 46.0938H27.9634ZM32.5401 52H30.5629L33.5756 43.2727H35.9535L38.962 52H36.9847L34.7987 45.267H34.7305L32.5401 52ZM32.4165 48.5696H37.087V50.0099H32.4165V48.5696ZM40.0124 43.2727H42.288L44.6914 49.1364H44.7937L47.1971 43.2727H49.4727V52H47.6829V46.3196H47.6104L45.3519 51.9574H44.1332L41.8746 46.2983H41.8022V52H40.0124V43.2727ZM50.9929 52V43.2727H56.8736V44.794H52.8381V46.8736H56.571V48.3949H52.8381V50.4787H56.8906V52H50.9929Z" fill="white"/>
                </svg>
            `,
            viewControls: `
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="1" width="78" height="78" rx="24" fill="#242424" stroke="white" stroke-width="3"/>
                <path d="M26.2747 28.2727L28.3841 34.9034H28.465L30.5787 28.2727H32.6241L29.6156 37H27.2377L24.225 28.2727H26.2747ZM35.5197 28.2727V37H33.6745V28.2727H35.5197ZM37.0378 37V28.2727H42.9185V29.794H38.883V31.8736H42.6159V33.3949H38.883V35.4787H42.9355V37H37.0378ZM46.35 37L43.8528 28.2727H45.8684L47.313 34.3366H47.3855L48.9792 28.2727H50.7051L52.2946 34.3494H52.3713L53.8159 28.2727H55.8315L53.3343 37H51.536L49.8741 31.294H49.8059L48.1483 37H46.35ZM14.867 46.3281H13.0005C12.9664 46.0866 12.8968 45.8722 12.7917 45.6847C12.6866 45.4943 12.5517 45.3324 12.3869 45.1989C12.2221 45.0653 12.0318 44.9631 11.8159 44.892C11.6028 44.821 11.3713 44.7855 11.1213 44.7855C10.6696 44.7855 10.2761 44.8977 9.94087 45.1222C9.60565 45.3437 9.3457 45.6676 9.16104 46.0938C8.97639 46.517 8.88406 47.0312 8.88406 47.6364C8.88406 48.2585 8.97639 48.7812 9.16104 49.2045C9.34854 49.6278 9.60991 49.9474 9.94513 50.1634C10.2804 50.3793 10.6681 50.4872 11.1085 50.4872C11.3556 50.4872 11.5843 50.4545 11.7946 50.3892C12.0076 50.3239 12.1966 50.2287 12.3613 50.1037C12.5261 49.9759 12.6625 49.821 12.7704 49.6392C12.8812 49.4574 12.9579 49.25 13.0005 49.017L14.867 49.0256C14.8187 49.4261 14.698 49.8125 14.5048 50.1847C14.3145 50.554 14.0574 50.8849 13.7335 51.1776C13.4125 51.4673 13.0289 51.6974 12.5829 51.8679C12.1397 52.0355 11.6383 52.1193 11.0787 52.1193C10.3002 52.1193 9.60423 51.9432 8.99059 51.5909C8.37979 51.2386 7.89684 50.7287 7.54173 50.0611C7.18945 49.3935 7.01332 48.5852 7.01332 47.6364C7.01332 46.6847 7.19229 45.875 7.55025 45.2074C7.9082 44.5398 8.394 44.0312 9.00764 43.6818C9.62127 43.3295 10.3116 43.1534 11.0787 43.1534C11.5843 43.1534 12.0531 43.2244 12.4849 43.3665C12.9196 43.5085 13.3045 43.7159 13.6397 43.9886C13.975 44.2585 14.2477 44.5895 14.4579 44.9815C14.671 45.3736 14.8074 45.8224 14.867 46.3281ZM24.2101 47.6364C24.2101 48.5881 24.0297 49.3977 23.6689 50.0653C23.3109 50.733 22.8223 51.2429 22.2029 51.5952C21.5865 51.9446 20.8933 52.1193 20.1234 52.1193C19.3478 52.1193 18.6518 51.9432 18.0353 51.5909C17.4189 51.2386 16.9316 50.7287 16.5737 50.0611C16.2157 49.3935 16.0368 48.5852 16.0368 47.6364C16.0368 46.6847 16.2157 45.875 16.5737 45.2074C16.9316 44.5398 17.4189 44.0312 18.0353 43.6818C18.6518 43.3295 19.3478 43.1534 20.1234 43.1534C20.8933 43.1534 21.5865 43.3295 22.2029 43.6818C22.8223 44.0312 23.3109 44.5398 23.6689 45.2074C24.0297 45.875 24.2101 46.6847 24.2101 47.6364ZM22.3393 47.6364C22.3393 47.0199 22.247 46.5 22.0623 46.0767C21.8805 45.6534 21.6234 45.3324 21.291 45.1136C20.9586 44.8949 20.5694 44.7855 20.1234 44.7855C19.6774 44.7855 19.2882 44.8949 18.9558 45.1136C18.6234 45.3324 18.3649 45.6534 18.1802 46.0767C17.9984 46.5 17.9075 47.0199 17.9075 47.6364C17.9075 48.2528 17.9984 48.7727 18.1802 49.196C18.3649 49.6193 18.6234 49.9403 18.9558 50.1591C19.2882 50.3778 19.6774 50.4872 20.1234 50.4872C20.5694 50.4872 20.9586 50.3778 21.291 50.1591C21.6234 49.9403 21.8805 49.6193 22.0623 49.196C22.247 48.7727 22.3393 48.2528 22.3393 47.6364ZM32.8766 43.2727V52H31.2828L27.486 46.5071H27.4221V52H25.5769V43.2727H27.1962L30.9632 48.7614H31.04V43.2727H32.8766ZM34.0687 44.794V43.2727H41.2363V44.794H38.5645V52H36.7406V44.794H34.0687ZM42.4167 52V43.2727H45.8599C46.519 43.2727 47.0815 43.3906 47.5474 43.6264C48.0162 43.8594 48.3727 44.1903 48.617 44.6193C48.8642 45.0455 48.9877 45.5469 48.9877 46.1236C48.9877 46.7031 48.8627 47.2017 48.6127 47.6193C48.3627 48.0341 48.0005 48.3523 47.5261 48.5739C47.0545 48.7955 46.4835 48.9062 45.813 48.9062H43.5076V47.4233H45.5147C45.867 47.4233 46.1596 47.375 46.3926 47.2784C46.6255 47.1818 46.7988 47.0369 46.9125 46.8438C47.0289 46.6506 47.0872 46.4105 47.0872 46.1236C47.0872 45.8338 47.0289 45.5895 46.9125 45.3906C46.7988 45.1918 46.6241 45.0412 46.3883 44.9389C46.1554 44.8338 45.8613 44.7812 45.5062 44.7812H44.2619V52H42.4167ZM47.1298 48.0284L49.2988 52H47.2619L45.1397 48.0284H47.1298ZM58.3116 47.6364C58.3116 48.5881 58.1312 49.3977 57.7704 50.0653C57.4125 50.733 56.9238 51.2429 56.3045 51.5952C55.688 51.9446 54.9949 52.1193 54.225 52.1193C53.4494 52.1193 52.7534 51.9432 52.1369 51.5909C51.5204 51.2386 51.0332 50.7287 50.6752 50.0611C50.3173 49.3935 50.1383 48.5852 50.1383 47.6364C50.1383 46.6847 50.3173 45.875 50.6752 45.2074C51.0332 44.5398 51.5204 44.0312 52.1369 43.6818C52.7534 43.3295 53.4494 43.1534 54.225 43.1534C54.9949 43.1534 55.688 43.3295 56.3045 43.6818C56.9238 44.0312 57.4125 44.5398 57.7704 45.2074C58.1312 45.875 58.3116 46.6847 58.3116 47.6364ZM56.4409 47.6364C56.4409 47.0199 56.3485 46.5 56.1639 46.0767C55.9821 45.6534 55.725 45.3324 55.3926 45.1136C55.0602 44.8949 54.671 44.7855 54.225 44.7855C53.7789 44.7855 53.3897 44.8949 53.0574 45.1136C52.725 45.3324 52.4664 45.6534 52.2818 46.0767C52.1 46.5 52.0091 47.0199 52.0091 47.6364C52.0091 48.2528 52.1 48.7727 52.2818 49.196C52.4664 49.6193 52.725 49.9403 53.0574 50.1591C53.3897 50.3778 53.7789 50.4872 54.225 50.4872C54.671 50.4872 55.0602 50.3778 55.3926 50.1591C55.725 49.9403 55.9821 49.6193 56.1639 49.196C56.3485 48.7727 56.4409 48.2528 56.4409 47.6364ZM59.6784 52V43.2727H61.5236V50.4787H65.2651V52H59.6784ZM71.2214 45.7827C71.1873 45.4389 71.041 45.1719 70.7825 44.9815C70.524 44.7912 70.1731 44.696 69.7299 44.696C69.4288 44.696 69.1745 44.7386 68.9672 44.8239C68.7598 44.9062 68.6007 45.0213 68.4899 45.169C68.3819 45.3168 68.3279 45.4844 68.3279 45.6719C68.3223 45.8281 68.3549 45.9645 68.426 46.081C68.4998 46.1974 68.6007 46.2983 68.7285 46.3835C68.8564 46.4659 69.0041 46.5384 69.1717 46.6009C69.3393 46.6605 69.5183 46.7116 69.7086 46.7543L70.4927 46.9418C70.8734 47.027 71.2228 47.1406 71.541 47.2827C71.8592 47.4247 72.1348 47.5994 72.3677 47.8068C72.6007 48.0142 72.7811 48.2585 72.9089 48.5398C73.0396 48.821 73.1064 49.1435 73.1092 49.5071C73.1064 50.0412 72.97 50.5043 72.7001 50.8963C72.4331 51.2855 72.0467 51.5881 71.541 51.804C71.0382 52.017 70.4316 52.1236 69.7214 52.1236C69.0169 52.1236 68.4032 52.0156 67.8805 51.7997C67.3606 51.5838 66.9544 51.2642 66.6618 50.8409C66.372 50.4148 66.22 49.8878 66.2058 49.2599H67.9913C68.0112 49.5526 68.095 49.7969 68.2427 49.9929C68.3933 50.1861 68.5936 50.3324 68.8436 50.4318C69.0964 50.5284 69.3819 50.5767 69.7001 50.5767C70.0126 50.5767 70.2839 50.5312 70.514 50.4403C70.747 50.3494 70.9274 50.223 71.0552 50.0611C71.1831 49.8991 71.247 49.7131 71.247 49.5028C71.247 49.3068 71.1887 49.142 71.0723 49.0085C70.9586 48.875 70.791 48.7614 70.5694 48.6676C70.3507 48.5739 70.0822 48.4886 69.764 48.4119L68.8137 48.1733C68.0779 47.9943 67.497 47.7145 67.0708 47.3338C66.6447 46.9531 66.4331 46.4403 66.4359 45.7955C66.4331 45.267 66.5737 44.8054 66.8578 44.4105C67.1447 44.0156 67.5382 43.7074 68.0382 43.4858C68.5382 43.2642 69.1064 43.1534 69.7427 43.1534C70.3904 43.1534 70.9558 43.2642 71.4387 43.4858C71.9245 43.7074 72.3024 44.0156 72.5723 44.4105C72.8422 44.8054 72.9814 45.2628 72.9899 45.7827H71.2214Z" fill="white"/>
                </svg>
            `,
            enableTouch: `
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="1" width="78" height="78" rx="24" fill="#242424" stroke="white" stroke-width="3"/>
                <path d="M17.1394 37V28.2727H23.0201V29.794H18.9846V31.8736H22.7175V33.3949H18.9846V35.4787H23.0371V37H17.1394ZM31.7868 28.2727V37H30.193L26.3961 31.5071H26.3322V37H24.487V28.2727H26.1064L29.8734 33.7614H29.9501V28.2727H31.7868ZM34.8155 37H32.8382L35.851 28.2727H38.2289L41.2374 37H39.2601L37.074 30.267H37.0059L34.8155 37ZM34.6919 33.5696H39.3624V35.0099H34.6919V33.5696ZM42.2878 37V28.2727H45.7821C46.4242 28.2727 46.9597 28.3679 47.3887 28.5582C47.8176 28.7486 48.1401 29.0128 48.356 29.3509C48.5719 29.6861 48.6799 30.0724 48.6799 30.5099C48.6799 30.8509 48.6117 31.1506 48.4753 31.4091C48.339 31.6648 48.1515 31.875 47.9128 32.0398C47.677 32.2017 47.4071 32.3168 47.1032 32.3849V32.4702C47.4355 32.4844 47.7466 32.5781 48.0364 32.7514C48.329 32.9247 48.5662 33.1676 48.748 33.4801C48.9299 33.7898 49.0208 34.1591 49.0208 34.5881C49.0208 35.0511 48.9057 35.4645 48.6756 35.8281C48.4483 36.1889 48.1117 36.4744 47.6657 36.6847C47.2196 36.8949 46.6699 37 46.0165 37H42.2878ZM44.133 35.4915H45.6373C46.1515 35.4915 46.5265 35.3935 46.7623 35.1974C46.998 34.9986 47.1159 34.7344 47.1159 34.4048C47.1159 34.1634 47.0577 33.9503 46.9412 33.7656C46.8248 33.581 46.6586 33.4361 46.4426 33.331C46.2296 33.2259 45.9753 33.1733 45.6799 33.1733H44.133V35.4915ZM44.133 31.9247H45.5009C45.7537 31.9247 45.9782 31.8807 46.1742 31.7926C46.373 31.7017 46.5293 31.5739 46.6429 31.4091C46.7594 31.2443 46.8176 31.0469 46.8176 30.8168C46.8176 30.5014 46.7054 30.2472 46.481 30.054C46.2594 29.8608 45.9441 29.7642 45.535 29.7642H44.133V31.9247ZM50.2214 37V28.2727H52.0666V35.4787H55.8081V37H50.2214ZM57.03 37V28.2727H62.9107V29.794H58.8752V31.8736H62.6081V33.3949H58.8752V35.4787H62.9277V37H57.03ZM18.5589 44.794V43.2727H25.7266V44.794H23.0547V52H21.2308V44.794H18.5589ZM34.5284 47.6364C34.5284 48.5881 34.348 49.3977 33.9872 50.0653C33.6293 50.733 33.1406 51.2429 32.5213 51.5952C31.9048 51.9446 31.2116 52.1193 30.4418 52.1193C29.6662 52.1193 28.9702 51.9432 28.3537 51.5909C27.7372 51.2386 27.25 50.7287 26.892 50.0611C26.5341 49.3935 26.3551 48.5852 26.3551 47.6364C26.3551 46.6847 26.5341 45.875 26.892 45.2074C27.25 44.5398 27.7372 44.0312 28.3537 43.6818C28.9702 43.3295 29.6662 43.1534 30.4418 43.1534C31.2116 43.1534 31.9048 43.3295 32.5213 43.6818C33.1406 44.0312 33.6293 44.5398 33.9872 45.2074C34.348 45.875 34.5284 46.6847 34.5284 47.6364ZM32.6577 47.6364C32.6577 47.0199 32.5653 46.5 32.3807 46.0767C32.1989 45.6534 31.9418 45.3324 31.6094 45.1136C31.277 44.8949 30.8878 44.7855 30.4418 44.7855C29.9957 44.7855 29.6065 44.8949 29.2741 45.1136C28.9418 45.3324 28.6832 45.6534 28.4986 46.0767C28.3168 46.5 28.2259 47.0199 28.2259 47.6364C28.2259 48.2528 28.3168 48.7727 28.4986 49.196C28.6832 49.6193 28.9418 49.9403 29.2741 50.1591C29.6065 50.3778 29.9957 50.4872 30.4418 50.4872C30.8878 50.4872 31.277 50.3778 31.6094 50.1591C31.9418 49.9403 32.1989 49.6193 32.3807 49.196C32.5653 48.7727 32.6577 48.2528 32.6577 47.6364ZM41.2859 43.2727H43.131V48.9403C43.131 49.5767 42.979 50.1335 42.6751 50.6108C42.3739 51.0881 41.9521 51.4602 41.4094 51.7273C40.8668 51.9915 40.2347 52.1236 39.5131 52.1236C38.7887 52.1236 38.1552 51.9915 37.6126 51.7273C37.07 51.4602 36.6481 51.0881 36.3469 50.6108C36.0458 50.1335 35.8952 49.5767 35.8952 48.9403V43.2727H37.7404V48.7827C37.7404 49.1151 37.8129 49.4105 37.9577 49.669C38.1055 49.9276 38.3129 50.1307 38.5799 50.2784C38.8469 50.4261 39.158 50.5 39.5131 50.5C39.8711 50.5 40.1822 50.4261 40.4464 50.2784C40.7134 50.1307 40.9194 49.9276 41.0643 49.669C41.212 49.4105 41.2859 49.1151 41.2859 48.7827V43.2727ZM52.3494 46.3281H50.483C50.4489 46.0866 50.3793 45.8722 50.2741 45.6847C50.169 45.4943 50.0341 45.3324 49.8693 45.1989C49.7045 45.0653 49.5142 44.9631 49.2983 44.892C49.0852 44.821 48.8537 44.7855 48.6037 44.7855C48.152 44.7855 47.7585 44.8977 47.4233 45.1222C47.0881 45.3437 46.8281 45.6676 46.6435 46.0938C46.4588 46.517 46.3665 47.0312 46.3665 47.6364C46.3665 48.2585 46.4588 48.7812 46.6435 49.2045C46.831 49.6278 47.0923 49.9474 47.4276 50.1634C47.7628 50.3793 48.1506 50.4872 48.5909 50.4872C48.8381 50.4872 49.0668 50.4545 49.277 50.3892C49.4901 50.3239 49.679 50.2287 49.8438 50.1037C50.0085 49.9759 50.1449 49.821 50.2528 49.6392C50.3636 49.4574 50.4403 49.25 50.483 49.017L52.3494 49.0256C52.3011 49.4261 52.1804 49.8125 51.9872 50.1847C51.7969 50.554 51.5398 50.8849 51.2159 51.1776C50.8949 51.4673 50.5114 51.6974 50.0653 51.8679C49.6222 52.0355 49.1207 52.1193 48.5611 52.1193C47.7827 52.1193 47.0866 51.9432 46.473 51.5909C45.8622 51.2386 45.3793 50.7287 45.0241 50.0611C44.6719 49.3935 44.4957 48.5852 44.4957 47.6364C44.4957 46.6847 44.6747 45.875 45.0327 45.2074C45.3906 44.5398 45.8764 44.0312 46.4901 43.6818C47.1037 43.3295 47.794 43.1534 48.5611 43.1534C49.0668 43.1534 49.5355 43.2244 49.9673 43.3665C50.402 43.5085 50.7869 43.7159 51.1222 43.9886C51.4574 44.2585 51.7301 44.5895 51.9403 44.9815C52.1534 45.3736 52.2898 45.8224 52.3494 46.3281ZM53.6726 52V43.2727H55.5178V46.8736H59.2635V43.2727H61.1044V52H59.2635V48.3949H55.5178V52H53.6726Z" fill="white"/>
                </svg>
            `,
            disableTouch: `
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="1" width="78" height="78" rx="24" fill="#242424" stroke="white" stroke-width="3"/>
                <path d="M18.9402 37H15.8464V28.2727H18.9657C19.8436 28.2727 20.5993 28.4474 21.2328 28.7969C21.8663 29.1435 22.3535 29.642 22.6944 30.2926C23.0382 30.9432 23.2101 31.7216 23.2101 32.6278C23.2101 33.5369 23.0382 34.3182 22.6944 34.9716C22.3535 35.625 21.8635 36.1264 21.2243 36.4759C20.5879 36.8253 19.8265 37 18.9402 37ZM17.6916 35.419H18.8635C19.4089 35.419 19.8677 35.3224 20.2399 35.1293C20.6149 34.9332 20.8961 34.6307 21.0836 34.2216C21.274 33.8097 21.3691 33.2784 21.3691 32.6278C21.3691 31.983 21.274 31.456 21.0836 31.0469C20.8961 30.6378 20.6163 30.3366 20.2441 30.1435C19.872 29.9503 19.4132 29.8537 18.8677 29.8537H17.6916V35.419ZM26.4221 28.2727V37H24.5769V28.2727H26.4221ZM32.6745 30.7827C32.6404 30.4389 32.4941 30.1719 32.2356 29.9815C31.9771 29.7912 31.6262 29.696 31.1831 29.696C30.8819 29.696 30.6277 29.7386 30.4203 29.8239C30.2129 29.9062 30.0538 30.0213 29.943 30.169C29.835 30.3168 29.7811 30.4844 29.7811 30.6719C29.7754 30.8281 29.8081 30.9645 29.8791 31.081C29.9529 31.1974 30.0538 31.2983 30.1816 31.3835C30.3095 31.4659 30.4572 31.5384 30.6248 31.6009C30.7924 31.6605 30.9714 31.7116 31.1618 31.7543L31.9458 31.9418C32.3265 32.027 32.676 32.1406 32.9941 32.2827C33.3123 32.4247 33.5879 32.5994 33.8208 32.8068C34.0538 33.0142 34.2342 33.2585 34.362 33.5398C34.4927 33.821 34.5595 34.1435 34.5623 34.5071C34.5595 35.0412 34.4231 35.5043 34.1532 35.8963C33.8862 36.2855 33.4998 36.5881 32.9941 36.804C32.4913 37.017 31.8848 37.1236 31.1745 37.1236C30.47 37.1236 29.8564 37.0156 29.3336 36.7997C28.8137 36.5838 28.4075 36.2642 28.1149 35.8409C27.8251 35.4148 27.6731 34.8878 27.6589 34.2599H29.4444C29.4643 34.5526 29.5481 34.7969 29.6958 34.9929C29.8464 35.1861 30.0467 35.3324 30.2967 35.4318C30.5495 35.5284 30.835 35.5767 31.1532 35.5767C31.4657 35.5767 31.737 35.5312 31.9672 35.4403C32.2001 35.3494 32.3805 35.223 32.5083 35.0611C32.6362 34.8991 32.7001 34.7131 32.7001 34.5028C32.7001 34.3068 32.6419 34.142 32.5254 34.0085C32.4118 33.875 32.2441 33.7614 32.0225 33.6676C31.8038 33.5739 31.5353 33.4886 31.2172 33.4119L30.2669 33.1733C29.5311 32.9943 28.9501 32.7145 28.524 32.3338C28.0978 31.9531 27.8862 31.4403 27.889 30.7955C27.8862 30.267 28.0268 29.8054 28.3109 29.4105C28.5978 29.0156 28.9913 28.7074 29.4913 28.4858C29.9913 28.2642 30.5595 28.1534 31.1958 28.1534C31.8436 28.1534 32.4089 28.2642 32.8919 28.4858C33.3777 28.7074 33.7555 29.0156 34.0254 29.4105C34.2953 29.8054 34.4345 30.2628 34.443 30.7827H32.6745ZM37.1085 37H35.1312L38.144 28.2727H40.5218L43.5304 37H41.5531L39.367 30.267H39.2988L37.1085 37ZM36.9849 33.5696H41.6554V35.0099H36.9849V33.5696ZM44.5808 37V28.2727H48.0751C48.7172 28.2727 49.2527 28.3679 49.6816 28.5582C50.1106 28.7486 50.4331 29.0128 50.649 29.3509C50.8649 29.6861 50.9728 30.0724 50.9728 30.5099C50.9728 30.8509 50.9047 31.1506 50.7683 31.4091C50.6319 31.6648 50.4444 31.875 50.2058 32.0398C49.97 32.2017 49.7001 32.3168 49.3961 32.3849V32.4702C49.7285 32.4844 50.0396 32.5781 50.3294 32.7514C50.622 32.9247 50.8592 33.1676 51.041 33.4801C51.2228 33.7898 51.3137 34.1591 51.3137 34.5881C51.3137 35.0511 51.1987 35.4645 50.9686 35.8281C50.7413 36.1889 50.4047 36.4744 49.9586 36.6847C49.5126 36.8949 48.9629 37 48.3095 37H44.5808ZM46.426 35.4915H47.9302C48.4444 35.4915 48.8194 35.3935 49.0552 35.1974C49.291 34.9986 49.4089 34.7344 49.4089 34.4048C49.4089 34.1634 49.3507 33.9503 49.2342 33.7656C49.1177 33.581 48.9515 33.4361 48.7356 33.331C48.5225 33.2259 48.2683 33.1733 47.9728 33.1733H46.426V35.4915ZM46.426 31.9247H47.7939C48.0467 31.9247 48.2711 31.8807 48.4672 31.7926C48.666 31.7017 48.8223 31.5739 48.9359 31.4091C49.0524 31.2443 49.1106 31.0469 49.1106 30.8168C49.1106 30.5014 48.9984 30.2472 48.774 30.054C48.5524 29.8608 48.237 29.7642 47.8279 29.7642H46.426V31.9247ZM52.5144 37V28.2727H54.3596V35.4787H58.101V37H52.5144ZM59.323 37V28.2727H65.2037V29.794H61.1681V31.8736H64.9011V33.3949H61.1681V35.4787H65.2207V37H59.323ZM19.0589 44.794V43.2727H26.2266V44.794H23.5547V52H21.7308V44.794H19.0589ZM35.0284 47.6364C35.0284 48.5881 34.848 49.3977 34.4872 50.0653C34.1293 50.733 33.6406 51.2429 33.0213 51.5952C32.4048 51.9446 31.7116 52.1193 30.9418 52.1193C30.1662 52.1193 29.4702 51.9432 28.8537 51.5909C28.2372 51.2386 27.75 50.7287 27.392 50.0611C27.0341 49.3935 26.8551 48.5852 26.8551 47.6364C26.8551 46.6847 27.0341 45.875 27.392 45.2074C27.75 44.5398 28.2372 44.0312 28.8537 43.6818C29.4702 43.3295 30.1662 43.1534 30.9418 43.1534C31.7116 43.1534 32.4048 43.3295 33.0213 43.6818C33.6406 44.0312 34.1293 44.5398 34.4872 45.2074C34.848 45.875 35.0284 46.6847 35.0284 47.6364ZM33.1577 47.6364C33.1577 47.0199 33.0653 46.5 32.8807 46.0767C32.6989 45.6534 32.4418 45.3324 32.1094 45.1136C31.777 44.8949 31.3878 44.7855 30.9418 44.7855C30.4957 44.7855 30.1065 44.8949 29.7741 45.1136C29.4418 45.3324 29.1832 45.6534 28.9986 46.0767C28.8168 46.5 28.7259 47.0199 28.7259 47.6364C28.7259 48.2528 28.8168 48.7727 28.9986 49.196C29.1832 49.6193 29.4418 49.9403 29.7741 50.1591C30.1065 50.3778 30.4957 50.4872 30.9418 50.4872C31.3878 50.4872 31.777 50.3778 32.1094 50.1591C32.4418 49.9403 32.6989 49.6193 32.8807 49.196C33.0653 48.7727 33.1577 48.2528 33.1577 47.6364ZM41.7859 43.2727H43.631V48.9403C43.631 49.5767 43.479 50.1335 43.1751 50.6108C42.8739 51.0881 42.4521 51.4602 41.9094 51.7273C41.3668 51.9915 40.7347 52.1236 40.0131 52.1236C39.2887 52.1236 38.6552 51.9915 38.1126 51.7273C37.57 51.4602 37.1481 51.0881 36.8469 50.6108C36.5458 50.1335 36.3952 49.5767 36.3952 48.9403V43.2727H38.2404V48.7827C38.2404 49.1151 38.3129 49.4105 38.4577 49.669C38.6055 49.9276 38.8129 50.1307 39.0799 50.2784C39.3469 50.4261 39.658 50.5 40.0131 50.5C40.3711 50.5 40.6822 50.4261 40.9464 50.2784C41.2134 50.1307 41.4194 49.9276 41.5643 49.669C41.712 49.4105 41.7859 49.1151 41.7859 48.7827V43.2727ZM52.8494 46.3281H50.983C50.9489 46.0866 50.8793 45.8722 50.7741 45.6847C50.669 45.4943 50.5341 45.3324 50.3693 45.1989C50.2045 45.0653 50.0142 44.9631 49.7983 44.892C49.5852 44.821 49.3537 44.7855 49.1037 44.7855C48.652 44.7855 48.2585 44.8977 47.9233 45.1222C47.5881 45.3437 47.3281 45.6676 47.1435 46.0938C46.9588 46.517 46.8665 47.0312 46.8665 47.6364C46.8665 48.2585 46.9588 48.7812 47.1435 49.2045C47.331 49.6278 47.5923 49.9474 47.9276 50.1634C48.2628 50.3793 48.6506 50.4872 49.0909 50.4872C49.3381 50.4872 49.5668 50.4545 49.777 50.3892C49.9901 50.3239 50.179 50.2287 50.3438 50.1037C50.5085 49.9759 50.6449 49.821 50.7528 49.6392C50.8636 49.4574 50.9403 49.25 50.983 49.017L52.8494 49.0256C52.8011 49.4261 52.6804 49.8125 52.4872 50.1847C52.2969 50.554 52.0398 50.8849 51.7159 51.1776C51.3949 51.4673 51.0114 51.6974 50.5653 51.8679C50.1222 52.0355 49.6207 52.1193 49.0611 52.1193C48.2827 52.1193 47.5866 51.9432 46.973 51.5909C46.3622 51.2386 45.8793 50.7287 45.5241 50.0611C45.1719 49.3935 44.9957 48.5852 44.9957 47.6364C44.9957 46.6847 45.1747 45.875 45.5327 45.2074C45.8906 44.5398 46.3764 44.0312 46.9901 43.6818C47.6037 43.3295 48.294 43.1534 49.0611 43.1534C49.5668 43.1534 50.0355 43.2244 50.4673 43.3665C50.902 43.5085 51.2869 43.7159 51.6222 43.9886C51.9574 44.2585 52.2301 44.5895 52.4403 44.9815C52.6534 45.3736 52.7898 45.8224 52.8494 46.3281ZM54.1726 52V43.2727H56.0178V46.8736H59.7635V43.2727H61.6044V52H59.7635V48.3949H56.0178V52H54.1726Z" fill="white"/>
                </svg>
            `,
            editControls: `
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="1" width="78" height="78" rx="24" fill="#242424" stroke="white" stroke-width="3"/>
                <path d="M27.03 37V28.2727H32.9107V29.794H28.8752V31.8736H32.6081V33.3949H28.8752V35.4787H32.9277V37H27.03ZM37.4714 37H34.3777V28.2727H37.497C38.3748 28.2727 39.1305 28.4474 39.764 28.7969C40.3976 29.1435 40.8848 29.642 41.2257 30.2926C41.5694 30.9432 41.7413 31.7216 41.7413 32.6278C41.7413 33.5369 41.5694 34.3182 41.2257 34.9716C40.8848 35.625 40.3947 36.1264 39.7555 36.4759C39.1191 36.8253 38.3578 37 37.4714 37ZM36.2228 35.419H37.3947C37.9402 35.419 38.399 35.3224 38.7711 35.1293C39.1461 34.9332 39.4274 34.6307 39.6149 34.2216C39.8052 33.8097 39.9004 33.2784 39.9004 32.6278C39.9004 31.983 39.8052 31.456 39.6149 31.0469C39.4274 30.6378 39.1475 30.3366 38.7754 30.1435C38.4032 29.9503 37.9444 29.8537 37.399 29.8537H36.2228V35.419ZM44.9533 28.2727V37H43.1081V28.2727H44.9533ZM46.139 29.794V28.2727H53.3066V29.794H50.6348V37H48.8109V29.794H46.139ZM14.867 46.3281H13.0005C12.9664 46.0866 12.8968 45.8722 12.7917 45.6847C12.6866 45.4943 12.5517 45.3324 12.3869 45.1989C12.2221 45.0653 12.0318 44.9631 11.8159 44.892C11.6028 44.821 11.3713 44.7855 11.1213 44.7855C10.6696 44.7855 10.2761 44.8977 9.94087 45.1222C9.60565 45.3437 9.3457 45.6676 9.16104 46.0938C8.97639 46.517 8.88406 47.0312 8.88406 47.6364C8.88406 48.2585 8.97639 48.7812 9.16104 49.2045C9.34854 49.6278 9.60991 49.9474 9.94513 50.1634C10.2804 50.3793 10.6681 50.4872 11.1085 50.4872C11.3556 50.4872 11.5843 50.4545 11.7946 50.3892C12.0076 50.3239 12.1966 50.2287 12.3613 50.1037C12.5261 49.9759 12.6625 49.821 12.7704 49.6392C12.8812 49.4574 12.9579 49.25 13.0005 49.017L14.867 49.0256C14.8187 49.4261 14.698 49.8125 14.5048 50.1847C14.3145 50.554 14.0574 50.8849 13.7335 51.1776C13.4125 51.4673 13.0289 51.6974 12.5829 51.8679C12.1397 52.0355 11.6383 52.1193 11.0787 52.1193C10.3002 52.1193 9.60423 51.9432 8.99059 51.5909C8.37979 51.2386 7.89684 50.7287 7.54173 50.0611C7.18945 49.3935 7.01332 48.5852 7.01332 47.6364C7.01332 46.6847 7.19229 45.875 7.55025 45.2074C7.9082 44.5398 8.394 44.0312 9.00764 43.6818C9.62127 43.3295 10.3116 43.1534 11.0787 43.1534C11.5843 43.1534 12.0531 43.2244 12.4849 43.3665C12.9196 43.5085 13.3045 43.7159 13.6397 43.9886C13.975 44.2585 14.2477 44.5895 14.4579 44.9815C14.671 45.3736 14.8074 45.8224 14.867 46.3281ZM24.2101 47.6364C24.2101 48.5881 24.0297 49.3977 23.6689 50.0653C23.3109 50.733 22.8223 51.2429 22.2029 51.5952C21.5865 51.9446 20.8933 52.1193 20.1234 52.1193C19.3478 52.1193 18.6518 51.9432 18.0353 51.5909C17.4189 51.2386 16.9316 50.7287 16.5737 50.0611C16.2157 49.3935 16.0368 48.5852 16.0368 47.6364C16.0368 46.6847 16.2157 45.875 16.5737 45.2074C16.9316 44.5398 17.4189 44.0312 18.0353 43.6818C18.6518 43.3295 19.3478 43.1534 20.1234 43.1534C20.8933 43.1534 21.5865 43.3295 22.2029 43.6818C22.8223 44.0312 23.3109 44.5398 23.6689 45.2074C24.0297 45.875 24.2101 46.6847 24.2101 47.6364ZM22.3393 47.6364C22.3393 47.0199 22.247 46.5 22.0623 46.0767C21.8805 45.6534 21.6234 45.3324 21.291 45.1136C20.9586 44.8949 20.5694 44.7855 20.1234 44.7855C19.6774 44.7855 19.2882 44.8949 18.9558 45.1136C18.6234 45.3324 18.3649 45.6534 18.1802 46.0767C17.9984 46.5 17.9075 47.0199 17.9075 47.6364C17.9075 48.2528 17.9984 48.7727 18.1802 49.196C18.3649 49.6193 18.6234 49.9403 18.9558 50.1591C19.2882 50.3778 19.6774 50.4872 20.1234 50.4872C20.5694 50.4872 20.9586 50.3778 21.291 50.1591C21.6234 49.9403 21.8805 49.6193 22.0623 49.196C22.247 48.7727 22.3393 48.2528 22.3393 47.6364ZM32.8766 43.2727V52H31.2828L27.486 46.5071H27.4221V52H25.5769V43.2727H27.1962L30.9632 48.7614H31.04V43.2727H32.8766ZM34.0687 44.794V43.2727H41.2363V44.794H38.5645V52H36.7406V44.794H34.0687ZM42.4167 52V43.2727H45.8599C46.519 43.2727 47.0815 43.3906 47.5474 43.6264C48.0162 43.8594 48.3727 44.1903 48.617 44.6193C48.8642 45.0455 48.9877 45.5469 48.9877 46.1236C48.9877 46.7031 48.8627 47.2017 48.6127 47.6193C48.3627 48.0341 48.0005 48.3523 47.5261 48.5739C47.0545 48.7955 46.4835 48.9062 45.813 48.9062H43.5076V47.4233H45.5147C45.867 47.4233 46.1596 47.375 46.3926 47.2784C46.6255 47.1818 46.7988 47.0369 46.9125 46.8438C47.0289 46.6506 47.0872 46.4105 47.0872 46.1236C47.0872 45.8338 47.0289 45.5895 46.9125 45.3906C46.7988 45.1918 46.6241 45.0412 46.3883 44.9389C46.1554 44.8338 45.8613 44.7812 45.5062 44.7812H44.2619V52H42.4167ZM47.1298 48.0284L49.2988 52H47.2619L45.1397 48.0284H47.1298ZM58.3116 47.6364C58.3116 48.5881 58.1312 49.3977 57.7704 50.0653C57.4125 50.733 56.9238 51.2429 56.3045 51.5952C55.688 51.9446 54.9949 52.1193 54.225 52.1193C53.4494 52.1193 52.7534 51.9432 52.1369 51.5909C51.5204 51.2386 51.0332 50.7287 50.6752 50.0611C50.3173 49.3935 50.1383 48.5852 50.1383 47.6364C50.1383 46.6847 50.3173 45.875 50.6752 45.2074C51.0332 44.5398 51.5204 44.0312 52.1369 43.6818C52.7534 43.3295 53.4494 43.1534 54.225 43.1534C54.9949 43.1534 55.688 43.3295 56.3045 43.6818C56.9238 44.0312 57.4125 44.5398 57.7704 45.2074C58.1312 45.875 58.3116 46.6847 58.3116 47.6364ZM56.4409 47.6364C56.4409 47.0199 56.3485 46.5 56.1639 46.0767C55.9821 45.6534 55.725 45.3324 55.3926 45.1136C55.0602 44.8949 54.671 44.7855 54.225 44.7855C53.7789 44.7855 53.3897 44.8949 53.0574 45.1136C52.725 45.3324 52.4664 45.6534 52.2818 46.0767C52.1 46.5 52.0091 47.0199 52.0091 47.6364C52.0091 48.2528 52.1 48.7727 52.2818 49.196C52.4664 49.6193 52.725 49.9403 53.0574 50.1591C53.3897 50.3778 53.7789 50.4872 54.225 50.4872C54.671 50.4872 55.0602 50.3778 55.3926 50.1591C55.725 49.9403 55.9821 49.6193 56.1639 49.196C56.3485 48.7727 56.4409 48.2528 56.4409 47.6364ZM59.6784 52V43.2727H61.5236V50.4787H65.2651V52H59.6784ZM71.2214 45.7827C71.1873 45.4389 71.041 45.1719 70.7825 44.9815C70.524 44.7912 70.1731 44.696 69.7299 44.696C69.4288 44.696 69.1745 44.7386 68.9672 44.8239C68.7598 44.9062 68.6007 45.0213 68.4899 45.169C68.3819 45.3168 68.3279 45.4844 68.3279 45.6719C68.3223 45.8281 68.3549 45.9645 68.426 46.081C68.4998 46.1974 68.6007 46.2983 68.7285 46.3835C68.8564 46.4659 69.0041 46.5384 69.1717 46.6009C69.3393 46.6605 69.5183 46.7116 69.7086 46.7543L70.4927 46.9418C70.8734 47.027 71.2228 47.1406 71.541 47.2827C71.8592 47.4247 72.1348 47.5994 72.3677 47.8068C72.6007 48.0142 72.7811 48.2585 72.9089 48.5398C73.0396 48.821 73.1064 49.1435 73.1092 49.5071C73.1064 50.0412 72.97 50.5043 72.7001 50.8963C72.4331 51.2855 72.0467 51.5881 71.541 51.804C71.0382 52.017 70.4316 52.1236 69.7214 52.1236C69.0169 52.1236 68.4032 52.0156 67.8805 51.7997C67.3606 51.5838 66.9544 51.2642 66.6618 50.8409C66.372 50.4148 66.22 49.8878 66.2058 49.2599H67.9913C68.0112 49.5526 68.095 49.7969 68.2427 49.9929C68.3933 50.1861 68.5936 50.3324 68.8436 50.4318C69.0964 50.5284 69.3819 50.5767 69.7001 50.5767C70.0126 50.5767 70.2839 50.5312 70.514 50.4403C70.747 50.3494 70.9274 50.223 71.0552 50.0611C71.1831 49.8991 71.247 49.7131 71.247 49.5028C71.247 49.3068 71.1887 49.142 71.0723 49.0085C70.9586 48.875 70.791 48.7614 70.5694 48.6676C70.3507 48.5739 70.0822 48.4886 69.764 48.4119L68.8137 48.1733C68.0779 47.9943 67.497 47.7145 67.0708 47.3338C66.6447 46.9531 66.4331 46.4403 66.4359 45.7955C66.4331 45.267 66.5737 44.8054 66.8578 44.4105C67.1447 44.0156 67.5382 43.7074 68.0382 43.4858C68.5382 43.2642 69.1064 43.1534 69.7427 43.1534C70.3904 43.1534 70.9558 43.2642 71.4387 43.4858C71.9245 43.7074 72.3024 44.0156 72.5723 44.4105C72.8422 44.8054 72.9814 45.2628 72.9899 45.7827H71.2214Z" fill="white"/>
                </svg>
            `
        };
        return svgs[buttonType] || '';
    }

    /**
     * Hides all virtual controls and their containers
     * @method hideControls
     * @returns {void}
     */
    hideControls() {
        const controlsContainer = document.getElementById('virtualControlsContainer');
        const streamControlsContainer = document.getElementById('virtualStreamControlsContainer');
        
        // Debug log before hiding
        console.log('Before hiding - Stream Controls Container:', {
            exists: !!streamControlsContainer,
            display: streamControlsContainer?.style.display,
            visibility: streamControlsContainer?.style.visibility,
            children: streamControlsContainer?.children.length
        });
    
        [controlsContainer, streamControlsContainer].forEach(container => {
            if (container) {
                container.style.display = 'none';
                container.style.visibility = 'hidden';
                // Force a reflow
                container.offsetHeight;
            }
        });
        
        ['virtual-button', 'virtual-joystick'].forEach(className => {
            Array.from(document.getElementsByClassName(className)).forEach(element => {
                element.style.display = 'none';
                element.style.visibility = 'hidden';
                // Force a reflow
                element.offsetHeight;
            });
        });
    }
    
    /**
     * Shows all virtual controls if in landscape mode
     * @method showControls
     * @returns {void}
     */
    showControls() {
        const controlsContainer = document.getElementById('virtualControlsContainer');
        const streamControlsContainer = document.getElementById('virtualStreamControlsContainer');
        
        // Only show if in landscape mode
        const isLandscape = window.innerWidth > window.innerHeight;
        
        // Debug log before showing
        console.log('Before showing - Stream Controls Container:', {
            exists: !!streamControlsContainer,
            display: streamControlsContainer?.style.display,
            visibility: streamControlsContainer?.style.visibility,
            children: streamControlsContainer?.children.length,
            isLandscape: isLandscape
        });
    
        if (isLandscape) {
            [controlsContainer, streamControlsContainer].forEach(container => {
                if (container) {
                    container.style.removeProperty('display');
                    container.style.removeProperty('visibility');
                    container.style.display = 'block';
                    container.style.visibility = 'visible';
                    // Force a reflow
                    container.offsetHeight;
                }
            });
            
            ['virtual-button', 'virtual-joystick'].forEach(className => {
                Array.from(document.getElementsByClassName(className)).forEach(element => {
                    element.style.removeProperty('display');
                    element.style.removeProperty('visibility');
                    element.style.display = 'block';
                    element.style.visibility = 'visible';
                    // Force a reflow
                    element.offsetHeight;
                });
            });
        }
    
        // Debug log after showing
        console.log('After showing - Stream Controls Container:', {
            exists: !!streamControlsContainer,
            display: streamControlsContainer?.style.display,
            visibility: streamControlsContainer?.style.visibility,
            children: streamControlsContainer?.children.length
        });
    }    
}

/**
 * Creates and configures stream control buttons
 * @function createStreamControls
 * @returns {void}
 * 
 * @description
 * Creates control buttons for streaming functions in landscape mode only.
 * Handles button layout, sizing, and orientation changes.
 */
function createStreamControls() {
    // Use a more reliable method to detect orientation
    const checkOrientation = () => {
        if (window.screen && window.screen.orientation) {
            return !window.screen.orientation.type.includes('portrait');
        }
        return window.innerHeight < window.innerWidth;
    };

    // Only skip if definitely in portrait mode
    const isLandscape = checkOrientation();
    if (!isLandscape) {
        console.log('Portrait mode detected, skipping stream controls creation');
        return;
    }

    const container = document.getElementById('virtualStreamControlsContainer');
    if (!container) {
        console.error('Stream controls container not found in DOM');
        return;
    }

    // Ensure container is visible
    container.style.display = 'flex';
    container.style.flexDirection = 'row';
    container.style.justifyContent = 'center';
    container.style.alignItems = 'center';
    container.style.width = '100%';
    container.style.padding = '1vh';
    container.style.visibility = 'visible'; // Ensure visibility
    container.style.opacity = '1'; // Ensure opacity

    // Clear any existing controls
    container.innerHTML = '';

    const buttonPositions = [
        { id: 'streamingTerminate', svgName: 'terminate' },
        { id: 'viewControlsButton', svgName: 'viewControls' },
        { id: 'enableTouchButton', svgName: 'enableTouch' },
        { id: 'editControlsButton', svgName: 'editControls' }
    ];

    const spacing = 2;
    
    buttonPositions.forEach((buttonConfig) => {
        const wrapper = document.createElement('div');
        wrapper.style.margin = `0 ${spacing}vw`;
        wrapper.style.display = 'flex'; // Ensure wrapper is visible
        
        const button = new StreamControlButton({
            id: buttonConfig.id,
            svgName: buttonConfig.svgName
        });
        
        // Use more reliable sizing
        button.element.style.width = '40px';
        button.element.style.height = '40px';
        button.element.style.maxWidth = '8vw';
        button.element.style.maxHeight = '8vh';
        button.element.style.display = 'block'; // Ensure button is visible
        
        wrapper.appendChild(button.element);
        container.appendChild(wrapper);
    });

    // Improved resize handler with debouncing
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (checkOrientation()) {
                buttonPositions.forEach(buttonConfig => {
                    const button = VirtualButton.instances.get(buttonConfig.id);
                    if (button && button.element) {
                        button.element.style.width = '40px';
                        button.element.style.height = '40px';
                        button.element.style.maxWidth = '8vw';
                        button.element.style.maxHeight = '8vh';
                    }
                });
            }
        }, 250);
    });

    // Improved orientation change handler
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            if (checkOrientation()) {
                createStreamControls();
            }
        }, 300); // Increased timeout for better reliability
    });

    // Force layout recalculation
    container.offsetHeight; // Trigger reflow
}

/**
 * Initializes stream controls and ensures visibility
 * @function initializeStreamControls
 * @returns {void}
 */
function initializeStreamControls() {
    createStreamControls();
    // Force layout update
    requestAnimationFrame(() => {
        const container = document.getElementById('virtualStreamControlsContainer');
        if (container) {
            container.style.display = 'flex';
            container.style.visibility = 'visible';
        }
    });
}

/**
 * Checks and logs visibility state of virtual stream controls container
 * @function checkContainerVisibility
 * @returns {void}
 */
function checkContainerVisibility() {
    const container = document.getElementById('virtualStreamControlsContainer');
    if (container) {
        console.log('Container computed style:', window.getComputedStyle(container));
        console.log('Container dimensions:', container.getBoundingClientRect());
        console.log('Container visibility:', container.style.visibility);
        console.log('Container display:', container.style.display);
    }
}

/**
 * Initializes controls when DOM is loaded
 * @event DOMContentLoaded
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded');

    // Create stream controls
    createStreamControls();

    checkContainerVisibility();

});

/**
 * Event handler for d-pad movement
 * @event dpadMove
 * @param {Object} e.detail - Movement details
 * @param {string} e.detail.direction - Movement direction ('up'|'down'|'left'|'right')
 * @param {number} e.detail.speed - Movement speed
 */
document.addEventListener('dpadMove', (e) => {
    const { direction, speed } = e.detail;
    switch(direction) {
        case 'up':
            // Handle upward movement
            break;
        case 'down':
            // Handle downward movement
            break;
        case 'left':
            // Handle left movement
            break;
        case 'right':
            // Handle right movement
            break;
    }
});

/**
 * @class VirtualGamepad
 * @description Simulates a standard gamepad interface
 */
class VirtualGamepad {
    /**
     * Creates a new virtual gamepad instance
     * @constructor
     */
    constructor() {
        this.buttons = Array(16).fill().map(() => ({
            pressed: false,
            touched: false,
            value: 0
        }));
        this.axes = Array(4).fill(0);
        this.connected = true;
        this.timestamp = performance.now();
        this.id = "Virtual Gamepad";
        this.index = 0;
        this.mapping = "standard";
    }

    /**
     * Sets the state of a gamepad button
     * @param {number} index - Button index
     * @param {boolean} pressed - Press state
     * @param {number} [value=pressed ? 1.0 : 0.0] - Button pressure value
     * @returns {void}
     */
    setButton(index, pressed, value = pressed ? 1.0 : 0.0) {
        if (index === undefined) return;
        
        this.buttons[index] = {
            pressed: pressed,
            touched: pressed,
            value: value
        };
        this.timestamp = performance.now();
    }

     /**
     * Sets the value of a gamepad axis
     * @param {number} index - Axis index
     * @param {number} value - Axis value (-1.0 to 1.0)
     * @returns {void}
     */
    setAxis(index, value) {
        this.axes[index] = Math.max(-1.0, Math.min(1.0, value));
        this.timestamp = performance.now();
    }
}





