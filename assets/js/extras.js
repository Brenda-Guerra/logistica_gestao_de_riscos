/* ==========================================================================
   extras.js — assistente de 6 passos, relatório e "Sobre" (janelas)
   ========================================================================== */
App.wiz = null;
const W = {};

W.STEPS = [
  { n: 1, nome: 'Processo ou recurso', dica: 'Escolha o elo da cadeia (processo, fornecedor, rota, unidade ou sistema) que será analisado.' },
  { n: 2, nome: 'Identificação', dica: 'Levante o risco e classifique sua categoria e natureza.' },
  { n: 3, nome: 'Probabilidade', dica: 'Estime a chance de ocorrência com dados históricos, mapas e inteligência.' },
  { n: 4, nome: 'Consequências', dica: 'Pergunte: o que aconteceria se esse risco se materializasse?' },
  { n: 5, nome: 'Vulnerabilidade', dica: 'Combine probabilidade e consequência para priorizar.' },
  { n: 6, nome: 'Ações', dica: 'Reduzir probabilidade, reduzir consequência ou transferir.' },
];

W.fresh = (pre = {}) => ({
  step: pre.no ? 2 : 1,
  d: {
    no: pre.no || '', cat: pre.cat || 'fornecimento', tipo: pre.tipo || 'acidental',
    titulo: pre.titulo || '', causa: pre.causa || '', consequencia: pre.consequencia || '', resp: '',
    p: 3, dims: { pessoas: 1, reputacao: 2, operacao: 3 }, sev: [200, 800, 3000], acoes: [], alertId: pre.alertId || null,
  },
});

W.draftRisk = () => {
  const d = App.wiz.d;
  return { id: 'NOVO', titulo: d.titulo, cat: d.cat, tipo: d.tipo, no: d.no, p: d.p, dims: d.dims, sev: d.sev, status: 'Identificado', causa: d.causa, consequencia: d.consequencia };
};
/* Avalia o rascunho incluindo temporariamente as ações planejadas no estado */
W.evalDraft = (mode) => {
  const r = W.draftRisk();
  const tmp = App.wiz.d.acoes.map((a, i) => ({ ...a, id: 'TMP' + i, riscos: ['NOVO'], status: 'Planejada', progresso: 0 }));
  S.state.actions.push(...tmp);
  try { return M.evalRisk(r, mode); } finally { S.state.actions.splice(S.state.actions.length - tmp.length, tmp.length); }
};

/* Abre o assistente numa janela sobre a página. "pre" pré-preenche (elo, título, sinal de origem). */
W.open = (pre) => {
  if (pre || !App.wiz) App.wiz = W.fresh(pre || {});
  W.close = U.modal({ title: 'Nova análise de risco', xl: true, body: '<div id="wizHost"></div>' });
  W.draw();
};

W.draw = () => {
  const el = U.$('#wizHost');
  if (!el) return;
  const w = App.wiz, d = w.d;
  const node = S.node(d.no);

  el.innerHTML = `
  <ol class="stepper" aria-label="Passos do processo">${W.STEPS.map((s) => `<li class="${s.n === w.step ? 'cur' : s.n < w.step ? 'done' : ''}">
    <button data-step="${s.n}" ${s.n > w.step && !(s.n === 2 && d.no) ? 'disabled' : ''}><span class="step-n">${s.n}</span><span class="step-t">${s.nome}</span></button></li>`).join('')}</ol>
  <section class="card wiz">
    <div class="wiz-head"><div><span class="eyebrow">Passo ${w.step} de 6</span><h3>${W.STEPS[w.step - 1].nome}</h3><p class="muted">${W.STEPS[w.step - 1].dica}</p></div>
      ${node ? `<div class="wiz-ctx"><span class="muted">Elo</span><b>${U.esc(node.nome)}</b>${d.titulo ? `<span class="muted">Risco</span><b>${U.esc(d.titulo)}</b>` : ''}</div>` : ''}</div>
    <div id="wizBody">${W['step' + w.step](d)}</div>
    <p class="form-err" id="wizErr" hidden></p>
    <div class="wiz-foot">
      <button class="btn" id="wizReset">Recomeçar</button><span class="spacer"></span>
      ${w.step > 1 ? '<button class="btn" id="wizBack">Voltar</button>' : ''}
      ${w.step < 6 ? '<button class="btn btn-primary" id="wizNext">Avançar</button>' : '<button class="btn btn-primary" id="wizSave">Salvar no registro</button>'}
    </div>
  </section>`;

  const err = (m) => { const e = U.$('#wizErr', el); e.textContent = m; e.hidden = !m; };
  const valid = () => {
    if (w.step === 1 && !d.no) return 'Escolha um elo da cadeia para continuar.';
    if (w.step === 2 && d.titulo.trim().length < 6) return 'Descreva o risco com um título de pelo menos 6 caracteres.';
    if (w.step === 4 && !(d.sev[0] <= d.sev[1] && d.sev[1] <= d.sev[2] && d.sev[2] > 0)) return 'As perdas precisam seguir a ordem mínima ≤ mais provável ≤ máxima.';
    return '';
  };
  U.$$('[data-step]', el).forEach((b) => b.addEventListener('click', () => { const t = +b.dataset.step; if (t < w.step || !valid()) { w.step = t; W.draw(); } else err(valid()); }));
  const next = U.$('#wizNext', el);
  if (next) next.addEventListener('click', () => { const m = valid(); if (m) return err(m); w.step++; W.draw(); el.closest('.modal-body').scrollTop = 0; });
  const back = U.$('#wizBack', el);
  if (back) back.addEventListener('click', () => { w.step--; W.draw(); });
  U.$('#wizReset', el).addEventListener('click', () => U.confirm('Descartar esta análise e recomeçar?', () => { App.wiz = W.fresh(); W.draw(); }, 'Recomeçar'));
  const save = U.$('#wizSave', el);
  if (save) save.addEventListener('click', W.save);
  W['bind' + w.step] && W['bind' + w.step](el, d);
};

