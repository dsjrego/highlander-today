# Reporter User Manual

## Purpose

This guide explains the live Highlander Today Reporter system in plain language.

It is written for people using the product, not for developers.

Use this manual if you need to understand:

- how someone submits a story tip
- how staff manage a reporter run
- how the guided interview system works
- how draft generation works
- how the monitored-source system works

## What The Reporter System Is

The Reporter system is Highlander Today’s internal newsroom workflow for turning story ideas, tips, interviews, and source material into reviewable reporting work.

It is not an automatic publishing tool.

Important rule:

- the system can help organize material, summarize material, and draft from supplied material
- a human still reviews the result before anything becomes a published article

## Who This Manual Is For

This system has four main user groups.

### 1. Public tip submitters

People who want to suggest a story, issue, event, or local concern.

Main page:

- `/report-a-story`

### 2. Internal newsroom users

Contributors, staff writers, editors, admins, and super admins who review and manage reporter work.

Main pages:

- `/admin/reporter`
- `/admin/reporter/[id]`

### 3. Interview participants

A person invited by staff to answer guided interview questions in the browser.

Main page:

- `/interviews/[id]`

### 4. Source monitor operators

Internal staff using the source-monitoring tool to track recurring public-interest sources.

Main page:

- `/admin/reporter/sources`

## Quick Start

If you only want the shortest version:

1. A story idea comes in through `Report A Story` or is created internally.
2. Staff review it in `/admin/reporter`.
3. Staff open the run and add sources, blockers, and interviews as needed.
4. If needed, staff send an interview link to a source.
5. After the run has enough material, staff generate analysis or a draft.
6. Staff review the output.
7. Staff convert a reporter draft into an article draft for editing in the article workflow.

## Part 1: Public Story Tips

### Where story tips are submitted

Public users submit tips through:

- `/report-a-story`

### What the form asks for

The public form asks for:

- `Topic`
- `Who Is Involved`
- `What Happened`
- `Where Did It Happen`
- `When Did It Happen`
- `Why It Matters`
- `Supporting Links`
- `Additional Notes`
- `Your Name`
- `Email`
- `Phone`

### What makes a good submission

Good submissions are concrete.

Helpful details:

- what happened
- who is involved
- where it happened
- when it happened
- why local readers should care
- links or records if available

Less helpful submissions:

- vague complaints with no context
- a headline with no explanation
- rumors presented as fact

### What happens after someone submits

Submitting the form creates a reporter run for internal review.

The person submitting does not publish anything directly.

After submission:

- the newsroom can review the request
- staff can add sources and notes
- staff can assign the run
- staff can decide whether to report further, interview someone, draft, block, or archive the run

## Part 2: The Main Reporter Admin Page

### Where staff start

Internal users begin in:

- `/admin/reporter`

This page is the main newsroom work queue for reporter runs.

### What staff see there

The page includes:

- a list of reporter runs
- filters by status
- assignee filtering
- search
- a create-run form
- an interview queue panel
- links to `Source Monitor` and `Public Intake`

### What a reporter run is

A reporter run is one reporting job.

It might represent:

- a story tip
- an article request
- an editor assignment
- an interview-driven reporting effort

Think of a run as the working folder for one story effort.

### Run statuses in plain language

You may see these statuses:

- `NEW`: just entered the system
- `NEEDS_REVIEW`: needs staff review or shaping
- `SOURCE_PACKET_IN_PROGRESS`: reporting material is still being assembled
- `READY_FOR_DRAFT`: enough material may be present to draft
- `BLOCKED`: something important is missing or unresolved
- `DRAFT_CREATED`: at least one reporter draft exists
- `CONVERTED_TO_ARTICLE`: the run has already been turned into an article draft
- `ARCHIVED`: closed and not active

### Creating a run manually

Staff can create a run directly from `/admin/reporter`.

The create form includes:

- mode
- request type
- topic
- title
- subject name
- requested article type
- request summary
- what happened
- editor notes
- requester name
- requester email
- requester phone
- supporting links

Use this when:

- a tip came in by phone or in person
- an editor wants to start a reporting assignment manually
- staff need to standardize a loose idea into a structured run

### The interview queue on the main page

The lower interview queue shows open interview requests still in progress.

It helps staff quickly see:

- who still needs to be interviewed
- which interview type is involved
- priority
- status
- the related reporter run
- any scheduled time

## Part 3: Reporter Run Detail Page

### Where the full work happens

Each run opens in:

- `/admin/reporter/[id]`

This is the main operational page for a single story effort.

### The top summary boxes

At the top of the run page, staff can quickly see:

