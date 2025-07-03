/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */


/**
 * Create isolated player by injecting script in page context with custom ID
 */
export function createIsolatedPlayer(playerId: string = 'ynt-player'): Promise<boolean> {
    return new Promise((resolve) => {
        const containerSelector = `${playerId}-container`;
        
        // Check if already exists
        if (document.getElementById(containerSelector)) {
            resolve(true);
            return;
        }

        const onPlayerReady = (event: Event) => {
            const customEvent = event as CustomEvent;
            if (customEvent.detail.playerId === playerId) {
                window.removeEventListener('ynt-isolated-player-ready', onPlayerReady as EventListener);
                resolve(customEvent.detail.success);
            }
        };

        window.addEventListener('ynt-isolated-player-ready', onPlayerReady as EventListener);

        // Inject script to create player in page context
        const script = document.createElement('script');
        script.src = browser.runtime.getURL('dist/content/scripts/createIsolatedPlayerScript.js');
        script.setAttribute('data-player-id', playerId);
        document.documentElement.appendChild(script);
        
        setTimeout(() => {
            script.remove();
        }, 100);

        // Timeout
        setTimeout(() => {
            window.removeEventListener('ynt-isolated-player-ready', onPlayerReady as EventListener);
            resolve(false);
        }, 5000);
    });
}

/**
 * Ensure isolated player exists for specific use case
 */
export async function ensureIsolatedPlayer(playerId: string = 'ynt-player'): Promise<boolean> {
    const containerSelector = `${playerId}-container`;
    if (document.getElementById(containerSelector)) {
        return true;
    }
    
    return await createIsolatedPlayer(playerId);
}

/**
 * Cleanup isolated player when no longer needed
 */
export function cleanupIsolatedPlayer(playerId: string = 'ynt-player'): void {
    const container = document.getElementById(`${playerId}-container`);
    if (container) {
        container.remove();
    }
}