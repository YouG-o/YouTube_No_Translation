/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { ExtensionSettings } from '../types/types';


// Default settings as a constant
export const DEFAULT_SETTINGS: ExtensionSettings = {
    titleTranslation: true,
    audioTranslation: {
        enabled: true,
        language: 'original',
    },
    descriptionTranslation: true,
    subtitlesTranslation: {
        enabled: false,
        language: 'disabled',
    },
    youtubeDataApi: {
        enabled: false,
        apiKey: ''
    }
};

// Define the type for installation details
export interface InstalledDetails {
    reason: 'install' | 'update' | 'browser_update' | 'chrome_update';
    previousVersion?: string;
    id?: string;
}