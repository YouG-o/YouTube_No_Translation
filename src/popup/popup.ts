/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

const titleToggle = document.getElementById('titleTranslation') as HTMLInputElement;
const titlesFallbackApiToggle = document.getElementById('titlesFallbackApi') as HTMLInputElement;
const audioToggle = document.getElementById('audioTranslation') as HTMLInputElement;
const audioLanguageSelect = document.getElementById('audioLanguage') as HTMLSelectElement;
const descriptionToggle = document.getElementById('descriptionTranslation') as HTMLInputElement;
const descriptionSearchToggle = document.getElementById('descriptionSearchResults') as HTMLInputElement;
const subtitlesToggle = document.getElementById('subtitlesTranslation') as HTMLInputElement;
const subtitlesLanguageSelect = document.getElementById('subtitlesLanguage') as HTMLSelectElement;
const extensionVersionElement = document.getElementById('extensionVersion') as HTMLSpanElement;
const youtubeDataApiToggle = document.getElementById('youtubeDataApiEnabled') as HTMLInputElement;
const youtubeDataApiKeyInput = document.getElementById('youtubeDataApiKey') as HTMLInputElement;
const youtubeApiKeyContainer = document.getElementById('youtubeApiKeyContainer') as HTMLDivElement;

// Advanced features collapsible section - only exists in popup
const advancedFeaturesToggle = document.getElementById('advancedFeaturesToggle') as HTMLDivElement;
const advancedFeaturesContent = document.getElementById('advancedFeaturesContent') as HTMLDivElement;
const advancedFeaturesArrow = document.getElementById('advancedFeaturesArrow');

// Function to display the extension version
function displayExtensionVersion() {
    if (extensionVersionElement) {
        const manifest = browser.runtime.getManifest();
        extensionVersionElement.textContent = manifest.version;
    }
}

// Function to toggle advanced features section
function toggleAdvancedFeatures() {
    if (!advancedFeaturesContent || !advancedFeaturesArrow) return;
    
    const isHidden = advancedFeaturesContent.classList.contains('hidden');
    if (isHidden) {
        advancedFeaturesContent.classList.remove('hidden');
        advancedFeaturesArrow.style.transform = 'rotate(180deg)';
        adjustTooltipPositions();
    } else {
        advancedFeaturesContent.classList.add('hidden');
        advancedFeaturesArrow.style.transform = 'rotate(0deg)';
    }
}

