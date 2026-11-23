'use strict';
const assert=require('node:assert/strict');
const Model=require('../js/chord-model.js');
const Adapter=require('../js/song-adapter.js');
function test(name,fn){try{fn();console.log('✓ '+name);}catch(e){console.error('✗ '+name+'\n'+e.stack);process.exitCode=1;}}
test('adapta estructura válida sin mutar fuente',()=>{const source=Model.convertLegacy('[PUENTE]\nC     G').structuredContent;const song={editorVersion:2,structuredContent:source,rawText:'texto original'};const result=Adapter.adapt(song,Model);assert.equal(result.ok,true);assert.equal(result.status,'structured-valid');assert.notEqual(result.structuredContent,source);assert.equal(song.rawText,'texto original');});
test('convierte legacy y conserva rawText original',()=>{const raw='[CORO]\nC     G\nGracia';const result=Adapter.adapt({rawText:raw},Model);assert.equal(result.ok,true);assert.equal(result.status,'legacy-converted');assert.equal(result.rawText,raw);assert.equal(result.structuredContent.blocks[0].rows[0].lyric,'Gracia');});
test('no intenta reparar silenciosamente estructura inválida',()=>{const result=Adapter.adapt({editorVersion:2,structuredContent:{version:1,blocks:[]},rawText:'C\nLetra'},Model);assert.equal(result.ok,false);assert.equal(result.status,'structured-invalid');assert.ok(result.warnings.length);});
test('devuelve estado ambiguo y conserva fuente',()=>{const raw='C\tG\nLetra';const result=Adapter.adapt({rawText:raw},Model);assert.equal(result.ok,false);assert.equal(result.status,'legacy-ambiguous');assert.equal(result.rawText,raw);});
test('clasifica canción vacía y entrada inválida',()=>{assert.equal(Adapter.adapt({rawText:''},Model).status,'empty');assert.equal(Adapter.adapt(null,Model).status,'invalid-input');});
test('no funciona si el modelo falta',()=>{const result=Adapter.adapt({rawText:'C'},null);assert.equal(result.status,'model-unavailable');});
