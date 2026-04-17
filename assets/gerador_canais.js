// Node.js script para gerar páginas dos canais e sitemap.xml
// Compatível com o novo formato canais.json (embedtv.best)
const fs = require('fs');
const path = require('path');

const dominio = 'https://piratetv.cfd';
const dataAtual = '2026-03-13';
const data = require('../canais.json');

// Suporte aos dois formatos: array antigo e novo objeto {categories, channels}
const canais = Array.isArray(data) ? data : data.channels;
const categories = Array.isArray(data) ? [] : (data.categories || []);

// Monta mapa de id->nome das categorias para uso nas páginas
const categoryMap = {};
categories.forEach(c => { categoryMap[c.id] = c.name; });

const sitemap = [];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getRelatedChannels(currentCanal, currentCats, allChannels) {
  const currentId = currentCanal.id || currentCanal.slug;
  const currentCategorySet = new Set((currentCanal.categories || []).filter(cid => cid !== 0));

  const scored = allChannels
    .filter(item => (item.id || item.slug) !== currentId)
    .map(item => {
      const itemCategories = (item.categories || []).filter(cid => cid !== 0);
      const sharedCount = itemCategories.filter(cid => currentCategorySet.has(cid)).length;
      return { item, sharedCount };
    })
    .sort((a, b) => {
      if (b.sharedCount !== a.sharedCount) return b.sharedCount - a.sharedCount;
      return (a.item.name || a.item.nome).localeCompare(b.item.name || b.item.nome, 'pt-BR');
    });

  const preferred = scored.filter(entry => entry.sharedCount > 0).slice(0, 8);
  const fallback = scored.filter(entry => entry.sharedCount === 0).slice(0, Math.max(0, 8 - preferred.length));
  const finalList = [...preferred, ...fallback].slice(0, 8);

  return finalList.map(({ item }) => {
    const relatedId = item.id || item.slug;
    const relatedName = item.name || item.nome;
    const relatedLogo = item.image || item.logo;
    const relatedCats = (item.categories || [])
      .filter(cid => cid !== 0)
      .map(cid => categoryMap[cid] || '')
      .filter(Boolean)
      .slice(0, 2);

    return {
      id: relatedId,
      name: relatedName,
      logo: relatedLogo,
      categories: relatedCats.length ? relatedCats.join(' • ') : (currentCats[0] || 'Canal ao vivo')
    };
  });
}

// Garante que a pasta canais/ existe
const canaisDir = path.join(__dirname, '../canais');
if (!fs.existsSync(canaisDir)) {
  fs.mkdirSync(canaisDir, { recursive: true });
}

// Adiciona páginas principais ao sitemap
sitemap.push({ loc: `${dominio}/`, priority: '1.0', changefreq: 'daily' });
sitemap.push({ loc: `${dominio}/canais`, priority: '0.9', changefreq: 'daily' });
sitemap.push({ loc: `${dominio}/bbb`, priority: '0.9', changefreq: 'hourly' });

// Adiciona páginas do blog ao sitemap
sitemap.push({ loc: `${dominio}/blog`, priority: '0.7', changefreq: 'weekly' });
sitemap.push({ loc: `${dominio}/blog/como-assistir-tv-online-gratis`, priority: '0.7', changefreq: 'weekly' });
sitemap.push({ loc: `${dominio}/blog/como-assistir-futebol-ao-vivo-gratis`, priority: '0.7', changefreq: 'weekly' });
sitemap.push({ loc: `${dominio}/blog/como-assistir-bbb-26-ao-vivo`, priority: '0.7', changefreq: 'weekly' });
sitemap.push({ loc: `${dominio}/blog/espn-ao-vivo-gratis`, priority: '0.7', changefreq: 'weekly' });
sitemap.push({ loc: `${dominio}/blog/sportv-ao-vivo-gratis`, priority: '0.7', changefreq: 'weekly' });
sitemap.push({ loc: `${dominio}/blog/premiere-ao-vivo-gratis`, priority: '0.7', changefreq: 'weekly' });

