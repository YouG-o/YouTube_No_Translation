/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

/**
 * NOTE ON SCRIPT INJECTION:
 * We use script injection to access YouTube's player API directly from the page context.
 * This is necessary because the player response data is not accessible from the content script context.
 * As you can see below, the injected code only reads YouTube's data without any modifications.
 */


(() => {
    const LOG_PREFIX = '[YNT]';
    const LOG_CONTEXT = '[MAIN TITLE]';
    const LOG_COLOR = '#fcd34d';  // Yellow
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

    function getOriginalTitle() {
        // Try to get the specified player
        let targetId = 'movie_player'; // player for regular videos
        if (window.location.pathname.startsWith('/shorts')) {
            targetId = 'shorts-player'; // player for shorts
        } else if (window.location.pathname.startsWith('/@')) {
            targetId = 'c4-player'; // player for channels main video
        } 
        const player = document.getElementById(targetId);
        //log(`Player is ${targetId}`);
        if (!player) {
            log('Player not found');
            window.dispatchEvent(new CustomEvent('ynt-title-data', {
                detail: { title: null }
            }));
            return;
        }

        try {
            const response = player.getPlayerResponse();
            //log('Player response:', response);            
            //log('Video details:', response?.videoDetails);
            
            const title = response?.videoDetails?.title;
            
            if (title) {
                //log('Found title from player response:', title);
                window.dispatchEvent(new CustomEvent('ynt-title-data', {
                    detail: { title }
                }));
            } else {
                log('No title found in player response');
                window.dispatchEvent(new CustomEvent('ynt-title-data', {
                    detail: { title: null }
                }));
            }
        } catch (error) {
            errorLog(`${error.name}: ${error.message}`);
            window.dispatchEvent(new CustomEvent('ynt-title-data', {
                detail: { title: null }
            }));
        }
    }

    getOriginalTitle();
})();