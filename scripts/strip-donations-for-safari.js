/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */


const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '..', 'dist');

function stripDonationsFromHTML(filePath) {
    if (!fs.existsSync(filePath)) {
        console.warn(`[Safari] File not found: ${filePath}`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Remove Ko-fi footer section in settings.html
    if (filePath.includes('settings.html')) {
        const kofiFooterRegex = /<div class="flex flex-col items-center">[\s\S]*?<\/div>\s*<div class="flex items-center justify-between">/;
        if (kofiFooterRegex.test(content)) {
            content = content.replace(kofiFooterRegex, '<div class="flex items-center justify-between">');
            modified = true;
        }
    }

    // Remove Ko-fi link in popup.html
    if (filePath.includes('popup.html')) {
        const kofiLinkRegex = /<div class="flex justify-center">[\s\S]*?<a href="https:\/\/ko-fi\.com\/yougo"[\s\S]*?<\/a>[\s\S]*?<\/div>/;
        if (kofiLinkRegex.test(content)) {
            content = content.replace(kofiLinkRegex, '');
            modified = true;
        }
    }

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`[Safari] Removed Ko-fi links from: ${path.basename(filePath)}`);
    }
}

function removeToastHTML() {
    const toastPath = path.join(DIST_DIR, 'content', 'toast.html');
    if (fs.existsSync(toastPath)) {
        fs.unlinkSync(toastPath);
        console.log('[Safari] Removed toast.html');
    }
}

function removeKofiIcon() {
    const kofiIconPath = path.join(DIST_DIR, 'assets', 'icons', 'ko-fi.png');
    if (fs.existsSync(kofiIconPath)) {
        fs.unlinkSync(kofiIconPath);
        console.log('[Safari] Removed ko-fi.png');
    }
}

function stripToastCodeFromContentJS() {
    const contentJSPath = path.join(DIST_DIR, 'content', 'content.js');
    if (!fs.existsSync(contentJSPath)) {
        console.warn(`[Safari] File not found: ${contentJSPath}`);
        return;
    }

    let content = fs.readFileSync(contentJSPath, 'utf8');
    let modified = false;

    // 1. Remove the entire toast.ts section
    const toastStartMarker = '// src/content/SupportToast/toast.ts';
    const startIndex = content.indexOf(toastStartMarker);

    if (startIndex !== -1) {
        // Find the next "// src/" comment after the toast section (marks the next file)
        const nextSectionRegex = /\/\/ src\/[^\/]+\/[^\n]+/g;
        nextSectionRegex.lastIndex = startIndex + toastStartMarker.length;
        const nextSectionMatch = nextSectionRegex.exec(content);

        if (nextSectionMatch) {
            const endIndex = nextSectionMatch.index;
            const beforeToast = content.substring(0, startIndex);
            const afterToast = content.substring(endIndex);
            content = beforeToast + afterToast;
            modified = true;
            console.log('[Safari] Removed toast code section from content.js');
        } else {
            console.warn('[Safari] Could not find end of toast section');
        }
    } else {
        console.log('[Safari] Toast code section not found in content.js');
    }

    // 2. Remove the call to maybeShowSupportToast() in initializeFeatures()
    const toastCallRegex = /currentSettings\?\.\s*askForSupport\?\.\s*enabled\s*&&\s*maybeShowSupportToast\(\);?\s*/g;
    if (toastCallRegex.test(content)) {
        content = content.replace(toastCallRegex, '');
        modified = true;
        console.log('[Safari] Removed maybeShowSupportToast() call from initializeFeatures()');
    }

    if (modified) {
        fs.writeFileSync(contentJSPath, content, 'utf8');
    }
}

function stripDonationsForSafari() {
    console.log('[Safari] Stripping donation links, toast, and Ko-fi assets for App Store compliance...');

    // Strip Ko-fi from HTML files
    const htmlFiles = [
        path.join(DIST_DIR, 'popup', 'popup.html'),
        path.join(DIST_DIR, 'popup', 'settings.html')
    ];
    htmlFiles.forEach(stripDonationsFromHTML);

    // Remove toast.html
    removeToastHTML();

    // Remove ko-fi.png
    removeKofiIcon();

    // Strip toast code from content.js
    stripToastCodeFromContentJS();

    console.log('[Safari] All donation-related content removed successfully.');
}

stripDonationsForSafari();