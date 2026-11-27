(function (root, factory) {
  const chordModel = typeof module === 'object' && module.exports
    ? require('./chord-model.js')
    : root && root.ChordModel;
  const api = factory(chordModel);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.KeyDetector = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (ChordModel) {
  'use strict';

  const NOTE_TO_PC = {
    C: 0, 'B#': 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3,
    E: 4, Fb: 4, 'E#': 5, F: 5, 'F#': 6, Gb: 6, G: 7,
    'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11, Cb: 11
  };
  const DISPLAY_NOTES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
  const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10];
  const MAJOR_QUALITIES = ['major', 'minor', 'minor', 'major', 'major', 'minor', 'diminished'];
  const MINOR_QUALITIES = ['minor', 'diminished', 'major', 'minor', 'minor', 'major', 'major'];

  // Perfiles de tonalidad de Krumhansl-Kessler. Se usan como una señal más,
  // nunca como criterio único, porque aquí no conocemos duración ni melodía.
  const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

  function qualityKind(quality) {
    const q = String(quality || '');
    if (/^(?:dim|°|ø|m7b5|m7-5)/i.test(q)) return 'diminished';
    if (/^(?:maj|M)/.test(q)) return 'major';
    if (/^(?:aug|\+)/i.test(q)) return 'augmented';
    if (/^(?:sus)/i.test(q)) return 'suspended';
    if (/^(?:min|m|-)/i.test(q)) return 'minor';
    return 'major';
  }

  function chordIntervals(quality) {
    const q = String(quality || '');
    const kind = qualityKind(q);
    let intervals;
    if (kind === 'minor') intervals = [0, 3, 7];
    else if (kind === 'diminished') intervals = [0, 3, 6];
    else if (kind === 'augmented') intervals = [0, 4, 8];
    else if (/^sus2/i.test(q)) intervals = [0, 2, 7];
    else if (/^sus4|^sus$/i.test(q)) intervals = [0, 5, 7];
    else intervals = [0, 4, 7];

    if (/dim7|°7/i.test(q)) intervals.push(9);
    else if (/maj7|M7/.test(q)) intervals.push(11);
    else if (/7|ø/i.test(q)) intervals.push(10);
    if (/6/.test(q)) intervals.push(9);
    if (/9/.test(q)) intervals.push(/b9/i.test(q) ? 13 : /#9/i.test(q) ? 15 : 14);
    if (/11/.test(q)) intervals.push(/#11/i.test(q) ? 18 : 17);
    if (/13/.test(q)) intervals.push(/b13/i.test(q) ? 20 : 21);
    if (/b5/i.test(q)) intervals = intervals.map(value => value === 7 ? 6 : value);
    if (/#5/i.test(q)) intervals = intervals.map(value => value === 7 ? 8 : value);
    return [...new Set(intervals)];
  }

  function correlation(left, right) {
    const n = left.length;
    const meanLeft = left.reduce((sum, value) => sum + value, 0) / n;
    const meanRight = right.reduce((sum, value) => sum + value, 0) / n;
    let numerator = 0, leftVariance = 0, rightVariance = 0;
    for (let i = 0; i < n; i++) {
      const a = left[i] - meanLeft;
      const b = right[i] - meanRight;
      numerator += a * b;
      leftVariance += a * a;
      rightVariance += b * b;
    }
    const denominator = Math.sqrt(leftVariance * rightVariance);
    return denominator ? numerator / denominator : 0;
  }

  function analyze(structuredContent) {
    if (!ChordModel || !ChordModel.validateStructuredContent ||
        !ChordModel.validateStructuredContent(structuredContent).valid) {
      return { ok: false, suggestion: null, reason: 'invalid-content' };
    }

    const chords = [];
    structuredContent.blocks.forEach(block => {
      block.rows.forEach(row => {
        row.chords.forEach(chord => {
          const pc = NOTE_TO_PC[chord.root];
          if (pc === undefined) return;
          chords.push({
            root: pc,
            kind: qualityKind(chord.quality),
            intervals: chordIntervals(chord.quality),
            bass: chord.bass && NOTE_TO_PC[chord.bass] !== undefined ? NOTE_TO_PC[chord.bass] : null
          });
        });
      });
    });

    const uniqueRoots = new Set(chords.map(chord => chord.root));
    if (chords.length < 4 || uniqueRoots.size < 3) {
      return { ok: false, suggestion: null, reason: 'insufficient-chords', chordCount: chords.length };
    }

    const pitchWeights = Array(12).fill(0);
    chords.forEach(chord => {
      chord.intervals.forEach((interval, index) => {
        const weight = index === 0 ? 1.5 : index === 1 ? 1.0 : index === 2 ? 0.8 : 0.35;
        pitchWeights[(chord.root + interval) % 12] += weight;
      });
      // El bajo de una inversión solo aporta una pista secundaria.
      if (chord.bass !== null) pitchWeights[chord.bass] += 0.12;
    });

    const candidates = [];
    for (let tonic = 0; tonic < 12; tonic++) {
      for (const mode of ['major', 'minor']) {
        const scale = mode === 'major' ? MAJOR_SCALE : MINOR_SCALE;
        const expected = mode === 'major' ? MAJOR_QUALITIES : MINOR_QUALITIES;
        const profile = mode === 'major' ? MAJOR_PROFILE : MINOR_PROFILE;
        const rotatedProfile = Array(12).fill(0);
        profile.forEach((value, index) => { rotatedProfile[(tonic + index) % 12] = value; });

        let harmonicFit = 0;
        let cadenceFit = 0;
        chords.forEach((chord, index) => {
          const degree = scale.indexOf((chord.root - tonic + 12) % 12);
          const positionWeight = index === chords.length - 1 ? 1.55 : index === 0 ? 1.12 : 1;
          if (degree < 0) {
            harmonicFit -= 0.72 * positionWeight;
            return;
          }
          harmonicFit += 0.55 * positionWeight;
          const expectedKind = expected[degree];
          const qualityMatches = chord.kind === expectedKind ||
            (mode === 'minor' && degree === 4 && chord.kind === 'major');
          harmonicFit += (qualityMatches ? 0.48 : -0.28) * positionWeight;
        });

        const last = chords[chords.length - 1];
        const previous = chords[chords.length - 2];
        if (last.root === tonic) cadenceFit += 1;
        if (previous.root === (tonic + 7) % 12 && last.root === tonic) cadenceFit += 0.65;
        if (chords[0].root === tonic) cadenceFit += 0.18;

        const fit = harmonicFit / (chords.length * 1.03);
        const profileFit = (correlation(pitchWeights, rotatedProfile) + 1) / 2;
        const cadence = cadenceFit / 1.83;
        const score = fit * 0.58 + profileFit * 0.30 + cadence * 0.12;
        candidates.push({
          tonic,
          mode,
          tonicName: DISPLAY_NOTES[tonic],
          label: DISPLAY_NOTES[tonic] + (mode === 'major' ? ' mayor' : ' menor'),
          score
        });
      }
    }

    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];
    const runnerUp = candidates[1];
    const margin = best.score - runnerUp.score;
    if (best.score < 0.58) {
      return {
        ok: true,
        suggestion: null,
        reason: 'low-confidence',
        confidence: 'low',
        margin,
        candidates: candidates.slice(0, 3).map(({ tonicName, mode, label, score }) => ({ tonicName, mode, label, score }))
      };
    }
    if (margin < 0.045) {
      return {
        ok: true,
        suggestion: null,
        reason: 'ambiguous',
        confidence: 'low',
        margin,
        candidates: candidates.slice(0, 3).map(({ tonicName, mode, label, score }) => ({ tonicName, mode, label, score }))
      };
    }

    return {
      ok: true,
      reason: 'detected',
      suggestion: {
        tonic: best.tonicName,
        mode: best.mode,
        label: best.label,
        confidence: margin >= 0.09 ? 'high' : 'medium',
        score: best.score,
        margin
      },
      candidates: candidates.slice(0, 3).map(({ tonicName, mode, label, score }) => ({ tonicName, mode, label, score }))
    };
  }

  return { analyze, qualityKind, chordIntervals };
});
