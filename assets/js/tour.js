/* ==========================================================================
   tour.js — tutorial guiado interativo
   Escurece a tela, destaca o elemento real com um holofote, navega entre as
   páginas e, nos passos de prática, espera a pessoa clicar no item destacado
   (com a opção "Fazer por mim"). Teclado: → próximo · ← voltar · Esc pausa.
   ========================================================================== */
const Tour = { on: false, i: 0, KEY: 'riscogcs-tour', DONE: 'riscogcs-tour-ok' };

Tour.CHAPTERS = [
  { id: 'nav', nome: 'Navegação' },
  { id: 'painel', nome: 'Visão geral' },
  { id: 'riscos', nome: 'Riscos' },
  { id: 'acoes', nome: 'Plano de ações' },
  { id: 'monitor', nome: 'Monitoramento' },
  { id: 'simular', nome: 'Simulações' },
  { id: 'tools', nome: 'Ferramentas' },
];

/* ---------- Utilidades ---------- */
Tour.wait = (ms) => new Promise((r) => setTimeout(r, ms));
Tour.find = (t) => (typeof t === 'function' ? t() : t ? U.$(t) : null);
Tour.els = (t) => (t ? [].concat(t).map(Tour.find).flat().filter((e) => e && e.getBoundingClientRect) : []);
Tour.card = (sel) => () => { const e = U.$(sel); return e ? e.closest('.card') : null; };
Tour.closeModals = () => U.$$('#modalRoot .modal-back').forEach((m) => m.remove());
Tour.waitEls = async (t, ms = 1600) => {
  const t0 = performance.now();
  let els = Tour.els(t);
  while (t && !els.length && performance.now() - t0 < ms) { await Tour.wait(80); els = Tour.els(t); }
  return els;
};
/* Célula da matriz com mais riscos (alvo de um passo prático) */
Tour.bestCell = () => U.$$('.heat-pick .heat-cell.has').sort((a, b) => (+(U.$('.heat-count', b) || {}).textContent || 0) - (+(U.$('.heat-count', a) || {}).textContent || 0))[0] || null;
Tour.topRiskId = () => { const t = M.portfolio('atual').list.slice().sort((a, b) => b.e.score - a.e.score || b.e.pea - a.e.pea)[0]; return t ? t.r.id : null; };

