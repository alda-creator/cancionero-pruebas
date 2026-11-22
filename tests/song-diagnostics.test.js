'use strict';
const assert=require('node:assert/strict');
const model=require('../js/chord-model.js');
const diag=require('../js/song-diagnostics.js');
const sample=[
{id:'1',title:'Estructurada',editorVersion:2,rawText:'C\nLetra',structuredContent:model.convertLegacy('C\nLetra').structuredContent},
{id:'2',title:'Convertible',rawText:'C\nLetra'},
{id:'3',title:'Ambigua',rawText:'C\tG\nLetra'},
{id:'4',title:'Vacía',rawText:''}
];
const summary=diag.summarize(sample,model);
assert.equal(summary.total,4);
assert.equal(summary.counts['structured-valid'],1);
assert.equal(summary.counts['legacy-convertible'],1);
assert.equal(summary.counts['legacy-ambiguous'],1);
assert.equal(summary.counts.empty,1);
assert.equal(summary.rows[2].tabLineCount,1);
console.log('✓ diagnósticos: clasificación y conteo de patrones');
