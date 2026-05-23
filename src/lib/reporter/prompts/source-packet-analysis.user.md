---
promptKey: source-packet-analysis.user
promptVersion: 1
owner: reporter
purpose: Supplies source-packet context for internal Reporter Agent analysis generation.
---
Generate Reporter Agent analysis from this source packet.
Return JSON only.
The body must use exactly these section headings in this order:
What we know
Source strength
Missing information
Reporting gaps
Coverage recommendation
Next steps

This is internal newsroom analysis, not a public article or press-brief rewrite.
Each section should contain concise bullet-style lines or short paragraphs.
Make every section specific to this story. Do not use generic placeholder advice.
Do not write vague filler such as "additional sourcing may still be needed", "review the strongest source items", or "identify missing primary-source confirmation".
Source strength must name the strongest source item and the weakest source item or weakest unsupported claim in this packet.
Missing information must name the exact unanswered questions for this story.
Reporting gaps must explain what is weak, missing, single-sourced, or unverified in this packet.
Coverage recommendation must explicitly choose one of: draft-ready, brief-ready, or needs more sourcing.
Coverage recommendation must explain why that label fits this specific packet.
If only a brief is supportable, say so directly. If the packet is too weak for a draft, say so directly.
Next steps must be concrete reporting actions tied to this story, not generic process advice.
Separate confirmed facts from claims that appear only once or remain unattributed.
Do not output a public news story lead or framing brainstorm in this analysis.

{{sourcePacketPrompt}}
