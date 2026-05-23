# Reporter Agent Maturity Requirements

## Purpose

Define the maturity layer requirements for the Highlander Today Reporter Agent system.

This document exists to describe the hardening layer that closed the gaps between the live bounded reporter workflow and a more durable, auditable, agent-ready internal subsystem. Keep it as the canonical reference for what this maturity epic was intended to add.

Use this document after reading:

- `PROJECT-STATUS.md` for current implementation state and current cautions
- `REPORTER-AGENT-IMPLEMENTATION-PLAN.md` for the canonical long-term reporter direction
- `REPORTER-AGENT-PHASE-1-SPEC.md` for the already-built reporter foundation
- `REPORTER-INTERVIEW-AGENT-PLAN.md` for the dedicated browser interview workflow

This is a maturity and hardening document, not a greenfield redesign. The implementation is now functionally complete; future work should treat this file as a reference baseline unless the requirements themselves change.

## Core Goal

The immediate goal is not more autonomy.

The immediate goal is:

- more durability
- more traceability
- more validation
- more editorial control

These are the prerequisites for any later safe expansion of agent behavior.

## Background

The current Reporter Agent foundation is already materially functional.

Current strengths include:

- editorial workflow modeling
- reporter-run state and internal review surfaces
- source-packet handling
- bounded draft generation
- human review gates
- provider abstraction
- deterministic fallback behavior
- browser-based interview flow with structured interview facts

The main remaining weaknesses are:

- no durable agent task layer for safe queued or retryable work
- limited observability and traceability around model-assisted actions
- prompt content still coupled too tightly to runtime TypeScript logic
- loose model-output parsing in some paths
- no normalized run-level claim store for source-backed editorial review
- no safe recurring internal triage mechanism

This work should strengthen the existing reporter system without expanding agent authority beyond safe internal operations.

## Non-Goals

Do not implement the following as part of this maturity slice:

- autonomous web browsing
- autonomous source discovery
- automatic publication
- automatic outbound email, messaging, or scheduling
- public unrestricted article generation
- MCP integration
- multi-agent swarm behavior
- voice or video interviewing
- replacement of the existing reporter workflow
- a new standalone service or microservice

## Target Outcome

After this work, the Reporter Agent system should support:

- durable, inspectable agent tasks for safe internal operations
- persistent traces for model-assisted actions
- versioned prompt files loaded from the codebase
- schema-validated model outputs before workflow impact
- normalized run-level claims linked to sources where available
- manual internal triage generation, with optional later scheduling
- safer retry and failure handling
- clearer editorial auditability

## Scope And Sequencing

This should be treated as one epic, not one implementation ticket.

Recommended child-ticket order:

1. Task and trace foundation
2. Prompt files and schema validation
3. Claims model
4. Admin visibility
5. Safe manual triage, then optional scheduled triage
6. Tests and hardening

The first implementation pass should prefer safe internal durability improvements over broad runtime refactors.

## Implementation Guardrails

- Preserve existing reporter behavior unless a requirement explicitly changes it.
- Do not migrate every existing reporter action to the task system in the first pass.
- Prefer additive schema changes over destructive refactors.
- Add corresponding Prisma relation fields to existing models as required.
- Preserve existing reporter enum naming conventions from `prisma/schema.prisma`.
- Agent-created records must never be treated as human-verified by default.
- Deterministic fallback behavior must remain explicit and traceable.
- Debug trace storage must avoid unnecessary sensitive payload retention.

## Requirement 1: Add `ReporterAgentTask`

### Objective

Introduce a durable task record for agent-driven work that is safe to queue, retry, inspect, resume, fail, or cancel explicitly.

This should start with bounded internal operations that benefit from durability, especially triage and other background-safe tasks.

Do not require every existing reporter action to become task-driven in the first pass.

### Scope Rules

Duplicate prevention must work for both run-level and global tasks.

Use a stable `scopeKey` to define task ownership scope.

- For run-level tasks, `scopeKey` should be the reporter run identifier.
- For global or admin tasks, `scopeKey` should be a stable explicit value such as `GLOBAL_TRIAGE`.
- Duplicate active task prevention should use `taskType + scopeKey`.

### Prisma Model

Add a model similar to:

```prisma
model ReporterAgentTask {
  id              String   @id @default(cuid())
  reporterRunId   String?
  reporterRun     ReporterRun? @relation(fields: [reporterRunId], references: [id])
  scopeKey        String?
  taskType        ReporterAgentTaskType
  status          ReporterAgentTaskStatus
  priority        Int      @default(50)
  inputJson       Json?
  outputJson      Json?
  errorMessage    String?
  attempts        Int      @default(0)
  maxAttempts     Int      @default(3)
  scheduledFor    DateTime?
  startedAt       DateTime?
  completedAt     DateTime?
  failedAt        DateTime?
  cancelledAt     DateTime?
  createdByUserId String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([reporterRunId])
  @@index([scopeKey])
  @@index([taskType])
  @@index([status])
  @@index([scheduledFor])
}
```

### Enums

Add:

```prisma
enum ReporterAgentTaskType {
  ANALYZE_SOURCE_PACKET
  GENERATE_REPORTING_GAPS
  GENERATE_DRAFT
  VALIDATE_DRAFT
  EXTRACT_INTERVIEW_FACTS
  SUGGEST_FOLLOW_UPS
  CLASSIFY_READINESS
  TRIAGE_REPORTER_RUN
}

enum ReporterAgentTaskStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
  CANCELLED
  BLOCKED
}
```

### Service Requirements

Create:

- `src/lib/reporter/agent-task-service.ts`

The service must support:

- create task
- mark task running
- mark task completed
- mark task failed
- mark task cancelled
- increment attempt count
- fetch pending tasks
- fetch tasks for a reporter run
- prevent duplicate active tasks of the same type and scope unless explicitly allowed

### Acceptance Criteria

- A reporter run can have multiple associated agent tasks.
- Failed tasks preserve error message and attempt count.
- Completed tasks preserve output JSON.
- Cancelled tasks preserve cancellation state distinctly from failure state.
- Pending, running, completed, and failed tasks are visible from the internal reporter run detail page or admin debug panel.
- No task performs publication or external communication.
- The first pass uses tasks for bounded internal work without requiring a full migration of all existing live request-response flows.
- Duplicate active task prevention uses `taskType + scopeKey`, where run-level tasks use the reporter run identifier and global tasks use a stable explicit scope key.

## Requirement 2: Add `ReporterAgentTrace`

### Objective

Persist trace records for model-assisted actions so agent behavior is inspectable and auditable.

Every model call used by the Reporter Agent should create a trace record.

### Prisma Model

Add a model similar to:

```prisma
model ReporterAgentTrace {
  id                  String   @id @default(cuid())
  reporterRunId       String?
  reporterRun         ReporterRun? @relation(fields: [reporterRunId], references: [id])
  reporterAgentTaskId String?
  reporterAgentTask   ReporterAgentTask? @relation(fields: [reporterAgentTaskId], references: [id])
  traceType           ReporterAgentTraceType
  provider            String?
  modelName           String?
  promptKey           String?
  promptVersion       String?
  promptHash          String?
  inputHash           String?
  inputSnapshotJson   Json?
  rawOutputText       String?
  parsedOutputJson    Json?
  validationJson      Json?
  latencyMs           Int?
  tokenEstimate       Int?
  errorMessage        String?
  createdAt           DateTime @default(now())

  @@index([reporterRunId])
  @@index([reporterAgentTaskId])
  @@index([traceType])
  @@index([createdAt])
}
```

### Enum

Add:

```prisma
enum ReporterAgentTraceType {
  INTERVIEW_NEXT_STEP
  SOURCE_PACKET_ANALYSIS
  DRAFT_GENERATION
  DRAFT_VALIDATION
  INTERVIEW_FACT_EXTRACTION
  TRIAGE_SUMMARY
}
```

### Service Requirements

Create:

- `src/lib/reporter/agent-trace-service.ts`

The service must support:

- create successful trace
- create failed trace
- attach trace to `ReporterRun`
- attach trace to `ReporterAgentTask`
- store prompt metadata
- store parsed model output where available
- store validation result where available

### Storage Rules

Trace storage should default to safe metadata and hashes first.

Default trace storage must include:

- `promptKey`
- `promptVersion`
- `promptHash`
- `inputHash`
- `provider`
- `modelName`
- `traceType`
- success or failure state

Full prompt text, full input snapshots, and raw model output are optional debug fields.

They should be treated as internal debug material and stored only when the caller explicitly enables debug trace storage for trusted internal review.

The implementation must not treat full raw storage as mandatory for every trace if the payload may contain sensitive user-provided material.

### Acceptance Criteria

- `decideNextInterviewStep` creates a trace when a model provider is used.
- `generateReporterDraftWithValidation` creates a trace for draft generation.
- Model failures create failed trace records before deterministic fallback behavior runs.
- Traces are available from the internal reporter run detail page or admin debug panel.
- Raw output is internal-only.
- Trace storage must not expose private model output to public users.

