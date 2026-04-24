# Reporter Interview Agent Plan

## Purpose

Define the product and implementation shape for the Highlander Today Interview Agent before coding the browser-based interview workflow.

This document exists because the Interview Agent is no longer just a vague later-phase idea. The intended product shape is now clear enough that it should be anchored in writing before implementation drifts or gets interrupted.

Use this document alongside:

- `REPORTER-AGENT-IMPLEMENTATION-PLAN.md` for the full multi-agent reporting direction
- `REPORTER-AGENT-PHASE-1-SPEC.md` for the already-built reporter foundation
- `REPORTER-AGENT-PHASE-1-IMPLEMENTATION-CHECKLIST.md` for the completed Phase 1 execution baseline

## Core Decision

The first Interview Agent should not be implemented as an open-ended freeform chatbot.

It should be implemented as a deterministic, browser-based, login-gated interview system that:

- starts from a staff-created interview request
- knows who the interviewee is and why they matter
- asks one clean question at a time
- branches within bounded templates
- captures transcript-quality answers
- preserves the original language of the interview
- hands the result back into the existing reporter run

The point is to simulate a disciplined local reporter interview, not a generic AI conversation.

## Product Goal

Highlander Today staff should be able to queue people or ideas for interview-driven reporting, invite a specific person into the product, and have that person complete a guided browser interview with the agent while logged into their account.

The system should support:

- story-tip follow-up interviews
- event organizer interviews
- witness interviews
- organization or business representative interviews
- profile / feature subject interviews
- general community source interviews

## Non-Goals For V1

Do not build these in the first interview-agent slice:

- unrestricted freeform interviewing with no structure
- voice or video interviewing
- autonomous outbound contact or scheduling
- multilingual support with no explicit language allowlist
- automatic publication
- autonomous external verification during the live interview
- public anonymous interview sessions without login

## Primary Workflow

1. Staff creates or opens a `ReporterRun`.
2. Staff adds an interview request to that run.
3. Staff records who the person is, why they should be interviewed, what needs to be learned, and any context/sensitivity notes.
4. Staff assigns or invites the interviewee.
5. The interviewee logs in and opens a browser interview session.
6. The Interview Agent confirms language preference and interview framing.
7. The Interview Agent conducts the interview one question at a time using a deterministic question plan with bounded branching.
8. The system stores the transcript, answer records, extracted facts, notable quotes, unresolved claims, and suggested follow-ups.
9. The run returns to the internal reporter queue for review, sourcing, and eventual drafting.

## Core Product Objects

### Interview Request

Represents the setup and scheduling record created by staff before the interview starts.

Minimum responsibilities:

- attach to a `ReporterRun`
- identify the intended interviewee
- record why the interview matters
- define interview type and priority
- hold editorial setup notes
- track invitation and completion status

Suggested fields:

- `reporterRunId`
- `status`
- `interviewType`
- `priority`
- `intervieweeName`
- `intervieweeUserId` nullable
- `inviteEmail` nullable
- `relationshipToStory`
- `purpose`
- `editorBrief`
- `mustLearn`
- `knownContext`
- `sensitivityNotes`
- `suggestedLanguage`
- `nativeLanguage` nullable
- `interviewLanguage` nullable
- `requiresTranslationSupport`
- `scheduledFor` nullable
- `invitedAt` nullable
- `startedAt` nullable
- `completedAt` nullable
- `createdByUserId`

### Interview Session

Represents one concrete browser interview attempt.

Minimum responsibilities:

- track the live interview state
- store question/answer turns
- preserve interview language
- record completion or abandonment
- link outputs back to the reporter run

Suggested fields:

- `interviewRequestId`
- `status`
- `questionTemplateKey`
- `language`
- `currentStep`
- `startedAt`
- `lastActivityAt`
- `completedAt`
- `abandonedAt` nullable
- `transcriptText`
- `englishSummary` nullable

### Interview Turn

Represents one asked question and one answer.

Suggested fields:

- `interviewSessionId`
- `sortOrder`
- `questionKey`
- `questionText`
- `questionLanguage`
- `answerText`
- `answerLanguage`
- `answerTranslatedEnglish` nullable
- `branchDecision` nullable
- `askedAt`
- `answeredAt` nullable

### Interview Fact

Represents extracted structured material from the transcript.

Suggested outputs:

- direct observation
- attributed claim
- disputed claim
- chronology item
- quoted statement
- named entity
- follow-up requirement

## Staff Setup Requirements

The interview request setup form should capture the editorial context before any invite is sent.

Minimum setup fields:

- who the person is
- why they are being interviewed
- what role they have in the story
- what the reporter needs to learn
- what facts or claims need clarification
- any known links, notes, or source material
- urgency / deadline
- sensitivity or safety notes
- suggested language

Without this setup metadata, the Interview Agent will produce generic interviews that waste both the source’s time and the newsroom’s time.

## Interview Types

The first version should use deterministic interview templates keyed by interview type.

Recommended initial types:

- `TIPSTER`
- `WITNESS`
- `EVENT_ORGANIZER`
- `ORG_REPRESENTATIVE`
- `PROFILE_SUBJECT`
- `GENERAL_SOURCE`

Each template should define:

- opening framing
- mandatory core questions
- conditional follow-up branches
- completion rules
- escalation flags

## Interview Behavior

The Interview Agent should behave like a disciplined reporter, not a hype-oriented assistant.

Behavior rules:

- ask one clear question at a time where practical
- separate direct observation from hearsay
- ask for names, dates, locations, chronology, and evidence when missing
- distinguish quotes from summaries
- identify uncertainty explicitly
- stop short of pretending external verification has already happened
- remain polite, calm, and legible

## Language Behavior

The Interview Agent should support language preference confirmation at the start of the session.

If the setup indicates a likely non-English preference, the first prompt should confirm language choice in English and the suggested language.

Example:

- `Would you prefer to do this interview in English or Ukrainian?`
- `Ви б хотіли пройти це інтерв’ю англійською чи українською?`

Rules:

- never infer language preference from nationality alone without confirmation
- store `nativeLanguage`, `suggestedLanguage`, and `interviewLanguage` separately
- preserve original-language answers
- produce an English summary and extracted-fact layer for internal staff review
- use an explicit supported-language allowlist for v1

## Queue And Status Model

Recommended request statuses:

- `DRAFT`
- `INVITED`
- `READY`
- `IN_PROGRESS`
- `COMPLETED`
- `DECLINED`
- `NO_SHOW`
- `BLOCKED`
- `CANCELLED`

Recommended session statuses:

- `NOT_STARTED`
- `ACTIVE`
- `COMPLETED`
- `ABANDONED`
- `EXPIRED`

## Internal Outputs

When an interview is completed, the system should generate:

- full transcript
- normalized question/answer turns
- extracted facts
- extracted quotes
- unresolved claims
- chronology summary
- recommended follow-up questions
- source-worthiness / readiness signal

These outputs should attach back to the `ReporterRun` and be reviewable from the internal reporter UI.

## UX Surfaces

Recommended first surfaces:

- staff interview-request creation on the reporter run detail page
- internal interview queue view
- invite / assignment controls
- browser interview session route for the logged-in interviewee
- internal transcript + facts + follow-up review panel

The public-facing interview route should feel calm and professional, but the operational queue should follow the existing compact admin/editorial design language.

## Permissions

Expected role boundaries:

- registered/trusted users can complete their own invited interview session
- trusted contributors and staff can view and manage interview requests when allowed by reporter permissions
- editors/admins can reassign, review, and resolve interview outputs
- nobody can publish directly from the interview system

## Safety And Moderation Boundaries

The Interview Agent should be able to flag, but not resolve on its own:

- accusations of wrongdoing
- minors
- self-harm or violence signals
- medical claims
- legal exposure
- doxxing or private-address disclosure
- requests for anonymity

These should create visible internal review flags on the associated run.

## Implementation Direction

Build the first interview-agent slice inside the existing Highlander Today stack:

- Prisma models in `prisma/schema.prisma`
- service modules under `src/lib/reporter/*`
- internal queue and setup surfaces under `src/app/admin/reporter/*`
- interview session route under the App Router
- APIs under `src/app/api/reporter/*`

Do not split this into a separate service for v1.

## Recommended Build Order

1. Add interview request/session schema and enums.
2. Add internal setup form and queue on top of `ReporterRun`.
3. Add invite/assignment flow.
4. Add login-gated browser interview session route.
5. Add deterministic question-template engine with bounded branching.
6. Add transcript, extracted-fact, and follow-up generation.
7. Add multilingual preference confirmation and original-language preservation.
8. Add internal review panel back inside the reporter run.

## Recommendation

Treat the Interview Agent as the next major reporter slice after the Phase 1 foundation.

The correct v1 is:

- queued
- setup-driven
- deterministic
- login-gated
- multilingual by explicit preference confirmation
- source-preserving
- editorially reviewable

That shape satisfies the product goal of “the agent interviewing them like a real reporter” without turning the system into an unbounded chatbot or an unreliable article-generation gimmick.
