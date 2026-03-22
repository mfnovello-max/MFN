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

  const closeDrawer = () => {
    sidebar?.classList.remove('is-open');
    overlay?.classList.remove('is-open');
    document.body.style.overflow = '';
  };

  const openDrawer = () => {
    sidebar?.classList.add('is-open');
    overlay?.classList.add('is-open');
    document.body.style.overflow = 'hidden';
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

  const scrollToResults = () => {
    results?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

    const loadMore = event.target.closest('[data-clx-load-more]');
    if (loadMore) {
      event.preventDefault();
      form.querySelector('[data-clx-paged]').value = loadMore.dataset.nextPage || '1';
      fetchProducts({ append: true, pushState: true, scroll: false });
    }
  });

  resetBtn?.addEventListener('click', () => {
    form.reset();
    form.querySelector('[data-clx-paged]').value = '1';
    syncPillsState();
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
