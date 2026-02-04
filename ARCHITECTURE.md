# System Architecture Documentation

## Project: QR Ticket Manager (Global Scale App)
**Version:** 1.0.0  
**Description:** A high-performance event management and ticketing system with real-time QR validation, role-based access control, and automated notifications.

---

## 1. High-Level Overview
The system follows a **Full-Stack Mobile Architecture** with a decoupled frontend (React Native/Expo) and backend (Node.js/Express) communicating via a RESTful API.

### Core Philosophy:
- **Sub-50ms Perception:** Optimized for instant navigation and data visibility.
- **Offline Reliability:** Optimistic UI updates and local caching via TanStack Query.
- **Role-Based Isolation:** Strict separation between Admin, Participant, and Verifier flows.

---

## 2. Technology Stack

### Frontend (Client)
- **Framework:** Expo (React Native) with New Architecture enabled.
- **State Management:** TanStack Query (React Query) for server state; React Context for Auth.
- **Navigation:** React Navigation (Stack & Bottom Tabs) with deep-linking support.
- **Performance:** `expo-image` for high-speed caching and `react-native-reanimated` for 60FPS visuals.
- **Notifications:** `expo-notifications` for real-time alerts.

### Backend (Server)
- **Runtime:** Node.js with TypeScript (`tsx`).
- **Framework:** Express.js.
- **Persistence:** PostgreSQL (via Supabase).
- **ORM:** Drizzle ORM for type-safe database queries.
- **Storage:** Supabase Storage for event banners and profile images.

### Infrastructure
- **Deployment:** Koyeb (Backend) & Expo Application Services (Mobile Build).
- **Security:** Bcrypt encryption, HTTP-only sessions, and Supabase Service Role isolation.

---

## 3. Directory Structure

```text
├── client/                 # Mobile Application
│   ├── components/         # Reusable UI Atoms (Button, Input, Card)
│   ├── contexts/           # Global State (Auth, Theme)
│   ├── hooks/              # Custom logic (Notifications, SafeArea)
│   ├── navigation/         # Role-based Tab & Stack Navigators
│   ├── screens/            # Application Views
│   └── lib/                # API Client and Utility functions
├── server/                 # Backend API
│   ├── routes.ts           # REST Endpoints
│   ├── storage.ts          # Database Access Layer (IStorage interface)
│   └── supabase.ts         # Supabase client & transformation logic
├── shared/                 # Shared Logic & Types
│   └── schema.ts           # Drizzle/Zod database schemas
└── assets/                 # Static assets (Images, Fonts)
```

---

## 4. Key Architectural Patterns

### A. Repository Pattern (IStorage)
The backend uses an `IStorage` interface to decouple business logic from database implementation. This allows for easy switching between local memory, Postgres, or other databases without modifying the routing logic.

### B. Global Navigation Ref
Accessing navigation anywhere (even outside components like in notification handlers) is achieved via `navigationRef`. This enables complex flows like opening a specific event detail from a background push notification.

### C. Type-Safe Data Flow
The `shared/schema.ts` file is the "Single Source of Truth."
1. **DB Schema:** Created in Drizzle.
2. **API Types:** Generated from the same schema via Zod.
3. **Frontend Types:** Shared types ensure the mobile app always matches the API response structure.

### D. Multi-User Flow
- **Admin:** Event creation, broadcast management, registration approval.
- **Participant:** Event discovery, public registration, ticket wallet.
- **Verifier:** High-performance QR scanning and check-in/out logic.

---

## 5. Sequence: Ticket Registration Flow
1. **Discovery:** Participant views event detail (cached via TanStack Query).
2. **Request:** Participant submits registration form (verified by Zod).
3. **Approval:** Admin receives notification -> Approves via Dashboard.
4. **Fulfillment:** Backend generates a unique QR hash -> Stores in DB.
5. **Collection:** Participant's "My Tickets" screen refreshes; QR is rendered locally using `react-native-qrcode-svg`.

---

## 6. Performance Optimizations
- **Image Caching:** Using `expo-image` `disk` caching to prevent repeated network requests.
- **Optimistic Auth:** The app checks `AsyncStorage` for user details before the server confirms the session, ensuring a <10ms App Startup experience.
- **Single-Call API:** Backend routes are optimized to return registration counts and user stats in a single joined SQL query (avoiding N+1 problems).

---

## 7. Security Measures
- **Environment Isolation:** `.env` variables separate development and production keys.
- **JWT & SessionFallback:** Uses `express-session` for secure browser/mobile persistent sessions.
- **Input Validation:** All API endpoints are guarded by Zod schema validation.
