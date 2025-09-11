/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import type { DescriptionExtractionResult } from '../../../types/types';

/**
 * Deep path used for long channel description extraction and replacement
 */
const LONG_DESC_PATH: Array<string | number> = [
    "onResponseReceivedEndpoints", 0, "appendContinuationItemsAction", 
    "continuationItems", 0, "aboutChannelRenderer", "metadata", 
    "aboutChannelViewModel", "description"
];

/**
 * Get value at nested path safely
 */
function getValueByPath(obj: any, pathArr: Array<string | number>): any {
    let ref = obj;
    for (let k of pathArr) {
        if (typeof k === "number") {
            if (!Array.isArray(ref) || ref.length <= k) return undefined;
            ref = ref[k];
        } else {
            if (!ref || !(k in ref)) return undefined;
            ref = ref[k];
        }
    }
    return ref;
}

/**
 * Set value at nested path safely
 */
function setValueByPath(obj: any, pathArr: Array<string | number>, value: any): boolean {
    let ref = obj;
    for (let i = 0; i < pathArr.length - 1; i++) {
        const k = pathArr[i];
        if (typeof k === "number") {
            if (!Array.isArray(ref)) return false;
            ref = ref[k];
        } else {
            if (!ref || !(k in ref)) return false;
            ref = ref[k];
        }
    }
    const lastKey = pathArr[pathArr.length - 1];
    if (typeof lastKey === "number") {
        if (!Array.isArray(ref) || ref.length <= lastKey) return false;
        ref[lastKey] = value;
        return true;
    } else {
        if (!ref || !(lastKey in ref)) return false;
        ref[lastKey] = value;
        return true;
    }
}

/**
 * Extract original descriptions from clean YouTube API response
 */
export function extractDescriptions(data: any): DescriptionExtractionResult {
    const videoDescriptions = new Map<string, string>();
    const channelDescriptions = new Map<string, string>();
    let mainVideoDescription: string | undefined;
    let channelLongDescription: string | undefined;

    // Extract main video description
    try {
        const mainContents = data?.contents?.twoColumnWatchNextResults?.results?.results?.contents;
        if (Array.isArray(mainContents)) {
            const secondary = mainContents.find(x => x.videoSecondaryInfoRenderer)?.videoSecondaryInfoRenderer;
            if (secondary?.attributedDescription?.content) {
                mainVideoDescription = secondary.attributedDescription.content;
            }
        }
    } catch (e) {
        // Ignore extraction errors
    }

    // Extract long channel description from deep path
    try {
        const longDesc = getValueByPath(data, LONG_DESC_PATH);
        if (typeof longDesc === 'string' && longDesc.length > 0) {
            channelLongDescription = longDesc;
        }
    } catch (e) {
        // Ignore extraction errors
    }

    // Walk through data structure to find video and channel descriptions
    function walkForDescriptions(obj: any): void {
        if (!obj || typeof obj !== 'object') return;

        // Extract video descriptions (videoId)
        if (obj.videoId) {
            let description: string | undefined;
            
            if (obj.descriptionSnippet?.runs?.[0]) {
                description = obj.descriptionSnippet.runs.map((run: any) => run.text).join('');
            } else if (obj.detailedMetadataSnippets?.[0]?.snippetText?.runs) {
                description = obj.detailedMetadataSnippets[0].snippetText.runs.map((run: any) => run.text).join('');
            } else if (obj.snippetText?.runs) {
                description = obj.snippetText.runs.map((run: any) => run.text).join('');
            } else if (obj.shortDescription) {
                description = obj.shortDescription;
            } else if (obj.description?.runs) {
                description = obj.description.runs.map((run: any) => run.text).join('');
            }
            
            if (description) {
                videoDescriptions.set(obj.videoId, description);
            }
        }

        // Extract channel descriptions (channelRenderer with channelId)
        if (obj.channelId && obj.descriptionSnippet?.runs?.[0]) {
            const channelDesc = obj.descriptionSnippet.runs.map((run: any) => run.text).join('');
            if (channelDesc) {
                channelDescriptions.set(obj.channelId, channelDesc);
            }
        }

        // Extract page header descriptions (channel pages - pageHeaderRenderer)
        if (obj.pageHeaderRenderer?.content?.pageHeaderViewModel) {
            const header = obj.pageHeaderRenderer.content.pageHeaderViewModel;
            const headerDesc = header.description?.descriptionPreviewViewModel?.description?.content;
            if (headerDesc) {
                const headerKey = header.pageTitle || 
                                obj.metadata?.channelMetadataRenderer?.externalId || 
                                "headerChannel";
                channelDescriptions.set(headerKey, headerDesc);
            }
        }

        // Recursively process nested objects
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                walkForDescriptions(obj[key]);
            }
        }
    }

    walkForDescriptions(data);

    return {
        videoDescriptions,
        channelDescriptions,
        mainVideoDescription,
        channelLongDescription
    };
}

/**
 * Replace descriptions in original data with clean descriptions
 */
