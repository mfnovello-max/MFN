<?php
/**
 * Plugin Name: CLX Colecionáveis
 * Description: Faceted Product Archive com filtros reais, AJAX e URL com parâmetros para WooCommerce.
 * Version: 1.3.1
 * Author: Cobraleds
 * Text Domain: clx-colecionaveis
 */

if (!defined('ABSPATH')) {
    exit;
}

final class CLX_Colecionaveis {
    private const NONCE_ACTION = 'clx_colecionaveis_nonce';
    private const SHORTCODE = 'clx_colecionaveis';

    public function __construct() {
        add_shortcode(self::SHORTCODE, [$this, 'render_shortcode']);
        add_action('wp_enqueue_scripts', [$this, 'register_assets']);
        add_action('wp_ajax_clx_colecionaveis_filter', [$this, 'ajax_filter']);
        add_action('wp_ajax_nopriv_clx_colecionaveis_filter', [$this, 'ajax_filter']);
    }

    public function register_assets(): void {
        $css_path = plugin_dir_path(__FILE__) . 'assets/colecionaveis.css';
        $js_path = plugin_dir_path(__FILE__) . 'assets/colecionaveis.js';
        $css_ver = file_exists($css_path) ? (string) filemtime($css_path) : '1.3.1';
        $js_ver = file_exists($js_path) ? (string) filemtime($js_path) : '1.3.1';

        wp_register_style('clx-colecionaveis', plugins_url('assets/colecionaveis.css', __FILE__), [], $css_ver);
        wp_register_script('clx-colecionaveis', plugins_url('assets/colecionaveis.js', __FILE__), [], $js_ver, true);
    }

    public function render_shortcode(): string {
        if (!class_exists('WooCommerce')) {
            return '<p>' . esc_html__('WooCommerce não está ativo.', 'clx-colecionaveis') . '</p>';
        }

        wp_enqueue_style('clx-colecionaveis');
        wp_add_inline_style('clx-colecionaveis', <<<CSS
[data-clx-root] .clx-card-body{
  padding: .52rem .36rem .60rem;
}
[data-clx-root] .clx-price{
  margin: 0 0 .24rem;
}
[data-clx-root] .clx-stock{
  margin: 0 0 .34rem;
}
[data-clx-root] .clx-card-mini-meta{
  margin: 0 0 .24rem;
  padding: .32rem .24rem;
}
[data-clx-root] .clx-card-actions{
  gap: .28rem;
  margin: .22rem 0 .24rem;
}
[data-clx-root] .clx-card-actions .clx-btn.clx-card-btn.clx-btn--compact{
  min-height: 34px !important;
  padding: .42rem .92rem !important;
  line-height: 1 !important;
  font-size: .74rem !important;
  letter-spacing: .08em;
  white-space: nowrap;
}
[data-clx-root] .clx-card-taxonomy{
  margin: .30rem 0 0;
}
CSS);
        wp_enqueue_script('clx-colecionaveis');

        wp_localize_script('clx-colecionaveis', 'CLXColecionaveis', [
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce(self::NONCE_ACTION),
            'strings' => [
                'error' => __('Não foi possível carregar os produtos. Tente novamente.', 'clx-colecionaveis'),
                'productFound' => __('produto encontrado', 'clx-colecionaveis'),
                'productsFound' => __('produtos encontrados', 'clx-colecionaveis'),
            ],
        ]);

        $filters = $this->collect_filters($_GET);
        $query_data = $this->get_products($filters);

        ob_start();
        ?>
        <div id="clx-page-colecionaveis" class="clx-page" data-clx-root>
            <button class="clx-open-drawer" type="button" data-clx-open-drawer><?php esc_html_e('Filtros', 'clx-colecionaveis'); ?></button>

            <div class="clx-layout">
                <aside class="clx-sidebar" data-clx-sidebar>
                    <div class="clx-sidebar-head">
                        <h2><span class="clx-meta-bullet" aria-hidden="true"></span><?php esc_html_e('Encontre sua semente', 'clx-colecionaveis'); ?></h2>
                        <button class="clx-close-drawer" type="button" data-clx-close-drawer aria-label="<?php esc_attr_e('Fechar filtros', 'clx-colecionaveis'); ?>">×</button>
                    </div>
                    <?php echo $this->render_filters($filters); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
                </aside>
                <div class="clx-overlay" data-clx-overlay></div>

                <section class="clx-results" data-clx-results>
                    <div class="clx-topline">
                        <p data-clx-count>
                            <?php echo esc_html(sprintf(_n('%d produto encontrado', '%d produtos encontrados', (int) $query_data['found_posts'], 'clx-colecionaveis'), (int) $query_data['found_posts'])); ?>
                        </p>
                    </div>

                    <div class="clx-toolbar">
                        <div class="clx-active-filters" data-clx-active-filters>
                            <?php echo $this->render_active_filters($filters); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
                        </div>
                    </div>

                    <div data-clx-grid>
                        <?php echo $this->render_grid($query_data['products'], $query_data['max_num_pages'], $filters['paged']); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
                    </div>
                </section>
            </div>
        </div>
        <?php

        return (string) ob_get_clean();
    }

