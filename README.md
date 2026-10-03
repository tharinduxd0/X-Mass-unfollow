# Mass Unfollow

A lightweight Chrome extension for mass unfollowing accounts from the X.com following page.

This project is designed to help you bulk-remove follows directly from your X account while letting you exclude specific users and control timing.

## Features

- Unfollow all accounts shown on your X following page
- Unfollow users who are not following you back
- Exclude specific users from being unfollowed
- Set a delay/timer between actions
- Option to reload when the process stops
- Easy popup interface and settings page

## Supported Site

- X.com
- Target page pattern: `https://*.x.com/*/following`

## Project Structure

- `manifest.json` - extension metadata and permissions
- `popup.html` / `popup.js` - popup UI and actions
- `options.html` / `options.js` - settings page for exclusions and options
- `contentScript.js` - automation logic for interacting with the X following page
- `background.js` - extension lifecycle and page rules
- `icons/` - extension icons

## Installation

1. Open Chrome or Edge.
2. Navigate to `chrome://extensions` (or `edge://extensions`).
3. Enable Developer Mode.
4. Click Load unpacked.
5. Select this project folder.
6. The extension should appear in your browser toolbar.

## Usage

1. Sign in to X.
2. Open your own Following page, such as:
   `https://x.com/username/following`
3. Click the extension icon.
4. Choose one of the available actions:
   - Unfollow All
   - Unfollow Not Following
   - Stop
5. Configure exclusions or timing from the settings page if needed.

## Settings

The options page allows you to:

- Add usernames to a whitelist so they are never unfollowed
- Enable or disable delay timing between unfollows
- Choose whether to reload the page after a stop event

## Notes

- This extension interacts with the X web interface and relies on browser automation.
- It is intended for personal use only.
- Use it responsibly and in line with X's platform rules and terms.

## Author

Created by `tharinduxd`.
