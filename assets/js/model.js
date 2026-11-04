/* ==========================================================================
   model.js — estado, persistência e todos os cálculos de risco
   ========================================================================== */
const S = { state: null, KEY: 'riscogcs-nordeletro-v4' };

S.load = () => {
  const saved = U.storage.get(S.KEY);
  S.state = saved && saved.versao === 4 ? saved : DATA.seed();
};
S.save = () => U.storage.set(S.KEY, S.state);
S.reset = () => { S.state = DATA.seed(); S.save(); };

S.node = (id) => S.state.nodes.find((n) => n.id === id);
S.risk = (id) => S.state.risks.find((r) => r.id === id);
S.kri = (id) => S.state.kris.find((k) => k.id === id);
S.cat = (id) => DATA.CATEGORIAS.find((c) => c.id === id) || { nome: id };
S.nextId = (list, prefix) => {
  const max = list.reduce((m, x) => Math.max(m, parseInt(String(x.id).replace(/\D/g, ''), 10) || 0), 0);
  return prefix + String(max + 1).padStart(2, '0');
};

/* ---------------- Escalas e classificação ---------------- */
const M = {};
M.pOf = (lvl) => DATA.PROB[U.clamp(lvl, 1, 5) - 1].p;
M.pLevel = (p) => (p < 0.01 ? 1 : p < 0.05 ? 2 : p < 0.2 ? 3 : p < 0.5 ? 4 : 5);
M.finLevel = (mil) => { const L = DATA.FIN_LIMITS; return mil < L[0] ? 1 : mil < L[1] ? 2 : mil < L[2] ? 3 : mil < L[3] ? 4 : 5; };

/* Impacto = pior dimensão (critério conservador usado em matrizes corporativas) */
M.impact = (r) => Math.max(r.dims.pessoas, r.dims.reputacao, r.dims.operacao, M.finLevel(r.sev[1]));

M.LEVELS = [
  { id: 'baixo', nome: 'Baixo', min: 1, resp: 'Aceitar e monitorar com procedimentos de rotina.' },
  { id: 'moderado', nome: 'Moderado', min: 5, resp: 'Tratar com responsável definido e acompanhar indicadores.' },
  { id: 'alto', nome: 'Alto', min: 10, resp: 'Tratar com prioridade; plano de ação aprovado pela diretoria.' },
  { id: 'critico', nome: 'Crítico', min: 15, resp: 'Ação imediata; plano de ação e de contingência acompanhados pela alta direção.' },
];
M.level = (s) => (s >= 15 ? M.LEVELS[3] : s >= 10 ? M.LEVELS[2] : s >= 5 ? M.LEVELS[1] : M.LEVELS[0]);

/* Mapa de vulnerabilidade (2×2): probabilidade alta = nível ≥ 3 (≥ 5% ao ano); consequência severa = nível ≥ 4 (grande ou catastrófica) */
M.QUADS = {
  alta: { id: 'alta', nome: 'Vulnerabilidade alta', foco: 'Prevenção + redundância, flexibilidade e agilidade; avaliar transferência.' },
  moderada: { id: 'moderada', nome: 'Vulnerabilidade moderada', foco: 'Prevenção: reduzir a probabilidade (processos robustos, monitoramento).' },
  media: { id: 'media', nome: 'Vulnerabilidade média', foco: 'Reduzir consequências: redundância, flexibilidade, agilidade; considerar seguro.' },
  baixa: { id: 'baixa', nome: 'Vulnerabilidade baixa', foco: 'Aceitar e monitorar; ações de baixo custo.' },
};
M.quad = (p, i) => (p >= 3 && i >= 4 ? M.QUADS.alta : p >= 3 ? M.QUADS.moderada : i >= 4 ? M.QUADS.media : M.QUADS.baixa);

/* Frequência anual: se P(≥1 evento no ano) = p, a taxa de Poisson é λ = −ln(1 − p) */
M.lambda = (p) => -Math.log(1 - Math.min(p, 0.999));

