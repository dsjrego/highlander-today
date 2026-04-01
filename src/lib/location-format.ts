export interface LocationDisplay {
  name?: string | null;
  addressLine1: string;
  city: string;
  state: string;
  postalCode?: string | null;
}

export function formatLocationPrimary(location: LocationDisplay, venueLabel?: string | null) {
  return venueLabel || location.name || location.addressLine1;
}

export function formatLocationSecondary(location: LocationDisplay) {
  return [location.addressLine1, `${location.city}, ${location.state}`, location.postalCode]
    .filter(Boolean)
    .join(' • ');
}

export function formatLocationSearchLabel(location: LocationDisplay) {
  return [
    location.name,
    location.addressLine1,
    `${location.city}, ${location.state}`,
    location.postalCode,
  ]
    .filter(Boolean)
    .join(' • ');
}
