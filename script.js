// ============================================================
// KaTeX auto-render
// ============================================================
document.addEventListener("DOMContentLoaded", function () {
  renderMathInElement(document.body, {
    delimiters: [
      { left: "\\[", right: "\\]", display: true },
      { left: "\\(", right: "\\)", display: false }
    ],
    throwOnError: false
  });
  runOneSample();
  runLGN();
  runFluctuation();
  runIntervalSim();
  runConfidenceIntervals();
  setTimeout(generateQCM, 120);
});

function renderKatex(el) {
  renderMathInElement(el, {
    delimiters: [
      { left: "\\[", right: "\\]", display: true },
      { left: "\\(", right: "\\)", display: false }
    ],
    throwOnError: false
  });
}

// ============================================================
// Canvas helper — identical to droites version
// ============================================================
function initCanvas(id, h) {
  const c = document.getElementById(id);
  if (!c) return null;
  const dpr = window.devicePixelRatio || 1;
  const rect = c.getBoundingClientRect();
  const logW = Math.max(rect.width || 500, 300);
  const logH = h || parseInt(c.getAttribute('height')) || 300;
  c.width = logW * dpr;
  c.height = logH * dpr;
  const ctx = c.getContext('2d');
  ctx.scale(dpr, dpr);
  return { ctx, W: logW, H: logH };
}

