// INDIE MIAMI x GRIM DAWN ARCHER — Cordova / HTML5 Canvas, 0 librairie
const canvas = document.getElementById('c'), ctx = canvas.getContext('2d');
const ld = s => { const i = new Image(); i.src = s + '?v=' + Date.now(); return i; }; // ?v= évite le cache
const player = ld('player.png'), enemies = ld('enemies.png');
const ok = i => i.complete && i.naturalWidth > 0;
const R = Math.random, dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y), AOE = 80;
let W = 640, H = 360, P, E, A, D, F, T, arrows, fish, expl, score, spawnT, regenT, over, overT, firing, tid, touch, flash, last = 0;
let keys = {}, aim = { x: 0, y: 0 };

// ---------- système de charge + bouton tir ----------
let charging = false, chargeT = 0, chargeLvl = 0, lastVibLvl = -1, aimBtn = null;
const CHARGE_LEVELS = [0.35, 0.9, 1.6];        // temps (s) pour atteindre niv 1, 2, 3
const CHARGE_MULT   = [1, 1.6, 2.5];            // multiplicateur dégâts
const CHARGE_COLORS = ['#1de9b6', '#ffe14d', '#ff7b00', '#ff3cac'];
const CHARGE_NAMES  = ['', 'PUISSANT', 'LOURD', 'EXPLOSIF'];

const bg = document.createElement('canvas');
const btns = [{ t: 'CRAFT [C]', f: () => craftExplosive() }, { t: 'BOOM [E]', f: () => shoot(true) }];

// ---------- vibration (Android only, silencieux ailleurs) ----------
function vib(pattern) {
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {}
}

// ---------- taille écran : ~640 px logiques sur le grand côté, étiré en plein écran ----------
function fit() {
  const k = 640 / Math.max(innerWidth, innerHeight, 1);
  W = canvas.width = bg.width = Math.round(innerWidth * k) || 640;
  H = canvas.height = bg.height = Math.round(innerHeight * k) || 360;
  const b = bg.getContext('2d'), g = b.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#2a0a4a'); g.addColorStop(1, '#0b1a3a'); b.fillStyle = g; b.fillRect(0, 0, W, H);
  b.lineWidth = 1;
  for (let x = 0; x <= W; x += 40) { b.strokeStyle = 'rgba(255,60,172,.18)'; b.beginPath(); b.moveTo(x, 0); b.lineTo(x, H); b.stroke(); }
  for (let y = 0; y <= H; y += 40) { b.strokeStyle = 'rgba(29,233,182,.15)'; b.beginPath(); b.moveTo(0, y); b.lineTo(W, y); b.stroke(); }
  btns.forEach((b, i) => { b.x = W - 108 - i * 108; b.y = H - 52; b.w = 100; b.h = 42; });
  if (P) { P.x = Math.min(P.x, W - 16); P.y = Math.min(P.y, H - 30); }
}

function reset() {
  P = { x: W / 2, y: H / 2, hp: 100, max: 100, cd: 0, shoot: 0, anim: 0, hit: 0 };
  E = []; A = []; D = []; F = []; T = [];
  arrows = 20; fish = 0; expl = 0; score = 0; spawnT = 1; regenT = 0;
  over = false; overT = 0; firing = false; tid = null; touch = null; flash = 0; aim = { x: W / 2 + 60, y: H / 2 };
  charging = false; chargeT = 0; chargeLvl = 0; lastVibLvl = -1; aimBtn = null;
}

