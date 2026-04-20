export const GUATEMALA_TIME_ZONE = "America/Guatemala";

const GUATEMALA_OFFSET = "-06:00";
const EXPLICIT_TIME_ZONE_RE = /(?:z|[+-]\d{2}:?\d{2})$/i;
const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_DATETIME_RE =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/;

type ParseOptions = {
  endOfDayIfMidnight?: boolean;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function isExplicitTimeZone(value: string) {
  return EXPLICIT_TIME_ZONE_RE.test(value.trim());
}

function formatDateTimeLocalParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: GUATEMALA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function parseGuatemalaDateTime(
  value: string | Date | null | undefined,
  options: ParseOptions = {}
): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const raw = value.trim();
  if (!raw) return null;

  if (isExplicitTimeZone(raw)) {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const dateOnly = raw.match(DATE_ONLY_RE);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    const time = options.endOfDayIfMidnight ? "23:59:59.999" : "00:00:00";
    const d = new Date(`${year}-${month}-${day}T${time}${GUATEMALA_OFFSET}`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const local = raw.match(LOCAL_DATETIME_RE);
  if (local) {
    const [, year, month, day, hour, minute, second = "00", millis = ""] = local;
    const isMidnight =
      hour === "00" &&
      minute === "00" &&
      Number(second) === 0 &&
      Number((millis || "0").padEnd(3, "0")) === 0;
    const time =
      options.endOfDayIfMidnight && isMidnight
        ? "23:59:59.999"
        : `${hour}:${minute}:${pad(Number(second))}${millis ? `.${millis.padEnd(3, "0")}` : ""}`;
    const d = new Date(`${year}-${month}-${day}T${time}${GUATEMALA_OFFSET}`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export function formatGuatemalaDateTime(
  value: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions & ParseOptions = {}
) {
  const { endOfDayIfMidnight, ...formatOptions } = options;
  const d = parseGuatemalaDateTime(value, { endOfDayIfMidnight });
  if (!d) return value ? String(value) : "";

  return d.toLocaleString("es-GT", {
    timeZone: GUATEMALA_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
    ...formatOptions,
  });
}

export function toDateTimeLocalValue(value: string | Date | null | undefined) {
  if (!value) return "";
  if (value instanceof Date) return formatDateTimeLocalParts(value);

  const raw = value.trim();
  if (!raw) return "";
  if (!isExplicitTimeZone(raw)) return raw.replace(" ", "T").slice(0, 16);

  const d = parseGuatemalaDateTime(raw);
  return d ? formatDateTimeLocalParts(d) : raw.replace(" ", "T").slice(0, 16);
}

export function fromDateTimeLocalValue(local: string) {
  if (!local) return local;
  const value = local.replace("T", " ");
  return value.length === 16 ? `${value}:00` : value;
}

export function compareDateTimeLocalValues(left: string, right: string) {
  const leftDate = parseGuatemalaDateTime(fromDateTimeLocalValue(left));
  const rightDate = parseGuatemalaDateTime(fromDateTimeLocalValue(right));
  if (!leftDate || !rightDate) return null;
  return leftDate.getTime() - rightDate.getTime();
}
