/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

async function syncSubtitlesLanguagePreference() {
    try {
        const result = await browser.storage.local.get('settings');
        const settings = result.settings as ExtensionSettings;
        
        if (settings?.subtitlesLanguage) {
            localStorage.setItem('ynt-subtitlesLanguage', settings.subtitlesLanguage);
            //subtitlesLog(`Synced subtitle language preference from extension storage: ${settings.subtitlesLanguage}`);
        }
    } catch (error) {
        subtitlesLog('Error syncing subtitle language preference:', error);
    }
}

// Call this function during initialization
async function handleSubtitlesTranslation() {   
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
        'feature' in message && message.feature === 'subtitlesLanguage' &&
        'language' in message && typeof message.language === 'string') {
        
        // Store preference directly without JSON.stringify
        subtitlesLog(`Setting subtitle language preference to: ${message.language}`);
        localStorage.setItem('ynt-subtitlesLanguage', message.language);
        
        // Reapply subtitles if a video is currently playing
        handleSubtitlesTranslation();
    }
    return true;
});