# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Hub DEV
Este projeto segue o hub **`pafferreira/dev-tools`** (no Windows, a pasta `..\dev-tools`): ficha `projetos/benfit-treinos.md`, convenções `padroes/convencoes.md`, banco `padroes/banco-de-dados.md`, versão `padroes/versionamento.md` e chaves `segredos/MAPA.md` (só nomes; valores no Infisical). As regras deste arquivo são específicas do projeto e prevalecem.

- **Estilo:** skill `estilo-paf`, tema **`paf`** (cópia em `.agent/skills/estilo_paf/`, gerada pelo hub — não edite aqui).

## Project Overview

Benfit Treinos — fitness/training management app. React 19 + Vite SPA backed by Supabase (auth + database). Deployed on Vercel.

## Commands

```bash
npm run dev      # Vite dev server
npm run build    # Production build
npm run lint     # ESLint
npm run preview  # Preview production build locally
```

## Architecture

Single-page React app using React Router v7 for navigation.

- `src/pages/` — Route-level page components
- `src/components/` — Reusable UI components
- `src/context/` — React context providers (auth, app state)
- `src/hooks/` — Custom hooks
- `src/services/` — Supabase client and API calls
- `src/layouts/` — Layout wrappers
- `src/lib/` — Utilities and helpers
- `database/` — SQL schema and migration files for Supabase
- `supabase/` — Supabase project config and migrations
- `scripts/` — Helper scripts

**Backend**: Supabase (PostgreSQL + Auth). No separate server — all data access goes through the Supabase JS client.

**Styling**: Tailwind CSS + `tailwindcss-animate`.

## Skills (AGENTS.md)

A skill principal é `estilo_paf` (cópia gerada pelo hub em `.agent/skills/estilo_paf/`). Aplique em toda tarefa de UI/UX, layout e estilo. Para banco de dados e SQL, siga `padroes/banco-de-dados.md` do hub.

**Design System**: `design-system/` contains the master design reference. Check `design-system/centro/pages/[page-name].md` first for page-specific rules; fall back to `design-system/centro/MASTER-BR.md`.

## Release e versionamento
O controle de versão usa o `release.py` do repositório **`pafferreira/dev-tools`** (compartilhado por todos os projetos). A configuração deste projeto está em `release.config.json` (arquivo de versão `package.json`; checagens antes do release: `npm test`, `npm run build`).

- **Windows:** de dentro da pasta do projeto (`\DEV\benfit-treinos`): `python ..\dev-tools\release.py patch "texto curto"`.
- **Sessão na nuvem:** anexar `pafferreira/dev-tools` (`add_repo`), clonar e rodar `python /home/user/dev-tools/release.py patch "texto curto" --project <pasta do projeto>`.
- `--dry-run` mostra a versão sem alterar nada. Rodar com a árvore limpa **na branch do PR, antes do merge**: o script faz commit e push na branch atual, a versão entra no PR e o merge é o release. Sem PR, rodar na `main`.
- A **tag** `vX.Y.Z` e o Release do GitHub são criados pelo workflow `.github/workflows/tag-versao.yml` (cópia do modelo do hub) quando o arquivo de versão muda na `main`. Não envie tag à mão; para criar tags que faltam, rode o workflow pela aba Actions.

### Gatilho "commit"
Quando o usuário pedir somente **"commit"**: (1) commitar o trabalho pendente (o release aborta com a árvore suja); (2) rodar um release **patch** com um texto curto resumindo as alterações, sem pedir confirmação extra; (3) se as mudanças forem maiores (funcionalidade nova, mudança de fluxo ou de contrato, migração de banco), **propor minor ou major e confirmar** antes. Regra de bolso: correção/ajuste → patch; funcionalidade nova → minor; quebra de compatibilidade → major.
