/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

// TODO: Current observer implementation could be refactored for better efficiency / performances
// Keeping current structure for stability, needs architectural review in future updates


let loadStartHandler: ((e: Event) => void) | null = null;

function setupLoadStartHandler() {
    cleanUpLoadStartHandler();

    // Create handler function
    loadStartHandler = function(e: Event) {
        if (!(e.target instanceof HTMLVideoElement)) return;
        if ((e.target as any).srcValue === e.target.src) return;
        
        coreLog('Video source changed.');
        currentSettings?.audioTranslation && handleAudioTranslation();
        currentSettings?.subtitlesTranslation && handleSubtitlesTranslation();
    };

    // Add event listener
    document.addEventListener('loadstart', loadStartHandler, true);
}

function cleanUpLoadStartHandler() {
    // Remove event listener if it exists
    if (loadStartHandler) {
        document.removeEventListener('loadstart', loadStartHandler, true);
        loadStartHandler = null;
    }
}

// DESCRIPTION OBSERVERS ------------------------------------------------------------
let descriptionObserver: MutationObserver | null = null;
let descriptionExpansionObserver: MutationObserver | null = null;
let descriptionContentObserver: MutationObserver | null = null;


function setupDescriptionObserver() {
    cleanupAllDescriptionObservers();
    waitForElement('ytd-watch-flexy').then((watchFlexy) => {
        descriptionLog('Setting up video-id observer');
        descriptionObserver = new MutationObserver(async (mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'video-id') {
                    descriptionLog('Video ID changed!');
                    descriptionCache.clearCurrentDescription();  // Clear cache on video change
                    // Process the video ID change
                    processDescriptionForVideoId();
                }
            }
        });

        descriptionObserver.observe(watchFlexy, {
            attributes: true,
            attributeFilter: ['video-id']
        });
        
        // Manually trigger for the initial video when setting up the observer
        // This handles the case where we navigate to a video page via SPA
        const currentVideoId = watchFlexy.getAttribute('video-id');
        if (currentVideoId) {
            descriptionLog('Manually triggering for initial video-id:', currentVideoId);
            descriptionCache.clearCurrentDescription();
            // Process the initial video ID
            processDescriptionForVideoId();
        }
    });
    
    // Helper function to process description for current video ID
    function processDescriptionForVideoId() {
        const descriptionElement = document.querySelector('#description-inline-expander');
        if (descriptionElement) {
            waitForElement('#movie_player').then(() => {
                // Instead of calling refreshDescription directly
                // Call compareDescription first
                
                compareDescription(descriptionElement as HTMLElement).then(isOriginal => {
                    if (!isOriginal) {
                        // Only refresh if not original                                 
                        refreshDescription().then(() => {
                            descriptionExpandObserver();
                            setupDescriptionContentObserver();
                        });
                    } else {
                        cleanupDescriptionObservers();
                    }
                });
            });
        } else {
            // If not found, wait for it
            waitForElement('#description-inline-expander').then(() => {
                refreshDescription();
                descriptionExpandObserver();
            });
        }
    }
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
                        const description = await fetchOriginalDescription();
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
    let cachedDescription = descriptionCache.getCurrentDescription();
    if (!cachedDescription) {
        descriptionLog('No cached description available, fetching from API');
        
        // Fetch description instead of returning
        fetchOriginalDescription().then(description => {
            if (description) {
                // Cache the description
                cachedDescription = description;
                descriptionCache.setElement(descriptionElement as HTMLElement, description);
                
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
                
                // Update with original description - ensure cachedDescription isn't null
                updateDescriptionElement(descriptionElement as HTMLElement, cachedDescription as string);
                
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

function cleanupDescriptionObservers(): void {
    descriptionExpansionObserver?.disconnect();
    descriptionExpansionObserver = null;

    cleanupDescriptionContentObserver();
}

function cleanupAllDescriptionObservers(): void {
    // Clean up main description observer
    descriptionObserver?.disconnect();
    descriptionObserver = null;
    
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
                    //mainTitleLog('Cache cleared');
                    
                    // Wait for movie_player and title element
                    const [player, titleElement] = await Promise.all([
                        waitForElement('#movie_player'),
                        waitForElement('ytd-watch-metadata yt-formatted-string.style-scope.ytd-watch-metadata')
                    ]);

                    // Only proceed if we're still on the same page
                    if (titleElement.textContent) {
                        await refreshMainTitle();
                        await refreshChannelName();
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




// BROWSING TITLES OBSERVER -----------------------------------------------------------
let homeObserver: MutationObserver | null = null;
let recommendedObserver: MutationObserver | null = null;
let searchObserver: MutationObserver | null = null;
let playlistObserver: MutationObserver | null = null;

let lastHomeRefresh = 0;
let lastRecommendedRefresh = 0;
let lastSearchRefresh = 0;
let lastPlaylistRefresh = 0;

const THROTTLE_DELAY = 1000; // minimum of X ms between refreshes between container mutations

function pageVideosObserver() {
    cleanupPageVideosObserver();

    // --- Observer for home page | Channel page
    waitForElement('#contents.ytd-rich-grid-renderer').then((contents) => {
        let pageName = null;
        if (window.location.pathname === '/') {
            pageName = 'Home';
        } else if (window.location.pathname === '/feed/subscriptions') {
            pageName = 'Subscriptions';
        } else if (window.location.pathname.includes('/@')) {
            pageName = 'Channel';
        } else if (window.location.pathname === '/feed/trending') {
            pageName = 'Trending';
        }
        browsingTitlesLog(`Setting up ${pageName} page videos observer`);
        refreshBrowsingTitles();
        refreshShortsAlternativeFormat();
        homeObserver = new MutationObserver(() => {
            const now = Date.now();
            if (now - lastHomeRefresh >= THROTTLE_DELAY) {
                browsingTitlesLog(`${pageName} page mutation detected`);
                refreshBrowsingTitles();
                refreshShortsAlternativeFormat();
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
        refreshBrowsingTitles();
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
        let pageName = null;
        if (window.location.pathname === '/results') {
            pageName = 'Search';
        } else if (window.location.pathname === '/feed/history') {
            pageName = 'History';
        }
        browsingTitlesLog(`Setting up ${pageName} results videos observer`);
        refreshBrowsingTitles();
        refreshShortsAlternativeFormat();
        searchObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && 
                    mutation.addedNodes.length > 0 && 
                    mutation.target instanceof HTMLElement) {
                    const titles = mutation.target.querySelectorAll('#video-title');
                    if (titles.length > 0) {
                        const now = Date.now();
                        if (now - lastSearchRefresh >= THROTTLE_DELAY) {
                            browsingTitlesLog(`${pageName} results mutation detected`);
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
        refreshBrowsingTitles();
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
    //coreLog(`[URL] Current pathname:`, window.location.pathname);
    coreLog(`[URL] Full URL:`, window.location.href);
    
    // --- Clean up existing observers
    cleanupMainTitleContentObserver();
    cleanupIsEmptyObserver();
    cleanupPageTitleObserver();

    cleanupChannelNameContentObserver();
    
    cleanupAllBrowsingTitlesObservers();
    cleanupAllBrowsingTitlesElementsObservers();

    cleanupDescriptionObservers();
    
    //coreLog('Observers cleaned up');

    
    if (currentSettings?.titleTranslation) {
        setTimeout(() => {
            refreshBrowsingTitles();
            refreshShortsAlternativeFormat();
        }, 1500);
        setTimeout(() => {
            refreshBrowsingTitles();
            refreshShortsAlternativeFormat();
        }, 5000);
    }
    
    // --- Check if URL contains patterns
    const isChannelPage = window.location.pathname.includes('/@');
    if (isChannelPage) {
        // --- Handle all new channel page types (videos, featured, shorts, etc.)
        coreLog(`[URL] Detected channel page`);
        if (currentSettings?.titleTranslation) {
            pageVideosObserver();
        }
        return;
    }
    const isShortsPage = window.location.pathname.startsWith('/shorts');
    if (isShortsPage) {
        coreLog(`[URL] Detected shorts page`);
        currentSettings?.titleTranslation && checkShortsId();
        return;
    }
    
    switch(window.location.pathname) {
        case '/results': // --- Search page
            coreLog(`[URL] Detected search page`);
            currentSettings?.titleTranslation && searchResultsObserver();
            break;
            case '/': // --- Home page
            coreLog(`[URL] Detected home page`);
            currentSettings?.titleTranslation && pageVideosObserver();
            break;        
            case '/feed/subscriptions': // --- Subscriptions page
            coreLog(`[URL] Detected subscriptions page`);
            currentSettings?.titleTranslation && pageVideosObserver();
            break;
            case '/feed/trending':  // --- Trending page
            coreLog(`[URL] Detected trending page`);
            currentSettings?.titleTranslation && pageVideosObserver();
            break;
            case '/feed/history':  // --- History page
            coreLog(`[URL] Detected history page`);
            currentSettings?.titleTranslation && searchResultsObserver();
            break;
        case '/playlist':  // --- Playlist page
            coreLog(`[URL] Detected playlist page`);
            currentSettings?.titleTranslation && playlistVideosObserver();
            break;
        case '/channel':  // --- Channel page (old format)
            coreLog(`[URL] Detected channel page`);
            currentSettings?.titleTranslation && pageVideosObserver();
            break;
        case '/watch': // --- Video page
            coreLog(`[URL] Detected video page`);
            !descriptionObserver && currentSettings?.descriptionTranslation && setupDescriptionObserver();
            currentSettings?.titleTranslation && recommandedVideosObserver();
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