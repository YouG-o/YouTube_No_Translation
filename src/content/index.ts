/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */



coreLog('Content script starting to load...');

let currentSettings: ExtensionSettings | null = null;

// Fetch settings once and store them in currentSettings
async function fetchSettings() {
    const data = await browser.storage.local.get('settings');
    currentSettings = data.settings as ExtensionSettings;
};

// Helper functions to detect if we're on an embed video (like youtube-nocookie.com)
function isEmbedVideo(): boolean {
    return window.location.pathname.startsWith('/embed/');
}


// Initialize features based on settings
async function initializeFeatures() {
    await fetchSettings();
    
    setupUrlObserver();

    setupVisibilityChangeListener();
    
    if (isEmbedVideo()) {
        coreLog('Embed video detected;');
    }

    currentSettings?.titleTranslation && initializeTitleTranslation();

    currentSettings?.audioTranslation?.enabled && initializeAudioTranslation();

    currentSettings?.descriptionTranslation && initializeDescriptionTranslation();

    currentSettings?.subtitlesTranslation?.enabled && initializeSubtitlesTranslation();

}

// Initialize functions
let videoPlayerListenerInitialized = false;

function initializeVideoPlayerListener() {
    if (!videoPlayerListenerInitialized && (currentSettings?.audioTranslation?.enabled || currentSettings?.subtitlesTranslation?.enabled)) {
        setupVideoPlayerListener();
        videoPlayerListenerInitialized = true;
    }
}

let mainVideoObserverInitialized = false;

function initializeMainVideoObserver() {
    if (!mainVideoObserverInitialized && (currentSettings?.titleTranslation || currentSettings?.descriptionTranslation)) {
        setupMainVideoObserver();
        mainVideoObserverInitialized = true;
    }
}

function initializeTitleTranslation() {
    titlesLog('Initializing title translation prevention');
    
    if (isEmbedVideo()) {
        initializeVideoPlayerListener();
        return;
    }
    
    //initializeMainVideoObserver();
}

function initializeAudioTranslation() {
    audioLog('Initializing audio translation prevention');
    
    initializeVideoPlayerListener();
};

function initializeDescriptionTranslation() {
    if (isEmbedVideo()) {
        return;
    }
    
    descriptionLog('Initializing description translation prevention');
    
    //initializeMainVideoObserver();
};

function initializeSubtitlesTranslation() {
    subtitlesLog('Initializing subtitles translation prevention');

    initializeVideoPlayerListener();
};

browser.runtime.onMessage.addListener((message: unknown) => {
    if (isToggleMessage(message)) {
        switch(message.feature) {
            case 'audio':
                if (message.isEnabled) {
                    handleAudioTranslation();

                    initializeVideoPlayerListener();                    
                }
                break;
            case 'titles':
                if (message.isEnabled) {
                    refreshMainTitle();
                    refreshBrowsingVideos();
                    refreshShortsAlternativeFormat();
                    
                    initializeMainVideoObserver();
                }
                break;
            case 'description':
                if (message.isEnabled) {
                    refreshDescription();

                    initializeMainVideoObserver();
                }
                break;
            case 'subtitles':
                if (message.isEnabled) {
                    handleSubtitlesTranslation();

                    initializeVideoPlayerListener();
                }
                break;
        }
        return true;
    }
    return true;
});


// Start initialization
initializeFeatures();