
/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 */

/**
 * @fileoverview Collect Local WebRTC Stats and displays Metrics in Widgets
 * @version 1.0.0
 */

// Collect Local WebRTC Stats
let aggregatedStats = {};

// Global flag to track metrics view state
let isViewingMetrics = false;

// Start the timer
const timerInterval = updateSessionTime();

const METRICS_TO_COLLECT = {
    'candidate-pair': ['currentRoundTripTime'],
    'transport': ['bytesReceived', 'bytesSent'],
    'inbound-rtp': [
        'framesPerSecond',
        'framesReceived',
        'framesDecoded',
        'framesDropped',
        'jitter',
        'packetsLost',
        'packetsReceived'
    ]
};

// CTRL-S for Stats
document.addEventListener('keydown', function(event) {
    // Check if Ctrl+S is pressed (83 is the key code for 'S')
    if (event.ctrlKey && event.keyCode === 83) {
        event.preventDefault(); // Prevent the default save action
        toggleWidgetsVisibility();
    }
});

/**
 * Toggles the visibility of a statistics box and manages its position in the DOM
 * This function handles both showing/hiding the stats box and ensuring it's properly
 * positioned within the fullscreen container.
 */
function toggleStatsBox() {
    // Get reference to the stats box element
    const statsBox = document.getElementById('streamFullscreenContainer');
    
    // Get the container element - either the current fullscreen element if it exists,
    // or fall back to the streamFullscreenContainer
    const container = document.fullscreenElement || document.getElementById('streamFullscreenContainer');
    
    // Check if the stats box is currently hidden
    // (display is 'none' or '' [empty string represents default state])
    if (statsBox.style.display === 'none' || statsBox.style.display === '') {
        // Show the stats box
        statsBox.style.display = 'block';
        
        // Move the stats box element into the container
        // This ensures proper positioning when in fullscreen mode
        container.appendChild(statsBox);
    } else {
        // Hide the stats box
        statsBox.style.display = 'none';
        
        // Reset the position of the stats box to its original position
        // using transform property with translate3d
        statsBox.style.transform = 'translate3d(0px, 0px, 0)';
        
        // Reset position offset variables to their initial values
        xOffset = 0;
        yOffset = 0;
    }
}

/**
 * Toggles the visibility of widgets container and persists the state
 * @function toggleWidgetsVisibility
 * @returns {void}
 */
function toggleWidgetsVisibility() {
    const widgetsContainer = document.getElementById('widgetsContainer');
    let isVisible = localStorage.getItem('widgetsVisible') !== 'false';

    if (isVisible) {
        widgetsContainer.style.display = 'none';
        isVisible = false;
    } else {
        widgetsContainer.style.display = 'block'; // or 'flex', depending on your layout
        isVisible = true;
    }

    localStorage.setItem('widgetsVisible', isVisible);
}

/**
 * Handles ending the game session and displaying metrics
 * @async
 * @returns {Promise<void>}
 */
async function handleEndGameAndViewMetrics() {
    try {
        // Set flag to stop chart updates
        isViewingMetrics = true;

        // Stop all existing chart updates
        stopAllChartUpdates();

        // Remove URL parameters first to prevent auto-reconnect
        const baseUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, baseUrl);

        // Disconnect stream if it exists
        if (window.myGameLiftStreams) {
            try {
                await window.myGameLiftStreams.disconnect();
                window.myGameLiftStreams = null;
                window.activeGameLiftStream = null;
            } catch (error) {
                console.warn('Error disconnecting stream:', error);
            }
        }

        // Destroy the stream session
        const connectionToken = getQueryParams().get('token');
        if (connectionToken) {
            try {
                await doPost('/api/DestroyStreamSession', { Token: connectionToken });
            } catch (error) {
                console.warn('Failed to destroy stream session:', error);
                showNotification('Warning: Session cleanup may not have completed properly');
            }
        }

        // Get active widgets data before clearing
        const activeWidgets = getActiveWidgetsWithData();

        // Show containers first
        document.getElementById('fullWebrtcStats').style.display = 'block';
        document.getElementById('disconnectedButtons').style.display = 'none';
        document.getElementById('statsContent').style.display = 'block';

        // Clear existing content
        const statsContent = document.getElementById('statsContent');
        if (!statsContent) {
            throw new Error('Stats content container not found');
        }
        statsContent.innerHTML = '';

        // Create session time display
        const sessionTimeDisplay = document.createElement('div');
        sessionTimeDisplay.id = 'session-time';
        sessionTimeDisplay.className = 'session-time-displaylay';
        statsContent.appendChild(sessionTimeDisplay);

        // Create charts container
        const chartsContainer = document.createElement('div');
        chartsContainer.className = 'charts-container';
        chartsContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 20px;
            padding: 20px;
            margin-top: 20px;
            max-height: 80vh; /* Set maximum height to 80% of viewport height */
            overflow-y: auto; /* Enable vertical scrolling */
            overflow-x: hidden; /* Hide horizontal scrollbar */
        `;

        // Add custom scrollbar styling
        const style = document.createElement('style');
        style.textContent = `
            .charts-container::-webkit-scrollbar {
                width: 10px;
            }
            
            .charts-container::-webkit-scrollbar-track {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 5px;
            }
            
            .charts-container::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.3);
                border-radius: 5px;
            }
            
            .charts-container::-webkit-scrollbar-thumb:hover {
                background: rgba(255, 255, 255, 0.4);
            }
        `;
        document.head.appendChild(style);

        statsContent.appendChild(chartsContainer);

        // Wait for DOM to update
        await new Promise(resolve => setTimeout(resolve, 100));

        // Check if we have any widgets to display
        if (activeWidgets.length === 0) {
            const noDataMessage = document.createElement('div');
            noDataMessage.className = 'no-data-message';
            noDataMessage.textContent = 'No metrics widgets were active during this session.';
            noDataMessage.style.textAlign = 'center';
            noDataMessage.style.padding = '20px';
            noDataMessage.style.color = 'white';
            chartsContainer.appendChild(noDataMessage);
            return;
        }

        // Create and render charts
        for (const widgetData of activeWidgets) {
            try {
                const chartContainer = document.createElement('div');
                chartContainer.className = 'chart-container';
                chartContainer.style.width = '100%';
                chartContainer.style.height = '300px';
                chartContainer.style.position = 'relative';
                chartContainer.style.marginBottom = '20px';
                chartContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
                chartContainer.style.borderRadius = '10px';
                chartContainer.style.padding = '15px';

                const canvas = document.createElement('canvas');
                canvas.id = `${widgetData.type}MetricsChart`;
                chartContainer.appendChild(canvas);
                chartsContainer.appendChild(chartContainer);

                await createMetricsChart(canvas, widgetData);
            } catch (error) {
                console.error(`Error creating chart for ${widgetData.type}:`, error);
                const errorMessage = document.createElement('div');
                errorMessage.className = 'chart-error';
                errorMessage.textContent = `Failed to create ${widgetData.type} chart`;
                errorMessage.style.color = 'red';
                errorMessage.style.padding = '10px';
                chartsContainer.appendChild(errorMessage);
            }
        }

        // Update session time
        updateEndSessionTime();

    } catch (error) {
        console.error('Error handling end game and metrics:', error);
        showError('Failed to display metrics.');
    }
}

/**
 * Stops all chart updates
 */
function stopAllChartUpdates() {
    // Clear any existing update intervals
    const widgets = document.querySelectorAll('.widget');
    widgets.forEach(widget => {
        if (widget.updateInterval) {
            clearInterval(widget.updateInterval);
            widget.updateInterval = null;
        }
    });
}

/**
 * Gets data from active widgets
 * @returns {Array} Array of widget data objects
 */
function getActiveWidgetsWithData() {
    const widgets = document.querySelectorAll('.widget');
    const activeWidgets = [];
    
    widgets.forEach(widget => {
        const canvas = widget.querySelector('canvas');
        if (canvas && canvas.id) {
            const widgetType = canvas.id.replace('Chart', '');
            const chartInstance = Chart.getChart(canvas);
            
            if (chartInstance && chartConfigs[widgetType]) {
                // Get current chart data
                const currentData = {
                    labels: [...chartInstance.data.labels], // Create copies of the data
                    datasets: chartInstance.data.datasets.map(dataset => ({
                        label: dataset.label,
                        data: [...dataset.data],
                        borderColor: dataset.borderColor,
                        tension: dataset.tension
                    }))
                };

                activeWidgets.push({
                    type: widgetType,
                    data: currentData,
                    config: chartConfigs[widgetType]
                });

                // Destroy the old chart instance
                chartInstance.destroy();
            }
        }
    });

    return activeWidgets;
}

/**
 * Creates a chart for the metrics view
 * @param {HTMLCanvasElement} canvas - The canvas element
 * @param {Object} widgetData - The widget data and configuration
 * @returns {Promise<Chart>} The created chart instance
 */
async function createMetricsChart(canvas, widgetData) {
    return new Promise((resolve) => {
        requestAnimationFrame(() => {
            const ctx = canvas.getContext('2d');
            
            const newChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: widgetData.data.labels,
                    datasets: widgetData.data.datasets.map(dataset => ({
                        ...dataset,
                        tension: 0.1
                    }))
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: false, // Disable animations in metrics view
                    plugins: {
                        legend: {
                            labels: { color: 'rgb(255, 255, 255)' }
                        },
                        title: {
                            display: true,
                            text: widgetData.config.title,
                            color: 'rgb(255, 255, 255)'
                        }
                    },
                    scales: {
                        x: {
                            title: { display: true, text: 'Time', color: 'rgb(255, 255, 255)' },
                            ticks: { color: 'rgb(255, 255, 255)' },
                            grid: { color: 'rgba(255, 255, 255, 0.1)' }
                        },
                        y: {
                            title: { display: true, text: 'Value', color: 'rgb(255, 255, 255)' },
                            ticks: { color: 'rgb(255, 255, 255)' },
                            grid: { color: 'rgba(255, 255, 255, 0.1)' }
                        }
                    }
                }
            });

            resolve(newChart);
        });
    });
}

/**
 * Updates the final session time display
 */
function updateEndSessionTime() {
    if (!window.streamStartTime) return;

    const sessionTimeElement = document.getElementById('session-time');
    if (!sessionTimeElement) return;

    const duration = Date.now() - window.streamStartTime;
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((duration % (1000 * 60)) / 1000);

    sessionTimeElement.innerHTML = `
        <div class="session-time-header">Total Session Duration</div>
        <div class="session-time-value">
            ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}
        </div>
    `;
}

/**
 * Shows a notification message
 * @param {string} message - The message to display
 */
function showNotification(message) {
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.padding = '10px 20px';
        notification.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        notification.style.borderRadius = '5px';
        notification.style.zIndex = '10000';
        notification.style.transition = 'opacity 0.3s ease-in-out';
        document.body.appendChild(notification);
    }

    notification.textContent = message;
    notification.style.opacity = '1';

    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

/**
 * Shows an error message in the stats content area
 * @param {string} message - The error message to display
 */
function showError(message) {
    const statsContent = document.getElementById('statsContent');
    if (statsContent) {
        statsContent.innerHTML = `
            <div class="error-message">
                <h3>Error</h3>
                <p>${message}</p>
            </div>
        `;
    }
}

/**
 * Handles the display and analysis of WebRTC metrics
 * @function handleViewMetrics
 * @async
 * @returns {Promise<void>}
 */
async function handleViewMetrics() {
    // First, ensure all required DOM elements exist
    const requiredElements = {
        fullWebrtcStats: document.getElementById('fullWebrtcStats'),
        disconnectedButtons: document.getElementById('disconnectedButtons'),
        statsContent: document.getElementById('statsContent'),
    };

    // Check if all required elements exist
    const missingElements = Object.entries(requiredElements)
        .filter(([key, element]) => !element)
        .map(([key]) => key);

    if (missingElements.length > 0) {
        console.error('Missing required DOM elements:', missingElements);
        return;
    }

    // Now safely set display properties
    requiredElements.fullWebrtcStats.style.display = 'block';
    requiredElements.disconnectedButtons.style.display = 'none';
    requiredElements.statsContent.style.display = 'block';

    try {
        const statsForAnalysis = prepareStatsForServer();
        if (!statsForAnalysis) {
            throw new Error('Failed to prepare stats for analysis');
        }

        // Save the stats to a file
        await saveAggregatedStats(statsForAnalysis);
        
        // Create the major session metric charts
        await createMajorMetricsChart(statsForAnalysis);

        // Clean up function
        const cleanUp = () => {
            if (sessionTimeInterval) {
                clearInterval(sessionTimeInterval);
            }
        };

        // Add event listener for when the stats view is closed
        const closeButton = document.getElementById('closeStatsButton');
        if (closeButton) {
            closeButton.addEventListener('click', cleanUp);
        }

    } catch (error) {
        console.error('Error analyzing WebRTC stats:', error);
        
        if (requiredElements.statsContent) {
            requiredElements.statsContent.innerHTML = `
                <div class="error-message">
                    <h3>Error Analyzing Session Metrics</h3>
                    <p>${error.message}</p>
                    <p>Please try again or contact support if the issue persists.</p>
                </div>
            `;
        }
        
        if (requiredElements.loadingIndicator) {
            requiredElements.loadingIndicator.style.display = 'none';
        }
    }
}

/**
 * Updates the session time display
 * @function updateSessionTime
 * @returns {number|null} Interval ID if successful, null if failed
 */
function updateSessionTime() {
    try {
        let sessionTimeElement = document.getElementById('session-time');
        if (!sessionTimeElement) {
            sessionTimeElement = document.createElement('div');
            sessionTimeElement.id = 'session-time';
            const container = document.getElementById('statsContent');
            if (container) {
                container.prepend(sessionTimeElement);
            } else {
                return null;
            }
        }

        if (!window.streamStartTime) {
            console.error('Stream start time not set');
            sessionTimeElement.textContent = 'Session Time: Not available';
            return null;
        }

        const startTime = new Date(window.streamStartTime).getTime();
        let intervalId;
        
        function update() {
            const diff = Date.now() - startTime;
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            
            sessionTimeElement.textContent = 
                `Session Time: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }

        update(); // Call once immediately
        intervalId = setInterval(update, 1000);
        return intervalId;
    } catch (error) {
        console.error('Error updating session time:', error);
        return null;
    }
}

