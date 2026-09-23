# TaskRoom Phone Web App

This is the first phone-accessible prototype.

Features included:
- Create account / login demo
- Create room with Room ID + password
- Join room
- Host/member roles
- Main tabs
- Exactly 6 sub-tabs per main tab
- Host task assignment
- 35 active-task limit per member per sub-tab
- Member task completion
- Completed tasks disappear from member active list
- Host approve / return workflow
- Returned tasks reappear for the member
- Browser localStorage persistence
- PWA manifest

IMPORTANT:
This is a prototype. Data is stored in the browser's localStorage. It is not secure and it does not synchronize between different phones.

Production version:
Firebase Authentication + Cloud Firestore + backend security rules.

To use this as a real phone app, the files need to be uploaded to an HTTPS web host. Then open the site in Chrome and choose "Add to Home screen".
