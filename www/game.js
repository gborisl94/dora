// INDIE MIAMI x GRIM DAWN ARCHER — ISOMÉTRIQUE — Cordova / HTML5 Canvas, 0 librairie
const canvas = document.getElementById('c'), ctx = canvas.getContext('2d');

// ---------- CHEMINS DES IMAGES (modifie ici si besoin) ----------
const PATH_PLAYER  = 'player.png';
const PATH_ENEMIES = 'enemies.png';

const ld = s => { const i = new Image(); i.src = s + '?v=' + Date.now(); return i; };
const player = ld(PATH_PLAYER), enemies = ld(PATH_ENEMIES);
const ok = i => i.complete && i.naturalWidth > 0;
const R = Math.random, dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y), AOE = 80;

// ---------- ÉTAT GLOBAL ----------
let W = 640, H = 360;
let P, E, A, D, F, T, arrows, fish, expl, score, spawnT, regenT, over, overT, firing, tid, touch, flash, last = 0;
let keys = {}, aim = { x: 0, y: 0 };

// ---------- CHARGE + BOUTON TIR ----------
let charging = false, chargeT = 0, chargeLvl = 0, lastVibLvl = -1, aimBtn = null;
const CHARGE_LEVELS = [0.35, 0.9, 1.6];
const CHARGE_MULT   = [1, 1.6, 2.5];
const CHARGE_COLORS = ['#1de9b6', '#ffe14d', '#ff7b00', '#ff3cac'];
const CHARGE_NAMES  = ['', 'PUISSANT', 'LOURD', 'EXPLOSIF'];

// ---------- ISOMÉTRIQUE ----------
const ISO_W = 64, ISO_H = 32;          // tuile 2:1
let cam = { x: 0, y: 0 };              // caméra en coords monde
const WORLD_RADIUS = 22;               // rayon du monde (en tuiles)

function toScreen(wx, wy, wz = 0) {
  const rx = wx - cam.x, ry = wy - cam.y;
  return {
    x: (rx - ry) * (ISO_W / 2) + W / 2,
    y: (rx + ry) * (ISO_H / 2) + H / 2 - wz
  };
}
function toWorld(sx, sy) {
  const dx = sx - W / 2, dy = sy - H / 2;
  const wx = (dx / (ISO_W / 2) + dy / (ISO_H / 2)) / 2;
  const wy = (dy / (ISO_H / 2) - dx / (ISO_W / 2)) / 2;
  return { x: wx + cam.x, y: wy + cam.y };
}

// ---------- VIBRATION ----------
function vib(pattern) {
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {}
}

const bg = document.createElement('canvas');
const btns = [
  { t: 'CRAFT [C]', f: () => craftExplosive() },
  { t: 'BOOM [E]',  f: () => shoot(true) }
];

// ---------- TAILLE ÉCRAN + GRILLE ISO DE FOND ----------
function fit() {
  // 👉 FORCE LE RATIO PAYSAGE : le grand côté = largeur
  const big   = Math.max(innerWidth, innerHeight, 1);
  const small = Math.min(innerWidth, innerHeight, 1);
  const k = 640 / big;
  W = canvas.width  = Math.round(big   * k) || 640;
  H = canvas.height = Math.round(small * k) || 360;

  // bg = canvas offscreen, on y redessine la grille iso
  bg.width = W; bg.height = H;
  const b = bg.getContext('2d');

  // fond dégradé violet -> bleu nuit
  const g = b.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#2a0a4a'); g.addColorStop(1, '#0b1a3a');
  b.fillStyle = g; b.fillRect(0, 0, W, H);

  // grille iso centrée sur l'écran (fixe, indépendante de la caméra)
  b.lineWidth = 1;
  const RANGE = 40;
  const cx = W / 2, cy = H / 2;
  const projX = (wx, wy) => (wx - wy) * (ISO_W / 2) + cx;
  const projY = (wx, wy) => (wx + wy) * (ISO_H / 2) + cy;

  for (let i = -RANGE; i <= RANGE; i++) {
    b.strokeStyle = 'rgba(255,60,172,.20)';
    b.beginPath();
    b.moveTo(projX(i, -RANGE), projY(i, -RANGE));
    b.lineTo(projX(i,  RANGE), projY(i,  RANGE));
    b.stroke();

    b.strokeStyle = 'rgba(29,233,182,.16)';
    b.beginPath();
    b.moveTo(projX(-RANGE, i), projY(-RANGE, i));
    b.lineTo(projX( RANGE, i), projY( RANGE, i));
    b.stroke();
  }

  // boutons CRAFT / BOOM (bas droite)
  btns.forEach((bb, i) => { bb.x = W - 108 - i * 108; bb.y = H - 52; bb.w = 100; bb.h = 42; });

  if (P) {
    P.x = Math.max(-WORLD_RADIUS, Math.min(WORLD_RADIUS, P.x));
    P.y = Math.max(-WORLD_RADIUS, Math.min(WORLD_RADIUS, P.y));
  }
}

