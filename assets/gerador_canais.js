// Gera paginas de canais e sitemap.xml a partir de canais.json.
const fs = require('fs');
const path = require('path');

const dominio = 'https://piratetv.cfd';
const dataAtual = '2026-05-18';
const data = require('../canais.json');

const canais = Array.isArray(data) ? data : data.channels;
const categories = Array.isArray(data) ? [] : (data.categories || []);
const categoryMap = {};
categories.forEach(category => {
  categoryMap[category.id] = category.name;
});

const sitemap = [];
const canaisDir = path.join(__dirname, '../canais');

if (!fs.existsSync(canaisDir)) {
  fs.mkdirSync(canaisDir, { recursive: true });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeJson(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

function getChannelId(canal) {
  return canal.id || canal.slug;
}

function getChannelName(canal) {
  return canal.name || canal.nome;
}

function getChannelLogo(canal) {
  return canal.image || canal.logo;
}

function getChannelStream(canal) {
  return canal.url || canal.stream;
}

function getChannelCategories(canal) {
  return (canal.categories || [])
    .filter(categoryId => categoryId !== 0)
    .map(categoryId => categoryMap[categoryId] || '')
    .filter(Boolean);
}

function getRelatedChannels(currentCanal, currentCats) {
  const currentId = getChannelId(currentCanal);
  const currentCategorySet = new Set((currentCanal.categories || []).filter(categoryId => categoryId !== 0));

  const scored = canais
    .filter(item => getChannelId(item) !== currentId)
    .map(item => {
      const itemCategories = (item.categories || []).filter(categoryId => categoryId !== 0);
      const sharedCount = itemCategories.filter(categoryId => currentCategorySet.has(categoryId)).length;
      return { item, sharedCount };
    })
    .sort((a, b) => {
      if (b.sharedCount !== a.sharedCount) return b.sharedCount - a.sharedCount;
      return getChannelName(a.item).localeCompare(getChannelName(b.item), 'pt-BR');
    });

  const preferred = scored.filter(entry => entry.sharedCount > 0).slice(0, 8);
  const fallback = scored.filter(entry => entry.sharedCount === 0).slice(0, Math.max(0, 8 - preferred.length));

  return [...preferred, ...fallback].slice(0, 8).map(({ item }) => {
    const relatedCats = getChannelCategories(item).slice(0, 2);
    return {
      id: getChannelId(item),
      name: getChannelName(item),
      logo: getChannelLogo(item),
      categories: relatedCats.length ? relatedCats.join(' • ') : (currentCats[0] || 'Canal ao vivo')
    };
  });
}

function getCategoryContext(cats) {
  const normalized = cats.join(' ').toLowerCase();

  if (normalized.includes('bbb')) {
    return {
      extra: 'câmeras ao vivo 24h',
      intent: 'reality show ao vivo',
      benefit: 'acompanhar a programação em tempo real'
    };
  }

  if (normalized.includes('esporte') || normalized.includes('sport')) {
    return {
      extra: 'futebol ao vivo, campeonatos e esportes',
      intent: 'esportes ao vivo',
      benefit: 'assistir jogos, programas esportivos e transmissões ao vivo'
    };
  }

  if (normalized.includes('infantil') || normalized.includes('kids')) {
    return {
      extra: 'desenhos animados e programação infantil',
      intent: 'canal infantil online',
      benefit: 'acompanhar desenhos e conteúdos para a família'
    };
  }

  if (normalized.includes('noticia') || normalized.includes('news')) {
    return {
      extra: 'notícias ao vivo e jornalismo',
      intent: 'notícias online',
      benefit: 'acompanhar notícias, boletins e cobertura em tempo real'
    };
  }

  if (normalized.includes('filme') || normalized.includes('série') || normalized.includes('series')) {
    return {
      extra: 'filmes, séries e entretenimento',
      intent: 'filmes e séries online',
      benefit: 'assistir filmes, séries, novelas e programação de entretenimento'
    };
  }

  return {
    extra: 'programação ao vivo',
    intent: 'TV online',
    benefit: 'acompanhar a programação ao vivo pelo navegador'
  };
}

function buildRelatedCards(relatedChannels) {
  return relatedChannels.map(related => `
          <a class="related-channel-card" href="/canais/${escapeHtml(related.id)}.html" aria-label="Abrir canal ${escapeHtml(related.name)}">
            <img src="${escapeHtml(related.logo)}" alt="Logo do canal ${escapeHtml(related.name)}" loading="lazy" width="64" height="64">
            <strong>${escapeHtml(related.name)}</strong>
            <span>${escapeHtml(related.categories)}</span>
          </a>`).join('');
}

function buildChannelPage(canal) {
  const id = getChannelId(canal);
  const nome = getChannelName(canal);
  const logo = getChannelLogo(canal);
  const stream = getChannelStream(canal);
  const cats = getChannelCategories(canal);
  const categoryLabel = cats.length ? cats.join(', ') : 'TV online';
  const context = getCategoryContext(cats);
  const relatedCards = buildRelatedCards(getRelatedChannels(canal, cats));
  const catsBadges = cats.map(cat => `<span class="badge">${escapeHtml(cat)}</span>`).join('');
  const pageUrl = `${dominio}/canais/${id}.html`;
  const title = `Assistir ${nome} ao Vivo Online Grátis em HD | Pirate TV`;
  const description = `Assista ${nome} ao vivo online grátis em HD no Pirate TV. Veja ${context.extra}, sem cadastro, direto pelo celular, computador, tablet ou Smart TV.`;
  const keywords = `${nome} ao vivo, assistir ${nome} online grátis, ${nome} HD, ${nome} sem cadastro, Pirate TV, TV online grátis, multicanais, ${context.intent}`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="keywords" content="${escapeHtml(keywords)}">
  <meta name="author" content="Pirate TV">
  <meta name="language" content="pt-BR">
  <meta name="theme-color" content="#0c0c0c">
  <meta name="application-name" content="Pirate TV">
  <meta name="geo.region" content="BR">
  <meta name="geo.placename" content="Brasil">
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">

  <link rel="canonical" href="${pageUrl}">
  <link rel="alternate" hreflang="pt-BR" href="${pageUrl}">
  <link rel="alternate" hreflang="x-default" href="${pageUrl}">
  <link rel="preconnect" href="https://embedtv.best" crossorigin>
  <link rel="preload" href="../assets/style.css" as="style">
  <link rel="shortcut icon" href="../favicon.png" type="image/png">
  <link rel="apple-touch-icon" href="../favicon.png">
  <link rel="stylesheet" href="../assets/style.css">
  <link rel="stylesheet" href="../assets/channel-page.css">

  <meta property="og:type" content="video.other">
  <meta property="og:site_name" content="Pirate TV">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(logo)}">
  <meta property="og:image:alt" content="${escapeHtml(nome)} ao vivo no Pirate TV">
  <meta property="og:locale" content="pt_BR">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(logo)}">

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "${pageUrl}#webpage",
        "url": "${pageUrl}",
        "name": "${escapeJson(title)}",
        "description": "${escapeJson(description)}",
        "isPartOf": {
          "@type": "WebSite",
          "@id": "${dominio}/#website",
          "name": "Pirate TV",
          "url": "${dominio}/"
        },
        "breadcrumb": { "@id": "${pageUrl}#breadcrumb" },
        "inLanguage": "pt-BR",
        "dateModified": "${dataAtual}"
      },
      {
        "@type": "BreadcrumbList",
        "@id": "${pageUrl}#breadcrumb",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Início", "item": "${dominio}/" },
          { "@type": "ListItem", "position": 2, "name": "Canais", "item": "${dominio}/canais" },
          { "@type": "ListItem", "position": 3, "name": "${escapeJson(nome)}", "item": "${pageUrl}" }
        ]
      },
      {
        "@type": "BroadcastService",
        "name": "${escapeJson(nome)}",
        "description": "${escapeJson(description)}",
        "broadcastDisplayName": "${escapeJson(nome)}",
        "inLanguage": "pt-BR",
        "broadcastTimezone": "America/Sao_Paulo",
        "logo": {
          "@type": "ImageObject",
          "url": "${escapeJson(logo)}"
        },
        "potentialAction": {
          "@type": "WatchAction",
          "target": "${pageUrl}"
        }
      },
      {
        "@type": "FAQPage",
        "@id": "${pageUrl}#faq",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Como assistir ${escapeJson(nome)} ao vivo online?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Abra a página do canal no Pirate TV e use o player ao vivo diretamente pelo navegador."
            }
          },
          {
            "@type": "Question",
            "name": "${escapeJson(nome)} funciona no celular?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Sim. A página é responsiva e pode ser acessada por celular, tablet, computador e Smart TV."
            }
          }
        ]
      }
    ]
  }
  </script>
