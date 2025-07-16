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
    // Extract handle from URL
    const match = location.href.match(/\/@([^\/?#]+)/);
    if (!match) {
        window.dispatchEvent(new CustomEvent('ynt-get-channel-id-inner-tube', {
            detail: { channelId: null, error: 'No handle found in URL' }
        }));
        return;
    }
    const handle = '@' + match[1];

    // Get client version from YouTube config
    const clientVersion = window?.yt?.config_?.INNERTUBE_CLIENT_VERSION || '2.20250527.00.00';

    fetch('https://www.youtube.com/youtubei/v1/search?prettyPrint=false', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            context: { client: { clientName: 'WEB', clientVersion } },
            query: handle,
            params: 'EgIQAg=='
        })
    })
    .then(res => res.ok ? res.json() : null)
    .then(data => {
        const items = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
        const firstChannel = items?.flatMap(c => c.itemSectionRenderer?.contents || [])
            .find(el => el.channelRenderer);
        const channelId = firstChannel?.channelRenderer?.channelId || null;

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