You are implementing ReporterAgent v1.

Build exactly what is specified below. Do not expand scope. Do not introduce multi-agent behavior. Do not replace explicit workflow logic with a single opaque prompt chain. Keep logic modular, testable, and inspectable.

================================================================
OBJECTIVE
================================================================

Implement a Python 3.12 Django + DRF service named ReporterAgent v1 that:

1. Accepts:
   - topic
   - subject_name
   - audience
   - source_material
   - context_instructions
   - debug flag

2. Extracts facts from provided source material.

3. Determines whether there is enough information to produce a reporter-style article.

4. Generates a draft article only if drafting is allowed.

5. Validates the article against explicit reporter-role rules.

6. Performs at most one revision if validation fails with critical issues.

7. Returns either:
   - COMPLETE
   - COMPLETE_WITH_WARNINGS
   - BLOCKED
   - ERROR

The system must behave as a reporter/journalist only.
It must not drift into strategy, coaching, consulting, or advisory output.

================================================================
CORE CONSTRAINTS
================================================================

- Single-agent system only.
- No multi-agent orchestration.
- No RAG dependency.
- No vector database.
- No background jobs.
- No frontend UI.
- Local development friendly.
- Modular architecture.
- Explicit state tracking.
- Explicit validation phase separate from generation.
- Explicit revision phase separate from validation.
- Strong observability.
- Deterministic structure where practical.
- Max revision_count = 1.
- No unsupported fact invention.
- No vague unresolved subject references when subject is resolvable.
- Do not silently continue if critical reporting information is missing.

================================================================
STACK
================================================================

- Python 3.12
- Django
- Django REST Framework
- PostgreSQL
- pytest
- Pydantic or dataclasses for typed domain models
- Docker Compose for local dev
- .env-based configuration

================================================================
PROJECT STRUCTURE
================================================================

Create the following files:

- manage.py
- config/settings.py
- config/urls.py
- reporter/apps.py
- reporter/api/serializers.py
- reporter/api/views.py
- reporter/api/urls.py
- reporter/domain/models.py
- reporter/domain/enums.py
- reporter/services/input_normalizer.py
- reporter/services/fact_extractor.py
- reporter/services/sufficiency_assessor.py
- reporter/services/draft_generator.py
- reporter/services/revision_service.py
- reporter/services/workflow_service.py
- reporter/validators/base.py
- reporter/validators/rules.py
- reporter/adapters/model_adapter.py
- reporter/adapters/provider_openai.py
- reporter/logging_utils.py
- reporter/management/commands/run_reporter.py
- reporter/tests/test_input_normalizer.py
- reporter/tests/test_fact_extractor.py
- reporter/tests/test_sufficiency_assessor.py
- reporter/tests/test_validators.py
- reporter/tests/test_workflow_complete.py
- reporter/tests/test_workflow_blocked.py
- reporter/tests/test_api.py
- reporter/tests/test_cli.py
- README.md
- .env.example
- docker-compose.yml
- Dockerfile

Do not add unrelated files unless strictly necessary.

================================================================
DOMAIN ENUMS
================================================================

Implement enums for:

1. FinalStatus
   - COMPLETE
   - COMPLETE_WITH_WARNINGS
   - BLOCKED
   - ERROR

2. RunStatus
   - INGESTING
   - EXTRACTING
   - ASSESSING
   - BLOCKED_PRE_DRAFT
   - DRAFTED
   - VALIDATING
   - REVISING
   - COMPLETE
   - COMPLETE_WITH_WARNINGS
   - BLOCKED_POST_VALIDATION
   - ERROR

3. ValidationSeverity
   - CRITICAL
   - NON_CRITICAL

4. FactProvenance
   - explicit_source
   - inferred

5. SubjectResolutionStatus
   - provided
   - inferred
   - unresolved

6. EventResolutionStatus
   - resolved
   - unresolved

7. ContextResolutionStatus
   - sufficient
   - insufficient

