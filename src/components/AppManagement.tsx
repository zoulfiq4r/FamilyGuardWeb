import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { 
  Smartphone, 
  Search, 
  Filter,
  Youtube,
  Instagram,
  MessageCircle,
  Mail,
  Camera,
  Music,
  ShoppingBag,
  Chrome,
  Ban,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { collection, doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { useChildCurrentApp } from "../hooks/useChildTelemetry";

interface AppManagementProps {
  childId: string;
}

type AppStatus = "allowed" | "blocked";

interface NormalizedApp {
  id: string;
  name: string;
  packageName?: string;
  category: string;
  usageMinutes: number;
  usageLabel: string;
  isBlocked: boolean;
  status: AppStatus;
  icon: LucideIcon;
  iconColor: string;
  iconBgColor: string;
  lastUsed?: Date;
}

type FirestoreAppData = Record<string, any>;

const ICON_CONFIGS: Array<{
  match: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
}> = [
  { match: "youtube", icon: Youtube, color: "text-red-500", bgColor: "bg-red-100" },
  { match: "insta", icon: Instagram, color: "text-pink-500", bgColor: "bg-pink-100" },
  { match: "message", icon: MessageCircle, color: "text-blue-500", bgColor: "bg-blue-100" },
  { match: "sms", icon: MessageCircle, color: "text-blue-500", bgColor: "bg-blue-100" },
  { match: "gmail", icon: Mail, color: "text-red-600", bgColor: "bg-red-100" },
  { match: "mail", icon: Mail, color: "text-red-600", bgColor: "bg-red-100" },
  { match: "camera", icon: Camera, color: "text-gray-700", bgColor: "bg-gray-100" },
  { match: "photo", icon: Camera, color: "text-gray-700", bgColor: "bg-gray-100" },
  { match: "spotify", icon: Music, color: "text-green-500", bgColor: "bg-green-100" },
  { match: "music", icon: Music, color: "text-green-500", bgColor: "bg-green-100" },
  { match: "shopping", icon: ShoppingBag, color: "text-indigo-500", bgColor: "bg-indigo-100" },
  { match: "store", icon: ShoppingBag, color: "text-indigo-500", bgColor: "bg-indigo-100" },
  { match: "chrome", icon: Chrome, color: "text-blue-600", bgColor: "bg-blue-100" },
  { match: "browser", icon: Chrome, color: "text-blue-600", bgColor: "bg-blue-100" },
  { match: "tiktok", icon: Music, color: "text-gray-600", bgColor: "bg-gray-100" },
];

const DEFAULT_ICON_CONFIG = {
  icon: Smartphone,
      color: "text-blue-500",
  bgColor: "bg-blue-100",
};

function formatDuration(totalMinutes: number): string {
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

function parseDurationString(value: string): number {
  if (!value) {
    return 0;
  }

  const hourMatch = value.match(/(\d+(?:\.\d+)?)\s*h/i);
  const minuteMatch = value.match(/(\d+(?:\.\d+)?)\s*m/i);

  const hours = hourMatch ? parseFloat(hourMatch[1]) : 0;
  const minutes = minuteMatch ? parseFloat(minuteMatch[1]) : 0;

  if (hours === 0 && minutes === 0) {
    const numericValue = parseFloat(value);
    return Number.isNaN(numericValue) ? 0 : numericValue;
  }

  return hours * 60 + minutes;
}

function resolveUsage(data: FirestoreAppData) {
  const numericCandidates: Array<{ value?: number; divisor: number }> = [
    { value: typeof data.usageMinutes === "number" ? data.usageMinutes : undefined, divisor: 1 },
    { value: typeof data.totalMinutes === "number" ? data.totalMinutes : undefined, divisor: 1 },
    { value: typeof data.totalUsageMinutes === "number" ? data.totalUsageMinutes : undefined, divisor: 1 },
    { value: typeof data.screenTimeMinutes === "number" ? data.screenTimeMinutes : undefined, divisor: 1 },
    { value: typeof data.usageSeconds === "number" ? data.usageSeconds : undefined, divisor: 60 },
    { value: typeof data.totalSeconds === "number" ? data.totalSeconds : undefined, divisor: 60 },
    { value: typeof data.durationSeconds === "number" ? data.durationSeconds : undefined, divisor: 60 },
    { value: typeof data.usageMillis === "number" ? data.usageMillis : undefined, divisor: 60000 },
    { value: typeof data.durationMs === "number" ? data.durationMs : undefined, divisor: 60000 },
  ];

  for (const candidate of numericCandidates) {
    if (typeof candidate.value === "number" && !Number.isNaN(candidate.value)) {
      const minutes = candidate.value / candidate.divisor;
      return {
        minutes,
        label: formatDuration(minutes),
      };
    }
  }

  if (typeof data.usage === "string") {
    const minutes = parseDurationString(data.usage);
    return { minutes, label: data.usage };
  }

  if (typeof data.usageLabel === "string") {
    const minutes = parseDurationString(data.usageLabel);
    return { minutes, label: data.usageLabel };
  }

  return { minutes: 0, label: "0m" };
}

function detectBlocked(data: FirestoreAppData): boolean {
  if (typeof data.isBlocked === "boolean") {
    return data.isBlocked;
  }

  if (typeof data.blocked === "boolean") {
    return data.blocked;
  }

  if (typeof data.allowed === "boolean") {
    return !data.allowed;
  }

  if (typeof data.status === "string") {
    return data.status.toLowerCase() === "blocked";
  }

  if (typeof data.mode === "string") {
    return data.mode.toLowerCase() === "blocked";
  }

  return false;
}

function resolveCategory(
  data: FirestoreAppData,
  name: string,
  packageName?: string
): string {
  if (typeof data.category === "string" && data.category.trim().length > 0) {
    return data.category;
  }

  const key = (packageName || name).toLowerCase();

  if (key.includes("youtube") || key.includes("netflix") || key.includes("disney")) {
    return "Entertainment";
  }

  if (key.includes("insta") || key.includes("tiktok") || key.includes("snap") || key.includes("social")) {
    return "Social Media";
  }

  if (key.includes("message") || key.includes("sms") || key.includes("chat") || key.includes("whats")) {
    return "Communication";
  }

  if (key.includes("mail") || key.includes("docs") || key.includes("drive")) {
    return "Productivity";
  }

  if (key.includes("game")) {
    return "Games";
  }

  if (key.includes("school") || key.includes("edu") || key.includes("learn")) {
    return "Education";
  }

  if (key.includes("camera") || key.includes("photo")) {
    return "Tools";
  }

  return "Uncategorized";
}

function pickIconConfig(name?: string, packageName?: string) {
  const candidates = [packageName, name].filter(Boolean).map((value) => value!.toLowerCase());

  for (const candidate of candidates) {
    for (const config of ICON_CONFIGS) {
      if (candidate.includes(config.match)) {
        return config;
      }
    }
  }

  return DEFAULT_ICON_CONFIG;
}

function extractDate(value: unknown): Date | undefined {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return value;
  }

  const maybeTimestamp = value as { toDate?: () => Date };
  if (typeof maybeTimestamp?.toDate === "function") {
    return maybeTimestamp.toDate();
  }

  return undefined;
}

export function AppManagement({ childId }: AppManagementProps) {
  const [childName, setChildName] = useState("Child");
  const [apps, setApps] = useState<NormalizedApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<AppStatus | "all">("all");
  const [updatingAppId, setUpdatingAppId] = useState<string | null>(null);
  const { currentApp } = useChildCurrentApp(childId);
  const normalizedActivePackage = currentApp?.packageName?.toLowerCase();
  const normalizedActiveName = currentApp?.name?.toLowerCase();

  useEffect(() => {
    const fetchChildName = async () => {
      if (!childId) {
        return;
      }

      try {
        const childDoc = await getDoc(doc(db, "children", childId));
        if (childDoc.exists()) {
          const data = childDoc.data();
          setChildName(typeof data.name === "string" && data.name.trim() ? data.name : "Child");
        } else {
          setChildName("Child");
        }
      } catch (err) {
        console.error("AppManagement: failed to fetch child name", err);
        setChildName("Child");
      }
    };

    fetchChildName();
  }, [childId]);

  useEffect(() => {
    if (!childId) {
      setApps([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const appsRef = collection(db, "children", childId, "apps");
    console.log("AppManagement: Listening for apps at", `children/${childId}/apps`);

    const unsubscribe = onSnapshot(
      appsRef,
      (snapshot) => {
        console.log(`AppManagement: Received ${snapshot.size} app documents for child ${childId}`);
        const normalizedApps = snapshot.docs.map((docSnapshot) => {
          const data = docSnapshot.data() as FirestoreAppData;
          const rawName =
            (typeof data.name === "string" && data.name.trim()) ? data.name :
            (typeof data.appName === "string" && data.appName.trim()) ? data.appName :
            (typeof data.applicationName === "string" && data.applicationName.trim()) ? data.applicationName :
            (typeof data.packageName === "string" && data.packageName.trim()) ? data.packageName :
            "Unnamed App";

          const packageName = typeof data.packageName === "string" ? data.packageName : undefined;
          const { minutes, label } = resolveUsage(data);
          const isBlocked = detectBlocked(data);
          const category = resolveCategory(data, rawName, packageName);
          const iconConfig = pickIconConfig(rawName, packageName);

          return {
            id: docSnapshot.id,
            name: rawName,
            packageName,
            category,
            usageMinutes: minutes,
            usageLabel: label,
            isBlocked,
            status: isBlocked ? "blocked" : "allowed",
            icon: iconConfig.icon,
            iconColor: iconConfig.color,
            iconBgColor: iconConfig.bgColor,
            lastUsed:
              extractDate((data.lastUsed ?? data.lastUsedAt ?? data.updatedAt) as unknown) ||
              extractDate((data.timestamp ?? data.lastActiveAt) as unknown),
          } as NormalizedApp;
        });

        normalizedApps.sort((a, b) => b.usageMinutes - a.usageMinutes);
        setApps(normalizedApps);
        setLoading(false);
      },
      (err) => {
        console.error("AppManagement: error while listening to apps", err);
        setError("Unable to load app usage data right now. Please try again shortly.");
        setLoading(false);
        setApps([]);
      }
    );

    return () => unsubscribe();
  }, [childId]);

  const filteredApps = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return apps.filter((app) => {
      const matchesTerm =
        term.length === 0 ||
        app.name.toLowerCase().includes(term) ||
        (app.packageName?.toLowerCase().includes(term) ?? false) ||
        app.category.toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "allowed" && !app.isBlocked) ||
        (statusFilter === "blocked" && app.isBlocked);

      return matchesTerm && matchesStatus;
    });
  }, [apps, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const total = apps.length;
    const blocked = apps.filter((app) => app.isBlocked).length;
    const allowed = total - blocked;
    const totalUsageMinutes = apps.reduce((sum, app) => sum + (app.usageMinutes || 0), 0);

    return {
      total,
      allowed,
      blocked,
      totalUsageMinutes,
    };
  }, [apps]);

  const handleToggleApp = async (app: NormalizedApp, nextChecked: boolean) => {
    if (!childId) {
      return;
    }

    setActionError(null);
    setUpdatingAppId(app.id);

    const nextStatus: AppStatus = nextChecked ? "allowed" : "blocked";

    try {
      const appDocRef = doc(db, "children", childId, "apps", app.id);
      await updateDoc(appDocRef, {
        status: nextStatus,
        isBlocked: nextStatus === "blocked",
      });
    } catch (err) {
      console.error("AppManagement: failed to update app status", err);
      setActionError("We couldn't update that app. Please try again.");
    } finally {
      setUpdatingAppId(null);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-gray-800 text-3xl mb-2">App Management</h1>
        <p className="text-gray-500">
          Control and monitor apps on {childName}&apos;s device
        </p>
      </div>

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-3 p-4 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </CardContent>
        </Card>
      )}

      {actionError && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <CardContent className="flex items-center gap-3 p-4 text-yellow-800">
            <AlertCircle className="w-5 h-5" />
            <span>{actionError}</span>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500 mb-1">Total Apps</div>
                <div className="text-2xl text-gray-800">{stats.total}</div>
              </div>
              <div className="bg-blue-100 rounded-xl p-3">
                <Smartphone className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500 mb-1">Allowed Apps</div>
                <div className="text-2xl text-gray-800">{stats.allowed}</div>
              </div>
              <div className="bg-green-100 rounded-xl p-3">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500 mb-1">Blocked Apps</div>
                <div className="text-2xl text-gray-800">{stats.blocked}</div>
              </div>
              <div className="bg-red-100 rounded-xl p-3">
                <Ban className="w-6 h-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-indigo-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500 mb-1">Usage Today</div>
                <div className="text-2xl text-gray-800">
                  {formatDuration(stats.totalUsageMinutes)}
                </div>
              </div>
              <div className="bg-indigo-100 rounded-xl p-3">
                <Clock className="w-6 h-6 text-indigo-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[240px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input 
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by name, package or category..."
                  className="pl-10 rounded-xl"
                />
              </div>
            </div>

            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as AppStatus | "all")}
            >
              <SelectTrigger className="w-[160px] rounded-xl">
                <SelectValue placeholder="Status filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    All Apps
                  </div>
                </SelectItem>
                <SelectItem value="allowed">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Allowed
                  </div>
                </SelectItem>
                <SelectItem value="blocked">
                  <div className="flex items-center gap-2">
                    <Ban className="w-4 h-4 text-red-500" />
                    Blocked
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              className="gap-2 rounded-xl"
              onClick={() => {
                console.log("AppManagement: Block all apps action triggered for child", childId);
                alert("Bulk blocking is not enabled yet. Manage individual apps using the toggles.");
              }}
            >
              <Ban className="w-4 h-4" />
              Block All
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Installed Applications</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>App</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Usage Today</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-3">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
                      Loading app usage...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredApps.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-gray-500">
                    {apps.length === 0 ? (
                      <div className="space-y-3">
                        <p>No app usage data found for this child yet.</p>
                        <p className="text-sm text-gray-400">
                          Ensure the mobile app writes documents to{" "}
                          <code className="bg-gray-100 px-2 py-1 rounded">
                            children/{childId}/apps
                          </code>{" "}
                          with fields like <code>name</code>, <code>packageName</code>,{" "}
                          <code>usageMinutes</code> (number) and <code>isBlocked</code> (boolean).
                        </p>
                        <p className="text-sm text-gray-400">
                          Docs are watched in real-time, so updates from the device appear here instantly.
                          Check the browser console for debugging logs if data is missing.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="mb-1">No apps match your current filters.</p>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setSearchTerm("");
                            setStatusFilter("all");
                          }}
                        >
                          Reset filters
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filteredApps.map((app) => {
                const Icon = app.icon;
                  const isActive =
                    (normalizedActivePackage &&
                      app.packageName?.toLowerCase() === normalizedActivePackage) ||
                    (normalizedActiveName &&
                      app.name.toLowerCase() === normalizedActiveName);
                return (
                    <TableRow key={app.id} className={app.isBlocked ? "opacity-70" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                          <div className={`${app.iconBgColor} rounded-xl p-2`}>
                            <Icon className={`w-5 h-5 ${app.iconColor}`} />
                          </div>
                          <div>
                            <div className="text-gray-800 font-medium flex items-center gap-2">
                              {app.name}
                              {isActive && (
                                <Badge className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100">
                                  Currently Active
                                </Badge>
                              )}
                            </div>
                            {app.packageName && (
                              <div className="text-xs text-gray-400">{app.packageName}</div>
                            )}
                            {isActive && (
                              <div className="flex items-center gap-1 text-xs text-emerald-600 mt-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                Live usage from device
                              </div>
                            )}
                          </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{app.category}</Badge>
                    </TableCell>
                      <TableCell className="text-gray-600">
                        <div>{app.usageLabel}</div>
                        {app.lastUsed && (
                          <div className="text-xs text-gray-400">
                            Last used {app.lastUsed.toLocaleString()}
                          </div>
                        )}
                      </TableCell>
                    <TableCell>
                      <Badge 
                          variant={app.isBlocked ? "destructive" : "default"}
                          className={
                            app.isBlocked
                              ? ""
                              : "bg-green-100 text-green-700 hover:bg-green-200"
                          }
                        >
                          {app.isBlocked ? "Blocked" : "Allowed"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-sm text-gray-500">
                            {app.isBlocked ? "Blocked" : isActive ? "In Use" : "Allowed"}
                        </span>
                        <Switch 
                            checked={!app.isBlocked}
                            disabled={updatingAppId === app.id}
                            onCheckedChange={(checked) => handleToggleApp(app, checked)}
                          className="data-[state=checked]:bg-green-500"
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
