import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { DashboardHome } from "./DashboardHome";

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
    topApps: [{ id: "app-1", name: "Snapchat", category: "Social", minutes: 120 }],
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
    expect(screen.getByText(/Target: 8h per day/i)).toBeInTheDocument();
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
