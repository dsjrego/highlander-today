"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import ImageUpload from "@/components/shared/ImageUpload";

export default function SubmitEventPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    location: "",
    costText: "",
    contactInfo: "",
    imageUrl: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  function handleInputChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!formData.title.trim()) {
      setError("Title is required");
      return;
    }
    if (!formData.startDate) {
      setError("Start date is required");
      return;
    }
    if (!formData.location.trim()) {
      setError("Location is required");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        const validationMessage = Array.isArray(data.details)
          ? data.details
              .map((detail: { message?: string }) => detail.message)
              .filter(Boolean)
              .join(", ")
          : "";
        setError(validationMessage || data.error || "Failed to submit event");
      } else {
        const data = await res.json();
        router.push(`/events/${data.id}`);
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <div
        className="flex items-start justify-between gap-4 mb-8 pb-3 border-b-2"
        style={{ borderColor: "#A51E30" }}
      >
        <div>
          <h1 className="text-2xl font-bold">Submit an Event</h1>
          <p className="text-sm text-gray-500 mt-1">
            Share a local gathering, activity, or public event for community review.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 md:p-8 rounded-xl border border-gray-200 shadow-sm space-y-6"
      >
        {/* Title */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Event Title *
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
            placeholder="Event title"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
            rows={4}
            placeholder="Event description"
          />
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Start Date *
            </label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Start Time
            </label>
            <input
              type="time"
              name="startTime"
              value={formData.startTime}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
            />
          </div>
        </div>

        {/* End Date and Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              End Time
            </label>
            <input
              type="time"
              name="endTime"
              value={formData.endTime}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
            />
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Location *
          </label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
            placeholder="Event location"
          />
        </div>

        {/* Cost */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Cost
          </label>
          <input
            type="text"
            name="costText"
            value={formData.costText}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
            placeholder="Free, $10, donation suggested, etc."
          />
        </div>

        {/* Contact info */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Contact Info
          </label>
          <input
            type="text"
            name="contactInfo"
            value={formData.contactInfo}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
            placeholder="Email, phone number, or organizer contact"
          />
        </div>

        {/* Event Image */}
        <div>
          <ImageUpload
            context="event"
            maxFiles={1}
            value={formData.imageUrl ? [formData.imageUrl] : []}
            onUpload={(image) =>
              setFormData((prev) => ({ ...prev, imageUrl: image.url }))
            }
            onRemove={() =>
              setFormData((prev) => ({ ...prev, imageUrl: "" }))
            }
            label="Event Photo"
            helperText="Add a photo for your event (optional)"
          />
        </div>

        {/* Submit Button */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-[#46A8CC] text-white font-bold py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {isLoading ? "Submitting..." : "Submit Event"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 bg-gray-300 text-gray-800 font-bold py-2 rounded-lg hover:bg-gray-400 transition"
          >
            Cancel
          </button>
        </div>
      </form>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-gray-700">
        <p className="font-semibold mb-2">Event Guidelines:</p>
        <ul className="space-y-1 list-disc list-inside text-xs">
          <li>Provide accurate event details</li>
          <li>Include a clear location</li>
          <li>Be specific about dates and times</li>
          <li>Events may be reviewed before publishing</li>
        </ul>
      </div>
    </div>
  );
}
