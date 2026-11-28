'use strict';

const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('index.html', 'utf8');
const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .filter(match => !/\bsrc\s*=/.test(match[1]));

if (!scripts.length) {
  throw new Error('No se encontraron bloques JavaScript inline en index.html');
}

scripts.forEach((match, index) => {
  new vm.Script(match[2], { filename: 'index.html:inline-script-' + (index + 1) });
});

console.log('✓ sintaxis JavaScript: ' + scripts.length + ' bloque(s) inline');

const serviceWorker = fs.readFileSync('sw.js', 'utf8');
new vm.Script(serviceWorker, { filename: 'sw.js' });
console.log('✓ sintaxis del Service Worker');

const editorStart = html.indexOf('function renderStructuredEditor()');
const editorEnd = html.indexOf('\\n  function ', editorStart + 1);
if (editorStart < 0 || editorEnd < 0) {
  throw new Error('No se pudo localizar renderStructuredEditor para verificar su recorrido de filas');
}
const editorSource = html.slice(editorStart, editorEnd);
if (!/block\\.rows\\.forEach\\(\\(row,\\s*rowIndex\\)\\s*=>/.test(editorSource)) {
  throw new Error('renderStructuredEditor debe declarar rowIndex en el recorrido que lo utiliza');
}
console.log('✓ rowIndex declarado en el recorrido de filas del editor estructurado');

