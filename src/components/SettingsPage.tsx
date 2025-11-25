import { 
  User,
  Bell,
  Shield,
  Smartphone,
  Plus,
  Trash2,
  Mail,
  Lock,
  Settings as SettingsIcon,
  UserCircle,
  LogOut
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Separator } from "./ui/separator";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { useState, useEffect } from "react";
import { auth, db } from "../config/firebase";
import { signOut } from "firebase/auth";
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";

interface ChildProfile {
  id: string;
  name: string;
  age?: number;
  status: string;
  initials: string;
  deviceCount: number;
}

interface ParentProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  initials: string;
}

export function SettingsPage() {
  const [signingOut, setSigningOut] = useState(false);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [parentProfile, setParentProfile] = useState<ParentProfile>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    initials: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingChild, setEditingChild] = useState<ChildProfile | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const user = auth.currentUser;

  // Fetch parent profile
  useEffect(() => {
    if (!user) return;

    const fetchParentProfile = async () => {
      try {
        // Try to get from users collection first
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("userId", "==", user.uid));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
          if (!snapshot.empty) {
            const userData = snapshot.docs[0].data();
            const fullName = userData.parentName || userData.name || "";
            const nameParts = fullName.split(" ");
            const firstName = nameParts[0] || "";
            const lastName = nameParts.slice(1).join(" ") || "";
            
            setParentProfile({
              firstName,
              lastName,
              email: userData.email || user.email || "",
              phone: userData.phone || userData.phoneNumber || "",
              initials: `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "U"
            });
          } else {
            // Fallback to auth email
            const emailParts = (user.email || "").split("@")[0].split(".");
            setParentProfile({
              firstName: emailParts[0] || "",
              lastName: emailParts[1] || "",
              email: user.email || "",
              phone: "",
              initials: emailParts[0]?.charAt(0).toUpperCase() || "U"
            });
          }
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("Error fetching parent profile:", error);
        setLoading(false);
      }
    };

    fetchParentProfile();
  }, [user]);

  // Fetch children
  useEffect(() => {
    if (!user) return;

    const childrenRef = collection(db, "children");
    const q = query(childrenRef, where("parentId", "==", user.uid));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const childProfiles: ChildProfile[] = [];

      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data();
        const childName = data.childName || data.name || "Unknown";
        const nameParts = childName.split(" ");
        const initials = nameParts.length >= 2 
          ? `${nameParts[0].charAt(0)}${nameParts[1].charAt(0)}`.toUpperCase()
          : childName.substring(0, 2).toUpperCase();

        // Count devices for this child (you can enhance this by querying device collection if exists)
        const deviceCount = data.deviceId ? 1 : 0;

        childProfiles.push({
          id: docSnapshot.id,
          name: childName,
          age: data.age,
          status: data.status || "active",
          initials,
          deviceCount
        });
      }

      setChildren(childProfiles);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
      setSigningOut(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setSaving(true);
    try {
      // Update user profile in Firestore
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("userId", "==", user.uid));
      
      const snapshot = await new Promise<any>((resolve) => {
        const unsubscribe = onSnapshot(q, (snap) => {
          unsubscribe();
          resolve(snap);
        });
      });

      if (!snapshot.empty) {
        const userDocRef = doc(db, "users", snapshot.docs[0].id);
        await updateDoc(userDocRef, {
          parentName: `${parentProfile.firstName} ${parentProfile.lastName}`.trim(),
          email: parentProfile.email,
          phone: parentProfile.phone
        });
        alert("Profile updated successfully!");
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleEditChild = (child: ChildProfile) => {
    setEditingChild(child);
    setShowEditDialog(true);
  };

  const handleSaveChild = async (childId: string, name: string, age: number) => {
    try {
      const childRef = doc(db, "children", childId);
      await updateDoc(childRef, {
        childName: name,
        name: name,
        age: age
      });
      setShowEditDialog(false);
      setEditingChild(null);
      alert("Child profile updated successfully!");
    } catch (error) {
      console.error("Error updating child:", error);
      alert("Failed to update child profile. Please try again.");
    }
  };

  const handleDeleteChild = async (childId: string, childName: string) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm(`Are you sure you want to remove ${childName} from your account? This action cannot be undone.`)) {
      return;
    }

    try {
      const childRef = doc(db, "children", childId);
      await deleteDoc(childRef);
      alert(`${childName} has been removed from your account.`);
    } catch (error) {
      console.error("Error deleting child:", error);
      alert("Failed to remove child. Please try again.");
    }
  };

  const handleAddChild = () => {
    alert("To add a new child, please go to the 'Pair Device' tab and generate a pairing code.");
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-gray-800 text-3xl mb-2">Settings</h1>
        <p className="text-gray-500">Manage your account and app preferences</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-500" />
                  Account Settings
                </CardTitle>
                <CardDescription>Manage your account information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-6">
                  <Avatar className="w-20 h-20">
                    <AvatarFallback className="bg-blue-500 text-white text-2xl">
                      {parentProfile.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Button variant="outline" className="rounded-xl">Change Photo</Button>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input 
                      id="firstName" 
                      value={parentProfile.firstName}
                      onChange={(e) => setParentProfile({...parentProfile, firstName: e.target.value})}
                      className="rounded-xl" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input 
                      id="lastName" 
                      value={parentProfile.lastName}
                      onChange={(e) => setParentProfile({...parentProfile, lastName: e.target.value})}
                      className="rounded-xl" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={parentProfile.email}
                    onChange={(e) => setParentProfile({...parentProfile, email: e.target.value})}
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone" 
                    type="tel" 
                    value={parentProfile.phone}
                    onChange={(e) => setParentProfile({...parentProfile, phone: e.target.value})}
                    className="rounded-xl"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <Button 
                  className="rounded-xl bg-blue-500 hover:bg-blue-600"
                  onClick={handleSaveProfile}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-blue-500" />
                Security Settings
              </CardTitle>
              <CardDescription>Manage your password and security preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input 
                  id="currentPassword" 
                  type="password" 
                  placeholder="••••••••" 
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input 
                  id="newPassword" 
                  type="password" 
                  placeholder="••••••••" 
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input 
                  id="confirmPassword" 
                  type="password" 
                  placeholder="••••••••" 
                  className="rounded-xl"
                />
              </div>

              <Button className="rounded-xl bg-blue-500 hover:bg-blue-600">
                Update Password
              </Button>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-800">Two-Factor Authentication</div>
                  <div className="text-sm text-gray-500">Add an extra layer of security</div>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-500" />
                Notification Settings
              </CardTitle>
              <CardDescription>Choose what alerts you want to receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-gray-800">Screen Time Alerts</div>
                  <div className="text-sm text-gray-500">Get notified when limits are reached</div>
                </div>
                <Switch defaultChecked />
              </div>

              <Separator />

              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-gray-800">Location Updates</div>
                  <div className="text-sm text-gray-500">Notifications for location changes</div>
                </div>
                <Switch defaultChecked />
              </div>

              <Separator />

              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-gray-800">App Installation Alerts</div>
                  <div className="text-sm text-gray-500">Know when new apps are installed</div>
                </div>
                <Switch defaultChecked />
              </div>

              <Separator />

              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-gray-800">Weekly Reports</div>
                  <div className="text-sm text-gray-500">Receive weekly activity summaries</div>
                </div>
                <Switch />
              </div>

              <Separator />

              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-gray-800">Email Notifications</div>
                  <div className="text-sm text-gray-500">Send alerts to your email</div>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </div>

          {/* Child Management Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCircle className="w-5 h-5 text-blue-500" />
                  Child Profiles
                </CardTitle>
                <CardDescription>Manage connected children</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {children.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <UserCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No children connected yet</p>
                  </div>
                ) : (
                  children.map((child) => (
                    <div key={child.id} className="p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-start gap-3 mb-3">
                        <Avatar>
                          <AvatarFallback className="bg-blue-500 text-white">
                            {child.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="text-gray-800">{child.name}</div>
                          {child.age && (
                            <div className="text-sm text-gray-500">{child.age} years old</div>
                          )}
                        </div>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {child.status.charAt(0).toUpperCase() + child.status.slice(1)}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                        <Smartphone className="w-4 h-4" />
                        {child.deviceCount} device{child.deviceCount !== 1 ? "s" : ""} connected
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 rounded-xl"
                          onClick={() => handleEditChild(child)}
                        >
                          Edit
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="rounded-xl text-red-500 hover:text-red-600"
                          onClick={() => handleDeleteChild(child.id, child.name)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}

                <Button 
                  className="w-full gap-2 rounded-xl bg-blue-500 hover:bg-blue-600"
                  onClick={handleAddChild}
                >
                  <Plus className="w-4 h-4" />
                  Add Child Profile
                </Button>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SettingsIcon className="w-5 h-5 text-blue-500" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start gap-2 rounded-xl">
                  <Shield className="w-4 h-4" />
                  Privacy Policy
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2 rounded-xl">
                  <Mail className="w-4 h-4" />
                  Contact Support
                </Button>
                <Separator />
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2 rounded-xl text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  onClick={handleSignOut}
                  disabled={signingOut}
                >
                  <LogOut className="w-4 h-4" />
                  {signingOut ? "Signing Out..." : "Sign Out"}
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2 rounded-xl text-red-500 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                  Delete Account
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Edit Child Dialog */}
      {showEditDialog && editingChild && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Edit Child Profile</CardTitle>
              <CardDescription>Update child information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="childName">Child Name</Label>
                <Input
                  id="childName"
                  defaultValue={editingChild.name}
                  className="rounded-xl"
                  onChange={(e) => setEditingChild({...editingChild, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="childAge">Age</Label>
                <Input
                  id="childAge"
                  type="number"
                  defaultValue={editingChild.age || ""}
                  className="rounded-xl"
                  placeholder="Optional"
                  onChange={(e) => setEditingChild({...editingChild, age: parseInt(e.target.value) || undefined})}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() => {
                    setShowEditDialog(false);
                    setEditingChild(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 rounded-xl bg-blue-500 hover:bg-blue-600"
                  onClick={() => handleSaveChild(editingChild.id, editingChild.name, editingChild.age || 0)}
                >
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