// ---------- RESET ----------
function reset() {
  P = { x: 0, y: 0, hp: 100, max: 100, cd: 0, shoot: 0, anim: 0, hit: 0 };
  E = []; A = []; D = []; F = []; T = [];
  arrows = 20; fish = 0; expl = 0; score = 0; spawnT = 1; regenT = 0;
  over = false; overT = 0; firing = false; tid = null; touch = null; flash = 0;
  aim = { x: 6, y: 0 };
  charging = false; chargeT = 0; chargeLvl = 0; lastVibLvl = -1; aimBtn = null;
  cam = { x: 0, y: 0 };
}

// ---------- ACTIONS ----------
function shoot(explosive, lvl = 0) {
  if (P.cd > 0 || over) return;
  if (explosive) { if (expl < 1) return; expl--; } else { if (arrows < 1) return; arrows--; }

  const angle = Math.atan2(aim.y - P.y, aim.x - P.x);
  const mult = explosive ? 1 : CHARGE_MULT[lvl];
  A.push({
    x: P.x, y: P.y,
    angle,
    speed: explosive ? 380 : 520 * (1 + lvl * 0.15),
    explosive: explosive || lvl >= 3,
    dmg: explosive ? 30 : Math.round(10 * mult),
    aoe: explosive ? AOE : AOE * (lvl / 3 || 0),
    lvl,
    life: 1.3
  });
  P.cd = explosive ? 0.45 : (0.22 + lvl * 0.08);
  P.shoot = 0.15;

  if (lvl === 0) vib(15);
  else if (lvl === 1) vib(25);
  else if (lvl === 2) vib([30, 20, 30]);
  else vib([40, 30, 60, 30, 80]);
}

function craftExplosive() {
  if (fish >= 1 && arrows >= 3) {
    fish--; arrows -= 3; expl++;
    text(P.x, P.y - 1, 'CRAFT +1 EXPL', '#ff3cac'); vib(20);
  } else {
    text(P.x, P.y - 1, 'Need 1 fish + 3 arrows', '#ccc'); vib([10, 30, 10]);
  }
}

function text(x, y, s, c) { T.push({ x, y, s, c, t: 1 }); }

function explode(x, y, radius = AOE) {
  F.push({ x, y, t: 0, r: radius });
  flash = 0.12;
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
  const type = (R() * 4) | 0;
  const a = R() * Math.PI * 2;
  const radius = WORLD_RADIUS + 3;
  const x = Math.cos(a) * radius;
  const y = Math.sin(a) * radius;
  E.push({
    x, y, type,
    hp: 30,
    sp: 48 + type * 5 + R() * 14 + Math.min(score / 40, 40),
    anim: R() * 6, flash: 0, hit: 0
  });
}

