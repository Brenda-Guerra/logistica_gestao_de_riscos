/* ==========================================================================
   charts.js — gráficos SVG/HTML leves, sem bibliotecas externas
   Cores vêm de variáveis CSS (tema claro/escuro).
   ========================================================================== */
const C = {};

C.niceTicks = (min, max, count = 5) => {
  const span = max - min || 1;
  const step0 = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const err = step0 / mag;
  const step = (err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1) * mag;
  const t = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-6; v += step) t.push(+v.toFixed(10));
  return t;
};

/* Gráfico de linhas genérico (x numérico). */
C.xy = (o) => {
  const w = o.w || 760, h = o.h || 300;
  const pad = Object.assign({ l: 56, r: 18, t: 16, b: 38 }, o.pad || {});
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const X = (x) => pad.l + ((x - o.xMin) / (o.xMax - o.xMin || 1)) * iw;
  const Y = (y) => pad.t + ih - ((y - o.yMin) / (o.yMax - o.yMin || 1)) * ih;
  const xt = o.xTicks || C.niceTicks(o.xMin, o.xMax, 6);
  const yt = o.yTicks || C.niceTicks(o.yMin, o.yMax, 4);
  const xf = o.xFmt || ((v) => v), yf = o.yFmt || ((v) => v);
  let s = `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${U.esc(o.label || 'Gráfico')}">`;
  (o.bands || []).forEach((b) => {
    const x0 = X(Math.max(o.xMin, b.x0)), x1 = X(Math.min(o.xMax, b.x1));
    if (x1 > x0) s += `<rect x="${x0}" y="${pad.t}" width="${x1 - x0}" height="${ih}" class="${b.cls || 'band'}"/>`;
  });
  yt.forEach((v) => {
    if (v < o.yMin || v > o.yMax) return;
    s += `<line x1="${pad.l}" x2="${w - pad.r}" y1="${Y(v)}" y2="${Y(v)}" class="grid"/>`;
    s += `<text x="${pad.l - 8}" y="${Y(v) + 4}" class="tick" text-anchor="end">${U.esc(yf(v))}</text>`;
  });
  xt.forEach((v) => {
    if (v < o.xMin || v > o.xMax) return;
    s += `<text x="${X(v)}" y="${h - pad.b + 18}" class="tick" text-anchor="middle">${U.esc(xf(v))}</text>`;
  });
  s += `<line x1="${pad.l}" x2="${w - pad.r}" y1="${pad.t + ih}" y2="${pad.t + ih}" class="axis"/>`;
  if (o.xLabel) s += `<text x="${pad.l + iw / 2}" y="${h - 4}" class="tick" text-anchor="middle">${U.esc(o.xLabel)}</text>`;
  if (o.yLabel) s += `<text x="12" y="${pad.t + ih / 2}" class="tick" text-anchor="middle" transform="rotate(-90 12 ${pad.t + ih / 2})">${U.esc(o.yLabel)}</text>`;
  (o.hlines || []).forEach((l) => {
    if (l.y < o.yMin || l.y > o.yMax) return;
    s += `<line x1="${pad.l}" x2="${w - pad.r}" y1="${Y(l.y)}" y2="${Y(l.y)}" class="refline ${l.cls || ''}"/>`;
    if (l.label) s += `<text x="${w - pad.r - 4}" y="${Y(l.y) - 6}" class="tick strong" text-anchor="end">${U.esc(l.label)}</text>`;
  });
  (o.series || []).forEach((se) => {
    const pts = se.pts.filter((p) => p[0] >= o.xMin && p[0] <= o.xMax);
    if (!pts.length) return;
    const d = pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(U.clamp(p[1], o.yMin, o.yMax)).toFixed(1)).join(' ');
    if (se.area) s += `<path d="${d} L${X(pts[pts.length - 1][0])} ${Y(o.yMin)} L${X(pts[0][0])} ${Y(o.yMin)} Z" style="fill:${se.color};opacity:.10"/>`;
    s += `<path d="${d}" fill="none" style="stroke:${se.color}" stroke-width="${se.width || 2}" ${se.dash ? 'stroke-dasharray="6 5"' : ''} stroke-linejoin="round" stroke-linecap="round"/>`;
  });
  const rowsEnd = [];
  (o.vlines || []).filter((l) => l.x != null && l.x >= o.xMin && l.x <= o.xMax).sort((a, b) => a.x - b.x).forEach((l) => {
    s += `<line x1="${X(l.x)}" x2="${X(l.x)}" y1="${pad.t}" y2="${pad.t + ih}" class="vline"/>`;
    if (l.label) {
      let row = rowsEnd.findIndex((e) => X(l.x) - e > 21);
      if (row < 0) { row = rowsEnd.length; rowsEnd.push(0); }
      rowsEnd[row] = X(l.x);
      const ly = pad.t - 40 + row * 21;
      s += `<circle cx="${X(l.x)}" cy="${ly}" r="9" class="mark-dot"/><text x="${X(l.x)}" y="${ly + 4}" class="mark-num" text-anchor="middle">${U.esc(l.label)}</text>`;
    }
  });
  if (o.hover) {
    const xs = o.hover.xs;
    xs.forEach((x, i) => {
      const a = i === 0 ? X(x) : (X(xs[i - 1]) + X(x)) / 2;
      const b = i === xs.length - 1 ? X(x) + 1 : (X(x) + X(xs[i + 1])) / 2;
      s += `<rect x="${a}" y="${pad.t}" width="${Math.max(1, b - a)}" height="${ih}" class="hit" data-tip="${U.esc(o.hover.tip(i))}"/>`;
    });
  }
  return s + '</svg>';
};

