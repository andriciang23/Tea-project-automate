import fs from "node:fs";
import path from "node:path";
import type Anthropic from "@anthropic-ai/sdk";

/**
 * Lightweight JSON-file persistence so chat history, the webhook-dedup set, and
 * saved "regular" orders survive process restarts. Single-process, atomic writes,
 * debounced. Plenty for a personal merchant bot; swap for SQLite/Redis if it ever
 * needs to scale horizontally.
 */

export interface RegularOrder {
  name: string;
  items: { product: string; variant?: string; quantity: number }[];
}

interface StoreData {
  histories: Record<string, Anthropic.MessageParam[]>;
  seen: string[];
  regulars: Record<string, RegularOrder>; // keyed by lowercased customer name
}

const DATA_DIR = path.resolve(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "store.json");
const SEEN_LIMIT = 2000;

let data: StoreData = { histories: {}, seen: [], regulars: {} };
const seenSet = new Set<string>();
let saveTimer: NodeJS.Timeout | null = null;

export function loadStore(): void {
  try {
    if (fs.existsSync(FILE)) {
      const parsed = JSON.parse(fs.readFileSync(FILE, "utf8")) as Partial<StoreData>;
      data = {
        histories: parsed.histories ?? {},
        seen: parsed.seen ?? [],
        regulars: parsed.regulars ?? {},
      };
      for (const id of data.seen) seenSet.add(id);
    }
  } catch (err) {
    console.error("Failed to load store, starting fresh:", err);
    data = { histories: {}, seen: [], regulars: {} };
  }
}

function scheduleSave(): void {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    saveNow();
  }, 500);
  saveTimer.unref?.();
}

/** Flush to disk immediately (atomic write). Call on shutdown. */
export function saveNow(): void {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    data.seen = Array.from(seenSet);
    const tmp = `${FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data));
    fs.renameSync(tmp, FILE);
  } catch (err) {
    console.error("Failed to save store:", err);
  }
}

// ---- Conversation history ----

export function getHistory(chatId: string): Anthropic.MessageParam[] {
  if (!data.histories[chatId]) data.histories[chatId] = [];
  return data.histories[chatId];
}

/** Schedule a save after history was mutated in place. */
export function persist(): void {
  scheduleSave();
}

// ---- Webhook dedup ----

export function hasSeen(id: string): boolean {
  return seenSet.has(id);
}

export function markSeen(id: string): void {
  seenSet.add(id);
  if (seenSet.size > SEEN_LIMIT) {
    const oldest = seenSet.values().next().value;
    if (oldest !== undefined) seenSet.delete(oldest);
  }
  scheduleSave();
}

// ---- Regulars ("the usual") ----

const regKey = (name: string) => name.trim().toLowerCase();

export function getRegular(name: string): RegularOrder | null {
  return data.regulars[regKey(name)] ?? null;
}

export function saveRegular(reg: RegularOrder): void {
  data.regulars[regKey(reg.name)] = reg;
  scheduleSave();
}

export function listRegulars(): RegularOrder[] {
  return Object.values(data.regulars);
}
