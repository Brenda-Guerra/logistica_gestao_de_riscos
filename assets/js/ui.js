/* ==========================================================================
   ui.js — aparência (tema claro/escuro, cor de destaque, densidade, menu
   recolhido), busca global (Ctrl K), notificações e central de ajuda
   ========================================================================== */
const UI = {};
UI.KEY = 'riscogcs-ui';
UI.DEF = { mode: 'system', accent: 'azul', density: 'normal', side: 'full' };
UI.ACCENTS = [
  { id: 'azul', nome: 'Azul', c: '#0f62fe' },
  { id: 'oceano', nome: 'Azul-petróleo', c: '#0072c3' },
  { id: 'esmeralda', nome: 'Verde-petróleo', c: '#007d79' },
  { id: 'violeta', nome: 'Violeta', c: '#6929c4' },
  { id: 'grafite', nome: 'Grafite', c: '#344054' },
];
UI.MODES = [['light', 'Claro', 'sun'], ['dark', 'Escuro', 'moon'], ['system', 'Sistema', 'monitor']];
UI.prefs = { ...UI.DEF, ...(U.storage.get(UI.KEY) || {}) };
UI.mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : { matches: false, addEventListener() {} };
UI.desk = () => window.innerWidth > 900;

UI.resolved = () => (UI.prefs.mode === 'system' ? (UI.mq.matches ? 'dark' : 'light') : UI.prefs.mode);

UI.apply = () => {
  const r = document.documentElement, p = UI.prefs;
  r.dataset.theme = UI.resolved();
  r.dataset.accent = p.accent;
  r.dataset.density = p.density;
  r.dataset.side = p.side;
  const meta = U.$('meta[name="theme-color"]');
  if (meta) meta.content = UI.resolved() === 'dark' ? '#0b0f14' : '#ffffff';
  UI.paintControls();
};

UI.paintControls = () => {
  const dark = UI.resolved() === 'dark';
  const tb = U.$('#themeBtn');
  if (tb) tb.innerHTML = I(dark ? 'sun' : 'moon');
  const ms = U.$('#modeSwitch');
  if (ms) ms.innerHTML = UI.MODES.map(([id, nome, ic]) => `<button type="button" data-mode-set="${id}" aria-pressed="${UI.prefs.mode === id}" data-tip="Tema ${nome.toLowerCase()}">${I(ic)}<span>${nome}</span></button>`).join('');
  const st = U.$('#sideToggle');
  if (st) {
    const mini = UI.prefs.side === 'mini';
    st.innerHTML = I(mini ? 'chevRight' : 'panel');
    st.setAttribute('aria-label', mini ? 'Expandir menu' : 'Recolher menu');
  }
  if (UI.pop && UI.pop.kind === 'appear') UI.drawAppearance();
};

/* Troca de preferência sem efeitos: as transições ficam desligadas durante a troca de tema */
UI.set = (patch) => {
  const sideBefore = UI.prefs.side;
  UI.prefs = { ...UI.prefs, ...patch };
  U.storage.set(UI.KEY, UI.prefs);
  const r = document.documentElement;
  r.classList.add('no-trans');
  UI.apply();
  if (UI.prefs.side !== sideBefore) App.buildTabs();
  requestAnimationFrame(() => requestAnimationFrame(() => r.classList.remove('no-trans')));
};
UI.toggleTheme = () => UI.set({ mode: UI.resolved() === 'dark' ? 'light' : 'dark' });

/* ---------- Menu lateral (celular: gaveta) ---------- */
UI.openNav = () => document.documentElement.classList.add('nav-open');
UI.closeNav = () => document.documentElement.classList.remove('nav-open');

