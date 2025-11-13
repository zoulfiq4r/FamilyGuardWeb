import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebase";

interface FirestoreTimestamp {
  toDate?: () => Date;
  seconds?: number;
  nanoseconds?: number;
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "number") {
    return new Date(value);
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.valueOf())) {
      return parsed;
    }
  }

  const timestampLike = value as FirestoreTimestamp;
  if (typeof timestampLike?.toDate === "function") {
    return timestampLike.toDate() ?? null;
  }

  if (
    typeof timestampLike?.seconds === "number" &&
    typeof timestampLike?.nanoseconds === "number"
  ) {
    return new Date(timestampLike.seconds * 1000 + timestampLike.nanoseconds / 1e6);
  }

  return null;
}

function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export interface CurrentAppActivity {
  id?: string;
  name: string;
  packageName?: string;
  category?: string;
  iconUrl?: string;
  startedAt?: Date | null;
  lastUpdated?: Date | null;
  durationMinutes?: number;
  meta?: Record<string, unknown>;
}

export interface HourlyUsagePoint {
  hourLabel: string;
  minutes: number;
}

export interface UsageHistoryEntry {
  id: string;
  date: string;
  totalMinutes: number;
  hourly: HourlyUsagePoint[];
  dayLabel: string;
  dateValue: number;
  raw?: Record<string, unknown>;
}

export interface AggregateTopApp {
  id?: string;
  name: string;
  packageName?: string;
  minutes: number;
  category?: string;
  iconUrl?: string;
}

export interface AppUsageAggregate {
  totalMinutes: number;
  averageDailyMinutes?: number;
  categoryTotals: Array<{ category: string; minutes: number }>;
  topApps: AggregateTopApp[];
  updatedAt?: Date | null;
}

export interface UseChildCurrentAppResult {
  currentApp: CurrentAppActivity | null;
  loading: boolean;
  error?: string | null;
}

export interface UseChildUsageHistoryResult {
  history: UsageHistoryEntry[];
  loading: boolean;
  error?: string | null;
}

export interface UseAppUsageAggregatesResult {
  aggregate: AppUsageAggregate | null;
  loading: boolean;
  error?: string | null;
}

export interface UseChildTelemetryResult {
  currentApp: CurrentAppActivity | null;
  usageHistory: UsageHistoryEntry[];
  aggregates: AppUsageAggregate | null;
  hourlyToday: HourlyUsagePoint[];
  weeklyUsage: Array<{ label: string; hours: number; minutes: number }>;
  todayTotalMinutes: number;
  yesterdayTotalMinutes: number;
  trendMinutes: number;
  categoryChart: Array<{ category: string; minutes: number }>;
  loading: boolean;
}

function normalizeCurrentApp(id: string | undefined, data: Record<string, unknown> | undefined): CurrentAppActivity | null {
  if (!data) {
    return null;
  }

  const name =
    (typeof data.name === "string" && data.name) ||
    (typeof data.appName === "string" && data.appName) ||
    (typeof data.title === "string" && data.title) ||
    (typeof data.packageName === "string" && data.packageName) ||
    "Unknown App";

  const packageName =
    (typeof data.packageName === "string" && data.packageName) ||
    (typeof data.bundleId === "string" && data.bundleId) ||
    (typeof data.identifier === "string" && data.identifier) ||
    undefined;

  const category =
    (typeof data.category === "string" && data.category) ||
    (typeof data.type === "string" && data.type) ||
    undefined;

  const iconUrl =
    (typeof data.iconUrl === "string" && data.iconUrl) ||
    (typeof data.icon === "string" && data.icon) ||
    (typeof data.imageUrl === "string" && data.imageUrl) ||
    undefined;

  const startedAt =
    toDate(
      data.startedAt ??
        data.startTime ??
        data.firstSeenAt ??
        data.openedAt ??
        data.sessionStartedAt
    ) ?? null;

  const lastUpdated =
    toDate(
      data.lastUpdated ??
        data.updatedAt ??
        data.timestamp ??
        data.lastSeenAt ??
        data.sessionEndedAt
    ) ?? null;

  const durationRaw =
    (typeof data.durationMinutes === "number" && data.durationMinutes) ||
    (typeof data.totalMinutes === "number" && data.totalMinutes) ||
    (typeof data.durationSeconds === "number" && data.durationSeconds / 60) ||
    undefined;

  return {
    id,
    name,
    packageName,
    category,
    iconUrl,
    startedAt,
    lastUpdated,
    durationMinutes: durationRaw,
    meta: data,
  };
}

