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

test('conserva el offset del acorde dentro del margen y sigue rechazando tabulaciones', () => {
  const within = ChordModel.convertLegacy('C           G\nLetra');
  assert.equal(within.ok, true, JSON.stringify(within.warnings));
  const row = within.structuredContent.blocks[0].rows[0];
  assert.deepEqual(row.chords.map(chord => chord.position.offset), [0, 12]);
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
