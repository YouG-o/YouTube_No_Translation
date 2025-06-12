# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/YouG-o/YouTube_No_Translation/compare/v2.3.0...HEAD
[2.3.0]: https://github.com/YouG-o/YouTube_No_Translation/compare/v2.2.30...v2.3.0
[2.2.30]: https://github.com/YouG-o/YouTube_No_Translation/compare/v2.2.20...v2.2.30
[2.2.20]: https://github.com/YouG-o/YouTube_No_Translation/compare/v1.4.0...v2.2.20
[1.4.0]: https://github.com/YouG-o/YouTube_No_Translation/releases/tag/v1.4.0