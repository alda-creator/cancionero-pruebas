// Phase 5 experimental: per-song Mi Set transposition. Lab only.
(function(){
 const KEY='church_song_set_transpose_v1';
 const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}};
 const write=m=>localStorage.setItem(KEY,JSON.stringify(m));
 const inSet=id=>Array.isArray(songSetIds)&&songSetIds.includes(id);
 function addControl(){
  const header=document.querySelector('#song-viewer .song-header');
  if(!header||document.getElementById('set-tone-save'))return;
  const b=document.createElement('button');b.id='set-tone-save';b.className='btn-action';b.style.marginTop='8px';
  b.textContent='Guardar tono en Mi Set';b.onclick=()=>{
   if(!currentSong||!inSet(currentSong.id)){alert('Agrega esta canción a Mi Set primero.');return;}
   const m=read();m[currentSong.id]=Number(currentTransposeSteps)||0;write(m);alert('Tono personalizado guardado.');
  };header.appendChild(b);
 }
 const originalOpen=window.openSong;
 window.openSong=function(id,origin){
  if(typeof originalOpen==='function')originalOpen(id,origin);
  if(!currentSong)return;
  if(songViewOrigin==='set'&&inSet(id)){
   const m=read();currentTransposeSteps=Number(m[id])||0;renderTransposedContent();
   if(currentRole==='director')broadcastToMusicians({type:'TRANSPOSE',steps:currentTransposeSteps});
  }
  addControl();
 };
 const originalTranspose=window.transpose;
 window.transpose=function(steps){
  if(typeof originalTranspose==='function')originalTranspose(steps);
  if(currentSong&&songViewOrigin==='set'&&inSet(currentSong.id)){const m=read();m[currentSong.id]=Number(currentTransposeSteps)||0;write(m);}
 };
 const originalReset=window.resetKey;
 window.resetKey=function(){
  if(typeof originalReset==='function')originalReset();
  if(currentSong&&songViewOrigin==='set'&&inSet(currentSong.id)){const m=read();m[currentSong.id]=0;write(m);}
 };
 const originalToggle=window.toggleSetItem;
 window.toggleSetItem=function(e,id){
  const wasInSet=inSet(id);if(typeof originalToggle==='function')originalToggle(e,id);
  if(wasInSet){const m=read();delete m[id];write(m);}
 };
 console.info('[Cancionero Lab] Personalización de tono Mi Set experimental cargada');
})();