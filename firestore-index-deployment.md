# Firestore Index Deployment

This document explains how to deploy the Firestore indexes required for the custom domain feature.

## Prerequisites

1. Install Firebase CLI:
\`\`\`bash
npm install -g firebase-tools
\`\`\`

2. Login to Firebase:
\`\`\`bash
firebase login
\`\`\`

3. Initialize Firebase in your project (if not already done):
\`\`\`bash
firebase init firestore
\`\`\`

## Deploy Indexes

To deploy the composite indexes defined in `firestore.indexes.json`:

\`\`\`bash
firebase deploy --only firestore:indexes
\`\`\`

This will create the following indexes:

### Custom Domains Indexes

1. **domain + status**: For checking if a domain exists and is active
2. **userId + status**: For checking if a user has an active custom domain

## Verify Deployment

After deployment, you can verify the indexes are created:

1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project (massclip-96dc4)
3. Navigate to Firestore Database > Indexes
4. You should see the new composite indexes with status "Enabled"

## Index Build Time

- Simple indexes: Usually seconds to minutes
- Complex indexes on large collections: Can take hours
- You'll receive an email when indexing is complete

## Alternative: Manual Creation

If you prefer to create indexes manually via Firebase Console:

1. Go to the Firebase Console Indexes page
2. Click "Create Index"
3. Select collection: `customDomains`
4. Add fields:
   - Field: `domain`, Order: Ascending
   - Field: `status`, Order: Ascending
5. Click "Create"

Repeat for the userId + status index.
