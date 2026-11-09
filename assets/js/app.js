/* ==========================================================================
   app.js — navegação, textos de apoio (guias, ajuda, glossário), componentes e formulários
   ========================================================================== */
const App = { mode: 'inerente', views: {}, current: null };
const V = {}; // componentes de interface reutilizáveis

App.TABS = [
  { id: 'painel', nome: 'Visão geral', icon: 'dashboard', titulo: 'Visão geral', hint: 'O que exige atenção hoje', sub: 'O que exige atenção hoje na cadeia de suprimentos. Clique em qualquer número, gráfico ou elo para ver os detalhes.' },
  { id: 'riscos', nome: 'Riscos', icon: 'alert', titulo: 'Riscos', hint: 'Matriz e lista de riscos', sub: 'Todos os riscos identificados: onde estão, quão graves são e quanto podem custar por ano.' },
  { id: 'acoes', nome: 'Plano de ações', icon: 'checks', titulo: 'Plano de ações', hint: 'O que está sendo feito', sub: 'O que está sendo feito para reduzir os riscos, quanto custa e quanto da perda já foi evitada.' },
  { id: 'monitor', nome: 'Monitoramento', icon: 'activity', titulo: 'Monitoramento', hint: 'Indicadores, sinais e fornecedores', sub: 'Sinais de que um risco pode estar chegando: indicadores, eventos captados na rede e saúde dos fornecedores.' },
  { id: 'simular', nome: 'Simulações', icon: 'flask', titulo: 'Simulações', hint: 'Teste cenários de perda e de parada', sub: 'Teste cenários: quanto a empresa pode perder num ano ruim e o que acontece se um elo da cadeia parar.' },
];

/* Selo de situação ao lado do título de cada aba */
App.STATUS = {
  painel: () => { const n = S.state.alerts.filter((a) => a.status === 'Novo').length; return n ? { cls: 'st-warn', txt: U.plural(n, 'sinal novo para analisar', 'sinais novos para analisar'), go: () => App.go('monitor', () => { App.monTab = 'kri'; App.alertFilter = 'Novo'; }) } : { cls: 'st-ok', txt: 'Nenhum sinal novo' }; },
  riscos: () => { const n = M.portfolio('atual').list.filter((x) => x.e.score >= 10).length; return { cls: n ? 'st-crit' : 'st-ok', txt: n ? `${n} altos ou críticos hoje` : 'Nenhum risco alto hoje' }; },
  acoes: () => { const n = S.state.actions.filter(M.actionLate).length; return n ? { cls: 'st-crit', txt: U.plural(n, 'ação atrasada', 'ações atrasadas'), go: () => App.go('acoes', () => { App.act.status = 'Atrasada'; App.act.estr = ''; }) } : { cls: 'st-ok', txt: 'Plano em dia' }; },
  monitor: () => { const n = S.state.kris.filter((k) => M.kriStatus(k) === 'crit').length; return { cls: n ? 'st-crit' : 'st-ok', txt: n ? U.plural(n, 'indicador crítico', 'indicadores críticos') : 'Indicadores normais' }; },
  simular: () => ({ cls: 'st-info', txt: 'Limite aceitável: ' + U.money(S.state.empresa.apetite) + ' por ano' }),
};
App.SUBNAME = () => ({
  monitor: App.monTab === 'forn' ? 'Fornecedores' : 'Indicadores e sinais',
  simular: App.simTab === 'dis' ? 'Parada de um elo' : 'Perda no ano',
}[App.current]);

/* Guia rápido de cada página (botão "Como usar esta página") */
App.GUIDE = {
  painel: ['Comece pelos indicadores do topo: perda esperada, uso do limite, riscos ativos, elos sem cobertura, indicadores em alerta e ações atrasadas. Clique num deles para ir à lista correspondente.', 'Use “Apetite a risco” para ver se a perda esperada cabe no limite aceito pela diretoria, e a matriz para ver onde os riscos se concentram.', 'Desça até o mapa da cadeia e clique num elo para ver os riscos dele, quanto tempo leva para voltar e quem são os fornecedores.'],
  riscos: ['Escolha o cenário de avaliação: sem ações, hoje ou com o plano completo. Os riscos mudam de lugar na matriz.', 'Clique numa célula da matriz, num nível ou numa categoria para filtrar o registro. Os filtros ativos aparecem acima da tabela.', 'Clique numa linha para abrir os detalhes do risco — ou use “Novo risco” para cadastrar um.'],
  acoes: ['Os indicadores do topo e a cascata mostram quanto a perda cai com o que já foi feito e com o plano completo.', 'Clique numa estratégia ou numa situação para filtrar a lista de ações.', 'Clique numa ação para atualizar o progresso, o prazo ou o responsável.'],
  monitor: ['Use os quatro filtros do topo para ver os indicadores críticos, em atenção ou normais. Clique num indicador para registrar a leitura do mês.', 'Sinais são eventos captados na rede. Para cada um: marque como visto, transforme em risco ou descarte.', 'Na aba Fornecedores, ajuste o peso de cada critério e veja a nota de cada fornecedor mudar.'],
  simular: ['Perda no ano: o sistema sorteia milhares de anos possíveis e mostra a chance de passar do limite aceitável.', 'Parada de um elo: escolha um caso pronto ou ajuste a duração, o estoque e o tempo de resposta.', 'Compare a resposta ágil com a tardia para ver quanto vale reagir cedo.'],
};

/* Ação principal do cabeçalho de cada página */
App.PRIMARY = {
  painel: () => ({ label: 'Novo risco', icon: 'plus', run: () => V.riskForm(null) }),
  riscos: () => ({ label: 'Novo risco', icon: 'plus', run: () => V.riskForm(null) }),
  acoes: () => ({ label: 'Nova ação', icon: 'plus', run: () => V.actionForm(null) }),
  monitor: () => (App.monTab === 'forn' ? null : { label: 'Registrar sinal', icon: 'plus', run: () => App.newSignal() }),
  simular: () => null,
};

