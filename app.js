const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const format = n => new Intl.NumberFormat('pt-BR').format(n);
const dataURL = file => new URL('data/' + file, document.baseURI).href;
const normalize = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const names = { imagens: 'Imagens', escrita: 'Escrita', estudos: 'Estudos', programacao: 'Programação', negocios: 'Negócios' };
const looks = { imagens: ['', '✧', 'Imagine o que vem a seguir.'], escrita: ['writing', '✎', 'Palavras que<br>abrem caminhos.'], estudos: ['studies', '▱', 'Sempre há algo<br>para descobrir.'], programacao: ['code', '⌘', 'Uma ideia.<br>Infinitas soluções.'], negocios: ['business', '↗', 'O próximo passo<br>começa aqui.'] };
let items = [], meta, sources = new Map(), filtered = [], page = 1, activeCategory = '', view = 'all';
let queryTimer, toastTimer, modalItem, modalTemplate = '', requestId = 0;
let favorites = new Set();
const pageSize = 24;
const chunkCache = new Map();
try {
  const saved = JSON.parse(localStorage.getItem('atalho-favorites') || '[]');
  if (Array.isArray(saved)) favorites = new Set(saved.filter(x => typeof x === 'string'));
} catch { /* Persistência é opcional. */ }

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function safeURL(value) {
  try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? u.href : ''; } catch { return ''; }
}
function safeImageSrc(value) {
  if (!value) return '';
  if (/^thumbs\/[\w.-]+\.webp$/i.test(value)) return value;
  return safeURL(value);
}
function externalLink(label, url, className) {
  const link = el('a', className, label);
  link.href = safeURL(url) || '#';
  link.target = '_blank'; link.rel = 'noopener noreferrer';
  return link;
}
function toast(message) {
  clearTimeout(toastTimer);
  const host = document.querySelector('dialog[open]') || document.body;
  host.append($('#toast'));
  $('#toast').textContent = message;
  $('#toast').hidden = false;
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 3500);
}
function persistFavorites() {
  try { localStorage.setItem('atalho-favorites', JSON.stringify([...favorites])); }
  catch { toast('Favorito salvo nesta sessão. O armazenamento local está indisponível.'); }
}
function favoriteLabel(button, item, modal = false) {
  const saved = favorites.has(item.id);
  button.textContent = modal ? (saved ? '♥ Salvo nos favoritos' : '♡ Salvar favorito') : (saved ? '♥' : '♡');
  button.classList.toggle('saved', saved);
  button.setAttribute('aria-label', (saved ? 'Remover dos favoritos: ' : 'Salvar favorito: ') + item.title);
  button.setAttribute('aria-pressed', String(saved));
}
function toggleFavorite(item) {
  const saved = favorites.has(item.id);
  if (saved) favorites.delete(item.id); else favorites.add(item.id);
  persistFavorites();
  $('#favorite-count').textContent = format(favorites.size);
  $$('[data-favorite-id]').filter(b => b.dataset.favoriteId === item.id).forEach(b => favoriteLabel(b, item));
  if (modalItem?.id === item.id) favoriteLabel($('#modal-favorite'), item, true);
  if (view === 'favorites') applyFilters();
  toast(saved ? 'Prompt removido dos favoritos.' : 'Salvo! Seu próximo atalho está nos favoritos.');
}
async function getPrompt(item) {
  if (!chunkCache.has(item.chunk)) {
    chunkCache.set(item.chunk, fetch(dataURL(`prompts-${item.chunk}.json`)).then(r => {
      if (!r.ok) throw new Error('Não foi possível carregar o prompt.');
      return r.json();
    }).catch(error => { chunkCache.delete(item.chunk); throw error; }));
  }
  const chunk = await chunkCache.get(item.chunk);
  if (typeof chunk[item.id] !== 'string') throw new Error('Texto indisponível.');
  return chunk[item.id];
}
async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try { await navigator.clipboard.writeText(text); return true; } catch { /* Tentar fallback local. */ }
  }
  const field = el('textarea');
  field.value = text; field.style.cssText = 'position:fixed;left:-9999px;top:0';
  const host = document.querySelector('dialog[open]') || document.body;
  host.append(field); field.select();
  const success = document.execCommand('copy'); field.remove();
  if (!success) throw new Error('Copie o texto manualmente no editor.');
  return true;
}
function composeCopy(item, body) { return `Atalho personalizado ${item.shortcut}.\n\n${body}`; }
async function quickCopy(item, button) {
  button.disabled = true;
  try { await copyText(composeCopy(item, await getPrompt(item))); toast('Prompt copiado. Agora é só criar!'); }
  catch { await openPrompt(item); toast('Não foi possível copiar. Selecione o texto no editor.'); }
  finally { button.disabled = false; }
}
function card(item) {
  const article = el('article', 'prompt-card');
  const [look, symbol, phrase] = looks[item.category];
  const cover = el('div', 'card-cover ' + look);
  const art = el('div', 'cover-art');
  const artText = el('div', 'cover-text');
  artText.append(el('small', '', symbol + '  ATALHO PARA ' + names[item.category].toUpperCase()));
  // Apenas frases locais e fixas contêm marcação.
  const lines = phrase.split('<br>');
  lines.forEach((line, i) => { if (i) artText.append(document.createElement('br')); artText.append(document.createTextNode(line)); });
  art.append(artText); cover.append(art);
  const imgSrc = safeImageSrc(item.image);
  if (imgSrc) {
    const img = el('img');
    img.alt = 'Exemplo da fonte: ' + item.title;
    img.loading = 'lazy'; img.decoding = 'async'; img.referrerPolicy = 'no-referrer';
    img.src = imgSrc;
    img.style.position = 'relative';
    img.addEventListener('error', () => img.remove(), { once: true });
    cover.append(img);
  }
  const openCover = el('button', 'cover-open');
  openCover.setAttribute('aria-label', 'Personalizar: ' + item.title);
  openCover.addEventListener('click', () => openPrompt(item)); cover.append(openCover);
  const fav = el('button', 'favorite-button');
  fav.dataset.favoriteId = item.id;
  favoriteLabel(fav, item);
  fav.addEventListener('click', () => toggleFavorite(item)); cover.append(fav);
  if (item.featured) cover.append(el('span', 'card-badge', item.shortcut === '/albumcover' ? '✳ Atalho em destaque' : '✦ Seleção editorial'));
  const body = el('div', 'card-body');
  const cat = el('div', 'card-category', names[item.category]);
  const source = sources.get(item.origins[0].source);
  cat.append(el('span', 'model-badge', source?.model || 'ChatGPT'));
  const title = el('button', 'card-title', item.title);
  title.addEventListener('click', () => openPrompt(item));
  body.append(cat, title, el('code', 'card-code', item.shortcut),
    el('p', 'card-description', item.description || (item.language === 'pt' ? 'Personalize os detalhes e transforme esta ideia em algo seu.' : 'Prompt internacional. Explore o original e personalize o resultado.')));
  const footer = el('div', 'card-footer');
  const origin = item.origins[0];
  const sourceLink = origin.url ? externalLink(source?.name || 'Fonte original', origin.url, 'card-source') : el('span', 'card-source', source?.name || 'Seleção editorial');
  const copy = el('button', 'card-copy', 'Copiar prompt ⧉');
  copy.setAttribute('aria-label', 'Copiar prompt: ' + item.title);
  copy.addEventListener('click', () => quickCopy(item, copy));
  footer.append(sourceLink, copy); article.append(cover, body, footer);
  return article;
}
function render() {
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  page = Math.min(page, totalPages);
  const start = (page - 1) * pageSize;
  $('#cards').replaceChildren(...filtered.slice(start, start + pageSize).map(card));
  $('#cards').setAttribute('aria-busy', 'false');
  $('#result-count').textContent = filtered.length
    ? `${format(filtered.length)} prompts encontrados · Exibindo ${format(start + 1)}–${format(Math.min(start + pageSize, filtered.length))}`
    : 'Nenhum prompt encontrado';
  $('#empty').hidden = filtered.length !== 0;
  if (!filtered.length) {
    $('#empty h3').textContent = view === 'favorites' && !favorites.size ? 'Suas melhores descobertas moram aqui.' : 'Nenhum prompt com esses filtros.';
    $('#empty p').textContent = view === 'favorites' && !favorites.size ? 'Toque no coração de um prompt para salvar e encontrar depois.' : 'Tente outro termo ou explore uma nova categoria.';
  }
  $('#page-label').textContent = `Página ${format(page)} de ${format(totalPages)}`;
  $('#prev-page').disabled = page <= 1;
  $('#next-page').disabled = page >= totalPages;
  $('.pagination').hidden = filtered.length === 0;
  $('#clear-filters').hidden = !(activeCategory || $('#search').value || $('#source-filter').value || $('#language-filter').value);
  $('#export-button').hidden = view !== 'favorites' || !favorites.size;
}
function applyFilters(resetPage = false) {
  if (resetPage) page = 1;
  const terms = normalize($('#search').value.trim()).split(/\s+/).filter(Boolean);
  const source = $('#source-filter').value, language = $('#language-filter').value;
  filtered = items.filter(item =>
    (!activeCategory || item.category === activeCategory) &&
    (view !== 'favorites' || favorites.has(item.id)) &&
    (!source || item.origins.some(o => o.source === source)) &&
    (!language || item.language === language) &&
    terms.every(t => item.search.includes(t)));
  const sort = $('#sort').value;
  if (sort !== 'featured') filtered.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR') * (sort === 'za' ? -1 : 1));
  render();
}
function updateNavigation() {
  $$('[data-category]').forEach(b => {
    const active = b.dataset.category === activeCategory;
    b.classList.toggle('active', active);
    b.setAttribute('aria-pressed', String(active));
  });
  $$('[data-view]').forEach(b => {
    const active = b.dataset.view === view && !activeCategory;
    b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active));
  });
  $('#catalog-title').textContent = view === 'favorites' ? 'Seus atalhos favoritos.' : 'Explore as possibilidades.';
  $('#catalog-description').textContent = view === 'favorites' ? 'Seu repertório pessoal, salvo neste navegador.' : 'Um bom prompt pode mudar o que você cria hoje.';
  $('#breadcrumb-current').textContent = view === 'favorites' ? 'Favoritos' : (names[activeCategory] || 'Explorar');
  $('#hero').hidden = view === 'favorites';
  $('.discovery-strip').hidden = view === 'favorites';
}
function closeMenu() {
  $('#sidebar').classList.remove('mobile-open'); $('#mobile-overlay').hidden = true;
  $('#menu-button').setAttribute('aria-expanded', 'false');
}
function goToCatalog() { $('#catalogo').scrollIntoView({ block: 'start', behavior: 'instant' }); }
function resetFilters() {
  activeCategory = ''; $('#search').value = ''; $('#source-filter').value = '';
  $('#language-filter').value = ''; $('#sort').value = 'featured';
  updateNavigation(); applyFilters(true);
}
function openDialog(dialog) {
  if (!dialog.open) dialog.showModal();
}
function updatePromptText() {
  let text = modalTemplate;
  $$('#custom-fields input').forEach(input => {
    if (input.value.trim()) text = text.split(input.dataset.token).join(input.value.trim());
  });
  const context = $('#extra-context').value.trim();
  if (context) text += '\n\nContexto e preferências adicionais:\n' + context;
  if ($('#portuguese-output').checked) text += '\n\nResponda em português do Brasil.';
  $('#prompt-text').value = text;
}
async function openPrompt(item) {
  if (!item) return;
  const ticket = ++requestId;
  modalItem = item; modalTemplate = '';
  $('#prompt-title').textContent = item.title;
  $('#prompt-shortcut').textContent = item.shortcut;
  $('#prompt-category').textContent = names[item.category];
  $('#prompt-description').textContent = item.description || 'Um ponto de partida para você adaptar.';
  $('#prompt-text').value = 'Carregando prompt…';
  $('#prompt-text').disabled = true; $('#copy-prompt').disabled = true;
  $('#custom-fields').replaceChildren();
  $('#extra-context').value = ''; $('#portuguese-output').checked = false;
  favoriteLabel($('#modal-favorite'), item, true);
  const source = sources.get(item.origins[0].source);
  const labels = [source?.model || 'ChatGPT', item.language === 'pt' ? 'Português' : 'Idioma original da fonte', 'Atalho personalizado'];
  if (item.reference) labels.push('Requer imagem de referência');
  $('#prompt-metadata').replaceChildren(...labels.map(l => el('span', '', l)));
  const links = [el('span', '', 'Fonte:')];
  item.origins.forEach(origin => {
    const s = sources.get(origin.source);
    links.push(origin.url ? externalLink(s?.name || 'Fonte original', origin.url) : el('span', '', s?.name || 'Seleção editorial'));
  });
  $('#prompt-sources').replaceChildren(...links);
  openDialog($('#prompt-dialog'));
  $('#prompt-dialog').scrollTop = 0;
  try {
    const text = await getPrompt(item);
    if (ticket !== requestId || !$('#prompt-dialog').open) return;
    modalTemplate = text;
    const placeholders = [...new Map([...text.matchAll(/\[([^\[\]\n]{1,70})\]|\{\{([^{}\n]{1,70})\}\}/g)]
      .filter(m => !m[0].includes('://')).map(m => [m[0], m[1] || m[2]])).entries()].slice(0, 20);
    if (!placeholders.length) $('#custom-fields').append(el('p', 'field-hint', 'Este prompt não tem campos marcados. Adapte o texto no editor ou acrescente seu contexto abaixo.'));
    for (const [token, label] of placeholders) {
      const field = el('label', 'field-label', label);
      const input = el('input'); input.type = 'text'; input.placeholder = label; input.dataset.token = token;
      input.addEventListener('input', updatePromptText);
      field.append(input); $('#custom-fields').append(field);
    }
    $('#prompt-text').disabled = false; $('#copy-prompt').disabled = false;
    updatePromptText();
  } catch {
    if (ticket !== requestId) return;
    $('#prompt-text').value = 'Não foi possível carregar o texto. Feche e abra o prompt para tentar novamente.';
    toast('Falha ao carregar. Verifique sua conexão.');
  }
}
function showGuide() {
  const content = $('#info-content');
  content.replaceChildren(el('h2', '', 'Da ideia à criação, em três passos.'),
    el('p', '', 'Você não precisa começar com uma página em branco.'));
  [
    ['01', 'Encontre seu ponto de partida', 'Busque um tema, escolha uma categoria ou explore os destaques. O coração salva o prompt nos favoritos deste navegador.'],
    ['02', 'Deixe com a sua cara', 'Abra um card, preencha os campos e acrescente contexto. O texto é editável. Os prompts internacionais mantêm o idioma da fonte; você pode solicitar a resposta em português.'],
    ['03', 'Copie e faça acontecer', 'Copie o prompt completo e cole no ChatGPT ou no modelo indicado. Quando necessário, envie uma imagem de referência. Ajuste o resultado com novas instruções.'],
  ].forEach(([n, title, body]) => {
    const step = el('div', 'guide-step'), text = el('div');
    text.append(el('h3', '', title), el('p', '', body));
    step.append(el('span', '', n), text); content.append(step);
  });
  const note = el('div', 'info-note');
  note.append(el('p', '', 'O que é um /atalho? É um nome para uma instrução personalizada, não um comando oficial ou secreto do ChatGPT. Copie o texto completo para comunicar o efeito desejado. Prompts de Nano Banana Pro foram escritos para outro modelo e podem precisar de adaptação.'));
  content.append(note); $('#info-title')?.removeAttribute('id');
  $('h2', content).id = 'info-title'; openDialog($('#info-dialog'));
}
function showSources() {
  if (!meta) { toast('O catálogo ainda está carregando.'); return; }
  const content = $('#info-content');
  content.replaceChildren(el('h2', '', 'Números reais. Fontes à vista.'));
  $('h2', content).id = 'info-title';
  content.append(el('p', '', 'A biblioteca conta os textos que foram efetivamente importados, remove duplicatas exatas normalizadas e mantém as fontes de cada registro. “Importado” não significa que o resultado foi testado no modelo.'));
  const summary = el('div', 'source-summary');
  const youmind = meta.sources.filter(s => s.id.startsWith('youmind'));
  [[meta.total, 'prompts únicos no catálogo'], [youmind.reduce((n, s) => n + s.extracted, 0), 'IDs YouMind recuperados'], [34004, 'prompts anunciados pela YouMind']].forEach(([n, label]) => {
    const d = el('div'); d.append(el('strong', '', format(n)), document.createTextNode(label)); summary.append(d);
  });
  content.append(summary);
  const wrapper = el('div', 'source-table-wrap'), table = el('table', 'source-table'), head = el('thead'), tr = el('tr');
  ['Fonte', 'Anunciados', 'Extraídos', 'Textos distintos¹'].forEach(label => tr.append(el('th', '', label)));
  head.append(tr); table.append(head);
  const body = el('tbody');
  meta.sources.forEach(s => {
    const row = el('tr'), label = el('td');
    label.append(s.url ? externalLink(s.name + ' ↗', s.url) : document.createTextNode(s.name));
    row.append(label, ...[s.announced, s.extracted, s.imported].map(v => el('td', '', v == null ? '—' : format(v))));
    body.append(row);
  });
  table.append(body); wrapper.append(table); content.append(wrapper);
  content.append(el('p', '', '¹ Um mesmo texto pode pertencer a mais de uma fonte, por isso a soma desta coluna não corresponde ao total global. Categorias sobrepostas da YouMind foram deduplicadas por ID antes da extração. Os itens anunciados que não estavam nos arquivos públicos não foram inventados nem contabilizados como importados.'));
  content.append(el('p', '', meta.methodology));
  content.append(el('p', '', 'Interface e seleção editorial em português. Os demais textos são preservados no idioma disponibilizado pela fonte. As categorias gerais foram atribuídas automaticamente e podem ser refinadas. Os nomes /atalho dos prompts internacionais foram gerados para navegação nesta biblioteca.'));
  content.append(el('p', '', 'Créditos: as imagens de exemplo e os prompts pertencem aos respectivos autores. prompts.chat publica seus dados sob CC0; as demais fontes mantêm suas próprias condições. Consulte o repositório ou a publicação original. As instruções do Instagram foram expandidas editorialmente a partir das descrições publicadas.'));
  content.append(el('p', '', 'Última importação: ' + new Date(meta.updatedAt).toLocaleString('pt-BR') + '. Favoritos são guardados somente neste navegador; você pode exportá-los.'));
  openDialog($('#info-dialog'));
}

