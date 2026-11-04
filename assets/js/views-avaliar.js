/* ==========================================================================
   views-avaliar.js — Painel, Rede da cadeia, Registro de riscos e Matriz
   ========================================================================== */

/* ---------------- Painel executivo ---------------- */
App.views.painel = (el) => {
  const mode = App.mode;
  const pf = M.portfolio(mode);
  const pfI = M.portfolio('inerente'), pfP = M.portfolio('planejado');
  const crit = pf.list.filter((x) => x.e.level.id === 'critico').length;
  const alto = pf.list.filter((x) => x.e.level.id === 'alto').length;
  const nodes = S.state.nodes.filter((n) => n.ttr != null);
  const gaps = nodes.filter((n) => n.ttr > n.tts).sort((a, b) => M.nodePI(b) - M.nodePI(a));
  const kris = S.state.kris.map((k) => ({ k, st: M.kriStatus(k) }));
  const kCrit = kris.filter((x) => x.st === 'crit').length, kWarn = kris.filter((x) => x.st === 'warn').length;
  const acts = S.state.actions;
  const late = acts.filter(M.actionLate).length;
  const done = acts.filter((a) => a.status === 'Concluída').length;
  const custo = acts.reduce((s, a) => s + a.custo, 0);
  const red = pfI.pea ? (pfI.pea - pfP.pea) / pfI.pea : 0;
  const newAlerts = S.state.alerts.filter((a) => a.status === 'Novo');

  const top = pf.list.slice().sort((a, b) => b.e.score - a.e.score || b.e.pea - a.e.pea).slice(0, 8);
  const byCat = DATA.CATEGORIAS.map((c) => {
    const l = pf.list.filter((x) => x.r.cat === c.id);
    return { label: c.nome, value: l.reduce((s, x) => s + x.e.pea, 0), n: l.length };
  }).filter((x) => x.n).sort((a, b) => b.value - a.value);
  const byType = Object.keys(DATA.TIPOS).map((t) => {
    const l = pf.list.filter((x) => x.r.tipo === t);
    return { t, n: l.length, pea: l.reduce((s, x) => s + x.e.pea, 0), crit: l.filter((x) => x.e.score >= 10).length };
  });

  el.innerHTML = `
  <section class="kpis">
    ${V.kpi('Riscos ativos', pf.list.length, `${crit ? `<span class="pill lvl-critico"><i></i>${crit} críticos</span>` : '0 críticos'} · ${alto} altos`)}
    ${V.kpi('Perda esperada anual', U.money(pf.pea), `cenário ${M.MODES[mode].toLowerCase()}`)}
    ${V.kpi('Redução com o plano completo', U.pct(red), `${U.money(pfI.pea)} → ${U.money(pfP.pea)} · plano custa ${U.money(custo)}/ano`)}
    ${V.kpi('Elos com TTR maior que TTS', gaps.length + ' de ' + nodes.length, gaps[0] ? `elo mais fraco: <button class="link" data-go="rede">${U.esc(gaps[0].nome)}</button>` : '')}
    ${V.kpi('Indicadores fora do limite', kCrit + kWarn, `${V.statusPill('crit', kCrit + ' críticos')} ${V.statusPill('warn', kWarn + ' em atenção')}`)}
    ${V.kpi('Ações atrasadas', late, `${done} de ${acts.length} concluídas`)}
  </section>

  ${newAlerts.length ? `<section class="banner">
    <div><b>${newAlerts.length} sinais novos na rede.</b> ${U.esc(newAlerts[0].titulo)}.</div>
    <button class="btn btn-primary" data-go="monitoramento">Ver alertas</button></section>` : ''}

  <section class="grid-2">
    <div class="card">
      <div class="card-head"><h3>Mapa de calor</h3><span class="muted">${M.MODES[mode]} · clique para ver a matriz</span></div>
      <div class="clickable" data-go="matriz">${V.heatmap(mode, { compact: true })}</div>
    </div>
    <div class="card">
      <div class="card-head"><h3>Riscos prioritários</h3><button class="link" data-go="riscos">Ver registro</button></div>
      <ol class="toplist">
        ${top.map(({ r, e }) => `<li><button class="toprow" data-open-risk="${r.id}">
          ${V.scoreCell(e)}<span class="toptitle"><b>${r.id}</b> ${U.esc(r.titulo)}<small>${U.esc(V.nodeName(r.no))} · ${DATA.TIPOS[r.tipo].nome}</small></span>
          <span class="topval">${U.money(e.pea)}<small>por ano</small></span></button></li>`).join('')}
      </ol>
    </div>
  </section>

  <section class="grid-2">
    <div class="card">
      <div class="card-head"><h3>Perda esperada por categoria</h3><span class="muted">R$ por ano</span></div>
      ${C.hbars(byCat.map((c) => ({ label: c.label + ' (' + c.n + ')', value: c.value, tip: `${c.label}: ${c.n} riscos, ${U.money(c.value)}/ano` })), { fmt: (v) => U.money(v) })}
    </div>
    <div class="card">
      <div class="card-head"><h3>Natureza dos riscos</h3><span class="muted">cada natureza pede um tratamento</span></div>
      <div class="types">
        ${byType.map((x) => `<div class="type-box tb-${x.t}">
          <div class="type-top">${V.typeTag(x.t)}<span class="type-n">${x.n}</span></div>
          <div class="type-pea">${U.money(x.pea)}<small>/ano · ${x.crit} altos ou críticos</small></div>
          <p>${U.esc(DATA.TIPOS[x.t].tratar)}</p></div>`).join('')}
      </div>
    </div>
  </section>

  <section class="grid-2">
    <div class="card">
      <div class="card-head"><h3>Indicadores antecipatórios</h3><button class="link" data-go="monitoramento">Todos os indicadores</button></div>
      <div class="kri-list">
        ${kris.filter((x) => x.st !== 'ok').slice(0, 6).map(({ k, st }) => `<div class="kri-row">
          <div><b>${U.esc(k.nome)}</b><small>${U.esc(V.nodeName(k.no))}</small></div>
          ${C.spark(k.hist, { w: 120, h: 34, color: `var(--st-${st})` })}
          <div class="kri-val">${U.num(k.hist[11], k.dec)}<small>${U.esc(k.unidade)}</small></div>${V.statusPill(st)}</div>`).join('')}
      </div>
    </div>
    <div class="card">
      <div class="card-head"><h3>Elos onde a recuperação demora mais que a sobrevivência</h3><button class="link" data-go="rede">Abrir rede</button></div>
      ${C.hbars(gaps.slice(0, 6).map((n) => ({ label: n.nome, value: M.nodePI(n), color: 'var(--st-crit)', tip: `TTR ${U.wk(n.ttr)} sem. × TTS ${U.wk(n.tts)} sem.: ${U.num(n.ttr - n.tts, 1)} semanas descobertas` })), { fmt: (v) => U.money(v) })}
      <p class="note">Margem de contribuição perdida se o elo parar pelo tempo de recuperação (TTR) e a empresa só aguentar o tempo de sobrevivência (TTS).</p>
    </div>
  </section>`;
};

