/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { coreLog, coreErrorLog } from '../../utils/logger';
import type { NetworkInterceptorFeatures, NetworkConfigUpdateMessage } from '../../types/types';

let networkInterceptorActive = false;
let currentFeatures: NetworkInterceptorFeatures = { titles: false, descriptions: false };

/**
 * Initialize or update network interceptor with specific features
 */
export async function initializeNetworkInterceptor(features: NetworkInterceptorFeatures): Promise<void> {
    // Check if configuration has actually changed
    const hasChanged = features.titles !== currentFeatures.titles || 
                      features.descriptions !== currentFeatures.descriptions;

    // If interceptor is already active and config hasn't changed, do nothing
    if (networkInterceptorActive && !hasChanged) {
        return;
    }

    // Update current features
    currentFeatures = { ...features };

    // If interceptor is already active, just update configuration
    if (networkInterceptorActive) {
        updateNetworkInterceptorConfig(features);
        coreLog(`Network interceptor configuration updated: titles=${features.titles}, descriptions=${features.descriptions}`);
        return;
    }

    // Initialize interceptor for the first time
    try {
        coreLog(`Initializing network interceptor: titles=${features.titles}, descriptions=${features.descriptions}`);

        // Inject data processor first
        const dataProcessorScript = document.createElement('script');
        dataProcessorScript.src = browser.runtime.getURL('dist/content/scripts/dataProcessor.js');
        dataProcessorScript.onload = () => {
            // Then inject main interceptor
            const interceptorScript = document.createElement('script');
            interceptorScript.src = browser.runtime.getURL('dist/content/scripts/networkInterceptorScript.js');
            interceptorScript.onload = () => {
                updateNetworkInterceptorConfig(features);
                networkInterceptorActive = true;
                coreLog('Network interceptor initialized successfully');
            };
            interceptorScript.onerror = () => {
                coreErrorLog('Failed to load network interceptor script');
            };
            document.documentElement.appendChild(interceptorScript);
        };
        dataProcessorScript.onerror = () => {
            coreErrorLog('Failed to load data processor script');
        };
        document.documentElement.appendChild(dataProcessorScript);

    } catch (error) {
        coreErrorLog('Failed to initialize network interceptor:', error);
    }
}

/**
 * Update network interceptor configuration using postMessage
 */
function updateNetworkInterceptorConfig(features: NetworkInterceptorFeatures): void {
    // Use postMessage to communicate with page context (CSP-safe)
    const message: NetworkConfigUpdateMessage = {
        type: 'YNT_UPDATE_CONFIG',
        features: features
    };
    
    window.postMessage(message, '*');
}

/**
 * Check if network interceptor is active
 */
export function isNetworkInterceptorActive(): boolean {
    return networkInterceptorActive;
}

/**
 * Get current features configuration
 */
export function getCurrentFeatures(): NetworkInterceptorFeatures {
    return { ...currentFeatures };
}