/* ---------- Painéis flutuantes ---------- */
UI.pop = null;
UI.closePop = () => {
  if (!UI.pop) return;
  UI.pop.el.remove();
  if (UI.pop.anchor) UI.pop.anchor.setAttribute('aria-expanded', 'false');
  UI.pop = null;
};
UI.openPop = (anchor, kind, cls, html, bind, opts = {}) => {
  const same = UI.pop && UI.pop.kind === kind;
  UI.closePop();
  if (same && !opts.force) return null;
  const el = document.createElement('div');
  el.className = 'pop ' + cls;
  el.setAttribute('role', opts.role || 'dialog');
  if (opts.label) el.setAttribute('aria-label', opts.label);
  el.innerHTML = html;
  U.$('#popRoot').appendChild(el);
  UI.pop = { el, anchor, kind };
  if (anchor) anchor.setAttribute('aria-expanded', 'true');
  UI.place(el, anchor);
  if (bind) bind(el);
  const f = el.querySelector('button, [tabindex="0"]');
  if (f && opts.focus) setTimeout(() => f.focus(), 20);
  return el;
};
UI.place = (el, anchor) => {
  const w = el.offsetWidth, h = el.offsetHeight;
  let left, top;
  if (anchor && anchor.closest('.side') && UI.desk()) {
    const r = anchor.getBoundingClientRect();
    left = r.right + 12; top = Math.min(r.top - 8, window.innerHeight - h - 12);
  } else if (anchor) {
    const r = anchor.getBoundingClientRect();
    left = r.right - w; top = r.bottom + 8;
    if (top + h > window.innerHeight - 12) top = Math.max(12, r.top - h - 8);
  } else { left = (window.innerWidth - w) / 2; top = 80; }
  el.style.left = U.clamp(left, 12, Math.max(12, window.innerWidth - w - 12)) + 'px';
  el.style.top = Math.max(12, top) + 'px';
};

/* ---------- Notificações ---------- */
UI.notifItems = () => {
  const items = [];
  const SEVC = { Alta: 'var(--st-crit)', Média: 'var(--st-warn)', Baixa: 'var(--st-ok)' };
  S.state.alerts.filter((a) => a.status === 'Novo').sort((a, b) => (a.data < b.data ? 1 : -1)).forEach((a) => items.push({
    sec: 'Sinais novos', ic: I.CAT[(S.risk(a.risco) || {}).cat] || 'radar', c: SEVC[a.sev] || 'var(--st-warn)', t: a.titulo,
    s: `${U.ago(a.data)} · ${V.nodeName(a.no)} · severidade ${String(a.sev).toLowerCase()}`,
    go: () => App.go('monitor', () => { App.monTab = 'kri'; App.alertFilter = 'Novo'; }),
  }));
  S.state.actions.filter(M.actionLate).forEach((a) => items.push({
    sec: 'Ações atrasadas', ic: 'clock', c: 'var(--st-crit)', t: `${a.id} · ${a.titulo}`,
    s: `prazo ${U.dateBR(a.prazo)} · ${a.progresso}% concluído${a.resp ? ' · ' + a.resp : ''}`, go: () => V.actionForm(a),
  }));
  S.state.kris.filter((k) => M.kriStatus(k) === 'crit').forEach((k) => items.push({
    sec: 'Indicadores críticos', ic: 'activity', c: 'var(--st-crit)', t: k.nome,
    s: `${U.num(k.hist[k.hist.length - 1], k.dec)} ${k.unidade} em ${DATA.MESES[11]} · ${V.nodeName(k.no)}`, go: () => App.kriForm(k),
  }));
  return items;
};
UI.refreshBell = () => {
  const b = U.$('#bellN');
  if (!b || !S.state) return;
  const n = UI.notifItems().length;
  b.hidden = !n;
  b.textContent = n > 99 ? '99+' : String(n);
  U.$('#bellBtn').setAttribute('aria-label', `Notificações (${n} pendentes)`);
  if (UI.pop && UI.pop.kind === 'notif') UI.drawNotif();
};
UI.drawNotif = () => {
  const items = UI.notifItems(), el = UI.pop.el;
  const nNew = S.state.alerts.filter((a) => a.status === 'Novo').length;
  let sec = '';
  el.innerHTML = `<div class="pop-head"><h3>Notificações</h3><span class="pill ${items.length ? 'st-crit' : 'st-ok'}"><i></i>${items.length ? U.plural(items.length, 'pendente', 'pendentes') : 'Tudo em dia'}</span></div>
    <div class="pop-body">${items.map((it, i) => `${it.sec !== sec ? `<div class="nt-sec">${U.esc((sec = it.sec))}</div>` : ''}
      <button class="nt" type="button" data-nt="${i}"><span class="nt-ic" style="--c:${it.c}">${I(it.ic)}</span><span><b>${U.esc(it.t)}</b><small>${U.esc(it.s)}</small></span></button>`).join('') || V.empty('Nada pendente. Tudo em dia por aqui.')}</div>
    <div class="pop-foot"><button class="card-link" type="button" data-nt-go>Abrir monitoramento ${I('arrowRight')}</button>
      ${nNew ? `<button class="btn btn-small" type="button" data-nt-ack>${I('check')} Marcar ${U.plural(nNew, 'sinal', 'sinais')} como ${nNew === 1 ? 'visto' : 'vistos'}</button>` : ''}</div>`;
  el._items = items;
};
UI.openNotif = (anchor) => {
  const el = UI.openPop(anchor, 'notif', 'notif', '', null, { label: 'Notificações' });
  if (!el) return;
  UI.drawNotif();
  UI.place(el, anchor);
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-nt]');
    if (b) { const it = el._items[+b.dataset.nt]; UI.closePop(); it.go(); return; }
    if (e.target.closest('[data-nt-go]')) { UI.closePop(); App.go('monitor', () => { App.monTab = 'kri'; }); return; }
    if (e.target.closest('[data-nt-ack]')) {
      let n = 0;
      S.state.alerts.forEach((a) => { if (a.status === 'Novo') { a.status = 'Reconhecido'; n++; } });
      App.refresh();
      U.toast(U.plural(n, 'sinal marcado como visto', 'sinais marcados como vistos'));
    }
  });
};