8. MissingFactCategory
   - subject
   - event
   - context
   - attribution
   - timeframe
   - location

================================================================
DOMAIN MODELS
================================================================

Implement typed models for:

1. ReportRequest
- request_id: UUID
- topic: str
- subject_name: str | None
- audience: str | None
- source_material: list[str]
- context_instructions: str | None
- debug: bool = False

2. FactRecord
- fact_id: UUID
- text: str
- source_index: int
- source_excerpt: str
- provenance: FactProvenance
- confidence: float
- tags: list[str]

3. MissingFact
- missing_id: UUID
- category: MissingFactCategory
- description: str
- blocking: bool

4. Blocker
- blocker_code: str
- message: str
- related_missing_ids: list[UUID]

5. DraftArticle
- headline: str
- lede: str
- body_paragraphs: list[str]
- source_fact_ids: list[UUID]

6. ValidationIssue
- issue_id: UUID
- rule_code: str
- severity: ValidationSeverity
- message: str
- evidence_span: str | None
- suggested_fix: str | None

7. StepLog
- step_name: str
- started_at: datetime
- ended_at: datetime
- decision_summary: str
- payload_ref: str | None

8. ReporterRunState
- run_id: UUID
- status: RunStatus
- topic: str
- subject_name: str | None
- subject_resolution_status: SubjectResolutionStatus
- event_resolution_status: EventResolutionStatus
- context_resolution_status: ContextResolutionStatus
- facts: list[FactRecord]
- missing_facts: list[MissingFact]
- blockers: list[Blocker]
- draft_article: DraftArticle | None
- validation_issues: list[ValidationIssue]
- revision_count: int
- step_logs: list[StepLog] | None

9. FinalResult
- run_id: UUID
- status: FinalStatus
- article: DraftArticle | None
- blockers: list[Blocker]
- validation_issues: list[ValidationIssue]
- debug_state: ReporterRunState | None

Keep transport serializers separate from domain models.

================================================================
INPUT NORMALIZATION
================================================================

Implement reporter/services/input_normalizer.py.

Requirements:
- Trim whitespace on all strings.
- Convert empty strings to None where appropriate.
- Normalize missing source_material to empty list.
- Reject payloads where both:
  - topic is empty/null
  - source_material is empty
- Preserve request_id if provided internally, otherwise generate one.
- Return a validated ReportRequest object.

================================================================
FACT EXTRACTION
================================================================

Implement reporter/services/fact_extractor.py.

Requirements:
- Input: ReportRequest
- Output:
  - facts: list[FactRecord]
  - subject_resolution_status
  - inferred subject if possible
  - missing_facts
- Extract atomic facts from source_material.
- Tag each fact with provenance:
  - explicit_source for direct source statements
  - inferred only when derived conservatively
- Do not hallucinate facts.
- If no usable facts are present, produce blocking MissingFact entries.
- Subject rules:
  - If subject_name provided, resolution = provided
  - Else infer only if confidence >= 0.80
  - Else unresolved
- Keep extraction logic deterministic where possible.
- If model assistance is used, hide it behind ModelAdapter and return structured output.

================================================================
SUFFICIENCY ASSESSMENT
================================================================

Implement reporter/services/sufficiency_assessor.py.

Input:
- current ReporterRunState or equivalent extracted output

Output:
- updated missing_facts
- blockers
- event_resolution_status
- context_resolution_status
- draft_allowed boolean

Business rules:
- Subject is resolved only if:
  - provided directly
  - or inferred with confidence >= 0.80
- Event is resolved only if the draftable news angle can be stated in one sentence grounded in facts.
- Context is sufficient only if there is at least one supporting contextual fact beyond the main event fact.
- Drafting must be blocked when any of the following is true:
  - subject unresolved and article requires a named subject
  - event unresolved
  - no factual basis extracted
  - only inferred facts exist without explicit-source support

Create explicit Blocker objects with precise blocker codes/messages.

