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

// MAIN OBSERVERS -----------------------------------------------------------

let videoPlayerListener: ((e: Event) => void) | null = null;
let hasInitialPlayerLoadTriggered = false;

// Flag to track if a change was initiated by the user
let userInitiatedChange = false;
// Timeout ID for resetting the user initiated flag
let userChangeTimeout: number | null = null;


// Many events, needed to apply settings as soon as possible on initial load
const allVideoEvents = [
    'loadstart',
    'loadedmetadata', 
    'canplay',
    'playing',
    'play',
    'timeupdate',
    'seeked'
];
let videoEvents = allVideoEvents;

function setupVideoPlayerListener() {
    cleanUpVideoPlayerListener();

    coreLog('Setting up video player listener');

    // Listen for user interactions with settings menu
    document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('.ytp-settings-menu')) {
            userInitiatedChange = true;
            
            if (userChangeTimeout) {
                window.clearTimeout(userChangeTimeout);
            }
            
            userChangeTimeout = window.setTimeout(() => {
                userInitiatedChange = false;
                userChangeTimeout = null;
            }, 2000);
        }
    }, true);

    videoPlayerListener = function(e: Event) {
        if (!(e.target instanceof HTMLVideoElement)) return;
        if ((e.target as any).srcValue === e.target.src) return;

        // Ignore events from our isolated players
        const parentIframe = e.target.closest('iframe');
        if (parentIframe && parentIframe.id.startsWith('ynt-player')) {
            // Technical: Ignore events from isolated players used for metadata retrieval
            return;
        }

        // Skip if user initiated change
        if (userInitiatedChange) {
            coreLog('User initiated change detected - skipping default settings');
            return;
        }

        coreLog('Video source changed.');
        coreLog('🎥 Event:', e.type);

        if (!hasInitialPlayerLoadTriggered) {
            hasInitialPlayerLoadTriggered = true;
            cleanUpVideoPlayerListener();
            videoEvents = ['loadstart', 'loadedmetadata'];
            coreLog('Optimized video events for SPA navigation');
            setupVideoPlayerListener();
        }

        applyVideoPlayerSettings();
    };
    
    videoEvents.forEach(eventType => {
        if (videoPlayerListener) {
            document.addEventListener(eventType, videoPlayerListener, true);
        }
    });
}

function cleanUpVideoPlayerListener() {
    if (videoPlayerListener) {
        allVideoEvents.forEach(eventType => {
            document.removeEventListener(eventType, videoPlayerListener!, true);
        });
        videoPlayerListener = null;
    }
    
    // Clean up user change tracking
    if (userChangeTimeout) {
        window.clearTimeout(userChangeTimeout);
        userChangeTimeout = null;
    }
    userInitiatedChange = false;
}

//let mainVideoObserver: MutationObserver | null = null;

function setupMainVideoObserver() {
    //cleanupMainVideoObserver();
    waitForElement('ytd-watch-flexy').then((watchFlexy) => {
        /*coreLog('Setting up video-id observer');
        mainVideoObserver = new MutationObserver(async (mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'video-id') {
                    titleCache.clear();
                    descriptionCache.clearCurrentDescription()
                    
                    const newVideoId = (mutation.target as HTMLElement).getAttribute('video-id');
                    coreLog('Video ID changed:', newVideoId);
                    
                    if (currentSettings?.titleTranslation) {
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

                    currentSettings?.descriptionTranslation && processDescriptionForVideoId();
                }
            }
        });*/

        if (currentSettings?.descriptionTranslation) {
            // Manually trigger for the initial video when setting up the observer
            // This handles the case where we navigate to a video page via SPA
            const currentVideoId = watchFlexy.getAttribute('video-id');
            if (currentVideoId) {
                //descriptionLog('Manually triggering for initial video-id:', currentVideoId);
                descriptionCache.clearCurrentDescription();
                // Process the initial video ID
                processDescriptionForVideoId();
            }
        }

        if (currentSettings?.titleTranslation) {
            const currentVideoId = watchFlexy.getAttribute('video-id');
            if (currentVideoId) {
                refreshMainTitle();
                refreshChannelName();
            }
        }

        /*mainVideoObserver.observe(watchFlexy, {
            attributes: true,
            attributeFilter: ['video-id']
        });*/
    });
}