// Initialize toggle states from storage
document.addEventListener('DOMContentLoaded', async () => {
    displayExtensionVersion();
    try {
        const data = await browser.storage.local.get('settings');
        
        if (!data.settings) {
            const defaultSettings: ExtensionSettings = {
                titleTranslation: true,
                titlesFallbackApi: false,
                audioTranslation: true,
                audioLanguage: 'original',
                descriptionTranslation: true,
                descriptionSearchResults: false,
                subtitlesTranslation: false,
                subtitlesLanguage: 'original',
                youtubeDataApi: {
                    enabled: false,
                    apiKey: ''
                }
            };
            await browser.storage.local.set({
                settings: defaultSettings
            });
            titleToggle.checked = defaultSettings.titleTranslation;
            titlesFallbackApiToggle.checked = defaultSettings.titlesFallbackApi;
            audioToggle.checked = defaultSettings.audioTranslation;
            audioLanguageSelect.value = defaultSettings.audioLanguage;
            descriptionToggle.checked = defaultSettings.descriptionTranslation;
            descriptionSearchToggle.checked = defaultSettings.descriptionSearchResults;
            subtitlesToggle.checked = defaultSettings.subtitlesTranslation;
            subtitlesLanguageSelect.value = defaultSettings.subtitlesLanguage;
            youtubeDataApiToggle.checked = defaultSettings.youtubeDataApi.enabled;
            youtubeDataApiKeyInput.value = defaultSettings.youtubeDataApi.apiKey;
            return;
        }
        
        const settings = data.settings as ExtensionSettings;
        
        titleToggle.checked = settings.titleTranslation;
        titlesFallbackApiToggle.checked = settings.titlesFallbackApi || false;
        audioToggle.checked = settings.audioTranslation;
        descriptionToggle.checked = settings.descriptionTranslation;
        descriptionSearchToggle.checked = settings.descriptionSearchResults || false;
        subtitlesToggle.checked = settings.subtitlesTranslation;
        youtubeDataApiToggle.checked = settings.youtubeDataApi?.enabled || false;
        youtubeDataApiKeyInput.value = settings.youtubeDataApi?.apiKey || '';
        
        // Show/hide API key input based on toggle state (only for popup, not welcome)
        if (youtubeDataApiToggle.checked && youtubeApiKeyContainer && youtubeApiKeyContainer.style.display !== undefined) {
            youtubeApiKeyContainer.style.display = 'block';
        }
        
        if (settings.subtitlesLanguage) {
            subtitlesLanguageSelect.value = settings.subtitlesLanguage;
        }

        if (settings.audioLanguage) {
            audioLanguageSelect.value = settings.audioLanguage;
        } else {
            audioLanguageSelect.value = 'original';
        }
        
        console.log(
            '[YNT] Settings loaded - Title translation prevention is: %c%s',
            settings.titleTranslation ? 'color: green; font-weight: bold' : 'color: red; font-weight: bold',
            settings.titleTranslation ? 'ON' : 'OFF'
        );
        console.log(
            '[YNT] Settings loaded - Audio translation prevention is: %c%s',
            settings.audioTranslation ? 'color: green; font-weight: bold' : 'color: red; font-weight: bold',
            settings.audioTranslation ? 'ON' : 'OFF'
        );
        console.log(
            '[YNT] Settings loaded - Description translation prevention is: %c%s',
            settings.descriptionTranslation ? 'color: green; font-weight: bold' : 'color: red; font-weight: bold',
            settings.descriptionTranslation ? 'ON' : 'OFF'
        );
        console.log(
            '[YNT] Settings loaded - Subtitles translation prevention is: %c%s',
            settings.subtitlesTranslation ? 'color: green; font-weight: bold' : 'color: red; font-weight: bold',
            settings.subtitlesTranslation ? 'ON' : 'OFF'
        );
    } catch (error) {
        console.error('Load error:', error);
    }
});

// Handle advanced features toggle click - only if element exists
if (advancedFeaturesToggle) {
    advancedFeaturesToggle.addEventListener('click', toggleAdvancedFeatures);
}

// Handle description search results toggle changes
descriptionSearchToggle.addEventListener('change', async () => {
    const isEnabled = descriptionSearchToggle.checked;
    
    try {
        const data = await browser.storage.local.get('settings');
        const settings = data.settings as ExtensionSettings;
        
        await browser.storage.local.set({
            settings: {
                ...settings,
                descriptionSearchResults: isEnabled
            }
        });

        await browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
            browser.tabs.sendMessage(tabs[0].id!, {
                action: 'toggleTranslation',
                feature: 'descriptionSearchResults',
                isEnabled
            } as Message);
        });
    } catch (error) {
        console.error('Save error:', error);
    }
});

// Handle title toggle changes
titleToggle.addEventListener('change', async () => {
    const isEnabled = titleToggle.checked;
    
    // Save state
    try {
        const data = await browser.storage.local.get('settings');
        const settings = data.settings as ExtensionSettings;
        
        await browser.storage.local.set({
            settings: {
                ...settings,
                titleTranslation: isEnabled
            }
        });
        console.log('Title state saved');
    } catch (error) {
        console.error('Title save error:', error);
    }

    // Update state
    try {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]?.id) {
            await browser.tabs.sendMessage(tabs[0].id, {
                action: 'toggleTranslation',
                feature: 'titles',
                isEnabled
            });
            console.log('Title state updated');
        }
    } catch (error) {
        console.error('Title update error:', error);
    }
});

// Handle audio toggle changes
audioToggle.addEventListener('change', async () => {
    const isEnabled = audioToggle.checked;
    
    // Save state
    try {
        const data = await browser.storage.local.get('settings');
        const settings = data.settings as ExtensionSettings;
        
        await browser.storage.local.set({
            settings: {
                ...settings,
                audioTranslation: isEnabled
            }
        });
        console.log('Audio state saved');
    } catch (error) {
        console.error('Audio save error:', error);
    }

    // Update state
    try {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]?.id) {
            await browser.tabs.sendMessage(tabs[0].id, {
                action: 'toggleTranslation',
                feature: 'audio',
                isEnabled
            });
            console.log('Audio state updated');
        }
    } catch (error) {
        console.error('Audio update error:', error);
    }
});

