(function(){
  // ============ CONFIG ZOOM ============
  var ZOOM_MIN = 0.5;
  var ZOOM_MAX = 2.5;
  var ZOOM_DEFAULT = 1.0;
  var ZOOM_SPEED = 0.15;
  var PINCH_SENS = 0.005;
  var camX = 0, camY = 0;

  // ============ CONFIG CHARGE ============
  var CHARGE_LVL2 = 500;
  var CHARGE_LVL3 = 1200;
  var CHARGE_MAX = 1800;

  // ============ LANDSCAPE LOCK ============
  function lockLandscape(){
    try { if (window.screen && window.screen.orientation && window.screen.orientation.lock){ window.screen.orientation.lock('landscape').catch(function(){}); } } catch(e){}
    try {
      if (window.screen && window.screen.lockOrientation){ window.screen.lockOrientation('landscape'); }
      else if (window.screen && window.screen.mozLockOrientation){ window.screen.mozLockOrientation('landscape'); }
      else if (window.screen && window.screen.msLockOrientation){ window.screen.msLockOrientation('landscape'); }
    } catch(e){}
  }
  lockLandscape();
  document.addEventListener('deviceready', lockLandscape, false);
  window.addEventListener('orientationchange', function(){ setTimeout(lockLandscape, 100); });

  // ============ DOM ============
  var cvs = document.getElementById('c'), ctx = cvs.getContext('2d');
  var flash = document.getElementById('flash'), hudtxt = document.getElementById('hudtxt');
  var hpfill = document.getElementById('hpfill'), go = document.getElementById('go'), gotxt = document.getElementById('gotxt');
  var joyL = document.getElementById('joyL'), stickL = document.getElementById('stickL');
  var joyR = document.getElementById('joyR'), stickR = document.getElementById('stickR');
  var fireBtn = document.getElementById('fireBtn');
  var fireCharge = document.getElementById('fireCharge');
  var fctx = fireCharge.getContext('2d');
  var zoomLbl = document.getElementById('zoomLbl');

  var W = window.innerWidth, H = window.innerHeight;
  function resize(){ W = window.innerWidth; H = window.innerHeight; cvs.width = W; cvs.height = H; }
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function(){ setTimeout(resize, 200); });

  // ============ STATE ============
  var zoom = ZOOM_DEFAULT;
  var player = { x: 0, y: 0, hp: 100, maxHp: 100, score: 0, dir: 0, aimAngle: 0, lastRegen: 0 };
  var bullets = [], enemies = [], particles = [], floaters = [], trails = [];
  var gameOver = false, hitFlash = 0, shake = 0;
  var spawnTimer = 0;
  var isCharging = false, chargeStart = 0, chargeLevel = 0;
  var lastShotTime = 0;

  // ============ HELPERS ============
  function dist(a,b){ return Math.hypot(a.x-b.x, a.y-b.y); }
  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
  function rand(a,b){ return Math.random()*(b-a)+a; }
  function addFloater(x, y, text, color){ floaters.push({ x:x, y:y, text:text, color:color, life:40 }); }

  // ============ ZOOM CONTROLS ============
  function setZoom(z){
    zoom = clamp(z, ZOOM_MIN, ZOOM_MAX);
    zoomLbl.textContent = zoom.toFixed(2) + 'x';
  }
  document.getElementById('zPlus').addEventListener('touchstart', function(e){ e.preventDefault(); setZoom(zoom + ZOOM_SPEED); }, {passive:false});
  document.getElementById('zMinus').addEventListener('touchstart', function(e){ e.preventDefault(); setZoom(zoom - ZOOM_SPEED); }, {passive:false});
  document.getElementById('zPlus').addEventListener('mousedown', function(e){ e.preventDefault(); setZoom(zoom + ZOOM_SPEED); });
  document.getElementById('zMinus').addEventListener('mousedown', function(e){ e.preventDefault(); setZoom(zoom - ZOOM_SPEED); });

  var pinchStartDist = 0, pinchStartZoom = 1;
  cvs.addEventListener('touchstart', function(e){
    if (e.touches.length === 2){
      var dx = e.touches[0].clientX - e.touches[1].clientX;
      var dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartDist = Math.hypot(dx, dy);
      pinchStartZoom = zoom;
    }
  }, {passive:false});
  cvs.addEventListener('touchmove', function(e){
    if (e.touches.length === 2 && pinchStartDist > 0){
      e.preventDefault();
      var dx = e.touches[0].clientX - e.touches[1].clientX;
      var dy = e.touches[0].clientY - e.touches[1].clientY;
      var d = Math.hypot(dx, dy);
      setZoom(pinchStartZoom + (d - pinchStartDist) * PINCH_SENS);
    }
  }, {passive:false});
  cvs.addEventListener('touchend', function(){ pinchStartDist = 0; }, {passive:false});

  // ============ JOYSTICKS ============
  function makeJoy(el, stick, onMove, onEnd){
    var id = null, cx = 0, cy = 0, dx = 0, dy = 0, R = 46;
    function start(e){
      e.preventDefault();
      var t = e.changedTouches[0];
      id = t.identifier;
      var r = el.getBoundingClientRect();
      cx = r.left + r.width/2; cy = r.top + r.height/2;
      dx = t.clientX - cx; dy = t.clientY - cy;
      update();
    }
    function move(e){
      e.preventDefault();
      for (var i=0; i<e.changedTouches.length; i++){
        var t = e.changedTouches[i];
        if (t.identifier === id){ dx = t.clientX - cx; dy = t.clientY - cy; update(); }
      }
    }
    function end(e){
      for (var i=0; i<e.changedTouches.length; i++){
        var t = e.changedTouches[i];
        if (t.identifier === id){
          id = null; dx = 0; dy = 0;
          stick.style.transform = 'translate(-50%,-50%)';
          onEnd();
        }
      }
    }
    function update(){
      var m = Math.hypot(dx, dy);
      if (m > R){ dx = dx/m*R; dy = dy/m*R; }
      stick.style.transform = 'translate(calc(-50% + '+dx+'px), calc(-50% + '+dy+'px))';
      onMove(dx, dy, m);
    }
    el.addEventListener('touchstart', start, {passive:false});
    el.addEventListener('touchmove', move, {passive:false});
    el.addEventListener('touchend', end, {passive:false});
    el.addEventListener('touchcancel', end, {passive:false});
    return { get mag(){ return Math.hypot(dx,dy); } };
  }

  var moveVec = { x:0, y:0 };
  var joyLState = makeJoy(joyL, stickL,
    function(dx,dy,m){ moveVec.x = m>12?dx/m:0; moveVec.y = m>12?dy/m:0; },
    function(){ moveVec.x=0; moveVec.y=0; });

  var joyRState = makeJoy(joyR, stickR,
    function(dx,dy,m){ if (m>12){ player.aimAngle = Math.atan2(dy,dx); } },
    function(){});

  // ============ BOUTON FEU ============
  function startCharge(){
    if (gameOver) return;
    isCharging = true;
    chargeStart = Date.now();
    chargeLevel = 0;
    fireBtn.classList.add('active');
  }
  function releaseCharge(){
    if (!isCharging) return;
    var elapsed = Date.now() - chargeStart;
    var lvl = 1;
    if (elapsed >= CHARGE_LVL3) lvl = 3;
    else if (elapsed >= CHARGE_LVL2) lvl = 2;
    if (Date.now() - lastShotTime > 150){
      shoot(player.aimAngle, lvl);
      lastShotTime = Date.now();
    }
    isCharging = false;
    chargeLevel = 0;
    fireBtn.classList.remove('active');
  }
  fireBtn.addEventListener('touchstart', function(e){ e.preventDefault(); startCharge(); }, {passive:false});
  fireBtn.addEventListener('touchend', function(e){ e.preventDefault(); releaseCharge(); }, {passive:false});
  fireBtn.addEventListener('touchcancel', function(e){ e.preventDefault(); releaseCharge(); }, {passive:false});
  fireBtn.addEventListener('mousedown', function(e){ e.preventDefault(); startCharge(); });
  fireBtn.addEventListener('mouseup', function(e){ e.preventDefault(); releaseCharge(); });

  window.addEventListener('keydown', function(e){ if (e.code === 'Space' && !isCharging) startCharge(); });
  window.addEventListener('keyup', function(e){ if (e.code === 'Space') releaseCharge(); });

  // ============ DAMAGE ============
  function takeDamage(amount){
    if (hitFlash > 0 || gameOver) return;
    player.hp -= amount;
    hitFlash = 8; shake = 6;
    flash.style.opacity = '0.25';
    setTimeout(function(){ flash.style.opacity = '0'; }, 90);
    if (navigator.vibrate) navigator.vibrate(40);
    addFloater(player.x, player.y - 30, '-' + amount, '#ff4444');
    if (player.hp <= 0){
      player.hp = 0; gameOver = true;
      go.style.display = 'flex';
      gotxt.textContent = 'Score ' + player.score;
    }
  }

  // ============ SPAWN ============
  function spawnEnemy(){
    if (enemies.length >= 8) return;
    var viewW = W/zoom, viewH = H/zoom;
    var side = Math.floor(rand(0,4)), ex, ey;
    if (side===0){ ex=player.x + rand(-viewW/2, viewW/2); ey=player.y - viewH/2 - 40; }
    else if (side===1){ ex=player.x + viewW/2 + 40; ey=player.y + rand(-viewH/2, viewH/2); }
    else if (side===2){ ex=player.x + rand(-viewW/2, viewW/2); ey=player.y + viewH/2 + 40; }
    else { ex=player.x - viewW/2 - 40; ey=player.y + rand(-viewH/2, viewH/2); }
    enemies.push({ x:ex, y:ey, hp:35, maxHp:35, type:Math.floor(rand(0,4)),
                   speed:0.7, cool:0, hitFlash:0, knockX:0, knockY:0 });
  }

  // ============ SHOOT ============
  function shoot(angle, lvl){
    var dmg = 15, size = 3, speed = 7, color = '#ffffff';
    if (lvl === 2){ dmg = 30; size = 4.5; speed = 8.5; color = '#ffdd44'; }
    else if (lvl === 3){ dmg = 60; size = 6.5; speed = 10; color = '#ff4444'; }
    bullets.push({
      x:player.x, y:player.y,
      vx:Math.cos(angle)*speed, vy:Math.sin(angle)*speed,
      dmg:dmg, life:90, lvl:lvl, size:size, color:color
    });
    if (lvl === 3){
      for (var p=0; p<12; p++) particles.push({ x:player.x, y:player.y, vx:Math.cos(angle)*rand(1,5) + rand(-2,2), vy:Math.sin(angle)*rand(1,5) + rand(-2,2), life:20, color:'#ffaa00' });
      shake = Math.max(shake, 5);
    } else if (lvl === 2){
      for (var p2=0; p2<5; p2++) particles.push({ x:player.x, y:player.y, vx:Math.cos(angle)*rand(1,3) + rand(-1,1), vy:Math.sin(angle)*rand(1,3) + rand(-1,1), life:15, color:'#ffdd44' });
    }
  }

  // ============ UPDATE BULLETS ============
  function updateBullets(){
    var viewW = W/zoom, viewH = H/zoom;
    for (var i=bullets.length-1; i>=0; i--){
      var b = bullets[i];
      var prevX = b.x, prevY = b.y;
      b.x += b.vx; b.y += b.vy; b.life--;
      trails.push({ x1:prevX, y1:prevY, x2:b.x, y2:b.y, life:8, color: b.color });
      if (b.life<=0 || Math.abs(b.x - player.x) > viewW || Math.abs(b.y - player.y) > viewH){
        bullets.splice(i,1); continue;
      }
      for (var j=enemies.length-1; j>=0; j--){
        var e = enemies[j];
        if (dist(b,e) < 24){
          e.hp -= b.dmg;
          e.hitFlash = 3;
          var d = Math.hypot(b.vx, b.vy);
          if (d > 0){ e.knockX = (b.vx/d)*(3+b.lvl); e.knockY = (b.vy/d)*(3+b.lvl); }
          var colorTxt = b.lvl === 3 ? '#ff4444' : (b.lvl === 2 ? '#ffcc44' : '#ffff88');
          addFloater(e.x, e.y - 25, '-' + b.dmg, colorTxt);
          var np = b.lvl === 3 ? 14 : (b.lvl === 2 ? 7 : 4);
          for (var p=0; p<np; p++) particles.push({ x:b.x, y:b.y, vx:rand(-3,3), vy:rand(-3,3), life:15, color: b.color });
          if (e.hp<=0){ enemies.splice(j,1); player.score+=10; }
          bullets.splice(i,1); break;
        }
      }
    }
  }

  // ============ UPDATE ENEMIES ============
  function updateEnemies(){
    for (var i=enemies.length-1; i>=0; i--){
      var e = enemies[i];
      e.x += e.knockX; e.y += e.knockY;
      e.knockX *= 0.7; e.knockY *= 0.7;
      var dx = player.x-e.x, dy = player.y-e.y;
      var d = Math.hypot(dx,dy);
      if (d>0){ e.x += (dx/d)*e.speed; e.y += (dy/d)*e.speed; }
      if (d < 22 && e.cool <= 0){ takeDamage(4); e.cool = 70; }
      if (e.cool > 0) e.cool--;
      if (e.hitFlash > 0) e.hitFlash--;
      if (e.hp<=0){ enemies.splice(i,1); player.score+=10; }
    }
  }

  // ============ UPDATE PARTICLES ============
  function updateParticles(){
    for (var i=particles.length-1; i>=0; i--){ var p = particles[i]; p.x+=p.vx; p.y+=p.vy; p.life--; if (p.life<=0) particles.splice(i,1); }
    for (var j=floaters.length-1; j>=0; j--){ var f = floaters[j]; f.y -= 0.8; f.life--; if (f.life<=0) floaters.splice(j,1); }
    for (var k=trails.length-1; k>=0; k--){ trails[k].life--; if (trails[k].life<=0) trails.splice(k,1); }
  }

  // ============ UPDATE CHARGE ============
  function updateCharge(){
    if (isCharging){
      var elapsed = Date.now() - chargeStart;
      if (elapsed >= CHARGE_LVL3) chargeLevel = 3;
      else if (elapsed >= CHARGE_LVL2) chargeLevel = 2;
      else chargeLevel = 1;
    }
    fctx.clearRect(0, 0, 110, 110);
    if (isCharging && chargeLevel > 0){
      var elapsed2 = Date.now() - chargeStart;
      var pct = Math.min(1, elapsed2 / CHARGE_MAX);
      var col = chargeLevel === 3 ? '#ff4444' : (chargeLevel === 2 ? '#ffcc44' : '#ffffff');
      fctx.strokeStyle = col;
      fctx.lineWidth = 5;
      fctx.beginPath();
      fctx.arc(55, 55, 50, -Math.PI/2, -Math.PI/2 + Math.PI*2*pct);
      fctx.stroke();
      fctx.fillStyle = col;
      fctx.font = 'bold 14px monospace';
      fctx.textAlign = 'center';
      fctx.textBaseline = 'middle';
      fctx.fillText('LV' + chargeLevel, 55, 55);
    }
  }

  // ============ UPDATE ============
  function update(){
    if (gameOver) return;

    var nowSec = Math.floor(Date.now()/2000);
    if (nowSec !== player.lastRegen){ player.lastRegen = nowSec; player.hp = Math.min(player.maxHp, player.hp + 1); }

    var SPEED = 1.66;
    var dx = moveVec.x*SPEED, dy = moveVec.y*SPEED;
    player.x += dx; player.y += dy;
    if (dx!==0 || dy!==0) player.dir = Math.atan2(dy,dx);

    camX += (player.x - camX) * 0.15;
    camY += (player.y - camY) * 0.15;

    spawnTimer++;
    if (spawnTimer > 60 && enemies.length < 8){ spawnTimer = 0; spawnEnemy(); }

    if (hitFlash > 0) hitFlash--;
    if (shake > 0.5) shake *= 0.9; else shake = 0;

    updateBullets(); updateEnemies(); updateParticles(); updateCharge();

    var hpPct = player.hp/player.maxHp;
    hpfill.style.width = (hpPct*100)+'%';
    hpfill.style.background = hpPct>0.5?'#0d0':hpPct>0.25?'#dd0':'#d22';
    hudtxt.textContent = 'HP ' + Math.floor(player.hp) + ' | SCORE ' + player.score;
  }

  // ============ DRAW PLAYER ============
  function drawPlayer(){
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(player.x, player.y+22, 18, 6, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#4af';
    ctx.beginPath(); ctx.arc(player.x, player.y, 24, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(player.x + Math.cos(player.aimAngle)*20, player.y + Math.sin(player.aimAngle)*20);
    ctx.stroke();
    if (isCharging && chargeLevel > 0){
      var col = chargeLevel === 3 ? '#ff4444' : (chargeLevel === 2 ? '#ffcc44' : '#ffffff');
      ctx.strokeStyle = col;
      ctx.lineWidth = 2/zoom;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 32 + chargeLevel*5, 0, Math.PI*2);
      ctx.stroke();
    }
  }

  // ============ DRAW VISEUR ============
  function drawSniperScope(){
    if (joyRState.mag <= 12 && !isCharging) return;
    var col = '#ff69b4';
    if (isCharging){
      col = chargeLevel === 3 ? '#ff4444' : (chargeLevel === 2 ? '#ffcc44' : '#ffffff');
    }
    var scopeLen = 130 + chargeLevel*25;
    var endX = player.x + Math.cos(player.aimAngle)*scopeLen;
    var endY = player.y + Math.sin(player.aimAngle)*scopeLen;
    ctx.save();
    ctx.setLineDash([6,4]);
    ctx.strokeStyle = col;
    ctx.lineWidth = 2/zoom;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = col;
    ctx.lineWidth = 2/zoom;
    var r = 12;
    ctx.beginPath(); ctx.arc(endX, endY, r, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(endX - r - 6, endY); ctx.lineTo(endX - r, endY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(endX + r, endY); ctx.lineTo(endX + r + 6, endY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(endX, endY - r - 6); ctx.lineTo(endX, endY - r); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(endX, endY + r); ctx.lineTo(endX, endY + r + 6); ctx.stroke();
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(endX, endY, 2, 0, Math.PI*2); ctx.fill();
    if (isCharging && chargeLevel > 0){
      var elapsed = Date.now() - chargeStart;
      var pct = Math.min(1, elapsed / CHARGE_MAX);
      ctx.strokeStyle = col;
      ctx.lineWidth = 3/zoom;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 55, player.aimAngle - 0.5, player.aimAngle - 0.5 + 1.0*pct);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ============ DRAW ============
  function draw(){
    ctx.fillStyle = '#131326'; ctx.fillRect(0,0,W,H);

    ctx.save();
    ctx.translate(W/2, H/2);
    ctx.scale(zoom, zoom);
    ctx.translate(-camX, -camY);

    var viewW = W/zoom, viewH = H/zoom;
    var startX = Math.floor((camX - viewW/2) / 40) * 40;
    var endX = camX + viewW/2;
    var startY = Math.floor((camY - viewH/2) / 40) * 40;
    var endY = camY + viewH/2;
    ctx.strokeStyle = '#1c1c35';
    ctx.lineWidth = 1/zoom;
    for (var gx = startX; gx < endX; gx += 40){
      ctx.beginPath(); ctx.moveTo(gx, camY - viewH/2); ctx.lineTo(gx, camY + viewH/2); ctx.stroke();
    }
    for (var gy = startY; gy < endY; gy += 40){
      ctx.beginPath(); ctx.moveTo(camX - viewW/2, gy); ctx.lineTo(camX + viewW/2, gy); ctx.stroke();
    }

    var sx = 0, sy = 0;
    if (shake > 0.5){ sx = rand(-shake, shake); sy = rand(-shake, shake); }
    ctx.translate(sx, sy);

    for (var i2=0; i2<enemies.length; i2++){
      var e = enemies[i2];
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath(); ctx.ellipse(e.x, e.y+18, 16, 5, 0, 0, Math.PI*2); ctx.fill();
      if (e.hitFlash > 0) ctx.fillStyle = 'rgba(255,255,255,0.9)';
      else ctx.fillStyle = '#f44';
      ctx.beginPath(); ctx.arc(e.x, e.y, 22, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#333'; ctx.fillRect(e.x-20, e.y-30, 40, 4);
      ctx.fillStyle = '#0f0'; ctx.fillRect(e.x-20, e.y-30, 40*(e.hp/e.maxHp), 4);
    }

    drawPlayer();
    drawSniperScope();

    for (var t=0; t<trails.length; t++){
      var tr = trails[t];
      ctx.globalAlpha = tr.life/8;
      ctx.strokeStyle = tr.color || '#ffffaa';
      ctx.lineWidth = 2/zoom;
      ctx.beginPath(); ctx.moveTo(tr.x1, tr.y1); ctx.lineTo(tr.x2, tr.y2); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    for (var bi=0; bi<bullets.length; bi++){
      var b = bullets[bi];
      if (b.lvl >= 2){
        ctx.fillStyle = b.lvl === 3 ? 'rgba(255,60,60,0.3)' : 'rgba(255,220,80,0.3)';
        ctx.beginPath(); ctx.arc(b.x, b.y, b.size*3, 0, Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = b.color;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.size, 0, Math.PI*2); ctx.fill();
    }

    for (var pi=0; pi<particles.length; pi++){
      var p = particles[pi];
      ctx.globalAlpha = p.life/25; ctx.fillStyle = p.color;
      ctx.fillRect(p.x-2, p.y-2, 4, 4);
    }
    ctx.globalAlpha = 1;

    ctx.font = 'bold ' + (12/zoom) + 'px monospace';
    ctx.textAlign = 'center';
    for (var fi=0; fi<floaters.length; fi++){
      var f = floaters[fi];
      ctx.globalAlpha = Math.min(1, f.life/20);
      ctx.fillStyle = '#000'; ctx.fillText(f.text, f.x+1/zoom, f.y+1/zoom);
      ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1; ctx.textAlign = 'left';

    ctx.restore();
  }

  // ============ LOOP ============
  function loop(){
    try { update(); draw(); }
    catch(err){
      ctx.fillStyle = 'rgba(180,0,0,0.85)'; ctx.fillRect(0, 0, W, 20);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px monospace';
      ctx.fillText('ERR ' + err.message, 6, 14);
    }
    requestAnimationFrame(loop);
  }
  loop();

  // ============ RESTART ============
  document.getElementById('gobtn').addEventListener('click', function(){
    player.hp=100; player.score=0; player.x=0; player.y=0; player.lastRegen=0;
    camX=0; camY=0;
    bullets=[]; enemies=[]; particles=[]; floaters=[]; trails=[];
    gameOver=false; go.style.display='none'; hitFlash=0; shake=0;
    isCharging=false; chargeLevel=0;
    setZoom(ZOOM_DEFAULT);
  });

  window.addEventListener('contextmenu', function(e){ e.preventDefault