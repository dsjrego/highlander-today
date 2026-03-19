"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

interface Event {
  id: string;
  title: string;
  description: string | null;
  startDatetime: string;
  endDatetime: string | null;
  locationText: string | null;
  photoUrl: string | null;
  costText: string | null;
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

  return (
    <div>
      <div className="flex justify-between items-center gap-4 mb-8 pb-3 border-b-2" style={{ borderColor: "#A51E30" }}>
        <div>
          <h1 className="text-2xl font-bold">Events</h1>
          <p className="text-sm text-gray-500 mt-1">Community happenings, gatherings, and local activities.</p>
        </div>
        <div className="flex items-center gap-2">
          {session?.user && (
            <Link
              href="/events/submit"
              className="px-4 py-2 text-white text-sm font-semibold rounded-full hover:opacity-90 transition"
              style={{ backgroundColor: "#A51E30" }}
            >
              + Submit Event
            </Link>
          )}
          <button
            onClick={() => setViewMode("list")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              viewMode === "list" ? "text-white" : "bg-white text-gray-600 shadow-sm hover:shadow-md"
            }`}
            style={viewMode === "list" ? { backgroundColor: "#A51E30" } : {}}
          >
            List View
          </button>
          <button
            onClick={() => setViewMode("calendar")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              viewMode === "calendar" ? "text-white" : "bg-white text-gray-600 shadow-sm hover:shadow-md"
            }`}
            style={viewMode === "calendar" ? { backgroundColor: "#A51E30" } : {}}
          >
            Calendar View
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-center text-gray-500">Loading events...</p>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="text-6xl mb-4">📅</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">No published events yet</h2>
          <p className="text-gray-500 max-w-md mx-auto mb-6">
            Upcoming community events will appear here as they are reviewed and published.
          </p>
          {session?.user && (
            <Link
              href="/events/submit"
              className="inline-block px-6 py-3 text-white font-semibold rounded-full hover:opacity-90 transition"
              style={{ backgroundColor: "#A51E30" }}
            >
              Submit the First Event
            </Link>
          )}
        </div>
      ) : viewMode === "calendar" ? (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Previous
            </button>
            <h2 className="text-2xl font-bold">
              {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h2>
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Next
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center font-bold text-sm py-2 bg-gray-100">
                {day}
              </div>
            ))}
            {calendarDays.map((day, index) => {
              const dayEvents = day ? eventsByDay[day] || [] : [];

              return (
                <div
                  key={index}
                  className={`border rounded-lg p-2 min-h-28 text-sm ${
                    day ? "bg-white hover:bg-gray-50" : "bg-gray-50"
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
                            className="block bg-[#46A8CC] text-white rounded px-2 py-1 truncate text-xs"
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
              className="group block bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200 border-l-4"
              style={{ borderColor: "#A51E30" }}
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
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h2 className="text-xl font-bold group-hover:text-[#46A8CC] transition-colors">{event.title}</h2>
                    <span className="text-xs font-medium px-3 py-1 rounded-full text-white flex-shrink-0" style={{ backgroundColor: "#A51E30" }}>
                      {new Date(event.startDatetime).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  {event.description && <p className="text-gray-500 text-sm mb-3 line-clamp-2">{event.description}</p>}
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    <span>
                      {new Date(event.startDatetime).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                    {event.locationText && <span>{event.locationText}</span>}
                    {event.costText && <span>{event.costText}</span>}
                    <span>
                      {event.submittedBy.firstName} {event.submittedBy.lastName}
                    </span>
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
