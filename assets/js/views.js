/* ==========================================================================
   views.js — as cinco áreas: Visão geral, Riscos, Plano de ações, Monitoramento e Simulações
   Padrão de SaaS de gestão de riscos: indicadores-resumo no topo, cartões com
   cabeçalho e ajuda, tabelas de dados, etiquetas de status (forma + cor + texto)
   e painéis laterais para os detalhes.
   ========================================================================== */

/* ---------- Peças compartilhadas ---------- */
V.seg = (attr, items, cur, label) => `<div class="seg" role="group" aria-label="${U.esc(label || '')}">${items.map(([v, t]) => `<button type="button" data-${attr}="${v}" aria-pressed="${String(v) === String(cur)}">${t}</button>`).join('')}</div>`;

/* Abas sublinhadas (navegação dentro de uma área) */
V.tabs = (attr, items, cur, label) => `<div class="tabs" role="tablist" aria-label="${U.esc(label || '')}">${items.map(([v, t, ic, n]) => `<button type="button" class="tab" role="tab" data-${attr}="${v}" aria-selected="${String(v) === String(cur)}">${ic ? I(ic) : ''}<span>${t}</span>${n != null && n !== '' ? `<span class="tab-n">${n}</span>` : ''}</button>`).join('')}</div>`;

/* Cor CSS de um nível ou status */
V.lvColor = (id) => ({ baixo: 'var(--st-ok)', moderado: 'var(--st-warn)', alto: 'var(--st-serious)', critico: 'var(--st-crit)', ok: 'var(--st-ok)', warn: 'var(--st-warn)', serious: 'var(--st-serious)', crit: 'var(--st-crit)', none: 'var(--st-none)' }[id] || 'var(--st-none)');
App.MES3 = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
App.SIG = { Novo: ['info', 'Novo'], Reconhecido: ['none', 'Visto'], Convertido: ['ok', 'Virou risco'], Descartado: ['none', 'Descartado'] };
App.SEV = { Alta: 'crit', Média: 'warn', Baixa: 'ok' };
App.SEV_IC = { Alta: 'alert', Média: 'alertCircle', Baixa: 'info' };
App.LV4 = ['critico', 'alto', 'moderado', 'baixo'];
App.RISK_ST = { Identificado: 'none', 'Em análise': 'info', 'Em tratamento': 'info', Monitorado: 'ok', Aceito: 'purple', Encerrado: 'none' };

/* Indicador-resumo (KPI): rótulo, valor, mini-gráfico opcional e rodapé */
V.stat = (o) => {
  const tag = o.jump ? 'button' : 'div';
  return `<${tag} class="stat ${o.cls || ''}" ${o.jump ? `type="button" data-jump="${o.jump}"` : ''} ${o.tip ? `data-tip="${U.esc(o.tip)}"` : ''}>
    <span class="stat-top"><span class="stat-label">${o.label}</span>${o.icon ? `<span class="stat-ic">${I(o.icon)}</span>` : ''}</span>
    <span class="stat-value">${o.value}</span>
    ${o.viz ? `<span class="stat-viz">${o.viz}</span>` : ''}
    <span class="stat-foot">${o.foot || ''}</span></${tag}>`;
};
/* Variação com seta; good = true pinta de verde, false de vermelho, null de cinza */
V.delta = (txt, dir, good) => `<span class="delta ${good ? 'good' : good === false ? 'bad' : 'flat'}">${I(dir === 'up' ? 'arrowUp' : dir === 'down' ? 'arrowDown' : 'minus')}${txt}</span>`;
V.mbar = (frac, c, tip) => `<span class="mbar" ${tip ? `data-tip="${U.esc(tip)}"` : ''}><i style="width:${(U.clamp(frac, 0, 1) * 100).toFixed(1)}%;--c:${c}"></i></span>`;
V.riskStatus = (s) => `<span class="stx st-${App.RISK_ST[s] || 'none'}"><i aria-hidden="true"></i>${U.esc(s)}</span>`;
V.actStatus = (a) => (M.actionLate(a) ? '<span class="stx st-crit"><i aria-hidden="true"></i>Atrasada</span>'
  : `<span class="stx st-${{ 'Concluída': 'ok', 'Em andamento': 'info' }[a.status] || 'none'}"><i aria-hidden="true"></i>${U.esc(a.status)}</span>`);

/* Pressão de um indicador: 0 = no limite normal, 1 = no limite crítico (negativo = folga) */
M.kriPressure = (k, v) => (k.dir === 'maior' ? (k.verde - v) / ((k.verde - k.vermelho) || 1) : (v - k.verde) / ((k.vermelho - k.verde) || 1));

/* ==========================================================================
   VISÃO GERAL — painel executivo da cadeia
   ========================================================================== */
App.netColor = 'risco';
App.netSel = 'n_chip';
App.painelSide = 'top';
App.trendN = 12;
App.NET = { W: 1240, H: 560 };
App.netView = { k: 1, x: 0, y: 0 };
App.APPETITE_BAND = (ap) => (ap < 0.6 ? 'ok' : ap < 0.9 ? 'warn' : ap <= 1 ? 'serious' : 'crit');
App.APPETITE_TXT = { ok: 'Folga confortável', warn: 'Atenção', serious: 'Perto do limite', crit: 'Acima do limite' };

V.netColorOf = (n) => {
  if (App.netColor === 'risco') {
    const s = M.nodeMaxScore(n.id, 'atual');
    return s ? 'lvl-' + M.level(s).id : 'lvl-none';
  }
  if (n.ttr == null) return 'lvl-none';
  const g = n.ttr - n.tts;
  return g > 4 ? 'lvl-critico' : g > 1 ? 'lvl-alto' : g > 0 ? 'lvl-moderado' : 'lvl-baixo';
};

V.netPos = () => {
  const { W, H } = App.NET, NW = 180, NH = 50, pos = {};
  DATA.CAMADAS.forEach((_, c) => {
    const list = S.state.nodes.filter((n) => n.camada === c);
    const gap = (H - 40) / (list.length + 1);
    list.forEach((n, k) => { pos[n.id] = { x: 20 + c * ((W - NW - 40) / 5), y: gap * (k + 1) - NH / 2 + 34 }; });
  });
  return { pos, NW, NH };
};

V.netSvg = () => {
  const nodes = S.state.nodes, { W, H } = App.NET, { pos, NW, NH } = V.netPos(), v = App.netView;
  const colW = (W - NW - 40) / 5;
  const linked = new Set([App.netSel]);
  S.state.edges.forEach(([a, b]) => { if (a === App.netSel) linked.add(b); if (b === App.netSel) linked.add(a); });
  let svg = `<svg class="net ${v.k > 1 ? 'zoomed' : ''}" viewBox="${v.x.toFixed(1)} ${v.y.toFixed(1)} ${(W / v.k).toFixed(1)} ${(H / v.k).toFixed(1)}" role="img" aria-label="Mapa da cadeia de suprimentos">`;
  DATA.CAMADAS.forEach((c, i) => {
    const x = 20 + i * colW;
    svg += `<rect x="${x - 10}" y="4" width="${NW + 20}" height="${H - 8}" rx="8" class="net-lane"/>`;
    svg += `<text x="${x}" y="26" class="net-col-n">${String(i + 1).padStart(2, '0')}</text><text x="${x + 22}" y="26" class="net-col-t">${U.esc(c.toLocaleUpperCase('pt-BR'))}</text>`;
  });
  S.state.edges.forEach(([a, b, kind]) => {
    const A = pos[a], B = pos[b];
    if (!A || !B) return;
    const x1 = A.x + NW, y1 = A.y + NH / 2, x2 = B.x, y2 = B.y + NH / 2, mx = (x1 + x2) / 2;
    svg += `<path d="M${x1} ${y1} C${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}" data-a="${a}" data-b="${b}" class="edge ${kind === 'info' ? 'edge-info' : ''} ${(a === App.netSel || b === App.netSel) ? 'edge-hl' : ''}"/>`;
  });
  nodes.forEach((n) => {
    const p = pos[n.id];
    const nr = M.nodeRisks(n.id).length;
    const gap = M.nodeGap(n);
    const fade = App.netSel && !linked.has(n.id) ? 'fade' : '';
    const sub = `${nr} ${nr === 1 ? 'risco' : 'riscos'}${gap != null ? ' · ' + (gap > 0 ? U.num(gap, 1) + ' sem. descoberto' : 'coberto') : ''}${n.fonteUnica ? ' · fonte única' : ''}`;
    svg += `<g class="node ${V.netColorOf(n)} ${n.id === App.netSel ? 'sel' : ''} ${fade}" data-node="${n.id}" tabindex="0" role="button" aria-label="${U.esc(n.nome)}" data-tip="${U.esc(n.nome + ' — ' + n.local + (n.ttr != null ? `\nVolta em ${U.wk(n.ttr)} sem. · a empresa aguenta ${U.wk(n.tts)} sem.` : '\nElo de vendas (clientes)') + `\n${U.plural(nr, 'risco', 'riscos')} · clique para detalhar`)}">
      <rect x="${p.x}" y="${p.y}" width="${NW}" height="${NH}" rx="6" class="node-box"/>
      <rect x="${p.x + 8}" y="${p.y + 10}" width="3" height="${NH - 20}" rx="1.5" class="node-stripe"/>
      <text x="${p.x + 19}" y="${p.y + 21}" class="node-name">${U.esc(n.nome.length > 23 ? n.nome.slice(0, 22) + '…' : n.nome)}</text>
      <text x="${p.x + 19}" y="${p.y + 37}" class="node-sub">${U.esc(sub.length > 32 ? sub.slice(0, 31) + '…' : sub)}</text>
    </g>`;
  });
  return svg + '</svg>';
};

/* Zoom (botões e Ctrl + rolagem), arrasto para mover e destaque das ligações ao passar o mouse */
App.bindNet = (card) => {
  const svg = U.$('.net', card);
  if (!svg) return;
  const { W, H } = App.NET, v = App.netView;
  const hint = U.$('#mapZoom', card);
  const clampV = (o) => { o.k = U.clamp(o.k, 1, 3.5); o.x = U.clamp(o.x, 0, W - W / o.k); o.y = U.clamp(o.y, 0, H - H / o.k); return o; };
  const paint = () => {
    svg.setAttribute('viewBox', `${v.x.toFixed(1)} ${v.y.toFixed(1)} ${(W / v.k).toFixed(1)} ${(H / v.k).toFixed(1)}`);
    svg.classList.toggle('zoomed', v.k > 1.001);
    if (hint) hint.textContent = `Zoom ${Math.round(v.k * 100)}%`;
    U.$$('[data-z]', card).forEach((b) => { b.disabled = (b.dataset.z === 'in' && v.k >= 3.49) || ((b.dataset.z === 'out' || b.dataset.z === 'reset') && v.k <= 1.001); });
  };
  let anim = 0;
  const animateTo = (t) => {
    clampV(t);
    cancelAnimationFrame(anim);
    if (U.calm()) { Object.assign(v, t); paint(); return; }
    const s0 = { ...v }, t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / 220), e = 1 - Math.pow(1 - p, 3);
      v.k = s0.k + (t.k - s0.k) * e; v.x = s0.x + (t.x - s0.x) * e; v.y = s0.y + (t.y - s0.y) * e;
      paint();
      if (p < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  };
  const zoomAt = (k, cx, cy) => animateTo({ k, x: cx - W / k / 2, y: cy - H / k / 2 });
  const center = () => [v.x + W / v.k / 2, v.y + H / v.k / 2];
  U.$$('[data-z]', card).forEach((b) => b.addEventListener('click', () => {
    const z = b.dataset.z;
    if (z === 'in') zoomAt(v.k * 1.35, ...center());
    if (z === 'out') zoomAt(v.k / 1.35, ...center());
    if (z === 'reset') animateTo({ k: 1, x: 0, y: 0 });
    if (z === 'fit') {
      const { pos, NW, NH } = V.netPos(), p = pos[App.netSel];
      if (p) zoomAt(Math.max(v.k, 2), p.x + NW / 2, p.y + NH / 2);
    }
  }));
  svg.addEventListener('wheel', (e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = svg.getBoundingClientRect();
    const fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
    const px = v.x + fx * (W / v.k), py = v.y + fy * (H / v.k);
    const k = U.clamp(v.k * (e.deltaY < 0 ? 1.15 : 1 / 1.15), 1, 3.5);
    Object.assign(v, clampV({ k, x: px - fx * (W / k), y: py - fy * (H / k) }));
    paint();
  }, { passive: false });
  let drag = null;
  svg.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || v.k <= 1.001) return;
    drag = { x: e.clientX, y: e.clientY, vx: v.x, vy: v.y, moved: false, id: e.pointerId };
  });
  svg.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    if (!drag.moved) { drag.moved = true; svg.setPointerCapture(drag.id); svg.classList.add('dragging'); }
    const r = svg.getBoundingClientRect();
    Object.assign(v, clampV({ k: v.k, x: drag.vx - (dx * (W / v.k)) / r.width, y: drag.vy - (dy * (H / v.k)) / r.height }));
    paint();
  });
  const end = () => {
    if (drag && drag.moved) { svg.classList.remove('dragging'); App._netDragged = true; setTimeout(() => { App._netDragged = false; }, 0); }
    drag = null;
  };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);
  svg.addEventListener('click', (e) => { if (App._netDragged) { e.stopPropagation(); e.preventDefault(); } }, true);
  const edges = U.$$('.edge', svg);
  U.$$('.node', svg).forEach((g) => {
    g.addEventListener('mouseenter', () => { const id = g.dataset.node; svg.classList.add('hovering'); edges.forEach((p) => p.classList.toggle('hot', p.dataset.a === id || p.dataset.b === id)); });
    g.addEventListener('mouseleave', () => { svg.classList.remove('hovering'); edges.forEach((p) => p.classList.remove('hot')); });
  });
  paint();
};

