/* ==========================================================================
   views-quantificar.js — Monte Carlo da perda anual e Simulador de interrupção
   ========================================================================== */
App.mc = { n: 10000, seed: 2026, res: null, hist: 'inerente' };
const SERIES = { inerente: 'var(--s2)', atual: 'var(--s1)', planejado: 'var(--s3)' };

App.views.montecarlo = (el) => {
  const st = App.mc, emp = S.state.empresa;
  el.innerHTML = `
  <section class="card">
    <form id="mcForm" class="toolbar">
      <label class="inline">Simulações<select name="n" id="mcN">${[2000, 5000, 10000, 20000].map((v) => `<option value="${v}" ${st.n === v ? 'selected' : ''}>${U.num(v)} anos</option>`).join('')}</select></label>
      <label class="inline">Semente<input type="number" name="seed" id="mcSeed" value="${st.seed}" min="1" style="width:7em"></label>
      <label class="inline">Apetite a risco (R$ mi/ano)<input type="number" name="ap" id="mcAp" value="${emp.apetite / 1000}" min="0" step="0.5" style="width:6em"></label>
      <button class="btn btn-primary" type="submit">Rodar simulação</button>
      <span class="muted small" id="mcInfo"></span>
    </form>
    <p class="muted small">Cada iteração simula um ano: o número de ocorrências de cada risco segue uma distribuição de Poisson e a perda de cada ocorrência segue uma distribuição triangular (mínima, mais provável, máxima). Seguros e hedges são aplicados evento a evento. Os três cenários usam a mesma sequência de números aleatórios para que a comparação seja justa.</p>
  </section>
  <div id="mcOut"></div>`;
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
  const custoAtual = S.state.actions.filter((a) => a.status !== 'Planejada').reduce((s, a) => s + a.custo, 0);
  const dPea = I.stats.mean - P.stats.mean;
  const roi = custo ? (dPea - custo) / custo : 0;
  const xMax = Math.max(I.stats.var95 * 1.6, emp.apetite * 1.6);
  const pts = (r) => { const n = r.sorted.length, a = []; for (let k = 0; k <= 200; k++) { const q = k / 200; const x = r.sorted[Math.min(n - 1, Math.floor(q * (n - 1)))]; a.push([x / 1000, (1 - q) * 100]); } return a; };
  const rows = [
    ['Perda esperada (média)', 'mean'], ['Mediana (P50)', 'p50'], ['P90', 'p90'], ['VaR 95%', 'var95'],
    ['VaR 99%', 'var99'], ['CVaR 95%', 'cvar95'], ['Pior ano simulado', 'max'],
  ];
  // histograma do cenário escolhido
  const hr = res.find((r) => r.mode === st.hist);
  const hmax = I.stats.var99;
  const bw = [250, 500, 1000, 2000, 2500, 5000, 10000, 20000].find((s) => s >= hmax / 32) || 50000;
  const bins = Math.ceil(hmax / bw);
  const counts = new Array(bins).fill(0);
  hr.sorted.forEach((x) => { counts[Math.min(bins - 1, Math.floor(x / bw))]++; });
  const top = hr.contrib.slice().sort((a, b) => b.v - a.v).slice(0, 10);

  out.innerHTML = `
  <section class="kpis kpis-4">
    ${V.kpi('Perda esperada — inerente', U.money(I.stats.mean), `VaR 95%: ${U.money(I.stats.var95)}`)}
    ${V.kpi('Perda esperada — residual atual', U.money(A.stats.mean), `VaR 95%: ${U.money(A.stats.var95)}`)}
    ${V.kpi('Perda esperada — residual planejado', U.money(P.stats.mean), `VaR 95%: ${U.money(P.stats.var95)}`)}
    ${V.kpi('Retorno do plano de ações', U.pct(roi), `reduz ${U.money(dPea)}/ano por ${U.money(custo)}/ano`)}
  </section>
  <section class="grid-2">
    <div class="card">
      <div class="card-head"><h3>Curva de excedência de perdas</h3><span class="muted">chance de a perda do ano passar de cada valor</span></div>
      <div class="legend">${Object.keys(M.MODES).map((m) => `<span class="sw" style="background:${SERIES[m]}"></span>${M.MODES[m]}`).join(' ')}<span class="sw sw-ref"></span>Apetite a risco</div>
      ${C.xy({
        label: 'Curva de excedência', w: 600, h: 330, xMin: 0, xMax: xMax / 1000, yMin: 0, yMax: 100,
        xTicks: C.niceTicks(0, xMax / 1000, 5), xFmt: (v) => 'R$ ' + U.num(v) + ' mi', yFmt: (v) => v + '%', xLabel: 'Perda anual', yLabel: 'P(perda > x)',
        series: res.map((r) => ({ name: M.MODES[r.mode], color: SERIES[r.mode], pts: pts(r), width: 2.5 })),
        vlines: [{ x: emp.apetite / 1000 }],
        hover: { xs: Array.from({ length: 41 }, (_, k) => (xMax / 1000) * k / 40), tip: (k) => { const x = (xMax * k) / 40; return `Perda acima de ${U.money(x)}\n` + res.map((r) => `${M.MODES[r.mode]}: ${U.pct(r.sorted.filter((v) => v > x).length / r.n, 1)}`).join('\n'); } },
      })}
      <p class="note">No apetite de ${U.money(emp.apetite)}: a chance de um ano pior que isso cai de <b>${U.pct(I.stats.pApetite, 1)}</b> (inerente) para <b>${U.pct(A.stats.pApetite, 1)}</b> hoje e <b>${U.pct(P.stats.pApetite, 1)}</b> com o plano completo.</p>
    </div>
    <div class="card">
      <div class="card-head"><h3>Estatísticas</h3></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Medida</th>${res.map((r) => `<th class="num">${M.MODES[r.mode].replace('Residual ', 'Res. ')}</th>`).join('')}</tr></thead><tbody>
        ${rows.map(([l, k]) => `<tr><td>${l}</td>${res.map((r) => `<td class="num">${U.money(r.stats[k])}</td>`).join('')}</tr>`).join('')}
        <tr><td>Chance de passar do apetite</td>${res.map((r) => `<td class="num">${U.pct(r.stats.pApetite, 1)}</td>`).join('')}</tr>
        <tr><td>Custo anual das ações consideradas</td><td class="num">—</td><td class="num">${U.money(custoAtual)}</td><td class="num">${U.money(custo)}</td></tr>
      </tbody></table></div>
      <p class="note">VaR 95% é a perda anual superada em só 1 a cada 20 anos; CVaR 95% é a média dos 5% piores anos. A perda esperada orienta o orçamento; VaR e CVaR mostram o ano ruim que a empresa precisa suportar com caixa, seguro ou capital.</p>
    </div>
  </section>
  <section class="grid-2">
    <div class="card">
      <div class="card-head wrap"><h3>Distribuição da perda anual</h3>
        <div class="seg" role="group" aria-label="Cenário do histograma">${Object.keys(M.MODES).map((m) => `<button data-hist="${m}" aria-pressed="${st.hist === m}">${M.MODES[m]}</button>`).join('')}</div></div>
      ${C.columns({
        label: 'Histograma', w: 600, h: 280, values: counts, color: SERIES[st.hist], xLabel: 'Perda anual (R$ mi)',
        labels: counts.map((_, i) => U.num((i * bw) / 1000, bw < 1000 ? 1 : 0)), labelEvery: Math.max(1, Math.round(bins / 6)),
        tips: counts.map((c, i) => `${i === bins - 1 ? 'Acima de ' + U.money(i * bw) : U.money(i * bw) + ' a ' + U.money((i + 1) * bw)}\n${U.num(c)} anos (${U.pct(c / hr.n, 1)})`),
        yFmt: (v) => U.num(v), vlines: [{ i: Math.min(bins, hr.stats.var95 / bw), label: 'VaR 95%' }],
      })}
    </div>
    <div class="card">
      <div class="card-head"><h3>Maiores contribuições para a perda esperada</h3><span class="muted">${M.MODES[st.hist]}</span></div>
      ${C.hbars(top.map((x) => ({ labelHtml: `<button class="link" data-open-risk="${x.r.id}">${x.r.id}</button> ${U.esc(x.r.titulo)}`, value: x.v, color: SERIES[st.hist], tip: `${x.r.id}: ${U.money(x.v)}/ano (${U.pct(x.v / hr.stats.mean, 1)} do total)` })), { fmt: (v) => U.money(v) })}
    </div>
  </section>`;
  U.$$('[data-hist]', out).forEach((b) => b.addEventListener('click', () => { st.hist = b.dataset.hist; App.mcDraw(out); }));
};

