"use strict";
/*
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 *
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */
/*
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 *
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */
// Default settings as a constant
const DEFAULT_SETTINGS = {
    titleTranslation: true,
    audioTranslation: true,
    audioLanguage: 'original',
    descriptionTranslation: true,
    subtitlesTranslation: false,
    subtitlesLanguage: 'original'
};
/*
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 *
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */
/// <reference types="webextension-polyfill" />
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
// Initialize settings when extension is installed or updated
api.runtime.onInstalled.addListener(initializeSettings);
