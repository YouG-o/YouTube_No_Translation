import { fetchOriginalDescription } from '../description/searchDescriptions';
import { descriptionLog, descriptionErrorLog } from '../../utils/logger';

/**
 * Process all <ytd-video-renderer> elements on a channel page to restore the original video description.
 * This is needed because YouTube may translate the description even outside of search results.
 */
export async function processChannelVideoDescriptions(): Promise<void> {
    const videoRenderers = Array.from(document.querySelectorAll('ytd-video-renderer'));

    for (const renderer of videoRenderers) {
        const descriptionElement = renderer.querySelector<HTMLElement>('#description-text');
        if (!descriptionElement) continue;

        // Skip if already processed
        if (descriptionElement.hasAttribute('ynt-channel-desc')) continue;

        // Try to extract videoId from the title or thumbnail link
        let videoId: string | null = null;
        const titleLink = renderer.querySelector<HTMLAnchorElement>('a#video-title');
        const thumbnailLink = renderer.querySelector<HTMLAnchorElement>('a#thumbnail');
        const url = titleLink?.href || thumbnailLink?.href || '';
        const match = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
        if (match) {
            videoId = match[1];
        }

        if (!videoId) continue;

        try {
            const originalDescription = await fetchOriginalDescription(videoId);
            if (originalDescription) {
                // Truncate for display (like in searchDescriptions)
                const lines = originalDescription.split('\n');
                const shortDescription = lines.slice(0, 2).join('\n');
                const truncatedDescription = shortDescription.length > 100
                    ? shortDescription.substring(0, 100) + '...'
                    : shortDescription;

                descriptionElement.textContent = truncatedDescription;
                descriptionElement.setAttribute('ynt-channel-desc', videoId);
                descriptionElement.setAttribute('translate', 'no');
                descriptionLog(`Restored original channel video description for videoId: ${videoId}`);
            }
        } catch (error) {
            descriptionErrorLog(`Failed to restore channel video description for videoId: ${videoId}`, error);
        }
    }
}