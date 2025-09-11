/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import type { TitleExtractionResult } from '../../../types/types';

/**
 * Extract original titles from clean YouTube API response
 */
export function extractTitles(data: any): TitleExtractionResult {
    const videoTitles = new Map<string, string>();
    const channelTitles = new Map<string, string>();
    let mainVideoTitle: string | undefined;

    // Extract main video title
    try {
        const mainContents = data?.contents?.twoColumnWatchNextResults?.results?.results?.contents;
        if (Array.isArray(mainContents)) {
            const primary = mainContents.find(x => x.videoPrimaryInfoRenderer)?.videoPrimaryInfoRenderer;
            if (primary?.title?.runs?.[0]?.text) {
                mainVideoTitle = primary.title.runs[0].text;
            }
        }
    } catch (e) {
        // Ignore extraction errors
    }

    // Walk through data structure to find video and channel titles
    function walkForTitles(obj: any): void {
        if (!obj || typeof obj !== 'object') return;

        // Extract video titles (videoId)
        if (obj.videoId && obj.title) {
            let title: string | undefined;
            if (obj.title.runs?.[0]?.text) {
                title = obj.title.runs[0].text;
            } else if (obj.title.simpleText) {
                title = obj.title.simpleText;
            }
            
            if (title) {
                videoTitles.set(obj.videoId, title);
            }
        }

        // Extract channel titles (channelRenderer with channelId)
        if (obj.channelId && obj.title?.simpleText) {
            channelTitles.set(obj.channelId, obj.title.simpleText);
        }

        // Extract page header titles (channel pages - pageHeaderRenderer)
        if (obj.pageHeaderRenderer?.content?.pageHeaderViewModel) {
            const header = obj.pageHeaderRenderer.content.pageHeaderViewModel;
            const headerTitle = header.title?.dynamicTextViewModel?.text?.content;
            if (headerTitle) {
                const headerKey = header.pageTitle || 
                                obj.metadata?.channelMetadataRenderer?.externalId || 
                                "headerChannel";
                channelTitles.set(headerKey, headerTitle);
            }
        }

        // Recursively process nested objects
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                walkForTitles(obj[key]);
            }
        }
    }

    walkForTitles(data);

    return {
        videoTitles,
        channelTitles,
        mainVideoTitle
    };
}

/**
 * Replace titles in original data with clean titles
 */
export function replaceTitles(originalData: any, extractedTitles: TitleExtractionResult): any {
    let replacedCount = 0;
    const dataCopy = JSON.parse(JSON.stringify(originalData));

    function walkAndReplaceTitles(obj: any): any {
        if (!obj || typeof obj !== 'object') return obj;

        // Replace main video title (videoPrimaryInfoRenderer)
        if (extractedTitles.mainVideoTitle && obj.videoPrimaryInfoRenderer?.title?.runs?.[0]) {
            const originalTitle = obj.videoPrimaryInfoRenderer.title.runs[0].text;
            if (originalTitle !== extractedTitles.mainVideoTitle) {
                obj.videoPrimaryInfoRenderer.title.runs[0].text = extractedTitles.mainVideoTitle;
                replacedCount++;
            }
        }

        // Replace video titles (objects with videoId)
        if (obj.videoId && extractedTitles.videoTitles.has(obj.videoId)) {
            const cleanTitle = extractedTitles.videoTitles.get(obj.videoId)!;
            
            // Replace title.runs[0].text format
            if (obj.title?.runs?.[0]?.text) {
                const originalTitle = obj.title.runs[0].text;
                if (originalTitle !== cleanTitle) {
                    obj.title.runs[0].text = cleanTitle;
                    replacedCount++;
                }
            }
            
            // Replace title.simpleText format
            if (obj.title?.simpleText) {
                const originalTitle = obj.title.simpleText;
                if (originalTitle !== cleanTitle) {
                    obj.title.simpleText = cleanTitle;
                    replacedCount++;
                }
            }
        }

        // Replace channel titles (channelRenderer with channelId)
        if (obj.channelId && extractedTitles.channelTitles.has(obj.channelId)) {
            const cleanTitle = extractedTitles.channelTitles.get(obj.channelId)!;
            if (obj.title?.simpleText) {
                const originalTitle = obj.title.simpleText;
                if (originalTitle !== cleanTitle) {
                    obj.title.simpleText = cleanTitle;
                    replacedCount++;
                }
            }
        }

        // Replace page header titles (pageHeaderRenderer)
        if (obj.pageHeaderRenderer?.content?.pageHeaderViewModel) {
            const header = obj.pageHeaderRenderer.content.pageHeaderViewModel;
            const headerKey = header.pageTitle || 
                            obj.metadata?.channelMetadataRenderer?.externalId || 
                            "headerChannel";
            
            if (extractedTitles.channelTitles.has(headerKey)) {
                const cleanTitle = extractedTitles.channelTitles.get(headerKey)!;
                if (header.title?.dynamicTextViewModel?.text?.content) {
                    const originalTitle = header.title.dynamicTextViewModel.text.content;
                    if (originalTitle !== cleanTitle) {
                        header.title.dynamicTextViewModel.text.content = cleanTitle;
                        replacedCount++;
                    }
                }
            }
        }

        // Recursively process nested objects
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                obj[key] = walkAndReplaceTitles(obj[key]);
            }
        }

        return obj;
    }

    walkAndReplaceTitles(dataCopy);
    
    if (replacedCount > 0) {
        console.log(`[YNT][Titles Processor] Replaced ${replacedCount} titles`);
    }

    return dataCopy;
}