/**
 * Validates the WebRTC stats object
 * @function validateStats
 * @param {Object} stats - The WebRTC stats object to validate
 * @throws {Error} If stats are invalid
 * @returns {boolean} True if stats are valid
 */
function validateStats(stats) {
    if (!stats || typeof stats !== 'object') {
        throw new Error('Invalid stats object');
    }
    
    // Add any additional validation as needed
    return true;
}

/**
 * Creates a container element for charts
 * @function createChartContainer
 * @returns {HTMLElement} The created chart container element
 */
function createChartContainer() {
    const container = document.createElement('div');
    container.className = 'chart-container';
    container.style.position = 'relative';
    container.style.height = '300px';  // Adjust height as needed
    container.style.width = '100%';
    container.style.marginBottom = '20px';
    return container;
}

/**
 * Creates charts for major metrics
 * @function createMajorMetricsChart
 * @async
 * @param {Object} statsData - The stats data to visualize
 * @returns {Promise<void>}
 */
function createMajorMetricsChart(statsForAnalysis) {
    try {
        validateStats(statsForAnalysis);

        if (!statsForAnalysis.stats) {
            throw new Error('No stats data available');
        }

        const container = document.getElementById('statsContent');
        if (!container) {
            throw new Error('Stats container not found');
        }

        container.innerHTML = ''; // Clear existing content

        // Create charts container
        const chartsContainer = document.createElement('div');
        chartsContainer.className = 'charts-container';
        chartsContainer.style.display = 'flex';
        chartsContainer.style.flexDirection = 'column';
        chartsContainer.style.gap = '20px';
        chartsContainer.style.padding = '20px';

        // Create individual charts
        Object.keys(chartConfigs).forEach(chartType => {
            try {
                const chartContainer = createChartContainer();
                const canvas = document.createElement('canvas');
                chartContainer.appendChild(canvas);
                chartsContainer.appendChild(chartContainer);

                createIndividualChart(canvas, chartType, statsForAnalysis);
            } catch (chartError) {
                console.error(`Error creating chart ${chartType}:`, chartError);
                const errorDiv = document.createElement('div');
                errorDiv.className = 'chart-error';
                errorDiv.textContent = `Unable to create ${chartType} chart: ${chartError.message}`;
                chartsContainer.appendChild(errorDiv);
            }
        });

        // Add scroll wrapper
        const scrollWrapper = document.createElement('div');
        scrollWrapper.style.maxHeight = '60vh';
        scrollWrapper.style.overflowY = 'auto';
        scrollWrapper.appendChild(chartsContainer);

        container.appendChild(scrollWrapper);

    } catch (error) {
        console.error('Error in createMajorMetricsChart:', error);
        throw new Error(`Failed to create metrics charts: ${error.message}`);
    }
}

/**
 * Creates an individual Chart.js line chart for WebRTC statistics visualization
 * 
 * @param {HTMLCanvasElement} canvas - The canvas element where the chart will be rendered
 * @param {string} chartType - The type of chart to create (must correspond to a key in chartConfigs)
 * @param {Object} statsForAnalysis - Object containing WebRTC statistics data
 * @param {Object} statsForAnalysis.stats - Collection of WebRTC statistics arrays
 */
function createIndividualChart(canvas, chartType, statsForAnalysis) {
    // Get the 2D rendering context for the canvas
    const ctx = canvas.getContext('2d');
    
    // Retrieve the configuration for the specified chart type
    const chartConfig = chartConfigs[chartType];
    if (!chartConfig) {
        console.error(`No chart configuration found for ${chartType}`);
        return;
    }

    /**
     * Create datasets for each statistic defined in the chart configuration
     * Each dataset represents a different metric (e.g., packets lost, jitter)
     */
    const datasets = chartConfig.stats.map(stat => {
        // Construct the key for accessing stats data
        // Format: webrtc_[statsType]_[statKey] (e.g., webrtc_inbound-rtp_packetsLost)
        const dataKey = `webrtc_${chartConfig.statsType || 'inbound-rtp'}_${stat.key}`;
        const data = statsForAnalysis.stats[dataKey];
        
        // Handle cases where data is missing or invalid
        if (!data || !Array.isArray(data)) {
            console.warn(`No valid data found for ${dataKey}`);
            return {
                label: stat.label,
                data: [],
                borderColor: stat.color,
                tension: 0.1
            };
        }

        // Extract values from data pairs (timestamp, value)
        return {
            label: stat.label,
            data: data.map(([, value]) => value),
            borderColor: stat.color,
            tension: 0.1
        };
    });

    /**
     * Create time labels for the X-axis
     * Uses timestamps from the first dataset as reference
     */
    const labels = datasets[0].data.map((_, index) => {
        const dataKey = `webrtc_${chartConfig.statsType || 'inbound-rtp'}_${chartConfig.stats[0].key}`;
        const data = statsForAnalysis.stats[dataKey];
        return data && data[index] ? new Date(data[index][0]).toLocaleTimeString() : '';
    });

    /**
     * Initialize Chart.js instance with configuration
     */
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Time',
                        color: '#ffffff'
                    },
                    ticks: {
                        color: '#ffffff'
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Value',
                        color: '#ffffff'
                    },
                    ticks: {
                        color: '#ffffff'
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#ffffff'
                    }
                },
                title: {
                    display: true,
                    text: chartConfig.title,
                    color: '#ffffff'
                }
            }
        }
    });
}

/**
 * Collects and processes WebRTC statistics from either a local or Lambda environment
 * 
 * This asynchronous function handles the collection of WebRTC statistics and ensures
 * they are properly processed with timestamps. It adapts its collection method based
 * on the environment (local vs Lambda).
 * 
 * @async
 * @returns {void}
 * 
 * @depends {boolean} IS_LOCAL - Global flag indicating if running in local environment
 * @depends {function} collectLocalStats - Function to collect stats in local environment
 * @depends {function} collectLambdaStats - Function to collect stats in Lambda environment
 * @depends {function} processStats - Function to process the collected statistics
 * @depends {object} aggregatedStats - Global object storing processed statistics
 */
async function collectAggregatedStats() {
    // Get current timestamp in milliseconds for data correlation
    const timestamp = new Date().getTime();

    // Variable to store collected statistics
    let stats;
    
    // Determine environment and collect stats accordingly
    stats = await collectLocalStats();
    
    // Process stats if they were successfully collected
    if (stats) {
        processStats(stats, timestamp);
    }
}

/**
 * Processes and aggregates WebRTC statistics with metadata for monitoring and analysis
 * 
 * This function maintains a rolling window of WebRTC statistics and associated metadata
 * in the global scope. It processes incoming stats reports, organizing them by metric type
 * and maintaining a one-hour history of measurements.
 * 
 * @param {Array<RTCStatsReport>} stats - Array of WebRTC statistics reports to process
 * @param {number} timestamp - Current timestamp in milliseconds
 * 
 * @global
 * @property {Object} window.aggregatedStats - Global object storing processed statistics
 * @property {Object} window.aggregatedStats.metadata - Session and client metadata
 * @property {Object} window.aggregatedStats.stats - Organized WebRTC statistics
 * 
 * @constant {number} ONE_HOUR - Time window for keeping statistics (in milliseconds)
 * @constant {Object} METRICS_TO_COLLECT - Configuration object defining which metrics to track
 * 
 * @example
 * // Example usage
 * const stats = await peerConnection.getStats();
 * processStats(stats, Date.now());
 */
function processStats(stats, timestamp) {
    // Initialize aggregatedStats if it doesn't exist
    if (!window.aggregatedStats) {
        window.aggregatedStats = {
            metadata: {
                sessionId: getQueryParams().get('token'),
                clientId: window.clientId || generateClientId(),
                streamStartTime: Date.now(),
                browserInfo: {
                    userAgent: navigator.userAgent,
                    platform: navigator.platform,
                    language: navigator.language,
                    screenResolution: `${window.screen.width}x${window.screen.height}`
                }
            },
            stats: {} // Store stats in a format that's easily JSON serializable
        };

        // Store these for consistency throughout the session
        window.clientId = window.aggregatedStats.metadata.clientId;
        window.streamStartTime = window.aggregatedStats.metadata.streamStartTime;
    }

    /**
     * Process each statistics report
     * Organizes metrics by type and maintains time-series data
     */
    stats.forEach((report) => {
        // Get report type or default to 'unknown'
        const reportType = report.type || 'unknown';
        
        // Check if this report type should be collected
        if (METRICS_TO_COLLECT[reportType]) {
            METRICS_TO_COLLECT[reportType].forEach(metric => {
                if (report[metric] !== undefined) {
                    const fullMetricName = `webrtc_${reportType}_${metric}`;
                    if (!window.aggregatedStats.stats[fullMetricName]) {
                        window.aggregatedStats.stats[fullMetricName] = [];
                    }
                    // Store timestamp and value in a simple array format
                    window.aggregatedStats.stats[fullMetricName].push([timestamp, report[metric]]);

                    // Keep only the last hour of measurements
                    window.aggregatedStats.stats[fullMetricName] = 
                        window.aggregatedStats.stats[fullMetricName].filter(([t]) => timestamp - t <= ONE_HOUR);
                    }
            });
        }
    });
}

/**
 * Prepares WebRTC stats for server analysis
 * @function prepareStatsForServer
 * @returns {Object|null} Formatted stats object or null if preparation fails
 */
function prepareStatsForServer() {
    if (!window.aggregatedStats) {
        console.warn('No aggregated stats available');
        return null;
    }

    const stats = window.aggregatedStats;
    const preparedStats = {
        metadata: stats.metadata,
        stats: {},
        sessionDuration: Date.now() - stats.metadata.streamStartTime
    };

    // Only include non-empty stat arrays
    for (const [key, value] of Object.entries(stats.stats)) {
        if (Array.isArray(value) && value.length > 0) {
            preparedStats.stats[key] = value;
        }
    }

    // Check if we have any valid stats
    if (Object.keys(preparedStats.stats).length === 0) {
        console.warn('No valid stats to send');
        return null;
    }
    return preparedStats;
}

/**
 * Starts periodic WebRTC statistics collection
 * 
 * @param {number} [interval=5000] - Collection interval in milliseconds
 * @returns {number} Interval ID used to stop collection
 * 
 * @example
 * const statsTimer = startCollectingStats(2000); // Collect every 2 seconds
 */
