=== Image to Design Tokens ===
Contributors: promptlesswp
Tags: design tokens, color palette, accessibility, wcag, design system
Requires at least: 6.0
Tested up to: 6.9
Requires PHP: 8.0
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Extract color palettes from images and generate design tokens for light and dark modes. All processing happens in your browser.

== Description ==

Image to Design Tokens is a privacy-focused tool for designers and developers who need to extract color palettes from images and generate design system tokens.

= Key Features =

* Browser-Only Processing – Images are processed locally in the browser using the Canvas API and are never uploaded to a server.
* Light and Dark Mode Tokens – Generates design tokens for both light and dark modes with contrast ratio indicators.
* Color Extraction – Uses the median cut algorithm with a bias toward preserving saturated accent colors.
* Live Preview – Preview how generated tokens appear in a sample user interface before exporting.
* Contrast Checking – Displays WCAG contrast ratio calculations to help evaluate accessibility.
* Export – Copy generated CSS custom properties to the clipboard.
* Save Palettes – Store up to 5 palettes locally using browser localStorage.

= How It Works =

1. Upload or drag-and-drop an image (such as a screenshot, logo, or visual reference)
2. The tool extracts dominant colors using the median cut algorithm
3. Design tokens are generated for both light and dark modes
4. Review contrast ratio indicators and preview the tokens
5. Copy the generated CSS custom properties

= Generated Tokens =

* Background (bg)
* Surface
* Border
* Text
* Heading
* Muted Text
* Primary (accent or brand color)
* On Primary (text displayed on the primary color)

== Installation ==

1. Upload the plugin files to `/wp-content/plugins/image-to-design-tokens/`
2. Activate the plugin through the Plugins menu in WordPress
3. Navigate to Tools > Design Tokens to use the tool

== Frequently Asked Questions ==

= Does this plugin upload my images to a server? =

No. All image processing happens entirely in your browser using the HTML5 Canvas API. Images are never uploaded to any server.

= What image formats are supported? =

JPEG, PNG, and WebP images are supported.

= How does the color extraction work? =

The plugin uses the median cut algorithm to quantize colors, with adjustments to help preserve saturated colors even when they occupy a small area of the image.

= What do the contrast indicators mean? =

The plugin calculates contrast ratios based on WCAG guidelines:

* PASS – Indicates the contrast ratio meets WCAG AA contrast recommendations (4.5:1 for normal text)
* MEETS MINIMUM – Indicates the contrast ratio is at the minimum WCAG AA threshold
* FAIL – Indicates the contrast ratio is below WCAG AA contrast recommendations

These indicators are provided as a reference tool only. Final accessibility compliance depends on how colors are implemented in a specific design or context.

= Can I lock a specific primary color? =

Yes. Click any swatch in the extracted palette to lock it as the primary color. Click it again to unlock.

= Where are saved palettes stored? =

Saved palettes are stored in your browser’s localStorage. They persist between sessions but are not synced across devices or browsers.

Clearing browser data or localStorage will remove any saved palettes.

= Does this plugin require an account? =

No. The plugin works entirely standalone and does not require an account, registration, or login.

= Does this plugin track users or collect data? =

No. The plugin does not track users, collect analytics, or transmit data externally. All processing happens locally in the browser.

== Screenshots ==

1. Main interface showing color extraction and token generation
2. Light mode preview with contrast indicators
3. Dark mode preview with contrast indicators
4. Saved palettes panel

== Changelog ==

= 1.0.0 =
* Initial release
* Browser-only image color extraction
* Light and dark mode token generation
* Contrast ratio indicators
* CSS custom properties export
* Local palette storage (up to 5)

== Upgrade Notice ==

= 1.0.0 =
Initial release of Image to Design Tokens.

== Additional Information ==

This plugin can be used alongside other tools. For example, Promptless WP can consume exported design tokens as part of a broader page layout workflow.
