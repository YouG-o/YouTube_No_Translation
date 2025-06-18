/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 
* NOTE ON SCRIPT INJECTION :
 * We use script injection to access YouTube's player API directly from the page context.
 * This is necessary because the player API is not accessible from the content script context.
 * As you can see down below, the injected code only uses YouTube's official player API methods.
*/

/**
 * Creates isolated YouTube player for metadata retrieval without affecting main player
 * 
 * Problem this solves:
 * - When retrieving video metadata (titles, descriptions) via YouTube Player API,
 *   using the main player (movie_player) interrupts the user's video playback
 * - Multiple features (browsing titles fallback, search descriptions) competing
 *   for the same player cause concurrency issues and data corruption
 * 
 * Solution approach:
 * - Create separate invisible iframe-based YouTube players for metadata operations
 * - Each feature gets its own dedicated player (ynt-player-titles, ynt-player-descriptions)
 * - Main player remains untouched for user experience
 * 
 * Technical implementation:
 * - Creates invisible iframe with YouTube embed URL and enablejsapi=1
 * - Player is positioned off-screen and muted to prevent any user interference
 * - Uses loadVideoById() to load target video and getPlayerResponse() to extract metadata
 * - Parameterizable player ID system allows multiple isolated players simultaneously
 * 
 * Player ID format:
 * - Container: "{playerId}-container" (e.g., "ynt-player-titles-container")
 * - Iframe: "{playerId}" (e.g., "ynt-player-titles")
 * - Actual YouTube player inside iframe: always "movie_player"
 * 
 * Note on architecture choice:
 * - Iframe approach chosen over direct player creation as it provides full YouTube API access
 * - Script injection in page context required to bypass content script API limitations
 * - Event-based communication ensures proper initialization before metadata requests
 */

// Script to create isolated YouTube player for metadata retrieval
(() => {
    // Get player ID from script attribute or use default
    const playerId = document.currentScript?.getAttribute('data-player-id') || 'ynt-player';
    const containerSelector = `${playerId}-container`;
    
    // Check if isolated player already exists
    if (document.getElementById(containerSelector)) {
        window.dispatchEvent(new CustomEvent('ynt-isolated-player-ready', {
            detail: { success: true, message: 'Player already exists', playerId }
        }));
        return;
    }

    // Create invisible container
    const playerContainer = document.createElement('div');
    playerContainer.id = containerSelector;
    playerContainer.style.cssText = `
        position: absolute !important;
        left: -9999px !important;
        top: -9999px !important;
        width: 1px !important;
        height: 1px !important;
        opacity: 0 !important;
        pointer-events: none !important;
        visibility: hidden !important;
        z-index: -1 !important;
    `;

    // Create YouTube iframe with API enabled
    const iframe = document.createElement('iframe');
    iframe.id = playerId;
    iframe.src = 'https://www.youtube.com/embed/dQw4w9WgXcQ?enablejsapi=1&controls=0&disablekb=1&fs=0&modestbranding=1&rel=0&autoplay=0&mute=1';
    iframe.width = '1';
    iframe.height = '1';
    iframe.allow = 'autoplay; encrypted-media';
    iframe.style.cssText = 'width: 1px; height: 1px; border: none;';

    playerContainer.appendChild(iframe);
    document.body.appendChild(playerContainer);

    // Wait for iframe to load and signal readiness
    iframe.onload = () => {
        setTimeout(() => {
            try {
                const iframeWindow = iframe.contentWindow;
                const player = iframeWindow.document.getElementById('movie_player');
                
                if (player && typeof player.getPlayerResponse === 'function') {
                    window.dispatchEvent(new CustomEvent('ynt-isolated-player-ready', {
                        detail: { success: true, message: 'Isolated player created successfully', playerId }
                    }));
                } else {
                    // Retry after additional delay for slower connections
                    setTimeout(() => {
                        const retryPlayer = iframeWindow.document.getElementById('movie_player');
                        if (retryPlayer && typeof retryPlayer.getPlayerResponse === 'function') {
                            window.dispatchEvent(new CustomEvent('ynt-isolated-player-ready', {
                                detail: { success: true, message: 'Isolated player created after retry', playerId }
                            }));
                        } else {
                            window.dispatchEvent(new CustomEvent('ynt-isolated-player-ready', {
                                detail: { success: false, message: 'Player not ready after retry', playerId }
                            }));
                        }
                    }, 2000);
                }
            } catch (error) {
                window.dispatchEvent(new CustomEvent('ynt-isolated-player-ready', {
                    detail: { success: false, message: error.message, playerId }
                }));
            }
        }, 1000);
    };

    iframe.onerror = () => {
        window.dispatchEvent(new CustomEvent('ynt-isolated-player-ready', {
            detail: { success: false, message: 'Failed to load iframe', playerId }
        }));
    };
})();