function startCollectingStats(interval = 5000) {
    return setInterval(collectAggregatedStats, interval);
}

/**
 * Stops WebRTC statistics collection
 * 
 * @param {number} intervalId - Interval ID from startCollectingStats
 * 
 * @example
 * stopCollectingStats(statsTimer);
 */
function stopCollectingStats(intervalId) {
    clearInterval(intervalId);
}

/**
 * Saves aggregated WebRTC stats
 * @function saveAggregatedStats
 * @async
 * @param {Object} stats - The stats to save
 * @returns {Promise<void>}
 * @throws {Error} If saving fails
 */
function saveAggregatedStats(statsForAnalysis) {
    try {
        // First, transform the stats into a format suitable for CSV
        const transformedStats = [];
        
        // Check if statsForAnalysis is the correct object
        if (!statsForAnalysis || !statsForAnalysis.stats) {
            console.error('Invalid stats format');
            return null;
        }

        // Get all timestamps from all metrics to create unique rows
        const timestamps = new Set();
        Object.values(statsForAnalysis.stats).forEach(metricArray => {
            metricArray.forEach(([timestamp]) => timestamps.add(timestamp));
        });

        // Convert timestamps to array and sort
        const sortedTimestamps = Array.from(timestamps).sort();

        // Create a row for each timestamp
        sortedTimestamps.forEach(timestamp => {
            const row = {
                timestamp: new Date(timestamp).toISOString()
            };

            // Add each metric's value for this timestamp
            Object.entries(statsForAnalysis.stats).forEach(([metricName, metricArray]) => {
                const dataPoint = metricArray.find(([t]) => t === timestamp);
                row[metricName] = dataPoint ? dataPoint[1] : '';
            });

            transformedStats.push(row);
        });

        // Create CSV content
        const headers = Object.keys(transformedStats[0] || {}).join(',');
        const rows = transformedStats.map(row => 
            Object.values(row).join(',')
        ).join('\n');
        
        const csvContent = `${headers}\n${rows}`;

        // Create and return the Blob
        return new Blob([csvContent], { type: 'text/csv' });

    } catch (error) {
        console.error('Error saving stats:', error);
        return null;
    }
}

/**
 * Downloads collected WebRTC metrics as a CSV file
 * 
 * Creates and triggers download of a CSV file containing aggregated WebRTC statistics.
 * The file is named with a timestamp and includes prepared statistics data.
 * 
 * @returns {void}
 * 
 * @example
 * // Trigger metrics download
 * downloadMetrics();
 * 
 * @throws {Error} Shows alert if blob creation fails
 */
function downloadMetrics() {
    // Prepare statistics data for export
    const statsForAnalysis = prepareStatsForServer();
    
    // Convert statistics to blob format
    const blob = saveAggregatedStats(statsForAnalysis);
    
    if (blob) {
        // Create temporary URL for the blob
        const url = window.URL.createObjectURL(blob);
        
        // Create temporary download link
        const a = document.createElement('a');
        a.href = url;
        
        // Generate filename with timestamp
        const fileName = `webrtc-stats-${new Date().toISOString()}.csv`;
        a.download = fileName;
        
        // Trigger download
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    } else {
        // Handle error case
        alert('Error creating metrics file. Please check the console for more information.');
    }
}

/**
 * Initializes the widget menu functionality
 * @function initializeWidgetMenu
 * @description Sets up and configures the menu system for widgets
 * @returns {void}
 * 
 * @example
 * // Initialize the widget menu
 * initializeWidgetMenu();
 */
