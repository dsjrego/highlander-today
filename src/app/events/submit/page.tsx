"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import FormCard from "@/components/shared/FormCard";
import ImageUpload from "@/components/shared/ImageUpload";
import InternalPageHeader from "@/components/shared/InternalPageHeader";

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
    <div className="space-y-8">
      <InternalPageHeader title="Events" titleClassName="text-white" />
      <p className="max-w-3xl text-sm leading-7 text-slate-500">
        Share a local gathering, activity, or public event for community review.
      </p>

      {error && (
        <div className="rounded-xl border border-red-400 bg-red-100 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      <FormCard>
        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
        {/* Title */}
        <div>
          <label className="mb-2 block text-sm font-bold text-slate-700">
            Event Title *
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
            placeholder="Event title"
          />
        </div>

        {/* Description */}
        <div>
          <label className="mb-2 block text-sm font-bold text-slate-700">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
            rows={4}
            placeholder="Event description"
          />
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Start Date *
            </label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleInputChange}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Start Time
            </label>
            <input
              type="time"
              name="startTime"
              value={formData.startTime}
              onChange={handleInputChange}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
            />
          </div>
        </div>

        {/* End Date and Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              End Date
            </label>
            <input
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleInputChange}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              End Time
            </label>
            <input
              type="time"
              name="endTime"
              value={formData.endTime}
              onChange={handleInputChange}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
            />
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="mb-2 block text-sm font-bold text-slate-700">
            Location *
          </label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleInputChange}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
            placeholder="Event location"
          />
        </div>

        {/* Cost */}
        <div>
          <label className="mb-2 block text-sm font-bold text-slate-700">
            Cost
          </label>
          <input
            type="text"
            name="costText"
            value={formData.costText}
            onChange={handleInputChange}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
            placeholder="Free, $10, donation suggested, etc."
          />
        </div>

        {/* Contact info */}
        <div>
          <label className="mb-2 block text-sm font-bold text-slate-700">
            Contact Info
          </label>
          <input
            type="text"
            name="contactInfo"
            value={formData.contactInfo}
            onChange={handleInputChange}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
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
            className="flex-1 rounded-xl bg-slate-950 py-3 font-bold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {isLoading ? "Submitting..." : "Submit Event"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 rounded-xl border border-slate-300 py-3 font-bold text-slate-800 transition hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
        </form>
      </FormCard>

      <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(160deg,rgba(17,34,52,0.97),rgba(8,20,33,0.97))] p-4 text-sm text-white shadow-[0_24px_55px_rgba(7,17,26,0.18)]">
        <p className="mb-2 font-semibold text-cyan-100/74">Event Guidelines</p>
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
