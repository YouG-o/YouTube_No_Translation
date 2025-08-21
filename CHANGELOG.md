# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.11.0] - 2025-08-21

### Feature
- Added a setting "Enable Auto Generated Subtitles", if prefered language is not available in a manual subtitle track, subtitles will be auto generated in this language.
- Migration system for existing users to add ASR setting (defaults to disabled)


### Fixed
- Fixed message sending errors when popup opened outside YouTube tabs
- Improved error handling for content script communication


## [2.10.13] - 2025-08-17

### Fixed

- Fixed Mini Player title still translated.
- Fixed an issue where the main video title and description remained translated on the first video opened after a full page load or direct link.

## [2.10.12] - 2025-08-11

### Fixed
- Improved playlist detection: channel grid playlists (including those loaded on scroll) are now correctly ignored, preventing their titles from being overwritten by the first video title in the playlist.
- Added grid parent observer to all type of pages, to update titles if a filter is applyed. (Was only added on home page before, but filters also exists elsewhere)
- Notification dropdown observer now only activates when the menu-style is set to notifications, preventing false positives from other dropdowns like settings.

## [2.10.11] - 2025-08-08

### Fixed
- Always decode channel handle if it is percent-encoded (UTF-8), as happens for multibyte handles

## [2.10.10] - 2025-08-05

### Fixed
- Exclude suggestion link text from description extraction for accurate comparison
- Outdated Xcode Project file.
- Missing iconset copy in the shell script for Safari.

### Changed
- Updated iconset to match the required by macOS.

## [2.10.8] - 2025-07-31

### Style
- Improve reload button contrast and add refresh icon for clarity

### Fix
- Channel page: Only the real (visible and non-empty) video description is now restored for each video. Fixed an issue where the extension would attempt to restore descriptions for all video thumbnails, even when no description was present.

## [2.10.7] - 2025-07-30

### Changed
- Removed automatic reload of YouTube tabs on extension install. Instead, a clear warning is now displayed on the Welcome page, with a button allowing users to manually reload active YouTube tabs. Hibernating or backgroud tabs are ignored.

## [2.10.6] - 2025-07-25

### Refactored
- Major refactor of main video description logic: code is now modular, respects SRP, and uses the new centralized cache system. Timestamp and URL parsing are now handled by dedicated utilities. File and function names have been clarified for maintainability.

## [2.10.3] - 2025-07-23

### Feat
- Added a persistent cache system for video descriptions using `browser.storage.local`. The cache now survives page reloads and browser restarts, with a maximum of 50 entries and a 12-hour expiration.

### Refactor
- Added a persistent cache system for video titles using `browser.storage.local`. The cache now survives page reloads and browser restarts, with a maximum of 1000 entries and a 24-hour expiration.

### Fix
- Fixed logic to ensure titles and descriptions are only cached when actually used, and always checked in cache before making network requests.


## [2.10.2] - 2025-07-22
- Added a toast for support.

## [2.10.1] - 2025-07-22

### Feat
- Improved grid observer cleanup: all grid observers are now stored in an array and properly disconnected to prevent duplicate callbacks after SPA navigation.
- Added parent attribute observer on `#primary > ytd-rich-grid-renderer` to reliably detect filter changes on the home page.
- Refactored popup toggles: now use a generic handler for all toggles, reducing code duplication and improving maintainability.
- Added TypeScript support to `bundle-scripts.js` for content scripts.

### Fix
- Added a background to white text in console logs for better readability in light mode DevTools.

### Docs
- Updated issue template.

## [2.10.0] - 2025-07-16

### Feat
- Channel name & description is now fetched from InnerTube if Data API is not enabled. (HL must be specified or YT pick the one from settings, meaning still translated. So I added Lao to HL, chances for meeting a translation with this language are almost 0)
- Channel name & description (Channel handle block) is now handled on search page.
- Video Title & Description of player's video on channel page is now handled
- Some channels have video list with descriptions, they are handled now.

