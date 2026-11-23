(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.SongDocument=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
function project(adapted){
 if(!adapted||adapted.ok!==true||!adapted.structuredContent||adapted.structuredContent.version!==2||!Array.isArray(adapted.structuredContent.blocks)){
  return {ok:false,status:'invalid-adapter-result',document:null,warnings:['Se requiere un resultado válido de SongAdapter.']};
 }
 const blocks=adapted.structuredContent.blocks.map((block,bi)=>({
  id:block.id,label:block.label,order:bi,
  rows:block.rows.map((row,ri)=>({
   id:row.id,order:ri,lyric:row.lyric,
   instrumental:row.lyric.length===0,
   chords:row.chords.map(chord=>({
    id:chord.id,root:chord.root,quality:chord.quality,bass:chord.bass,
    offset:chord.position.offset,affinity:chord.position.affinity
   }))
  }))
 }));
 return {ok:true,status:'projected',document:{version:1,source:adapted.source||null,rawText:adapted.rawText||'',blocks},warnings:[]};
}
return {version:1,project};
});