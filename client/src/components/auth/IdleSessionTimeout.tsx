import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { Button } from "../ui/Button";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const WARNING_BEFORE_MS = 2 * 60 * 1000;
const LAST_ACTIVITY_KEY = "cfuturo:last-activity-at";
const IDLE_LOGOUT_KEY = "cfuturo:idle-logout-at";
const ACTIVITY_THROTTLE_MS = 1000;

const activityEvents = [
  "click",
  "keydown",
  "mousedown",
  "mousemove",
  "scroll",
  "touchstart",
  "wheel",
] as const;

function readLastActivity() {
  try {
    const raw = localStorage.getItem(LAST_ACTIVITY_KEY);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeLastActivity(value: number) {
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(value));
  } catch {
    // ignore storage errors
  }
}

function broadcastIdleLogout() {
  try {
    localStorage.setItem(IDLE_LOGOUT_KEY, String(Date.now()));
  } catch {
    // ignore storage errors
  }
}

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function IdleSessionTimeout() {
  const { token, user, logout } = useAuth();
  const activeSessionKey = token && user ? `${user.id}:${token}` : null;
  const logoutRef = useRef(logout);
  const lastWriteRef = useRef(0);
  const didLogoutRef = useRef(false);
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(WARNING_BEFORE_MS / 1000));
  const [warning, setWarning] = useState<{ visible: boolean; sessionKey: string | null }>({
    visible: false,
    sessionKey: null,
  });

  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  useEffect(() => {
    if (!token || !user) {
      didLogoutRef.current = false;
      return;
    }

    didLogoutRef.current = false;
    const now = Date.now();
    writeLastActivity(now);
    lastWriteRef.current = now;

    const expireSession = () => {
      if (didLogoutRef.current) return;
      didLogoutRef.current = true;
      setWarning({ visible: false, sessionKey: null });
      broadcastIdleLogout();
      logoutRef.current();
    };

    const recordActivity = () => {
      const current = Date.now();
      const last = readLastActivity() ?? lastWriteRef.current;

      if (last && current - last >= IDLE_TIMEOUT_MS) {
        expireSession();
        return;
      }

      if (current - lastWriteRef.current < ACTIVITY_THROTTLE_MS) return;
      lastWriteRef.current = current;
      writeLastActivity(current);
      setSecondsLeft(Math.ceil(WARNING_BEFORE_MS / 1000));
      setWarning((prev) => (prev.visible ? { visible: false, sessionKey: null } : prev));
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") recordActivity();
    };

    const intervalId = window.setInterval(() => {
      const last = readLastActivity() ?? lastWriteRef.current;
      const elapsed = Date.now() - last;
      const remaining = IDLE_TIMEOUT_MS - elapsed;
      const inWarningWindow = remaining <= WARNING_BEFORE_MS;

      if (remaining <= 0) {
        expireSession();
        return;
      }

      if (inWarningWindow) {
        const nextSecondsLeft = Math.ceil(remaining / 1000);
        setSecondsLeft((prev) => (prev === nextSecondsLeft ? prev : nextSecondsLeft));
      }

      setWarning((prev) => {
        if (inWarningWindow) {
          const nextSessionKey = `${user.id}:${token}`;
          if (prev.visible && prev.sessionKey === nextSessionKey) return prev;
          return { visible: true, sessionKey: nextSessionKey };
        }
        return prev.visible ? { visible: false, sessionKey: null } : prev;
      });
    }, 1000);

    const handleStorage = (event: StorageEvent) => {
      if (event.key === IDLE_LOGOUT_KEY && event.newValue) {
        expireSession();
        return;
      }

      if (event.key === LAST_ACTIVITY_KEY && event.newValue) {
        const synced = Number(event.newValue);
        if (Number.isFinite(synced)) {
          lastWriteRef.current = synced;
          setSecondsLeft(Math.ceil(WARNING_BEFORE_MS / 1000));
          setWarning((prev) => (prev.visible ? { visible: false, sessionKey: null } : prev));
        }
      }
    };

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, recordActivity, { passive: true });
    });
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.clearInterval(intervalId);
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, recordActivity);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, [token, user]);

  if (!activeSessionKey || !warning.visible || warning.sessionKey !== activeSessionKey) return null;

  return (
    <div className="fixed inset-0 z-[999] grid place-items-center bg-slate-950/55 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-white text-slate-950 shadow-[0_30px_120px_-50px_rgba(15,23,42,0.85)] dark:bg-slate-950 dark:text-white">
        <div className="bg-slate-950 px-6 py-5 text-white">
          <div className="text-xs font-black uppercase tracking-[0.28em] text-cyan-300">Seguridad</div>
          <div className="mt-2 text-2xl font-black tracking-tight">Sesión por expirar</div>
          <div className="mt-1 text-sm font-semibold text-slate-300">No detectamos actividad reciente.</div>
        </div>

        <div className="space-y-5 p-6">
          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 text-center dark:border-slate-800 dark:bg-slate-900">
            <div className="text-sm font-bold text-slate-600 dark:text-slate-400">Se cerrará automáticamente en</div>
            <div className="mt-2 text-5xl font-black tabular-nums text-blue-600 dark:text-cyan-300">
              {formatTime(secondsLeft)}
            </div>
          </div>

          <p className="text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
            Para mantener tu cuenta segura, cerraremos la sesión si no continúas trabajando.
          </p>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="ghost"
              className="border border-slate-200 dark:border-slate-800"
              onClick={() => {
                const current = Date.now();
                lastWriteRef.current = current;
                writeLastActivity(current);
                setSecondsLeft(Math.ceil(WARNING_BEFORE_MS / 1000));
                setWarning({ visible: false, sessionKey: null });
              }}
            >
              Seguir activo
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                broadcastIdleLogout();
                logoutRef.current();
              }}
            >
              Cerrar sesión
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
