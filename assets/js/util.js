/* ==========================================================================
   util.js — utilitários de interface (formatação, modais, tooltips, arquivos)
   ========================================================================== */
const U = {};

U.$ = (s, r = document) => r.querySelector(s);
U.$$ = (s, r = document) => Array.from(r.querySelectorAll(s));

U.esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* Valores monetários do sistema são guardados em R$ mil. */
U.money = (mil, opts = {}) => {
  const v = Number(mil) || 0;
  if (Math.abs(v) >= 1000) {
    return 'R$ ' + (v / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: opts.dec ?? 1 }) + ' mi';
  }
  return 'R$ ' + Math.round(v).toLocaleString('pt-BR') + ' mil';
};
U.num = (v, d = 0) => (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
U.wk = (v) => U.num(v, v % 1 ? 1 : 0); // semanas/dias: "2,5" ou "12"
U.plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
U.pct = (v, d = 0) => U.num(v * 100, d) + '%';
U.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
U.uid = (prefix) => prefix + Math.random().toString(36).slice(2, 7).toUpperCase();
U.today = () => {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};
U.dateBR = (iso) => (iso ? iso.split('-').reverse().join('/') : '—');

/* Gerador pseudoaleatório com semente (mulberry32) — torna a simulação reprodutível */
U.rng = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/* Está rodando dentro de um iframe (pré-visualização)? Nesse caso downloads e impressão não funcionam. */
U.framed = (() => {
  try { return window.self !== window.top; } catch (e) { return true; }
})();

U.storage = {
  get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* sem armazenamento */ } },
};

/* ---------- Modal e painel lateral ----------
   drawer: abre como painel à direita (detalhes e formulários); kicker: linha acima do título;
   sub: etiquetas e metadados abaixo do título (HTML) */
U.modal = ({ title, body, wide = false, xl = false, drawer = false, kicker = '', sub = '', actions = [], onMount }) => {
  const root = U.$('#modalRoot');
  const wrap = document.createElement('div');
  wrap.className = 'modal-back' + (drawer ? ' drawer-back' : '');
  wrap.innerHTML = `
    <div class="modal ${drawer ? 'drawer' : ''} ${wide ? 'modal-wide' : ''} ${xl ? 'modal-xl' : ''}" role="dialog" aria-modal="true" aria-label="${U.esc(title)}">
      <header class="modal-head"><div class="mh-t">${kicker ? `<span class="mh-kicker">${U.esc(kicker)}</span>` : ''}<h2>${U.esc(title)}</h2>${sub ? `<div class="mh-sub">${sub}</div>` : ''}</div>
        <button class="icon-btn" type="button" data-close aria-label="Fechar" data-tip="Fechar (Esc)">${I('x')}</button></header>
      <div class="modal-body">${body}</div>
      ${actions.length ? `<footer class="modal-foot">${actions.map((a, i) => `<button class="btn ${a.cls || ''}" type="button" data-act="${i}">${a.icon ? I(a.icon) : ''}${U.esc(a.label)}</button>`).join('')}</footer>` : ''}
    </div>`;
  root.appendChild(wrap);
  const close = () => { wrap.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape' && root.lastElementChild === wrap) close(); };
  document.addEventListener('keydown', onKey);
  wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) close(); });
  wrap.querySelector('[data-close]').addEventListener('click', close);
  U.$$('[data-act]', wrap).forEach((b) =>
    b.addEventListener('click', () => {
      const a = actions[+b.dataset.act];
      const keep = a.onClick ? a.onClick(wrap, close) : undefined;
      if (keep !== false) close();
    })
  );
  if (onMount) onMount(wrap, close);
  const first = wrap.querySelector('input, select, textarea, button.btn-primary');
  if (first) setTimeout(() => first.focus(), 30);
  return close;
};

U.confirm = (msg, onYes, label = 'Confirmar') =>
  U.modal({
    title: 'Confirme antes de continuar',
    body: `<p class="lead">${U.esc(msg)}</p>`,
    actions: [{ label: 'Cancelar' }, { label, cls: 'btn-danger', onClick: () => onYes() }],
  });

/* Notificação no canto inferior direito: ícone + mensagem + fechar.
   icon: 'check' (sucesso), 'download', 'info' ou 'alert' (erro) */