### Changes
- Changed default subtitles language to "Always Disabled".

### Refactored
- process individual title fetches in parallel instead of sequential for refreshBrowsingVideos
- If YouTube Data API feature is enabled, a batch request is made for titles & search descriptions for less network traffic and resquests consumption

## [2.9.0] - 2025-07-14

### Feat
- Added InnerTube as a fallback method to fetch video titles, and as main method to featch video descriptions on search & history page.

### Refactored
- Removed Beta Features : Description & Titles fallback via Isolated Player.

## [2.8.3] - 2025-07-12

### Fix
- Improved playlist detection: now supports both playlist containers, preventing playlist titles from being overwritten by first video title from the playlist.

## [2.8.2] - 2025-07-12

### Fix
- Observe all video grids on home/channel pages to handle SPA navigation and popstate: ensures mutations are detected even if multiple grids remain in the DOM after navigation (fixes missing title updates after back/forward navigation due to DOM reuse).

## [2.8.1] - 2025-07-11

### Fix
- Video player settings now correctly use the new settings object structure with 'enabled' property for audio and subtitles translation. (was causing subtitles to be enabled to selected language even if disabled...)
- Recommended titles are now 'untranslated' again. (Added support for new HTML selector)

## [2.8.0] - 2025-07-10

### Fix
- Channel Name & Description, use channel handle for API request instead of ID from dom (not reliable)

### Feat
- Added support of video descriptions on search page

## [2.7.1] - 2025-07-09

### Feat
- Use channels endpoint instead of search for channel info (1 unit vs 100, my bad...), add fallback to fetch channel description by handle when ID is missing in DOM (SPA navigation support)

## [2.7.0] - 2025-07-08

### Added
- DeArrow custom titles are now ignored by the extension.
- Added support for channel descriptions & title restoration using YouTube Data API v3 (if a valid API key is provided in extension popup).

## [2.6.1] - 2025-07-06

### Added
- Chapters on the right panel (opened via chapter button in the player) are not translated anymore.
- Video end screen titles are not translated anymore.

### Refactored
- Extracted video ID parsing logic from `refreshBrowsingVideos` into a dedicated utility function `extractVideoIdFromUrl` in `src/content/utils/video.ts`
- Extracted browsing title element validation logic into a dedicated function `shouldProcessBrowsingElement`
- Extracted browsing title element state check logic into a dedicated function `checkElementProcessingState`
- Extracted original title fetching logic from `refreshBrowsingVideos` into a dedicated function `fetchOriginalTitle`
- Notification title processing now uses the unified `extractVideoIdFromUrl` utility for video ID extraction.
- Shorts titles retrieval now uses the unified `fetchMainTitle` function for main shorts titles and `fetchOriginalTitle` for alternative shorts formats.

- Notification popup titles now use the unified `fetchOriginalTitle` logic for original title retrieval.
- Extracted main title retrieval logic into a dedicated `fetchMainTitle` function, now used in `refreshMainTitle`, `refreshEmbedTitle`, and `refreshMiniplayerTitle`.

## [2.6.0] - 2025-07-04

### Fixed
- Fixed original description replacement for search results videos with chapters: now also targets `.metadata-snippet-container-one-line` containers, ensuring all search result types are handled.
- Ensure individual settings properties are completed without overwriting user values in popup

### Added
- Added options page support for Chrome, Firefox, and Safari: users can now access extension settings via the standard "Extension options" link in browser extension management pages.

### Refactored
- Renamed `welcome.html` to `settings.html` for better clarity and dual usage.
- The settings page now supports both first install welcome mode and standard options page access.
- Updated all manifests to declare the options page entry point.

- Migrated from multiple tsconfig files (content, background, popup) to a single global tsconfig.json.
- Removed all usage of TypeScript's `outFile` option and switched to a fully modular codebase using explicit ES module imports/exports.
- Updated all source files to use ES module imports/exports where necessary.
- Integrated esbuild as the bundler for content, background, and popup scripts, replacing the old TypeScript outFile build.
- Simplified and modernized the build process for better maintainability and scalability.