/* ---------- Roteiro ---------- */
Tour.STEPS = [
  /* Navegação */
  { ch: 'nav', route: 'painel', title: 'Bem-vindo ao tour guiado',
    text: 'Em poucos minutos você vai passar pelas cinco áreas do sistema e aprender a navegar entre elas. Quando um item aparecer com contorno pulsante, é a sua vez de clicar. Use os botões ou as setas ← → do teclado; Esc pausa o tour.' },
  { ch: 'nav', route: 'painel', target: '#tabs', side: true, place: 'right', title: 'Menu principal',
    text: 'Aqui ficam as cinco áreas: Visão geral, Riscos, Plano de ações, Monitoramento e Simulações. Os números em vermelho mostram pendências, como ações atrasadas e sinais novos.' },
  { ch: 'nav', route: 'painel', target: '#searchBox', place: 'bottom', title: 'Busca em todo o sistema',
    text: 'Encontre qualquer risco, ação, elo, indicador ou fornecedor. Digite um código (R01, A05) ou um nome e tecle Enter. Atalho: Ctrl + K.' },
  { ch: 'nav', route: 'painel', target: '#helpBtn', place: 'bottom', title: 'Central de ajuda',
    text: 'O botão “?” reúne o tour guiado, o guia passo a passo em 12 páginas, o método com as fórmulas e o glossário.' },
  { ch: 'nav', route: 'painel', target: '#bellBtn', place: 'bottom', title: 'Notificações',
    text: 'O sino reúne o que pede atenção: sinais novos, ações atrasadas e indicadores críticos. Clique num item para ir direto a ele.' },
  { ch: 'nav', route: 'painel', target: ['#themeBtn', '#paletteBtn'], place: 'bottom', title: 'Tema e aparência',
    text: 'A lua alterna entre claro e escuro. A paleta muda a cor de destaque, a densidade das telas e o menu recolhido.' },
  { ch: 'nav', route: 'painel', target: '.page-head', place: 'bottom', title: 'O cabeçalho de cada página',
    text: 'A trilha mostra onde você está e a etiqueta ao lado do título resume a situação. À direita: “Como usar esta página” e a ação principal da página, como “Novo risco”.' },

  /* Visão geral */
  { ch: 'painel', route: 'painel', target: '#kpiStrip', place: 'bottom', title: 'Indicadores-resumo',
    text: 'Seis números respondem ao que importa hoje: perda esperada, uso do limite, riscos ativos, elos sem cobertura, indicadores em alerta e ações atrasadas. Clique num indicador para abrir a lista correspondente.' },
  { ch: 'painel', route: 'painel', target: '#cardAppetite', place: 'right', title: 'Apetite a risco',
    text: () => { const pf = M.portfolio('atual'), ap = S.state.empresa.apetite; return `O medidor mostra quanto do limite anual de perda já está comprometido. Hoje: <b>${U.money(pf.pea)} por ano</b>, ${U.pct(ap ? pf.pea / ap : 0)} do limite de ${U.money(ap)}. Embaixo, a mesma perda sem ações, hoje e com o plano completo.`; } },
  { ch: 'painel', route: 'painel', target: '#cardMatrix', place: 'right', title: 'Matriz de riscos',
    text: 'Cada célula conta os riscos ativos de uma combinação de chance e impacto. Clique numa célula para abrir o registro só com esses riscos.' },
  { ch: 'painel', route: 'painel', target: () => U.$('#cardKri .help-btn'), action: 'click', place: 'left', block: 'start', pad: 6, round: 12, title: 'Como ler cada gráfico',
    text: 'Todo cartão tem um ícone de informação ao lado do título, com a explicação em linguagem simples.', doText: 'Clique no ícone de informação destacado.' },
  { ch: 'painel', route: 'painel', target: '.help-pop', keepPop: true, place: 'left', title: 'Explicação aberta',
    text: 'Aqui está como ler a tendência dos indicadores. Para fechar, use o ✕ ou clique fora. Faça isso sempre que tiver dúvida sobre um gráfico.',
    enter: () => { if (!U.$('.help-pop')) { const b = U.$('#cardKri .help-btn'); if (b) UI.openHelp(b); } }, exit: () => UI.closePop() },
  { ch: 'painel', route: 'painel', target: '#cardCats', place: 'top', title: 'Exposição por categoria',
    text: 'Que tipo de risco custa mais por ano, dividido por nível. Clique numa linha para abrir o registro só com os riscos daquela categoria.' },
  { ch: 'painel', route: 'painel', target: () => [U.$('#cardTiers .card-head'), U.$('#cardTiers .table-wrap')], place: 'top', title: 'Exposição por etapa da cadeia',
    text: 'As etapas vão do fornecedor de nível 2 ao cliente, com o pior nível, os elos descobertos e a perda de cada uma. Clique numa etapa para ver o elo mais crítico no mapa.' },
  { ch: 'painel', route: 'painel', target: '#netCard .map-wrap', place: 'top', title: 'Mapa da cadeia de suprimentos',
    text: 'Cada caixa é um elo, organizado por etapa; as linhas mostram por onde passam materiais e informações. Use + e − (ou Ctrl + rolagem) para aproximar e arraste para mover.',
    prep: () => { App.netView = { k: 1, x: 0, y: 0 }; App.netColor = 'risco'; }, rerender: true },
  { ch: 'painel', route: 'painel', target: '#netCard [data-node="n_fab"]', action: 'click', pad: 6, round: 10, title: 'Selecione um elo',
    text: 'Vamos ver o que acontece se a fábrica parar.', doText: 'Clique em “Fábrica Suape” no mapa.',
    prep: () => { App.netView = { k: 1, x: 0, y: 0 }; } },
  { ch: 'painel', route: 'painel', target: () => [U.$('.node-panel .kv-row'), U.$('.node-panel .ruler')], title: 'O que acontece se o elo parar',
    prep: () => { App.netSel = 'n_fab'; App.tuneOpen = false; }, rerender: true,
    text: () => { const n = S.node('n_fab'); return n ? `A fábrica aguenta <b>${U.wk(n.tts)} semanas</b> sem parar a produção, mas leva <b>${U.wk(n.ttr)}</b> para voltar: são ${U.num(Math.max(0, n.ttr - n.tts), 1)} semanas sem abastecimento e ${U.money(M.nodePI(n))} de margem em risco.` : 'As barras comparam quanto a empresa aguenta sem o elo com quanto ele leva para voltar.'; } },
  { ch: 'painel', route: 'painel', target: '#cardEvents', place: 'top', title: 'Eventos e sinais recentes',
    text: 'Os sinais mais recentes captados na rede, com a severidade (ícone à esquerda) e a situação de cada um. Clique num sinal para analisá-lo no Monitoramento.' },
  { ch: 'painel', route: 'painel', target: () => { const c = U.$('#cardPlan'); return c ? [U.$('.card-head', c), U.$('.status-bar', c), U.$('.legend-row', c), ...U.$$('tbody tr', c).slice(0, 2)] : null; }, place: 'top', title: 'Andamento do plano de ações',
    text: 'A barra divide as ações em concluídas, em andamento e planejadas. Embaixo, os próximos prazos, começando pelas atrasadas. Clique numa ação para atualizá-la.' },

  /* Riscos */
  { ch: 'riscos', route: 'painel', target: '#tabs [data-tab="riscos"]', side: true, action: 'click', place: 'right', pad: 4, title: 'Agora, os riscos',
    text: 'Para trocar de área, use o menu lateral.', doText: 'Clique em “Riscos” no menu.' },
  { ch: 'riscos', route: 'riscos', target: '.scope-bar', place: 'bottom', title: 'Escolha o cenário',
    prep: () => { Object.assign(App.reg, App.REG0); App.reg.view = 'matriz'; App.mode = 'atual'; }, rerender: true,
    text: '“Sem ações”, “Hoje” ou “Com o plano”: os riscos mudam de lugar conforme as ações reduzem a chance e o impacto. Começamos por “Hoje”.' },
  { ch: 'riscos', route: 'riscos', target: '#cardRiskMatrix .heat-pick', place: 'right', title: 'Matriz de riscos',
    text: 'Para cima, mais provável; para a direita, mais impacto. O número em cada célula é a quantidade de riscos ali.' },
  { ch: 'riscos', route: 'riscos', target: Tour.bestCell, action: 'click', place: 'right', pad: 5, round: 8, title: 'Filtre pela matriz',
    text: 'Clicar numa célula mostra só os riscos dela no registro ao lado.', doText: 'Clique na célula destacada.',
    prep: () => { App.reg.cell = null; App.reg.quad = null; }, rerender: true },
  { ch: 'riscos', route: 'riscos', target: '.active-filters', place: 'bottom', title: 'Filtros ativos',
    enter: () => { if (!App.reg.cell) { const c = Tour.bestCell(); if (c) c.dispatchEvent(new MouseEvent('click', { bubbles: true })); } },
    text: 'Cada filtro vira uma etiqueta acima da tabela. Clique no ✕ para remover um filtro, ou em “Limpar todos” para voltar ao registro completo.' },
  { ch: 'riscos', route: 'riscos', target: () => U.$('#riskTable tbody tr[data-open-risk]'), action: 'click', place: 'bottom', pad: 4, round: 8, title: 'Abra os detalhes de um risco',
    text: 'Cada linha do registro é um risco. Os detalhes abrem num painel lateral.', doText: 'Clique na primeira linha da tabela.' },
  { ch: 'riscos', modal: true, target: () => [U.$('.drawer .modal-head'), U.$('.drawer .rd-meta')], place: 'left', title: 'Os detalhes do risco',
    enter: () => { if (!U.$('.drawer .rd-meta')) { const r = U.$('#riskTable tbody tr[data-open-risk]'); V.openRisk(r ? r.dataset.openRisk : Tour.topRiskId()); } },
    text: 'O painel lateral abre por cima da página: código, título e etiquetas de nível, situação e natureza. Logo abaixo, elo, categoria, responsável e perda esperada.' },
  { ch: 'riscos', modal: true, target: '.drawer .rd-score', place: 'left', title: 'Gravidade e próximos passos',
    enter: () => { if (!U.$('.drawer .rd-meta')) V.openRisk(Tour.topRiskId()); },
    text: 'A gravidade vai de 1 a 25 (chance × impacto) e a escala mostra em que faixa ela cai. No rodapé do painel ficam “Editar risco”, “Criar ação” e “Excluir”. Vamos fechar o painel e seguir.',
    exit: () => Tour.closeModals() },
  { ch: 'riscos', route: 'riscos', target: '#btnPrimary', place: 'bottom', pad: 6, title: 'Cadastrar um risco',
    text: '“Novo risco” abre o formulário de cadastro: título, elo, chance, impacto e perdas por ocorrência. O risco entra na matriz e no registro assim que é criado.' },

  /* Plano de ações */
  { ch: 'acoes', route: 'riscos', target: '#tabs [data-tab="acoes"]', side: true, action: 'click', place: 'right', pad: 4, title: 'Plano de ações',
    text: 'Agora veja o que está sendo feito para reduzir os riscos.', doText: 'Clique em “Plano de ações” no menu.',
    prep: () => { Object.assign(App.reg, App.REG0); } },
  { ch: 'acoes', route: 'acoes', target: '#cardWaterfall', place: 'right', title: 'Redução da perda esperada',
    prep: () => { App.act.estr = ''; App.act.status = ''; }, rerender: true,
    text: 'A cascata vai da perda sem ações até a meta do plano. O degrau verde é o que já foi reduzido; o listrado, o que ainda depende de concluir as ações.' },
  { ch: 'acoes', route: 'acoes', target: '#cardStrategies', place: 'left', title: 'Estratégias de tratamento',
    text: 'Reduzir a chance, reduzir o impacto ou transferir o custo. Clique numa estratégia para filtrar as ações; clique de novo para limpar.' },
  { ch: 'acoes', route: 'acoes', target: () => { const c = U.$('#cardActions'); return c ? [U.$('.card-head', c), U.$('.tbl-toolbar', c), ...U.$$('#actTable tbody tr', c).slice(0, 3)] : null; }, place: 'top', block: 'start', title: 'Ações do plano',
    text: 'Filtre por situação — inclusive “Atrasadas” —, ordene por retorno ou prazo e clique numa ação para atualizar o andamento, o prazo ou o responsável.' },

  /* Monitoramento */
  { ch: 'monitor', route: 'acoes', target: '#tabs [data-tab="monitor"]', side: true, action: 'click', place: 'right', pad: 4, title: 'Monitoramento',
    text: 'Hora de ver os sinais de que um risco pode estar chegando.', doText: 'Clique em “Monitoramento” no menu.',
    prep: () => { App.monTab = 'kri'; App.kriFilter = ''; App.alertFilter = 'abertos'; } },
  { ch: 'monitor', route: 'monitor', target: '#kriFilter', place: 'bottom', title: 'Filtros por situação',
    prep: () => { App.monTab = 'kri'; App.kriFilter = ''; App.alertFilter = 'abertos'; }, rerender: true,
    text: 'Quantos indicadores estão críticos, em atenção ou normais. Clique num desses cartões para filtrar a lista; clique de novo para ver todos.' },
  { ch: 'monitor', route: 'monitor', target: () => U.$('.kri-card'), place: 'right', title: 'Um indicador por cartão',
    text: 'A faixa mostra os limites (verde, amarelo, vermelho) e o traço escuro é a leitura atual; a etiqueta compara com o mês anterior. Clique no cartão para registrar a leitura do mês.' },
  { ch: 'monitor', route: 'monitor', target: () => (U.$$('#cardSignals .alert').find((a) => U.$('.alert-btns button', a)) || null), place: 'left', title: 'Sinais da rede',
    text: 'Para cada sinal: “Marcar como visto”, “Transformar em risco” (abre o cadastro já preenchido) ou “Descartar”.' },
  { ch: 'monitor', route: 'monitor', target: '#phTabs [data-mon="forn"]', action: 'click', place: 'bottom', pad: 4, title: 'Fornecedores',
    text: 'A segunda aba do Monitoramento avalia os fornecedores.', doText: 'Clique na aba “Fornecedores”.' },
  { ch: 'monitor', route: 'monitor', target: '#cardWeights', place: 'top', title: 'Nota e pesos',
    prep: () => { App.monTab = 'forn'; }, rerender: true,
    text: 'Cada fornecedor tem uma nota de risco de 0 a 100, na tabela acima. Arraste os pesos para mudar a importância de cada critério — notas e classes mudam na hora.' },

  /* Simulações */
  { ch: 'simular', route: 'monitor', target: '#tabs [data-tab="simular"]', side: true, action: 'click', place: 'right', pad: 4, title: 'Simulações',
    text: 'Por fim, teste cenários antes que eles aconteçam.', doText: 'Clique em “Simulações” no menu.',
    prep: () => { App.simTab = 'mc'; App.monTab = 'kri'; } },
  { ch: 'simular', route: 'simular', target: '#cardMcParams', place: 'bottom', title: 'Perda no ano',
    prep: () => { App.simTab = 'mc'; }, rerender: true,
    text: 'O sistema sorteia milhares de anos possíveis. Ajuste o número de anos e o limite aceitável e clique em “Rodar simulação”.' },
  { ch: 'simular', route: 'simular', target: '#mcScen', place: 'bottom', title: 'Compare os cenários',
    text: 'Perda média, o ano ruim (1 em 20) e a chance de passar do limite — sem ações, hoje e com o plano. Clique num cartão para detalhar os gráficos.' },
  { ch: 'simular', route: 'simular', target: '#phTabs [data-sim="dis"]', action: 'click', place: 'bottom', pad: 4, title: 'Parada de um elo',
    text: 'A segunda simulação mostra o que acontece se um elo da cadeia parar.', doText: 'Clique na aba “Parada de um elo”.' },
  { ch: 'simular', route: 'simular', target: '.preset-row', place: 'bottom', title: 'Casos prontos',
    prep: () => { App.simTab = 'dis'; }, rerender: true,
    text: 'Escolha um caso — como o incêndio no fornecedor de placas — e compare a resposta ágil com a tardia. O resultado mostra quanto vale reagir cedo.' },

  /* Ferramentas */
  { ch: 'tools', route: 'painel', target: '#tabs [data-cmd="about"]', side: true, place: 'right', pad: 4, title: 'Como funciona',
    prep: () => { App.simTab = 'mc'; },
    text: 'Aqui está o guia completo em 12 páginas, o método, o glossário e a autoavaliação de maturidade. Eles também abrem pelo botão “?” da barra superior.' },
  { ch: 'tools', route: 'painel', target: '#tabs [data-cmd="tour"]', side: true, place: 'right', pad: 4, title: 'Volte quando quiser',
    text: 'O tour fica aqui no menu e na central de ajuda. Para rever só uma área, use “Como usar esta página” › “Fazer o tour desta página”.' },
  { ch: 'tools', route: 'painel', final: true, title: 'Tudo pronto!',
    text: 'Você passou pelas cinco áreas e aprendeu a navegar entre elas. Comece pela Visão geral; o ícone de informação de cada cartão está sempre lá para ajudar.' },
];

