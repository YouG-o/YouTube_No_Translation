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
    const LOG_CONTEXT = '[MINIPLAYER ID]';
    const LOG_COLOR = '#9C27B0';  // Purple
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
            `color: ${LOG_COLOR}`,
            `color: ${ERROR_COLOR}`,
            ...args
        );
    }

    function getVideoIdFromMiniplayer() {
        const idPattern = /^[A-Za-z0-9_-]{11}$/;
        let videoId = null;
        let method = 'none';

        try {
            // Method 1: Try movie_player API (most reliable)
            const moviePlayer = document.getElementById('movie_player');
            if (moviePlayer && typeof moviePlayer.getVideoData === 'function') {
                const data = moviePlayer.getVideoData();
                const candidate = data && (data.video_id || data.videoId || data.id) ? (data.video_id || data.videoId || data.id) : null;
                if (candidate && idPattern.test(candidate)) {
                    videoId = candidate;
                    method = 'movie_player.getVideoData';
                    //log(`Video ID found via ${method}: ${videoId}`);
                }
            }

            // Method 2: Try miniplayer attached player if movie_player failed
            if (!videoId) {
                const miniplayerContainer = document.querySelector('ytd-miniplayer');
                if (miniplayerContainer) {
                    const attachedPlayer = miniplayerContainer.player_ || miniplayerContainer.player || miniplayerContainer.playerApi;
                    if (attachedPlayer && typeof attachedPlayer.getVideoData === 'function') {
                        const data = attachedPlayer.getVideoData();
                        const candidate = data && (data.video_id || data.videoId || data.id) ? (data.video_id || data.videoId || data.id) : null;
                        if (candidate && idPattern.test(candidate)) {
                            videoId = candidate;
                            method = 'miniplayer.attachedPlayer.getVideoData';
                            //log(`Video ID found via ${method}: ${videoId}`);
                        }
                    }
                }
            }

            // Method 3: Try scanning miniplayer elements for getVideoData methods
            if (!videoId) {
                const miniplayerContainer = document.querySelector('ytd-miniplayer');
                if (miniplayerContainer) {
                    const elements = [miniplayerContainer, ...Array.from(miniplayerContainer.querySelectorAll('*'))].slice(0, 200);
                    for (const el of elements) {
                        try {
                            if (typeof el.getVideoData === 'function') {
                                const data = el.getVideoData();
                                const candidate = data && (data.video_id || data.videoId || data.id) ? (data.video_id || data.videoId || data.id) : null;
                                if (candidate && idPattern.test(candidate)) {
                                    videoId = candidate;
                                    method = 'element.getVideoData';
                                    //log(`Video ID found via ${method}: ${videoId}`);
                                    break;
                                }
                            }
                        } catch (e) {
                            // Ignore element access errors
                        }
                    }
                }
            }

            if (!videoId) {
                errorLog('No video ID found from player APIs');
            }

        } catch (error) {
            errorLog('Error getting video ID from miniplayer:', error);
        }

        // Emit result back to content script
        window.dispatchEvent(new CustomEvent('ynt-miniplayer-id', {
            detail: { videoId, method }
        }));

        // Clean up script element
        document.currentScript?.remove();
    }

    // Execute immediately
    getVideoIdFromMiniplayer();
})();