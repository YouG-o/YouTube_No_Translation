/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */


// Observer and refresh logic for notification popup titles

let notificationMutationObserver: MutationObserver | null = null;

function setupNotificationTitlesObserver(): void {
    // Clean up any existing observer
    cleanupNotificationTitlesObserver();

    // Wait for the notification popup to appear in the DOM
    const dropdown = document.querySelector('tp-yt-iron-dropdown[vertical-align="top"]');
    if (!dropdown) return;

    // Initial refresh when popup opens
    refreshNotificationTitles();

    // Observe mutations inside the popup (new notifications loaded on scroll)
    const contentWrapper = dropdown.querySelector('#contentWrapper');
    if (!contentWrapper) return;

    notificationMutationObserver = new MutationObserver(() => {
        refreshNotificationTitles();
    });

    notificationMutationObserver.observe(contentWrapper, {
        childList: true,
        subtree: true
    });
}

function cleanupNotificationTitlesObserver(): void {
    if (notificationMutationObserver) {
        notificationMutationObserver.disconnect();
        notificationMutationObserver = null;
    }
}

async function refreshNotificationTitles(): Promise<void> {
    // Select all notification title elements
    const notificationTitleElements = document.querySelectorAll('.ytd-notification-renderer .message') as NodeListOf<HTMLElement>;
    for (const titleElement of notificationTitleElements) {
        const anchor = titleElement.closest('a');
        if (!anchor) continue;
        const href = anchor.getAttribute('href');
        if (!href) continue;
        let videoId: string | null = null;
        try {
            const url = new URL(href, window.location.origin);
            if (url.pathname.startsWith('/watch')) {
                videoId = new URLSearchParams(url.search).get('v');
            }
        } catch {
            // Fallback: extract v= manually
            const match = href.match(/[?&]v=([^&]+)/);
            if (match) videoId = match[1];
        }
        if (!videoId) continue;

        // Try oEmbed API first
        const apiUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}`;
        let originalTitle = await titleCache.getOriginalTitle(apiUrl);
        let currentTitle = titleElement.textContent;
        
        // Fallback if needed
        if (!originalTitle && currentSettings?.titlesFallbackApi) {
            const fallbackTitle = await getBrowsingTitleFallback(videoId);
            if (fallbackTitle) originalTitle = fallbackTitle;
            await new Promise(resolve => setTimeout(resolve, 600));
        }

        if (originalTitle && !normalizeText(currentTitle).includes(normalizeText(originalTitle))) {
            titleElement.textContent = originalTitle;
            titlesLog(
                `Updated pop-up title from : %c${normalizeText(currentTitle)}%c to : %c${normalizeText(originalTitle)}%c (video id : %c${videoId}%c)`,
                'color: grey',
                'color: #fca5a5',
                'color: white',
                'color: #fca5a5',
                'color: #4ade80',
                'color: #fca5a5'
            );
        }
    }
}