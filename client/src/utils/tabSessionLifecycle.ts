const SESSION_TAB_ID_KEY = "cfuturo:session-tab-id";
const OPEN_TABS_KEY = "cfuturo:session-open-tabs";

const TAB_HEARTBEAT_INTERVAL_MS = 15_000;
const ACTIVE_TAB_STALE_MS = 90_000;
const CLOSING_TAB_STALE_MS = 15_000;

type TabRegistryEntry = {
  lastSeen: number;
  closingAt: number | null;
};

type TabRegistry = Record<string, TabRegistryEntry>;

function safeParseRegistry(raw: string | null): TabRegistry {
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as TabRegistry;
  } catch {
    return {};
  }
}

function readRegistry(): TabRegistry {
  if (typeof window === "undefined") return {};
  return safeParseRegistry(window.localStorage.getItem(OPEN_TABS_KEY));
}

function writeRegistry(registry: TabRegistry): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(OPEN_TABS_KEY, JSON.stringify(registry));
}

function pruneRegistry(registry: TabRegistry, now = Date.now()): TabRegistry {
  const next: TabRegistry = {};

  for (const [tabId, entry] of Object.entries(registry)) {
    const lastSeen = Number(entry?.lastSeen);
    const closingAt =
      entry?.closingAt === null || entry?.closingAt === undefined ? null : Number(entry.closingAt);

    const activeFresh = Number.isFinite(lastSeen) && closingAt === null && now - lastSeen < ACTIVE_TAB_STALE_MS;
    const closingFresh =
      closingAt !== null && Number.isFinite(closingAt) && now - closingAt < CLOSING_TAB_STALE_MS;

    if (activeFresh || closingFresh) {
      next[tabId] = {
        lastSeen: Number.isFinite(lastSeen) ? lastSeen : now,
        closingAt,
      };
    }
  }

  return next;
}

function createTabId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getOrCreateTabId(): { tabId: string; hadExistingTab: boolean } {
  if (typeof window === "undefined") {
    return { tabId: "server", hadExistingTab: false };
  }

  const current = window.sessionStorage.getItem(SESSION_TAB_ID_KEY)?.trim() || "";
  if (current) {
    return { tabId: current, hadExistingTab: true };
  }

  const tabId = createTabId();
  window.sessionStorage.setItem(SESSION_TAB_ID_KEY, tabId);
  return { tabId, hadExistingTab: false };
}

export function initializeTabSessionLifecycle(): {
  tabId: string;
  shouldLogoutOnFreshOpen: boolean;
} {
  const { tabId, hadExistingTab } = getOrCreateTabId();
  const registry = pruneRegistry(readRegistry());
  const entries = Object.values(registry);
  const hasOnlyClosingEntries =
    entries.length > 0 && entries.every((entry) => typeof entry.closingAt === "number");
  const shouldLogoutOnFreshOpen = !hadExistingTab && hasOnlyClosingEntries;

  if (shouldLogoutOnFreshOpen) {
    writeRegistry({});
  }

  markTabActive(tabId);
  return { tabId, shouldLogoutOnFreshOpen };
}

export function markTabActive(tabId: string): void {
  if (typeof window === "undefined" || !tabId) return;

  const now = Date.now();
  const registry = pruneRegistry(readRegistry(), now);
  registry[tabId] = {
    lastSeen: now,
    closingAt: null,
  };
  writeRegistry(registry);
}

export function markTabClosing(tabId: string): void {
  if (typeof window === "undefined" || !tabId) return;

  const now = Date.now();
  const registry = pruneRegistry(readRegistry(), now);
  const current = registry[tabId];

  if (!current) {
    registry[tabId] = { lastSeen: now, closingAt: now };
  } else {
    registry[tabId] = {
      lastSeen: current.lastSeen,
      closingAt: now,
    };
  }

  writeRegistry(registry);
}

export const tabSessionHeartbeatMs = TAB_HEARTBEAT_INTERVAL_MS;
