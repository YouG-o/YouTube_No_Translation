<div align="center">
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg" height="25" alt="typescript logo" title="typescript logo" />
  <img src="https://cdn.simpleicons.org/tailwindcss/06B6D4" height="25" alt="tailwindcss logo" title="tailwindcss logo" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg" height="25" alt="html5 logo"  />
</div>
<div align="center">
  <a href="https://github.com/YouG-o/YouTube_No_Translation/releases/latest" target="_blank">
    <img src="https://img.shields.io/github/v/release/YouG-o/YouTube_No_Translation?style=flat&logo=github&color=2ea44f" alt="GitHub Release Version"/>
  </a>
  <a href="https://github.com/YouG-o/YouTube_No_Translation/stargazers" target="_blank">
    <img src="https://img.shields.io/github/stars/YouG-o/YouTube_No_Translation?style=flat&logo=github&color=f9d71c" alt="GitHub Stars"/>
  </a>
  <a href="https://addons.mozilla.org/firefox/addon/youtube-no-translation/" target="_blank">
    <img src="https://img.shields.io/amo/users/youtube-no-translation?label=&style=flat&logo=firefox-browser&logoColor=white&color=ff7139" alt="Firefox Add-on Users"/>
  </a>
  <a href="https://chromewebstore.google.com/detail/youtube-no-translation/lmkeolibdeeglfglnncmfleojmakecjb" target="_blank">
    <img src="https://img.shields.io/chrome-web-store/users/lmkeolibdeeglfglnncmfleojmakecjb?label=&style=flat&logo=google-chrome&logoColor=white&color=4285F4" alt="Chrome Web Store Users"/>
  </a>
  <a href="https://github.com/YouG-o/YouTube_No_Translation/blob/main/LICENSE" target="_blank">
    <img src="https://img.shields.io/github/license/YouG-o/YouTube_No_Translation?label=&style=flat&logo=license&logoColor=white&color=3da639" alt="License"/>
  </a>
</div>

###

<div align="center">
  <a href="https://youtube-no-translation.vercel.app/" target="_blank">
    <img src="./assets/images/icon.png" alt="Add-on icon"/>
  </a>
</div>

###

<h1 align="center">YouTube No Translation</h1>


  A web browser extension that keeps your YouTube experience authentic by preventing automatic translations.
  The extension is available on Chromium browsers, Firefox and Safari.


<div align="center">
  <a href="https://addons.mozilla.org/firefox/addon/youtube-no-translation/" target="_blank">
    <img src="./assets/images/firefox.png" height="40" alt="Available on Mozilla Firefox" title="Available on Mozilla Firefox"/>
  </a>
  <a href="https://chromewebstore.google.com/detail/youtube-no-translation/lmkeolibdeeglfglnncmfleojmakecjb" target="_blank">
    <img src="./assets/images/chrome.png" height="40" alt="Available on Chrome Web Store" title="Available on Chrome Web Store"/>
  </a>
  <br>
</div>

You can get the Firefox and Chrome extensions on their official stores, but for Safari you MUST [build it yourself](#build-it-yourself). I do not provide support for Safari.

###

<div>
  <h1 align="center">Features :</h1>
  
  - **Video Titles**: Keep titles in their original language
  - **Audio Tracks**: Always use the original audio track
  - **Descriptions**: Prevent description translations
  - **Subtitles**: Set your preferred subtitle language, if unavailable, subtitles are disabled (auto generated ones are ignored)
</div>

###

<div>
  <h1 align="center">Support This Project</h1>
  
  <p>This extension is completely free and open-source. If you find it valuable, you can support its development with a pay-what-you-want contribution!</p>

  <div align="center">
    <a href="https://ko-fi.com/yougo" target="_blank">
      <img src="./assets/icons/ko-fi.png" alt="Support me on Ko-fi" height="40">
    </a>
    <br>
    <a href="https://youtube-no-translation.vercel.app/?donate=crypto" target="_blank">
      <img src="https://img.shields.io/badge/Support-Cryptocurrency-8256D0?style=for-the-badge&logo=bitcoin&logoColor=white" alt="Support with Cryptocurrency" height="30">
    </a>
  </div>
  
  <p>You can also support this project by:</p>
 
  - Starring this repository
  - Rating the extension on [Mozilla Add-ons](https://addons.mozilla.org/firefox/addon/youtube-no-translation/) or the [Chrome Web Store](https://chromewebstore.google.com/detail/youtube-no-translation/lmkeolibdeeglfglnncmfleojmakecjb)
  - Following me on [GitHub](https://github.com/YouG-o)

###


<div>
  <h1 align="center" id="build-it-yourself">Build it yourself</h1>

  <p>While the extension is available through the official stores, you can also build it from source:</p>

  ### Prerequisites
  - Node.js
  - npm
  - **For Safari**: macOS with Xcode installed

  ### Installation
  ```bash
  # Clone the repository
  git clone https://github.com/YouG-o/YouTube_No_Translation.git
  cd YouTube_No_Translation

  # Install dependencies
  npm install
  ```

  ```bash
  # Build for Firefox
  npm run package:firefox
  ```

  ```bash
  # Build for Chromium
  npm run package:chrome
  ```

  ```bash
  # Build for Safari (macOS only)
  npm run prepare:safari
  open "safari-extension/YouTube No Translation/YouTube No Translation.xcodeproj"
  # Then build and run in Xcode to generate the .app
  ```

</div>

###

<div align="center">
  <h1>Contributors</h1>
  
   Thanks to [Seva41](https://github.com/Seva41) for the Safari port.

  <a href="https://github.com/YouG-o/YouTube_No_Translation/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=YouG-o/YouTube_No_Translation" />
  </a>
</div>

###

<div align="center">
  <h2>License</h2>
  This project is licensed under the <a href="LICENSE">GNU Affero General Public License v3.0</a>.
  <br>
  Any reuse, modification or distribution of this code must credit the original author.
  <br>
</div>

###