/* Linha de indicadores-resumo */
App.painelStats = ({ pfI, pfA, emp, nodes, gaps, kris, acts }) => {
  const ap = emp.apetite ? pfA.pea / emp.apetite : 0, band = App.APPETITE_BAND(ap);
  const red = pfI.pea ? 1 - pfA.pea / pfI.pea : 0;
  const lvN = (id) => pfA.list.filter((x) => x.e.level.id === id).length;
  const crit = lvN('critico'), alto = lvN('alto');
  const kst = kris.map((k) => M.kriStatus(k)), kC = kst.filter((s) => s === 'crit').length, kW = kst.filter((s) => s === 'warn').length;
  const late = acts.filter(M.actionLate).length, done = acts.filter((a) => a.status === 'Concluída').length;
  const maxG = Math.max(0, ...nodes.map((n) => n.ttr - n.tts));
  const mini = (n, cls, t) => (n ? `<span class="pill ${cls}"><i aria-hidden="true"></i>${n} ${t}</span>` : '');
  return [
    V.stat({ jump: 'perda', icon: 'banknote', label: 'Perda esperada por ano', value: U.money(pfA.pea),
      foot: `${V.delta(U.pct(red), 'down', true)}<span class="stat-cap">menor que sem ações</span>`, tip: 'Custo médio anual dos riscos ativos, contando as ações já feitas. Clique para simular anos ruins.' }),
    V.stat({ jump: 'perda', icon: 'gauge', label: 'Uso do limite de perda', value: U.pct(ap), viz: V.mbar(ap, V.lvColor(band)),
      foot: `${V.statusPill(band, App.APPETITE_TXT[band])}<span class="stat-cap">de ${U.money(emp.apetite)}/ano</span>`, tip: 'Quanto do limite anual aceito pela diretoria (apetite a risco) já está comprometido pela perda esperada.' }),
    V.stat({ jump: 'riscos', icon: 'alert', label: 'Riscos ativos', value: pfA.list.length,
      foot: (mini(crit, 'lvl-critico', crit === 1 ? 'crítico' : 'críticos') + mini(alto, 'lvl-alto', alto === 1 ? 'alto' : 'altos')) || '<span class="stat-cap">nenhum alto ou crítico</span>', tip: 'Abrir o registro de riscos como estão hoje' }),
    V.stat({ jump: 'elos', icon: 'network', label: 'Elos sem cobertura', value: `${gaps.length}<small>/${nodes.length}</small>`,
      foot: `<span class="stat-cap">pior caso: ${U.num(maxG, 1)} semanas sem abastecimento</span>`, tip: 'Elos que levariam mais tempo para voltar do que a empresa aguenta sem eles. Clique para ver no mapa.' }),
    V.stat({ jump: 'kri', icon: 'activity', label: 'Indicadores em alerta', value: `${kC + kW}<small>/${kris.length}</small>`,
      foot: (mini(kC, 'st-crit', kC === 1 ? 'crítico' : 'críticos') + mini(kW, 'st-warn', 'em atenção')) || '<span class="stat-cap">todos na faixa normal</span>', tip: 'Abrir os indicadores fora da faixa normal' }),
    V.stat({ jump: 'late', icon: 'clock', label: 'Ações atrasadas', value: late, viz: V.mbar(acts.length ? done / acts.length : 0, 'var(--st-ok)', `${done} de ${acts.length} ações concluídas`),
      foot: `<span class="stat-cap">${done} de ${acts.length} ações concluídas</span>`, tip: 'Abrir as ações com prazo vencido' }),
  ].join('');
};

/* Apetite a risco: medidor de uso do limite e perda por cenário */
App.cardAppetite = (pfI, pfA, pfP, emp) => {
  const ap = emp.apetite ? pfA.pea / emp.apetite : 0, band = App.APPETITE_BAND(ap);
  const r1 = pfI.pea ? 1 - pfA.pea / pfI.pea : 0, r2 = pfA.pea ? 1 - pfP.pea / pfA.pea : 0;
  return `<section class="card" id="cardAppetite">
    ${V.sec({ title: 'Apetite a risco', desc: 'Perda esperada por ano comparada ao limite que a diretoria aceita correr.', tools: V.statusPill(band, App.APPETITE_TXT[band]), help: 'appetite' })}
    <div class="ap-read"><span class="ap-val">${U.pct(ap)}</span><span class="ap-txt">do limite anual de <b>${U.money(emp.apetite)}</b> está comprometido pela perda esperada de hoje, <b>${U.money(pfA.pea)}</b>.</span></div>
    ${C.meter({ value: ap, max: 1.5, color: V.lvColor(band), zones: [{ to: 0.6, color: 'var(--z-ok)' }, { to: 0.9, color: 'var(--z-warn)' }, { to: 1, color: 'var(--z-serious)' }, { to: 1.5, color: 'var(--z-crit)' }], label: `A perda esperada usa ${U.pct(ap)} do limite anual`, limitTip: 'Limite aceitável: ' + U.money(emp.apetite) + ' por ano' })}
    <h4 class="sub-h">Perda esperada por cenário</h4>
    ${C.compare([
      { label: 'Sem ações', value: pfI.pea, text: U.money(pfI.pea), color: 'var(--s8)', tip: 'Sem nenhuma ação de tratamento (risco inerente)' },
      { label: 'Hoje', value: pfA.pea, text: U.money(pfA.pea), color: 'var(--s1)', strong: true, tip: `Com as ações já feitas: −${U.pct(r1)} em relação ao cenário sem ações` },
      { label: 'Com o plano', value: pfP.pea, text: U.money(pfP.pea), color: 'var(--s3)', tip: `Se todo o plano for concluído: mais −${U.pct(r2)} em relação a hoje` },
    ], { ref: emp.apetite, refTip: 'Limite aceitável: ' + U.money(emp.apetite) })}
    <div class="card-foot"><span class="lg-i"><i class="ref" aria-hidden="true"></i>Limite aceitável</span><button class="card-link" type="button" data-jump="perda">Simular anos ruins ${I('arrowRight')}</button></div>
  </section>`;
};

/* Matriz de calor resumida */
App.cardMatrix = (pfA) => {
  const n = (id) => pfA.list.filter((x) => x.e.level.id === id).length;
  return `<section class="card" id="cardMatrix">
    ${V.sec({ title: 'Matriz de riscos', desc: 'Riscos ativos hoje por chance e impacto. Clique numa célula para ver os riscos dela.', help: 'matrix' })}
    ${V.heatmap('atual', { compact: true, pick: true })}
    <div class="legend-row">${M.LEVELS.slice().reverse().map((l) => `<span class="lg-i">${V.levelPill(l)}<b>${n(l.id)}</b></span>`).join('')}</div>
  </section>`;
};

/* Indicadores fora da tolerância, mês a mês */
App.cardKriTrend = (kris) => {
  const N = App.trendN, off = 12 - N;
  const cnt = (m) => kris.reduce((s, k) => s + (M.kriStatus(k, k.hist[m]) !== 'ok' ? 1 : 0), 0);
  const cols = DATA.MESES.slice(off).map((mes, i) => {
    const m = i + off;
    const st = kris.map((k) => M.kriStatus(k, k.hist[m]));
    const c = st.filter((s) => s === 'crit').length, w = st.filter((s) => s === 'warn').length;
    return { label: App.MES3[(10 + m) % 12], now: m === 11, segs: [{ v: c, c: 'var(--st-crit)' }, { v: w, c: 'var(--st-warn)' }],
      tip: `${mes}: ${U.plural(c, 'crítico', 'críticos')}, ${w} em atenção, ${U.plural(kris.length - c - w, 'normal', 'normais')}\nClique para abrir os indicadores` };
  });
  const first = cnt(off), last = cnt(11);
  const P = kris.map((k) => k.hist.map((v) => U.clamp(M.kriPressure(k, v), -1, 1.6)));
  const worse = kris.map((k, j) => ({ k, d: P[j][11] - P[j][off] })).sort((a, b) => b.d - a.d).filter((x) => x.d > 0.25).slice(0, 2);
  const since = DATA.MESES[off].toLowerCase();
  const head = last > first ? `Piorou: de ${first} para ${last} indicadores fora da faixa desde ${since}.`
    : last < first ? `Melhorou: de ${first} para ${last} indicadores fora da faixa desde ${since}.`
      : `Estável: ${last} indicadores fora da faixa.`;
  return `<section class="card" id="cardKri">
    ${V.sec({ title: 'Indicadores fora da tolerância', desc: `Quantos dos ${kris.length} indicadores-chave estavam em atenção ou críticos em cada mês.`, tools: V.seg('trend', [[6, '6 meses'], [12, '12 meses']], N, 'Período'), help: 'kritrend' })}
    ${C.stackCols(cols, { max: kris.length, h: 150, attrs: 'data-gokri', label: 'Indicadores fora da faixa por mês' })}
    <div class="legend-row"><span class="lg-i"><i style="--c:var(--st-crit)"></i>Crítico</span><span class="lg-i"><i style="--c:var(--st-warn)"></i>Atenção</span></div>
    <p class="insight"><b>${head}</b>${worse.length ? ' Pioraram mais: ' + worse.map((x) => U.esc(x.k.nome)).join(' e ') + '.' : ''}</p>
  </section>`;
};

/* Exposição por categoria (barras empilhadas por nível) */
App.catRows = (list, opts = {}) => {
  const LV = App.LV4, name = (id) => M.LEVELS.find((l) => l.id === id).nome;
  const cats = DATA.CATEGORIAS.map((c) => {
    const l = list.filter((x) => x.r.cat === c.id);
    const by = {};
    LV.forEach((id) => { by[id] = l.filter((x) => x.e.level.id === id).reduce((s, x) => s + x.e.pea, 0); });
    return { c, n: l.length, v: l.reduce((s, x) => s + x.e.pea, 0), by };
  }).filter((x) => x.n).sort((a, b) => b.v - a.v);
  const rows = cats.map((x) => ({
    labelHtml: `<span class="sb-ic">${I(I.CAT[x.c.id] || 'layers')}</span><span class="sb-name">${U.esc(x.c.nome)}<small>${U.plural(x.n, 'risco', 'riscos')}</small></span>`,
    segs: LV.map((id) => ({ v: x.by[id], c: V.lvColor(id) })), total: x.v, text: U.money(x.v),
    attrs: `${opts.attr || 'data-dmcat'}="${x.c.id}"${opts.cur !== undefined ? ` aria-pressed="${opts.cur === x.c.id}"` : ''}`,
    cls: opts.cur ? (opts.cur === x.c.id ? 'on' : 'dim') : '',
    tip: `${x.c.nome}: ${U.money(x.v)} por ano · ${U.plural(x.n, 'risco', 'riscos')}\n${LV.filter((id) => x.by[id]).map((id) => `${name(id)}: ${U.money(x.by[id])}`).join(' · ')}\nClique para ${opts.cur !== undefined ? 'filtrar a lista' : 'ver só esses riscos'}`,
  }));
  const present = LV.filter((id) => cats.some((x) => x.by[id] > 0));
  return { rows, legend: `<div class="legend-row">${present.map((id) => `<span class="lg-i"><i style="--c:${V.lvColor(id)}"></i>${name(id)}</span>`).join('')}</div>` };
};
App.cardCats = (pfA) => {
  const { rows, legend } = App.catRows(pfA.list);
  return `<section class="card" id="cardCats">
    ${V.sec({ title: 'Exposição por categoria', desc: 'Perda esperada por ano em cada categoria, dividida pelo nível dos riscos. Clique numa linha para filtrar o registro.', help: 'cats' })}
    ${C.stackBars(rows)}${legend}
  </section>`;
};

/* Exposição por etapa da cadeia (do fornecedor ao cliente) */
App.cardTiers = (pfA) => {
  const rows = DATA.CAMADAS.map((nome, i) => {
    const ns = S.state.nodes.filter((n) => n.camada === i);
    const rs = pfA.list.filter((x) => ns.some((n) => n.id === x.r.no));
    const worst = rs.reduce((m, x) => Math.max(m, x.e.score), 0);
    const top = ns.slice().sort((a, b) => M.nodeMaxScore(b.id, 'atual') - M.nodeMaxScore(a.id, 'atual') || M.nodePI(b) - M.nodePI(a))[0];
    return { i, nome, ns, rs, lv: worst ? M.level(worst) : null, gapN: ns.filter((n) => n.ttr != null && n.ttr > n.tts).length, pea: rs.reduce((s, x) => s + x.e.pea, 0), top, demand: ns.every((n) => n.ttr == null) };
  });
  return `<section class="card" id="cardTiers">
    ${V.sec({ title: 'Exposição por etapa da cadeia', desc: 'Do fornecedor de nível 2 ao cliente. Clique numa etapa para ver o elo mais crítico no mapa.', help: 'tiers' })}
    <div class="table-wrap flush"><table class="table table-hover">
      <thead><tr><th>Etapa</th><th class="num">Elos</th><th>Pior nível</th><th class="num">Descobertos</th><th class="num">Perda/ano</th></tr></thead>
      <tbody>${rows.map((x) => `<tr data-stop="${x.top ? x.top.id : ''}" tabindex="0" data-tip="${U.esc(`${x.nome}: ${U.plural(x.rs.length, 'risco ativo', 'riscos ativos')}\nClique para ver ${x.top ? x.top.nome : 'o elo'} no mapa`)}">
        <td class="wide"><span class="tier"><span class="tier-n">${x.i + 1}</span><span><b>${U.esc(x.nome)}</b><small>${U.plural(x.rs.length, 'risco', 'riscos')}</small></span></span></td>
        <td class="num">${x.ns.length}</td>
        <td>${x.lv ? V.levelPill(x.lv) : '<span class="muted">Sem riscos</span>'}</td>
        <td class="num">${x.demand ? '<span class="muted" data-tip="Etapa de vendas: não se aplica">—</span>' : x.gapN ? `<span class="neg">${x.gapN}</span>` : '0'}</td>
        <td class="num">${U.money(x.pea)}</td></tr>`).join('')}</tbody>
    </table></div>
  </section>`;
};

/* Mapa da cadeia */
App.netLegend = () => {
  const cnt = {};
  S.state.nodes.forEach((n) => { const c = V.netColorOf(n); cnt[c] = (cnt[c] || 0) + 1; });
  const items = App.netColor === 'risco'
    ? [...M.LEVELS.map((l) => ['lvl-' + l.id, l.nome]), ['lvl-none', 'Sem riscos']]
    : [['lvl-baixo', 'Coberto'], ['lvl-moderado', 'Até 1 semana descoberto'], ['lvl-alto', '1 a 4 semanas'], ['lvl-critico', 'Mais de 4 semanas'], ['lvl-none', 'Elo de vendas']];
  return items.map(([c, t]) => `<span class="lg ${c}"><i></i>${t} <b>${cnt[c] || 0}</b></span>`).join('')
    + `<span class="lg-note">${App.netColor === 'risco' ? 'Elos por risco mais grave hoje' : 'Elos por tempo sem cobertura'}</span>`;
};
App.cardNet = () => `<section class="card" id="netCard">
    ${V.sec({ title: 'Mapa da cadeia de suprimentos', desc: 'Cada caixa é um elo, organizado por etapa. Linhas contínuas levam materiais; pontilhadas, informações. Clique num elo para ver os detalhes logo abaixo.', tools: `<span class="seg-cap">Colorir por</span>${V.seg('color', [['risco', 'Nível de risco'], ['gap', 'Cobertura']], App.netColor, 'Colorir o mapa por')}`, help: 'map' })}
    <div class="map-wrap">
      <div class="scroll-x">${V.netSvg()}</div>
      <div class="map-ctl" role="group" aria-label="Zoom do mapa">
        <button type="button" data-z="in" aria-label="Aproximar" data-tip="Aproximar">${I('plus')}</button>
        <button type="button" data-z="out" aria-label="Afastar" data-tip="Afastar">${I('minus')}</button>
        <button type="button" data-z="fit" aria-label="Aproximar do elo selecionado" data-tip="Aproximar do elo selecionado">${I('focus')}</button>
        <button type="button" data-z="reset" aria-label="Ver a cadeia inteira" data-tip="Ver a cadeia inteira">${I('refresh')}</button>
      </div>
      <span class="map-hint" id="mapZoom" aria-hidden="true">Zoom 100%</span>
    </div>
    <div class="map-legend">${App.netLegend()}</div>
  </section>`;

