const STREET_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bSTREET\b/g, 'ST'],
  [/\bROAD\b/g, 'RD'],
  [/\bAVENUE\b/g, 'AVE'],
  [/\bBOULEVARD\b/g, 'BLVD'],
  [/\bDRIVE\b/g, 'DR'],
  [/\bLANE\b/g, 'LN'],
  [/\bCOURT\b/g, 'CT'],
  [/\bPLACE\b/g, 'PL'],
  [/\bHIGHWAY\b/g, 'HWY'],
  [/\bNORTH\b/g, 'N'],
  [/\bSOUTH\b/g, 'S'],
  [/\bEAST\b/g, 'E'],
  [/\bWEST\b/g, 'W'],
];

export interface LocationAddressInput {
  addressLine1: string;
  city: string;
  state: string;
  postalCode?: string | null;
  countryCode?: string | null;
}

export function normalizeAddressPart(value: string) {
  let normalized = value
    .toUpperCase()
    .replace(/[.,#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  for (const [pattern, replacement] of STREET_REPLACEMENTS) {
    normalized = normalized.replace(pattern, replacement);
  }

  return normalized;
}

export function buildNormalizedAddressKey(input: LocationAddressInput) {
  return [
    normalizeAddressPart(input.addressLine1),
    normalizeAddressPart(input.city),
    normalizeAddressPart(input.state),
    normalizeAddressPart(input.postalCode || ''),
    normalizeAddressPart(input.countryCode || 'US'),
  ]
    .filter(Boolean)
    .join('|');
}
