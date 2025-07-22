import { ExtensionSettings } from '../../types/types';

const TOAST_ID = 'ynt-support-toast';
const REMIND_DELAY = 30;
const INITIAL_DELAY = 7;

function daysBetween(date1: string, date2: string): number {
    return Math.floor((new Date(date2).getTime() - new Date(date1).getTime()) / (1000 * 60 * 60 * 24));
}

function secondsBetween(date1: string, date2: string): number {
    return Math.floor((new Date(date2).getTime() - new Date(date1).getTime()) / 1000);
}

async function getSettings(): Promise<ExtensionSettings | null> {
    const data = await browser.storage.local.get('settings');
    return data.settings as ExtensionSettings;
}

async function setSettings(settings: ExtensionSettings) {
    await browser.storage.local.set({ settings });
}

function injectToast() {
    if (document.getElementById(TOAST_ID)) {
        //console.log('[YNT] Toast already present');
        return;
    }

    //console.log('[YNT] Fetching toast HTML...');
    fetch(browser.runtime.getURL('dist/content/toast.html'))
        .then(res => {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.text();
        })
        .then(html => {
            document.body.insertAdjacentHTML('beforeend', html);
            //console.log('[YNT] Toast injected');

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

            // Add listeners
            const supportBtn = document.getElementById('ynt-ko-fi-btn');
            const remindBtn = document.getElementById('ynt-remind-btn');
            const dismissBtn = document.getElementById('ynt-dismiss-btn');

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

            dismissBtn?.addEventListener('click', async () => {
                const settings = await getSettings();
                if (settings) {
                    settings.askForSupport.enabled = false;
                    await setSettings(settings);
                }
                removeToast();
            });
        })
        .catch(err => {
            console.error('[YNT] Failed to fetch toast.html:', err);
        });
}

function removeToast() {
    const toast = document.getElementById(TOAST_ID);
    if (toast) toast.remove();
}

export async function maybeShowSupportToast() {
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

    const now = new Date().toISOString();
    const { installationDate, lastPromptDate } = settings.askForSupport;

    if (!lastPromptDate) {
        //console.log('[YNT] No lastPromptDate, checking initial delay...');
        // First display: 10 seconds after installation (for test)
        if (daysBetween(installationDate, now) >= INITIAL_DELAY) {
            //console.log('[YNT] Showing toast (first time)');
            injectToast();
        } else {
            //console.log('[YNT] Not enough time since install');
        }
        return;
    }

    // Reminder: 30 days after last reminder (unchanged)
    if (daysBetween(lastPromptDate, now) >= REMIND_DELAY) {
        //console.log('[YNT] Showing toast (reminder)');
        injectToast();
    } else {
        //console.log('[YNT] Not enough days since last prompt');
    }
}