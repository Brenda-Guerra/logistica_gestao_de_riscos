/* ==========================================================================
   views.js — as cinco abas: Painel, Riscos, Ações, Monitoramento, Simulações
   ========================================================================== */

/* Cartão de indicador clicável */
V.kpiBtn = (id, label, value, sub, tip) => `<button class="kpi kpi-btn" data-jump="${id}" ${tip ? `data-tip="${U.esc(tip)}"` : ''}>
  <span class="kpi-label">${label}</span><span class="kpi-value">${value}</span>${sub ? `<span class="kpi-sub">${sub}</span>` : ''}<span class="kpi-go" aria-hidden="true">→</span></button>`;

/* Botões segmentados genéricos */
V.seg = (attr, items, cur, label) => `<div class="seg" role="group" aria-label="${U.esc(label || '')}">${items.map(([v, t]) => `<button type="button" data-${attr}="${v}" aria-pressed="${String(v) === String(cur)}">${t}</button>`).join('')}</div>`;

/* ==========================================================================
   PAINEL — indicadores clicáveis + mapa interativo da rede + painel do elo
   ========================================================================== */
App.netColor = 'risco';
App.netSel = 'n_chip';
App.painelSide = 'top';

V.netSvg = () => {
  const nodes = S.state.nodes;
  const cols = DATA.CAMADAS.map((_, i) => nodes.filter((n) => n.camada === i));
  const W = 1240, H = 560, NW = 180, NH = 50;
  const pos = {};
  cols.forEach((list, c) => {
    const gap = (H - 20) / (list.length + 1);
    list.forEach((n, k) => { pos[n.id] = { x: 20 + c * ((W - NW - 40) / 5), y: gap * (k + 1) - NH / 2 + 22 }; });
  });
  const colorOf = (n) => {
    if (App.netColor === 'risco') {
      const s = M.nodeMaxScore(n.id, 'atual');
      return s ? 'lvl-' + M.level(s).id : 'lvl-none';
    }
    if (n.ttr == null) return 'lvl-none';
    const g = n.ttr - n.tts;
    return g > 4 ? 'lvl-critico' : g > 1 ? 'lvl-alto' : g > 0 ? 'lvl-moderado' : 'lvl-baixo';
  };
  const linked = new Set([App.netSel]);
  S.state.edges.forEach(([a, b]) => { if (a === App.netSel) linked.add(b); if (b === App.netSel) linked.add(a); });
  let svg = `<svg class="net" viewBox="0 0 ${W} ${H}" role="img" aria-label="Rede da cadeia de suprimentos">`;
  DATA.CAMADAS.forEach((c, i) => { svg += `<text x="${20 + i * ((W - NW - 40) / 5) + NW / 2}" y="16" class="net-col" text-anchor="middle">${U.esc(c)}</text>`; });
  S.state.edges.forEach(([a, b, kind]) => {
    const A = pos[a], B = pos[b];
    if (!A || !B) return;
    const x1 = A.x + NW, y1 = A.y + NH / 2, x2 = B.x, y2 = B.y + NH / 2, mx = (x1 + x2) / 2;
    svg += `<path d="M${x1} ${y1} C${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}" class="edge ${kind === 'info' ? 'edge-info' : ''} ${(a === App.netSel || b === App.netSel) ? 'edge-hl' : ''}"/>`;
  });
  nodes.forEach((n) => {
    const p = pos[n.id];
    const nr = M.nodeRisks(n.id).length;
    const gap = M.nodeGap(n);
    const fade = App.netSel && !linked.has(n.id) ? 'fade' : '';
    svg += `<g class="node ${colorOf(n)} ${n.id === App.netSel ? 'sel' : ''} ${fade}" data-node="${n.id}" tabindex="0" role="button" aria-label="${U.esc(n.nome)}" data-tip="${U.esc(n.nome + ' — ' + n.local + (n.ttr != null ? `\nTTR ${U.wk(n.ttr)} sem. · TTS ${U.wk(n.tts)} sem.` : '') + `\n${U.plural(nr, 'risco', 'riscos')} · clique para detalhar`)}">
      <rect x="${p.x}" y="${p.y}" width="${NW}" height="${NH}" rx="8" class="node-box"/>
      <rect x="${p.x}" y="${p.y}" width="6" height="${NH}" rx="3" class="node-stripe"/>
      <text x="${p.x + 14}" y="${p.y + 21}" class="node-name">${U.esc(n.nome.length > 26 ? n.nome.slice(0, 25) + '…' : n.nome)}</text>
      <text x="${p.x + 14}" y="${p.y + 38}" class="node-sub">${nr} ${nr === 1 ? 'risco' : 'riscos'}${gap != null ? ' · ' + (gap > 0 ? '+' + U.num(gap, 1) + ' sem.' : 'coberto') : ''}${n.fonteUnica ? ' · fonte única' : ''}</text>
    </g>`;
  });
  return svg + '</svg>';
};