// ── PRNG : Lehmer (fast, seeded) ──────────────────────────────
function makePRNG(seed) {
  let s = seed || Math.floor(Math.random() * 1e9) + 1;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ── Sample generator ──────────────────────────────────────────
function bernoulli(p, rng) { return rng() < p ? 1 : 0; }

function drawSample(n, p, rng) {
  let k = 0;
  for (let i = 0; i < n; i++) k += bernoulli(p, rng);
  return k;
}

// ── Number formatter ─────────────────────────────────────────
function fmt2(v) { return v.toFixed(2); }
function fmt4(v) { return v.toFixed(4); }
function pct(v)  { return (v * 100).toFixed(1) + ' %'; }

// ── Draw a horizontal axis with ticks ────────────────────────
function drawHAxis(ctx, W, H, padL, padR, padB, min, max, nTicks) {
  const axY = H - padB;
  ctx.strokeStyle = '#1a1410'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(padL, axY); ctx.lineTo(W - padR, axY); ctx.stroke();
  const step = (max - min) / nTicks;
  ctx.fillStyle = '#666'; ctx.font = '10px DM Mono, monospace'; ctx.textAlign = 'center';
  for (let i = 0; i <= nTicks; i++) {
    const v = min + i * step;
    const x = padL + (v - min) / (max - min) * (W - padL - padR);
    ctx.beginPath(); ctx.moveTo(x, axY - 3); ctx.lineTo(x, axY + 3); ctx.stroke();
    ctx.fillText(fmt2(v), x, axY + 14);
  }
}

// ── Draw a vertical axis with ticks ──────────────────────────
function drawVAxis(ctx, H, padT, padB, padL, min, max, nTicks, label) {
  const axX = padL;
  ctx.strokeStyle = '#1a1410'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(axX, padT); ctx.lineTo(axX, H - padB); ctx.stroke();
  const step = (max - min) / nTicks;
  ctx.fillStyle = '#666'; ctx.font = '10px DM Mono, monospace'; ctx.textAlign = 'right';
  for (let i = 0; i <= nTicks; i++) {
    const v = min + i * step;
    const y = H - padB - (v - min) / (max - min) * (H - padT - padB);
    ctx.beginPath(); ctx.moveTo(axX - 3, y); ctx.lineTo(axX + 3, y); ctx.stroke();
    ctx.fillText(fmt2(v), axX - 6, y + 4);
  }
  if (label) {
    ctx.save(); ctx.translate(12, (H - padT - padB) / 2 + padT);
    ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center';
    ctx.fillStyle = '#888'; ctx.font = '10px DM Mono, monospace';
    ctx.fillText(label, 0, 0); ctx.restore();
  }
}

// ── Draw vertical dashed line at x ───────────────────────────
function dashV(ctx, x, y0, y1, color) {
  ctx.save(); ctx.setLineDash([4, 3]);
  ctx.strokeStyle = color; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke();
  ctx.restore();
}

// ── Map value in [min,max] to canvas x in [padL, W-padR] ─────
function scaleX(v, min, max, padL, W, padR) {
  return padL + (v - min) / (max - min) * (W - padL - padR);
}
function scaleY(v, min, max, padT, H, padB) {
  return H - padB - (v - min) / (max - min) * (H - padT - padB);
}

// ============================================================
// 01 — ONE SAMPLE visualisation
// ============================================================
function runOneSample() {
  const p    = parseFloat(document.getElementById('sim1-p').value);
  const n    = parseInt(document.getElementById('sim1-n').value);
  const rng  = makePRNG();
  const k    = drawSample(n, p, rng);
  const f    = k / n;

  drawBallotBox('sampleCanvas', n, k, p);

  const el = document.getElementById('sim1-result');
  const diff = Math.abs(f - p);
  const marge = 1 / Math.sqrt(n);
  el.innerHTML =
    `Échantillon de taille \\(n=${n}\\), proba \\(p=${fmt2(p)}\\) &nbsp;·&nbsp; `
    + `Succès : \\(k=${k}\\) &nbsp;·&nbsp; `
    + `Fréquence : \\(f = ${k}/${n} = ${fmt4(f)}\\)<br>`
    + `Écart \\(|f-p| = ${fmt4(diff)}\\) `
    + (diff <= marge
        ? `\\(\\leqslant \\frac{1}{\\sqrt{${n}}} = ${fmt4(marge)}\\) — <span style="color:var(--sage)">dans l'intervalle ✓</span>`
        : `\\(> \\frac{1}{\\sqrt{${n}}} = ${fmt4(marge)}\\) — <span style="color:var(--rust)">hors intervalle</span>`);
  renderKatex(el);
}

function runManySamples() {
  for (let i = 0; i < 20; i++) setTimeout(runOneSample, i * 60);
}

// Draw a dot-plot of the sample
function drawBallotBox(id, n, k, p) {
  const cv = initCanvas(id, 180);
  if (!cv) return;
  const { ctx, W, H } = cv;
  ctx.clearRect(0, 0, W, H);

  const padL = 20, padR = 20, padT = 30, padB = 30;
  const cols = Math.min(n, Math.floor((W - padL - padR) / 14));
  const rows = Math.ceil(n / cols);
  const dotR = Math.min(5, (H - padT - padB) / (2 * rows + 1), (W - padL - padR) / (2 * cols + 1));
  const dx = (W - padL - padR) / cols;
  const dy = (H - padT - padB) / rows;

  // Dots
  for (let i = 0; i < n; i++) {
    const col = i % cols, row = Math.floor(i / cols);
    const cx = padL + (col + 0.5) * dx;
    const cy = padT + (row + 0.5) * dy;
    ctx.beginPath(); ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
    ctx.fillStyle = i < k ? '#1d6a40' : '#e8e0d0';
    ctx.fill();
    ctx.strokeStyle = i < k ? '#145230' : '#c8c0b0';
    ctx.lineWidth = 0.5; ctx.stroke();
  }

  // Labels
  ctx.fillStyle = '#1a1410'; ctx.font = '11px DM Mono, monospace'; ctx.textAlign = 'left';
  ctx.fillText(`n = ${n}`, padL, 18);
  ctx.fillStyle = '#1d6a40';
  ctx.fillText(`k = ${k} succès  (f = ${(k/n).toFixed(3)})`, padL + 60, 18);
  ctx.fillStyle = '#c0392b';
  ctx.fillText(`p = ${p.toFixed(2)}`, W - padR - 60, 18);
}

// ============================================================
// 02 — LOI DES GRANDS NOMBRES — cumulative frequency plot
// ============================================================
function runLGN() {
  const p  = parseFloat(document.getElementById('lgn-p').value);
  const n  = parseInt(document.getElementById('lgn-n').value);
  const cv = initCanvas('lgnCanvas', 300);
  if (!cv) return;
  const { ctx, W, H } = cv;
  ctx.clearRect(0, 0, W, H);

  const padL = 52, padR = 20, padT = 20, padB = 36;
  const rng  = makePRNG();

  // Generate cumulative frequencies
  let cumK = 0;
  const freqs = [];
  for (let i = 1; i <= n; i++) {
    cumK += bernoulli(p, rng);
    if (i % Math.max(1, Math.floor(n / 300)) === 0 || i === n) freqs.push({ x: i, f: cumK / i });
  }

  // Axes
  drawHAxis(ctx, W, H, padL, padR, padB, 0, n, 5);
  drawVAxis(ctx, H, padT, padB, padL, 0, 1, 5, 'fréq. f');

  // p reference line
  const py = scaleY(p, 0, 1, padT, H, padB);
  dashV(ctx, padL, padT, H - padB, 'transparent');
  ctx.save(); ctx.setLineDash([5, 4]);
  ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.moveTo(padL, py); ctx.lineTo(W - padR, py); ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#c0392b'; ctx.font = '11px DM Mono, monospace'; ctx.textAlign = 'left';
  ctx.fillText(`p = ${fmt2(p)}`, W - padR - 2, py - 5);

  // Corridor ±1/√n
  const marge = 1 / Math.sqrt(n);
  const y1 = scaleY(Math.min(1, p + marge), 0, 1, padT, H, padB);
  const y2 = scaleY(Math.max(0, p - marge), 0, 1, padT, H, padB);
  ctx.fillStyle = 'rgba(192,57,43,0.07)';
  ctx.fillRect(padL, y1, W - padL - padR, y2 - y1);

  // Frequency path
  ctx.strokeStyle = '#3d5a80'; ctx.lineWidth = 1.8; ctx.beginPath();
  freqs.forEach((pt, i) => {
    const x = scaleX(pt.x, 0, n, padL, W, padR);
    const y = scaleY(pt.f, 0, 1, padT, H, padB);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Final value
  const finalF = freqs[freqs.length - 1].f;
  ctx.fillStyle = '#3d5a80'; ctx.font = '11px DM Mono, monospace'; ctx.textAlign = 'left';
  ctx.fillText(`f(${n}) = ${fmt4(finalF)}`, padL + 4, padT + 14);

  // Axis labels
  ctx.fillStyle = '#888'; ctx.font = '10px DM Mono, monospace'; ctx.textAlign = 'center';
  ctx.fillText('Nombre de tirages', padL + (W - padL - padR) / 2, H - 2);

  const el = document.getElementById('lgn-result');
  el.innerHTML =
    `Après \\(n=${n}\\) tirages : fréquence cumulée \\(f = ${fmt4(finalF)}\\) &nbsp;·&nbsp; `
    + `Probabilité théorique \\(p = ${fmt2(p)}\\) &nbsp;·&nbsp; `
    + `Écart final \\(|f-p| = ${fmt4(Math.abs(finalF - p))}\\)<br>`
    + `Zone rouge : intervalle \\([p - \\frac{1}{\\sqrt{n}}\\,;\\,p + \\frac{1}{\\sqrt{n}}] = [${fmt4(p-marge)}\\,;\\,${fmt4(p+marge)}]\\)`;
  renderKatex(el);
}

// ============================================================
// 03 — FLUCTUATION — bar chart of N sample frequencies
// ============================================================
function runFluctuation() {
  const p   = parseFloat(document.getElementById('fluct-p').value);
  const n   = parseInt(document.getElementById('fluct-n').value);
  const N   = parseInt(document.getElementById('fluct-N').value);
  const cv  = initCanvas('fluctCanvas', 320);
  if (!cv) return;
  const { ctx, W, H } = cv;
  ctx.clearRect(0, 0, W, H);

  const padL = 52, padR = 16, padT = 24, padB = 42;
  const rng  = makePRNG();
  const marge = 1 / Math.sqrt(n);

  const freqs = [];
  for (let i = 0; i < N; i++) freqs.push(drawSample(n, p, rng) / n);

  // Axes
  drawHAxis(ctx, W, H, padL, padR, padB, 0, 1, 5);
  ctx.fillStyle = '#888'; ctx.font = '10px DM Mono, monospace'; ctx.textAlign = 'center';
  ctx.fillText('Fréquence observée f', padL + (W - padL - padR) / 2, H - 2);

  // p reference line (vertical)
  const px = scaleX(p, 0, 1, padL, W, padR);
  dashV(ctx, px, padT, H - padB, '#c0392b');
  ctx.fillStyle = '#c0392b'; ctx.font = '11px DM Mono, monospace'; ctx.textAlign = 'center';
  ctx.fillText(`p=${fmt2(p)}`, px, padT - 5);

  // Corridor bounds
  const x1 = scaleX(Math.max(0, p - marge), 0, 1, padL, W, padR);
  const x2 = scaleX(Math.min(1, p + marge), 0, 1, padL, W, padR);
  ctx.fillStyle = 'rgba(192,57,43,0.08)';
  ctx.fillRect(x1, padT, x2 - x1, H - padT - padB);

  // Bars (histogram)
  const nbBins = Math.min(N, 40);
  const binW = 1 / nbBins;
  const bins = new Array(nbBins).fill(0);
  let inInterval = 0;
  freqs.forEach(f => {
    const bi = Math.min(nbBins - 1, Math.floor(f / binW));
    bins[bi]++;
    if (Math.abs(f - p) <= marge) inInterval++;
  });
  const maxBin = Math.max(...bins);

  bins.forEach((cnt, i) => {
    if (cnt === 0) return;
    const fx = i * binW, fw = binW;
    const bx = scaleX(fx, 0, 1, padL, W, padR);
    const bw = (fw / 1) * (W - padL - padR);
    const bh = ((H - padT - padB) * cnt) / (maxBin * 1.1);
    const by = H - padB - bh;
    const fMid = fx + fw / 2;
    const inZone = Math.abs(fMid - p) <= marge;
    ctx.fillStyle = inZone ? 'rgba(29,106,64,0.65)' : 'rgba(192,57,43,0.55)';
    ctx.fillRect(bx + 1, by, bw - 2, bh);
    ctx.strokeStyle = inZone ? '#145230' : '#8b1a1a';
    ctx.lineWidth = 0.5; ctx.strokeRect(bx + 1, by, bw - 2, bh);
  });

  // Y axis label
  drawVAxis(ctx, H, padT, padB, padL, 0, maxBin, 4, 'effectif');

  const prop = inInterval / N;
  const stdDev = Math.sqrt(p * (1 - p) / n);
  const el = document.getElementById('fluct-result');
  el.innerHTML =
    `\\(N=${N}\\) échantillons de taille \\(n=${n}\\), \\(p=${fmt2(p)}\\)<br>`
    + `Intervalle \\([p-\\frac{1}{\\sqrt{n}}\\,;\\,p+\\frac{1}{\\sqrt{n}}] = [${fmt4(p-marge)}\\,;\\,${fmt4(p+marge)}]\\) <span style="font-size:0.8rem;">(demi-largeur ${fmt4(marge)})</span><br>`
    + `Proportion dans l'intervalle : \\(${inInterval}/${N} = ${pct(prop)}\\) `
    + `<span style="color:${prop >= 0.90 ? 'var(--sage)' : 'var(--rust)'};">(attendu ≈ 95 %)</span><br>`
    + `Écart-type théorique de \\(f\\) : \\(\\sigma_f = \\sqrt{\\frac{p(1-p)}{n}} = ${fmt4(stdDev)}\\)`;
  renderKatex(el);
}

// ============================================================
// 04 — INTERVAL SIMULATION — scatter + corridor
// ============================================================
function runIntervalSim() {
  const p   = parseFloat(document.getElementById('if-p').value);
  const n   = parseInt(document.getElementById('if-n').value);
  const N   = parseInt(document.getElementById('if-N').value);
  const cv  = initCanvas('ifCanvas', 340);
  if (!cv) return;
  const { ctx, W, H } = cv;
  ctx.clearRect(0, 0, W, H);

  const padL = 52, padR = 16, padT = 30, padB = 42;
  const rng  = makePRNG();
  const marge = 1 / Math.sqrt(n);

  const freqs = [];
  let inCount = 0;
  for (let i = 0; i < N; i++) {
    const f = drawSample(n, p, rng) / n;
    freqs.push(f);
    if (Math.abs(f - p) <= marge) inCount++;
  }

  // Axes
  drawHAxis(ctx, W, H, padL, padR, padB, 0, 1, 5);
  ctx.fillStyle = '#888'; ctx.font = '10px DM Mono, monospace'; ctx.textAlign = 'center';
  ctx.fillText('Fréquence observée f', padL + (W - padL - padR) / 2, H - 2);

  // Corridor shading
  const x1 = scaleX(Math.max(0, p - marge), 0, 1, padL, W, padR);
  const x2 = scaleX(Math.min(1, p + marge), 0, 1, padL, W, padR);
  ctx.fillStyle = 'rgba(184,134,11,0.1)';
  ctx.fillRect(x1, padT, x2 - x1, H - padT - padB);
  ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 1.2;
  ctx.setLineDash([4, 3]);
  ctx.beginPath(); ctx.moveTo(x1, padT); ctx.lineTo(x1, H - padB); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x2, padT); ctx.lineTo(x2, H - padB); ctx.stroke();
  ctx.setLineDash([]);

  // p line
  const px = scaleX(p, 0, 1, padL, W, padR);
  ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);
  ctx.beginPath(); ctx.moveTo(px, padT); ctx.lineTo(px, H - padB); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#c0392b'; ctx.font = '11px DM Mono, monospace'; ctx.textAlign = 'center';
  ctx.fillText(`p=${fmt2(p)}`, px, padT - 6);

  // Labels corridor
  ctx.fillStyle = '#b8860b'; ctx.font = '10px DM Mono, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`p-1/√n`, x1, padT - 4);
  ctx.fillText(`p+1/√n`, x2, padT - 4);

  // Dots — jittered vertically
  const rowH = (H - padT - padB - 20) / Math.ceil(N / Math.floor((W - padL - padR) / 10));
  freqs.forEach((f, i) => {
    const x = scaleX(f, 0, 1, padL, W, padR);
    const col = Math.floor((W - padL - padR) / 10);
    const row = Math.floor(i / col);
    const y = padT + 20 + row * 12 + 4;
    const inZone = Math.abs(f - p) <= marge;
    ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = inZone ? 'rgba(29,106,64,0.7)' : 'rgba(192,57,43,0.8)';
    ctx.fill();
  });

  const prop = inCount / N;
  const el = document.getElementById('if-result');
  el.innerHTML =
    `\\(N=${N}\\) échantillons · taille \\(n=${n}\\) · \\(p=${fmt2(p)}\\) · marge \\(\\frac{1}{\\sqrt{${n}}}=${fmt4(marge)}\\)<br>`
    + `Fréquences dans \\(\\left[${fmt4(p-marge)}\\,;\\,${fmt4(p+marge)}\\right]\\) : `
    + `\\(${inCount}\\) sur \\(${N}\\) = <strong>${pct(prop)}</strong> `
    + `<span style="color:${prop >= 0.90 ? 'var(--sage)' : 'var(--rust)'};">`
    + (prop >= 0.90 ? '✓ proche de 95 %' : '⚠ éloigné de 95 % — essayer n plus grand') + `</span>`;
  renderKatex(el);
}

// ============================================================
// 04b — INTERVAL CALCULATOR
// ============================================================
function calcInterval() {
  const p = parseFloat(document.getElementById('calc-p').value);
  const n = parseInt(document.getElementById('calc-n').value);
  const el = document.getElementById('calc-result');
  if (isNaN(p) || isNaN(n) || p <= 0 || p >= 1 || n < 1) {
    el.innerHTML = 'Entrez \\(0 < p < 1\\) et \\(n \\geqslant 1\\).'; renderKatex(el); return;
  }
  const marge = 1 / Math.sqrt(n);
  const lo = Math.max(0, p - marge), hi = Math.min(1, p + marge);
  const exact_lo = (p - 1.96 * Math.sqrt(p*(1-p)/n)).toFixed(4);
  const exact_hi = (p + 1.96 * Math.sqrt(p*(1-p)/n)).toFixed(4);
  el.innerHTML =
    `\\(\\frac{1}{\\sqrt{n}} = \\frac{1}{\\sqrt{${n}}} \\approx ${marge.toFixed(4)}\\)<br>`
    + `<strong>Intervalle de fluctuation (programme) :</strong> \\(\\left[${p.toFixed(4)}-${marge.toFixed(4)}\\,;\\,${p.toFixed(4)}+${marge.toFixed(4)}\\right] = \\left[${lo.toFixed(4)}\\,;\\,${hi.toFixed(4)}\\right]\\)<br>`
    + `<span style="font-size:0.82rem; color:var(--slate);">Intervalle exact à 95 % (hors programme) : \\(\\left[${exact_lo}\\,;\\,${exact_hi}\\right]\\)</span>`;
  renderKatex(el);
}

// ============================================================
// 05 — CONFIDENCE INTERVALS visualisation
// ============================================================
function runConfidenceIntervals() {
  const p  = parseFloat(document.getElementById('est-p').value);
  const n  = parseInt(document.getElementById('est-n').value);
  const N  = parseInt(document.getElementById('est-N').value);
  const cv = initCanvas('estCanvas', 420);
  if (!cv) return;
  const { ctx, W, H } = cv;
  ctx.clearRect(0, 0, W, H);

  const padL = 52, padR = 16, padT = 20, padB = 36;
  const rng  = makePRNG();
  const marge = 1 / Math.sqrt(n);

  // Generate samples
  const samples = [];
  for (let i = 0; i < N; i++) {
    const f = drawSample(n, p, rng) / n;
    const lo = Math.max(0, f - marge), hi = Math.min(1, f + marge);
    const covers = lo <= p && p <= hi;
    samples.push({ f, lo, hi, covers });
  }

  const rowH = (H - padT - padB) / N;
  const minF = 0, maxF = 1;

  // Draw each CI
  samples.forEach((s, i) => {
    const y = padT + (i + 0.5) * rowH;
    const x1 = scaleX(s.lo, minF, maxF, padL, W, padR);
    const x2 = scaleX(s.hi, minF, maxF, padL, W, padR);
    const xf = scaleX(s.f,  minF, maxF, padL, W, padR);
    const lw = Math.max(1.5, rowH - 1);

    ctx.strokeStyle = s.covers ? 'rgba(29,106,64,0.55)' : 'rgba(192,57,43,0.8)';
    ctx.lineWidth = Math.min(lw, 4);
    ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();

    // Tick caps
    ctx.beginPath(); ctx.moveTo(x1, y - lw/2); ctx.lineTo(x1, y + lw/2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2, y - lw/2); ctx.lineTo(x2, y + lw/2); ctx.stroke();

    // f dot
    ctx.beginPath(); ctx.arc(xf, y, Math.min(3, lw/2 + 0.5), 0, Math.PI * 2);
    ctx.fillStyle = s.covers ? '#1d6a40' : '#c0392b'; ctx.fill();
  });

  // p reference line
  const px = scaleX(p, minF, maxF, padL, W, padR);
  ctx.strokeStyle = '#1a1410'; ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);
  ctx.beginPath(); ctx.moveTo(px, padT); ctx.lineTo(px, H - padB); ctx.stroke();
  ctx.setLineDash([]);

  // Axis
  drawHAxis(ctx, W, H, padL, padR, padB, 0, 1, 5);
  ctx.fillStyle = '#888'; ctx.font = '10px DM Mono, monospace'; ctx.textAlign = 'center';
  ctx.fillText('Valeur de p (et intervalles f ± 1/√n)', padL + (W - padL - padR) / 2, H - 2);
  ctx.fillStyle = '#1a1410'; ctx.fillText(`p = ${fmt2(p)}`, px + 4, padT + 10);

  const covered = samples.filter(s => s.covers).length;
  const prop = covered / N;
  const el = document.getElementById('est-result');
  el.innerHTML =
    `\\(N=${N}\\) intervalles \\([f - \\frac{1}{\\sqrt{${n}}}\\,;\\, f + \\frac{1}{\\sqrt{${n}}}]\\) construits avec \\(p=${fmt2(p)}\\)<br>`
    + `<span style="color:var(--sage)">●</span> Intervalles contenant \\(p\\) : \\(${covered}/${N} = ${pct(prop)}\\) `
    + `<span style="color:var(--rust)">●</span> Ne contenant pas \\(p\\) : \\(${N-covered}/${N} = ${pct(1-prop)}\\)<br>`
    + (prop >= 0.88
        ? `<span style="color:var(--sage);">✓ Environ 95 % des intervalles contiennent bien la vraie valeur \\(p\\).</span>`
        : `<span style="color:var(--rust);">Augmenter \\(N\\) ou \\(n\\) pour mieux illustrer la propriété à 95 %.</span>`);
  renderKatex(el);
}