/* Inversa da distribuição triangular (mín, moda, máx) */
M.triInv = (u, a, b, c) => {
  if (c <= a) return a;
  const F = (b - a) / (c - a);
  return u < F ? a + Math.sqrt(u * (c - a) * (b - a)) : c - Math.sqrt((1 - u) * (c - a) * (c - b));
};

/* Perda retida depois de seguros/hedges: franquia fica com a empresa, o excesso é coberto em c% */
M.retain = (x, ins) => ins.reduce((v, s) => Math.min(v, s.f) + Math.max(0, v - s.f) * (1 - s.c), x);

M.expRetained = (sev, ins) => {
  if (!ins.length) return (sev[0] + sev[1] + sev[2]) / 3;
  let s = 0; const N = 200;
  for (let k = 0; k < N; k++) s += M.retain(M.triInv((k + 0.5) / N, sev[0], sev[1], sev[2]), ins);
  return s / N;
};

/* Peso de uma ação conforme o cenário avaliado */
M.MODES = { inerente: 'Inerente', atual: 'Residual atual', planejado: 'Residual planejado' };
M.weight = (a, mode) => {
  if (mode === 'inerente') return 0;
  if (mode === 'planejado') return 1;
  if (a.status === 'Concluída') return 1;
  if (a.status === 'Em andamento') return (a.progresso || 0) / 100;
  return 0;
};
M.actionsOf = (rid) => S.state.actions.filter((a) => a.riscos.includes(rid));

/* Avalia um risco num cenário: probabilidade, impacto, nível, quadrante e perda esperada anual */
M.evalRisk = (r, mode = 'inerente', skipActionId = null) => {
  let p = M.pOf(r.p), cf = 1;
  const ins = [];
  if (mode !== 'inerente') {
    M.actionsOf(r.id).forEach((a) => {
      if (a.id === skipActionId) return;
      const w = M.weight(a, mode);
      if (!w) return;
      p *= 1 - (a.redP || 0) * w;
      cf *= 1 - (a.redC || 0) * w;
      if (a.estrategia === 'transf' && a.cobertura) ins.push({ f: a.franquia || 0, c: a.cobertura * w });
    });
  }
  const sev = r.sev.map((x) => x * cf);
  const pl = mode === 'inerente' ? r.p : M.pLevel(p);
  const red = (v) => Math.max(1, Math.ceil(v * cf - 1e-9));
  const finRes = M.finLevel(M.retain(sev[1], ins));
  const i = mode === 'inerente' ? M.impact(r) : Math.max(red(r.dims.pessoas), red(r.dims.reputacao), red(r.dims.operacao), finRes);
  const score = pl * i;
  const lam = M.lambda(p);
  const eLoss = M.expRetained(sev, ins);
  return { p, pl, i, score, level: M.level(score), quad: M.quad(pl, i), sev, ins, cf, lam, eLoss, pea: lam * eLoss };
};

M.portfolio = (mode) => {
  const rs = S.state.risks.filter((r) => r.status !== 'Encerrado');
  const ev = rs.map((r) => ({ r, e: M.evalRisk(r, mode) }));
  return { list: ev, pea: ev.reduce((s, x) => s + x.e.pea, 0) };
};

/* Benefício marginal de uma ação: perda esperada com o plano menos a perda sem esta ação */
M.actionBenefit = (a, mode = 'planejado') => {
  let d = 0;
  a.riscos.forEach((rid) => {
    const r = S.risk(rid);
    if (!r) return;
    d += M.evalRisk(r, mode, a.id).pea - M.evalRisk(r, mode).pea;
  });
  return d;
};

M.actionLate = (a) => a.status !== 'Concluída' && a.prazo && a.prazo < U.today();

