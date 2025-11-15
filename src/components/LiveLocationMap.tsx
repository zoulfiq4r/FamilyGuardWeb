import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebase";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { MapPin, Navigation, Signal } from "lucide-react";
import {
  Location,
  formatRelativeTime,
  formatSpeed,
  formatHeading,
  formatAltitude,
  formatBattery,
  normalizeLocationRecord,
} from "./liveLocationUtils";

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

interface LiveLocationMapProps {
  childId: string;
  childName: string;
}

const INITIAL_GPS_WAIT_MS = 1500; // faster initial GPS wait fallback
const DEMO_CHILD_ID = "fEqVhQyVJLJJZqgaA09c";

export function LiveLocationMap({ childId, childName }: LiveLocationMapProps) {
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [locationHistory, setLocationHistory] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!loading) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setLoading(false);
    }, INITIAL_GPS_WAIT_MS);

    return () => window.clearTimeout(timeoutId);
  }, [loading, childId]);

  useEffect(() => {
    setLoading(true);
    setCurrentLocation(null);
    setLocationHistory([]);

    if (!childId) {
      setLoading(false);
      return;
    }

    // Listen for real-time location updates from multiple possible sources
    const childLocationsRef = collection(db, "children", childId, "locations");
    const childDocRef = doc(db, "children", childId);

    let childScopedLocations: Location[] = [];
    let embeddedLocations: Location[] = [];

    const applyLocations = () => {
      const merged = [...childScopedLocations, ...embeddedLocations].filter(
        Boolean
      ) as Location[];

      const seen = new Set<string>();
      const deduped: Location[] = [];

      merged.forEach((loc) => {
        const key = `${loc.id}-${loc.timestamp.getTime()}-${loc.latitude}-${loc.longitude}`;
        if (seen.has(key)) {
          return;
        }
        seen.add(key);
        deduped.push(loc);
      });

      deduped.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      if (deduped.length > 0) {
        setCurrentLocation(deduped[0]);
        setLocationHistory(deduped.slice(0, 20));
      } else {
        setCurrentLocation(null);
        setLocationHistory([]);
      }

      setLoading(false);
    };

    const unsubscribers: Array<() => void> = [];

    unsubscribers.push(
      onSnapshot(
        childLocationsRef,
        (snapshot) => {
          childScopedLocations = snapshot.docs
            .map((docSnapshot) =>
              normalizeLocationRecord(
                `children/${childId}/locations/${docSnapshot.id}`,
                docSnapshot.data()
              )
            )
            .filter(Boolean) as Location[];
          applyLocations();
        },
        (error) => {
          console.error("Location fetch error (child locations subcollection):", error);
          childScopedLocations = [];
          applyLocations();
        }
      )
    );

    unsubscribers.push(
      onSnapshot(
        childDocRef,
        (snapshot) => {
          if (!snapshot.exists()) {
            embeddedLocations = [];
            applyLocations();
            return;
          }

          const childData = snapshot.data();
          const embedded =
            (childData.currentLocation as Record<string, unknown> | undefined) ||
            (childData.latestLocation as Record<string, unknown> | undefined) ||
            (childData.location as Record<string, unknown> | undefined);

          if (embedded) {
            const normalized = normalizeLocationRecord(
              `children/${childId}/currentLocation`,
              embedded
            );
            embeddedLocations = normalized ? [normalized] : [];
          } else {
            embeddedLocations = [];
          }

          applyLocations();
        },
        (error) => {
          console.error("Location fetch error (child doc):", error);
          embeddedLocations = [];
          applyLocations();
        }
      )
    );

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [childId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading location...</p>
        </CardContent>
      </Card>
    );
  }

  if (!currentLocation) {
    const dynamicLocationsPath = `children/${childId}/locations`;
    const dynamicCurrentLocationPath = `children/${childId}.currentLocation`;
    const demoLocationsPath = `children/${DEMO_CHILD_ID}/locations`;
    const demoCurrentLocationPath = `children/${DEMO_CHILD_ID}.currentLocation`;

    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-500">
          <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="font-semibold mb-2">No location data available yet.</p>
          <p className="text-sm mt-2 mb-4">Location will appear once the device sends its first update.</p>
          <div className="mt-6 p-4 bg-blue-50 rounded-lg text-left max-w-md mx-auto">
            <p className="text-xs font-semibold text-blue-800 mb-2">For Developers:</p>
            <p className="text-xs text-blue-700 mb-2">
              Write location updates either to
              <code className="bg-blue-100 px-1 mx-1 rounded">{dynamicLocationsPath}</code>
              or embed the latest point under
              <code className="bg-blue-100 px-1 mx-1 rounded">{dynamicCurrentLocationPath}</code>
              with:
            </p>
            <p className="text-[10px] text-blue-600 mb-2">
              Demo child shortcuts for quick testing:
              <code className="bg-blue-100 px-1 mx-1 rounded">{demoLocationsPath}</code>
              or
              <code className="bg-blue-100 px-1 mx-1 rounded">{demoCurrentLocationPath}</code>
            </p>
            <ul className="text-xs text-blue-700 list-disc list-inside space-y-1">
              <li><code>childId</code>: "{DEMO_CHILD_ID}"</li>
              <li><code>latitude</code>: number</li>
              <li><code>longitude</code>: number</li>
              <li><code>timestamp</code>: Firestore Timestamp</li>
              <li><code>accuracy</code>: number (optional)</li>
            </ul>
            <p className="text-xs text-blue-600 mt-3">
              Check browser console (F12) for debug logs.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const pathCoordinates = locationHistory.map((loc) => [loc.latitude, loc.longitude] as [number, number]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-blue-500" />
            {childName}'s Live Location
          </span>
          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">
            {currentLocation.provider ?? currentLocation.source ?? "Fused GPS"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Location Info */}
        <div className="mb-4 p-4 bg-blue-50 rounded-lg space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-gray-600">Last Updated</p>
              <p className="font-semibold">
                {currentLocation.timestamp.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">
                {formatRelativeTime(currentLocation.timestamp)}
              </p>
            </div>
            <div className="flex items-center gap-2 text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm">Live</span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Provider</p>
              <p className="font-semibold text-gray-900 flex items-center gap-2">
                <Signal className="w-4 h-4 text-blue-500" />
                {currentLocation.provider ?? currentLocation.source ?? "Fused"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Accuracy</p>
              <p className="font-semibold text-gray-900">
                ±{Math.round(currentLocation.accuracy)} m
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Speed</p>
              <p className="font-semibold text-gray-900">
                {formatSpeed(currentLocation.speed)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Heading</p>
              <p className="font-semibold text-gray-900">
                {formatHeading(currentLocation.heading)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Altitude</p>
              <p className="font-semibold text-gray-900">
                {formatAltitude(currentLocation.altitude)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Battery</p>
              <p className="font-semibold text-gray-900">
                {formatBattery(currentLocation.batteryLevel)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Source</p>
              <p className="font-semibold text-gray-900">
                {currentLocation.source ?? "Device"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Activity</p>
              <p className="font-semibold text-gray-900">
                {currentLocation.activityType ?? "Unknown"}
              </p>
            </div>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <p>
              Coordinates: {currentLocation.latitude.toFixed(6)},{" "}
              {currentLocation.longitude.toFixed(6)}
            </p>
            {typeof currentLocation.providerAccuracy === "number" && (
              <p>Vertical accuracy: ±{Math.round(currentLocation.providerAccuracy)} m</p>
            )}
            {currentLocation.isMock && (
              <p className="text-red-600 font-medium">
                Warning: location flagged as mock data
              </p>
            )}
          </div>
        </div>

        {/* Map */}
        <div className="h-96 rounded-lg overflow-hidden border-2 border-gray-200">
          <MapContainer
            center={[currentLocation.latitude, currentLocation.longitude]}
            zoom={15}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Current Location Marker */}
            <Marker position={[currentLocation.latitude, currentLocation.longitude]}>
              <Popup>
                <div className="text-center">
                  <p className="font-semibold">{childName}'s Current Location</p>
                  <p className="text-xs text-gray-600">
                    {currentLocation.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </Popup>
            </Marker>

            {/* Path History */}
            {pathCoordinates.length > 1 && (
              <Polyline
                positions={pathCoordinates}
                color="blue"
                weight={3}
                opacity={0.6}
              />
            )}
          </MapContainer>
        </div>
      </CardContent>
    </Card>
  );
}
