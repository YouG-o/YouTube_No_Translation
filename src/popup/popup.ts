/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { ExtensionSettings, Message, ToggleConfig } from "../types/types";
import { DEFAULT_SETTINGS } from "../config/constants";


const titleToggle = document.getElementById('titleTranslation') as HTMLInputElement;
const originalThumbnailsToggle = document.getElementById('originalThumbnails') as HTMLInputElement;
const audioToggle = document.getElementById('audioTranslation') as HTMLInputElement;
const audioLanguageSelect = document.getElementById('audioLanguage') as HTMLSelectElement;
const descriptionToggle = document.getElementById('descriptionTranslation') as HTMLInputElement;
const subtitlesToggle = document.getElementById('subtitlesTranslation') as HTMLInputElement;
const subtitlesLanguageSelect = document.getElementById('subtitlesLanguage') as HTMLSelectElement;
const asrSubtitlesToggle = document.getElementById('asrSubtitlesEnabled') as HTMLInputElement;
const asrToggleContainer = document.getElementById('asrToggleContainer') as HTMLDivElement;
const extensionVersionElement = document.getElementById('extensionVersion') as HTMLSpanElement;
const youtubeDataApiToggle = document.getElementById('youtubeDataApiEnabled') as HTMLInputElement;
const youtubeDataApiKeyInput = document.getElementById('youtubeDataApiKey') as HTMLInputElement;
const youtubeApiKeyContainer = document.getElementById('youtubeApiKeyContainer') as HTMLDivElement;
const clearCacheBtn = document.getElementById('clearCacheBtn') as HTMLButtonElement;

// Extra settings collapsible section - only exists in popup
const extraSettingsToggle = document.getElementById('extraSettingsToggle') as HTMLDivElement;
const extraSettingsContent = document.getElementById('extraSettingsContent') as HTMLDivElement;
const extraSettingsArrow = document.getElementById('extraSettingsArrow');

// Function to display the extension version
function displayExtensionVersion() {
    if (extensionVersionElement) {
        const manifest = browser.runtime.getManifest();
        extensionVersionElement.textContent = manifest.version;
    }
}

// Function to toggle extra settings section
function toggleExtraSettings() {
    if (!extraSettingsContent || !extraSettingsArrow) return;

    const isHidden = extraSettingsContent.classList.contains('hidden');
    if (isHidden) {
        extraSettingsContent.classList.remove('hidden');
        extraSettingsArrow.style.transform = 'rotate(180deg)';
        adjustTooltipPositions();
    } else {
        extraSettingsContent.classList.add('hidden');
        extraSettingsArrow.style.transform = 'rotate(0deg)';
    }
}

// Function to update ASR toggle visibility
function updateAsrToggleVisibility() {
    if (!asrToggleContainer) return;
    
    const subtitlesEnabled = subtitlesToggle.checked;
    const selectedLanguage = subtitlesLanguageSelect.value;
    const shouldShow = subtitlesEnabled && selectedLanguage !== 'disabled';
    
    asrToggleContainer.style.display = shouldShow ? 'block' : 'none';
}