</head>
<body class="channel-page">
  <header>
    <div class="header-inner">
      <a href="/" class="header-logo-link" aria-label="Pirate TV - página inicial">
        <img src="../piratetv.png" alt="Pirate TV - TV online grátis" class="header-logo-img">
      </a>
      <nav aria-label="Navegação principal">
        <a href="/">Início</a>
        <a href="/canais">Canais</a>
      </nav>
    </div>
  </header>

  <main class="container">
    <div class="channel-shell">
      <section class="channel-hero" aria-labelledby="channel-title">
        <nav class="channel-breadcrumbs" aria-label="Breadcrumb">
          <a href="/">Início</a>
          <span>/</span>
          <a href="/canais">Canais</a>
          <span>/</span>
          <strong>${escapeHtml(nome)}</strong>
        </nav>

        <div class="channel-heading">
          <img class="channel-logo-main" src="${escapeHtml(logo)}" alt="Logo do canal ${escapeHtml(nome)}" loading="eager" width="112" height="112">
          <div>
            <p class="channel-kicker">${escapeHtml(categoryLabel)}</p>
            <h1 id="channel-title">Assistir ${escapeHtml(nome)} ao vivo online grátis</h1>
            ${catsBadges ? `<div class="badges-row">${catsBadges}</div>` : ''}
          </div>
        </div>

        <p class="channel-lead">
          Assista ${escapeHtml(nome)} ao vivo em HD no Pirate TV. Acesse ${escapeHtml(context.extra)}
          direto pelo navegador, com página otimizada para celular, computador, tablet e Smart TV.
        </p>

        <div class="channel-highlight-bar" aria-label="Informações rápidas">
          <div class="channel-highlight-item">
            <span>Categoria</span>
            <strong>${escapeHtml(categoryLabel)}</strong>
          </div>
          <div class="channel-highlight-item">
            <span>Acesso</span>
            <strong>Online agora</strong>
          </div>
          <div class="channel-highlight-item">
            <span>Compatibilidade</span>
            <strong>Mobile e desktop</strong>
          </div>
        </div>
      </section>

      <section class="watch-panel" aria-labelledby="watch-title">
        <div class="watch-panel-head">
          <h2 id="watch-title">${escapeHtml(nome)} ao vivo</h2>
          <span class="live-pill">Transmissão online</span>
        </div>
        <div class="channel-player-wrap">
          <iframe src="${escapeHtml(stream)}" allowfullscreen title="Assistir ${escapeHtml(nome)} ao vivo online grátis - Pirate TV" loading="lazy"></iframe>
        </div>
        <div class="channel-actions">
          <a href="/canais">← Ver todos os canais ao vivo</a>
        </div>
      </section>

      <article class="channel-seo">
        <h2>Como assistir ${escapeHtml(nome)} online grátis</h2>
        <p>
          Para assistir ${escapeHtml(nome)} online, use o player acima e acompanhe a programação ao vivo pelo navegador.
          Esta página reúne informações do canal, categorias relacionadas e links internos para facilitar a navegação no catálogo.
        </p>
        <ul class="benefit-list">
          <li>Player responsivo para telas pequenas e grandes</li>
          <li>Acesso direto sem instalar aplicativos</li>
          <li>Links internos para canais relacionados</li>
          <li>Conteúdo otimizado para busca e compartilhamento</li>
        </ul>
        <p>
          O canal ${escapeHtml(nome)} é indicado para quem busca ${escapeHtml(context.benefit)}. Também é possível voltar ao
          catálogo completo para encontrar canais de esportes, filmes, séries, notícias, infantis, abertos e variedades.
        </p>
      </article>

      <section class="related-channels" aria-labelledby="related-title">
        <div class="related-channels-head">
          <div>
            <p class="related-kicker">Mais opções para assistir</p>
            <h2 id="related-title">Canais relacionados</h2>
          </div>
          <a href="/canais" class="related-all-link">Abrir catálogo completo</a>
        </div>
        <div class="related-channels-grid">
