# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- Fully clean extension attributes, spans, and direct text nodes in video title elements when the videoId changes to prevent concatenated titles caused by

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

[Unreleased]: https://github.com/YouG-o/YouTube_No_Translation/compare/v2.4.24...HEAD
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
[1.4.0]: https://github.com/YouG-o/YouTube_No_Translation/releases/tag/v1.4.0