/* Elo selecionado no mapa */
App.nodePanel = (sel) => {
  const rs = M.nodeRisks(sel.id).map((r) => ({ r, e: M.evalRisk(r, 'atual') })).sort((a, b) => b.e.score - a.e.score);
  const kris = S.state.kris.filter((k) => k.no === sel.id);
  const sups = S.state.suppliers.filter((s) => s.no === sel.id);
  const alts = S.state.suppliers.filter((s) => !s.no && sups.some((x) => x.compra === s.compra));
  const gap = sel.ttr != null ? sel.ttr - sel.tts : null;
  const worst = M.nodeMaxScore(sel.id, 'atual');
  const sem = (v) => `${U.wk(v)} ${v === 1 ? 'semana' : 'semanas'}`;
  const read = sel.ttr == null ? '' : gap > 0
    ? `Se este elo parar, a empresa aguenta <b>${sem(sel.tts)}</b>, mas ele leva <b>${sem(sel.ttr)}</b> para voltar: são <b class="neg">${U.num(gap, 1)} semanas sem abastecimento</b> e ${U.money(M.nodePI(sel))} de margem em risco.`
    : `Se este elo parar, estoques e alternativas cobrem todo o tempo de recuperação (${sem(sel.ttr)}). <b>Elo protegido.</b>`;
  return `
    <header class="card-head"><div class="ch-t">
      <span class="eyebrow">Elo selecionado · ${U.esc(DATA.CAMADAS[sel.camada])}</span>
      <div class="ch-title"><span class="node-ic ${V.netColorOf(sel)}">${I(I.CAMADA[sel.camada] || 'network')}</span><h3>${U.esc(sel.nome)}</h3>
        <button class="help-btn" type="button" data-help="node" aria-label="Como ler: elo selecionado" data-tip="Como ler esta seção">${I('info')}</button></div>
      <p class="ch-d">${U.esc(sel.papel)} · ${U.esc(sel.local)}</p>
    </div><div class="ch-tools">${sel.fonteUnica ? '<span class="pill st-serious"><i aria-hidden="true"></i>Fonte única</span>' : ''}${worst ? V.levelPill(M.level(worst)) : '<span class="pill st-none"><i aria-hidden="true"></i>Sem riscos</span>'}</div></header>
    ${sel.ttr != null ? `<div class="kv-row">
      <div class="kv"><small>Leva para voltar</small><b>${sem(sel.ttr)}</b></div>
      <div class="kv"><small>Empresa aguenta</small><b>${sem(sel.tts)}</b></div>
      <div class="kv"><small>Sem cobertura</small><b class="${gap > 0 ? 'neg' : 'pos'}">${gap > 0 ? U.num(gap, 1) + ' sem.' : 'Coberto'}</b></div>
      <div class="kv"><small>Margem em risco</small><b>${U.money(M.nodePI(sel))}</b></div>
    </div>
    ${C.ruler(sel.ttr, sel.tts)}<p class="ruler-read">${read}</p>
    <details class="tune" ${App.tuneOpen ? 'open' : ''}><summary>${I('sliders')} Ajustar os tempos deste elo${I('chevDown', 'fold-chev')}</summary>
      <form id="nodeForm" class="form form-3">
        <label>Semanas para voltar<small>tempo de recuperação (TTR)</small><input type="number" name="ttr" min="0" step="0.5" value="${sel.ttr}"></label>
        <label>Semanas que aguentamos<small>tempo de sobrevivência (TTS)</small><input type="number" name="tts" min="0" step="0.5" value="${sel.tts}"></label>
        <label>Receita dependente<small>R$ mil por semana</small><input type="number" name="receita" min="0" step="100" value="${sel.receita}"></label>
      </form>
      <p class="note">Mude os números para testar outra situação: o painel recalcula na hora e salva neste navegador.</p>
    </details>` : '<div class="callout">Este é um elo de vendas: riscos aqui afetam a demanda e a previsão, não o abastecimento.</div>'}
    <h4 class="sub-h">Riscos neste elo <span class="cnt">${rs.length}</span></h4>
    ${rs.length ? `<ul class="rows">${rs.map(({ r, e }) => `<li><button class="toprow" type="button" data-open-risk="${r.id}">${V.scoreCell(e)}<span class="toptitle"><b>${r.id}</b>${U.esc(r.titulo)}</span><span class="topval">${U.money(e.pea)}<small>por ano</small></span></button></li>`).join('')}</ul>` : V.empty('Nenhum risco registrado neste elo.')}
    ${kris.length ? `<h4 class="sub-h">Indicadores deste elo</h4><div class="kri-list">${kris.map((k) => { const st = M.kriStatus(k); return `<button class="kri-row" type="button" data-kri="${k.id}">
      <span class="kri-n">${U.esc(k.nome)}</span>${C.spark(k.hist, { w: 120, h: 30, color: `var(--st-${st})` })}
      <span class="kri-val">${U.num(k.hist[11], k.dec)}<small>${U.esc(k.unidade)}</small></span>${V.statusPill(st)}</button>`; }).join('')}</div>` : ''}
    ${sups.length ? `<h4 class="sub-h">Fornecedores desta compra</h4><div class="sup-mini">${[...sups, ...alts].map((s) => { const sc = M.supplierScore(s), g = M.supplierRating(sc); return `<button class="sup-row" type="button" data-sup="${s.id}">
      <span class="grade g-${g}">${g}</span><span class="sup-t"><b>${U.esc(s.nome)}</b><small>${s.no ? 'fornecedor atual' : 'alternativo'} · ${U.pct(s.share)} da compra · no prazo ${s.otif}%</small></span><span class="topval">${U.num(sc)}<small>nota de risco</small></span></button>`; }).join('')}</div>` : ''}
    <div class="btn-row">
      <button class="btn btn-primary" type="button" id="nNew">${I('plus')} Registrar risco neste elo</button>
      ${sel.ttr != null ? `<button class="btn" type="button" id="nSim">${I('zap')} Simular parada deste elo</button>` : ''}
    </div>`;
};

App.topRisks = (pf) => {
  const top = pf.list.slice().sort((a, b) => b.e.score - a.e.score || b.e.pea - a.e.pea).slice(0, 8);
  return `<div class="table-wrap flush"><table class="table table-hover" id="topTable">
    <thead><tr><th>Código</th><th>Risco</th><th>Gravidade</th><th class="num">Perda/ano</th></tr></thead>
    <tbody>${top.map(({ r, e }) => `<tr data-open-risk="${r.id}" tabindex="0">
      <td class="mono">${r.id}</td><td class="wide"><b>${U.esc(r.titulo)}</b><small>${U.esc(V.nodeName(r.no))} · ${DATA.TIPOS[r.tipo].nome}</small></td>
      <td class="nowrap"><span class="score-cell">${V.scoreCell(e)}${V.levelPill(e.level)}</span></td><td class="num">${U.money(e.pea)}</td></tr>`).join('')}</tbody>
  </table></div>
  <div class="card-foot"><span class="muted small">Ordenados pela gravidade; no empate, pelo custo por ano.</span><button class="card-link" type="button" data-go="riscos">Ver registro completo ${I('arrowRight')}</button></div>`;
};

App.ttrList = (sel) => {
  const ttrNodes = S.state.nodes.filter((n) => n.ttr != null).sort((a, b) => M.nodePI(b) - M.nodePI(a));
  const maxW = Math.max(...ttrNodes.map((n) => Math.max(n.ttr, n.tts)));
  const weakest = ttrNodes[0];
  return `<div class="legend-row legend-top"><span class="lg-i"><i style="--c:var(--s8)"></i>Semanas para voltar</span><span class="lg-i"><i style="--c:var(--s1)"></i>Semanas que aguentamos</span><span class="lg-i"><span class="neg">+n</span>&nbsp;semanas sem abastecimento</span></div>
    <div class="ttr-list">${ttrNodes.map((n) => `<button class="ttr-row ${n.id === sel.id ? 'sel' : ''}" type="button" data-node="${n.id}" data-tip="${U.esc(n.nome)}: volta em ${U.wk(n.ttr)} sem. · aguentamos ${U.wk(n.tts)} sem. · margem em risco ${U.money(M.nodePI(n))}">
      <span class="ttr-name">${U.esc(n.nome)}</span>
      <span class="ttr-bars"><span class="bar-ttr" style="width:${(n.ttr / maxW) * 100}%"></span><span class="bar-tts" style="width:${(n.tts / maxW) * 100}%"></span></span>
      <span class="ttr-gap ${n.ttr > n.tts ? 'neg' : ''}">${n.ttr > n.tts ? '+' + U.num(n.ttr - n.tts, 1) : 'ok'}</span></button>`).join('')}</div>
    <p class="note">Quando a barra cinza passa da azul, faltaria abastecimento antes de o elo voltar. O elo mais fraco é <b>${U.esc(weakest.nome)}</b> (${U.money(M.nodePI(weakest))} de margem em risco). Clique numa linha para ver o elo.</p>`;
};

App.cardTop = (pfA, sel) => {
  const top = App.painelSide === 'top';
  return `<section class="card" id="cardTop">
    ${V.sec({ title: top ? 'Riscos prioritários' : 'Recuperação × sobrevivência dos elos', desc: top ? 'Os riscos mais graves hoje. Clique numa linha para abrir os detalhes.' : 'Semanas para cada elo voltar, comparadas às semanas que a empresa aguenta sem ele.', tools: V.seg('side', [['top', 'Riscos'], ['ttr', 'Elos']], App.painelSide, 'Mostrar'), help: top ? 'top' : 'ttr' })}
    ${top ? App.topRisks(pfA) : App.ttrList(sel)}
  </section>`;
};

/* Eventos e sinais recentes */
App.cardEvents = () => {
  const sigs = S.state.alerts.filter((a) => a.status !== 'Descartado').sort((a, b) => (a.data < b.data ? 1 : -1)).slice(0, 6);
  return `<section class="card" id="cardEvents">
    ${V.sec({ title: 'Eventos e sinais recentes', desc: 'Notícias, leituras e avisos de parceiros que podem virar risco.', tools: `<button class="card-link" type="button" data-go-sig>Ver todos ${I('arrowRight')}</button>`, help: 'board' })}
    ${sigs.length ? `<ul class="feed">${sigs.map((a) => `<li><button class="feed-row" type="button" data-sig="${a.id}">
      <span class="feed-ic st-${App.SEV[a.sev]}" data-tip="Severidade ${String(a.sev).toLowerCase()}">${I(App.SEV_IC[a.sev] || 'info')}</span>
      <span class="feed-main"><b>${U.esc(a.titulo)}</b><small>${U.esc(V.nodeName(a.no))} · ${U.esc(a.fonte)} · ${U.ago(a.data)}</small></span>
      ${V.statusPill(App.SIG[a.status][0], App.SIG[a.status][1])}</button></li>`).join('')}</ul>` : V.empty('Nenhum sinal registrado ainda. Use “Registrar sinal” no Monitoramento.')}
  </section>`;
};

/* Andamento do plano */
App.cardPlan = (acts) => {
  const done = acts.filter((a) => a.status === 'Concluída').length, going = acts.filter((a) => a.status === 'Em andamento').length;
  const planned = acts.length - done - going, late = acts.filter(M.actionLate).length, n = acts.length || 1;
  const next = acts.filter((a) => a.status !== 'Concluída').sort((a, b) => (M.actionLate(b) - M.actionLate(a)) || ((a.prazo || '9') < (b.prazo || '9') ? -1 : 1)).slice(0, 4);
  return `<section class="card" id="cardPlan">
    ${V.sec({ title: 'Andamento do plano de ações', desc: 'Situação das ações e os próximos prazos.', tools: `<button class="card-link" type="button" data-go="acoes">Ver plano ${I('arrowRight')}</button>`, help: 'plan' })}
    <div class="status-bar" role="img" aria-label="${done} concluídas, ${going} em andamento e ${planned} planejadas">
      <span style="width:${(done / n) * 100}%;--c:var(--st-ok)" data-tip="Concluídas: ${done}"></span><span style="width:${(going / n) * 100}%;--c:var(--s1)" data-tip="Em andamento: ${going}"></span><span style="width:${(planned / n) * 100}%;--c:var(--line-2)" data-tip="Planejadas: ${planned}"></span></div>
    <div class="legend-row"><span class="lg-i"><i style="--c:var(--st-ok)"></i>Concluídas <b>${done}</b></span><span class="lg-i"><i style="--c:var(--s1)"></i>Em andamento <b>${going}</b></span><span class="lg-i"><i style="--c:var(--line-2)"></i>Planejadas <b>${planned}</b></span>${late ? `<span class="lg-i">${V.statusPill('crit', U.plural(late, 'atrasada', 'atrasadas'))}</span>` : ''}</div>
    <h4 class="sub-h">Próximos prazos</h4>
    ${next.length ? `<div class="table-wrap flush"><table class="table table-hover"><thead><tr><th>Ação</th><th>Responsável</th><th>Prazo</th><th>Situação</th></tr></thead><tbody>
      ${next.map((a) => `<tr data-edit-action="${a.id}" tabindex="0"><td class="wide"><b>${U.esc(a.titulo)}</b><small class="mono">${a.id}</small></td><td>${U.esc(a.resp || '—')}</td><td class="nowrap mono">${U.dateBR(a.prazo)}</td><td class="nowrap">${V.actStatus(a)}</td></tr>`).join('')}
    </tbody></table></div>` : V.empty('Todas as ações foram concluídas.')}
  </section>`;
};

App.welcomeHtml = () => (U.storage.get('riscogcs-boas-vindas') ? '' : `<section class="notice info" id="welcome">
    <span class="notice-ic">${I('info')}</span>
    <div class="notice-t"><b>Primeira vez por aqui?</b><span>Faça o tour guiado: em cerca de 5 minutos ele percorre as telas com você, destacando onde clicar.</span></div>
    <div class="notice-act"><button class="btn btn-primary btn-small" type="button" data-welcome="tour">${I('compass')} Começar o tour</button><button class="btn btn-small" type="button" data-welcome="open">Ler o guia</button><button class="icon-btn" type="button" data-welcome="close" aria-label="Dispensar" data-tip="Dispensar">${I('x')}</button></div></section>`);