/* ---------------- Rede: TTR × TTS ---------------- */
M.nodeGap = (n) => (n.ttr == null ? null : n.ttr - n.tts);
/* Impacto de desempenho (Simchi-Levi): margem perdida nas semanas em que a recuperação excede a sobrevivência */
M.nodePI = (n) => (n.ttr == null ? 0 : Math.max(0, n.ttr - n.tts) * n.receita * S.state.empresa.margem);
M.nodeRisks = (id) => S.state.risks.filter((r) => r.no === id && r.status !== 'Encerrado');
M.nodeMaxScore = (id, mode = 'inerente') => M.nodeRisks(id).reduce((m, r) => Math.max(m, M.evalRisk(r, mode).score), 0);

/* ---------------- KRIs ---------------- */
M.kriStatus = (k, v = k.hist[k.hist.length - 1]) => {
  if (k.dir === 'maior') return v >= k.verde ? 'ok' : v < k.vermelho ? 'crit' : 'warn';
  return v <= k.verde ? 'ok' : v > k.vermelho ? 'crit' : 'warn';
};
M.STATUS_TXT = { ok: 'Normal', warn: 'Atenção', crit: 'Crítico' };

/* ---------------- Fornecedores ---------------- */
M.supplierParts = (s) => ({
  financeiro: U.clamp(((3 - s.z) / (3 - 1.8)) * 80 + 10, 0, 100),
  dependencia: U.clamp(s.share * 80 + (s.fonteUnica ? 20 : 0), 0, 100),
  desempenho: U.clamp((100 - s.otif) * 6, 0, 100),
  geografico: U.clamp(s.riscoPais * 20, 0, 100),
  leadtime: U.clamp(s.cvLead * 250, 0, 100),
  ciber: U.clamp(s.ciber * 20, 0, 100),
});
M.supplierScore = (s) => {
  const parts = M.supplierParts(s), w = S.state.pesos;
  const tw = Object.values(w).reduce((a, b) => a + b, 0) || 1;
  return Object.keys(parts).reduce((sum, k) => sum + parts[k] * (w[k] || 0), 0) / tw;
};
M.supplierRating = (sc) => (sc < 35 ? 'A' : sc < 50 ? 'B' : sc < 65 ? 'C' : 'D');
M.hhi = () => {
  const by = {};
  S.state.suppliers.forEach((s) => { (by[s.compra] = by[s.compra] || []).push(s); });
  return Object.entries(by).map(([compra, list]) => {
    const tot = list.reduce((a, s) => a + s.share, 0) || 1;
    const h = list.reduce((a, s) => a + Math.pow((s.share / tot) * 100, 2), 0);
    return { compra, hhi: Math.round(h), n: list.length, list };
  });
};
/* Política interna de compras: até 3.400 = três ou mais fontes equilibradas */
M.hhiClass = (h) => (h <= 3400 ? { id: 'ok', nome: 'Diversificado' } : h <= 6000 ? { id: 'warn', nome: 'Concentração moderada' } : { id: 'crit', nome: 'Alta concentração' });

/* ==========================================================================
   Simulação de Monte Carlo da perda anual da carteira de riscos
   Número de eventos por risco ~ Poisson(λ); severidade ~ Triangular(mín, moda, máx);
   seguros aplicados evento a evento. Mesma semente em todos os cenários (números aleatórios comuns).
   ========================================================================== */
M.poisson = (lam, rng) => {
  if (lam <= 0) return 0;
  const L = Math.exp(-lam);
  let k = 0, p = 1;
  do { k++; p *= rng(); } while (p > L);
  return k - 1;
};

