# QR Ticket Approval & Event Management System

## Overview

A cross-platform event management application built with Expo React Native and Express.js that enables organizers to create events, manage registrations, and verify attendees via QR codes. The system serves students, professionals, and companies organizing hackathons, tech events, college fests, and conferences.

The application supports three user roles:
- **Admin/Organizer**: Create events, design custom registration forms, approve/reject registrations, view analytics
- **Participant**: Register for events, view tickets with QR codes, track registration status
- **Verifier**: Scan QR codes to check-in/check-out attendees

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: Expo React Native (SDK 54) with React 19
- **Navigation**: React Navigation v7 with native stack navigators and bottom tab navigators
- **State Management**: TanStack React Query for server state, React Context for auth state
- **Styling**: React Native StyleSheet with a centralized theme system supporting light/dark modes
- **Animations**: React Native Reanimated for performant UI animations
- **Path Aliases**: `@/` maps to `./client`, `@shared/` maps to `./shared`

### Backend Architecture
- **Framework**: Express.js 5 with TypeScript
- **API Design**: RESTful JSON API with session-based authentication
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple
- **Password Security**: bcryptjs for password hashing

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` - shared between frontend and backend
- **Migrations**: Drizzle Kit for schema migrations (`./migrations` directory)

### Authentication & Authorization
- **Method**: Session-based auth with express-session
- **Session Store**: PostgreSQL table (`session`)
- **Role-Based Access**: Three roles (admin, participant, verifier) with role-specific navigation stacks
- **Client Storage**: AsyncStorage for persisting user session on mobile

### Key Data Models
- **Users**: Basic user accounts with email/password and role assignment
- **Events**: Event details with custom form field configurations (stored as JSONB)
- **Registrations**: Registration submissions with QR codes and status tracking
- **Check-ins**: Check-in/check-out log for attendance tracking
- **Form Templates**: Saved form configurations for reuse

### Status Color System
The application uses a consistent status-driven color system:
- Pending: Amber (#F59E0B)
- Approved: Green (#10B981)
- Rejected: Red (#EF4444)
- Checked In: Blue (#3B82F6)
- Checked Out: Gray (#6B7280)

## External Dependencies

### Database
- **PostgreSQL**: Primary database accessed via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries and schema management

### Third-Party Services
- **Expo Camera**: QR code scanning for ticket verification
- **Expo Haptics**: Tactile feedback for user interactions
- **Expo Clipboard**: Copy functionality for ticket links

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret key for session encryption (defaults to development value)
- `EXPO_PUBLIC_DOMAIN`: Public domain for API URL construction
- `REPLIT_DEV_DOMAIN`: Development domain for CORS configuration

### Build & Development Tools
- **Babel**: Transpilation with module-resolver for path aliases
- **ESBuild**: Server bundling for production
- **Drizzle Kit**: Database migration tooling
- **TypeScript**: Full type safety across frontend and backend