/* ---- Passo 1: processo ou recurso ---- */
W.step1 = (d) => `<div class="node-pick">${DATA.CAMADAS.map((c, i) => `<div><h4>${c}</h4>${S.state.nodes.filter((n) => n.camada === i).map((n) => `
  <button class="pick ${d.no === n.id ? 'on' : ''}" data-pick="${n.id}"><b>${U.esc(n.nome)}</b><small>${U.esc(n.papel)}</small>
  <small class="muted">${U.plural(M.nodeRisks(n.id).length, 'risco registrado', 'riscos registrados')}${n.ttr != null ? ` · TTR ${U.wk(n.ttr)} / TTS ${U.wk(n.tts)} sem.` : ''}</small></button>`).join('')}</div>`).join('')}</div>
  <p class="note">Comece pelos elos críticos: fonte única, receita alta dependente ou tempo de recuperação maior que o tempo de sobrevivência.</p>`;
W.bind1 = (el, d) => U.$$('[data-pick]', el).forEach((b) => b.addEventListener('click', () => { d.no = b.dataset.pick; W.draw(); }));

/* ---- Passo 2: identificação ---- */
W.step2 = (d) => {
  const cat = S.cat(d.cat);
  const exist = M.nodeRisks(d.no);
  return `<div class="grid-2 gap-l">
    <div class="form">
      <label class="span-2">Categoria de risco<select id="wCat">${U.opts(DATA.CATEGORIAS, d.cat)}</select></label>
      <div class="span-2"><span class="label">Fatores típicos desta categoria (clique para usar como ponto de partida)</span>
        <div class="chips">${cat.fatores.map((f) => `<button class="chip chip-soft" data-fator="${U.esc(f)}">${U.esc(f)}</button>`).join('')}</div></div>
      <label class="span-2">Título do risco<input id="wTitulo" value="${U.esc(d.titulo)}" placeholder="Ex.: Incêndio na fábrica do fornecedor de placas"></label>
      <label class="span-2">Causa (o que pode provocar o evento)<textarea id="wCausa" rows="2">${U.esc(d.causa)}</textarea></label>
      <label class="span-2">Consequência esperada<textarea id="wCons" rows="2">${U.esc(d.consequencia)}</textarea></label>
      <label class="span-2">Responsável<input id="wResp" value="${U.esc(d.resp)}" placeholder="Área ou pessoa dona do risco"></label>
    </div>
    <div>
      <span class="label">Natureza do risco</span>
      <div class="type-pick">${Object.entries(DATA.TIPOS).map(([k, t]) => `<button class="pick ${d.tipo === k ? 'on' : ''}" data-tipo="${k}"><b>${t.nome}</b><small>${U.esc(t.desc)}</small><small class="muted">Ex.: ${U.esc(t.exemplos)}</small></button>`).join('')}</div>
      <div class="callout"><b>Evite dois extremos</b><p>Listar riscos demais, sem prioridade, ou olhar apenas os óbvios e deixar vulnerabilidades importantes de fora.</p>
      ${exist.length ? `<b>Já registrados neste elo</b><ul class="plain small">${exist.map((r) => `<li>${r.id} · ${U.esc(r.titulo)}</li>`).join('')}</ul>` : ''}</div>
    </div></div>`;
};
W.bind2 = (el, d) => {
  U.$('#wCat', el).addEventListener('change', (e) => { d.cat = e.target.value; W.draw(); });
  U.$('#wTitulo', el).addEventListener('input', (e) => { d.titulo = e.target.value; });
  U.$('#wCausa', el).addEventListener('input', (e) => { d.causa = e.target.value; });
  U.$('#wCons', el).addEventListener('input', (e) => { d.consequencia = e.target.value; });
  U.$('#wResp', el).addEventListener('input', (e) => { d.resp = e.target.value; });
  U.$$('[data-fator]', el).forEach((b) => b.addEventListener('click', () => { if (!d.titulo) d.titulo = b.dataset.fator + ' — ' + V.nodeName(d.no); W.draw(); }));
  U.$$('[data-tipo]', el).forEach((b) => b.addEventListener('click', () => { d.tipo = b.dataset.tipo; W.draw(); }));
};

