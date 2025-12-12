// Test script to create a sample content alert in Firestore
const admin = require('firebase-admin');
const serviceAccount = require('../google-credentials.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore(a);

async function createTestAlert() {
  // Get the first child from your account
  const childrenSnapshot = await db.collection('children').limit(1).get();
  
  if (childrenSnapshot.empty) {
    console.log('No children found. Please pair a device first.');
    return;
  }

  const childDoc = childrenSnapshot.docs[0];
  const childId = childDoc.id;
  const childData = childDoc.data();

  // Create test alert
  const alertData = {
    childId: childId,
    childName: childData.name || 'Test Child',
    type: 'violence',
    app: 'Instagram',
    packageName: 'com.instagram.android',
    timestamp: admin.firestore.Timestamp.now(),
    confidence: 0.85,
    reviewed: false,
    adult: 'UNLIKELY',
    violence: 'LIKELY',
    racy: 'POSSIBLE',
    riskScore: 65
  };

  const alertRef = await db.collection('contentAlerts').add(alertData);
  console.log('✅ Test alert created with ID:', alertRef.id);
  console.log('Alert data:', alertData);
  console.log('\nGo to Content AI tab in your dashboard to see it!');
  
  process.exit(0);
}

createTestAlert().catch(console.error);
