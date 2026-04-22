import { Platform } from 'react-native';
import { Asset } from 'expo-asset';

const loadedKeys = new Set();
const pendingByKey = new Map();

function getModuleKey(moduleRef) {
  const asset = Asset.fromModule(moduleRef);
  return asset.hash || asset.uri || String(moduleRef);
}

function ensureWebImagePreloadLink(moduleRef) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const asset = Asset.fromModule(moduleRef);
  const href = asset.localUri || asset.uri;
  if (!href) return;
  const selector = `link[rel="preload"][as="image"][href="${href}"]`;
  if (document.head.querySelector(selector)) return;
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = href;
  document.head.appendChild(link);
}

export async function preloadImageModule(moduleRef) {
  const key = getModuleKey(moduleRef);
  if (loadedKeys.has(key)) return;
  if (pendingByKey.has(key)) {
    await pendingByKey.get(key);
    return;
  }
  const run = (async () => {
    const asset = Asset.fromModule(moduleRef);
    ensureWebImagePreloadLink(moduleRef);
    await asset.downloadAsync();
    ensureWebImagePreloadLink(moduleRef);
    loadedKeys.add(key);
  })();
  pendingByKey.set(key, run);
  try {
    await run;
  } finally {
    pendingByKey.delete(key);
  }
}

export async function preloadImageModules(moduleRefs) {
  await Promise.all(moduleRefs.map((m) => preloadImageModule(m).catch(() => {})));
}

export function ensureWebPreloadLinksForModules(moduleRefs) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  moduleRefs.forEach((m) => ensureWebImagePreloadLink(m));
}
