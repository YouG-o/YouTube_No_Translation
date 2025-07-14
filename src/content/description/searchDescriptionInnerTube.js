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
 * This script must be injected into the page context to access YouTube's internal variables,
 * such as window.yt.config_.INNERTUBE_CLIENT_VERSION, which are not accessible from content scripts.
 * The script fetches the video description using the InnerTube API and dispatches the result
 * via a CustomEvent ("ynt-search-description-inner-tube-data").
 */

(() => {
    const scriptTag = document.currentScript;
    const videoId = scriptTag?.getAttribute('data-video-id');

    if (!videoId) {
        window.dispatchEvent(new CustomEvent('ynt-search-description-inner-tube-data', {
            detail: { videoId: null, description: null, error: 'No videoId provided' }
        }));
        return;
    }

    // Try to get the client version from YouTube's config
    // eslint-disable-next-line no-undef
    const clientVersion = window.yt?.config_?.INNERTUBE_CLIENT_VERSION;
    if (!clientVersion) {
        window.dispatchEvent(new CustomEvent('ynt-search-description-inner-tube-data', {
            detail: { videoId, description: null, error: 'INNERTUBE_CLIENT_VERSION not found' }
        }));
        return;
    }

    fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            videoId,
            context: {
                client: {
                    clientName: 'WEB',
                    clientVersion
                }
            }
        })
    })
    .then(response => response.ok ? response.json() : null)
    .then(data => {
        const description = data?.videoDetails?.shortDescription || null;
        window.dispatchEvent(new CustomEvent('ynt-search-description-inner-tube-data', {
            detail: { videoId, description }
        }));
    })
    .catch(error => {
        window.dispatchEvent(new CustomEvent('ynt-search-description-inner-tube-data', {
            detail: { videoId, description: null, error: error?.message || String(error) }
        }));
    });
})();