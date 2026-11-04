/* ==========================================================================
   views-analise.js — Assistente do processo de gestão de riscos em 6 passos
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

App.views.analise = (el) => {
  if (App.wizardPrefill) { App.wiz = W.fresh(App.wizardPrefill); App.wizardPrefill = null; }
  if (!App.wiz) App.wiz = W.fresh();
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
  U.$$('[data-step]', el).forEach((b) => b.addEventListener('click', () => { const t = +b.dataset.step; if (t < w.step || !valid()) { w.step = t; App.render(); } else err(valid()); }));
  const next = U.$('#wizNext', el);
  if (next) next.addEventListener('click', () => { const m = valid(); if (m) return err(m); w.step++; App.render(); window.scrollTo({ top: 0 }); });
  const back = U.$('#wizBack', el);
  if (back) back.addEventListener('click', () => { w.step--; App.render(); });
  U.$('#wizReset', el).addEventListener('click', () => U.confirm('Descartar esta análise e recomeçar?', () => { App.wiz = W.fresh(); App.render(); }, 'Recomeçar'));
  const save = U.$('#wizSave', el);
  if (save) save.addEventListener('click', W.save);
  W['bind' + w.step] && W['bind' + w.step](el, d);
};

/* ---- Passo 1: processo ou recurso ---- */
W.step1 = (d) => `<div class="node-pick">${DATA.CAMADAS.map((c, i) => `<div><h4>${c}</h4>${S.state.nodes.filter((n) => n.camada === i).map((n) => `
  <button class="pick ${d.no === n.id ? 'on' : ''}" data-pick="${n.id}"><b>${U.esc(n.nome)}</b><small>${U.esc(n.papel)}</small>
  <small class="muted">${U.plural(M.nodeRisks(n.id).length, 'risco registrado', 'riscos registrados')}${n.ttr != null ? ` · TTR ${U.wk(n.ttr)} / TTS ${U.wk(n.tts)} sem.` : ''}</small></button>`).join('')}</div>`).join('')}</div>
  <p class="note">Comece pelos elos críticos: fonte única, receita alta dependente ou tempo de recuperação maior que o tempo de sobrevivência.</p>`;
W.bind1 = (el, d) => U.$$('[data-pick]', el).forEach((b) => b.addEventListener('click', () => { d.no = b.dataset.pick; App.render(); }));

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
  U.$('#wCat', el).addEventListener('change', (e) => { d.cat = e.target.value; App.render(); });
  U.$('#wTitulo', el).addEventListener('input', (e) => { d.titulo = e.target.value; });
  U.$('#wCausa', el).addEventListener('input', (e) => { d.causa = e.target.value; });
  U.$('#wCons', el).addEventListener('input', (e) => { d.consequencia = e.target.value; });
  U.$('#wResp', el).addEventListener('input', (e) => { d.resp = e.target.value; });
  U.$$('[data-fator]', el).forEach((b) => b.addEventListener('click', () => { if (!d.titulo) d.titulo = b.dataset.fator + ' — ' + V.nodeName(d.no); App.render(); }));
  U.$$('[data-tipo]', el).forEach((b) => b.addEventListener('click', () => { d.tipo = b.dataset.tipo; App.render(); }));
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
  U.$$('[data-p]', el).forEach((b) => b.addEventListener('click', () => { d.p = +b.dataset.p; App.render(); }));
  const calc = () => {
    const k = Math.max(0, +U.$('#cK', el).value || 0), n = Math.max(1, +U.$('#cN', el).value || 1);
    const p = 1 - Math.exp(-(k + 0.5) / n), lv = M.pLevel(p);
    U.$('#cOut', el).innerHTML = `<span>${U.pct(p, 1)} ao ano → nível <b>${lv} · ${DATA.PROB[lv - 1].nome}</b></span><button class="btn btn-small" id="cApply" data-lv="${lv}">Usar nível ${lv}</button>`;
    U.$('#cApply', el).addEventListener('click', () => { d.p = lv; App.render(); });
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
  U.$$('[data-dim]', el).forEach((b) => b.addEventListener('click', () => { d.dims[b.dataset.dim] = +b.dataset.v; App.render(); }));
  U.$$('[data-sev]', el).forEach((inp) => inp.addEventListener('input', () => { d.sev[+inp.dataset.sev] = Math.max(0, +inp.value || 0); out(); }));
  const un = U.$('#useNet', el);
  if (un) un.addEventListener('click', () => {
    const v = Math.round(M.nodePI(S.node(d.no)));
    if (v > 0) { d.sev = [Math.round(v * 0.3), v, Math.round(v * 3)]; App.render(); } else U.toast('Este elo tem TTS maior que TTR: a perda pela rede seria zero.');
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
    App.render();
  });
  U.$$('[data-del]', el).forEach((b) => b.addEventListener('click', () => { d.acoes.splice(+b.dataset.del, 1); App.render(); }));
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
  S.save();
  U.toast('Risco ' + id + ' salvo no registro');
  App.go('riscos');
  setTimeout(() => V.openRisk(id), 60);
};