/* ---------- Montagem da camada ---------- */
Tour.mount = () => {
  if (Tour.root) return;
  const r = document.createElement('div');
  r.className = 'tour';
  r.hidden = true;
  r.innerHTML = '<div class="tour-block"></div><div class="tour-spot none"></div><div class="tour-card" role="dialog" aria-modal="false" aria-labelledby="tourTitle"></div>';
  document.body.appendChild(r);
  Tour.root = r;
  Tour.block = U.$('.tour-block', r);
  Tour.spot = U.$('.tour-spot', r);
  Tour.cardEl = U.$('.tour-card', r);
  /* Clique fora do destaque: não age na tela; só chama atenção para o cartão */
  const nudge = (e) => { e.preventDefault(); e.stopPropagation(); Tour.cardEl.classList.remove('shake'); void Tour.cardEl.offsetWidth; Tour.cardEl.classList.add('shake'); };
  Tour.block.addEventListener('mousedown', nudge);
  Tour.block.addEventListener('click', nudge);
  /* A rolagem do mouse continua rolando a página por baixo */
  Tour.block.addEventListener('wheel', (e) => {
    const box = U.$('#modalRoot .modal-back:last-child .modal-body') || U.$('#main');
    if (box) box.scrollBy({ top: e.deltaY, left: e.deltaX });
  }, { passive: true });
  /* Detecta o clique da pessoa no item destacado (passos práticos) */
  document.addEventListener('click', (e) => {
    if (!Tour.on) return;
    const s = Tour.STEPS[Tour.i];
    if (s.action !== 'click' || !Tour.target || e.target.closest('.tour')) return;
    if (Tour.target.contains(e.target) || e.target === Tour.target || (Tour.clickSel && e.target.closest(Tour.clickSel))) {
      const at = Tour.i;
      setTimeout(() => { if (Tour.on && Tour.i === at) Tour.go(at + 1); }, s.after || 420);
    }
  }, true);
  document.addEventListener('keydown', (e) => {
    if (!Tour.on) return;
    const typing = e.target.closest && e.target.closest('input, textarea, select');
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); Tour.stop(false); return; }
    if (typing) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); e.stopImmediatePropagation(); Tour.next(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopImmediatePropagation(); Tour.back(); }
  }, true);
  const reflow = () => { if (Tour.on && !Tour.raf) Tour.raf = requestAnimationFrame(() => { Tour.raf = 0; Tour.place(); }); };
  window.addEventListener('resize', reflow);
  document.addEventListener('scroll', reflow, true);
  Tour.reflow = reflow;
};

