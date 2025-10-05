// 333.FM parallax + starfield
(function(){
  const root = document.documentElement;
  // Parallax
    const depthEls = [...document.querySelectorAll('[data-depth]')];
    // Exclure les éléments position:fixed (ex: le footer) pour éviter les glitches iOS
    let movableEls = [];
    function refreshMovables(){
      try{
        movableEls = depthEls.filter(el=>{
          const cs = getComputedStyle(el);
          return cs.position !== 'fixed';
        });
      }catch(_){ movableEls = depthEls; }
    }
    refreshMovables();
  let w = window.innerWidth, h = window.innerHeight;
  let mx = 0, my = 0;
  const logo = document.querySelector('.brand-logo');
  let logoScale = 1, targetScale = 1;
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  // Idle detection to stabilize scene when user is not interacting
  let lastActive = Date.now();
  function markActive(){ lastActive = Date.now(); }
  // Motion (gyroscope/orientation) support
  let useMotion = false;
  const hasMotionAPI = ('DeviceOrientationEvent' in window) || ('DeviceMotionEvent' in window);
  let motionBase = { beta: null, gamma: null };
  let motionLast = { beta: null, gamma: null };
  let motionActivity = 0; // somme des deltas significatifs
  let motionStartedAt = 0;
  function clamp(v, min, max){ return v < min ? min : (v > max ? max : v); }
  function onOrientation(e){
    // Respect reduced-motion preference
    const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(rm || !useMotion) return;
    const beta = (typeof e.beta === 'number' ? e.beta : 0);   // front-back [-180, 180]
    const gamma = (typeof e.gamma === 'number' ? e.gamma : 0); // left-right [-90, 90]
  if(motionBase.beta === null){ motionBase.beta = beta; }
  if(motionBase.gamma === null){ motionBase.gamma = gamma; }
    const db = beta - motionBase.beta;
    const dg = gamma - motionBase.gamma;
    // Map to [-0.5, 0.5]
    const targetX = clamp(dg / 90, -0.5, 0.5);
    const targetY = clamp(-db / 90, -0.5, 0.5);
    // Smoothly ease to target to avoid jitter
  const prevX = mx, prevY = my;
    mx += (targetX - mx) * 0.12;
    my += (targetY - my) * 0.12;
  // Accumuler une activité si variation notable côté capteur
  if(motionLast.beta === null){ motionLast.beta = beta; motionLast.gamma = gamma; }
  const ab = Math.abs(beta - motionLast.beta);
  const ag = Math.abs(gamma - motionLast.gamma);
  if(ab + ag > 0.8) motionActivity += (ab + ag);
  motionLast.beta = beta; motionLast.gamma = gamma;
    // Consider it "active" if change is noticeable
    if(Math.abs(mx - prevX) > 0.01 || Math.abs(my - prevY) > 0.01){ markActive(); }
  }
  function enableMotion(){
    if(useMotion) return;
    try{
      window.addEventListener('deviceorientation', onOrientation, true);
      motionBase = { beta: null, gamma: null };
      motionLast = { beta: null, gamma: null };
      motionActivity = 0;
      motionStartedAt = Date.now();
      useMotion = true;
    }catch(_){ useMotion = false; }
  }
  function disableMotion(){
    try{ window.removeEventListener('deviceorientation', onOrientation, true); }catch(_){ }
    useMotion = false;
  }
  function tryEnableMotion(fromGesture = false){
    // Avoid enabling in reduced-motion or on desktop
    const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(rm || !hasMotionAPI || !isMobile || useMotion) return;
    // iOS permission gate
    try{
      if(typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function'){
        if(!fromGesture) return; // iOS: ne pas demander sans geste utilisateur
        DeviceMotionEvent.requestPermission().then(state=>{
          if(state === 'granted') enableMotion();
        }).catch(()=>{});
      }else if(typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function'){
        if(!fromGesture) return; // iOS: ne pas demander sans geste utilisateur
        DeviceOrientationEvent.requestPermission().then(state=>{
          if(state === 'granted') enableMotion();
        }).catch(()=>{});
      }else{
        // Android / older iOS: no explicit permission API required
        enableMotion();
      }
    }catch(_){ /* noop */ }
  }
  function onMove(e){
    if(!depthEls.length) return;
    if(window.__freezeScene) return; // gèle mouvements pendant boot
    const x = (e.touches? e.touches[0].clientX : e.clientX) / w - 0.5;
    const y = (e.touches? e.touches[0].clientY : e.clientY) / h - 0.5;
    mx = x; my = y;
    if(logo){
      const rx = my * (isMobile? -3 : -12); // rotation X plus généreuse
      const ry = mx * (isMobile? 4 : 16);   // rotation Y plus généreuse
      targetScale = isMobile ? 1.01 : 1.06;
      logo.style.transform = `translateZ(0) rotateX(${rx}deg) rotateY(${ry}deg) scale(${logoScale.toFixed(3)})`;
    }
  }
  window.addEventListener('mousemove', (e)=>{ onMove(e); markActive(); }, {passive:true});
  window.addEventListener('touchmove', (e)=>{ onMove(e); markActive(); }, {passive:true});
  window.addEventListener('pointerdown', ()=>{ markActive(); tryEnableMotion(true); }, {passive:true});
  window.addEventListener('touchstart', ()=>{ markActive(); tryEnableMotion(); }, {passive:true});
  window.addEventListener('click', ()=>{ tryEnableMotion(true); }, {passive:true});
  window.addEventListener('keydown', markActive, {passive:true});
  window.addEventListener('focus', markActive, {passive:true});
  window.addEventListener('resize', ()=>{ w = innerWidth; h = innerHeight; refreshMovables(); computeCenter(); });

  function tick(){
    if(window.__freezeScene){
      requestAnimationFrame(tick);
      return;
    }
    // if idle, gently ease scale down to 1 to avoid micro-breathing effect
    const idle = (Date.now() - lastActive) > 5000;
    // ease scale
    const ts = idle ? 1.0 : targetScale;
    logoScale += (ts - logoScale) * 0.04;
    for(const el of movableEls){
      const d = parseFloat(el.getAttribute('data-depth'))||0;
      const k = (isMobile? 18 : 46) * (idle ? 0.12 : 1);
      el.style.transform = `translate3d(${mx * d * k}px, ${my * d * k}px, 0)`;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // Starfield
  const canvas = document.getElementById('starfield');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const DPR = Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));
  let cw, ch, stars, shards;
  let ripples = [];
  // Hyper-impact layers
  let nebulaLayers = [];
  let ringParticles = [];
  let center = {x:0, y:0}, targetCenter = {x:0, y:0};
  let cam = {ox:0, oy:0, t:0};
  let t = 0;
  let warp = {a:0, cool:0};
  function resize(){
    cw = canvas.width = Math.floor(window.innerWidth * DPR);
    ch = canvas.height = Math.floor(window.innerHeight * DPR);
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    spawn();
    computeCenter();
  }
  function spawn(){
    const area = cw*ch;
  const density = Math.min(1.65, Math.max(0.85, (area / (1400*900)))); // ref 1400x900
  const count = Math.floor((area / (14000)) * density / (DPR>1.7? 1.15:1));
    stars = new Array(count).fill(0).map(()=>({
      x: Math.random()*cw,
      y: Math.random()*ch,
      z: Math.random()*1 + 0.3,
      a: Math.random()*Math.PI*2
    }));
    // shards lumineux
  const sCount = Math.max(8, Math.floor(Math.min(cw, ch)/220 * density));
    shards = new Array(sCount).fill(0).map(()=>({
      x: Math.random()*cw,
      y: Math.random()*ch,
      vx: (Math.random()*0.8 + 0.2) * (Math.random()<0.5? -1:1),
      vy: (Math.random()*0.2 - 0.1),
      len: Math.random()*140 + 80,
      w: Math.random()*2 + 0.6,
      hue: Math.random()<0.6? '198, 2, 2' : '246, 127, 65',
      o: Math.random()*0.3 + 0.25
    }));
    // Nebula layers (soft radial blobs)
  const nl = Math.floor((7 + Math.min(cw, ch)/520) * (0.9 + 0.5*density));
    nebulaLayers = new Array(nl).fill(0).map(()=>({
      x: Math.random()*cw,
      y: Math.random()*ch*0.8 + ch*0.1,
      r: Math.random()*Math.max(cw, ch)*0.25 + Math.max(cw, ch)*0.12,
      hue: Math.random()<0.5? '198, 2, 2' : '246, 127, 65',
      o: Math.random()*0.08 + 0.04,
      driftX: (Math.random()*0.4-0.2),
      driftY: (Math.random()*0.2-0.1)
    }));
    // Particle ring around logo
  const rp = Math.floor(150 * Math.max(1, Math.min(window.innerWidth, window.innerHeight)/900) * density);
    const baseR = Math.min(cw, ch) * 0.17;
    ringParticles = new Array(rp).fill(0).map((_,i)=>({
      a: (i/rp) * Math.PI*2,
      r: baseR * (0.9 + Math.random()*0.2),
      s: (Math.random()*0.004 + 0.002) * (Math.random()<0.5? 1:-1),
      o: Math.random()*0.35 + 0.25,
      w: Math.random()*1.2 + 0.6,
      hue: Math.random()<0.6? '198, 2, 2' : '246, 127, 65'
    }));
  }
  function burst(n=24){
    const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(rm) return;
    for(let i=0;i<n;i++){
      shards.push({
        x: cw/2 + (Math.random()-0.5)*cw*0.2,
        y: ch/2 + (Math.random()-0.5)*ch*0.2,
        vx: (Math.random()*2 - 1) * 1.8,
        vy: (Math.random()*1 - 0.5) * 0.8,
        len: Math.random()*220 + 100,
        w: Math.random()*2.2 + 0.8,
        hue: Math.random()<0.5? '198, 2, 2' : '246, 127, 65',
        o: Math.random()*0.35 + 0.35,
        life: 1.0
      });
    }
  }
  function ripple(x = center.x, y = center.y){
    const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(rm) return;
    ripples.push({ x, y, r: 2 * DPR, dr: 4 * DPR, a: 0.35, hue: Math.random()<0.5? '198, 2, 2' : '246, 127, 65' });
  }
  function streak(){
    const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(rm) return;
    // simple lens streak boost
    for(let k=0;k<3;k++){
      shards.push({ x: center.x-50, y:center.y, vx:4+k, vy:(Math.random()-.5)*0.4, len: 260+Math.random()*120, w: 1+Math.random()*1.2, hue: '246, 127, 65', o: 0.35, life: 0.6 });
    }
  }
  function rippleAtClient(cx, cy){
    const x = Math.floor((cx) * DPR);
    const y = Math.floor((cy) * DPR);
    ripple(x, y);
  }
  function computeCenter(){
    try{
      const el = document.querySelector('.brand-logo');
      if(!el){ targetCenter = {x: cw/2, y: ch*0.46}; return; }
      const r = el.getBoundingClientRect();
      const cx = (r.left + r.width/2) * DPR;
      const cy = (r.top + r.height/2) * DPR;
      targetCenter = {x: cx, y: cy};
    }catch(e){ targetCenter = {x: cw/2, y: ch*0.46}; }
  }
  // Recompute center on resize or layout changes (handled above)
  function render(){
    if(window.__freezeScene){
      // marquer la scène comme non prête lors du gel
      try{ window.__sceneReady = false; }catch(_){ }
      // dessiner quand même la frame mais sans drift
      ctx.clearRect(0,0,cw,ch);
    }
    t += 1/60;
    ctx.clearRect(0,0,cw,ch);
  // reduced motion flag
    const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const idle = (Date.now() - lastActive) > 5000;
    // caméra drift lente
    if(!window.__freezeScene){
      cam.t += 0.0016;
      // Si reduce-motion, réduire mais ne pas annuler totalement pour garder un drift subtil
      const reduce = rm ? 0.35 : 1;
      const idleReduce = idle ? 0.12 : 1;
      cam.ox = Math.sin(cam.t*1.2) * (isFinite(cw)? cw: 0) * 0.01 * reduce * idleReduce;
      cam.oy = Math.cos(cam.t*1.1) * (isFinite(ch)? ch: 0) * 0.012 * reduce * idleReduce;
    }
    // Si on a tenté le motion mais qu’aucune activité capteur n’est détectée, couper pour alléger
    if(useMotion && (Date.now() - motionStartedAt) > 4500 && motionActivity < 8){
      disableMotion();
    }
    // Warp streaks (occasionnels)
    if(!rm && !window.__freezeScene){
      warp.cool -= 1;
      if(!idle && warp.cool <= 0 && Math.random() < 0.007){ warp.a = 1; warp.cool = 600; }
      if(warp.a > 0){
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const W = Math.min(cw,ch) * 0.6;
        const H = W * 0.06;
        const grad = ctx.createLinearGradient(center.x - W/2, center.y, center.x + W/2, center.y);
        grad.addColorStop(0, 'rgba(198,2,2,0)');
        grad.addColorStop(0.5, 'rgba(246,127,65,' + (0.18*warp.a).toFixed(3) + ')');
        grad.addColorStop(1, 'rgba(198,2,2,0)');
        ctx.fillStyle = grad;
        ctx.translate(center.x+cam.ox*0.4, center.y+cam.oy*0.4);
        ctx.rotate(Math.sin(t*0.8)*0.02);
        ctx.fillRect(-W/2, -H/2, W, H);
        ctx.restore();
        warp.a *= 0.95;
      }
    }
    // Nebula background
    if(!window.__freezeScene){
      ctx.save();
      for(const n of nebulaLayers){
        const scale = (rm ? 0.35 : 1) * (idle ? 0.2 : 1);
        const gx = n.x + Math.sin(t*0.05 + n.r)*n.driftX*8*scale;
        const gy = n.y + Math.cos(t*0.04 + n.r)*n.driftY*8*scale;
        const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, n.r);
        grad.addColorStop(0, `rgba(${n.hue}, ${n.o})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(gx + cam.ox*0.5, gy + cam.oy*0.5, n.r, 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();
    }
    for(const s of stars){
      s.a += 0.01 * s.z;
      const twinkle = 0.5 + Math.sin(s.a)*0.35;
      const r = (0.5 + s.z*0.7) * DPR;
      // teinte chaude rouge/orange
      const warm = Math.random() < 0.15 ? '246, 127, 65' : '198, 2, 2';
      ctx.fillStyle = `rgba(${warm}, ${0.6*twinkle})`;
      ctx.beginPath();
      ctx.arc(s.x + cam.ox, s.y + cam.oy, r, 0, Math.PI*2);
      ctx.fill();
    }
    // Particle ring (additive)
    if(!window.__freezeScene){
      // ease center to target
      const cEase = idle ? 0.02 : 0.08;
      center.x += (targetCenter.x - center.x) * cEase;
      center.y += (targetCenter.y - center.y) * cEase;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for(const p of ringParticles){
        p.a += p.s * (rm ? 0.35 : 1) * (idle ? 0.2 : 1);
  const x = center.x + Math.cos(p.a) * p.r + cam.ox*0.3;
  const y = center.y + Math.sin(p.a) * (p.r*0.62) + cam.oy*0.3;
        const alpha = p.o * (0.8 + 0.2*Math.sin(t*2 + p.a));
        ctx.fillStyle = `rgba(${p.hue}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, p.w * DPR, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.restore();
    }
    // Shards
    if(!window.__freezeScene){
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for(const sh of shards){
        ctx.strokeStyle = `rgba(${sh.hue}, ${sh.o})`;
        ctx.lineWidth = sh.w * DPR;
        ctx.beginPath();
  ctx.moveTo(sh.x + cam.ox*0.8, sh.y + cam.oy*0.8);
  ctx.lineTo(sh.x + cam.ox*0.8 + sh.len*DPR, sh.y + cam.oy*0.8 - sh.len*0.12*DPR);
        ctx.stroke();
  const mv = (rm ? 0.4 : 1.2) * (idle ? 0.25 : 1);
  sh.x += sh.vx * DPR * mv;
  sh.y += sh.vy * DPR * mv;
        if(typeof sh.life === 'number'){
          sh.life -= 0.01;
          sh.o = Math.max(0, sh.o - 0.012);
        }
        if((sh.life!=null && sh.life<=0) || sh.x > cw+200 || sh.x < -200 || sh.y < -200 || sh.y > ch+200){
          sh.x = Math.random()<0.5? -100 : cw+100;
          sh.y = Math.random()*ch;
          sh.life = undefined; // back to ambient shard
          sh.o = Math.random()*0.3 + 0.25;
        }
      }
      ctx.restore();
      // Ripples (shockwave)
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for(let i=ripples.length-1;i>=0;i--){
        const rp = ripples[i];
        ctx.strokeStyle = `rgba(${rp.hue}, ${rp.a})`;
        ctx.lineWidth = 2 * DPR;
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI*2);
        ctx.stroke();
        rp.r += rp.dr;
        rp.a *= 0.94;
        if(rp.a < 0.02 || rp.r > Math.max(cw, ch)) ripples.splice(i,1);
      }
      ctx.restore();
      // Soft lens flare near center
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
  const flareR = Math.min(cw, ch) * 0.09;
      const flareA = 0.10;
  const grad = ctx.createRadialGradient(center.x+cam.ox*0.4, center.y+cam.oy*0.4, 0, center.x+cam.ox*0.4, center.y+cam.oy*0.4, flareR);
      grad.addColorStop(0, `rgba(246,127,65, ${flareA})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(center.x, center.y, flareR, 0, Math.PI*2); ctx.fill();
      // horizontal streak
      ctx.strokeStyle = 'rgba(246,127,65, 0.08)';
      ctx.lineWidth = 2 * DPR;
      ctx.beginPath();
  ctx.moveTo(center.x+cam.ox*0.4 - flareR*2.2, center.y+cam.oy*0.4);
  ctx.lineTo(center.x+cam.ox*0.4 + flareR*2.2, center.y+cam.oy*0.4);
      ctx.stroke();
      ctx.restore();
    }
    // signaler readiness après une première frame rendue
    try{ window.__sceneReady = true; }catch(_){ }
    requestAnimationFrame(render);
  }
  resize();
  window.addEventListener('resize', resize);
  // Try auto-enable motion where possible (Android / older iOS)
  tryEnableMotion(false);
  requestAnimationFrame(render);
  // Expose simple Scene API
  window.Scene = window.Scene || {};
  window.Scene.burst = burst;
  window.Scene.ripple = ripple;
  window.Scene.rippleAtClient = rippleAtClient;
  window.Scene.streak = streak;
})();
