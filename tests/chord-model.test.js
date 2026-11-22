'use strict';

const assert = require('node:assert/strict');
const ChordModel = require('../js/chord-model.js');

function test(name, fn) {
  try {
    fn();
    process.stdout.write('✓ ' + name + '\n');
  } catch (error) {
    process.stderr.write('✗ ' + name + '\n' + error.stack + '\n');
    process.exitCode = 1;
  }
}

test('reconoce acordes anglosajones, latinos, extensiones e inversiones', () => {
  const cases = {
    C: ['C', 'C', ''],
    Fsharp: ['F#m7', 'F#', 'm7'],
    Cmajor: ['Cmaj7', 'C', 'maj7'],
    halfDiminished: ['Cm7b5', 'C', 'm7b5'],
    altered: ['G7(b9)', 'G', '7(b9)'],
    sixNine: ['C6/9', 'C', '6/9'],
    inversion: ['C/E', 'C', '', 'E'],
    latinFlat: ['Sib', 'Bb', ''],
    latinExtended: ['Sol#m7', 'G#', 'm7']
  };
  for (const [key, [symbol, root, quality, bass = null]] of Object.entries(cases)) {
    const parsed = ChordModel.parseChordSymbol(symbol);
    assert.ok(parsed, key + ' debe reconocerse');
    assert.equal(parsed.root, root);
    assert.equal(parsed.quality, quality);
    assert.equal(parsed.bass, bass);
  }
  assert.equal(ChordModel.parseChordSymbol('H7'), null);
  assert.equal(ChordModel.parseChordSymbol('C/E/G'), null);
});

test('convierte líneas heredadas y conserva la posición Unicode del acorde', () => {
  const raw = '[CORO]\nC       G\nSublime gracia del Señor';
  const result = ChordModel.convertLegacy(raw);
  assert.equal(result.ok, true);
  const row = result.structuredContent.blocks[0].rows[0];
  assert.equal(row.lyric, 'Sublime gracia del Señor');
  assert.deepEqual(row.chords.map(chord => chord.position.offset), [0, 8]);
  assert.equal(row.chords[0].root, 'C');
  assert.equal(row.chords[1].root, 'G');
  assert.equal(ChordModel.validateStructuredContent(result.structuredContent).valid, true);
});

test('convierte letras sin acordes y bloques repetidos con IDs únicos', () => {
  const result = ChordModel.convertLegacy('[VERSO]\nPrimera línea\n[CORO]\nOtra línea\n[CORO]\nRepite');
  assert.equal(result.ok, true);
  assert.equal(result.structuredContent.blocks.length, 3);
  const ids = result.structuredContent.blocks.map(block => block.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(result.structuredContent.blocks[0].rows[0].chords, []);
});

test('rechaza posiciones ambiguas y tabulaciones sin inventar ubicaciones', () => {
  const beyond = ChordModel.convertLegacy('C       G\nSol');
  assert.equal(beyond.ok, false);
  assert.equal(beyond.reason, 'ambiguous');
  const tabs = ChordModel.convertLegacy('C\tG\nLetra');
  assert.equal(tabs.ok, false);
  assert.equal(tabs.reason, 'ambiguous');
});

test('valida IDs, raíces y límites de posición', () => {
  const content = {
    version: 2,
    blocks: [{
      id: 'b1', label: 'Verso',
      rows: [{
        id: 'r1', lyric: 'Sol',
        chords: [{
          id: 'c1', root: 'C', quality: '', bass: null,
          position: { offset: 4, affinity: 'before' }
        }]
      }]
    }]
  };
  const validation = ChordModel.validateStructuredContent(content);
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some(error => error.includes('posición')));
});

test('serializa y vuelve a convertir una estructura simple', () => {
  const original = ChordModel.convertLegacy('[CORO]\nC       G\nSublime gracia del Señor');
  assert.equal(original.ok, true);
  const serialized = ChordModel.serializeLegacy(original.structuredContent);
  assert.equal(serialized.ok, true);
  const restored = ChordModel.convertLegacy(serialized.rawText);
  assert.equal(restored.ok, true);
  const first = original.structuredContent.blocks[0].rows[0];
  const second = restored.structuredContent.blocks[0].rows[0];
  assert.equal(first.lyric, second.lyric);
  assert.deepEqual(first.chords.map(c => [c.root,c.quality,c.bass,c.position.offset]),
                   second.chords.map(c => [c.root,c.quality,c.bass,c.position.offset]));
});

test('no serializa acordes superpuestos', () => {
  const content = {
    version: 2,
    blocks: [{
      id: 'b', label: 'Verso',
      rows: [{
        id: 'r', lyric: 'Letra',
        chords: [
          { id: 'c1', root: 'C', quality: '', bass: null, position: { offset: 0, affinity: 'before' } },
          { id: 'c2', root: 'G', quality: '', bass: null, position: { offset: 0, affinity: 'before' } }
        ]
      }]
    }]
  };
  const result = ChordModel.serializeLegacy(content);
  assert.equal(result.ok, false);
  assert.equal(result.rawText, null);
});

test('no serializa una afinidad que el formato heredado no puede representar', () => {
  const content = {
    version: 2,
    blocks: [{
      id: 'b', label: 'Verso',
      rows: [{
        id: 'r', lyric: 'Letra',
        chords: [{
          id: 'c', root: 'C', quality: '', bass: null,
          position: { offset: 0, affinity: 'after' }
        }]
      }]
    }]
  };
  const result = ChordModel.serializeLegacy(content);
  assert.equal(result.ok, false);
  assert.equal(result.rawText, null);
});

test('reconcilia cambios de letra y conserva acordes en filas intactas y editadas', () => {
  const original = ChordModel.convertLegacy('[CORO]\nC       G\nAbba Padre, Abba Padre\nD\nEstar contigo').structuredContent;
  const result = ChordModel.reconcileLyrics(original, '[CORO]\nAbba Padre, Abba Padre por siempre\nEstar contigo\nNueva línea');
  assert.equal(result.ok, true);
  const rows = result.structuredContent.blocks[0].rows;
  assert.equal(rows.length, 3);
  assert.equal(rows[0].chords.length, 2);
  assert.equal(rows[0].lyric, 'Abba Padre, Abba Padre por siempre');
  assert.equal(rows[1].chords.length, 1);
  assert.equal(rows[1].chords[0].root, 'D');
  assert.equal(rows[2].chords.length, 0);
  assert.equal(ChordModel.validateStructuredContent(result.structuredContent).valid, true);
});

test('inserta una línea antes de otras sin desplazar sus acordes', () => {
  const original = ChordModel.convertLegacy('[CORO]\nG\nPrimera línea\nD\nSegunda línea').structuredContent;
  const result = ChordModel.reconcileLyrics(original, '[CORO]\nNueva línea\nPrimera línea\nSegunda línea');
  assert.equal(result.ok, true);
  const rows = result.structuredContent.blocks[0].rows;
  assert.equal(rows[0].lyric, 'Nueva línea');
  assert.equal(rows[0].chords.length, 0);
  assert.equal(rows[1].chords[0].root, 'G');
  assert.equal(rows[2].chords[0].root, 'D');
});

test('ajusta la posición del acorde cuando se inserta texto antes de él', () => {
  const original = ChordModel.convertLegacy('C        G\nHola mundo').structuredContent;
  const result = ChordModel.reconcileLyrics(original, 'Hola querido mundo');
  assert.equal(result.ok, true);
  const chord = result.structuredContent.blocks[0].rows[0].chords[0];
  assert.equal(chord.position.offset, 17);
});

process.stdout.write('\nPruebas del modelo de acordes finalizadas.\n');