    private function render_filters(array $filters): string {
        $categories = get_terms(['taxonomy' => 'product_cat', 'hide_empty' => true]);
        $brands = taxonomy_exists('product_brand') ? get_terms(['taxonomy' => 'product_brand', 'hide_empty' => true]) : [];

        ob_start();
        ?>
        <form class="clx-filters" data-clx-form>
            <input type="hidden" name="paged" value="<?php echo esc_attr($filters['paged']); ?>" data-clx-paged />

            <?php echo $this->render_select('search', __('Busca', 'clx-colecionaveis'), [], $filters['search'], 'text', __('O que você está buscando?', 'clx-colecionaveis')); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>

            <div class="clx-filter-group clx-price-range">
                <label><?php esc_html_e('Preço', 'clx-colecionaveis'); ?></label>
                <div>
                    <input type="number" step="0.01" min="0" name="min_price" value="<?php echo esc_attr($filters['min_price']); ?>" placeholder="<?php esc_attr_e('R$ Min', 'clx-colecionaveis'); ?>" />
                    <input type="number" step="0.01" min="0" name="max_price" value="<?php echo esc_attr($filters['max_price']); ?>" placeholder="<?php esc_attr_e('R$ Max', 'clx-colecionaveis'); ?>" />
                </div>
            </div>

            <div class="clx-filter-group">
                <label for="clx-orderby"><?php esc_html_e('Ordenar por', 'clx-colecionaveis'); ?></label>
                <select id="clx-orderby" name="orderby">
                    <option value="date" <?php selected($filters['orderby'], 'date'); ?>><?php esc_html_e('Mais recentes', 'clx-colecionaveis'); ?></option>
                    <option value="price" <?php selected($filters['orderby'], 'price'); ?>><?php esc_html_e('Menor preço', 'clx-colecionaveis'); ?></option>
                    <option value="price-desc" <?php selected($filters['orderby'], 'price-desc'); ?>><?php esc_html_e('Maior preço', 'clx-colecionaveis'); ?></option>
                    <option value="title" <?php selected($filters['orderby'], 'title'); ?>><?php esc_html_e('Nome (A-Z)', 'clx-colecionaveis'); ?></option>
                </select>
            </div>

            <?php echo $this->render_select('product_cat', __('Categoria', 'clx-colecionaveis'), $categories, $filters['product_cat']); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
            <?php echo $this->render_select('pa_tamanho', __('Tamanho', 'clx-colecionaveis'), taxonomy_exists('pa_tamanho') ? get_terms(['taxonomy' => 'pa_tamanho', 'hide_empty' => true]) : [], $filters['pa_tamanho']); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
            <?php if (!empty($brands) && !is_wp_error($brands)) : ?>
                <?php echo $this->render_select('product_brand', __('Marca', 'clx-colecionaveis'), $brands, $filters['product_brand']); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
            <?php endif; ?>

            <?php echo $this->render_pills_group('pa_tipo-de-ciclo', __('Tipo de ciclo', 'clx-colecionaveis'), $filters['pa_tipo-de-ciclo']); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
            <?php echo $this->render_pills_group('pa_tipo-de-semente', __('Tipo de semente', 'clx-colecionaveis'), $filters['pa_tipo-de-semente']); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
            <?php echo $this->render_pills_group('pa_pack-com', __('Pack com', 'clx-colecionaveis'), $filters['pa_pack-com']); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>

            <div class="clx-filter-actions">
                <button type="submit" class="clx-btn clx-btn--primary"><?php esc_html_e('Aplicar filtros', 'clx-colecionaveis'); ?></button>
                <button type="button" class="clx-btn clx-btn--secondary" data-clx-reset><?php esc_html_e('Limpar', 'clx-colecionaveis'); ?></button>
            </div>
        </form>
        <?php
        return (string) ob_get_clean();
    }

