// Carrega canais do canais.json e lista no canais.html
// Suporte ao novo formato {categories, channels} e ao formato antigo (array)
fetch('canais.json')
  .then(res => res.json())
  .then(data => {
    const isNew = !Array.isArray(data);
    const canais = isNew ? data.channels : data;
    const categories = isNew ? (data.categories || []) : [];

    const grid = document.getElementById('canais-grid');
    const filterBar = document.getElementById('filter-bar');
    const searchInput = document.getElementById('search-canais');
    const resultsSummary = document.getElementById('results-summary');
    const channelCount = document.getElementById('channel-count');
    const categoryCount = document.getElementById('category-count');
    if (!grid) return;

    let activeCategory = 0; // 0 = Todos
    let searchQuery = '';

    if (channelCount) {
      channelCount.textContent = `${canais.length}+`;
    }

    if (categoryCount && categories.length) {
      categoryCount.textContent = `${Math.max(categories.length - 1, 1)}`;
    }

    // Renderiza botões de categoria
    if (filterBar && categories.length) {
      filterBar.innerHTML = '';
      categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn' + (cat.id === 0 ? ' active' : '');
        btn.textContent = cat.name;
        btn.dataset.catId = cat.id;
        btn.addEventListener('click', () => {
          document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          activeCategory = cat.id;
          renderGrid();
        });
        filterBar.appendChild(btn);
      });
    }

    function getSlug(canal) {
      return canal.id || canal.slug;
    }

    function getLogo(canal) {
      return canal.image || canal.logo;
    }

    function getNome(canal) {
      return canal.name || canal.nome;
    }

    function getCategoryNames(canal) {
      return (canal.categories || [])
        .map(catId => categories.find(cat => cat.id === catId)?.name || '')
        .filter(Boolean);
    }

    function updateSummary(total, visible) {
      if (!resultsSummary) return;

      if (!searchQuery && activeCategory === 0) {
        resultsSummary.textContent = `${visible} canais disponíveis no catálogo principal.`;
        return;
      }

      const activeLabel = categories.find(cat => cat.id === activeCategory)?.name || 'Todos';
      const searchLabel = searchQuery ? ` para "${searchQuery}"` : '';
      resultsSummary.textContent = `${visible} de ${total} canais exibidos em ${activeLabel}${searchLabel}.`;
    }

    function renderGrid() {
      grid.innerHTML = '';
      const filtered = canais.filter(canal => {
        const categoryMatch = activeCategory === 0 || (canal.categories || []).includes(activeCategory);
        const name = getNome(canal).toLowerCase();
        const categoryText = getCategoryNames(canal).join(' ').toLowerCase();
        const searchMatch = !searchQuery || name.includes(searchQuery) || categoryText.includes(searchQuery);
        return categoryMatch && searchMatch;
      });

      updateSummary(canais.length, filtered.length);

      if (filtered.length === 0) {
        grid.innerHTML = '<p class="empty-state" role="status">Nenhum canal encontrado com esse filtro. Tente outro nome ou categoria.</p>';
        grid.setAttribute('aria-busy', 'false');
        return;
      }

      filtered.forEach(canal => {
        const slug = getSlug(canal);
        const logo = getLogo(canal);
        const nome = getNome(canal);
        const categoryNames = getCategoryNames(canal);

        const a = document.createElement('a');
        a.className = 'channel-card';
        a.href = `canais/${slug}.html`;
        a.setAttribute('aria-label', `Abrir canal ${nome}`);
        a.innerHTML = `
          <span class="channel-card-glow" aria-hidden="true"></span>
          <img class="channel-logo" src="${logo}" alt="Logo do canal ${nome}" loading="lazy">
          <h3>${nome}</h3>
          <p>${categoryNames.slice(0, 2).join(' • ') || 'Canal ao vivo'}</p>
        `;
        grid.appendChild(a);
      });

      grid.setAttribute('aria-busy', 'false');
    }

    if (searchInput) {
      let debounceTimer;
      searchInput.addEventListener('input', event => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          searchQuery = event.target.value.toLowerCase().trim();
          renderGrid();
        }, 120);
      });
    }

    renderGrid();
  })
  .catch(() => {
    const grid = document.getElementById('canais-grid');
    const resultsSummary = document.getElementById('results-summary');
    if (resultsSummary) {
      resultsSummary.textContent = 'Nao foi possivel carregar o catalogo agora.';
    }
    if (grid) {
      grid.setAttribute('aria-busy', 'false');
      grid.innerHTML = '<p class="empty-state" role="status">Ocorreu um erro ao carregar os canais. Tente atualizar a pagina.</p>';
    }
  });

