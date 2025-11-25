import { 
  BarChart3,
  Calendar,
  Download,
  TrendingUp,
  Clock,
  Smartphone
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { useChildTelemetry } from "../hooks/useChildTelemetry";
import { useState, useMemo } from "react";

interface ReportsAnalyticsProps {
  childId: string;
}

export function ReportsAnalytics({ childId }: ReportsAnalyticsProps) {
  const { usageHistory, aggregates, weeklyUsage, categoryChart, loading } = useChildTelemetry(childId);
  const [, setTimeRange] = useState("week");

  // Process daily screen time from last 7 days
  const dailyScreenTime = useMemo(() => {
    if (!weeklyUsage || weeklyUsage.length === 0) {
      return [
        { day: "Mon", hours: 0 },
        { day: "Tue", hours: 0 },
        { day: "Wed", hours: 0 },
        { day: "Thu", hours: 0 },
        { day: "Fri", hours: 0 },
        { day: "Sat", hours: 0 },
        { day: "Sun", hours: 0 },
      ];
    }
    return weeklyUsage.map(day => ({
      day: day.label,
      hours: day.hours
    }));
  }, [weeklyUsage]);

  // Calculate weekly trend from usage history (last 4 weeks)
  const weeklyTrend = useMemo(() => {
    if (!usageHistory || usageHistory.length === 0) {
      return [
        { week: "Week 1", hours: 0 },
        { week: "Week 2", hours: 0 },
        { week: "Week 3", hours: 0 },
        { week: "Week 4", hours: 0 },
      ];
    }

    // Group by week
    const weeks: Record<number, number> = {};
    const now = new Date();
    
    usageHistory.forEach(entry => {
      const entryDate = new Date(entry.dateValue);
      const weeksDiff = Math.floor((now.getTime() - entryDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
      
      if (weeksDiff < 4) {
        weeks[weeksDiff] = (weeks[weeksDiff] || 0) + (entry.totalMinutes / 60);
      }
    });

    return [
      { week: "Week 4", hours: Math.round((weeks[3] || 0) * 10) / 10 },
      { week: "Week 3", hours: Math.round((weeks[2] || 0) * 10) / 10 },
      { week: "Week 2", hours: Math.round((weeks[1] || 0) * 10) / 10 },
      { week: "Week 1", hours: Math.round((weeks[0] || 0) * 10) / 10 },
    ];
  }, [usageHistory]);

  // Process app categories from aggregates
  const appCategories = useMemo(() => {
    if (!categoryChart || categoryChart.length === 0) {
      return [
        { name: "No Data", value: 100, color: "#6b7280" }
      ];
    }

    const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#6b7280"];
    return categoryChart.map((cat, index) => ({
      name: cat.category,
      value: Math.round(cat.minutes),
      color: colors[index % colors.length]
    }));
  }, [categoryChart]);

  // Top apps for browsing history table
  const browsingHistory = useMemo(() => {
    if (!aggregates?.topApps || aggregates.topApps.length === 0) {
      return [];
    }

    return aggregates.topApps.slice(0, 6).map(app => ({
      website: app.name,
      visits: "-", // Not tracked in current schema
      time: `${Math.floor(app.minutes / 60)}h ${Math.round(app.minutes % 60)}m`,
      category: app.category || "Unknown"
    }));
  }, [aggregates]);

  // Calculate summary stats
  const totalScreenTimeHours = useMemo(() => {
    const totalMinutes = dailyScreenTime.reduce((sum, day) => sum + (day.hours * 60), 0);
    return Math.round((totalMinutes / 60) * 10) / 10;
  }, [dailyScreenTime]);

  const dailyAverage = useMemo(() => {
    const days = dailyScreenTime.filter(d => d.hours > 0).length || 1;
    return Math.round((totalScreenTimeHours / days) * 10) / 10;
  }, [totalScreenTimeHours, dailyScreenTime]);

  const appsUsedCount = useMemo(() => {
    return aggregates?.topApps?.length || 0;
  }, [aggregates]);

  const mostActiveDay = useMemo(() => {
    if (dailyScreenTime.length === 0) return { day: "-", hours: 0 };
    
    const max = dailyScreenTime.reduce((prev, current) => 
      current.hours > prev.hours ? current : prev
    , dailyScreenTime[0]);
    
    return { day: max.day, hours: Math.round(max.hours * 10) / 10 };
  }, [dailyScreenTime]);

  const weeklyChange = useMemo(() => {
    if (weeklyTrend.length < 2) return 0;
    const current = weeklyTrend[weeklyTrend.length - 1]?.hours || 0;
    const previous = weeklyTrend[weeklyTrend.length - 2]?.hours || 0;
    if (previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100);
  }, [weeklyTrend]);

  const handleExportReport = () => {
    // Create CSV content
    const date = new Date().toLocaleDateString();
    let csvContent = `FamilyGuard Usage Report - ${date}\n\n`;
    
    // Summary Stats
    csvContent += `Summary Statistics\n`;
    csvContent += `Total Screen Time,${totalScreenTimeHours} hours\n`;
    csvContent += `Daily Average,${dailyAverage} hours\n`;
    csvContent += `Apps Used,${appsUsedCount}\n`;
    csvContent += `Most Active Day,${mostActiveDay.day} (${mostActiveDay.hours} hours)\n`;
    csvContent += `Weekly Change,${weeklyChange >= 0 ? '+' : ''}${weeklyChange}%\n\n`;

    // Daily Screen Time
    csvContent += `Daily Screen Time\n`;
    csvContent += `Day,Hours\n`;
    dailyScreenTime.forEach(day => {
      csvContent += `${day.day},${day.hours}\n`;
    });
    csvContent += `\n`;

    // Weekly Trend
    csvContent += `Weekly Trend\n`;
    csvContent += `Week,Hours\n`;
    weeklyTrend.forEach(week => {
      csvContent += `${week.week},${week.hours}\n`;
    });
    csvContent += `\n`;

    // App Categories
    csvContent += `App Categories\n`;
    csvContent += `Category,Minutes\n`;
    appCategories.forEach(cat => {
      csvContent += `${cat.name},${cat.value}\n`;
    });
    csvContent += `\n`;

    // Top Apps
    if (browsingHistory.length > 0) {
      csvContent += `Top Apps Usage\n`;
      csvContent += `App Name,Time Spent,Category\n`;
      browsingHistory.forEach(app => {
        csvContent += `${app.website},${app.time},${app.category}\n`;
      });
    }

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `familyguard-report-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-gray-800 text-3xl mb-2">Reports & Analytics</h1>
          <p className="text-gray-500">Detailed insights into device usage patterns</p>
        </div>
        <div className="flex items-center gap-3">
          <Select defaultValue="week" onValueChange={setTimeRange}>
            <SelectTrigger className="w-40 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2 rounded-xl">
            <Calendar className="w-4 h-4" />
            Custom Range
          </Button>
          <Button 
            className="gap-2 rounded-xl bg-blue-500 hover:bg-blue-600"
            onClick={handleExportReport}
          >
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500 mb-1">Total Screen Time</div>
                <div className="text-2xl text-gray-800">{totalScreenTimeHours} hrs</div>
                <div className={`flex items-center gap-1 text-sm mt-1 ${weeklyChange >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                  <TrendingUp className="w-3 h-3" />
                  {weeklyChange >= 0 ? '+' : ''}{weeklyChange}% vs last week
                </div>
              </div>
              <div className="bg-blue-100 rounded-xl p-3">
                <Clock className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500 mb-1">Daily Average</div>
                <div className="text-2xl text-gray-800">{dailyAverage} hrs</div>
                <div className="text-sm text-gray-500 mt-1">Per day</div>
              </div>
              <div className="bg-green-100 rounded-xl p-3">
                <BarChart3 className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500 mb-1">Apps Used</div>
                <div className="text-2xl text-gray-800">{appsUsedCount}</div>
                <div className="text-sm text-gray-500 mt-1">Different apps</div>
              </div>
              <div className="bg-purple-100 rounded-xl p-3">
                <Smartphone className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500 mb-1">Most Active Day</div>
                <div className="text-2xl text-gray-800">{mostActiveDay.day}</div>
                <div className="text-sm text-gray-500 mt-1">{mostActiveDay.hours} hours</div>
              </div>
              <div className="bg-orange-100 rounded-xl p-3">
                <Calendar className="w-6 h-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Daily Screen Time Bar Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              Daily Screen Time (Hours)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyScreenTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip />
                <Bar dataKey="hours" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* App Categories Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-blue-500" />
              App Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={appCategories}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: any) => `${name} ${((percent as number) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {appCategories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Trend Line Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            Weekly Screen Time Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={weeklyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="week" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="hours" 
                stroke="#3b82f6" 
                strokeWidth={3}
                dot={{ fill: '#3b82f6', r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Browsing History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Apps Usage</CardTitle>
        </CardHeader>
        <CardContent>
          {browsingHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Smartphone className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No app usage data available yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>App Name</TableHead>
                  <TableHead>Visits</TableHead>
                  <TableHead>Time Spent</TableHead>
                  <TableHead>Category</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {browsingHistory.map((site, index) => (
                  <TableRow key={index}>
                    <TableCell className="text-gray-800">{site.website}</TableCell>
                    <TableCell className="text-gray-600">{site.visits}</TableCell>
                    <TableCell className="text-gray-600">{site.time}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
                        {site.category}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
