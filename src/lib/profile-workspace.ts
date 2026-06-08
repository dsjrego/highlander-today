export type ProfileWorkspaceNavItem = {
  href: string;
  label: string;
};

export type ProfileWorkspaceNavSection = {
  title: string;
  items: ReadonlyArray<ProfileWorkspaceNavItem>;
};

export function getProfileWorkspaceSections(profileId: string): ReadonlyArray<ProfileWorkspaceNavSection> {
  const baseHref = `/profile/${profileId}/workspace`;

  return [
    {
      title: 'Workspace',
      items: [
        { href: baseHref, label: 'Overview' },
        { href: `${baseHref}/organizations`, label: 'Organizations' },
        { href: `${baseHref}/events`, label: 'Events' },
        { href: `${baseHref}/articles`, label: 'Articles' },
      ],
    },
    {
      title: 'Account',
      items: [
        { href: `/profile/${profileId}`, label: 'Public Profile' },
        { href: `${baseHref}/account`, label: 'Account Settings' },
      ],
    },
  ];
}
