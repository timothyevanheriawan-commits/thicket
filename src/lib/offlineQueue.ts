// Persists entries that couldn't reach Supabase (offline, or the network
// dropped mid-request) so they survive a page reload and get retried once
// the connection comes back. This is intentionally a flat localStorage
// array, not IndexedDB — the queue is expected to hold at most a handful
// of items at once (how many entries would anyone log during one offline
// stretch?), so the extra complexity of IndexedDB isn't earning its keep
// here.

const STORAGE_KEY = "thicket:offline-queue";

export type QueuedEntryInput = {
  type: "expense" | "task";
  label: string;
  amount?: number;
  category?: string;
  dueDate?: string; // ISO string — Date doesn't survive JSON.stringify
};

export type QueuedEntry = {
  localId: string;
  input: QueuedEntryInput;
  createdAt: string; // ISO string, preserves the original capture time
};

function readQueue(): QueuedEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Corrupted or non-JSON value somehow ended up in this key — treat it
    // as an empty queue rather than throwing on every render.
    return [];
  }
}

function writeQueue(queue: QueuedEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Storage full or unavailable (private browsing, quota) — the entry
    // still exists in React state for this session, it just won't survive
    // a reload. Nothing meaningful to recover here.
  }
}

export function getOfflineQueue(): QueuedEntry[] {
  return readQueue();
}

export function enqueueOfflineEntry(item: QueuedEntry) {
  const queue = readQueue();
  queue.push(item);
  writeQueue(queue);
}

export function removeFromOfflineQueue(localId: string) {
  writeQueue(readQueue().filter((item) => item.localId !== localId));
}
