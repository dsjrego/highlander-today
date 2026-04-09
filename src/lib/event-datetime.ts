export function buildEventDatetime(dateStr: string, timeStr?: string | null): Date {
  if (timeStr) {
    return new Date(`${dateStr}T${timeStr}:00`);
  }

  return new Date(`${dateStr}T00:00:00`);
}

export function formatEventDateInput(value: Date | string | null) {
  if (!value) {
    return '';
  }

  const date = typeof value === 'string' ? new Date(value) : value;
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatEventTimeInput(value: Date | string | null) {
  if (!value) {
    return null;
  }

  const date = typeof value === 'string' ? new Date(value) : value;
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${hours}:${minutes}`;
}
