// Hotfix de Director Mode para la prueba de hoy.
// Se carga al final de index.html mediante el Service Worker de pruebas.
// No modifica Firebase ni producción.

var remoteAutoScrollActive = false;
var remoteScrollSpeed = 1;
var remoteScrollContainer = null;
var remoteScrollCorrectionVelocity = 0;
var remoteBlockNavigationTarget = null;
var remoteBlockNavigationIssuedAt = 0;
var autoScrollStartWatchdog = null;

// Marca temporal para distinguir mensajes que estaban en tránsito antes de
// GO_TO_BLOCK de posiciones nuevas realizadas después del salto.
const originalBroadcastToMusicians = window.broadcastToMusicians;
window.broadcastToMusicians = function(data) {
  if (typeof originalBroadcastToMusicians !== 'function') return;
  if (data && (data.type === 'READING_POSITION' || data.type === 'GO_TO_BLOCK')) {
    originalBroadcastToMusicians({ ...data, sentAt: Date.now() });
    return;
  }
  originalBroadcastToMusicians(data);
};

// Garantiza que exista un único motor activo: requestAnimationFrame +
// posiciones semánticas, anulando la implementación antigua restaurada.
window.startAutoScroll = function(targetContainer) {
  if (!targetContainer) return;
  stopAutoScroll(true);
  const startPosition = getContainerScrollTop(targetContainer);
  startLocalScrollMotor(targetContainer, scrollSpeed, true);

  // Si otro estado/evento detiene inmediatamente el motor al arrancar,
  // recuperarlo una sola vez. No cambia la velocidad ni el algoritmo.
  clearTimeout(autoScrollStartWatchdog);
  autoScrollStartWatchdog = setTimeout(() => {
    autoScrollStartWatchdog = null;
    if (!isScrolling || scrollTargetContainer !== targetContainer) {
      const maxScroll = targetContainer === window
        ? Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
        : Math.max(0, targetContainer.scrollHeight - targetContainer.clientHeight);
      if (startPosition < maxScroll - 1) {
        startLocalScrollMotor(targetContainer, scrollSpeed, false);
      }
    }
  }, 350);

  const btn = document.getElementById('scroll-toggle-btn');
  const liveBtn = document.getElementById('live-scroll-btn');
  if (btn) btn.innerText = '⏸ Pausa';
  if (liveBtn) liveBtn.innerText = '⏸ Pausa';
};

window.stopAutoScroll = function(silent = false) {
  clearTimeout(autoScrollStartWatchdog);
  autoScrollStartWatchdog = null;
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
    // Toda posición emitida antes de GO_TO_BLOCK queda descartada aunque
    // llegue después por latencia de la conexión.
    if (remoteBlockNavigationIssuedAt && data.sentAt && data.sentAt <= remoteBlockNavigationIssuedAt) {
      return;
    }

    if (data.source === 'manual') {
      remoteBlockNavigationLock = false;
      remoteBlockNavigationTarget = null;
      remoteBlockNavigationIssuedAt = 0;
    } else if (remoteBlockNavigationTarget && data.blockId === remoteBlockNavigationTarget) {
      remoteBlockNavigationLock = false;
      remoteBlockNavigationTarget = null;
      remoteBlockNavigationIssuedAt = 0;
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

window.startFollowerAutoScroll = function(speed) {
  remoteScrollCorrectionVelocity = 0;
  remoteAutoScrollActive = true;
  remoteScrollSpeed = Math.max(1, Math.min(5, Number(speed) || 1));
  const isLive = document.getElementById('live-screen').style.display !== 'none';
  remoteScrollContainer = isLive ? document.getElementById('live-screen') : window;
  startLocalScrollMotor(remoteScrollContainer, remoteScrollSpeed, false);
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
};

const originalHandleDirectorCommand = window.handleDirectorCommand;
window.handleDirectorCommand = function(data) {
  if (data && data.type === 'GO_TO_BLOCK' && currentRole === 'musician') {
    remoteBlockNavigationIssuedAt = Number(data.sentAt) || Date.now();
    remoteBlockNavigationTarget = data.blockId || null;
  }
  if (data && data.type === 'SCROLL_START' && currentRole === 'musician') {
    remoteBlockNavigationLock = false;
    remoteBlockNavigationTarget = null;
    remoteBlockNavigationIssuedAt = 0;
  }
  if (data && data.type === 'SCROLL_STOP' && currentRole === 'musician') {
    remoteBlockNavigationLock = false;
    remoteBlockNavigationTarget = null;
    remoteBlockNavigationIssuedAt = 0;
  }
  if (typeof originalHandleDirectorCommand === 'function') {
    originalHandleDirectorCommand(data);
  }
};

console.info('[Cancionero] Director Mode v1.1.14 activo: rAF + sincronización semántica + timestamps.');