// ============================================================
// PROOF TOGGLE
// ============================================================
function toggleProof(id) {
  const body = document.getElementById(id);
  const btn = body.previousElementSibling;
  body.classList.toggle('visible');
  btn.classList.toggle('open', body.classList.contains('visible'));
}

// ============================================================
// CHRONO
// ============================================================
let chronoTimer = null, chronoSecs = 0, chronoPaused = false;
function toggleChronoVisibility() {
  const bar = document.getElementById('chrono-bar');
  const btn = document.getElementById('chrono-toggle-btn');
  const hidden = bar.classList.toggle('hidden');
  btn.textContent = hidden ? '⏱ Afficher chronomètre' : '⏱ Masquer chronomètre';
  if (!hidden && !chronoTimer)
    chronoTimer = setInterval(() => { if (!chronoPaused) { chronoSecs++; updateChronoDisplay(); } }, 1000);
}
function toggleChrono() {
  chronoPaused = !chronoPaused;
  document.getElementById('chrono-pause-btn').textContent = chronoPaused ? 'Reprendre' : 'Pause';
}
function resetChrono() {
  chronoSecs = 0; chronoPaused = false;
  document.getElementById('chrono-pause-btn').textContent = 'Pause';
  updateChronoDisplay();
}
function updateChronoDisplay() {
  const m = String(Math.floor(chronoSecs / 60)).padStart(2, '0');
  const s = String(chronoSecs % 60).padStart(2, '0');
  document.getElementById('chrono-display').textContent = `${m}:${s}`;
}