/* ---------- Ciclo de vida ---------- */
Tour.start = (opts = {}) => {
  Tour.mount();
  UI.closePop();
  UI.closeSearch();
  const saved = U.storage.get(Tour.KEY);
  Tour.on = true;
  document.documentElement.classList.add('touring');
  Tour.root.hidden = false;
  if (opts.at != null) return Tour.go(opts.at);
  if (!opts.fresh && saved && saved.step > 0 && saved.step < Tour.STEPS.length - 1) return Tour.chooser(saved.step);
  return Tour.go(0);
};
Tour.startChapter = (ch) => {
  const k = Tour.STEPS.findIndex((s) => s.ch === ch);
  Tour.start({ at: k < 0 ? 0 : k });
};
Tour.chooser = (k) => {
  Tour.i = k;
  Tour.choosing = true;
  Tour.target = null;
  Tour.layout([], null);
  const c = Tour.cardEl;
  c.innerHTML = `<div class="tc-top"><span class="tc-chap">${I('compass')} Tour guiado</span><button class="icon-btn tc-x" type="button" data-t="stop" aria-label="Fechar o tour">${I('x')}</button></div>
    <div class="tc-body"><h3 id="tourTitle" class="tc-title">Continuar de onde parou?</h3>
      <div class="tc-text"><p>Você pausou no passo ${k + 1} de ${Tour.STEPS.length} (${Tour.CHAPTERS.find((x) => x.id === Tour.STEPS[k].ch).nome}).</p></div></div>
    <div class="tc-foot"><button class="btn" type="button" data-t="restart">${I('refresh')} Começar do início</button><span class="spacer"></span><button class="btn btn-primary" type="button" data-t="resume">Continuar ${I('chevRight')}</button></div>`;
  c.onclick = (e) => {
    const b = e.target.closest('[data-t]');
    if (!b) return;
    if (b.dataset.t === 'stop') Tour.stop(false, true);
    if (b.dataset.t === 'restart') Tour.go(0);
    if (b.dataset.t === 'resume') Tour.go(k);
  };
  Tour.place();
  setTimeout(() => { const b = U.$('[data-t="resume"]', c); if (b) b.focus(); }, 60);
};
Tour.stop = (done, quiet) => {
  const s = Tour.STEPS[Tour.i];
  if (s && s.exit) s.exit();
  Tour.on = false;
  Tour.target = null;
  document.documentElement.classList.remove('touring');
  if (Tour.root) { Tour.root.hidden = true; Tour.cardEl.dataset.placed = ''; }
  UI.closeNav();
  if (done) {
    U.storage.del(Tour.KEY);
    U.storage.set(Tour.DONE, 1);
    U.toast('Tour concluído. Bom trabalho!');
  } else if (!quiet) {
    U.storage.set(Tour.KEY, { step: Tour.i });
    U.toast(`Tour pausado no passo ${Tour.i + 1}. Retome em Ferramentas › Tour guiado`, 'info');
  }
};
Tour.next = () => {
  const s = Tour.STEPS[Tour.i];
  if (!s) return;
  if (s.final) return Tour.stop(true);
  if (s.action === 'click' && Tour.target) {
    Tour.target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    return;
  }
  Tour.go(Tour.i + 1);
};
Tour.back = () => { if (Tour.i > 0) Tour.go(Tour.i - 1); };