/*function cleanupMainVideoObserver() {
    mainVideoObserver?.disconnect();
    mainVideoObserver = null;
}*/

// DESCRIPTION OBSERVERS ------------------------------------------------------------
let descriptionExpansionObserver: MutationObserver | null = null;
let descriptionContentObserver: MutationObserver | null = null;


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


let timestampClickHandler: ((event: MouseEvent) => void) | null = null;

function setupTimestampClickObserver(): void {
    // Clean up existing handler first
    cleanupTimestampClickObserver();
    
    // Create new handler
    timestampClickHandler = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        
        // Check if the clicked element is a timestamp link or a child of it
        const timestampLink = target.closest('a[ynt-timestamp]');
        
        if (timestampLink instanceof HTMLElement) {
            // Prevent default navigation
            event.preventDefault();
            event.stopPropagation();
            
            // Get timestamp seconds from attribute
            const seconds = timestampLink.getAttribute('ynt-timestamp');
            
            // Scroll to the top of the page for better user experience
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
            
            // Create timestamp data object
            const timestampData = {
                seconds: seconds
            };
            
            // Create and inject script with timestamp data
            const script = document.createElement('script');
            script.src = browser.runtime.getURL('dist/content/scripts/timestampScript.js');
            script.setAttribute('ynt-timestamp-event', JSON.stringify(timestampData));
            document.documentElement.appendChild(script);
            
            // Remove script after execution
            setTimeout(() => {
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                }
            }, 100);
        }
    };
    
    // Add the event listener
    document.addEventListener('click', timestampClickHandler);
    
    //descriptionLog('Timestamp click observer setup completed');
}

