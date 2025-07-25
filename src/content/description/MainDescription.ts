/* 
* Copyright (C) 2025-present YouGo (https://github.com/youg-o)
* This program is licensed under the GNU Affero General Public License v3.0.
* You may redistribute it and/or modify it under the terms of the license.
* 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
*/

import { descriptionLog, descriptionErrorLog } from '../../utils/logger';
import { waitForElement } from '../../utils/dom';
import { normalizeText } from '../../utils/text';
import { initializeChaptersReplacement } from '../chapters/chaptersIndex';
import { calculateSimilarity } from '../../utils/text';
import { descriptionCache } from './index';


export async function fetchOriginalDescription(): Promise<string | null> {
    return new Promise<string | null>((resolve) => {
        const handleDescription = (event: CustomEvent) => {
            window.removeEventListener('ynt-description-data', handleDescription as EventListener);
            resolve(event.detail?.description || null);
        };
        window.addEventListener('ynt-description-data', handleDescription as EventListener);
        const script = document.createElement('script');
        script.src = browser.runtime.getURL('dist/content/scripts/MainDescriptionScript.js');
        document.documentElement.appendChild(script);
    });
}


function getCurrentDescriptionText(element: HTMLElement): string {
    const snippet = element.querySelector('#attributed-snippet-text');
    const core = element.querySelector('.yt-core-attributed-string--white-space-pre-wrap');
    return (snippet || core)?.textContent?.trim() || "";
}


function isDescriptionOriginal(cached: string, current: string): boolean {
    return normalizeText(cached, true).startsWith(normalizeText(current, true));
}


export async function refreshDescription(id: string): Promise<void> {
    //descriptionLog('Waiting for description element');
    try {
        await waitForElement('#description-inline-expander');
        
        // First check if we already have the description in cache
        let description: string | null = descriptionCache.getDescription(id) || null;

        // Only fetch if not in cache
        if (!description) {
            description = await fetchOriginalDescription();
            //descriptionLog('Description element found, injecting script');
        } else {
            //escriptionLog('Using cached description');
        }

        if (description) {
            const descriptionElement = document.querySelector('#description-inline-expander');
            if (descriptionElement) {
                // Always updateupdate the element, whether it's in cache or not
                updateDescriptionElement(descriptionElement as HTMLElement, description, id);
                descriptionLog('Description updated to original');
            }
        }
    } catch (error) {
        descriptionLog(`${error}`);
    }
}


/**
 * Insert the processed description span into a given container.
 * Removes all previous children before appending the new content.
 */
function insertDescriptionSpan(container: Element | null, span: HTMLElement): void {
    if (!container) return;
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    container.appendChild(span.cloneNode(true));
}


/**
 * Parses a text and returns a DocumentFragment with clickable timestamp links.
 * Non-timestamp parts are returned as plain text nodes.
 */
function createTimestampFragment(text: string): DocumentFragment {
    const timestampPattern = /\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/g;
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let match;

    timestampPattern.lastIndex = 0;
    while ((match = timestampPattern.exec(text)) !== null) {
        if (match.index > lastIndex) {
            fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
        }
        const timestamp = match[0];
        let seconds = 0;
        if (match[3]) {
            seconds = parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]);
        } else {
            seconds = parseInt(match[1]) * 60 + parseInt(match[2]);
        }
        const outerSpan = document.createElement('span');
        outerSpan.className = 'yt-core-attributed-string--link-inherit-color';
        outerSpan.dir = 'auto';
        outerSpan.style.color = 'rgb(62, 166, 255)';
        const timestampLink = document.createElement('a');
        timestampLink.textContent = timestamp;
        timestampLink.className = 'yt-core-attributed-string__link yt-core-attributed-string__link--call-to-action-color';
        timestampLink.style.cursor = 'pointer';
        timestampLink.tabIndex = 0;
        timestampLink.setAttribute('ynt-timestamp', seconds.toString());
        outerSpan.appendChild(timestampLink);
        fragment.appendChild(outerSpan);
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
    }
    return fragment;
}

/**
 * Creates an anchor element for a given URL with YouTube description styling.
 * @param url - The URL to link to.
 * @returns HTMLAnchorElement
 */
