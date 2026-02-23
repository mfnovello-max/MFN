(() => {
  const root = document.querySelector('#clx-page-colecionaveis[data-clx-root]');
  if (!root || typeof CLXColecionaveis === 'undefined') return;

  const form = root.querySelector('[data-clx-form]');
  const gridWrap = root.querySelector('[data-clx-grid]');
  const countNode = root.querySelector('[data-clx-count]');
  const resetBtn = root.querySelector('[data-clx-reset]');
  const activeFilters = root.querySelector('[data-clx-active-filters]');
  const results = root.querySelector('[data-clx-results]');
  const sidebar = root.querySelector('[data-clx-sidebar]');
  const overlay = root.querySelector('[data-clx-overlay]');

  if (!form || !gridWrap) return;

  let __clxBodyLockY = 0;

  const lockBodyForDrawer = () => {
    __clxBodyLockY = window.scrollY || window.pageYOffset || 0;
    document.documentElement.classList.add('clx-drawer-open');
    document.body.classList.add('clx-drawer-open');
    document.body.style.position = 'fixed';
    document.body.style.top = `-${__clxBodyLockY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
  };

  const unlockBodyForDrawer = () => {
    if (document.body.style.position !== 'fixed' && !document.body.classList.contains('clx-drawer-open')) return;
    const y = Math.abs(parseInt(document.body.style.top || '0', 10)) || __clxBodyLockY || 0;
    document.documentElement.classList.remove('clx-drawer-open');
    document.body.classList.remove('clx-drawer-open');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    window.scrollTo(0, y);
  };

  const closeDrawer = () => {
    sidebar?.classList.remove('is-open');
    overlay?.classList.remove('is-open');
    unlockBodyForDrawer();
  };

  const openDrawer = () => {
    sidebar?.classList.add('is-open');
    overlay?.classList.add('is-open');
  };

  const toQueryString = (data) => {
    const params = new URLSearchParams();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined && key !== 'action' && key !== 'nonce') {
        params.set(key, value);
      }
    });
    return params.toString();
  };

  const syncFormFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    [...form.elements].forEach((el) => {
      if (!el.name) return;
      el.value = params.get(el.name) || (el.name === 'orderby' ? 'date' : (el.name === 'paged' ? '1' : ''));
    });
    syncPillsState();
  };

  const getFormData = () => {
    const data = Object.fromEntries(new FormData(form).entries());
    data.action = 'clx_colecionaveis_filter';
    data.nonce = CLXColecionaveis.nonce;
    return data;
  };

  const setLoading = (state) => {
    gridWrap.classList.toggle('is-loading', state);
    if (state) gridWrap.setAttribute('aria-busy', 'true');
    else gridWrap.removeAttribute('aria-busy');
  };

  const updateBrowserUrl = (payload, push = true) => {
    const qs = toQueryString(payload);
    const url = `${window.location.pathname}${qs ? `?${qs}` : ''}`;
    window.history[push ? 'pushState' : 'replaceState']({}, '', url);
  };

  const getHeaderHeightForScroll = () => {
    const selectors = [
      '#hfe-header',
      'header.hfe-header',
      '.hfe-site-header',
      '.elementor-location-header',
      'header#masthead',
      'header.elementor-sticky--effects',
      '.elementor-sticky--effects'
    ];
    let best = 0;
    for (const sel of selectors) {
      document.querySelectorAll(sel).forEach((el) => {
        const r = el.getBoundingClientRect();
        if (!r.height) return;
        const style = getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return;
        if (r.bottom <= 0) return;
        best = Math.max(best, r.height);
      });
    }
    return best;
  };

  const getStickyTop = () => {
    const v = getComputedStyle(root).getPropertyValue('--clx-sticky-top').trim();
    const n = parseFloat(v);
    if (!Number.isFinite(n)) {
      const h = getHeaderHeightForScroll();
      return (h || 0) + 20;
    }
    return n;
  };

  const scrollToResults = () => {
    if (!results) return;

    const readCssVarNum = (el, name) => {
      if (!el) return 0;
      const v = getComputedStyle(el).getPropertyValue(name).trim();
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : 0;
    };

    const getLiveHeaderOffset = () => {
      const html = document.documentElement;
      const body = document.body;
      // 1) variáveis globais do header inteligente (quando existirem)
      const htmlContentOffset = readCssVarNum(html, '--content-offset');
      const htmlHeader = readCssVarNum(html, '--header-h');
      const htmlTicker = readCssVarNum(html, '--ticker-h');
      const bodyPadTop = body ? parseFloat(getComputedStyle(body).paddingTop) || 0 : 0;

      // 2) header DOM visível (HFE/Elementor)
      const domHeader = getHeaderHeightForScroll();

      // usa o maior valor útil e adiciona pequena margem de segurança
      const base = Math.max(domHeader || 0, htmlContentOffset || 0, (htmlHeader + htmlTicker) || 0, bodyPadTop || 0, getStickyTop() || 0);
      return Math.max(20, Math.round(base + 10));
    };

    const perform = () => {
      const topOffset = getLiveHeaderOffset();
      const gapExtra = parseFloat(getComputedStyle(root).getPropertyValue('--clx-top-gap-extra')) || 60;
      const y = (window.scrollY || window.pageYOffset) + results.getBoundingClientRect().top - topOffset - 8;
      window.scrollTo({ top: Math.max(0, Math.round(y)), behavior: 'auto' });

      // segunda passada: corrige header inteligente quando ele reaparece com fade/transição
      window.setTimeout(() => {
        const topOffset2 = getLiveHeaderOffset();
        const y2 = (window.scrollY || window.pageYOffset) + results.getBoundingClientRect().top - topOffset2 - 8;
        const delta = y2 - (window.scrollY || window.pageYOffset);
        if (Math.abs(delta) > 2) {
          window.scrollTo({ top: Math.max(0, Math.round(y2)), behavior: 'auto' });
        }
      }, 120);
    };

    // espera layout assentar após AJAX/reflow antes de calcular
    requestAnimationFrame(() => requestAnimationFrame(perform));
  };

  const syncPillsState = () => {
    root.querySelectorAll('[data-clx-pills]').forEach((group) => {
      const target = group.dataset.target;
      const input = form.querySelector(`input[name="${target}"]`);
      if (!input) return;
      group.querySelectorAll('[data-clx-pill]').forEach((pill) => {
        const isActive = pill.dataset.clxPill === input.value;
        pill.classList.toggle('is-active', isActive);
        pill.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
    });
  };

  const clearAllFilters = () => {
    [...form.elements].forEach((el) => {
      if (!el.name) return;
      if (el.name === 'paged') { el.value = '1'; return; }
      if (el.name === 'orderby') { el.value = 'date'; return; }
      if (el.type === 'button' || el.type === 'submit') return;
      el.value = '';
    });
    syncPillsState();
  };

  const applyResponse = (response, append = false) => {
    if (!response?.success) throw new Error(CLXColecionaveis.strings.error);

    if (append) {
      const tmp = document.createElement('div');
      tmp.innerHTML = response.data.html;
      const cards = tmp.querySelectorAll('.clx-card');
      const grid = gridWrap.querySelector('.clx-grid');
      cards.forEach((card) => grid?.appendChild(card));
      const existingPagination = gridWrap.querySelector('[data-clx-pagination]');
      const nextPagination = tmp.querySelector('[data-clx-pagination]');
      existingPagination?.remove();
      if (nextPagination) gridWrap.appendChild(nextPagination);
    } else {
      gridWrap.innerHTML = response.data.html;
    }

    if (countNode) {
      const count = Number(response.data.count || 0);
      const label = count === 1 ? CLXColecionaveis.strings.productFound : CLXColecionaveis.strings.productsFound;
      countNode.textContent = `${count} ${label}`;
    }
    if (activeFilters) activeFilters.innerHTML = response.data.activeFilters || '';

    // Após atualizar DOM (chips/paginação), refresca o sticky (evita regressão/tremor pós-filtro)
    window.CLXStickyColecionaveisSticky?.refresh?.('ajax');
  };

  const fetchProducts = async ({ append = false, pushState = true, scroll = true } = {}) => {
    const data = getFormData();
    updateBrowserUrl(data, pushState);
    setLoading(true);

    try {
      const res = await fetch(CLXColecionaveis.ajaxUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
        body: new URLSearchParams(data),
      });
      const json = await res.json();
      applyResponse(json, append);
      if (scroll) scrollToResults();
      closeDrawer();
    } catch (error) {
      gridWrap.innerHTML = `<p class="clx-empty">${error.message || CLXColecionaveis.strings.error}</p>`;
    } finally {
      setLoading(false);
    }
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    form.querySelector('[data-clx-paged]').value = '1';
    fetchProducts({ append: false, pushState: true, scroll: true });
  });

  form.addEventListener('change', () => {
    form.querySelector('[data-clx-paged]').value = '1';
    syncPillsState();
    fetchProducts({ append: false, pushState: true, scroll: true });
  });

  root.addEventListener('click', (event) => {
    const pill = event.target.closest('[data-clx-pill]');
    if (pill) {
      const group = pill.closest('[data-clx-pills]');
      if (!group) return;
      const target = group.dataset.target;
      const input = form.querySelector(`input[name="${target}"]`);
      if (!input) return;

      event.preventDefault();
      input.value = input.value === pill.dataset.clxPill ? '' : pill.dataset.clxPill;
      form.querySelector('[data-clx-paged]').value = '1';
      syncPillsState();
      fetchProducts({ append: false, pushState: true, scroll: true });
      return;
    }

    const pageBtn = event.target.closest('[data-clx-page]');
    if (pageBtn) {
      event.preventDefault();
      form.querySelector('[data-clx-paged]').value = pageBtn.dataset.clxPage || '1';
      fetchProducts({ append: false, pushState: true, scroll: true });
      return;
    }

    // Chips ativos: remover filtro específico
    const chipRemove = event.target.closest('[data-clx-remove]');
    if (chipRemove) {
      event.preventDefault();
      const key = chipRemove.dataset.clxRemove;
      if (key === 'price') {
        const min = form.querySelector('input[name="min_price"]');
        const max = form.querySelector('input[name="max_price"]');
        if (min) min.value = '';
        if (max) max.value = '';
      } else {
        const field = form.querySelector(`[name="${CSS.escape(key)}"]`);
        if (field) field.value = '';
      }

      form.querySelector('[data-clx-paged]').value = '1';
      syncPillsState();
      fetchProducts({ append: false, pushState: true, scroll: true });
      return;
    }

    // Chip "Limpar filtros": mesmo comportamento do botão limpar
    const chipClear = event.target.closest('[data-clx-clear-filters]');
    if (chipClear) {
      event.preventDefault();
      clearAllFilters();
      fetchProducts({ append: false, pushState: true, scroll: true });
      return;
    }

    const loadMore = event.target.closest('[data-clx-load-more]');
    if (loadMore) {
      event.preventDefault();
      form.querySelector('[data-clx-paged]').value = loadMore.dataset.nextPage || '1';
      fetchProducts({ append: true, pushState: true, scroll: false });
    }
  });

  resetBtn?.addEventListener('click', () => {
    clearAllFilters();
    fetchProducts({ append: false, pushState: true, scroll: true });
  });

  root.querySelector('[data-clx-open-drawer]')?.addEventListener('click', openDrawer);
  root.querySelector('[data-clx-close-drawer]')?.addEventListener('click', closeDrawer);
  overlay?.addEventListener('click', closeDrawer);

  window.addEventListener('popstate', () => {
    syncFormFromUrl();
    fetchProducts({ append: false, pushState: false, scroll: false });
  });

  syncPillsState();
})();

/* ============================================================
   CLX Sticky Sidebar Fix (Elementor-safe, native sticky only)
   - offset automático (HFE/Elementor)
   - sem fallback JS no desktop (evita tremedeira pós-AJAX)
   ============================================================ */
(() => {
  const root = document.querySelector('#clx-page-colecionaveis[data-clx-root]');
  if (!root) return;

  if (window.CLXStickyColecionaveisSticky?.destroy) {
    window.CLXStickyColecionaveisSticky.destroy();
  }

  const mq = window.matchMedia('(min-width: 901px)');
  const sidebar = root.querySelector('[data-clx-sidebar]');
  if (!sidebar) return;

  let raf = 0;
  let resizeRaf = 0;

  const setVar = (px) => root.style.setProperty('--clx-sticky-top', `${Math.max(0, Math.round(px))}px`);

  const getHeaderHeight = () => {
    const selectors = [
      '#hfe-header',
      'header.hfe-header',
      '.hfe-site-header',
      '.elementor-location-header',
      'header#masthead',
      'header.elementor-sticky--effects',
      '.elementor-sticky--effects'
    ];

    let best = 0;
    for (const sel of selectors) {
      document.querySelectorAll(sel).forEach((el) => {
        const r = el.getBoundingClientRect();
        if (!r.height) return;
        const style = getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return;
        if (r.bottom <= 0) return;
        best = Math.max(best, r.height);
      });
    }
    return best;
  };

  const patchAncestorsIfNeeded = () => {
    let el = root.parentElement;
    let steps = 0;
    while (el && steps < 6) {
      const cs = getComputedStyle(el);
      const cn = (el.className || '').toString();
      const looksLikeElementor = cn.includes('elementor') || el.classList.contains('elementor-element') || el.classList.contains('elementor-widget-container');
      if (looksLikeElementor) {
        const bad = ['hidden','auto','scroll','clip'];
        if (bad.includes(cs.overflow) || bad.includes(cs.overflowX) || bad.includes(cs.overflowY)) {
          el.style.overflow = 'visible';
          el.style.overflowX = 'visible';
          el.style.overflowY = 'visible';
        }
        if (cs.transform && cs.transform !== 'none') {
          el.style.transform = 'none';
        }
        if (cs.contain && cs.contain !== 'none') {
          el.style.contain = 'none';
        }
      }
      el = el.parentElement;
      steps += 1;
    }
  };

  const updateTop = () => {
    const h = getHeaderHeight();
    setVar((h || 0) + 20);
  };

  const clearInline = () => {
    sidebar.style.transform = '';
    sidebar.style.position = '';
    sidebar.style.top = '';
    sidebar.style.left = '';
    sidebar.style.right = '';
    sidebar.style.willChange = '';
  };

  const refresh = () => {
    patchAncestorsIfNeeded();
    updateTop();
    clearInline();
    // revalida após reflow do AJAX / paginação / filtros ativos
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      patchAncestorsIfNeeded();
      updateTop();
      clearInline();
    });
    setTimeout(() => {
      try {
        patchAncestorsIfNeeded();
        updateTop();
        clearInline();
      } catch(e) {}
    }, 120);
    setTimeout(() => {
      try {
        patchAncestorsIfNeeded();
        updateTop();
        clearInline();
      } catch(e) {}
    }, 320);
  };

  const onScroll = () => {
    if (!mq.matches) return;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(updateTop);
  };

  const onResize = () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(refresh);
  };

  refresh();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });

  window.CLXStickyColecionaveisSticky = {
    refresh,
    destroy(){
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(raf);
      cancelAnimationFrame(resizeRaf);
      clearInline();
      delete window.CLXStickyColecionaveisSticky;
    }
  };
})();



/* ============================================================
   CLX Header-aware top gap guard (post-AJAX / smart header)
   - atualiza --clx-sticky-top usando vars do html/body quando existirem
   ============================================================ */
(() => {
  const root = document.querySelector('#clx-page-colecionaveis[data-clx-root]');
  if (!root) return;

  const readNum = (el, name) => {
    if (!el) return 0;
    const v = getComputedStyle(el).getPropertyValue(name).trim();
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };

  const compute = () => {
    const html = document.documentElement;
    const body = document.body;
    const contentOffset = readNum(html, '--content-offset');
    const headerH = readNum(html, '--header-h');
    const tickerH = readNum(html, '--ticker-h');
    const bodyPad = body ? (parseFloat(getComputedStyle(body).paddingTop) || 0) : 0;

    let domHeader = 0;
    ['#hfe-header','header.hfe-header','.hfe-site-header','.elementor-location-header','header#masthead','header.elementor-sticky--effects','.elementor-sticky--effects']
      .forEach((sel) => {
        document.querySelectorAll(sel).forEach((el) => {
          const r = el.getBoundingClientRect();
          if (!r.height) return;
          const st = getComputedStyle(el);
          if (st.display === 'none' || st.visibility === 'hidden') return;
          if (r.bottom <= 0) return;
          domHeader = Math.max(domHeader, r.height);
        });
      });

    const top = Math.max(contentOffset, headerH + tickerH, bodyPad, domHeader, 20);
    root.style.setProperty('--clx-sticky-top', `${Math.round(top)}px`);
  };

  let raf = 0;
  const queue = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(compute);
  };

  compute();
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue, { passive: true });
  document.addEventListener('click', (e) => {
    if (e.target.closest('#clx-page-colecionaveis [data-clx-form], #clx-page-colecionaveis [data-clx-reset], #clx-page-colecionaveis [data-clx-pill], #clx-page-colecionaveis [data-clx-page], #clx-page-colecionaveis [data-clx-load-more]')) {
      queue();
      setTimeout(queue, 80);
      setTimeout(queue, 180);
    }
  }, true);
})();
