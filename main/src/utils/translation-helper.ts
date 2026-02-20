/**
 * This is a dummy function to mark strings for translation extraction.
 * Use this in files where you cannot use the useTranslation hook (e.g., constants, data files).
 * The checking/extraction tool will pick up strings wrapped in t('...').
 * 
 * @param key The string to be translated
 * @returns The original string (key)
 */
export const t = (key: string): string => key;