/* ---------------- Simulador de interrupção ---------------- */
App.PRESETS = [
  { id: 'chip', nome: 'Incêndio no fornecedor de placas (caso Philips 2000)', no: 'n_chip', duracao: 90, cobertura: 19, rampaOrig: 21, backorder: 30, premioAlt: 4,
    A: { deteccao: 2, qualificacao: 14, capAlt: 75, rampaAlt: 14 }, B: { deteccao: 21, qualificacao: 42, capAlt: 40, rampaAlt: 21 } },
  { id: 'porto', nome: 'Greve no Porto de Suape (15 dias)', no: 'n_porto', duracao: 15, cobertura: 10, rampaOrig: 7, backorder: 50, premioAlt: 3,
    A: { deteccao: 1, qualificacao: 3, capAlt: 80, rampaAlt: 3 }, B: { deteccao: 4, qualificacao: 10, capAlt: 50, rampaAlt: 7 } },
  { id: 'erp', nome: 'Ransomware no ERP / WMS', no: 'n_erp', duracao: 12, cobertura: 2, rampaOrig: 4, backorder: 40, premioAlt: 2,
    A: { deteccao: 0, qualificacao: 1, capAlt: 60, rampaAlt: 2 }, B: { deteccao: 1, qualificacao: 6, capAlt: 30, rampaAlt: 4 } },
  { id: 'chuva', nome: 'Chuvas bloqueiam a BR-101 por uma semana', no: 'n_br101', duracao: 7, cobertura: 4, rampaOrig: 2, backorder: 60, premioAlt: 5,
    A: { deteccao: 0, qualificacao: 1, capAlt: 60, rampaAlt: 2 }, B: { deteccao: 2, qualificacao: 4, capAlt: 40, rampaAlt: 3 } },
  { id: 'motor', nome: 'Falência da MotorSul (fonte única de motores)', no: 'n_motor', duracao: 120, cobertura: 21, rampaOrig: 30, backorder: 25, premioAlt: 3,
    A: { deteccao: 3, qualificacao: 30, capAlt: 85, rampaAlt: 21 }, B: { deteccao: 20, qualificacao: 60, capAlt: 70, rampaAlt: 30 } },
];
App.dis = null;
App.PHASES = [
  ['1', 'Preparação', 'antes do evento: planos, estoques e alternativas definidos'],
  ['2', 'Evento', 'a interrupção acontece no elo'],
  ['3', 'Primeira resposta', 'a empresa detecta e mobiliza a equipe'],
  ['4', 'Impacto inicial', 'o estoque acaba e a produção começa a cair'],
  ['5', 'Impacto total', 'ponto mais baixo do desempenho'],
  ['6', 'Preparação para recuperação', 'fornecedor alternativo começa a entregar'],
  ['7', 'Recuperação', 'desempenho volta a 100%'],
  ['8', 'Impacto de longo prazo', 'clientes perdidos e reputação após a crise'],
];

