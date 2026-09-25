# TaskRoom — Firebase version

TaskRoom is a phone-friendly task tracking web app using Firebase Authentication and Cloud Firestore.

## Included
- Cross-device email/password accounts
- Cloud-synced rooms
- Host/member roles
- 6 sub-tabs created automatically for every main tab
- Host-created tasks
- Maximum 35 active tasks per member per sub-tab
- Member completion flow
- Host approve / return flow
- Returned tasks reappear for the member
- Firestore security rules
- GitHub Pages compatible (no build step required)

## Firebase setup
This version uses Firebase JavaScript SDK 12.19.0 from the official CDN.
The Firebase web config is in `app.js`.

In Firebase Console:
1. Authentication → Sign-in method → Email/Password: Enabled
2. Firestore Database: created in production mode
3. Firestore → Rules: paste the contents of `firestore.rules` and Publish

## Important security note
The current phone-friendly MVP verifies the room password in the browser using a SHA-256 hash stored in `roomCodes`. This is suitable for the current prototype but is not the final production-grade join system. A future Cloud Function/server-side join endpoint should perform room-password verification and membership creation server-side.

Do not put Firebase Admin SDK credentials or service-account private keys in this website.

## Deploy on GitHub Pages
Upload/replace these files in the repository root:
- index.html
- app.js
- style.css
- manifest.json
- firestore.rules (for reference; publish its contents in Firebase Console)
- README.md

Existing localStorage demo accounts are not automatically migrated to Firebase. Create the accounts again in the new Firebase version.
