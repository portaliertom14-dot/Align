/**
 * Événements scroll pour le comportement hide/show de la navbar.
 * Les ScrollViews des écrans appellent emitScrollNav(offsetY).
 * La BottomNavBar s'abonne via onScrollNav(callback).
 */
const listeners = new Set();

export function emitScrollNav(offsetY) {
  listeners.forEach((fn) => fn(offsetY));
}

export function onScrollNav(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
