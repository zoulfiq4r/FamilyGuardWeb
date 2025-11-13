import { ReactNode, useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  MapPin, 
  Smartphone, 
  BarChart3, 
  Settings,
  Shield,
  Menu,
  X,
  Link,
  Users
} from "lucide-react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";

interface DashboardLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  selectedChild: string | null;
  onChildChange: (childId: string | null) => void;
}

export function DashboardLayout({ children, activeTab, onTabChange, selectedChild, onChildChange }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [childName, setChildName] = useState<string>("");

  useEffect(() => {
    const fetchChildName = async () => {
      if (selectedChild) {
        try {
          const childDoc = await getDoc(doc(db, "children", selectedChild));
          if (childDoc.exists()) {
            setChildName(childDoc.data().name || "Child");
          }
        } catch (error) {
          console.error("Error fetching child name:", error);
          setChildName("Child");
        }
      }
    };
    fetchChildName();
  }, [selectedChild]);

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "location", label: "Location", icon: MapPin },
    { id: "apps", label: "Apps", icon: Smartphone },
    { id: "pairing", label: "Pair Device", icon: Link },
    { id: "reports", label: "Reports", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={`bg-white border-r border-gray-200 transition-all duration-300 ${
          sidebarOpen ? "w-64" : "w-20"
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-gray-200 flex items-center gap-3">
          <div className="bg-blue-500 rounded-xl p-2">
            <Shield className="w-6 h-6 text-white" />
          </div>
          {sidebarOpen && (
            <div>
              <h1 className="text-gray-800">FamilyGuard</h1>
              <p className="text-gray-500 text-xs">Parent Dashboard</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  isActive
                    ? "bg-blue-500 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Toggle button */}
        <div className="absolute bottom-4 left-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-xl"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with Child Selector */}
        {selectedChild && activeTab !== "pairing" && (
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-blue-100 text-blue-600">
                  {childName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">{childName}</h2>
                <p className="text-sm text-gray-500">Viewing activity</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => onChildChange(null)}
              className="flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              Switch Child
            </Button>
          </div>
        )}
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  );
}
