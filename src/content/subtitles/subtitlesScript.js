/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
*/

/**
 * NOTE ON SCRIPT INJECTION:
 * We use script injection to access YouTube's player API directly from the page context.
 * This is necessary because the player API is not accessible from the content script context.
 * As you can see below, the injected code only uses YouTube's official player API methods.
 */


/**
 * Handles YouTube's subtitles selection to force original language
 * 
 * YouTube provides different types of subtitle tracks:
 * - Manual tracks: Can be original language or translated
 * - ASR (Automatic Speech Recognition) tracks: Always in original video language
 * - Translated tracks: Generated from ASR track
 * 
 * Strategy to get original subtitles track:
 * 1. Find ASR track to determine original video language
 * 2. Look for manual track in same language (matching base language code)
 * 3. Apply original language track if found
 */


(() => {
    const LOG_PREFIX = '[YNT]';
    const LOG_CONTEXT = '[SUBTITLES]';
    const LOG_COLOR = '#FF9800';  // Orange
    const ERROR_COLOR = '#F44336';  // Red

    function isDevLogEnabled() {
        return localStorage.getItem('ynt-devLog') === 'true';
    }

    function log(message, ...args) {
        if (!isDevLogEnabled()) return;
        console.log(
            `%c${LOG_PREFIX}${LOG_CONTEXT} ${message}`,
            `color: ${LOG_COLOR}`,
            ...args
        );
    }

    function errorLog(message, ...args) {
        if (!isDevLogEnabled()) return;
        console.log(
            `%c${LOG_PREFIX}${LOG_CONTEXT} %c${message}`,
            `color: ${LOG_COLOR}`,
            `color: ${ERROR_COLOR}`,
            ...args
        );
    }

    /**
     * Extracts the base language code from a language code
     * Examples: "en-US" -> "en", "fr-CA" -> "fr", "en" -> "en"
     */
    function getBaseLanguageCode(languageCode) {
        return languageCode ? languageCode.split('-')[0] : '';
    }

    /**
     * Checks if two language codes match (comparing base language codes)
     */
    function languageCodesMatch(code1, code2) {
        return getBaseLanguageCode(code1) === getBaseLanguageCode(code2);
    }

    let retryCount = 0;
    const MAX_RETRIES = 5;

    function setPreferredSubtitles() {
        // Try to get the specified player
        let targetId = 'movie_player'; // player for regular videos
        if (window.location.pathname.startsWith('/shorts')) {
            targetId = 'shorts-player'; // player for shorts
        } else if (window.location.pathname.startsWith('/@')) {
            targetId = 'c4-player'; // player for channels main video
        }

        const player = document.getElementById(targetId);
        if (!player) return false;

        try {
            // Get language preference from localStorage
            const subtitlesLanguage = localStorage.getItem('ynt-subtitlesLanguage') || 'original';
            const asrEnabled = localStorage.getItem('ynt-subtitlesAsrEnabled') === 'true';

            // Get current active track
            const currentTrack = player.getOption('captions', 'track');

            // Check if subtitles are disabled
            if (subtitlesLanguage === 'disabled') {
                // Skip if already disabled (empty track)
                if (!currentTrack || !currentTrack.languageCode) {
                    log('Subtitles are already disabled');
                    return true;
                }
                log('Subtitles are disabled, disabling subtitles');
                player.setOption('captions', 'track', {});
                return true;
            }

            // Get video response to access caption tracks
            const response = player.getPlayerResponse();
            const captionTracks = response.captions?.playerCaptionsTracklistRenderer?.captionTracks;

            if (!captionTracks) {
                throw new Error('Caption tracks not available');
            }

            // If preference is "original", look for original language
            if (subtitlesLanguage === 'original') {
                const asrTrack = captionTracks.find(track => track.kind === 'asr');

                if (!asrTrack) {
                    // Fallback: if there's only one subtitle track, assume it's the original
                    if (captionTracks.length === 1) {
                        const singleTrack = captionTracks[0];
                        // Skip if already on this track
                        if (currentTrack && languageCodesMatch(currentTrack.languageCode, singleTrack.languageCode) && !currentTrack.kind && !currentTrack.translationLanguage) {
                            log(`Subtitles already set to original (manual): "${singleTrack.name.simpleText}" [${singleTrack.languageCode}]`);
                            return true;
                        }
                        log(`Only subtitle track found is manual, assuming it's original: "${singleTrack.name.simpleText}" [${singleTrack.languageCode}]`);
                        player.setOption('captions', 'track', singleTrack);
                        return true;
                    }

                    log('Cannot determine original language, disabling subtitles');
                    player.setOption('captions', 'track', {});
                    return true;
                }

                // Find manual track in original language
                const originalTrack = captionTracks.find(track =>
                    languageCodesMatch(track.languageCode, asrTrack.languageCode) && !track.kind
                );

                if (originalTrack) {
                    // Skip if already on this track
                    if (currentTrack && languageCodesMatch(currentTrack.languageCode, originalTrack.languageCode) && !currentTrack.kind && !currentTrack.translationLanguage) {
                        log(`Subtitles already set to original language (manual): "${originalTrack.name.simpleText}" [${originalTrack.languageCode}]`);
                        return true;
                    }
                    log(`Setting subtitles to original language (manual): "${originalTrack.name.simpleText}" [${originalTrack.languageCode}]`);
                    player.setOption('captions', 'track', originalTrack);
                    return true;
                }

                if (!asrEnabled) {
                    log('No manual track in original language, disabling subtitles (ASR disabled)');
                    player.setOption('captions', 'track', {});
                    return true;
                }

                // Skip if already on ASR track
                if (
                    currentTrack &&
                    languageCodesMatch(currentTrack.languageCode, asrTrack.languageCode) &&
                    currentTrack.kind === 'asr' &&
                    !currentTrack.translationLanguage
                ) {
                    log(`Subtitles already set to ASR: "${asrTrack.name.simpleText}"`);
                    return true;
                }

                log(`Using original ASR track: "${asrTrack.name.simpleText}"`);
                player.setOption('captions', 'track', asrTrack);
                return true;
            }

            // For specific language preference
            const languageTrack = captionTracks.find(track =>
                languageCodesMatch(track.languageCode, subtitlesLanguage) && !track.kind
            );

            if (languageTrack) {
                // Skip if already on this track
                if (currentTrack && languageCodesMatch(currentTrack.languageCode, subtitlesLanguage) && !currentTrack.kind && !currentTrack.translationLanguage) {
                    log(`Subtitles already set to selected language: "${languageTrack.name.simpleText}" [${languageTrack.languageCode}]`);
                    return true;
                }
                log(`Setting subtitles to selected language: "${languageTrack.name.simpleText}" [${languageTrack.languageCode}]`);
                player.setOption('captions', 'track', languageTrack);
                return true;
            }

            if (!asrEnabled) {
                log(`Selected language "${subtitlesLanguage}" not available, disabling subtitles (ASR disabled)`);
                player.setOption('captions', 'track', {});
                return true;
            }

            const asrTrack = captionTracks.find(track => track.kind === 'asr');
            if (!asrTrack) {
                log(`Selected language "${subtitlesLanguage}" not available and no ASR track found, disabling subtitles`);
                player.setOption('captions', 'track', {});
                return true;
            }

            if (languageCodesMatch(asrTrack.languageCode, subtitlesLanguage)) {
                // Skip if already on this ASR track
                if (
                    currentTrack &&
                    languageCodesMatch(currentTrack.languageCode, subtitlesLanguage) &&
                    currentTrack.kind === 'asr' &&
                    !currentTrack.translationLanguage
                ) {
                    log(`Subtitles already set to ASR track in target language: "${asrTrack.name.simpleText}"`);
                    return true;
                }
                log(`Using ASR track in target language: "${asrTrack.name.simpleText}"`);
                player.setOption('captions', 'track', asrTrack);
                return true;
            }

            log(`Attempting ASR translation from "${asrTrack.languageCode}" to "${subtitlesLanguage}"`);

            // Check if the translated ASR track is already active
            // This handles cases like "English (auto-generated) >> French" being active
            if (currentTrack && currentTrack.kind === 'asr' && currentTrack.translationLanguage && languageCodesMatch(currentTrack.translationLanguage.languageCode, subtitlesLanguage)) {
                log(`Subtitles already set to translated ASR track: "${asrTrack.name.simpleText}" translated to "${subtitlesLanguage}"`);
                return true;
            }

            const translatedTrack = {
                ...asrTrack,
                translationLanguage: {
                    languageCode: subtitlesLanguage,
                    languageName: subtitlesLanguage
                }
            };

            player.setOption('captions', 'track', translatedTrack);
            return true;

        } catch (error) {
            if (error.message !== 'Caption tracks not available') {
                errorLog(`Error in setPreferredSubtitles: ${error.name}: ${error.message}`);
            }

            // Simple retry
            if (retryCount < MAX_RETRIES) {
                retryCount++;
                const delay = 200 * retryCount;

                setTimeout(() => {
                    setPreferredSubtitles();
                }, delay);
            } else {
                errorLog(`Failed after ${MAX_RETRIES} retries`);
                retryCount = 0;
            }

            return false;
        }
    }

    setPreferredSubtitles();
})();