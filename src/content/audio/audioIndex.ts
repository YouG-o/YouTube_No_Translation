/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { ExtensionSettings } from "../../types/types";
import { audioLog, audioErrorLog } from '../../utils/logger';


async function syncAudioLanguagePreference() {
    try {
        const result = await browser.storage.local.get('settings');
        const settings = result.settings as ExtensionSettings;
        
        if (settings?.audioTranslation?.language) {
            localStorage.setItem('ynt-audioLanguage', settings.audioTranslation.language);
        }
    } catch (error) {
        audioErrorLog('Error syncing audio language preference:', error);
    }
}

export async function handleAudioTranslation() {   
    await syncAudioLanguagePreference();
    const script = document.createElement('script');
    script.src = browser.runtime.getURL('dist/content/scripts/audioScript.js');
    document.documentElement.appendChild(script);
}

// Function to handle audio language selection
browser.runtime.onMessage.addListener((message: unknown) => {
    if (typeof message === 'object' && message !== null &&
        'feature' in message && message.feature === 'audioLanguage' &&
        'language' in message && typeof message.language === 'string') {
        
        audioLog(`Setting audio language preference to: ${message.language}`);
        localStorage.setItem('ynt-audioLanguage', message.language);
        
        // Reapply audio if a video is currently playing
        handleAudioTranslation();
    }
    return true;
});