/* ---- Passo 3: probabilidade ---- */
W.step3 = (d) => {
  const t = DATA.TIPOS[d.tipo];
  return `<div class="grid-2 gap-l">
    <div><span class="label">Nível de probabilidade</span>
      <div class="scale-pick">${DATA.PROB.slice().reverse().map((p) => `<button class="pick row ${d.p === p.n ? 'on' : ''}" data-p="${p.n}"><span class="big">${p.n}</span><span><b>${p.nome}</b><small>${p.faixa} · ${p.exemplo}</small></span></button>`).join('')}</div>
    </div>
    <div>
      <div class="callout"><b>Como estimar um risco ${t.nome.toLowerCase()}</b><p>${U.esc(t.estimar)}</p>
        <p class="small muted">Fontes possíveis: dados históricos, mapas de ocorrência, informações climáticas, registros setoriais, inteligência de mercado e conhecimento acumulado dos envolvidos.</p></div>
      <div class="calc"><b>Calculadora de frequência histórica</b>
        <div class="form form-3">
          <label>Ocorrências observadas<input type="number" id="cK" min="0" value="1"></label>
          <label>Em quantos anos<input type="number" id="cN" min="1" value="10"></label>
          <div class="calc-out" id="cOut"></div>
        </div>
        <p class="small muted">Taxa λ = (ocorrências + 0,5) ÷ anos; probabilidade de ao menos um evento no ano = 1 − e<sup>−λ</sup>. O 0,5 evita estimar zero quando nada aconteceu no período.</p>
      </div>
    </div></div>`;
};
W.bind3 = (el, d) => {
  U.$$('[data-p]', el).forEach((b) => b.addEventListener('click', () => { d.p = +b.dataset.p; W.draw(); }));
  const calc = () => {
    const k = Math.max(0, +U.$('#cK', el).value || 0), n = Math.max(1, +U.$('#cN', el).value || 1);
    const p = 1 - Math.exp(-(k + 0.5) / n), lv = M.pLevel(p);
    U.$('#cOut', el).innerHTML = `<span>${U.pct(p, 1)} ao ano → nível <b>${lv} · ${DATA.PROB[lv - 1].nome}</b></span><button class="btn btn-small" id="cApply" data-lv="${lv}">Usar nível ${lv}</button>`;
    U.$('#cApply', el).addEventListener('click', () => { d.p = lv; W.draw(); });
  };
  U.$('#cK', el).addEventListener('input', calc); U.$('#cN', el).addEventListener('input', calc); calc();
};