App.views.painel = (el) => {
  const pfI = M.portfolio('inerente'), pfA = M.portfolio('atual'), pfP = M.portfolio('planejado');
  const emp = S.state.empresa;
  const nodes = S.state.nodes.filter((n) => n.ttr != null);
  const gaps = nodes.filter((n) => n.ttr > n.tts).sort((a, b) => M.nodePI(b) - M.nodePI(a));
  const kris = S.state.kris, acts = S.state.actions;
  const sel = S.node(App.netSel) || S.state.nodes[0];
  App.netSel = sel.id;

  el.innerHTML = `
  ${App.welcomeHtml()}
  <section class="stats stats-6" id="kpiStrip" aria-label="Indicadores-resumo">${App.painelStats({ pfI, pfA, emp, nodes, gaps, kris, acts })}</section>
  <div class="grid-dash">${App.cardAppetite(pfI, pfA, pfP, emp)}${App.cardMatrix(pfA)}${App.cardKriTrend(kris)}</div>
  <div class="grid-2">${App.cardCats(pfA)}${App.cardTiers(pfA)}</div>
  ${App.cardNet()}
  <div class="grid-2 grid-wide-right">
    <section class="card node-panel" id="nodeCard">${App.nodePanel(sel)}</section>
    ${App.cardTop(pfA, sel)}
  </div>
  <div class="grid-2">${App.cardEvents()}${App.cardPlan(acts)}</div>`;

  U.$$('[data-welcome]', el).forEach((b) => b.addEventListener('click', () => {
    U.storage.set('riscogcs-boas-vindas', 1);
    const w = U.$('#welcome', el);
    if (w) w.remove();
    if (b.dataset.welcome === 'open') X.openGuideAt(0);
    if (b.dataset.welcome === 'tour') Tour.start({ fresh: true });
  }));
  const toMap = () => U.$('#netCard').scrollIntoView({ behavior: U.calm() ? 'auto' : 'smooth', block: 'start' });
  const jump = {
    riscos: () => App.go('riscos', () => { App.mode = 'atual'; }),
    perda: () => App.go('simular', () => { App.simTab = 'mc'; }),
    plano: () => App.go('acoes'),
    elos: () => { App.netColor = 'gap'; App.painelSide = 'ttr'; if (gaps[0]) App.netSel = gaps[0].id; App.render(); toMap(); },
    kri: () => App.go('monitor', () => { App.monTab = 'kri'; App.kriFilter = 'alerta'; }),
    late: () => App.go('acoes', () => { App.act.status = 'Atrasada'; App.act.estr = ''; }),
  };
  U.$$('[data-jump]', el).forEach((b) => b.addEventListener('click', () => jump[b.dataset.jump]()));
  U.$$('#cardMatrix .heat-cell.has', el).forEach((c) => c.addEventListener('click', () => {
    const [p, i] = c.dataset.cell.split('-').map(Number);
    App.go('riscos', () => { Object.assign(App.reg, App.REG0); App.mode = 'atual'; App.reg.view = 'matriz'; App.reg.cell = { p, i }; });
  }));
  U.$$('[data-stop]', el).forEach((s) => s.addEventListener('click', () => {
    if (!s.dataset.stop) return;
    App.netSel = s.dataset.stop; App.render(); toMap();
  }));
  U.$$('[data-dmcat]', el).forEach((g) => g.addEventListener('click', () => App.go('riscos', () => { Object.assign(App.reg, App.REG0); App.reg.cat = g.dataset.dmcat; App.mode = 'atual'; })));
  U.$$('[data-gokri]', el).forEach((r) => r.addEventListener('click', () => App.go('monitor', () => { App.monTab = 'kri'; App.kriFilter = ''; })));
  U.$$('[data-trend]', el).forEach((b) => b.addEventListener('click', () => { App.trendN = +b.dataset.trend; App.render(); }));
  U.$$('[data-sig]', el).forEach((s) => s.addEventListener('click', () => {
    const a = S.state.alerts.find((x) => x.id === s.dataset.sig);
    App.go('monitor', () => { App.monTab = 'kri'; App.alertFilter = a && a.status === 'Novo' ? 'Novo' : 'todos'; });
  }));
  U.$$('[data-go-sig]', el).forEach((b) => b.addEventListener('click', () => App.go('monitor', () => { App.monTab = 'kri'; App.alertFilter = 'todos'; })));
  U.$$('[data-color]', el).forEach((b) => b.addEventListener('click', () => { App.netColor = b.dataset.color; App.render(); }));
  U.$$('[data-side]', el).forEach((b) => b.addEventListener('click', () => { App.painelSide = b.dataset.side; App.render(); }));
  U.$$('[data-node]', el).forEach((g) => g.addEventListener('click', () => {
    App.netSel = g.dataset.node; App.render();
    if (g.closest('.ttr-list') || window.innerWidth < 1180) U.$('.node-panel').scrollIntoView({ behavior: U.calm() ? 'auto' : 'smooth', block: 'nearest' });
  }));
  App.bindNet(U.$('#netCard', el));
  U.$$('[data-kri]', el).forEach((b) => b.addEventListener('click', () => App.kriForm(S.kri(b.dataset.kri))));
  U.$$('[data-sup]', el).forEach((b) => b.addEventListener('click', () => App.supplierDetail(b.dataset.sup)));
  const f = U.$('#nodeForm', el);
  if (f) f.addEventListener('change', () => {
    const d = U.formData(f);
    sel.ttr = Math.max(0, d.ttr || 0); sel.tts = Math.max(0, d.tts || 0); sel.receita = Math.max(0, d.receita || 0);
    App.tuneOpen = true;
    App.refresh();
    U.toast(sel.ttr > sel.tts ? `${sel.nome}: ${U.num(sel.ttr - sel.tts, 1)} semanas sem cobertura` : `${sel.nome}: elo coberto`);
  });
  const tune = U.$('.tune', el);
  if (tune) tune.addEventListener('toggle', () => { App.tuneOpen = tune.open; });
  U.$('#nNew', el).addEventListener('click', () => V.riskForm(null, { no: sel.id }));
  const ns = U.$('#nSim', el);
  if (ns) ns.addEventListener('click', () => App.go('simular', () => { App.simTab = 'dis'; App.disForNode(sel.id); }));
};

/* ==========================================================================
   RISCOS — matriz clicável, filtros e registro
   ========================================================================== */
App.REG0 = { q: '', cat: '', tipo: '', nivel: '', status: '', cell: null, quad: null };
App.reg = { ...App.REG0, sort: 'score', dir: -1, view: 'matriz' };

App.views.riscos = (el) => {
  const f = App.reg, mode = App.mode;
  const all = S.state.risks.map((r) => ({ r, e: M.evalRisk(r, mode), ei: M.evalRisk(r, 'inerente'), n: M.actionsOf(r.id).length }));
  const ok = (x, skip = '') =>
    (!f.q || U.fold(x.r.id + ' ' + x.r.titulo + ' ' + x.r.causa + ' ' + V.nodeName(x.r.no)).includes(U.fold(f.q))) &&
    (skip === 'cat' || !f.cat || x.r.cat === f.cat) && (!f.tipo || x.r.tipo === f.tipo) &&
    (skip === 'nivel' || !f.nivel || x.e.level.id === f.nivel) && (!f.status || x.r.status === f.status);
  const base = all.filter((x) => ok(x));
  const onMap = base.filter((x) => x.r.status !== 'Encerrado');
  const rows = base.filter((x) => (!f.cell || (x.e.pl === f.cell.p && x.e.i === f.cell.i)) && (!f.quad || x.e.quad.id === f.quad));
  const key = {
    id: (x) => x.r.id, titulo: (x) => x.r.titulo, tipo: (x) => x.r.tipo,
    score: (x) => x.e.score * 1e9 + x.e.pea, pea: (x) => x.e.pea, n: (x) => x.n, status: (x) => x.r.status,
  }[f.sort];
  rows.sort((a, b) => { const A = key(a), B = key(b); return (A > B ? 1 : A < B ? -1 : 0) * f.dir; });
  const th = (k, label, cls = '') => `<th class="${cls}" aria-sort="${f.sort === k ? (f.dir > 0 ? 'ascending' : 'descending') : 'none'}"><button class="sort ${f.sort === k ? 'on' : ''}" type="button" data-sort="${k}">${label}${f.sort === k ? I(f.dir > 0 ? 'arrowUp' : 'arrowDown') : ''}</button></th>`;
  const totPea = rows.reduce((s, x) => s + x.e.pea, 0);

  const act = [];
  if (f.cell) act.push(['cell', `Chance ${f.cell.p} × impacto ${f.cell.i}`]);
  if (f.quad) act.push(['quad', M.QUADS[f.quad].nome]);
  if (f.nivel) act.push(['nivel', 'Nível ' + M.LEVELS.find((l) => l.id === f.nivel).nome.toLowerCase()]);
  if (f.cat) act.push(['cat', S.cat(f.cat).nome]);
  if (f.tipo) act.push(['tipo', DATA.TIPOS[f.tipo].nome]);
  if (f.status) act.push(['status', f.status]);
  if (f.q) act.push(['q', '“' + f.q + '”']);

  const cells = {};
  onMap.forEach((x) => { const k = x.e.pl + '-' + x.e.i; (cells[k] = cells[k] || []).push(x); });
  let heat = '<div class="heat heat-compact heat-pick"><div class="heat-ylab">Chance de acontecer</div><div class="heat-grid">';
  for (let p = 5; p >= 1; p--) {
    heat += `<div class="heat-rowlab"><b>${p}</b><span>${DATA.PROB[p - 1].nome}</span></div>`;
    for (let i = 1; i <= 5; i++) {
      const lv = M.level(p * i), list = cells[p + '-' + i] || [];
      const on = f.cell && f.cell.p === p && f.cell.i === i;
      const dim = (f.cell && !on) || (f.quad && M.quad(p, i).id !== f.quad);
      heat += `<div class="heat-cell lvl-${lv.id} ${on ? 'on' : ''} ${dim ? 'dim' : ''} ${list.length ? 'has' : ''}" role="button" tabindex="0" data-cell="${p}-${i}" aria-pressed="${on}" aria-label="Chance ${p}, impacto ${i}: ${U.plural(list.length, 'risco', 'riscos')}"
        data-tip="Chance ${p} × impacto ${i} = gravidade ${p * i} (${lv.nome.toLowerCase()})${list.length ? '\n' + list.map((x) => x.r.id + ' ' + x.r.titulo).join('\n') + '\nClique para listar só estes' : '\nNenhum risco aqui'}">${list.length ? `<span class="heat-count">${list.length}</span>` : ''}</div>`;
    }
  }
  heat += '<div></div>';
  for (let i = 1; i <= 5; i++) heat += `<div class="heat-collab"><b>${i}</b><span>${DATA.IMPACT_NAMES[i - 1]}</span></div>`;
  heat += '</div><div class="heat-xlab">Tamanho do impacto</div></div>';

  const byQ = { moderada: [], alta: [], baixa: [], media: [] };
  onMap.forEach((x) => byQ[x.e.quad.id].push(x));
  const qbox = (id, arrows) => `<div class="quad q-${id} ${f.quad === id ? 'on' : ''} ${f.quad && f.quad !== id ? 'dim' : ''}" role="button" tabindex="0" data-quad="${id}" aria-pressed="${f.quad === id}">
    <div class="quad-head"><b>${M.QUADS[id].nome}</b><span>${U.plural(byQ[id].length, 'risco', 'riscos')}</span></div>
    <p>${U.esc(M.QUADS[id].foco)}</p><div class="chips">${byQ[id].sort((a, b) => b.e.score - a.e.score).map((x) => `<button class="chip lvl-${x.e.level.id}" type="button" data-open-risk="${x.r.id}" data-tip="${U.esc(x.r.titulo)}">${x.r.id}</button>`).join('')}</div>${arrows ? `<div class="arrow-tag">${arrows}</div>` : ''}</div>`;
  const quads = `<div class="quads"><div class="quad-axis-y">Chance: baixa → alta</div><div class="quad-grid">
    ${qbox('moderada', 'Resposta: prevenir')}${qbox('alta', 'Resposta: prevenir e ter redundância, flexibilidade e agilidade')}
    ${qbox('baixa')}${qbox('media', 'Resposta: ter redundância, flexibilidade e agilidade')}</div>
    <div class="quad-axis-x">Impacto: leve → severo</div></div>`;

  const lvCount = (id) => all.filter((x) => ok(x, 'nivel') && x.r.status !== 'Encerrado' && x.e.level.id === id).length;
  const catBase = all.filter((x) => ok(x, 'cat') && x.r.status !== 'Encerrado');
  const cat = App.catRows(catBase, { attr: 'data-cat', cur: f.cat });

  el.innerHTML = `
  <section class="scope-bar" aria-label="Cenário de avaliação">
    <span class="field-lab">Avaliar riscos no cenário</span>
    ${V.seg('mode', Object.entries(M.MODES), mode, 'Cenário')}
    <span class="scn-info">${I('info')}${U.esc(M.MODES_INFO[mode])}</span>
  </section>

  <div class="grid-2 grid-risk">
    <div class="stack-col">
      <section class="card" id="cardRiskMatrix">
        ${V.sec({ title: f.view === 'matriz' ? 'Matriz de riscos' : 'Quadrantes de vulnerabilidade', desc: f.view === 'matriz' ? 'Para cima, mais provável; para a direita, mais impacto. Clique numa célula para filtrar o registro.' : 'Os riscos agrupados pela resposta recomendada para cada combinação de chance e impacto.', tools: V.seg('view', [['matriz', 'Matriz'], ['quad', 'Quadrantes']], f.view, 'Visualização'), help: f.view === 'matriz' ? 'matrix' : 'quads' })}
        ${f.view === 'matriz' ? heat : quads}
        <div class="lv-filter"><span class="field-lab">Nível</span>${M.LEVELS.map((l) => `<button class="pill pill-btn lvl-${l.id} ${f.nivel === l.id ? 'on' : ''} ${f.nivel && f.nivel !== l.id ? 'dim' : ''}" type="button" data-nivel="${l.id}" aria-pressed="${f.nivel === l.id}"><i aria-hidden="true"></i>${l.nome}<b>${lvCount(l.id)}</b></button>`).join('')}</div>
      </section>
      <section class="card" id="cardRiskCats">
        ${V.sec({ title: 'Perda por categoria', desc: 'Perda esperada por ano no cenário escolhido. Clique numa linha para filtrar o registro.', help: 'catsRisk' })}
        ${cat.rows.length ? C.stackBars(cat.rows) + cat.legend : V.empty('Nenhuma categoria com esses filtros.')}
      </section>
    </div>

    <section class="card" id="cardRegister">
      ${V.sec({ title: 'Registro de riscos', desc: `Cenário “${M.MODES[mode]}”. Clique numa linha para abrir os detalhes; clique no título de uma coluna para ordenar.`, help: 'list' })}
      <div class="tbl-toolbar">
        <span class="input-ic">${I('search')}<input id="fQ" type="search" placeholder="Buscar por código, nome, causa ou elo" value="${U.esc(f.q)}" aria-label="Buscar riscos"></span>
        <select id="fTipo" aria-label="Natureza"><option value="">Todas as naturezas</option>${Object.entries(DATA.TIPOS).map(([k, t]) => `<option value="${k}" ${f.tipo === k ? 'selected' : ''}>${t.nome}</option>`).join('')}</select>
        <select id="fStatus" aria-label="Situação"><option value="">Todas as situações</option>${DATA.STATUS_RISCO.map((s) => `<option ${f.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
        <span class="toolbar-actions">
          <button class="btn btn-quiet" type="button" id="btnCsv" data-tip="Baixar a lista em CSV (abre no Excel)">${I('download')} Exportar</button>
        </span>
      </div>
      ${act.length ? `<div class="active-filters"><span class="field-lab">Filtros</span>${act.map(([k, t]) => `<button class="fchip" type="button" data-clear="${k}" aria-label="Remover filtro ${U.esc(t)}">${U.esc(t)}${I('x')}</button>`).join('')}<button class="link" type="button" data-clear="all">Limpar todos</button></div>` : ''}
      <div class="table-wrap flush"><table class="table table-hover" id="riskTable">
        <thead><tr>${th('id', 'Código')}${th('titulo', 'Risco')}${th('score', 'Gravidade')}${th('pea', 'Perda/ano', 'num')}${th('n', 'Ações', 'num')}${th('status', 'Situação')}</tr></thead>
        <tbody>${rows.map(({ r, e, ei, n }) => `<tr data-open-risk="${r.id}" tabindex="0">
          <td class="mono">${r.id}</td>
          <td class="wide"><b>${U.esc(r.titulo)}</b><small>${U.esc(V.nodeName(r.no))} · ${U.esc(S.cat(r.cat).nome)} · ${DATA.TIPOS[r.tipo].nome}</small></td>
          <td class="nowrap"><span class="score-cell">${V.scoreCell(e)}${V.levelPill(e.level)}</span>${mode !== 'inerente' && ei.score !== e.score ? `<small>sem ações: ${ei.score}</small>` : ''}</td>
          <td class="num">${U.money(e.pea)}</td><td class="num">${n || '<span class="neg" data-tip="Nenhuma ação de tratamento cadastrada">0</span>'}</td><td class="nowrap">${V.riskStatus(r.status)}</td></tr>`).join('') || `<tr><td colspan="6"><div class="empty">Nenhum risco com esses filtros. <button class="link" type="button" data-clear="all">Limpar filtros</button></div></td></tr>`}</tbody>
      </table></div>
      <div class="tbl-foot"><span>Mostrando ${rows.length} de ${all.length} riscos</span><span>Perda esperada da seleção: <b>${U.money(totPea)}</b> por ano</span></div>
    </section>
  </div>

  <details class="card fold">
    <summary><span class="fold-t"><b>Critérios de pontuação</b><small>Escalas de chance e de impacto usadas na matriz</small></span>${I('chevDown', 'fold-chev')}</summary>
    <div class="grid-2 grid-wide-right-2 fold-body">
      <div class="table-wrap"><table class="table"><thead><tr><th class="num">Nota</th><th>Chance</th><th>Frequência por ano</th></tr></thead><tbody>
        ${DATA.PROB.slice().reverse().map((p) => `<tr><td class="num">${p.n}</td><td>${p.nome}</td><td>${p.faixa}<small>${p.exemplo}</small></td></tr>`).join('')}
      </tbody></table></div>
      <div><div class="table-wrap"><table class="table crit-table"><thead><tr><th>Dimensão do impacto</th>${DATA.IMPACT_NAMES.map((n, i) => `<th>${i + 1} · ${n}</th>`).join('')}</tr></thead><tbody>
        ${Object.values(DATA.IMPACT).map((d) => `<tr><td><b>${d.nome}</b></td>${d.niveis.map((t) => `<td>${U.esc(t)}</td>`).join('')}</tr>`).join('')}
      </tbody></table></div>
      <p class="note">O impacto do risco é a pior nota entre as quatro dimensões. Gravidade = chance × impacto: baixo 1–4 · moderado 5–9 · alto 10–14 · crítico 15–25.</p></div>
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
  U.$$('[data-clear]', el).forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.clear;
    if (k === 'all') Object.assign(f, App.REG0); else f[k] = App.REG0[k];
    App.render();
  }));
  U.$('#fTipo', el).addEventListener('change', (e) => { f.tipo = e.target.value; App.render(); });
  U.$('#fStatus', el).addEventListener('change', (e) => { f.status = e.target.value; App.render(); });
  U.$('#fQ', el).addEventListener('input', (e) => {
    f.q = e.target.value; App.render();
    const i = U.$('#fQ'); i.focus(); i.setSelectionRange(i.value.length, i.value.length);
  });
  U.$$('[data-sort]', el).forEach((b) => b.addEventListener('click', () => { const k = b.dataset.sort; f.dir = f.sort === k ? -f.dir : (k === 'id' || k === 'titulo' ? 1 : -1); f.sort = k; App.render(); }));
  U.$('#btnCsv', el).addEventListener('click', () => App.exportRisksCsv());
};

