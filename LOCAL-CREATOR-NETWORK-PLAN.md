# Local Creator Network Plan

## Purpose

This document captures the direction for a Highlander Today local creator and shows network: a trusted discovery and distribution system for local podcasters, video creators, educators, musicians, churches, civic broadcasters, interview hosts, and other community media creators.

The goal is not to imitate YouTube, TikTok, or a generic influencer platform. The goal is to build local media infrastructure: a place where people can discover recurring local programming, where creators can build durable community audiences, and where Highlander can eventually support creator monetization and a broader web-to-TV distribution model.

## Discovery Problem Validation

Early conversations with two local podcasters confirmed the core assumption behind this direction. When asked how people find their shows, both described essentially the same experience: they publish episodes, share links when they can, and hope people find them and come back. Neither had any meaningful discovery infrastructure working for them.

This is not a personal failure on their part. It is a structural problem with the platforms they publish on. YouTube's recommendation algorithm is optimized for global watch time, so a local interview show about Cambria Heights history competes for recommendation slots against every piece of content on the internet. It will never win that fight. The algorithm does not care that the content is deeply relevant to a local audience — it only cares that it is irrelevant to a global one. Podcast directories like Apple Podcasts and Spotify are organized by genre, not by geography. There is no "Cambria County" category. A local podcast is just another drop in an ocean of millions of shows, discoverable only by people who already know to search for it by name.

Highlander solves this because local relevance is the default discovery axis. When someone in Cambria Heights browses the programming rails, every show they see is local. The discovery problem vanishes — not because of a clever algorithm, but because the scope is right. The audience and the content are already in the same place. The platform just connects them.

The pitch to local creators: you already make the content; we put it in front of your actual community. You stop hoping people find you and start building an audience that is already here.

## Core Framing

This should be described as a local creator and shows network, not an influencer feed.

Highlander should not optimize for addictive short-form engagement, vanity metrics, or national-scale virality. It should optimize for:

- local discoverability
- recurring programming
- accountable creators
- durable audience relationships
- category-based browsing
- future web/mobile/connected-TV distribution

In product terms, this is closer to a community-rooted media network than a social video app.

## What Content Fits

The system should support a broad range of local and regional programming types, including:

- podcasts
- interview shows
- local music sessions
- educational and instructional programs
- church and faith broadcasts
- school and booster content
- sports recaps and highlights
- local history and documentary work
- event coverage
- civic/government/community updates
- food, craft, gardening, and maker content

The point is not that all content serves the same audience. The point is to make it easy for different local audiences to find programming that serves them well.

## What This Is Not

This should not be built as:

- a TikTok-style feed
- a YouTube clone
- a star-rating marketplace of subjective taste
- an engagement-maximizing algorithmic attention machine

Subjective quality ratings are a poor fit. A local history interview, church message, gardening lesson, youth sports recap, and music performance are not meaningfully comparable on a single "quality" axis. Different audiences want different things.

## Discovery Model

The correct discovery surface is structured programming and browsing, not a single popularity leaderboard.

Recommended discovery rails:

- `New Shows`
- `New Episodes`
- `Trending This Week`
- `Most Watched`
- `Growing Fast`
- `Featured Local Voices`
- `Staff Picks`
- `Educational`
- `Instructional`
- `Entertainment`
- `Community History`
- `Faith`
- `Sports`
- `Kids & Family`
- `Nearby Communities`

This allows the platform to feel more like a browser-based TV guide or programming catalog than a social feed.

## Audience Measurement, Not Subjective Ratings

When talking about "ratings," the right model is Nielsen-style audience measurement, not star reviews or thumbs-up quality scoring.

Useful signals include:

- unique viewers/listeners
- total watch time / listen time
- average completion rate
- repeat viewers/listeners
- subscriber/follower growth
- episode-to-episode retention
- audience by community or region
- audience growth over time
- live vs on-demand consumption

These metrics are much more meaningful than subjective scores because they show what content is actually finding and holding an audience.

Important distinction:

- internal analytics can be richer than public-facing metrics
- public popularity surfaces should be carefully designed so creators are not pushed into shallow attention tactics

## Data Model Direction

The platform should separate:

- `Creator`
- `Show`
- `Episode`

These are different objects and should not be collapsed into one generic content record.

### Creator

The person or organization responsible for programming.

A creator may be an individual user or an organization. Many of the strongest early creators will be organizations — churches, schools, civic groups, local bands, booster clubs. The `Creator` model should be able to link to either a `User` or an `Organization` (as defined in the organization/directory foundation planned for Milestone 6). This means the creator network benefits from having the org foundation in place, or at minimum should be designed so that the org link can be added cleanly when that foundation lands.

May include:

- bio
- home community
- creator type
- linked user or organization
- links
- trust/accountability status
- monetization status

### Show

A recurring program or series.

