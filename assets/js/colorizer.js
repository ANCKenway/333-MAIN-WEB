// Extractor de palette client-side (fallback) via canvas sampling
(function(){
  const img = document.querySelector('.brand-logo');
  if(!img) return;
  const root = document.documentElement;
  async function fromAPI(){
    try{
      const res = await fetch(`api/palette.php?img=${encodeURIComponent(img.getAttribute('src')||'assets/img/cover.jpg')}&k=5`, {cache:'no-store'});
      if(!res.ok) throw new Error('http');
      const data = await res.json();
      const [r,g,b] = data.main || [];
      const sec = data.secondary || data.main;
      if(r!=null){
        root.style.setProperty('--accent', `rgb(${r} ${g} ${b})`);
      }
      if(Array.isArray(sec)){
        root.style.setProperty('--accent-2', `rgb(${sec[0]} ${sec[1]} ${sec[2]})`);
      }
      return true;
    }catch(e){ return false; }
  }
  function fromCanvas(){
    try{
      const c = document.createElement('canvas');
      const ctx = c.getContext('2d');
      const w = c.width = Math.min(256, img.naturalWidth||256);
      const h = c.height = Math.min(256, img.naturalHeight||256);
      ctx.drawImage(img, 0,0,w,h);
      const data = ctx.getImageData(0,0,w,h).data;
      const buckets = {}; const step = 8;
      for(let y=0;y<h;y+=step){
        for(let x=0;x<w;x+=step){
          const i = (y*w + x)*4; const r=data[i], g=data[i+1], b=data[i+2];
          const key = `${Math.round(r/16)}-${Math.round(g/16)}-${Math.round(b/16)}`;
          buckets[key] = (buckets[key]||0)+1;
        }
      }
      const sorted = Object.entries(buckets).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k])=>k.split('-').map(n=>parseInt(n)*16));
      if(sorted.length){
        const [r,g,b] = sorted[0];
        root.style.setProperty('--accent', `rgb(${r} ${g} ${b})`);
      }
    }catch(e){/* ignore */}
  }
  async function run(){
    const ok = await fromAPI();
    if(!ok) fromCanvas();
  }
  if(img.complete) run(); else img.addEventListener('load', run);
})();
