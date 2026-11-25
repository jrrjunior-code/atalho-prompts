# Atalho — Biblioteca Independente de Prompts

[![Deploy to GitHub Pages](https://github.com/seu-usuario/atalho/actions/workflows/deploy.yml/badge.svg)](https://github.com/seu-usuario/atalho/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Uma biblioteca aberta de prompts e atalhos para criar imagens, escrever, estudar, programar e desenvolver negócios. Explore, personalize e copie.

**🌐 Demo:** https://seu-usuario.github.io/atalho/

---

## ✨ Funcionalidades

- **36.891+ prompts únicos** de 9 fontes públicas, deduplicados e categorizados
- **5 categorias:** Imagens, Escrita, Estudos, Programação, Negócios
- **Busca instantânea** com filtros por fonte, idioma e categoria
- **Personalização interativa** — preencha placeholders `[como este]` antes de copiar
- **Favoritos locais** salvos no `localStorage` (sem conta, sem backend)
- **Exportação JSON** dos favoritos
- **Dark mode** nativo (sistema + toggle manual)
- **Acessibilidade WCAG 2.2 AA** — skip links, ARIA, focus management, reduced motion
- **Zero dependências de runtime** — apenas HTML/CSS/JS estático
- **Deploy automático** no GitHub Pages via GitHub Actions

---

## 🚀 Início Rápido

### Pré-requisitos

- Node.js 20+
- npm 10+

### Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/atalho.git
cd atalho

# Instale dependências
npm ci

# Importe o catálogo (precisa de Python 3 + internet)
npm run import

# Verifique integridade
npm run check:catalog

# Inicie o servidor de desenvolvimento
npm run dev
```

Abra http://localhost:4321/atalho/

### Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia servidor de dev com hot reload |
| `npm run build` | Build de produção (tipo-checado) |
| `npm run preview` | Preview do build de produção |
| `npm run check` | Type-check com `astro check` |
| `npm run lint` | ESLint no código |
| `npm run format` | Prettier no código |
| `npm run import` | Baixa e processa fontes do catálogo |
| `npm run check:catalog` | Valida integridade dos dados |
| `npm run deploy` | Build + deploy para GitHub Pages |

---

## 🏗️ Arquitetura

```
atalho/
├── public/
│   └── data/                 # Dados estáticos (meta.json, index.json, prompts-*.json)
├── src/
│   ├── components/           # Componentes Astro (SSR/HTML)
│   ├── islands/              # Ilhas interativas (client-side JS)
│   ├── layouts/              # Layouts de página
│   ├── pages/                # Rotas (file-based routing)
│   ├── scripts/              # Lógica compartilhada (state, data-loader)
│   ├── styles/               # CSS global + design tokens
│   ├── tokens/               # Design tokens (JSON + CSS vars)
│   ├── types/                # TypeScript types
│   └── utils/                # Helpers puros
├── scripts/                  # Scripts Node.js (import, check)
├── .github/workflows/        # CI/CD para GitHub Pages
├── astro.config.mjs          # Config Astro + Tailwind
├── tailwind.config.mjs       # Design system no Tailwind
├── tsconfig.json             # TypeScript strict mode
└── package.json
```

### Princípios de Design

1. **HTML-first** — Astro renderiza HTML estático; JS só onde precisa (ilhas)
2. **Design tokens** — Single source of truth em `src/tokens/design-tokens.json`
3. **CSS custom properties** — Temas light/dark via `[data-theme]`
4. **Estado centralizado** — Reducer pattern em `src/scripts/state.ts`
5. **Carregamento sob demanda** — Chunks de 200 prompts via `fetch` dinâmico
6. **Zero runtime deps** — Produção é apenas arquivos estáticos

---

## 🎨 Design System

O design system é definido em **dois lugares sincronizados**:

1. **`src/tokens/design-tokens.json`** — Fonte da verdade (JSON)
2. **`src/styles/tokens.css`** — CSS custom properties para runtime

Inclui:
- **Cores semânticas** (ink, muted, paper, line, lime, dark + categorias)
- **Espaçamento** (escala 4px base)
- **Tipografia** (DM Sans + Manrope + JetBrains Mono)
- **Sombras, bordas, raios, z-index**
- **Transições e easing**
- **Breakpoints responsivos**

### Dark Mode

```css
/* Automático via prefers-color-scheme */
[data-theme="dark"] { ... }

/* Ou manual via toggle (salva no localStorage) */
```

---

## 📦 Dados do Catálogo

### Fontes (novembro 2026)

| Fonte | Prompts | Modelo |
|-------|---------|--------|
| Mestre dos Prompts | 300 | ChatGPT |
| prompts.chat | 3.169 | ChatGPT |
| YouMind GPT Image 2 | 18.084 | GPT Image 2 |
| YouMind Nano Banana Pro | 14.995 | Nano Banana Pro |
| Awesome GPT-4o Images | 100 | GPT-4o |
| ImgEdify | 76 | GPT-4o |
| Pixmind | 148 | GPT Image 2 |
| Instagram @poderartificial | 20 | ChatGPT |
| Seleção editorial | 8 | ChatGPT |
| **Total único** | **36.891** | — |

### Categorias

- **Imagens:** 33.716
- **Escrita:** 2.347
- **Estudos:** 172
- **Programação:** 469
- **Negócios:** 187

### Atualizando o Catálogo

```bash
# Remove cache para forçar re-download
rm -rf .cache

# Re-importa tudo
npm run import
npm run check:catalog
```

O importador:
- Deduplica por **hash SHA-256 do texto normalizado**
- YouMind: deduplica por **ID** antes de contar
- Preserva **proveniência** (todas as fontes onde o texto aparece)
- Categoriza prompts gerais via **heurística de palavras-chave**
- Gera **chunks de 200** para carregamento lazy

---

## ♿ Acessibilidade

- **Skip link** para pular ao catálogo
- **ARIA labels** em todos os controles interativos
- **Focus visible** com outline 3px verde-lima
- **Reduced motion** respeitado (`prefers-reduced-motion`)
- **Contraste AA** em todos os estados
- **Touch targets** ≥ 44×44px
- **Live regions** para toasts e contadores
- **Keyboard navigation** completa (Tab, Enter, Escape, /)

---

## 🚀 Deploy no GitHub Pages

1. **Configure o repositório:**
   - Settings → Pages → Source: "GitHub Actions"
   - Atualize `base` em `astro.config.mjs` para `/seu-repo/`

2. **Push para main** — GitHub Actions faz build + deploy automaticamente

3. **URL final:** `https://seu-usuario.github.io/seu-repo/`

### Deploy Manual

```bash
npm run deploy
# Requer: gh-pages instalado e configurado
```

---

## 🛠️ Desenvolvimento

### Estrutura de Componentes

```
src/components/     # Astro components (HTML + CSS, sem JS)
├── Hero.astro
├── Catalog.astro
├── PromptCard.astro
├── DiscoveryStrip.astro
└── BottomBanner.astro

src/islands/        # Client-side interactive components
└── CatalogIsland.ts  # Toda a lógica: busca, filtros, modal, favoritos
```

### Padrão de Estado

```typescript
// src/scripts/state.ts
const initialState = { ... };
function appReducer(state, action) { ... }
function selectFilteredPrompts(state) { ... }
```

### Adicionando uma Nova Ilha

1. Crie `src/islands/NovaIlha.ts`
2. Exporte como default
3. Use no `.astro`: `<NovaIlha client:visible />`

### Estilos

- **Global:** `src/styles/global.css` (reset, utilities, components)
- **Tokens:** `src/styles/tokens.css` (CSS vars do design system)
- **Tailwind:** Use classes utilitárias + tokens semânticos (`bg-primary`, `text-text-primary`)

---

## 📄 Licença

MIT — veja [LICENSE](LICENSE) para detalhes.

### Créditos das Fontes

- [Mestre dos Prompts](https://codigos.maestroprompts.chatgpt.site/)
- [prompts.chat](https://github.com/f/prompts.chat) — CC0
- [YouMind GPT Image 2](https://github.com/YouMind-OpenLab/gpt-image-2-prompts-search)
- [YouMind Nano Banana Pro](https://github.com/YouMind-OpenLab/nano-banana-pro-prompts-recommend-skill)
- [Awesome GPT-4o Images](https://github.com/jamez-bondos/awesome-gpt4o-images)
- [ImgEdify](https://github.com/ImgEdify/Awesome-GPT4o-Image-Prompts)
- [Pixmind](https://github.com/Pixmind-io/awesome-gpt-image-2-prompts)
- [Instagram @poderartificial](https://www.instagram.com/p/DdIxjB1SSoF/)

Prompts e imagens de terceiros permanecem sujeitos às condições de suas fontes.

---

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'feat: adiciona X'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

### Padrões de Commit

- `feat:` nova funcionalidade
- `fix:` correção de bug
- `docs:` documentação
- `style:` formatação
- `refactor:` refatoração
- `test:` testes
- `chore:` manutenção

---

## 📞 Suporte

- **Issues:** [GitHub Issues](https://github.com/seu-usuario/atalho/issues)
- **Discussões:** [GitHub Discussions](https://github.com/seu-usuario/atalho/discussions)

---

**Feito com ❤️ para a comunidade de criadores com IA**