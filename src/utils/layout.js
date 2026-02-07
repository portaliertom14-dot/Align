/**
 * useLayout — breakpoints responsive (mobile / tablette / desktop)
 * mobile < 480, tablet 480–1024, desktop > 1024
 */
import { useWindowDimensions } from 'react-native';

export const BREAKPOINTS = {
  mobile: 480,
  tablet: 1024,
};

export function useLayout() {
  const { width, height } = useWindowDimensions();
  const isMobile = width < BREAKPOINTS.mobile;
  const isTablet = width >= BREAKPOINTS.mobile && width <= BREAKPOINTS.tablet;
  const isDesktop = width > BREAKPOINTS.tablet;

  return {
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
  };
}