/* Colunas verticais (histograma) */
C.columns = (o) => {
  const w = o.w || 760, h = o.h || 240;
  const pad = { l: 46, r: 12, t: 12, b: 40 };
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const max = Math.max(...o.values, 1);
  const yt = C.niceTicks(0, max, 4);
  const ymax = yt[yt.length - 1];
  const bw = iw / o.values.length;
  let s = `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${U.esc(o.label || 'Histograma')}">`;
  yt.forEach((v) => {
    const y = pad.t + ih - (v / ymax) * ih;
    s += `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y}" y2="${y}" class="grid"/><text x="${pad.l - 8}" y="${y + 4}" class="tick" text-anchor="end">${U.esc((o.yFmt || String)(v))}</text>`;
  });
  o.values.forEach((v, i) => {
    const bh = (v / ymax) * ih;
    const x = pad.l + i * bw;
    s += `<rect x="${x + 1}" y="${pad.t + ih - bh}" width="${Math.max(1, bw - 2)}" height="${bh}" rx="2" style="fill:${(o.colorAt && o.colorAt(i)) || o.color}"/>`;
    s += `<rect x="${x}" y="${pad.t}" width="${bw}" height="${ih}" class="hit" data-tip="${U.esc(o.tips[i])}"/>`;
    if (o.labels[i] != null && i % (o.labelEvery || 1) === 0) s += `<text x="${x + bw / 2}" y="${h - pad.b + 16}" class="tick" text-anchor="middle">${U.esc(o.labels[i])}</text>`;
  });
  (o.vlines || []).forEach((l) => {
    const x = pad.l + l.i * bw;
    s += `<line x1="${x}" x2="${x}" y1="${pad.t}" y2="${pad.t + ih}" class="refline"/><text x="${x + 4}" y="${pad.t + 12}" class="tick strong">${U.esc(l.label)}</text>`;
  });
  s += `<line x1="${pad.l}" x2="${w - pad.r}" y1="${pad.t + ih}" y2="${pad.t + ih}" class="axis"/>`;
  if (o.xLabel) s += `<text x="${pad.l + iw / 2}" y="${h - 4}" class="tick" text-anchor="middle">${U.esc(o.xLabel)}</text>`;
  return s + '</svg>';
};

