# Contributing to YouTube No Translation

Thank you for your interest in contributing to YouTube No Translation! This document provides guidelines and information for contributors.

## 🎯 Help Wanted

I'm actively looking for contributors to help with these specific areas:

- **Safari Build Automation** ([#32](https://github.com/YouG-o/YouTube_No_Translation/issues/32)) - Help me automate Safari .app builds in GitHub Actions for easier user installation. As I don't have macOS, I cannot test it so I need someone to do it.

## 🚀 Getting Started

### Prerequisites

- Node.js
- Xcode for MacOS users

### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/YouG-o/YouTube_No_Translation.git
   cd YouTube_No_Translation
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**

   **For Chrome:**
   ```bash
   npm run build:chrome
   ```
   
   **For Firefox:**
   ```bash
   npm run build:firefox
   ```
   
   **For Safari (requires macOS and Xcode):**
   ```bash
   npm run prepare:safari
   ```

## 🏗️ Project Structure

```
src/
├── content/          # Content scripts organized by feature
│   ├── audio/        # Audio track translation prevention
│   ├── description/  # Description translation handling
│   ├── titles/       # Title translation prevention
│   ├── subtitles/    # Subtitle translation blocking
│   ├── channelName/  # Channel name translation handling
│   └── chapters/     # Chapter translation prevention
├── background/       # Background scripts
├── popup/           # Extension popup interface
├── styles/          # CSS and styling files (just used to setup Tailwind)
├── config/          # Configuration files
└── types/           # TypeScript type definitions
```

## 🛠️ Development Guidelines

### Code Style

- Use TypeScript for all new code
- Follow existing naming conventions (camelCase for functions/variables)
- Use the established logging system with color-coded categories, or create a new one if needed.
- Maintain the modular architecture (one feature per directory)


### Logging

Use the centralized logging system from `src/content/loggings.ts`:

```typescript
// Use appropriate logger for your feature
mainTitleLog('Processing video title...');
descriptionLog('Cache hit for description');
audioLog('Audio track detected');

// For error logging, use the error variants
mainTitleErrorLog('Failed to process title');
audioErrorLog('Audio detection failed');
```


### Browser Compatibility

Each browser has specific requirements and its own manifest file:

- **Chrome**: Manifest V3 → [`manifest.chrome.json`](manifest.chrome.json)
- **Firefox**: Manifest V3 with gecko extensions → [`manifest.firefox.json`](manifest.firefox.json)
- **Safari**: Manifest V2 (due to Apple's slower adoption) → [`manifest.safari.json`](manifest.safari.json)

## 🧪 Testing

### Manual Testing

1. Load the extension in your browser:
   - **Chrome**: `chrome://extensions/` → Load unpacked
   - **Firefox**: `about:debugging` → This Firefox → Load Temporary Add-on
   - **Safari**: Open [`safari-extension/YouTube No Translation/YouTube No Translation.xcodeproj`](safari-extension/YouTube%20No%20Translation/YouTube%20No%20Translation.xcodeproj) and build from Xcode

2. Test on various YouTube pages:
   - Regular videos
   - YouTube Shorts
   - Channels with non-English content
   - Videos with auto-generated subtitles

### Feature Testing Checklist

- [ ] Video titles remain in original language
- [ ] Descriptions are not auto-translated
- [ ] Audio tracks maintain original language (or selected one)
- [ ] Subtitles are not auto-translated
- [ ] Channel names remain unchanged
- [ ] Chapters are not translated

## 📝 Making Changes

### Commit Message Format

Use clear, descriptive commit messages following conventional commits:

```
feat: add support for YouTube Shorts translation prevention
fix: resolve description cache memory leak
docs: update README with Safari installation steps
refactor: improve audio detection logic
```

### Updating the Changelog

**Important:** When making changes, always update the [`CHANGELOG.md`](CHANGELOG.md) file by adding your changes to the `[Unreleased]` section.

Follow this format:
- **Added**: for new features
- **Changed**: for changes in existing functionality  
- **Fixed**: for bug fixes
- **Deprecated**: for soon-to-be removed features
- **Removed**: for now removed features
- **Security**: for security improvements

Example:
```markdown
## [Unreleased]

### Added
- YouTube Shorts translation prevention support

### Fixed
- Memory leak in description caching system
```

This helps maintain an accurate project history and makes releases much easier to prepare.

## 🐛 Reporting Issues

Found a bug? Please use our [issue report template](.github/ISSUE_TEMPLATE/bug_report.md) when creating an issue.

When reporting bugs, make sure to include:

- Browser version and type
- Extension version
- Steps to reproduce
- Expected vs actual behavior
- Console logs (if available)
- Screenshots (if relevant)

## 💡 Feature Requests

Have an idea for a new feature? Please use our [feature request template](.github/ISSUE_TEMPLATE/feature_request.md)!

We welcome feature suggestions! Please:

- Check existing issues first
- Describe the use case clearly
- Explain why it would benefit users
- Consider implementation complexity

## 📄 License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE). Any contributions will be under the same license. 

**By contributing to this project, you agree that your contributions will be distributed under the AGPLv3 license.**

**Important:** All new files should include the following license header at the top:

```typescript
/*
 * Copyright (C) 2025-present [Your Name] (https://github.com/your-username) - [Contribution description]
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o) - Original project
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * This program is distributed without any warranty; see the license for details.
 */
```

## 🙏 Recognition

All contributors are acknowledged in the [project README](README.md#contributors). Thank you for helping make YouTube No Translation better!