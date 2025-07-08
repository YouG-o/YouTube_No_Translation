# YouTube Data API v3: 

## Usage in the Extension

The extension primarily uses YouTube's oEmbed API to fetch the original titles and descriptions of videos. This method is simple and does not require any API key, but it has some limitations:
- Age-restricted videos are not accessible via oEmbed.
- Some videos that block embedding cannot be retrieved either.

This only affects a very small percentage of videos, but it can be annoying if you encounter one of these cases.

To work around these limitations, the extension offers a fallback mode using the official YouTube Data API v3.
With this API, you can:
- Retrieve original titles even for restricted or non-embeddable videos.
- Retrieve original video descriptions, which means on the search page, translated descriptions will no longer appear if you enable the YouTube Data API option with a valid key and the description option is enabled.
- Retrieve original channel description

**Note: Using the YouTube Data API requires you to obtain your own API key.**

## How to get your API key

Go to the official Google documentation:  
https://developers.google.com/youtube/v3/getting-started  
Everything is explained step by step to create a project and generate an API key.

**Note: By default, the API has a limit of 10,000 requests per day, which is more than enough for most users. But, just in case, the extension only uses it as a fallback for titles, to avoid reaching the quota too quickly.**

## How to use the key in the extension

1. Open the extension popup.
2. Enable the "YouTube Data API" option.
3. Enter your API key in the dedicated field (your key will be stored locally, only you have access to it).

![Screenshot of the API key configuration](../assets/images/yt_data_api.png)