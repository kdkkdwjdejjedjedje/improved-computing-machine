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
    if (!grid) return;

    let activeCategory = 0; // 0 = Todos

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

    function renderGrid() {
      grid.innerHTML = '';
      const filtered = canais.filter(canal => {
        if (activeCategory === 0) return true;
        return (canal.categories || []).includes(activeCategory);
      });

      if (filtered.length === 0) {
        grid.innerHTML = '<p style="color:#aaa;text-align:center;padding:40px;grid-column:1/-1;">Nenhum canal encontrado nesta categoria.</p>';
        return;
      }

      filtered.forEach(canal => {
        const slug = getSlug(canal);
        const logo = getLogo(canal);
        const nome = getNome(canal);

        const a = document.createElement('a');
        a.className = 'channel-card';
        a.href = `canais/${slug}.html`;
        a.innerHTML = `
          <img class="channel-logo" src="${logo}" alt="${nome} logo">
          <h3>${nome}</h3>
        `;
        grid.appendChild(a);
      });
    }

    renderGrid();
  });

