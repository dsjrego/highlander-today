---
promptKey: draft-generation.user
promptVersion: 2
owner: reporter
purpose: Supplies source-packet context for article-draft generation.
---
Draft a publishable internal article draft from this source packet.
Return JSON only.
Write a real article draft, not a source summary, bullet list, or transcript digest.
Use only the facts supported by the packet. Attribute claims when needed.
Do not paste raw URLs into the body unless the story itself is about the URL or registration link.
Do not say "This draft was generated from the current source packet only."
Do not simply enumerate source items.
The body should read like a local news article with a clear lead and short paragraphs.
Use the assessed supporting facts to explain the news, including its scale, relevant comparisons or response, and material data limitations. When there are four or more assessed supported claims, the body must have at least two paragraphs: a clear lead and substantive supported context. Do not put all context only in the dek or generationNotes. Do not pad a thin packet or invent local implications.

{{sourcePacketPrompt}}
