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
const LOG_PREFIX = '[YNT]';
const LOG_STYLES = {
    MAIN_TITLE: {
        context: '[Main Title]',
        color: '#fcd34d' // yellow
    },
    BROWSING_TITLES: {
        context: '[Browsing Titles]',
        color: '#fca5a5' // light red
    },
    TITLES: {
        context: '[Titles]',
        color: '#86efac' // light green
    },
    DESCRIPTION: {
        context: '[Description]',
        color: '#2196F3' // blue
    },
    AUDIO: {
        context: '[Audio]',
        color: '#4CAF50' // green
    },
    CORE: {
        context: '[Core]',
        color: '#c084fc' // light purple
    },
    SUBTITLES: {
        context: '[Subtitles]',
        color: '#FF9800' // orange
    },
    CHANNEL_NAME: {
        context: '[Channel Name]',
        color: '#06b6d4' // light blue
    },
    CHAPTERS: {
        context: '[CHAPTERS]',
        color: '#9C27B0' // purple
    }
};
// Error color for all error logs
const ERROR_COLOR = '#F44336'; // Red
function createLogger(category) {
    return (message, ...args) => {
        console.log(`%c${LOG_PREFIX}${category.context} ${message}`, `color: ${category.color}`, ...args);
    };
}
// Create error logger function
function createErrorLogger(category) {
    return (message, ...args) => {
        console.log(`%c${LOG_PREFIX}${category.context} %c${message}`, `color: ${category.color}`, // Keep category color for prefix
        `color: ${ERROR_COLOR}`, // Red color for error message
        ...args);
    };
}
// Create standard loggers
const coreLog = createLogger(LOG_STYLES.CORE);
const coreErrorLog = createErrorLogger(LOG_STYLES.CORE);
const titlesLog = createLogger(LOG_STYLES.TITLES);
const titlesErrorLog = createErrorLogger(LOG_STYLES.TITLES);
const mainTitleLog = createLogger(LOG_STYLES.MAIN_TITLE);
const mainTitleErrorLog = createErrorLogger(LOG_STYLES.MAIN_TITLE);
const browsingTitlesLog = createLogger(LOG_STYLES.BROWSING_TITLES);
const browsingTitlesErrorLog = createErrorLogger(LOG_STYLES.BROWSING_TITLES);
const audioLog = createLogger(LOG_STYLES.AUDIO);
const audioErrorLog = createErrorLogger(LOG_STYLES.AUDIO);
const descriptionLog = createLogger(LOG_STYLES.DESCRIPTION);
const descriptionErrorLog = createErrorLogger(LOG_STYLES.DESCRIPTION);
const subtitlesLog = createLogger(LOG_STYLES.SUBTITLES);
const subtitlesErrorLog = createErrorLogger(LOG_STYLES.SUBTITLES);
const channelNameLog = createLogger(LOG_STYLES.CHANNEL_NAME);
const channelNameErrorLog = createErrorLogger(LOG_STYLES.CHANNEL_NAME);
const chaptersLog = createLogger(LOG_STYLES.CHAPTERS);
const chaptersErrorLog = createErrorLogger(LOG_STYLES.CHAPTERS);
/*
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 *
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */
const MUTATION_THRESHOLD = 10;
function isToggleMessage(message) {
    return (typeof message === 'object' &&
        message !== null &&
        'action' in message &&
        message.action === 'toggleTranslation' &&
        'feature' in message &&
        (message.feature === 'titles' ||
            message.feature === 'audio' ||
            message.feature === 'description' ||
            message.feature === 'subtitles') &&
        'isEnabled' in message &&
        typeof message.isEnabled === 'boolean');
}
// Function to wait for an element to be present in the DOM
function waitForElement(selector, timeout = 7500) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }
        const observer = new MutationObserver(() => {
            if (document.querySelector(selector)) {
                observer.disconnect();
                resolve(document.querySelector(selector));
            }
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        setTimeout(() => {
            observer.disconnect();
            reject('Timeout waiting for element : ' + selector);
        }, timeout);
    });
}
// Function to normalize texts before comparison
function normalizeText(text, description = false) {
    if (text === null || text === undefined) {
        return '';
    }
    let normalizedText = text;
    if (description) {
        // For descriptions, we need more aggressive normalization
        normalizedText = normalizedText.replace(/https?:\/\/(?:www\.)?[^\s]+/g, '');
        normalizedText = normalizedText.replace(/\/\s*@?[a-zA-Z0-9_-]+/g, '');
        normalizedText = normalizedText.replace(/@[a-zA-Z0-9_-]+/g, '');
        normalizedText = normalizedText.replace(/[^\w\s]/g, ''); // Remove punctuation and special characters
        normalizedText = normalizedText.replace(/\d+:\d+/g, ''); // Remove timestamps
        normalizedText = normalizedText.toLowerCase(); // Convert to lowercase
        //remove all non-alphanumeric characters
        normalizedText = normalizedText.replace(/[^a-z0-9]/g, '');
    }
    return normalizedText
        .normalize('NFD') // Decompose accented characters
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/\s+/g, ' ') // Normalize spaces
        .replace(/[\p{Emoji}]/gu, '') // Remove all emojis
        .trim(); // Remove leading/trailing spaces
}
function calculateSimilarity(str1, str2) {
    // Use character frequency approach for better handling of long strings
    const charCount1 = new Map();
    const charCount2 = new Map();
    // Count characters in first string
    for (const char of str1) {
        charCount1.set(char, (charCount1.get(char) || 0) + 1);
    }
    // Count characters in second string
    for (const char of str2) {
        charCount2.set(char, (charCount2.get(char) || 0) + 1);
    }
    // Calculate common character count
    let commonCount = 0;
    for (const [char, count1] of charCount1.entries()) {
        const count2 = charCount2.get(char) || 0;
        commonCount += Math.min(count1, count2);
    }
    // Calculate total character count
    const totalCount = Math.max(str1.length, str2.length);
    // Return similarity as ratio
    return commonCount / totalCount;
}
/*
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 *
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */
// Optimized cache manager
class TitleCache {
    constructor() {
        this.apiCache = new Map();
        this.lastCleanupTime = Date.now();
        this.MAX_ENTRIES = 300;
        this.CLEANUP_INTERVAL = 20 * 60 * 1000; // 20 minutes in ms
    }
    cleanupCache() {
        const currentTime = Date.now();
        // Clear if older than interval
        if (currentTime - this.lastCleanupTime > this.CLEANUP_INTERVAL) {
            titlesLog('Cache expired, clearing all entries');
            this.clear();
            this.lastCleanupTime = currentTime;
            return;
        }
        // Keep only most recent entries if over size limit
        if (this.apiCache.size > this.MAX_ENTRIES) {
            const entries = Array.from(this.apiCache.entries());
            this.apiCache = new Map(entries.slice(-this.MAX_ENTRIES));
            //titlesLog('Cache size limit reached, keeping most recent entries');
        }
    }
    clear() {
        this.apiCache.clear();
        titlesLog('Cache cleared');
    }
    hasElement(element) {
        return false;
    }
    setElement(element, title) {
        //titlesLog('Element caching disabled');
    }
    async getOriginalTitle(apiUrl) {
        this.cleanupCache();
        try {
            // If in cache, return cached value
            if (this.apiCache.has(apiUrl)) {
                return this.apiCache.get(apiUrl) || '';
            }
            // Fetch new title
            const response = await fetch(apiUrl);
            // If no title found keep current title
            if (!response.ok) {
                //titlesLog(`API error (${response.status}), keeping current title`);
                return '';
            }
            const data = await response.json();
            const title = data.title || '';
            // Cache the result
            if (title) {
                this.apiCache.set(apiUrl, title);
            }
            return title;
        }
        catch (error) {
            titlesErrorLog(`Failed to fetch title: ${error}`);
            return '';
        }
    }
}
const titleCache = new TitleCache();
/*
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 *
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */
let mainTitleContentObserver = null;
let pageTitleObserver = null;
let isEmptyObserver = null;
let mainTitleIsUpdating = false;
// --- Utility Functions
function cleanupMainTitleContentObserver() {
    if (mainTitleContentObserver) {
        //mainTitleLog('Cleaning up title content observer');
        mainTitleContentObserver.disconnect();
        mainTitleContentObserver = null;
    }
}
function cleanupIsEmptyObserver() {
    if (isEmptyObserver) {
        //mainTitleLog('Cleaning up is-empty observer');
        isEmptyObserver.disconnect();
        isEmptyObserver = null;
    }
}
function cleanupPageTitleObserver() {
    if (pageTitleObserver) {
        //mainTitleLog('Cleaning up page title observer');
        pageTitleObserver.disconnect();
        pageTitleObserver = null;
    }
}
function updateMainTitleElement(element, title, videoId) {
    cleanupMainTitleContentObserver();
    cleanupIsEmptyObserver();
    mainTitleLog(`Updated main title from : %c${normalizeText(element.textContent)}%c to : %c${normalizeText(title)}%c (video id : %c${videoId}%c)`, 'color: grey', 'color: #fcd34d', 'color: white', 'color: #fcd34d', 'color: #4ade80', 'color: #fcd34d');
    element.removeAttribute('is-empty');
    element.innerText = title;
    // --- Block YouTube from re-adding the is-empty attribute
    isEmptyObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'is-empty') {
                mainTitleLog('Blocking is-empty attribute');
                element.removeAttribute('is-empty');
                element.innerText = title;
            }
        });
    });
    isEmptyObserver.observe(element, {
        attributes: true,
        attributeFilter: ['is-empty']
    });
    // --- Block YouTube from adding multiple text nodes
    mainTitleContentObserver = new MutationObserver((mutations) => {
        if (mainTitleIsUpdating)
            return;
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                // --- Check if there are multiple text nodes
                const textNodes = Array.from(element.childNodes)
                    .filter(node => node.nodeType === Node.TEXT_NODE);
                if (textNodes.length > 1) {
                    mainTitleIsUpdating = true;
                    element.innerText = title;
                    mainTitleIsUpdating = false;
                    mainTitleLog('Multiple text nodes detected, cleaning up');
                }
            }
        });
    });
    mainTitleContentObserver.observe(element, {
        childList: true
    });
    titleCache.setElement(element, title);
}
function updatePageTitle(mainTitle) {
    cleanupPageTitleObserver();
    const expectedTitle = `${mainTitle} - YouTube`;
    mainTitleLog(`Updated page title from : %c${normalizeText(document.title)}%c to : %c${normalizeText(expectedTitle)}`, 'color: grey', 'color: #fcd34d', 'color: white');
    document.title = expectedTitle;
    const titleElement = document.querySelector('title');
    if (titleElement) {
        pageTitleObserver = new MutationObserver(() => {
            if (normalizeText(document.title) !== normalizeText(expectedTitle)) {
                mainTitleLog('YouTube changed page title, reverting');
                //mainTitleLog('Current:', normalizeText(document.title));
                //mainTitleLog('Expected:', normalizeText(expectedTitle));
                document.title = expectedTitle;
            }
        });
        pageTitleObserver.observe(titleElement, {
            childList: true
        });
    }
}
// --- Main Title Function
async function refreshMainTitle() {
    const mainTitle = document.querySelector('h1.ytd-watch-metadata > yt-formatted-string');
    if (mainTitle && window.location.pathname === '/watch' && !titleCache.hasElement(mainTitle)) {
        //mainTitleLog('Processing main title element');
        const videoId = new URLSearchParams(window.location.search).get('v');
        if (videoId) {
            const currentTitle = mainTitle.textContent;
            let originalTitle = null;
            // First try: Get title from player
            try {
                // Create and inject script
                const mainTitleScript = document.createElement('script');
                mainTitleScript.type = 'text/javascript';
                mainTitleScript.src = browser.runtime.getURL('dist/content/scripts/mainTitleScript.js');
                // Set up event listener before injecting script
                const playerTitle = await new Promise((resolve) => {
                    const titleListener = (event) => {
                        window.removeEventListener('ynt-title-data', titleListener);
                        resolve(event.detail.title);
                    };
                    window.addEventListener('ynt-title-data', titleListener);
                    // Inject script after listener is ready
                    document.head.appendChild(mainTitleScript);
                });
                if (playerTitle) {
                    //mainTitleLog('Got original title from player');
                    originalTitle = playerTitle;
                }
            }
            catch (error) {
                mainTitleErrorLog('Failed to get title from player:', error);
            }
            // Second try: Fallback to oembed API
            if (!originalTitle) {
                mainTitleLog('Falling back to oembed API');
                originalTitle = await titleCache.getOriginalTitle(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}`);
            }
            // Last resort: Use page title
            if (!originalTitle) {
                const currentPageTitle = document.title.replace(/ - YouTube$/, '');
                mainTitleLog(`Failed to get original title using both methods, using page title as last resort`);
                updateMainTitleElement(mainTitle, currentPageTitle, videoId);
                return;
            }
            // Skip if title is already correct and doesn't have is-empty attribute
            if (normalizeText(currentTitle) === normalizeText(originalTitle) && !mainTitle.hasAttribute('is-empty')) {
                mainTitleLog('Main title is already original');
                return;
            }
            // Apply the original title
            try {
                updateMainTitleElement(mainTitle, originalTitle, videoId);
                updatePageTitle(originalTitle);
            }
            catch (error) {
                mainTitleErrorLog(`Failed to update main title:`, error);
            }
        }
    }
}
// --- Embed Title Function
async function refreshEmbedTitle() {
    const embedTitle = document.querySelector('.ytp-title-link');
    if (embedTitle && !titleCache.hasElement(embedTitle)) {
        //mainTitleLog('Processing embed title element');
        // Get video ID from pathname
        const videoId = window.location.pathname.split('/embed/')[1];
        if (videoId) {
            const currentTitle = embedTitle.textContent;
            let originalTitle = null;
            // First try: Get title from player
            try {
                const mainTitleScript = document.createElement('script');
                mainTitleScript.type = 'text/javascript';
                mainTitleScript.src = browser.runtime.getURL('dist/content/scripts/mainTitleScript.js');
                // Set up event listener before injecting script
                const playerTitle = await new Promise((resolve) => {
                    const titleListener = (event) => {
                        window.removeEventListener('ynt-title-data', titleListener);
                        resolve(event.detail.title);
                    };
                    window.addEventListener('ynt-title-data', titleListener);
                    // Inject script after listener is ready
                    document.head.appendChild(mainTitleScript);
                });
                if (playerTitle) {
                    originalTitle = playerTitle;
                }
            }
            catch (error) {
                mainTitleErrorLog('Failed to get title from player:', error);
            }
            // Second try: Fallback to oembed API
            if (!originalTitle) {
                mainTitleLog('Falling back to oembed API');
                originalTitle = await titleCache.getOriginalTitle(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}`);
            }
            if (!originalTitle) {
                mainTitleLog('Failed to get original title, keeping current');
                return;
            }
            // Skip if title is already correct
            if (normalizeText(currentTitle) === normalizeText(originalTitle)) {
                return;
            }
            // Apply the original title
            try {
                updateMainTitleElement(embedTitle, originalTitle, videoId);
                updatePageTitle(originalTitle);
            }
            catch (error) {
                mainTitleErrorLog(`Failed to update embed title:`, error);
            }
        }
    }
}
/*
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 *
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */
// --- Global variables
let browsingTitlesObserver = new Map();
let lastBrowsingTitlesRefresh = 0;
let lastBrowsingShortsRefresh = 0;
const TITLES_THROTTLE = 1000; // minimum of 1 second between refreshes
// --- Utility Functions
function cleanupBrowsingTitleElement(element) {
    const observer = browsingTitlesObserver.get(element);
    if (observer) {
        //browsingTitlesLog('Cleaning up title observer');
        observer.disconnect();
        browsingTitlesObserver.delete(element);
    }
}
function cleanupAllBrowsingTitlesElementsObservers() {
    //browsingTitlesLog('Cleaning up all title observers');
    browsingTitlesObserver.forEach((observer, element) => {
        observer.disconnect();
    });
    browsingTitlesObserver.clear();
    // Reset refresh timestamps
    lastBrowsingTitlesRefresh = 0;
    lastBrowsingShortsRefresh = 0;
}
function updateBrowsingTitleElement(element, title, videoId) {
    // --- Clean previous observer
    cleanupBrowsingTitleElement(element);
    browsingTitlesLog(`Updated title from : %c${normalizeText(element.textContent)}%c to : %c${normalizeText(title)}%c (video id : %c${videoId}%c)`, 'color: grey', // --- currentTitle style
    'color: #fca5a5', // --- reset color
    'color: white', // --- originalTitle style
    'color: #fca5a5', // --- reset color
    'color: #4ade80', // --- videoId style (light green)
    'color: #fca5a5' // --- reset color
    );
    // --- Inject CSS if not already done
    if (!document.querySelector('#ynt-style')) {
        const style = document.createElement('style');
        style.id = 'ynt-style';
        style.textContent = `
            /* Hide all direct children of video titles with ynt attribute (basically hide the translated title) */
            #video-title[ynt] > * {
                display: none !important;
            }

            /* Show the untranslated title using the title attribute */
            #video-title[ynt]::after {
                content: attr(title);
                font-size: var(--ytd-tab-system-font-size-body);
                line-height: var(--ytd-tab-system-line-height-body);
                font-family: var(--ytd-tab-system-font-family);
            }
        `;
        document.head.appendChild(style);
    }
    const createSpan = (element, videoId) => {
        const span = document.createElement('span');
        span.setAttribute('ynt-span', videoId);
        span.textContent = element.textContent;
        element.textContent = '';
        element.appendChild(span);
    };
    let span = element.querySelector(`span[ynt-span="${videoId}"]`);
    if (!span) {
        createSpan(element, videoId);
    }
    element.setAttribute('title', title);
    element.setAttribute('ynt', videoId);
    // --- Add observer to update span with latest text
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                const directTextNodes = Array.from(element.childNodes)
                    .filter(node => node.nodeType === Node.TEXT_NODE);
                if (directTextNodes.length > 0) {
                    browsingTitlesLog('Mutiple title detected, updating hidden span');
                    let span = element.querySelector(`span[ynt-span="${videoId}"]`);
                    if (span) {
                        // --- Get last added text node
                        const lastTextNode = directTextNodes[directTextNodes.length - 1];
                        span.textContent = lastTextNode.textContent;
                        // --- Remove all direct text nodes
                        directTextNodes.forEach(node => node.remove());
                    }
                    else if (!span) {
                        createSpan(element, videoId);
                    }
                }
            }
        });
    });
    observer.observe(element, {
        childList: true
    });
    browsingTitlesObserver.set(element, observer);
    titleCache.setElement(element, title);
}
// --- Other Titles Function
async function refreshBrowsingTitles() {
    const now = Date.now();
    if (now - lastBrowsingTitlesRefresh < TITLES_THROTTLE) {
        return;
    }
    lastBrowsingTitlesRefresh = now;
    //browseTitlesLog('Refreshing browsing titles');
    const browsingTitles = document.querySelectorAll('#video-title');
    //browsingTitlesLog('Found videos titles:', browsingTitles.length);
    for (const titleElement of browsingTitles) {
        //browsingTitlesLog('Processing video title:', titleElement.textContent);
        const videoUrl = titleElement.closest('a')?.href;
        if (videoUrl) {
            let videoId = null;
            try {
                const url = new URL(videoUrl);
                if (url.pathname.startsWith('/watch')) {
                    // Classic video
                    videoId = new URLSearchParams(url.search).get('v');
                }
                else if (url.pathname.startsWith('/shorts/')) {
                    // Short video - extract ID from path
                    const pathParts = url.pathname.split('/');
                    videoId = pathParts.length > 2 ? pathParts[2] : null;
                }
            }
            catch (urlError) {
                browsingTitlesErrorLog('Failed to parse video URL:', urlError);
                continue;
            }
            if (videoId) {
                const currentTitle = titleElement.textContent;
                if (titleElement.hasAttribute('ynt-fail')) {
                    if (titleElement.getAttribute('ynt-fail') === videoId) {
                        continue;
                    }
                    titleElement.removeAttribute('ynt-fail');
                }
                ;
                if (titleElement.hasAttribute('ynt-original')) {
                    if (titleElement.getAttribute('ynt-original') === videoId) {
                        continue;
                    }
                    titleElement.removeAttribute('ynt-original');
                }
                ;
                const apiUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}`;
                const originalTitle = await titleCache.getOriginalTitle(apiUrl);
                try {
                    if (!originalTitle) {
                        browsingTitlesErrorLog(`Failed to get original title from API: ${videoId}, keeping current title : ${normalizeText(currentTitle)}`);
                        titleElement.removeAttribute('ynt');
                        titleElement.setAttribute('ynt-fail', videoId);
                        currentTitle && titleElement.setAttribute('title', currentTitle);
                        continue;
                    }
                    if (normalizeText(currentTitle) === normalizeText(originalTitle)) {
                        //browsingTitlesLog('Title is not translated: ', videoId);
                        titleElement.removeAttribute('ynt');
                        titleElement.setAttribute('ynt-original', videoId);
                        currentTitle && titleElement.setAttribute('title', currentTitle);
                        continue;
                    }
                    if (normalizeText(titleElement.getAttribute('title')) === normalizeText(originalTitle) &&
                        titleElement.hasAttribute('ynt')) {
                        let span = titleElement.querySelector(`span[ynt-span="${videoId}"]`);
                        if (span) {
                            continue;
                        }
                    }
                    //browsingTitlesLog('Title is translated: ', videoId);
                }
                catch (error) {
                    //browsingTitlesErrorLog('Failed to get original title for comparison:', error);
                }
                try {
                    updateBrowsingTitleElement(titleElement, originalTitle, videoId);
                }
                catch (error) {
                    browsingTitlesErrorLog(`Failed to update recommended title:`, error);
                }
            }
        }
    }
}
/*
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 *
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */
// --- Shorts Title Function
async function refreshShortMainTitle() {
    // Get the shorts title element
    const shortTitle = document.querySelector('yt-shorts-video-title-view-model h2.ytShortsVideoTitleViewModelShortsVideoTitle span');
    // Get the linked video title element (additional title to translate)
    const linkedVideoTitle = document.querySelector('.ytReelMultiFormatLinkViewModelTitle span');
    if (window.location.pathname.startsWith('/shorts')) {
        //mainTitleLog('Processing shorts title elements');
        // Extract the video ID from the URL
        // Format: /shorts/TNtpUQbW4mg
        const pathSegments = window.location.pathname.split('/');
        const videoId = pathSegments.length > 2 ? pathSegments[2] : null;
        if (videoId) {
            // Process main shorts title
            if (shortTitle && !titleCache.hasElement(shortTitle)) {
                const currentTitle = shortTitle.textContent;
                let originalTitle = null;
                // First try: Get title from player
                try {
                    // Create and inject script
                    const mainTitleScript = document.createElement('script');
                    mainTitleScript.type = 'text/javascript';
                    mainTitleScript.src = browser.runtime.getURL('dist/content/scripts/mainTitleScript.js');
                    // Set up event listener before injecting script
                    const playerTitle = await new Promise((resolve) => {
                        const titleListener = (event) => {
                            window.removeEventListener('ynt-title-data', titleListener);
                            resolve(event.detail.title);
                        };
                        window.addEventListener('ynt-title-data', titleListener);
                        // Inject script after listener is ready
                        document.head.appendChild(mainTitleScript);
                    });
                    if (playerTitle) {
                        originalTitle = playerTitle;
                    }
                }
                catch (error) {
                    mainTitleErrorLog('Failed to get shorts title from player:', error);
                }
                // Second try: Fallback to oembed API
                if (!originalTitle) {
                    mainTitleLog('Falling back to oembed API for shorts');
                    originalTitle = await titleCache.getOriginalTitle(`https://www.youtube.com/oembed?url=https://www.youtube.com/shorts/${videoId}`);
                }
                // Skip if title is already correct
                if (!originalTitle || normalizeText(currentTitle) === normalizeText(originalTitle)) {
                    //mainTitleLog('Main shorts title already correct or could not be retrieved');
                }
                else {
                    // Apply the original title
                    try {
                        updateMainTitleElement(shortTitle, originalTitle, videoId);
                        // No need to update page title for shorts
                    }
                    catch (error) {
                        mainTitleErrorLog(`Failed to update shorts title:`, error);
                    }
                }
            }
            // Process linked video title (if present)
            if (linkedVideoTitle) {
                const currentLinkedTitle = linkedVideoTitle.textContent;
                // Get the linked video ID from the parent anchor element
                const linkedVideoAnchor = linkedVideoTitle.closest('a.ytReelMultiFormatLinkViewModelEndpoint');
                if (linkedVideoAnchor) {
                    const linkedVideoUrl = linkedVideoAnchor.getAttribute('href');
                    if (linkedVideoUrl) {
                        // Extract video ID from URL format "/watch?v=VIDEO_ID"
                        const linkedVideoIdMatch = linkedVideoUrl.match(/\/watch\?v=([^&]+)/);
                        const linkedVideoId = linkedVideoIdMatch ? linkedVideoIdMatch[1] : null;
                        if (linkedVideoId) {
                            // mainTitleLog(`Processing linked video title with ID: ${linkedVideoId}`);
                            // Using only oembed API for linked video as mentioned
                            const linkedOriginalTitle = await titleCache.getOriginalTitle(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${linkedVideoId}`);
                            if (linkedOriginalTitle && normalizeText(currentLinkedTitle) !== normalizeText(linkedOriginalTitle)) {
                                try {
                                    updateMainTitleElement(linkedVideoTitle, linkedOriginalTitle, linkedVideoId);
                                }
                                catch (error) {
                                    mainTitleErrorLog(`Failed to update linked video title:`, error);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
const checkShortsId = () => {
    if (window.location.pathname.startsWith('/shorts')) {
        waitForElement('yt-shorts-video-title-view-model h2.ytShortsVideoTitleViewModelShortsVideoTitle span')
            .then(() => {
            // Extract the current video ID
            const pathSegments = window.location.pathname.split('/');
            const currentVideoId = pathSegments.length > 2 ? pathSegments[2] : null;
            if (currentVideoId) {
                mainTitleLog('Shorts ID changed, updating title for ID:', currentVideoId);
                // Setup multiple refresh attempts with increasing delays
                const delays = [50, 150, 300, 500];
                delays.forEach(delay => {
                    setTimeout(() => {
                        // Only refresh if we're still on the same video
                        const newPathSegments = window.location.pathname.split('/');
                        const newVideoId = newPathSegments.length > 2 ? newPathSegments[2] : null;
                        if (window.location.pathname.startsWith('/shorts') && newVideoId === currentVideoId) {
                            //mainTitleLog(`Refreshing shorts title after ${delay}ms delay`);
                            refreshShortMainTitle();
                        }
                    }, delay);
                });
            }
        });
    }
};
// Handle alternative shorts format with different HTML structure
async function refreshShortsAlternativeFormat() {
    const now = Date.now();
    if (now - lastBrowsingShortsRefresh < TITLES_THROTTLE) {
        return;
    }
    lastBrowsingShortsRefresh = now;
    // Target the specific structure used for alternative shorts display
    const shortsLinks = document.querySelectorAll('.shortsLockupViewModelHostEndpoint');
    for (const shortLink of shortsLinks) {
        try {
            // Check if we've already processed this element correctly
            if (shortLink.hasAttribute('ynt')) {
                const currentTitle = shortLink.querySelector('span')?.textContent;
                const storedTitle = shortLink.getAttribute('title');
                // If the current displayed title and stored title attribute match, no need to update
                if (currentTitle && storedTitle &&
                    normalizeText(currentTitle) === normalizeText(storedTitle)) {
                    continue;
                }
            }
            // Extract video ID from href
            const href = shortLink.getAttribute('href');
            if (!href || !href.includes('/shorts/')) {
                continue;
            }
            const videoId = href.split('/shorts/')[1]?.split('?')[0];
            if (!videoId) {
                continue;
            }
            // Find the title span element
            const titleSpan = shortLink.querySelector('span');
            if (!titleSpan) {
                continue;
            }
            // Get original title through API
            const apiUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}`;
            const originalTitle = await titleCache.getOriginalTitle(apiUrl);
            const currentTitle = titleSpan.textContent;
            if (!originalTitle) {
                browsingTitlesLog(`Failed to get original title from API for short: ${videoId}, keeping current title : ${normalizeText(currentTitle)}`);
                continue;
            }
            if (normalizeText(currentTitle) === normalizeText(originalTitle)) {
                // Already showing correct title, no need to modify
                titleCache.setElement(shortLink, originalTitle);
                continue;
            }
            // Update the title
            browsingTitlesLog(`Updated shorts title from: %c${normalizeText(currentTitle)}%c to: %c${normalizeText(originalTitle)}%c (short id: %c${videoId}%c)`, 'color: grey', 'color: #fca5a5', 'color: white', 'color: #fca5a5', 'color: #4ade80', 'color: #fca5a5');
            // Set the original title
            titleSpan.textContent = originalTitle;
            shortLink.setAttribute('title', originalTitle);
            shortLink.setAttribute('ynt', videoId);
            titleCache.setElement(shortLink, originalTitle);
        }
        catch (error) {
            browsingTitlesErrorLog('Error processing alternative shorts format:', error);
        }
    }
}
/*
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 *
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */
async function syncAudioLanguagePreference() {
    try {
        const result = await browser.storage.local.get('settings');
        const settings = result.settings;
        if (settings?.audioLanguage) {
            localStorage.setItem('audioLanguage', settings.audioLanguage);
        }
    }
    catch (error) {
        audioErrorLog('Error syncing audio language preference:', error);
    }
}
async function handleAudioTranslation() {
    await syncAudioLanguagePreference();
    const script = document.createElement('script');
    script.src = browser.runtime.getURL('dist/content/scripts/audioScript.js');
    document.documentElement.appendChild(script);
}
// Function to handle audio language selection
browser.runtime.onMessage.addListener((message) => {
    if (typeof message === 'object' && message !== null &&
        'feature' in message && message.feature === 'audioLanguage' &&
        'language' in message && typeof message.language === 'string') {
        audioLog(`Setting audio language preference to: ${message.language}`);
        localStorage.setItem('audioLanguage', message.language);
        // Reapply audio if a video is currently playing
        handleAudioTranslation();
    }
    return true;
});
/*
* Copyright (C) 2025-present YouGo (https://github.com/youg-o)
* This program is licensed under the GNU Affero General Public License v3.0.
* You may redistribute it and/or modify it under the terms of the license.
*
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
*/
async function fetchOriginalDescription() {
    return new Promise((resolve) => {
        const handleDescription = (event) => {
            window.removeEventListener('ynt-description-data', handleDescription);
            resolve(event.detail?.description || null);
        };
        window.addEventListener('ynt-description-data', handleDescription);
        const script = document.createElement('script');
        script.src = browser.runtime.getURL('dist/content/scripts/descriptionScript.js');
        document.documentElement.appendChild(script);
    });
}
async function refreshDescription() {
    //descriptionLog('Waiting for description element');
    try {
        await waitForElement('#description-inline-expander');
        // First check if we already have the description in cache
        let description = descriptionCache.getCurrentDescription();
        // Only fetch if not in cache
        if (!description) {
            description = await fetchOriginalDescription();
            //descriptionLog('Description element found, injecting script');
        }
        else {
            //escriptionLog('Using cached description');
        }
        if (description) {
            const descriptionElement = document.querySelector('#description-inline-expander');
            if (descriptionElement) {
                // Always update the element, whether it's in cache or not
                updateDescriptionElement(descriptionElement, description);
                descriptionLog('Description updated to original');
            }
        }
    }
    catch (error) {
        descriptionLog(`${error}`);
    }
}
class DescriptionCache {
    constructor() {
        this.processedElements = new WeakMap();
        this.currentVideoDescription = null;
    }
    hasElement(element) {
        return this.processedElements.has(element);
    }
    setElement(element, description) {
        //descriptionLog('Caching element with description');
        this.processedElements.set(element, description);
        this.currentVideoDescription = description;
    }
    getCurrentDescription() {
        return this.currentVideoDescription;
    }
    clearCurrentDescription() {
        this.currentVideoDescription = null;
    }
}
const descriptionCache = new DescriptionCache();
function updateDescriptionElement(element, description) {
    // Find the text containers
    const attributedString = element.querySelector('yt-attributed-string');
    const snippetAttributedString = element.querySelector('#attributed-snippet-text');
    if (!attributedString && !snippetAttributedString) {
        descriptionErrorLog(`No description text container found`);
        return;
    }
    // Create the text content
    const span = document.createElement('span');
    span.className = 'yt-core-attributed-string yt-core-attributed-string--white-space-pre-wrap';
    span.dir = 'auto';
    // URL regex pattern
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    // Timestamp pattern - matches common YouTube timestamp formats like 1:23 or 1:23:45
    const timestampPattern = /\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/g;
    const lines = description.split('\n');
    lines.forEach((line, index) => {
        // Split the line by URLs and create elements accordingly
        const parts = line.split(urlPattern);
        parts.forEach((part, partIndex) => {
            if (part.match(urlPattern)) {
                // This is a URL, create a link
                const link = document.createElement('a');
                link.href = part;
                link.textContent = part;
                link.className = 'yt-core-attributed-string__link yt-core-attributed-string__link--call-to-action-color';
                link.setAttribute('target', '_blank');
                link.style.color = 'rgb(62, 166, 255)';
                span.appendChild(link);
            }
            else if (part) {
                // Process regular text for timestamps
                let textContent = part;
                let lastIndex = 0;
                let timestampMatch;
                // Create a temporary document fragment to hold the processed content
                const fragment = document.createDocumentFragment();
                // Reset regex index
                timestampPattern.lastIndex = 0;
                // Check if we have timestamps in this part
                while ((timestampMatch = timestampPattern.exec(textContent)) !== null) {
                    // Add text before the timestamp
                    if (timestampMatch.index > lastIndex) {
                        fragment.appendChild(document.createTextNode(textContent.substring(lastIndex, timestampMatch.index)));
                    }
                    // Get timestamp text and calculate seconds
                    const timestamp = timestampMatch[0];
                    let seconds = 0;
                    // Calculate seconds based on format (MM:SS or HH:MM:SS)
                    if (timestampMatch[3]) { // HH:MM:SS format
                        seconds = parseInt(timestampMatch[1]) * 3600 +
                            parseInt(timestampMatch[2]) * 60 +
                            parseInt(timestampMatch[3]);
                    }
                    else { // MM:SS format
                        seconds = parseInt(timestampMatch[1]) * 60 +
                            parseInt(timestampMatch[2]);
                    }
                    // Create outer container span
                    const outerSpan = document.createElement('span');
                    outerSpan.className = 'yt-core-attributed-string--link-inherit-color';
                    outerSpan.dir = 'auto';
                    outerSpan.style.color = 'rgb(62, 166, 255)';
                    // Create timestamp link
                    const timestampLink = document.createElement('a');
                    timestampLink.textContent = timestamp;
                    timestampLink.className = 'yt-core-attributed-string__link yt-core-attributed-string__link--call-to-action-color';
                    timestampLink.style.cursor = 'pointer';
                    timestampLink.tabIndex = 0;
                    timestampLink.setAttribute('ynt-timestamp', seconds.toString());
                    outerSpan.appendChild(timestampLink);
                    fragment.appendChild(outerSpan);
                    // Update last index to continue after this timestamp
                    lastIndex = timestampMatch.index + timestampMatch[0].length;
                }
                // Add any remaining text after the last timestamp
                if (lastIndex < textContent.length) {
                    fragment.appendChild(document.createTextNode(textContent.substring(lastIndex)));
                }
                // If we found timestamps, add the fragment with processed timestamps
                // Otherwise just add the original text
                if (lastIndex > 0) {
                    span.appendChild(fragment);
                }
                else {
                    span.appendChild(document.createTextNode(part));
                }
            }
        });
        if (index < lines.length - 1) {
            span.appendChild(document.createElement('br'));
        }
    });
    // Update both containers if they exist
    if (attributedString) {
        while (attributedString.firstChild) {
            attributedString.removeChild(attributedString.firstChild);
        }
        attributedString.appendChild(span.cloneNode(true));
    }
    if (snippetAttributedString) {
        while (snippetAttributedString.firstChild) {
            snippetAttributedString.removeChild(snippetAttributedString.firstChild);
        }
        snippetAttributedString.appendChild(span.cloneNode(true));
    }
    // Prevent translation on all levels
    [element, attributedString, snippetAttributedString].forEach(el => {
        if (el) {
            el.setAttribute('translate', 'no');
            if (el instanceof HTMLElement) {
                el.style.setProperty('translate', 'no', 'important');
            }
        }
    });
    descriptionCache.setElement(element, description);
    // Set up content observer to prevent re-translation
    setupDescriptionContentObserver();
    // Initialize chapters replacement with the original description
    initializeChaptersReplacement(description);
}
// Compare description text and determine if update is needed
function compareDescription(element) {
    return new Promise(async (resolve) => {
        // Get the cached description or fetch a new one
        let description = descriptionCache.getCurrentDescription();
        if (!description) {
            // Fetch description if not cached
            description = await fetchOriginalDescription();
        }
        // If no description available, we need to update (return false)
        if (!description) {
            resolve(false);
            return;
        }
        // Find the specific text container with the actual description content
        const snippetAttributedString = element.querySelector('#attributed-snippet-text');
        const coreAttributedString = element.querySelector('.yt-core-attributed-string--white-space-pre-wrap');
        if (!snippetAttributedString && !coreAttributedString) {
            resolve(false); // Cannot compare, need to update
            return;
        }
        // Get the actual text content
        const currentTextContainer = snippetAttributedString || coreAttributedString;
        const currentText = currentTextContainer?.textContent || "";
        // Check if description is already in original language (using prefix matching)
        const isOriginal = normalizeText(description, true).startsWith(normalizeText(currentText, true));
        if (isOriginal) {
            descriptionLog('Description is already in original language, no update needed');
        }
        else {
            descriptionCache.setElement(element, description);
        }
        // Return true if original (no update needed), false if update needed
        resolve(isOriginal);
    });
}
/*
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 *
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */
async function syncSubtitlesLanguagePreference() {
    try {
        const result = await browser.storage.local.get('settings');
        const settings = result.settings;
        if (settings?.subtitlesLanguage) {
            localStorage.setItem('subtitlesLanguage', settings.subtitlesLanguage);
            //subtitlesLog(`Synced subtitle language preference from extension storage: ${settings.subtitlesLanguage}`);
        }
    }
    catch (error) {
        subtitlesLog('Error syncing subtitle language preference:', error);
    }
}
// Call this function during initialization
async function handleSubtitlesTranslation() {
    //subtitlesLog('Initializing subtitles translation prevention');
    await syncSubtitlesLanguagePreference(); // Sync language preference
    const script = document.createElement('script');
    script.src = browser.runtime.getURL('dist/content/scripts/subtitlesScript.js');
    document.documentElement.appendChild(script);
}
// Function to handle subtitle language selection
browser.runtime.onMessage.addListener((message) => {
    coreLog('Received message:', message); // Add debug log
    if (typeof message === 'object' && message !== null &&
        'feature' in message && message.feature === 'subtitlesLanguage' &&
        'language' in message && typeof message.language === 'string') {
        // Store preference directly without JSON.stringify
        subtitlesLog(`Setting subtitle language preference to: ${message.language}`);
        localStorage.setItem('subtitlesLanguage', message.language);
        // Reapply subtitles if a video is currently playing
        handleSubtitlesTranslation();
    }
    return true;
});
/*
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 *
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */
let channelNameContentObserver = null;
function cleanupChannelNameContentObserver() {
    if (channelNameContentObserver) {
        channelNameContentObserver.disconnect();
        channelNameContentObserver = null;
    }
}
function updateChannelNameElement(element, originalName) {
    cleanupChannelNameContentObserver(); // Clean up any existing observer
    // Get the anchor element
    const anchorElement = element.querySelector('a');
    if (!anchorElement) {
        channelNameErrorLog('No anchor element found in channel name');
        return;
    }
    // Current displayed name
    const currentName = normalizeText(element.textContent);
    // Update both the title attribute and the text content
    element.setAttribute('title', originalName);
    anchorElement.textContent = originalName;
    channelNameLog(`Updated channel name from: %c${currentName}%c to: %c${originalName}%c`, 'color: white', 'color: #06b6d4', 'color: white', 'color: #06b6d4');
    // Setup observer to prevent YouTube from changing it back
    channelNameContentObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' ||
                (mutation.type === 'attributes' && mutation.attributeName === 'title')) {
                // Current text after potential YouTube change
                const currentText = normalizeText(element.textContent);
                // If YouTube changed it back, reapply our original
                if (currentText !== normalizeText(originalName) ||
                    element.getAttribute('title') !== originalName) {
                    channelNameLog('YouTube changed channel name, reverting to original');
                    element.setAttribute('title', originalName);
                    anchorElement.textContent = originalName;
                }
            }
        });
    });
    // Watch for changes to the element
    channelNameContentObserver.observe(element, {
        childList: true,
        attributes: true,
        attributeFilter: ['title'],
        subtree: true
    });
}
async function refreshChannelName() {
    // Find the channel name element
    const channelNameElement = document.querySelector('ytd-watch-metadata ytd-video-owner-renderer ytd-channel-name yt-formatted-string#text');
    if (!channelNameElement) {
        //channelNameLog('Channel name element not found');
        return;
    }
    // Get video ID from URL
    const videoId = new URLSearchParams(window.location.search).get('v');
    if (!videoId) {
        //channelNameLog('No video ID found in URL');
        return;
    }
    //channelNameLog('Processing channel name element');
    try {
        // Create and inject script
        const channelNameScript = document.createElement('script');
        channelNameScript.type = 'text/javascript';
        channelNameScript.src = browser.runtime.getURL('dist/content/scripts/channelNameScript.js');
        // Set up event listener before injecting script
        const originalChannelName = await new Promise((resolve) => {
            const channelListener = (event) => {
                window.removeEventListener('ynt-channel-data', channelListener);
                resolve(event.detail.channelName);
            };
            window.addEventListener('ynt-channel-data', channelListener);
            // Inject script after listener is ready
            document.head.appendChild(channelNameScript);
        });
        if (!originalChannelName) {
            channelNameLog('Failed to get original channel name from player');
            return;
        }
        const normalizedCurrentName = normalizeText(channelNameElement.textContent);
        const normalizedOriginalName = normalizeText(originalChannelName);
        if (normalizedCurrentName === normalizedOriginalName) {
            channelNameLog('Channel name is already original');
            return;
        }
        // Update channel name element
        updateChannelNameElement(channelNameElement, originalChannelName);
    }
    catch (error) {
        channelNameErrorLog(`Failed to update channel name:`, error);
    }
}
/*
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 *
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */
// Global variables for cleanup
let chaptersObserver = null;
let chaptersUpdateInterval = null;
// Cleanup function for chapters observer
function cleanupChaptersObserver() {
    if (chaptersObserver) {
        chaptersObserver.disconnect();
        chaptersObserver = null;
    }
    if (chaptersUpdateInterval) {
        clearInterval(chaptersUpdateInterval);
        chaptersUpdateInterval = null;
    }
    // Remove CSS style
    const style = document.getElementById('ynt-chapters-style');
    if (style) {
        style.remove();
    }
    // Remove all chapter attributes
    document.querySelectorAll('[data-original-chapter]').forEach(el => {
        el.removeAttribute('data-original-chapter');
    });
}
// Convert time string to seconds
function timeStringToSeconds(timeString) {
    const parts = timeString.split(':').map(Number);
    if (parts.length === 2) {
        return parts[0] * 60 + parts[1]; // MM:SS
    }
    else if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2]; // HH:MM:SS
    }
    return 0;
}
// Parse chapters from description text
function parseChaptersFromDescription(description) {
    const chapters = [];
    description.split('\n').forEach(line => {
        const match = line.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s+(.+)$/);
        if (match) {
            const [, minutes, seconds, hours, title] = match;
            const totalSeconds = (hours ? parseInt(hours) * 3600 : 0) +
                parseInt(minutes) * 60 +
                parseInt(seconds);
            chapters.push({
                startTime: totalSeconds,
                title: title.trim()
            });
        }
    });
    return chapters;
}
// Find chapter based on time in seconds
function findChapterByTime(timeInSeconds, chapters) {
    if (chapters.length === 0)
        return null;
    let targetChapter = chapters[0];
    for (let i = chapters.length - 1; i >= 0; i--) {
        if (timeInSeconds >= chapters[i].startTime) {
            targetChapter = chapters[i];
            break;
        }
    }
    return targetChapter;
}
// Cache for parsed chapters to avoid re-parsing
let cachedChapters = [];
let lastDescriptionHash = '';
// Optimized update function with early returns
function updateTooltipChapter() {
    // Only query for visible tooltips
    const visibleTooltip = document.querySelector('.ytp-tooltip.ytp-bottom.ytp-preview:not([style*="display: none"])');
    if (!visibleTooltip)
        return;
    const timeElement = visibleTooltip.querySelector('.ytp-tooltip-text');
    const titleElement = visibleTooltip.querySelector('.ytp-tooltip-title span');
    if (!timeElement || !titleElement)
        return;
    const timeString = timeElement.textContent?.trim();
    if (!timeString)
        return;
    const timeInSeconds = timeStringToSeconds(timeString);
    const targetChapter = findChapterByTime(timeInSeconds, cachedChapters);
    if (targetChapter) {
        const currentOriginalChapter = titleElement.getAttribute('data-original-chapter');
        if (currentOriginalChapter !== targetChapter.title) {
            chaptersLog(`Time: ${timeString} (${timeInSeconds}s) -> Chapter: "${targetChapter.title}"`);
            titleElement.setAttribute('data-original-chapter', targetChapter.title);
        }
    }
}
// Hash function for description caching
function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
}
// Initialize chapters replacement system
function initializeChaptersReplacement(originalDescription) {
    // Clean up any existing observer first
    cleanupChaptersObserver();
    // Cache chapters if description hasn't changed
    const descriptionHash = hashString(originalDescription);
    if (descriptionHash !== lastDescriptionHash) {
        cachedChapters = parseChaptersFromDescription(originalDescription);
        lastDescriptionHash = descriptionHash;
    }
    if (cachedChapters.length === 0) {
        chaptersLog('No chapters found in description');
        return;
    }
    chaptersLog(`Found ${cachedChapters.length} original chapters`);
    // Create CSS that hides chapter title text and shows custom content
    const style = document.createElement('style');
    style.id = 'ynt-chapters-style';
    style.textContent = `
        .ytp-tooltip.ytp-bottom.ytp-preview .ytp-tooltip-title span {
            font-size: 0 !important;
            line-height: 0 !important;
        }
        
        .ytp-tooltip.ytp-bottom.ytp-preview .ytp-tooltip-title span[data-original-chapter]::after {
            content: attr(data-original-chapter);
            font-size: 12px !important;
            line-height: normal !important;
            color: inherit;
            font-family: inherit;
            display: inline !important;
        }
    `;
    document.head.appendChild(style);
    // More targeted observer - only watch for tooltip appearances
    chaptersObserver = new MutationObserver(mutations => {
        let shouldUpdate = false;
        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const element = node;
                        // More specific targeting
                        if (element.classList?.contains('ytp-tooltip') &&
                            element.classList?.contains('ytp-preview')) {
                            shouldUpdate = true;
                        }
                    }
                });
            }
            // Only watch for changes in tooltip text content
            if (mutation.type === 'characterData') {
                const parent = mutation.target.parentElement;
                if (parent?.classList?.contains('ytp-tooltip-text')) {
                    shouldUpdate = true;
                }
            }
        });
        if (shouldUpdate) {
            // Debounce updates
            setTimeout(updateTooltipChapter, 16); // ~60fps instead of immediate
        }
    });
    const player = document.getElementById('movie_player');
    if (player) {
        chaptersObserver.observe(player, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }
    // Reduced interval frequency - 200ms instead of 100ms
    chaptersUpdateInterval = setInterval(updateTooltipChapter, 200);
    chaptersLog('Optimized chapters replacement initialized');
}
/*
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 *
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */
// TODO: Current observer implementation could be refactored for better efficiency / performances
// Keeping current structure for stability, needs architectural review in future updates
// MAIN OBSERVERS -----------------------------------------------------------
let loadStartListener = null;
function setupLoadStartListener() {
    cleanUpLoadStartListener();
    coreLog('Setting up loadstart listener');
    loadStartListener = function (e) {
        if (!(e.target instanceof HTMLVideoElement))
            return;
        if (e.target.srcValue === e.target.src)
            return;
        coreLog('Video source changed.');
        currentSettings?.audioTranslation && handleAudioTranslation();
        currentSettings?.subtitlesTranslation && handleSubtitlesTranslation();
        if (currentSettings?.titleTranslation && isEmbedVideo()) {
            setTimeout(() => {
                refreshEmbedTitle();
            }, 1000);
        }
    };
    document.addEventListener('loadstart', loadStartListener, true);
}
function cleanUpLoadStartListener() {
    if (loadStartListener) {
        document.removeEventListener('loadstart', loadStartListener, true);
        loadStartListener = null;
    }
}
//let mainVideoObserver: MutationObserver | null = null;
function setupMainVideoObserver() {
    //cleanupMainVideoObserver();
    waitForElement('ytd-watch-flexy').then((watchFlexy) => {
        /*coreLog('Setting up video-id observer');
        mainVideoObserver = new MutationObserver(async (mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'video-id') {
                    titleCache.clear();
                    descriptionCache.clearCurrentDescription()
                    
                    const newVideoId = (mutation.target as HTMLElement).getAttribute('video-id');
                    coreLog('Video ID changed:', newVideoId);
                    
                    if (currentSettings?.titleTranslation) {
                        // Wait for movie_player and title element
                        const [player, titleElement] = await Promise.all([
                            waitForElement('#movie_player'),
                            waitForElement('ytd-watch-metadata yt-formatted-string.style-scope.ytd-watch-metadata')
                        ]);
    
                        // Only proceed if we're still on the same page
                        if (titleElement.textContent) {
                            await refreshMainTitle();
                            await refreshChannelName();
                        }
                    }

                    currentSettings?.descriptionTranslation && processDescriptionForVideoId();
                }
            }
        });*/
        if (currentSettings?.descriptionTranslation) {
            // Manually trigger for the initial video when setting up the observer
            // This handles the case where we navigate to a video page via SPA
            const currentVideoId = watchFlexy.getAttribute('video-id');
            if (currentVideoId) {
                //descriptionLog('Manually triggering for initial video-id:', currentVideoId);
                descriptionCache.clearCurrentDescription();
                // Process the initial video ID
                processDescriptionForVideoId();
            }
        }
        if (currentSettings?.titleTranslation) {
            const currentVideoId = watchFlexy.getAttribute('video-id');
            if (currentVideoId) {
                refreshMainTitle();
                refreshChannelName();
            }
        }
        /*mainVideoObserver.observe(watchFlexy, {
            attributes: true,
            attributeFilter: ['video-id']
        });*/
    });
}
/*function cleanupMainVideoObserver() {
    mainVideoObserver?.disconnect();
    mainVideoObserver = null;
}*/
// DESCRIPTION OBSERVERS ------------------------------------------------------------
let descriptionExpansionObserver = null;
let descriptionContentObserver = null;
// Helper function to process description for current video ID
function processDescriptionForVideoId() {
    const descriptionElement = document.querySelector('#description-inline-expander');
    if (descriptionElement) {
        waitForElement('#movie_player').then(() => {
            // Instead of calling refreshDescription directly
            // Call compareDescription first
            compareDescription(descriptionElement).then(isOriginal => {
                if (!isOriginal) {
                    // Only refresh if not original                                 
                    refreshDescription().then(() => {
                        descriptionExpandObserver();
                        setupDescriptionContentObserver();
                    });
                }
                else {
                    cleanupDescriptionObservers();
                }
            });
        });
    }
    else {
        // If not found, wait for it
        waitForElement('#description-inline-expander').then(() => {
            refreshDescription();
            descriptionExpandObserver();
        });
    }
}
function descriptionExpandObserver() {
    // Observer for description expansion/collapse
    waitForElement('#description-inline-expander').then((descriptionElement) => {
        //descriptionLog('Setting up expand/collapse observer');
        descriptionExpansionObserver = new MutationObserver(async (mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'is-expanded') {
                    descriptionLog('Description expanded/collapsed');
                    const cachedDescription = descriptionCache.getCurrentDescription();
                    if (cachedDescription) {
                        //descriptionLog('Using cached description');
                        updateDescriptionElement(descriptionElement, cachedDescription);
                    }
                    else {
                        const description = await fetchOriginalDescription();
                        if (description) {
                            updateDescriptionElement(descriptionElement, description);
                        }
                    }
                }
            }
        });
        descriptionExpansionObserver.observe(descriptionElement, {
            attributes: true,
            attributeFilter: ['is-expanded']
        });
    });
}
function setupDescriptionContentObserver() {
    // Cleanup existing observer avoiding infinite loops
    cleanupDescriptionContentObserver();
    const descriptionElement = document.querySelector('#description-inline-expander');
    if (!descriptionElement) {
        descriptionLog('Description element not found, skipping content observer setup');
        return;
    }
    // Get cached description
    let cachedDescription = descriptionCache.getCurrentDescription();
    if (!cachedDescription) {
        descriptionLog('No cached description available, fetching from API');
        // Fetch description instead of returning
        fetchOriginalDescription().then(description => {
            if (description) {
                // Cache the description
                cachedDescription = description;
                descriptionCache.setElement(descriptionElement, description);
                // Now set up the observer with the fetched description
                setupObserver();
            }
        });
        return; // Still need to return here since we're doing async work
    }
    // If we have a cached description, set up the observer
    setupObserver();
    // Local function to avoid duplicating the observer setup code
    function setupObserver() {
        //descriptionLog('Setting up description content observer');
        descriptionContentObserver = new MutationObserver((mutations) => {
            // Skip if we don't have a cached description to compare with
            if (!cachedDescription) {
                descriptionLog('No cached description available, skipping content observer setup');
                return;
            }
            // Add a small delay to allow YouTube to finish its modifications
            setTimeout(() => {
                // Make sure descriptionElement still exists in this closure
                if (!descriptionElement)
                    return;
                // Find the specific text container with the actual description content
                const snippetAttributedString = descriptionElement.querySelector('#attributed-snippet-text');
                const coreAttributedString = descriptionElement.querySelector('.yt-core-attributed-string--white-space-pre-wrap');
                if (!snippetAttributedString && !coreAttributedString)
                    return;
                // Get the actual text content
                const currentTextContainer = snippetAttributedString || coreAttributedString;
                const currentText = currentTextContainer?.textContent?.trim();
                // Compare similarity instead of exact match
                const similarity = calculateSimilarity(normalizeText(currentText, true), normalizeText(cachedDescription, true));
                // Consider texts similar if they match at least 75%
                const isOriginal = similarity >= 0.75;
                if (isOriginal)
                    return;
                //descriptionLog(`currentText: ${normalizeText(currentText, true)}`);
                //descriptionLog(`cachedDescription: ${normalizeText(cachedDescription, true)}`);
                //descriptionLog(`Similarity: ${(similarity * 100).toFixed(1)}%`);
                descriptionLog('Description content changed by YouTube, restoring original');
                // Temporarily disconnect to prevent infinite loop
                descriptionContentObserver?.disconnect();
                // Update with original description - ensure cachedDescription isn't null
                updateDescriptionElement(descriptionElement, cachedDescription);
                // Reconnect observer
                if (descriptionContentObserver) {
                    descriptionContentObserver.observe(descriptionElement, {
                        childList: true,
                        subtree: true,
                        characterData: true
                    });
                }
            }, 50); // 50ms delay
        });
        // Start observing - ensure descriptionElement isn't null
        if (descriptionContentObserver && descriptionElement) {
            descriptionContentObserver.observe(descriptionElement, {
                childList: true,
                subtree: true,
                characterData: true
            });
        }
        //descriptionLog('Description content observer setup completed');
    }
}
function cleanupDescriptionContentObserver() {
    descriptionContentObserver?.disconnect();
    descriptionContentObserver = null;
}
function cleanupDescriptionObservers() {
    descriptionExpansionObserver?.disconnect();
    descriptionExpansionObserver = null;
    cleanupDescriptionContentObserver();
}
let timestampClickHandler = null;
function setupTimestampClickObserver() {
    // Clean up existing handler first
    cleanupTimestampClickObserver();
    // Create new handler
    timestampClickHandler = (event) => {
        const target = event.target;
        // Check if the clicked element is a timestamp link or a child of it
        const timestampLink = target.closest('a[ynt-timestamp]');
        if (timestampLink instanceof HTMLElement) {
            // Prevent default navigation
            event.preventDefault();
            event.stopPropagation();
            // Get timestamp seconds from attribute
            const seconds = timestampLink.getAttribute('ynt-timestamp');
            // Scroll to the top of the page for better user experience
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
            // Create timestamp data object
            const timestampData = {
                seconds: seconds
            };
            // Create and inject script with timestamp data
            const script = document.createElement('script');
            script.src = browser.runtime.getURL('dist/content/scripts/timestampScript.js');
            script.setAttribute('ynt-timestamp-event', JSON.stringify(timestampData));
            document.documentElement.appendChild(script);
            // Remove script after execution
            setTimeout(() => {
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                }
            }, 100);
        }
    };
    // Add the event listener
    document.addEventListener('click', timestampClickHandler);
    //descriptionLog('Timestamp click observer setup completed');
}
function cleanupTimestampClickObserver() {
    if (timestampClickHandler) {
        document.removeEventListener('click', timestampClickHandler);
        timestampClickHandler = null;
    }
}
// BROWSING TITLES OBSERVER -----------------------------------------------------------
let homeObserver = null;
let recommendedObserver = null;
let searchObserver = null;
let playlistObserver = null;
let lastHomeRefresh = 0;
let lastRecommendedRefresh = 0;
let lastSearchRefresh = 0;
let lastPlaylistRefresh = 0;
const THROTTLE_DELAY = 1000; // minimum of X ms between refreshes between container mutations
function pageVideosObserver() {
    cleanupPageVideosObserver();
    // --- Observer for home page | Channel page
    waitForElement('#contents.ytd-rich-grid-renderer').then((contents) => {
        let pageName = null;
        if (window.location.pathname === '/') {
            pageName = 'Home';
        }
        else if (window.location.pathname === '/feed/subscriptions') {
            pageName = 'Subscriptions';
        }
        else if (window.location.pathname.includes('/@')) {
            pageName = 'Channel';
        }
        else if (window.location.pathname === '/feed/trending') {
            pageName = 'Trending';
        }
        browsingTitlesLog(`Setting up ${pageName} page videos observer`);
        refreshBrowsingTitles();
        refreshShortsAlternativeFormat();
        homeObserver = new MutationObserver(() => {
            const now = Date.now();
            if (now - lastHomeRefresh >= THROTTLE_DELAY) {
                browsingTitlesLog(`${pageName} page mutation detected`);
                refreshBrowsingTitles();
                refreshShortsAlternativeFormat();
                lastHomeRefresh = now;
            }
        });
        homeObserver.observe(contents, {
            childList: true
        });
        //browsingTitlesLog('Home/Channel page observer setup completed');
    });
}
;
function recommandedVideosObserver() {
    cleanupRecommandedVideosObserver();
    // --- Observer for recommended videos
    waitForElement('#secondary-inner ytd-watch-next-secondary-results-renderer #items').then((contents) => {
        browsingTitlesLog('Setting up recommended videos observer');
        refreshBrowsingTitles();
        recommendedObserver = new MutationObserver(() => {
            const now = Date.now();
            if (now - lastRecommendedRefresh >= THROTTLE_DELAY) {
                browsingTitlesLog('Recommended videos mutation detected');
                refreshBrowsingTitles();
                lastRecommendedRefresh = now;
            }
        });
        recommendedObserver.observe(contents, {
            childList: true
        });
        //browsingTitlesLog('Recommended videos observer setup completed');
    });
}
;
function searchResultsObserver() {
    cleanupSearchResultsVideosObserver();
    // --- Observer for search results
    waitForElement('ytd-section-list-renderer #contents').then((contents) => {
        let pageName = null;
        if (window.location.pathname === '/results') {
            pageName = 'Search';
        }
        else if (window.location.pathname === '/feed/history') {
            pageName = 'History';
        }
        browsingTitlesLog(`Setting up ${pageName} results videos observer`);
        refreshBrowsingTitles();
        refreshShortsAlternativeFormat();
        searchObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList' &&
                    mutation.addedNodes.length > 0 &&
                    mutation.target instanceof HTMLElement) {
                    const titles = mutation.target.querySelectorAll('#video-title');
                    if (titles.length > 0) {
                        const now = Date.now();
                        if (now - lastSearchRefresh >= THROTTLE_DELAY) {
                            browsingTitlesLog(`${pageName} results mutation detected`);
                            refreshBrowsingTitles();
                            refreshShortsAlternativeFormat();
                            lastSearchRefresh = now;
                        }
                        break;
                    }
                }
            }
        });
        searchObserver.observe(contents, {
            childList: true,
            subtree: true
        });
    });
}
;
function playlistVideosObserver() {
    cleanupPlaylistVideosObserver();
    // --- Observer for playlist/queue videos
    waitForElement('#playlist ytd-playlist-panel-renderer #items').then((contents) => {
        browsingTitlesLog('Setting up playlist/queue videos observer');
        refreshBrowsingTitles();
        playlistObserver = new MutationObserver(() => {
            const now = Date.now();
            if (now - lastPlaylistRefresh >= THROTTLE_DELAY) {
                browsingTitlesLog('Playlist/Queue mutation detected');
                refreshBrowsingTitles();
                lastPlaylistRefresh = now;
            }
        });
        playlistObserver.observe(contents, {
            childList: true
        });
        browsingTitlesLog('Playlist/Queue observer setup completed');
    });
}
;
function cleanupAllBrowsingTitlesObservers() {
    cleanupPageVideosObserver();
    cleanupRecommandedVideosObserver();
    cleanupSearchResultsVideosObserver();
    cleanupPlaylistVideosObserver();
}
;
function cleanupPageVideosObserver() {
    homeObserver?.disconnect();
    homeObserver = null;
    lastHomeRefresh = 0;
}
function cleanupRecommandedVideosObserver() {
    recommendedObserver?.disconnect();
    recommendedObserver = null;
    lastRecommendedRefresh = 0;
}
function cleanupSearchResultsVideosObserver() {
    searchObserver?.disconnect();
    searchObserver = null;
    lastSearchRefresh = 0;
}
function cleanupPlaylistVideosObserver() {
    playlistObserver?.disconnect();
    playlistObserver = null;
    lastPlaylistRefresh = 0;
}
// URL OBSERVER -----------------------------------------------------------
function setupUrlObserver() {
    coreLog('Setting up URL observer');
    // --- Standard History API monitoring
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    history.pushState = function (...args) {
        coreLog('pushState called with:', args);
        originalPushState.apply(this, args);
        handleUrlChange();
    };
    history.replaceState = function (...args) {
        coreLog('replaceState called with:', args);
        originalReplaceState.apply(this, args);
        handleUrlChange();
    };
    // --- Browser navigation (back/forward)
    window.addEventListener('popstate', () => {
        coreLog('popstate event triggered');
        handleUrlChange();
    });
    // --- YouTube's custom page data update event
    window.addEventListener('yt-page-data-updated', () => {
        coreLog('YouTube page data updated');
        handleUrlChange();
    });
    // --- YouTube's custom SPA navigation events
    /*
    window.addEventListener('yt-navigate-start', () => {
        coreLog('YouTube SPA navigation started');
        handleUrlChange();
        });
        */
    /*
    window.addEventListener('yt-navigate-finish', () => {
     coreLog('YouTube SPA navigation completed');
     handleUrlChange();
     });
 */
}
function handleUrlChange() {
    //coreLog(`[URL] Current pathname:`, window.location.pathname);
    coreLog(`[URL] Full URL:`, window.location.href);
    // --- Clean up existing observers
    cleanupMainTitleContentObserver();
    cleanupIsEmptyObserver();
    cleanupPageTitleObserver();
    cleanupChannelNameContentObserver();
    cleanupAllBrowsingTitlesObservers();
    cleanupAllBrowsingTitlesElementsObservers();
    cleanupDescriptionObservers();
    cleanupTimestampClickObserver();
    cleanupChaptersObserver();
    //coreLog('Observers cleaned up');
    if (currentSettings?.titleTranslation) {
        setTimeout(() => {
            refreshBrowsingTitles();
            refreshShortsAlternativeFormat();
        }, 2000);
        setTimeout(() => {
            refreshBrowsingTitles();
            refreshShortsAlternativeFormat();
        }, 5000);
        setTimeout(() => {
            refreshBrowsingTitles();
            refreshShortsAlternativeFormat();
        }, 10000);
        setTimeout(() => {
            refreshBrowsingTitles();
            refreshShortsAlternativeFormat();
        }, 60000);
    }
    // --- Check if URL contains patterns
    const isChannelPage = window.location.pathname.includes('/@');
    if (isChannelPage) {
        // --- Handle all new channel page types (videos, featured, shorts, etc.)
        coreLog(`[URL] Detected channel page`);
        if (currentSettings?.titleTranslation) {
            pageVideosObserver();
        }
        return;
    }
    const isShortsPage = window.location.pathname.startsWith('/shorts');
    if (isShortsPage) {
        coreLog(`[URL] Detected shorts page`);
        currentSettings?.titleTranslation && checkShortsId();
        return;
    }
    switch (window.location.pathname) {
        case '/results': // --- Search page
            coreLog(`[URL] Detected search page`);
            currentSettings?.titleTranslation && searchResultsObserver();
            break;
        case '/': // --- Home page
            coreLog(`[URL] Detected home page`);
            currentSettings?.titleTranslation && pageVideosObserver();
            break;
        case '/feed/subscriptions': // --- Subscriptions page
            coreLog(`[URL] Detected subscriptions page`);
            currentSettings?.titleTranslation && pageVideosObserver();
            break;
        case '/feed/trending': // --- Trending page
            coreLog(`[URL] Detected trending page`);
            currentSettings?.titleTranslation && pageVideosObserver();
            break;
        case '/feed/history': // --- History page
            coreLog(`[URL] Detected history page`);
            currentSettings?.titleTranslation && searchResultsObserver();
            break;
        case '/playlist': // --- Playlist page
            coreLog(`[URL] Detected playlist page`);
            currentSettings?.titleTranslation && playlistVideosObserver();
            break;
        case '/channel': // --- Channel page (old format)
            coreLog(`[URL] Detected channel page`);
            currentSettings?.titleTranslation && pageVideosObserver();
            break;
        case '/watch': // --- Video page
            coreLog(`[URL] Detected video page`);
            if (currentSettings?.titleTranslation || currentSettings?.descriptionTranslation) {
                setupMainVideoObserver();
            }
            ;
            currentSettings?.titleTranslation && recommandedVideosObserver();
            currentSettings?.descriptionTranslation && setupTimestampClickObserver();
            break;
        case '/embed': // --- Embed video page
            coreLog(`[URL] Detected embed video page`);
            break;
    }
}
// --- Visibility change listener to refresh titles when tab becomes visible
let visibilityChangeListener = null;
function setupVisibilityChangeListener() {
    // Clean up existing listener first
    cleanupVisibilityChangeListener();
    coreLog('Setting up visibility change listener');
    visibilityChangeListener = () => {
        // Only execute when tab becomes visible again
        if (document.visibilityState === 'visible') {
            coreLog('Tab became visible, refreshing titles to fix potential duplicates');
            // Refresh titles to fix any potentially duplicated titles
            if (currentSettings?.titleTranslation) {
                refreshBrowsingTitles();
                refreshShortsAlternativeFormat();
            }
        }
    };
    // Add the event listener
    document.addEventListener('visibilitychange', visibilityChangeListener);
}
function cleanupVisibilityChangeListener() {
    if (visibilityChangeListener) {
        document.removeEventListener('visibilitychange', visibilityChangeListener);
        visibilityChangeListener = null;
    }
}
/*
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 *
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */
coreLog('Content script starting to load...');
let currentSettings = null;
// Fetch settings once and store them in currentSettings
async function fetchSettings() {
    const data = await browser.storage.local.get('settings');
    currentSettings = data.settings;
}
;
// Helper functions to detect if we're on an embed video (like youtube-nocookie.com)
function isEmbedVideo() {
    return window.location.pathname.startsWith('/embed/');
}
// Initialize features based on settings
async function initializeFeatures() {
    await fetchSettings();
    setupUrlObserver();
    setupVisibilityChangeListener();
    if (isEmbedVideo()) {
        coreLog('Embed video detected;');
    }
    currentSettings?.titleTranslation && initializeTitleTranslation();
    currentSettings?.audioTranslation && initializeAudioTranslation();
    currentSettings?.descriptionTranslation && initializeDescriptionTranslation();
    currentSettings?.subtitlesTranslation && initializeSubtitlesTranslation();
}
// Initialize functions
let loadStartListenerInitialized = false;
function initializeLoadStartListener() {
    if (!loadStartListenerInitialized && (currentSettings?.audioTranslation || currentSettings?.subtitlesTranslation)) {
        setupLoadStartListener();
        loadStartListenerInitialized = true;
    }
}
let mainVideoObserverInitialized = false;
function initializeMainVideoObserver() {
    if (!mainVideoObserverInitialized && (currentSettings?.titleTranslation || currentSettings?.descriptionTranslation)) {
        setupMainVideoObserver();
        mainVideoObserverInitialized = true;
    }
}
function initializeTitleTranslation() {
    titlesLog('Initializing title translation prevention');
    if (isEmbedVideo()) {
        initializeLoadStartListener();
        return;
    }
    //initializeMainVideoObserver();
}
function initializeAudioTranslation() {
    audioLog('Initializing audio translation prevention');
    handleAudioTranslation();
    initializeLoadStartListener();
}
;
function initializeDescriptionTranslation() {
    if (isEmbedVideo()) {
        return;
    }
    descriptionLog('Initializing description translation prevention');
    //initializeMainVideoObserver();
}
;
function initializeSubtitlesTranslation() {
    subtitlesLog('Initializing subtitles translation prevention');
    handleSubtitlesTranslation();
    initializeLoadStartListener();
}
;
browser.runtime.onMessage.addListener((message) => {
    if (isToggleMessage(message)) {
        switch (message.feature) {
            case 'audio':
                if (message.isEnabled) {
                    handleAudioTranslation();
                    initializeLoadStartListener();
                }
                break;
            case 'titles':
                if (message.isEnabled) {
                    refreshMainTitle();
                    refreshBrowsingTitles();
                    refreshShortsAlternativeFormat();
                    initializeMainVideoObserver();
                }
                break;
            case 'description':
                if (message.isEnabled) {
                    refreshDescription();
                    initializeMainVideoObserver();
                }
                break;
            case 'subtitles':
                if (message.isEnabled) {
                    handleSubtitlesTranslation();
                    initializeLoadStartListener();
                }
                break;
        }
        return true;
    }
    return true;
});
// Start initialization
initializeFeatures();
