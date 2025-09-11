/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

declare const browser: typeof import('webextension-polyfill');

interface Window {
    _youtubeFinalResponses: Array<{ url: string; json: any }>;
    _ynt_networkConfig: {
        endpoints: string[];
        features: {
            titles: boolean;
            descriptions: boolean;
        };
    };
    processYouTubeData: (originalData: any, cleanData: any) => Promise<any>;
}