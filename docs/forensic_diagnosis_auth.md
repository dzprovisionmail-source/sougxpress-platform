# Rapport de Diagnostic Forensique : Flux d'Authentification et Inscription Client Soug-XPRESS

## Introduction

Ce rapport présente les résultats de l'audit forensique réalisé en mode lecture seule (`Read-Only`) sur le dépôt Soug-XPRESS et le projet Supabase distant (`pmxydehrctwvawjbhrhl`). L'objectif principal est d'identifier la cause racine du dysfonctionnement du parcours d'inscription client, caractérisé par le retour de `signUp()` indiquant `user=true` mais `session=false`, suivi d'un échec de connexion explicite avec l'erreur `Invalid login credentials` (ou `Email not confirmed`) [1].

---

## 1. ROOT CAUSE (Cause Racine)

La cause racine de l'échec de session après l'inscription (`signUp`) réside dans la configuration active du fournisseur d'authentification par e-mail sur le serveur Supabase distant : **l'exigence de confirmation de l'e-mail (`Confirm email = ON`) est activée** [2]. 

Lorsque le client mobile invoque `supabase.auth.signUp()`, Supabase crée correctement l'enregistrement dans la table interne `auth.users` (d'où `user = true`), mais en raison de la règle de validation d'e-mail, **aucune session JWT n'est émise** (d'où `session = false` et `email_confirmed_at = NULL`). 

Le code client dans `AuthScreen.tsx` tente ensuite une connexion de secours (`signInWithPassword`) pour récupérer la session [3]. Cependant, comme l'e-mail n'a pas été confirmé (aucun lien n'ayant été cliqué et aucun flux de validation complet n'ayant eu lieu dans le contexte de l'application mobile), Supabase rejette la tentative avec l'erreur `Invalid login credentials` ou `Email not confirmed`. 

Par conséquent, le processus de provisionnement et la navigation vers l'application sont bloqués, bien que l'utilisateur existe dans la base de données.

---

## 2. SUPABASE AUTH STATE

Le tableau suivant synthétise l'état réel de la configuration d'authentification et des utilisateurs sur le projet distant :

| Paramètre / Élément | État Réel | Impact sur le Parcours Client |
| :--- | :--- | :--- |
| **Email signup** | Activé (`enabled = true`) | Permet la création du compte dans `auth.users`. |
| **Confirm email** | Activé (`enabled = true`) **[Problème]** | Empêche la génération d'une session immédiate (`session = false`). |
| **Session after signup** | Inexistante sans confirmation | Bloque l'entrée instantanée du client dans la marketplace. |
| **Redirect URL / Site URL** | Configurés (schéma `sougxpress://`) | Correctement alignés avec `app.json` pour le deep linking [4]. |
| **Utilisateurs de test** | `email_confirmed_at = NULL` pour les derniers essais | Prouve que les comptes récents sont en attente de confirmation. |
| **Rate limit** | Standard Supabase | Aucun blocage par taux de requêtes constaté lors des tests. |

---

## 3. DATABASE STATE (État de la Base de Données)

L'inspection directe des tables distantes via l'infrastructure Supabase révèle les éléments suivants :
- **Table `auth.users`** : Les utilisateurs récents (ex. ID `58d9ac4c-2fbf-47a6-8a9f-48e389cc2f67`) possèdent un champ `email_confirmed_at` valant `NULL`, confirmant que la politique de validation d'e-mail est active côté serveur [5].
- **Table `public.profiles` & `public.customers`** : Les politiques RLS (Row Level Security) et les déclencheurs (`triggers`) fonctionnent correctement lorsque les requêtes disposent d'un jeton d'authentification valide. Toutefois, en l'absence de session active (`session = false`), les insertions directes ou automatisées côté client échouent ou ne peuvent être rattachées à un contexte d'authentification valide.
- **Dépendances circulaires** : Aucun blocage circulaire n'a été détecté dans les politiques RLS, mais le verrouillage de la session par l'absence de confirmation d'e-mail paralyse l'ensemble de la chaîne de provisionnement.

---

## 4. CODE STATE (État du Code Source)

- **`AuthScreen.tsx`** : Le code gère correctement les tentatives de secours (`signInWithPassword`) et les messages d'erreur, mais il est mis en échec par la politique de sécurité serveur de Supabase [3]. Modifier indéfiniment le code client ne résoudra pas le problème tant que le serveur exigera une confirmation d'e-mail sans flux de redirection complet fonctionnel sur l'appareil cible.
- **`supabase.ts`** : L'initialisation du client avec `AsyncStorage` et la persistance de session est conforme aux bonnes pratiques React Native / Expo [6].
- **`app.json`** : Le schéma de deep linking (`sougxpress://`) et les filtres d'intention Android sont correctement déclarés pour recevoir les redirections d'authentification [4].

---

## 5. EXACT NEXT ACTION (Action Suivante Requise)

Pour permettre aux clients d'accéder immédiatement à Soug-XPRESS après leur inscription (conformément aux exigences de la phase de test et de lancement), l'action manuelle suivante doit être effectuée dans le tableau de bord Supabase :

1. Se connecter au **Tableau de bord Supabase** du projet `pmxydehrctwvawjbhrhl`.
2. Naviguer vers : **Authentication** → **Providers** → **Email**.
3. Désactiver l'option de confirmation d'e-mail : **Confirm email = OFF**.
4. Enregistrer les modifications.

Une fois cette modification effectuée, un nouvel enregistrement client produira immédiatement `user = true` et `session = true`, permettant l'entrée instantanée dans l'application sans erreur d'authentification.

---

## Références

[1] Dépôt Soug-XPRESS, Journaux d'exécution du module d'authentification mobile, août 2026.  
[2] Documentation officielle Supabase Auth : Configuration des fournisseurs de messagerie et de la confirmation d'e-mail. Disponible en ligne.  
[3] `apps/mobile/src/components/auth/AuthScreen.tsx`, Code source du composant d'authentification et de gestion des sessions.  
[4] `apps/mobile/app.json`, Configuration Expo, schémas de deep linking et configuration Android/iOS.  
[5] Base de données distante Supabase (`pmxydehrctwvawjbhrhl`), Inspection de la table `auth.users`.  
[6] `apps/mobile/src/lib/supabase.ts`, Initialisation du client Supabase avec AsyncStorage.
