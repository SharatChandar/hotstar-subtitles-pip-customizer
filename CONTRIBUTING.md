# Contributing

Load the repository directly as an unpacked Chrome extension; no build step is needed. Keep runtime code dependency-free and scope page changes to Hotstar's video/caption elements.

## Before submitting a change

1. Run `node scripts/check.mjs`.
2. Serve the repository with `python3 -m http.server 8765 --bind 127.0.0.1`.
3. Open `/tests/fixture.html` and confirm all 41 checks pass, including responsive sizing, overlay visibility, playback, seek bounds and timeline updates. Use the optional finite-video fixture in the README to check real seek-bar interaction.
4. Use `/tests/popup.html` to exercise the controls and import/export UI. These APIs are mocked, so this is not an extension permission test.
5. Use `/tests/pip.html` to check real PiP: open, change captions/style, replace cues, use playback controls, close and reopen. Check that the original video returns with its original inline styles.
6. Reload the unpacked extension and refresh a Hotstar tab. Confirm settings persist across popup reopen and tab refresh, new cues are styled, disabling restores site styling, and unrelated player controls are unaffected.
7. Check the actual popup PiP trigger, subtitle updates while the original tab is in the background, auto sizing in small/large/short windows, overlay fade and keyboard focus, return-to-tab, and behavior with the title/device you tested. PiP should contain no extra toolbar. Report protected-playback limitations honestly.

## Reporting bugs

Include your Chrome version, operating system, extension version, reproducible steps, expected behavior and actual behavior. For subtitle issues, include the language and whether captions are normal player captions or burned into the video. Redact account information and private page content from screenshots and logs.

Never commit credentials, environment files, browser profiles, session exports or private media. Use synthetic or explicitly shareable content in screenshots and tests.

By contributing, you agree that your contributions are licensed under this repository's MIT license.
