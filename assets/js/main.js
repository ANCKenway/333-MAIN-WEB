// 333.FM main bootstrap
(function(){
  // Configuration des effets
  const CFG = {
    GLITCH_AFTER_INTRO: false, // Désactive les glitchs récurrents (pulses/punch/overlays) après l'intro
    BOOT_RAIN: false           // Désactive l'effet Matrix (rain) sur la page boot
  };
  const year = document.getElementById('year');
  if(year) year.textContent = String(new Date().getFullYear());
  const logo = document.querySelector('.brand-logo');
  if(logo){
    logo.classList.add('sheen');
    // glitch léger pendant l'intro
    const intro = document.getElementById('intro');
  if(intro){ setTimeout(()=> { if(false){ logo.classList.add('glitch'); } }, 600); }
    // Impulsions glitch au chargement + random pulses
    try{
      const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if(!rm && CFG.GLITCH_AFTER_INTRO){
        const pulse = ()=>{
          logo.classList.remove('glitch-pulse'); // restart animation
          // force reflow
          // eslint-disable-next-line no-unused-expressions
          logo.offsetHeight;
          logo.classList.add('glitch-pulse');
          // micro glitch overlay
          try{
            const o = document.createElement('div'); o.className = 'global-glitch';
            document.body.appendChild(o);
            setTimeout(()=> o.remove(), 220);
            document.getElementById('tech-overlay')?.classList.add('shake-xs');
            setTimeout(()=> document.getElementById('tech-overlay')?.classList.remove('shake-xs'), 140);
          }catch(_){ }
        };
        // au premier accès
        setTimeout(pulse, 950);
        // pulses pseudo-aléatoires (discrets) toutes 4–8s
        let alive = true;
        const loop = ()=>{
          if(!alive) return;
          const t = 4000 + Math.random()*4000;
          setTimeout(()=>{ pulse(); loop(); }, t);
        };
        loop();
        // arrêt quand on quitte la page
        window.addEventListener('pagehide', ()=>{ alive = false; }, {once:true});
        // PUNCH rare (18–30s): glitch puissant + halo + effets de scène
        const punch = ()=>{
          if(window.__bootRunning || window.__bootDone === false) return; // évite pendant boot
          // classes CSS pour le logo
          logo.classList.remove('glitch-punch'); logo.classList.remove('punch-halo');
          logo.offsetHeight; // reflow
          logo.classList.add('glitch-punch'); logo.classList.add('punch-halo');
          // effets canvas synchronisés
          try{ window.Scene?.streak?.(); window.Scene?.burst?.(24); window.Scene?.ripple?.(); }catch(_){ }
          // cassure d'écran visible
          try{
            const t = document.createElement('div'); t.className = 'screen-tear';
            document.body.appendChild(t);
            setTimeout(()=> t.remove(), 260);
            const o = document.createElement('div'); o.className = 'global-glitch';
            document.body.appendChild(o);
            setTimeout(()=> o.remove(), 300);
            const tech = document.getElementById('tech-overlay');
            tech?.classList.add('shake-xs'); setTimeout(()=> tech?.classList.remove('shake-xs'), 160);
          }catch(_){ }
          // retirer la classe halo après l’anim
          setTimeout(()=>{ logo.classList.remove('punch-halo'); }, 1000);
        };
        // exposer un trigger global pour lancer un punch à la demande
        window.UI = window.UI || {}; window.UI.triggerPunch = punch;
        const punchLoop = ()=>{
          if(!alive) return;
          const t = 12000 + Math.random()*8000; // 12–20s
          setTimeout(()=>{ punch(); punchLoop(); }, t);
        };
        punchLoop();
      }
    }catch(_){ }
  }

  window.UI = window.UI || {};
  function toast(msg){
    const t = document.getElementById('toast');
    if(!t) return; t.textContent = msg; t.classList.add('show'); t.setAttribute('aria-hidden','false');
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(()=>{ t.classList.remove('show'); t.setAttribute('aria-hidden','true'); }, 1600);
  }
  window.UI.toast = toast;
  function startBoot(){
    if(window.__bootRunning || window.__bootDone) return;
    const boot = document.getElementById('boot');
    const pre = document.getElementById('boot-pre');
    if(!boot || !pre){ window.__bootDone = true; return; }
    // Verrou responsive: gèle les couches de fond et le parallax pendant le boot
    try{
      document.documentElement.classList.add('booting');
      window.__freezeScene = true;
    }catch(_){ }
    boot.hidden = false; boot.setAttribute('aria-hidden','false');
    pre.textContent = '';
    // Matrix rain setup
  const rain = document.getElementById('boot-rain');
  // Détection navigateur simple (Edge/Chromium) pour adapter certains effets
  const isEdge = /Edg\//.test(navigator.userAgent);
    const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let stopRain = null;
    if(rain && !rm && CFG.BOOT_RAIN){
      const ctx = rain.getContext('2d');
      function resize(){ rain.width = rain.clientWidth; rain.height = rain.clientHeight; }
      resize();
      const chars = '01░▒▓$#*+-≡<>/\\|'.split('');
      const fontSize = 14; ctx.font = fontSize+'px JetBrains Mono, monospace';
      const columns = Math.floor(rain.width / fontSize);
      const drops = new Array(columns).fill(1);
      let animId = 0;
      function draw(){
        ctx.fillStyle = 'rgba(0, 8, 8, 0.18)';
        ctx.fillRect(0,0,rain.width,rain.height);
        for(let i=0;i<drops.length;i++){
          // Edge: palettes un poil moins flashy pour lisibilité
          ctx.fillStyle = (isEdge ? (Math.random()> .985 ? '#99eedd' : '#00c86a') : (Math.random() > .975 ? '#aaffee' : '#00d26a'));
          const text = chars[Math.floor(Math.random()*chars.length)];
          ctx.fillText(text, i*fontSize, drops[i]*fontSize);
          if(drops[i]*fontSize > rain.height && Math.random() > 0.975){ drops[i]=0; }
          drops[i]++;
        }
        animId = requestAnimationFrame(draw);
      }
      function onResize(){ resize(); }
      window.addEventListener('resize', onResize);
      animId = requestAnimationFrame(draw);
      stopRain = ()=>{ cancelAnimationFrame(animId); window.removeEventListener('resize', onResize); };
      // Edge: éviter tout filtre CSS externe sur le conteneur boot qui peut ne pas être pris en charge
      try{
        if(isEdge){
          const fx = document.querySelector('.boot-fx');
          if(fx){ fx.style.animation = 'none'; fx.style.opacity = '.22'; fx.style.mixBlendMode = 'normal'; }
        }
      }catch(_){ }
    }
  const lines = [
      'Initialisation du site <span class="ok">&gt; OK</span>',
      'Roulage du premier pour vérification <span class="ok">&gt; OK</span>',
      '333 FM OK <span class="ok">&gt; OK</span>',
      'FREE XAVIER NIEL (Merci pour la connexion le frérot) <span class="err">&gt; ERROR: Attention au proxénitisme le frérot</span>',
      'Initialisation des services dont j’ai plus le nom <span class="warn">&gt; Casi-OK</span>',
      'Reroulage d’un autre pour vérification et expertise <span class="ok">&gt; OK</span>',
      'Captain / coca pour valider l’intégrité du lancement <span class="ok">&gt; OK</span>',
      'Lancement OK <span class="ok">&gt; PL</span>',
      'Recherche du Capitaine Morgan physiquement <span class="warn">&gt; Impossible de trouver son navire sur Sea of Thieves</span>',
      'Désactivation Colonel Sanders (KFC) — recette de poulet sauvegardée <span class="ok">&gt; OK (déjà décédé)</span>',
      'Vérification dossier sensible (censuré) : Error <span class="err">&gt; NOK</span>',
      'Tentative de localisation de Xavier Dupont de Ligonnès : semble utiliser un VPN <span class="err">&gt; NOK</span>',
      'Initialisation OK <span class="ok">&gt; OK</span>',
      'Tentative de connexion à RIOT GAMES : Erreur, banni par un Espagnol pour un jajajajaja <span class="err">&gt; NOK</span>',
      '333FM LAUNCHING',
      ' _____  _____  ______________  ___  ',
      '|____ ||____ ||____ |  ___|  \\/  |  ',
      '    / /    / /    / / |_  | .  . |  ',
      '    \\ \\    \\ \\    \\ \\  _| | |\\/| |  ',
      '.___/ /.___/ /.___/ / |   | |  | |  ',
      '\\____/ \\____/ \\____/\\_|   \\_|  |_/  ',
      '',
  '<span class="separator"></span>',
      '<span class="subtle-err">FREE PALESTINE</span>',
      '<span class="subtle-err">FREE ROHINGYA</span>',
      '<span class="subtle-err">FREE OUÏGHOURS</span>',
      '<span class="subtle-err">FREE SAHRAOUI</span>',
      '<span class="subtle-err">FREE KURDISTAN</span>',
      '<span class="subtle-err">FREE TIGRÉ</span>',
      '<span class="subtle-err">FREE KABYLIE</span>',
      '<span class="subtle-err">FREE WEST PAPUA</span>',
      '<span class="subtle-err">FREE NAGA LAND</span>',
      '<span class="subtle-err">FREE CHAGOS</span>',
      '<span class="subtle-err">FREE MAYA</span>',
      '<span class="subtle-err">FREE ABORIGINALS</span>',
      '<span class="subtle-err">FREE AMAZONIA</span>',
      '<span class="subtle-err">FREE CONGO</span>',
      '<span class="subtle-err">FREE GAZA</span>',
      '<span class="subtle-err">FREE CEUTA</span>',
      '<span class="subtle-err">FREE MELILLA</span>',
      '<span class="subtle-err">FREE STUDENTS IN IRAN</span>',
      '<span class="subtle-err">FREE JOURNALISTS IN ERITREA</span>',
      '<span class="subtle-err">FREE INTERNET IN NORTH KOREA</span>'
    ];
  let i=0;
  let asciiPhase = false;
  let continueTimer = null; let continued = false; let cleanupKey = null;
    // Auto-scroll helper pour suivre le bas du flux
    function scrollBootBottom(){
      try{
        const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if(pre && pre.scrollHeight){
          if(pre.scrollTo){ pre.scrollTo({ top: pre.scrollHeight, behavior: rm? 'auto' : 'smooth' }); }
          else { pre.scrollTop = pre.scrollHeight; }
        }
      }catch(_){ }
    }
    function continueBoot(){
      if(continued) return; continued = true;
      try{ const btn = document.getElementById('boot-continue'); if(btn){ btn.disabled = true; btn.classList.remove('pulse'); btn.setAttribute('aria-disabled','true'); } }catch(_){ }
      // petit impact visuel simultané à l'ASCII
      try{ window.Scene?.burst?.(20); window.Scene?.ripple?.(); window.Scene?.streak?.(); }catch(_){ }
      setTimeout(()=>{
        boot.style.transition = 'opacity .5s ease';
        boot.style.pointerEvents = 'none';
        boot.style.opacity = '0';
        const finalize = ()=>{
          try{ stopRain?.(); }catch(_){}
          boot.remove();
          window.__bootDone = true;
          window.__bootRunning = false;
          try{
            document.documentElement.classList.remove('booting');
            window.__freezeScene = false;
          }catch(_){ }
          const input = document.getElementById('terminal-input');
          if(input){
            input.focus();
            setTimeout(()=>{ try{ input.setSelectionRange(input.value.length, input.value.length); }catch(_){} }, 30);
          }
        };
        boot.addEventListener('transitionend', finalize, {once:true});
        setTimeout(finalize, 700);
      }, 350);
    }
    const tick=()=>{
      if(i<lines.length){
        const line = lines[i];
        const decorate = (!asciiPhase && line !== '333FM LAUNCHING' && (i % 2 === 1));
        const out = decorate ? ('<span class="line-alt">'+line+'</span>') : line;
        // Compacter la section FREE: dès le séparateur, injecter tout le bloc restant d'un coup
        if(line === '<span class="separator"></span>'){
          const block = lines.slice(i).join('\n');
          pre.innerHTML += (pre.innerHTML? '\n' : '') + block;
          i = lines.length; // on saute directement à la fin
          requestAnimationFrame(scrollBootBottom);
          // petite pause avant d'afficher le bouton
          setTimeout(tick, 120);
          return;
        }
        pre.innerHTML += (pre.innerHTML? '\n' : '') + out;
        if(line === '333FM LAUNCHING'){ asciiPhase = true; }
        i++;
        // faire suivre la barre de contenu automatiquement
        requestAnimationFrame(scrollBootBottom);
        // légère accélération globale
        setTimeout(tick, 140);
      } else {
        // Afficher bouton Continuer + auto-continue après 5s
        const btn = document.getElementById('boot-continue');
        if(btn){
          let secs = 3;
          const baseLabel = 'Continuer';
          btn.textContent = `${baseLabel} (${secs})`;
          btn.setAttribute('aria-label', `${baseLabel} — lancement auto dans ${secs} secondes`);
          btn.classList.add('pulse');
          btn.style.display = 'inline-flex';
          btn.addEventListener('click', continueBoot, {once:true});
          const cd = setInterval(()=>{
            if(continued){ clearInterval(cd); return; }
            secs--; if(secs<=0){ clearInterval(cd); return; }
            btn.textContent = `${baseLabel} (${secs})`;
            btn.setAttribute('aria-label', `${baseLabel} — lancement auto dans ${secs} secondes`);
          }, 1000);
        }
        // s'assurer qu'on voit le bas à l'apparition du bouton
        requestAnimationFrame(scrollBootBottom);
        continueTimer = setTimeout(continueBoot, 3000);
        // Aussi valider sur Enter
        const onKey = (e)=>{ if(e.key === 'Enter'){ e.preventDefault(); continueBoot(); window.removeEventListener('keydown', onKey); } };
        cleanupKey = onKey;
        window.addEventListener('keydown', onKey);
      }
    };
    tick();
  }

  // Fallback clavier: lance le boot si non encore déclenché
  window.addEventListener('keydown', (e)=>{ if(!window.__bootRunning && !window.__bootDone) startBoot(); });
  // pointer ripple
  window.addEventListener('pointerdown', (e)=>{
    try{ window.Scene?.rippleAtClient?.(e.clientX, e.clientY); }catch(_){ }
  }, {passive:true});

  // Reduce motion / mobile tilt off
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  if(mq.matches || /Mobi|Android/i.test(navigator.userAgent)){
    const logo = document.querySelector('.brand-logo');
    if(logo) logo.style.transform = 'none';
  }

  // Intro sequence
  const intro = document.getElementById('intro');
  if(intro){
    const introStart = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    let introEnded = false;
    const endIntro = ()=>{
      if(introEnded) return; introEnded = true;
      // 1) Stopper les animations pour un affichage "normal" 1–2s
      try{ const il = document.querySelector('.intro-logo'); il?.classList.remove('spin-loop'); il?.classList.remove('flick'); }catch(_){ }
      const hold = 1200; // 1.2s de maintien statique
      setTimeout(()=>{
        // 2) Fade-out de l'intro
        intro.style.transition = 'opacity .6s ease';
        intro.style.opacity = '0';
        setTimeout(()=>{ 
          intro.remove(); 
          // Effet WAOUH : burst shards + flash chroma
          const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          if(!rm){
            window.Scene?.burst?.(32);
            // shockwave centrale (soft, sans glitch)
            window.Scene?.ripple?.();
          }
          // Prefetch projects for snappier UX
          const link2 = document.createElement('link');
          link2.rel = 'prefetch';
          link2.href = 'projects.json';
          document.head.appendChild(link2);
          // Lancer automatiquement le boot après l'intro
          setTimeout(()=> startBoot(), 200);
        }, 700);
      }, hold);
    };
    // Poll de readiness: attendre que la scène soit prête (ou timeout)
    const minShow = 2600; // ms
    const maxWait = 6000; // garde-fou
  // Loader d'intro supprimé
  function setProgress(_p){}
    const poll = ()=>{
      if(introEnded) return;
      const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      const elapsed = now - introStart;
      const ready = !!window.__sceneReady;
      // maj loader: 0 -> 0.8 pendant minShow, puis 1.0 quand prêt ou timeout
      const p = Math.min(0.8, elapsed / minShow * 0.8);
      setProgress(ready ? 1 : p);
      if((elapsed >= minShow && ready) || elapsed >= maxWait){
        endIntro();
      } else {
        setTimeout(poll, 120);
      }
    };
    // Effet immédiat sur le logo d'intro pour être visible avant le fade (via raf)
    try{
      const rm0 = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const introLogo0 = document.querySelector('.intro-logo');
      requestAnimationFrame(()=>{
        // Toujours poser les classes (le CSS gère une version plus soft en reduced-motion)
        if(introLogo0){ introLogo0.classList.add('flick'); introLogo0.classList.add('spin-loop'); }
        if(!rm0){
          window.Scene?.streak?.();
          setTimeout(()=> window.Scene?.burst?.(20), 120);
          // Flash additif court
          const f0 = document.createElement('div'); f0.className = 'impact-flash'; document.body.appendChild(f0);
          f0.addEventListener('animationend', ()=> f0.remove(), {once:true});
        }
        // Fallback JS: forcer un mouvement 3D visible même si les animations CSS ne démarrent pas
        try{
          if(introLogo0){
            introLogo0.style.willChange = 'transform, filter, margin';
            introLogo0.style.transition = 'transform 1200ms cubic-bezier(.22,.61,.36,1), filter 900ms ease, margin 600ms ease';
            introLogo0.style.marginTop = '3vh';
            introLogo0.style.transform = 'rotateY(16deg) rotateX(-3deg) scale(1)';
            introLogo0.style.filter = 'contrast(1.2) saturate(1.15)';
            setTimeout(()=>{
              introLogo0.style.transform = 'rotateY(0) rotateX(0) scale(1)';
              introLogo0.style.filter = '';
              introLogo0.style.marginTop = '2vh';
            }, 950);
            // Edge: si l'animation CSS boucle mal, simuler une boucle douce JS
            const isEdge = /Edg\//.test(navigator.userAgent);
            if(isEdge){
              let a = 0; let raf;
              const loop = ()=>{
                a = (a + 1.4) % 360; // encore un peu plus lent
                // Ne pas écraser si l'intro est déjà terminée
                if(!document.getElementById('intro')){ cancelAnimationFrame(raf); return; }
                introLogo0.style.transform = `rotateY(${a}deg) scale(1)`;
                raf = requestAnimationFrame(loop);
              };
              // Démarrer une boucle très courte pour donner l’illusion du spin-loop si CSS capricieux
              raf = requestAnimationFrame(loop);
              // Arrêter quand on déclenche la sortie
              setTimeout(()=>{ try{ cancelAnimationFrame(raf); }catch(_){ } }, 1800);
            }
          }
        }catch(_){ }
      });
    }catch(_){ }
    // Micro-rafales d'effets pendant le scan (indépendant du fade final)
    setTimeout(()=>{
      try{
        const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if(!rm){
          window.Scene?.streak?.();
          setTimeout(()=> window.Scene?.burst?.(12), 180);
        }
      }catch(_){ }
    }, 600);
    // Démarrer le poll
    poll();
  }
  // Idle attractor: mini burst + toast après 15s d'inactivité
  ;(function(){
    let idleTimer = null;
    const reset = ()=>{
      if(idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(()=>{
        const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if(!rm){ window.Scene?.burst?.(8); }
        window.UI?.toast?.('Tapez une URL ou "poster"');
      }, 15000);
    };
    ['mousemove','keydown','touchstart'].forEach(evt=> window.addEventListener(evt, reset, {passive:true}));
    reset();
  })();
})();
