# RiscoGCS — Gestão de riscos na cadeia global de suprimentos

Sistema web para aplicar os conceitos do capítulo "Gestão de riscos na cadeia global de suprimentos" (Corrêa, 2019).
Usa uma empresa fictícia, a **NordEletro S.A.** (eletrodomésticos, fábrica em Suape/PE), com rede de fornecedores, 28 riscos, 31 ações, 12 indicadores e 12 fornecedores.

Site estático: HTML, CSS e JavaScript puro, sem build e sem dependências. Os dados ficam salvos no navegador (localStorage).

## Publicar no Vercel

**Opção 1 — arrastar e soltar**
1. Entre em https://vercel.com e crie uma conta (pode usar o GitHub).
2. Clique em **Add New → Project**.
3. Escolha importar sem Git ou rode `npx vercel` dentro desta pasta.
4. Em *Framework Preset* escolha **Other**. Deixe *Build Command* e *Output Directory* vazios.
5. Clique em **Deploy**. O link sai em menos de um minuto.

**Opção 2 — pelo GitHub (recomendado para o grupo)**
1. Crie um repositório e envie todos os arquivos desta pasta.
2. No Vercel, **Add New → Project → Import** o repositório.
3. Framework Preset: **Other**. Deploy.
4. Cada `git push` publica uma nova versão automaticamente.

**Testar no computador:** abra `index.html` direto no navegador, ou rode `npx serve .` nesta pasta.

## Estrutura

Uma única página (`index.html`) com cinco abas no topo. Não há outras páginas: as abas trocam o conteúdo na mesma página, e o assistente de análise, o relatório e a metodologia abrem como janelas sobre ela.

```
index.html             página única: barra com as abas e a área de conteúdo
vercel.json            configuração do Vercel
assets/style.css       visual (tema claro e escuro, celular)
assets/js/util.js      utilidades: formatação em R$, janelas, downloads, gerador aleatório com semente
assets/js/data.js      escalas, categorias, tipos de risco e TODA a base fictícia
assets/js/model.js     cálculos: P×I, residual, perda esperada, Monte Carlo, simulador de interrupção, HHI
assets/js/charts.js    gráficos em SVG feitos à mão (sem biblioteca)
assets/js/app.js       navegação por abas, detalhe do risco, formulários de risco e ação
assets/js/views.js     as cinco abas: Painel, Riscos, Ações, Monitoramento, Simulações
assets/js/extras.js    janelas: assistente dos 6 passos, Relatório e dados, Sobre (metodologia e dez princípios)
```

## Abas e conceitos da aula

| Aba | O que se clica | Conceito aplicado |
|---|---|---|
| Painel | Indicadores do topo (levam ao assunto); elos do mapa (abrem riscos, TTR/TTS, indicadores e fornecedores do elo) | Visão geral; risco em suprimento, operação e demanda; elo mais fraco (princípio 3); TTR × TTS |
| Riscos | Células da matriz, níveis, quadrantes e categorias filtram a lista; cada risco abre o detalhe | Registro de riscos; probabilidade × consequência; mapa de vulnerabilidade; critérios explícitos; processo em 6 passos |
| Ações | Estratégias e status filtram; cada ação abre a edição | Reduzir probabilidade, reduzir consequência, transferir (seguros); retorno por real investido |
| Monitoramento | Contadores filtram os indicadores; indicadores e fornecedores abrem detalhe; sinais viram riscos | Indicadores antecipatórios, sinais fracos; diversificação (princípio 2), Z-score, HHI |
| Simulações | Cenários do Monte Carlo; cenários prontos de interrupção | Perda anual, VaR e curva de excedência; fases de uma interrupção; caso Nokia × Ericsson |
| Relatório (botão no topo) | Exportar, importar, imprimir | Resumo executivo, CSV, backup JSON |
| Sobre (botão no topo) | Notas dos dez princípios | Metodologia, fórmulas, autoavaliação de maturidade |

## Fórmulas principais

- **Nível do risco:** P × I (1 a 25). Baixo 1–4, Moderado 5–9, Alto 10–14, Crítico 15–25. I = pior nota entre pessoas, reputação, processos e financeiro.
- **Perda esperada anual:** λ × perda média, com λ = −ln(1 − p) e perda média = (mín + provável + máx) ÷ 3.
- **Residual:** p × Π(1 − redução de probabilidade) e perda × Π(1 − redução de consequência).
- **Seguro:** perda retida = mín(perda, franquia) + (perda − franquia) × (1 − cobertura).
- **Impacto do elo:** máx(0, TTR − TTS) × receita semanal dependente × margem.
- **Monte Carlo:** eventos por ano ~ Poisson(λ); perda por evento ~ Triangular(mín, provável, máx).

## Como mudar os dados

Toda a base de demonstração está em `assets/js/data.js`, na função `DATA.seed()`.
Depois de alterar o arquivo, use **Relatório → Restaurar demonstração** para carregar a nova base no navegador.