/* Mostra um passo: navega, prepara a tela, rola até o alvo e posiciona o holofote */
Tour.go = async (k) => {
  if (!Tour.on) return;
  Tour.choosing = false;
  k = U.clamp(k, 0, Tour.STEPS.length - 1);
  const prev = Tour.STEPS[Tour.i];
  if (prev && Tour.i !== k && prev.exit) prev.exit();
  Tour.i = k;
  const s = Tour.STEPS[k];
  const token = (Tour.token = (Tour.token || 0) + 1);
  U.storage.set(Tour.KEY, { step: k });
  if (!s.keepPop) UI.closePop();
  if (!s.modal) Tour.closeModals();
  if (s.side && !UI.desk()) UI.openNav(); else if (!UI.desk()) UI.closeNav();
  Tour.cardEl.classList.add('busy');
  if (s.prep) s.prep();
  if (s.route && App.current !== s.route) { App.go(s.route); await Tour.wait(90); }
  else if (s.prep && s.rerender) App.render();
  if (s.enter) { s.enter(); await Tour.wait(160); }
  if (token !== Tour.token) return;
  const els = await Tour.waitEls(s.target);
  if (token !== Tour.token) return;
  Tour.target = els[0] || null;
  Tour.clickSel = typeof s.target === 'string' ? s.target : Tour.target && Tour.target.dataset && Tour.target.dataset.cell ? `[data-cell="${Tour.target.dataset.cell}"]` : null;
  if (els[0]) {
    els[0].scrollIntoView({ block: s.block || 'center', inline: 'nearest', behavior: U.calm() ? 'auto' : 'smooth' });
    await Tour.wait(U.calm() ? 40 : 430);
  }
  if (token !== Tour.token) return;
  Tour.draw();
  Tour.cardEl.classList.remove('busy');
  Tour.place();
  /* O cartão fica fixo no canto inferior direito: se ele cobrir o item destacado, a página rola para liberá-lo */
  if (els.length && await Tour.clearCard(els)) {
    if (token !== Tour.token) return;
    Tour.place();
  }
  [120, 300, 650, 1000].forEach((ms) => setTimeout(() => { if (token === Tour.token) Tour.place(); }, ms));
  const btn = U.$('[data-t="next"]', Tour.cardEl);
  if (btn) btn.focus({ preventScroll: true });
};

