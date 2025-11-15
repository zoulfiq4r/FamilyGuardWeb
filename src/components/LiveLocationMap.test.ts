import {
  toDate,
  formatRelativeTime,
  formatSpeed,
  formatHeading,
  formatAltitude,
  formatBattery,
  normalizeLocationRecord,
} from "./liveLocationUtils";

describe("LiveLocationMap helper utilities", () => {
  describe("toDate", () => {
    it("returns a Date instance for supported inputs", () => {
      const baseDate = new Date("2024-01-01T00:00:00Z");
      expect(toDate(baseDate)).toBe(baseDate);
      expect(toDate(baseDate.getTime())?.toISOString()).toBe(baseDate.toISOString());
      expect(toDate(baseDate.toISOString())?.toISOString()).toBe(baseDate.toISOString());

      const firestoreLike = { toDate: () => baseDate };
      expect(toDate(firestoreLike)).toBe(baseDate);
    });

    it("returns null for unsupported values", () => {
      expect(toDate(undefined)).toBeNull();
      expect(toDate("not-a-date")).toBeNull();
    });
  });

  describe("formatRelativeTime", () => {
    let nowSpy: jest.SpyInstance<number, []>;
    const fixedNow = new Date("2024-01-01T00:00:00Z").getTime();

    beforeEach(() => {
      nowSpy = jest.spyOn(Date, "now").mockReturnValue(fixedNow);
    });

    afterEach(() => {
      nowSpy.mockRestore();
    });

    it("describes moments within a minute as just now", () => {
      expect(formatRelativeTime(new Date(fixedNow - 30 * 1000))).toBe("Just now");
      expect(formatRelativeTime(null)).toBe("Just now");
    });

    it("describes minutes, hours, and days appropriately", () => {
      expect(formatRelativeTime(new Date(fixedNow - 5 * 60 * 1000))).toBe("5m ago");
      expect(formatRelativeTime(new Date(fixedNow - 2 * 60 * 60 * 1000))).toBe("2h ago");
      expect(formatRelativeTime(new Date(fixedNow - 3 * 24 * 60 * 60 * 1000))).toBe("3d ago");
    });
  });

  describe("formatters", () => {
    it("formats numeric telemetry with fallbacks", () => {
      expect(formatSpeed(10)).toBe("36.0 km/h");
      expect(formatSpeed(undefined)).toBe("—");
      expect(formatHeading(91.2)).toBe("91°");
      expect(formatHeading(undefined)).toBe("—");
      expect(formatAltitude(150.6)).toBe("151 m");
      expect(formatAltitude(NaN)).toBe("—");
      expect(formatBattery(0.58)).toBe("58%");
      expect(formatBattery(76)).toBe("76%");
      expect(formatBattery(undefined)).toBe("—");
    });
  });

  describe("normalizeLocationRecord", () => {
    it("returns null when coordinates are missing", () => {
      expect(normalizeLocationRecord("loc", {})).toBeNull();
    });

    it("normalizes mixed location payloads", () => {
      const timestamp = new Date("2024-01-01T12:00:00Z");
      const normalized = normalizeLocationRecord("loc-1", {
        latitude: "40.7128",
        longitude: "-74.006",
        accuracy: 5,
        timestamp,
        speed: 2,
        heading: 90,
        providerName: "gps",
        battery: 0.8,
        activityType: "walking",
      });

      expect(normalized).toMatchObject({
        id: "loc-1",
        latitude: 40.7128,
        longitude: -74.006,
        accuracy: 5,
        speed: 2,
        heading: 90,
        provider: "gps",
        source: "gps",
        batteryLevel: 0.8,
        activityType: "walking",
      });
      expect(normalized?.timestamp).toEqual(timestamp);
    });
  });
});
