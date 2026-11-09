/* ==========================================================================
   extras.js — janela "Como funciona": guia passo a passo, método, glossário
   e autoavaliação dos dez princípios
   ========================================================================== */
const X = {};

/* ==========================================================================
   Sobre: metodologia e autoavaliação dos dez princípios (janela)
   ========================================================================== */
X.aboutTab = 'guia';

/* Evidências calculadas a partir dos dados do sistema para cada princípio */
X.autoEvid = () => {
  const st = S.state, acts = st.actions;
  const custo = acts.reduce((s, a) => s + a.custo, 0) || 1;
  const nodes = st.nodes.filter((n) => n.ttr != null);
  const gaps = nodes.filter((n) => n.ttr > n.tts).sort((a, b) => M.nodePI(b) - M.nodePI(a));
  const hhi = M.hhi();
  const internos = st.risks.filter((r) => ['n_fab', 'n_erp'].includes(r.no));
  const lev = (l) => acts.filter((a) => l.includes(a.alavanca));
  const comPlano = st.risks.filter((r) => M.actionsOf(r.id).length).length;
  return [
    `${internos.filter((r) => M.actionsOf(r.id).length).length} de ${internos.length} riscos internos (fábrica e sistemas) têm plano de ação.`,
    `${hhi.filter((h) => h.hhi > 6000).length} de ${hhi.length} categorias de compra têm alta concentração (HHI acima de 6.000).`,
    gaps.length ? `Elo mais fraco: ${gaps[0].nome}, com ${U.num(gaps[0].ttr - gaps[0].tts, 1)} semanas de recuperação sem cobertura.` : 'Todos os elos têm cobertura maior que o tempo de recuperação.',
    `Ações de prevenção e processos robustos somam ${U.pct(lev(['Prevenção', 'Processos robustos']).reduce((s, a) => s + a.custo, 0) / custo)} do orçamento do plano.`,
    `${gaps.length} de ${nodes.length} elos têm tempo de sobrevivência menor que o de recuperação.`,
    `${lev(['Redundância']).length} ações de redundância (estoques, capacidade reserva, segunda fonte).`,
    `${lev(['Monitoramento']).length + st.kris.length} instrumentos de monitoramento e colaboração (ações e KRIs).`,
    `${comPlano} de ${st.risks.length} riscos têm ações preparadas antes da interrupção.`,
    `${lev(['Flexibilidade']).length} ações de flexibilidade e modularidade (${lev(['Flexibilidade']).filter((a) => a.status === 'Concluída').length} concluídas).`,
    `${lev(['Processos robustos']).length} ações de qualidade e processos robustos; erro de previsão atual de ${S.kri('K11') ? S.kri('K11').hist[11] + '%' : '—'}.`,
  ];
};

X.principiosHtml = () => {
  const pr = S.state.principios;
  const auto = X.autoEvid();
  const tot = pr.reduce((s, p) => s + p.nota, 0);
  const weakest = pr.map((p, i) => ({ p, i })).sort((a, b) => a.p.nota - b.p.nota).slice(0, 3);
  return `<div class="grid-2 grid-wide-right gap-l">
    <div>
      <div class="maturity"><span class="kpi-value">${U.pct(tot / (pr.length * 4))}</span><span class="muted">de maturidade · ${tot} de ${pr.length * 4} pontos</span></div>
      ${C.radar(pr.map((_, i) => 'P' + (i + 1)), pr.map((p) => p.nota))}
      <h4>Onde melhorar primeiro</h4>
      <ol class="plain bullets">${weakest.map(({ p, i }) => `<li><b>P${i + 1}.</b> ${U.esc(DATA.PRINCIPIOS[i])} <span class="muted">(${DATA.MATURIDADE[p.nota]})</span></li>`).join('')}</ol>
    </div>
    <div class="principles">${pr.map((p, i) => `<div class="principle">
      <div class="pr-head"><span class="pr-n">${i + 1}</span><b>${U.esc(DATA.PRINCIPIOS[i])}</b></div>
      <div class="seg seg-5" role="group" aria-label="Nota do princípio ${i + 1}">${DATA.MATURIDADE.map((m, v) => `<button type="button" data-pr="${i}" data-v="${v}" aria-pressed="${p.nota === v}" data-tip="${m}">${v}</button>`).join('')}<span class="seg-lab">${DATA.MATURIDADE[p.nota]}</span></div>
      <p class="auto"><span class="label">O que os dados mostram</span> ${U.esc(auto[i])}</p>
      <textarea data-ev="${i}" rows="2" aria-label="Evidência do princípio ${i + 1}" placeholder="Registre a evidência que justifica a nota">${U.esc(p.evidencia)}</textarea>
    </div>`).join('')}</div>
  </div>`;
};

