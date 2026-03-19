# How to enable the optional provider in Syag

If you have the optional provider files from this folder, follow these steps to use them in Syag.

1. **Create the folder** (if it doesn’t exist):
   - **Finder:** Go → Go to Folder… → paste: `~/Library/Application Support/Syag/optional-providers`
   - **Terminal:** `mkdir -p ~/Library/Application\ Support/Syag/optional-providers`

2. **Copy both files** into that folder: the `.json` and `.js` files (e.g. `copart.json` and `copart.js`). Both are required.

3. **Restart Syag** (quit the app and open it again). Optional providers are loaded only at startup.

4. **In Syag:** Open **Settings → AI Models**. The optional provider will appear with its name and icon. Click **Connect**, enter your API key, then you can use its models for chat and (if supported) transcription.
