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
 * This is necessary because the player API is not accessible from the content script context.
 * As you can see below, the injected code only uses YouTube's official player API methods.
 */

(() => {
    const LOG_PREFIX = '[YNT]';
    const LOG_CONTEXT = '[DESCRIPTION]';
    const LOG_COLOR = '#2196F3'; // Blue
    const ERROR_COLOR = '#F44336';  // Red

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
            `color: ${LOG_COLOR}`,
            `color: ${ERROR_COLOR}`,
            ...args
        );
    }

    function getTargetPlayerId() {
        if (window.location.pathname.startsWith('/shorts')) return 'shorts-player';
        if (window.location.pathname.startsWith('/@')) return 'c4-player';
        return 'movie_player';
    }

    function fetchDescriptionWithRetry(player, maxAttempts = 10, delayMs = 300) {
        let attempt = 0;

        function tryFetch() {
            const response = player.getPlayerResponse();
            const description = response?.videoDetails?.shortDescription;

            if (description) {
                window.dispatchEvent(new CustomEvent('ynt-description-data', {
                    detail: { description }
                }));
            } else if (attempt < maxAttempts) {
                attempt++;
                setTimeout(tryFetch, delayMs);
            } else {
                errorLog('No description found in player response after retries');
                window.dispatchEvent(new CustomEvent('ynt-description-data', {
                    detail: { description: null }
                }));
            }
        }

        tryFetch();
    }

    const targetId = getTargetPlayerId();
    const player = document.getElementById(targetId);

    if (!player) {
        log('Player not found');
        window.dispatchEvent(new CustomEvent('ynt-title-data', {
            detail: { title: null }
        }));
        return;
    }

    fetchDescriptionWithRetry(player);
})();