// ---------- UPDATE ----------
function update(dt) {
  if (over) { overT += dt; return; }

  // charge
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

  // déplacement clavier (diagonale iso)
  let mx = 0, my = 0, sp = 140;
  let kx = 0, ky = 0;
  if (keys.ArrowLeft  || keys.q || keys.a) kx--;
  if (keys.ArrowRight || keys.d)           kx++;
  if (keys.ArrowUp    || keys.z || keys.w) ky--;
  if (keys.ArrowDown  || keys.s)           ky++;
  if (kx || ky) { mx = kx + ky; my = ky - kx; }

  // joystick tactile
  if (touch && !charging && dist(touch, P) > 1.2) {
    mx = touch.x - P.x; my = touch.y - P.y; sp = 100;
  }
  const l = Math.hypot(mx, my) || 1;
  if (mx || my) {
    P.x += mx / l * sp * dt;
    P.y += my / l * sp * dt;
    P.x = Math.max(-WORLD_RADIUS, Math.min(WORLD_RADIUS, P.x));
    P.y = Math.max(-WORLD_RADIUS, Math.min(WORLD_RADIUS, P.y));
    P.anim += dt * 10;
  }

  // caméra qui suit le joueur (léger lerp)
  cam.x += (P.x - cam.x) * Math.min(1, dt * 6);
  cam.y += (P.y - cam.y) * Math.min(1, dt * 6);

  P.cd -= dt; P.shoot -= dt; P.hit -= dt; flash -= dt;
  if (firing) shoot(false, chargeLvl);
  regenT += dt;
  if (regenT > 1.5 && arrows < 10) { arrows++; regenT = 0; }

  spawnT -= dt;
  if (spawnT <= 0) { spawn(); spawnT = Math.max(0.35, 1.5 - score / 350); }

  // ennemis
  for (const e of E) {
    const d = Math.hypot(P.x - e.x, P.y - e.y) || 1;
    e.x += (P.x - e.x) / d * e.sp * dt;
    e.y += (P.y - e.y) / d * e.sp * dt;
    e.anim += dt * 8; e.flash -= dt; e.hit -= dt;
    for (const o of E) if (o !== e) {
      const q = dist(e, o);
      if (q < 1.2 && q > 0) {
        e.x += (e.x - o.x) / q * 1.5 * dt;
        e.y += (e.y - o.y) / q * 1.5 * dt;
      }
    }
    if (d < 1.2 && e.hit <= 0 && P.hit <= 0) {
      P.hp -= 8; P.hit = 0.6; e.hit = 0.8;
      vib(60);
      if (P.hp <= 0) {
        P.hp = 0; over = true; overT = 0; firing = false; charging = false;
        vib([80, 40, 80, 40, 200]);
      }
    }
  }

  // flèches
  for (const a of A) {
    a.x += Math.cos(a.angle) * a.speed * dt;
    a.y += Math.sin(a.angle) * a.speed * dt;
    a.life -= dt;
    let hit = false;
    for (const e of E) if (!e.dead && dist(a, e) < 1.1) {
      if (a.explosive) explode(a.x, a.y, a.aoe || AOE);
      else hurt(e, a.dmg || 10);
      hit = true; break;
    }
    if (!hit && a.explosive && a.life <= 0) { explode(a.x, a.y, a.aoe || AOE); hit = true; }
    if (hit || a.life <= 0 || Math.hypot(a.x - cam.x, a.y - cam.y) > 60) a.dead = true;
  }

  // drops
  for (const d of D) {
    d.t -= dt;
    if (dist(d, P) < 1.4) {
      d.t = 0;
      if (d.k == 'fish') { fish++; text(d.x, d.y, '+1 ><>', '#3cf'); vib(15); }
      else { arrows = Math.min(40, arrows + 3); text(d.x, d.y, '+3 ARR', '#ffe14d'); vib(15); }
    }
  }

  for (const f of F) f.t += dt;
  for (const t of T) { t.t -= dt; t.y -= 0.6 * dt; }

  E = E.filter(e => !e.dead);
  A = A.filter(a => !a.dead);
  D = D.filter(d => d.t > 0);
  F = F.filter(f => f.t < 0.35);
  T = T.filter(t => t.t > 0);
}

// ---------- DRAW ----------
function drawEllipseShadow(sx, sy) {
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath();
  ctx.ellipse(sx, sy + 4, 16, 8, 0, 0, 7);
  ctx.fill();
}

function bar(x, y, w, h, pct) {
  ctx.fillStyle = '#4a0a0a'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = pct > 0.5 ? '#2ecc40' : pct > 0.25 ? '#f1c40f' : '#e74c3c';
  ctx.fillRect(x, y, w * pct, h);
  ctx.strokeStyle = '#a07c3c'; ctx.lineWidth = 2;
  ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);
}