Suggested blocker codes:
- INPUT_INSUFFICIENT
- SUBJECT_UNRESOLVED
- EVENT_UNRESOLVED
- CONTEXT_INSUFFICIENT
- NO_FACTUAL_BASIS
- EXPLICIT_SUPPORT_MISSING

================================================================
DRAFT GENERATION
================================================================

Implement reporter/services/draft_generator.py.

Requirements:
- Generate only if blockers are empty.
- Output DraftArticle with:
  - headline
  - lede
  - body_paragraphs
  - source_fact_ids
- Enforce article structure:
  - headline: 5 to 16 words
  - lede: 1 paragraph, 25 to 60 words
  - body: 2 to 6 paragraphs
- Reporter style only.
- No advice.
- No recommendations.
- No coaching.
- No strategy.
- No chatbot follow-up questions.
- No unsupported facts.
- Subject must be explicitly named before pronoun use when subject is known.
- Every factual claim should map to source facts.

Implement generation through ModelAdapter abstraction.
Do not embed the entire workflow in the prompt.
Prompt only for this step.

================================================================
VALIDATION FRAMEWORK
================================================================

Implement:
- reporter/validators/base.py
- reporter/validators/rules.py

Create a base validator interface and explicit rule validators.

Validation must be separate from generation.

Implement these validation rules with stable rule_code values:

1. SUBJECT_IDENTIFIED
- Ensure subject is clearly identified when expected.
- CRITICAL if unresolved or omitted when required.

2. NO_ADVISORY_DRIFT
- Detect advice, recommendations, strategy, coaching, consulting tone.
- CRITICAL on violation.

3. NO_CHATBOT_LOOP
- Detect chatbot-like follow-up question behavior in article output.
- CRITICAL on violation.

4. NO_UNSUPPORTED_FACT
- Detect claims not traceable to extracted facts.
- CRITICAL on violation.

5. ARTICLE_STRUCTURE_VALID
- Validate headline + lede + body shape.
- NON_CRITICAL if minor and fixable.
- CRITICAL if structure failure breaks article usefulness.

6. REPORTER_ROLE_COMPLIANCE
- Validate that tone remains journalist/reporter oriented.
- CRITICAL on role violation.

7. NO_UNRESOLVED_PRONOUN_REFERENCE
- Detect unresolved “he”, “she”, “they”, “someone”, etc.
- CRITICAL on violation.

8. LEDE_PRESENT
- Validate lede exists and fits size expectations.
- NON_CRITICAL unless absence breaks article.

9. HEADLINE_PRESENT
- Validate headline exists.
- NON_CRITICAL unless absence breaks article.

10. BODY_PARAGRAPH_COUNT_VALID
- Validate 2 to 6 body paragraphs.
- NON_CRITICAL unless extreme failure.

Validation output must be:
- is_valid-like overall state
- list[ValidationIssue]

Also provide a function that aggregates validator outputs and determines whether any CRITICAL issues exist.

================================================================
REVISION
================================================================

Implement reporter/services/revision_service.py.

Requirements:
- Revision occurs only if validation finds CRITICAL issues.
- Max revisions = 1.
- Revision input must include:
  - original draft
  - extracted facts
  - validation issues
- Revision must be bounded.
- No open-ended retry loops.
- After revision, re-run validation.
- If CRITICAL issues remain after one revision, final result = BLOCKED.

================================================================
WORKFLOW ORCHESTRATION
================================================================

Implement reporter/services/workflow_service.py.

This is the main orchestrator.

Phase order must be:

1. ingest
2. extract
3. assess
4. generate draft
5. validate
6. revise if needed
7. validate revised draft
8. finalize result

Requirements:
- Maintain explicit ReporterRunState through all phases.
- Update run status at each phase.
- Create step logs if debug is enabled.
- Never silently skip failed phase logic.
- BLOCKED pre-draft if sufficiency assessment fails.
- BLOCKED post-validation if critical issues remain after revision.
- ERROR only for execution/system failures, not business-rule insufficiency.

