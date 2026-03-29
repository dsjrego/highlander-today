# Highlander Today — Directory Plan

> **Status:** Product/data-model planning only. Not implemented.
> **Purpose:** Define how the directory should work for individuals and organizations without weakening the platform's trust and privacy model.

---

## Product Intent

The directory is intended to function as a local white-pages/yellow-pages layer for the community:

- help residents discover people who choose to be discoverable
- help residents discover organizations, businesses, churches, nonprofits, schools, government offices, and civic groups
- keep outreach inside the platform's existing trust, moderation, and messaging systems

The directory is not intended to become an open social graph or a public contact-data dump.

At the model level, the directory is not its own core entity. It is a grouped discovery layer over people and organizations.

The directory should also become a managed local presence layer:

- organizations should be able to add themselves
- organizations should be able to claim and maintain their own listing
- Highlander Today should verify, moderate, and structure the information rather than manually owning all of it

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

At the model level:

- `Directory` is only a grouping/discovery layer
- people come from the existing `User` model
- non-people come from a dedicated `Organization` model
- the user-to-organization relationship lives in `OrganizationMembership`

Use three distinct concepts:

1. `User`
   The real identity/account record for a person.

2. `Organization`
   A first-class model for businesses, government entities, nonprofits, schools, churches, clubs, and similar non-person entities.

3. `OrganizationMembership`
   The relationship model between `User` and `Organization`, with membership roles and statuses.

Do not start with a generic `DirectoryEntry` abstraction. Use explicit person and organization models, then unify them in the directory search/view layer.

Recommended classification approach:

- Keep one broad non-person entity model: `Organization`
- Add a high-level `directoryGroup` for browse/navigation
- Add a more specific `organizationType` for subtype filtering and rendering

Classification rule:

- `Business`, `Government`, and other organization classes should be modeled as classifications on `Organization`
- they should not begin as separate primary models

Recommended initial `directoryGroup` values:

- `PEOPLE`
- `BUSINESS`
- `GOVERNMENT`
- `ORGANIZATION`

Important distinction:

- `Government` should be a prominent top-level browse group in the UI
- `Government` does not need a completely separate core model from other organizations
- This matters because Highlander Today spans multiple boroughs and townships, so civic discovery needs stronger visibility than a buried subtype would provide

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

Communication rule for people:

- directory communication with people happens only through the built-in messaging system
- no public phone number
- no public street address

---

## Organization Recommendation

The current `Store` + `StoreMember` structure is a narrow organization pattern tied to commerce. It should not be treated as the general directory abstraction.

Add a dedicated `Organization` model for the broader civic/business/community use case, and a dedicated `OrganizationMembership` model for role-based membership.

Recommended principle:

- every organization must have at least one accountable trusted individual attached to it

This preserves the platform's identity and accountability model.

Recommended supporting child records for v1/v1.5:

- `OrganizationLocation`
- `OrganizationDepartment`
- `OrganizationContact`
- `OrganizationMembership`

This allows a borough, township, church, nonprofit, school, or business to maintain richer structured information without forcing all organizations into the same flat card.

Example:

- A borough organization can maintain departments, office contacts, hours, locations, and service links
- A church can maintain ministries, service times, and contact points
- A nonprofit can maintain programs and public contacts
- A business can maintain locations, hours, and service lines

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

### Browse structure

Recommended initial public browse groups:

- `People`
- `Businesses`
- `Government`
- `Organizations`

### Initial filter direction

Start simple:

- one text search input
- `directoryGroup` filter
- subtype/type filter for non-person entries
- municipality/service-area filter
- optional A-Z browse support

Recommended search behavior:

- `People`: name-focused, especially last-name usefulness
- `Businesses`: business-name focused
- `Government`: organization-name and office/department focused
- `Organizations`: organization-name focused

Avoid forcing users to choose separate search modes when one text search plus filters can cover the need more cleanly.

### Initial subtype direction

People:

- no heavy subtype requirement in v1

Businesses:

- `Retail`
- `FoodAndDrink`
- `ProfessionalServices`
- `HomeServices`
- `HealthAndWellness`
- `Automotive`
- `RealEstate`
- `Hospitality`
- `Entertainment`

Government:

- `Borough`
- `Township`
- `CountyOffice`
- `MunicipalAuthority`
- `Police`
- `FireEMS`
- `Library`
- `SchoolDistrict`
- `PublicWorks`
- `CourtLegal`
- `ParksRecreation`

Organizations:

- `Religious`
- `Nonprofit`
- `SchoolEducation`
- `CommunityGroup`
- `CivicAssociation`
- `SportsRecreation`
- `ArtsCulture`
- `Healthcare`

Subtypes apply to both businesses and organizations, but they should come from separate subtype families rather than one shared universal list.

### Submission and management model

The directory should be self-service with moderation:

1. An organization submits itself or claims an existing listing.
2. The submitter identifies the organization type and core details.
3. The submitter becomes the initial pending manager.
4. Staff reviews the listing and verifies the relationship if needed.
5. Once approved, the organization can manage its own public directory presence.

Recommended governance rules:

- organizations should add themselves whenever possible
- organizations should be able to claim an existing listing
- one or more trusted accountable individuals should be attached as managers
- new listings should require approval before publication
- ownership claims should require approval
- major edits should be reviewable
- minor edits may eventually be streamlined for verified managers

This keeps the directory current without requiring Highlander Today staff to manually own every profile.

---

## Current Decision Summary

- `Directory` is only a grouped discovery layer, not a separate core model.
- People directory is opt-in.
- People in the directory come from the existing `User` model.
- No public phone or address for people.
- Trusted users only can initiate messages.
- Registered and anonymous users cannot message.
- Organizations in the directory should come from a dedicated `Organization` model.
- `Business`, `Government`, and other non-person categories should be classifications on `Organization`, not separate top-level models.
- `OrganizationMembership` is the `User <-> Organization` relationship model.
- Organization memberships are not shown on a user's directory listing.
- Organizations may choose to display members on the organization page.
- Organizations should always have at least one accountable trusted individual attached.
- The public directory should initially browse by `People`, `Businesses`, `Government`, and `Organizations`.
- `Government` should be singled out in the UI for discoverability, even if it remains part of the broader organization model.
- Organizations should be able to submit and manage their own listings.
- Government entities should be supported as structured organizations with multiple departments, contacts, and details.
- Business and organization subtypes should be separate subtype families.