X.metodologiaHtml = () => `
  <div class="grid-2 gap-l">
    <div class="prose">
      <h3>Para que serve</h3>
      <p>Cadeias globais de suprimentos ficam expostas a eventos em qualquer elo: um incêndio num fornecedor de nível 2, uma greve no porto ou um ataque ao sistema de pedidos. A empresa fictícia NordEletro, fabricante de eletrodomésticos em Suape (PE), depende de placas eletrônicas e compressores da Ásia, aço e motores do Sul e Sudeste e de uma única fábrica. O módulo responde: quais riscos importam mais, onde está o elo mais fraco, quanto a empresa pode perder num ano e quais ações dão mais retorno.</p>
      <h3>Como usar</h3>
      <ol class="plain bullets">
        <li><b>Visão geral:</b> o painel executivo — indicadores-resumo, apetite a risco, matriz, tendência dos indicadores, exposição e mapa da cadeia. Clique em qualquer número, gráfico ou elo para ir direto ao assunto.</li>
        <li><b>Riscos:</b> filtre pela matriz, pelo nível ou pela categoria; “Novo risco” abre o cadastro.</li>
        <li><b>Plano de ações:</b> veja quanto o plano reduz, filtre por estratégia ou status e atualize o andamento de cada ação.</li>
        <li><b>Monitoramento:</b> registre a leitura dos indicadores, analise os sinais da rede e acompanhe a nota dos fornecedores.</li>
        <li><b>Simulações:</b> sorteie milhares de anos para ver a chance de um ano ruim e teste o que acontece se um elo parar.</li>
      </ol>
      <p>Em cada cartão, o ícone de informação ao lado do título explica como ler o gráfico. No cabeçalho de cada página, “Como usar esta página” resume os primeiros passos.</p>
      <h3>Premissas e limites</h3>
      <ul class="plain bullets">
        <li>Todos os dados são fictícios e servem para demonstração.</li>
        <li>Na simulação de perdas, os riscos são independentes; na prática, um evento grande pode disparar outros.</li>
        <li>O impacto é uma nota de 1 a 5; reduzir a perda em X% é uma aproximação para mover o risco na matriz.</li>
        <li>Os dados ficam no navegador de quem usa (localStorage); não há servidor nem login.</li>
      </ul>
    </div>
    <div class="prose">
      <h3>Fórmulas</h3>
      <dl class="formulas">
        <dt>Gravidade e nível</dt><dd>Chance (P) × impacto (I), de 1 a 5 cada. Baixo 1–4 · Moderado 5–9 · Alto 10–14 · Crítico 15–25. O impacto é a pior nota entre pessoas, reputação, processos e financeiro.</dd>
        <dt>Perda esperada por ano</dt><dd>λ × perda média, com λ = −ln(1 − p) e perda média = (mín + provável + máx) ÷ 3.</dd>
        <dt>Cenários “Hoje” e “Com o plano”</dt><dd>p<sub>res</sub> = p × Π(1 − redução da chance); perda<sub>res</sub> = perda × Π(1 − redução da perda). No cenário “Hoje”, ações em andamento contam pela porcentagem de progresso.</dd>
        <dt>Transferência</dt><dd>Perda retida = mín(perda, franquia) + (perda − franquia) × (1 − cobertura).</dd>
        <dt>Margem em risco de um elo</dt><dd>máx(0, TTR − TTS) × receita semanal dependente × margem de contribuição.</dd>
        <dt>Simulação Monte Carlo</dt><dd>Eventos ~ Poisson(λ) e perda por evento ~ Triangular. VaR 95% = percentil 95; CVaR 95% = média dos 5% piores anos.</dd>
        <dt>Fornecedores</dt><dd>Nota = média ponderada de seis critérios de 0 a 100. HHI = Σ (participação %)².</dd>
      </dl>
      <h3>Referências</h3>
      <ul class="plain refs">
        <li>CORRÊA, Henrique Luiz. <i>Administração de cadeias de suprimentos e logística: integração na era da Indústria 4.0</i>. 2. ed. São Paulo: Atlas, 2019.</li>
        <li>ABNT. <i>NBR ISO 31000: Gestão de riscos — Diretrizes</i>. Rio de Janeiro, 2018.</li>
        <li>SHEFFI, Yossi. <i>The Resilient Enterprise</i>. Cambridge: MIT Press, 2005.</li>
        <li>SIMCHI-LEVI, David; SCHMIDT, William; WEI, Yehua. From superstorms to factory fires. <i>Harvard Business Review</i>, jan.–fev. 2014.</li>
        <li>CHOPRA, Sunil; SODHI, ManMohan. Managing risk to avoid supply-chain breakdown. <i>MIT Sloan Management Review</i>, v. 46, n. 1, 2004.</li>
        <li>ALTMAN, Edward. Financial ratios, discriminant analysis and the prediction of corporate bankruptcy. <i>Journal of Finance</i>, v. 23, n. 4, 1968.</li>
      </ul>
    </div>
  </div>`;

