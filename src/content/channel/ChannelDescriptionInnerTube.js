/* 
* Copyright (C) 2025-present YouGo (https://github.com/youg-o)
* This program is licensed under the GNU Affero General Public License v3.0.
* You may redistribute it and/or modify it under the terms of the license.
* 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
*/

/**
 * This script must be injected into the page context to access YouTube's internal variables,
 * such as window.yt.config_.INNERTUBE_CLIENT_VERSION, which are not accessible from content scripts.
 * The script fetches the original channel description using the InnerTube API and dispatches the result
 * via a CustomEvent ("ynt-get-channel-description-inner-tube").
 */
(function () {
    var scriptTag = document.currentScript;
    var channelId = scriptTag && scriptTag.getAttribute('data-channel-id');

    if (!channelId) {
        window.dispatchEvent(new CustomEvent('ynt-get-channel-description-inner-tube', {
            detail: { channelDescription: null, error: 'No channelId provided' }
        }));
        return;
    }

    function getInnerTubeClientVersion() {
        return window.yt && window.yt.config_ && window.yt.config_.INNERTUBE_CLIENT_VERSION || null;
    }

    var clientVersion = getInnerTubeClientVersion();
    if (!clientVersion) {
        window.dispatchEvent(new CustomEvent('ynt-get-channel-description-inner-tube', {
            detail: { channelDescription: null, error: 'Could not retrieve InnerTube client version.' }
        }));
        return;
    }

    var body = {
        context: {
            client: {
                clientName: "WEB",
                clientVersion: clientVersion
            }
        },
        browseId: channelId
    };

    fetch("https://www.youtube.com/youtubei/v1/browse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    })
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (json) {
        var channelDescription = json && json.metadata && json.metadata.channelMetadataRenderer && json.metadata.channelMetadataRenderer.description || null;
        window.dispatchEvent(new CustomEvent('ynt-get-channel-description-inner-tube', {
            detail: { channelDescription: channelDescription }
        }));
    })
    .catch(function (error) {
        window.dispatchEvent(new CustomEvent('ynt-get-channel-description-inner-tube', {
            detail: { channelDescription: null, error: error && error.message || String(error) }
        }));
    });
})();