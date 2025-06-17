/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

const titleToggle = document.getElementById('titleTranslation') as HTMLInputElement;
const audioToggle = document.getElementById('audioTranslation') as HTMLInputElement;
const audioLanguageSelect = document.getElementById('audioLanguage') as HTMLSelectElement;
const descriptionToggle = document.getElementById('descriptionTranslation') as HTMLInputElement;
const descriptionSearchToggle = document.getElementById('descriptionSearchResults') as HTMLInputElement;
const subtitlesToggle = document.getElementById('subtitlesTranslation') as HTMLInputElement;
const subtitlesLanguageSelect = document.getElementById('subtitlesLanguage') as HTMLSelectElement;
const tooltipGroups = document.querySelectorAll('.tooltip') as NodeListOf<HTMLDivElement>;
const extensionVersionElement = document.getElementById('extensionVersion') as HTMLSpanElement;

// Function to display the extension version
function displayExtensionVersion() {
    if (extensionVersionElement) {
        const manifest = browser.runtime.getManifest();
        extensionVersionElement.textContent = manifest.version;
    }
}

// Function to toggle description search container visibility
function toggleDescriptionSearchContainer() {
    const container = document.getElementById('descriptionSearchContainer');
    if (container) {
        container.style.display = descriptionToggle.checked ? 'block' : 'none';
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
                audioTranslation: true,
                audioLanguage: 'original',
                descriptionTranslation: true,
                descriptionSearchResults: false,
                subtitlesTranslation: false,
                subtitlesLanguage: 'original'
            };
            await browser.storage.local.set({
                settings: defaultSettings
            });
            titleToggle.checked = defaultSettings.titleTranslation;
            audioToggle.checked = defaultSettings.audioTranslation;
            audioLanguageSelect.value = defaultSettings.audioLanguage;
            descriptionToggle.checked = defaultSettings.descriptionTranslation;
            descriptionSearchToggle.checked = defaultSettings.descriptionSearchResults;
            subtitlesToggle.checked = defaultSettings.subtitlesTranslation;
            subtitlesLanguageSelect.value = defaultSettings.subtitlesLanguage;
            toggleDescriptionSearchContainer();
            return;
        }
        
        const settings = data.settings as ExtensionSettings;
        
        titleToggle.checked = settings.titleTranslation;
        audioToggle.checked = settings.audioTranslation;
        descriptionToggle.checked = settings.descriptionTranslation;
        descriptionSearchToggle.checked = settings.descriptionSearchResults || false;
        subtitlesToggle.checked = settings.subtitlesTranslation;
        
        if (settings.subtitlesLanguage) {
            subtitlesLanguageSelect.value = settings.subtitlesLanguage;
        }

        if (settings.audioLanguage) {
            audioLanguageSelect.value = settings.audioLanguage;
        } else {
            audioLanguageSelect.value = 'original';
        }
        
        toggleDescriptionSearchContainer();
        
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
    
    toggleDescriptionSearchContainer();
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
tooltipGroups.forEach((group) => {
    const bodyWidth = document.body.clientWidth;  
    const tooltip = group.querySelector('span') as HTMLSpanElement;
    const tooltipRect = tooltip.getBoundingClientRect();

    if (tooltipRect.right > bodyWidth) {
        tooltip.style.marginLeft = `-${tooltipRect.right - bodyWidth + 20}px`;
    }
});