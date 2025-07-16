import { fetchChannelNameDataAPI, fetchChannelNameInnerTube, shouldUpdateChannelName } from "./mainChannelName";
import { getOriginalChannelDescriptionDataAPI, getOriginalChannelDescriptionInnerTube } from "../description/channelDescription";
import { isYouTubeDataAPIEnabled, getChannelIdFromInnerTube } from "../../utils/utils";
import { currentSettings } from "../index";
import { coreErrorLog } from "../../utils/logger";

/**
 * Updates the channel name and description in all ytd-channel-renderer elements on the search results page.
 */
export async function patchChannelRendererBlocks(): Promise<void> {
    const channelRenderers = document.querySelectorAll('ytd-channel-renderer');
    for (const renderer of channelRenderers) {
        // Extract the handle from the @handle in the subscribers element
        const handleElement = renderer.querySelector('yt-formatted-string#subscribers');
        const handleText = handleElement?.textContent?.trim() || "";
        const handleMatch = handleText.match(/@([a-zA-Z0-9_-]+)/);
        const handle = handleMatch ? handleMatch[1] : null;
        if (!handle) continue;

        let channelId: string | null = null;

        // Fetch the original channel name
        let originalChannelName: string | null = null;
        if (isYouTubeDataAPIEnabled(currentSettings)) {
            originalChannelName = await fetchChannelNameDataAPI(handle);
        } else {
            channelId = await getChannelIdFromInnerTube(handle);
            if (!channelId) {
                coreErrorLog(`Channel ID not found for handle: ${handle}`);
                continue;
            }
            originalChannelName = await fetchChannelNameInnerTube(handle, channelId);
        }

        // Replace the channel name if needed
        const nameElement = renderer.querySelector('ytd-channel-name #text');
        const currentName = nameElement?.textContent?.trim() || null;
        if (nameElement && shouldUpdateChannelName(originalChannelName, currentName)) {
            nameElement.textContent = originalChannelName || "";
        }

        // Fetch the original channel description
        let originalDescription: string | null = null;
        if (isYouTubeDataAPIEnabled(currentSettings)) {
            const data = await getOriginalChannelDescriptionDataAPI({ handle });
            originalDescription = data?.description || null;
        } else {
            if (channelId){
                originalDescription = await getOriginalChannelDescriptionInnerTube(channelId);
            } else {
                coreErrorLog("Channel ID is missing for InnerTube description fetch.");
                continue;
            }
        }

        // Replace the description if needed
        const descElement = renderer.querySelector('yt-formatted-string#description');
        if (descElement && originalDescription && descElement.textContent?.trim() !== originalDescription) {
            descElement.textContent = originalDescription;
        }
    }
}