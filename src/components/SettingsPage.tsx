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
  UserCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Separator } from "./ui/separator";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";

export function SettingsPage() {
  const children = [
    { 
      name: "Emma Parker", 
      age: 14, 
      devices: 2, 
      status: "active",
      initials: "EP"
    },
    { 
      name: "Jake Parker", 
      age: 11, 
      devices: 1, 
      status: "active",
      initials: "JP"
    },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-gray-800 text-3xl mb-2">Settings</h1>
        <p className="text-gray-500">Manage your account and app preferences</p>
      </div>

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
                  <AvatarFallback className="bg-blue-500 text-white text-2xl">MP</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Button variant="outline" className="rounded-xl">Change Photo</Button>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" defaultValue="Michael" className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" defaultValue="Parker" className="rounded-xl" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  defaultValue="michael.parker@email.com" 
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input 
                  id="phone" 
                  type="tel" 
                  defaultValue="+1 (555) 123-4567" 
                  className="rounded-xl"
                />
              </div>

              <Button className="rounded-xl bg-blue-500 hover:bg-blue-600">
                Save Changes
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
              {children.map((child, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar>
                      <AvatarFallback className="bg-blue-500 text-white">
                        {child.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="text-gray-800">{child.name}</div>
                      <div className="text-sm text-gray-500">{child.age} years old</div>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Active
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                    <Smartphone className="w-4 h-4" />
                    {child.devices} device{child.devices > 1 ? "s" : ""} connected
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 rounded-xl">
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-xl text-red-500 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}

              <Button className="w-full gap-2 rounded-xl bg-blue-500 hover:bg-blue-600">
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
              <Button variant="outline" className="w-full justify-start gap-2 rounded-xl text-red-500 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
                Delete Account
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
