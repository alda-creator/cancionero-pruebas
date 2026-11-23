'use strict';
const assert=require('node:assert/strict');
const Model=require('../js/chord-model.js');
const Adapter=require('../js/song-adapter.js');
const Document=require('../js/song-document.js');
function test(name,fn){try{fn();console.log('✓ '+name);}catch(e){console.error('✗ '+name+'\n'+e.stack);process.exitCode=1;}}
test('proyecta bloques, filas y acordes con orden e IDs',()=>{const adapted=Adapter.adapt({rawText:'[PUENTE]\nC     G7'},Model);const result=Document.project(adapted);assert.equal(result.ok,true);assert.equal(result.document.blocks[0].label,'PUENTE');assert.equal(result.document.blocks[0].rows[0].instrumental,true);assert.deepEqual(result.document.blocks[0].rows[0].chords.map(c=>c.offset),[0,6]);});
test('proyección no comparte objetos mutables con estructura adaptada',()=>{const adapted=Adapter.adapt({rawText:'C\nLetra'},Model);const result=Document.project(adapted);result.document.blocks[0].rows[0].lyric='modificada';assert.notEqual(adapted.structuredContent.blocks[0].rows[0].lyric,'modificada');});
test('rechaza resultado adaptador no válido',()=>{assert.equal(Document.project({ok:false}).status,'invalid-adapter-result');});
test('proyecta contenido estructurado adaptado',()=>{const song=Model.convertLegacy('[CORO]\nC     G\nGracia');const adapted=Adapter.adapt({rawText:'[CORO]\nC     G\nGracia'},Model);assert.equal(adapted.ok,true);const result=Document.project(adapted);assert.equal(result.document.source,'legacy');assert.equal(result.document.blocks[0].rows[0].chords.length,2);});
