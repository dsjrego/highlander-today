export const EVENT_SERIES_CADENCE = {
  WEEKLY: 'WEEKLY',
  MONTHLY_DATE: 'MONTHLY_DATE',
  MONTHLY_WEEKDAY: 'MONTHLY_WEEKDAY',
} as const;

export type EventSeriesCadence = (typeof EVENT_SERIES_CADENCE)[keyof typeof EVENT_SERIES_CADENCE];

interface EventSeriesSummaryInput {
  startDatetime: Date;
  cadenceLabel: EventSeriesCadence;
  occurrenceCount: number;
}

interface EventOccurrenceInput {
  startDatetime: Date;
  endDatetime: Date | null;
  cadenceLabel: EventSeriesCadence;
  occurrenceCount: number;
}

interface EventSeriesPositionInput {
  id: string;
  startDatetime: Date;
}

interface EventSeriesScopeInput {
  id: string;
}

const WEEKDAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const ORDINAL_LABELS = ['first', 'second', 'third', 'fourth', 'fifth'] as const;

function addDays(value: Date, dayCount: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + dayCount);
  return next;
}

function getDaysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function addMonthsSameDate(value: Date, monthOffset: number) {
  const next = new Date(value);
  const targetDay = value.getDate();

  next.setMonth(next.getMonth() + monthOffset, 1);
  next.setDate(Math.min(targetDay, getDaysInMonth(next.getFullYear(), next.getMonth())));

  return next;
}

function isLastWeekdayOfMonth(value: Date) {
  return addDays(value, 7).getMonth() !== value.getMonth();
}

function getWeekdayPattern(value: Date) {
  return {
    weekday: value.getDay(),
    weekIndex: Math.floor((value.getDate() - 1) / 7) + 1,
    isLast: isLastWeekdayOfMonth(value),
  };
}

function getMonthlyWeekdayDate(base: Date, monthOffset: number) {
  const targetMonth = base.getMonth() + monthOffset;
  const targetYear = base.getFullYear() + Math.floor(targetMonth / 12);
  const monthIndex = ((targetMonth % 12) + 12) % 12;
  const pattern = getWeekdayPattern(base);

  if (pattern.isLast) {
    const lastDay = new Date(targetYear, monthIndex + 1, 0);
    const diff = (lastDay.getDay() - pattern.weekday + 7) % 7;
    const date = lastDay.getDate() - diff;
    const next = new Date(base);
    next.setFullYear(targetYear, monthIndex, date);
    return next;
  }

  const firstOfMonth = new Date(targetYear, monthIndex, 1);
  const firstMatchDate = 1 + ((pattern.weekday - firstOfMonth.getDay() + 7) % 7);
  let date = firstMatchDate + (pattern.weekIndex - 1) * 7;
  const daysInMonth = getDaysInMonth(targetYear, monthIndex);

  if (date > daysInMonth) {
    date -= 7;
  }

  const next = new Date(base);
  next.setFullYear(targetYear, monthIndex, date);
  return next;
}

function getOrdinalLabel(day: number) {
  const mod100 = day % 100;
  if (mod100 >= 11 && mod100 <= 13) {
    return `${day}th`;
  }

  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

function getWeekdayPatternLabel(value: Date) {
  const pattern = getWeekdayPattern(value);
  const weekday = WEEKDAY_LABELS[pattern.weekday];

  if (pattern.isLast) {
    return `last ${weekday}`;
  }

  return `${ORDINAL_LABELS[pattern.weekIndex - 1] || `${pattern.weekIndex}th`} ${weekday}`;
}

export function buildEventSeriesSummary({
  startDatetime,
  cadenceLabel,
  occurrenceCount,
}: EventSeriesSummaryInput) {
  if (cadenceLabel === EVENT_SERIES_CADENCE.WEEKLY) {
    return `Every week for ${occurrenceCount} session${occurrenceCount === 1 ? '' : 's'}`;
  }

  if (cadenceLabel === EVENT_SERIES_CADENCE.MONTHLY_DATE) {
    return `Monthly on the ${getOrdinalLabel(startDatetime.getDate())} for ${occurrenceCount} session${occurrenceCount === 1 ? '' : 's'}`;
  }

  if (cadenceLabel === EVENT_SERIES_CADENCE.MONTHLY_WEEKDAY) {
    return `Monthly on the ${getWeekdayPatternLabel(startDatetime)} for ${occurrenceCount} session${occurrenceCount === 1 ? '' : 's'}`;
  }

  return `${occurrenceCount} session${occurrenceCount === 1 ? '' : 's'}`;
}

export function buildEventOccurrences({
  startDatetime,
  endDatetime,
  cadenceLabel,
  occurrenceCount,
}: EventOccurrenceInput) {
  const occurrences = [];

  for (let index = 0; index < occurrenceCount; index += 1) {
    let nextStart = startDatetime;
    let nextEnd = endDatetime;

    if (cadenceLabel === EVENT_SERIES_CADENCE.WEEKLY) {
      nextStart = addDays(startDatetime, index * 7);
      nextEnd = endDatetime ? addDays(endDatetime, index * 7) : null;
    } else if (cadenceLabel === EVENT_SERIES_CADENCE.MONTHLY_DATE) {
      nextStart = addMonthsSameDate(startDatetime, index);
      nextEnd = endDatetime ? addMonthsSameDate(endDatetime, index) : null;
    } else if (cadenceLabel === EVENT_SERIES_CADENCE.MONTHLY_WEEKDAY) {
      nextStart = getMonthlyWeekdayDate(startDatetime, index);
      nextEnd = endDatetime ? getMonthlyWeekdayDate(endDatetime, index) : null;
    }

    occurrences.push({
      startDatetime: nextStart,
      endDatetime: nextEnd,
      seriesPosition: index + 1,
    });
  }

  return occurrences;
}

export function buildSeriesEventPositions(events: EventSeriesPositionInput[]) {
  const sorted = [...events].sort((left, right) => left.startDatetime.getTime() - right.startDatetime.getTime());
  const seriesCount = sorted.length;

  return sorted.map((event, index) => ({
    id: event.id,
    seriesPosition: index + 1,
    seriesCount,
  }));
}

export function getScopedSeriesEventIds(
  events: EventSeriesScopeInput[],
  currentEventId: string,
  scope: 'SINGLE' | 'FUTURE' | 'SERIES'
) {
  if (scope === 'SINGLE') {
    return [currentEventId];
  }

  const currentIndex = events.findIndex((event) => event.id === currentEventId);

  if (currentIndex === -1) {
    return [];
  }

  if (scope === 'SERIES') {
    return events.map((event) => event.id);
  }

  return events.slice(currentIndex).map((event) => event.id);
}
