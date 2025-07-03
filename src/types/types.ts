/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */


export interface Message {
    action: 'toggleTranslation';
    feature: 'titles' | 'isolatedPlayerTitles' | 'audio' | 'description' | 'isolatedPlayerDescriptionSearch' | 'subtitles';
    isEnabled: boolean;
}

export interface AudioTrack {
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

export interface YouTubePlayer extends HTMLElement {
    getInternalApiInterface: () => string[];
    [key: string]: any;
}

export interface ExtensionSettings {
    titleTranslation: boolean;
    audioTranslation: {
        enabled: boolean;
        language: string;
    };
    descriptionTranslation: boolean;
    subtitlesTranslation: {
        enabled: boolean;
        language: string;
    };
    youtubeIsolatedPlayerFallback: {
        titles: boolean;
        searchResultsDescriptions: boolean;
    };
    youtubeDataApi: {
        enabled: boolean;
        apiKey: string;
    };
}

export interface YouTubePlayerResponse {
    videoDetails: {
        shortDescription: string;
        [key: string]: any;
    };
    [key: string]: any;
}

export interface Window {
    ytInitialPlayerResponse?: YouTubePlayerResponse;
}

export interface TitleData {
    title: string | null;
}

export interface TitleDataEvent extends CustomEvent {
    detail: TitleData;
}

export interface Chapter {
    startTime: number;
    title: string;
}

// YouTube Player API types
export interface Window {
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