App.views.interrupcao = (el) => {
  if (!App.dis) App.dis = JSON.parse(JSON.stringify({ ...App.PRESETS[0], show: 'B' }));
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
  <section class="card">
    <div class="toolbar">
      <label class="inline">Cenário pronto<select id="dPreset">${App.PRESETS.map((p) => `<option value="${p.id}" ${p.id === d.id ? 'selected' : ''}>${U.esc(p.nome)}</option>`).join('')}</select></label>
      <label class="inline">Elo interrompido<select id="dNode">${U.opts(S.state.nodes.filter((n) => n.ttr != null), d.no)}</select></label>
      <span class="muted small">Receita dependente: ${U.money(node.receita)}/semana · margem ${U.pct(S.state.empresa.margem)}</span>
    </div>
    <form id="dForm" class="form form-5">
      ${inp('', 'duracao', 'Duração da parada no elo (dias)', 365)}
      ${inp('', 'cobertura', 'Estoque de segurança (dias)', 120)}
      ${inp('', 'rampaOrig', 'Rampa de retomada do elo (dias)', 90)}
      ${inp('', 'backorder', 'Vendas recuperadas depois (%)', 100, 5)}
      ${inp('', 'premioAlt', 'Custo extra do alternativo (% da receita)', 100)}
    </form>
  </section>
  <section class="grid-2">
    <div class="card sc-a"><div class="card-head"><h3><span class="sw" style="background:var(--s1)"></span>Resposta ágil</h3><span class="muted">detecta cedo e aciona alternativas</span></div>
      <div class="form form-4">${inp('A', 'deteccao', 'Detecção (dias)', 90)}${inp('A', 'qualificacao', 'Qualificar alternativo (dias)', 180)}${inp('A', 'capAlt', 'Capacidade alternativa (%)', 100, 5)}${inp('A', 'rampaAlt', 'Rampa do alternativo (dias)', 90)}</div></div>
    <div class="card sc-b"><div class="card-head"><h3><span class="sw" style="background:var(--s2)"></span>Resposta tardia</h3><span class="muted">reage depois que a falta aparece</span></div>
      <div class="form form-4">${inp('B', 'deteccao', 'Detecção (dias)', 90)}${inp('B', 'qualificacao', 'Qualificar alternativo (dias)', 180)}${inp('B', 'capAlt', 'Capacidade alternativa (%)', 100, 5)}${inp('B', 'rampaAlt', 'Rampa do alternativo (dias)', 90)}</div></div>
  </section>
  <section class="grid-2 grid-wide-left">
    <div class="card">
      <div class="card-head wrap"><h3>Perfil de desempenho da produção</h3>
        <div class="seg" role="group" aria-label="Fases marcadas">${['A', 'B'].map((s) => `<button data-show="${s}" aria-pressed="${d.show === s}">Fases da resposta ${s === 'A' ? 'ágil' : 'tardia'}</button>`).join('')}</div></div>
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
    <div class="card">
      <div class="card-head"><h3>Resultado comparado</h3></div>
      <div class="table-wrap"><table class="table"><thead><tr><th></th><th class="num">Ágil</th><th class="num">Tardia</th></tr></thead><tbody>
        <tr><td>Produção mínima</td><td class="num">${U.num(rA.vMin)}%</td><td class="num">${U.num(rB.vMin)}%</td></tr>
        <tr><td>Dias com produção abaixo do normal</td><td class="num">${rA.diasFalta}</td><td class="num">${rB.diasFalta}</td></tr>
        <tr><td>Tempo até recuperar 100%</td><td class="num">${days(rA.recuperacao)}</td><td class="num">${days(rB.recuperacao)}</td></tr>
        <tr><td>Receita perdida</td><td class="num">${U.money(rA.lostRevenue)}</td><td class="num">${U.money(rB.lostRevenue)}</td></tr>
        <tr><td>Margem perdida</td><td class="num">${U.money(rA.margemPerdida)}</td><td class="num">${U.money(rB.margemPerdida)}</td></tr>
        <tr><td>Custo extra do alternativo</td><td class="num">${U.money(rA.custoExtra)}</td><td class="num">${U.money(rB.custoExtra)}</td></tr>
        <tr class="total"><td>Impacto total</td><td class="num">${U.money(rA.total)}</td><td class="num">${U.money(rB.total)}</td></tr>
      </tbody></table></div>
      <div class="callout"><b>Valor de reagir cedo: ${U.money(rB.total - rA.total)}</b><p>É o quanto a resposta ágil evita em relação à tardia nesta interrupção. Compare com o custo anual de monitoramento, estoques e fornecedores alternativos no plano de ações.</p></div>
      <div class="callout"><b>O caso que inspirou este simulador</b><p>Em março de 2000 um pequeno incêndio atingiu a fábrica de chips da Philips em Albuquerque (EUA), fornecedora comum de Nokia e Ericsson. A Nokia percebeu o atraso em poucos dias, montou uma equipe e garantiu capacidade alternativa. A Ericsson reagiu semanas depois, ficou sem componentes e registrou perdas estimadas em centenas de milhões de dólares.</p></div>
    </div>
  </section>`;

  U.$('#dPreset', el).addEventListener('change', (e) => { App.dis = JSON.parse(JSON.stringify({ ...App.PRESETS.find((p) => p.id === e.target.value), show: d.show })); App.render(); });
  U.$('#dNode', el).addEventListener('change', (e) => { d.no = e.target.value; App.render(); });
  U.$$('input[data-k]', el).forEach((i) => i.addEventListener('change', () => {
    const v = Math.max(0, Number(i.value) || 0);
    if (i.dataset.sc) d[i.dataset.sc][i.dataset.k] = v; else d[i.dataset.k] = v;
    App.render();
  }));
  U.$$('[data-show]', el).forEach((b) => b.addEventListener('click', () => { d.show = b.dataset.show; App.render(); }));
};
