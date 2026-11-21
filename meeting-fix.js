// Mi Set: tono personalizado por canción. Experimental; solo en la rama de pruebas.
(function () {
  'use strict';

  const STORAGE_KEY = 'church_song_set_transpose_v1';

  function readPreferences() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch (error) {
      console.warn('[Cancionero] No se pudieron leer los tonos de Mi Set.', error);
      return {};
    }
  }

  function writePreferences(preferences) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      return true;
    } catch (error) {
      console.warn('[Cancionero] No se pudo guardar el tono de Mi Set.', error);
      return false;
    }
  }

  function isInSet(id) {
    return Array.isArray(songSetIds) && songSetIds.includes(id);
  }

  function isSetContext() {
    return !!currentSong && songViewOrigin === 'set' && isInSet(currentSong.id);
  }

  function storedSteps(id) {
    const preferences = readPreferences();
    const value = preferences[id];
    return Number.isFinite(value) && Number.isInteger(value) ? value : 0;
  }

  function saveCurrentPreference() {
    if (!isSetContext()) return false;

    const preferences = readPreferences();
    const steps = Number(currentTransposeSteps);
    if (!Number.isFinite(steps) || !Number.isInteger(steps)) return false;

    // El tono original equivale a no tener una preferencia personalizada.
    if (steps === 0) delete preferences[currentSong.id];
    else preferences[currentSong.id] = steps;

    return writePreferences(preferences);
  }

  function removePreference(id) {
    const preferences = readPreferences();
    if (!Object.prototype.hasOwnProperty.call(preferences, id)) return;
    delete preferences[id];
    writePreferences(preferences);
  }

  function updateSaveControl() {
    const header = document.querySelector('#song-viewer .song-header');
    if (!header) return;

    let button = document.getElementById('set-tone-save');
    if (!button) {
      button = document.createElement('button');
      button.id = 'set-tone-save';
      button.className = 'btn-action';
      button.style.marginTop = '8px';
      button.type = 'button';
      button.addEventListener('click', function () {
        if (!isSetContext()) return;
        if (saveCurrentPreference()) {
          button.textContent = Number(currentTransposeSteps) === 0
            ? 'Tono original guardado en Mi Set'
            : 'Tono guardado en Mi Set ✓';
        } else {
          button.textContent = 'No se pudo guardar el tono';
        }
      });
      header.appendChild(button);
    }

    const visible = isSetContext();
    button.style.display = visible ? 'inline-block' : 'none';
    if (visible) {
      button.textContent = Number(currentTransposeSteps) === 0
        ? 'Tono original · sin personalizar'
        : 'Tono guardado en Mi Set ✓';
    }
  }

  const originalOpenSong = window.openSong;
  if (typeof originalOpenSong === 'function') {
    window.openSong = function (id, origin) {
      originalOpenSong.apply(this, arguments);

      // No aplicar una preferencia si la apertura falló o dejó otra canción activa.
      if (!currentSong || currentSong.id !== id) {
        updateSaveControl();
        return;
      }

      if (isSetContext()) {
        currentTransposeSteps = storedSteps(id);
        renderTransposedContent();

        // openSong ya envió el tono base (0); sincronizamos el personalizado.
        if (currentRole === 'director' && currentTransposeSteps !== 0) {
          broadcastToMusicians({ type: 'TRANSPOSE', steps: currentTransposeSteps });
        }
      }

      updateSaveControl();
    };
  } else {
    console.error('[Cancionero] No se encontró openSong; no se activó Mi Set por tono.');
  }

  const originalTranspose = window.transpose;
  if (typeof originalTranspose === 'function') {
    window.transpose = function () {
      const result = originalTranspose.apply(this, arguments);
      if (isSetContext()) {
        saveCurrentPreference();
        updateSaveControl();
      }
      return result;
    };
  }

  const originalResetKey = window.resetKey;
  if (typeof originalResetKey === 'function') {
    window.resetKey = function () {
      const result = originalResetKey.apply(this, arguments);
      if (isSetContext()) {
        removePreference(currentSong.id);
        updateSaveControl();
      }
      return result;
    };
  }

  const originalToggleSetItem = window.toggleSetItem;
  if (typeof originalToggleSetItem === 'function') {
    window.toggleSetItem = function (event, id) {
      const wasInSet = isInSet(id);
      const result = originalToggleSetItem.apply(this, arguments);
      if (wasInSet && !isInSet(id)) removePreference(id);
      updateSaveControl();
      return result;
    };
  }

  const originalDeleteCurrentSong = window.deleteCurrentSong;
  if (typeof originalDeleteCurrentSong === 'function') {
    window.deleteCurrentSong = async function () {
      const id = currentSong && currentSong.id;
      const result = await originalDeleteCurrentSong.apply(this, arguments);
      if (id && Array.isArray(songs) && !songs.some(song => song.id === id)) {
        removePreference(id);
      }
      updateSaveControl();
      return result;
    };
  }

  const originalShowList = window.showList;
  if (typeof originalShowList === 'function') {
    window.showList = function () {
      const result = originalShowList.apply(this, arguments);
      updateSaveControl();
      return result;
    };
  }

  console.info('[Cancionero Lab] Mi Set por tono personalizado cargado');
})();