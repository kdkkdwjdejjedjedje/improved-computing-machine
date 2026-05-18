// Carrega canais do canais.json e lista no canais.html por categorias
fetch('canais.json')
  .then(res => res.json())
  .then(data => {
    const isNew = !Array.isArray(data);
    const canais = isNew ? data.channels : data;
    const categories = isNew ? (data.categories || []) : [];

    const mainContainer = document.getElementById('canais-grid');
    const searchInput = document.getElementById('search-canais');
    const resultsSummary = document.getElementById('results-summary');
    
    if (!mainContainer) return;

    let searchQuery = '';

    // Remove results summary if it exists as per user request
    if (resultsSummary) {
      resultsSummary.style.display = 'none';
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

    function buildCardHtml(canal) {
      const slug = getSlug(canal);
      const logo = getLogo(canal);
      const nome = getNome(canal);
      const categoryNames = getCategoryNames(canal);

      return `
        <a class="channel-card" href="canais/${slug}.html" aria-label="Abrir canal ${nome}">
          <span class="channel-card-glow" aria-hidden="true"></span>
          <img class="channel-logo" src="${logo}" alt="Logo do canal ${nome}" loading="lazy">
          <h3>${nome}</h3>
          <p>${categoryNames.slice(0, 2).join(' • ') || 'Canal ao vivo'}</p>
        </a>
      `;
    }

    function renderContent() {
      mainContainer.innerHTML = '';
      mainContainer.setAttribute('aria-busy', 'true');

      if (searchQuery) {
        // Render search results in a single section
        const filtered = canais.filter(canal => {
          const name = getNome(canal).toLowerCase();
          const categoryText = getCategoryNames(canal).join(' ').toLowerCase();
          return name.includes(searchQuery) || categoryText.includes(searchQuery);
        });

        const searchSection = document.createElement('div');
        searchSection.className = 'category-section';
        
        if (filtered.length === 0) {
          searchSection.innerHTML = `
            <div class="category-header"><h2>Nenhum resultado para "${searchQuery}"</h2></div>
            <p class="empty-state">Tente outro nome ou categoria.</p>
          `;
        } else {
          searchSection.innerHTML = `
            <div class="category-header"><h2>Resultados para "${searchQuery}"</h2></div>
            <div class="grid">${filtered.map(c => buildCardHtml(c)).join('')}</div>
          `;
        }
        mainContainer.appendChild(searchSection);
      } else {
        // Render categorized sections
        // Sort categories to show specific ones first if needed, e.g. Esportes
        const sortedCategories = [...categories].sort((a, b) => {
          if (a.id === 0) return 1; // "Todos" goes to end if we ever use it
          if (a.name.toLowerCase().includes('esporte')) return -1;
          if (b.name.toLowerCase().includes('esporte')) return 1;
          return 0;
        });

        sortedCategories.forEach(cat => {
          if (cat.id === 0) return; // Skip "Todos" section

          const catChannels = canais.filter(c => (c.categories || []).includes(cat.id));
          if (catChannels.length === 0) return;

          const section = document.createElement('div');
          section.className = 'category-section';
          section.innerHTML = `
            <div class="category-header">
              <span class="category-dot"></span>
              <h2>${cat.name}</h2>
            </div>
            <div class="grid">
              ${catChannels.map(c => buildCardHtml(c)).join('')}
            </div>
          `;
          mainContainer.appendChild(section);
        });
      }
      mainContainer.setAttribute('aria-busy', 'false');
    }

    if (searchInput) {
      let debounceTimer;
      searchInput.addEventListener('input', event => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          searchQuery = event.target.value.toLowerCase().trim();
          renderContent();
        }, 120);
      });
    }

    // --- CAROUSEL LOGIC ---
    function initCarousel(dataCanais) {
      const track = document.getElementById('featured-carousel-track');
      if (!track) return;

      let featuredChannels = dataCanais.filter(c => c.destaque === true);
      
      // Fallback
      if (featuredChannels.length < 4) {
        const autoFeaturedIds = ['espn', 'sportv', 'premiere', 'globo', 'caze', 'hbo', 'ufc'];
        featuredChannels = dataCanais.filter(c =>
          autoFeaturedIds.some(id => (getSlug(c) || '').includes(id) || (getNome(c) || '').toLowerCase().includes(id))
        ).slice(0, 14);
      } else {
        featuredChannels = featuredChannels.slice(0, 20); // More items for a richer carousel
      }

      track.innerHTML = featuredChannels.map(canal => {
        const logo = getLogo(canal);
        const name = getNome(canal);
        const slug = getSlug(canal);
        return `
          <a class="carousel-item" href="canais/${slug}.html" title="${name}">
            <div class="carousel-item-img">
              <img src="${logo}" alt="${name}" loading="lazy">
            </div>
            <span class="carousel-item-name">${name}</span>
          </a>
        `;
      }).join('');

      // Auto-centering scroll if needed or just handle nav buttons
      const prevBtn = document.querySelector('.carousel-nav.prev');
      const nextBtn = document.querySelector('.carousel-nav.next');
      if (prevBtn && nextBtn) {
        prevBtn.onclick = () => track.scrollBy({ left: -400, behavior: 'smooth' });
        nextBtn.onclick = () => track.scrollBy({ left: 400, behavior: 'smooth' });
      }
    }

    initCarousel(canais);
    renderContent();
  })
  .catch(err => {
    console.error('Error:', err);
  });
