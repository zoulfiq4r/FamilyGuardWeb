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

interface ReportsAnalyticsProps {
  childId: string;
}

export function ReportsAnalytics({ childId }: ReportsAnalyticsProps) {
  const dailyScreenTime = [
    { day: "Mon", hours: 3.2 },
    { day: "Tue", hours: 4.5 },
    { day: "Wed", hours: 2.8 },
    { day: "Thu", hours: 5.1 },
    { day: "Fri", hours: 6.3 },
    { day: "Sat", hours: 7.2 },
    { day: "Sun", hours: 5.8 },
  ];

  const weeklyTrend = [
    { week: "Week 1", hours: 25 },
    { week: "Week 2", hours: 28 },
    { week: "Week 3", hours: 32 },
    { week: "Week 4", hours: 35 },
  ];

  const appCategories = [
    { name: "Social Media", value: 35, color: "#3b82f6" },
    { name: "Entertainment", value: 28, color: "#ef4444" },
    { name: "Education", value: 15, color: "#10b981" },
    { name: "Games", value: 12, color: "#f59e0b" },
    { name: "Other", value: 10, color: "#6b7280" },
  ];

  const browsingHistory = [
    { website: "youtube.com", visits: 45, time: "2h 34m", category: "Entertainment" },
    { website: "instagram.com", visits: 32, time: "1h 45m", category: "Social Media" },
    { website: "wikipedia.org", visits: 18, time: "45m", category: "Education" },
    { website: "netflix.com", visits: 12, time: "3h 15m", category: "Entertainment" },
    { website: "spotify.com", visits: 28, time: "1h 05m", category: "Music" },
    { website: "github.com", visits: 8, time: "32m", category: "Development" },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-gray-800 text-3xl mb-2">Reports & Analytics</h1>
          <p className="text-gray-500">Detailed insights into device usage patterns</p>
        </div>
        <div className="flex items-center gap-3">
          <Select defaultValue="week">
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
          <Button className="gap-2 rounded-xl bg-blue-500 hover:bg-blue-600">
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
                <div className="text-2xl text-gray-800">34.9 hrs</div>
                <div className="flex items-center gap-1 text-sm text-red-500 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  +12% vs last week
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
                <div className="text-2xl text-gray-800">5.0 hrs</div>
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
                <div className="text-2xl text-gray-800">23</div>
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
                <div className="text-2xl text-gray-800">Saturday</div>
                <div className="text-sm text-gray-500 mt-1">7.2 hours</div>
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
          <CardTitle>Browsing History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Website</TableHead>
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
        </CardContent>
      </Card>
    </div>
  );
}
