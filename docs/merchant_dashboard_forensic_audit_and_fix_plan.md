# Forensic Audit and Comprehensive Repair Plan: Merchant Store Dashboard & Soug-XPRESS Ecosystem

## Executive Summary
This document provides a forensic engineering audit of the Merchant Store Dashboard and its supporting architecture (Database Schema, RLS, Storage Policies, Category Taxonomy, Location Management, and Marketplace Discoverability) in Soug-XPRESS. 

---

## 1. Core Audit Findings & Root Causes

### A. Merchant Store Categories (Single-Category vs. Multi-Secondary)
- **Current State:** The database schema (`stores.category_id` and `stores.subcategory_id`) and UI currently enforce a 1:1 relationship between a store and a secondary subcategory.
- **Requirement:** A store must have **one primary/main category** and **multiple secondary/subcategories**.
- **Root Cause:** The `stores` table lacks a many-to-many junction table for secondary subcategories.
- **Fix:** Introduce a `store_subcategories_map` table (`store_id`, `subcategory_id`) with appropriate RLS policies and update the store service and UI to allow selecting multiple subcategories.

### B. Store Location (28 Ain Sefra Neighborhoods)
- **Current State:** The application defines the 28 authoritative neighborhoods in `apps/mobile/src/constants/ain-sefra-zones.ts` and seeds them into the `zones` table (`202607110001400_zone_alignment.sql`).
- **Requirement:** The Merchant Store Edit screen must use this exact neighborhood list and persist `neighborhood` / `zone_id`.
- **Fix:** Wire the neighborhood dropdown in `merchant/store.tsx` to `AIN_SEFRA_ZONES` and ensure `zone_id` / `neighborhood` are correctly saved to the store record.

### C. Image Upload Failures ("Network request failed")
- **Current State:** Merchants experience upload failures ("Network request failed" or permission denied) when uploading store logos, covers, product images, and gallery items.
- **Root Cause:** 
  1. Storage policies on `store_images` bucket and RLS policies on `store_gallery` tables historically restricted `INSERT`/`UPDATE`/`DELETE` to `admin`/`founder` roles.
  2. Missing merchant-specific RLS policies for storage objects (`storage.objects`) and `store_gallery`.
- **Fix:** Implement robust Supabase Storage and table RLS policies allowing authenticated merchants to manage assets belonging strictly to stores they own (`merchant_id = auth.uid()`).

### D. Marketplace Store Discoverability
- **Current State:** Merchant stores sometimes fail to appear in the Marketplace.
- **Root Cause:** 
  1. Newly created stores default to `status = 'pending'`, whereas marketplace queries filter by `status = 'active'`.
  2. Missing or restrictive RLS SELECT policies.
- **Fix:** Ensure correct status lifecycle handling and clear feedback in the merchant dashboard when a store is pending founder approval.

### E. Merchant "Preview Store in Marketplace"
- **Current State:** The top administrative banner was removed from the Marketplace home screen. Merchants need a direct way to preview their store as customers see it.
- **Fix:** Add a prominent "معاينة المتجر في المتجر (Marketplace Preview)" button in the Merchant Store Dashboard linking to `/store-details?id=${store.id}`.

---

## 2. Action Plan & Implementation Steps

1. **Database & Storage Migration:**
   - Create `store_subcategories_map` table for multi-secondary subcategories.
   - Update RLS policies for `stores`, `store_gallery`, and `store_images` bucket to allow store owners full CRUD on their own assets.
2. **Service Layer Updates:**
   - Enhance `store.service.ts` to support fetching/saving multiple subcategories and reliable storage uploads.
3. **Dashboard UI Refinement:**
   - Update `apps/mobile/src/app/merchant/store.tsx` to include multi-subcategory selection, 28 Ain Sefra neighborhood picker, and the Marketplace preview action.
4. **Validation & Testing:**
   - Run TypeScript checks (`tsc --noEmit`), Expo export, and git verification.
