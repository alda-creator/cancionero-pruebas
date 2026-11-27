'use strict';

const assert = require('node:assert/strict');
const ChordModel = require('../js/chord-model.js');
const KeyDetector = require('../js/key-detector.js');

function song(chordSymbols) {
  const rows = chordSymbols.map((symbol, index) => {
    const parsed = ChordModel.parseChordSymbol(symbol);
    assert.ok(parsed, 'Símbolo válido: ' + symbol);
    return {
      id: 'row-' + index,
      lyric: 'Línea ' + index,
      chords: [{
        id: 'chord-' + index,
        root: parsed.root,
        quality: parsed.quality,
        bass: parsed.bass,
        position: { offset: 0, affinity: 'before' }
      }]
    };
  });
  return { version: 2, blocks: [{ id: 'block-1', label: 'ESTROFA 1', rows }] };
}

function test(name, fn) {
  try {
    fn();
    process.stdout.write('✓ ' + name + '\n');
  } catch (error) {
    process.stderr.write('✗ ' + name + '\n' + error.stack + '\n');
    process.exitCode = 1;
  }
}

test('detecta una progresión clara en Sol mayor sin depender del primer acorde solamente', () => {
  const result = KeyDetector.analyze(song(['Em', 'C', 'G', 'D', 'G']));
  assert.equal(result.ok, true);
  assert.equal(result.reason, 'detected');
  assert.equal(result.suggestion.tonic, 'G');
  assert.equal(result.suggestion.mode, 'major');
});

test('detecta una progresión clara en La menor', () => {
  const result = KeyDetector.analyze(song(['F', 'Dm', 'Am', 'E7', 'Am']));
  assert.equal(result.reason, 'detected');
  assert.equal(result.suggestion.tonic, 'A');
  assert.equal(result.suggestion.mode, 'minor');
  assert.equal(result.suggestion.label, 'A menor');
});

test('las inversiones no cambian la raíz armónica de la sugerencia', () => {
  const result = KeyDetector.analyze(song(['C/E', 'F/A', 'G/B', 'C/E']));
  assert.equal(result.reason, 'detected');
  assert.equal(result.suggestion.tonic, 'C');
  assert.equal(result.suggestion.mode, 'major');
});

test('acepta acordes cromáticos de paso sin convertirlos en centro tonal', () => {
  const result = KeyDetector.analyze(song(['C', 'E7', 'Am', 'F', 'G', 'C']));
  assert.equal(result.reason, 'detected');
  assert.equal(result.suggestion.tonic, 'C');
  assert.equal(result.suggestion.mode, 'major');
});

test('no propone tonalidad cuando hay datos insuficientes', () => {
  const result = KeyDetector.analyze(song(['C', 'G', 'C']));
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'insufficient-chords');
  assert.equal(result.suggestion, null);
});

test('rechaza estructuras inválidas sin intentar inferir una tonalidad', () => {
  const result = KeyDetector.analyze({ version: 1, blocks: [] });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'invalid-content');
  assert.equal(result.suggestion, null);
});

test('reconoce la calidad de acordes extendidos sin perder su función básica', () => {
  assert.equal(KeyDetector.qualityKind('maj7'), 'major');
  assert.equal(KeyDetector.qualityKind('M7'), 'major');
  assert.equal(KeyDetector.qualityKind('m7b5'), 'diminished');
  assert.equal(KeyDetector.qualityKind('m7b5'), 'diminished');
  assert.equal(KeyDetector.qualityKind('dim7'), 'diminished');
  assert.equal(KeyDetector.qualityKind('sus4'), 'suspended');
});


test('no fuerza una tonalidad cuando la progresión relativa mayor/menor no resuelve con claridad', () => {
  const result = KeyDetector.analyze(song(['C', 'Am', 'F', 'G']));
  assert.equal(result.ok, true);
  assert.equal(result.reason, 'ambiguous');
  assert.equal(result.suggestion, null);
});


test('el análisis no modifica la estructura ni sus acordes originales', () => {
  const content = song(['C', 'Am', 'F', 'G', 'C']);
  const before = JSON.stringify(content);
  KeyDetector.analyze(content);
  assert.equal(JSON.stringify(content), before);
});


test('no propone tonalidad cuando los acordes son demasiado cromáticos', () => {
  const result = KeyDetector.analyze(song(['C', 'F#', 'Bb', 'E', 'Ab']));
  assert.equal(result.ok, true);
  assert.equal(result.reason, 'low-confidence');
  assert.equal(result.suggestion, null);
});
