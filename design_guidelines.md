# QR Ticket Approval & Event Management System - Design Guidelines

## Brand Identity

**Purpose**: Professional event management platform for organizers to create events, manage registrations, and verify attendees via QR codes. Serves students, professionals, companies across hackathons, conferences, and fests.

**Aesthetic Direction**: **Enterprise-grade efficiency** - Clean, trustworthy, data-focused. Think Stripe meets Eventbrite: generous whitespace, clear hierarchy, smart use of color to indicate status, and zero clutter. The interface should feel FAST and RELIABLE, not playful.

**Memorable Element**: Status-driven color system where every ticket, registration, and check-in has instant visual clarity through color coding (pending=amber, approved=green, rejected=red, checked-in=blue).

---

## Navigation Architecture

**Web Application Structure** (Responsive, mobile-first):

### Public Routes (No Auth)
- Landing Page
- Event Registration Page (public link)
- View Ticket Page (public link, read-only)

### Authenticated Routes

**Admin Dashboard** (Sidebar Navigation):
- Dashboard (Overview/Analytics)
- Events (List & Create)
- Event Detail (Registrations, Settings, Form Builder)
- Templates (Saved Form Templates)

**Participant Portal** (Top Navigation):
- My Tickets
- Profile Settings

**Verifier Portal** (Single-purpose):
- QR Scanner Interface
- Check-in Log

---

## Screen-by-Screen Specifications

### 1. Landing Page (Public)
**Layout**:
- Fixed header: Logo left, Login/Signup right
- Hero section: Headline + CTA ("Create Event" button)
- Features grid (3 columns): Event Creation, QR Verification, Analytics
- Footer: Links, contact

**Components**: Hero banner, feature cards, CTA buttons

---

### 2. Login/Signup Pages
**Layout**: Centered card (max-width 400px), logo above
- Email + Password fields
- Role selector (Admin/Participant/Verifier) via tabs
- Primary CTA button below form
- "Forgot password?" link

**Components**: Form inputs, tab switcher, validation messages

---

### 3. Admin Dashboard (Overview)
**Layout**: 
- Left sidebar (fixed): Navigation menu with icons
- Top bar: Event selector dropdown, admin avatar/menu
- Main content: 
  - Stats cards (4 across): Total Events, Active Registrations, Checked-In Today, Pending Approvals
  - Recent Activity table
  - Quick Actions: "Create Event", "Export Data"

**Components**: Stat cards with icons, data table, action buttons

**Empty State**: When no events exist, show illustration (empty-dashboard.png) with "Create Your First Event" CTA

---

### 4. Events List Page
**Layout**:
- Header: "My Events" + "Create Event" button (top right)
- Grid/List toggle
- Event cards showing: thumbnail, title, date, registration count, status badge
- Filter bar: Upcoming/Past/Draft tabs

**Components**: Event cards (clickable), status badges, filter tabs

**Empty State**: Illustration (empty-events.png) with "No events yet. Create one to get started."

---

### 5. Event Detail Page
**Layout**: 
- Breadcrumb: Events > [Event Name]
- Tabs: Registrations | Settings | Form Builder
- **Registrations Tab**: 
  - Search bar, filter by status (All/Approved/Pending/Rejected/Checked-in)
  - Data table: Name, Email, Status, Registration Date, Actions (Approve/Reject/View)
  - Bulk actions toolbar (when rows selected)
  - Export CSV button
- **Settings Tab**: 
  - Event details form: Name, Date, Location, Description
  - Toggle: Require Approval, Enable Check-in
  - Public registration link (copy button)
- **Form Builder Tab**:
  - Drag-and-drop field palette (left sidebar): Text, Dropdown, Checkbox, File Upload, etc.
  - Canvas area (center): Arranged form fields (draggable, deletable)
  - Field properties panel (right): Edit labels, options, validation
  - Save as Template button

**Components**: Tabs, data tables, form builder canvas, toggle switches, action buttons

---