/* ---------------- Rede da cadeia ---------------- */
App.netColor = 'risco';
App.netSel = 'n_chip';
App.views.rede = (el) => {
  const nodes = S.state.nodes;
  const cols = DATA.CAMADAS.map((_, i) => nodes.filter((n) => n.camada === i));
  const W = 1240, H = 600, NW = 180, NH = 50;
  const pos = {};
  cols.forEach((list, c) => {
    const gap = H / (list.length + 1);
    list.forEach((n, k) => { pos[n.id] = { x: 20 + c * ((W - NW - 40) / 5), y: gap * (k + 1) - NH / 2 + 18 }; });
  });
  const colorOf = (n) => {
    if (App.netColor === 'risco') {
      const s = M.nodeMaxScore(n.id, 'inerente');
      return s ? 'lvl-' + M.level(s).id : 'lvl-none';
    }
    if (n.ttr == null) return 'lvl-none';
    const g = n.ttr - n.tts;
    return g > 4 ? 'lvl-critico' : g > 1 ? 'lvl-alto' : g > 0 ? 'lvl-moderado' : 'lvl-baixo';
  };
  let svg = `<svg class="net" viewBox="0 0 ${W} ${H}" role="img" aria-label="Rede da cadeia de suprimentos">`;
  DATA.CAMADAS.forEach((c, i) => { svg += `<text x="${20 + i * ((W - NW - 40) / 5) + NW / 2}" y="20" class="net-col" text-anchor="middle">${U.esc(c)}</text>`; });
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
    svg += `<g class="node ${colorOf(n)} ${n.id === App.netSel ? 'sel' : ''}" data-node="${n.id}" tabindex="0" role="button" aria-label="${U.esc(n.nome)}" data-tip="${U.esc(n.nome + ' — ' + n.local + (n.ttr != null ? `\nTTR ${U.wk(n.ttr)} sem. · TTS ${U.wk(n.tts)} sem.` : '') + `\n${U.plural(nr, 'risco', 'riscos')}`)}">
      <rect x="${p.x}" y="${p.y}" width="${NW}" height="${NH}" rx="8" class="node-box"/>
      <rect x="${p.x}" y="${p.y}" width="6" height="${NH}" rx="3" class="node-stripe"/>
      <text x="${p.x + 14}" y="${p.y + 21}" class="node-name">${U.esc(n.nome.length > 26 ? n.nome.slice(0, 25) + '…' : n.nome)}</text>
      <text x="${p.x + 14}" y="${p.y + 38}" class="node-sub">${nr} ${nr === 1 ? 'risco' : 'riscos'}${gap != null ? ' · ' + (gap > 0 ? '+' + U.num(gap, 1) + ' sem.' : 'coberto') : ''}${n.fonteUnica ? ' · fonte única' : ''}</text>
    </g>`;
  });
  svg += '</svg>';

  const sel = S.node(App.netSel) || nodes[0];
  const rs = M.nodeRisks(sel.id).map((r) => ({ r, e: M.evalRisk(r, 'inerente') })).sort((a, b) => b.e.score - a.e.score);
  const ttrNodes = nodes.filter((n) => n.ttr != null).sort((a, b) => M.nodePI(b) - M.nodePI(a));
  const maxW = Math.max(...ttrNodes.map((n) => Math.max(n.ttr, n.tts)));
  const weakest = ttrNodes[0];

  el.innerHTML = `
  <section class="card">
    <div class="card-head wrap"><h3>Mapa da rede — ${U.esc(S.state.empresa.nome)}</h3>
      <div class="seg" role="group" aria-label="Colorir por">
        <button data-color="risco" aria-pressed="${App.netColor === 'risco'}">Maior risco do elo</button>
        <button data-color="gap" aria-pressed="${App.netColor === 'gap'}">Lacuna TTR − TTS</button>
      </div></div>
    <div class="legend">${App.netColor === 'risco'
      ? M.LEVELS.map((l) => V.levelPill(l)).join('') + '<span class="pill lvl-none"><i></i>Sem riscos</span>'
      : '<span class="pill lvl-baixo"><i></i>TTS cobre o TTR</span><span class="pill lvl-moderado"><i></i>até 1 semana descoberta</span><span class="pill lvl-alto"><i></i>1 a 4 semanas</span><span class="pill lvl-critico"><i></i>mais de 4 semanas</span>'}</div>
    <div class="scroll-x">${svg}</div>
    <p class="note">Cada elo mostra o número de riscos e quantas semanas a recuperação (TTR) passa do tempo que a empresa aguenta sem ele (TTS). Clique em um elo para ver detalhes. A linha tracejada indica fluxo de informação (sistemas). Riscos em fornecedores de nível 2 entram no mapa para que a análise não fique limitada aos fornecedores imediatos.</p>
  </section>

  <section class="grid-2">
    <div class="card">
      <div class="card-head"><h3>${U.esc(sel.nome)}</h3>${sel.fonteUnica ? '<span class="pill st-warn"><i></i>Fonte única</span>' : ''}</div>
      <p class="muted">${U.esc(sel.papel)} · ${U.esc(sel.local)}</p>
      ${sel.ttr != null ? `<form id="nodeForm" class="form form-3">
        <label>Tempo para recuperar — TTR (semanas)<input type="number" name="ttr" min="0" step="0.5" value="${sel.ttr}"></label>
        <label>Tempo para sobreviver — TTS (semanas)<input type="number" name="tts" min="0" step="0.5" value="${sel.tts}"></label>
        <label>Receita dependente (R$ mil/semana)<input type="number" name="receita" min="0" step="100" value="${sel.receita}"></label>
      </form>
      <div class="stat-row">
        <div><span class="muted">Lacuna</span><b>${U.num(sel.ttr - sel.tts, 1)} semanas</b></div>
        <div><span class="muted">Impacto se parar</span><b>${U.money(M.nodePI(sel))}</b></div>
        <div><span class="muted">Leitura</span><b>${sel.ttr > sel.tts ? 'Elo vulnerável' : 'Coberto por estoque/alternativas'}</b></div>
      </div>` : `<p>Elo de demanda: ${U.esc(sel.papel)}. Riscos aqui afetam o lado da demanda da cadeia.</p>`}
      <h4>Riscos neste elo (${rs.length})</h4>
      ${rs.length ? `<ul class="plain">${rs.map(({ r, e }) => `<li><button class="toprow" data-open-risk="${r.id}">${V.scoreCell(e)}<span class="toptitle"><b>${r.id}</b> ${U.esc(r.titulo)}</span></button></li>`).join('')}</ul>` : V.empty('Nenhum risco registrado neste elo.')}
      <button class="btn" id="addRiskNode">Analisar novo risco neste elo</button>
    </div>
    <div class="card">
      <div class="card-head"><h3>Teste de estresse TTR × TTS</h3></div>
      <div class="legend"><span class="sw sw-ttr"></span>TTR — tempo para recuperar <span class="sw sw-tts"></span>TTS — tempo para sobreviver</div>
      <div class="ttr-list">${ttrNodes.map((n) => `<button class="ttr-row ${n.id === sel.id ? 'sel' : ''}" data-node="${n.id}" data-tip="${U.esc(n.nome)}: TTR ${U.wk(n.ttr)} · TTS ${U.wk(n.tts)} semanas">
        <span class="ttr-name">${U.esc(n.nome)}</span>
        <span class="ttr-bars"><span class="bar-ttr" style="width:${(n.ttr / maxW) * 100}%"></span><span class="bar-tts" style="width:${(n.tts / maxW) * 100}%"></span></span>
        <span class="ttr-gap ${n.ttr > n.tts ? 'neg' : ''}">${n.ttr > n.tts ? '+' + U.num(n.ttr - n.tts, 1) : 'ok'}</span></button>`).join('')}</div>
      <p class="note">Se o TTR de um elo é maior que o TTS, a empresa perde vendas antes de o elo se recuperar. O elo mais fraco hoje é <b>${U.esc(weakest.nome)}</b>, com impacto potencial de ${U.money(M.nodePI(weakest))}. Esse elo define a robustez da cadeia inteira (princípio 3).</p>
    </div>
  </section>`;

  U.$$('[data-color]', el).forEach((b) => b.addEventListener('click', () => { App.netColor = b.dataset.color; App.render(); }));
  U.$$('[data-node]', el).forEach((g) => {
    const pick = () => { App.netSel = g.dataset.node; App.render(); };
    g.addEventListener('click', pick);
    g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
  });
  const f = U.$('#nodeForm', el);
  if (f) f.addEventListener('change', () => {
    const d = U.formData(f);
    sel.ttr = Math.max(0, d.ttr || 0); sel.tts = Math.max(0, d.tts || 0); sel.receita = Math.max(0, d.receita || 0);
    App.refresh();
  });
  U.$('#addRiskNode', el).addEventListener('click', () => { App.wizardPrefill = { no: sel.id }; App.go('analise'); });
};

