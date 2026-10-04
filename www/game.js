(function(){
  // ============ CONFIG ============
  var ZOOM_MIN = 0.5, ZOOM_MAX = 2.5, ZOOM_DEFAULT = 1.0, ZOOM_SPEED = 0.15, PINCH_SENS = 0.005;
  var camX = 0, camY = 0;

  // Charge : temps (ms) pour atteindre chaque palier
  var CHARGE_LVL2 = 500;   // 0.5s -> niveau 2
  var CHARGE_LVL3 = 1200;  // 1.2s -> niveau 3
  var CHARGE_MAX = 1800;   // 1.8s -> max (reste à 3)

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
  var zoomLbl = document.getElementById('zoomLbl');
  var fireBtn = document.getElementById('fireBtn');
  var fireCharge = document.getElementById('fireCharge');
  var fctx = fireCharge.getContext('2d');

  var W = window.innerWidth, H = window.innerHeight;
  function resize(){ W = window.innerWidth; H = window.innerHeight; cvs.width = W; cvs.height = H; }
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function(){ setTimeout(resize, 200); });

  // ============ STATE ============
  var zoom = ZOOM_DEFAULT;
  var player = { x: 0, y: 0, hp: 100, maxHp: 100, fish: 0, arr: 0, expl: 0, score: 0,
                 dir: 0, aimAngle: 0, cool: 0, lastRegen: 0 };
  var bullets = [], enemies = [], drops = [], particles = [], floaters = [], trails = [];
  var gameOver = false, hitFlash = 0, shake = 0;
  var spawnTimer = 0;

  // État de charge
  var chargeStart = 0;
  var isCharging = false;
  var chargeLevel = 0; // 0 = pas chargé, 1/2/3 = niveaux

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
    shoot(player.aimAngle, false, lvl);
    isCharging = false;
    chargeLevel = 0;
    fireBtn.classList.remove('active');
  }

  fireBtn.addEventListener('touchstart', function(e){ e.preventDefault(); startCharge(); }, {passive:false});
  fireBtn.addEventListener('touchend', function(e){ e.preventDefault(); releaseCharge(); }, {passive:false});
  fireBtn.addEventListener('touchcancel', function(e){ e.preventDefault(); releaseCharge(); }, {passive:false});
  fireBtn.addEventListener('mousedown', function(e){ e.preventDefault(); startCharge(); });
  fireBtn.addEventListener('mouseup', function(e){ e.preventDefault(); releaseCharge(); });

  // Clavier PC : maintenir Espace pour charger
  window.addEventListener('keydown', function(e){
    if (e.code === 'Space' && !isCharging) startCharge();
  });
  window.addEventListener('keyup', function(e){
    if (e.code === 'Space') releaseCharge();
  });

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

  // ============ SHOOT (avec niveaux de charge) ============
  function shoot(angle, isExplosive, chargeLvl){
    chargeLvl = chargeLvl || 1;

    if (isExplosive){
      if (player.expl <= 0) return;
      player.expl--;
      bullets.push({ x:player.x, y:player.y, vx:Math.cos(angle)*5, vy:Math.sin(angle)*5,
                     dmg:38, expl:true, life:120, lvl:1 });
      return;
    }

    // Flèche normale : dmg et taille selon niveau
    var dmg = 15, size = 3, speed = 7, color = '#fff';
    if (chargeLvl === 2){ dmg = 30; size = 4; speed = 8; color = '#ffdd44'; }
    else if (chargeLvl === 3){ dmg = 60; size = 6; speed = 9; color = '#ff4444'; }

    bullets.push({
      x:player.x, y:player.y,
      vx:Math.cos(angle)*speed, vy:Math.sin(angle)*speed,
      dmg:dmg, expl:false, life:90, lvl:chargeLvl,
      size:size, color:color
    });

    // Effet visuel au tir niveau 3
    if (chargeLvl === 3){
      for (var p=0; p<10; p++){
        particles.push({
          x:player.x, y:player.y,
          vx:Math.cos(angle)*rand(1,4) + rand(-2,2),
          vy:Math.sin(angle)*rand(1,4) + rand(-2,2),
          life:20, color:'#ffaa00'
        });
      }
      shake = Math.max(shake, 4);
    }
  }

  // ============ UPDATE BULLETS ============
  function updateBullets(){
    var viewW = W/zoom, viewH = H/zoom;
    for (var i=bullets.length-1; i>=0; i--){
      var b = bullets[i];
      var prevX = b.x, prevY = b.y;
      b.x += b.vx; b.y += b.vy; b.life--;
      if (!b.expl) trails.push({ x1:prevX, y1:prevY, x2:b.x, y2:b.y, life:8, color: b.color || '#ffffaa' });
      if (b.life<=0 || Math.abs(b.x - player.x) > viewW || Math.abs(b.y - player.y) > viewH){
        bullets.splice(i,1); continue;
      }
      for (var j=enemies.length-1; j>=0; j--){
        var e = enemies[j];
        if (dist(b,e) < 24){
          if (b.expl){
            for (var k=enemies.length-1; k>=0; k--){
              if (dist(b, enemies[k]) < 95){
                enemies[k].hp -= 38; enemies[k].hitFlash = 6;
                if (enemies[k].hp<=0){ enemies.splice(k,1); player.score+=10; }
              }
            }
            for (var p=0; p<15; p++) particles.push({ x:b.x, y:b.y, vx:rand(-4,4), vy:rand(-4,4), life:25, color: p%2 ? '#ff6600' : '#ffcc00' });
            bullets.splice(i,1); break;
          } else {
            e.hp -= b.dmg;
            e.hitFlash = 3;
            var d = Math.hypot(b.vx, b.vy);
            if (d > 0){ e.knockX = (b.vx/d)*4; e.knockY = (b.vy/d)*4; }
            addFloater(e.x, e.y - 25, '-' + b.dmg, b.lvl === 3 ? '#ff4444' : (b.lvl === 2 ? '#ffcc44' : '#ffff88'));
            var np = b.lvl === 3 ? 12 : (b.lvl === 2 ? 6 : 4);
            for (var p2=0; p2<np; p2++) particles.push({ x:b.x, y:b.y, vx:rand(-3,3), vy:rand(-3,3), life:15, color:'#ffaa00' });
            if (e.hp<=0){ enemies.splice(j,1); player.score+=10; }
            bullets.splice(i,1); break;
          }
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

  // ============ UPDATE DROPS ============
  function updateDrops(){
    for (var i=drops.length-1; i>=0; i--){
      var d = drops[i];
      if (dist(d, player) < 36){
        player.fish += d.fish || 0;
        player.hp = Math.min(player.maxHp, player.hp + (d.hp||0)*2);
        addFloater(player.x, player.y - 30, '+' + ((d.hp||0)*2) + 'HP', '#00ff88');
        drops.splice(i,1);
      }
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

    // Dessiner le cercle de charge autour du bouton FEU
    fctx.clearRect(0, 0, 98, 98);
    if (isCharging && chargeLevel > 0){
      var elapsed = Date.now() - chargeStart;
      var pct = Math.min(1, elapsed / CHARGE_MAX);
      var color = chargeLevel === 3 ? '#ff4444' : (chargeLevel === 2 ? '#ffcc44' : '#ffffff');

      fctx.strokeStyle = color;
      fctx.lineWidth = 4;
      fctx.beginPath();
      fctx.arc(49, 49, 45, -Math.PI/2, -Math.PI/2 + Math.PI*2*pct);
      fctx.stroke();

      // Afficher le niveau
      fctx.fillStyle = color;
      fctx.font = 'bold 14px monospace';
      fctx.textAlign = 'center';
      fctx.textBaseline = 'middle';
      fctx.fillText('LV' + chargeLevel, 49, 49);
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

    updateBullets(); updateEnemies(); updateDrops(); updateParticles(); updateCharge();

    if (Math.random() < 0.005){
      drops.push({ x: player.x + rand(-W/zoom/2, W/zoom/2), y: player.y + rand(-H/zoom/2, H/zoom/2), fish:1, hp:15 });
    }

    var hpPct = player.hp/player.maxHp;
    hpfill.style.width = (hpPct*100)+'%';
    hpfill.style.background = hpPct>0.5?'#0d0':hpPct>0.25?'#dd0':'#d22';
    hudtxt.textContent = 'HP ' + Math.floor(player.hp) + ' | FISH ' + player.fish + ' ARR ' + player.arr + ' EXPL ' + player.expl + ' SCORE ' + player.score + ' | ' + zoom.toFixed(2) + 'x';
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

    // Cercle de charge autour du joueur
    if (isCharging && chargeLevel > 0){
      var col = chargeLevel === 3 ? '#ff4444' : (chargeLevel === 2 ? '#ffcc44' : '#ffffff');
      ctx.strokeStyle = col;
      ctx.lineWidth = 2/zoom;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 32 + chargeLevel*4, 0, Math.PI*2);
      ctx.stroke();
    }
  }

  // ============ DRAW VISEUR SNIPER ============
  function drawSniperScope(){
    if (joyRState.mag <= 12 && !isCharging) return;

    var col = '#ff69b4';
    if (isCharging){
      col = chargeLevel === 3 ? '#ff4444' : (chargeLevel === 2 ? '#ffcc44' : '#ffffff');
    }

    var scopeLen = 120 + chargeLevel*20;
    var endX = player.x + Math.cos(player.aimAngle)*scopeLen;
    var endY = player.y + Math.sin(player.aimAngle)*scopeLen;

    // Ligne pointillée principale
    ctx.save();
    ctx.setLineDash([6,4]);
    ctx.strokeStyle = col;
    ctx.lineWidth = 2/zoom;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Réticule sniper
    ctx.setLineDash([]);
    ctx.strokeStyle = col;
    ctx.lineWidth = 2/zoom;
    var r = 10;
    ctx.beginPath(); ctx.arc(endX, endY, r, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(endX - r - 5, endY); ctx.lineTo(endX - r, endY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(endX + r, endY); ctx.lineTo(endX + r + 5, endY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(endX, endY - r - 5); ctx.lineTo(endX, endY - r); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(endX, endY + r); ctx.lineTo(endX, endY + r + 5); ctx.stroke();

    // Point central
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(endX, endY, 1.5, 0, Math.PI*2); ctx.fill();

    // Arc de charge au bout de la ligne
    if (isCharging && chargeLevel > 0){
      var elapsed = Date.now() - chargeStart;
      var pct = Math.min(1, elapsed / CHARGE_MAX);
      ctx.strokeStyle = col;
      ctx.lineWidth = 3/zoom;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 50, player.aimAngle - 0.4, player.aimAngle - 0.4 + 0.8*pct);
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
    ctx.strokeStyle = '#1c1c35'; ctx.lineWidth = 1/zoom;
    for (var gx = startX; gx < endX; gx += 40){ ctx.beginPath(); ctx.moveTo(gx, camY - viewH/2); ctx.lineTo(gx, camY + viewH/2); ctx.stroke(); }
    for (var gy = startY; gy < endY; gy += 40){ ctx.beginPath(); ctx.moveTo(camX - viewW/2, gy); ctx.lineTo(camX + viewW/2, gy); ctx.stroke(); }

    var sx = 0, sy = 0;
    if (shake > 0.5){ sx = rand(-shake, shake); sy = rand(-shake, shake); }
    ctx.translate(sx, sy);

    for (var i2=0; i2<enemies.length; i