// ============================================================
// 07 — QCM
// ============================================================
let qcmScore = 0, qcmTotal = 0;

function generateQCM() {
  qcmScore = 0; qcmTotal = 0; updateScore();
  const container = document.getElementById('qcm-container');
  container.innerHTML = '';
  buildEchantQuestions().forEach((q, i) => container.appendChild(renderQuestion(q, i)));
  renderKatex(container);
}

function updateScore() {
  document.getElementById('qcm-score').textContent = `${qcmScore} / ${qcmTotal}`;
}

function buildEchantQuestions() {
  const qs = [];

  // Q1 — Fréquence
  {
    const ns = [40, 50, 80, 100, 200];
    const ps = [0.3, 0.4, 0.5, 0.6, 0.7];
    const n = ns[Math.floor(Math.random() * ns.length)];
    const p = ps[Math.floor(Math.random() * ps.length)];
    const k = Math.round(p * n);
    const f = k / n;
    qs.push({
      q: `Dans un échantillon de taille \\(n=${n}\\), on observe \\(k=${k}\\) succès. Quelle est la fréquence observée \\(f\\) ?`,
      choices: [
        `\\(f = \\dfrac{${k}}{${n}} = ${f.toFixed(4)}\\)`,
        `\\(f = \\dfrac{${n}}{${k}} \\approx ${(n/k).toFixed(2)}\\)`,
        `\\(f = ${k} \\times ${n} = ${k*n}\\)`
      ],
      correct: 0,
      explanation: `La fréquence est le rapport \\(f = \\dfrac{k}{n} = \\dfrac{${k}}{${n}} = ${f.toFixed(4)}\\). C'est toujours un nombre entre 0 et 1.`
    });
  }

  // Q2 — Loi des grands nombres
  {
    const ps = [0.3, 0.4, 0.6, 0.7];
    const p = ps[Math.floor(Math.random() * ps.length)];
    qs.push({
      q: `On lance une pièce truquée dont la probabilité de « Pile » est \\(p = ${p}\\). Que prédit la loi des grands nombres pour un grand nombre de lancers ?`,
      choices: [
        `La fréquence de « Pile » sera proche de \\(${p}\\)`,
        `Le prochain lancer sera forcément « Face » pour compenser`,
        `La fréquence sera exactement \\(${p}\\) après 1000 lancers`
      ],
      correct: 0,
      explanation: `La loi des grands nombres dit que la fréquence <em>converge en probabilité</em> vers \\(p=${p}\\) quand \\(n\\) est grand. Elle ne dit pas que c'est certain, ni qu'un lancer "compense" les précédents.`
    });
  }

  // Q3 — Marge 1/√n
  {
    const ns = [25, 100, 400, 900];
    const n = ns[Math.floor(Math.random() * ns.length)];
    const marge = 1 / Math.sqrt(n);
    const margeStr = marge.toFixed(3);
    const wrong1 = (1 / n).toFixed(4);
    const wrong2 = (Math.sqrt(n)).toFixed(1);
    qs.push({
      q: `Pour un échantillon de taille \\(n=${n}\\), quelle est la marge de l'intervalle de fluctuation \\(\\dfrac{1}{\\sqrt{n}}\\) ?`,
      choices: [
        `\\(\\dfrac{1}{\\sqrt{${n}}} = ${margeStr}\\)`,
        `\\(\\dfrac{1}{${n}} = ${wrong1}\\)`,
        `\\(\\sqrt{${n}} = ${wrong2}\\)`
      ],
      correct: 0,
      explanation: `\\(\\dfrac{1}{\\sqrt{${n}}} = \\dfrac{1}{${Math.sqrt(n)}} \\approx ${margeStr}\\). La marge diminue quand \\(n\\) augmente : pour \\(n=400\\), la marge est \\(0{,}05\\) soit \\(\\pm 5\\%\\).`
    });
  }

  // Q4 — Intervalle de fluctuation
  {
    const ns = [100, 400];
    const ps_list = [0.3, 0.5, 0.6];
    const n = ns[Math.floor(Math.random() * ns.length)];
    const p = ps_list[Math.floor(Math.random() * ps_list.length)];
    const marge = 1 / Math.sqrt(n);
    const lo = (p - marge).toFixed(3), hi = (p + marge).toFixed(3);
    const lo2 = (p - marge * 2).toFixed(3), hi2 = (p + marge * 2).toFixed(3);
    qs.push({
      q: `Avec \\(p=${p}\\) et \\(n=${n}\\), quel est l'intervalle de fluctuation au seuil 95 % ?`,
      choices: [
        `\\([${lo}\\,;\\,${hi}]\\)`,
        `\\([${lo2}\\,;\\,${hi2}]\\)`,
        `\\([0\\,;\\,1]\\)`
      ],
      correct: 0,
      explanation: `\\([p - \\frac{1}{\\sqrt{n}}\\,;\\,p + \\frac{1}{\\sqrt{n}}] = [${p} - ${marge.toFixed(3)}\\,;\\,${p} + ${marge.toFixed(3)}] = [${lo}\\,;\\,${hi}]\\).`
    });
  }

  // Q5 — Proportion dans l'intervalle
  qs.push({
    q: `On simule \\(N = 1000\\) échantillons de taille \\(n\\) et on calcule la proportion pour laquelle \\(|f - p| \\leqslant \\dfrac{1}{\\sqrt{n}}\\). Vers quelle valeur doit converger cette proportion ?`,
    choices: [
      `Vers \\(0{,}95\\) (95 %)`,
      `Vers \\(1\\) (100 %)`,
      `Vers \\(0{,}68\\) (68 %)`
    ],
    correct: 0,
    explanation: `L'intervalle \\([p - \\frac{1}{\\sqrt{n}}\\,;\\,p + \\frac{1}{\\sqrt{n}}]\\) est construit précisément pour contenir \\(f\\) dans environ 95 % des cas. C'est la définition de l'intervalle de fluctuation au seuil 95 %.`
  });

  // Q6 — Estimation
  {
    const ns2 = [100, 200, 400, 1000];
    const n = ns2[Math.floor(Math.random() * ns2.length)];
    const k = Math.floor(n * 0.35 + (Math.random() - 0.5) * n * 0.1);
    const f = (k / n);
    const marge = 1 / Math.sqrt(n);
    const lo = Math.max(0, f - marge), hi = Math.min(1, f + marge);
    qs.push({
      q: `Dans un sondage sur \\(n=${n}\\) personnes, \\(k=${k}\\) répondent « oui ». On estime la probabilité de « oui » par \\(\\hat{p}=f\\). Quel est l'intervalle de confiance à 95 % ?`,
      choices: [
        `\\([${lo.toFixed(3)}\\,;\\,${hi.toFixed(3)}]\\)`,
        `\\([0\\,;\\,${(2*f).toFixed(3)}]\\)`,
        `\\([${(f*0.9).toFixed(3)}\\,;\\,${(f*1.1).toFixed(3)}]\\)`
      ],
      correct: 0,
      explanation: `\\(f = \\frac{${k}}{${n}} = ${f.toFixed(4)}\\). Intervalle : \\([f - \\frac{1}{\\sqrt{n}}\\,;\\, f + \\frac{1}{\\sqrt{n}}] = [${lo.toFixed(3)}\\,;\\,${hi.toFixed(3)}]\\). On estime que la vraie probabilité appartient à cet intervalle avec 95 % de confiance.`
    });
  }

  // Shuffle choices
  return qs.map(q => {
    const indexed = q.choices.map((c, i) => ({ c, i }));
    for (let i = indexed.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
    }
    return { ...q, choices: indexed.map(it => it.c), correct: indexed.findIndex(it => it.i === q.correct) };
  });
}

