---
name: bible-lookup
description: Use whenever you need to quote, read, or check the wording of a Bible verse or passage in the KJV or BSB.
---
# Bible lookup

Call the `get_passage` tool with `reference` (e.g. "John 3:16", "Psalm 23:1-3", "Romans 8") and `translation` (`kjv` or `bsb`; default `kjv` if the user doesn't say).

- Never write verse text from memory. If you need the wording, call the tool first.
- Quote the returned `text` word for word, with the reference and translation name, e.g. "... (John 3:16, KJV)".
- If the tool returns an error, say the passage couldn't be found. Don't guess at the text.
- Only KJV and BSB are available. If someone asks for NIV, NASB, ESV, or another version, say it isn't available and offer KJV or BSB.