- Extracted all description-related logic from `refreshBrowsingVideos` into two dedicated functions: `shouldProcessSearchDescriptionElement` and `processSearchDescriptionElement`, now placed in the appropriate file to better respect single responsibility principles. This is the first step of a broader refactor to further simplify and clarify the orchestration logic.

- Clarify settings type checks and remove unnecessary boolean coercion in search description logic

## [2.5.11] - 2025-07-02

### Quickfix
- Fixed settings migration: fallback options (`titlesFallbackApi`, `descriptionSearchResults`) are now correctly migrated to the new `youtubeIsolatedPlayerFallback` object, preventing popup settings from breaking after update.

## [2.5.1] - 2025-07-02

### Added
- Added YouTube Data API v3 fallback for notification titles: notification titles now use the Data API as a fallback.

### Fixed
- Improved notification dropdown observer: now detects visibility changes instead of just DOM presence, ensuring notification titles are always restored and preventing premature observer cleanup.
- Use more specific selector for notification dropdown observer (ytd-popup-container tp-yt-iron-dropdown[vertical-align="top"])
- Improved playlist observer: now detects changes inside playlists, ensuring video title updates are always handled.
- Updated album/playlist detection: reliably distinguishes albums/playlists from individual playlist videos, preventing album/playlist titles from being overwritten by the first video title.

### Refactored
- Unified settings structure: audio and subtitles settings now use objects with `enabled` and `language` properties.
- Grouped experimental fallback options (`titles`, `searchResultsDescriptions`) under `youtubeIsolatedPlayerFallback` for better clarity and maintainability.
- Updated all related code, types, and popup logic for consistency.

## [2.5.0] - 2025-07-01

### Added
- **YouTube Data API v3 Support**: New fallback system using official YouTube Data API v3 for reliable title and description retrieval
  - User-configurable API key storage in popup settings (stored locally in browser)
  - Dedicated settings section with clear explanations and link to Google's API documentation
  - Positioned as second fallback (after oEmbed, before experimental Player API) for optimal reliability
  - Extended to search results descriptions: API retrieval before experimental Player API fallback
  - Proper error handling and logging for API failures

### Fixed
- Check if current notification title contains original title instead of strict equality, to handle prefix in textContent
- Fixed popup settings synchronization between popup and welcome pages by adding proper element existence checks

## [2.4.40] - 2025-06-30

### Added
- Added original title restoration for notification popup: notification dropdown is now observed and notification titles are replaced with their original (non-translated) versions when the popup is opened or updated.

## [2.4.32] - 2025-06-27

### Fixed
- Fixed description comparison for non-latin languages (Korean, Japanese, etc.): normalization now preserves all Unicode letters and numbers, ensuring correct detection of original descriptions regardless of language. (there was issues with some descriptions in a non latin alphabet)

## [2.4.31] - 2025-06-26

### Fixed
- Prevent concatenated titles from being copied into the title attribute when original title retrieval fails (ynt-fail): now always restores the parent title instead of propagating a polluted value.

## [2.4.30] - 2025-06-25

### Refactored
- Browsing titles : remove span logic and update video title directly via textContent for clarity and maintainability
- Improved concatenated / empty titles handling.

## [2.4.27] - 2025-06-24

### Fixed
- Improved title cleanup logic for recycled or out-of-sync video title elements: now fully removes all extension attributes, spans, and direct text nodes when needed.
- The title attribute is now always reset to the current text instead of being removed, preventing empty titles and ensuring proper detection and replacement of concatenated

## [2.4.25] - 2025-06-23

