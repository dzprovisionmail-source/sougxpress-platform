# 09 — FORM SYSTEM

> **STATUS:** PERMANENT ARCHITECTURE
> Identity: Governed Data Input

---

## 1. Introduction: Forms as Governance Gates

In Soug-XPRESS V2, forms are critical interfaces for data input, acting as **governance gates** that ensure data integrity and compliance with platform policies. The Form System defines a consistent, accessible, and secure approach to data collection across all user roles, with a strong emphasis on Arabic-first (RTL) and mobile-first principles.

---

## 2. Core Form Elements & Behavior

### 2.1. Labels

- **Placement**: Always above the input field, left-aligned (right-aligned for RTL).
- **Clarity**: Concise, descriptive, and in the primary language of the user.
- **Required Fields**: Indicated by an asterisk (`*`) next to the label.

### 2.2. Validation & Feedback

| State | Visual Indication | Message Placement | RTL Behavior |
|---|---|---|---|
| **Default** | Standard border, no message | N/A | N/A |
| **Focused** | Highlighted border (`brand-primary`) | N/A | N/A |
| **Error** | Red border (`status-error`), error icon | Below input, `status-error` text | Text alignment, icon mirroring |
| **Success** | Green border (`status-success`), success icon | Below input, `status-success` text | Text alignment, icon mirroring |
| **Disabled** | Reduced opacity, `cursor-not-allowed` | N/A | N/A |

### 2.3. Required Fields

- All mandatory fields must be clearly marked with an asterisk (`*`).
- Submission is blocked until all required fields are valid.

### 2.4. Dropdown Behavior

- **Visual**: Consistent styling with other input fields.
- **Interaction**: Clear indication of selected item, accessible keyboard navigation.
- **RTL**: Dropdown arrow icon is mirrored, text aligns right.

---

## 3. Specialized Input Fields

### 3.1. Phone Fields

- **Format**: Auto-formatting based on country code (Algeria default).
- **Validation**: Real-time validation for correct number length and format.
- **RTL**: Input direction supports Arabic numerals.

### 3.2. Password Fields

- **Security**: Masked input, with an optional "show password" toggle.
- **Strength Indicator**: Visual feedback on password complexity (e.g., weak, medium, strong).
- **RTL**: Toggle icon mirrored.

### 3.3. Search Fields

- **Clear Button**: An `X` icon to clear the input, mirrored for RTL.
- **Instant Feedback**: Optional auto-suggestions or loading indicators.
- **RTL**: Search icon mirrored, text aligns right.

---

## 4. Form Standards by Journey

### 4.1. Customer Registration

- **Fields**: Name, Phone, Password, City (auto-detected/selected), Terms & Conditions consent.
- **Validation**: Strong password, unique phone number.
- **Flow**: Multi-step, with clear progress indication.

### 4.2. Merchant Registration

- **Fields**: Business Name, Owner Name, Phone, Email, Business Type, Location, Commercial Register Number, Bank Details, Password, Terms & Conditions.
- **Validation**: Extensive, including business verification.
- **Flow**: Guided, multi-step process with clear status updates.

### 4.3. Driver Registration

- **Fields**: Name, Phone, National ID, Vehicle Type, License Plate, Bank Details, Password, Terms & Conditions.
- **Validation**: Background checks, license verification.
- **Flow**: Similar to Merchant, with specific driver-related steps.

### 4.4. Authentication

- **Fields**: Phone/Email, Password.
- **Features**: "Forgot Password" flow, biometric login options.
- **Security**: Rate limiting, CAPTCHA integration.

### 4.5. Profile Completion

- **Fields**: Dynamic based on role (e.g., profile picture, delivery preferences, shop description).
- **Progress**: Visual progress bar to encourage completion.

### 4.6. Store Creation (Merchant)

- **Fields**: Store Name, Description, Category, Location, Operating Hours, Contact Info, Logo, Banner Image.
- **Validation**: Ensures all mandatory store information is provided.

### 4.7. Product Creation (Merchant)

- **Fields**: Product Name, Description, Category, Price, Stock, Images, Variants (size, color).
- **Validation**: Price format, stock quantity.

---

*Last updated: 2026-07-10*