/* ---- Passo 4: consequências ---- */
W.QUESTIONS = [
  'E se a fábrica de um fornecedor parasse por duas semanas?',
  'E se uma rota logística crítica fosse bloqueada?',
  'E se um embarque completo fosse roubado durante o lançamento?',
  'E se o sistema de informação ficasse fora do ar?',
  'E se um fornecedor-chave atrasasse um componente crítico?',
];
W.step4 = (d) => {
  const n = S.node(d.no);
  return `<div class="questions">${W.QUESTIONS.map((q) => `<span>${q}</span>`).join('')}</div>
  <div class="grid-2 gap-l">
    <div>
      ${['pessoas', 'reputacao', 'operacao'].map((k) => `<div class="dim-pick"><span class="label">${DATA.IMPACT[k].nome}</span><div class="dim-opts">
        ${DATA.IMPACT[k].niveis.map((t, i) => `<button class="pick mini ${d.dims[k] === i + 1 ? 'on' : ''}" data-dim="${k}" data-v="${i + 1}" data-tip="${U.esc(t)}"><b>${i + 1}</b><small>${U.esc(t)}</small></button>`).join('')}</div></div>`).join('')}
    </div>
    <div>
      <span class="label">Perda financeira por ocorrência (R$ mil)</span>
      <div class="form form-3">
        <label>Mínima<input type="number" min="0" step="10" data-sev="0" value="${d.sev[0]}"></label>
        <label>Mais provável<input type="number" min="0" step="10" data-sev="1" value="${d.sev[1]}"></label>
        <label>Máxima<input type="number" min="0" step="10" data-sev="2" value="${d.sev[2]}"></label>
      </div>
      ${n && n.ttr != null ? `<div class="calc"><b>Estimativa pela rede</b><p class="small">${U.esc(n.nome)} sustenta ${U.money(n.receita)} de receita por semana. Com TTR de ${U.wk(n.ttr)} e TTS de ${U.wk(n.tts)} semanas, a margem perdida numa parada completa seria de cerca de ${U.money(M.nodePI(n))}.</p>
        <button class="btn btn-small" id="useNet">Usar como perda mais provável</button></div>` : ''}
      <div class="calc" id="impOut"></div>
      <p class="note">Considere perda de vendas, parada de produção, atraso de lançamento, perda de cliente, dano à marca e custo de recuperação.</p>
    </div></div>`;
};
W.bind4 = (el, d) => {
  const out = () => {
    const fl = M.finLevel(d.sev[1]);
    const i = Math.max(d.dims.pessoas, d.dims.reputacao, d.dims.operacao, fl);
    U.$('#impOut', el).innerHTML = `<b>Impacto resultante: ${i} · ${DATA.IMPACT_NAMES[i - 1]}</b><p class="small">Financeiro nível ${fl} (${DATA.IMPACT.financeiro.niveis[fl - 1]}). O impacto do risco é a pior das quatro dimensões.</p>`;
  };
  U.$$('[data-dim]', el).forEach((b) => b.addEventListener('click', () => { d.dims[b.dataset.dim] = +b.dataset.v; W.draw(); }));
  U.$$('[data-sev]', el).forEach((inp) => inp.addEventListener('input', () => { d.sev[+inp.dataset.sev] = Math.max(0, +inp.value || 0); out(); }));
  const un = U.$('#useNet', el);
  if (un) un.addEventListener('click', () => {
    const v = Math.round(M.nodePI(S.node(d.no)));
    if (v > 0) { d.sev = [Math.round(v * 0.3), v, Math.round(v * 3)]; W.draw(); } else U.toast('Este elo tem TTS maior que TTR: a perda pela rede seria zero.');
  });
  out();
};

/* ---- Passo 5: vulnerabilidade ---- */
W.step5 = (d) => {
  const e = W.evalDraft('inerente');
  const pf = M.portfolio('inerente').list;
  const rank = pf.filter((x) => x.e.score > e.score || (x.e.score === e.score && x.e.pea > e.pea)).length + 1;
  return `<div class="grid-2 gap-l">
    <div>${V.heatmap('inerente', { compact: true, highlight: { p: e.pl, i: e.i } })}</div>
    <div>
      <div class="stat-row stat-big">
        <div><span class="muted">P × I</span><b>${e.pl} × ${e.i} = ${e.score}</b></div>
        <div><span class="muted">Nível</span><b>${V.levelPill(e.level)}</b></div>
        <div><span class="muted">Perda esperada</span><b>${U.money(e.pea)}/ano</b></div>
      </div>
      <div class="callout"><b>${e.quad.nome}</b><p>${U.esc(e.quad.foco)}</p><b>Resposta para nível ${e.level.nome.toLowerCase()}</b><p>${U.esc(e.level.resp)}</p></div>
      <p>Na carteira atual este risco ficaria em <b>${rank}º lugar</b> entre ${pf.length + 1} riscos.</p>
      <p class="note">Perda esperada anual = λ × perda média por ocorrência, com λ = −ln(1 − p) e p = ${U.pct(e.p, 1)} ao ano. Perda média da distribuição triangular = (mín + provável + máx) ÷ 3 = ${U.money(e.eLoss)}.</p>
    </div></div>`;
};