export function replaceDescriptions(originalData: any, extractedDescriptions: DescriptionExtractionResult): any {
    let replacedCount = 0;
    let replacedLongDesc = 0;
    const dataCopy = JSON.parse(JSON.stringify(originalData));

    function walkAndReplaceDescriptions(obj: any): any {
        if (!obj || typeof obj !== 'object') return obj;

        // Replace main video description (videoSecondaryInfoRenderer)
        if (extractedDescriptions.mainVideoDescription && obj.videoSecondaryInfoRenderer?.attributedDescription?.content) {
            const originalDesc = obj.videoSecondaryInfoRenderer.attributedDescription.content;
            if (originalDesc !== extractedDescriptions.mainVideoDescription) {
                obj.videoSecondaryInfoRenderer.attributedDescription.content = extractedDescriptions.mainVideoDescription;
                replacedCount++;
            }
        }

        // Replace video descriptions (objects with videoId)
        if (obj.videoId && extractedDescriptions.videoDescriptions.has(obj.videoId)) {
            const cleanDesc = extractedDescriptions.videoDescriptions.get(obj.videoId)!;
            
            // Replace descriptionSnippet.runs format
            if (obj.descriptionSnippet?.runs) {
                const originalDesc = obj.descriptionSnippet.runs.map((run: any) => run.text).join('');
                if (originalDesc !== cleanDesc) {
                    obj.descriptionSnippet.runs = [{ text: cleanDesc }];
                    replacedCount++;
                }
            }
            
            // Replace detailedMetadataSnippets format
            if (obj.detailedMetadataSnippets?.[0]?.snippetText?.runs) {
                const originalDesc = obj.detailedMetadataSnippets[0].snippetText.runs.map((run: any) => run.text).join('');
                if (originalDesc !== cleanDesc) {
                    obj.detailedMetadataSnippets[0].snippetText.runs = [{ text: cleanDesc }];
                    replacedCount++;
                }
            }
            
            // Replace snippetText.runs format
            if (obj.snippetText?.runs) {
                const originalDesc = obj.snippetText.runs.map((run: any) => run.text).join('');
                if (originalDesc !== cleanDesc) {
                    obj.snippetText.runs = [{ text: cleanDesc }];
                    replacedCount++;
                }
            }
            
            // Replace shortDescription format
            if (obj.shortDescription) {
                const originalDesc = obj.shortDescription;
                if (originalDesc !== cleanDesc) {
                    obj.shortDescription = cleanDesc;
                    replacedCount++;
                }
            }
            
            // Replace description.runs format
            if (obj.description?.runs) {
                const originalDesc = obj.description.runs.map((run: any) => run.text).join('');
                if (originalDesc !== cleanDesc) {
                    obj.description.runs = [{ text: cleanDesc }];
                    replacedCount++;
                }
            }
        }

        // Replace channel descriptions (channelRenderer with channelId)
        if (obj.channelId && extractedDescriptions.channelDescriptions.has(obj.channelId)) {
            const cleanDesc = extractedDescriptions.channelDescriptions.get(obj.channelId)!;
            if (obj.descriptionSnippet?.runs) {
                const originalDesc = obj.descriptionSnippet.runs.map((run: any) => run.text).join('');
                if (originalDesc !== cleanDesc) {
                    obj.descriptionSnippet.runs = [{ text: cleanDesc }];
                    replacedCount++;
                }
            }
        }

        // Replace page header descriptions (pageHeaderRenderer)
        if (obj.pageHeaderRenderer?.content?.pageHeaderViewModel) {
            const header = obj.pageHeaderRenderer.content.pageHeaderViewModel;
            const headerKey = header.pageTitle || 
                            obj.metadata?.channelMetadataRenderer?.externalId || 
                            "headerChannel";
            
            if (extractedDescriptions.channelDescriptions.has(headerKey)) {
                const cleanDesc = extractedDescriptions.channelDescriptions.get(headerKey)!;
                if (header.description?.descriptionPreviewViewModel?.description?.content) {
                    const originalDesc = header.description.descriptionPreviewViewModel.description.content;
                    if (originalDesc !== cleanDesc) {
                        header.description.descriptionPreviewViewModel.description.content = cleanDesc;
                        replacedCount++;
                    }
                }
            }
        }

        // Recursively process nested objects
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                obj[key] = walkAndReplaceDescriptions(obj[key]);
            }
        }

        return obj;
    }

    walkAndReplaceDescriptions(dataCopy);

    // Explicit replacement of long channel description
    if (typeof extractedDescriptions.channelLongDescription === "string") {
        const oldLongDesc = getValueByPath(dataCopy, LONG_DESC_PATH);
        if (oldLongDesc !== extractedDescriptions.channelLongDescription) {
            setValueByPath(dataCopy, LONG_DESC_PATH, extractedDescriptions.channelLongDescription);
            replacedLongDesc++;
        }
    }
    
    if (replacedCount > 0 || replacedLongDesc > 0) {
        console.log(`[YNT][Descriptions Processor] Replaced ${replacedCount} descriptions, longDesc: ${replacedLongDesc}`);
    }

    return dataCopy;
}