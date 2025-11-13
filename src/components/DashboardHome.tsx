import { useMemo } from "react";
import {
  Activity,
  BarChart3,
  Clock,
  Smartphone,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  useChildTelemetry,
  type UsageHistoryEntry,
} from "../hooks/useChildTelemetry";

interface DashboardHomeProps {
  childId: string;
}

const CATEGORY_COLORS = [
  "#2563eb",
  "#f97316",
  "#22c55e",
  "#a855f7",
  "#14b8a6",
  "#f43f5e",
  "#facc15",
  "#6366f1",
];

function formatMinutes(totalMinutes: number): string {
  if (!totalMinutes || Number.isNaN(totalMinutes)) {
    return "0m";
  }

  const minutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes}m`;
  }

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

function formatRelativeTime(date?: Date | null): string {
  if (!date) {
    return "Just now";
  }

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) {
    return "Just now";
  }

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

function formatHourLabel(label: string): string {
  if (!label) {
    return "";
  }

  if (label.includes(":")) {
    return label;
  }

  const numericHour = Number(label);
  if (Number.isNaN(numericHour)) {
    return label;
  }

  return `${numericHour.toString().padStart(2, "0")}:00`;
}

function findLongestDay(entries: UsageHistoryEntry[]): UsageHistoryEntry | null {
  if (!entries.length) {
    return null;
  }

  return entries.reduce((longest, entry) => {
    if (!longest) {
      return entry;
    }
    return entry.totalMinutes > longest.totalMinutes ? entry : longest;
  });
}

export function DashboardHome({ childId }: DashboardHomeProps) {
  const telemetry = useChildTelemetry(childId);

  const screenTimeTargetMinutes = 8 * 60;
  const screenTimeProgress = Math.min(
    100,
    (telemetry.todayTotalMinutes / screenTimeTargetMinutes) * 100
  );

  const trendPercent =
    telemetry.yesterdayTotalMinutes > 0
      ? (telemetry.trendMinutes / telemetry.yesterdayTotalMinutes) * 100
      : 0;

  const trendPositive = telemetry.trendMinutes >= 0;

  const hourlyData = useMemo(
    () =>
      [...telemetry.hourlyToday]
        .sort(
          (a, b) =>
            Number(a.hourLabel.replace(/\D/g, "")) -
            Number(b.hourLabel.replace(/\D/g, ""))
        )
        .map((point) => ({
          ...point,
          label: formatHourLabel(point.hourLabel),
          hours: Number((point.minutes / 60).toFixed(2)),
        })),
    [telemetry.hourlyToday]
  );

  const weeklyChartData = useMemo(
    () =>
      telemetry.weeklyUsage.map((entry) => ({
        day: entry.label,
        hours: Number((entry.minutes / 60).toFixed(2)),
        minutes: entry.minutes,
      })),
    [telemetry.weeklyUsage]
  );

  const categoryChartData = telemetry.categoryChart.map((entry, index) => ({
    ...entry,
    value: entry.minutes,
    fill: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
  }));

  const topApps = telemetry.aggregates?.topApps?.slice(0, 5) ?? [];
  const longestDay = findLongestDay(telemetry.usageHistory.slice(0, 7));
  const totalWeeklyMinutes = telemetry.weeklyUsage.reduce(
    (sum, entry) => sum + entry.minutes,
    0
  );

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col gap-2">
        <div>
          <h1 className="text-gray-800 text-3xl mb-1">Dashboard</h1>
          <p className="text-gray-500">
            Live device telemetry, usage analytics, and activity insights.
          </p>
        </div>
        {telemetry.loading && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            Syncing with the device in real time...
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-sm text-gray-500">
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Screen-time Today
              </span>
              <Badge
                variant="outline"
                className="bg-blue-50 text-blue-600 border-blue-200"
              >
                Live
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3 mb-4">
              <div className="text-4xl text-gray-900">
                {formatMinutes(telemetry.todayTotalMinutes)}
              </div>
              <div
                className={`flex items-center gap-1 text-sm ${
                  trendPositive ? "text-red-500" : "text-emerald-600"
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                {trendPositive ? "+" : ""}
                {formatMinutes(Math.abs(telemetry.trendMinutes))} (
                {trendPercent > 0 ? trendPercent.toFixed(1) : "0"}%)
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Compared to yesterday&apos;s{" "}
              {formatMinutes(telemetry.yesterdayTotalMinutes)}.
            </p>
            <Progress value={screenTimeProgress} />
            <p className="text-xs text-gray-400 mt-2">
              Target: {formatMinutes(screenTimeTargetMinutes)} per day
            </p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-sm text-gray-500">
              <span className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Live Activity
              </span>
              <div className="flex items-center gap-2 text-emerald-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topApps.length === 0 && !telemetry.currentApp ? (
              <p className="text-sm text-gray-500">
                Waiting for the device to report the current app...
              </p>
            ) : (
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 text-xl font-semibold">
                  {telemetry.currentApp?.name?.[0] ?? <Smartphone className="w-6 h-6" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-semibold text-gray-900">
                      {telemetry.currentApp?.name ?? "No activity yet"}
                    </p>
                    {telemetry.currentApp?.category && (
                      <Badge variant="outline" className="text-xs">
                        {telemetry.currentApp.category}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {telemetry.currentApp?.packageName ?? "Idle"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Last updated {formatRelativeTime(telemetry.currentApp?.lastUpdated)}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-indigo-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm text-gray-500">
              <BarChart3 className="w-4 h-4" />
              Weekly Highlights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Past 7 days</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatMinutes(totalWeeklyMinutes)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Avg per day</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatMinutes(
                    totalWeeklyMinutes / Math.max(telemetry.weeklyUsage.length, 1)
                  )}
                </p>
              </div>
            </div>
            {longestDay ? (
              <div className="p-3 rounded-2xl bg-indigo-50 text-sm text-gray-700">
                Longest day: <strong>{longestDay.dayLabel}</strong> (
                {formatMinutes(longestDay.totalMinutes)})
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-gray-50 text-sm text-gray-500">
                No usage history available yet.
              </div>
            )}
            {telemetry.aggregates?.updatedAt && (
              <p className="text-xs text-gray-400">
                Aggregated {formatRelativeTime(telemetry.aggregates.updatedAt)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              Weekly Screen Time Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weeklyChartData.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">
                Usage history has not been reported for this child yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={weeklyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" unit="h" />
                  <Tooltip formatter={(value: number) => `${value}h`} />
                  <Bar dataKey="hours" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-purple-500" />
              Usage by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoryChartData.length === 0 ? (
              <p className="text-sm text-gray-500">
                No category breakdown is available yet.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    dataKey="value"
                    nameKey="category"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={entry.category} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip formatter={(value: number) => formatMinutes(value)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Hourly Breakdown (Today)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hourlyData.length === 0 ? (
              <p className="text-sm text-gray-500">
                Hourly usage for today hasn&apos;t been reported yet.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={hourlyData}>
                  <CartesianGrid stroke="#f3f4f6" />
                  <XAxis dataKey="label" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" unit="m" />
                  <Tooltip formatter={(value: number) => `${value}m`} />
                  <Line
                    type="monotone"
                    dataKey="minutes"
                    stroke="#f97316"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-blue-500" />
              Top Apps This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topApps.length === 0 ? (
              <p className="text-sm text-gray-500">
                We&apos;ll list the most used apps once telemetry arrives.
              </p>
            ) : (
              <div className="space-y-4">
                {topApps.map((app) => (
                  <div key={app.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{app.name}</p>
                      <p className="text-xs text-gray-500">
                        {app.category ?? "Uncategorized"}
                      </p>
                    </div>
                    <Badge className="bg-blue-50 text-blue-600 hover:bg-blue-100">
                      {formatMinutes(app.minutes)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