### Fixed
- Fully clean extension attributes, spans, and direct text nodes in video title elements when the videoId changes to prevent concatenated titles caused by DOM recycling
- Recalculate tooltip position for BETA options when advanced settings section is shown to prevent tooltip overflow in the
- Applyed changes from [Tommodev](https://github.com/tommodev-ctrl)'s PR: Made popup more understandable (Features titles, tooltips..) 

## [2.4.24] - 2025-06-22

### Fixed
- Added delayed refreshes (setTimeout) after sidebar and search results mutations to improve reliability of original title replacement when YouTube updates DOM asynchronously (temporary workaround until a cleaner solution is implemented)
- Improved recommended videos observer to handle different DOM structures when user is logged in vs logged out (observes ytd-item-section-renderer for logged-in users, #items directly for logged-out users)

### Refactored
- Added "Advanced Settings" section in popup and moved BETA features inside

## [2.4.21] - 2025-06-21

### Added
- Added error logging for search descriptions: now logs any error returned by the injected script for better debugging

### Fixed
- Dynamic detection of search results page for SPA navigation, ensuring description replacement works after navigation without reload
- Stop and reset player after processing a video, avoiding video being counted as watched in YouTube history.

## [2.4.2] - 2025-06-21

### Technical Improvements
- Merged description and title processing into unified video processing function for improved performance and reduced complexity

## [2.4.1] - 2025-06-18

### Fixed
- Prevented main video settings from being skipped when a description or title fallback is triggered: video events from isolated players are now ignored, eliminating the need for global timeouts or flags and ensuring correct behavior when switching videos rapidly.

## [2.4.0] - 2025-06-18

### Added
- **BETA Player API Fallback for Browsing Titles**: New experimental fallback system using YouTube Player API when oEmbed fails to retrieve original titles
  - Smart retry mechanism with ynt-fail-retry attribute for videos that initially fail
  - Dedicated popup setting (disabled by default) with clear BETA labeling
  - Player readiness detection to handle cases where player loads after initial page load
  - Sequential delay system to prevent API rate limiting
- **BETA Search Results Description Replacement**: New experimental feature to replace translated descriptions in search results with original versions (may impact performance as it requires video player interactions)
  - Smart filtering: only processes videos already identified as translated by title system
  - Dedicated popup setting (disabled by default) with clear BETA labeling
- **Current Chapter Button Replacement**: Replace translated chapter text in the current chapter button displayed in video player
- **Isolated YouTube Player System**: New architecture using separate iframe-based YouTube players for metadata retrieval
  - Prevents video playback interruption when retrieving metadata on video watch pages
  - Parameterizable player ID system supporting multiple isolated players simultaneously
  - Dedicated players for different features (ynt-player-titles, ynt-player-descriptions)
  - Eliminates concurrency issues between browsing titles and search descriptions features

### Fixed
- **Concatenated Titles Display**: Fixed issue where original and translated titles would appear concatenated due to DOM element reuse
  - Enhanced cleanup logic to remove all previous attributes and spans before applying new ones
  - Improved detection of stale direct text nodes in browsing title elements
  - Better handling of YouTube's DOM recycling during navigation
- **Optimized Title Processing**: Prevent unnecessary API calls by checking ynt attributes before making requests
  - Individual video processing tracking to prevent duplicate processing
  - Improved throttling system to prevent concurrent executions

### Technical Improvements
- Enhanced chapter replacement system with video player time detection
- Added mutation observer for current chapter button changes
- Improved video time retrieval using direct video element access
- Strengthened title element cleanup process to prevent content accumulation
- Added browsing titles fallback script with player API integration
- Implemented retry system for failed title requests with proper cleanup
- Created isolated player creation system with page context injection
- Added utility functions for isolated player management (create, ensure, cleanup)
- Updated fallback scripts to use isolated players instead of main player

## [2.3.20] - 2025-06-17

### Added
- User interaction detection to prevent overriding manual settings changes when user modifies YouTube player settings

### Changed
- Unified video player event listeners into a single robust system for better reliability and performance
- Enhanced video detection with comprehensive fallback events (timeupdate, seeked) to handle edge cases where videos load faster than listeners
- Implemented adaptive event optimization that reduces from 7 to 2 events after initial trigger

### Technical Improvements
- Refactored separate directLoadListener and loadStartListener into unified videoPlayerListener
- Added proper cleanup mechanism for all possible event types to prevent orphaned listeners
- Improved timing race condition handling for videos that start playing before listeners are attached
- Added click detection on YouTube settings menu with 2-second timeout to allow user to manually change audio track, or other settings without the add-on trying to reapply its own settings.

## [2.3.13] - 2025-06-16

### Added
- Display a welcome page on first extension installation.

### Changed
- Automatically refresh open YouTube and YouTube No-Cookie tabs upon first extension installation.
- Display the extension version dynamically in the popup and welcome page.

## [2.3.12] - 2025-06-14

### Fixed
- Enhanced subtitle and audio language detection on direct video loads with unified fallback system using multiple detection methods for better reliability.

## [2.3.11] - 2025-06-14

### Fixed
- Improved chapter detection to handle emojis, bullet points, and various separators in video descriptions.
- Improved subtitle and audio language detection on direct video loads (refresh, new tab, direct links).

## [2.3.1] - 2025-06-12

### Changed
- Improved audio & subtitles languages preferences storage by using a consistent, prefixed keys (`ynt-audioLanguage` & `ynt-subtitlesLanguage`) in localStorage to prevent conflicts and ensure reliability.

### Fixed
- Resolved an issue where selected subtitle/audio language in the popup would not persist correctly due to legacy code reading a deprecated storage key.

## [2.3.0] - 2025-06-11

### Added
- Changelog documentation
- Contributing guidelines for developers
- Safari port thanks to [Seva41](https://github.com/Seva41)
- Fullscreen video title translation prevention
- Miniplayer video title translation prevention

### Fixed
- Pop tooltip fixes thanks to [TheRichKid](https://github.com/therichkid)
- Subtitles not applying correctly on direct video loads (e.g. opening a URL directly)
- Prevented album/playlist titles from being incorrectly overwritten by their first video's title in browsing views.

## [2.2.30] - 2025-05-24

### Added
- Original chapter names display instead of translated versions : ONLY in the video progress bar (if description translation prevention is activated in the settings)

## [2.2.20] - 2025-03-21

### Added
- Channel name translation prevention (video pages only)
- Organized script files structure with dedicated scripts folder

### Changed
- Optimized observers by combining audio & subtitles listeners
- Better file organization and project structure

### Fixed
- Channel names being incorrectly translated on video pages

---

*Note: This changelog was introduced in version 2.2.30. For earlier version history, please refer to the [GitHub releases](https://github.com/YouG-o/YouTube_No_Translation/releases).*

[Unreleased]: https://github.com/YouG-o/YouTube_No_Translation/compare/v2.10.13...HEAD
[2.10.13]: https://github.com/YouG-o/YouTube_No_Translation/compare/v2.10.12...v2.10.13
[2.10.12]: https://github.com/YouG-o/YouTube_No_Translation/compare/v2.10.11...v2.10.12
[2.10.11]: https://github.com/YouG-o/YouTube_No_Translation/compare/v2.10.10...v2.10.11
[2.10.10]: https://github.com/YouG-o/YouTube_No_Translation/compare/v2.10.8...v2.10.10
[2.10.8]: https://github.com/YouG-o/YouTube_No_Translation/compare/v2.10.7...v2.10.8
[2.10.7]: https://github.com/YouG-o/YouTube_No_Translation/compare/v2.10.6...v2.10.7
[2.10.6]: https://github.com/YouG-o/YouTube_No_Translation/compare/v2.10.3...v2.10.6
[2.10.3]: https://github.com/YouG-o/YouTube_No_Translation/compare/v2.10.2...v2.10.3
[2.10.2]: https://github.com/YouG-o/YouTube_No_Translation/compare/v2.10.1...v2.10.2
[2.10.1]: https://github.com/YouG-o/YouTube_No_Translation/compare/v2.10.0...v2.10.1
[2.10.0]: https://github.com/YouG-o/YouTube_No_Translation/compare/v2.9.0...v2.10.0
[2.9.0]: https://github.com/YouG-o/YouTube_No_Translation/compare/v2.8.3...v2.9.0
[2.8.3]: https://github.com/YouG-o/YouTube_No_Translation/compare/v2.8.2...v2.8.3
[2.8.2]: https://github.com/YouG-o/YouTube_No_Translation/compare/v2.8.1...v2.8.2
[2.8.1]: https://github.com/YouG-o/YouTube_No_Translation/compare/v2.8.0...v2.8.1
[2.8.0]: https://github.com/YouG-o/YouTube_No_Translation/compare/v2.7.1...v2.8.0
[2.7.1]: https://github.com/YouG-o/YouTube_No_Translation/compare/v2.7.0...v2.7.1
[2.7.0]: https://github.com/YouG-o/YouTube_No_Translation/compare/v2.6.1...v2.7.0
[2.6.1]: https://github.com/YouG-o/YouTube_No_Translation/compare/v2.6.0...v2.6.1
[2.6.0]: https://github.com/YouG-o/YouTube_No_Translation/compare/v2.5.11...v2.6.0
[2.5.11]: https://github.com/YouG-o/YouTube_No_Translation/compare/v2.5.1...v2.5.11
[2.5.1]: https://github.com/YouG-o/YouTube_No_Translation/compare/v2.5.0...v2.5.1
[2.5.0]: https://github.com/YouG-o/YouTube_No_Translation/compare/v2.4.40...v2.5.0
[2.4.40]: https://github.com/YouG-o/YouTube_No_Translation/compare/v2.4.32...v2.4.40
[2.4.32]: https://github.com/YouG-o/YouTube_No_Translation/compare/v2.4.31...v2.4.32
[2.4.31]: https://github.com/YouG-o/YouTube_No_Translation/compare/v2.4.30...v2.4.31
[2.4.30]: https://github.com/YouG-o/YouTube_No_Translation/compare/v2.4.27...v2.4.30
[2.4.27]: https://github.com/YouG-o/YouTube_No_Translation/compare/v2.4.25...v2.4.27
[2.4.25]: https://github.com/YouG-o/YouTube_No_Translation/compare/v2.4.24...v2.4.25
[2.4.24]: https://github.com/YouG-o/YouTube_No_Translation/compare/v2.4.21...v2.4.24
[2.4.21]: https://github.com/YouG-o/YouTube_No_Translation/compare/v2.4.2...v2.4.21
[2.4.2]: https://github.com/YouG-o/YouTube_No_Translation/compare/v2.4.1...v2.4.2
[2.4.1]: https://github.com/YouG-o/YouTube_No_Translation/compare/v2.4.0...v2.4.1
[2.4.0]: https://github.com/YouG-o/YouTube_No_Translation/compare/v2.3.20...v2.4.0
[2.3.20]: https://github.com/YouG-o/YouTube_No_Translation/compare/v2.3.13...v2.3.20
[2.3.13]: https://github.com/YouG-o/YouTube_No_Translation/compare/v2.3.12...v2.3.13
[2.3.12]: https://github.com/YouG-o/YouTube_No_Translation/compare/v2.3.11...v2.3.12
[2.3.11]: https://github.com/YouG-o/YouTube_No_Translation/compare/v2.3.1...v2.3.11
[2.3.1]: https://github.com/YouG-o/YouTube_No_Translation/compare/v2.3.0...v2.3.1
[2.3.0]: https://github.com/YouG-o/YouTube_No_Translation/compare/v2.2.30...v2.3.0
[2.2.30]: https://github.com/YouG-o/YouTube_No_Translation/compare/v2.2.20...v2.2.30
[2.2.20]: https://github.com/YouG-o/YouTube_No-Translation/compare/v1.4.0...v2.2.20
