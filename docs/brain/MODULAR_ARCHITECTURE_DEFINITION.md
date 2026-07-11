# Définition de l'Architecture Modulaire de Soug-XPRESS V2

## 1. Introduction

Ce document décrit l'architecture modulaire de Soug-XPRESS V2, une approche visant à structurer la plateforme en composants indépendants et réutilisables. Cette modularité garantit la cohérence, la maintenabilité, la scalabilité et la robustesse du système, en ligne avec les principes de la Fondation Partagée [1].

## 2. Principes Clés de la Modularité

### 2.1. Indépendance des Modules
Chaque module est conçu pour être autonome, avec des responsabilités claires et une interface bien définie. Cela minimise les dépendances entre les modules et facilite leur développement, test et déploiement indépendants.

### 2.2. Réutilisabilité
Les composants et services partagés sont centralisés pour être réutilisés à travers l'application, réduisant la duplication de code et assurant une expérience utilisateur et une logique métier cohérentes.

### 2.3. Scalabilité
L'architecture modulaire permet de faire évoluer des parties spécifiques du système sans affecter l'ensemble, facilitant l'ajout de nouvelles fonctionnalités ou l'adaptation à des charges accrues.

### 2.4. Maintenabilité
La séparation des préoccupations et la clarté des interfaces améliorent la lisibilité du code et simplifient la maintenance et le débogage.

## 3. Structure des Modules

Les modules sont organisés en répertoires `kebab-case` (ex: `order-management`, `user-profile`) et suivent une structure interne cohérente [2]:

-   **Répertoire Racine du Module** : Contient un `index.ts` (ou `.tsx`) comme point d'entrée.
-   **Sous-répertoires** : Pour les composants, hooks, utilitaires, types, etc., spécifiques au module.

## 4. Composants de la Fondation Partagée

La Fondation Partagée de Soug-XPRESS V2 est un ensemble de modules et de composants réutilisables qui servent de socle technique à l'ensemble de la plateforme [1].

### 4.1. Système de Thème et Design Tokens

-   **`design-tokens/tokens.ts`** : Centralise les valeurs de design (couleurs, espacements, etc.).
-   **`design-tokens/theme.ts`** : Définit les thèmes clair et sombre (`lightTheme`, `darkTheme`).

### 4.2. Types Partagés

-   **`types/entities.ts`** : Interfaces TypeScript pour les entités métier principales (ex: `UserProfile`, `Order`).
-   **`types/api.ts`** : Types pour les interactions API (ex: `ApiResponse`, `LoginRequest`).

### 4.3. Constantes Partagées

-   **`constants/index.ts`** : Regroupe toutes les constantes configurables de l'application.

### 4.4. Validation Partagée

-   **`validation/validators.ts`** : Fonctions de validation réutilisables et schémas Zod.

### 4.5. Gestion des Erreurs

-   **`errors/AppError.ts`** : Hiérarchie de classes d'erreurs personnalisées et `ErrorHandler` centralisé.

### 4.6. Services Partagés

-   **`services/supabase.ts`** : Initialise le client Supabase.
-   **`services/api.ts`** : Client API HTTP basé sur Axios.
-   **`services/loading.ts`** : Utilitaires pour gérer l'état asynchrone des opérations.

### 4.7. Hooks Partagés

-   **`hooks/useAuth.ts`** : Gère l'état d'authentification.
-   **`hooks/useDataFetch.ts`** : Hook générique pour la récupération de données asynchrones.
-   **`hooks/useForm.ts`** : Hook pour la gestion des formulaires.

### 4.8. Utilitaires Partagés

-   **`utils/permissions.ts`** : Définit les permissions et les mappages rôle-permission.
-   **`utils/formatters.ts`** : Fonctions pour le formatage de données courantes.

### 4.9. Composants UI Partagés

Composants réutilisables formant la base du Design System (ex: `Button`, `Input`, `Card`, `Typography`, `LoadingIndicator`, `Modal/Dialog`, `BottomNavigation`, `Header`) [2].

### 4.10. Layouts Réutilisables

-   **`layouts/MainLayout.tsx`** : Layout de base pour les écrans.
-   **`layouts/FormLayout.tsx`** : Layout spécifique pour les formulaires.

## Références

[1] Soug-XPRESS V2 - Consolidated Manus Reports - Shared Foundation Summary
[2] Soug-XPRESS V2 - Consolidated Manus Reports - Naming Conventions & Reusable Components
