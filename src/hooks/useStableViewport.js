import { useEffect, useState } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

/**
 * Retourne une taille stable au premier paint sur web, puis met à jour au resize réel.
 * Évite le "pop" initial lié aux dimensions RN Web.
 */
export default function useStableViewport() {
  const rnDims = useWindowDimensions();
  const [webDims, setWebDims] = useState(() =>
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? { width: window.innerWidth, height: window.innerHeight }
      : null
  );

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
    const onResize = () => {
      setWebDims({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (Platform.OS === 'web' && webDims) return webDims;
  return rnDims;
}