// ---------- actions ----------
function shoot(explosive, lvl = 0) {
  if (P.cd > 0 || over) return;
  if (explosive) { if (expl < 1) return; expl--; } else { if (arrows < 1) return; arrows--; }

  const angle = Math.atan2(aim.y - P.y, aim.x - P.x);
  const mult = explosive ? 1 : CHARGE_MULT[lvl];
  A.push({
    x: P.x, y: P.y - 4, angle,
    speed: explosive ? 380 : 520 * (1 + lvl * 0.15),
    explosive: explosive || lvl >= 3,
    dmg: explosive ? 30 : Math.round(10 * mult),
    aoe: explosive ? AOE : AOE * (lvl / 3 || 0),
    lvl,
    life: 1.3
  });
  P.cd = explosive ? 0.45 : (0.22 + lvl * 0.08);
  P.shoot = 0.15;

  // Vibrations différenciées au tir selon niveau
  if (lvl === 0) vib(15);
  else if (lvl === 1) vib(25);
  else if (lvl === 2) vib([30, 20, 30]);
  else vib([40, 30, 60, 30, 80]);
}

function craftExplosive() {
  if (fish >= 1 && arrows >= 3) { fish--; arrows -= 3; expl++; text(P.x, P.y - 40, 'CRAFT +1 EXPL', '#ff3cac'); vib(20); }
  else { text(P.x, P.y - 40, 'Need 1 fish + 3 arrows', '#ccc'); vib([10, 30, 10]); }
}

function text(x, y, s, c) { T.push({ x, y, s, c, t: 1 }); }

function explode(x, y, radius = AOE) {
  F.push({ x, y, t: 0, r: radius }); flash = 0.12;
  for (const e of E) if (!e.dead && dist(e, { x, y }) < radius) hurt(e, 30);
}

function hurt(e, d) {
  e.hp -= d; e.flash = 0.1;
  if (e.hp > 0 || e.dead) return;
  e.dead = true; score += 10;
  const r = R();
  if (r < 0.4) D.push({ x: e.x, y: e.y, k: 'fish', t: 12 });
  else if (r < 0.65) D.push({ x: e.x, y: e.y, k: 'arrow', t: 12 });
}

function spawn() {
  if (E.length > 35) return;
  const s = (R() * 4) | 0, type = (R() * 4) | 0;
  const x = s < 2 ? R() * W : (s == 2 ? -24 : W + 24), y = s < 2 ? (s ? H + 24 : -24) : R() * H;
  E.push({ x, y, type, hp: 30, sp: 48 + type * 5 + R() * 14 + Math.min(score / 40, 40), anim: R() * 6, flash: 0, hit: 0 });
}