/* ---- Passo 6: ações ---- */
W.step6 = (d) => {
  const e0 = W.evalDraft('inerente'), e1 = W.evalDraft('planejado');
  const rec = e0.quad.id === 'alta' ? ['prob', 'cons'] : e0.quad.id === 'moderada' ? ['prob'] : e0.quad.id === 'media' ? ['cons', 'transf'] : ['prob'];
  return `<div class="grid-3 strat">${Object.entries(DATA.ESTRATEGIAS).map(([k, v]) => `<div class="strat-box ${rec.includes(k) ? 'rec' : ''}">
    <b>${v}</b>${rec.includes(k) ? '<span class="pill st-ok"><i></i>Recomendado</span>' : ''}<small>${DATA.ALAVANCAS[k].join(' · ')}</small></div>`).join('')}</div>
  <div class="table-wrap"><table class="table"><thead><tr><th>Ação</th><th>Estratégia</th><th>Efeito</th><th class="num">Custo/ano</th><th></th></tr></thead><tbody>
    ${d.acoes.map((a, i) => `<tr><td>${U.esc(a.titulo)}<small>${U.esc(a.alavanca)}${a.prazo ? ' · prazo ' + U.dateBR(a.prazo) : ''}</small></td><td>${DATA.ESTRATEGIAS[a.estrategia]}</td><td>${V.effect(a)}</td><td class="num">${U.money(a.custo)}</td><td><button class="link" data-del="${i}">Remover</button></td></tr>`).join('') || `<tr><td colspan="5">${V.empty('Nenhuma ação ainda. Adicione abaixo ou salve o risco para tratar depois.')}</td></tr>`}
  </tbody></table></div>
  <form id="wAct" class="form form-4 add-row">
    <label class="span-2">Nova ação<input name="titulo" placeholder="Ex.: Qualificar segundo fornecedor"></label>
    <label>Estratégia<select name="estrategia" id="wEs">${Object.entries(DATA.ESTRATEGIAS).map(([k, v]) => `<option value="${k}" ${k === rec[0] ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
    <label>Alavanca<select name="alavanca" id="wAl"></select></label>
    <label>Efeito (%)<input type="number" name="ef" min="5" max="95" step="5" value="30"></label>
    <label>Franquia (R$ mil, se seguro)<input type="number" name="franquia" min="0" step="10" value="0"></label>
    <label>Custo anual (R$ mil)<input type="number" name="custo" min="0" step="10" value="100"></label>
    <label>Prazo<input type="date" name="prazo"></label>
    <button class="btn" type="submit">Adicionar ação</button>
  </form>
  <div class="stat-row stat-big">
    <div><span class="muted">Inerente</span><b>${V.levelPill(e0.level)} ${U.money(e0.pea)}/ano</b></div>
    <div><span class="muted">Residual com estas ações</span><b>${V.levelPill(e1.level)} ${U.money(e1.pea)}/ano</b></div>
    <div><span class="muted">Benefício − custo</span><b>${U.money(e0.pea - e1.pea - d.acoes.reduce((s, a) => s + a.custo, 0))}/ano</b></div>
  </div>`;
};
W.bind6 = (el, d) => {
  const es = U.$('#wEs', el), al = U.$('#wAl', el);
  const fill = () => { al.innerHTML = DATA.ALAVANCAS[es.value].map((v) => `<option>${v}</option>`).join(''); };
  es.addEventListener('change', fill); fill();
  U.$('#wAct', el).addEventListener('submit', (e) => {
    e.preventDefault();
    const f = U.formData(e.target);
    if (!f.titulo.trim()) { U.toast('Descreva a ação antes de adicionar'); return; }
    const ef = U.clamp(f.ef || 0, 0, 95) / 100;
    d.acoes.push({ titulo: f.titulo.trim(), estrategia: f.estrategia, alavanca: f.alavanca, redP: f.estrategia === 'prob' ? ef : 0, redC: f.estrategia === 'cons' ? ef : 0, cobertura: f.estrategia === 'transf' ? ef : 0, franquia: f.franquia || 0, custo: f.custo || 0, prazo: f.prazo, resp: d.resp });
    W.draw();
  });
  U.$$('[data-del]', el).forEach((b) => b.addEventListener('click', () => { d.acoes.splice(+b.dataset.del, 1); W.draw(); }));
};

W.save = () => {
  const d = App.wiz.d;
  const id = S.nextId(S.state.risks, 'R');
  const r = { ...W.draftRisk(), id, titulo: d.titulo.trim(), resp: d.resp, status: d.acoes.length ? 'Em tratamento' : 'Identificado', data: U.today(), kri: null };
  S.state.risks.push(r);
  d.acoes.forEach((a) => {
    S.state.actions.push({ ...a, id: S.nextId(S.state.actions, 'A'), riscos: [id], status: 'Planejada', progresso: 0, resp: a.resp || d.resp });
  });
  if (d.alertId) { const al = S.state.alerts.find((x) => x.id === d.alertId); if (al) { al.status = 'Convertido'; al.risco = id; } }
  App.wiz = null;
  if (W.close) W.close();
  U.toast('Risco ' + id + ' salvo no registro');
  App.go('riscos', () => { Object.assign(App.reg, App.REG0); App.mode = 'inerente'; });
  S.save();
  setTimeout(() => V.openRisk(id), 60);
};

/* ==========================================================================
   Relatório e dados (janela)
   ========================================================================== */
const X = {};

X.reportHtml = () => {
  const st = S.state, emp = st.empresa;
  const I = M.portfolio('inerente'), A = M.portfolio('atual'), P = M.portfolio('planejado');
  const cnt = (pf, id) => pf.list.filter((x) => x.e.level.id === id).length;
  const top = I.list.slice().sort((a, b) => b.e.score - a.e.score || b.e.pea - a.e.pea).slice(0, 10);
  const nodes = st.nodes.filter((n) => n.ttr != null && n.ttr > n.tts).sort((a, b) => M.nodePI(b) - M.nodePI(a));
  const kc = st.kris.filter((k) => M.kriStatus(k) === 'crit');
  const late = st.actions.filter(M.actionLate);
  const custo = st.actions.reduce((s, a) => s + a.custo, 0);
  const mat = st.principios.reduce((s, p) => s + p.nota, 0) / 40;
  const byCat = DATA.CATEGORIAS.map((c) => ({ c, v: I.list.filter((x) => x.r.cat === c.id).reduce((s, x) => s + x.e.pea, 0) })).sort((a, b) => b.v - a.v);
  return `<article class="report">
    <header class="report-head"><span class="eyebrow">Relatório de riscos da cadeia de suprimentos</span><h2>${U.esc(emp.nome)}</h2>
      <p class="muted">${U.esc(emp.setor)} · ${U.esc(emp.sede)} · emitido em ${U.dateBR(U.today())}</p></header>
    <h3>1. Resumo executivo</h3>
    <p>A carteira tem <b>${I.list.length} riscos ativos</b> em ${new Set(I.list.map((x) => x.r.no)).size} elos da cadeia. Sem nenhuma ação, ${cnt(I, 'critico')} seriam críticos e ${cnt(I, 'alto')} altos, com perda esperada de <b>${U.money(I.pea)} por ano</b> (${U.pct(I.pea / emp.receitaAnual, 1)} da receita). Com as ações já executadas a perda esperada cai para <b>${U.money(A.pea)}</b>; com o plano completo, para <b>${U.money(P.pea)}</b>, uma redução de ${U.pct((I.pea - P.pea) / I.pea)} a um custo de ${U.money(custo)} por ano.</p>
    <p>As categorias com maior exposição são ${byCat.slice(0, 3).map((x) => `${x.c.nome.toLowerCase()} (${U.money(x.v)})`).join(', ')}. ${nodes.length ? `O elo mais fraco é <b>${U.esc(nodes[0].nome)}</b>: recupera em ${U.wk(nodes[0].ttr)} semanas, mas a empresa só sobrevive ${U.wk(nodes[0].tts)} semanas sem ele, o que expõe ${U.money(M.nodePI(nodes[0]))} de margem.` : ''} ${kc.length ? `${kc.length} indicadores estão no limite crítico, com destaque para ${kc.slice(0, 2).map((k) => U.esc(k.nome)).join(' e ')}.` : ''} ${late.length ? `${late.length} ações estão atrasadas.` : ''} O índice de maturidade nos dez princípios é ${U.pct(mat)}.</p>
    <h3>2. Riscos prioritários (inerente)</h3>
    <div class="table-wrap"><table class="table"><thead><tr><th>ID</th><th>Risco</th><th>Elo</th><th>P×I</th><th class="num">Perda esperada</th><th>Residual planejado</th><th>Responsável</th></tr></thead><tbody>
      ${top.map(({ r, e }) => { const p = M.evalRisk(r, 'planejado'); return `<tr><td class="mono">${r.id}</td><td>${U.esc(r.titulo)}</td><td>${U.esc(V.nodeName(r.no))}</td><td>${V.scoreCell(e)}</td><td class="num">${U.money(e.pea)}</td><td>${V.levelPill(p.level)} ${U.money(p.pea)}</td><td>${U.esc(r.resp)}</td></tr>`; }).join('')}
    </tbody></table></div>
    <h3>3. Elos vulneráveis (TTR maior que TTS)</h3>
    <div class="table-wrap"><table class="table"><thead><tr><th>Elo</th><th class="num">TTR (sem.)</th><th class="num">TTS (sem.)</th><th class="num">Lacuna</th><th class="num">Margem exposta</th></tr></thead><tbody>
      ${nodes.map((n) => `<tr><td>${U.esc(n.nome)}</td><td class="num">${U.wk(n.ttr)}</td><td class="num">${U.wk(n.tts)}</td><td class="num">${U.num(n.ttr - n.tts, 1)}</td><td class="num">${U.money(M.nodePI(n))}</td></tr>`).join('')}
    </tbody></table></div>
    <h3>4. Situação do plano de ações</h3>
    <p>${st.actions.length} ações: ${st.actions.filter((a) => a.status === 'Concluída').length} concluídas, ${st.actions.filter((a) => a.status === 'Em andamento').length} em andamento e ${st.actions.filter((a) => a.status === 'Planejada').length} planejadas. ${late.length ? 'Atrasadas: ' + late.map((a) => `${a.id} (${U.esc(a.titulo)})`).join('; ') + '.' : 'Nenhuma ação atrasada.'}</p>
    <h3>5. Indicadores fora do limite</h3>
    <ul class="plain bullets">${st.kris.filter((k) => M.kriStatus(k) !== 'ok').map((k) => `<li>${V.statusPill(M.kriStatus(k))} <b>${U.esc(k.nome)}</b>: ${U.num(k.hist[11], k.dec)} ${U.esc(k.unidade)} em ${DATA.MESES[11]}</li>`).join('')}</ul>
  </article>`;
};

X.report = () => {
  const close = U.modal({
    title: 'Relatório e dados', wide: true,
    body: `<div class="toolbar report-tools">
        <button class="btn" id="exRisk">Riscos (CSV)</button>
        <button class="btn" id="exJson">Backup (JSON)</button>
        <label class="btn file-btn">Importar backup<input type="file" id="imJson" accept=".json,application/json"></label>
        <button class="btn btn-quiet" id="reset">Restaurar demonstração</button>
        ${U.framed ? '' : '<button class="btn btn-primary" id="print">Imprimir</button>'}
      </div>
      <p class="muted small report-tools">Os dados ficam salvos neste navegador. Use o backup em JSON para levar a base para outro computador ou compartilhar com o grupo.</p>
      ${X.reportHtml()}`,
    onMount: (w) => {
      U.$('#exRisk', w).addEventListener('click', App.exportRisksCsv);
      U.$('#exJson', w).addEventListener('click', () => U.download('riscogcs-backup.json', JSON.stringify(S.state, null, 2), 'application/json'));
      U.$('#imJson', w).addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const rd = new FileReader();
        rd.onload = () => {
          try {
            const d = JSON.parse(rd.result);
            if (!d || !Array.isArray(d.risks) || !Array.isArray(d.nodes) || d.versao !== 4) throw new Error('formato');
            S.state = d; close(); App.refresh(); U.toast('Backup importado: ' + d.risks.length + ' riscos');
          } catch (err) { U.toast('Arquivo inválido: use um backup gerado por este sistema'); }
        };
        rd.readAsText(file);
      });
      U.$('#reset', w).addEventListener('click', () => U.confirm('Substituir todos os dados pelos dados de demonstração? Alterações feitas serão perdidas.', () => {
        S.reset(); App.wiz = null; close(); App.render(); U.toast('Dados de demonstração restaurados');
      }, 'Restaurar'));
      const pb = U.$('#print', w);
      if (pb) pb.addEventListener('click', () => {
        document.body.classList.add('printing');
        window.addEventListener('afterprint', () => document.body.classList.remove('printing'), { once: true });
        window.print();
      });
    },
  });
};

/* ==========================================================================
   Sobre: metodologia e autoavaliação dos dez princípios (janela)
   ========================================================================== */
X.aboutTab = 'met';

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
      <div class="maturity"><span class="kpi-value">${U.pct(tot / (pr.length * 4))}</span><span class="muted">maturidade · ${tot} de ${pr.length * 4} pontos</span></div>
      ${C.radar(pr.map((_, i) => 'P' + (i + 1)), pr.map((p) => p.nota))}
      <h4>Prioridades de melhoria</h4>
      <ol class="plain bullets">${weakest.map(({ p, i }) => `<li><b>P${i + 1}.</b> ${U.esc(DATA.PRINCIPIOS[i])} <span class="muted">(${DATA.MATURIDADE[p.nota]})</span></li>`).join('')}</ol>
    </div>
    <div class="principles">${pr.map((p, i) => `<div class="principle">
      <div class="pr-head"><span class="pr-n">${i + 1}</span><b>${U.esc(DATA.PRINCIPIOS[i])}</b></div>
      <div class="seg seg-5" role="group" aria-label="Nota do princípio ${i + 1}">${DATA.MATURIDADE.map((m, v) => `<button type="button" data-pr="${i}" data-v="${v}" aria-pressed="${p.nota === v}" data-tip="${m}">${v}</button>`).join('')}<span class="seg-lab">${DATA.MATURIDADE[p.nota]}</span></div>
      <p class="auto"><span class="label">Dado do sistema</span> ${U.esc(auto[i])}</p>
      <textarea data-ev="${i}" rows="2" aria-label="Evidência do princípio ${i + 1}">${U.esc(p.evidencia)}</textarea>
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
        <li><b>Painel:</b> clique nos indicadores do topo para ir direto ao assunto; clique num elo do mapa para ver riscos, indicadores e fornecedores dele.</li>
        <li><b>Riscos:</b> clique em células da matriz, níveis e categorias para filtrar; “Nova análise” conduz os 6 passos do processo.</li>
        <li><b>Ações:</b> clique numa estratégia ou status para filtrar; clique numa ação para editar o progresso.</li>
        <li><b>Monitoramento:</b> atualize a leitura dos indicadores e transforme sinais em riscos.</li>
        <li><b>Simulações:</b> Monte Carlo da perda anual e simulador de interrupção (resposta ágil × tardia).</li>
      </ol>
      <h3>Premissas e limites</h3>
      <ul class="plain bullets">
        <li>Todos os dados são fictícios e servem para demonstração.</li>
        <li>Os riscos são independentes no Monte Carlo; na prática, um evento grande pode disparar outros.</li>
        <li>O impacto é ordinal (1 a 5); reduzir a consequência em X% é uma aproximação para mover o risco na matriz.</li>
        <li>Os dados ficam no navegador de quem usa (localStorage); não há servidor nem login.</li>
      </ul>
    </div>
    <div class="prose">
      <h3>Fórmulas</h3>
      <dl class="formulas">
        <dt>Nível do risco</dt><dd>P×I, com P e I de 1 a 5. Baixo 1–4 · Moderado 5–9 · Alto 10–14 · Crítico 15–25. I = pior nota entre pessoas, reputação, processos e financeiro.</dd>
        <dt>Perda esperada anual</dt><dd>λ × perda média, com λ = −ln(1 − p) e perda média = (mín + provável + máx) ÷ 3.</dd>
        <dt>Risco residual</dt><dd>p<sub>res</sub> = p × Π(1 − redução de probabilidade); perda<sub>res</sub> = perda × Π(1 − redução de consequência). Ações em andamento pesam pelo % de progresso no cenário atual.</dd>
        <dt>Transferência</dt><dd>Perda retida = mín(perda, franquia) + (perda − franquia) × (1 − cobertura).</dd>
        <dt>Impacto do elo</dt><dd>máx(0, TTR − TTS) × receita semanal dependente × margem de contribuição.</dd>
        <dt>Monte Carlo</dt><dd>Eventos ~ Poisson(λ) e perda por evento ~ Triangular. VaR 95% = percentil 95; CVaR 95% = média dos 5% piores anos.</dd>
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

X.about = (tab) => {
  if (tab) X.aboutTab = tab;
  U.modal({ title: 'Sobre o módulo', xl: true, body: '<div id="aboutHost"></div>' });
  X.drawAbout();
};

X.drawAbout = () => {
  const host = U.$('#aboutHost');
  if (!host) return;
  const scroll = host.closest('.modal-body').scrollTop;
  host.innerHTML = `<div class="subtabs">${V.seg('ab', [['met', 'Como funciona'], ['pr', 'Dez princípios (autoavaliação)']], X.aboutTab, 'Sobre')}</div>
    ${X.aboutTab === 'pr' ? X.principiosHtml() : X.metodologiaHtml()}`;
  host.closest('.modal-body').scrollTop = scroll;
  U.$$('[data-ab]', host).forEach((b) => b.addEventListener('click', () => { X.aboutTab = b.dataset.ab; X.drawAbout(); host.closest('.modal-body').scrollTop = 0; }));
  U.$$('[data-pr]', host).forEach((b) => b.addEventListener('click', () => { S.state.principios[+b.dataset.pr].nota = +b.dataset.v; S.save(); X.drawAbout(); }));
  U.$$('[data-ev]', host).forEach((t) => t.addEventListener('change', () => { S.state.principios[+t.dataset.ev].evidencia = t.value; S.save(); U.toast('Evidência salva'); }));
};
