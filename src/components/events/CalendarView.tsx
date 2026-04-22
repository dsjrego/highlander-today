'use client';

import React, { useState } from 'react';

interface CalendarEvent {
  date: string;
  title: string;
  id: string;
}

interface CalendarViewProps {
  events: CalendarEvent[];
  onDateSelect: (date: string) => void;
  currentMonth?: Date;
  onMonthChange?: (date: Date) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  onDateSelect,
  currentMonth = new Date(),
  onMonthChange
}) => {
  const [displayMonth, setDisplayMonth] = useState(currentMonth);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const handlePreviousMonth = () => {
    const newDate = new Date(displayMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    setDisplayMonth(newDate);
    onMonthChange?.(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(displayMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    setDisplayMonth(newDate);
    onMonthChange?.(newDate);
  };

  const hasEvent = (day: number): CalendarEvent | undefined => {
    const dateString = `${displayMonth.getFullYear()}-${String(displayMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.find(e => e.date.startsWith(dateString));
  };

  const daysInMonth = getDaysInMonth(displayMonth);
  const firstDay = getFirstDayOfMonth(displayMonth);
  const monthName = displayMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">{monthName}</h2>
        <div className="flex gap-2">
          <button
            onClick={handlePreviousMonth}
            className="px-3 py-2 rounded border border-gray-300 hover:bg-gray-50"
          >
            ← Prev
          </button>
          <button
            onClick={handleNextMonth}
            className="px-3 py-2 rounded border border-gray-300 hover:bg-gray-50"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="space-y-2">
        {/* Day Names */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {dayNames.map((day) => (
            <div
              key={day}
              className="text-center font-semibold text-gray-600 text-sm py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7 gap-2">
            {week.map((day, dayIdx) => {
              const event = day ? hasEvent(day) : undefined;
              const isToday =
                day &&
                displayMonth.getFullYear() === new Date().getFullYear() &&
                displayMonth.getMonth() === new Date().getMonth() &&
                day === new Date().getDate();

              return (
                <div
                  key={dayIdx}
                  className={`relative min-h-20 p-2 rounded border cursor-pointer transition-colors ${
                    !day
                      ? 'bg-gray-50 border-gray-100'
                      : event
                      ? 'border-2 bg-[var(--article-card-badge-bg)] hover:bg-blue-100'
                      : 'border-gray-200 hover:bg-gray-50'
                  } ${isToday ? 'ring-2 ring-blue-400' : ''}`}
                  onClick={() => day && onDateSelect(`${displayMonth.getFullYear()}-${String(displayMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`)}
                >
                  {day && (
                    <>
                      <div className="font-semibold text-sm text-gray-900">{day}</div>
                      {event && (
                        <div className="mt-1">
                          <div
                            className="text-xs font-semibold text-white rounded px-1 py-0.5 line-clamp-1"
                            style={{ backgroundcolor: 'var(--brand-primary)' }}
                          >
                            {event.title}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
