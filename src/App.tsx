import { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "./config/firebase";
import { AuthScreen } from "./components/AuthScreen";
import { DashboardLayout } from "./components/DashboardLayout";
import { DashboardHome } from "./components/DashboardHome";
import { LocationTracking } from "./components/LocationTracking";
import { AppManagement } from "./components/AppManagement";
import { ReportsAnalytics } from "./components/ReportsAnalytics";
import { SettingsPage } from "./components/SettingsPage";
import { PairingCodeGenerator } from "./components/PairingCodeGenerator";
import { ChildSelector } from "./components/ChildSelector";
import { ContentMonitoring } from "./components/ContentMonitoring";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedChild, setSelectedChild] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading FamilyGuard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  // Show child selector if no child is selected (except when on pairing or settings page)
  const tabsRequiringChild = ["dashboard", "location", "apps", "reports", "content"];
  if (!selectedChild && tabsRequiringChild.includes(activeTab)) {
    return (
      <ChildSelector
        parentId={user.uid}
        onSelectChild={setSelectedChild}
        onCreateNew={() => setActiveTab("pairing")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <DashboardLayout 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        selectedChild={selectedChild}
        onChildChange={setSelectedChild}
      >
        {activeTab === "dashboard" && selectedChild && <DashboardHome childId={selectedChild} />}
        {activeTab === "location" && selectedChild && <LocationTracking childId={selectedChild} />}
        {activeTab === "apps" && selectedChild && <AppManagement childId={selectedChild} />}
        {activeTab === "reports" && selectedChild && <ReportsAnalytics childId={selectedChild} />}
        {activeTab === "settings" && <SettingsPage />}
        {activeTab === "pairing" && <PairingCodeGenerator userId={user.uid} />}
        {activeTab === "content" && selectedChild && (
          <ContentMonitoring childId={selectedChild} parentId={user.uid} />
        )}
      </DashboardLayout>
    </div>
  );
}