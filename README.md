# bible-lookup

An Agent Plugin that lets Cursor agents and bots look up the exact text of Bible passages in two public-domain translations:

- **KJV** (King James Version), from [bible-api.com](https://bible-api.com)
- **BSB** (Berean Standard Bible), from the [Free Use Bible API](https://bible.helloao.org). The BSB is public domain ([berean.bible](https://berean.bible/)).

Neither source needs an API key or account.

## What's included

- `server/index.mjs`: a stdio MCP server written in plain Node (18+, uses built-in `fetch`) with no dependencies
- `mcp.json`: starts the server with `node server/index.mjs`
- `skills/bible-lookup/SKILL.md`: tells the agent to call the tool instead of quoting verses from memory, and to quote the returned text exactly with the translation name

## Install

Requires Node.js 18 or newer.

- **From cursor.directory:** install the `bible-lookup` plugin.
- **Locally:** copy this folder (a real folder, not a symlink) to `~/.cursor/plugins/local/bible-lookup`, then reload Cursor.

There is nothing to configure.

## Tool: `get_passage`

| Argument | Type | Notes |
| --- | --- | --- |
| `reference` | string, required | e.g. `John 3:16`, `Psalm 23:1-3`, `Romans 8` |
| `translation` | `kjv` \| `bsb` | defaults to `kjv` |

Returns a Passage:

```json
{
  "reference": "John 3:16",
  "translation": "BSB",
  "verses": [{ "book": "John", "chapter": 3, "verse": 16, "text": "For God so loved the world that He gave His one and only Son, that everyone who believes in Him shall not perish but have eternal life." }],
  "text": "For God so loved the world that He gave His one and only Son, ..."
}
```

An unknown book or a passage that doesn't exist comes back as a tool error (`isError: true`) with a short message.

## Limits

- **KJV and BSB only.** NIV, NASB and ESV are copyrighted and not included.
- **BSB passages must stay within one chapter.** A reference like `John 3:16-4:2` works for KJV but not BSB.
- KJV references are returned the way bible-api.com writes them (e.g. "Psalms 23:1-3").
- Both sources are free community services with no uptime guarantee. bible-api.com limits how often it can be called.

## License

The code is under the MIT license (see [LICENSE](LICENSE)). The KJV and BSB texts are public domain.
