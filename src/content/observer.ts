/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

// TODO: Current observer implementation could be refactored for better efficiency, some are not even used
// Keeping current structure for stability, needs architectural review in future updates


// AUDIO OBSERVERS --------------------------------------------------------------------
let audioObserver: MutationObserver | null = null;


function setupAudioObserver() {
    cleanupAudioObserver();
    waitForElement('ytd-watch-flexy').then((watchFlexy) => {
        audioObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'video-id') {
                    // Wait for movie_player before injecting script
                    waitForElement('#movie_player').then(() => {
                        handleAudioTranslation();
                    });
                }
            }
        });

        audioObserver.observe(watchFlexy, {
            attributes: true,
            attributeFilter: ['video-id']
        });
    });
}

function cleanupAudioObserver() {
    audioObserver?.disconnect();
    audioObserver = null;
}

// DESCRIPTION OBSERVERS ------------------------------------------------------------
let descriptionObserver: MutationObserver | null = null;
let descriptionExpansionObserver: MutationObserver | null = null;
let descriptionContentObserver: MutationObserver | null = null;


function setupDescriptionObserver() {
    cleanupAllDescriptionObservers();
    // Observer for video changes via URL
    waitForElement('ytd-watch-flexy').then((watchFlexy) => {
        descriptionLog('Setting up video-id observer');
        descriptionObserver = new MutationObserver(async (mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'video-id') {
                    descriptionLog('Video ID changed!');
                    descriptionCache.clearCurrentDescription();  // Clear cache on video change
                    const descriptionElement = document.querySelector('#description-inline-expander');
                    if (descriptionElement) {
                        waitForElement('#movie_player').then(() => {
                            // Instead of calling refreshDescription directly
                            // Call compareDescription first
                            
                            compareDescription(descriptionElement as HTMLElement).then(isOriginal => {
                                if (!isOriginal) {
                                    // Only refresh if not original                                 
                                    refreshDescription();
                                    descriptionExpandObserver();
                                    setupDescriptionContentObserver();
                                } else {
                                    cleanupDescriptionObservers();
                                }
                            });
                        });
                    } else {
                        // If not found, wait for it
                        waitForElement('#description-inline-expander').then(() => {
                            refreshDescription();
                            descriptionExpandObserver()
                        });
                    }
                }
            }
        });

        descriptionObserver.observe(watchFlexy, {
            attributes: true,
            attributeFilter: ['video-id']
        });
    });


}