X.glossarioHtml = () => `<p class="muted">Os termos que aparecem no sistema, em linguagem simples.</p>
  <dl class="gloss">${App.GLOSS.map(([t, d]) => `<div><dt>${U.esc(t)}</dt><dd>${U.esc(d)}</dd></div>`).join('')}</dl>`;

/* ==========================================================================
   Guia passo a passo (12 páginas): mapa do sistema e roteiro completo de uso
   ========================================================================== */
X.guidePage = U.clamp(+(U.storage.get('riscogcs-guia') || 0), 0, 11);
X.steps = (list) => `<ol class="man-steps">${list.map(([t, d]) => `<li><b>${t}</b><span>${d}</span></li>`).join('')}</ol>`;
X.tip = (t) => `<p class="man-tip">${I('info')}<span><b>Dica:</b> ${t}</span></p>`;
X.live = (cap, html) => `<figure class="man-live"><figcaption>${I('eye')} ${cap}</figcaption>${html}</figure>`;

/* Página 1: o ciclo de gestão de riscos e o mapa de todas as áreas */
X.sysMap = () => {
  const cycle = [
    ['plus', 'Identificar', 'Cadastro de riscos e sinais da rede', 6],
    ['alert', 'Avaliar', 'Matriz, registro e detalhes do risco', 4],
    ['checks', 'Tratar', 'Plano de ações', 7],
    ['activity', 'Monitorar', 'Indicadores, sinais e fornecedores', 8],
    ['flask', 'Testar', 'Simulações de perda e de parada', 10],
  ];
  const areas = [
    ['dashboard', 'Visão geral', 'O que exige atenção hoje', ['Indicadores-resumo', 'Apetite a risco', 'Matriz de riscos', 'Indicadores fora da tolerância', 'Exposição por categoria e por etapa', 'Mapa da cadeia e elo selecionado', 'Riscos prioritários', 'Eventos recentes e andamento do plano'], 2],
    ['alert', 'Riscos', 'Todos os riscos e onde estão', ['Cenário de avaliação', 'Matriz e quadrantes', 'Perda por categoria', 'Registro com filtros e ordenação', 'Critérios de pontuação', 'Detalhes de cada risco'], 4],
    ['checks', 'Plano de ações', 'O que está sendo feito', ['Indicadores do plano', 'Cascata de redução da perda', 'Estratégias de tratamento', 'Ações do plano', 'Retorno por real investido'], 7],
    ['activity', 'Monitoramento', 'Sinais de que um risco se aproxima', ['Filtros por situação', 'Indicadores-chave de risco', 'Sinais e eventos da rede', 'Avaliação dos fornecedores', 'Pesos e concentração de compras'], 8],
    ['flask', 'Simulações', 'Teste cenários antes que aconteçam', ['Perda no ano (Monte Carlo)', 'Parada de um elo', 'Resposta ágil × tardia'], 10],
    ['sliders', 'Ajuda e barra superior', 'Apoio em qualquer tela', ['Tour guiado', 'Como funciona: guia, método e glossário', 'Busca e notificações', 'Aparência'], 11],
  ];
  return `<div class="man-sub">O ciclo de gestão de riscos — e onde cada etapa acontece</div>
  <ol class="cycle">${cycle.map(([ic, t, d, pg], i) => `<li><button type="button" data-gp="${pg}" data-tip="Ver a página ${pg + 1} do guia"><span class="cy-dot">${I(ic)}</span><span class="cy-n">Etapa ${i + 1}</span><b>${t}</b><small>${d}</small></button></li>`).join('')}</ol>
  <div class="man-sub">O que existe em cada área do sistema</div>
  <div class="sysmap">${areas.map(([ic, t, d, items, pg]) => `<div class="sys-card" role="button" tabindex="0" data-gp="${pg}">
    <span class="sys-head"><span class="sys-ic">${I(ic)}</span><span><b>${t}</b><small>${d}</small></span></span>
    <ul>${items.map((x) => `<li>${x}</li>`).join('')}</ul><span class="sys-go">Ir para a página ${pg + 1} ${I('arrowRight')}</span></div>`).join('')}</div>`;
};

