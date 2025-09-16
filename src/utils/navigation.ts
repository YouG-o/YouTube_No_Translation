/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

// Function to dynamically check if current page is search results
export function isSearchResultsPage(): boolean {
    return window.location.pathname === '/results'
        || window.location.pathname === '/feed/history'
        || window.location.pathname === '/feed/subscriptions';
}
