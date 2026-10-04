// INDIE MIAMI x GRIM DAWN ARCHER — Cordova / HTML5 Canvas, 0 librairie
const canvas = document.getElementById('c'), ctx = canvas.getContext('2d');
const ld = s => { const i = new Image(); i.src = s + '?v=' + Date.now(); return i; }; // ?v= évite le cache
const player = ld('player.png'), enemies = ld('enemies.png');
const ok = i => i.complete && i.naturalWidth > 0;
const R = Math.random, dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y), AOE = 80;
let W = 640, H = 360, P, E, A, D, F, T, arrows, fish, expl, score, spawnT, regenT, over, overT, firing, tid, touch, flash, last = 0;
let keys = {}, aim = { x: 0, y: 0 };
const bg = document.createElement('canvas');
const btns = [{ t: 'CRAFT [C]', f: () => craftExplosive() }, { t: 'BOOM [E]', f: () => shoot(true) }];

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
}

// ---------- actions ----------
function shoot(explosive) {
  if (P.cd > 0 || over) return;
  if (explosive) { if (expl < 1) return; expl--; } else { if (arrows < 1) return; arrows--; }
  const angle = Math.atan2(aim.y - P.y, aim.x - P.x);
  A.push({ x: P.x, y: P.y - 4, angle, speed: explosive ? 380 : 520, explosive, life: 1.3 });
  P.cd = explosive ? 0.45 : 0.22; P.shoot = 0.15;
}
function craftExplosive() {
  if (fish >= 1 && arrows >= 3) { fish--; arrows -= 3; expl++; text(P.x, P.y - 40, 'CRAFT +1 EXPL', '#ff3cac'); }
  else text(P.x, P.y - 40, 'Need 1 fish + 3 arrows', '#ccc');
}
function text(x, y, s, c) { T.push({ x, y, s, c, t: 1 }); }
function explode(x, y) {
  F.push({ x, y, t: 0 }); flash = 0.12;
  for (const e of E) if (!e.dead && dist(e, { x, y }) < AOE) hurt(e, 30);
}
function hurt(e, d) {
  e.hp -= d; e.flash = 0.1;
  if (e.hp > 0 || e.dead) return;
  e.dead = true; score += 10;
  const r = R();
  if (r < 0.4) D.push({ x: e.x, y: e.y, k: 'fish', t: 12 });        // 40 % poisson
  else if (r < 0.65) D.push({ x: e.x, y: e.y, k: 'arrow', t: 12 });  // 25 % flèches
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
  let mx = 0, my = 0, sp = 140;
  if (keys.ArrowLeft || keys.q || keys.a) mx--; if (keys.ArrowRight || keys.d) mx++;
  if (keys.ArrowUp || keys.z || keys.w) my--; if (keys.ArrowDown || keys.s) my++;
  if (touch && dist(touch, P) > 30) { mx = touch.x - P.x; my = touch.y - P.y; sp = 100; } // déplace légèrement vers le doigt
  const l = Math.hypot(mx, my) || 1;
  if (mx || my) { P.x = Math.max(20, Math.min(W - 20, P.x + mx / l * sp * dt)); P.y = Math.max(40, Math.min(H - 26, P.y + my / l * sp * dt)); P.anim += dt * 10; }
  P.cd -= dt; P.shoot -= dt; P.hit -= dt; flash -= dt;
  if (firing) shoot(false);
  regenT += dt; if (regenT > 1.5 && arrows < 10) { arrows++; regenT = 0; }
  spawnT -= dt;
  if (spawnT <= 0) { spawn(); spawnT = Math.max(0.35, 1.5 - score / 350); }
  for (const e of E) { // ennemis : poursuite
    const d = Math.hypot(P.x - e.x, P.y - e.y) || 1;
    e.x += (P.x - e.x) / d * e.sp * dt; e.y += (P.y - e.y) / d * e.sp * dt;
    e.anim += dt * 8; e.flash -= dt; e.hit -= dt;
    for (const o of E) if (o !== e) {
      const q = dist(e, o);
      if (q < 22 && q > 0) { e.x += (e.x - o.x) / q * 40 * dt; e.y += (e.y - o.y) / q * 40 * dt; }
    }
    if (d < 26 && e.hit <= 0 && P.hit <= 0) {
      P.hp -= 8; P.hit = 0.6; e.hit = 0.8;
      if (P.hp <= 0) { P.hp = 0; over = true; overT = 0; firing = false; }
    }
  }
  for (const a of A) { // flèches
    a.x += Math.cos(a.angle) * a.speed * dt; a.y += Math.sin(a.angle) * a.speed * dt; a.life -= dt;
    let hit = false;
    for (const e of E) if (!e.dead && dist(a, e) < 20) { if (a.explosive) explode(a.x, a.y); else hurt(e, 10); hit = true; break; }
    if (!hit && a.explosive && a.life <= 0) { explode(a.x, a.y); hit = true; }
    if (hit || a.life <= 0 || a.x < -20 || a.x > W + 20 || a.y < -20 || a.y > H + 20) a.dead = true;
  }
  for (const d of D) { // drops
    d.t -= dt;
    if (dist(d, P) < 26) {
      d.t = 0;
      if (d.k == 'fish') { fish++; text(d.x, d.y - 10, '+1 ><>', '#3cf'); }
      else { arrows = Math.min(40, arrows + 3); text(d.x, d.y - 10, '+3 ARR', '#ffe14d'); }
    }
  }
  for (const f of F) f.t += dt;
  for (const t of T) { t.t -= dt; t.y -= 24 * dt; }
  E = E.filter(e => !e.dead); A = A.filter(a => !a.dead); D = D.filter(d => d.t > 0);
  F = F.filter(f => f.t < 0.35); T = T.filter(t => t.t > 0);
}