App.views.painel = (el) => {
  const pfI = M.portfolio('inerente'), pfA = M.portfolio('atual'), pfP = M.portfolio('planejado');
  const crit = pfA.list.filter((x) => x.e.level.id === 'critico').length;
  const alto = pfA.list.filter((x) => x.e.level.id === 'alto').length;
  const nodes = S.state.nodes.filter((n) => n.ttr != null);
  const gaps = nodes.filter((n) => n.ttr > n.tts).sort((a, b) => M.nodePI(b) - M.nodePI(a));
  const kst = S.state.kris.map((k) => M.kriStatus(k));
  const kCrit = kst.filter((s) => s === 'crit').length, kWarn = kst.filter((s) => s === 'warn').length;
  const acts = S.state.actions;
  const late = acts.filter(M.actionLate).length;
  const done = acts.filter((a) => a.status === 'Concluída').length;
  const custo = acts.reduce((s, a) => s + a.custo, 0);
  const red = pfI.pea ? (pfI.pea - pfP.pea) / pfI.pea : 0;
  const newAlerts = S.state.alerts.filter((a) => a.status === 'Novo');

  const sel = S.node(App.netSel) || S.state.nodes[0];
  App.netSel = sel.id;

  el.innerHTML = `
  <section class="kpis">
    ${V.kpiBtn('riscos', 'Riscos ativos', pfA.list.length, `${crit ? `<span class="pill lvl-critico"><i></i>${crit} críticos</span>` : '0 críticos'} · ${alto} altos`, 'Abrir a matriz e a lista de riscos (cenário atual)')}
    ${V.kpiBtn('perda', 'Perda esperada anual', U.money(pfA.pea), `hoje · sem ações: ${U.money(pfI.pea)}`, 'Ver a simulação de perdas (Monte Carlo)')}
    ${V.kpiBtn('plano', 'Redução com o plano', U.pct(red), `custa ${U.money(custo)}/ano`, 'Abrir o plano de ações')}
    ${V.kpiBtn('elos', 'Elos vulneráveis', gaps.length + ' de ' + nodes.length, 'recuperação maior que sobrevivência', 'Colorir o mapa pela lacuna TTR − TTS')}
    ${V.kpiBtn('kri', 'Indicadores em alerta', kCrit + kWarn, `${V.statusPill('crit', kCrit + ' críticos')}`, 'Ver os indicadores fora do limite')}
    ${V.kpiBtn('late', 'Ações atrasadas', late, `${done} de ${acts.length} concluídas`, 'Ver as ações atrasadas')}
  </section>

  ${newAlerts.length ? `<section class="banner">
    <div><b>${U.plural(newAlerts.length, 'sinal novo', 'sinais novos')} na rede.</b> ${U.esc(newAlerts[0].titulo)}.</div>
    <button class="btn btn-primary" id="goAlerts">Ver sinais</button></section>` : ''}

  <section class="card" id="netCard">
    <div class="card-head wrap"><h3>Mapa da cadeia — clique em um elo</h3>
      ${V.seg('color', [['risco', 'Maior risco do elo'], ['gap', 'Lacuna TTR − TTS']], App.netColor, 'Colorir por')}</div>
    <div class="legend">${App.netColor === 'risco'
      ? M.LEVELS.map((l) => V.levelPill(l)).join('') + '<span class="pill lvl-none"><i></i>Sem riscos</span><span class="muted small">nível residual atual</span>'
      : '<span class="pill lvl-baixo"><i></i>Sobrevivência cobre a recuperação</span><span class="pill lvl-moderado"><i></i>até 1 semana descoberta</span><span class="pill lvl-alto"><i></i>1 a 4 semanas</span><span class="pill lvl-critico"><i></i>mais de 4 semanas</span>'}</div>
    <div class="scroll-x">${V.netSvg()}</div>
  </section>

  <section class="grid-2">
    <div class="card node-panel">${App.nodePanel(sel)}</div>
    <div class="card">
      <div class="card-head wrap">${V.seg('side', [['top', 'Riscos prioritários'], ['ttr', 'Teste TTR × TTS']], App.painelSide, 'Painel lateral')}</div>
      ${App.painelSide === 'top' ? App.topRisks(pfA) : App.ttrList(sel)}
    </div>
  </section>`;

  const jump = {
    riscos: () => App.go('riscos', () => { App.mode = 'atual'; }),
    perda: () => App.go('simular', () => { App.simTab = 'mc'; }),
    plano: () => App.go('acoes'),
    elos: () => { App.netColor = 'gap'; App.painelSide = 'ttr'; if (gaps[0]) App.netSel = gaps[0].id; App.render(); U.$('#netCard').scrollIntoView({ behavior: 'smooth', block: 'start' }); },
    kri: () => App.go('monitor', () => { App.monTab = 'kri'; App.kriFilter = 'alerta'; }),
    late: () => App.go('acoes', () => { App.act.status = 'Atrasada'; App.act.estr = ''; }),
  };
  U.$$('[data-jump]', el).forEach((b) => b.addEventListener('click', () => jump[b.dataset.jump]()));
  const ga = U.$('#goAlerts', el);
  if (ga) ga.addEventListener('click', () => App.go('monitor', () => { App.monTab = 'kri'; App.alertFilter = 'Novo'; }));
  U.$$('[data-color]', el).forEach((b) => b.addEventListener('click', () => { App.netColor = b.dataset.color; App.render(); }));
  U.$$('[data-side]', el).forEach((b) => b.addEventListener('click', () => { App.painelSide = b.dataset.side; App.render(); }));
  U.$$('[data-node]', el).forEach((g) => g.addEventListener('click', () => {
    App.netSel = g.dataset.node; App.render();
    if (g.closest('.ttr-list') || window.innerWidth < 1100) U.$('.node-panel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }));
  U.$$('[data-kri]', el).forEach((b) => b.addEventListener('click', () => App.kriForm(S.kri(b.dataset.kri))));
  U.$$('[data-sup]', el).forEach((b) => b.addEventListener('click', () => App.supplierDetail(b.dataset.sup)));
  const f = U.$('#nodeForm', el);
  if (f) f.addEventListener('change', () => {
    const d = U.formData(f);
    sel.ttr = Math.max(0, d.ttr || 0); sel.tts = Math.max(0, d.tts || 0); sel.receita = Math.max(0, d.receita || 0);
    App.refresh(); U.toast('Elo atualizado');
  });
  U.$('#nNew', el).addEventListener('click', () => W.open({ no: sel.id }));
  const ns = U.$('#nSim', el);
  if (ns) ns.addEventListener('click', () => App.go('simular', () => { App.simTab = 'dis'; App.disForNode(sel.id); }));
};

App.nodePanel = (sel) => {
  const rs = M.nodeRisks(sel.id).map((r) => ({ r, e: M.evalRisk(r, 'atual') })).sort((a, b) => b.e.score - a.e.score);
  const kris = S.state.kris.filter((k) => k.no === sel.id);
  const sups = S.state.suppliers.filter((s) => s.no === sel.id);
  const alts = S.state.suppliers.filter((s) => !s.no && sups.some((x) => x.compra === s.compra));
  return `
    <div class="card-head"><div><span class="eyebrow">${U.esc(DATA.CAMADAS[sel.camada])}</span><h3 class="h-big">${U.esc(sel.nome)}</h3></div>${sel.fonteUnica ? '<span class="pill st-warn"><i></i>Fonte única</span>' : ''}</div>
    <p class="muted">${U.esc(sel.papel)} · ${U.esc(sel.local)}</p>
    ${sel.ttr != null ? `<form id="nodeForm" class="form form-3">
      <label data-tip="Semanas para o elo voltar a operar normalmente depois de uma parada">Recuperar — TTR (sem.)<input type="number" name="ttr" min="0" step="0.5" value="${sel.ttr}"></label>
      <label data-tip="Semanas que a empresa aguenta sem o elo (estoques, alternativas)">Sobreviver — TTS (sem.)<input type="number" name="tts" min="0" step="0.5" value="${sel.tts}"></label>
      <label>Receita dependente (R$ mil/sem.)<input type="number" name="receita" min="0" step="100" value="${sel.receita}"></label>
    </form>
    <div class="stat-row">
      <div><span class="muted">Lacuna</span><b class="${sel.ttr > sel.tts ? 'neg' : ''}">${sel.ttr > sel.tts ? U.num(sel.ttr - sel.tts, 1) + ' semanas' : 'coberto'}</b></div>
      <div><span class="muted">Margem em risco</span><b>${U.money(M.nodePI(sel))}</b></div>
      <div><span class="muted">Leitura</span><b>${sel.ttr > sel.tts ? 'Elo vulnerável' : 'Elo protegido'}</b></div>
    </div>` : `<p class="callout">Elo de demanda: riscos aqui afetam vendas e previsão, não o abastecimento.</p>`}
    <h4>Riscos neste elo (${rs.length})</h4>
    ${rs.length ? `<ul class="plain">${rs.map(({ r, e }) => `<li><button class="toprow" data-open-risk="${r.id}">${V.scoreCell(e)}<span class="toptitle"><b>${r.id}</b> ${U.esc(r.titulo)}</span><span class="topval">${U.money(e.pea)}<small>por ano</small></span></button></li>`).join('')}</ul>` : V.empty('Nenhum risco registrado neste elo.')}
    ${kris.length ? `<h4>Indicadores do elo</h4><div class="kri-list">${kris.map((k) => { const st = M.kriStatus(k); return `<button class="kri-row" data-kri="${k.id}">
      <span class="kri-n"><b>${U.esc(k.nome)}</b></span>${C.spark(k.hist, { w: 120, h: 34, color: `var(--st-${st})` })}
      <span class="kri-val">${U.num(k.hist[11], k.dec)}<small>${U.esc(k.unidade)}</small></span>${V.statusPill(st)}</button>`; }).join('')}</div>` : ''}
    ${sups.length ? `<h4>Fornecedores da categoria</h4><div class="sup-mini">${[...sups, ...alts].map((s) => { const sc = M.supplierScore(s), g = M.supplierRating(sc); return `<button class="sup-row" data-sup="${s.id}">
      <span class="grade g-${g}">${g}</span><span><b>${U.esc(s.nome)}</b><small>${s.no ? 'atual' : 'alternativo'} · ${U.pct(s.share)} da compra · Z ${U.num(s.z, 2)} · OTIF ${s.otif}%</small></span><span class="topval">${U.num(sc)}<small>nota</small></span></button>`; }).join('')}</div>` : ''}
    <div class="btn-row">
      <button class="btn btn-primary" id="nNew">Analisar novo risco neste elo</button>
      ${sel.ttr != null ? '<button class="btn" id="nSim">Simular interrupção deste elo</button>' : ''}
    </div>`;
};

App.topRisks = (pf) => {
  const top = pf.list.slice().sort((a, b) => b.e.score - a.e.score || b.e.pea - a.e.pea).slice(0, 9);
  return `<p class="muted small">Maiores riscos hoje (residual atual). Clique para ver causa, impacto e ações.</p>
  <ol class="toplist">${top.map(({ r, e }) => `<li><button class="toprow" data-open-risk="${r.id}">
    ${V.scoreCell(e)}<span class="toptitle"><b>${r.id}</b> ${U.esc(r.titulo)}<small>${U.esc(V.nodeName(r.no))} · ${DATA.TIPOS[r.tipo].nome}</small></span>
    <span class="topval">${U.money(e.pea)}<small>por ano</small></span></button></li>`).join('')}</ol>
  <button class="link" data-go="riscos">Ver todos os riscos →</button>`;
};

App.ttrList = (sel) => {
  const ttrNodes = S.state.nodes.filter((n) => n.ttr != null).sort((a, b) => M.nodePI(b) - M.nodePI(a));
  const maxW = Math.max(...ttrNodes.map((n) => Math.max(n.ttr, n.tts)));
  const weakest = ttrNodes[0];
  return `<div class="legend"><span class="sw sw-ttr"></span>TTR — tempo para recuperar <span class="sw sw-tts"></span>TTS — tempo para sobreviver</div>
    <div class="ttr-list">${ttrNodes.map((n) => `<button class="ttr-row ${n.id === sel.id ? 'sel' : ''}" data-node="${n.id}" data-tip="${U.esc(n.nome)}: TTR ${U.wk(n.ttr)} · TTS ${U.wk(n.tts)} semanas · margem em risco ${U.money(M.nodePI(n))}">
      <span class="ttr-name">${U.esc(n.nome)}</span>
      <span class="ttr-bars"><span class="bar-ttr" style="width:${(n.ttr / maxW) * 100}%"></span><span class="bar-tts" style="width:${(n.tts / maxW) * 100}%"></span></span>
      <span class="ttr-gap ${n.ttr > n.tts ? 'neg' : ''}">${n.ttr > n.tts ? '+' + U.num(n.ttr - n.tts, 1) : 'ok'}</span></button>`).join('')}</div>
    <p class="note">Se o TTR passa do TTS, a empresa perde vendas antes de o elo se recuperar. O elo mais fraco é <b>${U.esc(weakest.nome)}</b> (${U.money(M.nodePI(weakest))} de margem em risco): ele define a robustez da cadeia inteira. Clique numa barra para editar o elo.</p>`;
};

/* ==========================================================================
   RISCOS — matriz clicável + filtros + lista
   ========================================================================== */
App.REG0 = { q: '', cat: '', tipo: '', nivel: '', status: '', cell: null, quad: null };
App.reg = { ...App.REG0, sort: 'score', dir: -1, view: 'matriz' };

App.views.riscos = (el) => {
  const f = App.reg, mode = App.mode;
  const all = S.state.risks.map((r) => ({ r, e: M.evalRisk(r, mode), ei: M.evalRisk(r, 'inerente'), n: M.actionsOf(r.id).length }));
  const ok = (x, skip = '') =>
    (!f.q || (x.r.id + ' ' + x.r.titulo + ' ' + x.r.causa + ' ' + V.nodeName(x.r.no)).toLowerCase().includes(f.q.toLowerCase())) &&
    (skip === 'cat' || !f.cat || x.r.cat === f.cat) && (!f.tipo || x.r.tipo === f.tipo) &&
    (skip === 'nivel' || !f.nivel || x.e.level.id === f.nivel) && (!f.status || x.r.status === f.status);
  const base = all.filter((x) => ok(x));
  const onMap = base.filter((x) => x.r.status !== 'Encerrado');
  let rows = base.filter((x) => (!f.cell || (x.e.pl === f.cell.p && x.e.i === f.cell.i)) && (!f.quad || x.e.quad.id === f.quad));
  const key = {
    id: (x) => x.r.id, titulo: (x) => x.r.titulo, tipo: (x) => x.r.tipo,
    score: (x) => x.e.score * 1e9 + x.e.pea, pea: (x) => x.e.pea, n: (x) => x.n, status: (x) => x.r.status,
  }[f.sort];
  rows.sort((a, b) => { const A = key(a), B = key(b); return (A > B ? 1 : A < B ? -1 : 0) * f.dir; });
  const th = (k, label, cls = '') => `<th class="${cls}"><button class="sort ${f.sort === k ? 'on' : ''}" data-sort="${k}">${label}${f.sort === k ? (f.dir > 0 ? ' ▲' : ' ▼') : ''}</button></th>`;
  const totPea = rows.reduce((s, x) => s + x.e.pea, 0);

  /* Filtros ativos como etiquetas removíveis */
  const act = [];
  if (f.cell) act.push(['cell', `Célula P${f.cell.p} × I${f.cell.i}`]);
  if (f.quad) act.push(['quad', M.QUADS[f.quad].nome]);
  if (f.nivel) act.push(['nivel', 'Nível ' + M.LEVELS.find((l) => l.id === f.nivel).nome.toLowerCase()]);
  if (f.cat) act.push(['cat', S.cat(f.cat).nome]);
  if (f.tipo) act.push(['tipo', DATA.TIPOS[f.tipo].nome]);
  if (f.status) act.push(['status', f.status]);
  if (f.q) act.push(['q', '“' + f.q + '”']);

  /* Matriz 5×5 */
  const cells = {};
  onMap.forEach((x) => { const k = x.e.pl + '-' + x.e.i; (cells[k] = cells[k] || []).push(x); });
  let heat = `<div class="heat heat-compact heat-pick"><div class="heat-ylab">Probabilidade</div><div class="heat-grid">`;
  for (let p = 5; p >= 1; p--) {
    heat += `<div class="heat-rowlab"><b>${p}</b><span>${DATA.PROB[p - 1].nome}</span></div>`;
    for (let i = 1; i <= 5; i++) {
      const lv = M.level(p * i), list = cells[p + '-' + i] || [];
      const on = f.cell && f.cell.p === p && f.cell.i === i;
      const dim = (f.cell && !on) || (f.quad && M.quad(p, i).id !== f.quad);
      heat += `<div class="heat-cell lvl-${lv.id} ${on ? 'on' : ''} ${dim ? 'dim' : ''} ${list.length ? 'has' : ''}" role="button" tabindex="0" data-cell="${p}-${i}" aria-pressed="${on}"
        data-tip="P${p} × I${i} = ${p * i} (${lv.nome})${list.length ? '\n' + list.map((x) => x.r.id + ' ' + x.r.titulo).join('\n') + '\nClique para filtrar a lista' : '\nNenhum risco'}">${list.length ? `<span class="heat-count">${list.length}</span>` : ''}</div>`;
    }
  }
  heat += `<div></div>`;
  for (let i = 1; i <= 5; i++) heat += `<div class="heat-collab"><b>${i}</b><span>${DATA.IMPACT_NAMES[i - 1]}</span></div>`;
  heat += `</div><div class="heat-xlab">Consequência (impacto)</div></div>`;

  /* Quadrantes 2×2 */
  const byQ = { moderada: [], alta: [], baixa: [], media: [] };
  onMap.forEach((x) => byQ[x.e.quad.id].push(x));
  const qbox = (id, arrows) => `<div class="quad q-${id} ${f.quad === id ? 'on' : ''} ${f.quad && f.quad !== id ? 'dim' : ''}" role="button" tabindex="0" data-quad="${id}" aria-pressed="${f.quad === id}">
    <div class="quad-head"><b>${M.QUADS[id].nome}</b><span>${U.plural(byQ[id].length, 'risco', 'riscos')}</span></div>
    <p>${U.esc(M.QUADS[id].foco)}</p><div class="chips">${byQ[id].sort((a, b) => b.e.score - a.e.score).map((x) => `<button class="chip lvl-${x.e.level.id}" data-open-risk="${x.r.id}" data-tip="${U.esc(x.r.titulo)}">${x.r.id}</button>`).join('')}</div>${arrows || ''}</div>`;
  const quads = `<div class="quads"><div class="quad-axis-y">Probabilidade<span>alta ↑ · baixa ↓</span></div><div class="quad-grid">
    ${qbox('moderada', '<div class="arrow-tag">↓ Prevenção</div>')}${qbox('alta', '<div class="arrow-tag">↓ Prevenção · ← redundância, flexibilidade, agilidade</div>')}
    ${qbox('baixa')}${qbox('media', '<div class="arrow-tag">← redundância, flexibilidade, agilidade</div>')}</div>
    <div class="quad-axis-x">Consequência: leves ← → severas</div></div>`;

  /* Níveis (contagem considerando os outros filtros) */
  const lvCount = (id) => all.filter((x) => ok(x, 'nivel') && x.r.status !== 'Encerrado' && x.e.level.id === id).length;
  /* Categorias */
  const catBase = all.filter((x) => ok(x, 'cat') && x.r.status !== 'Encerrado');
  const cats = DATA.CATEGORIAS.map((c) => { const l = catBase.filter((x) => x.r.cat === c.id); return { c, n: l.length, v: l.reduce((s, x) => s + x.e.pea, 0) }; }).filter((x) => x.n).sort((a, b) => b.v - a.v);
  const cmax = Math.max(1, ...cats.map((x) => x.v));

  el.innerHTML = `
  <section class="card toolbar-card">
    <div class="toolbar">
      <span class="muted small">Cenário</span>
      ${V.seg('mode', Object.entries(M.MODES), mode, 'Cenário de avaliação')}
      <input id="fQ" type="search" placeholder="Buscar risco, causa ou elo" value="${U.esc(f.q)}" aria-label="Buscar riscos">
      <div class="toolbar-actions">
        <button class="btn" id="btnCsv">CSV</button>
        <button class="btn" id="btnQuick">Cadastro rápido</button>
        <button class="btn btn-primary" id="btnWiz">+ Nova análise (6 passos)</button>
      </div>
    </div>
    <p class="muted small">${mode === 'inerente' ? 'Inerente: risco sem nenhuma ação.' : mode === 'atual' ? 'Residual atual: considera ações concluídas e, em proporção ao avanço, as em andamento.' : 'Residual planejado: todas as ações do plano concluídas.'} Troque o cenário para ver os riscos mudarem de célula.</p>
  </section>

  <section class="grid-2 grid-wide-right">
    <div class="stack-col">
      <div class="card">
        <div class="card-head wrap"><h3>${f.view === 'matriz' ? 'Matriz de riscos' : 'Mapa de vulnerabilidade'}</h3>
          ${V.seg('view', [['matriz', 'Matriz 5×5'], ['quad', 'Quadrantes']], f.view, 'Visualização')}</div>
        ${f.view === 'matriz' ? heat : quads}
        <div class="legend lv-filter">${M.LEVELS.map((l) => `<button class="pill pill-btn lvl-${l.id} ${f.nivel === l.id ? 'on' : ''} ${f.nivel && f.nivel !== l.id ? 'dim' : ''}" data-nivel="${l.id}" aria-pressed="${f.nivel === l.id}"><i></i>${l.nome} <b>${lvCount(l.id)}</b></button>`).join('')}</div>
        <p class="note">${f.view === 'matriz' ? 'Clique numa célula para listar os riscos dela. Clique de novo para limpar.' : 'Probabilidade alta = nível 3 ou mais; consequência severa = nível 4 ou mais. Clique num quadrante para filtrar.'}</p>
      </div>
      <div class="card">
        <div class="card-head"><h3>Perda esperada por categoria</h3><span class="muted">clique para filtrar</span></div>
        <div class="cat-bars">${cats.map((x) => `<button class="cat-bar ${f.cat === x.c.id ? 'on' : ''} ${f.cat && f.cat !== x.c.id ? 'dim' : ''}" data-cat="${x.c.id}" data-tip="${U.esc(x.c.nome)}: ${x.n} riscos · ${U.money(x.v)}/ano\nFatores: ${U.esc(x.c.fatores.join('; '))}">
          <span class="cb-label">${U.esc(x.c.nome)} <small>${x.n}</small></span>
          <span class="cb-track"><span style="width:${(x.v / cmax) * 100}%"></span></span><span class="cb-val">${U.money(x.v)}</span></button>`).join('') || V.empty('Nenhuma categoria com esses filtros.')}</div>
      </div>
    </div>

    <div class="card">
      <div class="card-head wrap"><h3>${rows.length} ${rows.length === 1 ? 'risco' : 'riscos'} <span class="muted small">· ${U.money(totPea)}/ano</span></h3>
        <div class="filters">
          ${V.seg('tipo', [['', 'Todas'], ...Object.entries(DATA.TIPOS).map(([k, t]) => [k, t.nome])], f.tipo, 'Natureza')}
          <select id="fStatus" aria-label="Situação"><option value="">Todas as situações</option>${DATA.STATUS_RISCO.map((s) => `<option ${f.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
        </div></div>
      ${act.length ? `<div class="active-filters">${act.map(([k, t]) => `<button class="fchip" data-clear="${k}" aria-label="Remover filtro ${U.esc(t)}">${U.esc(t)} <span aria-hidden="true">✕</span></button>`).join('')}<button class="link" data-clear="all">Limpar tudo</button></div>` : ''}
      <div class="table-wrap"><table class="table table-hover">
        <thead><tr>${th('id', 'ID')}${th('titulo', 'Risco')}${th('tipo', 'Natureza')}${th('score', 'P×I · nível')}${th('pea', 'Perda/ano', 'num')}${th('n', 'Ações', 'num')}${th('status', 'Situação')}</tr></thead>
        <tbody>${rows.map(({ r, e, ei, n }) => `<tr data-open-risk="${r.id}" tabindex="0">
          <td class="mono">${r.id}</td>
          <td class="wide"><b>${U.esc(r.titulo)}</b><small>${U.esc(V.nodeName(r.no))} · ${U.esc(S.cat(r.cat).nome)}</small></td>
          <td>${V.typeTag(r.tipo)}</td>
          <td class="nowrap"><span class="score-cell">${V.scoreCell(e)}${V.levelPill(e.level)}</span>${mode !== 'inerente' && ei.score !== e.score ? `<small>sem ações: ${ei.score}</small>` : ''}</td>
          <td class="num">${U.money(e.pea)}</td><td class="num">${n || '<span class="neg" data-tip="Sem ação de tratamento">0</span>'}</td><td class="nowrap">${U.esc(r.status)}</td></tr>`).join('') || `<tr><td colspan="7">${V.empty('Nenhum risco com esses filtros.')}</td></tr>`}</tbody>
      </table></div>
    </div>
  </section>

  <details class="card fold">
    <summary><h3>Critérios de pontuação</h3><span class="muted small">escalas de probabilidade e impacto usadas na matriz</span></summary>
    <div class="grid-2 grid-wide-right-2 fold-body">
      <div class="table-wrap"><table class="table wrap-head"><thead><tr><th class="num">P</th><th>Descrição</th><th>Frequência anual</th></tr></thead><tbody>
        ${DATA.PROB.slice().reverse().map((p) => `<tr><td class="num">${p.n}</td><td>${p.nome}</td><td>${p.faixa}<small>${p.exemplo}</small></td></tr>`).join('')}
      </tbody></table></div>
      <div><div class="table-wrap"><table class="table crit-table wrap-head"><thead><tr><th>Dimensão</th>${DATA.IMPACT_NAMES.map((n, i) => `<th>${i + 1} · ${n}</th>`).join('')}</tr></thead><tbody>
        ${Object.values(DATA.IMPACT).map((d) => `<tr><td><b>${d.nome}</b></td>${d.niveis.map((t) => `<td>${U.esc(t)}</td>`).join('')}</tr>`).join('')}
      </tbody></table></div>
      <p class="note">Impacto = pior nota entre as quatro dimensões. Nível: baixo 1–4 · moderado 5–9 · alto 10–14 · crítico 15–25.</p></div>
    </div>
  </details>`;

  const clearSel = () => { f.cell = null; f.quad = null; };
  U.$$('[data-mode]', el).forEach((b) => b.addEventListener('click', () => { App.mode = b.dataset.mode; clearSel(); App.render(); }));
  U.$$('[data-view]', el).forEach((b) => b.addEventListener('click', () => { f.view = b.dataset.view; clearSel(); App.render(); }));
  U.$$('[data-cell]', el).forEach((c) => c.addEventListener('click', () => {
    const [p, i] = c.dataset.cell.split('-').map(Number);
    f.quad = null; f.cell = f.cell && f.cell.p === p && f.cell.i === i ? null : { p, i };
    App.render();
  }));
  U.$$('[data-quad]', el).forEach((q) => q.addEventListener('click', (e) => {
    if (e.target.closest('[data-open-risk]')) return;
    f.cell = null; f.quad = f.quad === q.dataset.quad ? null : q.dataset.quad; App.render();
  }));
  U.$$('[data-nivel]', el).forEach((b) => b.addEventListener('click', () => { f.nivel = f.nivel === b.dataset.nivel ? '' : b.dataset.nivel; App.render(); }));
  U.$$('[data-cat]', el).forEach((b) => b.addEventListener('click', () => { f.cat = f.cat === b.dataset.cat ? '' : b.dataset.cat; App.render(); }));
  U.$$('[data-tipo]', el).forEach((b) => b.addEventListener('click', () => { f.tipo = b.dataset.tipo; App.render(); }));
  U.$$('[data-clear]', el).forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.clear;
    if (k === 'all') Object.assign(f, App.REG0); else f[k] = App.REG0[k];
    App.render();
  }));
  U.$('#fStatus', el).addEventListener('change', (e) => { f.status = e.target.value; App.render(); });
  U.$('#fQ', el).addEventListener('input', (e) => {
    f.q = e.target.value; App.render();
    const i = U.$('#fQ'); i.focus(); i.setSelectionRange(i.value.length, i.value.length);
  });
  U.$$('[data-sort]', el).forEach((b) => b.addEventListener('click', () => { const k = b.dataset.sort; f.dir = f.sort === k ? -f.dir : (k === 'id' || k === 'titulo' ? 1 : -1); f.sort = k; App.render(); }));
  U.$('#btnQuick', el).addEventListener('click', () => V.riskForm(null));
  U.$('#btnWiz', el).addEventListener('click', () => W.open());
  U.$('#btnCsv', el).addEventListener('click', () => App.exportRisksCsv());
};

App.exportRisksCsv = () => {
  const head = ['ID', 'Risco', 'Categoria', 'Natureza', 'Elo', 'Responsável', 'Situação', 'P', 'I', 'P×I', 'Nível inerente', 'Perda esperada inerente (R$ mil)', 'Nível residual planejado', 'Perda esperada residual (R$ mil)', 'Perda mín (R$ mil)', 'Perda provável (R$ mil)', 'Perda máx (R$ mil)', 'Causa', 'Consequência'];
  const rows = S.state.risks.map((r) => {
    const a = M.evalRisk(r, 'inerente'), b = M.evalRisk(r, 'planejado');
    return [r.id, r.titulo, S.cat(r.cat).nome, DATA.TIPOS[r.tipo].nome, V.nodeName(r.no), r.resp, r.status, a.pl, a.i, a.score, a.level.nome, Math.round(a.pea), b.level.nome, Math.round(b.pea), r.sev[0], r.sev[1], r.sev[2], r.causa, r.consequencia];
  });
  U.download('registro-de-riscos.csv', U.csv([head, ...rows]), 'text/csv');
};

/* ==========================================================================
   AÇÕES — plano de tratamento
   ========================================================================== */
App.act = { estr: '', status: '', sort: 'bc' };
App.views.acoes = (el) => {
  const f = App.act;
  const all = S.state.actions.map((a) => {
    const ben = M.actionBenefit(a);
    return { a, ben, bc: a.custo ? ben / a.custo : 0, late: M.actionLate(a) };
  });
  const stOk = (a) => !f.status || (f.status === 'Atrasada' ? M.actionLate(a) : a.status === f.status);
  const rows = all.filter(({ a }) => (!f.estr || a.estrategia === f.estr) && stOk(a));
  const sorters = { bc: (x) => -x.bc, ben: (x) => -x.ben, custo: (x) => -x.a.custo, prazo: (x) => x.a.prazo || '9', id: (x) => x.a.id };
  rows.sort((x, y) => { const A = sorters[f.sort](x), B = sorters[f.sort](y); return A > B ? 1 : A < B ? -1 : 0; });
  const custo = all.reduce((s, x) => s + x.a.custo, 0);
  const pI = M.portfolio('inerente').pea, pA = M.portfolio('atual').pea, pP = M.portfolio('planejado').pea;
  const byE = Object.keys(DATA.ESTRATEGIAS).map((k) => {
    const l = all.filter((x) => x.a.estrategia === k);
    return { k, n: l.length, custo: l.reduce((s, x) => s + x.a.custo, 0), ben: l.reduce((s, x) => s + x.ben, 0) };
  });
  const noAction = S.state.risks.filter((r) => r.status !== 'Encerrado' && r.status !== 'Aceito' && !M.actionsOf(r.id).length && M.evalRisk(r).score >= 10);
  const cnt = (s) => all.filter(({ a }) => (!f.estr || a.estrategia === f.estr) && (!s || (s === 'Atrasada' ? M.actionLate(a) : a.status === s))).length;
  const STR_TXT = { prob: 'Atua antes da interrupção.', cons: 'A cadeia sofre o impacto, mas não colapsa.', transf: 'Muda quem paga a conta; não elimina a exposição.' };
  const ranking = rows.slice().sort((x, y) => y.bc - x.bc).slice(0, 10);

  el.innerHTML = `
  <section class="effect-bar card">
    <div class="eb-steps">
      <div><span class="muted">Sem ações</span><b>${U.money(pI)}</b><small>perda esperada/ano</small></div>
      <span class="eb-arrow" aria-hidden="true">→</span>
      <div><span class="muted">Hoje</span><b>${U.money(pA)}</b><small>com o que já foi feito</small></div>
      <span class="eb-arrow" aria-hidden="true">→</span>
      <div><span class="muted">Plano completo</span><b>${U.money(pP)}</b><small>custo do plano ${U.money(custo)}/ano</small></div>
    </div>
    <div class="eb-track" data-tip="Parte da perda já eliminada (escuro) e o que falta com o plano (claro)"><span class="eb-done" style="width:${((pI - pA) / pI) * 100}%"></span><span class="eb-todo" style="width:${((pA - pP) / pI) * 100}%"></span></div>
  </section>

  ${noAction.length ? `<section class="banner warn"><div><b>${U.plural(noAction.length, 'risco alto ou crítico', 'riscos altos ou críticos')} sem ação:</b> ${noAction.map((r) => V.riskLink(r.id)).join(', ')}. Clique para abrir e criar uma ação.</div></section>` : ''}

  <section class="grid-3">
    ${byE.map((x) => `<button class="strat-box strat-btn ${f.estr === x.k ? 'on' : ''} ${f.estr && f.estr !== x.k ? 'dim' : ''}" data-estr="${x.k}" aria-pressed="${f.estr === x.k}">
      <span class="strat-top"><b>${DATA.ESTRATEGIAS[x.k]}</b><span class="type-n">${x.n}</span></span>
      <small>${DATA.ALAVANCAS[x.k].join(' · ')} — ${STR_TXT[x.k]}</small>
      <span class="strat-nums"><span><b>${U.money(x.custo)}</b> custo/ano</span><span><b>${U.money(x.ben)}</b> benefício/ano</span></span></button>`).join('')}
  </section>

  <section class="card">
    <div class="toolbar">
      ${V.seg('ast', [['', `Todas <small class="cnt">${cnt('')}</small>`], ...DATA.STATUS_ACAO.map((s) => [s, `${s} <small class="cnt">${cnt(s)}</small>`]), ['Atrasada', `Atrasadas <small class="cnt">${cnt('Atrasada')}</small>`]], f.status, 'Status')}
      <label class="inline">Ordenar<select id="aSort">${[['bc', 'Retorno (B/C)'], ['ben', 'Benefício'], ['custo', 'Custo'], ['prazo', 'Prazo'], ['id', 'Código']].map(([k, v]) => `<option value="${k}" ${f.sort === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <div class="toolbar-actions"><button class="btn" id="aCsv">CSV</button><button class="btn btn-primary" id="aNew">+ Nova ação</button></div>
    </div>
    <div class="table-wrap"><table class="table table-hover"><thead><tr><th>ID</th><th>Ação</th><th>Riscos</th><th>Efeito</th><th class="num">Custo/ano</th><th class="num">Benefício/ano</th><th class="num">B/C</th><th>Progresso</th><th>Prazo</th></tr></thead><tbody>
      ${rows.map(({ a, ben, bc, late }) => `<tr data-edit-action="${a.id}" tabindex="0">
        <td class="mono">${a.id}</td><td class="wide"><b>${U.esc(a.titulo)}</b><small>${DATA.ESTRATEGIAS[a.estrategia]} · ${U.esc(a.alavanca)} · ${U.esc(a.resp)}</small></td>
        <td>${a.riscos.map(V.riskLink).join(' ')}</td>
        <td class="small">${V.effect(a)}</td><td class="num">${U.money(a.custo)}</td><td class="num">${U.money(ben)}</td>
        <td class="num"><span class="bc ${bc >= 1 ? 'pos' : 'neg'}">${U.num(bc, 1)}×</span></td>
        <td>${V.progress(a.progresso)}<small>${a.progresso}% · ${U.esc(a.status)}</small></td>
        <td class="nowrap">${U.dateBR(a.prazo)}${late ? '<br><span class="pill st-crit"><i></i>Atrasada</span>' : ''}</td></tr>`).join('') || `<tr><td colspan="9">${V.empty('Nenhuma ação com esses filtros.')}</td></tr>`}
    </tbody></table></div>
    <p class="note">Benefício = quanto a perda esperada anual subiria se a ação saísse do plano. B/C acima de 1× indica que a ação reduz mais perda média do que custa. Seguros e redundâncias abaixo de 1× podem valer a pena porque protegem contra os anos ruins, não só a média.</p>
  </section>
  ${ranking.length ? `<section class="card">
    <div class="card-head"><h3>Retorno por real investido</h3><span class="muted">${f.estr || f.status ? 'ações filtradas' : 'top 10'} · clique para editar</span></div>
    ${C.hbars(ranking.map((x) => ({ labelHtml: `<button class="link" data-edit-action="${x.a.id}">${x.a.id}</button> ${U.esc(x.a.titulo)}`, value: x.bc, color: x.bc >= 1 ? 'var(--s3)' : 'var(--s2)', tip: `${U.money(x.ben)} de benefício por ${U.money(x.a.custo)} de custo` })), { fmt: (v) => U.num(v, 1) + '×' })}
  </section>` : ''}`;

  U.$$('[data-estr]', el).forEach((b) => b.addEventListener('click', () => { f.estr = f.estr === b.dataset.estr ? '' : b.dataset.estr; App.render(); }));
  U.$$('[data-ast]', el).forEach((b) => b.addEventListener('click', () => { f.status = b.dataset.ast; App.render(); }));
  U.$('#aSort', el).addEventListener('change', (e) => { f.sort = e.target.value; App.render(); });
  U.$('#aNew', el).addEventListener('click', () => V.actionForm(null));
  U.$('#aCsv', el).addEventListener('click', () => {
    const head = ['ID', 'Ação', 'Riscos', 'Estratégia', 'Alavanca', 'Redução prob. (%)', 'Redução perda (%)', 'Cobertura (%)', 'Franquia (R$ mil)', 'Custo anual (R$ mil)', 'Benefício anual (R$ mil)', 'Status', 'Progresso (%)', 'Responsável', 'Prazo'];
    U.download('plano-de-acoes.csv', U.csv([head, ...all.map(({ a, ben }) => [a.id, a.titulo, a.riscos.join(' '), DATA.ESTRATEGIAS[a.estrategia], a.alavanca, Math.round(a.redP * 100), Math.round(a.redC * 100), Math.round((a.cobertura || 0) * 100), a.franquia || 0, a.custo, Math.round(ben), a.status, a.progresso, a.resp, a.prazo])]), 'text/csv');
  });
};

/* ==========================================================================
   MONITORAMENTO — indicadores, sinais e fornecedores
   ========================================================================== */
App.monTab = 'kri';
App.kriFilter = '';
App.alertFilter = 'abertos';
App.views.monitor = (el) => {
  el.innerHTML = `<div class="subtabs">${V.seg('mon', [['kri', 'Indicadores e sinais'], ['forn', 'Fornecedores']], App.monTab, 'Monitoramento')}</div><div id="monBody" class="stack-col"></div>`;
  U.$$('[data-mon]', el).forEach((b) => b.addEventListener('click', () => { App.monTab = b.dataset.mon; App.render(); }));
  (App.monTab === 'forn' ? App.supView : App.kriView)(U.$('#monBody', el));
};

App.kriView = (el) => {
  const all = S.state.kris.map((k) => ({ k, st: M.kriStatus(k) })).sort((a, b) => ({ crit: 0, warn: 1, ok: 2 }[a.st] - { crit: 0, warn: 1, ok: 2 }[b.st]));
  const kf = App.kriFilter;
  const kris = all.filter((x) => !kf || (kf === 'alerta' ? x.st !== 'ok' : x.st === kf));
  const af = App.alertFilter;
  const alerts = S.state.alerts.filter((a) => af === 'todos' || (af === 'abertos' ? ['Novo', 'Reconhecido'].includes(a.status) : a.status === af)).sort((a, b) => (a.data < b.data ? 1 : -1));
  const sevCls = { Alta: 'crit', Média: 'warn', Baixa: 'ok' };
  const lim = (k) => (k.dir === 'maior' ? `normal ≥ ${U.num(k.verde, k.dec)} · crítico < ${U.num(k.vermelho, k.dec)}` : `normal ≤ ${U.num(k.verde, k.dec)} · crítico > ${U.num(k.vermelho, k.dec)}`);
  const n = (s) => all.filter((x) => x.st === s).length;
  const tile = (id, label, value, sub) => `<button class="kpi kpi-btn ${kf === id ? 'on' : ''}" data-kf="${id}" aria-pressed="${kf === id}"><span class="kpi-label">${label}</span><span class="kpi-value">${value}</span><span class="kpi-sub">${sub}</span></button>`;

  el.innerHTML = `
  <section class="kpis kpis-4">
    ${tile('crit', `${V.statusPill('crit', 'Críticos')}`, n('crit'), 'passaram do limite vermelho')}
    ${tile('warn', `${V.statusPill('warn', 'Atenção')}`, n('warn'), 'entre os limites')}
    ${tile('ok', `${V.statusPill('ok', 'Normais')}`, n('ok'), 'dentro da faixa')}
    ${tile('', 'Todos', all.length, 'indicadores acompanhados')}
  </section>
  <section class="grid-2 grid-wide-left">
    <div class="card">
      <div class="card-head"><h3>Indicadores-chave de risco</h3><span class="muted">últimos 12 meses · clique para atualizar a leitura</span></div>
      <div class="kri-grid">${kris.map(({ k, st }) => {
        const last = k.hist[11], prev = k.hist[10];
        const trend = last === prev ? '→' : last > prev ? '↑' : '↓';
        const linked = S.state.risks.filter((r) => r.kri === k.id);
        return `<button class="kri-card st-${st}" data-kri="${k.id}">
          <span class="kri-top"><span class="kri-name">${U.esc(k.nome)}</span>${V.statusPill(st)}</span>
          <span class="kri-mid"><span class="kri-big">${U.num(last, k.dec)}<small> ${U.esc(k.unidade)}</small></span><span class="muted">${trend} ${U.num(prev, k.dec)} no mês anterior</span></span>
          ${C.spark(k.hist, { w: 260, h: 54, color: `var(--st-${st})`, lines: [{ v: k.verde, cls: 'ok' }, { v: k.vermelho, cls: 'crit' }], lo: Math.min(k.verde, k.vermelho), hi: Math.max(k.verde, k.vermelho) })}
          <span class="kri-foot"><span>${lim(k)}</span><span>${U.esc(V.nodeName(k.no))}${linked.length ? ' · ' + linked.map((r) => r.id).join(', ') : ''}</span></span>
        </button>`;
      }).join('') || V.empty('Nenhum indicador neste filtro.')}</div>
    </div>
    <div class="card">
      <div class="card-head wrap"><h3>Sinais e eventos na rede</h3>
        <select id="alFilter" aria-label="Filtrar alertas">${[['abertos', 'Abertos'], ['Novo', 'Novos'], ['Reconhecido', 'Reconhecidos'], ['Convertido', 'Convertidos em risco'], ['Descartado', 'Descartados'], ['todos', 'Todos']].map(([k, v]) => `<option value="${k}" ${af === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
      <p class="muted small">Detectar cedo e decidir rápido foi o que separou a Nokia da Ericsson.</p>
      <div class="alerts">${alerts.map((a) => `<article class="alert">
        <div class="alert-top">${V.statusPill(sevCls[a.sev], 'Severidade ' + a.sev.toLowerCase())}<span class="muted small">${U.dateBR(a.data)} · ${U.esc(a.fonte)}</span></div>
        <h4>${U.esc(a.titulo)}</h4><p class="small">${U.esc(a.texto)}</p>
        <div class="alert-foot"><span class="muted small">${U.esc(V.nodeName(a.no))} · ${U.esc(a.status)}${a.risco ? ' · ' + V.riskLink(a.risco) : ''}</span>
          <span class="alert-btns">
            ${a.status === 'Novo' ? `<button class="btn btn-small" data-al="${a.id}" data-do="ack">Reconhecer</button>` : ''}
            ${['Novo', 'Reconhecido'].includes(a.status) ? `<button class="btn btn-small" data-al="${a.id}" data-do="conv">Analisar como risco</button><button class="btn btn-small btn-quiet" data-al="${a.id}" data-do="disc">Descartar</button>` : ''}
          </span></div></article>`).join('') || V.empty('Nenhum sinal neste filtro.')}</div>
      <button class="btn" id="alNew">+ Registrar sinal</button>
    </div>
  </section>`;

  U.$$('[data-kf]', el).forEach((b) => b.addEventListener('click', () => { App.kriFilter = App.kriFilter === b.dataset.kf ? '' : b.dataset.kf; App.render(); }));
  U.$$('[data-kri]', el).forEach((b) => b.addEventListener('click', () => App.kriForm(S.kri(b.dataset.kri))));
  U.$('#alFilter', el).addEventListener('change', (e) => { App.alertFilter = e.target.value; App.render(); });
  U.$$('[data-al]', el).forEach((b) => b.addEventListener('click', () => {
    const a = S.state.alerts.find((x) => x.id === b.dataset.al);
    if (b.dataset.do === 'ack') { a.status = 'Reconhecido'; App.refresh(); U.toast('Sinal reconhecido'); }
    if (b.dataset.do === 'disc') { a.status = 'Descartado'; App.refresh(); U.toast('Sinal descartado'); }
    if (b.dataset.do === 'conv') W.open({ no: a.no, titulo: a.titulo, causa: a.texto, alertId: a.id });
  }));
  U.$('#alNew', el).addEventListener('click', () => U.modal({
    title: 'Registrar sinal ou evento', wide: true,
    body: `<form id="alForm" class="form">
      <label class="span-2">Título<input name="titulo" required></label>
      <label>Elo<select name="no">${U.opts(S.state.nodes, 'n_fab')}</select></label>
      <label>Severidade<select name="sev"><option>Alta</option><option selected>Média</option><option>Baixa</option></select></label>
      <label>Fonte<input name="fonte" value="Equipe interna"></label><label>Data<input type="date" name="data" value="${U.today()}"></label>
      <label class="span-2">Descrição<textarea name="texto" rows="3"></textarea></label></form>`,
    actions: [{ label: 'Cancelar' }, { label: 'Registrar', cls: 'btn-primary', onClick: (w) => {
      const f = U.formData(w.querySelector('#alForm'));
      if (!f.titulo.trim()) { U.toast('Dê um título ao sinal'); return false; }
      S.state.alerts.push({ id: S.nextId(S.state.alerts, 'E'), ...f, status: 'Novo', risco: null });
      App.alertFilter = 'abertos'; App.refresh(); U.toast('Sinal registrado');
    } }],
  }));
};

App.kriForm = (k) => U.modal({
  title: k.nome,
  body: `<div class="kri-modal">${C.spark(k.hist, { w: 480, h: 90, color: `var(--st-${M.kriStatus(k)})`, lines: [{ v: k.verde, cls: 'ok' }, { v: k.vermelho, cls: 'crit' }], lo: Math.min(k.verde, k.vermelho), hi: Math.max(k.verde, k.vermelho) })}</div>
    <form id="kForm" class="form">
    <label>Leitura de ${DATA.MESES[11]} (${U.esc(k.unidade || 'valor')})<input type="number" step="any" name="v" value="${k.hist[11]}"></label>
    <label>Sentido<select name="dir"><option value="maior" ${k.dir === 'maior' ? 'selected' : ''}>Maior é melhor</option><option value="menor" ${k.dir === 'menor' ? 'selected' : ''}>Menor é melhor</option></select></label>
    <label>Limite normal<input type="number" step="any" name="verde" value="${k.verde}"></label>
    <label>Limite crítico<input type="number" step="any" name="vermelho" value="${k.vermelho}"></label>
    <p class="note span-2">Histórico: ${k.hist.map((v, i) => DATA.MESES[i] + ' ' + U.num(v, k.dec)).join(' · ')}</p></form>`,
  actions: [{ label: 'Cancelar' }, { label: 'Salvar', cls: 'btn-primary', onClick: (w) => {
    const f = U.formData(w.querySelector('#kForm'));
    if ([f.v, f.verde, f.vermelho].some((x) => x == null || isNaN(x))) { U.toast('Preencha todos os valores'); return false; }
    k.hist[11] = f.v; k.dir = f.dir; k.verde = f.verde; k.vermelho = f.vermelho;
    App.refresh(); U.toast('Indicador atualizado: ' + M.STATUS_TXT[M.kriStatus(k)]);
  } }],
});

/* ---------------- Fornecedores ---------------- */
App.PESO_NOMES = { financeiro: 'Saúde financeira (Z-score)', dependencia: 'Dependência e fonte única', desempenho: 'Desempenho de entrega (OTIF)', geografico: 'Risco do país e da região', leadtime: 'Variabilidade do lead time', ciber: 'Exposição cibernética' };
App.PESO_CORES = { financeiro: 'var(--s1)', dependencia: 'var(--s2)', desempenho: 'var(--s3)', geografico: 'var(--s4)', leadtime: 'var(--s5)', ciber: 'var(--s7)' };
App.supView = (el) => {
  const w = S.state.pesos;
  const tw = Object.values(w).reduce((a, b) => a + b, 0) || 1;
  const list = S.state.suppliers.map((s) => ({ s, parts: M.supplierParts(s), sc: M.supplierScore(s) })).sort((a, b) => b.sc - a.sc);
  const hhi = M.hhi().sort((a, b) => b.hhi - a.hhi);

  el.innerHTML = `
  <section class="card">
    <div class="card-head"><h3>Pontuação de risco por fornecedor</h3><span class="muted">0 = risco mínimo · 100 = máximo · clique para detalhar</span></div>
    <div class="legend">${Object.keys(App.PESO_NOMES).map((k) => `<span class="sw" style="background:${App.PESO_CORES[k]}"></span>${App.PESO_NOMES[k].split(' (')[0]}`).join(' ')}</div>
    <div class="table-wrap"><table class="table table-hover"><thead><tr><th>Fornecedor</th><th>Compra</th><th class="num">Part.</th><th class="num">Z</th><th class="num">OTIF</th><th>Composição da nota</th><th class="num">Nota</th><th>Classe</th></tr></thead><tbody>
      ${list.map(({ s, parts, sc }) => { const rt = M.supplierRating(sc); return `<tr data-sup="${s.id}" tabindex="0">
        <td class="wide"><b>${U.esc(s.nome)}</b><small>${U.esc(s.pais)}${s.fonteUnica ? ' · fonte única' : ''}${s.no ? '' : ' · alternativo'}</small></td>
        <td>${U.esc(s.compra)}</td><td class="num">${U.pct(s.share)}</td>
        <td class="num ${s.z < 1.81 ? 'neg' : s.z < 2.99 ? 'warn' : ''}">${U.num(s.z, 2)}</td><td class="num">${s.otif}%</td>
        <td><div class="stack" data-tip="${U.esc(Object.keys(parts).map((k) => App.PESO_NOMES[k] + ': ' + U.num(parts[k]) + ' × peso ' + w[k]).join('\n'))}">${Object.keys(parts).map((k) => `<span style="width:${(parts[k] * w[k]) / tw}%;background:${App.PESO_CORES[k]}"></span>`).join('')}</div></td>
        <td class="num"><b>${U.num(sc)}</b></td><td><span class="grade g-${rt}">${rt}</span></td></tr>`; }).join('')}
    </tbody></table></div>
    <p class="note">Classes: A até 35 · B 35 a 50 · C 50 a 65 · D acima de 65. Z-score de Altman abaixo de 1,81 indica risco de insolvência; entre 1,81 e 2,99, zona cinzenta.</p>
  </section>
  <section class="grid-2">
    <div class="card">
      <div class="card-head"><h3>Pesos dos critérios</h3><button class="link" id="wReset">Restaurar padrão</button></div>
      <form id="wForm" class="weights">${Object.keys(App.PESO_NOMES).map((k) => `<label><span>${App.PESO_NOMES[k]}</span><input type="range" name="${k}" min="0" max="50" step="5" value="${w[k]}"><b>${U.num((w[k] / tw) * 100)}%</b></label>`).join('')}</form>
      <p class="note">Arraste para mudar a importância de cada critério e veja a classificação mudar.</p>
    </div>
    <div class="card">
      <div class="card-head"><h3>Concentração de compras (HHI)</h3></div>
      ${hhi.map((h) => { const c = M.hhiClass(h.hhi); return `<div class="hhi"><div class="hhi-top"><b>${U.esc(h.compra)}</b>${V.statusPill(c.id, c.nome)}</div>
        ${C.hbars([{ label: h.list.map((s) => s.nome.split(' (')[0] + ' ' + U.pct(s.share)).join(' · '), value: h.hhi, color: `var(--st-${c.id})` }], { max: 10000, fmt: (v) => U.num(v) })}</div>`; }).join('')}
      <p class="note">HHI = soma dos quadrados das participações (%); fonte única = 10.000. Política interna: até 3.400 diversificado, até 6.000 moderado, acima disso alto. Diversificação reduz riscos (princípio 2).</p>
    </div>
  </section>`;

  U.$$('[data-sup]', el).forEach((r) => r.addEventListener('click', () => App.supplierDetail(r.dataset.sup)));
  U.$('#wForm', el).addEventListener('input', (e) => {
    S.state.pesos[e.target.name] = Number(e.target.value);
    clearTimeout(App._wt); App._wt = setTimeout(App.refresh, 120);
  });
  U.$('#wReset', el).addEventListener('click', () => { S.state.pesos = DATA.seed().pesos; App.refresh(); });
};

App.supplierDetail = (id) => {
  const s = S.state.suppliers.find((x) => x.id === id);
  if (!s) return;
  const parts = M.supplierParts(s), sc = M.supplierScore(s), g = M.supplierRating(sc);
  const node = s.no && S.node(s.no);
  const rs = node ? M.nodeRisks(node.id) : [];
  const peers = S.state.suppliers.filter((x) => x.compra === s.compra && x.id !== s.id);
  U.modal({
    title: s.nome, wide: true,
    body: `<div class="detail-head"><span class="grade g-${g}">${g}</span> <b>Nota ${U.num(sc)}</b> <span class="muted">${U.esc(s.compra)} · ${U.esc(s.pais)} · ${U.esc(s.cert)}</span></div>
      <div class="grid-2 gap-l">
        <div><h4>Composição (0 a 100 por critério)</h4>${C.hbars(Object.keys(parts).map((k) => ({ label: App.PESO_NOMES[k], value: parts[k], color: App.PESO_CORES[k] })), { max: 100, fmt: (v) => U.num(v) })}</div>
        <div><dl class="dl">
          <dt>Gasto anual</dt><dd>${s.gasto ? U.money(s.gasto) : '—'}</dd>
          <dt>Participação</dt><dd>${U.pct(s.share)} da compra${s.fonteUnica ? ' · fonte única' : ''}</dd>
          <dt>Z-score</dt><dd>${U.num(s.z, 2)} ${s.z < 1.81 ? '(risco de insolvência)' : s.z < 2.99 ? '(zona cinzenta)' : '(saudável)'}</dd>
          <dt>OTIF</dt><dd>${s.otif}%</dd><dt>Lead time</dt><dd>${s.lead} dias · CV ${U.num(s.cvLead, 2)}</dd>
        </dl>
        ${peers.length ? `<h4>Outras fontes da mesma compra</h4><ul class="plain bullets">${peers.map((p) => `<li>${U.esc(p.nome)} — ${U.pct(p.share)} · nota ${U.num(M.supplierScore(p))}</li>`).join('')}</ul>` : '<p class="callout">Nenhuma outra fonte cadastrada para esta compra.</p>'}
        ${rs.length ? `<h4>Riscos ligados a este elo</h4><div class="chips">${rs.map((r) => `<button class="chip" data-open-risk="${r.id}" data-tip="${U.esc(r.titulo)}">${r.id}</button>`).join('')}</div>` : ''}</div>
      </div>`,
    actions: node ? [{ label: 'Ver no mapa', onClick: () => App.go('painel', () => { App.netSel = node.id; }) }, { label: 'Fechar', cls: 'btn-primary' }] : [{ label: 'Fechar', cls: 'btn-primary' }],
  });
};

/* ==========================================================================
   SIMULAÇÕES — Monte Carlo e interrupção
   ========================================================================== */
App.simTab = 'mc';
App.views.simular = (el) => {
  el.innerHTML = `<div class="subtabs">${V.seg('sim', [['mc', 'Perda anual (Monte Carlo)'], ['dis', 'Simulador de interrupção']], App.simTab, 'Simulação')}</div><div id="simBody" class="stack-col"></div>`;
  U.$$('[data-sim]', el).forEach((b) => b.addEventListener('click', () => { App.simTab = b.dataset.sim; App.render(); }));
  (App.simTab === 'dis' ? App.disView : App.mcView)(U.$('#simBody', el));
};

App.mc = { n: 10000, seed: 2026, res: null, hist: 'inerente' };
const SERIES = { inerente: 'var(--s2)', atual: 'var(--s1)', planejado: 'var(--s3)' };

App.mcView = (el) => {
  const st = App.mc, emp = S.state.empresa;
  el.innerHTML = `
  <section class="card">
    <form id="mcForm" class="toolbar">
      <label class="inline">Anos simulados<select name="n">${[2000, 5000, 10000, 20000].map((v) => `<option value="${v}" ${st.n === v ? 'selected' : ''}>${U.num(v)}</option>`).join('')}</select></label>
      <label class="inline">Semente<input type="number" name="seed" value="${st.seed}" min="1" style="width:7em"></label>
      <label class="inline">Apetite a risco (R$ mi/ano)<input type="number" name="ap" value="${emp.apetite / 1000}" min="0" step="0.5" style="width:6em"></label>
      <button class="btn btn-primary" type="submit">Rodar</button>
      <span class="muted small" id="mcInfo"></span>
    </form>
    <p class="muted small">Cada iteração simula um ano: ocorrências de cada risco ~ Poisson e perda de cada ocorrência ~ triangular (mín, provável, máx). Os três cenários usam os mesmos números aleatórios.</p>
  </section>
  <div id="mcOut" class="stack-col"></div>`;
  const run = () => {
    const f = U.formData(U.$('#mcForm', el));
    st.n = f.n; st.seed = f.seed || 1; emp.apetite = Math.max(0, (f.ap || 0) * 1000); S.save();
    const t0 = performance.now();
    st.res = Object.keys(M.MODES).map((m) => M.monteCarlo({ n: st.n, seed: st.seed, mode: m }));
    U.$('#mcInfo', el).textContent = `${U.num(st.n * 3)} anos simulados em ${U.num(performance.now() - t0)} ms`;
    App.mcDraw(U.$('#mcOut', el));
  };
  U.$('#mcForm', el).addEventListener('submit', (e) => { e.preventDefault(); run(); });
  run();
};

App.mcDraw = (out) => {
  const st = App.mc, res = st.res, emp = S.state.empresa;
  const [I, A, P] = res;
  const custo = S.state.actions.reduce((s, a) => s + a.custo, 0);
  const dPea = I.stats.mean - P.stats.mean;
  const roi = custo ? (dPea - custo) / custo : 0;
  const xMax = Math.max(I.stats.var95 * 1.6, emp.apetite * 1.6);
  const pts = (r) => { const n = r.sorted.length, a = []; for (let k = 0; k <= 200; k++) { const q = k / 200; const x = r.sorted[Math.min(n - 1, Math.floor(q * (n - 1)))]; a.push([x / 1000, (1 - q) * 100]); } return a; };
  const rows = [['Perda esperada (média)', 'mean'], ['Mediana (P50)', 'p50'], ['P90', 'p90'], ['VaR 95%', 'var95'], ['VaR 99%', 'var99'], ['CVaR 95%', 'cvar95'], ['Pior ano simulado', 'max']];
  const hr = res.find((r) => r.mode === st.hist);
  const hmax = I.stats.var99;
  const bw = [250, 500, 1000, 2000, 2500, 5000, 10000, 20000].find((s) => s >= hmax / 32) || 50000;
  const bins = Math.ceil(hmax / bw);
  const counts = new Array(bins).fill(0);
  hr.sorted.forEach((x) => { counts[Math.min(bins - 1, Math.floor(x / bw))]++; });
  const top = hr.contrib.slice().sort((a, b) => b.v - a.v).slice(0, 10);
  const scen = (r) => `<button class="kpi kpi-btn ${st.hist === r.mode ? 'on' : ''}" data-hist="${r.mode}" aria-pressed="${st.hist === r.mode}"><span class="kpi-label"><span class="sw" style="background:${SERIES[r.mode]}"></span>&nbsp; ${M.MODES[r.mode]}</span><span class="kpi-value">${U.money(r.stats.mean)}</span><span class="kpi-sub">VaR 95%: ${U.money(r.stats.var95)} · ${U.pct(r.stats.pApetite, 1)} de passar do apetite</span></button>`;

  out.innerHTML = `
  <section class="kpis kpis-4">
    ${res.map(scen).join('')}
    <div class="kpi"><span class="kpi-label">Retorno do plano de ações</span><span class="kpi-value">${U.pct(roi)}</span><span class="kpi-sub">reduz ${U.money(dPea)}/ano por ${U.money(custo)}/ano</span></div>
  </section>
  <p class="muted small">Clique num cenário para ver a distribuição e os maiores contribuintes dele.</p>
  <section class="grid-2">
    <div class="card">
      <div class="card-head"><h3>Curva de excedência de perdas</h3><span class="muted">chance de a perda do ano passar de cada valor</span></div>
      <div class="legend">${Object.keys(M.MODES).map((m) => `<span class="sw" style="background:${SERIES[m]}"></span>${M.MODES[m]}`).join(' ')}<span class="sw sw-ref"></span>Apetite a risco</div>
      ${C.xy({
        label: 'Curva de excedência', w: 600, h: 330, xMin: 0, xMax: xMax / 1000, yMin: 0, yMax: 100,
        xTicks: C.niceTicks(0, xMax / 1000, 5), xFmt: (v) => 'R$ ' + U.num(v) + ' mi', yFmt: (v) => v + '%', xLabel: 'Perda anual', yLabel: 'P(perda > x)',
        series: res.map((r) => ({ name: M.MODES[r.mode], color: SERIES[r.mode], pts: pts(r), width: r.mode === st.hist ? 3.5 : 2 })),
        vlines: [{ x: emp.apetite / 1000 }],
        hover: { xs: Array.from({ length: 41 }, (_, k) => (xMax / 1000) * k / 40), tip: (k) => { const x = (xMax * k) / 40; return `Perda acima de ${U.money(x)}\n` + res.map((r) => `${M.MODES[r.mode]}: ${U.pct(r.sorted.filter((v) => v > x).length / r.n, 1)}`).join('\n'); } },
      })}
      <p class="note">No apetite de ${U.money(emp.apetite)}: a chance de um ano pior que isso cai de <b>${U.pct(I.stats.pApetite, 1)}</b> (inerente) para <b>${U.pct(A.stats.pApetite, 1)}</b> hoje e <b>${U.pct(P.stats.pApetite, 1)}</b> com o plano completo.</p>
    </div>
    <div class="card">
      <div class="card-head"><h3>Distribuição da perda anual</h3><span class="muted">${M.MODES[st.hist]}</span></div>
      ${C.columns({
        label: 'Histograma', w: 600, h: 280, values: counts, color: SERIES[st.hist], xLabel: 'Perda anual (R$ mi)',
        labels: counts.map((_, i) => U.num((i * bw) / 1000, bw < 1000 ? 1 : 0)), labelEvery: Math.max(1, Math.round(bins / 6)),
        tips: counts.map((c, i) => `${i === bins - 1 ? 'Acima de ' + U.money(i * bw) : U.money(i * bw) + ' a ' + U.money((i + 1) * bw)}\n${U.num(c)} anos (${U.pct(c / hr.n, 1)})`),
        yFmt: (v) => U.num(v), vlines: [{ i: Math.min(bins, hr.stats.var95 / bw), label: 'VaR 95%' }],
      })}
      <p class="note">VaR 95% é a perda superada em só 1 a cada 20 anos; CVaR 95% é a média dos 5% piores anos.</p>
    </div>
  </section>
  <section class="grid-2">
    <div class="card">
      <div class="card-head"><h3>Maiores contribuições</h3><span class="muted">${M.MODES[st.hist]} · clique para abrir o risco</span></div>
      ${C.hbars(top.map((x) => ({ labelHtml: `<button class="link" data-open-risk="${x.r.id}">${x.r.id}</button> ${U.esc(x.r.titulo)}`, value: x.v, color: SERIES[st.hist], tip: `${x.r.id}: ${U.money(x.v)}/ano (${U.pct(x.v / hr.stats.mean, 1)} do total)` })), { fmt: (v) => U.money(v) })}
    </div>
    <div class="card">
      <div class="card-head"><h3>Estatísticas</h3></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Medida</th>${res.map((r) => `<th class="num">${M.MODES[r.mode].replace('Residual ', 'Res. ')}</th>`).join('')}</tr></thead><tbody>
        ${rows.map(([l, k]) => `<tr><td>${l}</td>${res.map((r) => `<td class="num">${U.money(r.stats[k])}</td>`).join('')}</tr>`).join('')}
        <tr><td>Chance de passar do apetite</td>${res.map((r) => `<td class="num">${U.pct(r.stats.pApetite, 1)}</td>`).join('')}</tr>
      </tbody></table></div>
    </div>
  </section>`;
  U.$$('[data-hist]', out).forEach((b) => b.addEventListener('click', () => { st.hist = b.dataset.hist; App.mcDraw(out); }));
};

/* ---------------- Simulador de interrupção ---------------- */
App.PRESETS = [
  { id: 'chip', nome: 'Incêndio no fornecedor de placas', curto: 'caso Philips 2000', no: 'n_chip', duracao: 90, cobertura: 19, rampaOrig: 21, backorder: 30, premioAlt: 4,
    A: { deteccao: 2, qualificacao: 14, capAlt: 75, rampaAlt: 14 }, B: { deteccao: 21, qualificacao: 42, capAlt: 40, rampaAlt: 21 } },
  { id: 'porto', nome: 'Greve no Porto de Suape', curto: '15 dias', no: 'n_porto', duracao: 15, cobertura: 10, rampaOrig: 7, backorder: 50, premioAlt: 3,
    A: { deteccao: 1, qualificacao: 3, capAlt: 80, rampaAlt: 3 }, B: { deteccao: 4, qualificacao: 10, capAlt: 50, rampaAlt: 7 } },
  { id: 'erp', nome: 'Ransomware no ERP / WMS', curto: '12 dias fora do ar', no: 'n_erp', duracao: 12, cobertura: 2, rampaOrig: 4, backorder: 40, premioAlt: 2,
    A: { deteccao: 0, qualificacao: 1, capAlt: 60, rampaAlt: 2 }, B: { deteccao: 1, qualificacao: 6, capAlt: 30, rampaAlt: 4 } },
  { id: 'chuva', nome: 'Chuvas bloqueiam a BR-101', curto: 'uma semana', no: 'n_br101', duracao: 7, cobertura: 4, rampaOrig: 2, backorder: 60, premioAlt: 5,
    A: { deteccao: 0, qualificacao: 1, capAlt: 60, rampaAlt: 2 }, B: { deteccao: 2, qualificacao: 4, capAlt: 40, rampaAlt: 3 } },
  { id: 'motor', nome: 'Falência da MotorSul', curto: 'fonte única de motores', no: 'n_motor', duracao: 120, cobertura: 21, rampaOrig: 30, backorder: 25, premioAlt: 3,
    A: { deteccao: 3, qualificacao: 30, capAlt: 85, rampaAlt: 21 }, B: { deteccao: 20, qualificacao: 60, capAlt: 70, rampaAlt: 30 } },
];
App.dis = null;
App.disForNode = (no) => {
  const p = App.PRESETS.find((x) => x.no === no);
  const n = S.node(no);
  App.dis = JSON.parse(JSON.stringify({ ...(p || App.PRESETS[0]), ...(p ? {} : { id: 'custom', no, cobertura: Math.max(1, Math.round((n.tts || 1) * 7)), duracao: Math.max(7, Math.round((n.ttr || 1) * 7)) }), show: 'B' }));
};
App.PHASES = [
  ['1', 'Preparação', 'planos, estoques e alternativas definidos'],
  ['2', 'Evento', 'a interrupção acontece no elo'],
  ['3', 'Primeira resposta', 'a empresa detecta e mobiliza a equipe'],
  ['4', 'Impacto inicial', 'o estoque acaba e a produção cai'],
  ['5', 'Impacto total', 'ponto mais baixo do desempenho'],
  ['6', 'Preparação para recuperação', 'alternativo começa a entregar'],
  ['7', 'Recuperação', 'desempenho volta a 100%'],
  ['8', 'Impacto de longo prazo', 'clientes perdidos e reputação'],
];

App.disView = (el) => {
  if (!App.dis) App.disForNode('n_chip');
  const d = App.dis;
  const node = S.node(d.no);
  const base = { inicio: 10, horizonte: 200, duracao: d.duracao, cobertura: d.cobertura, rampaOrig: d.rampaOrig, backorder: d.backorder, premioAlt: d.premioAlt, receitaDia: node.receita / 7, margem: S.state.empresa.margem };
  const rA = M.disrupt({ ...base, ...d.A }), rB = M.disrupt({ ...base, ...d.B });
  const shown = d.show === 'A' ? rA : rB, mk = shown.marks;
  const H = Math.min(200, Math.max(60, Math.ceil(Math.max(rA.marks.recuperado, rB.marks.recuperado, base.inicio + d.duracao) * 1.25 / 10) * 10));
  const vl = [
    { x: 0, label: '1' }, { x: mk.evento, label: '2' }, { x: mk.deteccao, label: '3' }, { x: mk.ruptura >= 0 ? mk.ruptura : null, label: '4' },
    { x: mk.minimo, label: '5' }, { x: mk.alternativo, label: '6' }, { x: mk.recuperado >= 0 ? (mk.minimo + mk.recuperado) / 2 : null, label: '7' }, { x: mk.recuperado >= 0 ? mk.recuperado : null, label: '8' },
  ];
  const inp = (sc, k, label, max, step = 1) => `<label>${label}<input type="number" data-sc="${sc}" data-k="${k}" min="0" max="${max}" step="${step}" value="${sc ? d[sc][k] : d[k]}"></label>`;
  const days = (v) => (v == null || v < 0 ? 'não recupera no horizonte' : v + ' dias');

  el.innerHTML = `
  <section class="preset-row">${App.PRESETS.map((p) => `<button class="pick preset ${p.id === d.id ? 'on' : ''}" data-preset="${p.id}" aria-pressed="${p.id === d.id}"><b>${U.esc(p.nome)}</b><small>${U.esc(p.curto)}</small></button>`).join('')}</section>
  <section class="card">
    <div class="toolbar">
      <label class="inline">Elo interrompido<select id="dNode">${U.opts(S.state.nodes.filter((n) => n.ttr != null), d.no)}</select></label>
      <span class="muted small">Receita dependente: ${U.money(node.receita)}/semana · margem ${U.pct(S.state.empresa.margem)}</span>
    </div>
    <form class="form form-5">
      ${inp('', 'duracao', 'Duração da parada (dias)', 365)}
      ${inp('', 'cobertura', 'Estoque de segurança (dias)', 120)}
      ${inp('', 'rampaOrig', 'Rampa de retomada (dias)', 90)}
      ${inp('', 'backorder', 'Vendas recuperadas depois (%)', 100, 5)}
      ${inp('', 'premioAlt', 'Custo extra do alternativo (%)', 100)}
    </form>
  </section>
  <section class="grid-2 grid-wide-left">
    <div class="card">
      <div class="card-head wrap"><h3>Perfil de desempenho da produção</h3>
        ${V.seg('show', [['A', 'Fases: resposta ágil'], ['B', 'Fases: resposta tardia']], d.show, 'Fases marcadas')}</div>
      <div class="legend"><span class="sw" style="background:var(--s1)"></span>Resposta ágil <span class="sw" style="background:var(--s2)"></span>Resposta tardia <span class="sw sw-band"></span>Elo parado</div>
      ${C.xy({
        label: 'Desempenho ao longo do tempo', w: 760, h: 320, xMin: 0, xMax: H, yMin: 0, yMax: 110, yTicks: [0, 25, 50, 75, 100],
        xFmt: (v) => 'dia ' + v, yFmt: (v) => v + '%', yLabel: 'Produção (% do normal)', pad: { t: 52 },
        bands: [{ x0: base.inicio, x1: base.inicio + d.duracao, cls: 'band' }],
        series: [{ color: 'var(--s1)', pts: rA.perf.map((v, t) => [t, v]), width: 2.5 }, { color: 'var(--s2)', pts: rB.perf.map((v, t) => [t, v]), width: 2.5 }],
        vlines: vl,
        hover: { xs: Array.from({ length: H + 1 }, (_, t) => t), tip: (t) => `Dia ${t}\nResposta ágil: ${U.num(rA.perf[t] ?? 100)}%\nResposta tardia: ${U.num(rB.perf[t] ?? 100)}%` },
      })}
      <ol class="phases">${App.PHASES.map(([n, nome, desc]) => `<li><span class="mark-chip">${n}</span><b>${nome}</b> <span class="muted">${desc}</span></li>`).join('')}</ol>
    </div>
    <div class="stack-col">
      <div class="card">
        <div class="card-head"><h3>Resultado comparado</h3></div>
        <div class="table-wrap"><table class="table"><thead><tr><th></th><th class="num">Ágil</th><th class="num">Tardia</th></tr></thead><tbody>
          <tr><td>Produção mínima</td><td class="num">${U.num(rA.vMin)}%</td><td class="num">${U.num(rB.vMin)}%</td></tr>
          <tr><td>Dias abaixo do normal</td><td class="num">${rA.diasFalta}</td><td class="num">${rB.diasFalta}</td></tr>
          <tr><td>Até recuperar 100%</td><td class="num">${rA.diasFalta ? days(rA.recuperacao) : 'sem queda'}</td><td class="num">${rB.diasFalta ? days(rB.recuperacao) : 'sem queda'}</td></tr>
          <tr><td>Margem perdida</td><td class="num">${U.money(rA.margemPerdida)}</td><td class="num">${U.money(rB.margemPerdida)}</td></tr>
          <tr><td>Custo extra do alternativo</td><td class="num">${U.money(rA.custoExtra)}</td><td class="num">${U.money(rB.custoExtra)}</td></tr>
          <tr class="total"><td>Impacto total</td><td class="num">${U.money(rA.total)}</td><td class="num">${U.money(rB.total)}</td></tr>
        </tbody></table></div>
        <div class="callout"><b>Valor de reagir cedo: ${U.money(rB.total - rA.total)}</b><p>É o quanto a resposta ágil evita em relação à tardia. Compare com o custo anual de monitoramento, estoques e fornecedores alternativos.</p></div>
      </div>
      <div class="card sc-a"><div class="card-head"><h3><span class="sw" style="background:var(--s1)"></span>Resposta ágil</h3></div>
        <div class="form">${inp('A', 'deteccao', 'Detecção (dias)', 90)}${inp('A', 'qualificacao', 'Qualificar alternativo (dias)', 180)}${inp('A', 'capAlt', 'Capacidade alternativa (%)', 100, 5)}${inp('A', 'rampaAlt', 'Rampa do alternativo (dias)', 90)}</div></div>
      <div class="card sc-b"><div class="card-head"><h3><span class="sw" style="background:var(--s2)"></span>Resposta tardia</h3></div>
        <div class="form">${inp('B', 'deteccao', 'Detecção (dias)', 90)}${inp('B', 'qualificacao', 'Qualificar alternativo (dias)', 180)}${inp('B', 'capAlt', 'Capacidade alternativa (%)', 100, 5)}${inp('B', 'rampaAlt', 'Rampa do alternativo (dias)', 90)}</div></div>
    </div>
  </section>
  <section class="callout"><b>O caso que inspirou este simulador</b><p>Em março de 2000 um pequeno incêndio atingiu a fábrica de chips da Philips em Albuquerque (EUA), fornecedora comum de Nokia e Ericsson. A Nokia percebeu o atraso em poucos dias e garantiu capacidade alternativa. A Ericsson reagiu semanas depois, ficou sem componentes e registrou perdas de centenas de milhões de dólares.</p></section>`;

  U.$$('[data-preset]', el).forEach((b) => b.addEventListener('click', () => { App.dis = JSON.parse(JSON.stringify({ ...App.PRESETS.find((p) => p.id === b.dataset.preset), show: d.show })); App.render(); }));
  U.$('#dNode', el).addEventListener('change', (e) => { d.no = e.target.value; d.id = 'custom'; App.render(); });
  U.$$('input[data-k]', el).forEach((i) => i.addEventListener('change', () => {
    const v = Math.max(0, Number(i.value) || 0);
    if (i.dataset.sc) d[i.dataset.sc][i.dataset.k] = v; else d[i.dataset.k] = v;
    App.render();
  }));
  U.$$('[data-show]', el).forEach((b) => b.addEventListener('click', () => { d.show = b.dataset.show; App.render(); }));
};
