import { useState } from "react";
import { createPairingCode } from "../config/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "./ui/label";

interface PairingCodeGeneratorProps {
  userId: string;
}

export function PairingCodeGenerator({ userId }: PairingCodeGeneratorProps) {
  const [childName, setChildName] = useState("");
  const [pairingCode, setPairingCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGenerateCode = async () => {
    if (!childName.trim()) {
      alert("Please enter child's name");
      return;
    }

    setLoading(true);

    try {
      const code = await createPairingCode(userId, childName);
      setPairingCode(code);
    } catch (error: any) {
      alert("Error generating code: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPairingCode("");
    setChildName("");
  };

  return (
    <div className="p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">🔗</span>
            Pair New Device
          </CardTitle>
        </CardHeader>
        <CardContent>
        {!pairingCode ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="childName">Child's Name</Label>
              <Input
                id="childName"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                placeholder="Enter child's name"
                className="rounded-xl"
              />
            </div>

            <Button
              onClick={handleGenerateCode}
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-600 rounded-xl"
            >
              {loading ? "Generating..." : "Generate Pairing Code"}
            </Button>
          </div>
        ) : (
          <div className="text-center space-y-6">
            <div className="text-5xl">✅</div>
            <h3 className="text-2xl font-bold text-gray-800">Code Generated!</h3>
            <p className="text-gray-600">
              Enter this code on {childName}'s device:
            </p>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-8">
              <div className="text-5xl font-bold text-blue-600 tracking-widest">
                {pairingCode}
              </div>
            </div>

            <p className="text-sm text-gray-500">Code expires in 10 minutes</p>

            <Button
              onClick={handleReset}
              variant="outline"
              className="rounded-xl"
            >
              Generate Another Code
            </Button>
          </div>
        )}
        </CardContent>
      </Card>
    </div>
  );
}