U.TOAST_TITLE = { check: 'Pronto', download: 'Arquivo gerado', info: 'Informação', alert: 'Atenção' };
U.toast = (msg, icon = 'check') => {
  const t = U.$('#toast');
  t.innerHTML = `<span class="t-ic">${I(icon === 'alert' ? 'alertCircle' : icon === 'info' ? 'info' : icon === 'download' ? 'download' : 'checkCircle')}</span>
    <span class="t-msg"><b>${U.TOAST_TITLE[icon] || 'Pronto'}</b>${U.esc(msg)}</span><button class="t-x" type="button" aria-label="Fechar notificação">${I('x')}</button>`;
  t.dataset.kind = icon;
  t.classList.add('show');
  U.$('.t-x', t).addEventListener('click', () => t.classList.remove('show'));
  clearTimeout(U._tt);
  U._tt = setTimeout(() => t.classList.remove('show'), icon === 'alert' ? 5000 : 3200);
};

/* Movimento reduzido: respeita a preferência do sistema */
U.calm = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Tempo relativo em português ("hoje", "ontem", "há 6 dias") a partir de data ISO */
U.ago = (iso) => {
  if (!iso) return '—';
  const d = Math.round((new Date(U.today() + 'T00:00:00') - new Date(iso + 'T00:00:00')) / 864e5);
  if (d <= 0) return d === 0 ? 'hoje' : 'em ' + U.plural(-d, 'dia', 'dias');
  if (d === 1) return 'ontem';
  if (d < 30) return 'há ' + d + ' dias';
  const m = Math.round(d / 30);
  return 'há ' + U.plural(m, 'mês', 'meses');
};

/* Remove acentos e normaliza para busca */
U.fold = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/* ---------- Arquivos: download (site) ou copiar (pré-visualização) ---------- */
U.download = (name, text, mime = 'text/plain') => {
  if (!U.framed) {
    const blob = new Blob([text], { type: mime + ';charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    U.toast('Arquivo baixado: ' + name, 'download');
    return;
  }
  U.modal({
    title: 'Copiar o conteúdo de ' + name,
    wide: true,
    body: `<p class="muted">Nesta pré-visualização o navegador bloqueia downloads. Copie o conteúdo abaixo e salve num arquivo chamado <b>${U.esc(name)}</b>. No site publicado, o arquivo é baixado direto.</p>
           <textarea id="dlText" class="code-area" readonly>${U.esc(text)}</textarea>`,
    actions: [
      { label: 'Fechar' },
      {
        label: 'Copiar', cls: 'btn-primary',
        onClick: (w) => {
          const ta = w.querySelector('#dlText');
          const fallback = () => { ta.focus(); ta.select(); U.toast('Texto selecionado: tecle Ctrl+C para copiar', 'info'); };
          try { navigator.clipboard.writeText(text).then(() => U.toast('Conteúdo copiado'), fallback); } catch (e) { fallback(); }
          return false;
        },
      },
    ],
  });
};

U.csv = (rows) =>
  '﻿' + rows.map((r) => r.map((c) => {
    const s = String(c ?? '');
    return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(';')).join('\n');

/* ---------- Tooltip global: qualquer elemento com data-tip ---------- */
U.initTips = () => {
  const tip = U.$('#tip');
  let cur = null;
  const show = (el, x, y) => {
    tip.innerHTML = U.esc(el.getAttribute('data-tip')).replace(/\n/g, '<br>');
    tip.hidden = false;
    const r = tip.getBoundingClientRect();
    let lx = x + 14, ly = y + 14;
    if (lx + r.width > window.innerWidth - 8) lx = x - r.width - 14;
    if (ly + r.height > window.innerHeight - 8) ly = y - r.height - 14;
    tip.style.left = Math.max(8, lx) + 'px';
    tip.style.top = Math.max(8, ly) + 'px';
  };
  document.addEventListener('mousemove', (e) => {
    const el = e.target.closest && e.target.closest('[data-tip]');
    if (!el) { if (cur) { tip.hidden = true; cur = null; } return; }
    cur = el;
    show(el, e.clientX, e.clientY);
  });
  document.addEventListener('scroll', () => { tip.hidden = true; cur = null; }, true);
};

/* Lê os campos de um formulário em objeto (respeita type=number) */
U.formData = (form) => {
  const o = {};
  U.$$('input, select, textarea', form).forEach((el) => {
    if (!el.name) return;
    if (el.type === 'checkbox') o[el.name] = el.checked;
    else if (el.type === 'number' || el.type === 'range') o[el.name] = el.value === '' ? null : Number(el.value);
    else o[el.name] = el.value;
  });
  return o;
};

U.opts = (list, sel, valKey = 'id', labelKey = 'nome') =>
  list.map((o) => `<option value="${U.esc(o[valKey])}" ${String(o[valKey]) === String(sel) ? 'selected' : ''}>${U.esc(o[labelKey])}</option>`).join('');