function descriptionExpandObserver() {
    // Observer for description expansion/collapse
    waitForElement('#description-inline-expander').then((descriptionElement) => {
        //descriptionLog('Setting up expand/collapse observer');
        descriptionExpansionObserver = new MutationObserver(async (mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'is-expanded') {
                    descriptionLog('Description expanded/collapsed');
                    const cachedDescription = descriptionCache.getCurrentDescription();
                    if (cachedDescription) {
                        //descriptionLog('Using cached description');
                        updateDescriptionElement(descriptionElement as HTMLElement, cachedDescription);
                    } else {
                        const description = await new Promise<string | null>((resolve) => {
                            const handleDescription = (event: CustomEvent) => {
                                window.removeEventListener('ynt-description-data', handleDescription as EventListener);
                                resolve(event.detail?.description || null);
                            };
                            window.addEventListener('ynt-description-data', handleDescription as EventListener);
                            const script = document.createElement('script');
                            script.src = browser.runtime.getURL('dist/content/description/descriptionScript.js');
                            document.documentElement.appendChild(script);
                        });
                        if (description) {
                            updateDescriptionElement(descriptionElement as HTMLElement, description);
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

function setupDescriptionContentObserver() {
    // Cleanup existing observer avoiding infinite loops
    cleanupDescriptionContentObserver();
    const descriptionElement = document.querySelector('#description-inline-expander');
    if (!descriptionElement) {
        descriptionLog('Description element not found, skipping content observer setup');
        return;
    }
    
    // Get cached description
    const cachedDescription = descriptionCache.getCurrentDescription();
    if (!cachedDescription) {
        descriptionLog('No cached description available, skipping content observer setup');
        return;
    }
    
    //descriptionLog('Setting up description content observer');
    
    descriptionContentObserver = new MutationObserver((mutations) => {
        // Skip if we don't have a cached description to compare with
        if (!cachedDescription) return;
        
        // Add a small delay to allow YouTube to finish its modifications
        setTimeout(() => {
            // Find the specific text container with the actual description content
            const snippetAttributedString = descriptionElement.querySelector('#attributed-snippet-text');
            const coreAttributedString = descriptionElement.querySelector('.yt-core-attributed-string--white-space-pre-wrap');
            
            if (!snippetAttributedString && !coreAttributedString) return;
            
            // Get the actual text content
            const currentTextContainer = snippetAttributedString || coreAttributedString;
            const currentText = currentTextContainer?.textContent?.trim();
            
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
            
            // Update with original description
            updateDescriptionElement(descriptionElement as HTMLElement, cachedDescription);
            
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
    
    // Start observing
    if (descriptionContentObserver) {
        descriptionContentObserver.observe(descriptionElement, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }
    
    //descriptionLog('Description content observer setup completed');
}


function cleanupDescriptionContentObserver(): void{
    descriptionContentObserver?.disconnect();
    descriptionContentObserver = null;
}

function cleanupDescriptionObservers(): void {
    descriptionExpansionObserver?.disconnect();
    descriptionExpansionObserver = null;

    cleanupDescriptionContentObserver();
}

function cleanupAllDescriptionObservers(): void {
    cleanupDescriptionObservers();
    cleanupDescriptionContentObserver();
}


// MAIN TITLE OBSERVERS ---------------------------------------------
let mainTitleObserver: MutationObserver | null = null;


function setupMainTitleObserver() {
    cleanupMainTitleObserver();
    waitForElement('ytd-watch-flexy').then((watchFlexy) => {
        mainTitleLog('Setting up video-id observer');
        mainTitleObserver = new MutationObserver(async (mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'video-id') {
                    titleCache.clear();
                    
                    const newVideoId = (mutation.target as HTMLElement).getAttribute('video-id');
                    mainTitleLog('Video ID changed:', newVideoId);
                    mainTitleLog('Cache cleared');
                    
                    // Wait for movie_player and title element
                    const [player, titleElement] = await Promise.all([
                        waitForElement('#movie_player'),
                        waitForElement('ytd-watch-metadata yt-formatted-string.style-scope.ytd-watch-metadata')
                    ]);

                    // Only proceed if we're still on the same page
                    if (titleElement.textContent) {
                        await refreshMainTitle();
                    }
                }
            }
        });

        mainTitleObserver.observe(watchFlexy, {
            attributes: true,
            attributeFilter: ['video-id']
        });
    });
}

function cleanupMainTitleObserver() {
    mainTitleObserver?.disconnect();
    mainTitleObserver = null;
}


// SUBTITLES OBSERVERS --------------------------------------------------------------------
let subtitlesObserver: MutationObserver | null = null;

function setupSubtitlesObserver() {
    cleanupSubtitlesObserver();
    waitForElement('ytd-watch-flexy').then((watchFlexy) => {
        subtitlesObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'video-id') {
                    // Wait for movie_player before injecting script
                    waitForElement('#movie_player').then(() => {
                        handleSubtitlesTranslation();
                    });
                }
            }
        });

        subtitlesObserver.observe(watchFlexy, {
            attributes: true,
            attributeFilter: ['video-id']
        });
    });
}

function cleanupSubtitlesObserver() {
    subtitlesObserver?.disconnect();
    subtitlesObserver = null;
}


// BROWSING TITLES OBSERVER -----------------------------------------------------------
let homeObserver: MutationObserver | null = null;
let recommendedObserver: MutationObserver | null = null;
let searchObserver: MutationObserver | null = null;
let playlistObserver: MutationObserver | null = null;

let lastHomeRefresh = 0;
let lastRecommendedRefresh = 0;
let lastSearchRefresh = 0;
let lastPlaylistRefresh = 0;

const THROTTLE_DELAY = 1500; // 1.5 seconds between refreshes

function pageVideosObserver() {
    cleanupPageVideosObserver();

    // --- Observer for home page | Channel page
    waitForElement('#contents.ytd-rich-grid-renderer').then((contents) => {
        browsingTitlesLog('Setting up Home/Channel/Subscriptions page videos observer');
        homeObserver = new MutationObserver(() => {
            const now = Date.now();
            if (now - lastHomeRefresh >= THROTTLE_DELAY) {
                browsingTitlesLog('Home/Channel/Subscriptions page mutation detected');
                refreshBrowsingTitles();
                lastHomeRefresh = now;
            }
        });

        homeObserver.observe(contents, {
            childList: true
        });
        //browsingTitlesLog('Home/Channel page observer setup completed');
    });
};

function recommandedVideosObserver() {
    cleanupRecommandedVideosObserver();

    // --- Observer for recommended videos
    waitForElement('#secondary-inner ytd-watch-next-secondary-results-renderer #items').then((contents) => {
        browsingTitlesLog('Setting up recommended videos observer');
        recommendedObserver = new MutationObserver(() => {
            const now = Date.now();
            if (now - lastRecommendedRefresh >= THROTTLE_DELAY) {
                browsingTitlesLog('Recommended videos mutation detected');
                refreshBrowsingTitles();
                lastRecommendedRefresh = now;
            }
        });
        
        recommendedObserver.observe(contents, {
            childList: true
        });
        //browsingTitlesLog('Recommended videos observer setup completed');
    });
};


function searchResultsObserver() {
    cleanupSearchResultsVideosObserver();

    // --- Observer for search results
    waitForElement('ytd-section-list-renderer #contents').then((contents) => {
        browsingTitlesLog('Setting up search results observer');
        searchObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && 
                    mutation.addedNodes.length > 0 && 
                    mutation.target instanceof HTMLElement) {
                    const titles = mutation.target.querySelectorAll('#video-title');
                    if (titles.length > 0) {
                        const now = Date.now();
                        if (now - lastSearchRefresh >= THROTTLE_DELAY) {
                            browsingTitlesLog('Search results mutation detected');
                            refreshBrowsingTitles();
                            refreshShortsAlternativeFormat();
                            lastSearchRefresh = now;
                        }
                        break;
                    }
                }
            }
        });

        searchObserver.observe(contents, {
            childList: true,
            subtree: true
        });
    });
};

function playlistVideosObserver() {
    cleanupPlaylistVideosObserver();

    // --- Observer for playlist/queue videos
    waitForElement('#playlist ytd-playlist-panel-renderer #items').then((contents) => {
        browsingTitlesLog('Setting up playlist/queue videos observer');
        playlistObserver = new MutationObserver(() => {
            const now = Date.now();
            if (now - lastPlaylistRefresh >= THROTTLE_DELAY) {
                browsingTitlesLog('Playlist/Queue mutation detected');
                refreshBrowsingTitles();
                lastPlaylistRefresh = now;
            }
        });
        
        playlistObserver.observe(contents, {
            childList: true
        });
        browsingTitlesLog('Playlist/Queue observer setup completed');
    });
};


function cleanupAllBrowsingTitlesObservers() {
    cleanupPageVideosObserver();
    cleanupRecommandedVideosObserver();
    cleanupSearchResultsVideosObserver();
    cleanupPlaylistVideosObserver();
};

function cleanupPageVideosObserver() {
    homeObserver?.disconnect();
    homeObserver = null;
    lastHomeRefresh = 0;
}

function cleanupRecommandedVideosObserver() {
    recommendedObserver?.disconnect();
    recommendedObserver = null;
    lastRecommendedRefresh = 0;
}

function cleanupSearchResultsVideosObserver() {
    searchObserver?.disconnect();
    searchObserver = null;
    lastSearchRefresh = 0;
}

function cleanupPlaylistVideosObserver() {
    playlistObserver?.disconnect();
    playlistObserver = null;
    lastPlaylistRefresh = 0;
}




// URL OBSERVER -----------------------------------------------------------
function setupUrlObserver() {
    coreLog('Setting up URL observer');    
    // --- Standard History API monitoring
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
        coreLog('pushState called with:', args);
        originalPushState.apply(this, args);
        handleUrlChange();
    };
    
    history.replaceState = function(...args) {
        coreLog('replaceState called with:', args);
        originalReplaceState.apply(this, args);
        handleUrlChange();
    };
    
    // --- Browser navigation (back/forward)
    window.addEventListener('popstate', () => {
        coreLog('popstate event triggered');
        handleUrlChange();
    });
    
    // --- YouTube's custom page data update event
    window.addEventListener('yt-page-data-updated', () => {
        coreLog('YouTube page data updated');
        handleUrlChange();
    });
    
    // --- YouTube's custom SPA navigation events
    /*
    window.addEventListener('yt-navigate-start', () => {
        coreLog('YouTube SPA navigation started');
        handleUrlChange();
        });
        */
       
       /*
       window.addEventListener('yt-navigate-finish', () => {
        coreLog('YouTube SPA navigation completed');
        handleUrlChange();
        });
    */
}

function handleUrlChange() {
    coreLog(`${LOG_PREFIX}[URL] Current pathname:`, window.location.pathname);
    coreLog(`${LOG_PREFIX}[URL] Full URL:`, window.location.href);
    
    // --- Clean up existing observers
    cleanupMainTitleContentObserver();
    cleanupPageTitleObserver();
    
    cleanupAllBrowsingTitlesObservers();
    cleanupAllBrowsingTitlesElementsObservers();

    cleanupDescriptionObservers();
    
    coreLog('Observers cleaned up');

    
    if (currentSettings?.titleTranslation) {
        setTimeout(() => {
            refreshBrowsingTitles();
        }, 2500);
    }
    if (currentSettings?.titleTranslation) {
        setTimeout(() => {
            refreshBrowsingTitles();
        }, 5000);
    }
    
    // --- Check if URL contains @username pattern
    const isChannelPage = window.location.pathname.includes('/@');
    if (isChannelPage) {
        // --- Handle all new channel page types (videos, featured, shorts, etc.)
        currentSettings?.titleTranslation && pageVideosObserver();
        return;
    }
    
    switch(window.location.pathname) {
        case '/results': // --- Search page
            coreLog(`[URL] Detected search page`);
            if (currentSettings?.titleTranslation) {
                searchResultsObserver();
                waitForElement('#contents.ytd-section-list-renderer').then(() => {
                    browsingTitlesLog('Search results container found');
                    refreshBrowsingTitles();
                    refreshShortsAlternativeFormat();
                });
            }
            
            break;
        case '/': // --- Home page
            coreLog(`[URL] Detected home page`);
            if (currentSettings?.titleTranslation) {
                pageVideosObserver();
                waitForElement('#contents.ytd-rich-grid-renderer').then(() => {
                    browsingTitlesLog('Home page container found');
                    refreshBrowsingTitles();
                });      
            }
            break;        
        case '/feed/subscriptions': // --- Subscriptions page
            coreLog(`[URL] Detected subscriptions page`);
            if (currentSettings?.titleTranslation) {
                pageVideosObserver();
                waitForElement('#contents.ytd-rich-grid-renderer').then(() => {
                    browsingTitlesLog('Subscriptions page container found');
                    refreshBrowsingTitles();
                });
            }
            break;
        case '/feed/trending':  // --- Trending page
            coreLog(`[URL] Detected trending page`);
            if (currentSettings?.titleTranslation) {
                pageVideosObserver();
                waitForElement('#contents.ytd-rich-grid-renderer').then(() => {
                    browsingTitlesLog('Trending page container found');
                    refreshBrowsingTitles();
                });
            }
            break;
        case '/playlist':  // --- Playlist page
            currentSettings?.titleTranslation && playlistVideosObserver();
            break;
        case '/channel':  // --- Channel page (old format)
            currentSettings?.titleTranslation && pageVideosObserver();
            break;
        case '/watch': // --- Video page
            coreLog(`[URL] Detected video page`);
            if (currentSettings?.titleTranslation) {
                recommandedVideosObserver();
                waitForElement('#secondary-inner ytd-watch-next-secondary-results-renderer #items').then(() => {
                    browsingTitlesLog('Recommended videos container found');
                    refreshBrowsingTitles();
                        // --- refresh titles 4 seconds after loading video page
                        setTimeout(() => {
                            refreshBrowsingTitles();
                        }, 4000);
                });
            }
            break;
    }
}


// YOUTUBE-NOCOOKIE OBSERVER -----------------------------------------------------------

function setupEmbedVideoObserver() {
    coreLog('Setting up embed video observer');
    
    // Create a flag to track if we've already set up the play event listener
    let playEventSetup = false;
    let videoObserver: MutationObserver | null = null;
    
    // Function to set up the play event listener on video element
    const setupPlayEventListener = (videoElement: HTMLVideoElement) => {
        // Avoid setting up the listener multiple times
        if (playEventSetup || videoElement.dataset.yntListenerSetup === 'true') return;
        
        videoElement.dataset.yntListenerSetup = 'true';
        playEventSetup = true;
        
        // Set up one-time play event listener
        videoElement.addEventListener('play', () => {
            coreLog('Video play detected on youtube-nocookie, initializing features');
            
            // Short timeout to ensure player API is fully ready after play starts
            setTimeout(() => {
                if (currentSettings?.titleTranslation) {
                    setTimeout(() => {
                        refreshEmbedTitle();                       
                    }, 1000);
                }

                if (currentSettings?.audioTranslation) {
                    handleAudioTranslation();
                }
                
                if (currentSettings?.subtitlesTranslation) {
                    handleSubtitlesTranslation();
                }
                
                // Clean up the observer since we no longer need it
                if (videoObserver) {
                    videoObserver.disconnect();
                    videoObserver = null;
                }
            }, 50);
        }, { once: true }); // Only trigger once
    };
    
    // Check if video element already exists
    const existingVideo = document.querySelector('video');
    if (existingVideo) {
        setupPlayEventListener(existingVideo as HTMLVideoElement);
        return; // No need for observer if video already exists
    }
    
    // Create mutation observer to watch for video element being added to the DOM
    videoObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // Look for video element in added nodes and their children
                for (const node of mutation.addedNodes) {
                    if (node instanceof HTMLElement) {
                        // Check if node is video or contains video
                        if (node.tagName === 'VIDEO') {
                            setupPlayEventListener(node as HTMLVideoElement);
                            return;
                        } else {
                            const videoElement = node.querySelector('video');
                            if (videoElement) {
                                setupPlayEventListener(videoElement);
                                return;
                            }
                        }
                    }
                }
            }
        }
    });
    
    // Observe the entire document for video element
    videoObserver.observe(document.documentElement, {
        childList: true,
        subtree: true
    });
}