// Hotfix de Director Mode para la prueba de hoy.
// Se carga al final de index.html mediante el Service Worker de pruebas.
// No modifica Firebase ni producción.

// Variables que faltaban en la implementación restaurada y que necesita
// el motor híbrido de seguimiento del músico.
var remoteAutoScrollActive = false;
var remoteScrollSpeed = 1;
var remoteScrollContainer = null;
var remoteScrollCorrectionVelocity = 0;
var remoteBlockNavigationTarget = null;

// El código restaurado conserva una implementación antigua de Auto-Scroll
// más abajo en index.html. La anulamos para garantizar que exista un único
// motor activo: requestAnimationFrame + posiciones semánticas.
window.startAutoScroll = function(targetContainer) {
  if (!targetContainer) return;
  stopAutoScroll(true);
  startLocalScrollMotor(targetContainer, scrollSpeed, true);
  const btn = document.getElementById('scroll-toggle-btn');
  const liveBtn = document.getElementById('live-scroll-btn');
  if (btn) btn.innerText = '⏸ Pausa';
  if (liveBtn) liveBtn.innerText = '⏸ Pausa';
};

window.stopAutoScroll = function(silent = false) {
  isScrolling = false;
  scrollTargetContainer = null;
  if (scrollAnimationFrame) cancelAnimationFrame(scrollAnimationFrame);
  scrollAnimationFrame = null;

  const btn = document.getElementById('scroll-toggle-btn');
  const liveBtn = document.getElementById('live-scroll-btn');
  if (btn) btn.innerText = '▶ Auto-Scroll';
  if (liveBtn) liveBtn.innerText = '▶ Auto-Scroll';

  if (!silent) broadcastToMusicians({ type: 'SCROLL_STOP' });
};

window.toggleAutoScroll = function() {
  isScrolling ? stopAutoScroll() : startAutoScroll(window);
};

window.toggleLiveScroll = function() {
  const screen = document.getElementById('live-screen');
  isScrolling ? stopAutoScroll() : startAutoScroll(screen);
};

window.changeScrollSpeed = function(delta) {
  scrollSpeed = Math.max(1, Math.min(5, scrollSpeed + delta));
  const display = document.getElementById('scroll-speed-display');
  if (display) display.innerText = scrollSpeed + 'x';
  if (isScrolling) startAutoScroll(window);
  else if (currentRole === 'director') broadcastToMusicians({ type: 'SCROLL_SPEED', speed: scrollSpeed });
};

window.changeLiveSpeed = function(delta) {
  scrollSpeed = Math.max(1, Math.min(5, scrollSpeed + delta));
  const display = document.getElementById('live-speed-display');
  if (display) display.innerText = scrollSpeed + 'x';
  if (isScrolling) startAutoScroll(document.getElementById('live-screen'));
  else if (currentRole === 'director') broadcastToMusicians({ type: 'SCROLL_SPEED', speed: scrollSpeed });
};

// GO_TO_BLOCK debe proteger al músico de posiciones que estaban en tránsito
// antes del salto, pero el bloqueo debe liberarse automáticamente cuando el
// Director realmente alcanza el bloque solicitado.
const originalGoToRemoteBlock = window.goToRemoteBlock;
window.goToRemoteBlock = function(blockId) {
  remoteBlockNavigationTarget = blockId || null;
  if (typeof originalGoToRemoteBlock === 'function') {
    originalGoToRemoteBlock(blockId);
  }
};

window.applyReadingPosition = function(container, data) {
  if (isRemoteBlockNavigation) return;

  if (remoteBlockNavigationLock) {
    if (data.source === 'manual') {
      remoteBlockNavigationLock = false;
      remoteBlockNavigationTarget = null;
    } else if (remoteBlockNavigationTarget && data.blockId === remoteBlockNavigationTarget) {
      // El Director ya llegó al bloque pedido. A partir de aquí las posiciones
      // semánticas nuevas vuelven a ser válidas para el seguimiento continuo.
      remoteBlockNavigationLock = false;
      remoteBlockNavigationTarget = null;
    } else {
      return;
    }
  }

  const desiredScroll = getDesiredScrollForReadingPosition(container, data);
  if (desiredScroll === null) return;

  const currentScroll = getContainerScrollTop(container);
  const error = desiredScroll - currentScroll;
  const now = Date.now();

  if (remoteAutoScrollActive) {
    if (Math.abs(error) < SCROLL_CORRECTION_THRESHOLD) {
      remoteScrollCorrectionVelocity *= 0.7;
      if (Math.abs(remoteScrollCorrectionVelocity) < 0.5) remoteScrollCorrectionVelocity = 0;
      return;
    }
    if (now - lastRemoteCorrectionAt >= SCROLL_CORRECTION_INTERVAL) {
      lastRemoteCorrectionAt = now;
      remoteScrollCorrectionVelocity = Math.max(-12, Math.min(12, error * SCROLL_CORRECTION_FACTOR));
    }
    return;
  }

  isRemoteScroll = true;
  setContainerScrollTop(container, desiredScroll);
  setTimeout(() => { isRemoteScroll = false; }, 30);
};

// Garantiza que GO_TO_BLOCK no quede bloqueado por una implementación antigua
// si el Director ya se encuentra en el bloque solicitado.
window.startFollowerAutoScroll = function(speed) {
  remoteScrollCorrectionVelocity = 0;
  remoteAutoScrollActive = true;
  remoteScrollSpeed = Math.max(1, Math.min(5, Number(speed) || 1));
  const isLive = document.getElementById('live-screen').style.display !== 'none';
  remoteScrollContainer = isLive ? document.getElementById('live-screen') : window;
  startLocalScrollMotor(remoteScrollContainer, remoteScrollSpeed, false);
  updateSyncDiagnostic();
};

window.stopFollowerAutoScroll = function() {
  remoteScrollCorrectionVelocity = 0;
  remoteAutoScrollActive = false;
  remoteScrollContainer = null;
  if (currentRole === 'musician' && scrollAnimationFrame) {
    cancelAnimationFrame(scrollAnimationFrame);
    scrollAnimationFrame = null;
    isScrolling = false;
  }
  updateSyncDiagnostic();
};

// Evita que una orden de STOP o cambio de velocidad deje un lock viejo de
// GO_TO_BLOCK activo para siempre.
const originalHandleDirectorCommand = window.handleDirectorCommand;
window.handleDirectorCommand = function(data) {
  if (data && data.type === 'SCROLL_START' && currentRole === 'musician') {
    remoteBlockNavigationLock = false;
    remoteBlockNavigationTarget = null;
  }
  if (data && data.type === 'SCROLL_STOP' && currentRole === 'musician') {
    remoteBlockNavigationLock = false;
    remoteBlockNavigationTarget = null;
  }
  if (typeof originalHandleDirectorCommand === 'function') {
    originalHandleDirectorCommand(data);
  }
};

console.info('[Cancionero] Director Mode hotfix activo: motor rAF + seguimiento semántico.');