function normalizeHourlyBreakdown(raw: unknown): HourlyUsagePoint[] {
  if (!raw) {
    return [];
  }

  if (Array.isArray(raw)) {
    return raw
      .map((entry) => {
        if (typeof entry !== "object" || entry === null) {
          return null;
        }
        const hourValue =
          (entry as Record<string, unknown>).hour ??
          (entry as Record<string, unknown>).label ??
          (entry as Record<string, unknown>).time;

        const minutesValue =
          (entry as Record<string, unknown>).minutes ??
          (entry as Record<string, unknown>).value ??
          (entry as Record<string, unknown>).duration ??
          (entry as Record<string, unknown>).totalMinutes;

        const hourLabel =
          typeof hourValue === "number"
            ? hourValue.toString().padStart(2, "0")
            : typeof hourValue === "string"
            ? hourValue
            : null;

        const minutes =
          typeof minutesValue === "number"
            ? minutesValue
            : typeof minutesValue === "string"
            ? parseFloat(minutesValue)
            : null;

        if (!hourLabel || minutes == null || Number.isNaN(minutes)) {
          return null;
        }

        return {
          hourLabel: hourLabel.length === 1 ? `0${hourLabel}` : hourLabel,
          minutes,
        };
      })
      .filter(Boolean) as HourlyUsagePoint[];
  }

  if (typeof raw === "object") {
    return Object.entries(raw as Record<string, unknown>)
      .map(([key, value]) => {
        if (value == null) {
          return null;
        }

        const minutes =
          typeof value === "number"
            ? value
            : typeof value === "string"
            ? parseFloat(value)
            : null;

        if (minutes == null || Number.isNaN(minutes)) {
          return null;
        }

        return {
          hourLabel: key.length === 1 ? `0${key}` : key,
          minutes,
        };
      })
      .filter(Boolean) as HourlyUsagePoint[];
  }

  return [];
}

function normalizeUsageHistory(id: string, data: Record<string, unknown>): UsageHistoryEntry {
  const dateValue =
    toDate(
      data.date ??
        data.day ??
        data.dateKey ??
        data.timestamp ??
        data.dayStart ??
        data.recordedAt
    ) ?? new Date();

  const totalMinutesRaw =
    (typeof data.totalMinutes === "number" && data.totalMinutes) ||
    (typeof data.totalUsageMinutes === "number" && data.totalUsageMinutes) ||
    (typeof data.screenTimeMinutes === "number" && data.screenTimeMinutes) ||
    (typeof data.totalSeconds === "number" && data.totalSeconds / 60) ||
    0;

  const hourly = normalizeHourlyBreakdown(
    data.hourlyBreakdown ??
      data.hourly ??
      data.hourlyUsage ??
      data.hourlyMinutes ??
      data.hours
  );

  const dayLabel = dateValue.toLocaleDateString(undefined, { weekday: "short" });

  return {
    id,
    date: formatDateKey(dateValue),
    totalMinutes: totalMinutesRaw,
    hourly,
    dayLabel,
    dateValue: dateValue.getTime(),
    raw: data,
  };
}

