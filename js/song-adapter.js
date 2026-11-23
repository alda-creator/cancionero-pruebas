(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.SongAdapter=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
function adapt(song,model){
 if(!song||typeof song!=='object')return {ok:false,status:'invalid-input',structuredContent:null,rawText:null,warnings:['El registro de canción no es válido.'],source:'none'};
 if(!model||typeof model.validateStructuredContent!=='function'||typeof model.convertLegacy!=='function')return {ok:false,status:'model-unavailable',structuredContent:null,rawText:typeof song.rawText==='string'?song.rawText:null,warnings:['El modelo de acordes no está disponible.'],source:'none'};
 const rawText=typeof song.rawText==='string'?song.rawText:'';
 if(song.editorVersion===2&&song.structuredContent){
  const validation=model.validateStructuredContent(song.structuredContent);
  if(validation.valid)return {ok:true,status:'structured-valid',structuredContent:clone(song.structuredContent),rawText,warnings:[],source:'structured'};
  return {ok:false,status:'structured-invalid',structuredContent:null,rawText,warnings:validation.errors.slice(),source:'structured'};
 }
 const conversion=model.convertLegacy(rawText);
 if(conversion&&conversion.ok){
  const validation=model.validateStructuredContent(conversion.structuredContent);
  if(validation.valid)return {ok:true,status:'legacy-converted',structuredContent:clone(conversion.structuredContent),rawText,warnings:(conversion.warnings||[]).slice(),source:'legacy'};
  return {ok:false,status:'conversion-invalid',structuredContent:null,rawText,warnings:validation.errors.slice(),source:'legacy'};
 }
 return {ok:false,status:conversion&&conversion.reason==='empty'?'empty':'legacy-ambiguous',structuredContent:null,rawText,warnings:conversion&&conversion.warnings?conversion.warnings.slice():['No se pudo convertir el texto.'],source:'legacy'};
}
function clone(value){return JSON.parse(JSON.stringify(value));}
return {version:1,adapt};
});