function createUrlLink(url: string): HTMLAnchorElement {
    const link = document.createElement('a');
    link.href = url;
    link.textContent = url;
    link.className = 'yt-core-attributed-string__link yt-core-attributed-string__link--call-to-action-color';
    link.setAttribute('target', '_blank');
    link.style.color = 'rgb(62, 166, 255)';
    return link;
}


export function updateDescriptionElement(element: HTMLElement, description: string, id: string): void {
    // Find the text containers
    const attributedString = element.querySelector('yt-attributed-string');
    const snippetAttributedString = element.querySelector('#attributed-snippet-text');
    
    if (!attributedString && !snippetAttributedString) {
        descriptionErrorLog(`No description text container found`);
        return;
    }

    // Create the text content
    const span = document.createElement('span');
    span.className = 'yt-core-attributed-string yt-core-attributed-string--white-space-pre-wrap';
    span.dir = 'auto';
    
    // URL regex pattern
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    // Timestamp pattern - matches common YouTube timestamp formats like 1:23 or 1:23:45
    
    const lines = description.split('\n');
    lines.forEach((line, index) => {
        const parts = line.split(urlPattern);
        parts.forEach((part, partIndex) => {
            if (part.match(urlPattern)) {
                span.appendChild(createUrlLink(part));
            } else if (part) {
                // Replace the timestamp logic by:
                const fragment = createTimestampFragment(part);
                span.appendChild(fragment);
            }
        });
        if (index < lines.length - 1) {
            span.appendChild(document.createElement('br'));
        }
    });

    // Use the utility function to insert the span into both containers
    insertDescriptionSpan(attributedString, span);
    insertDescriptionSpan(snippetAttributedString, span);

    if (!descriptionCache.getDescription(id)) {
        descriptionCache.setDescription(id, description);
    }

    setupDescriptionContentObserver(id);
    initializeChaptersReplacement(description);
}


// Compare description text and determine if update is needed
export function compareDescription(element: HTMLElement, id: string): Promise<boolean> {
    return new Promise(async (resolve) => {
        // Get the cached description or fetch a new one
        let description: string | null = descriptionCache.getDescription(id) || null;
        
        if (!description) {
            // Fetch description if not cached
            description = await fetchOriginalDescription();
        }
        
        // If no description available, we need to update (return false)
        if (!description) {
            resolve(false);
            return;
        }
        
        const currentText = getCurrentDescriptionText(element);
        if (!currentText) {
            resolve(false);
            return;
        }
                
        // Check if description is already in original language (using prefix matching)
        const isOriginal = isDescriptionOriginal(description, currentText);

        if (isOriginal) {
            descriptionLog('Description is already in original language, no update needed');
        } else {
            if (!descriptionCache.getDescription(id)) {
                descriptionCache.setDescription(id, description);
            }
        }
        
        // Return true if original (no update needed), false if update needed
        resolve(isOriginal);
    });
}


// DESCRIPTION OBSERVERS ------------------------------------------------------------
let descriptionExpansionObserver: MutationObserver | null = null;
let descriptionContentObserver: MutationObserver | null = null;


// Helper function to process description for current video ID
export function processDescriptionForVideoId(id: string): void {
    const descriptionElement = document.querySelector('#description-inline-expander');
    if (descriptionElement) {
        waitForElement('#movie_player').then(() => {
            // Instead of calling refreshDescription directly
            // Call compareDescription first
            
            compareDescription(descriptionElement as HTMLElement, id).then(isOriginal => {
                if (!isOriginal) {
                    // Only refresh if not original                                 
                    refreshDescription(id).then(() => {
                        descriptionExpandObserver(id);
                        setupDescriptionContentObserver(id);
                    });
                } else {
                    cleanupDescriptionObservers();
                }
            });
        });
    } else {
        // If not found, wait for it
        waitForElement('#description-inline-expander').then(() => {
            refreshDescription(id);
            descriptionExpandObserver(id);
        });
    }
}