/* Explicações "Como ler" de cada seção (botão de informação) */
App.HELP = {
  appetite: () => ({ t: 'Como ler o apetite a risco', b: `<p>O medidor mostra quanto do limite anual de perda (o <b>apetite a risco</b>, hoje ${U.money(S.state.empresa.apetite)}) já está comprometido pela perda esperada. A marca escura é o limite.</p><ul><li><b>Verde</b>: até 60% do limite — folga confortável.</li><li><b>Amarelo</b>: de 60% a 90% — atenção.</li><li><b>Laranja</b>: de 90% a 100% — perto do limite.</li><li><b>Vermelho</b>: acima do limite.</li></ul><p>Embaixo, a mesma perda em três cenários — sem ações, hoje e com o plano completo — comparada ao limite (linha tracejada).</p>` }),
  matrix: () => ({ t: 'Como ler a matriz', b: '<p>Linhas: chance de acontecer (1 = raro, 5 = quase certo). Colunas: tamanho do impacto (1 = insignificante, 5 = catastrófico).</p><p>A gravidade é chance × impacto: verde = baixo (1–4), amarelo = moderado (5–9), laranja = alto (10–14), vermelho = crítico (15–25). O número na célula é a quantidade de riscos ali. Clique numa célula para listar só esses riscos.</p>' }),
  kritrend: () => ({ t: 'Como ler a tendência dos indicadores', b: '<p>Cada coluna é um mês. A altura mostra quantos indicadores-chave estavam fora da faixa normal: a parte vermelha, os críticos; a amarela, os que estavam em atenção.</p><p>Colunas que crescem indicam que a situação está piorando. O mês em negrito é o mais recente. Clique numa coluna para abrir os indicadores.</p>' }),
  cats: () => ({ t: 'Como ler a exposição por categoria', b: '<p>Cada linha soma a perda esperada por ano dos riscos ativos de uma categoria, hoje. As cores dividem esse valor pelo nível dos riscos (crítico, alto, moderado e baixo).</p><p>Clique numa linha para abrir o registro só com os riscos dessa categoria.</p>' }),
  tiers: () => ({ t: 'Como ler as etapas da cadeia', b: '<p>As etapas seguem o caminho do material: fornecedores de nível 2 (que abastecem os fornecedores diretos) → fornecedores diretos → logística de entrada → produção → distribuição → clientes.</p><ul><li><b>Pior nível</b>: o risco mais grave da etapa hoje.</li><li><b>Descobertos</b>: elos que levariam mais tempo para voltar do que a empresa aguenta sem eles.</li><li><b>Perda/ano</b>: soma da perda esperada dos riscos da etapa.</li></ul><p>Clique numa etapa para ver o elo mais crítico dela no mapa.</p>' }),
  map: () => ({ t: 'Como ler o mapa', b: '<p>Cada caixa é um elo da cadeia: fornecedor, rota, porto, fábrica, sistema, centro de distribuição ou cliente. As colunas são as etapas, do fornecedor ao cliente.</p><ul><li><b>Linhas contínuas</b>: fluxo de materiais. <b>Pontilhadas</b>: fluxo de informação.</li><li><b>Cor “Nível de risco”</b>: o risco mais grave do elo hoje.</li><li><b>Cor “Cobertura”</b>: quantas semanas o elo ficaria descoberto se parasse.</li></ul><p>Use + e − (ou Ctrl + rolagem) para aproximar e arraste para mover.</p>' }),
  node: () => ({ t: 'Como ler o elo selecionado', b: '<p>Os quatro números resumem o elo: quanto tempo ele leva para voltar depois de uma parada (TTR), quanto tempo a empresa aguenta sem ele (TTS), a diferença entre os dois e a margem que fica em risco.</p><p>Nas barras, a cinza é o tempo para voltar e a azul, o tempo que a empresa aguenta. Se a cinza for maior, o trecho vermelho são <b>semanas sem abastecimento</b>, com vendas perdidas.</p>' }),
  top: () => ({ t: 'Como esta lista é ordenada', b: '<p>Os riscos mais graves hoje, pela gravidade (chance × impacto, de 1 a 25). No empate, vem primeiro o que custa mais por ano. Clique numa linha para abrir os detalhes.</p>' }),
  ttr: () => ({ t: 'Como ler as barras', b: '<p>Para cada elo, a barra cinza mostra quantas semanas ele leva para voltar e a azul, quantas a empresa aguenta sem ele. O número à direita é a diferença: positivo significa semanas sem abastecimento.</p>' }),
  board: () => ({ t: 'O que são sinais', b: '<p>Sinais são eventos captados na rede — notícias, leituras de indicadores, avisos de parceiros — que podem virar risco. O ícone à esquerda mostra a severidade.</p><ul><li><b>Novo</b>: ninguém analisou ainda.</li><li><b>Visto</b>: alguém já tomou conhecimento.</li><li><b>Virou risco</b>: foi registrado como risco.</li></ul>' }),
  plan: () => ({ t: 'Como ler o andamento', b: '<p>A barra divide as ações por situação: concluídas, em andamento e planejadas. Embaixo, os próximos prazos, começando pelas ações atrasadas.</p>' }),
  quads: () => ({ t: 'Como ler os quadrantes', b: '<p>Divide os riscos em quatro grupos: chance alta (nota 3 ou mais) ou baixa, e impacto severo (nota 4 ou mais) ou leve. Cada quadrante sugere um tipo de resposta: prevenir, ter redundância e flexibilidade, ou apenas acompanhar.</p>' }),
  catsRisk: () => ({ t: 'Como ler a perda por categoria', b: '<p>Soma da perda esperada por ano de todos os riscos de cada categoria, no cenário escolhido no topo da página, dividida pelo nível dos riscos. Clique numa linha para filtrar o registro; clique de novo para limpar.</p>' }),
  list: () => ({ t: 'Como ler o registro', b: '<ul><li><b>Gravidade</b>: chance × impacto, de 1 a 25, com o nível ao lado.</li><li><b>Perda/ano</b>: perda esperada por ano no cenário escolhido.</li><li><b>Ações</b>: quantas ações tratam o risco (0 em vermelho = sem tratamento).</li><li><b>Situação</b>: em que etapa da gestão o risco está.</li></ul><p>Clique no título de uma coluna para ordenar.</p>' }),
  waterfall: () => ({ t: 'Como ler a cascata', b: '<p>A primeira barra é a perda esperada sem nenhuma ação. Cada degrau verde mostra quanto ela cai: primeiro com as ações já feitas (chegando a “Hoje”), depois com o restante do plano (chegando a “Com o plano”).</p><p>O degrau listrado é a redução que ainda depende de concluir as ações.</p>' }),
  strategies: () => ({ t: 'As três estratégias', b: '<ul><li><b>Reduzir a chance</b>: prevenção, processos robustos e monitoramento — atua antes do problema.</li><li><b>Reduzir o impacto</b>: redundância, flexibilidade e agilidade — o problema acontece, mas a cadeia não para.</li><li><b>Transferir o custo</b>: seguros e contratos — outro paga a conta, mas o problema continua.</li></ul>' }),
  actions: () => ({ t: 'Como ler a lista de ações', b: '<ul><li><b>Efeito</b>: quanto a ação reduz a chance ou a perda dos riscos tratados.</li><li><b>Evita/ano</b>: quanto a perda esperada subiria se a ação saísse do plano.</li><li><b>Retorno</b>: perda evitada ÷ custo. Acima de 1×, a ação evita mais do que custa.</li></ul>' }),
  roi: () => ({ t: 'Como ler o retorno', b: '<p>Cada barra mostra quanto a ação evita de perda esperada para cada real gasto por ano. Verde: retorno acima de 1×. Cinza: abaixo de 1× — ainda pode valer a pena se proteger contra anos muito ruins.</p>' }),
  kri: () => ({ t: 'Como ler um indicador', b: '<p>Indicadores-chave de risco (KRIs) mudam antes de o problema acontecer — por exemplo, as entregas de um fornecedor pioram antes de ele parar.</p><ul><li><b>Faixa colorida</b>: verde = normal, amarelo = atenção, vermelho = crítico. O traço escuro é a leitura atual.</li><li><b>Variação</b>: diferença para o mês anterior, em verde quando melhora e em vermelho quando piora.</li><li><b>Gráfico</b>: últimos 12 meses, com os dois limites tracejados.</li></ul>' }),
  alerts: () => ({ t: 'O que fazer com um sinal', b: '<ul><li><b>Marcar como visto</b>: você tomou conhecimento e vai acompanhar.</li><li><b>Transformar em risco</b>: abre o cadastro de risco já preenchido com o sinal.</li><li><b>Descartar</b>: o sinal não se confirmou.</li></ul>' }),
  sup: () => ({ t: 'Como a nota é calculada', b: '<p>Cada fornecedor recebe de 0 a 100 pontos em seis critérios: saúde financeira, dependência, entregas, país, variação de prazo e exposição digital. A nota é a média ponderada pelos pesos.</p><p>Classes: A até 35 · B até 50 · C até 65 · D acima de 65.</p>' }),
  weights: () => ({ t: 'Para que servem os pesos', b: '<p>Os pesos dizem quanto cada critério importa para a empresa. Aumentar o peso de “Entregas no prazo”, por exemplo, faz os fornecedores que atrasam subirem na lista de preocupação.</p>' }),
  hhi: () => ({ t: 'Como ler a concentração', b: '<p>O índice HHI soma o quadrado da participação de cada fornecedor (em %). Com um único fornecedor, dá 10.000. Até 3.400 é diversificado; acima de 6.000, concentração alta.</p>' }),
  mc: () => ({ t: 'Como a simulação funciona', b: '<p>Para cada ano sorteado, o sistema decide quantas vezes cada risco acontece (pela chance anual) e quanto custa cada ocorrência (entre a perda mínima e a máxima). Somando tudo, sai o custo daquele ano.</p><p>Repetindo milhares de vezes, aparece a distribuição: a média, os anos típicos e os anos ruins.</p>' }),
  curve: () => ({ t: 'Como ler a curva', b: '<p>Escolha um valor no eixo de baixo — por exemplo, R$ 20 mi. A altura de cada linha nesse ponto é a chance de o ano custar <b>mais</b> que isso.</p><p>Quanto mais baixa e à esquerda a linha, menor o risco de anos ruins. A linha tracejada vertical é o limite aceitável.</p>' }),
  hist: () => ({ t: 'Como ler o histograma', b: '<p>Cada barra é uma faixa de perda anual; a altura é quantos anos simulados caíram nela. A marca “1 em 20” é a perda superada em apenas 5% dos anos (VaR 95%).</p>' }),
  contrib: () => ({ t: 'Como ler as contribuições', b: '<p>Quanto cada risco soma, em média, ao custo anual no cenário escolhido. Os do topo são os que mais compensa tratar.</p>' }),
  stats: () => ({ t: 'O que cada número significa', b: '<ul><li><b>Perda média</b>: o custo esperado de um ano qualquer.</li><li><b>1 ano ruim em 20</b> (VaR 95%): só 5% dos anos custam mais que isso.</li><li><b>Média dos 5% piores</b> (CVaR 95%): quanto custa, em média, um desses anos ruins.</li></ul>' }),
  dis: () => ({ t: 'Como montar uma simulação', b: '<p>Escolha um caso pronto ou o elo que vai parar. Depois ajuste por quanto tempo ele fica parado, quantos dias de estoque existem e quanto das vendas volta depois.</p><p>Nos cartões “Resposta ágil” e “Resposta tardia”, defina quanto a empresa demora para perceber e para ativar um fornecedor alternativo.</p>' }),
  disChart: () => ({ t: 'Como ler o gráfico', b: '<p>100% é a produção normal. A faixa vermelha é o tempo em que o elo fica parado; a produção só cai quando o estoque acaba.</p><p>As linhas comparam a resposta ágil (azul) com a tardia (laranja). Os números de 1 a 8 marcam as fases de uma interrupção, listadas abaixo do gráfico.</p>' }),
  disResult: () => ({ t: 'Como o custo é calculado', b: '<p><b>Margem perdida</b>: vendas que não acontecem (e não voltam depois) × margem de contribuição. <b>Custo extra</b>: o adicional pago ao fornecedor alternativo. O impacto total soma os dois.</p>' }),
};