function cleanupTimestampClickObserver(): void {
    if (timestampClickHandler) {
        document.removeEventListener('click', timestampClickHandler);
        timestampClickHandler = null;
    }
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
        waitForFilledVideoTitles().then(() => {
            refreshBrowsingVideos();
            refreshShortsAlternativeFormat();
        });
        homeObserver = new MutationObserver(() => {
            const now = Date.now();
            if (now - lastHomeRefresh >= THROTTLE_DELAY) {
                browsingTitlesLog(`${pageName} page mutation detected`);
                refreshBrowsingVideos();
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

function recommendedVideosObserver() {
    cleanupRecommendedVideosObserver();

    // Observer for recommended videos (side bar)
    waitForElement('#secondary-inner ytd-watch-next-secondary-results-renderer #items').then((contents) => {
        browsingTitlesLog('Setting up recommended videos observer');
        
        waitForFilledVideoTitles().then(() => {
            refreshBrowsingVideos();
        });
        
        // Check if we need to observe deeper (when logged in)
        const itemSection = contents.querySelector('ytd-item-section-renderer');
        const targetElement = itemSection ? itemSection : contents;
        
        browsingTitlesLog(`Observing: ${targetElement === contents ? '#items directly' : 'ytd-item-section-renderer inside #items'}`);
        
        recommendedObserver = new MutationObserver(() => {
            const now = Date.now();
            if (now - lastRecommendedRefresh >= THROTTLE_DELAY) {
                browsingTitlesLog('Recommended videos mutation detected (side bar)');
                refreshBrowsingVideos().then(() => {
                    setTimeout(() => {
                        refreshBrowsingVideos();
                    }, 1000);
                    setTimeout(() => {
                        refreshBrowsingVideos();
                    }, 2000);
            });
                lastRecommendedRefresh = now;
            }
        });
        
        recommendedObserver.observe(targetElement, {
            childList: true,
            subtree: true
        });
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

        waitForFilledVideoTitles().then(() => {
            refreshBrowsingVideos();
            refreshShortsAlternativeFormat();
        });
        
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
                            
                            refreshShortsAlternativeFormat();
                            refreshBrowsingVideos().then(() => {
                                setTimeout(() => {
                                    refreshBrowsingVideos();
                                    refreshShortsAlternativeFormat();
                                }, 1000);
                                setTimeout(() => {
                                    refreshBrowsingVideos();
                                    refreshShortsAlternativeFormat();
                                }, 2000);
                            });

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
        waitForFilledVideoTitles().then(() => {
            refreshBrowsingVideos();
        });
        playlistObserver = new MutationObserver(() => {
            const now = Date.now();
            if (now - lastPlaylistRefresh >= THROTTLE_DELAY) {
                browsingTitlesLog('Playlist/Queue mutation detected');
                refreshBrowsingVideos();
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
    cleanupRecommendedVideosObserver();
    cleanupSearchResultsVideosObserver();
    cleanupPlaylistVideosObserver();
};

function cleanupPageVideosObserver() {
    homeObserver?.disconnect();
    homeObserver = null;
    lastHomeRefresh = 0;
}

function cleanupRecommendedVideosObserver() {
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
    */
}

function handleUrlChange() {
    //coreLog(`[URL] Current pathname:`, window.location.pathname);
    coreLog(`[URL] Full URL:`, window.location.href);
    
    // --- Clean up existing observers
    cleanupMainTitleContentObserver();
    cleanupIsEmptyObserver();
    cleanupPageTitleObserver();
    cleanupEmbedTitleContentObserver();
    cleanupMiniplayerTitleContentObserver();

    cleanupChannelNameContentObserver();
    
    cleanupAllBrowsingTitlesObservers();
    cleanupAllBrowsingTitlesElementsObservers();

    cleanupDescriptionObservers();
    cleanupTimestampClickObserver();
    
    cleanupChaptersObserver();

    cleanupAllSearchDescriptionsObservers();
    
    //coreLog('Observers cleaned up');

    
    if (currentSettings?.titleTranslation) {
        setTimeout(() => {
            refreshBrowsingVideos();
            refreshShortsAlternativeFormat();
        }, 2000);
        setTimeout(() => {
            refreshBrowsingVideos();
            refreshShortsAlternativeFormat();
        }, 5000);
        setTimeout(() => {
            refreshBrowsingVideos();
            refreshShortsAlternativeFormat();
        }, 10000);
        
        // Handle miniplayer titles on all pages (since miniplayer can appear from any page)
        refreshMiniplayerTitle();
        setTimeout(() => refreshMiniplayerTitle(), 1000);
        setTimeout(() => refreshMiniplayerTitle(), 3000);
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
            if (currentSettings?.titleTranslation) {
                searchResultsObserver();
                refreshBrowsingVideos();
                refreshShortsAlternativeFormat();
            } 

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
            if (currentSettings?.titleTranslation || currentSettings?.descriptionTranslation) {
                setupMainVideoObserver();
            };
            currentSettings?.titleTranslation && recommendedVideosObserver();
            currentSettings?.descriptionTranslation && setupTimestampClickObserver();
            
            // Handle fullscreen titles (embed titles are specific to /watch pages)
            if (currentSettings?.titleTranslation) {
                refreshEmbedTitle();
                //Delayed call as backup (immediat call doesn't always work)
                setTimeout(() => refreshEmbedTitle(), 1000);
                setTimeout(() => refreshEmbedTitle(), 3000);
            }
            break;
        case '/embed': // --- Embed video page
            coreLog(`[URL] Detected embed video page`);
            break;
    }
}

// --- Visibility change listener to refresh titles when tab becomes visible
let visibilityChangeListener: ((event: Event) => void) | null = null;

function setupVisibilityChangeListener(): void {
    // Clean up existing listener first
    cleanupVisibilityChangeListener();
    
    coreLog('Setting up visibility change listener');
    
    visibilityChangeListener = () => {
        // Only execute when tab becomes visible again
        if (document.visibilityState === 'visible') {
            coreLog('Tab became visible, refreshing titles to fix potential duplicates');
            
            // Refresh titles to fix any potentially duplicated titles
            if (currentSettings?.titleTranslation) {
                refreshBrowsingVideos();
                refreshShortsAlternativeFormat();
            }
        }
    };
    
    // Add the event listener
    document.addEventListener('visibilitychange', visibilityChangeListener);
}

function cleanupVisibilityChangeListener(): void {
    if (visibilityChangeListener) {
        document.removeEventListener('visibilitychange', visibilityChangeListener);
        visibilityChangeListener = null;
    }
}