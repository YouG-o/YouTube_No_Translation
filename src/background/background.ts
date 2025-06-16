/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

/// <reference types="webextension-polyfill" />

declare const chrome: any;
const api = typeof chrome !== 'undefined' ? chrome : browser;

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
            url: api.runtime.getURL('dist/popup/welcome.html')
        });

        // Find all open YouTube and YouTube No-Cookie tabs and refresh them
        const youtubeTabs = await api.tabs.query({ 
            url: [
                '*://*.youtube.com/*',
                '*://*.youtube-nocookie.com/*'
            ] 
        });
        for (const tab of youtubeTabs) {
            if (tab.id) {
                try {
                    await api.tabs.reload(tab.id);
                    console.log(`[YNT-Debug] Reloaded YouTube tab: ${tab.id}`);
                } catch (error) {
                    console.error(`[YNT-Debug] Failed to reload tab ${tab.id}:`, error);
                }
            }
        }
    }
}

// Initialize settings when extension is installed or updated
api.runtime.onInstalled.addListener((details: InstalledDetails) => {
    toDoOnFirstInstall(details);
    initializeSettings();
});
