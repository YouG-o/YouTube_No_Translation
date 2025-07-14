/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { ExtensionSettings, Message } from "../types/types";


const titleToggle = document.getElementById('titleTranslation') as HTMLInputElement;
const audioToggle = document.getElementById('audioTranslation') as HTMLInputElement;
const audioLanguageSelect = document.getElementById('audioLanguage') as HTMLSelectElement;
const descriptionToggle = document.getElementById('descriptionTranslation') as HTMLInputElement;
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
        
        // Default values for missing properties
        const defaultSettings: ExtensionSettings = {
            titleTranslation: true,
            audioTranslation: {
                enabled: true,
                language: 'original',
            },
            descriptionTranslation: true,
            subtitlesTranslation: {
                enabled: false,
                language: 'original',
            },
            youtubeDataApi: {
                enabled: false,
                apiKey: ''
            }
        };

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
        audioToggle.checked = settings.audioTranslation.enabled;
        audioLanguageSelect.value = settings.audioTranslation.language;
        descriptionToggle.checked = settings.descriptionTranslation;
        subtitlesToggle.checked = settings.subtitlesTranslation.enabled;
        subtitlesLanguageSelect.value = settings.subtitlesTranslation.language;
        youtubeDataApiToggle.checked = settings.youtubeDataApi.enabled;
        youtubeDataApiKeyInput.value = settings.youtubeDataApi.apiKey;
        
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
            pageTitle.className = 'text-2xl font-semibold text-white flex items-center gap-2 mb-2';
        }
    }
    
    if (welcomeMessage) {
        welcomeMessage.classList.remove('hidden');
    }
}

// Handle advanced features toggle click - only if element exists
if (advancedFeaturesToggle) {
    advancedFeaturesToggle.addEventListener('click', toggleAdvancedFeatures);
}


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
                audioTranslation: {
                    ...settings.audioTranslation,
                    enabled: isEnabled
                }
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
                subtitlesTranslation: {
                    ...settings.subtitlesTranslation,
                    enabled: isEnabled
                }
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
                subtitlesTranslation: {
                    ...settings.subtitlesTranslation,
                    language: selectedLanguage
                }
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
                audioTranslation: {
                    ...settings.audioTranslation,
                    language: selectedLanguage
                }
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