/* Glossário (aba “Glossário” em Como funciona) */
App.GLOSS = [
  ['Elo', 'Cada participante da cadeia: fornecedor, rota, porto, fábrica, sistema, centro de distribuição ou cliente.'],
  ['Perda esperada', 'Custo médio por ano de um risco: chance de acontecer × custo médio quando acontece.'],
  ['Apetite a risco (limite aceitável)', 'Perda anual que a diretoria aceita correr. Acima disso, é preciso agir.'],
  ['Gravidade (P×I)', 'Chance (1 a 5) × impacto (1 a 5). Vai de 1 a 25 e define o nível: baixo, moderado, alto ou crítico.'],
  ['Sem ações · Hoje · Com o plano', 'Os três cenários de avaliação. Nos termos técnicos: risco inerente, residual atual e residual planejado.'],
  ['TTR — tempo para recuperar', 'Semanas até o elo voltar a operar normalmente depois de uma parada.'],
  ['TTS — tempo para sobreviver', 'Semanas que a empresa aguenta sem o elo, usando estoques e alternativas.'],
  ['Elo descoberto', 'Elo cujo TTR é maior que o TTS: se parar, falta abastecimento antes de ele voltar.'],
  ['Indicador (KRI)', 'Indicador-chave de risco: mede algo que costuma piorar antes de o problema acontecer.'],
  ['Sinal', 'Evento captado na rede — notícia, leitura, aviso de parceiro — que pode virar risco.'],
  ['Fonte única', 'Só existe um fornecedor qualificado para aquele item.'],
  ['OTIF', 'Entregas no prazo e completas (do inglês On Time In Full), em porcentagem.'],
  ['Z-score', 'Indicador de saúde financeira de Altman. Abaixo de 1,81: risco de quebra; de 1,81 a 2,99: atenção.'],
  ['HHI', 'Índice de concentração de compras. 10.000 = fonte única; até 3.400 = diversificado.'],
  ['Retorno (B/C)', 'Perda evitada por ano ÷ custo anual da ação.'],
  ['Monte Carlo', 'Simulação que sorteia milhares de anos possíveis para estimar a chance de anos ruins.'],
  ['VaR 95%', 'Perda anual que só é superada em 1 a cada 20 anos.'],
  ['CVaR 95%', 'Perda média dos 5% piores anos simulados.'],
];