// ---------- update ----------
function update(dt) {
  if (over) { overT += dt; return; }

  // 👇 gestion de la charge : monte palier par palier + vibration à chaque palier
  if (charging) {
    chargeT += dt;
    let lvl = 0;
    for (let i = 0; i < CHARGE_LEVELS.length; i++) if (chargeT >= CHARGE_LEVELS[i]) lvl = i + 1;
    if (lvl !== chargeLvl) {
      chargeLvl = lvl;
      if (lvl > lastVibLvl && lvl > 0) {
        vib(lvl === 1 ? 20 : lvl === 2 ? [20, 40, 20] : [30, 30, 60, 30, 30]);
        lastVibLvl = lvl;
      }
    }
  }

  let mx = 0, my = 0, sp = 140;
  if (keys.ArrowLeft || keys.q || keys.a) mx--; if (keys.ArrowRight || keys.d) mx++;
  if (keys.ArrowUp || keys.z || keys.w) my--; if (keys.ArrowDown || keys.s) my++;
  if (touch && !charging && dist(touch, P) > 30) { mx = touch.x - P.x; my = touch.y - P.y; sp = 100; }
  const l = Math.hypot(mx, my) || 1;
  if (mx || my) { P.x = Math.max(20, Math.min(W - 20, P.x + mx / l * sp * dt)); P.y = Math.max(40, Math.min(H - 26, P.y + my / l * sp * dt)); P.anim += dt * 10; }
  P.cd -= dt; P.shoot -= dt; P.hit -= dt; flash -= dt;
  if (firing) shoot(false, chargeLvl);
  regenT += dt; if (regenT > 1.5 && arrows < 10) { arrows++; regenT = 0; }
  spawnT -= dt;
  if (spawnT <= 0) { spawn(); spawnT = Math.max(0.35, 1.5 - score / 350); }

  for (const e of E) {
    const d = Math.hypot(P.x - e.x, P.y - e.y) || 1;
    e.x += (P.x - e.x) / d * e.sp * dt; e.y += (P.y - e.y) / d * e.sp * dt;
    e.anim += dt * 8; e.flash -= dt; e.hit -= dt;
    for (const o of E) if (o !== e) {
      const q = dist(e, o);
      if (q < 22 && q > 0) { e.x += (e.x - o.x) / q * 40 * dt; e.y += (e.y - o.y) / q * 40 * dt; }
    }
    if (d < 26 && e.hit <= 0 && P.hit <= 0) {
      P.hp -= 8; P.hit = 0.6; e.hit = 0.8;
      vib(60);
      if (P.hp <= 0) { P.hp = 0; over = true; overT = 0; firing = false; charging = false; vib([80, 40, 80, 40, 200]); }
    }
  }

  for (const a of A) {
    a.x += Math.cos(a.angle) * a.speed * dt;
    a.y += Math.sin(a.angle) * a.speed * dt;
    a.life -= dt;
    let hit = false;
    for (const e of E) if (!e.dead && dist(a, e) < 20) {
      if (a.explosive) explode(a.x, a.y, a.aoe || AOE);
      else hurt(e, a.dmg || 10);
      hit = true; break;
    }
    if (!hit && a.explosive && a.life <= 0) { explode(a.x, a.y, a.aoe || AOE); hit = true; }
    if (hit || a.life <= 0 || a.x < -20 || a.x > W + 20 || a.y < -20 || a.y > H + 20) a.dead = true;
  }

  for (const d of D) {
    d.t -= dt;
    if (dist(d, P) < 26) {
      d.t = 0;
      if (d.k == 'fish') { fish++; text(d.x, d.y - 10, '+1 ><>', '#3cf'); vib(15); }
      else { arrows = Math.min(40, arrows + 3); text(d.x, d.y - 10, '+3 ARR', '#ffe14d'); vib(15); }
    }
  }

  for (const f of F) f.t += dt;
  for (const t of T) { t.t -= dt; t.y -= 24 * dt; }
  E = E.filter(e => !e.dead); A = A.filter(a => !a.dead); D = D.filter(d => d.t > 0);
  F = F.filter(f => f.t < 0.35); T = T.filter(t => t.t > 0);
}

// ---------- draw ----------
function shadow(x, y) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x, y + 22, 16, 5, 0, 0, 7); ctx.fill(); }

function bar(x, y, w, h, pct) {
  ctx.fillStyle = '#4a0a0a'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = pct > 0.5 ? '#2ecc40' : pct > 0.25 ? '#f1c40f' : '#e74c3c'; ctx.fillRect(x, y, w * pct, h);
  ctx.strokeStyle = '#a07c3c'; ctx.lineWidth = 2; ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);
}

function drawPlayer() {
  const a = Math.atan2(aim.y - P.y, aim.x - P.x), dir = Math.abs(a) < 0.785 ? 0 : Math.abs(a) > 2.356 ? 2 : a > 0 ? 1 : 3;
  const bob = Math.sin(P.anim) * 1.5;
  shadow(P.x, P.y);
  ctx.save(); ctx.translate(P.x, P.y + bob);
  if (ok(player)) { const w = player.width / 4; ctx.drawImage(player, dir * w, 0, w, player.height, -26, -26, 52, 52); }
  else { ctx.fillStyle = '#1de9b6'; ctx.beginPath(); ctx.arc(0, 0, 18, 0, 7); ctx.fill(); }
  ctx.rotate(a); ctx.lineCap = 'round';
  ctx.lineWidth = 3; ctx.strokeStyle = '#ffb347'; ctx.beginPath(); ctx.arc(-2, 0, 22, -1.1, 1.1); ctx.stroke();
  ctx.lineWidth = 1; ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.moveTo(8, -20); ctx.lineTo(P.shoot > 0 ? -8 : 8, 0); ctx.lineTo(8, 20); ctx.stroke();
  ctx.restore();
}

