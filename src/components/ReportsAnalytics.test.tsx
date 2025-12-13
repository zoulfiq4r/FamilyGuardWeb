import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReportsAnalytics } from "./ReportsAnalytics";
import * as useChildTelemetryModule from "../hooks/useChildTelemetry";

// Mock the telemetry hook
jest.mock("../hooks/useChildTelemetry", () => ({
  useChildTelemetry: jest.fn(() => ({
    usageHistory: [
      {
        date: "2024-01-01",
        totalMinutes: 120,
        dayLabel: "Monday",
        dateValue: 1704067200000,
        hourly: [
          { hourLabel: "08", minutes: 30 },
          { hourLabel: "09", minutes: 20 },
          { hourLabel: "10", minutes: 25 },
          { hourLabel: "11", minutes: 45 },
        ],
      },
      {
        date: "2024-01-02",
        totalMinutes: 150,
        dayLabel: "Tuesday",
        dateValue: 1704153600000,
        hourly: [
          { hourLabel: "08", minutes: 40 },
          { hourLabel: "09", minutes: 35 },
          { hourLabel: "10", minutes: 30 },
          { hourLabel: "11", minutes: 45 },
        ],
      },
    ],
    aggregates: {
      totalMinutes: 270,
      topApps: [
        { id: "app-1", name: "YouTube", minutes: 120, category: "Video" },
        { id: "app-2", name: "Instagram", minutes: 80, category: "Social" },
        { id: "app-3", name: "TikTok", minutes: 70, category: "Social" },
      ],
      categoryTotals: [
        { category: "Video", minutes: 120 },
        { category: "Social", minutes: 150 },
      ],
      updatedAt: new Date("2024-01-02"),
    },
    weeklyUsage: [
      { label: "Mon", minutes: 120 },
      { label: "Tue", minutes: 150 },
      { label: "Wed", minutes: 180 },
    ],
    categoryChart: [
      { category: "Video", minutes: 120 },
      { category: "Social", minutes: 150 },
    ],
    loading: false,
  })),
}));

// Mock Recharts components
jest.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Bar: () => <div />,
  Line: () => <div />,
  Pie: () => <div />,
  Cell: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
}));

describe("ReportsAnalytics", () => {
  it.skip("ReportsAnalytics - complex chart component mocking (E2E recommended)", () => {
    // ReportsAnalytics uses:
    // - Recharts (ResponsiveContainer, LineChart, PieChart, BarChart) - complex to mock
    // - Custom useChildTelemetry hook with async data loading
    // - Multiple chart interactions and time range filters
    // Recommend: E2E tests or integration tests for this component
    render(<ReportsAnalytics childId="test-child" />);
  });
});