- run status
- assignee
- interview count
- source count
- open blocker count
- draft count
- agent task count
- claim count

### Run readiness

The page also shows a `Run Readiness` box.

This is a plain status summary of whether the run is:

- missing sources
- blocked
- waiting for interview review
- carrying unresolved validation issues
- ready for draft
- already linked to an article draft

This is the fastest way to understand what the run still needs.

## Part 4: The Tabs Inside A Reporter Run

The run page uses these tabs:

- `Details`
- `Interviews`
- `Sources`
- `Blockers`
- `Analysis`
- `Drafts`
- `Agent`

### Details Tab

Use this tab to manage the basic story frame.

Editable fields include:

- topic
- title
- subject
- status
- assignee
- request summary
- editor notes

Use `Details` when you need to:

- rename the run
- sharpen the topic
- assign responsibility
- move the run forward or backward in status
- record newsroom-only notes

If the run already has a linked article draft, this tab also shows that article link.

### Interviews Tab

Use this tab when the story needs direct answers from a person.

This tab does three jobs:

- shows interview requests
- shows completed sessions and their outputs
- lets staff create or edit interview requests

#### What an interview request contains

An interview request records:

- who is being interviewed
- why they matter to the story
- what the newsroom needs to learn
- what language to use
- schedule and sensitivity context

#### Interview request statuses in plain language

Common interview states include:

- `DRAFT`: internal setup only
- `INVITED`: ready to share
- `READY`: a linked user can open it
- `IN_PROGRESS`: currently underway
- `COMPLETED`: interview finished
- `BLOCKED`: requires review or follow-up
- `DECLINED`: interviewee declined
- `NO_SHOW`: interview did not happen
- `CANCELLED`: request was closed intentionally

#### What staff can do from the interview list

Depending on state, staff can:

- `Open`
- `Copy Link`
- `Invite`
- `Reopen`
- edit the request
- delete the request

#### When to use Invite

Use `Invite` when:

- the interview setup is complete
- the interviewee has an invite email or linked account
- you are ready for them to receive or use the browser session link

#### When to use Copy Link

Use `Copy Link` when:

- the interview is already openable
- you want the exact interview URL
- you plan to send the link manually

#### What happens after an interview is completed

Completed interview sessions can contain:

- an English summary
- extracted facts and follow-ups
- safety review flags
- the saved transcript

Staff should review completed sessions before drafting from them.

There is a `Mark Reviewed` action for completed sessions.

This matters because the draft workflow can be blocked until completed interview output has been reviewed.

#### Safety review flags

Some interview sessions may create safety review flags.

These are warnings for staff, not public output.

They may also be tied to a blocker on the run.

Staff can then:

- inspect the flag
- review the linked blocker
- resolve or reopen the blocker

#### The interview request form

The add/edit form includes:

- interviewee
- invite email
- interview type
- priority
- status
- relationship to story
- suggested language
- native language
- interview language
- scheduled time
- purpose
- must learn
- editor brief
- known context
- sensitivity notes
- translation support likely needed

Use this form carefully. Better setup produces a better interview.

### Sources Tab

Use this tab to assemble the source packet.

This is where staff put the material that supports the run.

#### What counts as a source

Examples:

- a staff note
- a user note
- an official URL
- a news article
- a document
- a transcript excerpt

#### What staff can do here

Staff can:

- view all sources attached to the run
- add a new source
- edit a source
- delete a source

#### What each source can include

A source can include:

- source type
- reliability
- title
- publisher
- author
- URL
- excerpt
- staff note
- content or note body

#### Reliability tiers in plain language

You may see:

- `UNVERIFIED`: not yet trusted
- `LOW`: weak support
- `MEDIUM`: somewhat useful
- `HIGH`: strong support
- `PRIMARY`: direct or highly authoritative material

Use the reliability field honestly. It helps staff judge whether drafting is appropriate.

#### Good source-packet habits

Do:

- add official documents when available
- paste key passages or notes, not just links
- identify where information came from
- distinguish your own note from the original source

Do not:

- treat rumor as verified fact
- overstate weak sources
- leave a run with only vague notes if better material exists

### Blockers Tab

Use blockers when the run cannot move forward safely or responsibly.

Examples:

- missing source material
- unclear timeframe
- unclear subject
- missing corroboration
- awaiting response
- legal review
- editorial review

#### What staff can do here

Staff can:

- review all blockers
- add a blocker
- resolve a blocker
- reopen a blocker

#### Why blockers matter

Open blockers are one of the main things that stop draft generation.

If a run is blocked, the point is to say clearly why.

This helps the newsroom avoid:

- vague “stuck” stories
- accidental drafting from incomplete material
- losing track of what is still missing

### Analysis Tab

Use this tab to generate internal analysis from the current source packet.

This analysis is not the same as a publishable article.

It is a newsroom aid.

#### What Generate Analysis does

`Generate Analysis` creates a `SOURCE_PACKET_SUMMARY` draft artifact from the current source material.

This is useful when staff want:

- a structured internal summary
- help understanding the packet
- a clearer picture of gaps before drafting

#### Important rule

You cannot generate analysis until the run has at least one source.

#### What staff can do in Analysis

Staff can:

- generate analysis
- review past analysis versions
- open an analysis view dialog

Think of this tab as the internal “help me understand what we already have” tool.

### Drafts Tab

Use this tab when the run is ready for article drafting.

#### What Generate Draft does

`Generate Draft` creates an `ARTICLE_DRAFT` from the source packet.

This draft is still internal.

It is not automatically published.

#### What must be true before draft generation

Draft generation is limited when:

- the run has no sources
- there are open blockers
- completed interview sessions have not been reviewed
- the run is archived

#### What staff can do with drafts

Staff can:

- generate a draft
- review draft versions
- open a draft in a preview dialog
- convert a draft into an article draft
- open the linked article editor if conversion already happened

#### What Convert does

`Convert` turns the reporter draft into an article draft in the normal article editor.

After conversion, the article opens in:

- `/local-life/submit?edit=...`

That is where standard article editing continues.

#### Important rule

Conversion is the handoff point into the article workflow.

It is not the same thing as publication.

The newsroom can still edit, review, and moderate the article afterward.

#### Validation issues

The Drafts area may also show validation issues.

These are warnings or problems detected during the drafting process.

They help staff spot:

- risky wording
- weak support
- evidence gaps
- other integrity problems

### Agent Tab

Use this tab for advanced internal review.

This tab is mainly for trusted newsroom and admin users who need to inspect internal system behavior.

It includes:

- agent operations
- agent tasks
- agent traces
- claims

#### Run Triage

The `Run Triage` action performs a deterministic internal triage pass for the run.

In plain language, this means:

- the system looks at the current state of the run
- records an internal triage result
- gives staff another structured review layer

#### Agent Tasks

These are durable internal work records for the run.

They show:

- task type
- status
- attempts
- scheduled time
- lifecycle timestamps
- error messages

This is mostly for internal operational review, not for public or source-facing use.

#### Agent Traces

These are detailed internal records of model-assisted actions.

They can show:

- what kind of action ran
- whether it succeeded
- timing
- parsed output
- validation data
- input snapshot
- raw output in some cases

This tab is for trusted review and debugging, not everyday public-facing workflow.

#### Claims

Claims are run-level statements extracted into a reviewable format.

They help staff separate:

- what the system thinks is being claimed
- what source may support it
- how strong confidence appears to be
- whether staff consider the claim supported, disputed, rejected, or still needing corroboration

Claim verification statuses include:

- `UNREVIEWED`
- `SUPPORTED`
- `NEEDS_CORROBORATION`
- `DISPUTED`
- `REJECTED`

This is one of the most important internal review tools for careful reporting.

## Part 5: Guided Interview Experience For The Interviewee

### Where the interviewee goes

Interview participants open:

- `/interviews/[id]`

### What the interviewee sees

The interview page explains:

- who the interview is for
- why it matters
- what language is suggested
- that answers are saved for newsroom review

### How the interview works

The interview is a browser session that:

- starts only when the participant clicks `Start Interview`
- asks one question at a time
- lets the participant choose or confirm language
- saves each answer
- continues through follow-up questions
- ends with an `Interview complete` state

### What kind of answers are expected

The product explicitly asks the participant to give:

- detailed answers
- names
- dates
- places
- chronology
- what they personally know
- what others told them
- what is still uncertain

Short answers are allowed, but detailed answers are more useful.

### What happens after the participant finishes

The participant’s responses are saved for internal newsroom review.

Staff may then:

- review the summary
- review extracted facts
- review any safety flags
- mark the interview session reviewed
- use the material in later source-packet analysis or draft generation

## Part 6: Monitored Sources

### What the source monitor is for

The monitored-source system helps staff track recurring public-interest sources, such as:

- government pages
- school pages
- public notices
- feeds
- other recurring information sources

Main page:

- `/admin/reporter/sources`

### What the monitored-source page shows

This page provides:

- counts for active sources, attention, fetched items, and recent fetches
- filters and search
- health status
- fetch cadence
- latest fetch summaries
- status controls

### What the main actions mean

#### Run Due Sources