### 6. Event Registration Page (Public)
**Layout**: 
- Minimal header: Event logo/name
- Event banner image (hero)
- Event details: Date, time, location
- Registration form (dynamic fields based on form builder)
- Submit button: "Register for Event"
- Footer: Powered by [App Name]

**Components**: Form inputs, submit button, event info card

---

### 7. View Ticket Page (Public)
**Layout**: 
- Centered ticket card (mobile-optimized, screenshot-friendly)
- Ticket design:
  - Event name (large, bold)
  - QR code (centered, large)
  - Participant name
  - Event date/time/location
  - Ticket ID
  - Status badge (Pending/Approved/Checked-in)
- Download/Share buttons below ticket

**Components**: Ticket card, QR code display, action buttons

**Generated Asset**: ticket-template.png (decorative ticket background pattern)

---

### 8. Verifier Portal (QR Scanner)
**Layout**: 
- Full-screen camera viewfinder
- Overlay: Scanning frame (guides user to center QR)
- Bottom sheet (slides up when QR scanned):
  - Participant photo (if available)
  - Name, email, ticket ID
  - Status indicator (large, color-coded)
  - Action buttons: "Check-In" / "Check-Out" (conditionally shown)
  - Cancel button
- Top bar: Event selector, check-in log icon (top right)

**Components**: Camera view, modal sheet, status indicators, action buttons

---

### 9. Participant Portal (My Tickets)
**Layout**:
- Top nav: Logo, My Tickets, Profile
- Tickets grid (cards): Event name, date, QR thumbnail, status badge
- Click ticket → opens full ticket view

**Components**: Ticket cards (grid layout)

**Empty State**: Illustration (empty-tickets.png) with "No tickets yet. Register for an event to get started."

---

## Color Palette

**Primary**: #2563EB (Trust blue - admin actions, CTAs)  
**Success**: #10B981 (Approved, checked-in)  
**Warning**: #F59E0B (Pending, needs attention)  
**Error**: #EF4444 (Rejected, errors)  
**Info**: #3B82F6 (Checked-in status)  

**Neutrals**:
- Background: #F9FAFB
- Surface: #FFFFFF
- Border: #E5E7EB
- Text Primary: #111827
- Text Secondary: #6B7280

**Status Colors** (use for badges, indicators):
- Pending: #F59E0B
- Approved: #10B981
- Rejected: #EF4444
- Checked-in: #3B82F6
- Checked-out: #6B7280

---

## Typography

**Font**: Inter (web-safe, professional)

**Type Scale**:
- Hero: 48px, Bold
- H1 (Page Title): 32px, Bold
- H2 (Section): 24px, Semibold
- H3 (Card Title): 18px, Semibold
- Body: 16px, Regular
- Caption: 14px, Regular
- Small: 12px, Regular

---

## Visual Design

**Components**:
- Buttons: 8px border radius, 12px vertical padding
  - Primary: Fill with Primary color, white text
  - Secondary: Border, Primary text
  - Hover: Darken 10%
- Cards: 12px border radius, subtle shadow (0 1px 3px rgba(0,0,0,0.1))
- Tables: Zebra striping (odd rows bg: #F9FAFB), hover highlight
- Status Badges: 4px border radius, colored bg at 10% opacity, bold text in full color
- Form Inputs: 8px border radius, 1px border (#E5E7EB), focus ring (Primary color)

**Icons**: Use Feather Icons or Heroicons (web-optimized)

---

## Assets to Generate

1. **logo.png** - App logo (simple, professional) - Used in header across all pages
2. **hero-illustration.png** - Event management concept art - Landing page hero section
3. **empty-dashboard.png** - Analytics/graph illustration - Admin dashboard empty state
4. **empty-events.png** - Calendar/event illustration - Events list empty state
5. **empty-tickets.png** - Ticket stub illustration - My Tickets empty state
6. **ticket-template.png** - Subtle pattern/texture for ticket background - View Ticket page
7. **qr-scan-frame.png** - Decorative QR scan guide overlay - Verifier scanner interface
8. **default-event-thumbnail.png** - Generic event placeholder - Event cards when no image uploaded

All illustrations: Minimalist line-art style, Primary color (#2563EB) on light background.