function initializeWidgetMenu() {
    const addWidgetBtn = document.getElementById('addWidgetBtn');
    const widgetOptions = document.getElementById('widgetOptions');
    const widgetMenu = document.querySelector('.widget-menu');
    const widgetMenuOptions = document.getElementById('widgetMenuOptions');
    const widgetMenuButton = document.querySelector('.widget-menu-button');
    
    // Add Event Listeners
    addWidgetBtn.addEventListener('click', toggleWidgetMenuOptions);
    widgetMenuButton.addEventListener('click', toggleWidgetOptions);
    widgetOptions.addEventListener('click', handleWidgetOptionClick);

    /**
     * Toggles the visibility of widget menu options
     * @function toggleWidgetMenuOptions
     * @param {Event} event - The DOM event that triggered the toggle
     * @description Controls the display state of widget menu options
     * @returns {void}
     * 
     */
    function toggleWidgetMenuOptions(event) {
        event.stopPropagation();
        widgetMenuOptions.style.display = widgetMenuOptions.style.display === 'block' ? 'none' : 'block';
        widgetOptions.style.display = 'none'; // Ensure widgetOptions is closed when opening widgetMenuOptions
        
        // Set FPS widget to be on by default
        const fpsWidget = document.querySelector('.widget-option[data-widget="fps"]');
        if (fpsWidget) {
            const checkbox = fpsWidget.querySelector('.widget-option-switch');
            
            // Check if FPS widget already exists in the document
            const existingFpsWidget = document.querySelector('.fps-widget'); // Adjust selector based on your widget's class
            
            if (!existingFpsWidget) {
                checkbox.checked = true;
                // Trigger the widget creation only if it doesn't exist
                addWidget('fps');
            }
        }

        // Toggle between default and active SVG states
        if (widgetOptions.style.display === 'block') {
            addWidgetBtn.innerHTML = `
            <svg width="133" height="34" viewBox="0 0 133 34" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="133" height="34" rx="10" fill="white" fill-opacity="0.75"/>
            <rect x="1" y="1" width="131" height="32" rx="9" stroke="white" stroke-opacity="0.8" stroke-width="2"/>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M17.4629 10.4886C18.8938 9.81303 20.4676 9.39119 22.1265 9.28098V14.1803C21.3514 14.2633 20.6089 14.4554 19.9146 14.741L17.4629 10.4886ZM23.7515 14.1682C24.5328 14.2399 25.2822 14.4225 25.9837 14.7L28.4384 10.4425C26.9988 9.77757 25.4171 9.3685 23.7515 9.27344V14.1682ZM27.429 15.4478C28.1587 15.9238 28.8073 16.514 29.3495 17.1931L33.6019 14.7346C32.6038 13.329 31.3339 12.1304 29.869 11.2156L27.429 15.4478ZM16.6491 17.195C17.169 16.5434 17.7869 15.9735 18.4804 15.5078L16.0391 11.2736C14.6123 12.1812 13.3741 13.3595 12.3968 14.7365L16.6491 17.195ZM15.7654 18.5631L11.5394 16.1198C10.5572 17.9514 10 20.0456 10 22.2702H14.875C14.875 20.935 15.1962 19.6748 15.7654 18.5631ZM34.4595 16.1178L30.2335 18.561C30.8034 19.6733 31.125 20.9341 31.125 22.2702H36C36 20.0448 35.4424 17.9499 34.4595 16.1178ZM25.2215 16.6505C25.4457 16.2616 25.9425 16.1285 26.3311 16.3532C26.7197 16.5779 26.853 17.0753 26.6288 17.4642L24.7138 20.7856C25.0357 21.1993 25.2275 21.7196 25.2275 22.2847C25.2275 23.6328 24.1362 24.7256 22.79 24.7256C21.4438 24.7256 20.3525 23.6328 20.3525 22.2847C20.3525 20.9367 21.4438 19.8438 22.79 19.8438C22.9806 19.8438 23.166 19.8657 23.3439 19.9071L25.2215 16.6505Z" fill="#424650"/>
            <path d="M49.4346 22L47.3906 14.8018H47.3291C47.3473 14.9886 47.3656 15.2415 47.3838 15.5605C47.4066 15.8796 47.4271 16.2236 47.4453 16.5928C47.4635 16.9619 47.4727 17.3174 47.4727 17.6592V22H45.0801V12.0059H48.6758L50.7607 19.1016H50.8154L52.8594 12.0059H56.4619V22H53.9805V17.6182C53.9805 17.3037 53.985 16.9665 53.9941 16.6064C54.0078 16.2419 54.0215 15.9001 54.0352 15.5811C54.0534 15.2575 54.0693 15.0023 54.083 14.8154H54.0215L52.0049 22H49.4346ZM61.9443 14.1182C62.6963 14.1182 63.3457 14.2503 63.8926 14.5146C64.4395 14.7744 64.861 15.1663 65.1572 15.6904C65.4535 16.2145 65.6016 16.8708 65.6016 17.6592V18.8486H60.8232C60.846 19.2542 60.9964 19.5869 61.2744 19.8467C61.557 20.1064 61.9717 20.2363 62.5186 20.2363C63.0016 20.2363 63.4437 20.1885 63.8447 20.0928C64.2503 19.9971 64.6673 19.849 65.0957 19.6484V21.5693C64.722 21.7653 64.3141 21.9089 63.8721 22C63.43 22.0911 62.8717 22.1367 62.1973 22.1367C61.418 22.1367 60.7207 21.9977 60.1055 21.7197C59.4902 21.4417 59.0049 21.0111 58.6494 20.4277C58.2985 19.8444 58.123 19.0947 58.123 18.1787C58.123 17.249 58.2826 16.4857 58.6016 15.8887C58.9206 15.2871 59.3672 14.8428 59.9414 14.5557C60.5156 14.264 61.1833 14.1182 61.9443 14.1182ZM62.04 15.9365C61.7256 15.9365 61.4613 16.0368 61.2471 16.2373C61.0374 16.4333 60.9144 16.7432 60.8779 17.167H63.1748C63.1702 16.9391 63.1247 16.7318 63.0381 16.5449C62.9515 16.3581 62.8239 16.21 62.6553 16.1006C62.4912 15.9912 62.2861 15.9365 62.04 15.9365ZM70.9062 20.0244C71.1478 20.0244 71.3688 19.9993 71.5693 19.9492C71.7699 19.8991 71.9795 19.8353 72.1982 19.7578V21.7061C71.9066 21.8337 71.5967 21.9362 71.2686 22.0137C70.945 22.0957 70.5303 22.1367 70.0244 22.1367C69.5231 22.1367 69.0811 22.0592 68.6982 21.9043C68.3154 21.7448 68.0169 21.4714 67.8027 21.084C67.5931 20.6921 67.4883 20.1475 67.4883 19.4502V16.2578H66.5518V15.1709L67.7412 14.3301L68.4316 12.7031H70.1816V14.2549H72.082V16.2578H70.1816V19.2725C70.1816 19.5231 70.2454 19.7122 70.373 19.8398C70.5007 19.9629 70.6784 20.0244 70.9062 20.0244ZM78.2275 14.1182C78.3734 14.1182 78.526 14.1296 78.6855 14.1523C78.8451 14.1706 78.9635 14.1865 79.041 14.2002L78.8018 16.7227C78.7152 16.6999 78.6035 16.6816 78.4668 16.668C78.3301 16.6497 78.1387 16.6406 77.8926 16.6406C77.724 16.6406 77.5439 16.6566 77.3525 16.6885C77.1611 16.7204 76.9788 16.7887 76.8057 16.8936C76.637 16.9938 76.498 17.1488 76.3887 17.3584C76.2793 17.5635 76.2246 17.8415 76.2246 18.1924V22H73.5518V14.2549H75.541L75.958 15.4922H76.0879C76.2292 15.237 76.4092 15.0068 76.6279 14.8018C76.8512 14.5921 77.0996 14.4258 77.373 14.3027C77.651 14.1797 77.9359 14.1182 78.2275 14.1182ZM82.8145 14.2549V22H80.1416V14.2549H82.8145ZM81.4883 11.1377C81.8711 11.1377 82.2038 11.2174 82.4863 11.377C82.7734 11.5365 82.917 11.8532 82.917 12.3271C82.917 12.7874 82.7734 13.0996 82.4863 13.2637C82.2038 13.4232 81.8711 13.5029 81.4883 13.5029C81.0964 13.5029 80.7614 13.4232 80.4834 13.2637C80.21 13.0996 80.0732 12.7874 80.0732 12.3271C80.0732 11.8532 80.21 11.5365 80.4834 11.377C80.7614 11.2174 81.0964 11.1377 81.4883 11.1377ZM88.208 22.1367C87.4242 22.1367 86.7428 21.9977 86.1641 21.7197C85.5853 21.4372 85.1364 21.0042 84.8174 20.4209C84.5029 19.833 84.3457 19.0811 84.3457 18.165C84.3457 17.2262 84.5212 16.4583 84.8721 15.8613C85.2275 15.2643 85.7129 14.8245 86.3281 14.542C86.9434 14.2594 87.6406 14.1182 88.4199 14.1182C88.8939 14.1182 89.3428 14.1706 89.7666 14.2754C90.195 14.3802 90.5915 14.5238 90.9561 14.7061L90.1699 16.6816C89.8509 16.5404 89.5524 16.4287 89.2744 16.3467C89.001 16.2601 88.7161 16.2168 88.4199 16.2168C88.151 16.2168 87.9141 16.2874 87.709 16.4287C87.5039 16.57 87.3444 16.7842 87.2305 17.0713C87.1165 17.3538 87.0596 17.7139 87.0596 18.1514C87.0596 18.598 87.1165 18.958 87.2305 19.2314C87.349 19.5049 87.5107 19.7031 87.7158 19.8262C87.9255 19.9492 88.1647 20.0107 88.4336 20.0107C88.821 20.0107 89.2061 19.9515 89.5889 19.833C89.9762 19.71 90.3431 19.5413 90.6895 19.3271V21.4531C90.3704 21.6628 90.0104 21.8291 89.6094 21.9521C89.2083 22.0752 88.7412 22.1367 88.208 22.1367ZM97.9834 19.6211C97.9834 20.1133 97.874 20.5485 97.6553 20.9268C97.4365 21.305 97.0856 21.6012 96.6025 21.8154C96.124 22.0296 95.4928 22.1367 94.709 22.1367C94.1576 22.1367 93.6631 22.1071 93.2256 22.0479C92.7926 21.9886 92.3529 21.8747 91.9062 21.7061V19.5664C92.3939 19.7897 92.8906 19.9515 93.3965 20.0518C93.9023 20.1475 94.3011 20.1953 94.5928 20.1953C94.8936 20.1953 95.1123 20.1634 95.249 20.0996C95.3903 20.0312 95.4609 19.931 95.4609 19.7988C95.4609 19.6849 95.4131 19.5892 95.3174 19.5117C95.2262 19.4297 95.0599 19.3363 94.8184 19.2314C94.5814 19.1266 94.2464 18.9854 93.8135 18.8076C93.3851 18.6299 93.0273 18.4362 92.7402 18.2266C92.4577 18.0169 92.2458 17.7663 92.1045 17.4746C91.9632 17.1829 91.8926 16.8252 91.8926 16.4014C91.8926 15.6449 92.1842 15.0752 92.7676 14.6924C93.3509 14.3096 94.1234 14.1182 95.085 14.1182C95.5954 14.1182 96.0762 14.1751 96.5273 14.2891C96.9785 14.3984 97.4456 14.5602 97.9287 14.7744L97.1973 16.4971C96.8145 16.3239 96.4271 16.1849 96.0352 16.0801C95.6432 15.9753 95.3311 15.9229 95.0986 15.9229C94.889 15.9229 94.7272 15.9502 94.6133 16.0049C94.4993 16.0596 94.4424 16.1393 94.4424 16.2441C94.4424 16.3398 94.4811 16.4242 94.5586 16.4971C94.6406 16.57 94.7933 16.6543 95.0166 16.75C95.2399 16.8457 95.5658 16.9801 95.9941 17.1533C96.4453 17.3356 96.8167 17.5316 97.1084 17.7412C97.4046 17.9463 97.6234 18.1969 97.7646 18.4932C97.9105 18.7894 97.9834 19.1654 97.9834 19.6211Z" fill="#424650"/>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M122 14.2812L120.716 12.9968L115 18.7116L109.284 12.9968L108 14.2812L115 21.2812L122 14.2812Z" fill="#424650"/>
            </svg>
            `;
        } else {
            addWidgetBtn.innerHTML = `
            <svg width="133" height="34" viewBox="0 0 133 34" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="1" width="131" height="32" rx="9" stroke="white" stroke-opacity="0.5" stroke-width="2"/>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M17.4629 10.4886C18.8938 9.81303 20.4676 9.39119 22.1265 9.28098V14.1803C21.3514 14.2633 20.6089 14.4554 19.9146 14.741L17.4629 10.4886ZM23.7515 14.1682C24.5328 14.2399 25.2822 14.4225 25.9837 14.7L28.4384 10.4425C26.9988 9.77757 25.4171 9.3685 23.7515 9.27344V14.1682ZM27.429 15.4478C28.1587 15.9238 28.8073 16.514 29.3495 17.1931L33.6019 14.7346C32.6038 13.329 31.3339 12.1304 29.869 11.2156L27.429 15.4478ZM16.6491 17.195C17.169 16.5434 17.7869 15.9735 18.4804 15.5078L16.0391 11.2736C14.6123 12.1812 13.3741 13.3595 12.3968 14.7365L16.6491 17.195ZM15.7654 18.5631L11.5394 16.1198C10.5572 17.9514 10 20.0456 10 22.2702H14.875C14.875 20.935 15.1962 19.6748 15.7654 18.5631ZM34.4595 16.1178L30.2335 18.561C30.8034 19.6733 31.125 20.9341 31.125 22.2702H36C36 20.0448 35.4424 17.9499 34.4595 16.1178ZM25.2215 16.6505C25.4457 16.2616 25.9425 16.1285 26.3311 16.3532C26.7197 16.5779 26.853 17.0753 26.6288 17.4642L24.7138 20.7856C25.0357 21.1993 25.2275 21.7196 25.2275 22.2847C25.2275 23.6328 24.1362 24.7256 22.79 24.7256C21.4438 24.7256 20.3525 23.6328 20.3525 22.2847C20.3525 20.9367 21.4438 19.8438 22.79 19.8438C22.9806 19.8438 23.166 19.8657 23.3439 19.9071L25.2215 16.6505Z" fill="white"/>
            <path d="M49.4346 22L47.3906 14.8018H47.3291C47.3473 14.9886 47.3656 15.2415 47.3838 15.5605C47.4066 15.8796 47.4271 16.2236 47.4453 16.5928C47.4635 16.9619 47.4727 17.3174 47.4727 17.6592V22H45.0801V12.0059H48.6758L50.7607 19.1016H50.8154L52.8594 12.0059H56.4619V22H53.9805V17.6182C53.9805 17.3037 53.985 16.9665 53.9941 16.6064C54.0078 16.2419 54.0215 15.9001 54.0352 15.5811C54.0534 15.2575 54.0693 15.0023 54.083 14.8154H54.0215L52.0049 22H49.4346ZM61.9443 14.1182C62.6963 14.1182 63.3457 14.2503 63.8926 14.5146C64.4395 14.7744 64.861 15.1663 65.1572 15.6904C65.4535 16.2145 65.6016 16.8708 65.6016 17.6592V18.8486H60.8232C60.846 19.2542 60.9964 19.5869 61.2744 19.8467C61.557 20.1064 61.9717 20.2363 62.5186 20.2363C63.0016 20.2363 63.4437 20.1885 63.8447 20.0928C64.2503 19.9971 64.6673 19.849 65.0957 19.6484V21.5693C64.722 21.7653 64.3141 21.9089 63.8721 22C63.43 22.0911 62.8717 22.1367 62.1973 22.1367C61.418 22.1367 60.7207 21.9977 60.1055 21.7197C59.4902 21.4417 59.0049 21.0111 58.6494 20.4277C58.2985 19.8444 58.123 19.0947 58.123 18.1787C58.123 17.249 58.2826 16.4857 58.6016 15.8887C58.9206 15.2871 59.3672 14.8428 59.9414 14.5557C60.5156 14.264 61.1833 14.1182 61.9443 14.1182ZM62.04 15.9365C61.7256 15.9365 61.4613 16.0368 61.2471 16.2373C61.0374 16.4333 60.9144 16.7432 60.8779 17.167H63.1748C63.1702 16.9391 63.1247 16.7318 63.0381 16.5449C62.9515 16.3581 62.8239 16.21 62.6553 16.1006C62.4912 15.9912 62.2861 15.9365 62.04 15.9365ZM70.9062 20.0244C71.1478 20.0244 71.3688 19.9993 71.5693 19.9492C71.7699 19.8991 71.9795 19.8353 72.1982 19.7578V21.7061C71.9066 21.8337 71.5967 21.9362 71.2686 22.0137C70.945 22.0957 70.5303 22.1367 70.0244 22.1367C69.5231 22.1367 69.0811 22.0592 68.6982 21.9043C68.3154 21.7448 68.0169 21.4714 67.8027 21.084C67.5931 20.6921 67.4883 20.1475 67.4883 19.4502V16.2578H66.5518V15.1709L67.7412 14.3301L68.4316 12.7031H70.1816V14.2549H72.082V16.2578H70.1816V19.2725C70.1816 19.5231 70.2454 19.7122 70.373 19.8398C70.5007 19.9629 70.6784 20.0244 70.9062 20.0244ZM78.2275 14.1182C78.3734 14.1182 78.526 14.1296 78.6855 14.1523C78.8451 14.1706 78.9635 14.1865 79.041 14.2002L78.8018 16.7227C78.7152 16.6999 78.6035 16.6816 78.4668 16.668C78.3301 16.6497 78.1387 16.6406 77.8926 16.6406C77.724 16.6406 77.5439 16.6566 77.3525 16.6885C77.1611 16.7204 76.9788 16.7887 76.8057 16.8936C76.637 16.9938 76.498 17.1488 76.3887 17.3584C76.2793 17.5635 76.2246 17.8415 76.2246 18.1924V22H73.5518V14.2549H75.541L75.958 15.4922H76.0879C76.2292 15.237 76.4092 15.0068 76.6279 14.8018C76.8512 14.5921 77.0996 14.4258 77.373 14.3027C77.651 14.1797 77.9359 14.1182 78.2275 14.1182ZM82.8145 14.2549V22H80.1416V14.2549H82.8145ZM81.4883 11.1377C81.8711 11.1377 82.2038 11.2174 82.4863 11.377C82.7734 11.5365 82.917 11.8532 82.917 12.3271C82.917 12.7874 82.7734 13.0996 82.4863 13.2637C82.2038 13.4232 81.8711 13.5029 81.4883 13.5029C81.0964 13.5029 80.7614 13.4232 80.4834 13.2637C80.21 13.0996 80.0732 12.7874 80.0732 12.3271C80.0732 11.8532 80.21 11.5365 80.4834 11.377C80.7614 11.2174 81.0964 11.1377 81.4883 11.1377ZM88.208 22.1367C87.4242 22.1367 86.7428 21.9977 86.1641 21.7197C85.5853 21.4372 85.1364 21.0042 84.8174 20.4209C84.5029 19.833 84.3457 19.0811 84.3457 18.165C84.3457 17.2262 84.5212 16.4583 84.8721 15.8613C85.2275 15.2643 85.7129 14.8245 86.3281 14.542C86.9434 14.2594 87.6406 14.1182 88.4199 14.1182C88.8939 14.1182 89.3428 14.1706 89.7666 14.2754C90.195 14.3802 90.5915 14.5238 90.9561 14.7061L90.1699 16.6816C89.8509 16.5404 89.5524 16.4287 89.2744 16.3467C89.001 16.2601 88.7161 16.2168 88.4199 16.2168C88.151 16.2168 87.9141 16.2874 87.709 16.4287C87.5039 16.57 87.3444 16.7842 87.2305 17.0713C87.1165 17.3538 87.0596 17.7139 87.0596 18.1514C87.0596 18.598 87.1165 18.958 87.2305 19.2314C87.349 19.5049 87.5107 19.7031 87.7158 19.8262C87.9255 19.9492 88.1647 20.0107 88.4336 20.0107C88.821 20.0107 89.2061 19.9515 89.5889 19.833C89.9762 19.71 90.3431 19.5413 90.6895 19.3271V21.4531C90.3704 21.6628 90.0104 21.8291 89.6094 21.9521C89.2083 22.0752 88.7412 22.1367 88.208 22.1367ZM97.9834 19.6211C97.9834 20.1133 97.874 20.5485 97.6553 20.9268C97.4365 21.305 97.0856 21.6012 96.6025 21.8154C96.124 22.0296 95.4928 22.1367 94.709 22.1367C94.1576 22.1367 93.6631 22.1071 93.2256 22.0479C92.7926 21.9886 92.3529 21.8747 91.9062 21.7061V19.5664C92.3939 19.7897 92.8906 19.9515 93.3965 20.0518C93.9023 20.1475 94.3011 20.1953 94.5928 20.1953C94.8936 20.1953 95.1123 20.1634 95.249 20.0996C95.3903 20.0312 95.4609 19.931 95.4609 19.7988C95.4609 19.6849 95.4131 19.5892 95.3174 19.5117C95.2262 19.4297 95.0599 19.3363 94.8184 19.2314C94.5814 19.1266 94.2464 18.9854 93.8135 18.8076C93.3851 18.6299 93.0273 18.4362 92.7402 18.2266C92.4577 18.0169 92.2458 17.7663 92.1045 17.4746C91.9632 17.1829 91.8926 16.8252 91.8926 16.4014C91.8926 15.6449 92.1842 15.0752 92.7676 14.6924C93.3509 14.3096 94.1234 14.1182 95.085 14.1182C95.5954 14.1182 96.0762 14.1751 96.5273 14.2891C96.9785 14.3984 97.4456 14.5602 97.9287 14.7744L97.1973 16.4971C96.8145 16.3239 96.4271 16.1849 96.0352 16.0801C95.6432 15.9753 95.3311 15.9229 95.0986 15.9229C94.889 15.9229 94.7272 15.9502 94.6133 16.0049C94.4993 16.0596 94.4424 16.1393 94.4424 16.2441C94.4424 16.3398 94.4811 16.4242 94.5586 16.4971C94.6406 16.57 94.7933 16.6543 95.0166 16.75C95.2399 16.8457 95.5658 16.9801 95.9941 17.1533C96.4453 17.3356 96.8167 17.5316 97.1084 17.7412C97.4046 17.9463 97.6234 18.1969 97.7646 18.4932C97.9105 18.7894 97.9834 19.1654 97.9834 19.6211Z" fill="white"/>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M108 19.7188L109.284 21.0032L115 15.2884L120.716 21.0032L122 19.7187L115 12.7187L108 19.7188Z" fill="white"/>
            </svg>
            `;
            }
        }
    /**
     * Toggles widget options visibility
     * @function toggleWidgetOptions
     * @returns {void}
     */
    function toggleWidgetOptions() {
        const widgetOptions = document.getElementById('widgetOptions');
        
        // Widget Options HTML UI Display
        widgetOptions.style.display = widgetOptions.style.display === 'block' ? 'none' : 'block';

        // Toggle between default and active SVG states
        if (widgetOptions.style.display === 'block') {
            addWidgetBtn.innerHTML = `
            <svg width="133" height="34" viewBox="0 0 133 34" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="133" height="34" rx="10" fill="white" fill-opacity="0.75"/>
            <rect x="1" y="1" width="131" height="32" rx="9" stroke="white" stroke-opacity="0.8" stroke-width="2"/>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M17.4629 10.4886C18.8938 9.81303 20.4676 9.39119 22.1265 9.28098V14.1803C21.3514 14.2633 20.6089 14.4554 19.9146 14.741L17.4629 10.4886ZM23.7515 14.1682C24.5328 14.2399 25.2822 14.4225 25.9837 14.7L28.4384 10.4425C26.9988 9.77757 25.4171 9.3685 23.7515 9.27344V14.1682ZM27.429 15.4478C28.1587 15.9238 28.8073 16.514 29.3495 17.1931L33.6019 14.7346C32.6038 13.329 31.3339 12.1304 29.869 11.2156L27.429 15.4478ZM16.6491 17.195C17.169 16.5434 17.7869 15.9735 18.4804 15.5078L16.0391 11.2736C14.6123 12.1812 13.3741 13.3595 12.3968 14.7365L16.6491 17.195ZM15.7654 18.5631L11.5394 16.1198C10.5572 17.9514 10 20.0456 10 22.2702H14.875C14.875 20.935 15.1962 19.6748 15.7654 18.5631ZM34.4595 16.1178L30.2335 18.561C30.8034 19.6733 31.125 20.9341 31.125 22.2702H36C36 20.0448 35.4424 17.9499 34.4595 16.1178ZM25.2215 16.6505C25.4457 16.2616 25.9425 16.1285 26.3311 16.3532C26.7197 16.5779 26.853 17.0753 26.6288 17.4642L24.7138 20.7856C25.0357 21.1993 25.2275 21.7196 25.2275 22.2847C25.2275 23.6328 24.1362 24.7256 22.79 24.7256C21.4438 24.7256 20.3525 23.6328 20.3525 22.2847C20.3525 20.9367 21.4438 19.8438 22.79 19.8438C22.9806 19.8438 23.166 19.8657 23.3439 19.9071L25.2215 16.6505Z" fill="#424650"/>
            <path d="M49.4346 22L47.3906 14.8018H47.3291C47.3473 14.9886 47.3656 15.2415 47.3838 15.5605C47.4066 15.8796 47.4271 16.2236 47.4453 16.5928C47.4635 16.9619 47.4727 17.3174 47.4727 17.6592V22H45.0801V12.0059H48.6758L50.7607 19.1016H50.8154L52.8594 12.0059H56.4619V22H53.9805V17.6182C53.9805 17.3037 53.985 16.9665 53.9941 16.6064C54.0078 16.2419 54.0215 15.9001 54.0352 15.5811C54.0534 15.2575 54.0693 15.0023 54.083 14.8154H54.0215L52.0049 22H49.4346ZM61.9443 14.1182C62.6963 14.1182 63.3457 14.2503 63.8926 14.5146C64.4395 14.7744 64.861 15.1663 65.1572 15.6904C65.4535 16.2145 65.6016 16.8708 65.6016 17.6592V18.8486H60.8232C60.846 19.2542 60.9964 19.5869 61.2744 19.8467C61.557 20.1064 61.9717 20.2363 62.5186 20.2363C63.0016 20.2363 63.4437 20.1885 63.8447 20.0928C64.2503 19.9971 64.6673 19.849 65.0957 19.6484V21.5693C64.722 21.7653 64.3141 21.9089 63.8721 22C63.43 22.0911 62.8717 22.1367 62.1973 22.1367C61.418 22.1367 60.7207 21.9977 60.1055 21.7197C59.4902 21.4417 59.0049 21.0111 58.6494 20.4277C58.2985 19.8444 58.123 19.0947 58.123 18.1787C58.123 17.249 58.2826 16.4857 58.6016 15.8887C58.9206 15.2871 59.3672 14.8428 59.9414 14.5557C60.5156 14.264 61.1833 14.1182 61.9443 14.1182ZM62.04 15.9365C61.7256 15.9365 61.4613 16.0368 61.2471 16.2373C61.0374 16.4333 60.9144 16.7432 60.8779 17.167H63.1748C63.1702 16.9391 63.1247 16.7318 63.0381 16.5449C62.9515 16.3581 62.8239 16.21 62.6553 16.1006C62.4912 15.9912 62.2861 15.9365 62.04 15.9365ZM70.9062 20.0244C71.1478 20.0244 71.3688 19.9993 71.5693 19.9492C71.7699 19.8991 71.9795 19.8353 72.1982 19.7578V21.7061C71.9066 21.8337 71.5967 21.9362 71.2686 22.0137C70.945 22.0957 70.5303 22.1367 70.0244 22.1367C69.5231 22.1367 69.0811 22.0592 68.6982 21.9043C68.3154 21.7448 68.0169 21.4714 67.8027 21.084C67.5931 20.6921 67.4883 20.1475 67.4883 19.4502V16.2578H66.5518V15.1709L67.7412 14.3301L68.4316 12.7031H70.1816V14.2549H72.082V16.2578H70.1816V19.2725C70.1816 19.5231 70.2454 19.7122 70.373 19.8398C70.5007 19.9629 70.6784 20.0244 70.9062 20.0244ZM78.2275 14.1182C78.3734 14.1182 78.526 14.1296 78.6855 14.1523C78.8451 14.1706 78.9635 14.1865 79.041 14.2002L78.8018 16.7227C78.7152 16.6999 78.6035 16.6816 78.4668 16.668C78.3301 16.6497 78.1387 16.6406 77.8926 16.6406C77.724 16.6406 77.5439 16.6566 77.3525 16.6885C77.1611 16.7204 76.9788 16.7887 76.8057 16.8936C76.637 16.9938 76.498 17.1488 76.3887 17.3584C76.2793 17.5635 76.2246 17.8415 76.2246 18.1924V22H73.5518V14.2549H75.541L75.958 15.4922H76.0879C76.2292 15.237 76.4092 15.0068 76.6279 14.8018C76.8512 14.5921 77.0996 14.4258 77.373 14.3027C77.651 14.1797 77.9359 14.1182 78.2275 14.1182ZM82.8145 14.2549V22H80.1416V14.2549H82.8145ZM81.4883 11.1377C81.8711 11.1377 82.2038 11.2174 82.4863 11.377C82.7734 11.5365 82.917 11.8532 82.917 12.3271C82.917 12.7874 82.7734 13.0996 82.4863 13.2637C82.2038 13.4232 81.8711 13.5029 81.4883 13.5029C81.0964 13.5029 80.7614 13.4232 80.4834 13.2637C80.21 13.0996 80.0732 12.7874 80.0732 12.3271C80.0732 11.8532 80.21 11.5365 80.4834 11.377C80.7614 11.2174 81.0964 11.1377 81.4883 11.1377ZM88.208 22.1367C87.4242 22.1367 86.7428 21.9977 86.1641 21.7197C85.5853 21.4372 85.1364 21.0042 84.8174 20.4209C84.5029 19.833 84.3457 19.0811 84.3457 18.165C84.3457 17.2262 84.5212 16.4583 84.8721 15.8613C85.2275 15.2643 85.7129 14.8245 86.3281 14.542C86.9434 14.2594 87.6406 14.1182 88.4199 14.1182C88.8939 14.1182 89.3428 14.1706 89.7666 14.2754C90.195 14.3802 90.5915 14.5238 90.9561 14.7061L90.1699 16.6816C89.8509 16.5404 89.5524 16.4287 89.2744 16.3467C89.001 16.2601 88.7161 16.2168 88.4199 16.2168C88.151 16.2168 87.9141 16.2874 87.709 16.4287C87.5039 16.57 87.3444 16.7842 87.2305 17.0713C87.1165 17.3538 87.0596 17.7139 87.0596 18.1514C87.0596 18.598 87.1165 18.958 87.2305 19.2314C87.349 19.5049 87.5107 19.7031 87.7158 19.8262C87.9255 19.9492 88.1647 20.0107 88.4336 20.0107C88.821 20.0107 89.2061 19.9515 89.5889 19.833C89.9762 19.71 90.3431 19.5413 90.6895 19.3271V21.4531C90.3704 21.6628 90.0104 21.8291 89.6094 21.9521C89.2083 22.0752 88.7412 22.1367 88.208 22.1367ZM97.9834 19.6211C97.9834 20.1133 97.874 20.5485 97.6553 20.9268C97.4365 21.305 97.0856 21.6012 96.6025 21.8154C96.124 22.0296 95.4928 22.1367 94.709 22.1367C94.1576 22.1367 93.6631 22.1071 93.2256 22.0479C92.7926 21.9886 92.3529 21.8747 91.9062 21.7061V19.5664C92.3939 19.7897 92.8906 19.9515 93.3965 20.0518C93.9023 20.1475 94.3011 20.1953 94.5928 20.1953C94.8936 20.1953 95.1123 20.1634 95.249 20.0996C95.3903 20.0312 95.4609 19.931 95.4609 19.7988C95.4609 19.6849 95.4131 19.5892 95.3174 19.5117C95.2262 19.4297 95.0599 19.3363 94.8184 19.2314C94.5814 19.1266 94.2464 18.9854 93.8135 18.8076C93.3851 18.6299 93.0273 18.4362 92.7402 18.2266C92.4577 18.0169 92.2458 17.7663 92.1045 17.4746C91.9632 17.1829 91.8926 16.8252 91.8926 16.4014C91.8926 15.6449 92.1842 15.0752 92.7676 14.6924C93.3509 14.3096 94.1234 14.1182 95.085 14.1182C95.5954 14.1182 96.0762 14.1751 96.5273 14.2891C96.9785 14.3984 97.4456 14.5602 97.9287 14.7744L97.1973 16.4971C96.8145 16.3239 96.4271 16.1849 96.0352 16.0801C95.6432 15.9753 95.3311 15.9229 95.0986 15.9229C94.889 15.9229 94.7272 15.9502 94.6133 16.0049C94.4993 16.0596 94.4424 16.1393 94.4424 16.2441C94.4424 16.3398 94.4811 16.4242 94.5586 16.4971C94.6406 16.57 94.7933 16.6543 95.0166 16.75C95.2399 16.8457 95.5658 16.9801 95.9941 17.1533C96.4453 17.3356 96.8167 17.5316 97.1084 17.7412C97.4046 17.9463 97.6234 18.1969 97.7646 18.4932C97.9105 18.7894 97.9834 19.1654 97.9834 19.6211Z" fill="#424650"/>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M122 14.2812L120.716 12.9968L115 18.7116L109.284 12.9968L108 14.2812L115 21.2812L122 14.2812Z" fill="#424650"/>
            </svg>
            `;
        } else {
            addWidgetBtn.innerHTML = `
            <svg width="133" height="34" viewBox="0 0 133 34" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="1" width="131" height="32" rx="9" stroke="white" stroke-opacity="0.5" stroke-width="2"/>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M17.4629 10.4886C18.8938 9.81303 20.4676 9.39119 22.1265 9.28098V14.1803C21.3514 14.2633 20.6089 14.4554 19.9146 14.741L17.4629 10.4886ZM23.7515 14.1682C24.5328 14.2399 25.2822 14.4225 25.9837 14.7L28.4384 10.4425C26.9988 9.77757 25.4171 9.3685 23.7515 9.27344V14.1682ZM27.429 15.4478C28.1587 15.9238 28.8073 16.514 29.3495 17.1931L33.6019 14.7346C32.6038 13.329 31.3339 12.1304 29.869 11.2156L27.429 15.4478ZM16.6491 17.195C17.169 16.5434 17.7869 15.9735 18.4804 15.5078L16.0391 11.2736C14.6123 12.1812 13.3741 13.3595 12.3968 14.7365L16.6491 17.195ZM15.7654 18.5631L11.5394 16.1198C10.5572 17.9514 10 20.0456 10 22.2702H14.875C14.875 20.935 15.1962 19.6748 15.7654 18.5631ZM34.4595 16.1178L30.2335 18.561C30.8034 19.6733 31.125 20.9341 31.125 22.2702H36C36 20.0448 35.4424 17.9499 34.4595 16.1178ZM25.2215 16.6505C25.4457 16.2616 25.9425 16.1285 26.3311 16.3532C26.7197 16.5779 26.853 17.0753 26.6288 17.4642L24.7138 20.7856C25.0357 21.1993 25.2275 21.7196 25.2275 22.2847C25.2275 23.6328 24.1362 24.7256 22.79 24.7256C21.4438 24.7256 20.3525 23.6328 20.3525 22.2847C20.3525 20.9367 21.4438 19.8438 22.79 19.8438C22.9806 19.8438 23.166 19.8657 23.3439 19.9071L25.2215 16.6505Z" fill="white"/>
            <path d="M49.4346 22L47.3906 14.8018H47.3291C47.3473 14.9886 47.3656 15.2415 47.3838 15.5605C47.4066 15.8796 47.4271 16.2236 47.4453 16.5928C47.4635 16.9619 47.4727 17.3174 47.4727 17.6592V22H45.0801V12.0059H48.6758L50.7607 19.1016H50.8154L52.8594 12.0059H56.4619V22H53.9805V17.6182C53.9805 17.3037 53.985 16.9665 53.9941 16.6064C54.0078 16.2419 54.0215 15.9001 54.0352 15.5811C54.0534 15.2575 54.0693 15.0023 54.083 14.8154H54.0215L52.0049 22H49.4346ZM61.9443 14.1182C62.6963 14.1182 63.3457 14.2503 63.8926 14.5146C64.4395 14.7744 64.861 15.1663 65.1572 15.6904C65.4535 16.2145 65.6016 16.8708 65.6016 17.6592V18.8486H60.8232C60.846 19.2542 60.9964 19.5869 61.2744 19.8467C61.557 20.1064 61.9717 20.2363 62.5186 20.2363C63.0016 20.2363 63.4437 20.1885 63.8447 20.0928C64.2503 19.9971 64.6673 19.849 65.0957 19.6484V21.5693C64.722 21.7653 64.3141 21.9089 63.8721 22C63.43 22.0911 62.8717 22.1367 62.1973 22.1367C61.418 22.1367 60.7207 21.9977 60.1055 21.7197C59.4902 21.4417 59.0049 21.0111 58.6494 20.4277C58.2985 19.8444 58.123 19.0947 58.123 18.1787C58.123 17.249 58.2826 16.4857 58.6016 15.8887C58.9206 15.2871 59.3672 14.8428 59.9414 14.5557C60.5156 14.264 61.1833 14.1182 61.9443 14.1182ZM62.04 15.9365C61.7256 15.9365 61.4613 16.0368 61.2471 16.2373C61.0374 16.4333 60.9144 16.7432 60.8779 17.167H63.1748C63.1702 16.9391 63.1247 16.7318 63.0381 16.5449C62.9515 16.3581 62.8239 16.21 62.6553 16.1006C62.4912 15.9912 62.2861 15.9365 62.04 15.9365ZM70.9062 20.0244C71.1478 20.0244 71.3688 19.9993 71.5693 19.9492C71.7699 19.8991 71.9795 19.8353 72.1982 19.7578V21.7061C71.9066 21.8337 71.5967 21.9362 71.2686 22.0137C70.945 22.0957 70.5303 22.1367 70.0244 22.1367C69.5231 22.1367 69.0811 22.0592 68.6982 21.9043C68.3154 21.7448 68.0169 21.4714 67.8027 21.084C67.5931 20.6921 67.4883 20.1475 67.4883 19.4502V16.2578H66.5518V15.1709L67.7412 14.3301L68.4316 12.7031H70.1816V14.2549H72.082V16.2578H70.1816V19.2725C70.1816 19.5231 70.2454 19.7122 70.373 19.8398C70.5007 19.9629 70.6784 20.0244 70.9062 20.0244ZM78.2275 14.1182C78.3734 14.1182 78.526 14.1296 78.6855 14.1523C78.8451 14.1706 78.9635 14.1865 79.041 14.2002L78.8018 16.7227C78.7152 16.6999 78.6035 16.6816 78.4668 16.668C78.3301 16.6497 78.1387 16.6406 77.8926 16.6406C77.724 16.6406 77.5439 16.6566 77.3525 16.6885C77.1611 16.7204 76.9788 16.7887 76.8057 16.8936C76.637 16.9938 76.498 17.1488 76.3887 17.3584C76.2793 17.5635 76.2246 17.8415 76.2246 18.1924V22H73.5518V14.2549H75.541L75.958 15.4922H76.0879C76.2292 15.237 76.4092 15.0068 76.6279 14.8018C76.8512 14.5921 77.0996 14.4258 77.373 14.3027C77.651 14.1797 77.9359 14.1182 78.2275 14.1182ZM82.8145 14.2549V22H80.1416V14.2549H82.8145ZM81.4883 11.1377C81.8711 11.1377 82.2038 11.2174 82.4863 11.377C82.7734 11.5365 82.917 11.8532 82.917 12.3271C82.917 12.7874 82.7734 13.0996 82.4863 13.2637C82.2038 13.4232 81.8711 13.5029 81.4883 13.5029C81.0964 13.5029 80.7614 13.4232 80.4834 13.2637C80.21 13.0996 80.0732 12.7874 80.0732 12.3271C80.0732 11.8532 80.21 11.5365 80.4834 11.377C80.7614 11.2174 81.0964 11.1377 81.4883 11.1377ZM88.208 22.1367C87.4242 22.1367 86.7428 21.9977 86.1641 21.7197C85.5853 21.4372 85.1364 21.0042 84.8174 20.4209C84.5029 19.833 84.3457 19.0811 84.3457 18.165C84.3457 17.2262 84.5212 16.4583 84.8721 15.8613C85.2275 15.2643 85.7129 14.8245 86.3281 14.542C86.9434 14.2594 87.6406 14.1182 88.4199 14.1182C88.8939 14.1182 89.3428 14.1706 89.7666 14.2754C90.195 14.3802 90.5915 14.5238 90.9561 14.7061L90.1699 16.6816C89.8509 16.5404 89.5524 16.4287 89.2744 16.3467C89.001 16.2601 88.7161 16.2168 88.4199 16.2168C88.151 16.2168 87.9141 16.2874 87.709 16.4287C87.5039 16.57 87.3444 16.7842 87.2305 17.0713C87.1165 17.3538 87.0596 17.7139 87.0596 18.1514C87.0596 18.598 87.1165 18.958 87.2305 19.2314C87.349 19.5049 87.5107 19.7031 87.7158 19.8262C87.9255 19.9492 88.1647 20.0107 88.4336 20.0107C88.821 20.0107 89.2061 19.9515 89.5889 19.833C89.9762 19.71 90.3431 19.5413 90.6895 19.3271V21.4531C90.3704 21.6628 90.0104 21.8291 89.6094 21.9521C89.2083 22.0752 88.7412 22.1367 88.208 22.1367ZM97.9834 19.6211C97.9834 20.1133 97.874 20.5485 97.6553 20.9268C97.4365 21.305 97.0856 21.6012 96.6025 21.8154C96.124 22.0296 95.4928 22.1367 94.709 22.1367C94.1576 22.1367 93.6631 22.1071 93.2256 22.0479C92.7926 21.9886 92.3529 21.8747 91.9062 21.7061V19.5664C92.3939 19.7897 92.8906 19.9515 93.3965 20.0518C93.9023 20.1475 94.3011 20.1953 94.5928 20.1953C94.8936 20.1953 95.1123 20.1634 95.249 20.0996C95.3903 20.0312 95.4609 19.931 95.4609 19.7988C95.4609 19.6849 95.4131 19.5892 95.3174 19.5117C95.2262 19.4297 95.0599 19.3363 94.8184 19.2314C94.5814 19.1266 94.2464 18.9854 93.8135 18.8076C93.3851 18.6299 93.0273 18.4362 92.7402 18.2266C92.4577 18.0169 92.2458 17.7663 92.1045 17.4746C91.9632 17.1829 91.8926 16.8252 91.8926 16.4014C91.8926 15.6449 92.1842 15.0752 92.7676 14.6924C93.3509 14.3096 94.1234 14.1182 95.085 14.1182C95.5954 14.1182 96.0762 14.1751 96.5273 14.2891C96.9785 14.3984 97.4456 14.5602 97.9287 14.7744L97.1973 16.4971C96.8145 16.3239 96.4271 16.1849 96.0352 16.0801C95.6432 15.9753 95.3311 15.9229 95.0986 15.9229C94.889 15.9229 94.7272 15.9502 94.6133 16.0049C94.4993 16.0596 94.4424 16.1393 94.4424 16.2441C94.4424 16.3398 94.4811 16.4242 94.5586 16.4971C94.6406 16.57 94.7933 16.6543 95.0166 16.75C95.2399 16.8457 95.5658 16.9801 95.9941 17.1533C96.4453 17.3356 96.8167 17.5316 97.1084 17.7412C97.4046 17.9463 97.6234 18.1969 97.7646 18.4932C97.9105 18.7894 97.9834 19.1654 97.9834 19.6211Z" fill="white"/>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M108 19.7188L109.284 21.0032L115 15.2884L120.716 21.0032L122 19.7187L115 12.7187L108 19.7188Z" fill="white"/>
            </svg>
            `;
            }
        }

    /**
     * Handles click events on widget options to toggle their state
     * @param {Event} event - Click event object
     * @returns {void}
     */
    function handleWidgetOptionClick(event) {
        // Only proceed if the click is on the checkbox or slider
        if (!event.target.classList.contains('slider') && event.target.type !== 'checkbox') {
            return;
        }

        const widgetOption = event.target.closest('.widget-option');
        if (widgetOption) {
            const widgetType = widgetOption.getAttribute('data-widget');
            const checkbox = widgetOption.querySelector('.widget-option-switch');

            // Toggle the checkbox
            checkbox.checked = !checkbox.checked;

            if (checkbox.checked) {
                // Remove any existing widget first
                removeWidget(widgetType);
                
                // Then create the new widget
                if (widgetType === 'systemResources') {
                    addSystemResourcesWidget();
                } else {
                    addWidget(widgetType);
                }
            } else {
                // Widget is turned OFF
                removeWidget(widgetType);
            }

            // Prevent the event from bubbling up
            event.stopPropagation();
        }
    }

    // Use the regular event listener without debounce
    widgetOptions.addEventListener('click', handleWidgetOptionClick);

    /**
     * Removes a widget from the DOM
     * @param {string} widgetType - Type of widget to remove
     * @returns {boolean} True if widget removed successfully, false otherwise
     */
    function removeWidget(widgetType) {
        try {
            // Dynamically append 'Chart' to the widget type
            const widgetId = widgetType.endsWith('Chart') ? widgetType : `${widgetType}Chart`;
            
            // Check if the widget is not on canvas
            const canvas = document.getElementById(widgetId);
            if (!canvas) {
                return false;
            }
            
            // Find and remove the parent widget container
            const widgetContainer = canvas.closest('.widget');
            if (widgetContainer) {
                widgetContainer.remove();
            } else {
                // Fallback to removing just the canvas if container not found
                canvas.remove();
            }
            
            return true;
        } catch (error) {
            console.error('Error removing widget:', error);
            return false;
        }
    }
}