// ---------- draw ----------
function shadow(x, y) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x, y + 22, 16, 5, 0, 0, 7); ctx.fill(); }
function bar(x, y, w, h, pct) { // vert -> jaune -> rouge
  ctx.fillStyle = '#4a0a0a'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = pct > 0.5 ? '#2ecc40' : pct > 0.25 ? '#f1c40f' : '#e74c3c'; ctx.fillRect(x, y, w * pct, h);
  ctx.strokeStyle = '#a07c3c'; ctx.lineWidth = 2; ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);
}
function drawPlayer() {
  const a = Math.atan2(aim.y - P.y, aim.x - P.x), dir = Math.abs(a) < 0.785 ? 0 : Math.abs(a) > 2.356 ? 2 : a > 0 ? 1 : 3; // droite, bas, gauche, haut
  const bob = Math.sin(P.anim) * 1.5;
  shadow(P.x, P.y);
  ctx.save(); ctx.translate(P.x, P.y + bob);
  if (ok(player)) { const w = player.width / 4; ctx.drawImage(player, dir * w, 0, w, player.height, -26, -26, 52, 52); }
  else { ctx.fillStyle = '#1de9b6'; ctx.beginPath(); ctx.arc(0, 0, 18, 0, 7); ctx.fill(); }
  ctx.rotate(a); ctx.lineCap = 'round'; // arc orienté vers la visée
  ctx.lineWidth = 3; ctx.strokeStyle = '#ffb347'; ctx.beginPath(); ctx.arc(-2, 0, 22, -1.1, 1.1); ctx.stroke();
  ctx.lineWidth = 1; ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.moveTo(8, -20); ctx.lineTo(P.shoot > 0 ? -8 : 8, 0); ctx.lineTo(8, 20); ctx.stroke();
  ctx.restore();
}
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
    ctx.fillStyle = a.explosive ? '#ff7b00' : '#1de9b6'; ctx.fillRect(-14, -1, 18, 2);
    ctx.fillStyle = a.explosive ? '#ff3cac' : '#fff'; ctx.fillRect(4, -3, 5, 6); ctx.restore();
  }
  for (const f of F) {
    const k = f.t / 0.35; ctx.globalAlpha = 1 - k; ctx.fillStyle = '#ff7b00';
    ctx.beginPath(); ctx.arc(f.x, f.y, AOE * k, 0, 7); ctx.fill();
    ctx.strokeStyle = '#ffe14d'; ctx.lineWidth = 3; ctx.stroke(); ctx.globalAlpha = 1;
  }
  if (flash > 0) { ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(0, 0, W, H); }
  ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(aim.x - 6, aim.y - 1, 12, 2); ctx.fillRect(aim.x - 1, aim.y - 6, 2, 12);
  ctx.font = 'bold 14px monospace';
  for (const t of T) { ctx.globalAlpha = Math.min(1, t.t * 2); ctx.fillStyle = t.c; ctx.fillText(t.s, t.x, t.y); }
  ctx.globalAlpha = 1;
  bar(12, 12, 200, 14, P.hp / P.max); // UI
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
addEventListener('keydown', e => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
  const k = key(e); keys[k] = true;
  if (k == ' ' && !restart()) firing = true;
  if (k == 'e') shoot(true); if (k == 'c') craftExplosive();
});
addEventListener('keyup', e => { const k = key(e); keys[k] = false; if (k == ' ') firing = false; });
canvas.addEventListener('mousemove', e => { aim = xy(e); });
canvas.addEventListener('mousedown', e => { aim = xy(e); if (!press(aim) && !restart()) firing = true; });
addEventListener('mouseup', () => { firing = false; });
canvas.addEventListener('touchstart', e => { // touchstart = tire
  e.preventDefault();
  for (const t of e.changedTouches) { const p = xy(t); if (press(p) || restart()) continue; tid = t.identifier; touch = aim = p; firing = true; }
}, { passive: false });
canvas.addEventListener('touchmove', e => { // touchmove = vise + déplace
  e.preventDefault();
  for (const t of e.touches) if (t.identifier === tid) touch = aim = xy(t);
}, { passive: false });
const tend = e => { for (const t of e.changedTouches) if (t.identifier === tid) { tid = null; touch = null; firing = false; } };
canvas.addEventListener('touchend', tend); canvas.addEventListener('touchcancel', tend);
addEventListener('resize', fit);

// ---------- boucle 60 FPS : ne plante jamais ----------
fit(); reset();
function loop(now) {
  requestAnimationFrame(loop);
  try { const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now; update(dt); draw(now); }
  catch (e) { ctx.globalAlpha = 1; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 22); ctx.fillStyle = '#f55'; ctx.font = '11px monospace'; ctx.textAlign = 'left'; ctx.fillText('ERR ' + (e && e.message), 4, 15); }
}
requestAnimationFrame(loop);
