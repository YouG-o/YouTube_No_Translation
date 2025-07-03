/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { currentSettings } from "../index";

import { handleAudioTranslation } from "../audio/audioIndex";
import { refreshEmbedTitle } from "../titles/mainTitle";
import { handleSubtitlesTranslation } from "../subtitles/subtitlesIndex";


/**
 * Apply configured translation settings for video loads
 * Handles audio, subtitles, and embed title translations
 */
export function applyVideoPlayerSettings(): void {
    currentSettings?.audioTranslation && handleAudioTranslation();
    currentSettings?.subtitlesTranslation && handleSubtitlesTranslation();
    
    if (currentSettings?.titleTranslation) {
        setTimeout(() => {
            refreshEmbedTitle();                       
        }, 1000);
    }
}