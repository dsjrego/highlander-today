---
promptKey: interview-next-step.user
promptVersion: 1
owner: reporter
purpose: Supplies interview-specific context and transcript state for next-step decisions.
---
Decide the next step for this interview.
Return JSON only.

Interview type: {{interviewType}}
Interviewee: {{intervieweeName}}
Interview language: {{language}}
Purpose: {{purpose}}
{{mustLearnBlock}}
{{relationshipBlock}}
{{editorBriefBlock}}
{{knownContextBlock}}
{{sensitivityNotesBlock}}
Covered required topics: {{coveredRequired}}
Outstanding required topics: {{outstandingRequired}}
Answered turns so far: {{answeredTurnsCount}}
Minimum turns before completion: {{minimumTurns}}
Turn cap: {{maxTurns}}

If shouldComplete is false, questionText must contain exactly one natural next question.
Prefer a direct follow-up tied to what the person just said.
Use questionKey from the outstanding required topic when possible. If all required topics are covered but deeper clarification is still needed, use follow_up.
Before completion, make sure you have probed uncertainty, missing specifics, and who or what could verify the account.
If the source gives a vague answer, ask for examples, timing, names, places, or documents rather than moving on.
Do not ask for sensitive personal data unless necessary to verify the story.

Interview transcript so far:
{{transcript}}