/* ---------- Aparência ---------- */
UI.drawAppearance = () => {
  const el = UI.pop && UI.pop.el;
  if (!el) return;
  const p = UI.prefs;
  el.innerHTML = `<div class="pop-head"><h3>Aparência</h3><button class="icon-btn" type="button" data-ap-close aria-label="Fechar">${I('x')}</button></div>
    <div class="ap-row"><div class="ap-lab">Tema</div><div class="ap-modes">${UI.MODES.map(([id, nome]) => `<button class="ap-opt" type="button" data-ap-mode="${id}" aria-pressed="${p.mode === id}"><span class="ap-prev ${id}"><i></i><span></span></span>${nome}</button>`).join('')}</div></div>
    <div class="ap-row"><div class="ap-lab">Cor de destaque</div><div class="ap-swatches">${UI.ACCENTS.map((a) => `<button class="ap-sw" type="button" style="--sw:${a.c}" data-ap-accent="${a.id}" aria-pressed="${p.accent === a.id}" aria-label="${a.nome}" data-tip="${a.nome}">${I('check')}</button>`).join('')}</div></div>
    <div class="ap-row"><div class="ap-lab">Densidade</div><div class="ap-seg">${V.seg('ap-density', [['normal', 'Confortável'], ['compact', 'Compacta']], p.density, 'Densidade')}</div></div>
    <div class="ap-row only-desk"><div class="ap-lab">Menu lateral</div><div class="ap-seg">${V.seg('ap-side', [['full', 'Expandido'], ['mini', 'Recolhido']], p.side, 'Menu lateral')}</div></div>
    <div class="ap-foot"><span class="muted small">Fica salvo neste navegador</span><button class="btn btn-small btn-quiet" type="button" data-ap-reset>${I('refresh')} Voltar ao padrão</button></div>`;
};
UI.openAppearance = (anchor) => {
  const el = UI.openPop(anchor, 'appear', 'appear', '', null, { label: 'Aparência' });
  if (!el) return;
  UI.drawAppearance();
  UI.place(el, anchor);
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.apClose !== undefined) return UI.closePop();
    if (b.dataset.apMode) UI.set({ mode: b.dataset.apMode });
    else if (b.dataset.apAccent) UI.set({ accent: b.dataset.apAccent });
    else if (b.dataset.apDensity) UI.set({ density: b.dataset.apDensity });
    else if (b.dataset.apSide) UI.set({ side: b.dataset.apSide });
    else if (b.dataset.apReset !== undefined) { UI.set({ ...UI.DEF }); U.toast('Aparência padrão aplicada'); }
  });
};

/* ---------- Ajuda "Como ler" (botão ? das seções) ---------- */
UI.openHelp = (btn) => {
  const h = App.HELP[btn.dataset.help];
  if (!h) return;
  const { t, b } = h();
  const el = UI.openPop(btn, 'help:' + btn.dataset.help, 'help-pop', `<div class="pop-head"><h3>${I('info')} ${U.esc(t)}</h3><button class="icon-btn" type="button" data-pop-close aria-label="Fechar">${I('x')}</button></div><div class="help-body">${b}</div>`, null, { label: t });
  if (el) el.addEventListener('click', (e) => { if (e.target.closest('[data-pop-close]')) UI.closePop(); });
};