X.GUIDE = [
  {
    t: 'Mapa do sistema', where: 'Todo o sistema',
    lead: 'O RiscoGCS acompanha os riscos da cadeia de suprimentos da empresa — do fornecedor de matéria-prima até o cliente. Tudo gira em torno de um ciclo de seis etapas. Clique numa etapa ou numa área para ir direto à página do guia que a explica.',
    body: () => X.sysMap() + `<div class="man-cta"><span><b>Prefere aprender na prática?</b> O tour guiado percorre as telas com você, destacando onde clicar.</span><button class="btn btn-primary" type="button" data-tour-start>${I('compass')} Fazer o tour guiado</button></div>` + X.tip('Em qualquer tela, “Como usar esta página” resume os primeiros passos, e o ícone de informação ao lado do título de cada cartão explica como ler o gráfico.'),
    go: { label: 'Começar pela Visão geral', run: () => App.go('painel') },
  },
  {
    t: 'Navegar pela interface', where: 'Menu lateral, barra superior e cabeçalho',
    lead: 'Conheça as partes fixas da tela. Elas funcionam do mesmo jeito em todas as páginas.',
    body: () => X.steps([
      ['Escolha uma área no menu lateral.', 'Visão geral, Riscos, Plano de ações, Monitoramento e Simulações. Os números em vermelho mostram pendências: ações atrasadas e sinais novos.'],
      ['Busque qualquer coisa.', 'Clique na busca ou tecle Ctrl + K. Digite um código (R01, A05, K02), um elo, uma categoria ou um fornecedor e tecle Enter para abrir.'],
      ['Use a central de ajuda.', 'O botão “?” da barra superior reúne o tour guiado, este guia, o método e o glossário. O sino reúne sinais novos, ações atrasadas e indicadores críticos.'],
      ['Leia o cabeçalho da página.', 'A trilha mostra onde você está e a etiqueta ao lado do título resume a situação. À direita ficam “Como usar esta página” e a ação principal da página, como “Novo risco”.'],
      ['Leia cada cartão.', 'O título diz o que o cartão mostra e a linha abaixo explica como usá-lo. O ícone de informação ao lado do título abre a explicação completa.'],
      ['Ajuste a aparência.', 'O botão de lua alterna entre claro e escuro; o de paleta muda a cor de destaque, a densidade e o menu recolhido.'],
    ]) + X.tip('Em telas menores, recolha o menu lateral com o botão ao lado do logotipo para ganhar espaço.'),
    go: { label: 'Testar a busca', run: () => setTimeout(() => U.$('#searchInput').focus(), 80) },
  },
  {
    t: 'Visão geral: o resumo do dia', where: 'Menu › Visão geral · topo da página',
    lead: 'A primeira tela responde, em ordem, às perguntas mais importantes. Comece sempre por aqui.',
    body: () => {
      const pfA = M.portfolio('atual'), emp = S.state.empresa, ap = emp.apetite ? pfA.pea / emp.apetite : 0, band = App.APPETITE_BAND(ap);
      return `<div class="man-split">${X.steps([
        ['Leia os indicadores do topo.', 'Perda esperada por ano, uso do limite de perda, riscos ativos, elos sem cobertura, indicadores em alerta e ações atrasadas. Clique num indicador para abrir a lista correspondente.'],
        ['Confira o apetite a risco.', 'O medidor mostra quanto do limite anual de perda já está comprometido; a marca escura é o limite. Embaixo, a mesma perda sem ações, hoje e com o plano completo.'],
        ['Veja onde os riscos se concentram.', 'Na matriz, cada célula conta os riscos de uma combinação de chance e impacto. Clique numa célula para abrir o registro só com esses riscos.'],
        ['Observe a tendência dos indicadores.', 'Cada coluna é um mês: vermelho = indicadores críticos, amarelo = em atenção. Colunas crescendo indicam piora.'],
      ])}${X.live(`Medidor com os dados de hoje: ${U.money(pfA.pea)} por ano`, `<div class="ap-read"><span class="ap-val">${U.pct(ap)}</span><span class="ap-txt">do limite de <b>${U.money(emp.apetite)}</b></span></div>${C.meter({ value: ap, max: 1.5, color: V.lvColor(band), zones: [{ to: 0.6, color: 'var(--z-ok)' }, { to: 0.9, color: 'var(--z-warn)' }, { to: 1, color: 'var(--z-serious)' }, { to: 1.5, color: 'var(--z-crit)' }], label: 'Exemplo do medidor de apetite a risco', limitTip: 'Limite aceitável' })}`)}</div>`
        + X.tip('Os números são recalculados sempre que você muda um risco, uma ação ou a leitura de um indicador.');
    },
    go: { label: 'Abrir a Visão geral', run: () => App.go('painel') },
  },
  {
    t: 'Visão geral: exposição, mapa e elo', where: 'Menu › Visão geral · parte de baixo',
    lead: 'Desça a página para ver onde está o custo, por qual etapa da cadeia ele passa e o que acontece se um elo parar.',
    body: () => {
      const n = S.state.nodes.filter((x) => x.ttr != null).sort((a, b) => M.nodePI(b) - M.nodePI(a))[0];
      return X.steps([
        ['Compare as categorias.', '“Exposição por categoria” soma a perda esperada de cada tipo de risco, dividida por nível. Clique numa linha para filtrar o registro.'],
        ['Percorra as etapas da cadeia.', 'A tabela vai do fornecedor de nível 2 ao cliente e mostra o pior nível, os elos descobertos e a perda de cada etapa. Clique numa etapa para ver o elo mais crítico no mapa.'],
        ['Explore o mapa.', 'Clique num elo para selecioná-lo. Use + e −, Ctrl + rolagem e arraste para navegar; troque a cor entre “Nível de risco” e “Cobertura”.'],
        ['Analise o elo selecionado.', 'Os quatro números resumem o elo e as barras comparam quanto a empresa aguenta sem ele com quanto ele leva para voltar. O trecho vermelho são semanas sem abastecimento.'],
        ['Priorize.', '“Riscos prioritários” lista os mais graves hoje; troque para “Elos” para comparar recuperação e sobrevivência de toda a cadeia.'],
        ['Acompanhe eventos e plano.', 'No fim da página ficam os sinais recentes da rede e o andamento do plano, com os próximos prazos.'],
      ]) + (n ? X.live(`Recuperação × sobrevivência do elo mais fraco hoje: ${U.esc(n.nome)}`, C.ruler(n.ttr, n.tts)) : '')
        + X.tip('Em “Ajustar os tempos deste elo”, mude as semanas para testar uma hipótese — o painel recalcula na hora.');
    },
    go: { label: 'Ver o mapa da cadeia', run: () => { App.go('painel'); setTimeout(() => { const c = U.$('#netCard'); if (c) c.scrollIntoView({ behavior: U.calm() ? 'auto' : 'smooth', block: 'start' }); }, 120); } },
  },
  {
    t: 'Riscos: encontrar e filtrar', where: 'Menu › Riscos',
    lead: 'Aqui estão todos os riscos registrados. Use a matriz e os filtros para chegar rápido ao que interessa.',
    body: () => `<div class="man-split">${X.steps([
      ['Escolha o cenário de avaliação.', '“Sem ações”, “Hoje” ou “Com o plano”. Os riscos mudam de célula conforme as ações reduzem a chance e o impacto.'],
      ['Leia a matriz.', 'Para cima = mais provável; para a direita = mais impacto. Clique numa célula para listar só os riscos dela. “Quadrantes” mostra a resposta recomendada.'],
      ['Filtre por nível ou categoria.', 'Clique em Baixo, Moderado, Alto ou Crítico, ou numa linha de “Perda por categoria”. Os filtros ativos aparecem acima da tabela: clique no ✕ para remover.'],
      ['Refine o registro.', 'Busque por código, nome, causa ou elo, filtre por natureza e situação e ordene clicando no título de cada coluna.'],
      ['Abra os detalhes.', 'Clique numa linha para abrir o painel lateral do risco.'],
    ])}${X.live('Matriz com os riscos de hoje', V.heatmap('atual', { compact: true }))}</div>`
      + X.tip('“Exportar” gera uma planilha CSV que abre no Excel. “Critérios de pontuação”, no fim da página, mostra as escalas usadas para dar as notas.'),
    go: { label: 'Abrir Riscos', run: () => App.go('riscos') },
  },
  {
    t: 'Os detalhes do risco', where: 'Clique em qualquer código de risco (ex.: R01)',
    lead: 'O painel lateral reúne tudo sobre um risco: onde está, quão grave é, por que pode acontecer e o que está sendo feito.',
    body: () => X.steps([
      ['Leia o cabeçalho.', 'Código, título e as etiquetas de nível, situação, natureza e quadrante. Logo abaixo: elo, categoria, responsável, data, perda esperada e número de ações.'],
      ['Veja a avaliação.', 'A gravidade de hoje vai de 1 a 25 (chance × impacto) e a escala mostra em que faixa ela cai. A tabela compara os três cenários.'],
      ['Entenda causa e consequência.', '“Por que pode acontecer” e “O que acontece se ocorrer”, mais a perda mínima, mais provável e máxima de cada ocorrência.'],
      ['Confira o impacto por dimensão.', 'Pessoas, reputação, processos e financeiro. Vale a pior nota.'],
      ['Siga as recomendações.', 'Os quadros explicam como estimar e tratar esse tipo de risco e o que o nível dele exige.'],
      ['Aja sobre o risco.', 'No rodapé: “Editar risco”, “Criar ação” ou “Excluir” (pede confirmação antes).'],
    ]) + X.tip('Códigos de risco aparecem como links em várias telas — clique em qualquer um para abrir os detalhes.'),
    go: { label: 'Abrir um risco de exemplo', keep: true, run: () => { const t = M.portfolio('atual').list.slice().sort((a, b) => b.e.score - a.e.score || b.e.pea - a.e.pea)[0]; if (t) V.openRisk(t.r.id); } },
  },
  {
    t: 'Cadastrar um risco', where: 'Botão “Novo risco” no cabeçalho da Visão geral e de Riscos',
    lead: 'Um único formulário reúne tudo o que o risco precisa para entrar na matriz e no registro.',
    body: () => X.steps([
      ['Descreva o risco.', 'Dê um título que diga qual evento pode acontecer e escolha a categoria e a natureza: aleatório, acidental ou intencional.'],
      ['Diga onde ele está.', 'Escolha o elo da cadeia afetado, o responsável e a situação. Se houver, ligue o indicador que avisa antes.'],
      ['Estime a chance.', 'De 1 (raro) a 5 (quase certo), pela frequência esperada por ano.'],
      ['Avalie o impacto.', 'Dê notas de 1 a 5 para pessoas, reputação e processos. Vale a pior dimensão, incluindo a financeira.'],
      ['Informe as perdas.', 'Perda mínima, mais provável e máxima por ocorrência, em R$ mil. Elas definem o impacto financeiro e a perda esperada por ano.'],
      ['Explique e salve.', 'Descreva a causa e a consequência e clique em “Criar risco”. Ele entra na matriz e no registro na hora; depois, crie ações nos detalhes do risco.'],
    ]) + X.tip('Sinais da rede viram risco com “Transformar em risco”, que abre este formulário já preenchido. No mapa da cadeia, “Registrar risco neste elo” já traz o elo escolhido.'),
    go: { label: 'Abrir o cadastro', keep: true, run: () => V.riskForm(null) },
  },
  {
    t: 'Plano de ações', where: 'Menu › Plano de ações',
    lead: 'Mostra o que está sendo feito para reduzir os riscos, quanto custa e quanto da perda já foi evitada.',
    body: () => X.steps([
      ['Leia os indicadores do topo.', 'Perda sem ações, hoje e com o plano, mais o custo anual do plano e quanto ele evita.'],
      ['Siga a cascata.', 'Da perda sem ações até a meta: o degrau verde é o que já foi reduzido; o listrado, o que depende de concluir o plano.'],
      ['Atenda aos alertas.', 'O aviso amarelo lista riscos altos ou críticos ainda sem ação. Clique no código para abrir o risco e criar uma ação.'],
      ['Filtre por estratégia.', 'Reduzir a chance, reduzir o impacto ou transferir o custo. Clique de novo para limpar o filtro.'],
      ['Use a tabela de ações.', 'Filtre por situação — inclusive “Atrasadas” — e ordene por retorno, perda evitada, custo ou prazo. Clique numa ação para atualizar progresso, prazo ou responsável.'],
      ['Compare o retorno.', 'No fim da página, barras verdes evitam mais perda do que custam (retorno acima de 1×).'],
    ]) + X.tip('Para criar uma ação já ligada a um risco, abra os detalhes dele e use “Criar ação”. Ou use “Nova ação” no cabeçalho.'),
    go: { label: 'Abrir o Plano de ações', run: () => App.go('acoes') },
  },
  {
    t: 'Monitoramento: indicadores e sinais', where: 'Menu › Monitoramento › aba Indicadores e sinais',
    lead: 'Acompanhe o que costuma piorar antes de um problema acontecer e registre o que foi detectado na rede.',
    body: () => {
      const k = S.state.kris.find((x) => M.kriStatus(x) === 'crit') || S.state.kris[0];
      const st = M.kriStatus(k);
      return `<div class="man-split">${X.steps([
        ['Filtre pela situação.', 'Os quatro indicadores do topo filtram os cartões: críticos, em atenção, normais ou todos. Clique de novo para tirar o filtro.'],
        ['Leia um indicador.', 'A faixa colorida mostra os limites (verde, amarelo, vermelho) e o traço escuro, a leitura atual. A etiqueta de variação compara com o mês anterior.'],
        ['Registre a leitura do mês.', 'Clique no cartão, informe o valor no painel lateral, confira os limites e clique em “Salvar leitura”.'],
        ['Analise os sinais.', 'Para cada sinal: “Marcar como visto”, “Transformar em risco” (abre o cadastro já preenchido) ou “Descartar”.'],
        ['Registre um sinal novo.', '“Registrar sinal”, no cabeçalho ou no fim da lista, anota uma notícia, um aviso de parceiro ou uma leitura fora do normal.'],
      ])}${X.live('Indicador real, com a faixa de limites', `<div class="man-kri"><span class="kri-top"><b>${U.esc(k.nome)}</b>${V.statusPill(st)}</span><span class="kri-big">${U.num(k.hist[11], k.dec)}<small>${U.esc(k.unidade)}</small></span>${C.zone(k)}<small class="muted">${k.dir === 'maior' ? 'Melhor quando sobe' : 'Melhor quando cai'} · normal ${k.dir === 'maior' ? 'a partir de' : 'até'} ${U.num(k.verde, k.dec)} · crítico ${k.dir === 'maior' ? 'abaixo de' : 'acima de'} ${U.num(k.vermelho, k.dec)}</small></div>`)}</div>`
        + X.tip('O sino da barra superior avisa quando chegam sinais novos — e permite marcar todos como vistos de uma vez.');
    },
    go: { label: 'Abrir os indicadores', run: () => App.go('monitor', () => { App.monTab = 'kri'; }) },
  },
  {
    t: 'Monitoramento: fornecedores', where: 'Menu › Monitoramento › aba Fornecedores',
    lead: 'Compare a nota de risco dos fornecedores e veja onde as compras dependem demais de uma única fonte.',
    body: () => X.steps([
      ['Leia o resumo.', 'Quantos fornecedores são avaliados, quantos estão nas classes C ou D, quantos são fonte única e quantas compras estão concentradas.'],
      ['Leia a nota.', 'De 0 (risco mínimo) a 100 (máximo), com classes A, B, C e D. A barra colorida mostra quanto cada critério pesou.'],
      ['Abra os detalhes do fornecedor.', 'Clique na linha para ver, no painel lateral, a escala da nota, a composição, os dados de compra e as fontes alternativas.'],
      ['Ajuste os pesos.', 'Arraste os controles para dar mais ou menos importância a cada critério. Notas e classes mudam na hora.'],
      ['Verifique a concentração.', 'Quanto mais perto de 10.000 pontos, mais a compra depende de um só fornecedor — e maior o risco de parar junto com ele.'],
    ]) + X.tip('“Restaurar pesos” volta aos valores originais a qualquer momento.'),
    go: { label: 'Abrir Fornecedores', run: () => App.go('monitor', () => { App.monTab = 'forn'; }) },
  },
  {
    t: 'Simulações', where: 'Menu › Simulações',
    lead: 'Teste cenários antes que eles aconteçam: quanto pode custar um ano ruim e o que acontece se um elo parar.',
    body: () => '<div class="man-sub">Aba Perda no ano</div>' + X.steps([
      ['Rode a simulação.', 'Escolha quantos anos sortear, a semente (repete o mesmo sorteio) e o limite aceitável; clique em “Rodar simulação”.'],
      ['Compare os cenários.', 'Os cartões mostram a perda média, o ano ruim (1 em 20) e a chance de passar do limite. Clique num cartão para detalhar.'],
      ['Leia a curva e o histograma.', 'A curva mostra a chance de passar de cada valor; o histograma, quantos anos caem em cada faixa de perda.'],
    ]) + '<div class="man-sub">Aba Parada de um elo</div>' + X.steps([
      ['Escolha um caso.', 'Comece por um caso pronto (ex.: incêndio no fornecedor de placas) ou escolha o elo e ajuste a duração e o estoque.'],
      ['Compare as respostas.', 'Defina quanto a empresa demora para perceber e para ativar o fornecedor alternativo nas respostas ágil e tardia.'],
      ['Veja o resultado.', 'O gráfico mostra a produção dia a dia; a tabela, o custo de cada resposta. “Reagir cedo vale” é a diferença entre elas.'],
    ]) + X.tip('Na Visão geral, “Simular parada deste elo” abre esta tela já com o elo selecionado.'),
    go: { label: 'Abrir Simulações', run: () => App.go('simular') },
  },
  {
    t: 'Ajuda, busca e preferências', where: 'Barra superior e menu lateral',
    lead: 'Recursos que funcionam em qualquer tela para encontrar informações, tirar dúvidas e deixar a tela do seu jeito.',
    body: () => X.steps([
      ['Busque qualquer item.', 'Ctrl + K abre a busca: digite um código, um elo, uma categoria ou um fornecedor e tecle Enter.'],
      ['Acompanhe as notificações.', 'O sino reúne sinais novos, ações atrasadas e indicadores críticos; dá para marcar todos os sinais como vistos de uma vez.'],
      ['Exporte as tabelas.', 'O botão “Exportar” do registro de riscos e da lista de ações gera planilhas CSV, que abrem no Excel.'],
      ['Tire dúvidas.', '“Como usar esta página” resume os primeiros passos de cada tela, o ícone de informação de cada cartão explica o gráfico e o tour guiado percorre o sistema com você.'],
      ['Personalize a aparência.', 'Tema claro, escuro ou do sistema, cor de destaque, densidade compacta e menu recolhido. Tudo fica salvo neste navegador.'],
      ['Consulte o método.', 'Nesta janela, as abas Método, Glossário e Dez princípios explicam as fórmulas, os termos e a autoavaliação de maturidade.'],
    ]) + X.tip('Você chegou ao fim do guia. Para praticar, faça o tour guiado (botão “?” da barra superior › Tour guiado). Volte a este guia quando quiser pelo mesmo botão.'),
    go: { label: 'Fazer o tour guiado', run: () => Tour.start({ fresh: true }) },
  },
];