function renderQuestion(q, idx) {
  qcmTotal++; updateScore();
  const div = document.createElement('div');
  div.className = 'qcm-question';
  const qEl = document.createElement('div');
  qEl.className = 'qcm-q';
  qEl.innerHTML = `<strong>${idx + 1}.</strong> ${q.q}`;
  div.appendChild(qEl);
  const choicesEl = document.createElement('div');
  choicesEl.className = 'qcm-choices';
  q.choices.forEach((c, ci) => {
    const btn = document.createElement('button');
    btn.className = 'qcm-choice';
    btn.innerHTML = c;
    btn.onclick = () => answerQ(ci, q, div, choicesEl);
    choicesEl.appendChild(btn);
  });
  div.appendChild(choicesEl);
  return div;
}

function answerQ(chosen, q, div, choicesEl) {
  const btns = choicesEl.querySelectorAll('.qcm-choice');
  btns.forEach(b => b.disabled = true);
  const correct = chosen === q.correct;
  btns[chosen].classList.add(correct ? 'correct' : 'wrong');
  if (!correct) btns[q.correct].classList.add('correct');
  div.classList.add(correct ? 'answered-ok' : 'answered-ko');
  if (correct) qcmScore++;
  updateScore();
  const exp = document.createElement('div');
  exp.className = 'qcm-explanation';
  exp.innerHTML = (correct ? '✓ ' : '✗ ') + q.explanation;
  div.appendChild(exp);
  renderKatex(exp);
}

