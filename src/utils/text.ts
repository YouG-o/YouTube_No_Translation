/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */


// Function to normalize texts before comparison
export function normalizeText(text: string | null | undefined, description = false): string {
    if (text === null || text === undefined) {
        return '';
    }
    
    let normalizedText = text;
    
    if (description) {
        // Remove URLs
        normalizedText = normalizedText.replace(/https?:\/\/(?:www\.)?[^\s]+/g, '');
        // Remove mentions and hashtags
        normalizedText = normalizedText.replace(/\/\s*@?[a-zA-Z0-9_-]+/g, '');
        normalizedText = normalizedText.replace(/@[a-zA-Z0-9_-]+/g, '');
        // Remove timestamps
        normalizedText = normalizedText.replace(/\d+:\d+/g, '');
        // Remove all characters except Unicode letters, numbers, and spaces
        normalizedText = normalizedText.replace(/[^\p{L}\p{N}\s]/gu, '');
        // Convert to lowercase (will not affect CJK, but ok for global logic)
        normalizedText = normalizedText.toLowerCase();
    }

    return normalizedText
        .normalize('NFD')  // Decompose accented characters
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/\s+/g, ' ')  // Normalize spaces
        .replace(/[\p{Emoji}]/gu, '')  // Remove all emojis
        .trim();  // Remove leading/trailing spaces
}

export function calculateSimilarity(str1: string, str2: string): number {
    // Use character frequency approach for better handling of long strings
    const charCount1 = new Map<string, number>();
    const charCount2 = new Map<string, number>();
    
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
