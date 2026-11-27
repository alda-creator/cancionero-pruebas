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

test('reconoce secuencias de acordes separadas por guion sin perder posiciones', () => {
  const cases = [
    ['F-G\nLetra', ['F','G'], [0,2]],
    ['F-C\nLetra', ['F','C'], [0,2]],
    ['G-C\nLetra', ['G','C'], [0,2]],
    ['Am-G\nLetra', ['A','G'], [0,3]],
    ['Dm-G-C\nLetra', ['D','G','C'], [0,3,5]],
    ['C#m-F#-G#\nLetra', ['C#','F#','G#'], [0,4,7]],
    ['C/E-G/B\nLetra', ['C','G'], [0,4]]
  ];
  for (const [raw, roots, offsets] of cases) {
    const result = ChordModel.convertLegacy(raw);
    assert.equal(result.ok, true, raw + ': ' + JSON.stringify(result.warnings));
    const row = result.structuredContent.blocks[0].rows[0];
    assert.deepEqual(row.chords.map(chord => chord.root), roots, raw);
    assert.deepEqual(row.chords.map(chord => chord.position.offset), offsets, raw);
    assert.equal(row.lyric, 'Letra');
    assert.equal(ChordModel.validateStructuredContent(result.structuredContent).valid, true);
  }
});

test('reconoce secuencias con guion en filas instrumentales y conserva C- como acorde menor', () => {
  const instrumental = ChordModel.convertLegacy('[INTRO]\nG-C');
  assert.equal(instrumental.ok, true, JSON.stringify(instrumental.warnings));
  const row = instrumental.structuredContent.blocks[0].rows[0];
  assert.equal(row.lyric, '');
  assert.deepEqual(row.chords.map(chord => chord.root), ['G','C']);
  assert.deepEqual(row.chords.map(chord => chord.position.offset), [0,2]);

  const minor = ChordModel.convertLegacy('C-\nLetra');
  assert.equal(minor.ok, true, JSON.stringify(minor.warnings));
  assert.equal(minor.structuredContent.blocks[0].rows[0].chords.length, 1);
  assert.equal(minor.structuredContent.blocks[0].rows[0].chords[0].quality, '-');
});