/* Conteúdo do cartão */
Tour.draw = () => {
  const s = Tour.STEPS[Tour.i], n = Tour.STEPS.length;
  const chIdx = Tour.CHAPTERS.findIndex((c) => c.id === s.ch);
  const text = typeof s.text === 'function' ? s.text() : s.text;
  const missing = s.target && !Tour.target;
  Tour.cardEl.innerHTML = `
    <div class="tc-top"><span class="tc-chap">${I('compass')} ${Tour.CHAPTERS[chIdx].nome}</span><span class="tc-count">Passo ${Tour.i + 1} de ${n}</span>
      <button class="icon-btn tc-x" type="button" data-t="stop" aria-label="Pausar o tour" data-tip="Pausar (Esc)">${I('x')}</button></div>
    <div class="tc-prog" aria-hidden="true"><i style="width:${((Tour.i + 1) / n) * 100}%"></i></div>
    <div class="tc-body">
      <h3 id="tourTitle" class="tc-title">${s.title}</h3>
      <div class="tc-text"><p>${text}</p>
        ${missing ? '<p class="tc-miss">Este item não está visível agora. Clique em “Próximo” para seguir.</p>' : ''}
        ${s.action === 'click' && !missing ? `<p class="tc-do"><i aria-hidden="true"></i>${s.doText || 'Clique no item destacado para continuar.'}</p>` : ''}</div>
    </div>
    <div class="tc-foot">
      <button class="btn btn-quiet" type="button" data-t="back" ${Tour.i === 0 ? 'disabled' : ''}>${I('chevLeft')} Voltar</button>
      <span class="tc-chaps" role="group" aria-label="Capítulos do tour">${Tour.CHAPTERS.map((c, k) => `<button type="button" data-t="ch" data-ch="${c.id}" class="${k === chIdx ? 'on' : k < chIdx ? 'done' : ''}" aria-label="Capítulo: ${c.nome}" data-tip="${c.nome}"></button>`).join('')}</span>
      <button class="btn btn-primary" type="button" data-t="next">${s.final ? `${I('check')} Concluir` : s.action === 'click' && !missing ? 'Fazer por mim' : `Próximo ${I('chevRight')}`}</button>
    </div>`;
  Tour.cardEl.onclick = (e) => {
    const b = e.target.closest('[data-t]');
    if (!b) return;
    const t = b.dataset.t;
    if (t === 'stop') Tour.stop(false);
    if (t === 'back') Tour.back();
    if (t === 'next') { if (missing) Tour.go(Tour.i + 1); else Tour.next(); }
    if (t === 'ch') Tour.startChapter(b.dataset.ch);
  };
};