/**
 * Creates and adds a new widget to the container
 * @param {string} widgetType - Type of widget to create
 * @description Creates a draggable widget with chart canvas, positions it on screen,
 *              and initializes the chart with specified configuration
 * @throws {Error} When widget type is unknown
 * @returns {void}
 * 
 * @example
 * addWidget('cpuUsage');
 */
function addWidget(widgetType) {
    if (!chartConfigs[widgetType]) {
        console.error(`Unknown widget type: ${widgetType}`);
        return;
    }

    // Check for existing widget or canvas
    const existingWidget = document.querySelector(`[data-widget="chart"][data-type="${widgetType}"]`);
    const existingCanvas = document.getElementById(`${widgetType}Chart`);
    
    if (existingWidget || existingCanvas) {
        return;
    }

    // Create widget container
    let widget = document.createElement('div');
    widget.className = 'widget chart-widget';
    widget.style.width = '500px';
    widget.style.height = '300px';
    widget.style.position = 'absolute';
    
    // Find a non-overlapping position for the new widget
    const position = findNonOverlappingPosition();
    widget.style.top = position.top + 'px';
    widget.style.left = position.left + 'px';
    if (position.zIndex) {
        widget.style.zIndex = position.zIndex;
    }
    
    widget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    widget.style.border = '1px solid #444';
    widget.style.borderRadius = '15px';
    widget.style.padding = '10px';
    widget.style.boxSizing = 'border-box';

    // Create a wrapper div for the canvas
    let canvasWrapper = document.createElement('div');
    canvasWrapper.style.width = '100%';
    canvasWrapper.style.height = 'calc(100% - 30px)';  // Subtract 30px for the close button and padding
    canvasWrapper.style.position = 'relative';
    widget.appendChild(canvasWrapper);

    // Add custom attribute
    widget.setAttribute('data-widget', 'chart');

    // Create canvas for chart
    let canvas = document.createElement('canvas');
    canvas.id = `${widgetType}Chart`;
    canvasWrapper.appendChild(canvas);

    // Add widget to container
    const container = document.fullscreenElement || document.getElementById('widgetsContainer');
    container.appendChild(widget);

    // Make widget draggable
    makeWidgetDraggable(widget);

    // Create chart
    const config = chartConfigs[widgetType];
    const chart = createWebRTCChart(canvas.id, config);

    if (chart) {
        widget.chart = chart;
    }

    // Start updating the chart
    startChartUpdate(widget, widgetType);
}

