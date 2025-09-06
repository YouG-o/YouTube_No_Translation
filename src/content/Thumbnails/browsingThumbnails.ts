/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { browsingThumbnailsErrorLog, browsingThumbnailsLog } from '../../utils/logger';

/**
 * Restores original thumbnail for a video by removing translation markers
 * @param videoId - The YouTube video ID
 * @param titleElement - The title element to find the associated thumbnail
 */
export function restoreOriginalThumbnail(videoId: string, titleElement: HTMLElement): void {
    try {
        // Find the closest parent that contains both the title and thumbnail
        const commonParent = titleElement.closest('ytd-rich-grid-media, ytd-video-renderer, ytd-compact-video-renderer, ytd-rich-item-renderer, ytd-grid-video-renderer, .yt-lockup-view-model');
        
        if (!commonParent) {
            return;
        }

        // Find thumbnail image using the universal YouTube thumbnail class within the common parent
        const thumbnailImg = commonParent.querySelector('img.ytCoreImageHost[src*="vi_lc"]') as HTMLImageElement;
        
        if (!thumbnailImg || !thumbnailImg.src) {
            return;
        }

        const currentSrc = thumbnailImg.src;
        
        // Create original thumbnail URL
        // Replace 'vi_lc' with 'vi' and remove language code pattern
        let originalSrc = currentSrc.replace('vi_lc', 'vi');
        
        // Remove language code pattern (e.g., '_fr', '_es', '_de', etc.)
        // Pattern matches underscore followed by 2-3 letter language code before file extension
        originalSrc = originalSrc.replace(/_[a-z]{2,3}(?=\.jpg)/i, '');
        
        // Update the thumbnail source
        thumbnailImg.src = originalSrc;
        
        browsingThumbnailsLog(
            `Updated thumbnail from translated to original for video %c${videoId}%c`,
            'color: #4ade80',
            'color: #fca5a5'
        );
        
    } catch (error) {
        browsingThumbnailsErrorLog(`Failed to restore original thumbnail for ${videoId}:`, error);
    }
}

/**
 * Checks if a thumbnail URL is translated
 * @param thumbnailUrl - The thumbnail URL to check
 * @returns true if the thumbnail appears to be translated
 */
export function isThumbnailTranslated(thumbnailUrl: string): boolean {
    return thumbnailUrl.includes('vi_lc') && /_[a-z]{2,3}\.jpg/i.test(thumbnailUrl);
}