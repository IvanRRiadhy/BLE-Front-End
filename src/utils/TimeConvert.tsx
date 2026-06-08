export function utcTimeToLocal(timeStr: string) {
  const today = new Date().toISOString().split('T')[0];
  const utcDate = new Date(`${today}T${timeStr}Z`);

  return utcDate.toLocaleTimeString('en-GB', {
    hour12: false,
  });
}
