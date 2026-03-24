# Highlander Today — Directory Plan

> **Status:** Product/data-model planning only. Not implemented.
> **Purpose:** Define how the directory should work for individuals and organizations without weakening the platform's trust and privacy model.

---

## Product Intent

The directory is intended to function as a local white-pages/yellow-pages layer for the community:

- help residents discover people who choose to be discoverable
- help residents discover organizations, businesses, churches, nonprofits, schools, and civic groups
- keep outreach inside the platform's existing trust, moderation, and messaging systems

The directory is not intended to become an open social graph or a public contact-data dump.

---

## Core Rules

### People directory

- Person listings are opt-in only.
- No public phone number.
- No public street address.
- Contact happens through the platform messaging system only.
- Only `TRUSTED` users may initiate messages.
- `REGISTERED` and `ANONYMOUS` users cannot initiate messages.
- A listed person cannot opt out of the trusted-only messaging rule.

### Organization directory

- Organizations may be listed publicly once approved.
- Organizations can decide whether to display a public member roster.
- Organization membership is not shown on the person's directory entry.
- Public affiliation visibility flows from the organization page only, not from the user page.

### Trust and privacy separation

- Trust level determines who is allowed to interact.
- Directory opt-in determines whether a person is discoverable.
- Organization publication settings determine whether member names appear on an organization page.

---

## Recommended Model Direction

Use three distinct concepts:

1. `User`
   The real identity/account record for a person.

2. `Organization`
   A first-class model for businesses, nonprofits, schools, churches, clubs, government offices, and similar entities.

3. `OrganizationMembership`
   A join model between `User` and `Organization` with membership roles and statuses.

Do not start with a generic `DirectoryEntry` abstraction. Use explicit person and organization models, then unify them in the directory search/view layer.

---

## Person Listing Recommendation

Keep people listings as an extension of the existing `User` profile rather than a separate identity model.

Suggested fields or equivalent:

- `isDirectoryListed`
- `directoryHeadline`
- `directorySummary`
- `directoryTags`
- `directoryNeighborhood`
- `directoryVisibility`

The public listing should remain minimal and should reuse the existing conversation flow for contact.

---

## Organization Recommendation

The current `Store` + `StoreMember` structure is a narrow organization pattern tied to commerce. It should not be treated as the general directory abstraction.

Add a dedicated `Organization` model for the broader civic/business/community use case, and a dedicated `OrganizationMembership` model for role-based membership.

Recommended principle:

- every organization must have at least one accountable trusted individual attached to it

This preserves the platform's identity and accountability model.

---

## Visibility Rules

### User page / person directory card

- Shows only opt-in directory information
- Does not show organization memberships
- Offers messaging only through the internal messaging system

### Organization page

- Shows organization details and category
- May show approved/public member roster if the organization enables it
- May identify selected member roles such as owner, leader, pastor, board member, or staff

---

## Messaging Rules

- Messaging rights are platform-wide trust rules, not per-user directory preferences.
- Directory presence does not grant messaging rights to untrusted users.
- Existing block, moderation, and audit behaviors should continue to apply.

---

## Implementation Notes

- Add a dedicated `/directory` experience with separate people and organization results.
- Reuse the existing messaging flow for contact initiation.
- Treat organization member-roster publication as an organization-level moderation/publication decision.
- Keep user affiliation privacy conservative by default.

---

## Current Decision Summary

- People directory is opt-in.
- No public phone or address for people.
- Trusted users only can initiate messages.
- Registered and anonymous users cannot message.
- Organization memberships are not shown on a user's directory listing.
- Organizations may choose to display members on the organization page.
- Organizations should always have at least one accountable trusted individual attached.
