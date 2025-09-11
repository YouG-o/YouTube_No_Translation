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

let networkInterceptorState: 'inactive' | 'initializing' | 'active' = 'inactive';
let currentFeatures: NetworkInterceptorFeatures = { titles: false, descriptions: false };
let pendingFeatures: NetworkInterceptorFeatures | null = null;

/**
 * Initialize or update network interceptor with specific features
 */
export async function initializeNetworkInterceptor(features: NetworkInterceptorFeatures): Promise<void> {
    // If nothing changed and already active, do nothing
    const hasChanged = features.titles !== currentFeatures.titles || features.descriptions !== currentFeatures.descriptions;
    if (networkInterceptorState === 'active' && !hasChanged) return;

    // Update desired features
    currentFeatures = { ...features };

    // If we're already initializing, just store pending features and return
    if (networkInterceptorState === 'initializing') {
        pendingFeatures = { ...features };
        coreLog('Network interceptor already initializing - queued configuration update');
        return;
    }

    // If already active, just post the update
    if (networkInterceptorState === 'active') {
        updateNetworkInterceptorConfig(features);
        coreLog(`Network interceptor configuration updated: titles=${features.titles}, descriptions=${features.descriptions}`);
        return;
    }

    // Start initialization
    try {
        coreLog(`Initializing network interceptor: titles=${features.titles}, descriptions=${features.descriptions}`);
        networkInterceptorState = 'initializing';

        // Inject data processor first
        const dataProcessorScript = document.createElement('script');
        dataProcessorScript.src = browser.runtime.getURL('dist/content/scripts/dataProcessor.js');
        dataProcessorScript.onload = () => {
            // Then inject main interceptor
            const interceptorScript = document.createElement('script');
            interceptorScript.src = browser.runtime.getURL('dist/content/scripts/networkInterceptorScript.js');
            interceptorScript.onload = () => {
                // Apply current features and any pending update once
                updateNetworkInterceptorConfig(currentFeatures);
                if (pendingFeatures) {
                    updateNetworkInterceptorConfig(pendingFeatures);
                    pendingFeatures = null;
                }
                networkInterceptorState = 'active';
                coreLog('Network interceptor initialized successfully');
            };
            interceptorScript.onerror = () => {
                networkInterceptorState = 'inactive';
                coreErrorLog('Failed to load network interceptor script');
            };
            document.documentElement.appendChild(interceptorScript);
        };
        dataProcessorScript.onerror = () => {
            networkInterceptorState = 'inactive';
            coreErrorLog('Failed to load data processor script');
        };
        document.documentElement.appendChild(dataProcessorScript);

    } catch (error) {
        networkInterceptorState = 'inactive';
        coreErrorLog('Failed to initialize network interceptor:', error);
    }
}

/**
 * Update network interceptor configuration using postMessage
 */
function updateNetworkInterceptorConfig(features: NetworkInterceptorFeatures): void {
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
    return networkInterceptorState === 'active';
}

/**
 * Get current features configuration
 */
export function getCurrentFeatures(): NetworkInterceptorFeatures {
    return { ...currentFeatures };
}