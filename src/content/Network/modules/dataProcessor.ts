/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { extractTitles, replaceTitles } from './titlesProcessor';
import { extractDescriptions, replaceDescriptions } from './descriptionsProcessor';

/**
 * Central data processor that coordinates all feature modules
 * This function is called by the network interceptor to process YouTube API responses
 */

/**
 * Main data processing function
 * Processes YouTube API responses based on enabled features
 */
window.processYouTubeData = async function(originalData: any, cleanData: any): Promise<any> {
    const config = window._ynt_networkConfig;
    let modifiedData = originalData;

    // Process titles if enabled
    if (config.features.titles) {
        try {
            const extractedTitles = extractTitles(cleanData);
            if (extractedTitles.videoTitles.size > 0 || 
                extractedTitles.channelTitles.size > 0 || 
                extractedTitles.mainVideoTitle) {
                modifiedData = replaceTitles(modifiedData, extractedTitles);
            }
        } catch (error) {
            console.error('[YNT][Data Processor] Error processing titles:', error);
        }
    }

    // Process descriptions if enabled
    if (config.features.descriptions) {
        try {
            const extractedDescriptions = extractDescriptions(cleanData);
            if (extractedDescriptions.videoDescriptions.size > 0 || 
                extractedDescriptions.channelDescriptions.size > 0 || 
                extractedDescriptions.mainVideoDescription ||
                extractedDescriptions.channelLongDescription) {
                modifiedData = replaceDescriptions(modifiedData, extractedDescriptions);
            }
        } catch (error) {
            console.error('[YNT][Data Processor] Error processing descriptions:', error);
        }
    }

    return modifiedData;
};