/* ---------- Guia "Como usar esta página" ---------- */
UI.openGuide = (btn) => {
  const tab = App.TABS.find((t) => t.id === App.current);
  const steps = App.GUIDE[App.current] || [];
  const el = UI.openPop(btn, 'guide', 'help-pop guide-pop', `<div class="pop-head"><h3>${I('help')} Como usar: ${U.esc(tab.nome)}</h3><button class="icon-btn" type="button" data-pop-close aria-label="Fechar">${I('x')}</button></div>
    <ol>${steps.map((s) => `<li><span>${U.esc(s)}</span></li>`).join('')}</ol>
    <p class="guide-foot">Dica: o ícone <span class="help-btn mini" aria-hidden="true">${I('info')}</span> ao lado do título de cada cartão explica como ler o gráfico. O guia completo mostra o sistema inteiro em 12 páginas.</p>
    <div class="ap-foot"><button class="btn btn-small" type="button" data-guide-full>${I('book')} Ver no guia</button><button class="btn btn-small btn-primary" type="button" data-guide-tour>${I('compass')} Fazer o tour desta página</button></div>`, null, { label: 'Como usar esta página', focus: true });
  if (el) el.addEventListener('click', (e) => {
    if (e.target.closest('[data-pop-close]')) UI.closePop();
    if (e.target.closest('[data-guide-tour]')) { UI.closePop(); Tour.startChapter({ painel: 'painel', riscos: 'riscos', acoes: 'acoes', monitor: 'monitor', simular: 'simular' }[App.current] || 'nav'); return; }
    if (e.target.closest('[data-guide-full]')) { UI.closePop(); X.openGuideAt({ painel: 2, riscos: 4, acoes: 7, monitor: App.monTab === 'forn' ? 9 : 8, simular: 10 }[App.current] || 0); }
  });
};

/* ---------- Central de ajuda (botão "?" da barra superior) ---------- */
UI.openHelpMenu = (anchor) => {
  const k = /Mac|iPhone|iPad/.test(navigator.platform || '') ? '⌘ K' : 'Ctrl K';
  const el = UI.openPop(anchor, 'helpmenu', 'menu', `
    <div class="menu-cap">Aprender a usar</div>
    <button type="button" role="menuitem" data-hm="page">${I('help')} Como usar esta página</button>
    <button type="button" role="menuitem" data-hm="tour">${I('compass')} Tour guiado <small>5 min</small></button>
    <button type="button" role="menuitem" data-hm="guia">${I('book')} Guia passo a passo <small>12 págs.</small></button>
    <div class="menu-cap">Referência</div>
    <button type="button" role="menuitem" data-hm="met">${I('info')} Método e fórmulas</button>
    <button type="button" role="menuitem" data-hm="glo">${I('file')} Glossário</button>
    <hr><div class="menu-keys"><span><kbd>${k}</kbd> buscar</span><span><kbd>/</kbd> buscar</span><span><kbd>Esc</kbd> fechar</span></div>`, null, { role: 'menu', label: 'Ajuda', focus: true });
  if (!el) return;
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-hm]');
    if (!b) return;
    UI.closePop();
    ({ page: () => UI.openGuide(U.$('#btnGuide')), tour: () => Tour.start(), guia: () => X.about('guia'), met: () => X.about('met'), glo: () => X.about('glo') })[b.dataset.hm]();
  });
};