test('importa un fragmento representativo del himno Santo Santo Santo con acordes unidos por guion', () => {
  const raw = [
    'C                F                 C',
    'Santo! ¡Santo! ¡Santo! Señor Omnipotente,',
    'G          C      F-G      D      G',
    'Siempre el labio mío loores te dará;',
    'Am      G       F-C      Dm    G     C',
    'Dios en tres personas, bendita Trinidad.',
    'G-C'
  ].join('\n');
  const result = ChordModel.convertLegacy(raw);
  assert.equal(result.ok, true, JSON.stringify(result.warnings));
  const rows = result.structuredContent.blocks[0].rows;
  assert.deepEqual(rows[1].chords.map(chord => chord.root), ['G','C','F','G','D','G']);
  assert.deepEqual(rows[2].chords.map(chord => chord.root), ['A','G','F','C','D','G','C']);
  assert.equal(rows[3].lyric, '');
  assert.deepEqual(rows[3].chords.map(chord => chord.root), ['G','C']);
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

test('conserva el offset del acorde dentro del margen y sigue rechazando tabulaciones', () => {
  const within = ChordModel.convertLegacy('C           G\nLetra');
  assert.equal(within.ok, true, JSON.stringify(within.warnings));
  const row = within.structuredContent.blocks[0].rows[0];
  assert.deepEqual(row.chords.map(chord => chord.position.offset), [0, 12]);
  const tabs = ChordModel.convertLegacy('C\tG\nLetra');
  assert.equal(tabs.ok, false);
  assert.equal(tabs.reason, 'ambiguous');
});

test('pegar un fragmento con acordes reemplaza una fila por varias filas estructuradas', () => {
  const original = ChordModel.addBlock({ version: 2, blocks: [] }, 'PUENTE').structuredContent;
  const blockId = original.blocks[0].id;
  const rowId = original.blocks[0].rows[0].id;
  const pasted = 'Bm       G\nTu amor permanece\nD/F#     A\nY me sostendrás';
  const result = ChordModel.replaceRowWithLegacyFragment(original, blockId, rowId, pasted);
  assert.equal(result.ok, true, JSON.stringify(result.warnings));
  assert.equal(result.insertedRows, 2);
  const rows = result.structuredContent.blocks[0].rows;
  assert.equal(rows.length, 2);
  assert.equal(rows[0].id, rowId, 'la primera fila conserva la identidad original');
  assert.equal(rows[0].lyric, 'Tu amor permanece');
  assert.deepEqual(rows[0].chords.map(chord => chord.root), ['B', 'G']);
  assert.deepEqual(rows[0].chords.map(chord => chord.position.offset), [0, 9]);
  assert.equal(rows[1].lyric, 'Y me sostendrás');
  assert.equal(rows[1].chords[0].bass, 'F#');
  assert.deepEqual(rows[1].chords.map(chord => chord.position.offset), [0, 9]);
  assert.equal(ChordModel.validateStructuredContent(result.structuredContent).valid, true);
  assert.equal(original.blocks[0].rows.length, 1, 'no debe mutar el documento original');
});

test('pegar texto multilínea sin acordes crea filas y protege los acordes existentes', () => {
  const original = ChordModel.convertLegacy('C       G\nPrimera letra').structuredContent;
  const block = original.blocks[0];
  const row = block.rows[0];
  const originalChordIds = row.chords.map(chord => chord.id);
  const result = ChordModel.replaceRowWithLegacyFragment(
    original, block.id, row.id, 'Primera línea nueva\nSegunda línea nueva'
  );
  assert.equal(result.ok, true);
  assert.equal(result.structuredContent.blocks[0].rows.length, 2);
  assert.equal(result.structuredContent.blocks[0].rows[0].lyric, 'Primera línea nueva');
  assert.deepEqual(
    result.structuredContent.blocks[0].rows[0].chords.map(chord => chord.root),
    ['C', 'G']
  );
  assert.deepEqual(
    result.structuredContent.blocks[0].rows[0].chords.map(chord => chord.id),
    originalChordIds,
    'los acordes preexistentes conservan su identidad'
  );
});

test('un fragmento con varias secciones se dirige al importador de canción completa', () => {
  const original = ChordModel.addBlock({ version: 2, blocks: [] }, 'PUENTE').structuredContent;
  const block = original.blocks[0];
  const result = ChordModel.replaceRowWithLegacyFragment(
    original, block.id, block.rows[0].id, '[VERSO]\nC\nLetra\n[CORO]\nG\nCanto'
  );
  assert.equal(result.ok, false);
  assert.ok(result.warnings.some(message => message.includes('canción completa')));
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
          position: { offset: 24, affinity: 'before' }
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

test('renombra un bloque conservando IDs, filas, acordes y la estructura original', () => {
  const original = ChordModel.convertLegacy('[CORO]\nC       G\nSublime gracia').structuredContent;
  const block = original.blocks[0];
  const before = JSON.stringify(original);
  const renamed = ChordModel.updateBlockLabel(original, block.id, 'PRE-CORO');
  assert.equal(renamed.ok, true);
  assert.equal(renamed.structuredContent.blocks[0].id, block.id);
  assert.equal(renamed.structuredContent.blocks[0].label, 'PRE-CORO');
  assert.deepEqual(renamed.structuredContent.blocks[0].rows, block.rows);
  assert.equal(JSON.stringify(original), before, 'no debe mutar la estructura original');
  const serialized = ChordModel.serializeLegacy(renamed.structuredContent);
  assert.equal(serialized.ok, true);
  assert.ok(serialized.rawText.startsWith('[PRE-CORO]'));
  assert.equal(ChordModel.validateStructuredContent(renamed.structuredContent).valid, true);
});

test('rechaza nombres de bloque vacíos, multilínea o con corchetes', () => {
  const original = ChordModel.convertLegacy('[CORO]\nLetra').structuredContent;
  const id = original.blocks[0].id;
  for (const label of ['', '   ', 'DOS\nLINEAS', '[CORO]', 'x'.repeat(61)]) {
    const result = ChordModel.updateBlockLabel(original, id, label);
    assert.equal(result.ok, false, JSON.stringify(label));
    assert.equal(result.structuredContent, null);
  }
  assert.equal(ChordModel.updateBlockLabel(original, 'no-existe', 'PUENTE').ok, false);
});

test('agrega una sección al final con fila vacía e IDs únicos sin mutar el original', () => {
  const original = ChordModel.convertLegacy('[CORO]\nC       G\nSublime gracia').structuredContent;
  const firstBlock = original.blocks[0];
  const firstRow = firstBlock.rows[0];
  const before = JSON.stringify(original);
  const added = ChordModel.addBlock(original, 'PUENTE');
  assert.equal(added.ok, true);
  assert.equal(added.structuredContent.blocks.length, 2);
  const newBlock = added.structuredContent.blocks[1];
  assert.equal(newBlock.id, added.blockId);
  assert.equal(newBlock.label, 'PUENTE');
  assert.equal(newBlock.rows.length, 1);
  assert.equal(newBlock.rows[0].id, added.rowId);
  assert.equal(newBlock.rows[0].lyric, '');
  assert.deepEqual(newBlock.rows[0].chords, []);
  assert.equal(added.structuredContent.blocks[0].id, firstBlock.id);
  assert.deepEqual(added.structuredContent.blocks[0].rows[0], firstRow);
  assert.equal(JSON.stringify(original), before, 'no debe mutar el documento original');
  assert.equal(ChordModel.validateStructuredContent(added.structuredContent).valid, true);
});

test('permite iniciar un documento vacío con la primera sección', () => {
  const added = ChordModel.addBlock({ version: 2, blocks: [] }, 'INTRO');
  assert.equal(added.ok, true);
  assert.equal(added.structuredContent.blocks.length, 1);
  assert.equal(added.structuredContent.blocks[0].label, 'INTRO');
  assert.equal(ChordModel.validateStructuredContent(added.structuredContent).valid, true);
  const serialized = ChordModel.serializeLegacy(added.structuredContent);
  assert.equal(serialized.ok, true);
  assert.ok(serialized.rawText.startsWith('[INTRO]'));
});

test('genera IDs nuevos al agregar varias secciones y rechaza etiquetas inválidas', () => {
  const original = ChordModel.convertLegacy('[CORO]\nLetra').structuredContent;
  const first = ChordModel.addBlock(original, 'PUENTE');
  const second = ChordModel.addBlock(first.structuredContent, 'INTRO');
  assert.equal(second.ok, true);
  const ids = second.structuredContent.blocks.flatMap(block => [
    block.id, ...block.rows.flatMap(row => [row.id, ...row.chords.map(chord => chord.id)])
  ]);
  assert.equal(new Set(ids).size, ids.length);
  for (const label of ['', '  ', '[PUENTE]', 'DOS\nLINEAS', 'x'.repeat(61)]) {
    assert.equal(ChordModel.addBlock(original, label).ok, false, JSON.stringify(label));
  }
  assert.equal(ChordModel.addBlock(original, null).ok, false);
});

test('actualiza una línea de forma aislada y conserva offsets de acordes al final', () => {
  const original = ChordModel.convertLegacy('C        G\nHola mundo').structuredContent;
  const row = original.blocks[0].rows[0];
  row.chords[1].position.offset = Array.from(row.lyric).length + 5;
  const same = ChordModel.updateRowLyric(original, row.id, row.lyric);
  assert.equal(same.ok, true);
  assert.equal(same.structuredContent.blocks[0].rows[0].chords[1].position.offset, Array.from(row.lyric).length + 5);
  const edited = ChordModel.updateRowLyric(original, row.id, 'Hola querido mundo');
  assert.equal(edited.ok, true);
  assert.equal(edited.structuredContent.blocks[0].rows[0].lyric, 'Hola querido mundo');
  assert.equal(edited.structuredContent.blocks[0].rows[0].chords[0].position.offset, 0);
  assert.equal(original.blocks[0].rows[0].lyric, 'Hola mundo', 'no debe mutar la estructura original');
  assert.equal(ChordModel.validateStructuredContent(edited.structuredContent).valid, true);
});

test('actualiza una línea con caracteres Unicode sin perder validez', () => {
  const original = ChordModel.convertLegacy('C       G\nCántico de adoración').structuredContent;
  const row = original.blocks[0].rows[0];
  const edited = ChordModel.updateRowLyric(original, row.id, 'Cántico nuevo de adoración');
  assert.equal(edited.ok, true);
  assert.equal(ChordModel.validateStructuredContent(edited.structuredContent).valid, true);
});

test('edición de letra integrada conserva acordes y offsets al serializar y volver a importar', () => {
  const raw = '[CORO]\n      G              A         F#m    Bm\nLevantemos nuestras manos y adoremos,';
  const original = ChordModel.convertLegacy(raw).structuredContent;
  const row = original.blocks[0].rows[0];
  const edited = ChordModel.updateRowLyric(original, row.id, 'Levantemos nuestras manos y adoremos con gozo');
  assert.equal(edited.ok, true);
  const saved = ChordModel.serializeLegacy(edited.structuredContent);
  assert.equal(saved.ok, true);
  const reopened = ChordModel.convertLegacy(saved.rawText);
  assert.equal(reopened.ok, true);
  const reopenedRow = reopened.structuredContent.blocks[0].rows[0];
  assert.equal(reopenedRow.lyric, 'Levantemos nuestras manos y adoremos con gozo');
  assert.deepEqual(reopenedRow.chords.map(chord => [chord.root, chord.quality, chord.position.offset]),
    edited.structuredContent.blocks[0].rows[0].chords.map(chord => [chord.root, chord.quality, chord.position.offset]));
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
  const chord = result.structuredContent.blocks[0].rows[0].chords[1];
  assert.equal(chord.position.offset, 17);
});

test('mantiene el acorde unido a la palabra cuando se inserta texto en su posición', () => {
  const original = ChordModel.convertLegacy('     C\nHola mundo').structuredContent;
  const result = ChordModel.reconcileLyrics(original, 'Hola querido mundo');
  assert.equal(result.ok, true);
  const chord = result.structuredContent.blocks[0].rows[0].chords[0];
  assert.equal(chord.position.offset, 13);
});

test('conserva la posición original del último acorde una columna después de la frase', () => {
  const result = ChordModel.convertLegacy('[CORO]\n      G              A         F#m    Bm\nLevantemos nuestras manos y adoremos,');
  assert.equal(result.ok, true, JSON.stringify(result.warnings));
  const row = result.structuredContent.blocks[0].rows[0];
  assert.equal(row.lyric, 'Levantemos nuestras manos y adoremos,');
  assert.deepEqual(row.chords.map(chord => chord.root + chord.quality), ['G','A','F#m','Bm']);
  assert.equal(row.chords[3].position.offset, '      G              A         F#m    Bm'.indexOf('Bm'));
  assert.equal(ChordModel.validateStructuredContent(result.structuredContent).valid, true);
});

test('conserva la separación original hasta 20 columnas después del final', () => {
  const lyric = 'Levantemos nuestras manos y adoremos,';
  for (const distance of [4, 5, 8, 10, 16, 20]) {
    const chordLine = 'C     G' + ' '.repeat(Math.max(0, lyric.length + distance - 7)) + 'Bm';
    const result = ChordModel.convertLegacy('[CORO]\n' + chordLine + '\n' + lyric);
    assert.equal(result.ok, true, 'distancia ' + distance + ': ' + JSON.stringify(result.warnings));
    const row = result.structuredContent.blocks[0].rows[0];
    assert.deepEqual(row.chords.map(chord => chord.root), ['C', 'G', 'B']);
    assert.deepEqual(row.chords.slice(0, 2).map(chord => chord.position.offset), [0, 6]);
    assert.equal(row.chords[2].position.offset, Array.from(lyric).length + distance);
    assert.equal(ChordModel.validateStructuredContent(result.structuredContent).valid, true);
  }
});

test('mantiene la protección cuando el último acorde supera 20 columnas', () => {
  const lyric = 'Levantemos nuestras manos y adoremos,';
  const chordLine = 'C     G' + ' '.repeat(Math.max(0, lyric.length + 21 - 7)) + 'Bm';
  const result = ChordModel.convertLegacy('[CORO]\n' + chordLine + '\n' + lyric);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'ambiguous');
  assert.ok(result.warnings.some(warning => warning.includes('demasiado lejos')));
});

process.stdout.write('\nPruebas del modelo de acordes finalizadas.\n');

test('no interpreta una frase que comienza con A como una línea de acordes', () => {
  const result = ChordModel.convertLegacy('[CORO]\nA Jesús.');
  assert.equal(result.ok, true, JSON.stringify(result.warnings));
  const row = result.structuredContent.blocks[0].rows[0];
  assert.equal(row.lyric, 'A Jesús.');
  assert.equal(row.chords.length, 0);
});

test('acepta y serializa filas instrumentales con acordes espaciados y sin letra', () => {
  const result = ChordModel.convertLegacy('[INTRO]\nC     Dm     G7');
  assert.equal(result.ok, true, JSON.stringify(result.warnings));
  const row = result.structuredContent.blocks[0].rows[0];
  assert.equal(row.lyric, '');
  assert.deepEqual(row.chords.map(chord => chord.root), ['C','D','G']);
  assert.deepEqual(row.chords.map(chord => chord.position.offset), [0,6,13]);
  assert.equal(ChordModel.validateStructuredContent(result.structuredContent).valid, true);
  const serialized = ChordModel.serializeLegacy(result.structuredContent);
  assert.equal(serialized.ok, true);
  const restored = ChordModel.convertLegacy(serialized.rawText);
  assert.equal(restored.ok, true);
  assert.equal(restored.structuredContent.blocks[0].rows[0].lyric, '');
  assert.deepEqual(restored.structuredContent.blocks[0].rows[0].chords.map(chord => chord.root), ['C','D','G']);
});

test('instrumental row accepts offsets but lyric rows retain position bounds', () => {
  const instrumental = {version:2,blocks:[{id:'b',label:'Intro',rows:[{id:'r',lyric:'',chords:[{id:'c',root:'C',quality:'',bass:null,position:{offset:10,affinity:'before'}}]}]}]};
  assert.equal(ChordModel.validateStructuredContent(instrumental).valid,true);
  const lyricRow = JSON.parse(JSON.stringify(instrumental));
  lyricRow.blocks[0].rows[0].lyric='Hi';
  lyricRow.blocks[0].rows[0].chords[0].position.offset=23;
  assert.equal(ChordModel.validateStructuredContent(lyricRow).valid,false);
});


test('reconcilia acordes escritos en rawText para una fila instrumental', () => {
  const original = ChordModel.convertLegacy('[PUENTE]\nC     G').structuredContent;
  const result = ChordModel.reconcileLyrics(original, '[PUENTE]\nC     Dm     G7');
  assert.equal(result.ok, true, JSON.stringify(result.warnings));
  const row = result.structuredContent.blocks[0].rows[0];
  assert.equal(row.lyric, '');
  assert.deepEqual(row.chords.map(chord => chord.root + chord.quality), ['C','Dm','G7']);
  assert.deepEqual(row.chords.map(chord => chord.position.offset), [0,6,13]);
});


test('conserva el offset original de acordes después de la última palabra', () => {
  const result = ChordModel.convertLegacy('[CORO]\n              Am   D     G    Am\nte entrego mi voluntad a Tí');
  assert.equal(result.ok, true, JSON.stringify(result.warnings));
  const row = result.structuredContent.blocks[0].rows[0];
  assert.deepEqual(row.chords.map(chord => chord.root), ['A','D','G','A']);
  assert.deepEqual(row.chords.map(chord => chord.position.offset), [14,19,25,30]);
});

test('reconoce acordes con bajo escrito separado por un espacio', () => {
  const result = ChordModel.convertLegacy('[VERSO 2]\nEb /G Fm\nMi existir en Tus manos está');
  assert.equal(result.ok, true, JSON.stringify(result.warnings));
  const row = result.structuredContent.blocks[0].rows[0];
  assert.deepEqual(row.chords.map(chord => [chord.root,chord.bass]), [['Eb','G'],['F',null]]);
  assert.deepEqual(row.chords.map(chord => chord.position.offset), [0,6]);
});

test('reconoce notación compacta de compases con barras verticales', () => {
  const result = ChordModel.convertLegacy('[INTERLUDIO]\n|Ab//Db|Ab///|');
  assert.equal(result.ok, true, JSON.stringify(result.warnings));
  const row = result.structuredContent.blocks[0].rows[0];
  assert.equal(row.lyric, '');
  assert.deepEqual(row.chords.map(chord => chord.root), ['Ab','Db','Ab']);
  assert.deepEqual(row.chords.map(chord => chord.position.offset), [1,5,8]);
});

test('convierte una canción con inversiones separadas, interludio y líneas instrumentales', () => {
  const raw = '[ESTROFA 1]\n        Ab\nTe amo Diós\n     Db            Ab\nTu amor nunca me falla\nEb /G   Fm        Db    Eb\nMi existir en Tus manos está\n                          Fm   Db\nDesde el momento que despierto\n         Ab Eb /G Fm\nHasta el anochecer\n         Db      Esus      Ab\nYo cantaré de la bondad de Dios\n[PUENTE]\nAb /C         Db\nTu fidelidad sigue\nEb          Ab\nPersiguiéndome\n[INTERLUDIO]\n|Ab//Db|Ab///|\n[PUENTE FINAL]\nC  Dm  G7';
  const result = ChordModel.convertLegacy(raw);
  assert.equal(result.ok, true, JSON.stringify(result.warnings));
  const rows = result.structuredContent.blocks.flatMap(block => block.rows);
  assert.ok(rows.some(row => row.chords.some(chord => chord.bass === 'G')));
  assert.ok(rows.some(row => row.chords.some(chord => chord.bass === 'C')));
  assert.ok(rows.some(row => row.chords.map(chord => chord.root).join(',') === 'Ab,Db,Ab'));
  assert.ok(rows.some(row => row.chords.map(chord => chord.root).join(',') === 'C,D,G'));
});


test('mantiene el acorde al inicio cuando se escribe la primera letra debajo', () => {
  const original = ChordModel.convertLegacy('G').structuredContent;
  const result = ChordModel.reconcileLyrics(original, 'G\nUna letra nueva');
  assert.equal(result.ok, true, JSON.stringify(result.warnings));
  const row = result.structuredContent.blocks[0].rows[0];
  assert.equal(row.lyric, 'Una letra nueva');
  assert.equal(row.chords.length, 1);
  assert.equal(row.chords[0].root, 'G');
  assert.equal(row.chords[0].position.offset, 0);
});

test('conserva la posición explícita de un acorde instrumental al agregar letra', () => {
  const original = ChordModel.convertLegacy('              G').structuredContent;
  const result = ChordModel.reconcileLyrics(original, '              G\nUna letra nueva');
  assert.equal(result.ok, true, JSON.stringify(result.warnings));
  const row = result.structuredContent.blocks[0].rows[0];
  assert.equal(row.chords[0].position.offset, 14);
});

test('detecta encabezados de seccion sin corchetes y los serializa estructuralmente', () => {
  const raw = 'Intro\n|Ab//Db|Ab///|\n\nVerso 1\nAb\nTe amo Dios\n\nCoro 1\nDb\nCantemos';
  const result = ChordModel.convertLegacy(raw);
  assert.equal(result.ok, true, JSON.stringify(result.warnings));
  assert.deepEqual(result.structuredContent.blocks.map(block => block.label), ['Intro','Verso 1','Coro 1']);
  const serialized = ChordModel.serializeLegacy(result.structuredContent);
  assert.equal(serialized.ok, true);
  assert.ok(serialized.rawText.includes('[Coro 1]'));
  assert.ok(serialized.rawText.includes('[Intro]'));
});

test('no clasifica instrucciones de repeticion ni frases breves como encabezados', () => {
  const result = ChordModel.convertLegacy('REPITEN CORO 1\nTe amo Dios\nA Jesús');
  assert.equal(result.ok, true, JSON.stringify(result.warnings));
  assert.equal(result.structuredContent.blocks[0].label, 'ESTROFA 1');
  assert.deepEqual(result.structuredContent.blocks[0].rows.map(row => row.lyric), ['REPITEN CORO 1','Te amo Dios','A Jesús']);
});

test('conserva la separación entre Eb/G y Fm aunque Fm quede después de la letra', () => {
  const chordLine = 'Db                   Ab       Eb /G         Fm';
  const lyric = 'Con mi ser, con cada aliento';
  const result = ChordModel.convertLegacy('[CORO]\n' + chordLine + '\n' + lyric);
  assert.equal(result.ok, true, JSON.stringify(result.warnings));
  const row = result.structuredContent.blocks[0].rows[0];
  assert.deepEqual(row.chords.map(chord => chord.root), ['Db','Ab','Eb','F']);
  assert.equal(row.chords[2].bass, 'G');
  assert.equal(row.chords[3].position.offset, chordLine.indexOf('Fm'));
  assert.ok(row.chords[3].position.offset > Array.from(lyric).length);
  assert.equal(ChordModel.validateStructuredContent(result.structuredContent).valid, true);
});

test('protege slash chords espaciados y barras de compas en texto realista', () => {
  const raw = 'Intro\n|Ab//Db|Ab///|\nVerso 1\nAb\nTe amo Dios\nEb /G   Fm\nMi existir en Tus manos está\n\nPuente\nAb /C         Db\nTu fidelidad sigue\n\nInterludio\n|Ab//Db|Ab///|';
  const result = ChordModel.convertLegacy(raw);
  assert.equal(result.ok, true, JSON.stringify(result.warnings));
  const rows = result.structuredContent.blocks.flatMap(block => block.rows);
  assert.ok(rows.some(row => row.chords.some(chord => chord.bass === 'G')));
  assert.ok(rows.some(row => row.chords.some(chord => chord.bass === 'C')));
  assert.ok(rows.some(row => row.chords.length === 3 && row.chords.map(chord => chord.root).join(',') === 'Ab,Db,Ab'));
});


test('regresión: convierte íntegra la canción Bondad de Dios copiada de internet', () => {
  const raw = `Intro

|Ab//Db|Ab///|Ab//Db|Ab///|


Verso 1
        Ab
Te amo Diós
     Db            Ab
Tu amor nunca me falla
Eb /G   Fm        Db    Eb
Mi existir en Tus manos está
                          Fm   Db
Desde el momento que despierto
          Ab Eb /G Fm
Hasta el anochecer
         Db      Esus      Ab
Yo cantaré de la bondad de Dios

Coro 1
Db                  Ab
En mi vida has sido bueno
Db                  Ab   Eb
En mi vida has sido tan fiel
Db                   Ab       Eb /G Fm
Con mi ser, con cada aliento
        Db       Eb        Ab
Yo cantaré de la bondad de Dios

Verso 2

          Db
Yo amo Tu voz
       Db              Ab
Me has guiado por el fuego
          Eb /G Fm
Tu cerca estás
   Db        Eb
En la oscuridad
                Fm     Db
Te conozco como Padre
        Ab   Eb /G Fm
Y como amigo fiel
          Db       Esus      Ab
Mi vida está en la bondad de Dios


REPITEN CORO 1

Puente

Ab /C         Db
Tu fidelidad sigue
Eb          Ab
Persiguiéndome
Ab /C        Db
Tu fidelidad sigue
Eb         Ab
Persiguiéndome
           Ab /C
Todo lo que soy
              Ab
Te lo entrego hoy
  Eb         Fm
A Ti me rendiré
Ab /C        Db
Tu fidelidad sigue
Eb          Ab
Persiguiéndome

REPITEN PUENTE

Interludo

|Ab//Db|Ab///|


REPITEN CORO 1

Tag

        Db       Eb        Ab
Yo cantaré de la bondad de Dios`;
  const result = ChordModel.convertLegacy(raw);
  assert.equal(result.ok, true, JSON.stringify(result.warnings));
  assert.deepEqual(result.structuredContent.blocks.map(block => block.label), ['Intro','Verso 1','Coro 1','Verso 2','Puente','Interludo','Tag']);
  const rows = result.structuredContent.blocks.flatMap(block => block.rows);
  assert.ok(rows.some(row => row.chords.some(chord => chord.bass === 'G')));
  assert.ok(rows.some(row => row.chords.some(chord => chord.bass === 'C')));
  assert.ok(rows.some(row => row.chords.length === 3 && row.chords.map(chord => chord.root).join(',') === 'Ab,Db,Ab'));
  assert.ok(rows.some(row => row.lyric.includes('REPITEN CORO 1')));
  assert.ok(rows.some(row => row.lyric.includes('REPITEN PUENTE')));
});

test('distribuye acordes traducidos sin modificar offsets musicales', () => {
  const lyric = 'Con mi ser, con cada aliento';
  const chords = [
    { id: 'a', root: 'Db', quality: '', position: { offset: 0, affinity: 'before' } },
    { id: 'b', root: 'Ab', quality: '', position: { offset: 20, affinity: 'before' } },
    { id: 'c', root: 'Eb', quality: '', bass: 'G', position: { offset: 28, affinity: 'before' } },
    { id: 'd', root: 'F', quality: 'm', position: { offset: 33, affinity: 'before' } }
  ];
  const layout = ChordModel.layoutChordRow(lyric, chords, chord =>
    chord.id === 'c' ? 'Mib/Sol' : chord.id === 'd' ? 'Fam' : chord.root
  );
  assert.deepEqual(layout.placements.map(item => item.offset), [0, 20, 28, 35]);
  assert.ok(layout.lyric.length > lyric.length);
  assert.ok(layout.lyric.length >= layout.placements[3].offset + layout.placements[3].displaySymbol.length);
  assert.equal(layout.sourceOffsetAtVisual(layout.lyric.length), layout.placements[3].sourceOffset + layout.placements[3].displaySymbol.length);
  assert.deepEqual(chords.map(chord => chord.position.offset), [0, 20, 28, 33]);
});

test('permite posiciones musicales después de la última palabra y del último acorde', () => {
  const lyric = 'Al que es Digno';
  const chords = [
    { id: 'a', root: 'C', quality: '', position: { offset: 0, affinity: 'before' } },
    { id: 'b', root: 'G', quality: '', position: { offset: 22, affinity: 'before' } }
  ];
  const layout = ChordModel.layoutChordRow(lyric, chords, chord => chord.root);
  assert.equal(layout.placements[1].sourceOffset, 22);
  assert.equal(layout.sourceOffsetAtVisual(layout.lyric.length), 23);
  assert.equal(layout.sourceOffsetAtVisual(layout.lyric.length + 5), 28);
  assert.deepEqual(chords.map(chord => chord.position.offset), [0, 22]);
});

test('al agregar y quitar letra a una fila instrumental conserva offsets absolutos', () => {
  const imported = ChordModel.convertLegacy('[INTRO]\nDb       Ab       Gb       Db');
  assert.equal(imported.ok, true, JSON.stringify(imported.warnings));
  const original = imported.structuredContent.blocks[0].rows[0];
  assert.equal(original.lyric, '');
  const originalOffsets = original.chords.map(chord => chord.position.offset);
  const withLyric = ChordModel.updateRowLyric(imported.structuredContent, original.id, 'Abba padre');
  assert.equal(withLyric.ok, true, JSON.stringify(withLyric.warnings));
  assert.deepEqual(withLyric.structuredContent.blocks[0].rows[0].chords.map(chord => chord.position.offset), originalOffsets);
  const cleared = ChordModel.updateRowLyric(withLyric.structuredContent, original.id, '');
  assert.equal(cleared.ok, true, JSON.stringify(cleared.warnings));
  assert.deepEqual(cleared.structuredContent.blocks[0].rows[0].chords.map(chord => chord.position.offset), originalOffsets);
});

test('permite acordes nuevos hasta 20 posiciones después del final de la letra', () => {
  const lyric = 'Abba padre';
  const content = {
    version: 2,
    blocks: [{
      id: 'intro-1', label: 'INTRO',
      rows: [{
        id: 'intro-1-row-1', lyric,
        chords: [{
          id: 'tail-chord', root: 'Db', quality: '', bass: null,
          position: { offset: Array.from(lyric).length + 20, affinity: 'before' }
        }]
      }]
    }]
  };
  const validation = ChordModel.validateStructuredContent(content);
  assert.equal(validation.valid, true, JSON.stringify(validation.errors));
  const layout = ChordModel.layoutChordRow(lyric, content.blocks[0].rows[0].chords, chord => chord.root);
  assert.equal(layout.placements[0].sourceOffset, lyric.length + 20);
});

test('distribuye grupos densos y acordes largos de forma acumulativa', () => {
  const chords = Array.from({ length: 12 }, (_, index) => ({
    id: String(index), root: 'C', quality: '', position: { offset: index * 2, affinity: 'before' }
  }));
  const layout = ChordModel.layoutChordRow('Una frase larga para probar muchos acordes juntos', chords,
    chord => chord.id === '0' ? 'Mib/Sol' : 'Rebmaj7');
  for (let i = 1; i < layout.placements.length; i++) {
    const previous = layout.placements[i - 1];
    assert.ok(layout.placements[i].offset >= previous.offset + previous.displaySymbol.length);
  }
  assert.equal(layout.placements.length, 12);
});


test('conserva afinidad after y reserva espacio cuando el acorde rebasa la letra', () => {
  const chords = [
    { id: 'before', root: 'C', quality: '', position: { offset: 2, affinity: 'before' } },
    { id: 'after', root: 'F', quality: 'maj7', position: { offset: 2, affinity: 'after' } }
  ];
  const layout = ChordModel.layoutChordRow('Sol', chords, chord => chord.id === 'before' ? 'Do' : 'Famaj7');
  assert.equal(layout.placements[0].offset, 2);
  assert.ok(layout.placements[1].offset >= layout.placements[0].offset + layout.placements[0].displaySymbol.length);
  assert.ok(layout.lyric.length >= layout.placements[1].offset + layout.placements[1].displaySymbol.length);
  assert.deepEqual(chords.map(chord => chord.position), [
    { offset: 2, affinity: 'before' },
    { offset: 2, affinity: 'after' }
  ]);
});


test('expone anclas por palabra para envolver filas sin desbordar el viewport', () => {
  const chords = [
    { id: 'a', root: 'C', quality: '', position: { offset: 0, affinity: 'before' } },
    { id: 'b', root: 'F', quality: 'm', position: { offset: 35, affinity: 'before' } }
  ];
  const layout = ChordModel.layoutChordRow('Una frase musical de prueba', chords,
    chord => chord.id === 'a' ? 'Do' : 'Fam');
  assert.deepEqual(layout.wordSegments.map(segment =>
    Array.from(layout.lyric).slice(segment.start, segment.end).join('')
  ), ['Una', 'frase', 'musical', 'de', 'prueba']);
  assert.ok(layout.placements[1].offset >= layout.wordSegments.at(-1).end);
  assert.equal(layout.wordSegments.at(-1).end <= Array.from(layout.lyric).length, true);
});


test('el mapeo visual conserva offsets de origen al arrastrar acordes sobre letra y cola', () => {
  const lyric = 'Sublime gracia del Señor';
  const chords = [
    { id: 'a', root: 'C', quality: '', bass: null, position: { offset: 0, affinity: 'before' } },
    { id: 'b', root: 'G', quality: '', bass: null, position: { offset: 12, affinity: 'before' } },
    { id: 'c', root: 'F', quality: '', bass: null, position: { offset: lyric.length + 8, affinity: 'before' } }
  ];
  const layout = ChordModel.layoutChordRow(lyric, chords, chord => chord.root);
  for (const placement of layout.placements) {
    assert.equal(
      layout.sourceOffsetAtVisual(placement.offset),
      placement.sourceOffset,
      'el desplazamiento visual debe regresar al offset musical original'
    );
  }
});


test('eliminar sección conserva las demás secciones e IDs sin mutar el original', () => {
  const original = {
    version: 2,
    blocks: [
      { id: 'verse-1', label: 'ESTROFA 1', rows: [{ id: 'row-v', lyric: 'Letra uno', chords: [{ id: 'ch-v', root: 'G', quality: '', bass: null, position: { offset: 0, affinity: 'before' } }] }] },
      { id: 'chorus-1', label: 'CORO', rows: [{ id: 'row-c', lyric: 'Letra dos', chords: [{ id: 'ch-c', root: 'A', quality: 'm', bass: null, position: { offset: 2, affinity: 'before' } }] }] },
      { id: 'bridge-1', label: 'PUENTE', rows: [{ id: 'row-b', lyric: 'Letra tres', chords: [] }] }
    ]
  };
  const snapshot = JSON.stringify(original);
  const result = ChordModel.removeBlock(original, 'chorus-1');
  assert.equal(result.ok, true, JSON.stringify(result.warnings));
  assert.deepEqual(result.structuredContent.blocks.map(block => block.id), ['verse-1', 'bridge-1']);
  assert.equal(result.structuredContent.blocks[0].rows[0].chords[0].id, 'ch-v');
  assert.equal(result.structuredContent.blocks[1].rows[0].lyric, 'Letra tres');
  assert.equal(JSON.stringify(original), snapshot);
  assert.equal(ChordModel.validateStructuredContent(result.structuredContent).valid, true);
});

test('no permite eliminar la última sección ni un ID inexistente', () => {
  const single = { version: 2, blocks: [{ id: 'only', label: 'ESTROFA', rows: [{ id: 'row-only', lyric: 'Texto', chords: [] }] }] };
  assert.equal(ChordModel.removeBlock(single, 'only').ok, false);
  const multiple = {
    version: 2,
    blocks: [
      { id: 'one', label: 'UNO', rows: [{ id: 'row-one', lyric: '', chords: [] }] },
      { id: 'two', label: 'DOS', rows: [{ id: 'row-two', lyric: '', chords: [] }] }
    ]
  };
  assert.equal(ChordModel.removeBlock(multiple, 'missing').ok, false);
});


test('reordena secciones por ID y conserva intactos contenido e identificadores', () => {
  const original = {
    version: 2,
    blocks: [
      { id: 'verse-1', label: 'ESTROFA 1', rows: [{ id: 'r1', lyric: 'Primera', chords: [{ id: 'c1', root: 'C', quality: '', bass: null, position: { offset: 0, affinity: 'before' } }] }] },
      { id: 'chorus', label: 'CORO', rows: [{ id: 'r2', lyric: 'Coro', chords: [{ id: 'c2', root: 'G', quality: '', bass: null, position: { offset: 2, affinity: 'before' } }] }] },
      { id: 'verse-2', label: 'ESTROFA 2', rows: [{ id: 'r3', lyric: 'Segunda', chords: [] }] },
      { id: 'bridge', label: 'PUENTE', rows: [{ id: 'r4', lyric: 'Puente', chords: [] }] }
    ]
  };
  const result = ChordModel.moveBlock(original, 'bridge', 2);
  assert.equal(result.ok, true, JSON.stringify(result.warnings));
  assert.deepEqual(result.structuredContent.blocks.map(block => block.id), ['verse-1', 'chorus', 'bridge', 'verse-2']);
  assert.equal(result.structuredContent.blocks[2].rows[0].lyric, 'Puente');
  assert.equal(result.structuredContent.blocks[0].rows[0].chords[0].id, 'c1');
  assert.equal(result.structuredContent.blocks[1].rows[0].chords[0].position.offset, 2);
  assert.deepEqual(original.blocks.map(block => block.id), ['verse-1', 'chorus', 'verse-2', 'bridge']);
  assert.equal(ChordModel.validateStructuredContent(result.structuredContent).valid, true);
});

test('reordena al inicio y al final, y rechaza IDs o destinos inválidos', () => {
  const original = ChordModel.convertLegacy('[ESTROFA 1]\nUno\n[CORO]\nDos\n[PUENTE]\nTres').structuredContent;
  const first = ChordModel.moveBlock(original, original.blocks[2].id, 0);
  assert.equal(first.ok, true);
  assert.deepEqual(first.structuredContent.blocks.map(block => block.label), ['PUENTE', 'ESTROFA 1', 'CORO']);
  const last = ChordModel.moveBlock(first.structuredContent, first.structuredContent.blocks[0].id, 2);
  assert.equal(last.ok, true);
  assert.deepEqual(last.structuredContent.blocks.map(block => block.label), ['ESTROFA 1', 'CORO', 'PUENTE']);
  assert.equal(ChordModel.moveBlock(original, 'missing', 0).ok, false);
  assert.equal(ChordModel.moveBlock(original, original.blocks[0].id, 9).ok, false);
  assert.equal(ChordModel.moveBlock(original, original.blocks[0].id, 1.5).ok, false);
});


test('calcula posiciones de inserción para arrastrar una sección a cualquier lugar', () => {
  const cards = [
    { top: 100, height: 80 },
    { top: 190, height: 120 },
    { top: 320, height: 60 }
  ];
  assert.equal(ChordModel.blockInsertionIndex(cards, 90), 0);
  assert.equal(ChordModel.blockInsertionIndex(cards, 150), 1);
  assert.equal(ChordModel.blockInsertionIndex(cards, 260), 2);
  assert.equal(ChordModel.blockInsertionIndex(cards, 370), 3);
  assert.equal(ChordModel.blockInsertionIndex([], 200), 0);
  assert.equal(ChordModel.blockInsertionIndex(cards, NaN), -1);
});


test('calcula auto-desplazamiento progresivo al acercar el arrastre a los bordes', () => {
  const delta = ChordModel.blockDragAutoScrollDelta;
  assert.equal(delta(120, 800), 0);
  assert.equal(delta(72, 800), 0);
  assert.equal(delta(36, 800), -9);
  assert.equal(delta(0, 800), -18);
  assert.equal(delta(764, 800), 9);
  assert.equal(delta(800, 800), 18);
  assert.equal(delta(-10, 800), -18);
  assert.equal(delta(20, 0), 0);
  assert.equal(delta(NaN, 800), 0);
});


test('unifica encabezados conocidos con y sin corchetes', () => {
  const cases = [
    ['[ESTROFA 1]', 'ESTROFA 1'], ['[CORO]', 'CORO'], ['[PUENTE]', 'PUENTE'],
    ['Estrofa 1', 'Estrofa 1'], ['Coro', 'Coro'], ['Puente', 'Puente'],
    ['Intro', 'Intro'], ['Interludio', 'Interludio'], ['Instrumental', 'Instrumental'],
    ['Pre-coro', 'Pre-coro'], ['Tag', 'Tag']
  ];
  for (const [source, expected] of cases) {
    assert.equal(ChordModel.parseSectionHeaderLine(source), expected, source);
    const converted = ChordModel.convertLegacy(source + '\nLetra de prueba');
    assert.equal(converted.ok, true, source + ': ' + JSON.stringify(converted.warnings));
    assert.equal(converted.structuredContent.blocks[0].label, expected);
  }
});

test('conserva etiquetas personalizadas entre corchetes y bloques repetidos', () => {
  const raw = '[PUENTE FINAL]\nPrimera parte\n[CORO ESPECIAL]\nCanto\n[CORO ESPECIAL]\nRepetición';
  const converted = ChordModel.convertLegacy(raw);
  assert.equal(converted.ok, true, JSON.stringify(converted.warnings));
  const blocks = converted.structuredContent.blocks;
  assert.deepEqual(blocks.map(block => block.label), ['PUENTE FINAL', 'CORO ESPECIAL', 'CORO ESPECIAL']);
  assert.equal(new Set(blocks.map(block => block.id)).size, 3);
  const serialized = ChordModel.serializeLegacy(converted.structuredContent);
  assert.equal(serialized.ok, true);
  const restored = ChordModel.convertLegacy(serialized.rawText);
  assert.equal(restored.ok, true, JSON.stringify(restored.warnings));
  assert.deepEqual(restored.structuredContent.blocks.map(block => block.label), blocks.map(block => block.label));
  assert.equal(new Set(restored.structuredContent.blocks.map(block => block.id)).size, 3);
});

test('no convierte etiquetas entre corchetes dentro de una línea de letra', () => {
  const raw = '[CORO]\nAlabemos [con gozo] al Señor\n[ESTROFA 2]\nSegunda estrofa';
  const converted = ChordModel.convertLegacy(raw);
  assert.equal(converted.ok, true, JSON.stringify(converted.warnings));
  assert.deepEqual(converted.structuredContent.blocks.map(block => block.label), ['CORO', 'ESTROFA 2']);
  assert.equal(converted.structuredContent.blocks[0].rows[0].lyric, 'Alabemos [con gozo] al Señor');
});

test('una etiqueta completa entre corchetes conserva la convención heredada', () => {
  assert.equal(ChordModel.parseSectionHeaderLine('[Sección personalizada]'), 'Sección personalizada');
  assert.equal(ChordModel.parseSectionHeaderLine('Sección personalizada'), null);
  assert.equal(ChordModel.parseSectionHeaderLine('REPITEN CORO 1'), null);
  assert.equal(ChordModel.parseSectionHeaderLine(''), null);
});
