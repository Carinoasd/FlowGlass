# FlowGlass — Liquid Glass New Tab

*[繁體中文說明](README.zh-TW.md)*

A liquid-glass new tab page for Chrome. Everything stays on your machine — apart from the optional weather widget (Open-Meteo), it works fully offline, with no analytics, tracking, or ad code of any kind.

## Features

- **Wallpaper** — your own images or video (200 MB max), 6 built-in gradients, slideshow (on every new tab or on a timer), adjustable dimming
- **Glass** — SVG refraction filter chain, adjustable blur / opacity / refraction, edge highlights, mouse parallax, entrance animation
- **Theme color** — sampled automatically from the wallpaper, or pick your own
- **Clock** — digital, minimal, flip and analog faces that can be stacked freely, plus a standalone flip clock; adjustable size and optional glass card
- **Search** — Google, Bing, DuckDuckGo, Yahoo, YouTube, Wikipedia, with on-device history suggestions
- **Shortcut dock** — drag to reorder, one-click add for common services, automatic favicons
- **More** — quick notes, Pomodoro timer, weather, settings export/import, drag any widget anywhere
- **11 languages** — English, 繁體中文, 简体中文, 日本語, 한국어, Español, Français, Deutsch, Português, Русский, Tiếng Việt — detected automatically on first run

## Install

1. Unzip this folder anywhere you like (keep the folder — deleting it uninstalls the extension)
2. Open Chrome and go to `chrome://extensions`
3. Turn on **Developer mode** (top right)
4. Click **Load unpacked** (top left) and select the `FlowGlass` folder
5. Press Ctrl+T to open a new tab

> Chrome may show a "Disable developer mode extensions" prompt on later startups. Choose **Keep** — this is normal for extensions not installed from the Web Store.

Requires Chrome 111 or newer.

## Usage

- The gear button in the bottom right opens the settings panel: wallpaper, glass effects, theme color, widget toggles and language
- Hover a widget and grab the `⠿` handle to drag it anywhere; **Reset layout** in the settings panel restores the defaults
- All settings and wallpapers live in your browser's local storage (localStorage + IndexedDB) and are never sent anywhere
- Weather is off by default. Once enabled, leave the city blank to use your location (requires the location permission) or type a city name

## Privacy

See [PRIVACY.md](PRIVACY.md). Short version: no personal data is collected, stored, transmitted, or sold.

## License

MIT License
