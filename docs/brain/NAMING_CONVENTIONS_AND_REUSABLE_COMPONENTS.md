# Conventions de Nommage et Composants Réutilisables - Soug-XPRESS V2

## 1. Introduction

Ce document établit les conventions de nommage et la stratégie de conception des composants réutilisables pour Soug-XPRESS V2. L'objectif est d'assurer la cohérence, la lisibilité et la maintenabilité du code à travers l'ensemble de la plateforme, en adhérant aux principes d'architecture V2 [1].

## 2. Conventions de Nommage

La standardisation des noms est cruciale pour la clarté et la collaboration. Les conventions suivantes seront appliquées :

### 2.1. Modules et Répertoires

-   **Nommage** : `kebab-case` pour les noms de répertoires de modules (ex: `order-management`, `user-profile`).
-   **Structure** : Chaque module doit avoir un répertoire racine avec un `index.ts` (ou `.tsx`) comme point d'entrée, et des sous-répertoires pour les composants, hooks, utilitaires, types, etc.

### 2.2. Composants React Native

-   **Nommage** : `PascalCase` pour les noms de fichiers et de fonctions/classes de composants (ex: `Button.tsx`, `ProductCard.tsx`).
-   **Organisation** : Les composants UI génériques et réutilisables seront placés dans un répertoire `shared/ui-components`. Les composants spécifiques à un module seront dans le répertoire `components` de ce module.

### 2.3. Fichiers

-   **Point d'entrée** : `index.ts` ou `index.tsx` pour les répertoires exportant plusieurs éléments.
-   **Types** : `types.ts` pour les définitions d'interfaces et de types.
-   **Utilitaires** : `utils.ts` pour les fonctions utilitaires.
-   **Hooks** : `use[NomDuHook].ts` pour les hooks personnalisés (ex: `useAuth.ts`).
-   **Constantes** : `constants.ts` pour les valeurs constantes.

### 2.4. Variables, Fonctions et Classes (TypeScript/JavaScript)

-   **Variables/Fonctions** : `camelCase` (ex: `userName`, `fetchProducts`).
-   **Constantes Globales** : `SCREAMING_SNAKE_CASE` (ex: `API_BASE_URL`).
-   **Classes/Interfaces/Types** : `PascalCase` (ex: `User`, `IProduct`, `ProductType`).

### 2.5. Styles (Tailwind CSS)

-   **Classes** : Utilisation directe des classes utilitaires de Tailwind CSS. Pour les styles complexes ou réutilisables, envisager des classes `@apply` dans des fichiers CSS dédiés ou des composants stylisés.

## 3. Composants Partagés Réutilisables

La réutilisabilité est un pilier de l'architecture V2. Les composants suivants seront développés comme des entités partagées, accessibles à tous les modules frontend.

### 3.1. Composants UI (Shared UI Components)

Ces composants formeront la base du Design System de Soug-XPRESS, garantissant une expérience utilisateur cohérente.

| Composant           | Description                                                              | Exemples d'utilisation                                         |
| :------------------ | :----------------------------------------------------------------------- | :------------------------------------------------------------- |
| **Button**          | Boutons interactifs avec différents styles (primaire, secondaire, texte, icône). | Actions utilisateur (confirmer, annuler, ajouter au panier)    |
| **Input**           | Champs de saisie de texte, numériques, avec validation et labels.        | Formulaires d'authentification, de recherche, de commande      |
| **Card**            | Conteneurs pour afficher des informations structurées (produits, boutiques, commandes). | Affichage de produits dans le marketplace, détails de commande |
| **Typography**      | Composants pour la gestion des textes (titres, paragraphes, légendes) avec styles prédéfinis. | Tous les affichages de texte pour la cohérence typographique   |
| **Icon**            | Composant pour l'affichage d'icônes SVG ou de bibliothèques d'icônes.    | Navigation, actions, indicateurs de statut                     |
| **LoadingIndicator**| Indicateurs visuels pour les états de chargement.                        | Lors du chargement de données, soumission de formulaires       |
| **Modal/Dialog**    | Fenêtres modales pour les confirmations, alertes ou saisies supplémentaires. | Confirmation de commande, alertes d'erreur                     |
| **BottomNavigation**| Barre de navigation inférieure pour les applications mobiles.            | Navigation principale pour Client, Marchand, Livreur           |
| **Header**          | En-têtes d'écran avec titre, boutons d'action et recherche.              | En-têtes de toutes les vues principales                        |

### 3.2. Hooks Personnalisés (Shared Hooks)

Ces hooks encapsuleront la logique d'état et les effets secondaires réutilisables.

| Hook                | Description                                                              | Exemples d'utilisation                                         |
| :------------------ | :----------------------------------------------------------------------- | :------------------------------------------------------------- |
| **`useAuth`**       | Gère l'état d'authentification de l'utilisateur, la connexion/déconnexion. | Protection des routes, affichage conditionnel d'éléments UI    |
| **`useDataFetch`**  | Gère la récupération de données asynchrones, les états de chargement et d'erreur. | Récupération de listes de produits, détails de commande        |
| **`useForm`**       | Gère l'état des formulaires, la validation et la soumission.             | Tous les formulaires de la plateforme                          |

### 3.3. Utilitaires (Shared Utilities)

Fonctions d'aide génériques pour des tâches courantes.

| Utilitaire          | Description                                                              | Exemples d'utilisation                                         |
| :------------------ | :----------------------------------------------------------------------- | :------------------------------------------------------------- |
| **`formatCurrency`**| Formate les valeurs numériques en devises locales.                       | Affichage des prix, totaux de commande                         |
| **`validateInput`** | Fonctions de validation (email, mot de passe, etc.).                     | Validation des champs de formulaire                            |

## Références

[1] Soug-XPRESS V2 - Consolidated Manus Reports - Shared Foundation Summary