canais.forEach(canal => {
  // Suporte aos dois formatos de campos
  const id = canal.id || canal.slug;
  const nome = canal.name || canal.nome;
  const logo = canal.image || canal.logo;
  const stream = canal.url || canal.stream;
  const cats = (canal.categories || [])
    .filter(cid => cid !== 0)
    .map(cid => categoryMap[cid] || '')
    .filter(Boolean);

  const catsLabel = cats.length ? cats.join(', ') : '';
  const catsBadges = cats.map(c => `<span class="badge">${c}</span>`).join('');

  // Gera keywords específicas com base nas categorias
  const catKeywords = cats.length
    ? cats.map(c => `${nome} ${c.toLowerCase()}`).join(', ') + ', '
    : '';

  // Gera descrição contextualizada por categoria
  const isEsportes = cats.some(c => c.toLowerCase().includes('esporte') || c.toLowerCase().includes('sport'));
  const isInfantil = cats.some(c => c.toLowerCase().includes('infantil') || c.toLowerCase().includes('kids'));
  const isNoticias = cats.some(c => c.toLowerCase().includes('noticia') || c.toLowerCase().includes('news'));
  const isFilmes = cats.some(c => c.toLowerCase().includes('filme') || c.toLowerCase().includes('series') || c.toLowerCase().includes('séries'));
  const isBBB = cats.some(c => c.toLowerCase().includes('bbb'));
  const relatedChannels = getRelatedChannels(canal, cats, canais);

  let descExtra = '';
  if (isBBB) descExtra = 'câmeras ao vivo 24h, ';
  else if (isEsportes) descExtra = 'futebol ao vivo, campeonatos, esportes, ';
  else if (isInfantil) descExtra = 'desenhos animados, séries infantis, ';
  else if (isNoticias) descExtra = 'notícias ao vivo, jornalismo, ';
  else if (isFilmes) descExtra = 'filmes, séries, entretenimento, ';

  const categoryLabel = catsLabel || 'TV online';
  const relatedCards = relatedChannels.map(related => `
          <a class='related-channel-card' href='/canais/${escapeHtml(related.id)}.html' aria-label='Abrir canal ${escapeHtml(related.name)}'>
            <img src='${escapeHtml(related.logo)}' alt='Logo do canal ${escapeHtml(related.name)}' loading='lazy' width='72' height='72'>
            <strong>${escapeHtml(related.name)}</strong>
            <span>${escapeHtml(related.categories)}</span>
          </a>`).join('');

  const html = `<!DOCTYPE html>
<html lang='pt-BR'>
<head>
  <meta charset='UTF-8'>
  <meta http-equiv='X-UA-Compatible' content='IE=edge'>
  <meta name='viewport' content='width=device-width, initial-scale=1.0'>

  <!-- ══ SEO PRIMARY ══ -->
  <title>Assistir ${nome} ao Vivo Grátis HD 2026 | Pirate TV — Pirate TV</title>
  <meta name='description' content='Assista ${nome} ao vivo grátis e em HD no Pirate TV. ${descExtra}sem cadastro, sem burocracia, 100% grátis. ${catsLabel ? 'Categoria: ' + catsLabel + '.' : ''} Acesse agora e aproveite a transmissão ao vivo!'>
  <meta name='keywords' content='${nome} ao vivo, assistir ${nome} grátis, ${nome} online, ${catKeywords}${nome} HD, ${nome} sem cadastro, Pirate TV, pirate tv online, pirate tv grátis, TV online grátis, Pirate TV, streaming grátis brasil, canais ao vivo 2026'>
  <meta name='author' content='Pirate TV'>
  <meta name='language' content='pt-BR'>
  <meta name='revisit-after' content='1 days'>
  <meta name='rating' content='general'>
  <meta name='theme-color' content='#0f0f1a'>
  <meta name='application-name' content='Pirate TV'>

  <!-- ══ GEO ══ -->
  <meta name='geo.region' content='BR'>
  <meta name='geo.placename' content='Brasil'>

  <!-- ══ ROBOTS ══ -->
  <meta name='robots' content='index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1'>

  <!-- ══ CANONICAL & HREFLANG ══ -->
  <link rel='canonical' href='${dominio}/canais/${id}.html'>
  <link rel='alternate' hreflang='pt-BR' href='${dominio}/canais/${id}.html'>
  <link rel='alternate' hreflang='x-default' href='${dominio}/canais/${id}.html'>

  <!-- ══ PERFORMANCE ══ -->
  <link rel='preconnect' href='https://embedtv.best' crossorigin>
  <link rel='dns-prefetch' href='https://acscdn.com'>
  <link rel='preload' href='../assets/style.css' as='style'>

  <!-- ══ FAVICON ══ -->
  <link rel='shortcut icon' href='../favicon.png' type='image/png'>
  <link rel='apple-touch-icon' href='../favicon.png'>

  <!-- ══ STYLESHEET ══ -->
  <link rel='stylesheet' href='../assets/style.css'>
  <link rel='stylesheet' href='../assets/channel-page.css'>

  <!-- ══ OPEN GRAPH ══ -->
  <meta property='og:type' content='website'>
  <meta property='og:site_name' content='Pirate TV'>
  <meta property='og:url' content='${dominio}/canais/${id}.html'>
  <meta property='og:title' content='Assistir ${nome} ao Vivo Grátis HD 2026 | Pirate TV'>
  <meta property='og:description' content='Assista ${nome} ao vivo grátis e em HD no Pirate TV. Sem cadastro, 100% grátis!'>
  <meta property='og:image' content='${logo}'>
  <meta property='og:image:alt' content='${nome} ao Vivo — Pirate TV'>
  <meta property='og:locale' content='pt_BR'>

  <!-- ══ TWITTER CARD ══ -->
  <meta name='twitter:card' content='summary_large_image'>
  <meta name='twitter:title' content='Assistir ${nome} ao Vivo Grátis HD 2026 | Pirate TV'>
  <meta name='twitter:description' content='Assista ${nome} ao vivo grátis e em HD no Pirate TV. Sem cadastro, 100% grátis!'>
  <meta name='twitter:image' content='${logo}'>
  <meta name='twitter:image:alt' content='${nome} ao Vivo — Pirate TV'>

  <!-- ══ SCHEMA.ORG ══ -->
  <script type='application/ld+json'>
  {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "${dominio}/canais/${id}.html#webpage",
        "url": "${dominio}/canais/${id}.html",
        "name": "Assistir ${nome} ao Vivo Grátis HD 2026 | Pirate TV",
        "description": "Assista ${nome} ao vivo grátis e em HD no Pirate TV. Sem cadastro, 100% grátis.",
        "isPartOf": {
          "@type": "WebSite",
          "@id": "${dominio}/#website",
          "name": "Pirate TV",
          "alternateName": "Pirate TV",
          "url": "${dominio}/"
        },
        "breadcrumb": { "@id": "${dominio}/canais/${id}.html#breadcrumb" },
        "inLanguage": "pt-BR",
        "dateModified": "${dataAtual}"
      },
      {
        "@type": "BreadcrumbList",
        "@id": "${dominio}/canais/${id}.html#breadcrumb",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Início", "item": "${dominio}/" },
          { "@type": "ListItem", "position": 2, "name": "Canais", "item": "${dominio}/canais" },
          { "@type": "ListItem", "position": 3, "name": "${nome}", "item": "${dominio}/canais/${id}.html" }
        ]
      },
      {
        "@type": "BroadcastService",
        "name": "${nome}",
        "description": "Assista ${nome} ao vivo grátis no Pirate TV. Transmissão contínua em HD.",
        "broadcastDisplayName": "${nome}",
        "inLanguage": "pt-BR",
        "broadcastTimezone": "America/Sao_Paulo",
        "logo": {
          "@type": "ImageObject",
          "url": "${logo}"
        },
        "potentialAction": {
          "@type": "WatchAction",
          "target": "${dominio}/canais/${id}.html"
        }
      }
    ]
  }
  </script>
  <style>
    .badge {
      display: inline-block;
      background: #1a1a2e;
      color: #e94560;
      border: 1px solid #e94560;
      border-radius: 4px;
      padding: 2px 10px;
      font-size: 0.78em;
      font-weight: 600;
      margin: 2px 3px;
      letter-spacing: 0.04em;
    }
    .badges-row { margin: 8px 0 12px 0; }
  </style>
  <!-- ADS -->
  <script type='text/javascript'>
    (function() {
      var s = document.createElement('script');
      s.src = '//acscdn.com/script/aclib.js';
      s.onload = function() { aclib.runPop({ zoneId: '10210234' }); };
      document.head.appendChild(s);
    })();
  </script>
  <script type='text/javascript' data-cfasync='false' async src='//rt.areekwiney.com/rAyJGmWtqhqQIJxZ9/137410'></script>
</head>
<body class='channel-page'>
  <header>
    <div class='header-inner'>
      <a href='/' class='header-logo-link'>
        <img src='../piratetv.png' alt='Pirate TV - TV Online Grátis' class='header-logo-img'>
      </a>
      <nav>
        <a href='/'>Início</a>
        <a href='/canais'>Canais</a>
      </nav>
    </div>
  </header>
  <div class='container'>
    <div class='card'>
      <div class='channel-breadcrumbs'>
        <a href='/'>Início</a>
        <span>/</span>
        <a href='/canais'>Canais</a>
        <span>/</span>
        <strong>${nome}</strong>
      </div>
      <img src='${logo}' alt='${nome} ao vivo — logo oficial' loading='lazy' width='120' height='120'>
      <h1>Assistir ${nome} ao Vivo Grátis</h1>
      ${catsBadges ? `<div class="badges-row">${catsBadges}</div>` : ''}
      <div class='channel-highlight-bar'>
        <div class='channel-highlight-item'>
          <span>Categoria</span>
          <strong>${categoryLabel}</strong>
        </div>
        <div class='channel-highlight-item'>
          <span>Acesso</span>
          <strong>Online agora</strong>
        </div>
        <div class='channel-highlight-item'>
          <span>Navegação</span>
          <strong>Links rápidos</strong>
        </div>
      </div>
      <p>
        Assista <strong>${nome}</strong> ao vivo e grátis no Pirate TV, sem precisar de cadastro ou pagamento. Transmissão ${descExtra ? descExtra.replace(/, $/, '') + ', ' : ''}em qualidade HD, disponível 24 horas por dia.<br><br>
        <strong>Por que assistir ${nome} no Pirate TV?</strong><br>
        — Transmissão estável em HD<br>
        — 100% grátis, sem cadastro<br>
        — Compatível com celular, tablet, PC e Smart TV<br>
        — Links sempre atualizados<br>
        — Sem instalação de aplicativos<br><br>
        <strong>Como assistir ${nome} online grátis?</strong><br>
        Clique no player abaixo e assista <strong>${nome} ao vivo</strong> agora mesmo, direto no navegador.<br><br>
        <em>Palavras-chave: ${nome} ao vivo, assistir ${nome} grátis, ${nome} online HD, Pirate TV, TV online grátis 2026${catsLabel ? ', ' + catsLabel.toLowerCase() : ''}.</em>
      </p>
      <div class='channel-player-wrap'>
        <iframe src='${stream}' width='100%' height='480' frameborder='0' allowfullscreen title='Assistir ${nome} ao vivo grátis — Pirate TV' loading='lazy'></iframe>
      </div>
      <div class='channel-actions'>
        <a href='/canais'>← Ver todos os canais ao vivo</a>
      </div>
      <section class='related-channels' aria-labelledby='related-title'>
        <div class='related-channels-head'>
          <div>
            <p class='related-kicker'>Mais opções para assistir</p>
            <h2 id='related-title'>Canais relacionados</h2>
          </div>
          <a href='/canais' class='related-all-link'>Abrir catálogo completo</a>
        </div>
        <div class='related-channels-grid'>
${relatedCards}
        </div>
      </section>
    </div>
  </div>
  <!-- Statcounter -->
  <script type='text/javascript'>
    var sc_project=13207183;
    var sc_invisible=1;
    var sc_security='3dbfd3a0';
  </script>
  <script type='text/javascript' src='https://www.statcounter.com/counter/counter.js' async></script>
  <noscript><div class='statcounter'><img class='statcounter' src='https://c.statcounter.com/13207183/0/3dbfd3a0/1/' alt='' referrerPolicy='no-referrer-when-downgrade' style='display:none'></div></noscript>
  <!-- End Statcounter -->
  <footer>
    <div class='footer-inner'>
      <div class='footer-top'>
        <div class='footer-brand'>
          <span class='footer-logo-text'>&#128324; Pirate<span>TV</span></span>
          <p class='footer-tagline'>Assista TV online gr&aacute;tis, sem cadastro e em HD. +100 canais ao vivo.</p>
        </div>
        <div class='footer-links'>
          <div class='footer-col'>
            <h4>Navega&ccedil;&atilde;o</h4>
            <a href='/'>In&iacute;cio</a>
            <a href='/canais'>Canais</a>
            <a href='/bbb'>BBB Ao Vivo</a>
          </div>
        </div>
      </div>

      <div class='footer-divider'></div>
      <div class='footer-bottom'>
        <a href='/'>Pirate TV</a> &copy; 2026 &mdash; Todos os direitos reservados.
      </div>
    </div>
  </footer>
</body>
</html>`;

  // Salva o HTML do canal
  const filePath = path.join(__dirname, '../canais', `${id}.html`);
  fs.writeFileSync(filePath, html, 'utf8');
  // Adiciona ao sitemap
  sitemap.push({ loc: `${dominio}/canais/${id}.html`, priority: '0.8', changefreq: 'daily' });
});

// Gera sitemap.xml com lastmod e changefreq
let sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
sitemap.forEach(item => {
  sitemapXml += `  <url>\n    <loc>${item.loc}</loc>\n    <lastmod>${dataAtual}</lastmod>\n    <changefreq>${item.changefreq}</changefreq>\n    <priority>${item.priority}</priority>\n  </url>\n`;
});
sitemapXml += `</urlset>\n`;
fs.writeFileSync(path.join(__dirname, '../sitemap.xml'), sitemapXml, 'utf8');
console.log(`✅ ${canais.length} páginas de canais e sitemap.xml gerados com sucesso!`);

