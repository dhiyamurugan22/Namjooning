# To-Do List Application

A personal productivity and task-management web app. Sign in with Google, create and organize your tasks, and view them in both a to-do list and an interactive calendar — all kept in sync and accessible from any device.

> Replace the title above with your chosen app name (e.g. **Doable**, **Ticked**, **TaskFlow**) once you've picked one.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Firebase Setup](#firebase-setup)
- [Firestore Data Model](#firestore-data-model)
- [Available Scripts](#available-scripts)
- [Deployment](#deployment)
- [Security](#security)
- [Roadmap](#roadmap)
- [License](#license)

---

## Overview

Users often juggle notes apps, calendars, and reminder apps just to keep track of daily tasks. This app centralizes that into one simple platform where users can:

- Create tasks with dates and times
- View tasks in a calendar
- Track completed and upcoming tasks
- Access their tasks securely from any device via Google sign-in

---

## Features

### MVP (current scope)

- ✅ Google Login / Logout (Firebase Authentication)
- ✅ Dashboard (today's tasks, upcoming tasks, completed tasks, pending count)
- ✅ Create / View / Edit / Delete tasks
- ✅ Mark tasks as complete
- ✅ Calendar view (Month / Week / Day / Agenda) via React Big Calendar
- ✅ Two-way sync between to-do list and calendar
- ✅ Per-user data isolation (Firestore Security Rules)
- ✅ Responsive UI (desktop, tablet, mobile)
- ✅ Production deployment on Vercel

### Planned / Future

- Recurring tasks, tags, categories, subtasks, attachments
- Reminders & notifications
- Search, filtering, sorting
- Drag-and-drop rescheduling on the calendar
- Calendar event colors, multiple calendars, external calendar integration
- Productivity stats, streaks, weekly reports
- Dark/light theme, PWA support
- AI task suggestions, natural-language task creation
- Google Calendar integration

---

## Tech Stack

| Layer                    | Technology                              |
|---------------------------|------------------------------------------|
| Frontend                  | React                                    |
| Build Tool                | Vite                                      |
| Calendar                  | React Big Calendar                        |
| Date Handling             | date-fns                                  |
| Authentication             | Firebase Authentication (Google provider) |
| Database                  | Cloud Firestore                           |
| Source Control            | Git + GitHub                              |
| Deployment / Hosting      | Vercel                                    |
| Optional UI Libraries     | Lucide React (icons), Tailwind CSS / CSS  |

---

## Architecture

```text
                     User
                       |
                       v
                React Application
                       |
          +------------+------------+
          |                         |
          v                         v
    Firebase Auth             Firestore
          |                         |
          v                         v
    Google Login              Task Data
                                    |
                                    v
                           React Big Calendar
```

**Production pipeline**

```text
GitHub
   |
   v
Vercel
   |
   v
React Application
   |
   +----------> Firebase Authentication
   |
   +----------> Firestore
```

Task data flows through a single source of truth in Firestore, so the dashboard, to-do list, and calendar all stay in sync:

```text
Firestore
    |
Task Data
    |
React Application
    |
 -----------------------------
 |             |             |
 v             v             v
To-Do List   Dashboard    Calendar
```

---

## Project Structure

```text
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── tasks/
│   │   └── calendar/
│   ├── contexts/          # Auth context, task context
│   ├── hooks/
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   └── Calendar.jsx
│   ├── services/
│   │   ├── firebase.js
│   │   └── firestore.js
│   ├── App.jsx
│   └── main.jsx
├── .env.example
├── firestore.rules
├── index.html
├── package.json
└── vite.config.js
```

_Adjust to match your actual implementation as the project evolves._

---

## Getting Started

### Prerequisites

- Node.js (LTS recommended)
- npm or yarn
- A Firebase project (see [Firebase Setup](#firebase-setup))

### Installation

```bash
# Clone the repository
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>

# Install dependencies
npm install

# Copy environment variables template
cp .env.example .env
# Fill in your Firebase config in .env

# Start the dev server
npm run dev
```

The app will be available at `http://localhost:5173` (default Vite port).

---

## Environment Variables

Create a `.env` file in the project root (never commit this file):

```bash
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

Make sure `.env` is listed in `.gitignore`.

---

## Firebase Setup

1. Create a project at [Firebase Console](https://console.firebase.google.com/).
2. Add a Web App and copy the config values into `.env`.
3. Enable **Authentication** → Sign-in method → **Google**.
4. Enable **Cloud Firestore** in production or test mode.
5. Add your Firestore Security Rules (see below) before going to production.
6. Add your deployed domain (e.g. Vercel URL) to the list of authorized domains under Authentication settings.

### Example Firestore Security Rules

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/tasks/{taskId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## Firestore Data Model

```text
users
  │
  └── userId
       │
       └── tasks
            │
            ├── taskId
            │
            ├── title
            ├── description
            ├── startTime
            ├── endTime
            ├── priority
            ├── completed
            └── createdAt
```

Each user's tasks live under their own `userId`, so users can never read or write another user's data — enforced both by the schema and by Firestore Security Rules.

---

## Available Scripts

```bash
npm run dev       # Start local development server
npm run build     # Build for production
npm run preview   # Preview the production build locally
npm run lint      # Run linter (if configured)
```

---

## Deployment

1. Push your code to GitHub.
2. Import the repository into [Vercel](https://vercel.com/).
3. Add the environment variables from `.env` to the Vercel project settings.
4. Deploy — Vercel will build and host the app automatically on every push to `main`.
5. Add the production domain to Firebase Authentication's authorized domains.

---

## Security

- All routes requiring task data are protected — unauthenticated users are redirected to the login page.
- Firestore Security Rules restrict every read/write to the authenticated user's own data.
- No credentials or API secrets are committed to source control; all sensitive config is loaded via environment variables.

---

## Roadmap

See [Features → Planned / Future](#features) for the list of enhancements planned after the MVP, including recurring tasks, reminders, drag-and-drop rescheduling, productivity analytics, and Google Calendar integration.

---

## License

Add your chosen license here (e.g. MIT).