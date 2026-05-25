import { useEffect } from 'react';

/**
 * Custom hook to prevent the user from accidentally closing the browser tab
 * or refreshing the page without confirmation.
 * @param {boolean} enabled - Whether the prevention logic should be active.
 */
const usePreventWindowClose = (enabled: boolean = true) => {
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Modern browsers ignore the return value and show a generic message.
      // Setting returnValue is required for some browsers like Chrome and Firefox.
      event.preventDefault();
      event.returnValue = ''; // This triggers the browser's default prompt.
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled]);
};

export default usePreventWindowClose;
