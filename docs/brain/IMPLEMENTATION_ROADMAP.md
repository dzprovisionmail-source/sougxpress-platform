# Feuille de Route d'Implémentation de Production - Soug-XPRESS V2

## 1. Introduction

Ce document décrit la feuille de route pour l'implémentation de production de Soug-XPRESS V2, en se basant sur l'architecture validée et les principes de développement incrémental et non destructif [1].

## 2. Ordre d'Exécution des Migrations

Les migrations SQL **DOIVENT** être exécutées dans l'ordre numérique pour garantir la cohérence de la base de données. L'outil `supabase db push` applique automatiquement les migrations dans le bon ordre [2].

### 2.1. Migrations du Schéma de Base (001-003)

| Migration                          | Objectif                                | Tables Créées                                   |
| :--------------------------------- | :-------------------------------------- | :---------------------------------------------- |
| `001_core_zones_and_customers.sql` | Tables fondamentales pour les zones et les clients | `zones`, `customers`, `customer_addresses`, `audit_logs` |
| `002_merchants_and_stores.sql`     | Gestion des marchands et des magasins   | `merchants`, `stores`                           |
| `003_products.sql`                 | Catalogue de produits                   | `products`, `product_images`                    |

### 2.2. Migrations des Commandes et Livraisons (004-006)

| Migration             | Objectif                                | Tables Créées                                   |
| :-------------------- | :-------------------------------------- | :---------------------------------------------- |
| `004_orders.sql`      | Système de gestion des commandes        | `orders`, `order_items`, `order_status_history` |
| `005_drivers.sql`     | Gestion des chauffeurs-livreurs         | `drivers`, `driver_locations`                   |
| `006_deliveries.sql`  | Attributions de livraison et suivi des commissions | `delivery_assignments`, `delivery_commission_cycles` |

### 2.3. Migrations Finance et Notifications (007-009)

| Migration                           | Objectif                                | Tables Créées                                   |
| :---------------------------------- | :-------------------------------------- | :---------------------------------------------- |
| `007_finance_and_notifications.sql` | Systèmes financiers et de notification  | `platform_financial_settings`, `payouts`, `transactions`, `notifications` |
| `008_promotions_and_disputes.sql`   | Promotions et résolution des litiges    | `promotions`, `promotion_redemptions`, `disputes` |
| `009_founder_operating_system.sql`  | Supervision et métriques du fondateur  | `founder_overrides`, `platform_metrics_snapshots`, `founder_alerts` |

### 2.4. Migrations de la Logique Métier (010-011)

| Migration                           | Objectif                                | Fonctions/Triggers                               |
| :---------------------------------- | :-------------------------------------- | :----------------------------------------------- |
| `010_financial_logic_functions.sql` | Calcul financier et logique de commission | `get_platform_financial_setting`, `calculate_order_total`, `increment_delivery_commission_counter`, `confirm_delivery_payment`, `log_audit_event`, `create_order_transaction` |
| `011_business_logic_triggers.sql`   | Application automatique de la logique métier | Triggers pour les changements de statut de commande, attributions de livraison, litiges, overrides du fondateur |

### 2.5. Migrations Sécurité et Données (012-013)

| Migration                     | Objectif                                | Politiques/Données                               |
| :---------------------------- | :-------------------------------------- | :----------------------------------------------- |
| `012_rls_policies.sql`        | Politiques de sécurité au niveau des lignes (RLS) pour tous les rôles | Politiques RLS pour clients, marchands, chauffeurs, administrateurs |
| `013_seed_ain_sefra_data.sql` | Données initiales pour le lancement de Ain Sefra | Données de zone, paramètres financiers           |

## 3. Principes Clés de Conception

-   **Incrémental Uniquement** : Les migrations utilisent `CREATE TABLE IF NOT EXISTS`, n'abandonnent ni ne recréent de tables existantes, et ajoutent des colonnes sans jamais les supprimer [2].
-   **Précision Financière** : Toutes les valeurs monétaires sont stockées en **unités monétaires mineures** (centimes pour DZD) et tous les calculs utilisent des entiers pour éviter les erreurs d'arrondi [2].
-   **Auditabilité** : Chaque table possède des horodatages `created_at` et `updated_at`, et une table `audit_logs` suit tous les changements d'état [2].
-   **Contrôle d'Accès Basé sur les Rôles (RBAC)** : Les politiques RLS appliquent le contrôle d'accès au niveau de la base de données pour les rôles `customer`, `merchant`, `driver`, `admin`, `founder` [2].
-   **Application de la Logique Métier** : Les triggers appliquent automatiquement les règles métier et les calculs financiers sont effectués dans des fonctions SQL [2].

## 4. Stratégie de Rollback

Pour annuler une migration, il faut créer une nouvelle migration qui inverse les changements (par exemple, `DROP TABLE IF EXISTS new_table`) et l'appliquer [2].

## 5. Tests des Migrations

Avant d'appliquer en production, les migrations doivent être testées localement avec Supabase, l'intégrité des données vérifiée, et les politiques RLS testées avec des utilisateurs de différents rôles [2].

## Références

[1] Soug-XPRESS V2 - Consolidated Manus Reports - Shared Foundation Summary
[2] Soug-XPRESS V2 - Consolidated Manus Reports - Database Migrations (Duplicate Version)
