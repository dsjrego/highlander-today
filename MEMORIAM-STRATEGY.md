# Memoriam & Highlander Today — Strategy Document

*(Working Draft — Intended for Iteration)*

---

## 1. Core Vision

Highlander Today is being built as **local-first, multi-tenant community infrastructure** with the long-term aspiration of evolving into a **durable human memory system**.

At the center of this vision is:

> **Memoriam — a structured, respectful, and durable record of human lives.**

Guiding belief:

> **Every life has value and should have the opportunity to be remembered in a way that can persist beyond any single platform.**

This is not framed as:

- a traditional obituary business
- a social media memorial system
- a purely commercial SaaS platform

Instead, the long-term aspiration is:

> **A distributed, community-rooted archive of human lives that can endure across generations.**

---

## 2. Strategic Positioning

### What this is:

- Local community infrastructure
- Identity-based system (real people, trust)
- Moderated, structured memory preservation
- Multi-tenant, replicable across communities
- A platform that requires human stewardship

### What this is not:

- A "Wikipedia for everyone"
- A passive memorial page system
- A growth-first startup chasing scale
- A fully automated system

---

## 3. Foundational Principles

### 3.1 Local First

- Start with a single real community (Cambria Heights)
- Build real usage, not theoretical scale
- Expand only after proving value locally

### 3.2 Identity & Trust

- Real people, not anonymous accounts
- Trust-based interactions
- Accountability as a core system property

### 3.3 Structured Memory

- Records must be structured, not just narrative
- Separation of:
  - factual identity
  - narrative memory
  - community contributions

### 3.4 Stewardship Over Ownership

- Content is not just "owned" — it is **stewarded**
- Families, communities, and moderators all play roles

### 3.5 Durability Over Features

- Build systems that can persist
- Avoid fragile, trend-driven functionality

---

## 4. Memoriam System Definition

### 4.1 Core Components

#### A. Death Notice

- Minimal, factual, time-sensitive
- Verified and moderated
- Serves as the initial public record

#### B. Memorial Page

- Rich, long-lived
- Structured + narrative
- Can grow over time through contributions
- Supports photos, videos, and community memories

#### C. Memory Contributions

- Moderated submissions from others
- Not open comments
- Reviewed by stewards or staff

---

### 4.2 Roles

- **Submitter** — initiates record
- **Steward** — manages ongoing memorial (assigned by staff; self-service management via `/memoriam/[slug]/manage`)
- **Co-Steward** — additional family or community representative invited by the steward
- **Verifier** — supports legitimacy
- **Moderator** — approves and governs

---

### 4.3 Core Rules

- Only trusted users can initiate
- Verification required for publication
- No anonymous interaction
- Full audit history
- Moderated contributions only

---

## 5. Platform Context

Memoriam is not standalone. It exists within:

- Local Life (content)
- Events (activity)
- Marketplace (economic activity)
- Directory (people/orgs)
- Messaging (communication)
- Trust system (identity)
- Admin moderation (governance)
- Homepage (community visibility)

This allows real identity linkage, community validation, and long-term integration into local history.

---

## 6. Short-Term Strategy (0–12 Months)

### Goals

- Establish credibility
- Validate real usage
- Build trust in the system

### Focus Areas

#### A. Functional Memoriam MVP

- Submission workflow ✅
- Moderation queue ✅
- Public pages ✅
- Memory contribution flow ✅
- Photo support ✅
- Video support ✅
- Steward self-service ✅
- Admin steward assignment ✅

#### B. Tone & Experience

- Must feel: respectful, simple, trustworthy
- Submission form uses plain language, auto-calculates age, shows character limits
- "Provenance note" replaced with "Where this information comes from"

#### C. Local Adoption

- Real families use it
- Real memorials created
- Real moderation occurs

#### D. Operational Reality

- Manual workflows are acceptable
- Founder-driven moderation is expected
- Schema must be pushed before first deployment: `prisma db push`

---

### Success Indicators

- Consistent memorial submissions
- Families engage with pages
- Memories are contributed
- Stewards actively manage pages
- Community trusts the system

---

## 7. Medium-Term Strategy (1–5 Years)

### Goals

- Strengthen system durability
- Expand to additional communities
- Begin structured operational roles

### Focus Areas

#### A. System Refinement

- Richer steward tools (currently Phase 1 — edit text, photos, videos, approve memories, invite co-stewards)
- Photo print outputs
- Service-details formatting improvements
- Deeper search and filtering

#### B. Multi-Tenant Expansion

- Replicate model in new communities
- Maintain local identity in each

#### C. Role Emergence

Natural roles begin forming:
- Moderators
- Editors
- Community stewards
- Organization coordinators

#### D. Early Commercialization

- Free death notices remain core
- Optional paid enhancements:
  - additional media storage
  - print outputs
  - premium presentation

---

### Key Principle

> **Commercialization should support the system, not distort it.**

---

## 8. Long-Term Strategy (5–20+ Years)

### Goals

- Achieve durability beyond the founding entity
- Establish Memoriam as part of community record
- Expand globally through replication

---

### 8.1 System Evolution

The platform evolves into:

> **A distributed, community-rooted archive of human lives**

Characteristics:

- Multi-community
- Locally operated
- Structurally consistent
- Globally meaningful

---

### 8.2 Institutional Direction (Future Consideration)

Potential evolution:

- Foundation or nonprofit layer
- Library / archive partnerships
- Public data export systems

---

### 8.3 Data Longevity Strategy

Must include:

- Open, portable formats (JSON, HTML, etc.)
- Periodic archival exports
- Redundant storage layers
- Clear schema documentation

The current Prisma data model (`MemorialPerson`, `MemorialPage`, `MemorialContributor`, `MemorialVerification`, `MemorialSubmission`, `MemorialMemory`, `MemorialPhoto`, `MemorialAuditLog`) is designed to support this.

---

### 8.4 Governance Evolution

Shift from founder-controlled toward stewarded system with distributed responsibility and long-term oversight structures.

---

## 9. Job Creation Philosophy

### Key Principle

> **Jobs are an outcome of responsibility, not a goal to force.**

### How Jobs Emerge

- Phase 1: Founder-driven operations
- Phase 2: Support roles (moderation, outreach, organization management)
- Phase 3: Local operational roles (memoriam stewards, community editors, local coordinators)

### Critical Constraint

> **If the system is not essential, it will not create meaningful jobs.**

### Strategic Intent

- Keep responsibility local
- Avoid over-centralization
- Let each community require human participation

---

## 10. Risks

### 10.1 Over-Scope

Trying to build archive, social system, monetization, and global scale all at once.

### 10.2 Trust Failure

If inaccuracies occur, moderation fails, or tone is wrong, adoption will collapse.

### 10.3 Premature Scaling

Expanding before local validation, real usage, and operational clarity.

### 10.4 Permanence Claims

Overpromising "forever" without technical, financial, and governance backing.

---

## 11. Guiding Constraint

> **Do not design away the human parts.**

Memoriam requires judgment, care, context, and accountability. Automation should assist, not replace.

---

## 12. Working Definition

> **Highlander Today is a local-first community platform designed to become a durable, structured record of human lives, beginning with memoriam and expanding into a broader system of community memory.**

---

## 13. Final Perspective

This effort sits between technology, community, history, and identity. If successful, it becomes:

> **Infrastructure that helps ordinary human lives be recorded, understood, and remembered over time.**

The immediate task remains simple:

> **Make it work — for one real community — in a way people trust and use.**