Workflow result rules:
- COMPLETE:
  - no critical issues
  - no warnings
- COMPLETE_WITH_WARNINGS:
  - no critical issues
  - non-critical issues may remain
- BLOCKED:
  - insufficiency blockers
  - or unresolved critical validation issues after revision
- ERROR:
  - unexpected system failure

================================================================
MODEL ADAPTER
================================================================

Implement:
- reporter/adapters/model_adapter.py
- reporter/adapters/provider_openai.py

Requirements:
- Create a ModelAdapter interface/protocol.
- Methods should support:
  - structured fact extraction if needed
  - draft generation
  - revision
- Keep provider-specific logic isolated.
- Do not hardwire provider details into workflow services.
- Make it easy to mock in tests.
- Include safe fallback stub behavior or a clearly failing configuration path.
- Configuration should come from env vars.

================================================================
API
================================================================

Implement DRF endpoints:

1. POST /api/reporter/run
Request JSON:
{
  "topic": "string",
  "subject_name": "string or null",
  "audience": "string or null",
  "source_material": ["string", "..."],
  "context_instructions": "string or null",
  "debug": false
}

Response JSON:
{
  "run_id": "uuid",
  "status": "COMPLETE|COMPLETE_WITH_WARNINGS|BLOCKED|ERROR",
  "article": {
    "headline": "string",
    "lede": "string",
    "body_paragraphs": ["string", "..."],
    "source_fact_ids": ["uuid", "..."]
  } | null,
  "blockers": [...],
  "validation_issues": [...],
  "debug_state": {...} | null
}

2. GET /api/reporter/runs/{run_id}
- Return ReporterRunState
- If persistence is not enabled, it can return 404 for unknown runs or read from in-memory store if you implement one minimally

3. GET /api/reporter/health
Response JSON:
{
  "status": "ok",
  "model_adapter": "configured|unconfigured",
  "persistence": "enabled|disabled"
}

================================================================
SERIALIZERS AND VIEWS
================================================================

Implement:
- request validation serializer
- response serializer
- robust error handling
- machine-readable error codes

Map errors as follows:
- malformed payload -> 400
- model unavailable -> 503
- internal unexpected failure -> 500

Business-rule insufficiency should still return 200 with BLOCKED result, not 4xx/5xx.

================================================================
CLI
================================================================

Implement Django management command:
- `python manage.py run_reporter --input path/to/request.json`

Requirements:
- Read JSON file input
- Execute workflow
- Print FinalResult JSON
- Exit non-zero only for true system errors, not BLOCKED business outcomes

================================================================
PERSISTENCE
================================================================

Keep persistence minimal and optional.

Requirements:
- Support a persistence flag via env/config.
- If persistence enabled:
  - store run state in PostgreSQL
- If persistence disabled:
  - application still functions
- Do not make persistence required for local basic use

You may implement a simple Django model for stored run states if needed, but do not over-engineer it.

================================================================
LOGGING AND OBSERVABILITY
================================================================

Implement reporter/logging_utils.py.

Requirements:
- Structured JSON logging
- Include run_id in every log line where available
- Log phase transitions
- Log blocker decisions
- Log validation rule hits
- Log revision attempts
- Do not log secrets
- Debug mode should include step logs in final response

================================================================
BUSINESS RULES TO ENFORCE IN CODE
================================================================

Implement these exactly:

- Subject input may be null.
- Subject is resolved only if provided directly or inferred with confidence >= 0.80.
- Event is resolved only if the draftable news angle can be stated in one sentence grounded in extracted facts.
- Context is sufficient only if extracted facts include at least 1 supporting contextual fact beyond the main event fact.
- Drafting blocked if:
  - subject unresolved and a named subject is required
  - event unresolved
  - no factual basis extracted
  - only inferred facts exist without explicit-source support