/* Holofote + bloqueio com "furo" (só nos passos práticos o item destacado recebe cliques) */
Tour.layout = (els, s) => {
  const vw = window.innerWidth, vh = window.innerHeight;
  const sp = Tour.spot;
  if (!els.length) {
    Object.assign(sp.style, { top: vh / 2 - 1 + 'px', left: vw / 2 - 1 + 'px', width: '2px', height: '2px', borderRadius: '50%' });
    sp.className = 'tour-spot none';
    Tour.block.style.clipPath = '';
    return null;
  }
  const rs = els.map((e) => e.getBoundingClientRect());
  const pad = s && s.pad != null ? s.pad : 10;
  let L = Math.min(...rs.map((r) => r.left)) - pad, T = Math.min(...rs.map((r) => r.top)) - pad;
  let R = Math.max(...rs.map((r) => r.right)) + pad, B = Math.max(...rs.map((r) => r.bottom)) + pad;
  L = Math.max(4, L); T = Math.max(4, T); R = Math.min(vw - 4, R); B = Math.min(vh - 4, B);
  Object.assign(sp.style, { top: T + 'px', left: L + 'px', width: Math.max(0, R - L) + 'px', height: Math.max(0, B - T) + 'px', borderRadius: (s && s.round != null ? s.round : 14) + 'px' });
  sp.className = 'tour-spot' + (s && s.action === 'click' ? ' act' : '');
  Tour.block.style.clipPath = s && s.action === 'click'
    ? `polygon(evenodd, 0 0, ${vw}px 0, ${vw}px ${vh}px, 0 ${vh}px, 0 0, ${L}px ${T}px, ${R}px ${T}px, ${R}px ${B}px, ${L}px ${B}px, ${L}px ${T}px)`
    : '';
  return { L, T, R, B };
};

