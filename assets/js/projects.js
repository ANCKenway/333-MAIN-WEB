// Overlay projets cinématique
(function(){
  const overlay = document.getElementById('projects-overlay');
  const grid = document.getElementById('projects-grid');
  const closeBtn = document.getElementById('projects-close');
  let lastFocus = null;
  let keyHandler = null;

  async function loadProjects(){
    try{
      const res = await fetch('projects.json', {cache:'no-store'});
      if(!res.ok) throw new Error('HTTP '+res.status);
      const list = await res.json();
      grid.innerHTML = '';
      list.forEach((p, i)=>{
        const item = document.createElement('button');
        item.className = 'proj-card';
        item.setAttribute('role','listitem');
        const hasImg = !!p.image;
        const mediaStyle = hasImg ? ` style="background-image:url('${p.image?.replace(/"/g,'\"')}')"` : '';
        item.innerHTML = `
          <div class="proj-media"${mediaStyle} aria-hidden="true"></div>
          <div class="proj-meta">
            <span class="proj-index">${String(i+1).padStart(2,'0')}</span>
            <span class="proj-title">${p.title}</span>
            <span class="proj-status">${p.status||''}</span>
          </div>
        `;
        item.addEventListener('click', ()=>{
          if(p.url) window.open(p.url, '_blank', 'noopener,noreferrer');
        });
        // hover parallax (subtle)
        item.addEventListener('mousemove', (e)=>{
          const r = item.getBoundingClientRect();
          const x = (e.clientX - r.left)/r.width - 0.5;
          const y = (e.clientY - r.top)/r.height - 0.5;
          item.style.setProperty('--mx', x.toFixed(3));
          item.style.setProperty('--my', y.toFixed(3));
        });
        item.addEventListener('mouseleave', ()=>{
          item.style.removeProperty('--mx');
          item.style.removeProperty('--my');
        });
        grid.appendChild(item);
      });
    }catch(err){
      grid.innerHTML = '<div class="proj-error">Impossible de charger les projets.</div>';
    }
  }

  function open(){
    overlay?.classList.add('open');
    overlay?.setAttribute('aria-hidden','false');
    if(grid && !grid.childElementCount) loadProjects();
    // focus management
    lastFocus = document.activeElement;
    setTimeout(()=>{
      const focusables = getFocusable(overlay);
      (focusables[0]||closeBtn||overlay).focus();
    }, 30);
    // key handling: Esc + Tab trap + arrow simple
    keyHandler = (e)=>{
      if(e.key === 'Escape'){ e.preventDefault(); close(); return; }
      trapFocus(e, overlay);
      // basic arrow navigation within grid
      const active = document.activeElement;
      if(active && active.classList && active.classList.contains('proj-card')){
        const items = [...grid.querySelectorAll('.proj-card')];
        const idx = items.indexOf(active);
        if(e.key === 'ArrowRight'){ e.preventDefault(); (items[idx+1]||items[0]||active).focus(); }
        else if(e.key === 'ArrowLeft'){ e.preventDefault(); (items[idx-1]||items[items.length-1]||active).focus(); }
        else if(e.key === 'ArrowDown'){ e.preventDefault(); (items[idx+3]||items[items.length-1]||active).focus(); }
        else if(e.key === 'ArrowUp'){ e.preventDefault(); (items[idx-3]||items[0]||active).focus(); }
      }
    };
    window.addEventListener('keydown', keyHandler);
  }
  function close(){
    overlay?.classList.remove('open');
    overlay?.setAttribute('aria-hidden','true');
    if(keyHandler){ window.removeEventListener('keydown', keyHandler); keyHandler = null; }
    if(lastFocus && lastFocus.focus){ setTimeout(()=> lastFocus.focus(), 30); }
  }

  closeBtn?.addEventListener('click', close);
  overlay?.addEventListener('click', (e)=>{ if(e.target === overlay) close(); });

  // Expose simple API via window for terminal bridge
  window.ProjOverlay = { open, close };

  // helpers
  function getFocusable(container){
    return [...container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
      .filter(el=>!el.hasAttribute('disabled'));
  }
  function trapFocus(e, container){
    if(e.key !== 'Tab') return;
    const f = getFocusable(container);
    if(!f.length) return;
    const first = f[0], last = f[f.length-1];
    if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
  }
})();
