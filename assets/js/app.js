/* ==========================================================================
   app.js — navegação, componentes compartilhados e inicialização
   ========================================================================== */
const App = { mode: 'inerente', views: {}, current: null };
const V = {}; // componentes de interface reutilizáveis

App.ROUTES = [
  { group: 'Visão geral', items: [{ id: 'painel', nome: 'Painel executivo', sub: 'Situação da carteira de riscos da cadeia de suprimentos' }] },
  { group: 'Identificar e avaliar', items: [
    { id: 'rede', nome: 'Rede da cadeia', sub: 'Onde estão os riscos na rede e qual elo é o mais fraco (TTR × TTS)' },
    { id: 'riscos', nome: 'Registro de riscos', sub: 'Inventário de riscos com probabilidade, impacto e tratamento' },
    { id: 'matriz', nome: 'Matriz de vulnerabilidade', sub: 'Probabilidade × consequência para priorizar esforços' },
    { id: 'analise', nome: 'Nova análise (6 passos)', sub: 'Assistente que conduz o processo de gestão de riscos passo a passo' },
  ] },
  { group: 'Quantificar', items: [
    { id: 'montecarlo', nome: 'Perda anual (Monte Carlo)', sub: 'Distribuição de perdas da carteira e efeito do plano de ações' },
    { id: 'interrupcao', nome: 'Simulador de interrupção', sub: 'Perfil de desempenho de uma interrupção e o valor de reagir cedo' },
  ] },
  { group: 'Tratar', items: [{ id: 'acoes', nome: 'Plano de ações', sub: 'Reduzir probabilidade, reduzir consequência ou transferir' }] },
  { group: 'Monitorar', items: [
    { id: 'monitoramento', nome: 'Indicadores e alertas', sub: 'KRIs com limites e sinais fracos captados na rede' },
    { id: 'fornecedores', nome: 'Fornecedores', sub: 'Pontuação de risco por fornecedor e concentração de compras' },
  ] },
  { group: 'Governança', items: [
    { id: 'principios', nome: 'Dez princípios', sub: 'Autoavaliação de maturidade em gestão de riscos na cadeia' },
    { id: 'relatorio', nome: 'Relatório e dados', sub: 'Resumo executivo, exportação e backup' },
    { id: 'metodologia', nome: 'Metodologia', sub: 'Conceitos da disciplina, fórmulas, premissas e referências' },
  ] },
];
App.flat = App.ROUTES.flatMap((g) => g.items);
App.MODE_ROUTES = ['painel', 'riscos', 'matriz'];

App.go = (id) => { if (location.hash !== '#' + id) location.hash = id; else App.render(); };

