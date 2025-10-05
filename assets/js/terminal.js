// 333.FM faux terminal
(function(){
  const elOut = document.getElementById('terminal-output');
  const elIn = document.getElementById('terminal-input');
  const wrap = document.getElementById('terminal');

  if(!elOut || !elIn || !wrap) return;

  const state = { history: [], index: -1, cap: 120 };
  // Aliases: prompt -> URL (chargé dynamiquement + fallback local)
  const aliases = {
    // Fallback de base; remplacé/complété par data/aliases.json
    "333game": "https://333fm.fr/333game/"
  };
  (async function loadAliases(){
    try{
      const r = await fetch('data/aliases.json', {cache:'no-cache'});
      if(r.ok){
        const j = await r.json();
        if(j && typeof j === 'object'){
          Object.assign(aliases, j);
        }
      }
    }catch(_){ /* silencieux */ }
  })();

  function type(lines, delay=12){
    return new Promise(resolve => {
      let i = 0;
      function step(){
        if(i < lines.length){
          elOut.textContent += lines[i] + '\n';
          i++;
          wrap.scrollTop = wrap.scrollHeight;
          setTimeout(step, delay);
        } else resolve();
      }
      step();
    });
  }

  function print(text=''){
    elOut.textContent += text + (text.endsWith('\n')? '' : '\n');
    wrap.scrollTop = wrap.scrollHeight;
    // cap lines
    const lines = elOut.textContent.split('\n');
    if(lines.length > state.cap){
      elOut.textContent = lines.slice(-state.cap).join('\n');
    }
  }

  async function banner(){ /* Silence, one-line prompt only */ }

  const commands = {
    poster(){
      try{
        const canvas = document.getElementById('starfield');
        if(!(canvas instanceof HTMLCanvasElement)){ print('Canvas introuvable'); return; }
        // produire une image pleine résolution (taille canvas actuelle)
        canvas.toBlob((blob)=>{
          if(!blob){ print('Export impossible'); return; }
          const a = document.createElement('a');
          const ts = new Date().toISOString().replace(/[:.]/g,'-');
          a.href = URL.createObjectURL(blob);
          a.download = `333FM-poster-${ts}.png`;
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(()=> URL.revokeObjectURL(a.href), 2500);
          window.UI?.toast?.('Poster exporté');
        }, 'image/png');
      }catch(e){ print('Erreur export poster'); }
    }
  };

  function parse(input){
    const [raw, ...rest] = input.trim().split(/\s+/);
    if(!raw) return;
    // One-line router: if it's a URL, open it; if it's a known quick alias, route it; else try mailto or ignore
  const key = (raw.toLowerCase && raw.toLowerCase()) || raw;
    const v = [raw].concat(rest).join(' ');
  const isUrl = /^https?:\/\//i.test(v) || v.startsWith('www.');
  const isDangerousScheme = /^(javascript:|data:|vbscript:|file:|ftp:)/i.test(v);
  if(isDangerousScheme){ print('Schéma non autorisé'); return; }
    if(isUrl){
      let u = v;
      if(!/^https?:\/\//i.test(u)) u = 'https://' + u;
      window.open(u, '_blank', 'noopener,noreferrer');
      return;
    }
    // alias directs: si la commande est une clé connue, ouvrir l'URL associée
    if(aliases[key]){
      const url = aliases[key];
      if(/^(javascript:|data:|vbscript:|file:|ftp:)/i.test(url)){ print('URL bloquée'); return; }
      if(/^https?:\/\//i.test(url)){ window.open(url, '_blank', 'noopener,noreferrer'); }
      else { window.location.href = url; }
      return;
    }
    // fallback API: rafraîchir la map depuis le backend si clé inconnue
    (async ()=>{
      try{
        const r = await fetch('api/aliases.php', {cache:'no-cache'});
        if(r.ok){ const j = await r.json(); if(j && typeof j==='object'){ Object.assign(aliases, j); } }
        if(aliases[key]){
          const url = aliases[key];
          if(/^(javascript:|data:|vbscript:|file:|ftp:)/i.test(url)){ print('URL bloquée'); return; }
          if(/^https?:\/\//i.test(url)){ window.open(url, '_blank', 'noopener,noreferrer'); }
          else { window.location.href = url; }
        }
      }catch(_){ /* silencieux */ }
    })();
    if(key === 'poster'){ commands.poster(); return; }
    // Accès admin via terminal: passe systématiquement par l'API, 2FA inclus
    (async ()=>{
      const entered = input.trim();
      try{
        const r = await fetch('api/aliases.php?action=auth', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ code: entered }) });
        if(r.status===429){ print('Trop d\'essais. Patientez.'); return; }
        const j = await r.json();
        if(j && j.ok){
          if(j.data && j.data.enroll){
            print('2FA: configuration requise → QR Code…');
            window.location.href = 'admin-enroll.html';
            return;
          }
          if(j.data && j.data.otp){
            print('2FA: entrez votre code OTP.');
            window.location.href = 'admin-login.html?from=prompt';
            return;
          }
          window.location.href = 'admin.php';
          return;
        }
        print('Code invalide ou 2FA requise. Utilisez la page Admin: Connexion.');
      }catch(_){ print('Erreur réseau'); }
    })();
    if(key === 'mail' || key === 'mailto'){
      window.location.href = 'mailto:contact@333fm.fr'; return;
    }
    if(key === 'radio' || key === 'sc'){
      window.open('https://soundcloud.com/3sclub', '_blank', 'noopener,noreferrer'); return;
    }
    if(key === 'projects' || key === 'proj'){
      try{ window.ProjOverlay?.open?.(); }catch(_){}
      return;
    }
    // Silent fallback
    if(/^[A-Za-z0-9@#\-_.]{12,}$/.test(input)){
      print('Accès admin uniquement via la page Connexion (2FA). Utilisez le lien en bas de page.');
    }
  }

  function onKey(e){
    if(e.key === 'Enter'){
      const v = elIn.value.trim();
      if(!v) return;
      print(`333.FM> ${v}`);
      state.history.push(v); state.index = state.history.length;
      elIn.value = '';
      parse(v);
    } else if(e.key === 'ArrowUp'){
      e.preventDefault();
      state.index = Math.max(0, state.index-1);
      elIn.value = state.history[state.index] || '';
      setTimeout(()=> elIn.setSelectionRange(elIn.value.length, elIn.value.length), 0);
    } else if(e.key === 'ArrowDown'){
      e.preventDefault();
      state.index = Math.min(state.history.length, state.index+1);
      elIn.value = state.history[state.index] || '';
      setTimeout(()=> elIn.setSelectionRange(elIn.value.length, elIn.value.length), 0);
    }
  }

  function init(){
    banner();
    elIn.addEventListener('keydown', onKey);
    wrap.addEventListener('click', ()=> elIn.focus());
    // pas de placeholder pour garder l'UI propre; le prompt fournit le contexte
    elIn.removeAttribute('placeholder');
    setTimeout(()=> elIn.focus(), 200);
  }

  init();
})();
