/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { DEFAULT_SETTINGS, InstalledDetails } from '../config/constants';


declare const chrome: any;
const api = typeof chrome !== 'undefined' ? chrome : browser;

async function migrateSettings() {
    try {
        const data = await api.storage.local.get('settings');
        if (!data.settings) return;

        const settings = data.settings as any;
        let needsUpdate = false;

        // Check if audioTranslation needs migration from boolean to object
        if (typeof settings.audioTranslation === 'boolean') {
            console.log('[YNT-Debug] Migrating audioTranslation setting from boolean to object');
            settings.audioTranslation = {
                enabled: settings.audioTranslation,
                language: settings.audioLanguage || 'original' // Preserve existing audioLanguage preference
            };
            needsUpdate = true;
        }

        // Check if subtitlesTranslation needs migration from boolean to object
        if (typeof settings.subtitlesTranslation === 'boolean') {
            console.log('[YNT-Debug] Migrating subtitlesTranslation setting from boolean to object');
            settings.subtitlesTranslation = {
                enabled: settings.subtitlesTranslation,
                language: settings.subtitlesLanguage || 'original' // Preserve existing subtitlesLanguage preference
            };
            needsUpdate = true;
        }

        // Clean up any remaining old properties that might exist
        const oldPropertiesToRemove = [
            'audioLanguage',
            'subtitlesLanguage',
            'titlesFallbackApi',
            'descriptionSearchResults',
            'youtubeIsolatedPlayerFallback'
        ];
        oldPropertiesToRemove.forEach(prop => {
            if (settings[prop] !== undefined) {
                console.log(`[YNT-Debug] Removing old property: ${prop}`);
                delete settings[prop];
                needsUpdate = true;
            }
        });

        // Ensure installationDate exists for legacy users
        if (!settings.askForSupport?.installationDate) {
            settings.askForSupport = settings.askForSupport || {};
            settings.askForSupport.installationDate = new Date().toISOString();
            needsUpdate = true;
            console.log('[YNT-Debug] Set installationDate for legacy user');
        }

        if (needsUpdate) {
            await api.storage.local.set({ settings });
            console.log('[YNT-Debug] Settings migration completed successfully. Reloading extension to apply changes.');
            // Reload the extension to ensure all parts (content scripts, popup) use the new settings structure
            //api.runtime.reload();
        }
    } catch (error) {
        console.error('[YNT-Debug] Error during settings migration:', error);
    }
}

async function initializeSettings() {
    const data = await api.storage.local.get('settings');
    if (!data.settings) {
        await api.storage.local.set({
            settings: DEFAULT_SETTINGS
        });
        console.log('[YNT-Debug] Settings initialized with default values');
    }
}

async function toDoOnFirstInstall(details: InstalledDetails) {
        if (details.reason === 'install') {
        // Open the welcome page
        api.tabs.create({
            url: api.runtime.getURL('dist/popup/settings.html?welcome=true')
        });
    }
}

// Initialize settings when extension is installed or updated
api.runtime.onInstalled.addListener(async (details: InstalledDetails) => {
    await toDoOnFirstInstall(details);
    await migrateSettings();
    await initializeSettings();
});