// ============================================================
// RESIZE
// ============================================================
window.addEventListener('resize', () => {
  runOneSample();
  runLGN();
  runFluctuation();
  runIntervalSim();
  runConfidenceIntervals();
});

// ════════════════════════════════════════════════════════
// PYODIDE — Python editor engine
// Chargé dynamiquement (IntersectionObserver) pour ne
// jamais bloquer le rendu des canvas de simulation.
// ════════════════════════════════════════════════════════

let pyodide        = null;
let pyodideLoading = false;

function pyStatus(state, msg) {
  const dot  = document.getElementById('py-dot');
  const text = document.getElementById('py-status-text');
  if (!dot || !text) return;
  dot.className    = 'py-dot ' + state;
  text.textContent = msg;
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function pyOut(id, text, isError) {
  const el = document.getElementById('out-' + id);
  if (!el) return;
  if (isError) {
    el.innerHTML = `<span class="py-err">${escHtml(text)}</span>`;
  } else {
    el.textContent = text || '';
    if (!text) el.innerHTML = '<span class="py-ok">✓ Exécution terminée (aucune sortie).</span>';
  }
}

async function initPyodide() {
  if (pyodide || pyodideLoading) return;
  pyodideLoading = true;
  pyStatus('loading', 'Chargement de Python (Pyodide) — première visite : ~5-10 s…');

  await new Promise((resolve, reject) => {
    const s   = document.createElement('script');
    s.src     = 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js';
    s.onload  = resolve;
    s.onerror = () => reject(new Error('Impossible de charger pyodide.js'));
    document.head.appendChild(s);
  });

  try {
    pyodide = await loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/',
    });
    pyStatus('ready', 'Python prêt ✓ — modifie le code librement et exécute-le dans le navigateur.');
  } catch (e) {
    pyStatus('error', 'Erreur de chargement : ' + e.message);
    pyodideLoading = false;
  }
}

