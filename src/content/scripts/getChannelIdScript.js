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
 * The script fetches the channelId (UCID) using the InnerTube API and dispatches the result
 * via a CustomEvent ("ynt-get-channel-id-inner-tube").
 */

(() => {
    // Get handle from script attribute
    const scriptTag = document.currentScript;
    const handle = scriptTag && scriptTag.getAttribute('data-channel-handle');
    if (!handle) {
        window.dispatchEvent(new CustomEvent('ynt-get-channel-id-inner-tube', {
            detail: { channelId: null, error: 'No channel handle provided' }
        }));
        return;
    }

    // Get client version from YouTube config
    const clientVersion = window?.yt?.config_?.INNERTUBE_CLIENT_VERSION || '2.20250527.00.00';

    fetch('https://www.youtube.com/youtubei/v1/search?prettyPrint=false', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            context: { client: { clientName: 'WEB', clientVersion } },
            query: '@' + handle,
            /**
             * 'params' is a base64-encoded protobuf filter.
             * 'EgIQAg==' means "filter=channels" (only return channels in search results).
             */
            params: 'EgIQAg=='
        })
    })
    .then(res => res.ok ? res.json() : null)
    .then(data => {
        const items = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
        const channels = items?.flatMap(c => c.itemSectionRenderer?.contents || [])
            .filter(el => el.channelRenderer)
            .map(el => el.channelRenderer) || [];

        // Try to find an exact handle match (case-insensitive, with or without @)
        const normalizedHandle = handle.replace(/^@/, '').toLowerCase();
        const exactMatch = channels.find(ch => {
            const url = ch.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl || '';
            return url.toLowerCase() === `/@${normalizedHandle}`;
        });

        const channelId = exactMatch?.channelId || channels[0]?.channelId || null;

        window.dispatchEvent(new CustomEvent('ynt-get-channel-id-inner-tube', {
            detail: { channelId }
        }));
    })
    .catch(error => {
        window.dispatchEvent(new CustomEvent('ynt-get-channel-id-inner-tube', {
            detail: { channelId: null, error: error?.message || String(error) }
        }));
    });
})();