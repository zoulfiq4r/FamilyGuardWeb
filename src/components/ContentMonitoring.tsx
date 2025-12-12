import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';

interface SafeSearchScores {
  adult?: number;
  violence?: number;
  racy?: number;
  medical?: number;
  spoof?: number;
}

interface ContentAlert {
  id: string;
  childId: string;
  parentId: string;
  childName?: string;
  appName?: string;
  app?: string;
  packageName?: string;
  createdAt?: Timestamp;
  capturedAt?: number;
  screenshotUrl?: string;
  reviewed?: boolean;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  safeSearchScores?: SafeSearchScores;
}

interface ContentMonitoringProps {
  childId?: string;
  parentId: string;
}

export const ContentMonitoring: React.FC<ContentMonitoringProps> = ({ childId, parentId }) => {
  const [alerts, setAlerts] = useState<ContentAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<ContentAlert | null>(null);
  const [markingReviewedId, setMarkingReviewedId] = useState<string | null>(null);

  useEffect(() => {
    const collectionsToWatch = ['content_alerts', 'contentAlerts'];
    const unsubscribers: Array<() => void> = [];

    const handleSnapshot = (incoming: ContentAlert[]) => {
      const merged = [...incoming];
      merged.sort((a, b) => {
        const aDate = a.createdAt?.toMillis?.() ?? a.capturedAt ?? 0;
        const bDate = b.createdAt?.toMillis?.() ?? b.capturedAt ?? 0;
        return bDate - aDate;
      });
      setAlerts(merged);
      setLoading(false);
    };

    collectionsToWatch.forEach((colName) => {
      const alertsRef = collection(db, colName);
      let q = query(alertsRef, where('parentId', '==', parentId), limit(50));
      if (childId) {
        q = query(alertsRef, where('parentId', '==', parentId), where('childId', '==', childId), limit(50));
      }

      const unsub = onSnapshot(q, (snapshot) => {
        const alertData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as ContentAlert));
        handleSnapshot(alertData);
      }, (err) => {
        console.error(`Failed to load content alerts from ${colName}`, err);
        setLoading(false);
      });

      unsubscribers.push(unsub);
    });

    return () => unsubscribers.forEach(u => u());
  }, [childId, parentId]);

  const getSeverityColor = (riskLevel?: string) => {
    if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') return 'destructive';
    if (riskLevel === 'MEDIUM') return 'default';
    return 'secondary';
  };

  const getSeverityLabel = (riskLevel?: string) => {
    if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') return 'HIGH RISK';
    if (riskLevel === 'MEDIUM') return 'MODERATE';
    return 'LOW';
  };

  const getRiskPercent = (alert: ContentAlert) => {
    const scores = alert.safeSearchScores || {};
    const adult = scores.adult ?? 0;
    const violence = scores.violence ?? 0;
    const racy = scores.racy ?? 0;

    // Weighted risk score normalized to 0-1
    const weighted = adult * 0.5 + violence * 0.3 + racy * 0.2;
    if (weighted > 0) {
      return Math.min(1, weighted / 5);
    }

    switch (alert.riskLevel) {
      case 'CRITICAL':
        return 0.9;
      case 'HIGH':
        return 0.75;
      case 'MEDIUM':
        return 0.55;
      default:
        return 0.25;
    }
  };

  const markAsReviewed = async (alert: ContentAlert) => {
    try {
      setMarkingReviewedId(alert.id);
      // Try both collection names
      const collections = ['contentAlerts', 'content_alerts'];
      let updated = false;

      for (const colName of collections) {
        try {
          const alertRef = doc(db, colName, alert.id);
          await updateDoc(alertRef, { reviewed: true });
          updated = true;
          break;
        } catch (err: any) {
          if (err.code !== 'not-found') {
            console.error(`Error updating in ${colName}:`, err);
          }
          // Continue to next collection
        }
      }

      if (!updated) {
        console.error('Could not find alert in any collection');
      }
    } catch (err) {
      console.error('Error marking alert as reviewed:', err);
    } finally {
      setMarkingReviewedId(null);
    }
  };

  if (loading) {
    return <div className="p-4">Loading content alerts...</div>;
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">🛡️ AI Content Safety Monitor</h2>
        <Badge variant="outline">
          {alerts.filter(a => !a.reviewed).length} Unreviewed
        </Badge>
      </div>

      {alerts.length === 0 ? (
        <Alert>
          <AlertDescription>
            No content alerts detected. The AI is monitoring screenshots for inappropriate content.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4">
          {alerts.map((alert) => (
            <Card key={alert.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={getSeverityColor(alert.riskLevel)}>
                      {getSeverityLabel(alert.riskLevel)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {alert.childName}
                    </span>
                    <span className="text-sm text-muted-foreground">•</span>
                    <span className="text-sm text-muted-foreground">
                      {(alert.createdAt?.toDate() || (alert.capturedAt ? new Date(alert.capturedAt) : new Date())).toLocaleString()}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="font-medium">
                      Detected in: <span className="font-mono text-sm">{alert.appName || alert.app || alert.packageName}</span>
                    </p>
                    
                    <div className="flex gap-4 text-sm">
                      <span>Adult: <Badge variant="outline">{alert.safeSearchScores?.adult ?? 0}</Badge></span>
                      <span>Violence: <Badge variant="outline">{alert.safeSearchScores?.violence ?? 0}</Badge></span>
                      <span>Racy: <Badge variant="outline">{alert.safeSearchScores?.racy ?? 0}</Badge></span>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      Risk: {(getRiskPercent(alert) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  {alert.screenshotUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedAlert(alert)}
                    >
                      View Screenshot
                    </Button>
                  )}
                  
                  {!alert.reviewed && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => markAsReviewed(alert)}
                      disabled={markingReviewedId === alert.id}
                    >
                      {markingReviewedId === alert.id ? 'Marking...' : 'Mark Reviewed'}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Screenshot Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold">Content Alert Details</h3>
                <p className="text-sm text-muted-foreground">
                  {(selectedAlert.createdAt?.toDate() || (selectedAlert.capturedAt ? new Date(selectedAlert.capturedAt) : new Date())).toLocaleString()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedAlert(null)}
              >
                ✕ Close
              </Button>
            </div>

            {selectedAlert.screenshotUrl && (
              <img
                src={selectedAlert.screenshotUrl}
                alt="Screenshot"
                className="w-full rounded-lg border"
              />
            )}

            <div className="mt-4 space-y-2">
              <p><strong>App:</strong> {selectedAlert.appName || selectedAlert.app || selectedAlert.packageName}</p>
              <p><strong>Risk Score:</strong> {(getRiskPercent(selectedAlert) * 100).toFixed(1)}%</p>
              <p><strong>Adult:</strong> {selectedAlert.safeSearchScores?.adult ?? 0}</p>
              <p><strong>Violence:</strong> {selectedAlert.safeSearchScores?.violence ?? 0}</p>
              <p><strong>Racy:</strong> {selectedAlert.safeSearchScores?.racy ?? 0}</p>
              <p><strong>Medical:</strong> {selectedAlert.safeSearchScores?.medical ?? 0}</p>
              <p><strong>Spoof:</strong> {selectedAlert.safeSearchScores?.spoof ?? 0}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