// position du bouton tir (bas-droite)
const FIRE = { r: 56 };
function fireBtnPos() { return { x: W - FIRE.r - 20, y: H - FIRE.r - 20 }; }
function inFireBtn(p) { const b = fireBtnPos(); return Math.hypot(p.x - b.x, p.y - b.y) < FIRE.r * 1.3; }

function draw(now) {
  ctx.globalAlpha = 1; ctx.drawImage(bg, 0, 0);
  ctx.font = 'bold 16px monospace'; ctx.textAlign = 'center';

  for (const d of D) {
    const by = d.y + Math.sin(now / 200 + d.x) * 3; if (d.t < 3 && ((now / 120) | 0) % 2) continue;
    if (d.k == 'fish') { ctx.fillStyle = '#3cf'; ctx.fillText('><>', d.x, by); }
    else { ctx.fillStyle = '#ffe14d'; for (let i = 0; i < 3; i++) ctx.fillRect(d.x - 8, by - 6 + i * 5, 16, 2); }
  }

  const all = E.map(e => ({ y: e.y, e })).concat([{ y: P.y, p: 1 }]).sort((a, b) => a.y - b.y);
  for (const o of all) {
    if (o.p) { if (!(P.hit > 0 && ((now / 60) | 0) % 2)) drawPlayer(); continue; }
    const e = o.e; shadow(e.x, e.y); ctx.globalAlpha = e.flash > 0 ? 0.5 : 1;
    if (ok(enemies)) { const w = enemies.width / 4; ctx.drawImage(enemies, e.type * w, 0, w, enemies.height, e.x - 22, e.y - 22 - Math.abs(Math.sin(e.anim)) * 2, 44, 44); }
    else { ctx.fillStyle = ['#e63946', '#2a6fdb', '#f4c20d', '#9b3fd1'][e.type]; ctx.beginPath(); ctx.arc(e.x, e.y, 16, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1; bar(e.x - 14, e.y - 32, 28, 3, e.hp / 30);
  }

  for (const a of A) {
    ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.angle);
    const col = a.explosive ? '#ff7b00' : (a.lvl >= 2 ? '#ffe14d' : '#1de9b6');
    ctx.fillStyle = col;
    const len = 18 + (a.lvl || 0) * 4;
    ctx.fillRect(-len + 4, -1 - (a.lvl || 0) * 0.5, len, 2 + (a.lvl || 0));
    ctx.fillStyle = a.explosive ? '#ff3cac' : '#fff';
    ctx.fillRect(4, -3, 5, 6); ctx.restore();
  }

  for (const f of F) {
    const k = f.t / 0.35; ctx.globalAlpha = 1 - k; ctx.fillStyle = '#ff7b00';
    ctx.beginPath(); ctx.arc(f.x, f.y, (f.r || AOE) * k, 0, 7); ctx.fill();
    ctx.strokeStyle = '#ffe14d'; ctx.lineWidth = 3; ctx.stroke(); ctx.globalAlpha = 1;
  }

  if (flash > 0) { ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(0, 0, W, H); }

  // ---------- viseur + ligne joueur->viseur ----------
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  ctx.fillRect(aim.x - 6, aim.y - 1, 12, 2);
  ctx.fillRect(aim.x - 1, aim.y - 6, 2, 12);
  ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(aim.x, aim.y); ctx.stroke();

  // ---------- BOUTON TIR avec jauge de charge ----------
  const fb = fireBtnPos();
  const ccol = CHARGE_COLORS[chargeLvl];

  // halo pulsant si niveau max
  if (chargeLvl >= 3) {
    const pulse = 0.5 + 0.5 * Math.sin(now / 80);
    ctx.beginPath(); ctx.arc(fb.x, fb.y, FIRE.r + pulse * 8, 0, 7);
    ctx.strokeStyle = ccol; ctx.lineWidth = 3; ctx.globalAlpha = 1 - pulse; ctx.stroke(); ctx.globalAlpha = 1;
  }

  // corps du bouton
  ctx.beginPath(); ctx.arc(fb.x, fb.y, FIRE.r, 0, 7);
  ctx.fillStyle = 'rgba(20,10,40,.75)'; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = ccol; ctx.stroke();

  // jauge de progression vers le prochain palier
  if (charging && chargeLvl < 3) {
    const prev = chargeLvl === 0 ? 0 : CHARGE_LEVELS[chargeLvl - 1];
    const next = CHARGE_LEVELS[chargeLvl];
    const pct = Math.min(1, (chargeT - prev) / (next - prev));
    ctx.beginPath();
    ctx.arc(fb.x, fb.y, FIRE.r - 5, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
    ctx.lineWidth = 6; ctx.strokeStyle = ccol; ctx.stroke();
  }

  // petites graduations aux 3 paliers (toujours visibles)
  for (let i = 0; i < CHARGE_LEVELS.length; i++) {
    const a0 = -Math.PI / 2 + (i + 1) / 3 * Math.PI * 2;
    const x1 = fb.x + Math.cos(a0) * (FIRE.r - 3), y1 = fb.y + Math.sin(a0) * (FIRE.r - 3);
    const x2 = fb.x + Math.cos(a0) * (FIRE.r + 3), y2 = fb.y + Math.sin(a0) * (FIRE.r + 3);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = i + 1 <= chargeLvl ? CHARGE_COLORS[i + 1] : '#666';
    ctx.lineWidth = 2; ctx.stroke();
  }

  // icône flèche
  ctx.save(); ctx.translate(fb.x, fb.y); ctx.rotate(-Math.PI / 4);
  ctx.fillStyle = ccol; ctx.fillRect(-18, -2, 24, 3);
  ctx.fillStyle = '#fff'; ctx.fillRect(2, -5, 8, 10);
  ctx.restore();

  // nom du palier en cours
  if (charging && chargeLvl > 0) {
    ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = ccol; ctx.fillText(CHARGE_NAMES[chargeLvl], fb.x, fb.y - FIRE.r - 10);
  }

  // ---------- textes flottants ----------
  ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
  for (const t of T) { ctx.globalAlpha = Math.min(1, t.t * 2); ctx.fillStyle = t.c; ctx.fillText(t.s, t.x, t.y); }
  ctx.globalAlpha = 1;

  // ---------- UI ----------
  bar(12, 12, 200, 14, P.hp / P.max);
  ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = 'bold 11px monospace'; ctx.fillText('HP ' + P.hp + '/' + P.max, 18, 23);
  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = '#3cf'; ctx.fillText('FISH ' + fish, 12, 46);
  ctx.fillStyle = '#ffe14d'; ctx.fillText('ARR ' + arrows, 76, 46);
  ctx.fillStyle = '#ff7b00'; ctx.fillText('EXPL ' + expl, 136, 46);
  ctx.fillStyle = '#ff3cac'; ctx.font = 'bold 18px monospace'; ctx.fillText('SCORE ' + score, 12, 68);

  const can = fish >= 1 && arrows >= 3;
  for (const b of btns) {
    ctx.fillStyle = 'rgba(20,10,40,.8)'; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = (b.t[0] == 'C' && can) || (b.t[0] == 'B' && expl > 0) ? (((now / 200) | 0) % 2 ? '#ff3cac' : '#ffe14d') : '#a07c3c';
    ctx.lineWidth = 2; ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = 'bold 13px monospace'; ctx.fillText(b.t, b.x + b.w / 2, b.y + 26);
  }

  if (over) {
    ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(0, 0, W, H); ctx.textAlign = 'center';
    ctx.fillStyle = '#ff3cac'; ctx.font = 'bold 36px monospace'; ctx.fillText('GAME OVER', W / 2, H / 2 - 10);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 18px monospace'; ctx.fillText('Score ' + score, W / 2, H / 2 + 20);
    if (overT > 0.6) ctx.fillText('Tap / Space = rejouer', W / 2, H / 2 + 50);
  }
}

// ---------- inputs ----------
const xy = e => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; };
const press = p => { for (const b of btns) if (p.x > b.x && p.x < b.x + b.w && p.y > b.y && p.y < b.y + b.h) { if (!over) b.f(); return true; } return false; };
const restart = () => { if (over && overT > 0.6) { reset(); return true; } return false; };
const key = e => e.key.length > 1 ? e.key : e.key.toLowerCase();

// ---------- charge tactile : le doigt devient le viseur ----------
function startCharge(p) {
  charging = true; chargeT = 0; chargeLvl = 0; lastVibLvl = -1;
  aimBtn = { ox: p.x, oy: p.y };
  aim = { x: P.x + (p.x - P.x) * 0.1, y: P.y + (p.y - P.y) * 0.1 };
  vib(10);
}
function moveCharge(p) {
  if (!charging || !aimBtn) return;
  const dx = p.x - aimBtn.ox, dy = p.y - aimBtn.oy;
  const len = Math.hypot(dx, dy) || 1;
  const maxDist = 140;
  const k = Math.min(len, maxDist);
  aim = { x: P.x + dx / len * k, y: P.y + dy / len * k };
  touch = p;
}
function releaseCharge() {
  if (!charging) return;
  shoot(false, chargeLvl);
  charging = false; chargeT = 0; chargeLvl = 0; aimBtn = null; lastVibLvl = -1;
}
function startChargeKb() {
  charging = true; chargeT = 0; chargeLvl = 0; lastVibLvl = -1; vib(10);
}

addEventListener('keydown', e => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
  const k = key(e); keys[k] = true;
  if (k == ' ' && !restart()) { if (!charging) startChargeKb(); }
  if (k == 'e') shoot(true);
  if (k == 'c') craftExplosive();
});
addEventListener('keyup', e => {
  const k = key(e); keys[k] = false;
  if (k == ' ') releaseCharge();
});

