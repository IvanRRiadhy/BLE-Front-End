export function utcTimeToLocal(timeStr: string) {
  if (!timeStr) return '';
  const str = String(timeStr).trim();

  // If no 'Z', it's already on local timezone -> return raw
  if (!str.endsWith('Z') && !str.endsWith('z')) {
    return str;
  }

  const cleanStr = str.replace(/Z$/i, '');
  const today = new Date().toISOString().split('T')[0];
  const utcDate = new Date(`${today}T${cleanStr}Z`);

  return utcDate.toLocaleTimeString('en-GB', {
    hour12: false,
  });
}