$$('[data-category]').forEach(button => button.addEventListener('click', () => {
  activeCategory = button.dataset.category;
  updateNavigation(); applyFilters(true); closeMenu();
  if (button.closest('.sidebar')) goToCatalog();
}));
$$('[data-view]').forEach(button => button.addEventListener('click', () => {
  view = button.dataset.view; resetFilters(); closeMenu();
  if (view === 'favorites') goToCatalog();
}));
$('#search').addEventListener('input', () => { clearTimeout(queryTimer); queryTimer = setTimeout(() => applyFilters(true), 120); });
['#source-filter', '#language-filter', '#sort'].forEach(id => $(id).addEventListener('change', () => applyFilters(true)));
$('#clear-filters').addEventListener('click', resetFilters);
$('#empty-reset').addEventListener('click', () => { view = 'all'; resetFilters(); });
$('#prev-page').addEventListener('click', () => { page--; render(); goToCatalog(); });
$('#next-page').addEventListener('click', () => { page++; render(); goToCatalog(); });
$('#menu-button').addEventListener('click', () => {
  const open = $('#sidebar').classList.toggle('mobile-open');
  $('#mobile-overlay').hidden = !open;
  $('#menu-button').setAttribute('aria-expanded', String(open));
});
$('#mobile-overlay').addEventListener('click', closeMenu);
['#guide-button', '#bottom-guide'].forEach(id => $(id).addEventListener('click', showGuide));
['#sources-button', '#footer-sources'].forEach(id => $(id).addEventListener('click', () => { closeMenu(); showSources(); }));
['#hero-album', '#hero-album-label'].forEach(id => $(id).addEventListener('click', () => {
  const item = items.find(i => i.shortcut === '/albumcover');
  if (item) openPrompt(item); else toast('Carregando a biblioteca. Tente novamente em instantes.');
}));
$$('.close-dialog').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
$$('dialog').forEach(dialog => {
  dialog.addEventListener('click', event => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
  });
});
$('#prompt-dialog').addEventListener('close', () => { requestId++; });
$('#extra-context').addEventListener('input', updatePromptText);
$('#portuguese-output').addEventListener('change', updatePromptText);
$('#modal-favorite').addEventListener('click', () => { if (modalItem) toggleFavorite(modalItem); });
$('#copy-prompt').addEventListener('click', async () => {
  try { await copyText(composeCopy(modalItem, $('#prompt-text').value)); toast('Seu prompt personalizado foi copiado!'); }
  catch { $('#prompt-text').focus(); $('#prompt-text').select(); toast('Texto selecionado. Use Ctrl+C ou a opção Copiar.'); }
});
$('#export-button').addEventListener('click', async () => {
  const button = $('#export-button'); button.disabled = true;
  try {
    const saved = await Promise.all(items.filter(i => favorites.has(i.id)).map(async i => ({
      id: i.id, title: i.title, shortcut: i.shortcut, category: names[i.category], sources: i.origins, prompt: await getPrompt(i),
    })));
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), prompts: saved }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), link = el('a');
    link.href = url; link.download = 'atalho-favoritos.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    toast('Favoritos exportados.');
  } catch { toast('Não foi possível exportar. Tente novamente.'); }
  finally { button.disabled = false; }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeMenu();
  if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) && !document.querySelector('dialog[open]')) {
    e.preventDefault(); $('#search').focus(); goToCatalog();
  }
});
window.addEventListener('storage', e => {
  if (e.key !== 'atalho-favorites') return;
  try { const value = JSON.parse(e.newValue || '[]'); if (Array.isArray(value)) favorites = new Set(value.filter(v => typeof v === 'string')); } catch { return; }
  $('#favorite-count').textContent = format(favorites.size); applyFilters();
  if (modalItem) favoriteLabel($('#modal-favorite'), modalItem, true);
});
async function init() {
  try {
    const [metadata, data] = await Promise.all(['meta.json', 'index.json'].map(async file => {
      const url = dataURL(file);
      const r = await fetch(url); if (!r.ok) throw new Error('Dados indisponíveis'); return r.json();
    }));
    meta = metadata; sources = new Map(meta.sources.map(s => [s.id, s]));
    items = data.map(item => ({ ...item, search: normalize([item.title, item.shortcut, item.description, item.searchTerms, names[item.category]].join(' ')) }));
    favorites = new Set([...favorites].filter(id => items.some(i => i.id === id)));
    $('#favorite-count').textContent = format(favorites.size);
    $('#hero-total').textContent = format(meta.total) + ' prompts para explorar';
    $('#catalog-total').textContent = format(meta.total) + ' prompts únicos';
    $('#all-count').textContent = format(meta.total);
    Object.entries(meta.categories).forEach(([key, n]) => { $(`[data-count="${key}"]`).textContent = format(n); });
    meta.sources.filter(s => s.imported).forEach(s => {
      const option = el('option', '', `${s.name} (${format(s.imported)})`); option.value = s.id; $('#source-filter').append(option);
    });
    updateNavigation(); applyFilters(true);
  } catch {
    $('#cards').replaceChildren(); $('#cards').setAttribute('aria-busy', 'false');
    $('#result-count').textContent = 'Não foi possível carregar o catálogo.';
    $('#hero-total').textContent = 'Biblioteca temporariamente indisponível';
    $('#catalog-total').textContent = 'Falha no carregamento';
    const retry = el('button', 'secondary-button', 'Tentar carregar novamente');
    retry.addEventListener('click', () => { retry.remove(); init(); });
    $('#cards').append(retry);
  }
}
init();
