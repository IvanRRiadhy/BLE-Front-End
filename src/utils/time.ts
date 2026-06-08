export const formatFullDateTime = (dateString: string, lang: 'en' | 'id' = 'en') => {
  if (!dateString) return '-';

  const locale = lang === 'id' ? 'id-ID' : 'en-US';
  const date = new Date(dateString);

  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
    .format(date)
    .replace(/\./g, ':'); // make sure seconds use ":"
};

export const getUserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;