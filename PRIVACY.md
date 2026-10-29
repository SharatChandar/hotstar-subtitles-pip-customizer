# Privacy

Hotstar Subtitle Studio runs locally in Chrome. It has no extension-operated server and does not collect or send analytics, telemetry, browsing history, credentials, video content or subtitle text to an external service. It does not contain API keys or require you to provide any.

## Local data

Subtitle preferences are stored in `chrome.storage.local` under `subtitleStudio`. They include typography, colors, layout, effects and custom CSS. **Reset all** restores the default settings. Removing the extension removes its local Chrome extension storage.

Style export creates a JSON file containing those preferences. Import reads the file you select and applies supported settings. Exported files remain wherever you save them; uninstalling the extension does not delete your backups.

## Page access

Content scripts run on `https://hotstar.com/*` and `https://*.hotstar.com/*` to style subtitle elements and read the current caption structure. When requested, PiP moves the existing video element into a floating document and mirrors subtitle text/structure there. The original player continues supplying cues. No video capture, re-encoding or subtitle upload occurs.

`activeTab` and `scripting` allow your explicit popup click to start PiP on the active Hotstar page. `storage` saves your preferences. The extension does not request broad browsing-history, cookie, microphone or camera permissions.

Hotstar and Chrome remain responsible for their own services and data practices. Opening repository/documentation links or sharing a bug report is separate from extension operation. Do not include credentials, account details or private browsing information in public issues.