/* Reposiciona o holofote e ajusta a largura do cartão (que fica sempre no canto inferior direito) */
Tour.place = () => {
  if (!Tour.on || !Tour.root) return;
  const s = Tour.choosing ? null : Tour.STEPS[Tour.i];
  const els = s && s.target ? Tour.els(s.target) : [];
  if (els.length && s && s.action === 'click') Tour.target = els[0];
  Tour.layout(els, s);
  Tour.size(els);
};

/* O cartão acompanha a largura da área em foco, entre 480 e 860 px (e nunca maior que a tela).
   Em áreas largas, título e texto ficam lado a lado, em colunas, para a leitura ficar confortável. */
Tour.WIDE = 640;
Tour.size = (els) => {
  const c = Tour.cardEl, vw = window.innerWidth;
  if (vw < 700) { c.style.width = ''; c.classList.remove('wide'); return; }
  const maxW = Math.min(860, vw - 48), minW = Math.min(480, maxW);
  let w = Tour.WIDE;
  if (els.length) {
    const rs = els.map((e) => e.getBoundingClientRect());
    w = Math.max(...rs.map((r) => r.right)) - Math.min(...rs.map((r) => r.left));
  }
  w = Math.round(U.clamp(w, minW, maxW));
  if (c.style.width !== w + 'px') c.style.width = w + 'px';
  c.classList.toggle('wide', w >= Tour.WIDE);
};

/* Primeiro ancestral com rolagem vertical (a página principal ou o corpo de uma janela) */
Tour.scroller = (el) => {
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const o = getComputedStyle(p).overflowY;
    if ((o === 'auto' || o === 'scroll') && p.scrollHeight > p.clientHeight + 1) return p;
  }
  return null;
};

/* Se o item destacado ficar por baixo do cartão, rola até ele aparecer acima do cartão */
Tour.clearCard = async (els) => {
  const c = Tour.cardEl.getBoundingClientRect();
  const rs = els.map((e) => e.getBoundingClientRect()), pad = 12;
  const box = { L: Math.min(...rs.map((r) => r.left)) - pad, T: Math.min(...rs.map((r) => r.top)) - pad, R: Math.max(...rs.map((r) => r.right)) + pad, B: Math.max(...rs.map((r) => r.bottom)) + pad };
  if (!(box.R > c.left && box.L < c.right && box.B > c.top && box.T < c.bottom)) return false;
  const sc = Tour.scroller(els[0]);
  if (!sc) return false;
  const top = sc.getBoundingClientRect().top + 8;
  const dy = Math.min(box.B - (c.top - 8), box.T - top);
  if (dy < 8) return false;
  sc.scrollBy({ top: dy, behavior: U.calm() ? 'auto' : 'smooth' });
  await Tour.wait(U.calm() ? 40 : 380);
  return true;
};