## Requirement 3: Move Runtime Prompts Into Versioned Prompt Files

### Objective

Separate runtime prompt content from TypeScript implementation logic.

Prompts should be editable, reviewable, versionable, and hashable from the codebase.

### New Directory

Create:

```text
src/lib/reporter/prompts/
  interview-next-step.system.md
  interview-next-step.user.md
  draft-generation.system.md
  draft-generation.user.md
  source-packet-analysis.system.md
  source-packet-analysis.user.md
  triage-summary.system.md
  triage-summary.user.md
```

### Prompt Metadata

Each prompt file must start with front matter similar to:

```md
---
promptKey: interview-next-step.system
promptVersion: 1
owner: reporter
purpose: Controls interview-agent next-question behavior.
---
```

### Prompt Loader

Create:

- `src/lib/reporter/prompt-loader.ts`

The loader must support:

- loading prompt text by key
- reading front matter
- calculating a stable hash of the prompt body
- returning prompt metadata
- failing loudly if required metadata is missing

### Acceptance Criteria

- Interview-agent prompts are loaded from prompt files.
- Draft-generation prompts are loaded from prompt files.
- Source-packet-analysis prompts are loaded from prompt files.
- Prompt key, version, and hash are written into `ReporterAgentTrace`.
- Runtime behavior must not silently fall back to an empty or missing prompt.
- Existing deterministic fallback behavior must remain available.

## Requirement 4: Add Structured Output Validation

### Objective

Replace loose model-output parsing with explicit schema validation.

All model-assisted outputs must be parsed and validated before they affect workflow state.

### Implementation Direction

Use the schema validation library already present in the project.

Current expectation:

- `zod`

### Required Schemas

Create:

- `src/lib/reporter/reporter-agent-schemas.ts`

Include schemas for:

- interview next-step decision
- source-packet analysis output
- draft generation output
- interview fact extraction output
- triage summary output

### Interview Next-Step Schema

Example shape:

```ts
export const InterviewStepDecisionSchema = z.object({
  shouldComplete: z.boolean(),
  questionKey: z.string().nullable(),
  questionText: z.string().nullable(),
  rationale: z.string().nullable(),
});
```

### Validation Behavior

If model output fails schema validation:

- create a failed `ReporterAgentTrace`
- do not write invalid output into core workflow tables
- use deterministic fallback where available
- surface the validation issue internally

If deterministic fallback is used because no provider is configured or model output is unusable, the system must persist an explicit internal record of that fallback path, either as a `ReporterAgentTrace` or another internal debug or audit record.

### Acceptance Criteria

- `parseEmbeddedJson` is replaced or wrapped with schema validation.
- Invalid model JSON cannot directly update interview session state.
- Invalid draft output cannot create a valid reporter draft without validation result.
- Schema validation errors are persisted in trace records.
- Existing draft validation still runs after schema validation.
- Deterministic fallback remains explicit and internally traceable even when a model call was not successfully completed.

## Requirement 5: Add `ReporterClaim`

### Objective

Introduce a normalized run-level claim model for source-backed editorial review.

This should move the system closer to claim-level accountability without duplicating the existing `ReporterInterviewFact` layer.

`ReporterInterviewFact` should remain the interview-session extraction record.

`ReporterClaim` should become the normalized editorial claim record at the `ReporterRun` level, with optional links back to source material and future linkage from interview-derived facts.

### Prisma Model

Add:

```prisma
model ReporterClaim {
  id                   String   @id @default(cuid())
  reporterRunId        String
  reporterRun          ReporterRun @relation(fields: [reporterRunId], references: [id])
  reporterSourceId     String?
  reporterSource       ReporterSource? @relation(fields: [reporterSourceId], references: [id])
  claimType            ReporterClaimType
  claimText            String
  sourceExcerpt        String?
  attribution          String?
  confidence           ReporterClaimConfidence
  verificationStatus   ReporterClaimVerificationStatus
  createdBy            ReporterClaimCreatedBy
  createdByUserId      String?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  @@index([reporterRunId])
  @@index([reporterSourceId])
  @@index([claimType])
  @@index([verificationStatus])
}
```

### Enums

Add:

```prisma
enum ReporterClaimType {
  DIRECT_OBSERVATION
  ATTRIBUTED_CLAIM
  OFFICIAL_STATEMENT
  DATE_TIME_FACT
  LOCATION_FACT
  QUOTE
  BACKGROUND_CONTEXT
  UNVERIFIED_ASSERTION
  FOLLOW_UP_REQUIREMENT
}

enum ReporterClaimConfidence {
  HIGH
  MEDIUM
  LOW
  UNKNOWN
}

enum ReporterClaimVerificationStatus {
  UNREVIEWED
  SUPPORTED
  NEEDS_CORROBORATION
  DISPUTED
  REJECTED
}

enum ReporterClaimCreatedBy {
  HUMAN
  AGENT
}
```

### Service Requirements

Create:

- `src/lib/reporter/claim-service.ts`

The service must support:

- create claim
- create claims from interview extraction output
- create claims from source-packet analysis output
- update verification status
- list claims for reporter run
- list unsupported or low-confidence claims

Agent-created claims must default to `UNREVIEWED` verification status unless a human explicitly changes that status.

### UI Requirements

Add a basic internal claims panel to the reporter run detail page.

The panel should show:

- claim text
- claim type
- linked source if available
- source excerpt if available
- confidence
- verification status
- created by human or agent

### Acceptance Criteria

- Claims can be attached to a reporter run.
- Claims can optionally link to a reporter source.
- Agent-generated claims are marked as `createdBy = AGENT`.
- Human-entered claims are marked as `createdBy = HUMAN`.
- Agent-generated claims default to `UNREVIEWED` and must not be treated as verified merely because a model created them.
- Claims are internal-only.
- Unsupported claims are visually distinguishable from supported claims.
- Draft generation should prefer supported or high-confidence claims where available.
- The implementation does not replace or duplicate `ReporterInterviewFact`; it normalizes interview and source-derived material into a run-level editorial review layer.

## Requirement 6: Add Safe Reporter Triage

### Objective

Add one limited triage behavior that demonstrates safe recurring internal agent operation.

This should remain internal-only and non-destructive.

### Phase Order

The first version should be manually triggered by trusted internal staff.

Only after the manual flow is stable and observable should the product optionally add automatic scheduling.

### Behavior

Create a triage operation that identifies reporter runs needing staff attention and generates an internal summary.

The job may inspect:

- runs in `NEW`
- runs in `NEEDS_REVIEW`
- runs in `BLOCKED`
- runs with stale activity
- runs with weak source packets
- completed interviews not yet reviewed
- drafts with critical validation issues

The job must not:

- publish content
- contact users
- browse the web
- alter article publication state
- resolve blockers automatically
- mark claims as verified automatically

### Suggested Output

The triage summary may classify runs as:

- needs editor decision
- needs source packet work
- needs follow-up interview
- ready for draft attempt
- draft has validation issues
- stale and needs reassignment

### Implementation Direction

Create:

- `src/lib/reporter/reporter-triage-service.ts`

Add a manual trigger such as:

- `POST /api/admin/reporter/triage/run`

Automatic scheduling is optional and should be implemented only after the manual path is stable.

### Acceptance Criteria

- Internal staff can trigger reporter triage manually.
- Manual triage creates a `ReporterAgentTask`.
- Manual triage creates a `ReporterAgentTrace`.
- Triage output is stored internally.
- Triage does not mutate publication state.
- Triage does not contact external users.
- Triage can safely fail without affecting reporter runs.
- Any later scheduled triage reuses the same safe internal execution path rather than introducing a separate behavior model.

## Requirement 7: Add Agent Permission Policy

### Objective

Define explicit action boundaries for each agent-like subsystem so authority does not expand accidentally over time.

### New File

Create:

- `src/lib/reporter/reporter-agent-permissions.ts`

### Permission Model

Define named agent actors similar to:

```ts
export const REPORTER_AGENT_ACTOR = {
  INTERVIEW_AGENT: 'INTERVIEW_AGENT',
  DRAFT_AGENT: 'DRAFT_AGENT',
  TRIAGE_AGENT: 'TRIAGE_AGENT',
  RESEARCH_AGENT: 'RESEARCH_AGENT',
} as const;
```

`RESEARCH_AGENT` may be present as a reserved future actor, but this requirement does not authorize open-web research behavior.

Define allowed actions similar to:

```ts
export const REPORTER_AGENT_ACTION = {
  READ_REPORTER_RUN: 'READ_REPORTER_RUN',
  READ_SOURCE_PACKET: 'READ_SOURCE_PACKET',
  CREATE_INTERVIEW_TURN: 'CREATE_INTERVIEW_TURN',
  CREATE_REPORTER_DRAFT: 'CREATE_REPORTER_DRAFT',
  CREATE_VALIDATION_ISSUE: 'CREATE_VALIDATION_ISSUE',
  CREATE_REPORTER_CLAIM: 'CREATE_REPORTER_CLAIM',
  CREATE_TRIAGE_SUMMARY: 'CREATE_TRIAGE_SUMMARY',
  PUBLISH_ARTICLE: 'PUBLISH_ARTICLE',
  CONTACT_EXTERNAL_USER: 'CONTACT_EXTERNAL_USER',
  BROWSE_WEB: 'BROWSE_WEB',
} as const;
```

### Required Policy

The default policy must deny:

- `PUBLISH_ARTICLE`
- `CONTACT_EXTERNAL_USER`
- `BROWSE_WEB`

unless a future ticket explicitly enables those actions with human approval gates.

### Acceptance Criteria

- Agent service methods check the permission policy before performing agent actions.
- Publish, external contact, and web browsing actions are denied by default.
- Permission-denied events are logged or traceable.
- Policy is covered by unit tests.

## Requirement 8: Add Tests

### Objective

Ensure the new maturity layer is deterministic and safe.

### Required Test Areas

Add tests for:

- agent task creation
- task status transitions
- duplicate active task prevention
- trace creation on success
- trace creation on failure
- prompt loading
- prompt metadata validation
- prompt hashing
- schema validation success
- schema validation failure
- deterministic fallback after invalid model output
- claim creation
- claim source mapping
- claim verification status update
- triage task creation
- agent permission denial

### Acceptance Criteria

- Tests use mocked providers.
- Tests do not call live OpenAI or Anthropic APIs.
- Tests do not require external network access.
- Tests cover failure paths, not only happy paths.

## Requirement 9: Admin UI Visibility

### Objective

Make agent operations inspectable by trusted internal users.

### Reporter Run Detail Additions

Add internal panels or tabs for:

- Agent Tasks
- Agent Traces
- Claims

Do not overbuild the UI.

The first version should be compact and list-first, following the existing admin list design direction.

### Agent Tasks Panel

Show:

- task type
- status
- attempts
- scheduled time
- started, completed, or failed time
- short error message if failed

### Agent Traces Panel

Show:

- trace type
- provider
- model
- prompt key
- prompt version
- latency
- error state
- created time

Raw prompt and output data should be admin-only or behind an explicit detail view.

### Claims Panel

Show:

- claim text
- type
- source
- confidence
- verification status
- created by

### Acceptance Criteria

- Internal users can inspect task status.
- Internal users can inspect trace metadata.
- Internal users can inspect claims.
- Public users cannot access task, trace, or claim data.
- UI follows existing compact admin design patterns.

## Suggested Build Order

1. Add Prisma enums and models:
   `ReporterAgentTask`, `ReporterAgentTrace`, and `ReporterClaim`.
2. Add services:
   `agent-task-service.ts`, `agent-trace-service.ts`, `prompt-loader.ts`, `reporter-agent-schemas.ts`, `claim-service.ts`, and `reporter-agent-permissions.ts`.
3. Move prompts into versioned markdown files.
4. Wire tracing into interview next-step decisions, draft generation, and source-packet analysis.
5. Add schema validation around model outputs.
6. Add internal panels for Agent Tasks, Agent Traces, and Claims.
7. Add safe manual triage.
8. Add optional scheduling only after manual triage is stable.
9. Add tests and hardening.

## Done When

This epic is complete when:

- Reporter Agent work can be represented as durable internal tasks where durability is needed.
- Model-assisted behavior creates trace records.
- Runtime prompts are versioned files with stable hashes.
- Model outputs are schema-validated before use.
- Source-backed claims can be extracted, stored, reviewed, and linked to reporter runs.
- Internal staff can inspect tasks, traces, and claims.
- A safe internal reporter triage operation exists.
- Agent permissions deny publish, contact, and browse actions by default.
- Tests cover task lifecycle, trace logging, prompt loading, validation, claims, triage, and permission denial.
- No autonomous publication, external communication, or open-web research is introduced.

## Implementation Notes

This work should remain inside the existing Highlander Today application stack.

Do not create a separate service unless a later scaling requirement proves it necessary.

This document should be read in the context recorded in `PROJECT-STATUS.md`.

If future sessions materially change the reporter baseline, update `PROJECT-STATUS.md` first, then adjust this document if the requirements themselves change.

Before adding new enums or related schema structures, compare existing reporter enum naming and relationship patterns in `prisma/schema.prisma` and preserve the established style unless there is a strong reason to differ.
