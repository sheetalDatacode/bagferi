import { useEffect } from 'react';

/**
 * Hook to lock scroll on the body and main scrollable elements
 * @param {boolean} lock - Whether to lock the scroll
 */
export const useScrollLock = (lock) => {
  useEffect(() => {
    if (!lock) return;

    // Add class to body and html
    document.body.classList.add('no-scroll');
    document.documentElement.classList.add('no-scroll');
    
    // Find main and add class if it exists (though CSS targets it via .no-scroll main)
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.classList.add('no-scroll');
    }

    return () => {
      document.body.classList.remove('no-scroll');
      document.documentElement.classList.remove('no-scroll');
      if (mainElement) {
        mainElement.classList.remove('no-scroll');
      }
    };
  }, [lock]);
};