May include:

- title
- synopsis
- format
- category
- schedule/cadence
- cover art
- public/private/paid availability

### Episode

An individual video or audio release.

May include:

- title
- publish date
- runtime
- description
- media host/provider
- embed/source metadata
- transcript/notes
- analytics metrics

## Hosting Strategy

Highlander should not rush into first-party video hosting if external providers can support the early phase more cheaply and reliably.

Recommended sequence:

1. support external-host embeds/links first
   Examples: YouTube, Vimeo, podcast feeds, or similar providers.

2. build Highlander-native metadata, discovery, creator identity, subscriptions, and analytics around that content

3. evaluate platform-managed hosting later if video becomes strategically central or if sensitive/premium content needs stronger control

For public-facing video, external hosting may be a practical early choice. For premium, sensitive, or family-controlled content, external public platforms may be a poor long-term fit.

## Creator Monetization Direction

The long-term goal is to let approved creators earn money through Highlander without forcing them into ad-driven platform logic.

Potential monetization models:

- creator subscriptions
- show subscriptions
- paid special events or premieres
- pay-per-view episodes
- supporter memberships or tipping

Highlander can take a modest platform fee in exchange for trusted discovery, distribution, subscription infrastructure, and audience access.

This should be framed as enabling local creators to build community-rooted income, not as extracting value from audience attention.

## Monetization Guardrails

Paid creator tools should launch later than basic creator discovery. Monetization should require stronger safeguards than ordinary content listing.

Recommended requirements for paid creator status:

- verified identity / trusted standing
- rights attestation for uploaded or linked content
- review/approval for paid access eligibility
- payout onboarding and compliance when needed
- dispute/refund/chargeback handling policy

## Early Adoption Anchor: Churches and Faith Organizations

Churches and faith organizations are likely the strongest early anchor for the creator network. They have several characteristics that make them uniquely well-suited to drive initial adoption:

They already produce weekly programming. Sermons, music performances, announcements, and special services are produced on a regular cadence regardless of whether a platform exists to host them. The content creation habit is already established.

They have built-in audiences. A congregation is a pre-existing subscriber base that already wants access to this content. The platform does not need to manufacture demand — it only needs to provide a better discovery and access path than whatever the church is currently using (often a bare YouTube channel or Facebook page with no discoverability).

They are deeply rooted in community identity. Churches are among the most durable institutions in small communities. Their participation lends the creator network immediate local credibility.

They are underserved by existing platforms. YouTube and Facebook offer no church-specific discovery, no congregation-specific subscription tools, and no integration with a broader community context. A church that can embed its Sunday service on its Highlander organization page, appear in the Faith programming rail, and let congregation members subscribe for episode notifications gets immediate, tangible value that no national platform provides.

They are natural early candidates for creator monetization. Churches already collect donations and manage memberships. Supporter memberships and subscription tools map naturally to how congregations already engage financially.

Prioritizing church and faith content in the initial creator network rollout is not about limiting scope — all creator types remain welcome. It is about identifying the adoption path with the least friction and the most immediate community value.

## Curation Vs Algorithmic Ranking

Early on, the platform should prefer curation and category structure over opaque ranking systems.

Recommended early approach:

- curated featured creators and shows
- category-specific rails
- latest releases
- basic popularity and audience-growth surfaces

As the catalog deepens, more sophisticated audience-driven discovery can expand. But the system should never become an engagement treadmill optimized for addiction rather than usefulness.

## Multi-Tenant And National Expansion Fit

This concept becomes more powerful as Highlander expands to more communities.

Benefits of tenant growth:

- larger content library
- stronger category depth
- more programming variety
- better audience measurement
- cross-community discovery
- stronger basis for future connected-TV programming

The local-first principle still matters. Content should remain rooted in communities, even as discovery broadens across the network.

## Future Roku / Connected-TV Direction

The long-term extension is a connected-TV surface, potentially including a Roku channel, where viewers can browse shows and episodes in a lean-back television-style environment.

A Roku or similar TV app only makes sense once there is enough programming density and consistency to justify it. The platform should reach that point through the web first.

Recommended sequence:

1. creator/show directory
2. browser-based watch/listen experience
3. follow/subscribe features
4. audience measurement and programming rails
5. creator monetization
6. connected-TV distribution

The core idea is that Highlander first becomes the trusted programming guide and discovery layer, then later expands into a fuller local/regional TV-style network surface.

## Strategic Fit

This direction fits Highlander because it extends the platform from local information infrastructure into local media infrastructure.

It can:

- surface local voices that national platforms ignore
- preserve community culture and history
- support education, entertainment, and instruction
- create future income paths for local creators
- strengthen tenant expansion through a richer shared content network

Done well, this is not "local YouTube." It is a trusted local programming and discovery network with future web, mobile, and connected-TV potential.
