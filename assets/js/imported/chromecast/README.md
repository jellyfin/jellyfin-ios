# Chromecast Shim (Vendored)

These scripts are copies of the Chromecast bridge used by the Jellyfin Android app:

- `ChromeCast.staticjs` ← [`app/src/main/assets/native/chrome.cast.js`](https://github.com/jellyfin/jellyfin-android/blob/c8cb7daaa1252dedc5668c7b767dfe1ce981f512/app/src/main/assets/native/chrome.cast.js)
- `CastEventEmitter.staticjs` ← [`app/src/main/assets/native/EventEmitter.js`](https://github.com/jellyfin/jellyfin-android/blob/c8cb7daaa1252dedc5668c7b767dfe1ce981f512/app/src/main/assets/native/EventEmitter.js)

We keep them as vendored static files so the React Native web view can expose the same Cast bridge as our Android client. Do not edit these files directly unless you are mirroring upstream changes.

## Updating

1. Download the files above from the desired Jellyfin Android commit.
2. Replace the `.staticjs` copies in this directory.
3. Preserve the local tweaks (currently just the `/* eslint-disable */` header).
4. Run the app to ensure Chromecast functionality still works.