This runs the due-source fetcher for sources that are ready to be checked now.

Use it when:

- you want a manual local test
- you want a manual production check
- you do not want to wait for scheduled execution

#### Fetch now

This fetches one source immediately.

Use it when:

- you just added a source
- you changed a source and want to test it
- one source is failing and you want to inspect it separately

#### Monitored Source

This opens the create form for a new watched source.

### What a monitored source includes

The create form includes:

- label
- URL
- type
- format
- coverage place
- fetch cadence
- publisher
- notes

### What source health means

The page may label a source as:

- healthy
- failing
- stale
- new
- paused
- archived

Use these as operational signals:

- `healthy`: working normally
- `failing`: latest fetches are breaking
- `stale`: not seeing expected updates recently
- `new`: recently added and still being proven
- `paused`: intentionally inactive for now
- `archived`: no longer in active use

### Source status controls

Staff can change a monitored source between statuses such as:

- active
- paused
- archived

Use:

- `active` for normal monitoring
- `paused` when you want to stop checks without deleting the record
- `archived` when it should no longer be part of the working registry

## Part 7: The Recommended Real-World Workflow

If you want a practical newsroom pattern, use this order:

1. Create or receive a run.
2. Review the request in `Details`.
3. Add or clean up the source packet in `Sources`.
4. Add blockers if anything important is missing.
5. Create interview requests if direct source testimony is needed.
6. Review completed interviews and mark them reviewed.
7. Generate analysis if the packet needs internal summarizing.
8. Generate a draft when the run is ready.
9. Review validation issues and claims.
10. Convert the best draft into an article draft.
11. Finish editing in the article workflow.

## Part 8: Common Situations

### “We received a tip but it is vague.”

Do this:

- create or open the run
- clean up the topic and request summary
- add a blocker if the story is too unclear
- create an interview request if a direct follow-up is needed

### “We have plenty of links but no clear story angle.”

Do this:

- add the materials in `Sources`
- set honest reliability levels
- use `Generate Analysis`
- review the analysis before drafting

### “The interview is complete but the draft button is not appropriate yet.”

Check:

- whether the interview session was marked reviewed
- whether there are still open blockers
- whether enough source material exists beyond the interview itself

### “We created a draft, but it still needs human shaping.”

That is normal.

Use the reporter draft as a working draft, not a final published result.

Then:

- review the draft
- check validation issues
- convert it to an article draft
- continue editing in the article editor

### “A source monitor entry is failing.”

Do this:

- check the latest error message
- try `Fetch now`
- verify the URL and format
- pause or archive the source if it is no longer a good target

## Part 9: Important Limits

To avoid misunderstandings, remember these limits:

- the reporter system does not publish automatically
- the interview tool is login-gated and staff-created
- the interview tool is not an unrestricted chatbot
- source analysis and draft generation depend on supplied material
- open blockers and unreviewed interview output can stop drafting
- monitored sources help collect inputs, not approve publication

## Part 10: Best Practices

### For public tip submitters

- be specific
- include dates and places
- include links if you have them
- explain why local readers should care

### For newsroom staff

- keep run titles and topics clear
- add source material before drafting
- use blockers honestly
- review interview output before relying on it
- treat claims and validation issues as real editorial checkpoints

### For interview participants

- answer in detail
- separate personal knowledge from secondhand information
- include names, dates, locations, and timeline where possible
- say when you are unsure

### For monitored-source operators

- use clear labels
- choose the right source format
- start with realistic fetch cadence
- test with `Fetch now`
- use `Run Due Sources` for manual checks

## Quick Reference

### Public intake

- Page: `/report-a-story`
- Goal: submit a story request or tip

### Reporter queue

- Page: `/admin/reporter`
- Goal: review and create reporter runs

### Reporter run detail

- Page: `/admin/reporter/[id]`
- Goal: manage one story effort end to end

### Interview session

- Page: `/interviews/[id]`
- Goal: interviewee completes guided browser interview

### Monitored sources

- Page: `/admin/reporter/sources`
- Goal: track recurring public-interest sources and run fetches

## Final Summary

The easiest way to understand the Reporter system is this:

- `Report A Story` brings ideas in
- `Admin Reporter` manages the story work
- `Interviews` gather structured direct-source answers
- `Sources` hold the reporting packet
- `Blockers` explain what is missing
- `Analysis` helps staff understand the material
- `Drafts` help staff produce article drafts from that material
- `Convert` hands the work into the normal article editor
- `Source Monitor` watches recurring public-interest sources over time

The system is designed to help the newsroom work more clearly and consistently, while keeping human editorial judgment in control.
