/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */



interface Message {
    action: 'toggleTranslation';
    feature: 'titles' | 'titlesFallbackApi' | 'audio' | 'description' | 'descriptionSearchResults' | 'subtitles';
    isEnabled: boolean;
}

interface AudioTrack {
    id: string;
    K4: any;
    captionTracks: any[];
    S: any;
    V: any;
    xtags: string;
    W: boolean;
    T: any;
    C: string;
    captionsInitialState: string;
    [key: string]: any;
}

interface YouTubePlayer extends HTMLElement {
    getInternalApiInterface: () => string[];
    [key: string]: any;
}

interface ExtensionSettings {
    titleTranslation: boolean;
    titlesFallbackApi: boolean;
    audioTranslation: boolean;
    audioLanguage: string;
    descriptionTranslation: boolean;
    descriptionSearchResults: boolean;
    subtitlesTranslation: boolean;
    subtitlesLanguage: string;
}

interface YouTubePlayerResponse {
    videoDetails: {
        shortDescription: string;
        [key: string]: any;
    };
    [key: string]: any;
}

interface Window {
    ytInitialPlayerResponse?: YouTubePlayerResponse;
}

interface TitleData {
    title: string | null;
}

interface TitleDataEvent extends CustomEvent {
    detail: TitleData;
}

interface Chapter {
    startTime: number;
    title: string;
}

// YouTube Player API types
interface Window {
    YT: {
        Player: new (elementId: string, config: {
            height?: string;
            width?: string;
            videoId?: string;
            playerVars?: {
                controls?: number;
                disablekb?: number;
                fs?: number;
                modestbranding?: number;
                rel?: number;
                autoplay?: number;
                mute?: number;
            };
            events?: {
                onReady?: (event: any) => void;
                onStateChange?: (event: any) => void;
            };
        }) => {
            loadVideoById: (videoId: string, startSeconds?: number, suggestedQuality?: string) => void;
            getPlayerResponse: () => any;
            destroy: () => void;
            mute: () => void;
            addEventListener: (event: string, listener: () => void) => void;
            removeEventListener: (event: string, listener: () => void) => void;
        };
        ready: (callback: () => void) => void;
    };
}