// Initialize toggle states from storage
document.addEventListener('DOMContentLoaded', async () => {
    displayExtensionVersion();
    try {
        const data = await browser.storage.local.get('settings');
        
        // Default values for missing properties
        const defaultSettings = DEFAULT_SETTINGS;

        let settings: ExtensionSettings;
        let needsUpdate = false;

        if (!data.settings) {
            // No settings at all, use complete defaults
            settings = defaultSettings;
            needsUpdate = true;
        } else {
            // Start with existing settings
            settings = { ...data.settings } as ExtensionSettings;
            
            // Function to check and add missing properties recursively
            function ensureProperty(obj: any, defaultObj: any, path: string = ''): boolean {
                let updated = false;
                
                for (const key in defaultObj) {
                    const currentPath = path ? `${path}.${key}` : key;
                    
                    if (obj[key] === undefined) {
                        obj[key] = defaultObj[key];
                        console.log(`[YNT] Added missing property: ${currentPath}`);
                        updated = true;
                    } else if (typeof defaultObj[key] === 'object' && defaultObj[key] !== null && !Array.isArray(defaultObj[key])) {
                        // Recursively check nested objects
                        if (typeof obj[key] !== 'object' || obj[key] === null) {
                            obj[key] = defaultObj[key];
                            console.log(`[YNT] Fixed invalid property type: ${currentPath}`);
                            updated = true;
                        } else {
                            const nestedUpdated = ensureProperty(obj[key], defaultObj[key], currentPath);
                            if (nestedUpdated) updated = true;
                        }
                    }
                }
                
                return updated;
            }
            
            needsUpdate = ensureProperty(settings, defaultSettings);
        }

        // Save updated settings if any properties were missing
        if (needsUpdate) {
            await browser.storage.local.set({ settings });
            console.log('[YNT] Updated settings with missing properties');
        }

        // Apply settings to UI elements
        titleToggle.checked = settings.titleTranslation;
        originalThumbnailsToggle.checked = settings.originalThumbnails.enabled;
        audioToggle.checked = settings.audioTranslation.enabled;
        audioLanguageSelect.value = settings.audioTranslation.language;
        descriptionToggle.checked = settings.descriptionTranslation;
        subtitlesToggle.checked = settings.subtitlesTranslation.enabled;
        subtitlesLanguageSelect.value = settings.subtitlesTranslation.language;
        asrSubtitlesToggle.checked = settings.subtitlesTranslation.asrEnabled;
        youtubeDataApiToggle.checked = settings.youtubeDataApi.enabled;
        youtubeDataApiKeyInput.value = settings.youtubeDataApi.apiKey;
        
        // Update ASR toggle visibility based on current settings
        updateAsrToggleVisibility();
        
        // Show/hide API key input based on toggle state
        if (youtubeDataApiToggle.checked && youtubeApiKeyContainer && youtubeApiKeyContainer.style.display !== undefined) {
            youtubeApiKeyContainer.style.display = 'block';
        }
        
        console.log(
            '[YNT] Settings loaded - Title translation prevention is: %c%s',
            settings.titleTranslation ? 'color: green; font-weight: bold' : 'color: red; font-weight: bold',
            settings.titleTranslation ? 'ON' : 'OFF'
        );
        console.log(
            '[YNT] Settings loaded - Original thumbnails is: %c%s',
            settings.originalThumbnails.enabled ? 'color: green; font-weight: bold' : 'color: red; font-weight: bold',
            settings.originalThumbnails.enabled ? 'ON' : 'OFF'
        );
        console.log(
            '[YNT] Settings loaded - Audio translation prevention is: %c%s',
            settings.audioTranslation.enabled ? 'color: green; font-weight: bold' : 'color: red; font-weight: bold',
            settings.audioTranslation.enabled ? 'ON' : 'OFF'
        );
        console.log(
            '[YNT] Settings loaded - Description translation prevention is: %c%s',
            settings.descriptionTranslation ? 'color: green; font-weight: bold' : 'color: red; font-weight: bold',
            settings.descriptionTranslation ? 'ON' : 'OFF'
        );
        console.log(
            '[YNT] Settings loaded - Subtitles translation prevention is: %c%s',
            settings.subtitlesTranslation.enabled ? 'color: green; font-weight: bold' : 'color: red; font-weight: bold',
            settings.subtitlesTranslation.enabled ? 'ON' : 'OFF'
        );
    } catch (error) {
        console.error('Load error:', error);
    }
});

// Check if this is a welcome page (first install)
const urlParams = new URLSearchParams(window.location.search);
const isWelcome = urlParams.get('welcome') === 'true';

if (isWelcome) {
    const pageTitle = document.getElementById('pageTitle');
    const welcomeMessage = document.getElementById('welcomeMessage');
    
    if (pageTitle) {
        // Keep the image and change only the text part
        const imgElement = pageTitle.querySelector('img');
        if (imgElement) {
            pageTitle.innerHTML = '';
            pageTitle.appendChild(imgElement);
            pageTitle.appendChild(document.createTextNode('Welcome to YouTube No Translation!'));
        }
    }
    
    if (welcomeMessage) {
        welcomeMessage.classList.remove('hidden');
    }
}

// Handle extra settings toggle click - only if element exists
if (extraSettingsToggle) {
    extraSettingsToggle.addEventListener('click', toggleExtraSettings);
}


async function handleToggleChange(config: ToggleConfig) {
    const isEnabled = config.element.checked;
    try {
        const data = await browser.storage.local.get('settings');
        let settings = data.settings as ExtensionSettings;

        // Update property in settings object
        if (config.storagePath && config.storagePath.length > 0) {
            let obj: any = settings;
            for (let i = 0; i < config.storagePath.length - 1; i++) {
                obj = obj[config.storagePath[i] as keyof typeof obj];
            }
            obj[config.storagePath[config.storagePath.length - 1] as keyof typeof obj] = isEnabled;
        } else {
            (settings as any)[config.storageKey] = isEnabled;
        }

        await browser.storage.local.set({ settings });

        // Update UI if needed
        if (config.uiUpdate) config.uiUpdate();

        // Send message to content script (only if YouTube tab is active)
        try {
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            if (tabs[0]?.id && tabs[0]?.url) {
                // Check if current tab is YouTube
                const isYouTubeTab = tabs[0].url.includes('youtube.com') || tabs[0].url.includes('youtube-nocookie.com');
                
                if (isYouTubeTab) {
                    await browser.tabs.sendMessage(tabs[0].id, {
                        action: 'toggleTranslation',
                        feature: config.messageFeature,
                        isEnabled
                    });
                    console.log(`[YNT] Message sent to YouTube tab for ${config.messageFeature}`);
                } else {
                    console.log(`[YNT] Settings updated but not sending message (not a YouTube tab): ${tabs[0].url}`);
                }
            }
        } catch (messageError) {
            // Ignore message sending errors (content script might not be loaded)
            console.log(`[YNT] Could not send message to content script for ${config.messageFeature}:`, messageError);
        }
        console.log(`${config.storageKey} state updated`);
    } catch (error) {
        console.error(`${config.storageKey} update error:`, error);
    }
}