/* Barras horizontais em HTML (rótulos longos quebram linha naturalmente) */
C.hbars = (items, o = {}) => {
  const max = o.max || Math.max(...items.map((i) => i.value), 1);
  return `<div class="hbars">${items.map((it) => `
    <div class="hbar" ${it.tip ? `data-tip="${U.esc(it.tip)}"` : ''}>
      <div class="hbar-label">${it.labelHtml || U.esc(it.label)}</div>
      <div class="hbar-track"><div class="hbar-fill" style="width:${(Math.max(0, it.value) / max) * 100}%;background:${it.color || 'var(--s1)'}"></div></div>
      <div class="hbar-val">${U.esc((o.fmt || String)(it.value))}</div>
    </div>`).join('')}</div>`;
};

/* Sparkline com faixa de alerta */
C.spark = (vals, o = {}) => {
  const w = o.w || 160, h = o.h || 44, p = 4;
  const lo = Math.min(...vals, o.lo ?? Infinity), hi = Math.max(...vals, o.hi ?? -Infinity);
  const span = hi - lo || 1;
  const X = (i) => p + (i / (vals.length - 1)) * (w - 2 * p);
  const Y = (v) => h - p - ((v - lo) / span) * (h - 2 * p);
  const d = vals.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)).join(' ');
  let s = `<svg class="spark" viewBox="0 0 ${w} ${h}" aria-hidden="true">`;
  if (o.lines) o.lines.forEach((l) => { s += `<line x1="${p}" x2="${w - p}" y1="${Y(l.v)}" y2="${Y(l.v)}" class="spark-ref ${l.cls}"/>`; });
  s += `<path d="${d} L${X(vals.length - 1)} ${h - p} L${X(0)} ${h - p} Z" style="fill:${o.color || 'var(--s1)'};opacity:.12"/>`;
  s += `<path d="${d}" fill="none" style="stroke:${o.color || 'var(--s1)'}" stroke-width="2" stroke-linejoin="round"/>`;
  s += `<circle cx="${X(vals.length - 1)}" cy="${Y(vals[vals.length - 1])}" r="3.5" style="fill:${o.dot || o.color || 'var(--s1)'}" stroke="var(--surface)" stroke-width="2"/>`;
  return s + '</svg>';
};

/* Radar (maturidade dos princípios) */
C.radar = (labels, values, max = 4) => {
  const w = 420, h = 360, cx = w / 2, cy = h / 2 + 4, R = 128;
  const n = labels.length;
  const pt = (i, v) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    return [cx + Math.cos(a) * R * (v / max), cy + Math.sin(a) * R * (v / max)];
  };
  let s = `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Maturidade nos dez princípios">`;
  for (let k = 1; k <= max; k++) {
    s += `<polygon points="${labels.map((_, i) => pt(i, k).join(',')).join(' ')}" class="grid-poly"/>`;
  }
  labels.forEach((l, i) => {
    const [x, y] = pt(i, max);
    s += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" class="grid"/>`;
    const [lx, ly] = pt(i, max + 0.55);
    s += `<text x="${lx}" y="${ly + 4}" class="tick strong" text-anchor="middle">${U.esc(l)}</text>`;
  });
  s += `<polygon points="${values.map((v, i) => pt(i, v).join(',')).join(' ')}" style="fill:var(--s1);fill-opacity:.18;stroke:var(--s1)" stroke-width="2"/>`;
  values.forEach((v, i) => {
    const [x, y] = pt(i, v);
    s += `<circle cx="${x}" cy="${y}" r="4.5" style="fill:var(--s1)" stroke="var(--surface)" stroke-width="2" data-tip="Princípio ${i + 1}: ${DATA.MATURIDADE[v]} (${v}/4)"/>`;
  });
  return s + '</svg>';
};
