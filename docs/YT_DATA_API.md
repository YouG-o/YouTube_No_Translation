# YouTube Data API v3: 

## Usage in the Extension

With this API, you can:
- Retrieve original channel name & description on (@) channel page.
- Get all original titles & descriptions on the page in one api request. (making updates way faster in theory)

**Note: Using the YouTube Data API requires you to obtain your own API key.**

## How to get your API key

Go to the official Google documentation:  
https://developers.google.com/youtube/v3/getting-started  
Everything is explained step by step to create a project and generate an API key.

**Note: By default, the API has a limit of 10,000 units (requests) per day (the extension only use methods that need 1 unit/request), which is more than enough for most users. Especially now that we only make 1 request for 50 different videos.**

## How to use the key in the extension

1. Open the extension popup.
2. Enable the "YouTube Data API" option.
3. Enter your API key in the dedicated field (your key will be stored locally, only you have access to it).

![Screenshot of the API key configuration](../assets/images/yt_data_api.png)