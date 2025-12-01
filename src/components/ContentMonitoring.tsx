import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';

interface ContentAlert {
  id: string;
  childId: string;
  childName: string;
  type: 'adult' | 'violence' | 'racy';
  app: string;
  packageName: string;
  timestamp: Timestamp;
  confidence: number;
  screenshotUrl?: string;
  reviewed: boolean;
  parentNotes?: string;
  adult: string;
  violence: string;
  racy: string;
  riskScore: number;
}

interface ContentMonitoringProps {
  childId?: string;
}

export const ContentMonitoring: React.FC<ContentMonitoringProps> = ({ childId }) => {
  const [alerts, setAlerts] = useState<ContentAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<ContentAlert | null>(null);

  useEffect(() => {
    const alertsRef = collection(db, 'contentAlerts');
    
    let q = query(
      alertsRef,
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    // Filter by specific child if provided
    if (childId) {
      q = query(alertsRef, where('childId', '==', childId), orderBy('timestamp', 'desc'), limit(50));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const alertData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ContentAlert));
      
      setAlerts(alertData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [childId]);

  const getSeverityColor = (riskScore: number) => {
    if (riskScore >= 0.8) return 'destructive';
    if (riskScore >= 0.5) return 'default';
    return 'secondary';
  };

  const getSeverityLabel = (riskScore: number) => {
    if (riskScore >= 0.8) return 'HIGH RISK';
    if (riskScore >= 0.5) return 'MODERATE';
    return 'LOW';
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
                    <Badge variant={getSeverityColor(alert.riskScore)}>
                      {getSeverityLabel(alert.riskScore)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {alert.childName}
                    </span>
                    <span className="text-sm text-muted-foreground">•</span>
                    <span className="text-sm text-muted-foreground">
                      {alert.timestamp?.toDate().toLocaleString()}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="font-medium">
                      Detected in: <span className="font-mono text-sm">{alert.app}</span>
                    </p>
                    
                    <div className="flex gap-4 text-sm">
                      <span>Adult: <Badge variant="outline">{alert.adult}</Badge></span>
                      <span>Violence: <Badge variant="outline">{alert.violence}</Badge></span>
                      <span>Racy: <Badge variant="outline">{alert.racy}</Badge></span>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      Confidence: {(alert.riskScore * 100).toFixed(1)}%
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
                      onClick={() => {
                        // Mark as reviewed
                        // updateDoc(doc(db, 'contentAlerts', alert.id), { reviewed: true });
                      }}
                    >
                      Mark Reviewed
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
                  {selectedAlert.timestamp?.toDate().toLocaleString()}
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
              <p><strong>App:</strong> {selectedAlert.app}</p>
              <p><strong>Risk Score:</strong> {(selectedAlert.riskScore * 100).toFixed(1)}%</p>
              <p><strong>Adult Content:</strong> {selectedAlert.adult}</p>
              <p><strong>Violence:</strong> {selectedAlert.violence}</p>
              <p><strong>Racy Content:</strong> {selectedAlert.racy}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