function normalizeAggregate(data: Record<string, unknown>): AppUsageAggregate {
  const totalMinutes =
    (typeof data.totalMinutes === "number" && data.totalMinutes) ||
    (typeof data.totalUsageMinutes === "number" && data.totalUsageMinutes) ||
    (typeof data.screenTimeMinutes === "number" && data.screenTimeMinutes) ||
    0;

  const averageDailyMinutes =
    (typeof data.averageDailyMinutes === "number" && data.averageDailyMinutes) ||
    (typeof data.avgDailyMinutes === "number" && data.avgDailyMinutes) ||
    undefined;

  const updatedAt = toDate(
    data.updatedAt ?? data.calculatedAt ?? data.generatedAt ?? data.timestamp
  );

  const categoryTotalsRaw =
    (Array.isArray(data.categoryTotals) && data.categoryTotals) ||
    (Array.isArray(data.categories) && data.categories) ||
    data.categoryMinutes ||
    data.categoriesTotals ||
    {};

  const categoryTotals: Array<{ category: string; minutes: number }> = Array.isArray(
    categoryTotalsRaw
  )
    ? (categoryTotalsRaw as Array<Record<string, unknown>>)
        .map((entry) => {
          if (!entry) {
            return null;
          }

          const categoryLabel =
            (typeof entry.category === "string" && entry.category) ||
            (typeof entry.name === "string" && entry.name);
          const minutesValue =
            (typeof entry.minutes === "number" && entry.minutes) ||
            (typeof entry.totalMinutes === "number" && entry.totalMinutes) ||
            (typeof entry.value === "number" && entry.value) ||
            null;

          if (!categoryLabel || minutesValue == null) {
            return null;
          }

          return { category: categoryLabel, minutes: minutesValue };
        })
        .filter(Boolean) as Array<{ category: string; minutes: number }>
    : Object.entries(categoryTotalsRaw as Record<string, unknown>)
        .map(([category, value]) => {
          const minutes =
            typeof value === "number"
              ? value
              : typeof value === "string"
              ? parseFloat(value)
              : null;

          if (minutes == null || Number.isNaN(minutes)) {
            return null;
          }

          return { category, minutes };
        })
        .filter(Boolean) as Array<{ category: string; minutes: number }>;

  const topAppsRaw = Array.isArray(data.topApps)
    ? data.topApps
    : Array.isArray(data.topApplications)
    ? data.topApplications
    : [];

  const topApps: AggregateTopApp[] = (topAppsRaw as Array<Record<string, unknown>>)
    .map((app, index) => {
      if (!app) {
        return null;
      }

      const name =
        (typeof app.name === "string" && app.name) ||
        (typeof app.appName === "string" && app.appName) ||
        (typeof app.packageName === "string" && app.packageName) ||
        undefined;

      const minutes =
        (typeof app.minutes === "number" && app.minutes) ||
        (typeof app.totalMinutes === "number" && app.totalMinutes) ||
        (typeof app.usageMinutes === "number" && app.usageMinutes) ||
        (typeof app.usageSeconds === "number" && app.usageSeconds / 60) ||
        null;

      if (!name || minutes == null) {
        return null;
      }

      return {
        id:
          (typeof app.id === "string" && app.id) ||
          (typeof app.packageName === "string" && app.packageName) ||
          `${index}`,
        name,
        packageName:
          (typeof app.packageName === "string" && app.packageName) ||
          (typeof app.bundleId === "string" && app.bundleId) ||
          undefined,
        minutes,
        category:
          (typeof app.category === "string" && app.category) ||
          (typeof app.type === "string" && app.type) ||
          undefined,
        iconUrl:
          (typeof app.iconUrl === "string" && app.iconUrl) ||
          (typeof app.icon === "string" && app.icon) ||
          undefined,
      };
    })
    .filter(Boolean) as AggregateTopApp[];

  return {
    totalMinutes,
    averageDailyMinutes,
    categoryTotals,
    topApps,
    updatedAt,
  };
}

function pickMoreRecentCurrentApp(
  candidate: CurrentAppActivity | null,
  existing: CurrentAppActivity | null
): CurrentAppActivity | null {
  if (!candidate) {
    return existing;
  }

  if (!existing) {
    return candidate;
  }

  const candidateTime =
    candidate.lastUpdated?.getTime() ?? candidate.startedAt?.getTime() ?? 0;
  const existingTime =
    existing.lastUpdated?.getTime() ?? existing.startedAt?.getTime() ?? 0;

  return candidateTime >= existingTime ? candidate : existing;
}

export function useChildCurrentApp(childId: string | null): UseChildCurrentAppResult {
  const [currentApp, setCurrentApp] = useState<CurrentAppActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!childId) {
      setCurrentApp(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribers: Array<() => void> = [];

    try {
      const currentAppRef = collection(db, "children", childId, "currentApp");
      const unsubCurrentApp = onSnapshot(
        currentAppRef,
        (snapshot) => {
          if (snapshot.empty) {
            setCurrentApp((existing) => (existing ? existing : null));
            setLoading(false);
            return;
          }

          const normalized = snapshot.docs
            .map((docSnapshot) => normalizeCurrentApp(docSnapshot.id, docSnapshot.data()))
            .filter(Boolean) as CurrentAppActivity[];

          normalized.sort(
            (a, b) =>
              (b.lastUpdated?.getTime() ?? b.startedAt?.getTime() ?? 0) -
              (a.lastUpdated?.getTime() ?? a.startedAt?.getTime() ?? 0)
          );

          if (normalized.length > 0) {
            setCurrentApp(normalized[0]);
          }
          setLoading(false);
        },
        (err) => {
          console.error("useChildCurrentApp: failed to listen to currentApp collection", err);
          setError("Unable to fetch live app activity right now.");
          setLoading(false);
        }
      );

      unsubscribers.push(unsubCurrentApp);
    } catch (err) {
      console.error("useChildCurrentApp: error setting up collection listener", err);
      setError("Unable to fetch live app activity right now.");
      setLoading(false);
    }

    try {
      const childDocRef = doc(db, "children", childId);
      const unsubChildDoc = onSnapshot(
        childDocRef,
        (snapshot) => {
          if (!snapshot.exists()) {
            return;
          }

          const childData = snapshot.data();
          const embeddedCurrentApp = childData?.currentApp;

          if (embeddedCurrentApp && typeof embeddedCurrentApp === "object") {
            const normalized = normalizeCurrentApp("childDoc", embeddedCurrentApp as Record<string, unknown>);
            setCurrentApp((existing) => pickMoreRecentCurrentApp(normalized, existing));
          }
        },
        (err) => {
          console.error("useChildCurrentApp: failed to listen to child doc", err);
        }
      );

      unsubscribers.push(unsubChildDoc);
    } catch (err) {
      console.error("useChildCurrentApp: error setting up child doc listener", err);
    }

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [childId]);

  return { currentApp, loading, error };
}

