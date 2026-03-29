export const ORGANIZATION_GROUP_OPTIONS = [
  { value: 'BUSINESS', label: 'Business' },
  { value: 'GOVERNMENT', label: 'Government' },
  { value: 'ORGANIZATION', label: 'Organization' },
] as const;

export const ORGANIZATION_TYPE_OPTIONS = {
  BUSINESS: [
    { value: 'AUTOMOTIVE', label: 'Automotive' },
    { value: 'ENTERTAINMENT', label: 'Entertainment' },
    { value: 'FOOD_AND_DRINK', label: 'Food & Drink' },
    { value: 'HEALTH_AND_WELLNESS', label: 'Health & Wellness' },
    { value: 'HOME_SERVICES', label: 'Home Services' },
    { value: 'HOSPITALITY', label: 'Hospitality' },
    { value: 'PROFESSIONAL_SERVICES', label: 'Professional Services' },
    { value: 'REAL_ESTATE', label: 'Real Estate' },
    { value: 'RETAIL', label: 'Retail' },
  ],
  GOVERNMENT: [
    { value: 'BOROUGH', label: 'Borough' },
    { value: 'TOWNSHIP', label: 'Township' },
    { value: 'COUNTY_OFFICE', label: 'County Office' },
    { value: 'COURT_LEGAL', label: 'Court / Legal' },
    { value: 'FIRE_EMS', label: 'Fire / EMS' },
    { value: 'LIBRARY', label: 'Library' },
    { value: 'MUNICIPAL_AUTHORITY', label: 'Municipal Authority' },
    { value: 'PARKS_RECREATION', label: 'Parks / Recreation' },
    { value: 'POLICE', label: 'Police' },
    { value: 'SCHOOL_DISTRICT', label: 'School District' },
    { value: 'PUBLIC_WORKS', label: 'Public Works' },
  ],
  ORGANIZATION: [
    { value: 'ARTS_CULTURE', label: 'Arts / Culture' },
    { value: 'CIVIC_ASSOCIATION', label: 'Civic Association' },
    { value: 'COMMUNITY_GROUP', label: 'Community Group' },
    { value: 'HEALTHCARE', label: 'Healthcare' },
    { value: 'NONPROFIT', label: 'Nonprofit' },
    { value: 'RELIGIOUS', label: 'Religious' },
    { value: 'SCHOOL_EDUCATION', label: 'School / Education' },
    { value: 'SPORTS_RECREATION', label: 'Sports / Recreation' },
  ],
} as const;

export type OrganizationDirectoryGroup = keyof typeof ORGANIZATION_TYPE_OPTIONS;

export function isValidOrganizationType(
  group: string,
  type: string
): boolean {
  return group in ORGANIZATION_TYPE_OPTIONS
    ? ORGANIZATION_TYPE_OPTIONS[group as OrganizationDirectoryGroup].some((option) => option.value === type)
    : false;
}
