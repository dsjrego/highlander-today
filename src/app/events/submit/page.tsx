"use client";

import { FormEvent, useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import FormCard from "@/components/shared/FormCard";
import ImageUpload from "@/components/shared/ImageUpload";
import InternalPageHeader from "@/components/shared/InternalPageHeader";
import { formatLocationPrimary, formatLocationSearchLabel, formatLocationSecondary } from "@/lib/location-format";

interface LocationOption {
  id: string;
  name: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string | null;
  validationStatus?: string;
}

export default function SubmitEventPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    locationId: "",
    venueLabel: "",
    costText: "",
    contactInfo: "",
    imageUrl: "",
  });
  const [locationForm, setLocationForm] = useState({
    name: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
  });
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [locationQuery, setLocationQuery] = useState("");
  const [showCreateLocation, setShowCreateLocation] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [locationDuplicates, setLocationDuplicates] = useState<LocationOption[]>([]);
  const [isCreatingLocation, setIsCreatingLocation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchLocations() {
      setIsLoadingLocations(true);
      try {
        const res = await fetch(`/api/locations${locationQuery.trim() ? `?query=${encodeURIComponent(locationQuery.trim())}` : ""}`);
        if (res.ok) {
          const data = await res.json();
          setLocations(data.locations || []);
        }
      } catch (err) {
        console.error("Failed to fetch locations:", err);
      } finally {
        setIsLoadingLocations(false);
      }
    }

    void fetchLocations();
  }, [locationQuery]);

  function handleInputChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleLocationFormChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setLocationForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function createLocation(forceCreate = false) {
    setLocationError("");
    setLocationDuplicates([]);

    if (!locationForm.addressLine1.trim() || !locationForm.city.trim() || !locationForm.state.trim()) {
      setLocationError("Address line 1, city, and state are required.");
      return;
    }

    setIsCreatingLocation(true);

    try {
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...locationForm,
          forceCreate,
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        setLocationError(data.error || "Possible duplicate location found.");
        setLocationDuplicates(data.duplicates || []);
        return;
      }

      if (!res.ok) {
        const validationMessage = Array.isArray(data.details)
          ? data.details
              .map((detail: { message?: string }) => detail.message)
              .filter(Boolean)
              .join(", ")
          : "";
        throw new Error(validationMessage || data.error || "Failed to create location");
      }

      setLocations((prev) => [data.location, ...prev]);
      setFormData((prev) => ({ ...prev, locationId: data.location.id }));
      setLocationForm({
        name: "",
        addressLine1: "",
        addressLine2: "",
        city: "",
        state: "",
        postalCode: "",
      });
      setLocationQuery("");
      setShowCreateLocation(false);
    } catch (err) {
      setLocationError(err instanceof Error ? err.message : "Failed to create location");
    } finally {
      setIsCreatingLocation(false);
    }
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
    if (!formData.locationId) {
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

  const selectedLocation = locations.find((location) => location.id === formData.locationId) || null;

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
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div>
              <ImageUpload
                context="event"
                maxFiles={1}
                singleCard
                value={formData.imageUrl ? [formData.imageUrl] : []}
                onUpload={(image) =>
                  setFormData((prev) => ({ ...prev, imageUrl: image.url }))
                }
                onRemove={() =>
                  setFormData((prev) => ({ ...prev, imageUrl: "" }))
                }
                label="Event Photo"
                labelClassName="form-label"
                helperText="Optional hero-style image."
              />
            </div>

            <div className="space-y-6">
              <div>
                <label className="form-label">Event Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
                  placeholder="Event title"
                />
              </div>

              <div>
                <label className="form-label">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
                  rows={4}
                  placeholder="Event description"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="form-label">Start Date *</label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
                  />
                </div>
                <div>
                  <label className="form-label">Start Time</label>
                  <input
                    type="time"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="form-label">End Date</label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
                  />
                </div>
                <div>
                  <label className="form-label">End Time</label>
                  <input
                    type="time"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
                  />
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 md:flex-row">
                  <input
                    type="text"
                    value={locationQuery}
                    onChange={(event) => setLocationQuery(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
                    placeholder="Search venues or addresses"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreateLocation((current) => !current)}
                    className="btn btn-neutral"
                  >
                    {showCreateLocation ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    Location
                  </button>
                </div>

                <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2">
                  {isLoadingLocations ? (
                    <div className="rounded-lg px-3 py-2 text-sm text-slate-500">Loading locations...</div>
                  ) : locations.length > 0 ? (
                    locations.map((location) => (
                      <button
                        key={location.id}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, locationId: location.id }))}
                        className={`flex w-full items-start justify-between rounded-lg px-3 py-2 text-left text-sm ${
                          formData.locationId === location.id
                            ? "bg-slate-950 text-white"
                            : "text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <span>
                          <span className="block font-semibold">{formatLocationPrimary(location)}</span>
                          <span className="block text-xs opacity-75">{formatLocationSecondary(location)}</span>
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-lg px-3 py-2 text-sm text-slate-500">No locations found.</div>
                  )}
                </div>

                {selectedLocation ? (
                  <p className="text-sm text-slate-600">
                    Selected: <span className="font-semibold text-slate-900">{formatLocationSearchLabel(selectedLocation)}</span>
                  </p>
                ) : null}

                {showCreateLocation ? (
                  <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
                    {locationError ? (
                      <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-red-700">
                        {locationError}
                      </div>
                    ) : null}
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <input
                        type="text"
                        name="name"
                        value={locationForm.name}
                        onChange={handleLocationFormChange}
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
                        placeholder="Venue name (optional)"
                      />
                      <input
                        type="text"
                        name="addressLine1"
                        value={locationForm.addressLine1}
                        onChange={handleLocationFormChange}
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
                        placeholder="Address line 1"
                      />
                      <input
                        type="text"
                        name="addressLine2"
                        value={locationForm.addressLine2}
                        onChange={handleLocationFormChange}
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
                        placeholder="Address line 2"
                      />
                      <input
                        type="text"
                        name="city"
                        value={locationForm.city}
                        onChange={handleLocationFormChange}
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
                        placeholder="City"
                      />
                      <input
                        type="text"
                        name="state"
                        value={locationForm.state}
                        onChange={handleLocationFormChange}
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
                        placeholder="State"
                      />
                      <input
                        type="text"
                        name="postalCode"
                        value={locationForm.postalCode}
                        onChange={handleLocationFormChange}
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
                        placeholder="Postal code"
                      />
                    </div>

                    {locationDuplicates.length > 0 ? (
                      <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                        <p className="text-sm font-semibold text-amber-900">Possible duplicates</p>
                        {locationDuplicates.map((location) => (
                          <button
                            key={location.id}
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, locationId: location.id }))}
                            className="block w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-left text-sm text-slate-700"
                          >
                            {formatLocationSearchLabel(location)}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => createLocation(true)}
                          className="rounded-xl border border-amber-300 px-4 py-3 text-sm font-bold text-amber-900 transition hover:bg-amber-100"
                        >
                          Create Anyway
                        </button>
                      </div>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => createLocation()}
                      disabled={isCreatingLocation}
                      className="rounded-xl bg-slate-950 px-4 py-3 font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                    >
                      {isCreatingLocation ? "Creating..." : "Create Location"}
                    </button>
                  </div>
                ) : null}
              </div>
              <div>
                <label className="form-label">Venue Label</label>
                <input
                  type="text"
                  name="venueLabel"
                  value={formData.venueLabel}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
                  placeholder="Main Hall, Pavilion, Rear Entrance"
                />
              </div>

              <div>
                <label className="form-label">Cost</label>
                <input
                  type="text"
                  name="costText"
                  value={formData.costText}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
                  placeholder="Free, $10, donation suggested, etc."
                />
              </div>

              <div>
                <label className="form-label">Contact Info</label>
                <input
                  type="text"
                  name="contactInfo"
                  value={formData.contactInfo}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
                  placeholder="Email, phone number, or organizer contact"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
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
          <li>Choose or create a specific reusable venue/location</li>
          <li>Be specific about dates and times</li>
          <li>Events may be reviewed before publishing</li>
        </ul>
      </div>
    </div>
  );
}
