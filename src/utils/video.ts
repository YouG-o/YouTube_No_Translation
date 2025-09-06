/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { browsingTitlesErrorLog } from './logger';


export function extractVideoIdFromUrl(videoUrl: string): string | null {
    try {
        const url = new URL(videoUrl);

        if (url.pathname.startsWith('/watch')) {
            // Classic video
            return new URLSearchParams(url.search).get('v');
        } else if (url.pathname.startsWith('/shorts/')) {
            // Short video - extract ID from path
            const pathParts = url.pathname.split('/');
            return pathParts.length > 2 ? pathParts[2] : null;
        }
        
        return null;
    } catch (urlError) {
        browsingTitlesErrorLog('Failed to parse video URL:', urlError);
        return null;
    }
}

/**
 * Detects if the current YouTube player is using the new Delhi UI
 * @returns true if the new player (Delhi UI) is detected, false otherwise
 */
export function isNewYouTubePlayer(): boolean {
    const player = getYouTubePlayer();
    return player?.classList.contains('ytp-delhi-modern') ?? false;
}

/**
 * Gets the appropriate YouTube player element based on current page context
 * @returns the player element or null if not found
 */
export function getYouTubePlayer(): HTMLElement | null {
    // Determine target player ID based on current URL
    let targetId = 'movie_player'; // Default for regular videos
    
    if (window.location.pathname.startsWith('/shorts')) {
        targetId = 'shorts-player'; // Player for shorts
    } else if (window.location.pathname.startsWith('/@')) {
        targetId = 'c4-player'; // Player for channels main video
    }
    
    return document.getElementById(targetId);
}