X.manualHtml = () => {
  const i = X.guidePage, p = X.GUIDE[i], n = X.GUIDE.length, num = (k) => String(k + 1).padStart(2, '0');
  return `<div class="manual">
    <nav class="man-toc" aria-label="Páginas do guia">
      <div class="man-prog"><span>Página ${i + 1} de ${n}</span><i style="--p:${((i + 1) / n) * 100}%"></i></div>
      <ol>${X.GUIDE.map((g, k) => `<li><button type="button" data-gp="${k}" class="${k === i ? 'on' : ''} ${k < i ? 'seen' : ''}" ${k === i ? 'aria-current="page"' : ''}><span class="man-n">${k < i ? I('check') : num(k)}</span><span>${g.t}</span></button></li>`).join('')}</ol>
    </nav>
    <article class="man-page" aria-live="polite">
      <div class="man-top"><span class="eyebrow">Página ${num(i)} de ${n}</span><span class="man-where">${I('focus')} ${U.esc(p.where)}</span></div>
      <h3 class="man-title" tabindex="-1">${p.t}</h3>
      <p class="man-lead">${p.lead}</p>
      ${p.body()}
      <div class="man-nav">
        <button class="btn" type="button" data-gp="${i - 1}" ${i === 0 ? 'disabled' : ''}>${I('chevLeft')} Anterior</button>
        <span class="man-dots" aria-hidden="true">${X.GUIDE.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</span>
        ${p.go ? `<button class="btn" type="button" data-ggo>${I('arrowUpRight')} ${p.go.label}</button>` : ''}
        ${i < n - 1 ? `<button class="btn btn-primary" type="button" data-gp="${i + 1}">Próxima ${I('chevRight')}</button>` : `<button class="btn btn-primary" type="button" data-gp="0">${I('refresh')} Voltar ao início</button>`}
      </div>
    </article>
  </div>`;
};