function drawPlayer() {
  const a = Math.atan2(aim.y - P.y, aim.x - P.x);
  const dir = Math.abs(a) < 0.785 ? 0 : Math.abs(a) > 2.356 ? 2 : a > 0 ? 1 : 3;
  const s = toScreen(P.x, P.y);
  const bob = Math.sin(P.anim) * 1.5;

  drawEllipseShadow(s.x, s.y);

  ctx.save();
  ctx.translate(s.x, s.y + bob);

  if (ok(player)) {
    const w = player.width / 4;
    ctx.drawImage(player, dir * w, 0, w, player.height, -26, -26, 52, 52);
  } else {
    // fallback : petit corps iso
    ctx.fillStyle = '#1de9b6';
    ctx.beginPath(); ctx.arc(0, 0, 16, 0, 7); ctx.fill();
    ctx.fillStyle = '#0a8c6a';
    ctx.beginPath(); ctx.ellipse(0, 10, 14, 7, 0, 0, 7); ctx.fill();
  }

  // arc orienté vers la visée (angle iso = +45°)
  ctx.rotate(a + Math.PI / 4);
  ctx.lineCap = 'round';
  ctx.lineWidth = 3; ctx.strokeStyle = '#ffb347';
  ctx.beginPath(); ctx.arc(-2, 0, 22, -1.1, 1.1); ctx.stroke();
  ctx.lineWidth = 1; ctx.strokeStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(8, -20);
  ctx.lineTo(P.shoot > 0 ? -8 : 8, 0);
  ctx.lineTo(8, 20);
  ctx.stroke();
  ctx.restore();
}

const FIRE = { r: 56 };
function fireBtnPos() { return { x: W - FIRE.r - 20, y: H - FIRE.r - 20 }; }
function inFireBtn(p) {
  // p est en coordonnées écran ici
  const b = fireBtnPos();
  return Math.hypot(p.sx - b.x, p.sy - b.y) < FIRE.r * 1.3;
}