/**
 * Calculates a non-overlapping position for a new widget
 * @returns {Object} Position coordinates {top: number, left: number}
 * @description Finds the first available position for a widget that doesn't overlap
 *              with existing widgets or the menu area, using a grid-like placement strategy.
 *              Returns default position {top: 125, left: 50} if no space found after max attempts.
 */
function findNonOverlappingPosition() {
    const container = document.fullscreenElement || document.getElementById('widgetsContainer');
    const existingWidgets = container.querySelectorAll('.widget');
    const widgetWidth = 500;
    const widgetHeight = 300;
    const padding = 20;
    const menuWidth = 250;
    const startPosX = 50;
    const startPosY = 125;
    const stackingOffset = 25; // Offset for stacked widgets
    
    // Create a grid system
    const grid = {
        cols: Math.floor((container.clientWidth - menuWidth - startPosX) / (widgetWidth + padding)),
        rows: Math.floor((container.clientHeight - startPosY) / (widgetHeight + padding))
    };

    // Create a map of occupied positions
    const occupiedPositions = new Set();
    const stackedPositions = new Map(); // Track number of widgets stacked at each position

    existingWidgets.forEach(widget => {
        const rect = widget.getBoundingClientRect();
        const gridX = Math.floor((rect.left - startPosX) / (widgetWidth + padding));
        const gridY = Math.floor((rect.top - startPosY) / (widgetHeight + padding));
        const posKey = `${gridX},${gridY}`;
        
        occupiedPositions.add(posKey);
        
        // Track stacking
        if (stackedPositions.has(posKey)) {
            stackedPositions.set(posKey, stackedPositions.get(posKey) + 1);
        } else {
            stackedPositions.set(posKey, 1);
        }
    });

    // Find first available position
    for (let row = 0; row < grid.rows; row++) {
        for (let col = 0; col < grid.cols; col++) {
            const posKey = `${col},${row}`;
            if (!occupiedPositions.has(posKey)) {
                return {
                    left: startPosX + col * (widgetWidth + padding),
                    top: startPosY + row * (widgetHeight + padding)
                };
            }
        }
    }

    // If no space found in grid, stack at the last occupied position with offset
    const lastWidget = Array.from(existingWidgets).pop();
    if (lastWidget) {
        const rect = lastWidget.getBoundingClientRect();
        const gridX = Math.floor((rect.left - startPosX) / (widgetWidth + padding));
        const gridY = Math.floor((rect.top - startPosY) / (widgetHeight + padding));
        const posKey = `${gridX},${gridY}`;
        const stackCount = stackedPositions.get(posKey) || 0;

        return {
            left: rect.left + stackingOffset,
            top: rect.top + stackingOffset,
            zIndex: stackCount + 1 // Increase z-index for stacked widgets
        };
    }

    // Fallback to default position with offset from top-left
    return {
        left: startPosX + stackingOffset,
        top: startPosY + stackingOffset,
        zIndex: 1
    };
}

