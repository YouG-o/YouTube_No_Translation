/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { channelNameLog, channelNameErrorLog } from '../loggings';
import { normalizeText } from '../utils/text';


let channelNameContentObserver: MutationObserver | null = null;

export function cleanupChannelNameContentObserver(): void {
    if (channelNameContentObserver) {
        channelNameContentObserver.disconnect();
        channelNameContentObserver = null;
    }
}

function updateChannelNameElement(element: HTMLElement, originalName: string): void {
    cleanupChannelNameContentObserver(); // Clean up any existing observer
    
    // Get the anchor element
    const anchorElement = element.querySelector('a');
    if (!anchorElement) {
        channelNameErrorLog('No anchor element found in channel name');
        return;
    }
    
    // Current displayed name
    const currentName = normalizeText(element.textContent);
    
    // Update both the title attribute and the text content
    element.setAttribute('title', originalName);
    anchorElement.textContent = originalName;
    
    channelNameLog(
        `Updated channel name from: %c${currentName}%c to: %c${originalName}%c`,
        'color: white',
        'color: #06b6d4',
        'color: white',
        'color: #06b6d4'
    );
    
    // Setup observer to prevent YouTube from changing it back
    channelNameContentObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' || 
                (mutation.type === 'attributes' && mutation.attributeName === 'title')) {
                
                // Current text after potential YouTube change
                const currentText = normalizeText(element.textContent);
                
                // If YouTube changed it back, reapply our original
                if (currentText !== normalizeText(originalName) || 
                    element.getAttribute('title') !== originalName) {
                    
                    channelNameLog('YouTube changed channel name, reverting to original');
                    element.setAttribute('title', originalName);
                    anchorElement.textContent = originalName;
                }
            }
        });
    });
    
    // Watch for changes to the element
    channelNameContentObserver.observe(element, {
        childList: true,
        attributes: true,
        attributeFilter: ['title'],
        subtree: true
    });
}

export async function refreshChannelName(): Promise<void> {
    // Find the channel name element
    const channelNameElement = document.querySelector('ytd-watch-metadata ytd-video-owner-renderer ytd-channel-name yt-formatted-string#text') as HTMLElement;
    
    if (!channelNameElement) {
        //channelNameLog('Channel name element not found');
        return;
    }
    
    // Get video ID from URL
    const videoId = new URLSearchParams(window.location.search).get('v');
    if (!videoId) {
        //channelNameLog('No video ID found in URL');
        return;
    }
    
    //channelNameLog('Processing channel name element');
    
    try {
        // Create and inject script
        const channelNameScript = document.createElement('script');
        channelNameScript.type = 'text/javascript';
        channelNameScript.src = browser.runtime.getURL('dist/content/scripts/channelNameScript.js');
        
        // Set up event listener before injecting script
        const originalChannelName = await new Promise<string | null>((resolve) => {
            const channelListener = (event: CustomEvent<{ channelName: string | null }>) => {
                window.removeEventListener('ynt-channel-data', channelListener as EventListener);
                resolve(event.detail.channelName);
            };
            
            window.addEventListener('ynt-channel-data', channelListener as EventListener);
            
            // Inject script after listener is ready
            document.head.appendChild(channelNameScript);
        });
        
        if (!originalChannelName) {
            channelNameLog('Failed to get original channel name from player');
            return;
        }
        
        const normalizedCurrentName = normalizeText(channelNameElement.textContent);
        const normalizedOriginalName = normalizeText(originalChannelName);

        if (normalizedCurrentName === normalizedOriginalName) {
            channelNameLog('Channel name is already original');
            return;
        }
        
        // Update channel name element
        updateChannelNameElement(channelNameElement, originalChannelName);
        
    } catch (error) {
        channelNameErrorLog(`Failed to update channel name:`, error);
    }
}