${relatedCards}
        </div>
      </section>
    </div>
  </main>

  <footer>
    <div class="footer-inner">
      <div class="footer-brand">
        <span class="footer-logo-text">Pirate<span>TV</span></span>
        <p class="footer-tagline">Pirate TV: catálogo de canais ao vivo para assistir TV online grátis em HD.</p>
      </div>
      <div class="footer-links">
        <div class="footer-col">
          <h5>Navegação</h5>
          <a href="/">Início</a>
          <a href="/canais">Canais</a>
          <a href="/bbb">BBB Ao Vivo</a>
        </div>
      </div>
      <div class="footer-divider"></div>
      <div class="footer-bottom">
        <p><a href="/">Pirate TV</a> &copy; 2026 - Todos os direitos reservados.</p>
      </div>
    </div>
  </footer>
</body>
</html>`;
}

sitemap.push({ loc: `${dominio}/`, priority: '1.0', changefreq: 'daily' });
sitemap.push({ loc: `${dominio}/canais`, priority: '0.9', changefreq: 'daily' });
sitemap.push({ loc: `${dominio}/bbb`, priority: '0.9', changefreq: 'hourly' });
sitemap.push({ loc: `${dominio}/blog`, priority: '0.7', changefreq: 'weekly' });
sitemap.push({ loc: `${dominio}/blog/como-assistir-tv-online-gratis`, priority: '0.7', changefreq: 'weekly' });
sitemap.push({ loc: `${dominio}/blog/como-assistir-futebol-ao-vivo-gratis`, priority: '0.7', changefreq: 'weekly' });
sitemap.push({ loc: `${dominio}/blog/como-assistir-bbb-26-ao-vivo`, priority: '0.7', changefreq: 'weekly' });
sitemap.push({ loc: `${dominio}/blog/espn-ao-vivo-gratis`, priority: '0.7', changefreq: 'weekly' });
sitemap.push({ loc: `${dominio}/blog/sportv-ao-vivo-gratis`, priority: '0.7', changefreq: 'weekly' });
sitemap.push({ loc: `${dominio}/blog/premiere-ao-vivo-gratis`, priority: '0.7', changefreq: 'weekly' });

canais.forEach(canal => {
  const id = getChannelId(canal);
  fs.writeFileSync(path.join(canaisDir, `${id}.html`), buildChannelPage(canal), 'utf8');
  sitemap.push({ loc: `${dominio}/canais/${id}.html`, priority: '0.8', changefreq: 'daily' });
});

let sitemapXml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
sitemap.forEach(item => {
  sitemapXml += `  <url>\n    <loc>${item.loc}</loc>\n    <lastmod>${dataAtual}</lastmod>\n    <changefreq>${item.changefreq}</changefreq>\n    <priority>${item.priority}</priority>\n  </url>\n`;
});
sitemapXml += '</urlset>\n';

fs.writeFileSync(path.join(__dirname, '../sitemap.xml'), sitemapXml, 'utf8');
console.log(`${canais.length} paginas de canais e sitemap.xml gerados com sucesso.`);
