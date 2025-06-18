/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

(() => {
    const videoId = document.currentScript?.getAttribute('data-video-id');
    const playerId = document.currentScript?.getAttribute('data-player-id') || 'ynt-player-titles';
    
    if (!videoId) {
        window.dispatchEvent(new CustomEvent('ynt-browsing-title-fallback-data', {
            detail: { videoId: null, title: null, error: 'No video ID provided' }
        }));
        return;
    }

    // Get the isolated player iframe with specific ID
    const playerIframe = document.getElementById(playerId);
    
    if (!playerIframe) {
        window.dispatchEvent(new CustomEvent('ynt-browsing-title-fallback-data', {
            detail: { videoId, title: null, error: `No isolated player iframe found: ${playerId}` }
        }));
        return;
    }

    // Access the actual YouTube player inside the iframe
    let player = null;
    try {
        const iframeWindow = playerIframe.contentWindow;
        if (iframeWindow && iframeWindow.document) {
            player = iframeWindow.document.getElementById('movie_player');
        }
    } catch (error) {
        window.dispatchEvent(new CustomEvent('ynt-browsing-title-fallback-data', {
            detail: { videoId, title: null, error: 'Cannot access player inside iframe: ' + error.message }
        }));
        return;
    }

    if (!player || typeof player.loadVideoById !== 'function') {
        window.dispatchEvent(new CustomEvent('ynt-browsing-title-fallback-data', {
            detail: { videoId, title: null, error: 'YouTube player not ready in iframe' }
        }));
        return;
    }

    let hasResolved = false;

    function checkTitleReady() {
        if (hasResolved) return false;
        
        try {
            const response = player.getPlayerResponse();
            if (response?.videoDetails?.videoId === videoId && response.videoDetails.title) {
                hasResolved = true;
                window.dispatchEvent(new CustomEvent('ynt-browsing-title-fallback-data', {
                    detail: { 
                        videoId,
                        title: response.videoDetails.title,
                        success: true
                    }
                }));
                return true;
            }
        } catch (e) {
            // Data not ready yet
        }
        return false;
    }

    const onLoadedMetadata = () => {
        setTimeout(checkTitleReady, 100);
    };

    const onCanPlay = () => {
        setTimeout(checkTitleReady, 100);
    };

    player.addEventListener('loadedmetadata', onLoadedMetadata);
    player.addEventListener('canplay', onCanPlay);

    const checkIntervals = [300, 600, 1000, 1500];
    checkIntervals.forEach(delayMs => {
        setTimeout(() => {
            if (checkTitleReady()) {
                player.removeEventListener('loadedmetadata', onLoadedMetadata);
                player.removeEventListener('canplay', onCanPlay);
            }
        }, delayMs);
    });

    setTimeout(() => {
        if (!hasResolved) {
            hasResolved = true;
            player.removeEventListener('loadedmetadata', onLoadedMetadata);
            player.removeEventListener('canplay', onCanPlay);
            
            window.dispatchEvent(new CustomEvent('ynt-browsing-title-fallback-data', {
                detail: { 
                    videoId,
                    title: null,
                    error: 'Timeout after 2s'
                }
            }));
        }
    }, 2000);

    try {
        player.mute();
        player.loadVideoById(videoId, 0, 'default');
    } catch (e) {
        hasResolved = true;
        player.removeEventListener('loadedmetadata', onLoadedMetadata);
        player.removeEventListener('canplay', onCanPlay);
        
        window.dispatchEvent(new CustomEvent('ynt-browsing-title-fallback-data', {
            detail: { 
                videoId,
                title: null,
                error: e.message
            }
        }));
    }
})();