X.goPage = (k) => {
  X.guidePage = U.clamp(k, 0, X.GUIDE.length - 1);
  U.storage.set('riscogcs-guia', X.guidePage);
  X.drawAbout();
  const host = U.$('#aboutHost');
  if (!host) return;
  host.closest('.modal-body').scrollTop = 0;
  const t = U.$('.man-title', host);
  if (t) t.focus({ preventScroll: true });
};

/* Abre o guia direto numa página (usado pelo "Como usar esta página") */
X.openGuideAt = (k) => { X.guidePage = U.clamp(k, 0, X.GUIDE.length - 1); X.about('guia'); };

X.about = (tab) => {
  if (tab) X.aboutTab = tab;
  X._aboutClose = U.modal({ title: 'Como funciona', xl: true, body: '<div id="aboutHost"></div>' });
  const back = U.$('#modalRoot').lastElementChild;
  back.addEventListener('keydown', (e) => {
    if (X.aboutTab !== 'guia' || U.$('#modalRoot').lastElementChild !== back) return;
    if (e.target.closest && e.target.closest('input, textarea, select')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); X.goPage(X.guidePage + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); X.goPage(X.guidePage - 1); }
  });
  X.drawAbout();
  setTimeout(() => { const t = U.$('#aboutHost .man-title'); if (t) t.focus({ preventScroll: true }); }, 60);
};

