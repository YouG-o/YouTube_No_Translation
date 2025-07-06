/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { chaptersLog, chaptersErrorLog } from '../loggings';
import { normalizeText } from '../utils/text';

import { cachedChapters, findChapterByTime, timeStringToSeconds } from './chaptersIndex';


function isPanelOpen(panel: Element): boolean {
    // Primary method: Check visibility attribute (most reliable)
    const visibility = panel.getAttribute('visibility');
    if (visibility === 'ENGAGEMENT_PANEL_VISIBILITY_HIDDEN') {
        return false;
    }
    if (visibility === 'ENGAGEMENT_PANEL_VISIBILITY_EXPANDED') {
        return true;
    }
    
    // Fallback: Check if panel is actually visible in viewport
    const rect = (panel as HTMLElement).getBoundingClientRect();
    const isVisuallyVisible = rect.height > 50 && rect.width > 50 && rect.top >= 0;
    
    // Additional check: panel should not have display: none
    const computedStyle = window.getComputedStyle(panel as HTMLElement);
    const isDisplayed = computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden';
    
    return isVisuallyVisible && isDisplayed;
}

// Setup panels observer to detect when chapters panel opens
export function setupPanelsObserver(): void {
    const panelsContainer = document.getElementById('panels');
    if (!panelsContainer) return;

    let lastPanelState: boolean | null = null;

    const panelsObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes') {
                const target = mutation.target as Element;
                if (target.matches('ytd-engagement-panel-section-list-renderer')) {
                    const targetId = target.getAttribute('target-id');
                    if (targetId === 'engagement-panel-macro-markers-description-chapters') {
                        
                        const isOpen = isPanelOpen(target);
                        
                        // Only log if state actually changed
                        if (lastPanelState !== isOpen) {
                            lastPanelState = isOpen;
                            chaptersLog(`Panel chapters ${isOpen ? 'opened' : 'closed'}`);
                            
                            if (isOpen) {
                                replaceChapterTitlesInPanels();
                            }
                        }
                    }
                }
            }
            
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const element = node as Element;
                        
                        // More specific check: only react to changes in the open chapters panel
                        if (element.matches('ytd-macro-markers-list-item-renderer') || 
                            element.querySelector('ytd-macro-markers-list-item-renderer')) {
                            
                            const openChaptersPanel = document.querySelector('ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-macro-markers-description-chapters"][visibility="ENGAGEMENT_PANEL_VISIBILITY_EXPANDED"]');
                            if (openChaptersPanel && openChaptersPanel.contains(element)) {
                                replaceChapterTitlesInPanels();
                            }
                        }
                    }
                });
            }
        });
    });

    panelsObserver.observe(panelsContainer, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['visibility', 'style', 'target-id']
    });

    chaptersLog('Enhanced panels observer initialized');
}


function replaceChapterTitlesInPanels(): void {
    if (cachedChapters.length === 0) return;
    
    // Only target chapter elements in the OPENED chapters panel, not in description or other places
    const openChaptersPanel = document.querySelector('ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-macro-markers-description-chapters"][visibility="ENGAGEMENT_PANEL_VISIBILITY_EXPANDED"]');
    if (!openChaptersPanel) {
        chaptersLog('No open chapters panel found');
        return;
    }
    
    // Find chapter title elements ONLY within the open panel
    const chapterElements = openChaptersPanel.querySelectorAll('ytd-macro-markers-list-item-renderer h4.macro-markers');
    
    chapterElements.forEach((element: Element) => {
        const h4Element = element as HTMLElement;
        const currentTitle = h4Element.textContent?.trim();
        
        if (currentTitle) {
            const timeElement = h4Element.closest('ytd-macro-markers-list-item-renderer')?.querySelector('#time');
            const timeText = timeElement?.textContent?.trim();
            
            if (timeText) {
                const timeInSeconds = timeStringToSeconds(timeText);
                const matchingChapter = findChapterByTime(timeInSeconds, cachedChapters);

                if (matchingChapter && normalizeText(currentTitle) !== normalizeText(matchingChapter.title)) {
                    h4Element.textContent = matchingChapter.title;
                    chaptersLog(`Replaced panel chapter: "${currentTitle}" -> "${matchingChapter.title}" at ${timeText}`);
                }
            } else {
                chaptersLog(`No time element found for chapter: "${currentTitle}"`);
            }
        }
    });
}