    private function render_select(string $name, string $label, $terms = [], string $selected_value = '', string $type = 'select', string $placeholder = ''): string {
        ob_start();
        ?>
        <div class="clx-filter-group">
            <label for="<?php echo esc_attr('clx-' . $name); ?>"><?php echo esc_html($label); ?></label>
            <?php if ($type === 'text') : ?>
                <input id="<?php echo esc_attr('clx-' . $name); ?>" type="text" name="<?php echo esc_attr($name); ?>" value="<?php echo esc_attr($selected_value); ?>" placeholder="<?php echo esc_attr($placeholder); ?>" />
            <?php else : ?>
                <select id="<?php echo esc_attr('clx-' . $name); ?>" name="<?php echo esc_attr($name); ?>">
                    <option value=""><?php esc_html_e('Todos', 'clx-colecionaveis'); ?></option>
                    <?php if (!empty($terms) && !is_wp_error($terms)) : ?>
                        <?php foreach ($terms as $term) : ?>
                            <option value="<?php echo esc_attr($term->slug); ?>" <?php selected($selected_value, $term->slug); ?>>
                                <?php echo esc_html($term->name); ?>
                            </option>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </select>
            <?php endif; ?>
        </div>
        <?php
        return (string) ob_get_clean();
    }

    private function render_pills_group(string $taxonomy, string $label, string $selected): string {
        if (!taxonomy_exists($taxonomy)) {
            return '';
        }

        $terms = get_terms(['taxonomy' => $taxonomy, 'hide_empty' => true]);
        if (empty($terms) || is_wp_error($terms)) {
            return '';
        }

        ob_start();
        ?>
        <div class="clx-filter-group clx-pills-group">
            <label><?php echo esc_html($label); ?></label>
            <input type="hidden" name="<?php echo esc_attr($taxonomy); ?>" value="<?php echo esc_attr($selected); ?>" />
            <div class="clx-pills" data-clx-pills data-target="<?php echo esc_attr($taxonomy); ?>">
                <?php foreach ($terms as $term) : ?>
                    <button type="button" class="clx-pill <?php echo $selected === $term->slug ? 'is-active' : ''; ?>" data-clx-pill="<?php echo esc_attr($term->slug); ?>" aria-pressed="<?php echo $selected === $term->slug ? 'true' : 'false'; ?>"><?php echo esc_html($term->name); ?></button>
                <?php endforeach; ?>
            </div>
        </div>
        <?php
        return (string) ob_get_clean();
    }

    private function collect_filters(array $source): array {
        $filters = [
            'product_cat' => isset($source['product_cat']) ? sanitize_text_field((string) $source['product_cat']) : '',
            'product_brand' => isset($source['product_brand']) ? sanitize_text_field((string) $source['product_brand']) : '',
            'pa_pack-com' => isset($source['pa_pack-com']) ? sanitize_text_field((string) $source['pa_pack-com']) : '',
            'pa_tamanho' => isset($source['pa_tamanho']) ? sanitize_text_field((string) $source['pa_tamanho']) : '',
            'pa_tipo-de-ciclo' => isset($source['pa_tipo-de-ciclo']) ? sanitize_text_field((string) $source['pa_tipo-de-ciclo']) : '',
            'pa_tipo-de-semente' => isset($source['pa_tipo-de-semente']) ? sanitize_text_field((string) $source['pa_tipo-de-semente']) : '',
            'search' => isset($source['search']) ? sanitize_text_field((string) $source['search']) : '',
            'min_price' => isset($source['min_price']) ? sanitize_text_field((string) $source['min_price']) : '',
            'max_price' => isset($source['max_price']) ? sanitize_text_field((string) $source['max_price']) : '',
            'orderby' => isset($source['orderby']) ? sanitize_text_field((string) $source['orderby']) : 'date',
            'paged' => isset($source['paged']) ? max(1, absint($source['paged'])) : 1,
        ];

        $valid_order = ['date', 'price', 'price-desc', 'title'];
        if (!in_array($filters['orderby'], $valid_order, true)) {
            $filters['orderby'] = 'date';
        }

        return $filters;
    }