function descriptionExpandObserver(id: string): void {
    // Observer for description expansion/collapse
    waitForElement('#description-inline-expander').then((descriptionElement) => {
        //descriptionLog('Setting up expand/collapse observer');
        descriptionExpansionObserver = new MutationObserver(async (mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'is-expanded') {
                    descriptionLog('Description expanded/collapsed');
                    const cachedDescription = descriptionCache.getDescription(id);
                    if (cachedDescription) {
                        //descriptionLog('Using cached description');
                        updateDescriptionElement(descriptionElement as HTMLElement, cachedDescription, id);
                    } else {
                        const description = await fetchOriginalDescription();
                        if (description) {
                            updateDescriptionElement(descriptionElement as HTMLElement, description, id);
                        }
                    }
                }
            }
        });

        descriptionExpansionObserver.observe(descriptionElement, {
            attributes: true,
            attributeFilter: ['is-expanded']
        });
    });
}

export function setupDescriptionContentObserver(id: string) {
    // Cleanup existing observer avoiding infinite loops
    cleanupDescriptionContentObserver();
    const descriptionElement = document.querySelector('#description-inline-expander');
    if (!descriptionElement) {
        descriptionLog('Description element not found, skipping content observer setup');
        return;
    }
    
    // Get cached description
    let cachedDescription = descriptionCache.getDescription(id);
    if (!cachedDescription) {
        descriptionLog('No cached description available, fetching from API');
        
        // Fetch description instead of returning
        fetchOriginalDescription().then(description => {
            if (description) {
                // Cache the description
                if (!descriptionCache.getDescription(id)) {
                    descriptionCache.setDescription(id, description);
                }
                cachedDescription = description;
                
                // Now set up the observer with the fetched description
                setupObserver();
            }
        });
        return; // Still need to return here since we're doing async work
    }
    
    // If we have a cached description, set up the observer
    setupObserver();
    
    // Local function to avoid duplicating the observer setup code
    function setupObserver() {
        //descriptionLog('Setting up description content observer');
        
        descriptionContentObserver = new MutationObserver((mutations) => {
            // Skip if we don't have a cached description to compare with
            if (!cachedDescription) {
                descriptionLog('No cached description available, skipping content observer setup');
                return;
            }
            
            // Add a small delay to allow YouTube to finish its modifications
            setTimeout(() => {
                // Make sure descriptionElement still exists in this closure
                if (!descriptionElement) return;
                
                const currentText = getCurrentDescriptionText(descriptionElement as HTMLElement);
                if (!currentText) return;
                
                // Compare similarity instead of exact match
                const similarity = calculateSimilarity(normalizeText(currentText, true), normalizeText(cachedDescription, true));
                
                // Consider texts similar if they match at least 75%
                const isOriginal = similarity >= 0.75;
                if (isOriginal) return;
                
                
                //descriptionLog(`currentText: ${normalizeText(currentText, true)}`);
                //descriptionLog(`cachedDescription: ${normalizeText(cachedDescription, true)}`);
                //descriptionLog(`Similarity: ${(similarity * 100).toFixed(1)}%`);
                
                descriptionLog('Description content changed by YouTube, restoring original');
                
                // Temporarily disconnect to prevent infinite loop
                descriptionContentObserver?.disconnect();
                
                // Update with original description - ensure cachedDescription isn't null
                updateDescriptionElement(descriptionElement as HTMLElement, cachedDescription as string, id);
                
                // Reconnect observer
                if (descriptionContentObserver) {
                    descriptionContentObserver.observe(descriptionElement, {
                        childList: true,
                        subtree: true,
                        characterData: true
                    });
                }
            }, 50); // 50ms delay
        });
        
        // Start observing - ensure descriptionElement isn't null
        if (descriptionContentObserver && descriptionElement) {
            descriptionContentObserver.observe(descriptionElement, {
                childList: true,
                subtree: true,
                characterData: true
            });
        }
        
        //descriptionLog('Description content observer setup completed');
    }
}

function cleanupDescriptionContentObserver(): void{
    descriptionContentObserver?.disconnect();
    descriptionContentObserver = null;
}

export function cleanupDescriptionObservers(): void {
    descriptionExpansionObserver?.disconnect();
    descriptionExpansionObserver = null;

    cleanupDescriptionContentObserver();
}