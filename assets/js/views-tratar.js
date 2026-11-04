/* ==========================================================================
   views-tratar.js — Plano de ações, Indicadores e alertas, Fornecedores
   ========================================================================== */

/* ---------------- Plano de ações ---------------- */
App.act = { estr: '', status: '', sort: 'bc' };
App.views.acoes = (el) => {
  const f = App.act;
  const all = S.state.actions.map((a) => {
    const ben = M.actionBenefit(a);
    return { a, ben, bc: a.custo ? ben / a.custo : 0, late: M.actionLate(a) };
  });
  const rows = all.filter(({ a }) => (!f.estr || a.estrategia === f.estr) && (!f.status || (f.status === 'Atrasada' ? M.actionLate(a) : a.status === f.status)));
  const sorters = { bc: (x) => -x.bc, ben: (x) => -x.ben, custo: (x) => -x.a.custo, prazo: (x) => x.a.prazo || '9', id: (x) => x.a.id };
  rows.sort((x, y) => { const A = sorters[f.sort](x), B = sorters[f.sort](y); return A > B ? 1 : A < B ? -1 : 0; });
  const custo = all.reduce((s, x) => s + x.a.custo, 0);
  const pI = M.portfolio('inerente').pea, pA = M.portfolio('atual').pea, pP = M.portfolio('planejado').pea;
  const byE = Object.keys(DATA.ESTRATEGIAS).map((k) => {
    const l = all.filter((x) => x.a.estrategia === k);
    return { k, n: l.length, custo: l.reduce((s, x) => s + x.a.custo, 0), ben: l.reduce((s, x) => s + x.ben, 0), done: l.filter((x) => x.a.status === 'Concluída').length };
  });
  const ranking = all.slice().sort((x, y) => y.bc - x.bc).slice(0, 12);
  const noAction = S.state.risks.filter((r) => r.status !== 'Encerrado' && r.status !== 'Aceito' && !M.actionsOf(r.id).length && M.evalRisk(r).score >= 10);

  el.innerHTML = `
  <section class="kpis kpis-4">
    ${V.kpi('Ações no plano', all.length, `${all.filter((x) => x.a.status === 'Concluída').length} concluídas · ${all.filter((x) => x.a.status === 'Em andamento').length} em andamento`)}
    ${V.kpi('Atrasadas', all.filter((x) => x.late).length, 'prazo vencido e não concluídas')}
    ${V.kpi('Custo anual do plano', U.money(custo), `benefício total: ${U.money(pI - pP)}/ano`)}
    ${V.kpi('Perda esperada', U.money(pA), `inerente ${U.money(pI)} → planejado ${U.money(pP)}`)}
  </section>
  ${noAction.length ? `<section class="banner warn"><div><b>${noAction.length} riscos altos ou críticos sem ação:</b> ${noAction.map((r) => V.riskLink(r.id)).join(', ')}.</div></section>` : ''}
  <section class="grid-3 strat">
    ${byE.map((x) => `<div class="strat-box"><b>${DATA.ESTRATEGIAS[x.k]}</b><small>${DATA.ALAVANCAS[x.k].join(' · ')}</small>
      <div class="strat-nums"><span><b>${x.n}</b> ações</span><span><b>${U.money(x.custo)}</b> custo/ano</span><span><b>${U.money(x.ben)}</b> benefício marginal</span></div>
      <p class="small muted">${x.k === 'prob' ? 'Atua antes da interrupção: prevenção, processos robustos e monitoramento.' : x.k === 'cons' ? 'Constrói resiliência: a cadeia sofre o impacto, mas não colapsa e volta ao normal.' : 'Não elimina a exposição: muda quem absorve custos e responsabilidades.'}</p></div>`).join('')}
  </section>
  <section class="card">
    <div class="toolbar">
      <select id="aEstr" aria-label="Estratégia"><option value="">Todas as estratégias</option>${Object.entries(DATA.ESTRATEGIAS).map(([k, v]) => `<option value="${k}" ${f.estr === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
      <select id="aStatus" aria-label="Status"><option value="">Todos os status</option>${[...DATA.STATUS_ACAO, 'Atrasada'].map((s) => `<option ${f.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
      <label class="inline">Ordenar por<select id="aSort">${[['bc', 'Benefício por real investido'], ['ben', 'Benefício'], ['custo', 'Custo'], ['prazo', 'Prazo'], ['id', 'Código']].map(([k, v]) => `<option value="${k}" ${f.sort === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <span class="spacer"></span>
      <button class="btn" id="aCsv">Exportar CSV</button>
      <button class="btn btn-primary" id="aNew">Nova ação</button>
    </div>
    <div class="table-wrap"><table class="table table-hover"><thead><tr><th>ID</th><th>Ação</th><th>Riscos</th><th>Estratégia</th><th>Efeito</th><th class="num">Custo/ano</th><th class="num">Benefício/ano</th><th class="num">B/C</th><th>Progresso</th><th>Prazo</th></tr></thead><tbody>
      ${rows.map(({ a, ben, bc, late }) => `<tr data-edit-action="${a.id}" tabindex="0">
        <td class="mono">${a.id}</td><td class="wide"><b>${U.esc(a.titulo)}</b><small>${U.esc(a.resp)} · ${U.esc(a.status)}</small></td>
        <td>${a.riscos.map(V.riskLink).join(' ')}</td><td>${DATA.ESTRATEGIAS[a.estrategia]}<small>${U.esc(a.alavanca)}</small></td>
        <td class="small">${V.effect(a)}</td><td class="num">${U.money(a.custo)}</td><td class="num">${U.money(ben)}</td>
        <td class="num"><span class="bc ${bc >= 1 ? 'pos' : 'neg'}">${U.num(bc, 1)}×</span></td>
        <td>${V.progress(a.progresso)}<small>${a.progresso}%</small></td>
        <td>${U.dateBR(a.prazo)}${late ? '<br><span class="pill st-crit"><i></i>Atrasada</span>' : ''}</td></tr>`).join('') || `<tr><td colspan="10">${V.empty('Nenhuma ação com esses filtros.')}</td></tr>`}
    </tbody></table></div>
    <p class="note">Benefício = quanto a perda esperada anual aumentaria se a ação fosse retirada do plano completo. B/C acima de 1× indica que a ação reduz mais perda média do que custa por ano. Seguros e redundâncias com B/C abaixo de 1× podem se justificar porque protegem contra os anos ruins (VaR), não só a média.</p>
  </section>
  <section class="card">
    <div class="card-head"><h3>Retorno por real investido</h3><span class="muted">benefício anual ÷ custo anual</span></div>
    ${C.hbars(ranking.map((x) => ({ label: x.a.id + ' · ' + x.a.titulo, value: x.bc, color: x.bc >= 1 ? 'var(--s3)' : 'var(--s2)', tip: `${U.money(x.ben)} de benefício por ${U.money(x.a.custo)} de custo` })), { fmt: (v) => U.num(v, 1) + '×' })}
  </section>`;

  U.$('#aEstr', el).addEventListener('change', (e) => { f.estr = e.target.value; App.render(); });
  U.$('#aStatus', el).addEventListener('change', (e) => { f.status = e.target.value; App.render(); });
  U.$('#aSort', el).addEventListener('change', (e) => { f.sort = e.target.value; App.render(); });
  U.$('#aNew', el).addEventListener('click', () => V.actionForm(null));
  U.$('#aCsv', el).addEventListener('click', () => {
    const head = ['ID', 'Ação', 'Riscos', 'Estratégia', 'Alavanca', 'Redução prob. (%)', 'Redução perda (%)', 'Cobertura (%)', 'Franquia (R$ mil)', 'Custo anual (R$ mil)', 'Benefício anual (R$ mil)', 'Status', 'Progresso (%)', 'Responsável', 'Prazo'];
    U.download('plano-de-acoes.csv', U.csv([head, ...all.map(({ a, ben }) => [a.id, a.titulo, a.riscos.join(' '), DATA.ESTRATEGIAS[a.estrategia], a.alavanca, Math.round(a.redP * 100), Math.round(a.redC * 100), Math.round((a.cobertura || 0) * 100), a.franquia || 0, a.custo, Math.round(ben), a.status, a.progresso, a.resp, a.prazo])]), 'text/csv');
  });
  U.$$('tr[data-edit-action]', el).forEach((tr) => tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') tr.click(); }));
};

/* ---------------- Indicadores e alertas ---------------- */
App.alertFilter = 'abertos';
App.views.monitoramento = (el) => {
  const kris = S.state.kris.map((k) => ({ k, st: M.kriStatus(k) })).sort((a, b) => ({ crit: 0, warn: 1, ok: 2 }[a.st] - { crit: 0, warn: 1, ok: 2 }[b.st]));
  const af = App.alertFilter;
  const alerts = S.state.alerts.filter((a) => af === 'todos' || (af === 'abertos' ? ['Novo', 'Reconhecido'].includes(a.status) : a.status === af)).sort((a, b) => (a.data < b.data ? 1 : -1));
  const sevCls = { Alta: 'crit', Média: 'warn', Baixa: 'ok' };
  const lim = (k) => (k.dir === 'maior' ? `normal ≥ ${U.num(k.verde, k.dec)} · crítico < ${U.num(k.vermelho, k.dec)}` : `normal ≤ ${U.num(k.verde, k.dec)} · crítico > ${U.num(k.vermelho, k.dec)}`);

  el.innerHTML = `
  <section class="kpis kpis-4">
    ${V.kpi('Indicadores críticos', kris.filter((x) => x.st === 'crit').length, 'passaram do limite vermelho')}
    ${V.kpi('Em atenção', kris.filter((x) => x.st === 'warn').length, 'entre os limites')}
    ${V.kpi('Normais', kris.filter((x) => x.st === 'ok').length, 'dentro da faixa')}
    ${V.kpi('Alertas abertos', S.state.alerts.filter((a) => ['Novo', 'Reconhecido'].includes(a.status)).length, `${S.state.alerts.filter((a) => a.status === 'Novo').length} ainda não reconhecidos`)}
  </section>
  <section class="grid-2 grid-wide-left">
    <div class="card">
      <div class="card-head"><h3>Indicadores-chave de risco (KRIs)</h3><span class="muted">últimos 12 meses · clique para atualizar</span></div>
      <div class="kri-grid">${kris.map(({ k, st }) => {
        const last = k.hist[11], prev = k.hist[10];
        const trend = last === prev ? '→' : last > prev ? '↑' : '↓';
        const linked = S.state.risks.filter((r) => r.kri === k.id);
        return `<button class="kri-card st-${st}" data-kri="${k.id}">
          <div class="kri-top"><span class="kri-name">${U.esc(k.nome)}</span>${V.statusPill(st)}</div>
          <div class="kri-mid"><span class="kri-big">${U.num(last, k.dec)}<small> ${U.esc(k.unidade)}</small></span><span class="muted">${trend} ${U.num(prev, k.dec)} no mês anterior</span></div>
          ${C.spark(k.hist, { w: 260, h: 54, color: `var(--st-${st})`, lines: [{ v: k.verde, cls: 'ok' }, { v: k.vermelho, cls: 'crit' }], lo: Math.min(k.verde, k.vermelho), hi: Math.max(k.verde, k.vermelho) })}
          <div class="kri-foot"><span>${lim(k)}</span><span>${U.esc(V.nodeName(k.no))}${linked.length ? ' · ' + linked.map((r) => r.id).join(', ') : ''}</span></div>
        </button>`;
      }).join('')}</div>
    </div>
    <div class="card">
      <div class="card-head wrap"><h3>Sinais e eventos na rede</h3>
        <select id="alFilter" aria-label="Filtrar alertas">${[['abertos', 'Abertos'], ['Novo', 'Novos'], ['Reconhecido', 'Reconhecidos'], ['Convertido', 'Convertidos em risco'], ['Descartado', 'Descartados'], ['todos', 'Todos']].map(([k, v]) => `<option value="${k}" ${af === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
      <p class="muted small">Detectar cedo, reconhecer sinais fracos e decidir rápido foi o que separou a Nokia da Ericsson.</p>
      <div class="alerts">${alerts.map((a) => `<article class="alert">
        <div class="alert-top">${V.statusPill(sevCls[a.sev], 'Severidade ' + a.sev.toLowerCase())}<span class="muted small">${U.dateBR(a.data)} · ${U.esc(a.fonte)}</span></div>
        <h4>${U.esc(a.titulo)}</h4><p class="small">${U.esc(a.texto)}</p>
        <div class="alert-foot"><span class="muted small">${U.esc(V.nodeName(a.no))} · ${U.esc(a.status)}${a.risco ? ' · ' + V.riskLink(a.risco) : ''}</span>
          <span class="alert-btns">
            ${a.status === 'Novo' ? `<button class="btn btn-small" data-al="${a.id}" data-do="ack">Reconhecer</button>` : ''}
            ${['Novo', 'Reconhecido'].includes(a.status) ? `<button class="btn btn-small" data-al="${a.id}" data-do="conv">Analisar novo risco</button><button class="btn btn-small btn-quiet" data-al="${a.id}" data-do="disc">Descartar</button>` : ''}
          </span></div></article>`).join('') || V.empty('Nenhum alerta neste filtro.')}</div>
      <button class="btn" id="alNew">Registrar sinal</button>
    </div>
  </section>`;

  U.$$('[data-kri]', el).forEach((b) => b.addEventListener('click', () => App.kriForm(S.kri(b.dataset.kri))));
  U.$('#alFilter', el).addEventListener('change', (e) => { App.alertFilter = e.target.value; App.render(); });
  U.$$('[data-al]', el).forEach((b) => b.addEventListener('click', () => {
    const a = S.state.alerts.find((x) => x.id === b.dataset.al);
    if (b.dataset.do === 'ack') { a.status = 'Reconhecido'; App.refresh(); U.toast('Alerta reconhecido'); }
    if (b.dataset.do === 'disc') { a.status = 'Descartado'; App.refresh(); U.toast('Alerta descartado'); }
    if (b.dataset.do === 'conv') { App.wizardPrefill = { no: a.no, titulo: a.titulo, causa: a.texto, alertId: a.id }; App.go('analise'); }
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
  body: `<form id="kForm" class="form">
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
App.views.fornecedores = (el) => {
  const w = S.state.pesos;
  const tw = Object.values(w).reduce((a, b) => a + b, 0) || 1;
  const list = S.state.suppliers.map((s) => ({ s, parts: M.supplierParts(s), sc: M.supplierScore(s) })).sort((a, b) => b.sc - a.sc);
  const hhi = M.hhi().sort((a, b) => b.hhi - a.hhi);

  el.innerHTML = `
  <section class="card">
      <div class="card-head"><h3>Pontuação de risco por fornecedor</h3><span class="muted">0 = risco mínimo · 100 = risco máximo</span></div>
      <div class="legend">${Object.keys(App.PESO_NOMES).map((k) => `<span class="sw" style="background:${App.PESO_CORES[k]}"></span>${App.PESO_NOMES[k].split(' (')[0]}`).join(' ')}</div>
      <div class="table-wrap"><table class="table"><thead><tr><th>#</th><th>Fornecedor</th><th>Compra</th><th class="num">Gasto/ano</th><th class="num">Part.</th><th class="num">Z</th><th class="num">OTIF</th><th class="num">Lead time</th><th>Composição</th><th class="num">Nota</th><th>Classe</th></tr></thead><tbody>
        ${list.map(({ s, parts, sc }, i) => { const rt = M.supplierRating(sc); return `<tr>
          <td class="num">${i + 1}</td><td class="wide"><b>${U.esc(s.nome)}</b><small>${U.esc(s.pais)}${s.fonteUnica ? ' · fonte única' : ''}${s.no ? '' : ' · alternativo'}</small></td>
          <td>${U.esc(s.compra)}</td><td class="num">${s.gasto ? U.money(s.gasto) : '—'}</td><td class="num">${U.pct(s.share)}</td>
          <td class="num ${s.z < 1.81 ? 'neg' : s.z < 2.99 ? 'warn' : ''}">${U.num(s.z, 2)}</td><td class="num">${s.otif}%</td><td class="num">${s.lead} d<small>CV ${U.num(s.cvLead, 2)}</small></td>
          <td><div class="stack" data-tip="${U.esc(Object.keys(parts).map((k) => App.PESO_NOMES[k] + ': ' + U.num(parts[k]) + ' × peso ' + w[k]).join('\n'))}">${Object.keys(parts).map((k) => `<span style="width:${(parts[k] * w[k]) / tw}%;background:${App.PESO_CORES[k]}"></span>`).join('')}</div></td>
          <td class="num"><b>${U.num(sc)}</b></td><td><span class="grade g-${rt}">${rt}</span></td></tr>`; }).join('')}
      </tbody></table></div>
      <p class="note">Classes: A até 35 · B 35 a 50 · C 50 a 65 · D acima de 65. Z-score de Altman: abaixo de 1,81 indica risco de insolvência; entre 1,81 e 2,99, zona cinzenta. Passe o mouse sobre a composição para ver cada critério.</p>
  </section>
  <section class="grid-2">
    <div class="card">
      <div class="card-head"><h3>Pesos dos critérios</h3><button class="link" id="wReset">Restaurar padrão</button></div>
      <form id="wForm" class="weights">${Object.keys(App.PESO_NOMES).map((k) => `<label><span>${App.PESO_NOMES[k]}</span><input type="range" name="${k}" min="0" max="50" step="5" value="${w[k]}"><b>${U.num((w[k] / tw) * 100)}%</b></label>`).join('')}</form>
      <p class="note">Ajuste os pesos conforme a estratégia da empresa e veja a classificação mudar. Pesos explícitos tornam a priorização auditável.</p>
      <div class="card-head" style="margin-top:18px"><h3>Fornecedores na zona de alerta</h3></div>
      <ul class="plain bullets">${list.filter((x) => M.supplierRating(x.sc) >= 'C' || x.s.z < 2.99).map((x) => `<li><b>${U.esc(x.s.nome)}</b>: nota ${U.num(x.sc)} (${M.supplierRating(x.sc)})${x.s.z < 2.99 ? `, Z-score ${U.num(x.s.z, 2)} na ${x.s.z < 1.81 ? 'zona de insolvência' : 'zona cinzenta'}` : ''}${x.s.fonteUnica ? ', fonte única' : ''}${x.s.otif < 92 ? `, OTIF ${x.s.otif}%` : ''}.</li>`).join('')}</ul>
    </div>
    <div class="card">
      <div class="card-head"><h3>Concentração de compras (HHI)</h3></div>
      ${hhi.map((h) => { const c = M.hhiClass(h.hhi); return `<div class="hhi"><div class="hhi-top"><b>${U.esc(h.compra)}</b>${V.statusPill(c.id, c.nome)}</div>
        ${C.hbars([{ label: h.list.map((s) => s.nome.split(' (')[0] + ' ' + U.pct(s.share)).join(' · '), value: h.hhi, color: `var(--st-${c.id})` }], { max: 10000, fmt: (v) => U.num(v) })}</div>`; }).join('')}
      <p class="note">HHI = soma dos quadrados das participações (%); fonte única = 10.000. As diretrizes de concorrência dos EUA (2010) chamam de concentrado um mercado acima de 2.500, mas uma compra com duas ou três fontes sempre passa disso. Por isso a política interna usa: até 3.400 diversificado (três fontes equilibradas), 3.400 a 6.000 moderado, acima de 6.000 alto. Diversificação reduz riscos (princípio 2).</p>
    </div>
  </section>`;

  U.$('#wForm', el).addEventListener('change', (e) => { S.state.pesos[e.target.name] = Number(e.target.value); App.refresh(); });
  U.$('#wReset', el).addEventListener('click', () => { S.state.pesos = DATA.seed().pesos; App.refresh(); });
};
