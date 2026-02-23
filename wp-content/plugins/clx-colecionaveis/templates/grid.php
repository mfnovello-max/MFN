<?php
/** @var WC_Product $product */
/** @var array{label:string,class:string} $badge */

if (!defined('ABSPATH')) {
    exit;
}

$categories = wp_get_post_terms($product->get_id(), 'product_cat', ['fields' => 'names']);
$pack = $product->get_attribute('pa_pack-com');
$ciclo = $product->get_attribute('pa_tipo-de-ciclo');
$category_line = !empty($categories) ? implode(', ', $categories) : '';
$product_url = get_permalink($product->get_id());
?>
<article class="clx-card">
    <figure class="clx-thumb">
        <?php if ($product->get_image_id()) : ?>
            <?php echo wp_kses_post($product->get_image('woocommerce_thumbnail')); ?>
        <?php else : ?>
            <img src="<?php echo esc_url(wc_placeholder_img_src('woocommerce_thumbnail')); ?>" alt="<?php echo esc_attr($product->get_name()); ?>" />
        <?php endif; ?>

        <?php if (!empty($badge['label'])) : ?>
            <span class="clx-badge clx-badge--<?php echo esc_attr($badge['class']); ?>"><?php echo esc_html($badge['label']); ?></span>
        <?php endif; ?>
    </figure>

    <div class="clx-card-body">
        <h3><?php echo esc_html($product->get_name()); ?></h3>
        <p class="clx-price"><?php echo wp_kses_post($product->get_price_html()); ?></p>
        <?php if (!empty($pack) || !empty($ciclo)) : ?>
            <div class="clx-card-mini-meta">
                <?php if (!empty($pack)) : ?>
                    <p><span><?php esc_html_e('Pack com:', 'clx-colecionaveis'); ?></span><strong><?php echo esc_html($pack); ?></strong></p>
                <?php endif; ?>
                <?php if (!empty($ciclo)) : ?>
                    <p><span><?php esc_html_e('Tipo de ciclo:', 'clx-colecionaveis'); ?></span><strong><?php echo esc_html($ciclo); ?></strong></p>
                <?php endif; ?>
            </div>
        <?php endif; ?>

        <div class="clx-card-actions">
            <a href="<?php echo esc_url($product_url); ?>" class="clx-btn clx-btn--primary clx-card-btn clx-btn--compact">
                <span class="clx-btn-label"><?php esc_html_e('Ver Opções', 'clx-colecionaveis'); ?></span>
            </a>
            <a href="<?php echo esc_url($product_url); ?>" class="clx-btn clx-btn--secondary clx-card-btn clx-btn--compact">
                <span class="clx-btn-label"><?php esc_html_e('Ver Detalhes', 'clx-colecionaveis'); ?></span>
            </a>
        </div>

        <?php if (!empty($category_line)) : ?>
            <p class="clx-card-taxonomy"><?php echo esc_html($category_line); ?></p>
        <?php endif; ?>
    </div>
</article>
