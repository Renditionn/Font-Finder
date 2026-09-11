# Font Finder

A small browser extension for finding out what fonts websites are using.

I made this because checking fonts through DevTools every time gets annoying. Font Finder gives you the useful typography info without having to dig through the page.

## What it does

* Hover over text to inspect it
* Click text to lock it
* Press `Escape` to unlock it
* Shows the font family
* Shows font weight and size
* Shows line height
* Shows letter spacing
* Shows font style
* Shows the actual text colour
* Shows a colour swatch
* Save colours you like
* Copy saved colours
* Export saved colours to JSON
* Copy the font name
* Copy the CSS
* Shows fonts being used on the page
* `Ctrl + Shift + F` toggles the inspector

## Installing

This isn't on the Chrome Web Store, so you'll need to load it manually.

1. Download the project.
2. Open `chrome://extensions`
3. Turn on **Developer mode**
4. Click **Load unpacked**
5. Select the Font Finder folder.

That's it.

## Using it

Move your mouse over some text.

Font Finder will show something like:

```text
Inter
600 · 16px

font-family       Inter
font-weight       600
font-size         16px
line-height       24px
letter-spacing    0px
font-style        normal
color             ■ rgb(40, 120, 232)
```

Click the text if you want to keep inspecting it.

Press `Escape` when you're done.

## Saving colours

The colour next to `color` is the actual colour being used by the text.

Click **Save** next to it to save that colour.

Saved colours show up at the bottom of Font Finder. Clicking one copies the RGB value.

You can also export them with **Save colours as JSON**.

Example:

```json
{
  "colours": [
    "rgb(40, 120, 232)",
    "rgb(255, 255, 255)"
  ]
}
```

## Files

```text
manifest.json
background.js
content.js
content.css
```

`content.js` does most of the actual work.

`content.css` is just the UI styling.

`background.js` handles the keyboard shortcut.

`manifest.json` contains the extension setup.

## Keyboard shortcut

```text
Ctrl + Shift + F
```

Use it to turn Font Finder on or off.

## Built with

Just:

* JavaScript
* CSS
* HTML
* Chrome Manifest V3

No frameworks or build system.

## Why?

Mostly because I wanted a quick way to check fonts and colours without opening DevTools every five seconds.

If you find a bug, feel free to open an issue.