/* ---------------- Registro de riscos ---------------- */
App.reg = { q: '', cat: '', tipo: '', nivel: '', status: '', sort: 'score', dir: -1 };
App.views.riscos = (el) => {
  const f = App.reg, mode = App.mode;
  let rows = S.state.risks.map((r) => ({ r, ei: M.evalRisk(r, 'inerente'), e: M.evalRisk(r, mode), n: M.actionsOf(r.id).length }));
  rows = rows.filter(({ r, e }) =>
    (!f.q || (r.id + ' ' + r.titulo + ' ' + r.causa + ' ' + V.nodeName(r.no)).toLowerCase().includes(f.q.toLowerCase())) &&
    (!f.cat || r.cat === f.cat) && (!f.tipo || r.tipo === f.tipo) && (!f.nivel || e.level.id === f.nivel) && (!f.status || r.status === f.status));
  const key = {
    id: (x) => x.r.id, titulo: (x) => x.r.titulo, cat: (x) => S.cat(x.r.cat).nome, tipo: (x) => x.r.tipo,
    p: (x) => x.e.pl, i: (x) => x.e.i, score: (x) => x.e.score * 1e9 + x.e.pea, pea: (x) => x.e.pea, n: (x) => x.n, status: (x) => x.r.status,
  }[f.sort];
  rows.sort((a, b) => { const A = key(a), B = key(b); return (A > B ? 1 : A < B ? -1 : 0) * f.dir; });
  const th = (k, label, cls = '') => `<th class="${cls}"><button class="sort ${f.sort === k ? 'on' : ''}" data-sort="${k}">${label}${f.sort === k ? (f.dir > 0 ? ' ▲' : ' ▼') : ''}</button></th>`;
  const totPea = rows.reduce((s, x) => s + x.e.pea, 0);

  el.innerHTML = `
  <section class="card">
    <div class="toolbar">
      <input id="fQ" type="search" placeholder="Buscar por título, causa ou elo" value="${U.esc(f.q)}" aria-label="Buscar riscos">
      <select id="fCat" aria-label="Categoria"><option value="">Todas as categorias</option>${U.opts(DATA.CATEGORIAS, f.cat)}</select>
      <select id="fTipo" aria-label="Natureza"><option value="">Todas as naturezas</option>${Object.entries(DATA.TIPOS).map(([k, t]) => `<option value="${k}" ${f.tipo === k ? 'selected' : ''}>${t.nome}</option>`).join('')}</select>
      <select id="fNivel" aria-label="Nível"><option value="">Todos os níveis</option>${M.LEVELS.map((l) => `<option value="${l.id}" ${f.nivel === l.id ? 'selected' : ''}>${l.nome}</option>`).join('')}</select>
      <select id="fStatus" aria-label="Situação"><option value="">Todas as situações</option>${DATA.STATUS_RISCO.map((s) => `<option ${f.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
      <div class="toolbar-actions">
        <button class="btn" id="btnCsv">Exportar CSV</button>
        <button class="btn" id="btnQuick">Cadastro rápido</button>
        <button class="btn btn-primary" data-go="analise">Nova análise em 6 passos</button>
      </div>
    </div>
    <p class="muted small">${rows.length} riscos · perda esperada ${U.money(totPea)}/ano no cenário ${M.MODES[mode].toLowerCase()}. Clique em uma linha para ver o detalhe.</p>
    <div class="table-wrap"><table class="table table-hover">
      <thead><tr>${th('id', 'ID')}${th('titulo', 'Risco')}${th('cat', 'Categoria')}${th('tipo', 'Natureza')}${th('p', 'P', 'num')}${th('i', 'I', 'num')}${th('score', 'P×I · nível')}${mode === 'inerente' ? '' : '<th>Inerente</th>'}${th('pea', 'Perda esperada/ano', 'num')}${th('n', 'Ações', 'num')}${th('status', 'Situação')}</tr></thead>
      <tbody>${rows.map(({ r, e, ei, n }) => `<tr data-open-risk="${r.id}" tabindex="0">
        <td class="mono">${r.id}</td>
        <td class="wide"><b>${U.esc(r.titulo)}</b><small>${U.esc(V.nodeName(r.no))}</small></td>
        <td>${U.esc(S.cat(r.cat).nome)}</td><td>${V.typeTag(r.tipo)}</td>
        <td class="num">${e.pl}</td><td class="num">${e.i}</td>
        <td class="nowrap"><span class="score-cell">${V.scoreCell(e)}${V.levelPill(e.level)}</span></td>
        ${mode === 'inerente' ? '' : `<td class="muted nowrap">${ei.score} · ${ei.level.nome}</td>`}
        <td class="num">${U.money(e.pea)}</td><td class="num">${n}</td><td class="nowrap">${U.esc(r.status)}</td></tr>`).join('') || `<tr><td colspan="${mode === 'inerente' ? 10 : 11}">${V.empty('Nenhum risco com esses filtros.')}</td></tr>`}</tbody>
    </table></div>
  </section>`;

  const bind = (id, k, ev = 'change') => U.$(id, el).addEventListener(ev, (e) => { f[k] = e.target.value; App.render(); if (k === 'q') { const i = U.$('#fQ'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); } });
  bind('#fQ', 'q', 'input'); bind('#fCat', 'cat'); bind('#fTipo', 'tipo'); bind('#fNivel', 'nivel'); bind('#fStatus', 'status');
  U.$$('[data-sort]', el).forEach((b) => b.addEventListener('click', () => { const k = b.dataset.sort; f.dir = f.sort === k ? -f.dir : (k === 'id' || k === 'titulo' ? 1 : -1); f.sort = k; App.render(); }));
  U.$$('tr[data-open-risk]', el).forEach((tr) => tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') V.openRisk(tr.dataset.openRisk); }));
  U.$('#btnQuick', el).addEventListener('click', () => V.riskForm(null));
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

/* ---------------- Matriz de vulnerabilidade ---------------- */
App.views.matriz = (el) => {
  const mode = App.mode;
  const pf = M.portfolio(mode);
  const byQ = { moderada: [], alta: [], baixa: [], media: [] };
  pf.list.forEach((x) => byQ[x.e.quad.id].push(x));
  const qbox = (id, extra) => `<div class="quad q-${id}"><div class="quad-head"><b>${M.QUADS[id].nome}</b><span>${U.plural(byQ[id].length, 'risco', 'riscos')}</span></div>
    <p>${U.esc(M.QUADS[id].foco)}</p><div class="chips">${byQ[id].sort((a, b) => b.e.score - a.e.score).map((x) => `<button class="chip lvl-${x.e.level.id}" data-open-risk="${x.r.id}" data-tip="${U.esc(x.r.titulo)}">${x.r.id}</button>`).join('')}</div>${extra || ''}</div>`;

  el.innerHTML = `
  <section class="grid-2 grid-wide-left">
    <div class="card">
      <div class="card-head"><h3>Matriz 5 × 5 — ${M.MODES[mode]}</h3><span class="muted">clique em um risco para abrir</span></div>
      ${V.heatmap(mode)}
      <div class="legend">${M.LEVELS.map((l) => `<span class="legend-item">${V.levelPill(l)}<span class="muted small">${l.min}${l.id === 'critico' ? '–25' : '–' + (M.LEVELS[M.LEVELS.indexOf(l) + 1].min - 1)}</span></span>`).join('')}</div>
    </div>
    <div class="card">
      <div class="card-head"><h3>Como ler</h3></div>
      <p>Vulnerabilidade é a combinação entre a probabilidade de ocorrência e a consequência. A posição do risco orienta onde concentrar recursos escassos de gestão; a matriz não resolve o problema sozinha.</p>
      <ul class="plain bullets">
        <li><b>Inerente:</b> risco sem nenhuma ação.</li>
        <li><b>Residual atual:</b> considera ações concluídas e, em proporção ao avanço, as em andamento.</li>
        <li><b>Residual planejado:</b> todas as ações do plano concluídas.</li>
      </ul>
      <p>Troque o cenário no topo da tela para ver os riscos mudarem de célula. Prevenção desce o risco na matriz (menos probabilidade); redundância, flexibilidade e agilidade movem para a esquerda (menos consequência).</p>
      <div class="move-sum">${(() => {
        const ine = M.portfolio('inerente').list, pla = M.portfolio('planejado').list;
        const moved = ine.filter((x, i) => x.e.score !== pla[i].e.score).length;
        const down = ine.filter((x, i) => pla[i].e.level.min < x.e.level.min).length;
        return `<div><b>${moved}</b><span>riscos mudam de célula com o plano completo</span></div><div><b>${down}</b><span>caem de nível</span></div>`;
      })()}</div>
    </div>
  </section>

  <section class="card">
    <div class="card-head"><h3>Mapa de vulnerabilidade e ações priorizadas</h3><span class="muted">probabilidade alta = nível 3 ou mais (5% ao ano) · consequência severa = nível 4 ou mais</span></div>
    <div class="quads">
      <div class="quad-axis-y">Probabilidade<span>alta ↑ · baixa ↓</span></div>
      <div class="quad-grid">
        ${qbox('moderada', '<div class="arrow-tag down">↓ Prevenção</div>')}
        ${qbox('alta', '<div class="arrow-tag down">↓ Prevenção</div><div class="arrow-tag left">← Agilidade, flexibilidade, redundância</div>')}
        ${qbox('baixa')}
        ${qbox('media', '<div class="arrow-tag left">← Agilidade, flexibilidade, redundância</div>')}
      </div>
      <div class="quad-axis-x">Consequência: leves ← → severas</div>
    </div>
  </section>

  <section class="grid-2 grid-wide-right-2">
    <div class="card">
      <div class="card-head"><h3>Escala de probabilidade</h3></div>
      <div class="table-wrap"><table class="table wrap-head"><thead><tr><th class="num">Nível</th><th>Descrição</th><th>Frequência anual</th><th>Referência</th></tr></thead><tbody>
        ${DATA.PROB.slice().reverse().map((p) => `<tr><td class="num">${p.n}</td><td>${p.nome}</td><td>${p.faixa}</td><td class="muted">${p.exemplo}</td></tr>`).join('')}
      </tbody></table></div>
    </div>
    <div class="card">
      <div class="card-head"><h3>Critérios explícitos de impacto</h3></div>
      <div class="table-wrap"><table class="table crit-table wrap-head"><thead><tr><th>Dimensão</th>${DATA.IMPACT_NAMES.map((n, i) => `<th>${i + 1} · ${n}</th>`).join('')}</tr></thead><tbody>
        ${Object.values(DATA.IMPACT).map((d) => `<tr><td><b>${d.nome}</b></td>${d.niveis.map((t) => `<td>${U.esc(t)}</td>`).join('')}</tr>`).join('')}
      </tbody></table></div>
      <p class="note">O impacto de cada risco é a pior entre as quatro dimensões. Critérios explícitos reduzem o risco de priorizar apenas o que é mais visível ou recente.</p>
    </div>
  </section>`;
};