// Handle description toggle changes
descriptionToggle.addEventListener('change', async () => {
    const isEnabled = descriptionToggle.checked;
    
    try {
        const data = await browser.storage.local.get('settings');
        const settings = data.settings as ExtensionSettings;
        
        await browser.storage.local.set({
            settings: {
                ...settings,
                descriptionTranslation: isEnabled
            }
        });

        await browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
            browser.tabs.sendMessage(tabs[0].id!, {
                feature: 'description',
                isEnabled
            } as Message);
        });
    } catch (error) {
        console.error('Save error:', error);
    }
});

// Handle subtitles toggle changes
subtitlesToggle.addEventListener('change', async () => {
    const isEnabled = subtitlesToggle.checked;
    
    try {
        const data = await browser.storage.local.get('settings');
        const settings = data.settings as ExtensionSettings;
        
        await browser.storage.local.set({
            settings: {
                ...settings,
                subtitlesTranslation: isEnabled
            }
        });

        // Send message to content script
        await browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
            browser.tabs.sendMessage(tabs[0].id!, {
                feature: 'subtitles',
                isEnabled
            } as Message);
        });
    } catch (error) {
        console.error('Save error:', error);
    }
});

// Handle subtitles language selection changes
subtitlesLanguageSelect.addEventListener('change', async () => {
    const selectedLanguage = subtitlesLanguageSelect.value;
    
    // Save language preference
    try {
        const data = await browser.storage.local.get('settings');
        const settings = data.settings as ExtensionSettings;
        
        await browser.storage.local.set({
            settings: {
                ...settings,
                subtitlesLanguage: selectedLanguage
            }
        });
        
        console.log('Subtitles language saved:', selectedLanguage);
        
        // Inform active tab about the change
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]?.id) {
            await browser.tabs.sendMessage(tabs[0].id, {
                feature: 'subtitlesLanguage',
                language: selectedLanguage
            });
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
                audioLanguage: selectedLanguage
            }
        });
        
        console.log('Audio language saved:', selectedLanguage);
        
        // Inform active tab about the change
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]?.id) {
            await browser.tabs.sendMessage(tabs[0].id, {
                feature: 'audioLanguage',
                language: selectedLanguage
            });
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

// Initial adjustment
adjustTooltipPositions();

// Handle titles fallback API toggle changes
titlesFallbackApiToggle.addEventListener('change', async () => {
    const isEnabled = titlesFallbackApiToggle.checked;
    
    // Save state
    try {
        const data = await browser.storage.local.get('settings');
        const settings = data.settings as ExtensionSettings;
        
        await browser.storage.local.set({
            settings: {
                ...settings,
                titlesFallbackApi: isEnabled
            }
        });
        console.log('Titles fallback API state saved:', isEnabled);
    } catch (error) {
        console.error('Titles fallback API save error:', error);
    }

    // Update state
    try {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]?.id) {
            await browser.tabs.sendMessage(tabs[0].id, {
                action: 'toggleTranslation',
                feature: 'titlesFallbackApi',
                isEnabled
            } as Message);
            console.log('Titles fallback API state updated');
        }
    } catch (error) {
        console.error('Titles fallback API update error:', error);
    }
});

// Handle YouTube Data API toggle changes
youtubeDataApiToggle.addEventListener('change', async () => {
    const isEnabled = youtubeDataApiToggle.checked;
    
    // Show/hide API key input only if container exists and has display style
    if (youtubeApiKeyContainer && youtubeApiKeyContainer.style.display !== undefined) {
        if (isEnabled) {
            youtubeApiKeyContainer.style.display = 'block';
        } else {
            youtubeApiKeyContainer.style.display = 'none';
        }
    }
    
    // Save state
    try {
        const data = await browser.storage.local.get('settings');
        const settings = data.settings as ExtensionSettings;
        
        await browser.storage.local.set({
            settings: {
                ...settings,
                youtubeDataApi: {
                    ...settings.youtubeDataApi,
                    enabled: isEnabled
                }
            }
        });
        console.log('YouTube Data API state saved:', isEnabled);
    } catch (error) {
        console.error('YouTube Data API save error:', error);
    }
});

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