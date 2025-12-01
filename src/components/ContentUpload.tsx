import React, { useState } from 'react';
import { doc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

export const ContentUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = String(reader.result || '').split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = reject;
  });

  const uploadAndAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const base64 = await toBase64(file);
      const resp = await fetch('http://localhost:5050/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Analyze failed');
      setResult(data.safeSearch);

      // Write alert in Firestore for demo purposes
      await addDoc(collection(db, 'contentAlerts'), {
        childId: 'demo-child',
        childName: 'Demo Child',
        type: 'adult',
        app: 'Demo App',
        packageName: 'com.demo.app',
        timestamp: serverTimestamp(),
        confidence: 0.0,
        adult: String(data.safeSearch.adult || 'UNKNOWN'),
        violence: String(data.safeSearch.violence || 'UNKNOWN'),
        racy: String(data.safeSearch.racy || 'UNKNOWN'),
        medical: String(data.safeSearch.medical || 'UNKNOWN'),
        spoof: String(data.safeSearch.spoof || 'UNKNOWN'),
        riskScore: 0.0,
        reviewed: false
      });
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-semibold">Upload screenshot and analyze</h2>
      <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <Button onClick={uploadAndAnalyze} disabled={!file || loading}>
        {loading ? 'Analyzing...' : 'Analyze'}
      </Button>

      {error && <div className="text-red-600">{error}</div>}

      {result && (
        <Card className="p-4">
          <div className="space-y-2">
            <div>Adult: <Badge variant="outline">{String(result.adult)}</Badge></div>
            <div>Violence: <Badge variant="outline">{String(result.violence)}</Badge></div>
            <div>Racy: <Badge variant="outline">{String(result.racy)}</Badge></div>
            <div>Medical: <Badge variant="outline">{String(result.medical)}</Badge></div>
            <div>Spoof: <Badge variant="outline">{String(result.spoof)}</Badge></div>
          </div>
        </Card>
      )}
    </div>
  );
};
