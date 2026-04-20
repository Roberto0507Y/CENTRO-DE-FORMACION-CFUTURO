import { TtlCache } from "../../common/utils/ttlCache";
import type { AuthUserSessionState } from "./auth.types";

const SESSION_STATE_TTL_MS = 5_000;

const sessionStateCache = new TtlCache<number, AuthUserSessionState>({
  ttlMs: SESSION_STATE_TTL_MS,
  maxEntries: 1_000,
  pruneIntervalMs: 30_000,
});

export function getCachedSessionState(userId: number): AuthUserSessionState | null {
  return sessionStateCache.get(userId);
}

export function setCachedSessionState(user: AuthUserSessionState): void {
  sessionStateCache.set(user.id, user);
}

export function invalidateSessionState(userId: number): void {
  sessionStateCache.delete(userId);
}