/* ---------- Busca global ---------- */
UI.searchIndex = () => {
  const L = [];
  App.TABS.forEach((t) => L.push({ g: 'Páginas', ic: t.icon, t: t.nome, s: t.titulo, k: t.sub, run: () => App.go(t.id) }));
  [
    ['Fazer o tour guiado', 'compass', () => Tour.start(), 'tour tutorial guiado ajuda aprender navegar passo a passo'],
    ['Novo risco', 'plus', () => V.riskForm(null), 'novo risco cadastrar criar registrar'],
    ['Criar ação de tratamento', 'plus', () => V.actionForm(null), 'nova acao plano tratamento'],
    ['Alternar tema claro/escuro', 'moon', (ev) => UI.toggleTheme(ev), 'tema escuro claro dark light modo noturno'],
    ['Aparência: cor e densidade', 'palette', () => UI.openAppearance(U.$('#paletteBtn')), 'aparencia cor destaque densidade tema compacta'],
    ['Como funciona e glossário', 'info', () => X.about(), 'sobre metodologia formulas principios ajuda glossario termos'],
  ].forEach(([t, ic, run, k]) => L.push({ g: 'Comandos', ic, t, s: '', k, run }));
  const lv = {};
  M.portfolio('atual').list.forEach((x) => { lv[x.r.id] = x.e.level; });
  S.state.risks.forEach((r) => {
    const l = lv[r.id];
    L.push({ g: 'Riscos', ic: I.CAT[r.cat] || 'alert', cls: l ? 'lvl-' + l.id : '', t: `${r.id} · ${r.titulo}`, s: `${V.nodeName(r.no)} · ${S.cat(r.cat).nome} · ${r.status}`,
      k: [r.causa, r.consequencia, r.resp].join(' '), tag: l ? V.levelPill(l) : '', run: () => V.openRisk(r.id) });
  });
  S.state.actions.forEach((a) => L.push({ g: 'Ações', ic: 'checks', cls: M.actionLate(a) ? 'st-crit' : '', t: `${a.id} · ${a.titulo}`,
    s: `${DATA.ESTRATEGIAS[a.estrategia]} · ${a.status} · ${a.progresso}%${M.actionLate(a) ? ' · atrasada' : ''}`, k: [a.alavanca, a.resp, a.riscos.join(' ')].join(' '), run: () => V.actionForm(a) }));
  S.state.nodes.forEach((n) => L.push({ g: 'Elos da cadeia', ic: I.CAMADA[n.camada] || 'network', t: n.nome, s: `${DATA.CAMADAS[n.camada]} · ${n.local}`, k: n.papel,
    run: () => { App.go('painel', () => { App.netSel = n.id; }); setTimeout(() => { const c = U.$('#netCard'); if (c) c.scrollIntoView({ behavior: U.calm() ? 'auto' : 'smooth', block: 'start' }); }, 60); } }));
  S.state.kris.forEach((k) => { const st = M.kriStatus(k); L.push({ g: 'Indicadores', ic: 'activity', cls: 'st-' + st, t: `${k.id} · ${k.nome}`, s: `${U.num(k.hist[k.hist.length - 1], k.dec)} ${k.unidade} · ${M.STATUS_TXT[st]} · ${V.nodeName(k.no)}`, k: '', tag: V.statusPill(st), run: () => App.kriForm(k) }); });
  S.state.suppliers.forEach((s) => L.push({ g: 'Fornecedores', ic: 'package', t: s.nome, s: `${s.compra} · ${s.pais} · nota ${U.num(M.supplierScore(s))}`, k: s.cert || '', run: () => App.supplierDetail(s.id) }));
  S.state.alerts.forEach((a) => L.push({ g: 'Sinais', ic: 'radar', t: a.titulo, s: `${U.dateBR(a.data)} · ${a.status} · ${a.fonte}`, k: a.texto, run: () => App.go('monitor', () => { App.monTab = 'kri'; App.alertFilter = 'todos'; }) }));
  return L;
};
UI.GROUPS = ['Páginas', 'Comandos', 'Riscos', 'Ações', 'Elos da cadeia', 'Indicadores', 'Fornecedores', 'Sinais'];
UI.search = (q) => {
  const idx = UI._idx || (UI._idx = UI.searchIndex());
  const terms = U.fold(q).split(/\s+/).filter(Boolean);
  if (!terms.length) return idx.filter((x) => x.g === 'Páginas' || x.g === 'Comandos');
  const found = [];
  idx.forEach((x) => {
    const title = U.fold(x.t), hay = title + ' ' + U.fold(x.s + ' ' + x.k);
    if (!terms.every((t) => hay.includes(t))) return;
    const sc = terms.reduce((s, t) => s + (title.startsWith(t) ? 4 : title.includes(t) ? 2 : 1), 0);
    found.push({ x, sc });
  });
  found.sort((a, b) => UI.GROUPS.indexOf(a.x.g) - UI.GROUPS.indexOf(b.x.g) || b.sc - a.sc);
  const per = {};
  return found.filter(({ x }) => (per[x.g] = (per[x.g] || 0) + 1) <= 6).map((f) => f.x);
};
/* Destaca os termos buscados no título (ignorando acentos) */
UI.hl = (txt, q) => {
  const terms = U.fold(q).split(/\s+/).filter(Boolean);
  const f = U.fold(txt);
  if (!terms.length || f.length !== txt.length) return U.esc(txt);
  const mark = new Array(txt.length).fill(false);
  terms.forEach((t) => { let i = f.indexOf(t); while (i >= 0) { for (let j = i; j < i + t.length; j++) mark[j] = true; i = f.indexOf(t, i + t.length); } });
  let out = '', on = false;
  for (let i = 0; i < txt.length; i++) {
    if (mark[i] && !on) { out += '<mark>'; on = true; }
    if (!mark[i] && on) { out += '</mark>'; on = false; }
    out += U.esc(txt[i]);
  }
  return out + (on ? '</mark>' : '');
};
UI.drawSearch = () => {
  const inp = U.$('#searchInput'), q = inp.value.trim();
  const res = UI.search(q);
  UI._res = res;
  UI._sel = res.length ? 0 : -1;
  let g = '';
  U.$('#searchList').innerHTML = (res.length ? res.map((x, i) => `${x.g !== g ? `<li class="sr-group" role="presentation">${U.esc((g = x.g))}</li>` : ''}
    <li class="sr-item" role="option" id="sr${i}" data-sr="${i}" aria-selected="${i === 0}"><span class="sr-ic ${x.cls || ''}">${I(x.ic)}</span>
      <span class="sr-t"><b>${UI.hl(x.t, q)}</b>${x.s ? `<small>${U.esc(x.s)}</small>` : ''}</span>${x.tag || ''}<span class="sr-go">${I('enter')}</span></li>`).join('')
    : `<li class="sr-empty" role="presentation">Nada encontrado para “${U.esc(q)}”.<br><small>Tente um código (R01, A05, K02), o nome de um elo, uma categoria ou um fornecedor.</small></li>`)
    + `<li class="sr-foot" role="presentation"><span><kbd>↑</kbd> <kbd>↓</kbd> navegar</span><span><kbd>Enter</kbd> abrir</span><span><kbd>Esc</kbd> fechar</span><span style="margin-left:auto">${q ? U.plural(res.length, 'resultado', 'resultados') : 'Digite para buscar riscos, ações, elos, indicadores e fornecedores'}</span></li>`;
  inp.setAttribute('aria-activedescendant', res.length ? 'sr0' : '');
};
UI.openSearch = () => {
  UI.closePop();
  UI._idx = null;
  U.$('#searchPop').hidden = false;
  U.$('#searchInput').setAttribute('aria-expanded', 'true');
  UI.drawSearch();
};
UI.closeSearch = () => {
  U.$('#searchPop').hidden = true;
  U.$('#searchInput').setAttribute('aria-expanded', 'false');
};
UI.moveSel = (d) => {
  if (!UI._res || !UI._res.length) return;
  UI._sel = (UI._sel + d + UI._res.length) % UI._res.length;
  U.$$('#searchList .sr-item').forEach((li) => li.setAttribute('aria-selected', String(+li.dataset.sr === UI._sel)));
  const cur = U.$('#sr' + UI._sel);
  if (cur) cur.scrollIntoView({ block: 'nearest' });
  U.$('#searchInput').setAttribute('aria-activedescendant', 'sr' + UI._sel);
};
UI.runSel = (i, ev) => {
  const x = UI._res && UI._res[i];
  if (!x) return;
  const inp = U.$('#searchInput');
  inp.value = '';
  UI.closeSearch();
  inp.blur();
  x.run(ev);
};

