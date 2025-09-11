/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import type { NetworkConfigUpdateMessage } from '../../types/types';

/**
 * YouTube Network Interceptor - Injectable Script
 * This script runs in the page context to intercept fetch requests
 */
(() => {
    const LOG_PREFIX = '[YNT]';
    const LOG_CONTEXT = '[Network Interceptor]';
    const LOG_COLOR = '#FF6B35';

    function log(message: string, ...args: any[]) {
        console.log(
            `%c${LOG_PREFIX}${LOG_CONTEXT} ${message}`,
            `color: ${LOG_COLOR}`,
            ...args
        );
    }

    function errorLog(message: string, ...args: any[]) {
        console.log(
            `%c${LOG_PREFIX}${LOG_CONTEXT} %c${message}`,
            `color: ${LOG_COLOR}`,
            `color: #F44336`,
            ...args
        );
    }

    // Default configuration
    window._ynt_networkConfig = {
        endpoints: [
            '/youtubei/v1/search',
            '/youtubei/v1/browse',
            '/youtubei/v1/next',
            //'/youtubei/v1/player'
        ],
        features: {
            titles: true,
            descriptions: false
        }
    };

    // Global storage for responses
    window._youtubeFinalResponses = window._youtubeFinalResponses || [];

    // Listen for configuration updates from content script
    window.addEventListener('message', (event: MessageEvent<NetworkConfigUpdateMessage>) => {
        if (event.source !== window) return;
        
        if (event.data.type === 'YNT_UPDATE_CONFIG' && event.data.features) {
            window._ynt_networkConfig.features = event.data.features;
            log('Configuration updated:', window._ynt_networkConfig.features);
        }
    });

    const originalFetch = window.fetch;
    let isProcessingCleanRequest = false;

    /**
     * Main fetch interceptor
     */
    window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
        let url: string;
        if (typeof input === 'string') url = input;
        else if (input instanceof URL) url = input.toString();
        else if (input instanceof Request) url = input.url;
        else url = String(input);

        // Prevent infinite recursion during clean requests
        if (isProcessingCleanRequest) {
            return originalFetch(input, init);
        }

        // Check if this URL should be intercepted
        const shouldIntercept = window._ynt_networkConfig.endpoints.some(endpoint => 
            url.includes(endpoint)
        );

        if (!shouldIntercept) {
            return originalFetch(input, init);
        }

        log(`Intercepting request to: ${url}`);

        // Extract request body for clean request
        let bodyPromise: Promise<string | null> = Promise.resolve(null);
        if (init && init.body && typeof init.body === 'string') {
            bodyPromise = Promise.resolve(init.body);
        } else if (input instanceof Request && input.body) {
            bodyPromise = input.clone().text().catch(() => null);
        }

        const originalRequest = originalFetch(input, init);

        return originalRequest.then(async originalResponse => {
            try {
                const originalData = await originalResponse.clone().json();
                const originalBody = await bodyPromise;

                if (!originalBody) {
                    return originalResponse;
                }

                // Create clean request with hl=lo
                const bodyObj = JSON.parse(originalBody);
                if (bodyObj.context && bodyObj.context.client) {
                    bodyObj.context.client.hl = "lo";
                }

                // Make clean request
                isProcessingCleanRequest = true;
                const cleanResponse = await originalFetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(bodyObj)
                });
                isProcessingCleanRequest = false;

                if (!cleanResponse.ok) {
                    log(`Clean request failed: ${cleanResponse.status}`);
                    return originalResponse;
                }

                const cleanData = await cleanResponse.json();
                
                // Process data with enabled features
                const modifiedData = await window.processYouTubeData(originalData, cleanData);

                if (modifiedData !== originalData) {
                    log(`Data modified, returning custom response`);
                    
                    // Store response for debugging
                    window._youtubeFinalResponses.push({
                        url: url,
                        json: modifiedData
                    });

                    return new Response(JSON.stringify(modifiedData), {
                        status: originalResponse.status,
                        statusText: originalResponse.statusText,
                        headers: originalResponse.headers
                    });
                }

                return originalResponse;

            } catch (error) {
                isProcessingCleanRequest = false;
                errorLog('Error processing request:', error);
                return originalResponse;
            }
        });
    };

    log('Network interceptor initialized');
})();