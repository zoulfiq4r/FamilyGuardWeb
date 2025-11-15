export interface Location {
  id: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
  altitude?: number;
  speed?: number;
  heading?: number;
  provider?: string;
  providerAccuracy?: number;
  source?: string;
  isMock?: boolean;
  batteryLevel?: number;
  activityType?: string;
}

export function toDate(value: unknown): Date | null {
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

  if (typeof (value as { toDate?: () => Date })?.toDate === "function") {
    return (value as { toDate: () => Date }).toDate();
  }

  return null;
}

export function formatRelativeTime(date?: Date | null): string {
  if (!date) {
    return "Just now";
  }

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60 * 1000) {
    return "Just now";
  }

  const minutes = Math.floor(diffMs / (60 * 1000));
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatSpeed(speed?: number): string {
  if (speed == null || Number.isNaN(speed)) {
    return "—";
  }

  const kmh = speed * 3.6;
  return `${kmh.toFixed(1)} km/h`;
}

export function formatHeading(heading?: number): string {
  if (heading == null || Number.isNaN(heading)) {
    return "—";
  }
  return `${Math.round(heading)}°`;
}

export function formatAltitude(altitude?: number): string {
  if (altitude == null || Number.isNaN(altitude)) {
    return "—";
  }
  return `${Math.round(altitude)} m`;
}

export function formatBattery(battery?: number): string {
  if (battery == null || Number.isNaN(battery)) {
    return "—";
  }

  const normalized = battery <= 1 ? battery * 100 : battery;
  return `${Math.round(normalized)}%`;
}

export function normalizeLocationRecord(id: string, data: Record<string, unknown>): Location | null {
  if (data.latitude == null || data.longitude == null) {
    return null;
  }

  const numberOrUndefined = (value: unknown): number | undefined =>
    typeof value === "number" ? value : undefined;

  const stringOrUndefined = (value: unknown): string | undefined =>
    typeof value === "string" ? value : undefined;

  const provider =
    stringOrUndefined(data.provider) ||
    stringOrUndefined(data.providerName) ||
    stringOrUndefined(data.locationProvider) ||
    stringOrUndefined(data.source);

  const speed = numberOrUndefined(data.speed) ?? numberOrUndefined(data.velocity);
  const heading = numberOrUndefined(data.heading) ?? numberOrUndefined(data.bearing);

  const batteryLevel =
    numberOrUndefined(data.batteryLevel) ??
    numberOrUndefined(data.battery) ??
    numberOrUndefined(data.deviceBattery);

  return {
    id,
    latitude: Number(data.latitude),
    longitude: Number(data.longitude),
    accuracy: numberOrUndefined(data.accuracy) ?? 0,
    timestamp:
      toDate(
        data.timestamp ??
          data.recordedAt ??
          data.createdAt ??
          data.updatedAt ??
          data.generatedAt
      ) ?? new Date(),
    altitude: numberOrUndefined(data.altitude) ?? numberOrUndefined(data.alt),
    speed,
    heading,
    provider,
    providerAccuracy:
      numberOrUndefined(data.providerAccuracy) ?? numberOrUndefined(data.verticalAccuracy),
    source: stringOrUndefined(data.source) ?? provider,
    isMock:
      typeof data.isMock === "boolean"
        ? data.isMock
        : typeof data.mocked === "boolean"
        ? data.mocked
        : undefined,
    batteryLevel,
    activityType:
      stringOrUndefined(data.activityType) ?? stringOrUndefined(data.activity),
  };
}
