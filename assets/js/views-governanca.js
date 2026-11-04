/* ==========================================================================
   views-governanca.js — Dez princípios, Relatório e dados, Metodologia
   ========================================================================== */

/* Evidências calculadas a partir dos dados do sistema para cada princípio */
App.autoEvid = () => {
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

App.views.principios = (el) => {
  const pr = S.state.principios;
  const auto = App.autoEvid();
  const tot = pr.reduce((s, p) => s + p.nota, 0);
  const idx = tot / (pr.length * 4);
  const weakest = pr.map((p, i) => ({ p, i })).sort((a, b) => a.p.nota - b.p.nota).slice(0, 3);
  el.innerHTML = `
  <section class="grid-2 grid-wide-right">
    <div class="card">
      <div class="card-head"><h3>Índice de maturidade</h3></div>
      <div class="maturity"><span class="kpi-value">${U.pct(idx)}</span><span class="muted">${tot} de ${pr.length * 4} pontos</span></div>
      ${C.radar(pr.map((_, i) => 'P' + (i + 1)), pr.map((p) => p.nota))}
      <h4>Prioridades de melhoria</h4>
      <ol class="plain bullets">${weakest.map(({ p, i }) => `<li><b>P${i + 1}.</b> ${U.esc(DATA.PRINCIPIOS[i])} <span class="muted">(${DATA.MATURIDADE[p.nota]})</span></li>`).join('')}</ol>
    </div>
    <div class="card">
      <div class="card-head"><h3>Autoavaliação</h3><span class="muted">0 inexistente · 1 inicial · 2 parcial · 3 estabelecido · 4 otimizado</span></div>
      <div class="principles">${pr.map((p, i) => `<div class="principle">
        <div class="pr-head"><span class="pr-n">${i + 1}</span><b>${U.esc(DATA.PRINCIPIOS[i])}</b></div>
        <div class="seg seg-5" role="group" aria-label="Nota do princípio ${i + 1}">${DATA.MATURIDADE.map((m, v) => `<button data-pr="${i}" data-v="${v}" aria-pressed="${p.nota === v}" data-tip="${m}">${v}</button>`).join('')}<span class="seg-lab">${DATA.MATURIDADE[p.nota]}</span></div>
        <p class="auto"><span class="label">Dado do sistema</span> ${U.esc(auto[i])}</p>
        <label class="label" for="ev${i}">Evidência</label><textarea id="ev${i}" data-ev="${i}" rows="2">${U.esc(p.evidencia)}</textarea>
      </div>`).join('')}</div>
    </div>
  </section>`;
  U.$$('[data-pr]', el).forEach((b) => b.addEventListener('click', () => { pr[+b.dataset.pr].nota = +b.dataset.v; App.refresh(); }));
  U.$$('[data-ev]', el).forEach((t) => t.addEventListener('change', () => { pr[+t.dataset.ev].evidencia = t.value; S.save(); U.toast('Evidência salva'); }));
};

/* ---------------- Relatório e dados ---------------- */
App.views.relatorio = (el) => {
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

  el.innerHTML = `
  <section class="card toolbar-card">
    <div class="toolbar">
      <button class="btn" id="exRisk">Exportar riscos (CSV)</button>
      <button class="btn" id="exJson">Backup completo (JSON)</button>
      <label class="btn file-btn">Importar backup<input type="file" id="imJson" accept=".json,application/json"></label>
      <button class="btn btn-quiet" id="reset">Restaurar dados de demonstração</button>
      ${U.framed ? '' : '<button class="btn btn-primary" id="print">Imprimir relatório</button>'}
    </div>
    <p class="muted small">Os dados ficam salvos neste navegador. Use o backup em JSON para levar a base para outro computador ou compartilhar com o grupo.</p>
  </section>
  <article class="card report">
    <header class="report-head"><span class="eyebrow">Relatório de riscos da cadeia de suprimentos</span><h2>${U.esc(emp.nome)}</h2>
      <p class="muted">${U.esc(emp.setor)} · ${U.esc(emp.sede)} · emitido em ${U.dateBR(U.today())}</p></header>
    <h3>1. Resumo executivo</h3>
    <p>A carteira tem <b>${I.list.length} riscos ativos</b> distribuídos por ${new Set(I.list.map((x) => x.r.no)).size} elos da cadeia. Sem nenhuma ação, ${cnt(I, 'critico')} seriam críticos e ${cnt(I, 'alto')} altos, com perda esperada de <b>${U.money(I.pea)} por ano</b> (${U.pct(I.pea / emp.receitaAnual, 1)} da receita). Com as ações já executadas a perda esperada cai para <b>${U.money(A.pea)}</b>; com o plano completo, para <b>${U.money(P.pea)}</b>, uma redução de ${U.pct((I.pea - P.pea) / I.pea)} a um custo de ${U.money(custo)} por ano.</p>
    <p>As categorias com maior exposição são ${byCat.slice(0, 3).map((x) => `${x.c.nome.toLowerCase()} (${U.money(x.v)})`).join(', ')}. ${nodes.length ? `O elo mais fraco é <b>${U.esc(nodes[0].nome)}</b>: recupera em ${U.wk(nodes[0].ttr)} semanas, mas a empresa só sobrevive ${U.wk(nodes[0].tts)} semanas sem ele, o que expõe ${U.money(M.nodePI(nodes[0]))} de margem.` : ''} ${kc.length ? `${kc.length} indicadores estão no limite crítico, com destaque para ${kc.slice(0, 2).map((k) => U.esc(k.nome)).join(' e ')}.` : ''} ${late.length ? `${late.length} ações estão atrasadas.` : ''} O índice de maturidade nos dez princípios é ${U.pct(mat)}.</p>
    <h3>2. Riscos prioritários (inerente)</h3>
    <div class="table-wrap"><table class="table"><thead><tr><th>ID</th><th>Risco</th><th>Elo</th><th>P×I</th><th>Nível</th><th class="num">Perda esperada</th><th>Residual planejado</th><th>Responsável</th></tr></thead><tbody>
      ${top.map(({ r, e }) => { const p = M.evalRisk(r, 'planejado'); return `<tr><td class="mono">${r.id}</td><td>${U.esc(r.titulo)}</td><td>${U.esc(V.nodeName(r.no))}</td><td>${V.scoreCell(e)}</td><td>${V.levelPill(e.level)}</td><td class="num">${U.money(e.pea)}</td><td>${V.levelPill(p.level)} ${U.money(p.pea)}</td><td>${U.esc(r.resp)}</td></tr>`; }).join('')}
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

  U.$('#exRisk', el).addEventListener('click', App.exportRisksCsv);
  U.$('#exJson', el).addEventListener('click', () => U.download('riscogcs-backup.json', JSON.stringify(S.state, null, 2), 'application/json'));
  U.$('#imJson', el).addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const d = JSON.parse(rd.result);
        if (!d || !Array.isArray(d.risks) || !Array.isArray(d.nodes) || d.versao !== 4) throw new Error('formato');
        S.state = d; App.refresh(); U.toast('Backup importado: ' + d.risks.length + ' riscos');
      } catch (err) { U.toast('Arquivo inválido: use um backup gerado por este sistema'); }
    };
    rd.readAsText(file);
  });
  U.$('#reset', el).addEventListener('click', () => U.confirm('Substituir todos os dados pelos dados de demonstração? Alterações feitas serão perdidas.', () => { S.reset(); App.wiz = null; App.render(); U.toast('Dados de demonstração restaurados'); }, 'Restaurar'));
  const pb = U.$('#print', el);
  if (pb) pb.addEventListener('click', () => window.print());
};

/* ---------------- Metodologia ---------------- */
App.views.metodologia = (el) => {
  const map = [
    ['Caso Nokia × Ericsson (incêndio na Philips)', 'Simulador de interrupção; Indicadores e alertas', 'Compara resposta ágil e tardia e mostra o valor de detectar sinais fracos.'],
    ['Risco = probabilidade × impacto', 'Registro, Matriz, Nova análise', 'Escalas de 1 a 5 e pontuação P×I de 1 a 25 com quatro níveis.'],
    ['Risco em suprimento, operação e demanda', 'Rede da cadeia', 'Mapa dos elos de fornecedores nível 2 até clientes, com riscos em cada elo.'],
    ['Impacto financeiro das interrupções', 'Rede (TTR × TTS); Monte Carlo', 'Margem perdida por elo e distribuição de perdas anuais em R$.'],
    ['Fases de uma interrupção', 'Simulador de interrupção', 'Curva de desempenho com as 8 fases marcadas no gráfico.'],
    ['Tipos de risco: aleatório, acidental, intencional', 'Todas as telas de risco', 'Cada risco tem natureza; o sistema sugere como estimar e tratar.'],
    ['Nove categorias de fatores de risco', 'Registro; Nova análise (passo 2)', 'Categorias com os fatores típicos da aula como ponto de partida.'],
    ['Dez princípios', 'Dez princípios', 'Autoavaliação com radar e evidências calculadas pelo sistema.'],
    ['Processo em seis passos', 'Nova análise (6 passos)', 'Assistente que conduz do elo escolhido até as ações.'],
    ['Mapa de vulnerabilidade e ferramenta de pontuação', 'Matriz de vulnerabilidade', 'Matriz 5×5, quadrantes 2×2 e critérios explícitos por dimensão.'],
    ['Reduzir probabilidade, reduzir consequência, transferir', 'Plano de ações; Monte Carlo', 'Efeito de cada ação no risco residual e retorno por real investido.'],
    ['Seguros e resseguro', 'Plano de ações', 'Seguros com franquia e cobertura reduzem só a parte financeira retida.'],
  ];
  el.innerHTML = `
  <section class="grid-2">
    <div class="card prose">
      <h3>Problema logístico</h3>
      <p>Cadeias globais de suprimentos ficam expostas a eventos em qualquer elo: um incêndio num fornecedor de nível 2, uma greve no porto ou um ataque ao sistema de pedidos. A empresa fictícia NordEletro, fabricante de eletrodomésticos em Suape (PE), depende de placas eletrônicas e compressores da Ásia, aço e motores do Sul e Sudeste e de uma única fábrica. O sistema ajuda a responder: quais riscos importam mais, onde está o elo mais fraco, quanto a empresa pode perder num ano e quais ações dão mais retorno.</p>
      <h3>Fluxo do sistema</h3>
      <p><b>Entrada:</b> elos da rede com TTR, TTS e receita dependente; riscos com categoria, natureza, nível de probabilidade, notas de impacto e faixa de perda; ações com efeito e custo; leituras dos indicadores; dados dos fornecedores.</p>
      <p><b>Processamento:</b> pontuação P×I e nível; quadrante de vulnerabilidade; perda esperada anual; risco residual com as ações; simulação de Monte Carlo; simulação diária de interrupção; nota de fornecedores e HHI.</p>
      <p><b>Saída:</b> painel, matriz, ranking de riscos, curva de excedência, perfil de interrupção, retorno das ações, alertas e relatório exportável.</p>
    </div>
    <div class="card prose">
      <h3>Fórmulas</h3>
      <dl class="formulas">
        <dt>Nível do risco</dt><dd>P×I, com P e I de 1 a 5. Baixo 1–4 · Moderado 5–9 · Alto 10–14 · Crítico 15–25. I = pior nota entre pessoas, reputação, processos e financeiro.</dd>
        <dt>Perda esperada anual</dt><dd>λ × perda média, com λ = −ln(1 − p) e perda média da triangular = (mín + provável + máx) ÷ 3.</dd>
        <dt>Risco residual</dt><dd>p<sub>res</sub> = p × Π(1 − redução de probabilidade); perda<sub>res</sub> = perda × Π(1 − redução de consequência). Ações em andamento pesam pelo % de progresso no cenário atual.</dd>
        <dt>Transferência</dt><dd>Perda retida = mín(perda, franquia) + (perda − franquia) × (1 − cobertura).</dd>
        <dt>Impacto do elo</dt><dd>máx(0, TTR − TTS) × receita semanal dependente × margem de contribuição.</dd>
        <dt>Monte Carlo</dt><dd>Para cada ano simulado: eventos ~ Poisson(λ) e perda por evento ~ Triangular. VaR 95% = percentil 95; CVaR 95% = média dos 5% piores anos.</dd>
        <dt>Fornecedores</dt><dd>Nota = média ponderada de seis critérios de 0 a 100. HHI = Σ (participação %)².</dd>
      </dl>
    </div>
  </section>
  <section class="card">
    <div class="card-head"><h3>Conceitos da aula aplicados</h3></div>
    <div class="table-wrap"><table class="table"><thead><tr><th>Conceito</th><th>Onde aparece</th><th>Como foi aplicado</th></tr></thead><tbody>
      ${map.map((m) => `<tr><td><b>${m[0]}</b></td><td>${m[1]}</td><td>${m[2]}</td></tr>`).join('')}
    </tbody></table></div>
  </section>
  <section class="grid-2">
    <div class="card prose">
      <h3>Premissas e limites</h3>
      <ul class="plain bullets">
        <li>Todos os dados são fictícios e servem para demonstração.</li>
        <li>Os riscos são tratados como independentes no Monte Carlo; na prática, um evento grande pode disparar outros (correlação).</li>
        <li>O impacto é ordinal (1 a 5); reduzir a consequência em X% é uma aproximação para mover o risco na matriz.</li>
        <li>O simulador de interrupção usa um único insumo crítico e demanda constante.</li>
        <li>Os dados ficam no navegador de quem usa (localStorage); não há servidor nem login.</li>
      </ul>
      <h3>Inspiração em ferramentas reais</h3>
      <p>Registro e matriz de riscos seguem a lógica da ISO 31000 e de módulos de GRC corporativos. Mapeamento multinível e monitoramento de eventos se inspiram em plataformas de risco de cadeia como Resilinc, Everstream e Interos. A análise TTR × TTS segue o modelo usado pela Ford e descrito por Simchi-Levi e coautores. A curva de excedência de perdas é usada em quantificação de risco como no método FAIR.</p>
    </div>
    <div class="card prose">
      <h3>Referências</h3>
      <ul class="plain refs">
        <li>CORRÊA, Henrique Luiz. <i>Administração de cadeias de suprimentos e logística: integração na era da Indústria 4.0</i>. 2. ed. São Paulo: Atlas, 2019.</li>
        <li>ABNT. <i>NBR ISO 31000: Gestão de riscos — Diretrizes</i>. Rio de Janeiro, 2018.</li>
        <li>SHEFFI, Yossi. <i>The Resilient Enterprise: Overcoming Vulnerability for Competitive Advantage</i>. Cambridge: MIT Press, 2005.</li>
        <li>SIMCHI-LEVI, David; SCHMIDT, William; WEI, Yehua. From superstorms to factory fires: managing unpredictable supply-chain disruptions. <i>Harvard Business Review</i>, jan.–fev. 2014.</li>
        <li>CHOPRA, Sunil; SODHI, ManMohan. Managing risk to avoid supply-chain breakdown. <i>MIT Sloan Management Review</i>, v. 46, n. 1, 2004.</li>
        <li>ALTMAN, Edward. Financial ratios, discriminant analysis and the prediction of corporate bankruptcy. <i>Journal of Finance</i>, v. 23, n. 4, 1968.</li>
        <li>HUBBARD, Douglas; SEIERSEN, Richard. <i>How to Measure Anything in Cybersecurity Risk</i>. Hoboken: Wiley, 2016.</li>
      </ul>
    </div>
  </section>`;
};