X.drawAbout = () => {
  const host = U.$('#aboutHost');
  if (!host) return;
  const scroll = host.closest('.modal-body').scrollTop;
  const tab = X.aboutTab;
  host.innerHTML = `<div class="subtabs">${V.tabs('ab', [['guia', 'Guia passo a passo', 'book'], ['met', 'Método', 'info'], ['glo', 'Glossário', 'file'], ['pr', 'Dez princípios', 'target']], tab, 'Como funciona')}</div>
    ${tab === 'guia' ? X.manualHtml() : tab === 'pr' ? X.principiosHtml() : tab === 'glo' ? X.glossarioHtml() : X.metodologiaHtml()}`;
  host.closest('.modal-body').scrollTop = scroll;
  U.$$('[data-ab]', host).forEach((b) => b.addEventListener('click', () => { X.aboutTab = b.dataset.ab; X.drawAbout(); host.closest('.modal-body').scrollTop = 0; }));
  U.$$('[data-gp]', host).forEach((b) => b.addEventListener('click', () => X.goPage(+b.dataset.gp)));
  U.$$('[data-tour-start]', host).forEach((b) => b.addEventListener('click', () => { if (X._aboutClose) X._aboutClose(); Tour.start({ fresh: true }); }));
  const go = U.$('[data-ggo]', host);
  if (go) go.addEventListener('click', () => { const p = X.GUIDE[X.guidePage]; if (!p.go.keep && X._aboutClose) X._aboutClose(); p.go.run(); });
  U.$$('[data-pr]', host).forEach((b) => b.addEventListener('click', () => { S.state.principios[+b.dataset.pr].nota = +b.dataset.v; S.save(); X.drawAbout(); }));
  U.$$('[data-ev]', host).forEach((t) => t.addEventListener('change', () => { S.state.principios[+t.dataset.ev].evidencia = t.value; S.save(); U.toast('Evidência salva'); }));
};
