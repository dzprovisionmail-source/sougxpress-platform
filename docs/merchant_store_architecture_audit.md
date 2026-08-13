# Rapport d'Audit Forensique : Architecture Marchand-Boutique et Gestion des Droits

## Introduction

Cet audit analyse la structure de la relation entre les entités `merchants` et `stores` au sein de Soug-XPRESS, ainsi que les mécanismes de gestion et d'approbation associés. Il identifie les raisons pour lesquelles l'inscription d'un marchand ne génère pas automatiquement de boutique et propose une stratégie pour déléguer les outils de gestion du Fondateur aux Marchands de manière sécurisée.

---

## 1. ROOT CAUSE (Cause Racine)

L'absence de création automatique d'une boutique (`store`) lors de l'inscription d'un marchand n'est pas un bug technique, mais un **choix architectural délibéré** dans l'implémentation actuelle de Soug-XPRESS [1].

1. **Découplage des Entités** : Le flux d'inscription dans `AuthScreen.tsx` est conçu pour provisionner uniquement le compte d'authentification (`auth.users`), le profil utilisateur (`public.profiles`) et l'entité commerciale (`public.merchants`). La création de la boutique est traitée comme une étape de configuration ultérieure.
2. **Architecture Différée** : Le code de l'application marchand (`apps/mobile/src/app/merchant/store.tsx`) vérifie explicitement si une boutique existe pour le `merchant_id` connecté. Si aucune n'est trouvée, il affiche un formulaire de création manuelle [2].
3. **Flux Fondateur Spécialisé** : Les outils de création de boutiques côté Fondateur (`apps/mobile/src/app/founder/add-store.tsx`) sont actuellement orientés vers la création de "boutiques de démonstration" (`is_demo: true`) plutôt que vers l'onboarding de marchands réels [3].

---

## 2. ARCHITECTURE MERCHANT → STORE

| Aspect | Description Technique | État Actuel |
| :--- | :--- | :--- |
| **Relation** | 1:1 ou 1:N (Merchant ID -> Store Merchant ID) | Un marchand peut techniquement posséder plusieurs boutiques, mais l'UI marchand actuelle n'en gère qu'une seule. |
| **Provisioning** | Inscription Marchand | Crée `merchants` (status: `pending_review`). Ne crée **pas** de `stores`. |
| **Activation** | Approbation Fondateur | Le Fondateur doit manuellement passer le statut du marchand à `active`. |
| **Initialisation Boutique** | Flux Marchand | Le marchand crée sa boutique via `createStore()` après sa première connexion [2]. |

---

## 3. ANALYSE DES PERMISSIONS ET RLS

L'audit des politiques de sécurité (RLS) sur la table `stores` montre que le système est déjà prêt pour une gestion en libre-service par le marchand [4] :

- **UPDATE** : Autorisée si `merchant_id = auth.uid()` ou si l'utilisateur est `founder/admin`.
- **INSERT** : Ouverte à tous les utilisateurs authentifiés (le marchand peut donc créer sa propre boutique).
- **SELECT** : Publique (`true`), permettant à tous les clients de voir les boutiques actives.
- **DELETE** : Restreinte au Fondateur/Admin, ou au Marchand uniquement si la boutique est encore `pending` ou `closed`.

> **Verdict RLS** : Les politiques actuelles permettent déjà au Marchand de gérer sa propre boutique sans compromettre le contrôle global du Fondateur sur l'ensemble du parc.

---

## 4. COMPARAISON DES OUTILS DE GESTION

| Fonctionnalité | Outils Fondateur (Global) | Outils Marchand (Self-Service) |
| :--- | :--- | :--- |
| **Visibilité** | Liste toutes les boutiques | Sa propre boutique uniquement |
| **Statut** | Peut forcer `active`, `suspended`, `closed` | Toggle `is_open` (ouvert/fermé) uniquement |
| **Contenu** | Édition complète, tags, badges, featured | Nom, adresse, logo, couverture, produits |
| **Finances** | Vue globale des transactions | Ses propres gains et commandes |

---

## 5. PLAN D'ACTION POUR LA PHASE SUIVANTE

L'objectif est d'automatiser la création de la boutique initiale et d'unifier l'expérience de gestion.

### Fichiers à modifier :
1. **`apps/mobile/src/components/auth/AuthScreen.tsx`** :
   - Ajouter l'appel à `createStore()` immédiatement après le provisionnement réussi du marchand pour créer une boutique par défaut (status: `pending`).
2. **`apps/mobile/src/app/merchant/store.tsx`** :
   - Affiner l'interface de gestion pour qu'elle reflète les outils d'édition avancés du Fondateur (gestion de galerie, horaires, catégories) tout en restant restreinte à la boutique du marchand.
3. **`apps/mobile/src/services/store.service.ts`** :
   - S'assurer que les fonctions de création et de mise à jour supportent tous les champs requis par le schéma `stores` identifiés lors de l'audit.

---

## Références

[1] `apps/mobile/src/components/auth/AuthScreen.tsx`, Analyse du bloc `role === "merchant"`.  
[2] `apps/mobile/src/app/merchant/store.tsx`, Logique de résolution `getStoreByMerchantId`.  
[3] `apps/mobile/src/app/founder/add-store.tsx`, Implémentation de `createDemoStore`.  
[4] Base de données distante Supabase, Résultats de la requête `pg_policies` pour la table `stores`.