App.exportRisksCsv = () => {
  const head = ['Código', 'Risco', 'Categoria', 'Natureza', 'Elo', 'Responsável', 'Situação', 'Chance (1-5)', 'Impacto (1-5)', 'Gravidade (P×I)', 'Nível sem ações', 'Custo/ano sem ações (R$ mil)', 'Nível com o plano', 'Custo/ano com o plano (R$ mil)', 'Perda mínima (R$ mil)', 'Perda mais provável (R$ mil)', 'Perda máxima (R$ mil)', 'Causa', 'Consequência'];
  const rows = S.state.risks.map((r) => {
    const a = M.evalRisk(r, 'inerente'), b = M.evalRisk(r, 'planejado');
    return [r.id, r.titulo, S.cat(r.cat).nome, DATA.TIPOS[r.tipo].nome, V.nodeName(r.no), r.resp, r.status, a.pl, a.i, a.score, a.level.nome, Math.round(a.pea), b.level.nome, Math.round(b.pea), r.sev[0], r.sev[1], r.sev[2], r.causa, r.consequencia];
  });
  U.download('registro-de-riscos.csv', U.csv([head, ...rows]), 'text/csv');
};

/* ==========================================================================
   PLANO DE AÇÕES
   ========================================================================== */
App.act = { estr: '', status: '', sort: 'bc' };
App.STRAT = {
  prob: { ic: 'shield', c: 'var(--s1)', txt: 'Atua antes: evita que a interrupção aconteça.' },
  cons: { ic: 'layers', c: 'var(--s3)', txt: 'A cadeia sofre o golpe, mas não para.' },
  transf: { ic: 'banknote', c: 'var(--s2)', txt: 'Muda quem paga a conta; não elimina o problema.' },
};
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
  const ranking = rows.slice().sort((x, y) => y.bc - x.bc).slice(0, 10);
  const pct = (v) => U.pct(v / (pI || 1));

  el.innerHTML = `
  <section class="stats stats-4" aria-label="Resumo do plano">
    ${V.stat({ label: 'Perda sem ações', icon: 'alert', value: U.money(pI), foot: '<span class="stat-cap">ponto de partida (risco inerente)</span>' })}
    ${V.stat({ label: 'Perda hoje', icon: 'activity', value: U.money(pA), foot: `${V.delta(pct(pI - pA), 'down', true)}<span class="stat-cap">com o que já foi feito</span>` })}
    ${V.stat({ label: 'Perda com o plano', icon: 'target', value: U.money(pP), foot: `${V.delta(pct(pI - pP), 'down', true)}<span class="stat-cap">se tudo for concluído</span>` })}
    ${V.stat({ label: 'Custo do plano', icon: 'banknote', value: U.money(custo), foot: `<span class="stat-cap">por ano · evita ${U.money(pI - pP)} (${U.num(custo ? (pI - pP) / custo : 0, 1)}× o custo)</span>` })}
  </section>

  ${noAction.length ? `<section class="notice warn"><span class="notice-ic">${I('alert')}</span><div class="notice-t"><b>${U.plural(noAction.length, 'risco alto ou crítico está sem ação de tratamento', 'riscos altos ou críticos estão sem ação de tratamento')}</b><span>${noAction.map((r) => V.riskLink(r.id)).join(', ')}. Abra o risco e use “Criar ação para este risco”.</span></div></section>` : ''}

  <div class="grid-2 grid-wide-left">
    <section class="card" id="cardWaterfall">
      ${V.sec({ title: 'Redução da perda esperada', desc: 'Do cenário sem ações até a meta do plano: quanto já foi reduzido e quanto ainda falta.', help: 'waterfall' })}
      ${C.waterfall([
        { label: 'Sem ações', sub: 'risco inerente', from: 0, to: pI, kind: 'total', text: U.money(pI) },
        { label: 'Ações já feitas', sub: `concluídas e em andamento · −${pct(pI - pA)}`, from: pA, to: pI, kind: 'down', text: '−' + U.money(pI - pA) },
        { label: 'Hoje', sub: 'risco residual atual', from: 0, to: pA, kind: 'total now', text: U.money(pA) },
        { label: 'Restante do plano', sub: `ações a concluir · −${pct(pA - pP)}`, from: pP, to: pA, kind: 'down todo', text: '−' + U.money(pA - pP) },
        { label: 'Com o plano', sub: 'risco residual planejado', from: 0, to: pP, kind: 'total goal', text: U.money(pP) },
      ])}
      <div class="legend-row"><span class="lg-i"><i style="--c:var(--s8)"></i>Perda por ano</span><span class="lg-i"><i style="--c:var(--st-ok)"></i>Redução já obtida</span><span class="lg-i"><i class="hatch"></i>Redução que falta</span></div>
    </section>
    <section class="card" id="cardStrategies">
      ${V.sec({ title: 'Estratégias de tratamento', desc: 'As três formas de agir sobre um risco. Clique numa estratégia para ver só as ações dela.', help: 'strategies' })}
      <div class="opt-list">${byE.map((x) => `<button class="opt ${f.estr === x.k ? 'on' : ''} ${f.estr && f.estr !== x.k ? 'dim' : ''}" type="button" data-estr="${x.k}" aria-pressed="${f.estr === x.k}" style="--c:${App.STRAT[x.k].c}">
        <span class="opt-ic">${I(App.STRAT[x.k].ic)}</span>
        <span class="opt-t"><b>${DATA.ESTRATEGIAS[x.k]}</b><small>${App.STRAT[x.k].txt}</small><span class="opt-meta"><span>Custa <b>${U.money(x.custo)}</b>/ano</span><span>Evita <b>${U.money(x.ben)}</b>/ano</span></span></span>
        <span class="opt-n"><b>${x.n}</b><small>${x.n === 1 ? 'ação' : 'ações'}</small></span></button>`).join('')}</div>
    </section>
  </div>

  <section class="card" id="cardActions">
    ${V.sec({ title: 'Ações do plano', desc: 'Clique numa ação para atualizar progresso, prazo ou responsável.', help: 'actions' })}
    <div class="tbl-toolbar">
      ${V.seg('ast', [['', `Todas <span class="cnt">${cnt('')}</span>`], ...DATA.STATUS_ACAO.map((s) => [s, `${s} <span class="cnt">${cnt(s)}</span>`]), ['Atrasada', `Atrasadas <span class="cnt">${cnt('Atrasada')}</span>`]], f.status, 'Situação')}
      <label class="inline">Ordenar por<select id="aSort">${[['bc', 'Maior retorno'], ['ben', 'Maior perda evitada'], ['custo', 'Maior custo'], ['prazo', 'Prazo mais próximo'], ['id', 'Código']].map(([k, v]) => `<option value="${k}" ${f.sort === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <span class="toolbar-actions"><button class="btn btn-quiet" type="button" id="aCsv" data-tip="Baixar o plano em CSV (abre no Excel)">${I('download')} Exportar</button></span>
    </div>
    ${f.estr ? `<div class="active-filters"><span class="field-lab">Filtros</span><button class="fchip" type="button" id="aEstrClear" aria-label="Remover filtro ${U.esc(DATA.ESTRATEGIAS[f.estr])}">${U.esc(DATA.ESTRATEGIAS[f.estr])}${I('x')}</button></div>` : ''}
    <div class="table-wrap flush"><table class="table table-hover" id="actTable"><thead><tr><th>Código</th><th>Ação</th><th>Riscos</th><th>Efeito</th><th class="num">Custo/ano</th><th class="num">Evita/ano</th><th class="num">Retorno</th><th>Progresso</th><th>Situação</th></tr></thead><tbody>
      ${rows.map(({ a, ben, bc }) => `<tr data-edit-action="${a.id}" tabindex="0">
        <td class="mono">${a.id}</td><td class="wide"><b>${U.esc(a.titulo)}</b><small>${DATA.ESTRATEGIAS[a.estrategia]} · ${U.esc(a.alavanca)} · ${U.esc(a.resp || 'sem responsável')}</small></td>
        <td class="nowrap">${a.riscos.map(V.riskLink).join(' ')}</td>
        <td class="small">${V.effect(a)}</td><td class="num">${U.money(a.custo)}</td><td class="num">${U.money(ben)}</td>
        <td class="num"><span class="bc ${bc >= 1 ? 'pos' : 'neg'}" data-tip="Evita ${U.money(ben)} por ano para cada ${U.money(a.custo)} gastos">${U.num(bc, 1)}×</span></td>
        <td class="prog-cell">${V.progress(a.progresso)}<small>${a.progresso}%</small></td>
        <td class="nowrap">${V.actStatus(a)}<small class="mono">${a.prazo ? 'prazo ' + U.dateBR(a.prazo) : 'sem prazo'}</small></td></tr>`).join('') || `<tr><td colspan="9"><div class="empty">Nenhuma ação com esses filtros. <button class="link" type="button" id="aClear">Mostrar todas</button></div></td></tr>`}
    </tbody></table></div>
    <div class="tbl-foot"><span>Mostrando ${rows.length} de ${all.length} ações</span><span><b>Evita/ano</b>: quanto a perda subiria sem a ação · <b>Retorno</b>: perda evitada ÷ custo</span></div>
  </section>
  ${ranking.length ? `<section class="card" id="cardRoi">
    ${V.sec({ title: 'Retorno por real investido', desc: `${f.estr || f.status ? 'Ações filtradas' : 'As 10 melhores'}, por quanto evitam de perda para cada real gasto. Abaixo de 1×, ainda podem valer a pena por proteger contra anos ruins.`, help: 'roi' })}
    ${C.hbars(ranking.map((x) => ({ labelHtml: `<button class="link" type="button" data-edit-action="${x.a.id}">${x.a.id}</button> ${U.esc(x.a.titulo)}`, value: x.bc, color: x.bc >= 1 ? 'var(--st-ok)' : 'var(--s8)', tip: `Evita ${U.money(x.ben)} por ano e custa ${U.money(x.a.custo)}` })), { fmt: (v) => U.num(v, 1) + '×' })}
  </section>` : ''}`;

  U.$$('[data-estr]', el).forEach((b) => b.addEventListener('click', () => { f.estr = f.estr === b.dataset.estr ? '' : b.dataset.estr; App.render(); }));
  U.$$('[data-ast]', el).forEach((b) => b.addEventListener('click', () => { f.status = b.dataset.ast; App.render(); }));
  U.$('#aSort', el).addEventListener('change', (e) => { f.sort = e.target.value; App.render(); });
  U.$('#aCsv', el).addEventListener('click', App.exportActionsCsv);
  const ec = U.$('#aEstrClear', el);
  if (ec) ec.addEventListener('click', () => { f.estr = ''; App.render(); });
  const ac = U.$('#aClear', el);
  if (ac) ac.addEventListener('click', () => { f.estr = ''; f.status = ''; App.render(); });
};

/* ==========================================================================
   MONITORAMENTO — indicadores, sinais e fornecedores
   ========================================================================== */
App.monTab = 'kri';
App.kriFilter = '';
App.alertFilter = 'abertos';
App.views.monitor = (el) => {
  V.pageTabs(V.tabs('mon', [['kri', 'Indicadores e sinais', 'activity'], ['forn', 'Fornecedores', 'package']], App.monTab, 'Monitoramento'));
  U.$$('#phTabs [data-mon]').forEach((b) => b.addEventListener('click', () => { if (App.monTab !== b.dataset.mon) { App.monTab = b.dataset.mon; App.render(); } }));
  (App.monTab === 'forn' ? App.supView : App.kriView)(el);
};

App.kriView = (el) => {
  const all = S.state.kris.map((k) => ({ k, st: M.kriStatus(k) })).sort((a, b) => ({ crit: 0, warn: 1, ok: 2 }[a.st] - { crit: 0, warn: 1, ok: 2 }[b.st]));
  const kf = App.kriFilter;
  const kris = all.filter((x) => !kf || (kf === 'alerta' ? x.st !== 'ok' : x.st === kf));
  const af = App.alertFilter;
  const alerts = S.state.alerts.filter((a) => af === 'todos' || (af === 'abertos' ? ['Novo', 'Reconhecido'].includes(a.status) : a.status === af)).sort((a, b) => (a.data < b.data ? 1 : -1));
  const lim = (k) => (k.dir === 'maior'
    ? `Melhor quando sobe · normal a partir de ${U.num(k.verde, k.dec)} · crítico abaixo de ${U.num(k.vermelho, k.dec)}`
    : `Melhor quando cai · normal até ${U.num(k.verde, k.dec)} · crítico acima de ${U.num(k.vermelho, k.dec)}`);
  const n = (s) => all.filter((x) => x.st === s).length;
  const tile = (id, label, value, sub, st) => `<button class="stat stat-sel" type="button" data-kf="${id}" aria-pressed="${kf === id}">
    <span class="stat-top"><span class="stat-label">${st ? `<span class="stx st-${st}"><i aria-hidden="true"></i>${label}</span>` : label}</span>${kf === id ? `<span class="stat-ic on">${I('filter')}</span>` : ''}</span>
    <span class="stat-value">${value}</span><span class="stat-foot"><span class="stat-cap">${sub}</span></span></button>`;
  const filterTxt = { crit: 'Mostrando só os críticos.', warn: 'Mostrando só os que estão em atenção.', ok: 'Mostrando só os normais.', alerta: 'Mostrando só os que estão fora da faixa normal.' }[kf];

  el.innerHTML = `
  <section class="stats stats-4" id="kriFilter" aria-label="Filtrar indicadores por situação">
    ${tile('crit', 'Críticos', n('crit'), 'passaram do limite crítico', 'crit')}
    ${tile('warn', 'Em atenção', n('warn'), 'entre o limite normal e o crítico', 'warn')}
    ${tile('ok', 'Normais', n('ok'), 'dentro da faixa normal', 'ok')}
    ${tile('', 'Todos os indicadores', all.length, 'acompanhados todo mês', '')}
  </section>
  <div class="grid-2 grid-wide-left">
    <section class="card" id="cardKris">
      ${V.sec({ title: 'Indicadores-chave de risco', desc: `${filterTxt ? filterTxt + ' Clique de novo no filtro para ver todos. ' : ''}A faixa mostra os limites e o traço, a leitura atual. Clique num indicador para registrar a leitura do mês.`, help: 'kri' })}
      <div class="kri-grid">${kris.map(({ k, st }) => {
        const last = k.hist[11], prev = k.hist[10], d = last - prev;
        const good = d === 0 ? null : (k.dir === 'maior' ? d > 0 : d < 0);
        const linked = S.state.risks.filter((r) => r.kri === k.id);
        return `<button class="kri-card st-${st}" type="button" data-kri="${k.id}">
          <span class="kri-top"><span class="kri-name">${U.esc(k.nome)}</span>${V.statusPill(st)}</span>
          <span class="kri-mid"><span class="kri-big">${U.num(last, k.dec)}<small>${U.esc(k.unidade)}</small></span>${d === 0 ? V.delta('estável', 'flat', null) : V.delta(U.num(Math.abs(d), k.dec), d > 0 ? 'up' : 'down', good)}<span class="muted small">vs. ${DATA.MESES[10].toLowerCase()}</span></span>
          ${C.zone(k)}
          ${C.spark(k.hist, { w: 260, h: 40, color: `var(--st-${st})`, lines: [{ v: k.verde, cls: 'ok' }, { v: k.vermelho, cls: 'crit' }], lo: Math.min(k.verde, k.vermelho), hi: Math.max(k.verde, k.vermelho) })}
          <span class="kri-foot"><span>${lim(k)}</span><span>${U.esc(V.nodeName(k.no))}${linked.length ? ' · riscos ' + linked.map((r) => r.id).join(', ') : ''}</span></span>
        </button>`;
      }).join('') || V.empty('Nenhum indicador nesta situação. Clique em “Todos os indicadores” para ver a lista completa.')}</div>
    </section>
    <section class="card" id="cardSignals">
      ${V.sec({ title: 'Sinais e eventos', desc: 'Detectar cedo e decidir rápido evita perdas. Para cada sinal: marque como visto, transforme em risco ou descarte.', tools: `<select id="alFilter" aria-label="Mostrar sinais">${[['abertos', 'Abertos'], ['Novo', 'Novos'], ['Reconhecido', 'Vistos'], ['Convertido', 'Viraram risco'], ['Descartado', 'Descartados'], ['todos', 'Todos']].map(([k, v]) => `<option value="${k}" ${af === k ? 'selected' : ''}>${v}</option>`).join('')}</select>`, help: 'alerts' })}
      <div class="alerts">${alerts.map((a) => `<article class="alert ${a.status === 'Novo' ? 'is-new' : ''}">
        <span class="feed-ic st-${App.SEV[a.sev]}" data-tip="Severidade ${String(a.sev).toLowerCase()}">${I(App.SEV_IC[a.sev] || 'info')}</span>
        <div class="al-body">
          <div class="alert-top"><b class="al-title">${U.esc(a.titulo)}</b>${V.statusPill(App.SIG[a.status][0], App.SIG[a.status][1])}</div>
          <p>${U.esc(a.texto)}</p>
          <div class="alert-foot"><span class="muted small">${U.dateBR(a.data)} · ${U.esc(a.fonte)} · ${U.esc(V.nodeName(a.no))} · severidade ${String(a.sev).toLowerCase()}${a.risco ? ' · ' + V.riskLink(a.risco) : ''}</span>
            <span class="alert-btns">
              ${a.status === 'Novo' ? `<button class="btn btn-small" type="button" data-al="${a.id}" data-do="ack">${I('eye')} Marcar como visto</button>` : ''}
              ${['Novo', 'Reconhecido'].includes(a.status) ? `<button class="btn btn-small" type="button" data-al="${a.id}" data-do="conv">${I('plus')} Transformar em risco</button><button class="btn btn-small btn-quiet" type="button" data-al="${a.id}" data-do="disc">Descartar</button>` : ''}
            </span></div>
        </div></article>`).join('') || V.empty('Nenhum sinal nesta lista. Troque o filtro ou registre um sinal novo.')}</div>
      <div class="card-foot"><span class="muted small">${U.plural(alerts.length, 'sinal nesta lista', 'sinais nesta lista')}</span><button class="btn btn-small" type="button" id="alNew">${I('plus')} Registrar sinal</button></div>
    </section>
  </div>`;

  U.$$('[data-kf]', el).forEach((b) => b.addEventListener('click', () => { App.kriFilter = App.kriFilter === b.dataset.kf ? '' : b.dataset.kf; App.render(); }));
  U.$$('[data-kri]', el).forEach((b) => b.addEventListener('click', () => App.kriForm(S.kri(b.dataset.kri))));
  U.$('#alFilter', el).addEventListener('change', (e) => { App.alertFilter = e.target.value; App.render(); });
  U.$$('[data-al]', el).forEach((b) => b.addEventListener('click', () => {
    const a = S.state.alerts.find((x) => x.id === b.dataset.al);
    if (b.dataset.do === 'ack') { a.status = 'Reconhecido'; App.refresh(); U.toast('Sinal marcado como visto'); }
    if (b.dataset.do === 'disc') { a.status = 'Descartado'; App.refresh(); U.toast('Sinal descartado'); }
    if (b.dataset.do === 'conv') V.riskForm(null, { no: a.no, titulo: a.titulo, causa: a.texto, alertId: a.id });
  }));
  U.$('#alNew', el).addEventListener('click', App.newSignal);
};

/* Registrar um sinal (painel lateral) */
App.newSignal = () => U.modal({
  title: 'Registrar sinal', drawer: true, kicker: 'Monitoramento · novo sinal',
  body: `<p class="muted">Registre qualquer evento que possa afetar a cadeia: uma notícia, um aviso de parceiro, uma leitura fora do normal.</p>
    <form id="alForm" class="form">
      <label class="span-2">O que foi detectado<input name="titulo" required placeholder="Ex.: Greve anunciada no Porto de Suape"></label>
      <label>Elo afetado<select name="no">${U.opts(S.state.nodes, 'n_fab')}</select></label>
      <label>Severidade<select name="sev"><option>Alta</option><option selected>Média</option><option>Baixa</option></select></label>
      <label>Fonte<input name="fonte" value="Equipe interna" placeholder="Quem ou o que informou"></label><label>Data<input type="date" name="data" value="${U.today()}"></label>
      <label class="span-2">Detalhes<textarea name="texto" rows="4" placeholder="O que se sabe até agora e por que preocupa"></textarea></label></form>`,
  actions: [{ label: 'Cancelar' }, { label: 'Registrar sinal', cls: 'btn-primary', onClick: (w) => {
    const f = U.formData(w.querySelector('#alForm'));
    if (!f.titulo.trim()) { U.toast('Descreva o que foi detectado', 'alert'); return false; }
    S.state.alerts.push({ id: S.nextId(S.state.alerts, 'E'), ...f, status: 'Novo', risco: null });
    App.alertFilter = 'abertos';
    if (App.current !== 'monitor') App.go('monitor', () => { App.monTab = 'kri'; }); else App.refresh();
    S.save();
    U.toast('Sinal registrado como novo');
  } }],
});

App.kriForm = (k) => {
  const st = M.kriStatus(k);
  U.modal({
    title: k.nome, drawer: true, kicker: `Indicador-chave de risco · ${k.id}`,
    sub: `${V.statusPill(st)}<span class="muted small">${U.esc(V.nodeName(k.no))} · ${k.dir === 'maior' ? 'melhor quando o valor sobe' : 'melhor quando o valor cai'}</span>`,
    body: `<div class="rd-sec rd-first"><h4>Leitura atual</h4>
      <div class="kri-modal"><span class="kri-big">${U.num(k.hist[11], k.dec)}<small>${U.esc(k.unidade)}</small></span>${C.zone(k)}${C.spark(k.hist, { w: 560, h: 96, color: `var(--st-${st})`, lines: [{ v: k.verde, cls: 'ok' }, { v: k.vermelho, cls: 'crit' }], lo: Math.min(k.verde, k.vermelho), hi: Math.max(k.verde, k.vermelho) })}
      <div class="spark-axis"><span>${DATA.MESES[0]}</span><span>${DATA.MESES[11]}</span></div></div></div>
      <div class="rd-sec"><h4>Registrar leitura e limites</h4>
      <form id="kForm" class="form">
        <label>Leitura de ${DATA.MESES[11]}<small>em ${U.esc(k.unidade || 'unidades')}</small><input type="number" step="any" name="v" value="${k.hist[11]}"></label>
        <label>Melhor quando o valor<small>define o sentido dos limites</small><select name="dir"><option value="maior" ${k.dir === 'maior' ? 'selected' : ''}>sobe</option><option value="menor" ${k.dir === 'menor' ? 'selected' : ''}>cai</option></select></label>
        <label>Limite normal<small>até onde está tudo bem</small><input type="number" step="any" name="verde" value="${k.verde}"></label>
        <label>Limite crítico<small>a partir de onde é preciso agir</small><input type="number" step="any" name="vermelho" value="${k.vermelho}"></label>
      </form></div>
      <div class="rd-sec"><h4>Histórico dos últimos 12 meses</h4>
      <div class="table-wrap"><table class="table table-compact"><thead><tr>${k.hist.map((_, i) => `<th class="num">${App.MES3[(10 + i) % 12]}</th>`).join('')}</tr></thead><tbody><tr>${k.hist.map((v, i) => `<td class="num"><span class="stx st-${M.kriStatus(k, v)} only-dot" data-tip="${DATA.MESES[i]}: ${M.STATUS_TXT[M.kriStatus(k, v)]}"><i></i></span>${U.num(v, k.dec)}</td>`).join('')}</tr></tbody></table></div></div>`,
    actions: [{ label: 'Cancelar' }, { label: 'Salvar leitura', cls: 'btn-primary', onClick: (w) => {
      const f = U.formData(w.querySelector('#kForm'));
      if ([f.v, f.verde, f.vermelho].some((x) => x == null || isNaN(x))) { U.toast('Preencha a leitura e os dois limites', 'alert'); return false; }
      k.hist[11] = f.v; k.dir = f.dir; k.verde = f.verde; k.vermelho = f.vermelho;
      App.refresh(); U.toast('Leitura salva: ' + M.STATUS_LONG[M.kriStatus(k)]);
    } }],
  });
};

/* ---------------- Fornecedores ---------------- */
App.PESO_NOMES = { financeiro: 'Saúde financeira (Z-score)', dependencia: 'Dependência e fonte única', desempenho: 'Entregas no prazo (OTIF)', geografico: 'Risco do país e da região', leadtime: 'Variação do prazo de entrega', ciber: 'Exposição a ataques digitais' };
App.PESO_CORES = { financeiro: 'var(--s1)', dependencia: 'var(--s2)', desempenho: 'var(--s3)', geografico: 'var(--s4)', leadtime: 'var(--s5)', ciber: 'var(--s6)' };
App.GRADE_TXT = { A: 'Risco baixo', B: 'Risco moderado', C: 'Risco alto', D: 'Risco crítico' };
App.supView = (el) => {
  const w = S.state.pesos;
  const tw = Object.values(w).reduce((a, b) => a + b, 0) || 1;
  const list = S.state.suppliers.map((s) => ({ s, parts: M.supplierParts(s), sc: M.supplierScore(s) })).sort((a, b) => b.sc - a.sc);
  const hhi = M.hhi().sort((a, b) => b.hhi - a.hhi);
  const cd = list.filter((x) => ['C', 'D'].includes(M.supplierRating(x.sc))).length;
  const cur = S.state.suppliers.filter((s) => s.no).length;

  el.innerHTML = `
  <section class="stats stats-4" aria-label="Resumo dos fornecedores">
    ${V.stat({ label: 'Fornecedores avaliados', icon: 'package', value: list.length, foot: `<span class="stat-cap">${cur} atuais · ${list.length - cur} alternativos</span>` })}
    ${V.stat({ label: 'Classe C ou D', icon: 'alert', value: cd, foot: cd ? '<span class="pill st-serious"><i aria-hidden="true"></i>risco alto ou crítico</span>' : '<span class="stat-cap">nenhum com risco alto</span>' })}
    ${V.stat({ label: 'Fonte única', icon: 'link', value: S.state.suppliers.filter((s) => s.fonteUnica).length, foot: '<span class="stat-cap">compras sem alternativa qualificada</span>' })}
    ${V.stat({ label: 'Compras concentradas', icon: 'layers', value: `${hhi.filter((h) => h.hhi > 6000).length}<small>/${hhi.length}</small>`, foot: '<span class="stat-cap">com índice HHI acima de 6.000</span>' })}
  </section>
  <section class="card" id="cardSup">
    ${V.sec({ title: 'Avaliação de risco dos fornecedores', desc: 'Nota de 0 (risco mínimo) a 100 (máximo). A barra mostra quanto cada critério pesou na nota. Clique numa linha para ver os detalhes.', help: 'sup' })}
    <div class="legend-row legend-top">${Object.keys(App.PESO_NOMES).map((k) => `<span class="lg-i"><i style="--c:${App.PESO_CORES[k]}"></i>${App.PESO_NOMES[k].split(' (')[0]}</span>`).join('')}</div>
    <div class="table-wrap flush"><table class="table table-hover" id="supTable"><thead><tr><th>Fornecedor</th><th>Compra</th><th class="num">Participação</th><th class="num">Z-score</th><th class="num">No prazo</th><th>Composição da nota</th><th class="num">Nota</th><th>Classe</th></tr></thead><tbody>
      ${list.map(({ s, parts, sc }) => { const rt = M.supplierRating(sc); return `<tr data-sup="${s.id}" tabindex="0">
        <td class="wide"><b>${U.esc(s.nome)}</b><small>${U.esc(s.pais)}${s.fonteUnica ? ' · fonte única' : ''}${s.no ? '' : ' · alternativo'}</small></td>
        <td>${U.esc(s.compra)}</td><td class="num">${U.pct(s.share)}</td>
        <td class="num ${s.z < 1.81 ? 'neg' : s.z < 2.99 ? 'warn' : ''}" data-tip="Z-score de Altman: abaixo de 1,81 há risco de quebra; de 1,81 a 2,99, zona de atenção">${U.num(s.z, 2)}</td><td class="num">${s.otif}%</td>
        <td><div class="stack" data-tip="${U.esc(Object.keys(parts).map((k) => App.PESO_NOMES[k] + ': ' + U.num(parts[k]) + ' pontos × peso ' + w[k]).join('\n'))}">${Object.keys(parts).map((k) => `<span style="width:${(parts[k] * w[k]) / tw}%;background:${App.PESO_CORES[k]}"></span>`).join('')}</div></td>
        <td class="num"><b>${U.num(sc)}</b></td><td><span class="grade-cell"><span class="grade g-${rt}">${rt}</span><small>${App.GRADE_TXT[rt]}</small></span></td></tr>`; }).join('')}
    </tbody></table></div>
    <div class="tbl-foot"><span>Classes: A até 35 · B de 35 a 50 · C de 50 a 65 · D acima de 65</span><span>Z-score de Altman: abaixo de 1,81, risco de quebra; de 1,81 a 2,99, atenção</span></div>
  </section>
  <div class="grid-2">
    <section class="card" id="cardWeights">
      ${V.sec({ title: 'Pesos dos critérios', desc: 'Arraste para mudar a importância de cada critério. Notas e classes são recalculadas na hora.', tools: `<button class="btn btn-small btn-quiet" type="button" id="wReset">${I('refresh')} Restaurar pesos</button>`, help: 'weights' })}
      <form id="wForm" class="weights">${Object.keys(App.PESO_NOMES).map((k) => `<label><span class="w-name"><i style="--c:${App.PESO_CORES[k]}"></i>${App.PESO_NOMES[k]}</span><input type="range" name="${k}" min="0" max="50" step="5" value="${w[k]}" style="--p:${(w[k] / 50) * 100}%" aria-label="Peso de ${App.PESO_NOMES[k]}"><b>${U.num((w[k] / tw) * 100)}%</b></label>`).join('')}</form>
    </section>
    <section class="card" id="cardHhi">
      ${V.sec({ title: 'Concentração de compras', desc: 'Quanto mais perto de 10.000 pontos, mais a compra depende de um só fornecedor. Diversificar reduz o risco.', help: 'hhi' })}
      <div class="hhi-list">${hhi.map((h) => { const c = M.hhiClass(h.hhi); return `<div class="hhi"><div class="hhi-top"><b>${U.esc(h.compra)}</b>${V.statusPill(c.id, c.nome)}</div>
        ${C.hbars([{ label: h.list.map((s) => s.nome.split(' (')[0] + ' ' + U.pct(s.share)).join(' · '), value: h.hhi, color: V.lvColor(c.id) }], { max: 10000, fmt: (v) => U.num(v) + ' pts' })}</div>`; }).join('')}</div>
      <p class="note">Política de compras: até 3.400 pontos é diversificado; até 6.000, concentração moderada; acima disso, alta. Fonte única = 10.000.</p>
    </section>
  </div>`;

  U.$$('[data-sup]', el).forEach((r) => r.addEventListener('click', () => App.supplierDetail(r.dataset.sup)));
  U.$('#wForm', el).addEventListener('input', (e) => {
    S.state.pesos[e.target.name] = Number(e.target.value);
    e.target.style.setProperty('--p', (Number(e.target.value) / 50) * 100 + '%');
    clearTimeout(App._wt); App._wt = setTimeout(App.refresh, 120);
  });
  U.$('#wReset', el).addEventListener('click', () => { S.state.pesos = DATA.seed().pesos; App.refresh(); U.toast('Pesos originais restaurados'); });
};

App.SUP_BANDS = [
  { to: 35, color: 'var(--st-ok)', name: 'Classe A · risco baixo', range: '0–35' },
  { to: 50, color: 'var(--st-warn)', name: 'Classe B · moderado', range: '35–50' },
  { to: 65, color: 'var(--st-serious)', name: 'Classe C · alto', range: '50–65' },
  { to: 100, color: 'var(--st-crit)', name: 'Classe D · crítico', range: '65–100' },
];
App.supplierDetail = (id) => {
  const s = S.state.suppliers.find((x) => x.id === id);
  if (!s) return;
  const parts = M.supplierParts(s), sc = M.supplierScore(s), g = M.supplierRating(sc);
  const node = s.no && S.node(s.no);
  const rs = node ? M.nodeRisks(node.id) : [];
  const peers = S.state.suppliers.filter((x) => x.compra === s.compra && x.id !== s.id);
  U.modal({
    title: s.nome, drawer: true, kicker: `Fornecedor · ${s.compra}`,
    sub: `<span class="grade g-${g}">${g}</span><span class="pill ${{ A: 'st-ok', B: 'st-warn', C: 'st-serious', D: 'st-crit' }[g]}"><i aria-hidden="true"></i>${App.GRADE_TXT[g]}</span>${s.fonteUnica ? '<span class="pill st-serious"><i aria-hidden="true"></i>Fonte única</span>' : ''}<span class="muted small">${U.esc(s.pais)} · ${U.esc(s.cert)}</span>`,
    body: `<div class="rd-sec rd-first"><h4>Nota de risco</h4>
        <div class="rd-score"><div class="rd-big"><b>${U.num(sc)}</b><small>de 100 (quanto maior, pior)</small></div><div>${C.scale(sc, App.SUP_BANDS, { min: 0, max: 100, label: 'Nota de risco do fornecedor' })}${C.scaleLegend(App.SUP_BANDS, sc)}</div></div></div>
      <div class="rd-sec"><h4>O que compõe a nota</h4><p class="muted small">Pontos de 0 a 100 em cada critério, antes dos pesos.</p>
        ${C.hbars(Object.keys(parts).map((k) => ({ label: App.PESO_NOMES[k], value: parts[k], color: App.PESO_CORES[k] })), { max: 100, fmt: (v) => U.num(v) })}</div>
      <div class="rd-sec"><h4>Dados de compra e desempenho</h4>
        <div class="rd-meta">
          <div><small>Compra anual</small><b>${s.gasto ? U.money(s.gasto) : '—'}</b></div>
          <div><small>Participação</small><b>${U.pct(s.share)} da compra</b></div>
          <div><small>Saúde financeira</small><b>Z-score ${U.num(s.z, 2)} ${s.z < 1.81 ? '(risco de quebra)' : s.z < 2.99 ? '(atenção)' : '(saudável)'}</b></div>
          <div><small>Entregas no prazo</small><b>${s.otif}% (OTIF)</b></div>
          <div><small>Prazo de entrega</small><b>${s.lead} dias</b></div>
          <div><small>Variação do prazo</small><b>${U.pct(s.cvLead)}</b></div>
        </div></div>
      <div class="rd-sec"><h4>Outras fontes da mesma compra</h4>
        ${peers.length ? `<div class="table-wrap"><table class="table table-compact"><thead><tr><th>Fornecedor</th><th class="num">Participação</th><th class="num">Nota</th></tr></thead><tbody>${peers.map((p) => `<tr><td>${U.esc(p.nome)}</td><td class="num">${U.pct(p.share)}</td><td class="num">${U.num(M.supplierScore(p))}</td></tr>`).join('')}</tbody></table></div>` : '<div class="callout warn"><b>Nenhuma outra fonte cadastrada</b><p>Se este fornecedor parar, não há alternativa pronta para esta compra.</p></div>'}</div>
      ${rs.length ? `<div class="rd-sec"><h4>Riscos ligados a este elo</h4><div class="chips">${rs.map((r) => `<button class="chip" type="button" data-open-risk="${r.id}" data-tip="${U.esc(r.titulo)}">${r.id}</button>`).join('')}</div></div>` : ''}`,
    actions: node ? [{ label: 'Ver no mapa', onClick: () => App.go('painel', () => { App.netSel = node.id; }) }, { label: 'Fechar', cls: 'btn-primary' }] : [{ label: 'Fechar', cls: 'btn-primary' }],
  });
};

/* ==========================================================================
   SIMULAÇÕES — perda no ano (Monte Carlo) e parada de um elo
   ========================================================================== */
App.simTab = 'mc';
App.views.simular = (el) => {
  V.pageTabs(V.tabs('sim', [['mc', 'Perda no ano', 'banknote'], ['dis', 'Parada de um elo', 'zap']], App.simTab, 'Simulação'));
  U.$$('#phTabs [data-sim]').forEach((b) => b.addEventListener('click', () => { if (App.simTab !== b.dataset.sim) { App.simTab = b.dataset.sim; App.render(); } }));
  (App.simTab === 'dis' ? App.disView : App.mcView)(el);
};

App.mc = { n: 10000, seed: 2026, res: null, hist: 'inerente' };
const SERIES = { inerente: 'var(--s2)', atual: 'var(--s1)', planejado: 'var(--s3)' };

App.mcView = (el) => {
  const st = App.mc, emp = S.state.empresa;
  el.innerHTML = `
  <section class="card" id="cardMcParams">
    ${V.sec({ title: 'Parâmetros da simulação', desc: 'Em cada ano sorteado, cada risco pode acontecer nenhuma, uma ou várias vezes, com um custo diferente a cada vez. Assim aparece não só a perda média, mas a chance de um ano ruim.', help: 'mc' })}
    <form id="mcForm" class="tbl-toolbar sim-form">
      <label class="inline">Anos simulados<select name="n">${[2000, 5000, 10000, 20000].map((v) => `<option value="${v}" ${st.n === v ? 'selected' : ''}>${U.num(v)}</option>`).join('')}</select></label>
      <label class="inline" data-tip="O mesmo número repete exatamente o mesmo sorteio. Troque para ver outra amostra.">Semente<input type="number" name="seed" value="${st.seed}" min="1" style="width:7em"></label>
      <label class="inline" data-tip="Apetite a risco: a perda anual que a diretoria aceita correr">Limite aceitável (R$ mi/ano)<input type="number" name="ap" value="${emp.apetite / 1000}" min="0" step="0.5" style="width:6em"></label>
      <span class="toolbar-actions"><span class="muted small" id="mcInfo"></span><button class="btn btn-primary" type="submit">${I('refresh')} Rodar simulação</button></span>
    </form>
  </section>
  <div id="mcOut" class="stack-col"></div>`;
  const run = () => {
    const f = U.formData(U.$('#mcForm', el));
    st.n = f.n; st.seed = f.seed || 1; emp.apetite = Math.max(0, (f.ap || 0) * 1000); S.save();
    const t0 = performance.now();
    st.res = Object.keys(M.MODES).map((m) => M.monteCarlo({ n: st.n, seed: st.seed, mode: m }));
    U.$('#mcInfo', el).textContent = `${U.num(st.n * 3)} anos simulados (3 cenários) em ${U.num(performance.now() - t0)} ms`;
    App.mcDraw(U.$('#mcOut', el));
    App.head();
  };
  U.$('#mcForm', el).addEventListener('submit', (e) => { e.preventDefault(); run(); U.toast('Simulação concluída'); });
  run();
};

App.mcDraw = (out) => {
  const st = App.mc, res = st.res, emp = S.state.empresa;
  const [Ii, A, P] = res;
  const custo = S.state.actions.reduce((s, a) => s + a.custo, 0);
  const dPea = Ii.stats.mean - P.stats.mean;
  const roi = custo ? (dPea - custo) / custo : 0;
  const xMax = Math.max(Ii.stats.var95 * 1.6, emp.apetite * 1.6);
  const pts = (r) => { const n = r.sorted.length, a = []; for (let k = 0; k <= 200; k++) { const q = k / 200; const x = r.sorted[Math.min(n - 1, Math.floor(q * (n - 1)))]; a.push([x / 1000, (1 - q) * 100]); } return a; };
  const rows = [['Perda média por ano', 'mean'], ['Ano típico (metade dos anos fica abaixo)', 'p50'], ['1 ano ruim em 10', 'p90'], ['1 ano ruim em 20 (VaR 95%)', 'var95'], ['1 ano ruim em 100 (VaR 99%)', 'var99'], ['Média dos 5% piores anos (CVaR 95%)', 'cvar95'], ['Pior ano sorteado', 'max']];
  const hr = res.find((r) => r.mode === st.hist);
  const hmax = Ii.stats.var99;
  const bw = [250, 500, 1000, 2000, 2500, 5000, 10000, 20000].find((s) => s >= hmax / 32) || 50000;
  const bins = Math.ceil(hmax / bw);
  const counts = new Array(bins).fill(0);
  hr.sorted.forEach((x) => { counts[Math.min(bins - 1, Math.floor(x / bw))]++; });
  const top = hr.contrib.slice().sort((a, b) => b.v - a.v).slice(0, 10);
  const scen = (r) => `<button class="stat stat-sel scen-tile" type="button" data-hist="${r.mode}" aria-pressed="${st.hist === r.mode}" style="--c:${SERIES[r.mode]}">
    <span class="stat-top"><span class="stat-label"><i class="sw-dot" aria-hidden="true"></i>${M.MODES[r.mode]}</span>${st.hist === r.mode ? '<span class="pill st-info">Detalhado abaixo</span>' : ''}</span>
    <span class="stat-value">${U.money(r.stats.mean)}</span><span class="stat-foot"><span class="stat-cap">perda média por ano</span></span>
    <span class="scen-rows"><span>1 ano ruim em 20<b>${U.money(r.stats.var95)}</b></span><span>Chance de passar do limite<b>${U.pct(r.stats.pApetite, 1)}</b></span></span></button>`;

  out.innerHTML = `
  <section class="stats stats-4" id="mcScen" aria-label="Resultado por cenário">
    ${res.map(scen).join('')}
    <div class="stat scen-tile" style="--c:var(--st-ok)"><span class="stat-top"><span class="stat-label"><i class="sw-dot" aria-hidden="true"></i>Retorno do plano</span></span>
      <span class="stat-value">${U.pct(roi)}</span><span class="stat-foot"><span class="stat-cap">sobre o custo do plano</span></span>
      <span class="scen-rows"><span>Evita por ano<b>${U.money(dPea)}</b></span><span>Custa por ano<b>${U.money(custo)}</b></span></span></div>
  </section>
  <p class="muted small hint-line">${I('info')} Clique num cenário para ver a distribuição e os maiores responsáveis pela perda nele.</p>
  <div class="grid-2">
    <section class="card" id="cardCurve">
      ${V.sec({ title: 'Chance de a perda do ano passar de cada valor', desc: 'Escolha um valor no eixo de baixo: a altura de cada linha é a chance de o ano custar mais que isso. A linha tracejada é o limite aceitável.', help: 'curve' })}
      <div class="legend-row legend-top">${Object.keys(M.MODES).map((m) => `<span class="lg-i"><i style="--c:${SERIES[m]}"></i>${M.MODES[m]}</span>`).join('')}<span class="lg-i"><i class="ref" aria-hidden="true"></i>Limite aceitável</span></div>
      ${C.xy({
        label: 'Chance de a perda anual passar de cada valor', w: 600, h: 320, xMin: 0, xMax: xMax / 1000, yMin: 0, yMax: 100,
        xTicks: C.niceTicks(0, xMax / 1000, 5), xFmt: (v) => 'R$ ' + U.num(v) + ' mi', yFmt: (v) => v + '%', xLabel: 'Perda no ano', yLabel: 'Chance de passar',
        series: res.map((r) => ({ name: M.MODES[r.mode], color: SERIES[r.mode], pts: pts(r), width: r.mode === st.hist ? 3 : 1.75 })),
        vlines: [{ x: emp.apetite / 1000 }],
        hover: { xs: Array.from({ length: 41 }, (_, k) => (xMax / 1000) * k / 40), tip: (k) => { const x = (xMax * k) / 40; return `Chance de perder mais de ${U.money(x)} no ano\n` + res.map((r) => `${M.MODES[r.mode]}: ${U.pct(r.sorted.filter((v) => v > x).length / r.n, 1)}`).join('\n'); } },
      })}
      <p class="note">No limite de ${U.money(emp.apetite)}, a chance de um ano pior cai de <b>${U.pct(Ii.stats.pApetite, 1)}</b> sem ações para <b>${U.pct(A.stats.pApetite, 1)}</b> hoje e <b>${U.pct(P.stats.pApetite, 1)}</b> com o plano completo.</p>
    </section>
    <section class="card" id="cardHist">
      ${V.sec({ title: 'Quantos anos caem em cada faixa de perda', desc: `Cenário “${M.MODES[st.hist]}”. Cada barra é uma faixa de perda; a altura é quantos anos simulados caíram nela.`, help: 'hist' })}
      ${C.columns({
        label: 'Distribuição da perda anual', w: 600, h: 280, values: counts, color: SERIES[st.hist], xLabel: 'Perda no ano (R$ mi)',
        labels: counts.map((_, i) => U.num((i * bw) / 1000, bw < 1000 ? 1 : 0)), labelEvery: Math.max(1, Math.round(bins / 6)),
        tips: counts.map((c, i) => `${i === bins - 1 ? 'Acima de ' + U.money(i * bw) : U.money(i * bw) + ' a ' + U.money((i + 1) * bw)}\n${U.plural(c, 'ano', 'anos')} (${U.pct(c / hr.n, 1)})`),
        yFmt: (v) => U.num(v), vlines: [{ i: Math.min(bins, hr.stats.var95 / bw), label: '1 em 20' }],
      })}
      <p class="note">A marca “1 em 20” é o VaR 95%: a perda que só é superada em 1 a cada 20 anos.</p>
    </section>
  </div>
  <div class="grid-2">
    <section class="card" id="cardContrib">
      ${V.sec({ title: 'Riscos que mais somam à perda', desc: `Média por ano no cenário “${M.MODES[st.hist]}”. Clique no código para abrir os detalhes.`, help: 'contrib' })}
      ${C.hbars(top.map((x) => ({ labelHtml: `<button class="link" type="button" data-open-risk="${x.r.id}">${x.r.id}</button> ${U.esc(x.r.titulo)}`, value: x.v, color: SERIES[st.hist], tip: `${x.r.id}: ${U.money(x.v)} por ano (${U.pct(x.v / hr.stats.mean, 1)} do total)` })), { fmt: (v) => U.money(v) })}
    </section>
    <section class="card" id="cardStats">
      ${V.sec({ title: 'Resumo da simulação', desc: 'Cada linha responde a uma pergunta sobre o custo de um ano.', help: 'stats' })}
      <div class="table-wrap flush"><table class="table"><thead><tr><th>Pergunta</th>${res.map((r) => `<th class="num">${M.MODES[r.mode]}</th>`).join('')}</tr></thead><tbody>
        ${rows.map(([l, k]) => `<tr><td>${l}</td>${res.map((r) => `<td class="num">${U.money(r.stats[k])}</td>`).join('')}</tr>`).join('')}
        <tr><td>Chance de passar do limite aceitável</td>${res.map((r) => `<td class="num">${U.pct(r.stats.pApetite, 1)}</td>`).join('')}</tr>
      </tbody></table></div>
    </section>
  </div>`;
  U.$$('[data-hist]', out).forEach((b) => b.addEventListener('click', () => { st.hist = b.dataset.hist; App.mcDraw(out); }));
};

/* ---------------- Simulador de parada de um elo ---------------- */
App.PRESETS = [
  { id: 'chip', ic: 'flame', nome: 'Incêndio no fornecedor de placas', curto: 'caso Philips, 2000', no: 'n_chip', duracao: 90, cobertura: 19, rampaOrig: 21, backorder: 30, premioAlt: 4,
    A: { deteccao: 2, qualificacao: 14, capAlt: 75, rampaAlt: 14 }, B: { deteccao: 21, qualificacao: 42, capAlt: 40, rampaAlt: 21 } },
  { id: 'porto', ic: 'ship', nome: 'Greve no Porto de Suape', curto: '15 dias', no: 'n_porto', duracao: 15, cobertura: 10, rampaOrig: 7, backorder: 50, premioAlt: 3,
    A: { deteccao: 1, qualificacao: 3, capAlt: 80, rampaAlt: 3 }, B: { deteccao: 4, qualificacao: 10, capAlt: 50, rampaAlt: 7 } },
  { id: 'erp', ic: 'server', nome: 'Ataque ao sistema de pedidos', curto: 'ERP fora do ar por 12 dias', no: 'n_erp', duracao: 12, cobertura: 2, rampaOrig: 4, backorder: 40, premioAlt: 2,
    A: { deteccao: 0, qualificacao: 1, capAlt: 60, rampaAlt: 2 }, B: { deteccao: 1, qualificacao: 6, capAlt: 30, rampaAlt: 4 } },
  { id: 'chuva', ic: 'rain', nome: 'Chuvas bloqueiam a BR-101', curto: 'uma semana', no: 'n_br101', duracao: 7, cobertura: 4, rampaOrig: 2, backorder: 60, premioAlt: 5,
    A: { deteccao: 0, qualificacao: 1, capAlt: 60, rampaAlt: 2 }, B: { deteccao: 2, qualificacao: 4, capAlt: 40, rampaAlt: 3 } },
  { id: 'motor', ic: 'banknote', nome: 'Falência da MotorSul', curto: 'fonte única de motores', no: 'n_motor', duracao: 120, cobertura: 21, rampaOrig: 30, backorder: 25, premioAlt: 3,
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
  ['2', 'Evento', 'a parada acontece no elo'],
  ['3', 'Primeira resposta', 'a empresa percebe e mobiliza a equipe'],
  ['4', 'Impacto inicial', 'o estoque acaba e a produção cai'],
  ['5', 'Impacto total', 'ponto mais baixo da produção'],
  ['6', 'Preparação para recuperar', 'o alternativo começa a entregar'],
  ['7', 'Recuperação', 'a produção volta a 100%'],
  ['8', 'Efeito duradouro', 'clientes perdidos e reputação'],
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
  const inp = (sc, k, label, hint, max, step = 1) => `<label>${label}${hint ? `<small>${hint}</small>` : ''}<input type="number" data-sc="${sc}" data-k="${k}" min="0" max="${max}" step="${step}" value="${sc ? d[sc][k] : d[k]}"></label>`;
  const days = (v) => (v == null || v < 0 ? 'não volta no período' : v + ' dias');
  const scCard = (k, name, sub, c) => `<section class="card sc-${k.toLowerCase()}">
      ${V.sec({ title: `<span class="sw-dot" style="--c:${c}" aria-hidden="true"></span>${name}`, desc: sub })}
      <div class="form">${inp(k, 'deteccao', 'Dias até perceber', '', 90)}${inp(k, 'qualificacao', 'Dias para aprovar o alternativo', '', 180)}${inp(k, 'capAlt', 'Capacidade do alternativo (%)', '', 100, 5)}${inp(k, 'rampaAlt', 'Dias até o alternativo pegar ritmo', '', 90)}</div></section>`;

  el.innerHTML = `
  <section class="card" id="cardDisSetup">
    ${V.sec({ title: 'Cenário de interrupção', desc: 'Escolha um caso pronto ou monte o seu. Cada caso já vem com números realistas; depois ajuste o elo e os valores para testar outras hipóteses.', help: 'dis' })}
    <div class="preset-row">${App.PRESETS.map((p) => `<button class="pick preset ${p.id === d.id ? 'on' : ''}" type="button" data-preset="${p.id}" aria-pressed="${p.id === d.id}"><span class="preset-ic">${I(p.ic)}</span><b>${U.esc(p.nome)}</b><small>${U.esc(p.curto)}</small></button>`).join('')}</div>
    <div class="tbl-toolbar dis-node">
      <label class="inline">Elo que para<select id="dNode">${U.opts(S.state.nodes.filter((n) => n.ttr != null), d.no)}</select></label>
      <span class="muted small">Receita que depende dele: ${U.money(node.receita)} por semana · margem de contribuição ${U.pct(S.state.empresa.margem)}</span>
    </div>
    <form class="form form-5">
      ${inp('', 'duracao', 'Dias com o elo parado', 'duração da parada', 365)}
      ${inp('', 'cobertura', 'Dias de estoque', 'estoque de segurança', 120)}
      ${inp('', 'rampaOrig', 'Dias para retomar o ritmo', 'depois que o elo volta', 90)}
      ${inp('', 'backorder', 'Vendas recuperadas (%)', 'clientes que esperam', 100, 5)}
      ${inp('', 'premioAlt', 'Custo extra do alternativo (%)', 'sobre a receita', 100)}
    </form>
  </section>
  <div class="grid-2 grid-wide-left">
    <section class="card" id="cardDisChart">
      ${V.sec({ title: 'Produção ao longo do tempo', desc: '100% = produção normal. A faixa vermelha é o período com o elo parado. Os números marcam as fases da interrupção.', tools: V.seg('show', [['A', 'Fases: ágil'], ['B', 'Fases: tardia']], d.show, 'Fases marcadas no gráfico'), help: 'disChart' })}
      <div class="legend-row legend-top"><span class="lg-i"><i style="--c:var(--s1)"></i>Resposta ágil</span><span class="lg-i"><i style="--c:var(--s6)"></i>Resposta tardia</span><span class="lg-i"><i class="band" aria-hidden="true"></i>Elo parado</span></div>
      ${C.xy({
        label: 'Produção ao longo do tempo', w: 760, h: 320, xMin: 0, xMax: H, yMin: 0, yMax: 110, yTicks: [0, 25, 50, 75, 100],
        xFmt: (v) => 'dia ' + v, yFmt: (v) => v + '%', yLabel: 'Produção (% do normal)', pad: { t: 52 },
        bands: [{ x0: base.inicio, x1: base.inicio + d.duracao, cls: 'band' }],
        series: [{ color: 'var(--s1)', pts: rA.perf.map((v, t) => [t, v]), width: 2.25 }, { color: 'var(--s6)', pts: rB.perf.map((v, t) => [t, v]), width: 2.25 }],
        vlines: vl,
        hover: { xs: Array.from({ length: H + 1 }, (_, t) => t), tip: (t) => `Dia ${t}\nResposta ágil: ${U.num(rA.perf[t] ?? 100)}% da produção\nResposta tardia: ${U.num(rB.perf[t] ?? 100)}% da produção` },
      })}
      <ol class="phases">${App.PHASES.map(([n, nome, desc]) => `<li><span class="mark-chip">${n}</span><span><b>${nome}</b> <span class="muted">${desc}</span></span></li>`).join('')}</ol>
    </section>
    <div class="stack-col">
      <section class="card" id="cardDisResult">
        ${V.sec({ title: 'Resultado comparado', desc: 'Margem perdida com vendas que não voltam, mais o custo extra do fornecedor alternativo.', help: 'disResult' })}
        <div class="table-wrap flush"><table class="table"><thead><tr><th>Medida</th><th class="num">Ágil</th><th class="num">Tardia</th></tr></thead><tbody>
          <tr><td>Menor nível de produção</td><td class="num">${U.num(rA.vMin)}%</td><td class="num">${U.num(rB.vMin)}%</td></tr>
          <tr><td>Dias abaixo do normal</td><td class="num">${rA.diasFalta}</td><td class="num">${rB.diasFalta}</td></tr>
          <tr><td>Até voltar a 100%</td><td class="num">${rA.diasFalta ? days(rA.recuperacao) : 'sem queda'}</td><td class="num">${rB.diasFalta ? days(rB.recuperacao) : 'sem queda'}</td></tr>
          <tr><td>Margem perdida</td><td class="num">${U.money(rA.margemPerdida)}</td><td class="num">${U.money(rB.margemPerdida)}</td></tr>
          <tr><td>Custo extra do alternativo</td><td class="num">${U.money(rA.custoExtra)}</td><td class="num">${U.money(rB.custoExtra)}</td></tr>
          <tr class="total"><td>Impacto total</td><td class="num">${U.money(rA.total)}</td><td class="num">${U.money(rB.total)}</td></tr>
        </tbody></table></div>
        <div class="callout win"><b>Reagir cedo vale ${U.money(rB.total - rA.total)}</b><p>É quanto a resposta ágil evita em relação à tardia. Compare com o custo anual de monitorar a rede, manter estoques e qualificar fornecedores alternativos.</p></div>
      </section>
      ${scCard('A', 'Resposta ágil', 'A empresa percebe e age rápido.', 'var(--s1)')}
      ${scCard('B', 'Resposta tardia', 'A empresa demora a reagir.', 'var(--s6)')}
    </div>
  </div>
  <section class="callout story"><b>O caso que inspirou este simulador</b><p>Em março de 2000, um pequeno incêndio atingiu a fábrica de chips da Philips em Albuquerque (EUA), fornecedora da Nokia e da Ericsson. A Nokia percebeu o atraso em poucos dias e garantiu capacidade alternativa. A Ericsson reagiu semanas depois, ficou sem componentes e perdeu centenas de milhões de dólares.</p></section>`;

  U.$$('[data-preset]', el).forEach((b) => b.addEventListener('click', () => { App.dis = JSON.parse(JSON.stringify({ ...App.PRESETS.find((p) => p.id === b.dataset.preset), show: d.show })); App.render(); }));
  U.$('#dNode', el).addEventListener('change', (e) => { d.no = e.target.value; d.id = 'custom'; App.render(); });
  U.$$('input[data-k]', el).forEach((i) => i.addEventListener('change', () => {
    const v = Math.max(0, Number(i.value) || 0);
    if (i.dataset.sc) d[i.dataset.sc][i.dataset.k] = v; else d[i.dataset.k] = v;
    App.render();
  }));
  U.$$('[data-show]', el).forEach((b) => b.addEventListener('click', () => { d.show = b.dataset.show; App.render(); }));
};
