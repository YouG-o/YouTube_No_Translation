import { fetchMainTitle, updateMainTitleElement } from '../titles/mainTitle';
import { fetchOriginalDescription } from '../description/MainDescription';
import { currentSettings } from '..';

/**
 * Updates the channel player description element on the channel page.
 * Targets the <yt-formatted-string class="content" slot="content"> inside the expander.
 */
function updateChannelPlayerDescriptionElement(expanderElement: HTMLElement, description: string): void {
    // Select the yt-formatted-string with class 'content' and slot 'content'
    const contentElement = expanderElement.querySelector('yt-formatted-string.content[slot="content"]') as HTMLElement | null;
    if (!contentElement) {
        // Log error if the content element is not found
        // (You can replace this with your own logging utility)
        console.error('No content element found in channel player description');
        return;
    }
    // Replace the text content with the original description
    contentElement.textContent = description;
}

/**
 * Restores the original title and description for the channel page player.
 * This targets the <ytd-channel-video-player-renderer> element on channel pages.
 */
export async function refreshChannelPlayer(): Promise<void> {
    // Select the channel player renderer
    const playerRenderer = document.querySelector('ytd-channel-video-player-renderer');
    if (!playerRenderer) return;

    // --- Title restoration ---
    if (currentSettings?.titleTranslation) {
        // Select the title element inside the player
        const titleElement = playerRenderer.querySelector('yt-formatted-string#title') as HTMLElement | null;
        // Get the videoId from the link inside the title
        const titleLink = titleElement?.querySelector('a[href*="/watch?v="]') as HTMLAnchorElement | null;
        const videoId = titleLink?.href.match(/v=([^&]+)/)?.[1];

        if (titleElement && videoId) {
            const originalTitle = await fetchMainTitle(videoId, true);
            if (originalTitle) {
                updateMainTitleElement(titleElement, originalTitle, videoId);
            }
        }
    }

    // --- Description restoration ---
    if (currentSettings?.descriptionTranslation){
        // Select the description expander element
        const descriptionExpander = playerRenderer.querySelector('ytd-expander#description') as HTMLElement | null;
        if (descriptionExpander) {
            const originalDescription = await fetchOriginalDescription();
            if (originalDescription) {
                updateChannelPlayerDescriptionElement(descriptionExpander, originalDescription);
            }
        }
    }
}