export function useChildUsageHistory(childId: string | null): UseChildUsageHistoryResult {
  const [history, setHistory] = useState<UsageHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!childId) {
      setHistory([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    let unsubscribe: (() => void) | undefined;

    try {
      const usageRef = collection(db, "children", childId, "usageHistory");
      unsubscribe = onSnapshot(
        usageRef,
        (snapshot) => {
          const normalized = snapshot.docs
            .map((docSnapshot) => normalizeUsageHistory(docSnapshot.id, docSnapshot.data()))
            .filter(Boolean) as UsageHistoryEntry[];

          normalized.sort((a, b) => b.dateValue - a.dateValue);

          setHistory(normalized);
          setLoading(false);
        },
        (err) => {
          console.error("useChildUsageHistory: failed to listen to usage history", err);
          setError("Unable to load usage history right now.");
          setHistory([]);
          setLoading(false);
        }
      );
    } catch (err) {
      console.error("useChildUsageHistory: error setting up listener", err);
      setError("Unable to load usage history right now.");
      setHistory([]);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [childId]);

  return { history, loading, error };
}

export function useAppUsageAggregates(childId: string | null): UseAppUsageAggregatesResult {
  const [aggregate, setAggregate] = useState<AppUsageAggregate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!childId) {
      setAggregate(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    let unsubscribe: (() => void) | undefined;

    try {
      const aggregatesRef = doc(db, "appUsageAggregates", childId);
      unsubscribe = onSnapshot(
        aggregatesRef,
        (snapshot) => {
          if (!snapshot.exists()) {
            setAggregate(null);
            setLoading(false);
            return;
          }

          const normalized = normalizeAggregate(snapshot.data());
          setAggregate(normalized);
          setLoading(false);
        },
        (err) => {
          console.error("useAppUsageAggregates: failed to listen to aggregates", err);
          setError("Unable to load usage aggregates right now.");
          setAggregate(null);
          setLoading(false);
        }
      );
    } catch (err) {
      console.error("useAppUsageAggregates: error setting up listener", err);
      setError("Unable to load usage aggregates right now.");
      setAggregate(null);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [childId]);

  return { aggregate, loading, error };
}

export function useChildTelemetry(childId: string | null): UseChildTelemetryResult {
  const { currentApp, loading: currentAppLoading } = useChildCurrentApp(childId);
  const { history, loading: historyLoading } = useChildUsageHistory(childId);
  const { aggregate, loading: aggregateLoading } = useAppUsageAggregates(childId);

  const todayKey = formatDateKey(new Date());

  const todayEntry = useMemo(() => {
    if (history.length === 0) {
      return null;
    }

    const exactMatch = history.find((entry) => entry.date === todayKey);
    if (exactMatch) {
      return exactMatch;
    }

    return history[0];
  }, [history, todayKey]);

  const yesterdayEntry = useMemo(() => {
    if (history.length < 2) {
      const other = history.find((entry) => entry.date !== todayEntry?.date);
      return other ?? null;
    }

    if (history[0] === todayEntry) {
      return history[1];
    }

    return history[0];
  }, [history, todayEntry]);

  const weeklyUsage = useMemo(() => {
    const subset = history.slice(0, 7);
    return subset
      .map((entry) => ({
        label: entry.dayLabel,
        hours: Number((entry.totalMinutes / 60).toFixed(2)),
        minutes: entry.totalMinutes,
      }))
      .reverse();
  }, [history]);

  const categoryChart = useMemo(() => {
    if (!aggregate?.categoryTotals?.length) {
      return [];
    }
    return aggregate.categoryTotals;
  }, [aggregate]);

  return {
    currentApp,
    usageHistory: history,
    aggregates: aggregate,
    hourlyToday: todayEntry?.hourly ?? [],
    weeklyUsage,
    todayTotalMinutes: todayEntry?.totalMinutes ?? 0,
    yesterdayTotalMinutes: yesterdayEntry?.totalMinutes ?? 0,
    trendMinutes: (todayEntry?.totalMinutes ?? 0) - (yesterdayEntry?.totalMinutes ?? 0),
    categoryChart,
    loading: currentAppLoading || historyLoading || aggregateLoading,
  };
}