async function runPython(id) {
  const textarea = document.getElementById('code-' + id);
  const outEl    = document.getElementById('out-' + id);
  if (!textarea || !outEl) return;

  const code = textarea.value;
  outEl.innerHTML = '<span style="color:var(--gold)">⏳ Exécution en cours…</span>';

  if (!pyodide) {
    if (!pyodideLoading) initPyodide();
    outEl.innerHTML = '<span style="color:var(--gold)">⏳ Python se charge, réessaie dans quelques secondes…</span>';
    return;
  }

  try {
    // Capturer stdout + stderr
    pyodide.runPython(`
import sys, io as _io
_captured = _io.StringIO()
sys.stdout = _captured
sys.stderr = _captured
`);
    await pyodide.runPythonAsync(code);
    const output = pyodide.runPython('_captured.getvalue()');
    pyodide.runPython('sys.stdout = sys.__stdout__; sys.stderr = sys.__stderr__');
    pyOut(id, output.replace(/\n$/, ''), false);
  } catch (err) {
    try { pyodide.runPython('sys.stdout = sys.__stdout__; sys.stderr = sys.__stderr__'); } catch (_) {}
    pyOut(id, err.message, true);
  }
}

// Noms de fichiers pour le téléchargement
const PY_FILENAMES = {
  succes:     'nb_succes.py',
  lgn:        'loi_grands_nombres.py',
  intervalle: 'proportion_intervalle.py',
  sondage:    'simulation_sondage.py',
  libre:      'mon_code.py',
};

