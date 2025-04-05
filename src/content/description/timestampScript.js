/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

/**
 * This script is injected when a timestamp is clicked in the description.
 * It accesses the player directly to navigate to the specific timestamp.
 */
(() => {
    const LOG_PREFIX = '[YNT]';
    const LOG_CONTEXT = '[DESCRIPTION]';
    const LOG_COLOR = '#2196F3'; // Blue
    const ERROR_COLOR = '#F44336';  // Red

    // Simplified logger functions
    function log(message, ...args) {
        console.log(
            `%c${LOG_PREFIX}${LOG_CONTEXT} ${message}`,
            `color: ${LOG_COLOR}`,
            ...args
        );
    }

    function errorLog(message, ...args) {
        console.log(
            `%c${LOG_PREFIX}${LOG_CONTEXT} %c${message}`,
            `color: ${LOG_COLOR}`,  // Keep context color for prefix
            `color: ${ERROR_COLOR}`,  // Red color for error message
            ...args
        );
    }

    // Get timestamp from custom event
    const timestampEvent = document.currentScript.getAttribute('ynt-timestamp-event');
    if (!timestampEvent) {
        errorLog('No timestamp event found');
        return;
    }

    const timestampData = JSON.parse(timestampEvent);
    const seconds = parseInt(timestampData.seconds, 10);

    // Get player
    const player = document.getElementById('movie_player');
    if (!player) {
        log('Player element not found');
        return;
    }

    // Navigate to timestamp
    try {
        player.seekTo(seconds, true);
        log(`Navigated to timestamp: ${seconds}s`);
    } catch (error) {
        errorLog(`Failed to navigate to timestamp: ${error}`);
    }
})();