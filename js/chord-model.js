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
      const symbol = match[0].replace(/[ \t]+/g, '');
      // Valida primero el token completo para conservar notaciones como C-
      // (Do menor). Solo después intenta separar secuencias unidas por guion.
      if (parseChordSymbol(symbol)) {
        tokens.push({ symbol, index: match.index });
        continue;
      }
      const parts = symbol.split('-');
      const parsedParts = parts.length > 1 ? parts.map(part => parseChordSymbol(part)) : [];
      if (parsedParts.length > 1 && parsedParts.every(Boolean)) {
        let offset = 0;
        parts.forEach(part => {
          tokens.push({ symbol: part, index: match.index + offset });
          offset += part.length + 1;
        });
      } else {
        tokens.push({ symbol, index: match.index });
      }
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

  // Interpreta una línea completa como etiqueta heredada usando una sola regla.
  // Por compatibilidad, cualquier etiqueta aislada entre corchetes (incluidas
  // las personalizadas) es estructural; las etiquetas sin corchetes se limitan
  // al vocabulario reconocido por detectSectionHeader.
  function parseSectionHeaderLine(line) {
    const value = String(line || '').trim();
    const bracketed = value.match(/^\[([^\r\n]*)\]$/);
    if (bracketed) return bracketed[1].trim();
    return detectSectionHeader(value);
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
    const furthestSourceOffset = Math.max(source.length, ...ordered.map(item => item.sourceOffset));
    for (let i = 0; i <= furthestSourceOffset; i++) {
      const spaces = insertions.get(i) || 0;
      for (let j = 0; j < spaces; j++) {
        expanded.push(' ');
        visualToSource.push(i);
      }
      if (i < source.length) {
        expanded.push(source[i]);
        visualToSource.push(i);
      } else if (i < furthestSourceOffset) {
        // Los offsets musicales pueden rebasar el final de la letra.
        // Materializamos ese tramo como espacio visual, sin alterar la letra guardada.
        expanded.push(' ');
        visualToSource.push(i);
      }
    }
    const requiredVisualLength = Math.max(source.length, ...placements.map(item => item.offset + Array.from(item.displaySymbol).length));
    const expandedLengthBeforeChordTail = expanded.length;
    while (expanded.length < requiredVisualLength) {
      expanded.push(' ');
      visualToSource.push(Math.max(source.length, furthestSourceOffset) + (expanded.length - expandedLengthBeforeChordTail - 1));
    }
    const visualLyric = expanded.join('');
    const visualChars = Array.from(visualLyric);
    const wordSegments = [];
    let cursor = 0;
    while (cursor < visualChars.length) {
      while (cursor < visualChars.length && /\s/u.test(visualChars[cursor])) cursor++;
      if (cursor >= visualChars.length) break;
      const start = cursor;
      while (cursor < visualChars.length && !/\s/u.test(visualChars[cursor])) cursor++;
      wordSegments.push({ start, end: cursor });
    }
    return {
      lyric: visualLyric,
      wordSegments,
      placements,
      visualToSource,
      sourceOffsetAtVisual(offset) {
        const index = Math.max(0, Math.floor(Number(offset) || 0));
        if (index >= visualToSource.length) {
          const lastMusicalOffset = visualToSource.length
            ? visualToSource[visualToSource.length - 1] + 1
            : source.length;
          return Math.max(source.length, lastMusicalOffset) + (index - visualToSource.length);
        }
        return visualToSource[index];
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
      const detectedHeader = parseSectionHeaderLine(line);
      if (detectedHeader !== null) {
        pushBlock();
        current = { label: detectedHeader, rows: [] };
        continue;
      }
      if (!line.trim()) continue;

      if (isChordLine(line)) {
        const next = lines[i + 1];
        const hasLyric = typeof next === 'string' && next.trim() !== '' &&
          !isChordLine(next) && parseSectionHeaderLine(next) === null;
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
    // Una edición que no cambia la letra no debe recortar offsets musicales
    // que legítimamente rebasan el último carácter (acordes de cola).
    if (String(oldLyric || '') === String(newLyric || '')) return offset;
    const oldChars = Array.from(oldLyric || '');
    const newChars = Array.from(newLyric || '');
    // Las posiciones de una fila instrumental ya representan espacio musical
    // explícito. Añadir o quitar letra no debe comprimirlas ni moverlas.
    if (oldChars.length === 0 || newChars.length === 0) return Math.max(0, offset);
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
    // Los acordes pueden quedar después de la última palabra. No recortarlos
    // al largo del texto: el editor reserva una cola musical para colocarlos.
    return Math.max(0, next);
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

  // Actualiza una sola línea desde el editor integrado. Trabaja sobre una
  // copia, conserva IDs/acordes y ajusta posiciones solo cuando cambia la letra.
  function updateRowLyric(existingContent, rowId, nextLyric) {
    const validation = validateStructuredContent(existingContent);
    if (!validation.valid) {
      return { ok: false, structuredContent: null, warnings: validation.errors };
    }
    if (typeof nextLyric !== 'string') {
      return { ok: false, structuredContent: null, warnings: ['La letra debe ser texto.'] };
    }
    const nextContent = JSON.parse(JSON.stringify(existingContent));
    let target = null;
    nextContent.blocks.some(block => {
      target = block.rows.find(row => row.id === rowId) || null;
      return !!target;
    });
    if (!target) {
      return { ok: false, structuredContent: null, warnings: ['No se encontró la línea que se desea editar.'] };
    }
    const previousLyric = target.lyric;
    target.lyric = nextLyric;
    target.chords = target.chords.map(chord => ({
      ...chord,
      position: {
        ...chord.position,
        offset: adjustChordOffset(previousLyric, nextLyric, chord.position.offset, chord.position.affinity)
      }
    }));
    const nextValidation = validateStructuredContent(nextContent);
    if (!nextValidation.valid) {
      return { ok: false, structuredContent: null, warnings: nextValidation.errors };
    }
    return { ok: true, structuredContent: nextContent, warnings: [] };
  }

  // Sustituye una fila por un fragmento pegado con formato heredado.
  // Reutiliza el mismo conversor de canciones completas y mantiene la identidad
  // de la fila original para que la edición no rompa referencias internas.
  function replaceRowWithLegacyFragment(existingContent, blockId, rowId, rawText) {
    const validation = validateStructuredContent(existingContent);
    if (!validation.valid) {
      return { ok: false, structuredContent: null, warnings: validation.errors };
    }
    const converted = convertLegacy(rawText);
    if (!converted.ok) {
      return { ok: false, structuredContent: null, warnings: converted.warnings };
    }
    if (converted.structuredContent.blocks.length !== 1) {
      return {
        ok: false,
        structuredContent: null,
        warnings: ['El fragmento contiene varias secciones. Usa la opción para pegar una canción completa.']
      };
    }

    const nextContent = JSON.parse(JSON.stringify(existingContent));
    const targetBlock = nextContent.blocks.find(block => block.id === blockId);
    if (!targetBlock) {
      return { ok: false, structuredContent: null, warnings: ['No se encontró la sección que recibirá el fragmento.'] };
    }
    const targetIndex = targetBlock.rows.findIndex(row => row.id === rowId);
    if (targetIndex < 0) {
      return { ok: false, structuredContent: null, warnings: ['No se encontró la fila que se desea reemplazar.'] };
    }

    const originalRow = targetBlock.rows[targetIndex];
    const importedRows = converted.structuredContent.blocks[0].rows.map(row =>
      JSON.parse(JSON.stringify(row))
    );
    if (!importedRows.length) {
      return { ok: false, structuredContent: null, warnings: ['El fragmento no contiene líneas editables.'] };
    }

    // Si el usuario pegó solo letra multilínea, conservar los acordes que ya
    // pertenecían a la fila y ajustar sus offsets respecto de la primera línea.
    const preserveOriginalChords = importedRows.every(row => row.chords.length === 0) &&
      originalRow.chords.length > 0;
    if (preserveOriginalChords) {
      const adjusted = updateRowLyric(
        { version: 2, blocks: [{ id: targetBlock.id, label: targetBlock.label, rows: [originalRow] }] },
        originalRow.id,
        importedRows[0].lyric
      );
      if (!adjusted.ok) {
        return { ok: false, structuredContent: null, warnings: adjusted.warnings };
      }
      importedRows[0].chords = adjusted.structuredContent.blocks[0].rows[0].chords;
    }

    const usedIds = new Set();
    nextContent.blocks.forEach(block => {
      usedIds.add(block.id);
      block.rows.forEach(row => {
        usedIds.add(row.id);
        row.chords.forEach(chord => usedIds.add(chord.id));
      });
    });
    const makeUniqueId = prefix => {
      let sequence = 1;
      let candidate = prefix + '-' + sequence;
      while (usedIds.has(candidate)) candidate = prefix + '-' + (++sequence);
      usedIds.add(candidate);
      return candidate;
    };

    importedRows.forEach((row, index) => {
      row.id = index === 0 ? originalRow.id : makeUniqueId('row-import');
      if (!(preserveOriginalChords && index === 0)) {
        row.chords.forEach(chord => { chord.id = makeUniqueId('chord-import'); });
      }
    });
    targetBlock.rows.splice(targetIndex, 1, ...importedRows);

    const nextValidation = validateStructuredContent(nextContent);
    if (!nextValidation.valid) {
      return { ok: false, structuredContent: null, warnings: nextValidation.errors };
    }
    return {
      ok: true,
      structuredContent: nextContent,
      insertedRows: importedRows.length,
      warnings: []
    };
  }

  // Renombra un bloque sin cambiar su identidad, filas ni acordes.
  // El nombre debe poder representarse como una etiqueta heredada [NOMBRE].
  function updateBlockLabel(existingContent, blockId, nextLabel) {
    const validation = validateStructuredContent(existingContent);
    if (!validation.valid) {
      return { ok: false, structuredContent: null, warnings: validation.errors };
    }
    if (typeof nextLabel !== 'string') {
      return { ok: false, structuredContent: null, warnings: ['El nombre de la sección debe ser texto.'] };
    }
    const label = nextLabel.trim();
    if (!label || label.length > 60 || label.includes('[') || label.includes(']') || /[\r\n]/.test(label)) {
      return { ok: false, structuredContent: null, warnings: ['Usa un nombre de 1 a 60 caracteres, sin corchetes ni saltos de línea.'] };
    }
    const nextContent = JSON.parse(JSON.stringify(existingContent));
    const target = nextContent.blocks.find(block => block.id === blockId);
    if (!target) {
      return { ok: false, structuredContent: null, warnings: ['No se encontró la sección que se desea renombrar.'] };
    }
    target.label = label;
    const nextValidation = validateStructuredContent(nextContent);
    if (!nextValidation.valid) {
      return { ok: false, structuredContent: null, warnings: nextValidation.errors };
    }
    return { ok: true, structuredContent: nextContent, warnings: [] };
  }

  // Agrega una sección al final sin mutar el documento original.
  // La fila inicial vacía permite comenzar escribiendo letra o acordes.
  function addBlock(existingContent, nextLabel) {
    const validation = validateStructuredContent(existingContent);
    if (!validation.valid) {
      return { ok: false, structuredContent: null, warnings: validation.errors };
    }
    if (typeof nextLabel !== 'string') {
      return { ok: false, structuredContent: null, warnings: ['El nombre de la sección debe ser texto.'] };
    }
    const label = nextLabel.trim();
    if (!label || label.length > 60 || label.includes('[') || label.includes(']') || /[\r\n]/.test(label)) {
      return { ok: false, structuredContent: null, warnings: ['Usa un nombre de 1 a 60 caracteres, sin corchetes ni saltos de línea.'] };
    }
    const nextContent = JSON.parse(JSON.stringify(existingContent));
    const usedIds = new Set();
    nextContent.blocks.forEach(block => {
      usedIds.add(block.id);
      block.rows.forEach(row => {
        usedIds.add(row.id);
        row.chords.forEach(chord => usedIds.add(chord.id));
      });
    });
    let sequence = 1;
    let blockId;
    let rowId;
    do {
      blockId = 'block-added-' + sequence;
      rowId = 'row-added-' + sequence + '-1';
      sequence++;
    } while (usedIds.has(blockId) || usedIds.has(rowId));
    nextContent.blocks.push({
      id: blockId,
      label,
      rows: [{ id: rowId, lyric: '', chords: [] }]
    });
    const nextValidation = validateStructuredContent(nextContent);
    if (!nextValidation.valid) {
      return { ok: false, structuredContent: null, warnings: nextValidation.errors };
    }
    return { ok: true, structuredContent: nextContent, blockId, rowId, warnings: [] };
  }



  // Calcula el índice final de inserción a partir del centro vertical de cada sección restante.
  function blockInsertionIndex(blockRects, pointerY) {
    if (!Array.isArray(blockRects) || !Number.isFinite(pointerY)) return -1;
    return blockRects.reduce((index, rect) => {
      if (!rect || !Number.isFinite(rect.top) || !Number.isFinite(rect.height)) return index;
      return pointerY >= rect.top + rect.height / 2 ? index + 1 : index;
    }, 0);
  }

  // Velocidad vertical para auto-desplazar la página mientras se arrastra una sección.
  // Devuelve 0 fuera de la zona de borde y una velocidad progresiva dentro de ella.
  function blockDragAutoScrollDelta(pointerY, viewportHeight, edgeSize = 72, maxSpeed = 18) {
    if (!Number.isFinite(pointerY) || !Number.isFinite(viewportHeight) || viewportHeight <= 0 ||
        !Number.isFinite(edgeSize) || edgeSize <= 0 || !Number.isFinite(maxSpeed) || maxSpeed <= 0) return 0;
    if (pointerY < edgeSize) return -maxSpeed * Math.min(1, Math.max(0, (edgeSize - pointerY) / edgeSize));
    const distanceFromBottom = viewportHeight - pointerY;
    if (distanceFromBottom < edgeSize) return maxSpeed * Math.min(1, Math.max(0, (edgeSize - distanceFromBottom) / edgeSize));
    return 0;
  }

  // Reordena una sección por su ID y su índice final, conservando todo su contenido e identidad.
  function moveBlock(existingContent, blockId, targetIndex) {
    const validation = validateStructuredContent(existingContent);
    if (!validation.valid) {
      return { ok: false, structuredContent: null, warnings: validation.errors };
    }
    if (typeof blockId !== 'string' || !blockId) {
      return { ok: false, structuredContent: null, warnings: ['Se requiere el ID de la sección que se desea mover.'] };
    }
    const currentIndex = existingContent.blocks.findIndex(block => block.id === blockId);
    if (currentIndex < 0) {
      return { ok: false, structuredContent: null, warnings: ['No se encontró la sección que se desea mover.'] };
    }
    if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= existingContent.blocks.length) {
      return { ok: false, structuredContent: null, warnings: ['La posición de destino no es válida.'] };
    }
    const nextContent = JSON.parse(JSON.stringify(existingContent));
    const [movingBlock] = nextContent.blocks.splice(currentIndex, 1);
    nextContent.blocks.splice(targetIndex, 0, movingBlock);
    const nextValidation = validateStructuredContent(nextContent);
    if (!nextValidation.valid) {
      return { ok: false, structuredContent: null, warnings: nextValidation.errors };
    }
    return { ok: true, structuredContent: nextContent, movedBlockId: blockId, fromIndex: currentIndex, toIndex: targetIndex, warnings: [] };
  }

  // Elimina una sección por ID sin mutar el documento ni alterar los IDs restantes.
  // Se conserva al menos una sección para evitar dejar una canción sin punto de edición.
  function removeBlock(existingContent, blockId) {
    const validation = validateStructuredContent(existingContent);
    if (!validation.valid) {
      return { ok: false, structuredContent: null, warnings: validation.errors };
    }
    if (typeof blockId !== 'string' || !blockId) {
      return { ok: false, structuredContent: null, warnings: ['Se requiere el ID de la sección que se desea eliminar.'] };
    }
    if (!existingContent.blocks.some(block => block.id === blockId)) {
      return { ok: false, structuredContent: null, warnings: ['No se encontró la sección que se desea eliminar.'] };
    }
    if (existingContent.blocks.length <= 1) {
      return { ok: false, structuredContent: null, warnings: ['La canción debe conservar al menos una sección.'] };
    }
    const nextContent = JSON.parse(JSON.stringify(existingContent));
    nextContent.blocks = nextContent.blocks.filter(block => block.id !== blockId);
    const nextValidation = validateStructuredContent(nextContent);
    if (!nextValidation.valid) {
      return { ok: false, structuredContent: null, warnings: nextValidation.errors };
    }
    return { ok: true, structuredContent: nextContent, removedBlockId: blockId, warnings: [] };
  }

  return {
    version: 2,
    parseChordSymbol,
    detectSectionHeader,
    parseSectionHeaderLine,
    layoutChordRow,
    validateStructuredContent,
    convertLegacy,
    reconcileLyrics,
    updateRowLyric,
    replaceRowWithLegacyFragment,
    updateBlockLabel,
    addBlock,
    removeBlock,
    moveBlock,
    blockInsertionIndex,
    blockDragAutoScrollDelta,
    serializeLegacy,
    isChordLine
  };
});
