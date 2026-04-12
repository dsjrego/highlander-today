/* eslint-disable @next/next/no-img-element */

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Calendar, List, Plus } from "lucide-react";
import InternalPageHeader from "@/components/shared/InternalPageHeader";
import { formatLocationPrimary } from "@/lib/location-format";

interface Event {
  id: string;
  title: string;
  description: string | null;
  startDatetime: string;
  endDatetime: string | null;
  seriesPosition: number | null;
  seriesCount: number | null;
  venueLabel: string | null;
  series: {
    id: string;
    summary: string | null;
    occurrenceCount: number;
  } | null;
  location: {
    id: string;
    name: string | null;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    postalCode: string | null;
  };
  photoUrl: string | null;
  costText: string | null;
  organization: {
    id: string;
    name: string;
    slug: string;
    status: string;
  };
  submittedBy: {
    id: string;
    firstName: string;
    lastName: string;
    profilePhotoUrl: string | null;
  };
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function EventsPage() {
  const { data: session } = useSession();
  const [events, setEvents] = useState<Event[]>([]);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("list");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/events?limit=100");
        if (res.ok) {
          const data = await res.json();
          setEvents(data.events || []);
        }
      } catch (err) {
        console.error("Failed to fetch events:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchEvents();
  }, []);

  const monthEvents = useMemo(() => {
    return events.filter((event) => {
      const eventDate = new Date(event.startDatetime);
      return (
        eventDate.getFullYear() === currentMonth.getFullYear() &&
        eventDate.getMonth() === currentMonth.getMonth()
      );
    });
  }, [events, currentMonth]);

  const eventsByDay = useMemo(() => {
    return monthEvents.reduce<Record<number, Event[]>>((acc, event) => {
      const day = new Date(event.startDatetime).getDate();
      if (!acc[day]) acc[day] = [];
      acc[day].push(event);
      return acc;
    }, {});
  }, [monthEvents]);

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const calendarDays = [];
  const firstDay = getFirstDayOfMonth(currentMonth);
  const daysInMonth = getDaysInMonth(currentMonth);

  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  const headerActionClassName =
    "crud-action-button rounded-full border px-4 py-2 text-sm font-semibold transition";
  const activeHeaderActionClassName =
    "border-white bg-white text-slate-950";
  const inactiveHeaderActionClassName =
    "border-white/14 bg-white/8 text-white/80 hover:bg-white/12 hover:text-white";

  return (
    <div className="space-y-8">
      <InternalPageHeader
        title="Events"
        titleClassName="text-white"
        actions={
          <>
            {session?.user && (
              <Link
                href="/events/submit"
                aria-label="Add event"
                title="Add event"
                className={`${headerActionClassName} border-white bg-white text-slate-950 hover:opacity-90`}
              >
                <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
              </Link>
            )}
            <button
              onClick={() => setViewMode("list")}
              aria-label="List view"
              title="List view"
              className={`${headerActionClassName} ${
                viewMode === "list"
                  ? activeHeaderActionClassName
                  : inactiveHeaderActionClassName
              }`}
            >
              <List className="h-4 w-4 shrink-0" aria-hidden="true" />
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              aria-label="Calendar view"
              title="Calendar view"
              className={`${headerActionClassName} ${
                viewMode === "calendar"
                  ? activeHeaderActionClassName
                  : inactiveHeaderActionClassName
              }`}
            >
              <Calendar className="h-4 w-4 shrink-0" aria-hidden="true" />
            </button>
          </>
        }
      />
      <p className="page-intro-copy max-w-3xl text-sm leading-7">
        Find what&apos;s happening around Cambria Heights, switch between list and calendar
        views, and submit events that deserve a local audience.
      </p>

      {isLoading ? (
        <div className="rounded-[28px] border border-white/10 bg-white/70 px-6 py-12 text-center text-slate-500 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
          Loading events...
        </div>
      ) : events.length === 0 ? (
        <div className="events-empty-state p-12 text-center">
          <p className="events-empty-state-label mb-4 text-xs font-semibold uppercase tracking-[0.32em]">Events</p>
          <h2 className="empty-state-title mb-2">No published events yet</h2>
          <p className="empty-state-copy mx-auto mb-6 max-w-md">
            Upcoming community events will appear here as they are reviewed and published.
          </p>
          {session?.user && (
            <Link
              href="/events/submit"
              className="crud-action-button inline-flex rounded-full bg-white px-6 py-3 font-semibold text-slate-950 transition hover:opacity-90"
            >
              <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="crud-action-label">Event</span>
            </Link>
          )}
        </div>
      ) : viewMode === "calendar" ? (
        <div className="rounded-[28px] border border-white/10 bg-white/82 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
            >
              Previous
            </button>
            <h2 className="text-2xl font-black tracking-[-0.03em] text-slate-950">
              {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h2>
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
            >
              Next
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="rounded-xl bg-slate-100 py-2 text-center text-sm font-bold text-slate-600">
                {day}
              </div>
            ))}
            {calendarDays.map((day, index) => {
              const dayEvents = day ? eventsByDay[day] || [] : [];

              return (
                <div
                  key={index}
                  className={`min-h-28 rounded-2xl border p-2 text-sm ${
                    day ? "border-slate-200 bg-white hover:bg-slate-50" : "border-slate-100 bg-slate-50"
                  }`}
                >
                  {day && (
                    <>
                      <div className="font-bold text-gray-800 mb-1">{day}</div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 2).map((event) => (
                          <Link
                            key={event.id}
                            href={`/events/${event.id}`}
                            className="block truncate rounded-lg bg-[#0f5771] px-2 py-1 text-xs text-white"
                          >
                            {event.title}
                          </Link>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-xs text-gray-500">+{dayEvents.length - 2} more</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="group block rounded-[26px] border border-white/10 bg-white/82 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_24px_55px_rgba(15,23,42,0.12)]"
            >
              <div className="flex gap-6">
                {event.photoUrl && (
                  <img
                    src={event.photoUrl}
                    alt={event.title}
                    className="w-28 h-28 object-cover rounded-xl flex-shrink-0"
                  />
                )}
                <div className="flex-1">
                  {event.seriesCount ? (
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                      Session {event.seriesPosition} of {event.seriesCount}
                      {event.series?.summary ? ` • ${event.series.summary}` : ''}
                    </p>
                  ) : null}
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h2 className="text-xl font-bold text-slate-950 transition-colors group-hover:text-[#8f1d2c]">{event.title}</h2>
                    <span className="flex-shrink-0 rounded-full bg-[#8f1d2c] px-3 py-1 text-xs font-medium text-white">
                      {new Date(event.startDatetime).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  {event.description && <p className="mb-3 line-clamp-2 text-sm leading-7 text-slate-600">{event.description}</p>}
                  <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                    <span>
                      {new Date(event.startDatetime).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                    <span>{formatLocationPrimary(event.location, event.venueLabel)}</span>
                    {event.costText && <span>{event.costText}</span>}
                    <span>{event.organization.name}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
