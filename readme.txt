=== Image to Design Tokens ===
Contributors: promptlesswp
Tags: design tokens, color palette, accessibility, wcag, design system
Requires at least: 6.0
Tested up to: 6.7
Requires PHP: 8.0
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Extract color palettes from images and generate accessible design tokens for light and dark modes. All processing happens in your browser.

== Description ==

Image to Design Tokens is a privacy-focused tool for designers and developers who need to extract color palettes from images and generate accessible design system tokens.

**Key Features:**

* **Browser-Only Processing** - Your images never leave your computer. All color extraction happens locally using the Canvas API.
* **Accessible Design Tokens** - Automatically generates light and dark mode tokens with WCAG-compliant contrast ratios.
* **Smart Color Extraction** - Uses median cut algorithm with vibrant color recovery to ensure brand colors are preserved.
* **Live Preview** - See how your tokens will look in a real UI before exporting.
* **Contrast Checking** - Built-in WCAG contrast ratio verification for all token combinations.
* **Export Options** - Copy CSS variables with a single click.
* **Save Palettes** - Store up to 5 palettes locally for quick access (uses browser localStorage).

**How It Works:**

1. Upload or drag-and-drop an image (screenshot, logo, or any visual)
2. The tool extracts dominant colors using the median cut algorithm
3. Design tokens are generated for both light and dark modes
4. Review contrast checks and preview your design system
5. Export as CSS custom properties

**Generated Tokens:**

* Background (bg)
* Surface
* Border
* Text
* Heading
* Muted Text
* Primary (accent/brand color)
* On Primary (text on primary)

== Installation ==

1. Upload the plugin files to `/wp-content/plugins/image-to-design-tokens/`
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Navigate to Tools > Design Tokens to use the tool

== Frequently Asked Questions ==

= Does this plugin upload my images to a server? =

No. All image processing happens entirely in your browser using the HTML5 Canvas API. Your images are never uploaded to any server.

= What image formats are supported? =

JPEG, PNG, and WebP images are supported.

= How does the color extraction work? =

The plugin uses the median cut algorithm to quantize colors, combined with vibrant color recovery to ensure saturated brand colors are preserved even when they occupy a small area of the image.

= What do the contrast badges mean? =

* **PASS** - Meets or exceeds WCAG AA requirements
* **AA** - Meets minimum requirements but not ideal
* **FAIL** - Does not meet accessibility requirements

= Can I lock a specific primary color? =

Yes! Simply click any swatch in the extracted palette to lock it as the primary color. Click it again to unlock. This is useful when you want to preserve a specific brand color.

= Where are saved palettes stored? =

Saved palettes are stored in your browser's localStorage. They persist between sessions but are not synced across devices or browsers.

= Does this plugin require an account? =

No. This plugin works entirely standalone with no account, registration, or login required.

= Does this plugin track users or collect data? =

No. This plugin does not track users, collect analytics, or send any data externally. All processing happens locally in your browser.

== Screenshots ==

1. Main interface showing color extraction and token generation
2. Light mode preview with contrast checks
3. Dark mode preview with contrast checks
4. Saved palettes panel

== Changelog ==

= 1.0.0 =
* Initial release
* Browser-only image color extraction
* Light and dark mode token generation
* WCAG contrast checking
* CSS Variables export
* Local palette storage (up to 5)

== Upgrade Notice ==

= 1.0.0 =
Initial release of Image to Design Tokens.

== Works Well With ==

* **Promptless WP** - Apply your generated design tokens to production-ready page layouts automatically. Learn more at promptlesswp.com
