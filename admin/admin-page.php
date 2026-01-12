<?php
/**
 * Admin page template for Image to Design Tokens
 *
 * @package ImageToDesignTokens
 */

// Prevent direct access
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
?>
<div class="wrap">
    <noscript>
        <div class="notice notice-warning">
            <p><?php esc_html_e( 'This tool requires JavaScript to function. Please enable JavaScript in your browser.', 'image-to-design-tokens' ); ?></p>
        </div>
    </noscript>
    <div id="idtt-app" class="idtt-app">
        <header class="idtt-header">
            <h1><?php echo esc_html__( 'Image to Design Tokens', 'image-to-design-tokens' ); ?></h1>
            <p><?php echo esc_html__( 'Upload an image to extract a color palette and generate accessible design tokens', 'image-to-design-tokens' ); ?></p>
        </header>

        <div class="idtt-main-grid">
            <!-- Left Sidebar: Controls & Palette -->
            <div class="idtt-sidebar">
                <div class="idtt-panel">
                    <div class="idtt-panel-title"><?php echo esc_html__( 'Image Upload', 'image-to-design-tokens' ); ?></div>

                    <div class="idtt-thumbnail-container" id="idtt-thumbnail-container">
                        <img class="idtt-thumbnail" id="idtt-thumbnail" alt="<?php echo esc_attr__( 'Uploaded image preview', 'image-to-design-tokens' ); ?>">
                    </div>

                    <div class="idtt-upload-zone" id="idtt-upload-zone">
                        <div class="idtt-upload-icon">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                <circle cx="8.5" cy="8.5" r="1.5"/>
                                <polyline points="21 15 16 10 5 21"/>
                            </svg>
                        </div>
                        <div class="idtt-upload-text"><?php echo esc_html__( 'Drop an image or click to upload', 'image-to-design-tokens' ); ?></div>
                    </div>
                    <input type="file" id="idtt-file-input" accept="image/jpeg,image/png,image/webp" style="display:none;">
                </div>

                <div class="idtt-panel" style="margin-top: 16px;">
                    <div class="idtt-panel-title"><?php echo esc_html__( 'Extracted Palette', 'image-to-design-tokens' ); ?></div>
                    <div class="idtt-palette-grid" id="idtt-palette-grid">
                        <div class="idtt-palette-empty"><?php echo esc_html__( 'Upload an image to extract colors', 'image-to-design-tokens' ); ?></div>
                    </div>
                    <p class="idtt-palette-hint">
                        <?php echo esc_html__( 'Click a swatch to lock it as primary.', 'image-to-design-tokens' ); ?>
                    </p>
                </div>

                <!-- Saved Palettes Panel -->
                <div class="idtt-panel" style="margin-top: 16px;">
                    <div class="idtt-panel-title"><?php echo esc_html__( 'Saved Palettes', 'image-to-design-tokens' ); ?></div>
                    <div id="idtt-saved-palettes-list" class="idtt-saved-palettes-list">
                        <div class="idtt-saved-empty"><?php echo esc_html__( 'No saved palettes yet', 'image-to-design-tokens' ); ?></div>
                    </div>
                    <button type="button" class="idtt-btn idtt-btn-secondary" id="idtt-save-palette-btn" disabled>
                        <?php echo esc_html__( 'Save Current Palette', 'image-to-design-tokens' ); ?>
                    </button>
                </div>
            </div>

            <!-- Main Content: Previews -->
            <div class="idtt-content">
                <div class="idtt-warning-banner" id="idtt-warning-banner"></div>

                <div id="idtt-preview-area">
                    <div class="idtt-empty-state">
                        <div class="idtt-empty-state-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
                            </svg>
                        </div>
                        <h3><?php echo esc_html__( 'No palette generated yet', 'image-to-design-tokens' ); ?></h3>
                        <p><?php echo esc_html__( 'Upload an image to get started', 'image-to-design-tokens' ); ?></p>
                    </div>
                </div>

                <!-- Export Buttons (hidden until palette generated) -->
                <div class="idtt-export-actions" id="idtt-export-actions" style="display: none;">
                    <button type="button" class="idtt-btn idtt-btn-secondary" id="idtt-copy-css-btn">
                        <?php echo esc_html__( 'Copy CSS Variables', 'image-to-design-tokens' ); ?>
                    </button>
                </div>

                <!-- Promptless WP CTA (hidden until palette generated) -->
                <div class="idtt-promptless-cta" id="idtt-promptless-cta" style="display: none;">
                    <p>
                        <?php echo esc_html__( 'Want to apply tokens to production-ready page layouts automatically?', 'image-to-design-tokens' ); ?>
                        <a href="https://promptlesswp.com" target="_blank" rel="noopener noreferrer">
                            <?php echo esc_html__( 'Learn about Promptless WP', 'image-to-design-tokens' ); ?>
                        </a>
                    </p>
                </div>
            </div>
        </div>
    </div>

    <!-- Hidden canvas for image processing -->
    <canvas id="idtt-processing-canvas" style="display: none;"></canvas>
</div>
