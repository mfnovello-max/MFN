<?php
/**
 * Plugin Name: CLX Design System (Tokens + Buttons)
 * Description: Enfileira tokens globais e componente de botões do Design System Cobraleds 2026.
 * Version: 1.0.1
 * Author: CLX
 */

if (!defined('ABSPATH')) {
    exit;
}

function clx_design_system_enqueue_assets(): void {
    wp_enqueue_style(
        'clx-design-system-tokens',
        plugin_dir_url(__FILE__) . 'assets/tokens.css',
        [],
        '1.0.1'
    );

    wp_enqueue_style(
        'clx-design-system-buttons',
        plugin_dir_url(__FILE__) . 'assets/components/buttons.css',
        ['clx-design-system-tokens'],
        '1.0.1'
    );
}
add_action('wp_enqueue_scripts', 'clx_design_system_enqueue_assets', 5);