App.render = () => {
  const id = (location.hash || '').replace('#', '') || 'painel';
  const route = App.flat.find((r) => r.id === id) || App.flat[0];
  App.current = route.id;
  U.$('#pageTitle').textContent = route.nome;
  U.$('#pageSub').textContent = route.sub;
  U.$$('.nav a').forEach((a) => a.classList.toggle('active', a.dataset.route === route.id));
  U.$('#modeBar').hidden = !App.MODE_ROUTES.includes(route.id);
  U.$$('#modeBar button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.mode === App.mode));
  document.title = route.nome + ' · RiscoGCS';
  const el = U.$('#view');
  el.innerHTML = '';
  try { App.views[route.id](el); } catch (e) { console.error(e); el.innerHTML = `<div class="card"><p>Erro ao montar esta tela: ${U.esc(e.message)}</p></div>`; }
  const navLink = U.$('.nav a.active');
  if (navLink && window.innerWidth < 900) navLink.scrollIntoView({ block: 'nearest', inline: 'center' });
};

App.refresh = () => { S.save(); App.render(); };

App.buildNav = () => {
  U.$('#nav').innerHTML = App.ROUTES.map((g) => `
    <div class="nav-group"><div class="nav-title">${U.esc(g.group)}</div>
      ${g.items.map((r) => `<a href="#${r.id}" data-route="${r.id}">${U.esc(r.nome)}</a>`).join('')}
    </div>`).join('');
};

/* ---------------- Componentes ---------------- */
V.levelPill = (lv) => `<span class="pill lvl-${lv.id}"><i aria-hidden="true"></i>${lv.nome}</span>`;
V.statusPill = (st, txt) => `<span class="pill st-${st}"><i aria-hidden="true"></i>${U.esc(txt || M.STATUS_TXT[st])}</span>`;
V.typeTag = (t) => `<span class="tag tag-${t}">${U.esc(DATA.TIPOS[t].nome)}</span>`;
V.quadTag = (q) => `<span class="tag quad-${q.id}">${U.esc(q.nome.replace('Vulnerabilidade ', ''))}</span>`;
V.riskLink = (id) => { const r = S.risk(id); return r ? `<button class="link" data-open-risk="${r.id}" data-tip="${U.esc(r.titulo)}">${r.id}</button>` : U.esc(id); };
V.nodeName = (id) => (S.node(id) || { nome: '—' }).nome;
V.scoreCell = (e) => `<span class="score lvl-${e.level.id}">${e.score}</span>`;
V.progress = (v) => `<div class="progress" role="progressbar" aria-valuenow="${v}" aria-valuemin="0" aria-valuemax="100"><div style="width:${v}%"></div></div>`;
V.empty = (msg) => `<div class="empty">${U.esc(msg)}</div>`;

V.kpi = (label, value, sub, cls = '') => `<div class="kpi ${cls}"><div class="kpi-label">${label}</div><div class="kpi-value">${value}</div>${sub ? `<div class="kpi-sub">${sub}</div>` : ''}</div>`;

/* Mapa de calor 5×5 (linhas: probabilidade 5→1; colunas: impacto 1→5) */
V.heatmap = (mode, opts = {}) => {
  const cells = {};
  const pf = M.portfolio(mode);
  pf.list.forEach(({ r, e }) => { const k = e.pl + '-' + e.i; (cells[k] = cells[k] || []).push({ r, e }); });
  let h = `<div class="heat ${opts.compact ? 'heat-compact' : ''}">`;
  h += `<div class="heat-ylab">Probabilidade</div><div class="heat-grid">`;
  for (let p = 5; p >= 1; p--) {
    h += `<div class="heat-rowlab"><b>${p}</b><span>${DATA.PROB[p - 1].nome}</span></div>`;
    for (let i = 1; i <= 5; i++) {
      const lv = M.level(p * i);
      const list = cells[p + '-' + i] || [];
      const hl = opts.highlight && opts.highlight.p === p && opts.highlight.i === i;
      h += `<div class="heat-cell lvl-${lv.id} ${hl ? 'hl' : ''}" data-tip="P${p} × I${i} = ${p * i} (${lv.nome})${list.length ? '\n' + list.map((x) => x.r.id + ' ' + x.r.titulo).join('\n') : ''}">`;
      if (opts.compact) h += list.length ? `<span class="heat-count">${list.length}</span>` : '';
      else h += list.map((x) => `<button class="chip" data-open-risk="${x.r.id}">${x.r.id}</button>`).join('');
      if (hl) h += `<span class="heat-new">novo</span>`;
      h += `</div>`;
    }
  }
  h += `<div></div>`;
  for (let i = 1; i <= 5; i++) h += `<div class="heat-collab"><b>${i}</b><span>${DATA.IMPACT_NAMES[i - 1]}</span></div>`;
  h += `</div><div class="heat-xlab">Consequência (impacto)</div></div>`;
  return h;
};

/* Detalhe de um risco */
V.openRisk = (id) => {
  const r = S.risk(id);
  if (!r) return;
  const ev = Object.keys(M.MODES).map((m) => ({ m, e: M.evalRisk(r, m) }));
  const t = DATA.TIPOS[r.tipo];
  const acts = M.actionsOf(r.id);
  const k = r.kri && S.kri(r.kri);
  const ine = ev[0].e;
  const body = `
    <div class="detail-head">${V.levelPill(ine.level)} ${V.typeTag(r.tipo)} ${V.quadTag(ine.quad)} <span class="muted">${U.esc(S.cat(r.cat).nome)} · ${U.esc(V.nodeName(r.no))}</span></div>
    <div class="grid-2 gap-l">
      <div>
        <h4>Causa</h4><p>${U.esc(r.causa || '—')}</p>
        <h4>Consequência</h4><p>${U.esc(r.consequencia || '—')}</p>
        <dl class="dl">
          <dt>Responsável</dt><dd>${U.esc(r.resp || '—')}</dd>
          <dt>Situação</dt><dd>${U.esc(r.status)}</dd>
          <dt>Identificado em</dt><dd>${U.dateBR(r.data)}</dd>
          <dt>Perda por ocorrência</dt><dd>${U.money(r.sev[0])} · <b>${U.money(r.sev[1])}</b> · ${U.money(r.sev[2])} <span class="muted">(mín · mais provável · máx)</span></dd>
        </dl>
      </div>
      <div>
        <h4>Pontuação por dimensão</h4>
        <table class="mini"><tbody>
          ${['pessoas', 'reputacao', 'operacao'].map((d) => `<tr><td>${DATA.IMPACT[d].nome}</td><td class="num">${r.dims[d]}</td><td class="muted">${U.esc(DATA.IMPACT[d].niveis[r.dims[d] - 1])}</td></tr>`).join('')}
          <tr><td>Financeiro</td><td class="num">${M.finLevel(r.sev[1])}</td><td class="muted">${U.esc(DATA.IMPACT.financeiro.niveis[M.finLevel(r.sev[1]) - 1])}</td></tr>
        </tbody></table>
        <p class="note">Impacto considerado = pior dimensão (${M.impact(r)}). Probabilidade ${r.p} = ${DATA.PROB[r.p - 1].nome} (${DATA.PROB[r.p - 1].faixa}).</p>
      </div>
    </div>
    <h4>Inerente × residual</h4>
    <div class="table-wrap"><table class="table"><thead><tr><th>Cenário</th><th>Prob. anual</th><th>P</th><th>I</th><th>P×I</th><th>Nível</th><th>Quadrante</th><th class="num">Perda esperada/ano</th></tr></thead><tbody>
      ${ev.map(({ m, e }) => `<tr><td>${M.MODES[m]}</td><td>${U.pct(e.p, 1)}</td><td>${e.pl}</td><td>${e.i}</td><td>${V.scoreCell(e)}</td><td>${V.levelPill(e.level)}</td><td>${V.quadTag(e.quad)}</td><td class="num">${U.money(e.pea)}</td></tr>`).join('')}
    </tbody></table></div>
    <div class="grid-2 gap-l">
      <div class="callout"><b>Como estimar (${t.nome.toLowerCase()})</b><p>${U.esc(t.estimar)}</p><b>Como tratar</b><p>${U.esc(t.tratar)}</p></div>
      <div class="callout"><b>Foco recomendado pelo quadrante</b><p>${U.esc(ine.quad.foco)}</p><b>Resposta pelo nível ${ine.level.nome.toLowerCase()}</b><p>${U.esc(ine.level.resp)}</p></div>
    </div>
    ${k ? `<h4>Indicador antecipatório vinculado</h4><div class="kri-inline">${C.spark(k.hist, { w: 200, h: 44, color: `var(--st-${M.kriStatus(k)})` })}<div><b>${U.esc(k.nome)}</b><br>${U.num(k.hist[k.hist.length - 1], k.dec)} ${U.esc(k.unidade)} ${V.statusPill(M.kriStatus(k))}</div></div>` : ''}
    <h4>Ações (${acts.length})</h4>
    ${acts.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Ação</th><th>Estratégia</th><th>Efeito</th><th>Status</th><th>Progresso</th></tr></thead><tbody>
      ${acts.map((a) => `<tr><td><button class="link" data-edit-action="${a.id}">${a.id}</button> ${U.esc(a.titulo)}</td><td>${DATA.ESTRATEGIAS[a.estrategia]}<br><span class="muted">${U.esc(a.alavanca)}</span></td><td>${V.effect(a)}</td><td>${U.esc(a.status)}${M.actionLate(a) ? ' <span class="pill st-crit"><i></i>Atrasada</span>' : ''}</td><td>${V.progress(a.progresso)}</td></tr>`).join('')}
    </tbody></table></div>` : V.empty('Nenhuma ação cadastrada para este risco.')}
  `;
  U.modal({
    title: r.id + ' · ' + r.titulo, wide: true, body,
    actions: [
      { label: 'Excluir', cls: 'btn-ghost-danger', onClick: () => { U.confirm(`Excluir o risco ${r.id}? As ações ligadas só a ele também serão removidas.`, () => {
        S.state.risks = S.state.risks.filter((x) => x.id !== r.id);
        S.state.actions = S.state.actions.map((a) => ({ ...a, riscos: a.riscos.filter((x) => x !== r.id) })).filter((a) => a.riscos.length);
        App.refresh(); U.toast('Risco ' + r.id + ' excluído');
      }, 'Excluir'); } },
      { label: 'Nova ação', onClick: () => { V.actionForm(null, r.id); } },
      { label: 'Editar risco', cls: 'btn-primary', onClick: () => { V.riskForm(r); } },
    ],
  });
};

V.effect = (a) => {
  const p = [];
  if (a.redP) p.push(`−${Math.round(a.redP * 100)}% prob.`);
  if (a.redC) p.push(`−${Math.round(a.redC * 100)}% perda`);
  if (a.estrategia === 'transf' && a.cobertura) p.push(`${Math.round(a.cobertura * 100)}% coberto${a.franquia ? ' acima de ' + U.money(a.franquia) : ''}`);
  return p.join(' · ') || '—';
};

/* Formulário de risco (criação rápida ou edição) */
V.riskForm = (r) => {
  const isNew = !r;
  const x = r || { id: S.nextId(S.state.risks, 'R'), titulo: '', cat: 'fornecimento', tipo: 'acidental', no: 'n_fab', p: 3, dims: { pessoas: 1, reputacao: 2, operacao: 3 }, sev: [100, 500, 2000], resp: '', status: 'Identificado', data: U.today(), kri: '', causa: '', consequencia: '' };
  const lvlOpts = (sel, names) => names.map((n, i) => `<option value="${i + 1}" ${sel === i + 1 ? 'selected' : ''}>${i + 1} · ${U.esc(n)}</option>`).join('');
  const body = `<form id="riskForm" class="form">
    <label class="span-2">Título do risco<input name="titulo" required value="${U.esc(x.titulo)}"></label>
    <label>Categoria<select name="cat">${U.opts(DATA.CATEGORIAS, x.cat)}</select></label>
    <label>Natureza<select name="tipo">${Object.entries(DATA.TIPOS).map(([k, t]) => `<option value="${k}" ${k === x.tipo ? 'selected' : ''}>${t.nome}</option>`).join('')}</select></label>
    <label>Elo da cadeia<select name="no">${U.opts(S.state.nodes, x.no)}</select></label>
    <label>Responsável<input name="resp" value="${U.esc(x.resp)}"></label>
    <label>Situação<select name="status">${DATA.STATUS_RISCO.map((s) => `<option ${s === x.status ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
    <label>Indicador (KRI)<select name="kri"><option value="">Nenhum</option>${U.opts(S.state.kris, x.kri)}</select></label>
    <label>Probabilidade<select name="p">${lvlOpts(x.p, DATA.PROB.map((p) => p.nome + ' (' + p.faixa + ')'))}</select></label>
    <label>Pessoas<select name="pessoas">${lvlOpts(x.dims.pessoas, DATA.IMPACT.pessoas.niveis)}</select></label>
    <label>Reputação<select name="reputacao">${lvlOpts(x.dims.reputacao, DATA.IMPACT.reputacao.niveis)}</select></label>
    <label>Processos e sistemas<select name="operacao">${lvlOpts(x.dims.operacao, DATA.IMPACT.operacao.niveis)}</select></label>
    <label>Perda mínima (R$ mil)<input type="number" name="s0" min="0" step="10" value="${x.sev[0]}"></label>
    <label>Perda mais provável (R$ mil)<input type="number" name="s1" min="0" step="10" value="${x.sev[1]}"></label>
    <label>Perda máxima (R$ mil)<input type="number" name="s2" min="0" step="10" value="${x.sev[2]}"></label>
    <label>Identificado em<input type="date" name="data" value="${U.esc(x.data)}"></label>
    <label class="span-2">Causa<textarea name="causa" rows="2">${U.esc(x.causa)}</textarea></label>
    <label class="span-2">Consequência<textarea name="consequencia" rows="2">${U.esc(x.consequencia)}</textarea></label>
    <p class="form-err span-2" id="riskErr" hidden></p>
  </form>`;
  U.modal({
    title: isNew ? 'Novo risco ' + x.id : 'Editar ' + x.id, wide: true, body,
    actions: [{ label: 'Cancelar' }, {
      label: isNew ? 'Criar risco' : 'Salvar alterações', cls: 'btn-primary',
      onClick: (w) => {
        const f = U.formData(w.querySelector('#riskForm'));
        const err = w.querySelector('#riskErr');
        const sev = [f.s0, f.s1, f.s2].map((v) => Math.max(0, v || 0));
        if (!f.titulo.trim()) { err.textContent = 'Dê um título ao risco.'; err.hidden = false; return false; }
        if (!(sev[0] <= sev[1] && sev[1] <= sev[2]) || sev[2] === 0) { err.textContent = 'As perdas precisam seguir a ordem mínima ≤ mais provável ≤ máxima, com máxima acima de zero.'; err.hidden = false; return false; }
        const obj = { ...x, titulo: f.titulo.trim(), cat: f.cat, tipo: f.tipo, no: f.no, resp: f.resp, status: f.status, kri: f.kri || null, p: f.p, dims: { pessoas: f.pessoas, reputacao: f.reputacao, operacao: f.operacao }, sev, data: f.data, causa: f.causa, consequencia: f.consequencia };
        if (isNew) S.state.risks.push(obj); else Object.assign(r, obj);
        App.refresh(); U.toast(isNew ? 'Risco ' + obj.id + ' criado' : 'Risco ' + obj.id + ' atualizado');
      },
    }],
  });
};

/* Formulário de ação */
V.actionForm = (a, riskId) => {
  const isNew = !a;
  const x = a || { id: S.nextId(S.state.actions, 'A'), riscos: riskId ? [riskId] : [], titulo: '', estrategia: 'prob', alavanca: 'Prevenção', redP: 0.3, redC: 0, cobertura: 0, franquia: 0, custo: 100, status: 'Planejada', progresso: 0, resp: '', prazo: '' };
  const body = `<form id="actForm" class="form">
    <label class="span-2">Ação<input name="titulo" required value="${U.esc(x.titulo)}"></label>
    <fieldset class="span-2"><legend>Riscos tratados</legend><div class="check-grid">
      ${S.state.risks.map((r) => `<label class="check"><input type="checkbox" name="r_${r.id}" ${x.riscos.includes(r.id) ? 'checked' : ''}> <b>${r.id}</b> ${U.esc(r.titulo)}</label>`).join('')}
    </div></fieldset>
    <label>Estratégia<select name="estrategia" id="fEstr">${Object.entries(DATA.ESTRATEGIAS).map(([k, v]) => `<option value="${k}" ${k === x.estrategia ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
    <label>Alavanca<select name="alavanca" id="fAlav"></select></label>
    <label>Redução da probabilidade (%)<input type="number" name="redP" min="0" max="95" step="5" value="${Math.round((x.redP || 0) * 100)}"></label>
    <label>Redução da perda (%)<input type="number" name="redC" min="0" max="95" step="5" value="${Math.round((x.redC || 0) * 100)}"></label>
    <label>Cobertura transferida (%)<input type="number" name="cobertura" min="0" max="100" step="5" value="${Math.round((x.cobertura || 0) * 100)}"></label>
    <label>Franquia (R$ mil)<input type="number" name="franquia" min="0" step="10" value="${x.franquia || 0}"></label>
    <label>Custo anual (R$ mil)<input type="number" name="custo" min="0" step="10" value="${x.custo}"></label>
    <label>Responsável<input name="resp" value="${U.esc(x.resp)}"></label>
    <label>Status<select name="status">${DATA.STATUS_ACAO.map((s) => `<option ${s === x.status ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
    <label>Progresso (%)<input type="number" name="progresso" min="0" max="100" step="5" value="${x.progresso}"></label>
    <label>Prazo<input type="date" name="prazo" value="${U.esc(x.prazo)}"></label>
    <p class="note span-2">Prevenção e processos robustos reduzem a probabilidade. Redundância, flexibilidade e agilidade reduzem a perda. Seguros e hedges transferem a parte financeira acima da franquia, mas não reduzem impactos em pessoas e reputação.</p>
    <p class="form-err span-2" id="actErr" hidden></p>
  </form>`;
  U.modal({
    title: isNew ? 'Nova ação ' + x.id : 'Editar ação ' + x.id, wide: true, body,
    onMount: (w) => {
      const es = w.querySelector('#fEstr'), al = w.querySelector('#fAlav');
      const fill = () => { al.innerHTML = DATA.ALAVANCAS[es.value].map((v) => `<option ${v === x.alavanca ? 'selected' : ''}>${v}</option>`).join(''); };
      es.addEventListener('change', fill); fill();
    },
    actions: [
      ...(isNew ? [] : [{ label: 'Excluir', cls: 'btn-ghost-danger', onClick: () => U.confirm('Excluir a ação ' + x.id + '?', () => { S.state.actions = S.state.actions.filter((y) => y.id !== x.id); App.refresh(); U.toast('Ação excluída'); }, 'Excluir') }]),
      { label: 'Cancelar' },
      {
        label: isNew ? 'Criar ação' : 'Salvar', cls: 'btn-primary',
        onClick: (w) => {
          const f = U.formData(w.querySelector('#actForm'));
          const riscos = S.state.risks.filter((r) => f['r_' + r.id]).map((r) => r.id);
          const err = w.querySelector('#actErr');
          if (!f.titulo.trim()) { err.textContent = 'Descreva a ação.'; err.hidden = false; return false; }
          if (!riscos.length) { err.textContent = 'Marque pelo menos um risco tratado.'; err.hidden = false; return false; }
          const obj = { ...x, titulo: f.titulo.trim(), riscos, estrategia: f.estrategia, alavanca: f.alavanca, redP: U.clamp(f.redP || 0, 0, 95) / 100, redC: U.clamp(f.redC || 0, 0, 95) / 100, cobertura: U.clamp(f.cobertura || 0, 0, 100) / 100, franquia: f.franquia || 0, custo: f.custo || 0, resp: f.resp, status: f.status, progresso: f.status === 'Concluída' ? 100 : U.clamp(f.progresso || 0, 0, 100), prazo: f.prazo };
          if (isNew) S.state.actions.push(obj); else Object.assign(a, obj);
          App.refresh(); U.toast(isNew ? 'Ação ' + obj.id + ' criada' : 'Ação ' + obj.id + ' atualizada');
        },
      },
    ],
  });
};

/* ---------------- Inicialização ---------------- */
App.init = () => {
  S.load();
  App.buildNav();
  U.initTips();
  U.$('#companyName').textContent = S.state.empresa.nome;
  U.$('#modeBar').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-mode]');
    if (!b) return;
    App.mode = b.dataset.mode;
    App.render();
  });
  document.addEventListener('click', (e) => {
    const r = e.target.closest('[data-open-risk]');
    if (r) { e.preventDefault(); V.openRisk(r.dataset.openRisk); return; }
    const a = e.target.closest('[data-edit-action]');
    if (a) { e.preventDefault(); const act = S.state.actions.find((x) => x.id === a.dataset.editAction); if (act) V.actionForm(act); return; }
    const g = e.target.closest('[data-go]');
    if (g) { e.preventDefault(); App.go(g.dataset.go); }
  });
  window.addEventListener('hashchange', App.render);
  App.render();
};
document.addEventListener('DOMContentLoaded', App.init);
