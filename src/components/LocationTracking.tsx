import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { LiveLocationMap } from "./LiveLocationMap";

interface LocationTrackingProps {
  childId: string;
}

export function LocationTracking({ childId }: LocationTrackingProps) {
  const [childName, setChildName] = useState<string>("Child");

  useEffect(() => {
    const fetchChildName = async () => {
      if (childId) {
        try {
          const childDoc = await getDoc(doc(db, "children", childId));
          if (childDoc.exists()) {
            setChildName(childDoc.data().name || "Child");
          }
        } catch (error) {
          console.error("Error fetching child name:", error);
        }
      }
    };

    fetchChildName();
  }, [childId]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-gray-800 text-3xl mb-2">Location Tracking</h1>
        <p className="text-gray-500">Real-time location monitoring for {childName}</p>
      </div>

      <LiveLocationMap childId={childId} childName={childName} />
    </div>
  );
}