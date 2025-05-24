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
        color: '#fcd34d'  // yellow
    },
    BROWSING_TITLES: {
        context: '[Browsing Titles]',
        color: '#fca5a5'  // light red
    },
    TITLES: {
        context: '[Titles]',
        color: '#86efac'  // light green
    },
    DESCRIPTION: {
        context: '[Description]',
        color: '#2196F3'  // blue
    },
    AUDIO: {
        context: '[Audio]',
        color: '#4CAF50'  // green
    },
    CORE: {
        context: '[Core]',
        color: '#c084fc'  // light purple
    },
    SUBTITLES: {
        context: '[Subtitles]',
        color: '#FF9800'  // orange
    },
    CHANNEL_NAME: {
        context: '[Channel Name]',
        color: '#06b6d4'  // light blue
    },
    CHAPTERS: {
        context: '[CHAPTERS]',
        color: '#9C27B0'  // purple
    }
} as const;

// Error color for all error logs
const ERROR_COLOR = '#F44336';  // Red

function createLogger(category: { context: string; color: string }) {
    return (message: string, ...args: any[]) => {
        console.log(
            `%c${LOG_PREFIX}${category.context} ${message}`,
            `color: ${category.color}`,
            ...args
        );
    };
}

// Create error logger function
function createErrorLogger(category: { context: string; color: string }) {
    return (message: string, ...args: any[]) => {
        console.log(
            `%c${LOG_PREFIX}${category.context} %c${message}`,
            `color: ${category.color}`,  // Keep category color for prefix
            `color: ${ERROR_COLOR}`,     // Red color for error message
            ...args
        );
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