/* Endereços antigos continuam funcionando */
App.ALIAS = { rede: 'painel', matriz: 'riscos', analise: 'riscos', montecarlo: 'simular', interrupcao: 'simular', fornecedores: 'monitor', monitoramento: 'monitor', principios: 'painel', metodologia: 'painel', relatorio: 'painel' };

/* Vai para uma aba; "prep" ajusta filtros antes de desenhar */
App.go = (id, prep) => {
  if (prep) prep();
  if (location.hash !== '#' + id) location.hash = id; else App.render();
  const main = U.$('#main');
  if (main) main.scrollTo({ top: 0 });
  document.documentElement.classList.remove('nav-open');
};

App.render = () => {
  let id = (location.hash || '').replace('#', '') || 'painel';
  if (App.ALIAS[id]) {
    const old = id;
    id = App.ALIAS[id];
    if (old === 'fornecedores') App.monTab = 'forn';
    if (old === 'interrupcao') App.simTab = 'dis';
    if (old === 'montecarlo') App.simTab = 'mc';
    history.replaceState(null, '', '#' + id);
    setTimeout(() => {
      if (old === 'metodologia') X.about('met');
      if (old === 'principios') X.about('pr');
    }, 0);
  }
  const tab = App.TABS.find((t) => t.id === id) || App.TABS[0];
  const entering = App.current !== tab.id;
  App.current = tab.id;
  U.$('#pageTitle').textContent = tab.titulo;
  U.$('#pageSub').textContent = tab.sub;
  U.$$('#tabs [data-tab]').forEach((a) => {
    const on = a.dataset.tab === tab.id;
    a.classList.toggle('active', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  document.title = tab.nome + ' · RiscoGCS';
  const el = U.$('#view');
  el.innerHTML = '';
  V.pageTabs('');
  try { App.views[tab.id](el); } catch (e) { console.error(e); el.innerHTML = `<div class="notice crit"><span class="notice-ic">${I('alert')}</span><div class="notice-t"><b>Não foi possível montar esta tela</b><span>${U.esc(e.message)}. Recarregue a página para tentar de novo.</span></div></div>`; }
  App.head();
  /* Transição curta de opacidade só quando muda de área (filtros redesenham sem animar) */
  clearTimeout(App._et);
  el.classList.remove('enter');
  if (entering && !U.calm()) {
    void el.offsetWidth;
    el.classList.add('enter');
    App._et = setTimeout(() => el.classList.remove('enter'), 400);
  }
};

/* Cabeçalho da página: trilha de navegação, selo de situação e ação principal */
App.head = () => {
  const tab = App.TABS.find((t) => t.id === App.current);
  const sub = App.SUBNAME();
  U.$('#crumbs').innerHTML = `<a href="#painel">${U.esc(S.state.empresa.nome)}</a><span class="sep">/</span>`
    + (sub ? `<a href="#${tab.id}">${U.esc(tab.nome)}</a><span class="sep">/</span><b>${U.esc(sub)}</b>` : `<b>${U.esc(tab.nome)}</b>`);
  const st = App.STATUS[tab.id] && App.STATUS[tab.id]();
  const tb = U.$('#titleBadge');
  tb.innerHTML = st ? (st.go ? `<button class="pill pill-btn ${st.cls}" type="button" id="titleBadgeBtn" data-tip="Ver os itens"><i aria-hidden="true"></i>${U.esc(st.txt)}</button>` : `<span class="pill ${st.cls}"><i aria-hidden="true"></i>${U.esc(st.txt)}</span>`) : '';
  const b = U.$('#titleBadgeBtn');
  if (b) b.addEventListener('click', st.go);
  const pb = U.$('#btnPrimary'), pr = App.PRIMARY[tab.id] && App.PRIMARY[tab.id]();
  if (pb) {
    pb.hidden = !pr;
    if (pr) { pb.innerHTML = `${I(pr.icon)}<span>${U.esc(pr.label)}</span>`; pb.onclick = pr.run; }
  }
};

App.refresh = () => { S.save(); App.render(); };

/* Menu lateral com ícones, explicação no passar do mouse e contadores */
App.buildTabs = () => {
  const mini = document.documentElement.dataset.side === 'mini' && window.innerWidth > 900;
  const badge = (id) => {
    if (id === 'monitor') { const n = S.state.alerts.filter((a) => a.status === 'Novo').length; return n ? `<span class="badge" data-tip="${U.plural(n, 'sinal novo', 'sinais novos')}">${n}</span>` : ''; }
    if (id === 'acoes') { const n = S.state.actions.filter(M.actionLate).length; return n ? `<span class="badge" data-tip="${U.plural(n, 'ação atrasada', 'ações atrasadas')}">${n}</span>` : ''; }
    return '';
  };
  const tab = (t) => `<a href="#${t.id}" data-tab="${t.id}" class="nav-item ${t.id === App.current ? 'active' : ''}"${t.id === App.current ? ' aria-current="page"' : ''} data-tip="${U.esc(mini ? t.nome + ' — ' + t.hint : t.hint)}">
    <span class="nav-ic">${I(t.icon)}</span><span class="nav-txt">${U.esc(t.nome)}</span>${badge(t.id)}</a>`;
  const cmd = (id, icon, label, hint) => `<button type="button" class="nav-item" data-cmd="${id}" data-tip="${U.esc(mini ? label + ' — ' + hint : hint)}"><span class="nav-ic">${I(icon)}</span><span class="nav-txt">${label}</span></button>`;
  U.$('#tabs').innerHTML = `<div class="nav-sec"><span>Menu principal</span></div>${App.TABS.map(tab).join('')}
    <div class="nav-sec"><span>Ferramentas</span></div>${cmd('tour', 'compass', 'Tour guiado', 'Passeio interativo pelas telas, com destaques')}${cmd('about', 'info', 'Como funciona', 'Guia passo a passo em 12 páginas, método e glossário')}
    <div class="nav-sec"><span>Preferências</span></div>${cmd('appearance', 'palette', 'Aparência', 'Tema, cor de destaque e densidade')}`;
  if (typeof UI !== 'undefined' && UI.refreshBell) UI.refreshBell();
};

/* Exportação da lista de ações (botão “Exportar” da tabela) */
App.exportActionsCsv = () => {
  const head = ['Código', 'Ação', 'Riscos tratados', 'Estratégia', 'Como (alavanca)', 'Reduz a chance (%)', 'Reduz a perda (%)', 'Coberto por seguro (%)', 'Franquia (R$ mil)', 'Custo por ano (R$ mil)', 'Perda evitada por ano (R$ mil)', 'Status', 'Progresso (%)', 'Responsável', 'Prazo'];
  const rows = S.state.actions.map((a) => [a.id, a.titulo, a.riscos.join(' '), DATA.ESTRATEGIAS[a.estrategia], a.alavanca, Math.round(a.redP * 100), Math.round(a.redC * 100), Math.round((a.cobertura || 0) * 100), a.franquia || 0, a.custo, Math.round(M.actionBenefit(a)), a.status, a.progresso, a.resp, a.prazo]);
  U.download('plano-de-acoes.csv', U.csv([head, ...rows]), 'text/csv');
};

/* ---------------- Componentes ---------------- */
/* Cabeçalho de cartão: título, botão de ajuda "Como ler", descrição curta e ferramentas à direita */
V.sec = (o) => `<header class="card-head"><div class="ch-t">
    <div class="ch-title"><h3>${o.title}</h3>${o.help ? `<button class="help-btn" type="button" data-help="${o.help}" aria-label="Como ler esta seção" data-tip="Como ler esta seção">${I('info')}</button>` : ''}</div>
    ${o.desc ? `<p class="ch-d">${o.desc}</p>` : ''}</div>
  ${o.tools ? `<div class="ch-tools">${o.tools}</div>` : ''}</header>`;

/* Abas da área, presas ao cabeçalho da página (Monitoramento e Simulações) */
V.pageTabs = (html) => {
  const h = U.$('#phTabs');
  if (!h) return;
  h.innerHTML = html;
  U.$('.page-head').classList.toggle('has-tabs', !!html);
};

V.levelPill = (lv) => `<span class="pill lvl-${lv.id}"><i aria-hidden="true"></i>${lv.nome}</span>`;
V.statusPill = (st, txt) => `<span class="pill st-${st}"><i aria-hidden="true"></i>${U.esc(txt || M.STATUS_TXT[st])}</span>`;
V.typeTag = (t) => `<span class="tag tag-${t}" data-tip="${U.esc(DATA.TIPOS[t].curto)}">${U.esc(DATA.TIPOS[t].nome)}</span>`;
V.quadTag = (q, full) => { const t = full ? q.nome : q.nome.replace('Vulnerabilidade ', ''); return `<span class="tag quad-${q.id}" data-tip="${U.esc(q.foco)}">${U.esc(t.charAt(0).toUpperCase() + t.slice(1))}</span>`; };
V.riskLink = (id) => { const r = S.risk(id); return r ? `<button class="link" data-open-risk="${r.id}" data-tip="${U.esc(r.titulo)}">${r.id}</button>` : U.esc(id); };
V.nodeName = (id) => (S.node(id) || { nome: '—' }).nome;
V.scoreCell = (e) => `<span class="score lvl-${e.level.id}" data-tip="Gravidade ${e.score} de 25 (chance ${e.pl} × impacto ${e.i})">${e.score}</span>`;
V.progress = (v) => `<div class="progress" role="progressbar" aria-valuenow="${v}" aria-valuemin="0" aria-valuemax="100" aria-label="${v}% concluído"><div style="width:${v}%"></div></div>`;
V.empty = (msg) => `<div class="empty">${U.esc(msg)}</div>`;

/* Faixas do medidor de gravidade (níveis da matriz) */
V.PXI_BANDS = [
  { to: 4, color: 'var(--st-ok)', name: 'Baixo', range: '1–4' },
  { to: 9, color: 'var(--st-warn)', name: 'Moderado', range: '5–9' },
  { to: 14, color: 'var(--st-serious)', name: 'Alto', range: '10–14' },
  { to: 25, color: 'var(--st-crit)', name: 'Crítico', range: '15–25' },
];

/* Mapa de calor 5×5 (linhas: chance 5→1; colunas: impacto 1→5).
   opts.compact: só a contagem · opts.pick: células clicáveis */
V.heatmap = (mode, opts = {}) => {
  const cells = {};
  const pf = M.portfolio(mode);
  pf.list.forEach(({ r, e }) => { const k = e.pl + '-' + e.i; (cells[k] = cells[k] || []).push({ r, e }); });
  let h = `<div class="heat ${opts.compact ? 'heat-compact' : ''} ${opts.pick ? 'heat-pick' : ''}">`;
  h += '<div class="heat-ylab">Chance de acontecer</div><div class="heat-grid">';
  for (let p = 5; p >= 1; p--) {
    h += `<div class="heat-rowlab"><b>${p}</b><span>${DATA.PROB[p - 1].nome}</span></div>`;
    for (let i = 1; i <= 5; i++) {
      const lv = M.level(p * i);
      const list = cells[p + '-' + i] || [];
      const pick = opts.pick && list.length;
      h += `<div class="heat-cell lvl-${lv.id} ${list.length ? 'has' : ''}" ${pick ? `role="button" tabindex="0" data-cell="${p}-${i}" aria-label="Chance ${p}, impacto ${i}: ${U.plural(list.length, 'risco', 'riscos')}"` : ''} data-tip="Chance ${p} × impacto ${i} = gravidade ${p * i} (${lv.nome.toLowerCase()})${list.length ? '\n' + list.map((x) => x.r.id + ' ' + x.r.titulo).join('\n') + (pick ? '\nClique para ver estes riscos no registro' : '') : ''}">`;
      if (opts.compact) h += list.length ? `<span class="heat-count">${list.length}</span>` : '';
      else h += list.map((x) => `<button class="chip" type="button" data-open-risk="${x.r.id}">${x.r.id}</button>`).join('');
      h += '</div>';
    }
  }
  h += '<div></div>';
  for (let i = 1; i <= 5; i++) h += `<div class="heat-collab"><b>${i}</b><span>${DATA.IMPACT_NAMES[i - 1]}</span></div>`;
  h += '</div><div class="heat-xlab">Tamanho do impacto</div></div>';
  return h;
};

/* Detalhes do risco num painel lateral: cabeçalho com código, etiquetas e metadados; avaliação; descrição; tratamento */
V.openRisk = (id) => {
  const r = S.risk(id);
  if (!r) return;
  const ev = Object.keys(M.MODES).map((m) => ({ m, e: M.evalRisk(r, m) }));
  const t = DATA.TIPOS[r.tipo];
  const acts = M.actionsOf(r.id);
  const k = r.kri && S.kri(r.kri);
  const ine = ev[0].e, now = ev[1].e, plan = ev[2].e;
  const body = `
    <div class="rd-meta">
      <div><small>Elo da cadeia</small><b>${U.esc(V.nodeName(r.no))}</b></div>
      <div><small>Categoria</small><b>${U.esc(S.cat(r.cat).nome)}</b></div>
      <div><small>Responsável</small><b>${U.esc(r.resp || '—')}</b></div>
      <div><small>Identificado em</small><b>${U.dateBR(r.data)}</b></div>
      <div><small>Perda esperada hoje</small><b>${U.money(now.pea)} por ano</b></div>
      <div><small>Ações de tratamento</small><b>${acts.length ? U.plural(acts.length, 'ação', 'ações') : '<span class="neg">Nenhuma</span>'}</b></div>
    </div>

    <div class="rd-sec"><h4>Avaliação</h4>
      <div class="rd-score">
        <div class="rd-big"><b>${now.score}</b><small>gravidade hoje, de 1 a 25</small>${V.levelPill(now.level)}</div>
        <div>${C.scale(now.score, V.PXI_BANDS, { min: 1, max: 25, label: 'Gravidade hoje' })}${C.scaleLegend(V.PXI_BANDS, now.score)}</div>
      </div>
      <div class="table-wrap"><table class="table table-compact"><thead><tr><th>Cenário</th><th class="num">Chance no ano</th><th class="num">Chance</th><th class="num">Impacto</th><th>Gravidade</th><th>Quadrante</th><th class="num">Perda/ano</th></tr></thead><tbody>
        ${ev.map(({ m, e }) => `<tr class="${m === 'atual' ? 'is-now' : ''}"><td><b>${M.MODES[m]}</b></td><td class="num">${U.pct(e.p, 1)}</td><td class="num">${e.pl}</td><td class="num">${e.i}</td><td class="nowrap"><span class="score-cell">${V.scoreCell(e)}${V.levelPill(e.level)}</span></td><td>${V.quadTag(e.quad)}</td><td class="num">${U.money(e.pea)}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="note">Sem ações, a gravidade seria <b>${ine.score}</b>; com o plano completo, <b>${plan.score}</b>. Chance ${r.p} = ${DATA.PROB[r.p - 1].nome.toLowerCase()} (${DATA.PROB[r.p - 1].faixa}).</p>
    </div>

    <div class="rd-sec"><h4>Descrição</h4>
      <dl class="dl dl-stack"><dt>Por que pode acontecer</dt><dd>${U.esc(r.causa || 'Causa não descrita.')}</dd><dt>O que acontece se ocorrer</dt><dd>${U.esc(r.consequencia || 'Consequência não descrita.')}</dd></dl>
    </div>

    <div class="rd-sec"><h4>Perda por ocorrência</h4>
      <div class="sev3"><span><small>Mínima</small><b>${U.money(r.sev[0])}</b></span><span class="mid"><small>Mais provável</small><b>${U.money(r.sev[1])}</b></span><span><small>Máxima</small><b>${U.money(r.sev[2])}</b></span></div>
    </div>

    <div class="rd-sec"><h4>Impacto por dimensão</h4>
      <div class="table-wrap"><table class="table table-compact"><thead><tr><th>Dimensão</th><th class="num">Nota</th><th>Descrição do nível</th></tr></thead><tbody>
        ${['pessoas', 'reputacao', 'operacao'].map((d) => `<tr><td>${DATA.IMPACT[d].nome}</td><td class="num"><b>${r.dims[d]}</b></td><td class="muted">${U.esc(DATA.IMPACT[d].niveis[r.dims[d] - 1])}</td></tr>`).join('')}
        <tr><td>Financeiro</td><td class="num"><b>${M.finLevel(r.sev[1])}</b></td><td class="muted">${U.esc(DATA.IMPACT.financeiro.niveis[M.finLevel(r.sev[1]) - 1])}</td></tr>
      </tbody></table></div>
      <p class="note">Vale a pior nota entre as quatro dimensões: impacto ${M.impact(r)}.</p>
    </div>

    <div class="rd-sec"><h4>Recomendações</h4>
      <div class="grid-2">
        <div class="callout"><b>Como estimar um risco ${t.nome.toLowerCase()}</b><p>${U.esc(t.estimar)}</p><b>Como tratar</b><p>${U.esc(t.tratar)}</p></div>
        <div class="callout"><b>O que o quadrante recomenda</b><p>${U.esc(ine.quad.foco)}</p><b>O que o nível ${ine.level.nome.toLowerCase()} exige</b><p>${U.esc(ine.level.resp)}</p></div>
      </div>
    </div>

    ${k ? `<div class="rd-sec"><h4>Indicador que avisa antes</h4><button class="kri-inline" type="button" data-kri-open="${k.id}">${C.spark(k.hist, { w: 200, h: 40, color: `var(--st-${M.kriStatus(k)})` })}<span><b>${U.esc(k.nome)}</b><small>${U.num(k.hist[k.hist.length - 1], k.dec)} ${U.esc(k.unidade)} em ${DATA.MESES[11]}</small></span>${V.statusPill(M.kriStatus(k))}</button></div>` : ''}

    <div class="rd-sec"><h4>Ações de tratamento <span class="cnt">${acts.length}</span></h4>
    ${acts.length ? `<div class="table-wrap"><table class="table table-hover table-compact"><thead><tr><th>Ação</th><th>Estratégia</th><th>Efeito</th><th>Progresso</th><th>Situação</th></tr></thead><tbody>
      ${acts.map((a) => `<tr data-edit-action="${a.id}" tabindex="0"><td><b>${U.esc(a.titulo)}</b><small class="mono">${a.id}</small></td><td>${DATA.ESTRATEGIAS[a.estrategia]}<small>${U.esc(a.alavanca)}</small></td><td class="small">${V.effect(a)}</td><td class="prog-cell">${V.progress(a.progresso)}<small>${a.progresso}%</small></td><td class="nowrap">${V.actStatus(a)}</td></tr>`).join('')}
    </tbody></table></div>` : V.empty('Nenhuma ação cadastrada. Use “Criar ação” para começar o tratamento.')}</div>
  `;
  U.modal({
    title: r.titulo, drawer: true, kicker: `Risco · ${r.id}`,
    sub: `${V.levelPill(now.level)}${V.riskStatus(r.status)}${V.typeTag(r.tipo)}${V.quadTag(now.quad, true)}`,
    body,
    onMount: (w) => U.$$('[data-kri-open]', w).forEach((b) => b.addEventListener('click', () => App.kriForm(S.kri(b.dataset.kriOpen)))),
    actions: [
      { label: 'Excluir', cls: 'btn-ghost-danger', icon: 'x', onClick: () => { U.confirm(`Excluir o risco ${r.id}? As ações ligadas só a ele também serão excluídas. Não dá para desfazer.`, () => {
        S.state.risks = S.state.risks.filter((x) => x.id !== r.id);
        S.state.actions = S.state.actions.map((a) => ({ ...a, riscos: a.riscos.filter((x) => x !== r.id) })).filter((a) => a.riscos.length);
        App.refresh(); U.toast('Risco ' + r.id + ' excluído');
      }, 'Excluir risco'); } },
      { label: 'Criar ação', icon: 'plus', onClick: () => { V.actionForm(null, r.id); } },
      { label: 'Editar risco', cls: 'btn-primary', onClick: () => { V.riskForm(r); } },
    ],
  });
};

V.effect = (a) => {
  const p = [];
  if (a.redP) p.push(`−${Math.round(a.redP * 100)}% na chance`);
  if (a.redC) p.push(`−${Math.round(a.redC * 100)}% na perda`);
  if (a.estrategia === 'transf' && a.cobertura) p.push(`${Math.round(a.cobertura * 100)}% coberto${a.franquia ? ' acima de ' + U.money(a.franquia) : ''}`);
  return p.join(' · ') || '—';
};

/* Formulário de risco (cadastro rápido ou edição) */
V.riskForm = (r, pre = {}) => {
  const isNew = !r;
  const x = r || { id: S.nextId(S.state.risks, 'R'), titulo: pre.titulo || '', cat: 'fornecimento', tipo: 'acidental', no: pre.no || 'n_fab', p: 3, dims: { pessoas: 1, reputacao: 2, operacao: 3 }, sev: [100, 500, 2000], resp: '', status: 'Identificado', data: U.today(), kri: '', causa: pre.causa || '', consequencia: '' };
  const lvlOpts = (sel, names) => names.map((n, i) => `<option value="${i + 1}" ${sel === i + 1 ? 'selected' : ''}>${i + 1} · ${U.esc(n)}</option>`).join('');
  const body = `${isNew && pre.alertId ? `<div class="notice info compact"><span class="notice-ic">${I('info')}</span><div class="notice-t"><span>Formulário preenchido com o sinal detectado. Ao criar o risco, o sinal passa para “Virou risco”.</span></div></div>` : ''}<form id="riskForm" class="form">
    <label class="span-2">Título do risco<small>descreva o evento que pode acontecer</small><input name="titulo" required value="${U.esc(x.titulo)}" placeholder="Ex.: Greve no porto atrasa a chegada de componentes"></label>
    <label>Categoria<select name="cat">${U.opts(DATA.CATEGORIAS, x.cat)}</select></label>
    <label>Natureza<select name="tipo">${Object.entries(DATA.TIPOS).map(([k, t]) => `<option value="${k}" ${k === x.tipo ? 'selected' : ''}>${t.nome} — ${t.curto.toLowerCase()}</option>`).join('')}</select></label>
    <label>Elo da cadeia<small>onde o risco acontece</small><select name="no">${U.opts(S.state.nodes, x.no)}</select></label>
    <label>Responsável<small>área ou pessoa dona do risco</small><input name="resp" value="${U.esc(x.resp)}" placeholder="Ex.: Suprimentos — Eletrônicos"></label>
    <label>Situação<select name="status">${DATA.STATUS_RISCO.map((s) => `<option ${s === x.status ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
    <label>Indicador que avisa antes<small>opcional</small><select name="kri"><option value="">Nenhum</option>${U.opts(S.state.kris, x.kri)}</select></label>
    <label>Chance de acontecer<select name="p">${lvlOpts(x.p, DATA.PROB.map((p) => p.nome + ' (' + p.faixa + ')'))}</select></label>
    <label>Impacto em pessoas<select name="pessoas">${lvlOpts(x.dims.pessoas, DATA.IMPACT.pessoas.niveis)}</select></label>
    <label>Impacto na reputação<select name="reputacao">${lvlOpts(x.dims.reputacao, DATA.IMPACT.reputacao.niveis)}</select></label>
    <label>Impacto em processos e sistemas<select name="operacao">${lvlOpts(x.dims.operacao, DATA.IMPACT.operacao.niveis)}</select></label>
    <label>Perda mínima por ocorrência<small>R$ mil</small><input type="number" name="s0" min="0" step="10" value="${x.sev[0]}"></label>
    <label>Perda mais provável<small>R$ mil</small><input type="number" name="s1" min="0" step="10" value="${x.sev[1]}"></label>
    <label>Perda máxima<small>R$ mil</small><input type="number" name="s2" min="0" step="10" value="${x.sev[2]}"></label>
    <label>Identificado em<input type="date" name="data" value="${U.esc(x.data)}"></label>
    <label class="span-2">Por que pode acontecer<small>a causa</small><textarea name="causa" rows="2" placeholder="Ex.: Sindicato aprovou estado de greve e não há acordo">${U.esc(x.causa)}</textarea></label>
    <label class="span-2">O que acontece se ocorrer<small>a consequência</small><textarea name="consequencia" rows="2" placeholder="Ex.: Contêineres parados; a produção para quando o estoque acabar">${U.esc(x.consequencia)}</textarea></label>
    <p class="form-err span-2" id="riskErr" hidden></p>
  </form>`;
  U.modal({
    title: isNew ? 'Novo risco' : 'Editar risco', drawer: true, kicker: isNew ? `Novo risco · ${x.id}` : `Risco · ${x.id}`, body,
    actions: [{ label: 'Cancelar' }, {
      label: isNew ? 'Criar risco' : 'Salvar alterações', cls: 'btn-primary',
      onClick: (w) => {
        const f = U.formData(w.querySelector('#riskForm'));
        const err = w.querySelector('#riskErr');
        const sev = [f.s0, f.s1, f.s2].map((v) => Math.max(0, v || 0));
        if (!f.titulo.trim()) { err.textContent = 'Dê um título ao risco para poder salvar.'; err.hidden = false; return false; }
        if (!(sev[0] <= sev[1] && sev[1] <= sev[2]) || sev[2] === 0) { err.textContent = 'Confira as perdas: a mínima não pode passar da mais provável, nem a mais provável da máxima — e a máxima precisa ser maior que zero.'; err.hidden = false; return false; }
        const obj = { ...x, titulo: f.titulo.trim(), cat: f.cat, tipo: f.tipo, no: f.no, resp: f.resp, status: f.status, kri: f.kri || null, p: f.p, dims: { pessoas: f.pessoas, reputacao: f.reputacao, operacao: f.operacao }, sev, data: f.data, causa: f.causa, consequencia: f.consequencia };
        if (isNew) S.state.risks.push(obj); else Object.assign(r, obj);
        if (isNew && pre.alertId) { const al = S.state.alerts.find((a) => a.id === pre.alertId); if (al) { al.status = 'Convertido'; al.risco = obj.id; } }
        App.refresh(); U.toast(isNew ? 'Risco ' + obj.id + ' criado' : 'Alterações salvas em ' + obj.id);
      },
    }],
  });
};

/* Formulário de ação */
V.actionForm = (a, riskId) => {
  const isNew = !a;
  const x = a || { id: S.nextId(S.state.actions, 'A'), riscos: riskId ? [riskId] : [], titulo: '', estrategia: 'prob', alavanca: 'Prevenção', redP: 0.3, redC: 0, cobertura: 0, franquia: 0, custo: 100, status: 'Planejada', progresso: 0, resp: '', prazo: '' };
  const body = `<form id="actForm" class="form">
    <label class="span-2">O que será feito<input name="titulo" required value="${U.esc(x.titulo)}" placeholder="Ex.: Qualificar um segundo fornecedor de placas"></label>
    <fieldset class="span-2"><legend>Quais riscos esta ação trata</legend><div class="check-grid">
      ${S.state.risks.map((r) => `<label class="check"><input type="checkbox" name="r_${r.id}" ${x.riscos.includes(r.id) ? 'checked' : ''}> <b>${r.id}</b> ${U.esc(r.titulo)}</label>`).join('')}
    </div></fieldset>
    <label>Estratégia<select name="estrategia" id="fEstr">${Object.entries(DATA.ESTRATEGIAS).map(([k, v]) => `<option value="${k}" ${k === x.estrategia ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
    <label>Como<small>a alavanca usada</small><select name="alavanca" id="fAlav"></select></label>
    <label>Reduz a chance em<small>% — prevenção e processos</small><input type="number" name="redP" min="0" max="95" step="5" value="${Math.round((x.redP || 0) * 100)}"></label>
    <label>Reduz a perda em<small>% — redundância e agilidade</small><input type="number" name="redC" min="0" max="95" step="5" value="${Math.round((x.redC || 0) * 100)}"></label>
    <label>Parte coberta por seguro<small>% acima da franquia</small><input type="number" name="cobertura" min="0" max="100" step="5" value="${Math.round((x.cobertura || 0) * 100)}"></label>
    <label>Franquia<small>R$ mil por ocorrência</small><input type="number" name="franquia" min="0" step="10" value="${x.franquia || 0}"></label>
    <label>Custo por ano<small>R$ mil</small><input type="number" name="custo" min="0" step="10" value="${x.custo}"></label>
    <label>Responsável<input name="resp" value="${U.esc(x.resp)}" placeholder="Área ou pessoa"></label>
    <label>Status<select name="status">${DATA.STATUS_ACAO.map((s) => `<option ${s === x.status ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
    <label>Progresso<small>% concluído</small><input type="number" name="progresso" min="0" max="100" step="5" value="${x.progresso}"></label>
    <label>Prazo<input type="date" name="prazo" value="${U.esc(x.prazo)}"></label>
    <p class="note span-2"><b>Reduzir a chance</b>: prevenção, processos robustos e monitoramento. <b>Reduzir o impacto</b>: redundância, flexibilidade e agilidade. <b>Transferir o custo</b>: seguros e contratos pagam a parte financeira acima da franquia, mas não protegem pessoas nem reputação.</p>
    <p class="form-err span-2" id="actErr" hidden></p>
  </form>`;
  U.modal({
    title: isNew ? 'Nova ação de tratamento' : x.titulo || 'Editar ação', drawer: true, kicker: isNew ? `Plano de ações · ${x.id}` : `Ação · ${x.id}`,
    sub: isNew ? '' : `${V.actStatus(x)}<span class="muted small">${DATA.ESTRATEGIAS[x.estrategia]} · ${U.esc(x.alavanca)}</span>`, body,
    onMount: (w) => {
      const es = w.querySelector('#fEstr'), al = w.querySelector('#fAlav');
      const fill = () => { al.innerHTML = DATA.ALAVANCAS[es.value].map((v) => `<option ${v === x.alavanca ? 'selected' : ''}>${v}</option>`).join(''); };
      es.addEventListener('change', fill); fill();
    },
    actions: [
      ...(isNew ? [] : [{ label: 'Excluir ação', cls: 'btn-ghost-danger', onClick: () => U.confirm(`Excluir a ação ${x.id}? Não dá para desfazer.`, () => { S.state.actions = S.state.actions.filter((y) => y.id !== x.id); App.refresh(); U.toast('Ação ' + x.id + ' excluída'); }, 'Excluir ação') }]),
      { label: 'Cancelar' },
      {
        label: isNew ? 'Criar ação' : 'Salvar alterações', cls: 'btn-primary',
        onClick: (w) => {
          const f = U.formData(w.querySelector('#actForm'));
          const riscos = S.state.risks.filter((r) => f['r_' + r.id]).map((r) => r.id);
          const err = w.querySelector('#actErr');
          if (!f.titulo.trim()) { err.textContent = 'Descreva o que será feito.'; err.hidden = false; return false; }
          if (!riscos.length) { err.textContent = 'Marque pelo menos um risco que esta ação trata.'; err.hidden = false; return false; }
          const obj = { ...x, titulo: f.titulo.trim(), riscos, estrategia: f.estrategia, alavanca: f.alavanca, redP: U.clamp(f.redP || 0, 0, 95) / 100, redC: U.clamp(f.redC || 0, 0, 95) / 100, cobertura: U.clamp(f.cobertura || 0, 0, 100) / 100, franquia: f.franquia || 0, custo: f.custo || 0, resp: f.resp, status: f.status, progresso: f.status === 'Concluída' ? 100 : U.clamp(f.progresso || 0, 0, 100), prazo: f.prazo };
          if (isNew) S.state.actions.push(obj); else Object.assign(a, obj);
          App.refresh(); U.toast(isNew ? 'Ação ' + obj.id + ' criada' : 'Alterações salvas em ' + obj.id);
        },
      },
    ],
  });
};

/* ---------------- Inicialização ---------------- */
App.init = () => {
  S.load();
  const save0 = S.save;
  S.save = () => { const ok = save0(); App.buildTabs(); return ok; };
  App.buildTabs();
  U.initTips();
  const nome = S.state.empresa.nome;
  U.$('#companyName').textContent = nome;
  U.$('#companyAvatar').textContent = nome.replace(/S\.A\.|Ltda\.?/gi, '').trim().split(/(?=[A-Z])|\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'RG';
  UI.init();
  document.addEventListener('click', (e) => {
    const r = e.target.closest('[data-open-risk]');
    if (r) { e.preventDefault(); V.openRisk(r.dataset.openRisk); return; }
    const a = e.target.closest('[data-edit-action]');
    if (a) { e.preventDefault(); const act = S.state.actions.find((x) => x.id === a.dataset.editAction); if (act) V.actionForm(act); return; }
    const g = e.target.closest('[data-go]');
    if (g) { e.preventDefault(); App.go(g.dataset.go); }
  });
  /* Elementos clicáveis que não são botões respondem a Enter e Espaço */
  document.addEventListener('keydown', (e) => {
    const t = e.target;
    if ((e.key === 'Enter' || e.key === ' ') && t.matches && t.matches('[role="button"], tr[tabindex]')) { e.preventDefault(); t.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
  });
  window.addEventListener('hashchange', App.render);
  App.render();
};
document.addEventListener('DOMContentLoaded', App.init);