// Utilisation pour chaque toggle :
titleToggle.addEventListener('change', () =>
    handleToggleChange({
        element: titleToggle,
        storageKey: 'titleTranslation',
        messageFeature: 'titles'
    })
);

originalThumbnailsToggle.addEventListener('change', () =>
    handleToggleChange({
        element: originalThumbnailsToggle,
        storageKey: 'originalThumbnails',
        storagePath: ['originalThumbnails', 'enabled'],
        messageFeature: 'thumbnails'
    })
);

audioToggle.addEventListener('change', () =>
    handleToggleChange({
        element: audioToggle,
        storageKey: 'audioTranslation',
        storagePath: ['audioTranslation', 'enabled'],
        messageFeature: 'audio'
    })
);

descriptionToggle.addEventListener('change', () =>
    handleToggleChange({
        element: descriptionToggle,
        storageKey: 'descriptionTranslation',
        messageFeature: 'descriptions'
    })
);

subtitlesToggle.addEventListener('change', () =>
    handleToggleChange({
        element: subtitlesToggle,
        storageKey: 'subtitlesTranslation',
        storagePath: ['subtitlesTranslation', 'enabled'],
        messageFeature: 'subtitles',
        uiUpdate: updateAsrToggleVisibility
    })
);

asrSubtitlesToggle.addEventListener('change', () =>
    handleToggleChange({
        element: asrSubtitlesToggle,
        storageKey: 'subtitlesTranslation',
        storagePath: ['subtitlesTranslation', 'asrEnabled'],
        messageFeature: 'asrSubtitles'
    })
);

// Handle YouTube Data API toggle change
youtubeDataApiToggle.addEventListener('change', () =>
    handleToggleChange({
        element: youtubeDataApiToggle,
        storageKey: 'youtubeDataApi',
        storagePath: ['youtubeDataApi', 'enabled'],
        messageFeature: 'youtubeDataApi',
        uiUpdate: () => {
            // Show/hide API key input only if container exists and has display style
            if (youtubeApiKeyContainer && youtubeApiKeyContainer.style.display !== undefined) {
                youtubeApiKeyContainer.style.display = youtubeDataApiToggle.checked ? 'block' : 'none';
            }
        }
    })
);

// Handle subtitles language selection changes
subtitlesLanguageSelect.addEventListener('change', async () => {
    const selectedLanguage = subtitlesLanguageSelect.value;
    
    // Update ASR toggle visibility
    updateAsrToggleVisibility();
    
    // Save language preference
    try {
        const data = await browser.storage.local.get('settings');
        const settings = data.settings as ExtensionSettings;
        
        await browser.storage.local.set({
            settings: {
                ...settings,
                subtitlesTranslation: {
                    ...settings.subtitlesTranslation,
                    language: selectedLanguage
                }
            }
        });
        
        console.log('Subtitles language saved:', selectedLanguage);
        
        // Inform active tab about the change (only if YouTube)
        try {
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            if (tabs[0]?.id && tabs[0]?.url) {
                const isYouTubeTab = tabs[0].url.includes('youtube.com') || tabs[0].url.includes('youtube-nocookie.com');
                
                if (isYouTubeTab) {
                    await browser.tabs.sendMessage(tabs[0].id, {
                        feature: 'subtitlesLanguage',
                        language: selectedLanguage
                    });
                }
            }
        } catch (messageError) {
            console.log('[YNT] Could not send language change message:', messageError);
        }
    } catch (error) {
        console.error('Failed to save subtitles language:', error);
    }
});

// Handle audio language selection changes
audioLanguageSelect.addEventListener('change', async () => {
    const selectedLanguage = audioLanguageSelect.value;
    
    try {
        const data = await browser.storage.local.get('settings');
        const settings = data.settings as ExtensionSettings;
        
        await browser.storage.local.set({
            settings: {
                ...settings,
                audioTranslation: {
                    ...settings.audioTranslation,
                    language: selectedLanguage
                }
            }
        });
        
        console.log('Audio language saved:', selectedLanguage);
        
        // Inform active tab about the change (only if YouTube)
        try {
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            if (tabs[0]?.id && tabs[0]?.url) {
                const isYouTubeTab = tabs[0].url.includes('youtube.com') || tabs[0].url.includes('youtube-nocookie.com');
                
                if (isYouTubeTab) {
                    await browser.tabs.sendMessage(tabs[0].id, {
                        feature: 'audioLanguage',
                        language: selectedLanguage
                    });
                }
            }
        } catch (messageError) {
            console.log('[YNT] Could not send audio language change message:', messageError);
        }
    } catch (error) {
        console.error('Failed to save audio language:', error);
    }
});

