(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ChordModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const ROOTS = new Set(['C','C#','Db','D','D#','Eb','E','F','F#','Gb','G','G#','Ab','A','A#','Bb','B']);
  const LATIN_ROOTS = {
    DO:'C', RE:'D', MI:'E', FA:'F', SOL:'G', LA:'A', SI:'B',
    'DO#':'C#', 'RE#':'D#', 'FA#':'F#', 'SOL#':'G#', 'LA#':'A#',
    REB:'Db', MIB:'Eb', SOLB:'Gb', LAB:'Ab', SIB:'Bb'
  };
  const SUFFIX_RE = /^(?:(?:maj|min|m|-|dim|°|ø|aug|\+|sus(?:2|4)?|add|M)?(?:2|4|5|6|7|9|11|13)?(?:sus(?:2|4)?)?(?:add(?:2|4|9|11|13))?(?:b5|#5|b9|#9|#11|b13)?(?:\((?:b|#)?(?:5|9|11|13)(?:,(?:b|#)?(?:5|9|11|13))*\))?)$/i;

  function parseNote(value) {
    if (typeof value !== 'string' || !value.trim()) return null;
    const token = value.trim();
    const names = ['SOL','DO','RE','MI','FA','LA','SI'];
    for (const name of names) {
      if (!token.toUpperCase().startsWith(name)) continue;
      const rest = token.slice(name.length);
      const accidental = /^[#b]/i.test(rest) ? rest[0] : '';
      const suffix = rest.slice(accidental ? 1 : 0);
      if (!SUFFIX_RE.test(suffix)) continue;
      const root = accidental
        ? (LATIN_ROOTS[name + accidental.toUpperCase()] || LATIN_ROOTS[name] + accidental)
        : LATIN_ROOTS[name];
      return { root, suffix };
    }
    const match = token.match(/^([A-G])([#b]?)(.*)$/i);
    if (!match) return null;
    const root = match[1].toUpperCase() + match[2];
    const suffix = match[3] || '';
    if (!ROOTS.has(root) || !SUFFIX_RE.test(suffix)) return null;
    return { root, suffix };
  }

  function parseChordSymbol(symbol) {
    if (typeof symbol !== 'string') return null;
    const value = symbol.trim();
    if (!value) return null;
    const parts = value.split('/');
    if (parts.length > 2) return null;
    const main = parseNote(parts[0]);
    if (!main) return null;
    let quality = main.suffix;
    let bass = null;
    if (parts.length === 2 && /^(?:6|7|9)$/.test(quality) && parts[1] === '9') {
      quality += '/9';
    } else if (parts.length === 2) {
      const parsedBass = parseNote(parts[1]);
      if (!parsedBass || parsedBass.suffix || !ROOTS.has(parsedBass.root)) return null;
      bass = parsedBass.root;
    }
    if (!SUFFIX_RE.test(quality) && !/^(?:6|7|9)\/9$/i.test(quality)) return null;
    return { root: main.root, quality, bass };
  }

  function compactBarChordTokens(line) {
    const original = String(line || '');
    const leadingOffset = (original.match(/^\s*/) || [''])[0].length;
    const value = original.trim();
    if (!/^\|.*\|$/.test(value) || !/\/{2,3}/.test(value)) return null;
    const tokens = [];
    const re = /[A-G](?:#|b)?(?:maj|min|m|dim|aug|sus2|sus4|sus|add\d+)?(?:13|11|9|7|6|5|4|2)?/gi;
    let cursor = 0;
    let match;
    while ((match = re.exec(value)) !== null) {
      const between = value.slice(cursor, match.index);
      if (between && !/^(?:\|+|\/{2,3})+$/.test(between)) return null;
      if (!parseChordSymbol(match[0])) return null;
      tokens.push({ symbol: match[0], index: match.index + leadingOffset });
      cursor = re.lastIndex;
    }
    if (!tokens.length || !/^(?:\|+|\/{2,3})+$/.test(value.slice(cursor))) return null;
    return tokens;
  }

  function chordLineTokens(line) {
    const tokens = [];
    const re = /\S+(?:[ \t]+\/[A-G](?:#|b)?)?/g;
    let match;
    while ((match = re.exec(String(line || ''))) !== null) {
      tokens.push({ symbol: match[0].replace(/[ \t]+/g, ''), index: match.index });
    }
    return tokens;
  }

  function isChordLine(line) {
    if (compactBarChordTokens(line)) return true;
    const tokens = chordLineTokens(line);
    if (!tokens.length) return false;
    // Una línea mixta como "A Jesús." es letra, no una línea de acordes.
    // Todos los tokens deben ser símbolos válidos para evitar falsos positivos.
    return tokens.every(token => !!parseChordSymbol(token.symbol));
  }

  // Reconocimiento conservador de encabezados de seccion escritos sin corchetes.
  function detectSectionHeader(line) {
    const value = String(line || '').trim();
    if (!value || value.length > 40) return null;
    const patterns = [
      /^(?:intro|introducci[oó]n|preludio|interludio|interludo|instrumental|outro|coda|final|tag)$/i,
      /^(?:verso|verse|estrofa)\s*\d*$/i,
      /^(?:coro|chorus|estribillo)\s*\d*$/i,
      /^(?:puente|bridge)\s*\d*$/i,
      /^(?:pre[- ]?coro|pre[- ]?chorus)\s*\d*$/i
    ];
    return patterns.some(pattern => pattern.test(value)) ? value : null;
  }

  function normalizeIdPart(value) {
    return String(value || 'bloque').normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'bloque';
  }

  function makeChordId(blockIndex, rowIndex, chordIndex) {
    return 'chord-' + (blockIndex + 1) + '-' + (rowIndex + 1) + '-' + (chordIndex + 1);
  }

  function makeRowId(blockIndex, rowIndex) {
    return 'row-' + (blockIndex + 1) + '-' + (rowIndex + 1);
  }

  function makeBlockId(label, occurrence) {
    const part = normalizeIdPart(label);
    return /-\d+$/.test(part) && occurrence === 1 ? part : part + '-' + occurrence;
  }

  // Distribuye acordes sin alterar sus posiciones musicales guardadas.
  // Cuando un símbolo traducido ocupa más espacio, desplaza visualmente los
  // acordes posteriores y la letra desde el punto de colisión.
  function layoutChordRow(lyric, chords, getDisplaySymbol) {
    const source = Array.from(String(lyric || ''));
    const ordered = (Array.isArray(chords) ? chords : []).map((chord, index) => ({
      chord, index,
      sourceOffset: Math.max(0,
        (Number(chord && chord.position ? chord.position.offset : chord && chord.offset) || 0) +
        ((chord && (chord.position ? chord.position.affinity : chord.affinity)) === 'after' ? 1 : 0))
    })).sort((a, b) => a.sourceOffset - b.sourceOffset || a.index - b.index);
    const insertions = new Map();
    const placements = [];
    let cumulativeShift = 0;
    let previousEnd = 0;
    ordered.forEach(item => {
      const chord = item.chord || {};
      const symbol = typeof getDisplaySymbol === 'function'
        ? String(getDisplaySymbol(chord))
        : String(chord.root || '') + String(chord.quality || '') + (chord.bass ? '/' + chord.bass : '');
      let visualOffset = item.sourceOffset + cumulativeShift;
      const extra = Math.max(0, previousEnd - visualOffset);
      if (extra) {
        insertions.set(item.sourceOffset, (insertions.get(item.sourceOffset) || 0) + extra);
        cumulativeShift += extra;
        visualOffset += extra;
      }
      placements.push({
        id: chord.id || null,
        sourceOffset: item.sourceOffset,
        offset: visualOffset,
        displaySymbol: symbol,
        shift: visualOffset - item.sourceOffset
      });
      previousEnd = visualOffset + Array.from(symbol).length;
    });
    const expanded = [];
    const visualToSource = [];
    for (let i = 0; i <= source.length; i++) {
      const spaces = insertions.get(i) || 0;
      for (let j = 0; j < spaces; j++) {
        expanded.push(' ');
        visualToSource.push(i);
      }
      if (i < source.length) {
        expanded.push(source[i]);
        visualToSource.push(i);
      }
    }
    return {
      lyric: expanded.join(''),
      placements,
      visualToSource,
      sourceOffsetAtVisual(offset) {
        const index = Math.max(0, Math.min(visualToSource.length, Math.floor(Number(offset) || 0)));
        return index >= visualToSource.length ? source.length : visualToSource[index];
      }
    };
  }

  function validateStructuredContent(content) {
    const errors = [];
    if (!content || typeof content !== 'object' || content.version !== 2 || !Array.isArray(content.blocks)) {
      return { valid: false, errors: ['La estructura debe tener version 2 y un arreglo blocks.'] };
    }
    const ids = new Set();
    function checkId(id, path) {
      if (typeof id !== 'string' || !id.trim()) errors.push(path + ': falta un id.');
      else if (ids.has(id)) errors.push(path + ': id duplicado "' + id + '".');
      else ids.add(id);
    }
    content.blocks.forEach((block, bi) => {
      checkId(block && block.id, 'blocks[' + bi + ']');
      if (!block || typeof block.label !== 'string' || !Array.isArray(block.rows)) {
        errors.push('blocks[' + bi + ']: label o rows inválidos.');
        return;
      }
      block.rows.forEach((row, ri) => {
        const path = 'blocks[' + bi + '].rows[' + ri + ']';
        checkId(row && row.id, path);
        if (!row || typeof row.lyric !== 'string' || !Array.isArray(row.chords)) {
          errors.push(path + ': lyric o chords inválidos.');
          return;
        }
        const length = Array.from(row.lyric).length;
        row.chords.forEach((chord, ci) => {
          const cp = path + '.chords[' + ci + ']';
          checkId(chord && chord.id, cp);
          if (!chord || !ROOTS.has(chord.root)) errors.push(cp + ': raíz no canónica.');
          if (!chord || typeof chord.quality !== 'string' ||
              (!SUFFIX_RE.test(chord.quality) && !/^(?:6|7|9)\/9$/i.test(chord.quality))) {
            errors.push(cp + ': calidad/extensión inválida.');
          }
          if (chord && chord.bass !== null && !ROOTS.has(chord.bass)) errors.push(cp + ': bajo inválido.');
          if (!chord || !chord.position || !Number.isInteger(chord.position.offset) ||
              chord.position.offset < 0 || (length === 0 ? chord.position.offset > 10000 : chord.position.offset > length + 20) ||
              !['before','after'].includes(chord.position.affinity)) {
            errors.push(cp + ': posición inválida o fuera de la letra.');
          }
        });
      });
    });
    return { valid: errors.length === 0, errors };
  }

  function convertLegacy(rawText) {
    const warnings = [];
    if (typeof rawText !== 'string' || !rawText.trim()) {
      return { ok: false, structuredContent: null, warnings: ['No hay contenido heredado para convertir.'], reason: 'empty' };
    }
    const lines = rawText.split('\n').map(line => line.endsWith('\r') ? line.slice(0, -1) : line);
    const blocks = [];
    let current = { label: 'ESTROFA 1', rows: [] };
    const occurrences = new Map();
    let firstChord = null;

    function pushBlock() {
      if (!current.rows.length) return;
      const key = normalizeIdPart(current.label);
      const occurrence = (occurrences.get(key) || 0) + 1;
      occurrences.set(key, occurrence);
      current.id = makeBlockId(current.label, occurrence);
      blocks.push(current);
    }

    function chordEntries(chordLine, lyric, blockIndex, rowIndex) {
      if (/\t/.test(chordLine) || /\t/.test(lyric)) {
        return { error: 'Se encontró una tabulación; no es posible deducir con seguridad la posición horizontal.' };
      }
      const compactTokens = compactBarChordTokens(chordLine);
      const tokens = compactTokens || chordLineTokens(chordLine);
      const entries = [];
      for (let index = 0; index < tokens.length; index++) {
        const token = tokens[index];
        const parsed = parseChordSymbol(token.symbol);
        if (!parsed) return { error: 'La línea contiene un token que no se puede interpretar como acorde.' };
        const offset = Array.from(chordLine.slice(0, token.index)).length;
        entries.push({
          id: makeChordId(blockIndex, rowIndex, entries.length),
          root: parsed.root,
          quality: parsed.quality,
          bass: parsed.bass,
          position: { offset, affinity: 'before' }
        });
      }
      // Conservar los offsets originales incluso cuando el último acorde
      // queda después de la última palabra. El renderizador reserva ese espacio;
      // nunca comprimir el sufijo, porque empalma acordes consecutivos.
      const lyricLength = Array.from(lyric).length;
      if (lyric && entries.length) {
        const overflow = Math.max(...entries.map(entry => entry.position.offset)) - lyricLength;
        if (overflow > 20) {
          return { error: 'Un acorde queda demasiado lejos del final de la letra; su posición es ambigua.' };
        }
      }
      return { entries };
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/^\s*\[.*\]\s*$/.test(line)) {
        pushBlock();
        current = { label: line.trim().slice(1, -1), rows: [] };
        continue;
      }
      const detectedHeader = detectSectionHeader(line);
      if (detectedHeader) {
        pushBlock();
        current = { label: detectedHeader, rows: [] };
        continue;
      }
      if (!line.trim()) continue;

      if (isChordLine(line)) {
        const next = lines[i + 1];
        const hasLyric = typeof next === 'string' && next.trim() !== '' &&
          !isChordLine(next) && !/^\s*\[.*\]\s*$/.test(next);
        const lyric = hasLyric ? next : '';
        const blockIndex = blocks.length;
        const rowIndex = current.rows.length;
        const parsed = chordEntries(line, lyric, blockIndex, rowIndex);
        if (parsed.error) {
          warnings.push('Línea ' + (i + 1) + ': ' + parsed.error);
          return { ok: false, structuredContent: null, warnings, reason: 'ambiguous' };
        }
        if (!firstChord && parsed.entries.length) firstChord = parsed.entries[0].root;
        current.rows.push({
          id: makeRowId(blockIndex, rowIndex),
          lyric,
          chords: parsed.entries
        });
        if (hasLyric) i++;
      } else {
        const blockIndex = blocks.length;
        const rowIndex = current.rows.length;
        current.rows.push({ id: makeRowId(blockIndex, rowIndex), lyric: line, chords: [] });
      }
    }
    pushBlock();
    const content = { version: 2, blocks };
    const validation = validateStructuredContent(content);
    if (!validation.valid) {
      return { ok: false, structuredContent: null, warnings: validation.errors, reason: 'invalid' };
    }
    return {
      ok: true,
      structuredContent: content,
      detectedKey: firstChord || 'C',
      warnings
    };
  }

  function normalizeLyricForMatch(value) {
    return String(value || '').normalize('NFC').replace(/\s+/g, ' ').trim();
  }

  function adjustChordOffset(oldLyric, newLyric, offset, affinity) {
    const oldChars = Array.from(oldLyric || '');
    const newChars = Array.from(newLyric || '');
    // Si la fila era instrumental y ahora recibe su primera letra, la
    // posición del acorde ya era explícita. No debe desplazarse al final
    // del texto recién escrito por interpretarlo como una inserción previa.
    if (oldChars.length === 0) return Math.max(0, Math.min(newChars.length, offset));
    let prefix = 0;
    while (prefix < oldChars.length && prefix < newChars.length &&
           oldChars[prefix] === newChars[prefix]) prefix++;
    let suffix = 0;
    while (suffix < oldChars.length - prefix && suffix < newChars.length - prefix &&
           oldChars[oldChars.length - 1 - suffix] === newChars[newChars.length - 1 - suffix]) suffix++;
    const oldChangedEnd = oldChars.length - suffix;
    const newChangedEnd = newChars.length - suffix;
    let next = offset;
    if ((offset > prefix || (offset === prefix && affinity === 'before' && oldChangedEnd === prefix)) && offset >= oldChangedEnd) {
      next += newChangedEnd - oldChangedEnd;
    } else if (offset > prefix && offset < oldChangedEnd) {
      next = newChangedEnd;
    }
    return Math.max(0, Math.min(newChars.length, next));
  }

  // Reconcilia el texto editado con la estructura anterior sin volver a
  // interpretar ni descartar los acordes que ya fueron colocados visualmente.
  // LCS identifica líneas intactas; los tramos modificados de igual longitud
  // se emparejan por orden para conservar acordes al corregir una letra.
  function reconcileLyrics(existingContent, rawText) {
    const existingValidation = validateStructuredContent(existingContent);
    if (!existingValidation.valid) {
      return { ok: false, structuredContent: null, warnings: existingValidation.errors };
    }
    const converted = convertLegacy(rawText);
    if (!converted.ok) {
      return { ok: false, structuredContent: null, warnings: converted.warnings };
    }
    const nextContent = converted.structuredContent;
    const usedOldBlocks = new Set();

    nextContent.blocks.forEach((nextBlock, nextBlockIndex) => {
      let oldBlockIndex = existingContent.blocks.findIndex((block, index) =>
        !usedOldBlocks.has(index) && normalizeLyricForMatch(block.label) === normalizeLyricForMatch(nextBlock.label)
      );
      if (oldBlockIndex < 0 && existingContent.blocks[nextBlockIndex] && !usedOldBlocks.has(nextBlockIndex)) {
        oldBlockIndex = nextBlockIndex;
      }
      if (oldBlockIndex < 0) return;
      usedOldBlocks.add(oldBlockIndex);
      const oldBlock = existingContent.blocks[oldBlockIndex];
      nextBlock.id = oldBlock.id;

      const oldRows = oldBlock.rows;
      const newRows = nextBlock.rows;
      const n = oldRows.length, m = newRows.length;
      const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
      for (let i = n - 1; i >= 0; i--) {
        for (let j = m - 1; j >= 0; j--) {
          dp[i][j] = normalizeLyricForMatch(oldRows[i].lyric) === normalizeLyricForMatch(newRows[j].lyric)
            ? 1 + dp[i + 1][j + 1]
            : Math.max(dp[i + 1][j], dp[i][j + 1]);
        }
      }

      const matches = [];
      let i = 0, j = 0;
      while (i < n && j < m) {
        if (normalizeLyricForMatch(oldRows[i].lyric) === normalizeLyricForMatch(newRows[j].lyric)) {
          matches.push([i++, j++]);
        } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
        else j++;
      }

      // Empareja las líneas cambiadas entre anclas intactas. Las líneas nuevas
      // no reciben acordes; las eliminadas dejan de existir con su contenido.
      const anchors = [[-1, -1], ...matches, [n, m]];
      const rowPairs = [];
      for (let a = 0; a < anchors.length - 1; a++) {
        const [oldAnchor, newAnchor] = anchors[a];
        const [oldNext, newNext] = anchors[a + 1];
        const oldGap = [];
        const newGap = [];
        for (let oi = oldAnchor + 1; oi < oldNext; oi++) oldGap.push(oi);
        for (let nj = newAnchor + 1; nj < newNext; nj++) newGap.push(nj);
        const count = Math.min(oldGap.length, newGap.length);
        for (let k = 0; k < count; k++) rowPairs.push([oldGap[k], newGap[k]]);
        if (oldNext < n && newNext < m) rowPairs.push([oldNext, newNext]);
      }

      const matchedNewRows = new Set();
      const preservedRowIds = new Set();
      rowPairs.forEach(([oldIndex, newIndex]) => {
        const oldRow = oldRows[oldIndex];
        const newRow = newRows[newIndex];
        matchedNewRows.add(newIndex);
        preservedRowIds.add(oldRow.id);
        newRow.id = oldRow.id;
        // Si el usuario escribió acordes en la línea instrumental del texto,
        // la conversión nueva es la fuente de esos acordes. Si la línea sigue
        // vacía en rawText, conservamos los acordes estructurados del editor.
        if (!(oldRow.lyric === '' && newRow.lyric === '' && newRow.chords.length > 0)) {
          newRow.chords = oldRow.chords.map(chord => ({
            ...chord,
            position: {
              ...chord.position,
              offset: adjustChordOffset(oldRow.lyric, newRow.lyric, chord.position.offset, chord.position.affinity)
            }
          }));
        }
      });
      const usedRowIds = new Set(preservedRowIds);
      newRows.forEach((row, rowIndex) => {
        if (matchedNewRows.has(rowIndex)) return;
        if (usedRowIds.has(row.id)) {
          const baseId = 'row-added-' + (nextBlockIndex + 1) + '-' + (rowIndex + 1);
          let candidate = baseId;
          let suffix = 2;
          while (usedRowIds.has(candidate)) candidate = baseId + '-' + suffix++;
          row.id = candidate;
        }
        usedRowIds.add(row.id);
      });
    });

    const validation = validateStructuredContent(nextContent);
    if (!validation.valid) {
      return { ok: false, structuredContent: null, warnings: validation.errors };
    }
    return { ok: true, structuredContent: nextContent, warnings: [] };
  }

  function serializeLegacy(content) {
    const validation = validateStructuredContent(content);
    if (!validation.valid) return { ok: false, rawText: null, warnings: validation.errors };
    const output = [];
    let serializationError = null;
    content.blocks.forEach((block, bi) => {
      if (serializationError) return;
      if (bi > 0 || block.label !== 'ESTROFA 1') output.push('[' + block.label + ']');
      block.rows.forEach(row => {
        if (serializationError) return;
        if (!row.chords.length) {
          output.push(row.lyric);
          return;
        }
        const chars = [];
        let lastEnd = -1;
        const ordered = row.chords.slice().sort((a, b) => a.position.offset - b.position.offset);
        for (const chord of ordered) {
          const name = chord.root + chord.quality + (chord.bass ? '/' + chord.bass : '');
          const offset = chord.position.offset;
          if (chord.position.affinity !== 'before') {
            serializationError = 'La afinidad de posición no existe en el formato heredado.';
            break;
          }
          if (offset < lastEnd) {
            serializationError = 'Hay acordes superpuestos; no se puede serializar sin pérdida.';
            break;
          }
          while (chars.length < offset) chars.push(' ');
          for (let i = 0; i < name.length; i++) chars[offset + i] = name[i];
          lastEnd = offset + name.length;
        }
        if (!serializationError) {
          output.push(chars.join('').replace(/\s+$/, ''));
          if (row.lyric) output.push(row.lyric);
        }
      });
    });
    if (serializationError) return { ok: false, rawText: null, warnings: [serializationError] };
    return { ok: true, rawText: output.join('\n'), warnings: [] };
  }

  return {
    version: 2,
    parseChordSymbol,
    detectSectionHeader,
    layoutChordRow,
    validateStructuredContent,
    convertLegacy,
    reconcileLyrics,
    serializeLegacy,
    isChordLine
  };
});
