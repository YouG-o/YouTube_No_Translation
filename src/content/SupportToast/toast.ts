import { ExtensionSettings } from '../../types/types';
import { isFirefox, isEdge, isChromium } from '../../utils/browser';
import { getMessage, localizeDocument } from '../../utils/i18n';

const TOAST_ID = 'ynt-support-toast';
const REMIND_DELAY = 30;
const INITIAL_DELAY = 7;
let toastStorageListener: ((changes: any, area: string) => void) | null = null;

// Store URLs
const FIREFOX_REVIEW_URL = 'https://addons.mozilla.org/firefox/addon/youtube-no-translation/reviews/';
const CHROME_REVIEW_URL = 'https://chromewebstore.google.com/detail/youtube-no-translation/lmkeolibdeeglfglnncmfleojmakecjb/reviews';
const EDGE_REVIEW_URL = 'https://microsoftedge.microsoft.com/addons/detail/youtube-no-translation/dflkepcdbnjbbfdokanhhdeolodkcofb';

function daysBetween(date1: string, date2: string): number {
    return Math.floor((new Date(date2).getTime() - new Date(date1).getTime()) / (1000 * 60 * 60 * 24));
}

async function getSettings(): Promise<ExtensionSettings | null> {
    const data = await browser.storage.local.get('settings');
    return data.settings as ExtensionSettings;
}

async function setSettings(settings: ExtensionSettings) {
    await browser.storage.local.set({ settings });
}

function getReviewUrl(): string | null {
    if (isFirefox()) {
        return FIREFOX_REVIEW_URL;
    } else if (isEdge()) {
        return EDGE_REVIEW_URL;
    } else if (isChromium()) {
        return CHROME_REVIEW_URL;
    }
    return null;
}

function getStoreNameKey(): string | null {
    if (isFirefox()) {
        return 'toast_storeName_firefox';
    } else if (isEdge()) {
        return 'toast_storeName_edge';
    } else if (isChromium()) {
        return 'toast_storeName_chrome';
    }
    return null;
}

function injectToast() {
    if (document.getElementById(TOAST_ID)) return;

    const reviewUrl = getReviewUrl();
    const storeNameKey = getStoreNameKey();

    fetch(browser.runtime.getURL('dist/content/toast.html'))
        .then(res => {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.text();
        })
        .then(html => {
            // Parse the HTML in a detached element to avoid direct injection
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const toast = doc.body.firstElementChild;
            if (toast) {
                document.body.appendChild(toast);

                // Localize all data-i18n attributes
                localizeDocument();

                // Add storage listener only when toast is visible
                if (toastStorageListener) {
                    browser.storage.onChanged.removeListener(toastStorageListener);
                    toastStorageListener = null;
                }
                toastStorageListener = (changes, area) => {
                    if (area === 'local' && changes.supportToastClosed?.newValue) {
                        removeToast();
                    }
                };
                browser.storage.onChanged.addListener(toastStorageListener);
            }

            // Set extension icon src
            const extensionIcon = document.querySelector('#ynt-support-toast img[alt="Extension icon"]') as HTMLImageElement | null;
            if (extensionIcon) {
                extensionIcon.src = browser.runtime.getURL('dist/assets/icons/icon_48.png');
            }

            // Set Ko-fi image src
            const koFiImg = document.getElementById('ynt-ko-fi-img') as HTMLImageElement | null;
            if (koFiImg) {
                koFiImg.src = browser.runtime.getURL('dist/assets/icons/ko-fi.png');
            }

            // Inject review link section if supported browser
            if (reviewUrl && storeNameKey) {
                const koFiContainer = document.querySelector('#ynt-support-toast > div:nth-child(4)'); // Ko-fi button container
                if (koFiContainer) {
                    const reviewSection = document.createElement('div');
                    reviewSection.style.cssText = 'font-size: 0.85em; text-align: center; color: #d1d5db; width: 100%;';
                    
                    // Build text content using i18n
                    const textBefore = document.createTextNode(getMessage('toast_review_prefix'));
                    
                    const reviewLink = document.createElement('a');
                    reviewLink.href = reviewUrl;
                    reviewLink.target = '_blank';
                    reviewLink.rel = 'noopener noreferrer';
                    reviewLink.style.cssText = 'color: #60a5fa; text-decoration: none; font-weight: 500;';
                    reviewLink.textContent = getMessage(storeNameKey);
                    
                    const textAfter = document.createTextNode(getMessage('toast_review_suffix'));
                    
                    reviewSection.appendChild(textBefore);
                    reviewSection.appendChild(reviewLink);
                    reviewSection.appendChild(textAfter);
                    
                    koFiContainer.insertAdjacentElement('afterend', reviewSection);
                }
            }

            // Add listeners
            const supportBtn = document.getElementById('ynt-ko-fi-btn');
            const remindBtn = document.getElementById('ynt-remind-btn');

            supportBtn?.addEventListener('click', () => {
                window.open('https://ko-fi.com/yougo', '_blank');
            });

            remindBtn?.addEventListener('click', async () => {
                const settings = await getSettings();
                if (settings) {
                    settings.askForSupport.lastPromptDate = new Date().toISOString();
                    await setSettings(settings);
                }
                removeToast();
            });

            const dismissBtns = document.querySelectorAll('.ynt-dismiss-btn');
            dismissBtns.forEach(btn => {
                btn.addEventListener('click', async () => {
                    const settings = await getSettings();
                    if (settings) {
                        settings.askForSupport.enabled = false;
                        await setSettings(settings);
                    }
                    removeToast();
                });
            });
        })
        .catch(err => {
            console.error('[YNT] Failed to fetch toast.html:', err);
        });
}

async function removeToast() {
    const toast = document.getElementById(TOAST_ID);
    if (toast) toast.remove();
    // Remove the storage listener if present
    if (toastStorageListener) {
        browser.storage.onChanged.removeListener(toastStorageListener);
        toastStorageListener = null;
    }
    // Notify all tabs that the toast was closed
    await browser.storage.local.set({ supportToastClosed: true });
}

const SUPPORT_TOAST_ENABLED = false;

export async function maybeShowSupportToast() {
    if (!SUPPORT_TOAST_ENABLED) return;
    //console.log('[YNT] maybeShowSupportToast called');
    // Never show if not on main YouTube
    if (!window.location.hostname.match(/(^|\.)youtube\.com$/)) {
        //console.log('[YNT] Not on youtube.com, aborting');
        return;
    }

    const settings = await getSettings();
    if (!settings?.askForSupport?.enabled) {
        //console.log('[YNT] askForSupport disabled');
        return;
    }

    const { supportToastClosed } = await browser.storage.local.get('supportToastClosed');
    if (supportToastClosed) return;

    const now = new Date().toISOString();
    const { installationDate, lastPromptDate } = settings.askForSupport;

    if (!lastPromptDate) {
        //console.log('[YNT] No lastPromptDate, checking initial delay...');
        // First display: after initial delay
        if (daysBetween(installationDate, now) >= INITIAL_DELAY) {
            //console.log('[YNT] Showing toast (first time)');
            injectToast();
        } else {
            //console.log('[YNT] Not enough time since install');
        }
        return;
    }

    // Reminder: after remind delay
    if (daysBetween(lastPromptDate, now) >= REMIND_DELAY) {
        //console.log('[YNT] Showing toast (reminder)');
        injectToast();
    } else {
        //console.log('[YNT] Not enough days since last prompt');
    }
}