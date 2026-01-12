<?php
/**
 * Plugin Name: Image to Design Tokens
 * Plugin URI: https://promptlesswp.com
 * Description: Extract color palettes from images and generate accessible design tokens for light and dark modes. All processing happens in your browser - no uploads, no external APIs.
 * Version: 1.0.0
 * Requires at least: 6.0
 * Requires PHP: 8.0
 * Author: Promptless WP
 * Author URI: https://promptlesswp.com
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: image-to-design-tokens
 * Domain Path: /languages
 */

// Prevent direct access
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Plugin constants
define( 'IDTT_VERSION', '1.0.0' );
define( 'IDTT_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'IDTT_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

/**
 * Register the admin menu
 */
function idtt_register_admin_menu() {
    add_management_page(
        __( 'Design Tokens', 'image-to-design-tokens' ),
        __( 'Design Tokens', 'image-to-design-tokens' ),
        'manage_options',
        'image-to-design-tokens',
        'idtt_render_admin_page'
    );
}
add_action( 'admin_menu', 'idtt_register_admin_menu' );

/**
 * Render the admin page
 */
function idtt_render_admin_page() {
    // Verify user capabilities
    if ( ! current_user_can( 'manage_options' ) ) {
        wp_die( esc_html__( 'You do not have sufficient permissions to access this page.', 'image-to-design-tokens' ) );
    }

    // Include the admin page template
    include IDTT_PLUGIN_DIR . 'admin/admin-page.php';
}

/**
 * Enqueue admin scripts and styles
 */
function idtt_enqueue_admin_assets( $hook ) {
    // Only load on our plugin page
    if ( 'tools_page_image-to-design-tokens' !== $hook ) {
        return;
    }

    // Enqueue CSS
    $css_file = IDTT_PLUGIN_DIR . 'assets/css/app.css';
    wp_enqueue_style(
        'idtt-app-css',
        IDTT_PLUGIN_URL . 'assets/css/app.css',
        array(),
        file_exists( $css_file ) ? filemtime( $css_file ) : IDTT_VERSION
    );

    // Enqueue JS
    $js_file = IDTT_PLUGIN_DIR . 'assets/js/app.js';
    wp_enqueue_script(
        'idtt-app-js',
        IDTT_PLUGIN_URL . 'assets/js/app.js',
        array(),
        file_exists( $js_file ) ? filemtime( $js_file ) : IDTT_VERSION,
        true
    );
}
add_action( 'admin_enqueue_scripts', 'idtt_enqueue_admin_assets' );

/**
 * Add settings link to plugins page
 */
function idtt_plugin_action_links( $links ) {
    $settings_link = sprintf(
        '<a href="%s">%s</a>',
        admin_url( 'tools.php?page=image-to-design-tokens' ),
        esc_html__( 'Open Tool', 'image-to-design-tokens' )
    );
    array_unshift( $links, $settings_link );
    return $links;
}
add_filter( 'plugin_action_links_' . plugin_basename( __FILE__ ), 'idtt_plugin_action_links' );
