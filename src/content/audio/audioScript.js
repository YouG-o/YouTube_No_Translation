/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 
* NOTE ON SCRIPT INJECTION :
 * We use script injection to access YouTube's player API directly from the page context.
 * This is necessary because the player API is not accessible from the content script context.
 * As you can see down below, the injected code only uses YouTube's official player API methods.
*/

/**
 * Handles YouTube's audio track selection to force preferred language
 * 
 * YouTube stores audio tracks in a specific format:
 * - Each track has an ID in the format: "251;BASE64_ENCODED_DATA"
 * - The BASE64_ENCODED_DATA contains track information including language code
 * - Track data is encoded as: "acont" (audio content) + "original"/"dubbed-auto" + "lang=XX-XX"
 * - Original track can be identified by "original" in its decoded data
 * 
 * Example of track ID:
 * "251;ChEKBWFjb250EghvcmlnaW5hbAoNCgRsYW5nEgVlbi1VUw"
 * When decoded: Contains "original" for original audio and "lang=en-US" for language
 * 
 * Note on implementation choice:
 * - We use base64 decoding to directly identify original tracks rather than UI text matching
 * - This approach is independent of YouTube's interface language
 * - Provides consistent behavior across all language interfaces
 */

(() => {
    const LOG_PREFIX = '[YNT]';
    const LOG_STYLES = {
        AUDIO: { context: '[AUDIO]', color: '#4CAF50' }
    };

    function createLogger(category) {
        return (message, ...args) => {
            console.log(
                `%c${LOG_PREFIX}${category.context} ${message}`,
                `color: ${category.color}`,
                ...args
            );
        };
    }

    // Create error logger function
    const ERROR_COLOR = '#F44336';  // Red

    function createErrorLogger(category) {
        return (message, ...args) => {
            console.log(
                `%c${LOG_PREFIX}${category.context} %c${message}`,
                `color: ${category.color}`,  // Keep category color for prefix
                `color: ${ERROR_COLOR}`,     // Red color for error message
                ...args
            );
        };
    }

    const audioLog = createLogger(LOG_STYLES.AUDIO);
    const audioErrorLog = createErrorLogger(LOG_STYLES.AUDIO);

    let retryCount = 0;
    const MAX_RETRIES = 5;
    
    function setPreferredTrack() {
        // Try to get the specified player
        let targetId = 'movie_player'; // player for regular videos
        if (window.location.pathname.startsWith('/shorts')) {
            targetId = 'shorts-player'; // player for shorts
        } else if (window.location.pathname.startsWith('/@')) {
            targetId = 'c4-player'; // player for channels main video
        } 
        const player = document.getElementById(targetId);
        //audioLog(`Player is ${targetId}`);
        if (!player) return false;

        try {
            const audioLanguage = localStorage.getItem('audioLanguage') || 'original';
            //audioLog(`Using preferred language: ${audioLanguage}`);

            const tracks = player.getAvailableAudioTracks();
            
            // Skip processing if there's only one audio track available
            if (tracks.length <= 1) {
                audioLog('Only one audio track available, no change needed');
                return true;
            }
            
            const currentTrack = player.getAudioTrack();

            // First check if current track is already what we want
            if (currentTrack) {
                const base64Part = currentTrack.id.split(';')[1];
                const decoded = atob(base64Part);

                if (audioLanguage === 'original') {
                    // For original language preference
                    if (decoded.includes('original')) {
                        audioLog('Audio track is already original');
                        return true;
                    }
                } else {
                    // For specific language preference
                    const langMatch = decoded.match(/lang..([-a-zA-Z]+)/);
                    const trackLangCode = langMatch ? langMatch[1].split('-')[0] : null;
                    if (trackLangCode === audioLanguage) {
                        audioLog('Audio already in preferred language');
                        return true;
                    }
                }
            }

            // Need to change track - find the right one
            if (audioLanguage === 'original') {
                const originalTrack = tracks.find(track => {
                    const base64Part = track.id.split(';')[1];
                    const decoded = atob(base64Part);
                    return decoded.includes('original');
                });
                
                if (originalTrack) {
                    const base64Part = originalTrack.id.split(';')[1];
                    const decoded = atob(base64Part);
                    const langMatch = decoded.match(/lang..([-a-zA-Z]+)/);
                    
                    const langCode = langMatch ? langMatch[1].split('-')[0] : 'unknown';
                    
                    audioLog('Setting audio to original language: ' + langCode);
                    player.setAudioTrack(originalTrack);
                    return true;
                }
            } else {
                const preferredTrack = tracks.find(track => {
                    const base64Part = track.id.split(';')[1];
                    const decoded = atob(base64Part);
                    const langMatch = decoded.match(/lang..([-a-zA-Z]+)/);
                    if (!langMatch) return false;
                    const trackLangCode = langMatch[1].split('-')[0];
                    return trackLangCode === audioLanguage;
                });

                if (preferredTrack) {
                    audioLog('Setting audio to preferred language: ' + audioLanguage);
                    player.setAudioTrack(preferredTrack);
                    return true;
                }
                audioLog(`Selected language "${audioLanguage}" not available`);
            }
            
            return false;
        } catch (error) {
            //audioErrorLog(`${error.name}: ${error.message}`);
            // Implement fallback mechanism with progressive delay
            if (retryCount < MAX_RETRIES) {
                retryCount++;
                const delay = 50 * retryCount;
                //audioLog(`Retrying in ${delay}ms (attempt ${retryCount}/${MAX_RETRIES})...`);
                
                setTimeout(() => {
                    setPreferredTrack();
                }, delay);
            } else {
                //audioErrorLog(`Failed after ${MAX_RETRIES} retries`);
                retryCount = 0;
            }
            
            return false;
        }
    }

    // Initial call
    setPreferredTrack();
})();