/* ---------- Inicialização ---------- */
UI.init = () => {
  UI.apply();
  U.$('#navOpen').innerHTML = I('menu');
  U.$('.search-ic').innerHTML = I('search');
  U.$('#paletteBtn').innerHTML = I('palette');
  U.$('#helpBtn').innerHTML = I('help');
  U.$('#bellBtn').insertAdjacentHTML('afterbegin', I('bell'));
  U.$('#btnGuide').innerHTML = `${I('help')}<span>Como usar esta página</span>`;
  U.$('.who-chev').innerHTML = I('chevDown');
  if (/Mac|iPhone|iPad/.test(navigator.platform || '')) U.$('.search-kbd').textContent = '⌘ K';

  U.$('#themeBtn').addEventListener('click', UI.toggleTheme);
  U.$('#helpBtn').addEventListener('click', (e) => UI.openHelpMenu(e.currentTarget));
  U.$('#whoBtn').addEventListener('click', (e) => UI.openAppearance(e.currentTarget));
  U.$('#paletteBtn').addEventListener('click', (e) => UI.openAppearance(e.currentTarget));
  U.$('#bellBtn').addEventListener('click', (e) => UI.openNotif(e.currentTarget));
  U.$('#btnGuide').addEventListener('click', (e) => UI.openGuide(e.currentTarget));
  document.addEventListener('click', (e) => { const h = e.target.closest('[data-help]'); if (h) { e.preventDefault(); e.stopPropagation(); UI.openHelp(h); } }, true);
  U.$('#sideToggle').addEventListener('click', () => UI.set({ side: UI.prefs.side === 'mini' ? 'full' : 'mini' }));
  U.$('#navOpen').addEventListener('click', UI.openNav);
  U.$('#sideScrim').addEventListener('click', UI.closeNav);
  U.$('#modeSwitch').addEventListener('click', (e) => {
    const b = e.target.closest('[data-mode-set]');
    if (!b) return;
    const ids = UI.MODES.map((m) => m[0]);
    const mini = UI.prefs.side === 'mini' && UI.desk();
    UI.set({ mode: mini ? ids[(ids.indexOf(UI.prefs.mode) + 1) % ids.length] : b.dataset.modeSet });
  });
  U.$('#tabs').addEventListener('click', (e) => {
    const c = e.target.closest('[data-cmd]');
    if (!c) { if (e.target.closest('[data-tab]')) UI.closeNav(); return; }
    const cmd = c.dataset.cmd;
    if (cmd === 'appearance') return UI.openAppearance(c);
    UI.closeNav();
    ({ tour: () => Tour.start(), about: () => X.about() })[cmd]();
  });

  /* Busca */
  const inp = U.$('#searchInput');
  inp.addEventListener('focus', UI.openSearch);
  inp.addEventListener('input', UI.drawSearch);
  inp.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== inp) UI.closeSearch(); }, 120));
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); UI.moveSel(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); UI.moveSel(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); UI.runSel(UI._sel, e); }
    else if (e.key === 'Escape') { e.preventDefault(); inp.value = ''; UI.closeSearch(); inp.blur(); }
  });
  const list = U.$('#searchList');
  list.addEventListener('mousedown', (e) => { if (e.target.closest('.sr-item')) e.preventDefault(); });
  list.addEventListener('click', (e) => { const li = e.target.closest('.sr-item'); if (li) UI.runSel(+li.dataset.sr, e); });
  list.addEventListener('mousemove', (e) => {
    const li = e.target.closest('.sr-item');
    if (li && +li.dataset.sr !== UI._sel) { UI._sel = +li.dataset.sr - 1; UI.moveSel(1); }
  });

  /* Atalhos e fechamento dos painéis */
  document.addEventListener('keydown', (e) => {
    const typing = e.target.closest && e.target.closest('input, textarea, select, [contenteditable]');
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); inp.focus(); inp.select(); }
    else if (e.key === '/' && !typing && !U.$('.modal-back')) { e.preventDefault(); inp.focus(); }
    else if (e.key === 'Escape') { if (UI.pop) UI.closePop(); UI.closeNav(); }
  });
  document.addEventListener('mousedown', (e) => {
    if (UI.pop && !UI.pop.el.contains(e.target) && !(UI.pop.anchor && UI.pop.anchor.contains(e.target))) UI.closePop();
  });
  U.$('#main').addEventListener('scroll', () => { if (UI.pop && UI.pop.kind !== 'appear' && UI.pop.kind !== 'notif') UI.closePop(); }, { passive: true });
  let wasDesk = UI.desk();
  window.addEventListener('resize', () => {
    if (UI.pop) UI.closePop();
    if (UI.desk() !== wasDesk) { wasDesk = UI.desk(); App.buildTabs(); if (wasDesk) UI.closeNav(); }
  });
  UI.mq.addEventListener('change', () => { if (UI.prefs.mode === 'system') UI.apply(); });

  UI.refreshBell();
};