canvas.addEventListener('mousemove', e => { if (!charging) aim = xy(e); });
canvas.addEventListener('mousedown', e => {
  const p = xy(e); aim = p;
  if (press(p) || restart()) return;
  if (inFireBtn(p)) startCharge(p);
  else startChargeKb();
});
addEventListener('mouseup', () => { if (charging) releaseCharge(); });

canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    const p = xy(t);
    if (press(p) || restart()) continue;
    if (inFireBtn(p)) {
      tid = t.identifier;
      startCharge(p);
    } else {
      tid = t.identifier; touch = aim = p;
    }
  }
}, { passive: false });

canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  for (const t of e.touches) {
    if (t.identifier !== tid) continue;
    const p = xy(t);
    if (charging) moveCharge(p);
    else touch = aim = p;
  }
}, { passive: false });

const tend = e => {
  for (const t of e.changedTouches) if (t.identifier === tid) {
    if (charging) releaseCharge();
    tid = null; touch = null; firing = false;
  }
};
canvas.addEventListener('touchend', tend);
canvas.addEventListener('touchcancel', tend);
addEventListener('resize', fit);

// ---------- boucle 60 FPS : ne plante jamais ----------
fit(); reset();
function loop(now) {
  requestAnimationFrame(loop);
  try { const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now; update(dt); draw(now); }
  catch (e) { ctx.globalAlpha = 1; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 22); ctx.fillStyle = '#f55'; ctx.font = '11px monospace'; ctx.textAlign = 'left'; ctx.fillText('ERR ' + (e && e.message), 4, 15); }
}
requestAnimationFrame(loop);