/**
 * Makes a widget element draggable within its container
 * @param {HTMLElement} widget - The DOM element to make draggable
 * @description Adds mouse event listeners to enable drag functionality,
 *              tracking mouse position and updating widget position accordingly
 * @returns {void}
 * 
 * @example
 * makeWidgetDraggable(document.querySelector('.widget'));
 */
function makeWidgetDraggable(widget) {
    let isDragging = false;
    let startX, startY;

    widget.addEventListener('mousedown', startDragging);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDragging);

    function startDragging(e) {
        isDragging = true;
        startX = e.clientX - widget.offsetLeft;
        startY = e.clientY - widget.offsetTop;
    }

    function drag(e) {
        if (!isDragging) return;
        widget.style.left = `${e.clientX - startX}px`;
        widget.style.top = `${e.clientY - startY}px`;
    }

    function stopDragging() {
        isDragging = false;
    }
}

/**
 * Creates a debounced version of a function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Delay in milliseconds
 * @returns {Function} Debounced function that delays execution
 * 
 * @example
 * const debouncedFn = debounce(() => console.log('executed'), 1000);
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Creates a WebRTC metrics chart
 * @param {string} canvasId - ID of the canvas element
 * @param {Object} config - Chart configuration options
 * @returns {Chart} New Chart instance
 * 
 * @example
 * createWebRTCChart('metricsCanvas', {
 *   type: 'line',
 *   options: {...}
 * });
 */
function createWebRTCChart(canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error(`Canvas element with ID ${canvasId} not found.`);
        return null;
    }

    const existingChart = Chart.getChart(canvas);
    if (existingChart) {
        console.error(`Canvas with ID ${canvasId} already has a chart instance. Destroying the existing chart.`);
        existingChart.destroy();
    }

    const ctx = canvas.getContext('2d');

    const chartData = {
        labels: [],
        datasets: config.stats.map(stat => ({
            label: stat.label,
            data: [],
            borderColor: stat.color,
            tension: 0.1
        }))
    };

    return new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,  // Allow the chart to fill its container
            aspectRatio: 2,  // Set the aspect ratio to make the chart taller
            plugins: {
                legend: {
                    labels: {
                        color: 'rgb(255, 255, 255)'
                    }
                },
                title: {
                    display: true,
                    text: config.title,
                    color: 'rgb(255, 255, 255)'
                }
            },
            scales: {
                x: { title: { display: true, text: 'Time', color: 'rgb(255, 255, 255)' }, ticks: { color: 'rgb(255, 255, 255)'}, grid: { color: 'rgba(255, 255, 255, 0.1)'} },
                y: { title: { display: true, text: 'Value', color: 'rgb(255, 255, 255)' }, ticks: { color: 'rgb(255, 255, 255)'}, grid: { color: 'rgba(255, 255, 255, 0.1)'}}
            }
        }
    });
}

/**
 * Starts periodic chart updates for a widget
 * @param {HTMLElement} widget - Widget element containing the chart
 * @param {string} widgetType - Type of widget to update
 * @returns {void}
 */
function startChartUpdate(widget, widgetType) {
    // Clear any existing interval
    if (widget.updateInterval) {
        clearInterval(widget.updateInterval);
    }
    
    // Store the new interval
    widget.updateInterval = setInterval(() => {
        if (!isViewingMetrics) {
            updateChart(widget, widgetType);
        }
    }, STATS_COLLECTION_INTERVAL);
    
    // Enable the View Full Metrics button
    document.getElementById("viewMetricsButton").disabled = false;
}

/**
 * Displays full metrics data in CSV format
 * @description Prepares stats, saves them as blob, and displays the CSV data
 * @returns {void}
 * @throws {Error} When metrics file creation fails
 */
function viewFullMetrics() {
    const statsForAnalysis = prepareStatsForServer();
    const blob = saveAggregatedStats(statsForAnalysis);
    
    if (blob) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const csvData = event.target.result;
            displayCsvData(csvData);
        };
        reader.readAsText(blob);
    } else {
        alert('Error creating metrics file. Please check the console for more information.');
    }
}

/**
 * Converts CSV data into an HTML table and displays it
 * @param {string} csvData - Raw CSV data as string
 * @description Parses CSV string, creates HTML table with headers and rows,
 *              and displays it in the fullMetricsPanel element
 * @returns {void}
 * 
 * @example
 * displayCsvData('header1,header2\nvalue1,value2');
 */
function displayCsvData(csvData) {
    const rows = csvData.split('\n');
    const headers = rows[0].split(',');
    
    let tableHtml = '<table><thead><tr>';
    headers.forEach(header => {
        tableHtml += `<th>${header}</th>`;
    });
    tableHtml += '</tr></thead><tbody>';

    for (let i = 1; i < rows.length; i++) {
        const cells = rows[i].split(',');
        if (cells.length === headers.length) {
            tableHtml += '<tr>';
            cells.forEach(cell => {
                tableHtml += `<td>${cell}</td>`;
            });
            tableHtml += '</tr>';
        }
    }
    tableHtml += '</tbody></table>';

    document.getElementById('csvTable').innerHTML = tableHtml;
    document.getElementById('fullMetricsPanel').style.display = 'block';
}

/**
 * Creates and adds a new statistical widget to the container
 * @param {string} widgetType - Type of stat widget to create
 * @description Creates a draggable statistical widget, positions it on screen,
 *              and initializes periodic stat updates. Widget displays a title
 *              and value that updates based on the widget type.
 * @throws {Error} When widget type is unknown
 * @returns {void}
 * 
 * @example
 * addStatWidget('packetLoss');
 */