function downloadPy(id) {
  const code = document.getElementById('code-' + id)?.value ?? '';
  const name = PY_FILENAMES[id] ?? (id + '.py');
  const blob = new Blob([code], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const LIBRE_INIT = `# ── Zone libre — écris ton code ici ───────────────────────────
from random import random
import math, statistics

def nb_succes(n, p):
    return sum(1 for _ in range(n) if random() < p)

# Idée : comparer l'écart-type théorique sqrt(p(1-p)/n)
# avec l'écart-type observé sur N échantillons
p, n, N = 0.4, 100, 200

frequences = [nb_succes(n, p) / n for _ in range(N)]
sigma_obs  = statistics.stdev(frequences)
sigma_theo = math.sqrt(p * (1 - p) / n)

print(f"p={p}, n={n}, N={N} échantillons")
print(f"Écart-type observé  σ_obs  = {sigma_obs:.5f}")
print(f"Écart-type théorique σ_theo = {sigma_theo:.5f}")
print(f"Rapport : {sigma_obs/sigma_theo:.3f}  (devrait être ≈ 1)")`;

function resetLibre() {
  const ta = document.getElementById('code-libre');
  if (ta) { ta.value = LIBRE_INIT; }
  const out = document.getElementById('out-libre');
  if (out) out.innerHTML = '<span class="py-placeholder">Cliquez sur ▶ Exécuter pour lancer le code.</span>';
}

// Support touche Tab dans les éditeurs
function addTabSupport() {
  document.querySelectorAll('.py-editor').forEach(ta => {
    ta.addEventListener('keydown', e => {
      if (e.key !== 'Tab') return;
      e.preventDefault();
      const s = ta.selectionStart;
      ta.value = ta.value.slice(0, s) + '    ' + ta.value.slice(ta.selectionEnd);
      ta.selectionStart = ta.selectionEnd = s + 4;
    });
  });
}

// Lazy-load Pyodide via IntersectionObserver
(function setupPyodideLazyLoad() {
  const section = document.getElementById('python');
  if (!section) return;
  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        initPyodide();
        obs.disconnect();
      }
    }, { rootMargin: '300px' });
    obs.observe(section);
  } else {
    setTimeout(initPyodide, 2500);
  }
})();

// Tab support (après DOM ready)
document.addEventListener('DOMContentLoaded', addTabSupport);