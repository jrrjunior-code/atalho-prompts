# Atalho

Biblioteca independente de prompts com interface em português, cinco categorias, pesquisa, filtros por fonte/idioma, favoritos locais, exportação JSON, personalização e cópia. Destaque para `/albumcover`.

## Executar

Requisito: Node.js 18 ou superior. Não há dependências de produção para instalar.

```sh
npm start
```

Abra http://localhost:3000. Para outra porta: `PORT=3001 npm start`.

Os dados já estão incluídos. A hospedagem também pode ser estática: publique `index.html`, `app.js`, `styles.css`, `favicon.svg` e a pasta `data` na raiz do domínio. Habilite gzip/Brotli para o índice. O servidor incluído comprime os arquivos e carrega os textos completos sob demanda, em blocos de 200.

## Dados e contagens

Importação em 24/11/2026:

- **36.891 textos distintos** no catálogo, após normalização e deduplicação.
- YouMind GPT Image 2: **18.106 IDs recuperados**, de **18.144 anunciados**.
- YouMind Nano Banana Pro: **15.318 IDs recuperados**, de **15.860 anunciados**.
- As duas coleções disponibilizaram **33.424 IDs**, não os 34.004 anunciados. Há também textos repetidos entre IDs/fontes.
- O total global inclui Mestre dos Prompts, prompts.chat, Awesome GPT-4o Images, ImgEdify, Pixmind, descrições do Instagram expandidas editorialmente e oito prompts editoriais próprios.

`data/meta.json` é a fonte de verdade para as contagens. A tela **Fontes e transparência** expõe a metodologia. Importação verificada significa que o texto foi obtido e contabilizado, não que sua eficácia foi testada.

### Idiomas e atalhos

A interface, a seleção editorial e os 300 atalhos da referência estão em português. Prompts internacionais são preservados no idioma da fonte, com filtro de idioma. A opção “Pedir resposta em português” acrescenta uma instrução ao texto; não traduz o prompt.

Os nomes `/atalho` de registros internacionais são rótulos gerados para navegação. Não são comandos oficiais do ChatGPT. Prompts de Nano Banana Pro foram concebidos para outro modelo e estão identificados.

### Atualizar/importar

Requisitos adicionais: Python 3 e acesso à internet.

```sh
npm run import
npm run check
```

O importador mantém um cache em `.cache/`. Remova o cache para buscar uma nova versão das fontes. As categorias dos prompts gerais são atribuídas por heurística; os textos são deduplicados normalizando espaços e caixa. As origens de cada texto são mantidas mesmo quando há duplicação entre fontes. As categorias YouMind são primeiro deduplicadas por ID.

### Créditos

- https://codigos.maestroprompts.chatgpt.site/
- https://github.com/f/prompts.chat — dados de prompts sob CC0
- https://github.com/YouMind-OpenLab/gpt-image-2-prompts-search
- https://github.com/YouMind-OpenLab/nano-banana-pro-prompts-recommend-skill
- https://github.com/jamez-bondos/awesome-gpt4o-images
- https://github.com/ImgEdify/Awesome-GPT4o-Image-Prompts
- https://github.com/Pixmind-io/awesome-gpt-image-2-prompts
- https://www.instagram.com/p/DdIxjB1SSoF/

Prompts e imagens de terceiros permanecem sujeitos às condições e atribuições de suas fontes. A imagem abstrata do destaque é uma composição CSS original; as prévias dos cards são imagens externas das fontes, com fallback visual quando indisponíveis. Não há geração de imagem ou chamada a modelos dentro do site.

Favoritos ficam no `localStorage` deste navegador. O botão de exportação baixa textos e fontes em JSON. Nenhuma conta é necessária.