M.monteCarlo = ({ n = 10000, seed = 2026, mode = 'inerente' }) => {
  const rs = S.state.risks.filter((r) => r.status !== 'Encerrado');
  const ev = rs.map((r) => M.evalRisk(r, mode));
  const rng = U.rng(seed);
  const tot = new Float64Array(n);
  const contrib = new Float64Array(rs.length);
  let zero = 0;
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = 0; j < ev.length; j++) {
      const e = ev[j];
      let k = M.poisson(e.lam, rng);
      while (k-- > 0) {
        const x = M.retain(M.triInv(rng(), e.sev[0], e.sev[1], e.sev[2]), e.ins);
        s += x; contrib[j] += x;
      }
    }
    if (s === 0) zero++;
    tot[i] = s;
  }
  const sorted = Array.from(tot).sort((a, b) => a - b);
  const q = (x) => sorted[Math.min(n - 1, Math.floor(x * n))];
  const tail = sorted.slice(Math.floor(0.95 * n));
  const mean = sorted.reduce((a, b) => a + b, 0) / n;
  const apetite = S.state.empresa.apetite;
  return {
    mode, n, sorted,
    stats: {
      mean, p50: q(0.5), p90: q(0.9), var95: q(0.95), var99: q(0.99),
      cvar95: tail.reduce((a, b) => a + b, 0) / tail.length,
      max: sorted[n - 1], pZero: zero / n,
      pApetite: sorted.filter((x) => x > apetite).length / n,
    },
    contrib: rs.map((r, j) => ({ r, v: contrib[j] / n })),
  };
};

/* ==========================================================================
   Simulador de interrupção (perfil de desempenho em fases, Sheffi 2005)
   Simulação diária: estoque protege a produção até acabar; depois a produção
   depende do fornecedor original (parado) e do alternativo (após detecção + qualificação).
   ========================================================================== */
M.disrupt = (p) => {
  const H = p.horizonte || 180;
  const t0 = p.inicio, tEnd = t0 + p.duracao;
  const tAlt = t0 + p.deteccao + p.qualificacao;
  const s0 = p.cobertura; // dias de estoque
  let stock = s0;
  const perf = [], altUse = [];
  let lost = 0, altTot = 0;
  for (let t = 0; t < H; t++) {
    let orig;
    if (t < t0) orig = 1;
    else if (t < tEnd) orig = 0;
    else orig = Math.min(1.15, 1.15 * (t - tEnd + 1) / Math.max(1, p.rampaOrig));
    let alt = 0;
    if (t >= tAlt && t >= t0 && orig < 1) alt = (p.capAlt / 100) * Math.min(1, (t - tAlt + 1) / Math.max(1, p.rampaAlt));
    const inflow = orig + alt;
    const avail = stock + inflow;
    const prod = Math.min(1, avail);
    stock = Math.min(s0, avail - prod);
    const usedAlt = Math.min(alt, Math.max(0, prod - Math.min(orig, prod)));
    perf.push(prod * 100);
    altUse.push(usedAlt);
    lost += 1 - prod;
    altTot += usedAlt;
  }
  const firstBelow = perf.findIndex((v, t) => t >= t0 && v < 99.9);
  let tMin = t0, vMin = 100;
  perf.forEach((v, t) => { if (v < vMin - 1e-9) { vMin = v; tMin = t; } });
  let tFull = -1;
  if (firstBelow >= 0) {
    for (let t = tMin; t < H; t++) if (perf.slice(t).every((v) => v >= 99.9)) { tFull = t; break; }
  }
  const lostRevenue = lost * p.receitaDia * (1 - p.backorder / 100);
  const margemPerdida = lostRevenue * p.margem;
  const custoExtra = altTot * p.receitaDia * (p.premioAlt / 100);
  return {
    perf, H,
    marks: { evento: t0, deteccao: t0 + p.deteccao, ruptura: firstBelow, alternativo: tAlt, minimo: tMin, recuperado: tFull, fimParada: tEnd },
    vMin, diasFalta: perf.filter((v) => v < 99.9).length, lostDays: lost,
    recuperacao: tFull >= 0 ? tFull - t0 : null,
    lostRevenue, margemPerdida, custoExtra, total: margemPerdida + custoExtra,
  };
};
