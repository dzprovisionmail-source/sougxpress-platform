Visual**: Clear, large buttons with role-specific icons.

### 3.3. Authentication Flow

- **Entry Points**: Login screen, registration forms, session expiry.
- **Navigation**: Secure transitions between login, registration, password recovery, and OTP verification.
- **RTL**: Input fields and button order are RTL compliant.

### 3.4. Onboarding

- **Purpose**: Guiding new users (Customer, Merchant, Driver) through initial setup and profile completion.
- **Navigation**: Linear, step-by-step progress with clear indicators and ability to save progress.
- **Visual**: Engaging, illustrative screens with minimal text.

---

## 4. Role-Specific Navigation Systems

### 4.1. Founder OS Navigation

- **Primary Structure**: Persistent left-aligned (RTL: right-aligned) Command Sidebar.
- **Hierarchy**: Top-level sections (Dashboard, Governance, Finance, Participants, AI Agents, Logs).
- **Interaction**: Clickable menu items, expandable sub-menus for detailed governance areas.
- **Deep Linking**: Direct access to specific governance reports or participant profiles.

### 4.2. Customer Navigation

- **Primary Structure**: Bottom Navigation Bar for core functions (Home, Search, Orders, Profile).
- **Secondary Navigation**: Category filters, product detail screens, checkout flow.
- **RTL**: Icons and text are mirrored where appropriate, swipe gestures for carousels are reversed.

### 4.3. Merchant Navigation

- **Primary Structure**: Tabbed interface for managing shop, orders, products, and finances.
- **Secondary Navigation**: Product creation forms, order detail views, analytics dashboards.
- **RTL**: Tab order and content flow are RTL compliant.

### 4.4. Driver Navigation

- **Primary Structure**: Map-centric view with overlaid action buttons (Accept Order, Navigate, Complete Delivery).
- **Secondary Navigation**: Payout history, profile settings, availability toggle.
- **RTL**: Map controls and directional cues are adapted for RTL.

---

## 5. Global Navigation Elements

### 5.1. Settings

- **Access**: Accessible from user profile or main navigation.
- **Structure**: Categorized list of options (Account, Notifications, Language, Privacy, Help).
- **RTL**: Layout and text flow are RTL compliant.

### 5.2. Deep Linking

- **Purpose**: Allows direct access to specific content or features within the app from external sources (e.g., marketing campaigns, notifications).
- **Implementation**: Consistent URL structure across platforms, with graceful fallback for unauthenticated users.

### 5.3. Navigation Hierarchy

- **Breadcrumbs**: Used in complex FOS or Merchant interfaces to show current location within a multi-level structure.
- **Back Button**: Consistent behavior across all screens, always returning to the previous logical state.

---

*Last updated: 2026-07-10*
