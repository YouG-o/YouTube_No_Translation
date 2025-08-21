/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { subtitlesLog, coreLog } from '../../utils/logger';
import { ExtensionSettings } from '../../types/types';


async function syncSubtitlesLanguagePreference() {
    try {
        const result = await browser.storage.local.get('settings');
        const settings = result.settings as ExtensionSettings;
        
        if (settings?.subtitlesTranslation?.language) {
            localStorage.setItem('ynt-subtitlesLanguage', settings.subtitlesTranslation.language);
            // Sync ASR enabled setting
            const asrEnabled = settings.subtitlesTranslation.asrEnabled || false;
            localStorage.setItem('ynt-subtitlesAsrEnabled', asrEnabled.toString());
            //subtitlesLog(`Synced subtitle language preference from extension storage: ${settings.subtitlesTranslation.language}`);
        }
    } catch (error) {
        subtitlesLog('Error syncing subtitle language preference:', error);
    }
}

// Call this function during initialization
export async function handleSubtitlesTranslation() {   
    //subtitlesLog('Initializing subtitles translation prevention');
    await syncSubtitlesLanguagePreference(); // Sync language preference
    const script = document.createElement('script');
    script.src = browser.runtime.getURL('dist/content/scripts/subtitlesScript.js');
    document.documentElement.appendChild(script);
}

// Function to handle subtitle language selection
browser.runtime.onMessage.addListener((message: unknown) => {
    coreLog('Received message:', message); // Add debug log
    
    if (typeof message === 'object' && message !== null &&
        'feature' in message && typeof message.feature === 'string') {
        
        // Handle subtitle language changes
        if (message.feature === 'subtitlesLanguage' &&
            'language' in message && typeof message.language === 'string') {
            
            subtitlesLog(`Setting subtitle language preference to: ${message.language}`);
            localStorage.setItem('ynt-subtitlesLanguage', message.language);
            handleSubtitlesTranslation();
        }
        
        // Handle ASR subtitle setting changes
        if (message.feature === 'asrSubtitles' &&
            'isEnabled' in message && typeof message.isEnabled === 'boolean') {
            
            subtitlesLog(`Setting ASR subtitles enabled to: ${message.isEnabled}`);
            localStorage.setItem('ynt-subtitlesAsrEnabled', message.isEnabled.toString());
            handleSubtitlesTranslation();
        }
        
        // Handle general subtitles toggle changes
        if (message.feature === 'subtitles') {
            subtitlesLog('Subtitles setting changed, syncing preferences');
            syncSubtitlesLanguagePreference();
            handleSubtitlesTranslation();
        }
    }
    return true;
});