    private function render_active_filters(array $filters): string {
        $labels = [
            'product_cat' => __('Categoria', 'clx-colecionaveis'),
            'product_brand' => __('Marca', 'clx-colecionaveis'),
            'pa_pack-com' => __('Pack', 'clx-colecionaveis'),
            'pa_tamanho' => __('Tamanho', 'clx-colecionaveis'),
            'pa_tipo-de-ciclo' => __('Ciclo', 'clx-colecionaveis'),
            'pa_tipo-de-semente' => __('Semente', 'clx-colecionaveis'),
            'search' => __('Busca', 'clx-colecionaveis'),
        ];

        $chips = [];
        foreach ($labels as $key => $label) {
            if (!empty($filters[$key])) {
                $chips[] = sprintf('<span class="clx-chip">%s: %s</span>', esc_html($label), esc_html($filters[$key]));
            }
        }

        if ($filters['min_price'] !== '' || $filters['max_price'] !== '') {
            $chips[] = sprintf('<span class="clx-chip">%s: %s - %s</span>', esc_html__('Preço', 'clx-colecionaveis'), esc_html($filters['min_price'] ?: '0'), esc_html($filters['max_price'] ?: '∞'));
        }

        if (empty($chips)) {
            return '<span class="clx-chip clx-chip--muted">' . esc_html__('Sem filtros ativos', 'clx-colecionaveis') . '</span>';
        }

        return implode('', $chips);
    }

    private function get_products(array $filters): array {
        $tax_query = ['relation' => 'AND'];
        foreach (['product_cat', 'product_brand', 'pa_pack-com', 'pa_tamanho', 'pa_tipo-de-ciclo', 'pa_tipo-de-semente'] as $taxonomy) {
            if (!empty($filters[$taxonomy])) {
                $tax_query[] = [
                    'taxonomy' => $taxonomy,
                    'field' => 'slug',
                    'terms' => $filters[$taxonomy],
                ];
            }
        }

        $meta_query = ['relation' => 'AND'];
        if ($filters['min_price'] !== '') {
            $meta_query[] = ['key' => '_price', 'value' => $filters['min_price'], 'compare' => '>=', 'type' => 'DECIMAL(10,2)'];
        }
        if ($filters['max_price'] !== '') {
            $meta_query[] = ['key' => '_price', 'value' => $filters['max_price'], 'compare' => '<=', 'type' => 'DECIMAL(10,2)'];
        }

        $args = [
            'post_type' => 'product',
            'post_status' => 'publish',
            'posts_per_page' => 12,
            'paged' => $filters['paged'],
            's' => $filters['search'],
            'tax_query' => count($tax_query) > 1 ? $tax_query : [],
            'meta_query' => count($meta_query) > 1 ? $meta_query : [],
        ];

        switch ($filters['orderby']) {
            case 'price':
                $args['meta_key'] = '_price';
                $args['orderby'] = 'meta_value_num';
                $args['order'] = 'ASC';
                break;
            case 'price-desc':
                $args['meta_key'] = '_price';
                $args['orderby'] = 'meta_value_num';
                $args['order'] = 'DESC';
                break;
            case 'title':
                $args['orderby'] = 'title';
                $args['order'] = 'ASC';
                break;
            default:
                $args['orderby'] = 'date';
                $args['order'] = 'DESC';
        }

        $query = new WP_Query($args);

        return [
            'products' => $query->posts,
            'found_posts' => (int) $query->found_posts,
            'max_num_pages' => (int) $query->max_num_pages,
        ];
    }

