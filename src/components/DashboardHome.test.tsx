import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { DashboardHome, __TESTING__ } from "./DashboardHome";

const mockUseChildTelemetry = jest.fn();

jest.mock("../hooks/useChildTelemetry", () => ({
  useChildTelemetry: (...args: Parameters<typeof mockUseChildTelemetry>) =>
    mockUseChildTelemetry(...args),
}));

jest.mock("recharts", () => {
  const MockWrapper = ({ children }: { children?: ReactNode }) => (
    <div data-testid="recharts-mock">{children}</div>
  );
  const MockElement = () => <div data-testid="recharts-element" />;

  return {
    ResponsiveContainer: MockWrapper,
    BarChart: MockWrapper,
    Bar: MockElement,
    XAxis: MockElement,
    YAxis: MockElement,
    CartesianGrid: MockElement,
    Tooltip: MockElement,
    LineChart: MockWrapper,
    Line: MockElement,
    PieChart: MockWrapper,
    Pie: MockWrapper,
    Cell: MockElement,
    Legend: MockElement,
  };
});

const baseTelemetry: any = {
  loading: false,
  todayTotalMinutes: 180,
  yesterdayTotalMinutes: 120,
  trendMinutes: 45,
  hourlyToday: [
    { hourLabel: "08", minutes: 30 },
    { hourLabel: "09", minutes: 20 },
  ],
  weeklyUsage: [
    { label: "Mon", minutes: 120 },
    { label: "Tue", minutes: 90 },
  ],
  categoryChart: [{ category: "Social", minutes: 45 }],
  aggregates: {
    updatedAt: new Date("2024-01-02T12:00:00Z"),
    topApps: [
      { id: "app-1", name: "Snapchat", category: "Social", minutes: 120 },
      { id: "app-2", name: "Mystery App", minutes: 60 },
    ],
  },
  currentApp: {
    name: "YouTube",
    packageName: "com.google.android.youtube",
    category: "Video",
    lastUpdated: new Date("2024-01-02T12:00:00Z"),
  },
  usageHistory: [
    { dayLabel: "Monday", totalMinutes: 200 },
    { dayLabel: "Tuesday", totalMinutes: 100 },
  ],
};

describe("DashboardHome", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders live telemetry data and charts", () => {
    mockUseChildTelemetry.mockReturnValue({
      ...baseTelemetry,
      loading: true,
    });

    render(<DashboardHome childId="child-123" />);

    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Screen-time Today/i)).toBeInTheDocument();
    expect(screen.getByText(/Snapchat/i)).toBeInTheDocument();
    expect(screen.getByText(/Uncategorized/i)).toBeInTheDocument();
    expect(screen.getByText(/Target: 8h per day/i)).toBeInTheDocument();
  });

  it("renders the live card fallback when no current app is present", () => {
    mockUseChildTelemetry.mockReturnValue({
      ...baseTelemetry,
      currentApp: undefined,
    });

    render(<DashboardHome childId="child-789" />);

    expect(screen.getByText(/No activity yet/i)).toBeInTheDocument();
  });

  it("shows fallback messaging when telemetry is empty", () => {
    mockUseChildTelemetry.mockReturnValue({
      ...baseTelemetry,
      loading: false,
      todayTotalMinutes: 0,
      yesterdayTotalMinutes: 0,
      trendMinutes: -15,
      hourlyToday: [],
      weeklyUsage: [],
      categoryChart: [],
      topApps: [],
      currentApp: undefined,
      usageHistory: [],
      aggregates: {},
    });

    render(<DashboardHome childId="child-456" />);

    expect(screen.getByText(/Usage history has not been reported/i)).toBeInTheDocument();
    expect(screen.getByText(/No category breakdown is available yet/i)).toBeInTheDocument();
    expect(screen.getByText(/Hourly usage for today hasn't been reported yet/i)).toBeInTheDocument();
    expect(
      screen.getByText(/We'll list the most used apps once telemetry arrives/i)
    ).toBeInTheDocument();
  });
});

describe("DashboardHome helpers", () => {
  const {
    formatMinutes,
    formatRelativeTime,
    formatHourLabel,
    findLongestDay,
    formatHoursTooltip,
    formatPieTooltip,
    formatLineTooltip,
  } = __TESTING__;

  it("formats minutes into friendly strings", () => {
    expect(formatMinutes(0)).toBe("0m");
    expect(formatMinutes(45)).toBe("45m");
    expect(formatMinutes(120)).toBe("2h");
    expect(formatMinutes(90)).toBe("1h 30m");
  });

  it("describes relative times across all windows", () => {
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(new Date("2024-01-02T12:00:00Z").getTime());
    expect(formatRelativeTime(null)).toBe("Just now");
    expect(formatRelativeTime(new Date("2024-01-02T11:59:30Z"))).toBe("Just now");
    expect(formatRelativeTime(new Date("2024-01-02T11:50:00Z"))).toBe("10m ago");
    expect(formatRelativeTime(new Date("2024-01-02T10:00:00Z"))).toBe("2h ago");
    expect(formatRelativeTime(new Date("2024-01-01T12:00:00Z"))).toBe("1d ago");
    nowSpy.mockRestore();
  });

  it("normalizes hour labels and finds longest day", () => {
    expect(formatHourLabel("")).toBe("");
    expect(formatHourLabel("07:30")).toBe("07:30");
    expect(formatHourLabel("9")).toBe("09:00");
    expect(formatHourLabel("noon")).toBe("noon");

    expect(findLongestDay([])).toBeNull();
    const result = findLongestDay([
      undefined as any,
      { dayLabel: "Mon", totalMinutes: 40 } as any,
      { dayLabel: "Tue", totalMinutes: 100 } as any,
      { dayLabel: "Wed", totalMinutes: 60 } as any,
    ]);
    expect(result).toMatchObject({ dayLabel: "Tue", totalMinutes: 100 });

    expect(formatHoursTooltip(2.5)).toBe("2.5h");
    expect(formatPieTooltip(90)).toBe("1h 30m");
    expect(formatLineTooltip(15)).toBe("15m");
  });
});