// Adjust tooltip positions if they overflow the viewport
function adjustTooltipPositions() {
    const tooltipGroups = document.querySelectorAll('.tooltip') as NodeListOf<HTMLDivElement>;
    const bodyWidth = document.body.clientWidth;
    tooltipGroups.forEach((group) => {
        const tooltip = group.querySelector('span') as HTMLSpanElement;
        if (!tooltip) return;
        tooltip.style.marginLeft = ''; // Reset previous adjustment
        const tooltipRect = tooltip.getBoundingClientRect();
        if (tooltipRect.right > bodyWidth) {
            tooltip.style.marginLeft = `-${tooltipRect.right - bodyWidth + 20}px`;
        }
    });
}
adjustTooltipPositions();


// Handle YouTube Data API key changes
youtubeDataApiKeyInput.addEventListener('input', async () => {
    const apiKey = youtubeDataApiKeyInput.value.trim();
    
    try {
        const data = await browser.storage.local.get('settings');
        const settings = data.settings as ExtensionSettings;
        
        await browser.storage.local.set({
            settings: {
                ...settings,
                youtubeDataApi: {
                    ...settings.youtubeDataApi,
                    apiKey: apiKey
                }
            }
        });
        console.log('YouTube Data API key saved');
    } catch (error) {
        console.error('YouTube Data API key save error:', error);
    }
});

// Handle cache clearing
clearCacheBtn.addEventListener('click', async () => {
    const originalText = clearCacheBtn.textContent;
    
    try {
        clearCacheBtn.disabled = true;
        clearCacheBtn.textContent = 'Clearing...';
        
        // Clear both title and description caches
        await browser.storage.local.remove('ynt-cache');
        
        // Send message to content scripts to clear their in-memory caches
        try {
            const tabs = await browser.tabs.query({ 
                url: ["*://*.youtube.com/*", "*://*.youtube-nocookie.com/*"] 
            });
            
            let clearedTabs = 0;
            for (const tab of tabs) {
                if (tab.id) {
                    try {
                        await browser.tabs.sendMessage(tab.id, {
                            action: 'clearCache'
                        });
                        clearedTabs++;
                    } catch (messageError) {
                        // Ignore tabs where content script is not loaded
                        console.log(`[YNT] Could not send clear cache message to tab ${tab.id}`);
                    }
                }
            }
            
            clearCacheBtn.textContent = `Cleared! (${clearedTabs} tabs)`;
            console.log(`[YNT] Cache cleared successfully. Notified ${clearedTabs} YouTube tabs.`);
        } catch (error) {
            clearCacheBtn.textContent = 'Cache Cleared!';
            console.log('[YNT] Cache cleared from storage, but could not notify content scripts:', error);
        }
        
        // Reset button after 2 seconds
        setTimeout(() => {
            clearCacheBtn.textContent = originalText;
            clearCacheBtn.disabled = false;
        }, 2000);
        
    } catch (error) {
        console.error('[YNT] Failed to clear cache:', error);
        clearCacheBtn.textContent = 'Error';
        clearCacheBtn.disabled = false;
        
        // Reset button after 2 seconds
        setTimeout(() => {
            clearCacheBtn.textContent = originalText;
        }, 2000);
    }
});

// Handle reload of all YouTube tabs from the welcome page
if (isWelcome) {
    const reloadBtn = document.getElementById('reloadYoutubeTabsBtn') as HTMLButtonElement | null;
    if (reloadBtn) {
        reloadBtn.onclick = async () => {
            try {
                const tabs = await browser.tabs.query({
                    url: [
                        "*://*.youtube.com/*",
                        "*://*.youtube-nocookie.com/*"
                    ]
                });
                let count = 0;
                for (const tab of tabs) {
                    // Only reload tabs that are not discarded
                    if (tab.id && tab.discarded === false) {
                        await browser.tabs.reload(tab.id);
                        count++;
                    }
                }
                reloadBtn.textContent = `Reloaded ${count} active tab${count !== 1 ? 's' : ''}!`;
                reloadBtn.disabled = true;
            } catch (error) {
                reloadBtn.textContent = "Error reloading tabs";
                reloadBtn.disabled = true;
                console.error("[YNT] Failed to reload YouTube tabs:", error);
            }
        };
    }
}