# Firebase Setup Guide for AgroBridge

## Overview
The application has been migrated to use Firebase Firestore as the main database. This setup allows seamless deployment to Vercel and other cloud platforms.

## Setup Steps

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one

### 2. Enable Firestore API (CRITICAL - Required before first use!)
1. Go to [Google Cloud Console - Firestore API](https://console.cloud.google.com/apis/library/firestore.googleapis.com)
2. Make sure your project is selected (agrobridge-233cf)
3. Click **Enable** to activate the Firestore API
4. Wait a few minutes for the API to propagate

### 3. Create Firestore Database
1. In Firebase Console, go to **Firestore Database**
2. Click **Create Database**
3. Start in **test mode** for development (allows read/write access)
4. Choose a location (e.g., `nam5` for US multi-region)

### 4. Get Service Account Key
1. In Firebase Console, go to **Project Settings** > **Service accounts**
2. Click **Generate new private key**
3. Save the JSON file as `data/serviceAccountKey.json` in your project

### 5. Environment Variables (for Vercel Production)
Set one of these options in your Vercel project settings:

**Option 1: Full JSON (copy entire service account JSON)**
```
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"your-project-id",...}
```

**Option 2: Individual keys (recommended for most platforms)**
```
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFA...\n-----END PRIVATE KEY-----\n"
```

Note: The private key must keep `\n` as escaped characters in the .env file.

### 6. Install Dependencies
```bash
npm install
```

### 7. Run Locally
```bash
npm run dev
```

### 8. Deploy to Vercel
The vercel.json is already configured. Simply push to your Vercel-connected repository.

## Initial Data Seeding
The database will automatically seed initial data on first successful connection:
- 1 Admin user: `admin@agrobridge.com` / `admin123`
- 2 Agent users: `agent1@agrobridge.com` / `agent123`, `agent2@agrobridge.com` / `agent123`
- 1 Buyer user: `buyer@agrobridge.com` / `buyer123`
- 3 Farmers and 4 Products

## Collections in Firestore
- `users` - User accounts
- `agents` - Agent profiles
- `farmers` - Farmer records
- `products` - Crop listings
- `orders` - Order headers
- `orders/{orderId}/orderProducts` - Order items (subcollection)
- `reviews` - Product reviews
- `notifications` - User notifications
- `config` - Platform configuration (doc ID: "default")