function addStatWidget(widgetType) {
    if (!chartConfigs[widgetType]) {
        console.error(`Unknown widget type: ${widgetType}`);
        return;
    }

    // Check for existing widget
    const existingWidget = document.querySelector(`[data-widget="stat"][data-type="${widgetType}"]`);
    if (existingWidget) {
        return;
    }

    // Create widget container
    let widget = document.createElement('div');
    widget.className = 'widget stat-widget';
    widget.style.width = '250px';
    widget.style.height = '150px';
    widget.style.position = 'absolute';
    
    // Find a non-overlapping position for the new widget
    const position = findNonOverlappingPosition();
    widget.style.top = position.top + 'px';
    widget.style.left = position.left + 'px';
    
    widget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    widget.style.border = '1px solid #444';
    widget.style.borderRadius = '15px';
    widget.style.padding = '10px';
    widget.style.boxSizing = 'border-box';

    // Add custom attributes
    widget.setAttribute('data-widget', 'stat');
    widget.setAttribute('data-type', widgetType);

    // Create content for stat widget
    let content = document.createElement('div');
    content.className = 'stat-content';
    content.innerHTML = `
        <h3>${chartConfigs[widgetType].title}</h3>
        <div class="stat-value" id="${widgetType}Value">N/A</div>
    `;
    widget.appendChild(content);

    // Add widget to container
    const container = document.fullscreenElement || document.getElementById('widgetsContainer');
    container.appendChild(widget);

    // Make widget draggable
    makeDraggable(widget);

    // Start updating the stat
    startStatUpdate(widget, widgetType);
}

/**
 * Hides the full metrics panel
 * @description Sets the display style of fullMetricsPanel to 'none'
 * @returns {void}
 */
function closeFullMetrics() {
    document.getElementById('fullMetricsPanel').style.display = 'none';
}

/**
 * Retrieves the WebRTC peer connection from the active GameLift stream.
 * 
 * @returns {RTCPeerConnection|null} The WebRTC peer connection if found, null otherwise
 * 
 * @description
 * Attempts to retrieve the peer connection using various possible property names:
 * - peerConnection
 * - _peerConnection
 * - rtcPeerConnection
 * - webRTCPeerConnection
 * 
 * This function handles different implementations and naming conventions that
 * might be used for the peer connection property.
 * 
 * @throws {Error} Logs error to console if GameLiftStream instance or peer connection not found
 * 
 * @example
 * const peerConnection = getPeerConnection();
 * if (peerConnection) {
 *   // Use the peer connection
 * }
 */
function getPeerConnection() {
    if (!window.activeGameLiftStream) {
        console.error('GameLiftStream instance not found');
        return null;
    }

    // Try different possible ways to get the peer connection
    const connection = 
        window.activeGameLiftStream.peerConnection || // Try direct property
        window.activeGameLiftStream._peerConnection || // Try private property
        window.activeGameLiftStream.rtcPeerConnection || // Try alternate name
        window.activeGameLiftStream.webRTCPeerConnection; // Try another alternate name

    if (!connection) {
        console.error('Could not find peer connection');
        return null;
    }

    return connection;
}

/**
 * Collects and combines both video and audio WebRTC statistics from the active stream.
 * 
 * @async
 * @returns {Promise<Array|null>} Array of combined WebRTC statistics or null if collection fails
 * 
 * @description
 * Simultaneously collects both video and audio statistics using Promise.all.
 * Combines the stats into a single array for unified processing.
 * Handles cases where the GameLift stream instance might not be available.
 * 
 * The returned statistics include metrics such as:
 * - Bandwidth usage
 * - Packet loss
 * - Latency
 * - Frame rates
 * - Audio levels
 * 
 * @throws {Error} Logs error to console if stats collection fails
 * 
 * @example
 * const stats = await collectLocalStats();
 * if (stats) {
 *   stats.forEach(stat => console.log(stat));
 * }
 */
async function collectLocalStats() {
    try {
        
        if (!window.activeGameLiftStream) {
            console.error('GameLiftStream instance not found');
            return null;
        }

        // Collect both video and audio stats
        const [videoStats, audioStats] = await Promise.all([
            window.activeGameLiftStream.getVideoRTCStats(),
            window.activeGameLiftStream.getAudioRTCStats()
        ]);

        // Combine stats into one array
        const combinedStats = new Map([...videoStats, ...audioStats]);
        return Array.from(combinedStats.values());
    } catch (error) {
        console.error('Error collecting WebRTC stats:', error);
        return null;
    }
}

/**
 * Updates a chart widget with new WebRTC statistics.
 * 
 * @param {Object} widget - The chart widget to update
 * @param {Object} widget.chart - The Chart.js instance
 * @param {number} widget.lastStatsCollection - Timestamp of last collection
 * @param {string} widgetType - Type of widget determining which stats to collect
 * 
 * @description
 * Updates a chart with new WebRTC statistics based on the widget type.
 * Handles both audio and video statistics separately.
 * Maintains a rolling window of data points (maximum 20).
 * 
 * Process:
 * 1. Collects appropriate stats based on widget type
 * 2. Processes and stores the stats
 * 3. Updates chart with new data points
 * 4. Maintains data point limit by removing oldest entries
 * 
 * @throws {Error} Logs errors to console if:
 * - Widget chart is not found
 * - GameLift stream instance is not available
 * - Stats collection or processing fails
 * 
 * @example
 * updateChart({
 *   chart: chartInstance,
 *   lastStatsCollection: Date.now()
 * }, 'audioMetrics');
 */
function updateChart(widget, widgetType) {
    if (isViewingMetrics) {
        return; // Don't update if viewing metrics
    }

    if (!widget.chart) {
        console.error('No chart found in widget');
        return;
    }

    // Determine which stats to collect based on widget type
    const statsPromise = chartConfigs[widgetType].statsType === 'audio' 
        ? window.activeGameLiftStream.getAudioRTCStats()
        : window.activeGameLiftStream.getVideoRTCStats();

    statsPromise.then(stats => {
        const config = chartConfigs[widgetType];
        const currentTimestamp = Date.now();
        
        // Convert stats to array if it's not already
        const statsArray = Array.from(stats.values());
        
        // Process and store all stats
        processStats(statsArray, currentTimestamp);
        
        statsArray.forEach((report) => {
            if (report.type === config.statsType) {
                const timestamp = new Date(report.timestamp).toLocaleTimeString();
                widget.chart.data.labels.push(timestamp);

                config.stats.forEach((stat, index) => {
                    const value = report[stat.key] || 0;
                    widget.chart.data.datasets[index].data.push(value);
                });

                // Limit the number of data points
                const maxDataPoints = 20;
                if (widget.chart.data.labels.length > maxDataPoints) {
                    widget.chart.data.labels.shift();
                    widget.chart.data.datasets.forEach(dataset => dataset.data.shift());
                }

                widget.chart.update();
            }
        });

        widget.lastStatsCollection = currentTimestamp;

    }).catch(error => {
        console.error('Error getting or processing stats:', error);
    });
}

/**
 * Callback function that handles stream connection state changes.
 * 
 * @param {string} state - The current connection state ('connected', 'disconnected', etc.)
 * 
 * @description
 * Monitors the stream connection state and initializes stats collection when connected.
 * When the state becomes 'connected', it attempts to start the stats collection
 * process using the configured collection interval.
 * 
 * @throws {Error} Logs error to console if startCollectingStats function is not defined
 * 
 * @example
 * streamConnectionStateCallback('connected'); // Starts stats collection
 */
function streamConnectionStateCallback(state) {
    if (state === 'connected') {
        // Initialize stats collection
        if (typeof startCollectingStats === 'function') {
            startCollectingStats(STATS_COLLECTION_INTERVAL);
        } else {
            console.error('startCollectingStats function not found');
        }
    }
}

/**
 * Checks if the GameLift stream connection is ready and available.
 * 
 * @returns {boolean} True if connection is ready, false otherwise
 * 
 * @description
 * Verifies two critical components:
 * 1. Existence of GameLiftStream instance
 * 2. Availability of WebRTC peer connection
 * 
 * This function serves as a prerequisite check before performing
 * operations that require an active connection.
 * 
 * @throws {Error} Logs errors to console when components are missing
 * 
 * @example
 * if (isConnectionReady()) {
 *     // Proceed with connection-dependent operations
 * }
 */
function isConnectionReady() {
    if (!window.activeGameLiftStream) {
        console.error('GameLiftStreams instance not found');
        return false;
    }

    const peerConnection = window.activeGameLiftStream.getPeerConnection();
    if (!peerConnection) {
        console.error('No peer connection available');
        return false;
    }

    return true;
}

/**
 * Debug utility function for inspecting WebRTC connection state.
 * 
 * @description
 * Logs detailed information about the current connection state including:
 * - GameLiftStream instance
 * - PeerConnection object
 * - Connection state
 * - ICE connection state
 * 
 * This function is designed to be called from the browser console
 * for troubleshooting connection issues.
 * 
 * @throws {Error} Safely handles missing components without throwing
 * 
 * @example
 * // In browser console:
 * debugConnection();
 */
function debugConnection() {
    console.log('GameLiftStream instance:', window.activeGameLiftStream);
    if (window.activeGameLiftStream) {
        const peerConnection = window.activeGameLiftStream.getPeerConnection();
        console.log('PeerConnection:', peerConnection);
        if (peerConnection) {
            console.log('PeerConnection state:', peerConnection.connectionState);
            console.log('ICE Connection state:', peerConnection.iceConnectionState);
        }
    }
}

/**
 * Debug utility function for inspecting GameLift stream instance details.
 * 
 * @description
 * Provides detailed information about the GameLiftStream instance:
 * - Reference to the instance itself
 * - List of available methods (from prototype)
 * - List of instance properties
 * 
 * Useful for:
 * - API exploration
 * - Debugging
 * - Development reference
 * 
 * @throws {Error} Safely handles missing GameLiftStream instance
 * 
 * @example
 * // In browser console:
 * debugGameLiftStream();
 */
function debugGameLiftStream() {
    console.log('GameLiftStream instance:', window.activeGameLiftStream);
    console.log('Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(window.activeGameLiftStream)));
    console.log('Instance properties:', Object.keys(window.activeGameLiftStream));
}

// WebRTC Chat Configs
const chartConfigs = {
    roundTripTime: {
        title: 'Round Trip Time',
        statsType: 'candidate-pair',
        stats: [{ label: 'RTT (ms)', key: 'currentRoundTripTime', color: 'rgb(75, 192, 192)' }]
    },
    bytesTransfer: {
        title: 'Bytes Transferred',
        statsType: 'transport',
        stats: [
            { label: 'Bytes Received', key: 'bytesReceived', color: 'rgb(54, 162, 235)' },
            { label: 'Bytes Sent', key: 'bytesSent', color: 'rgb(255, 206, 86)' }
        ]
    },
    fps: {
        title: 'Frames Per Second',
        statsType: 'inbound-rtp',
        stats: [{ label: 'FPS', key: 'framesPerSecond', color: 'rgb(75, 192, 192)' }]
    },
    packets: {
        title: 'Packets Statistics',
        statsType: 'inbound-rtp',
        stats: [
            { label: 'Packets Received', key: 'packetsReceived', color: 'rgb(54, 162, 235)' },
            { label: 'Packets Lost', key: 'packetsLost', color: 'rgb(255, 99, 71)' }
        ]
    },
    jitter: {
        title: 'Jitter',
        statsType: 'inbound-rtp',
        stats: [{ label: 'Jitter (s)', key: 'jitter', color: 'rgb(201, 203, 207)' }]
    },
    framesReceived: {
        title: 'Frames Received',
        statsType: 'inbound-rtp',
        stats: [{ label: 'Frames', key: 'framesReceived', color: 'rgb(75, 192, 192)' }]
    },
    framesDecoded: {
        title: 'Frames Decoded',
        statsType: 'inbound-rtp',
        stats: [{ label: 'Frames Decoded', key: 'framesDecoded', color: 'rgb(255, 99, 132)' }]
    },
    framesDropped: {
        title: 'Frames Dropped',
        statsType: 'inbound-rtp',
        stats: [{ label: 'Frames Dropped/s', key: 'framesDropped', color: 'rgb(255, 159, 64)' }]
    }
};
