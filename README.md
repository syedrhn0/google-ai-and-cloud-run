# ReflectAI — Mindful Reflection & Journal Assistant

ReflectAI is a secure, user-authenticated journaling and cognitive reflection application built with **React**, **Node.js/Express**, **Gemini 3.6 Flash API**, and **Cloud Firestore** on **Google Cloud Run**.

---

## Architecture & Security Highlights

1. **User Identity & Isolation**: Authenticated via **Firebase Authentication** (Google Sign-In). Users cannot read, write, or query other users' journal entries.
2. **Database Hardening**: Zero-trust **Cloud Firestore Security Rules** enforcing owner-bound isolation at `/users/{userId}/entries/{entryId}` and `/users/{userId}/interactions/{interactionId}`.
3. **Resilient AI Pipeline**: Server-side Gemini processing with automatic model fallback ladder:
   - Primary: `gemini-3.6-flash`
   - High-Availability Fallback: `gemini-3.1-flash-lite`
   - Dynamic Alias: `gemini-flash-latest`
   - Deep Reasoning Fallback: `gemini-3.7-flash`
4. **Zero-Hardcoding Hygiene**: All API keys managed via Google Cloud Secret Manager and injected at runtime.

---

## 1. Prerequisites & GCP API Setup

Ensure you have the [Google Cloud SDK (gcloud CLI)](https://cloud.google.com/sdk/docs/install) installed and authenticated:

```bash
# Set your active GCP project
gcloud config set project YOUR_PROJECT_ID

# Enable required Google Cloud services
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  cloudbuild.googleapis.com
```

---

## 2. Secret Manager Configuration

Store your Gemini API key in Google Cloud Secret Manager:

```bash
# Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant the default Cloud Run service account access to read the secret
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)")

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 3. Firestore Database & Security Rules

Deploy the owner-bound security rules to Cloud Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User root document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      // Isolated user journal entries subcollection
      match /entries/{entryId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      // Isolated user interaction history subcollection
      match /interactions/{interactionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

---

## 4. Cloud Run Deployment

Build and deploy the application container to Google Cloud Run:

```bash
# Deploy service to Cloud Run with Secret Manager mounting
gcloud run deploy reflect-ai \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --port 3000
```

---

## 5. Campaign Verification Labeling

Apply the mandatory challenge verification label to your deployed Cloud Run service:

```bash
gcloud run services update reflect-ai \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```
