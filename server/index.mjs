#!/usr/bin/env node
// Zero-dependency stdio MCP server: get_passage(reference, translation: kjv|bsb)
// Passage = { reference, translation, verses: [{book, chapter, verse, text}], text }
import { createInterface } from "node:readline";

const PROTOCOL = "2025-06-18";
const clean = (s) => String(s).replace(/\s+/g, " ").trim();

async function getJson(url) {
  const r = await fetch(url, { headers: { accept: "application/json" } });
  if (!r.ok) throw new Error(`Passage not found (HTTP ${r.status})`);
  return r.json();
}

async function kjv(reference) {
  const d = await getJson(`https://bible-api.com/${encodeURIComponent(reference)}?translation=kjv`);
  if (d.error || !d.verses?.length) throw new Error(d.error || "Passage not found");
  const verses = d.verses.map((v) => ({ book: v.book_name, chapter: v.chapter, verse: v.verse, text: clean(v.text) }));
  return { reference: d.reference, translation: "KJV", verses, text: verses.map((v) => v.text).join(" ") };
}

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const ALIASES = { psalm: "PSA", ps: "PSA", songofsongs: "SNG", songofsolomon: "SNG", song: "SNG", canticles: "SNG", revelations: "REV" };
let bookCache;
async function bsbBook(name) {
  if (!bookCache) bookCache = (await getJson("https://bible.helloao.org/api/BSB/books.json")).books;
  const n = norm(name);
  const id = ALIASES[n];
  return bookCache.find((b) => b.id === id || norm(b.id) === n || norm(b.name) === n || norm(b.commonName) === n)
    || (n.length >= 3 && bookCache.find((b) => norm(b.commonName).startsWith(n)));
}
const verseText = (content) => clean(content.map((c) => (typeof c === "string" ? c : c?.text ?? "")).join(" "));

async function bsb(reference) {
  const m = clean(reference).match(/^(.+?)\s+(\d+)(?::(\d+)(?:\s*-\s*(\d+))?)?$/);
  if (!m) throw new Error(`Could not parse reference "${reference}" (try "John 3:16" or "Psalm 23:1-3")`);
  const [, bookName, ch, v1, v2] = m;
  const book = await bsbBook(bookName);
  if (!book) throw new Error(`Unknown book "${bookName}"`);
  const d = await getJson(`https://bible.helloao.org/api/BSB/${book.id}/${ch}.json`);
  const lo = v1 ? +v1 : 1, hi = v2 ? +v2 : v1 ? +v1 : Infinity;
  const verses = d.chapter.content
    .filter((c) => c.type === "verse" && c.number >= lo && c.number <= hi)
    .map((c) => ({ book: book.commonName, chapter: +ch, verse: c.number, text: verseText(c.content) }));
  if (!verses.length) throw new Error(`Passage not found: ${reference}`);
  const ref = `${book.commonName} ${ch}` + (v1 ? `:${lo}${v2 ? `-${hi}` : ""}` : "");
  return { reference: ref, translation: "BSB", verses, text: verses.map((v) => v.text).join(" ") };
}

const TOOL = {
  name: "get_passage",
  description: "Get the exact text of a Bible passage in KJV or BSB. Quote the returned text verbatim with the translation name; never invent verse text.",
  inputSchema: {
    type: "object",
    properties: {
      reference: { type: "string", description: 'e.g. "John 3:16", "Psalm 23:1-3", "Romans 8"' },
      translation: { type: "string", enum: ["kjv", "bsb"], default: "kjv" },
    },
    required: ["reference"],
  },
};

async function handle(msg) {
  const { method, params } = msg;
  if (method === "initialize")
    return { protocolVersion: params?.protocolVersion || PROTOCOL, capabilities: { tools: {} }, serverInfo: { name: "bible-lookup", version: "0.1.0" } };
  if (method === "ping") return {};
  if (method === "tools/list") return { tools: [TOOL] };
  if (method === "tools/call") {
    if (params?.name !== TOOL.name) throw Object.assign(new Error(`Unknown tool ${params?.name}`), { code: -32602 });
    const { reference, translation = "kjv" } = params.arguments || {};
    try {
      if (!reference) throw new Error("reference is required");
      const t = String(translation).toLowerCase();
      if (t !== "kjv" && t !== "bsb") throw new Error(`Unsupported translation "${translation}" (use kjv or bsb)`);
      const p = await (t === "kjv" ? kjv(reference) : bsb(reference));
      return { content: [{ type: "text", text: JSON.stringify(p) }], structuredContent: p };
    } catch (e) {
      return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
    }
  }
  throw Object.assign(new Error(`Method not found: ${method}`), { code: -32601 });
}

const send = (o) => process.stdout.write(JSON.stringify(o) + "\n");
createInterface({ input: process.stdin }).on("line", async (line) => {
  if (!line.trim()) return;
  let msg;
  try { msg = JSON.parse(line); } catch { return send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }); }
  if (msg.id === undefined) return; // notification
  try { send({ jsonrpc: "2.0", id: msg.id, result: await handle(msg) }); }
  catch (e) { send({ jsonrpc: "2.0", id: msg.id, error: { code: e.code || -32603, message: e.message } }); }
});