- Headline must be 5 to 16 words.
- Lede must be one paragraph of 25 to 60 words.
- Body must be 2 to 6 paragraphs.
- Body must not introduce facts absent from FactRecord list.
- Advisory drift is CRITICAL.
- Unsupported attribution is CRITICAL.
- Unresolved pronoun reference is CRITICAL.
- Revision count maximum is 1.
- If any CRITICAL issue remains after revision, final result is BLOCKED.
- Debug logs returned only when debug = true.

================================================================
TESTING
================================================================

Use pytest.

Create tests for:

1. test_input_normalizer.py
- trims strings
- converts empty strings to None
- rejects empty topic + empty source material

2. test_fact_extractor.py
- extracts explicit facts
- handles missing facts
- resolves provided subject
- infers subject only when confidence threshold met

3. test_sufficiency_assessor.py
- blocks unresolved subject
- blocks unresolved event
- blocks insufficient context
- blocks when only inferred facts exist
- allows drafting when subject/event/context rules are satisfied

4. test_validators.py
- flags advisory drift
- flags unsupported facts
- flags chatbot question loops
- flags unresolved pronouns
- validates structure correctly

5. test_workflow_complete.py
- full successful run
- complete with warnings path

6. test_workflow_blocked.py
- blocked pre-draft path
- blocked post-validation path after failed revision

7. test_api.py
- POST /api/reporter/run success
- POST /api/reporter/run blocked
- malformed payload 400
- health endpoint

8. test_cli.py
- CLI success
- CLI blocked
- CLI system error path

Additional requirements:
- Use mocked ModelAdapter in tests for deterministic behavior.
- Add fixtures for:
  - valid article input
  - unresolved subject input
  - advisory drift draft
  - unsupported fact draft
  - fixable structure failure
  - irreparable validation failure

================================================================
README
================================================================

Write a concise README with:
- project purpose
- setup steps
- env vars
- run server
- run CLI
- run tests
- example request
- explanation of COMPLETE / COMPLETE_WITH_WARNINGS / BLOCKED / ERROR

================================================================
ENV VARS
================================================================

Support env vars such as:
- DEBUG
- SECRET_KEY
- ALLOWED_HOSTS
- DATABASE_URL
- REPORTER_PERSISTENCE_ENABLED
- REPORTER_MODEL_PROVIDER
- REPORTER_MODEL_NAME
- REPORTER_MODEL_TEMPERATURE
- REPORTER_MODEL_MAX_TOKENS
- OPENAI_API_KEY

Use reasonable defaults for local development where possible.

================================================================
IMPLEMENTATION STYLE
================================================================

Follow these coding rules:
- Keep modules focused.
- Prefer small explicit functions.
- Use clear type hints.
- Keep names concrete.
- Avoid hidden magic.
- Avoid framework-heavy abstraction.
- Put business rules in Python code, not only in prompts.
- Make validation rules individually testable.
- Keep the workflow readable.
- Return stable structured outputs.

================================================================
DONE WHEN
================================================================

The task is complete only when:

1. All required files exist.
2. The Django app runs locally.
3. POST /api/reporter/run works.
4. CLI command works.
5. Validation is separate from generation.
6. Revision is separate from validation.
7. Max one revision is enforced.
8. BLOCKED results are returned for insufficiency and unresolved critical validation failures.
9. COMPLETE and COMPLETE_WITH_WARNINGS behave correctly.
10. Tests cover the required paths.
11. No unresolved scope decisions remain in code.

================================================================
DO NOT
================================================================

- Do not add authentication.
- Do not add frontend pages.
- Do not add Celery, Redis, or queues.
- Do not add vector search.
- Do not add multi-agent orchestration.
- Do not add extra product features.
- Do not replace typed models with ad hoc dicts everywhere.
- Do not bury validation inside prompt text only.
- Do not ignore blocked conditions.
- Do not use placeholders instead of implementation for core modules.

Now implement the full project.
Return complete file contents for every created file.