    private function render_grid(array $products, int $max_pages, int $current_page): string {
        ob_start();

        if (empty($products)) {
            echo '<p class="clx-empty">' . esc_html__('Nenhum produto encontrado com esses filtros.', 'clx-colecionaveis') . '</p>';
        } else {
            echo '<div class="clx-grid">';
            foreach ($products as $post) {
                $product = wc_get_product($post->ID);
                if (!$product instanceof WC_Product) {
                    continue;
                }
                $badge = $this->resolve_badge($product);
                $template_path = plugin_dir_path(__FILE__) . 'templates/grid.php';
                include $template_path;
            }
            echo '</div>';
        }

        if ($max_pages > 1) {
            echo $this->render_pagination($current_page, $max_pages); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
        }

        return (string) ob_get_clean();
    }

    private function render_pagination(int $current_page, int $max_pages): string {
        $visible = 5;
        $half = (int) floor($visible / 2);
        $start = max(1, $current_page - $half);
        $end = min($max_pages, $start + $visible - 1);
        if (($end - $start + 1) < $visible) {
            $start = max(1, $end - $visible + 1);
        }

        ob_start();
        ?>
        <nav class="clx-pagination" data-clx-pagination aria-label="<?php esc_attr_e('Paginação de produtos', 'clx-colecionaveis'); ?>">
            <button type="button" class="clx-page-btn" data-clx-page="1" <?php disabled($current_page <= 1); ?> aria-label="<?php esc_attr_e('Primeira página', 'clx-colecionaveis'); ?>">«</button>
            <button type="button" class="clx-page-btn" data-clx-page="<?php echo esc_attr(max(1, $current_page - 1)); ?>" <?php disabled($current_page <= 1); ?>><?php esc_html_e('Anterior', 'clx-colecionaveis'); ?></button>
            <?php for ($page = $start; $page <= $end; $page++) : ?>
                <button type="button" class="clx-page-btn <?php echo $page === $current_page ? 'is-active' : ''; ?>" data-clx-page="<?php echo esc_attr($page); ?>"><?php echo esc_html($page); ?></button>
            <?php endfor; ?>
            <button type="button" class="clx-page-btn" data-clx-page="<?php echo esc_attr(min($max_pages, $current_page + 1)); ?>" <?php disabled($current_page >= $max_pages); ?>><?php esc_html_e('Próxima', 'clx-colecionaveis'); ?></button>
            <button type="button" class="clx-page-btn" data-clx-page="<?php echo esc_attr($max_pages); ?>" <?php disabled($current_page >= $max_pages); ?> aria-label="<?php esc_attr_e('Última página', 'clx-colecionaveis'); ?>">»</button>
            <?php if ($current_page < $max_pages) : ?>
                <button type="button" class="clx-page-btn clx-load-more" data-clx-load-more data-next-page="<?php echo esc_attr($current_page + 1); ?>"><?php esc_html_e('Carregar mais', 'clx-colecionaveis'); ?></button>
            <?php endif; ?>
        </nav>
        <?php
        return (string) ob_get_clean();
    }

    private function resolve_badge(WC_Product $product): array {
        if ($product->is_on_sale()) {
            return ['label' => __('PROMO', 'clx-colecionaveis'), 'class' => 'promo'];
        }

        $published = strtotime((string) get_post_field('post_date', $product->get_id()));
        if ($published && (time() - $published) <= 30 * DAY_IN_SECONDS) {
            return ['label' => __('NOVIDADE', 'clx-colecionaveis'), 'class' => 'new'];
        }

        if (has_term('oficial', 'product_cat', $product->get_id()) || has_term('oficial', 'product_tag', $product->get_id())) {
            return ['label' => __('OFICIAL', 'clx-colecionaveis'), 'class' => 'official'];
        }

        return ['label' => '', 'class' => ''];
    }

    public function ajax_filter(): void {
        check_ajax_referer(self::NONCE_ACTION, 'nonce');

        $filters = $this->collect_filters($_POST);
        $query_data = $this->get_products($filters);

        wp_send_json_success([
            'count' => (int) $query_data['found_posts'],
            'html' => $this->render_grid($query_data['products'], $query_data['max_num_pages'], $filters['paged']),
            'activeFilters' => $this->render_active_filters($filters),
        ]);
    }
}

new CLX_Colecionaveis();