function draw(now) {
  ctx.globalAlpha = 1;
  ctx.drawImage(bg, 0, 0);
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';

  // drops
  for (const d of D) {
    const s = toScreen(d.x, d.y);
    const by = s.y + Math.sin(now / 200 + d.x * 10) * 3;
    if (d.t < 3 && ((now / 120) | 0) % 2) continue;
    if (d.k == 'fish') {
      ctx.fillStyle = '#3cf';
      ctx.fillText('><>', s.x, by);
    } else {
      ctx.fillStyle = '#ffe14d';
      for (let i = 0; i < 3; i++) ctx.fillRect(s.x - 8, by - 6 + i * 5, 16, 2);
    }
  }

  // tri par profondeur iso : x + y croissant
  const all = E.map(e => ({ d: e.x + e.y, e }))
    .concat([{ d: P.x + P.y, p: 1 }])
    .sort((a, b) => a.d - b.d);

  for (const o of all) {
    if (o.p) {
      if (!(P.hit > 0 && ((now / 60) | 0) % 2)) drawPlayer();
      continue;
    }
    const e = o.e;
    const s = toScreen(e.x, e.y);
    drawEllipseShadow(s.x, s.y);
    ctx.globalAlpha = e.flash > 0 ? 0.5 : 1;

    if (ok(enemies)) {
      const w = enemies.width / 4;
      const hop = Math.abs(Math.sin(e.anim)) * 3;
      ctx.drawImage(enemies, e.type * w, 0, w, enemies.height,
        s.x - 22, s.y - 22 - hop, 44, 44);
    } else {
      ctx.fillStyle = ['#e63946', '#2a6fdb', '#f4c20d', '#9b3fd1'][e.type];
      ctx.beginPath(); ctx.arc(s.x, s.y, 16, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.beginPath(); ctx.ellipse(s.x, s.y + 10, 14, 7, 0, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    bar(s.x - 14, s.y - 34, 28, 3, e.hp / 30);
  }

  // flèches
  for (const a of A) {
    const s = toScreen(a.x, a.y);
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(a.angle + Math.PI / 4);
    const col = a.explosive ? '#ff7b00' : (a.lvl >= 2 ? '#ffe14d' : '#1de9b6');
    ctx.fillStyle = col;
    const len = 18 + (a.lvl || 0) * 4;
    ctx.fillRect(-len + 4, -1 - (a.lvl || 0) * 0.5, len, 2 + (a.lvl || 0));
    ctx.fillStyle = a.explosive ? '#ff3cac' : '#fff';
    ctx.fillRect(4, -3, 5, 6);
    ctx.restore();
  }

  // explosions (ellipse iso)
  for (const f of F) {
    const s = toScreen(f.x, f.y);
    const k = f.t / 0.35;
    ctx.globalAlpha = 1 - k;
    ctx.fillStyle = '#ff7b00';
    ctx.beginPath();
    ctx.ellipse(s.x, s.y, (f.r || AOE) * k * 0.5, (f.r || AOE) * k * 0.25, 0, 0, 7);
    ctx.fill();
    ctx.strokeStyle = '#ffe14d';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  if (flash > 0) {
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    ctx.fillRect(0, 0, W, H);
  }

  // viseur
  const sa = toScreen(aim.x, aim.y);
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.fillRect(sa.x - 6, sa.y - 1, 12, 2);
  ctx.fillRect(sa.x - 1, sa.y - 6, 2, 12);

  // ligne joueur -> viseur
  const sp2 = toScreen(P.x, P.y);
  ctx.strokeStyle = 'rgba(255,255,255,.15)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(sp2.x, sp2.y); ctx.lineTo(sa.x, sa.y); ctx.stroke();

  // ---------- BOUTON TIR ----------
  const fb = fireBtnPos();
  const ccol = CHARGE_COLORS[chargeLvl];

  if (chargeLvl >= 3) {
    const pulse = 0.5 + 0.5 * Math.sin(now / 80);
    ctx.beginPath(); ctx.arc(fb.x, fb.y, FIRE.r + pulse * 8, 0, 7);
    ctx.strokeStyle = ccol; ctx.lineWidth = 3;
    ctx.globalAlpha = 1 - pulse; ctx.stroke(); ctx.globalAlpha = 1;
  }

  ctx.beginPath(); ctx.arc(fb.x, fb.y, FIRE.r, 0, 7);
  ctx.fillStyle = 'rgba(20,10,40,.78)'; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = ccol; ctx.stroke();

  if (charging && chargeLvl < 3) {
    const prev = chargeLvl === 0 ? 0 : CHARGE_LEVELS[chargeLvl - 1];
    const next = CHARGE_LEVELS[chargeLvl];
    const pct = Math.min(1, (chargeT - prev) / (next - prev));
    ctx.beginPath();
    ctx.arc(fb.x, fb.y, FIRE.r - 5, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
    ctx.lineWidth = 6; ctx.strokeStyle = ccol; ctx.stroke();
  }

  for (let i = 0; i < CHARGE_LEVELS.length; i++) {
    const a0 = -Math.PI / 2 + (i + 1) / 3 * Math.PI * 2;
    const x1 = fb.x + Math.cos(a0) * (FIRE.r - 3), y1 = fb.y + Math.sin(a0) * (FIRE.r - 3);
    const x2 = fb.x + Math.cos(a0) * (FIRE.r + 3), y2 = fb.y + Math.sin(a0) * (FIRE.r + 3);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = i + 1 <= chargeLvl ? CHARGE_COLORS[i + 1] : '#666';
    ctx.lineWidth = 2; ctx.stroke();
  }

  ctx.save();
  ctx.translate(fb.x, fb.y);
  ctx.rotate(-Math.PI / 4);
  ctx.fillStyle = ccol; ctx.fillRect(-18, -2, 24, 3);
  ctx.fillStyle = '#fff'; ctx.fillRect(2, -5, 8, 10);
  ctx.restore();

  if (charging && chargeLvl > 0) {
    ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = ccol;
    ctx.fillText(CHARGE_NAMES[chargeLvl], fb.x, fb.y - FIRE.r - 10);
  }

  // textes flottants
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  for (const t of T) {
    const s = toScreen(t.x, t.y);
    ctx.globalAlpha = Math.min(1, t.t * 2);
    ctx.fillStyle = t.c;
    ctx.fillText(t.s, s.x, s.y);
  }
  ctx.globalAlpha = 1;

  // ---------- UI ----------
  bar(12, 12, 200, 14, P.hp / P.max);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px monospace';
  ctx.fillText('HP ' + P.hp + '/' + P.max, 18, 23);

  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = '#3cf';    ctx.fillText('FISH ' + fish,   12, 46);
  ctx.fillStyle = '#ffe14d'; ctx.fillText('ARR '  + arrows, 76, 46);
  ctx.fillStyle = '#ff7b00'; ctx.fillText('EXPL ' + expl,  136, 46);
  ctx.fillStyle = '#ff3cac';
  ctx.font = 'bold 18px monospace';
  ctx.fillText('SCORE ' + score, 12, 68);

  const can = fish >= 1 && arrows >= 3;
  for (const b of btns) {
    ctx.fillStyle = 'rgba(20,10,40,.8)';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = (b.t[0] == 'C' && can) || (b.t[0] == 'B' && expl > 0)
      ? (((now / 200) | 0) % 2 ? '#ff3cac' : '#ffe14d')
      : '#a07c3c';
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(b.t, b.x + b.w / 2, b.y + 26);
  }

  if (over) {
    ctx.fillStyle = 'rgba(0,0,0,.7)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff3cac';
    ctx.font = 'bold 36px monospace';
    ctx.fillText('GAME OVER', W / 2, H / 2 - 10);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('Score ' + score, W / 2, H / 2 + 20);
    if (overT > 0.6) ctx.fillText('Tap / Space = rejouer', W / 2, H / 2 + 50);
  }
}

// ---------- INPUTS ----------
// Retourne les coordonnées ÉCRAN + MONDE
const xy = e => {
  const r = canvas.getBoundingClientRect();
  const sx = (e.clientX - r.left) * W / r.width;
  const sy = (e.clientY - r.top)  * H / r.height;
  const w = toWorld(sx, sy);
  return { sx, sy, x: w.x, y: w.y };
};

const pressScreen = (sx, sy) => {
  for (const b of btns) if (sx > b.x && sx < b.x + b.w && sy > b.y && sy < b.y + b.h) {
    if (!over) b.f(); return true;
  }
  return false;
};
const restart = () => { if (over && overT > 0.6) { reset(); return true; } return false; };
const key = e => e.key.length > 1 ? e.key : e.key.toLowerCase();

// ---------- CHARGE ----------
function startCharge(p) {
  charging = true; chargeT = 0; chargeLvl = 0; lastVibLvl = -1;
  aimBtn = { ox: p.x, oy: p.y };       // en monde
  aim = { x: P.x + (p.x - P.x) * 0.1, y: P.y + (p.y - P.y) * 0.1 };
  vib(10);
}
function moveCharge(p) {
  if (!charging || !aimBtn) return;
  const dx = p.x - aimBtn.ox, dy = p.y - aimBtn.oy;
  const len = Math.hypot(dx, dy) || 1;
  const maxDist = 12;                   // en unités monde
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

// clavier
addEventListener('keydown', e => {
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
  const k = key(e); keys[k] = true;
  if (k == ' ' && !restart()) { if (!charging) startChargeKb(); }
  if (k == 'e') shoot(true);
  if (k == 'c') craftExplosive();
});
addEventListener('keyup', e => {
  const k = key(e); keys[k] = false;
  if (k == ' ') releaseCharge();
});

// souris
canvas.addEventListener('mousemove', e => {
  if (charging) return;
  const p = xy(e);
  aim = { x: p.x, y: p.y };
});
canvas.addEventListener('mousedown', e => {
  const p = xy(e);
  if (pressScreen(p.sx, p.sy) || restart()) return;
  if (inFireBtn(p)) { startCharge(p); }
  else { aim = { x: p.x, y: p.y }; startChargeKb(); }
});
addEventListener('mouseup', () => { if (charging) releaseCharge(); });

// tactile
canvas.addEventListener('touchstart', e => {
  e.preventDefault