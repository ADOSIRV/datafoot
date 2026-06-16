# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Commandes essentielles

```bash
npm run dev          # Serveur de développement (http://localhost:5173)
npm run dev -- --host  # Accessible sur le réseau local
npm run build        # Compilation TypeScript + build Vite (production)
npm run lint         # ESLint sur tout le projet
npm run preview      # Preview du build de production
```

> Il n'y a pas de tests automatisés dans ce projet.

---

## Architecture globale

### Vue d'ensemble

Application web **React 18 + TypeScript + Vite** de suivi des performances de jongles footballistiques. Le frontend communique exclusivement avec **Supabase** (PostgreSQL hébergé). L'application est une **PWA installable** avec mode hors-ligne complet.

### Flux de données

```
Navigateur
  └─ React (src/)
       ├─ src/services/supabase.ts   → Client Supabase configurable dynamiquement
       ├─ src/services/api.ts        → Toutes les requêtes DB (CRUD)
       ├─ src/services/offline.ts    → Cache IndexedDB (Dexie.js) quand hors ligne
       ├─ src/services/sync.ts       → Synchronisation offline → online
       └─ src/services/pdf.ts        → Génération PDF côté client (jsPDF)

Supabase (cloud ou VPS)
  ├─ PostgreSQL (tables + RLS)
  └─ Edge Functions (Deno)
       ├─ create-user               → Crée auth.user + profil en transaction
       ├─ delete-user               → Supprime auth.user en cascade
       ├─ send-report-email         → Envoie un PDF par email (Resend API)
       └─ send-monthly-report       → Rapport mensuel automatique pour tous les joueurs
```

### Configuration Supabase dynamique

Le client Supabase **n'est pas fixe** : l'URL et la clé anon sont stockées dans `localStorage` sous les clés `datafoot_supabase_url` et `datafoot_supabase_key`. L'admin peut les changer depuis l'interface sans redéployer. Les variables `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) servent de valeurs par défaut si le localStorage est vide.

```
src/services/supabase.ts  →  getSupabaseConfig()   (lit localStorage ou .env)
                          →  setSupabaseConfig()   (écrit localStorage, reset client)
                          →  getSupabaseClient()   (singleton, recréé si reset)
```

### Système de rôles et routage

5 rôles définis : `admin | district | club_admin | coach | player`

`src/App.tsx` contient deux composants de garde :
- `<ProtectedRoute roles={[...]}>` — vérifie l'authentification et le rôle
- `<PublicRoute>` — redirige vers `/dashboard` si déjà connecté

`src/pages/DashboardPage.tsx` redirige vers le dashboard spécifique selon `user.profile.role`.

La navigation latérale (`src/components/shared/Sidebar.tsx`) génère dynamiquement les liens selon le rôle via la fonction `roleNav(role)`.

### Contextes React

| Contexte | Fichier | Rôle |
|----------|---------|------|
| `AuthContext` | `src/contexts/AuthContext.tsx` | Utilisateur connecté, login/logout, écoute `onAuthStateChange` |
| `OfflineContext` | `src/contexts/OfflineContext.tsx` | État en ligne/hors ligne, file d'attente, déclenchement sync |
| `ToastContext` | `src/contexts/ToastContext.tsx` | Notifications toast (auto-supprimées après 5s) |

### Mode hors-ligne

Deux niveaux de persistence :
1. **IndexedDB** (Dexie) — `src/services/offline.ts` — cache les clubs, équipes, profils, sessions
2. **File d'attente** — `offlineActions` table Dexie — stocke les créations de sessions en attente

Flux offline :
- `CoachSessionsPage` lit depuis IndexedDB si `!isOnline`
- `queueOfflineAction()` enregistre la session localement
- `OfflineContext` écoute `window.addEventListener('online')` → appelle `triggerSync()`
- `sync.ts` rejoue les actions en attente puis rafraîchit le cache

### Génération PDF

`src/services/pdf.ts` génère le PDF entièrement côté client :
1. Construit la mise en page avec **jsPDF**
2. Capture le graphique Recharts via `html2canvas` (cibler par `id` DOM, ex: `id="report-chart"`)
3. Retourne un `Blob` → `downloadPDF()` crée un lien temporaire pour le téléchargement

---

## Base de données (Supabase)

### Tables principales

| Table | Description |
|-------|-------------|
| `clubs` | Clubs de football |
| `teams` | Équipes (appartiennent à un club) |
| `profiles` | Utilisateurs liés à `auth.users` (1-to-1) |
| `coach_teams` | Relation N-N entraîneur ↔ équipe |
| `district_clubs` | Relation N-N district ↔ club |
| `performance_sessions` | Sessions de jongles (right_foot, left_foot, head, total généré) |
| `app_settings` | Singleton (id='singleton') : URL Supabase, clé, config SMTP |

La colonne `total` dans `performance_sessions` est **générée automatiquement** par PostgreSQL (`right_foot + left_foot + head`), ne pas la passer à l'insert.

### Row Level Security (RLS)

Chaque table a des politiques RLS complètes. Deux fonctions SQL utilitaires :
- `current_user_role()` — retourne le rôle du profil connecté
- `current_profile_id()` — retourne l'ID du profil connecté

Règles critiques :
- `admin` → accès total
- `district` → lecture seule, filtré via `district_clubs`
- `club_admin` → lecture/écriture sur son propre club uniquement
- `coach` → saisie de performances sur ses équipes (`coach_teams`)
- `player` → lecture seule de ses propres sessions

### Création d'utilisateur

**Ne jamais** insérer directement dans `profiles` depuis le frontend. Passer par la Edge Function `create-user` qui crée d'abord l'`auth.user`, puis le profil en rollback automatique si erreur.

---

## Fonctionnalités implémentées

### Saisie des performances (coach)
- Flux en 3 étapes : sélection équipe → sélection joueur → saisie (pied D / pied G / tête)
- Total calculé en temps réel dans le formulaire
- Bascule automatique vers le mode hors-ligne si `!isOnline`
- Commentaire libre par session

### Graphiques
- `ProgressionChart` (Recharts) — LineChart ou AreaChart selon prop `showArea`
- `StatsRadar` (Recharts) — profil global du joueur
- Les deux acceptent `ChartDataPoint[]` produit par `sessionsToChartData()`
- Pour capturer un graphique en PDF, lui donner un `id` DOM unique

### Rapports PDF
- Page `/reports` accessible à `admin`, `club_admin`, `coach`
- Filtre par équipe, joueur, période (tout / 3 mois / mois en cours)
- Aperçu en temps réel avant génération
- Envoi email via Edge Function `send-report-email` (Resend API)

### Paramètres Supabase (admin uniquement)
- Page `/admin/settings` — saisie URL + clé + bouton "Tester la connexion"
- `testSupabaseConnection()` crée un client temporaire et interroge `profiles`
- Sauvegarde dans `app_settings` ET dans `localStorage` (via `setSupabaseConfig`)

---

## Conventions de code

### Formulaires
Tous les formulaires utilisent **React Hook Form** + **Zod**. Pattern standard :
```tsx
const schema = z.object({ ... });
type FormData = z.infer<typeof schema>;
const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });
```
Quand `z.coerce` est utilisé (inputs numériques), caster le resolver avec `as any` pour contourner un conflit de type TypeScript connu.

### Toasts
Toujours utiliser `useToast().addToast()` pour les retours utilisateur. Ne jamais utiliser `alert()`.

### Classes CSS Tailwind
Des classes utilitaires composées sont définies dans `src/index.css` : `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-success`, `.card`, `.card-hover`, `.input-field`, `.badge`, `.badge-blue/green/yellow/red/gray`, `.sidebar-link`, `.sidebar-link-active`, `.stat-card`, `.table-header`, `.table-cell`, `.table-row`.

### Couleurs personnalisées Tailwind
- `primary-*` (bleu) — actions principales, navigation active
- `pitch-*` (vert) — validations, succès (nom inspiré du terrain de foot)

---

## Variables d'environnement

Fichier `.env` à créer à la racine (copier `.env.example`) :

```
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-anon
```

Ces valeurs sont des **fallbacks** : si l'admin configure via l'interface, le localStorage prend le dessus.

Secrets à configurer côté Edge Functions (via `supabase secrets set`) :
- `SUPABASE_SERVICE_ROLE_KEY` — requis pour `create-user` et `delete-user`
- `RESEND_API_KEY` — requis pour l'envoi d'emails

---

## Déploiement

### Build Vite
```bash
npm run build  # génère dist/
```
Le build est découpé en chunks (voir `vite.config.ts`) : react, supabase, charts, pdf, forms, offline. Le chunk PDF est volontairement large (~590 kB, jsPDF).

### Edge Functions Supabase
```bash
supabase functions deploy create-user
supabase functions deploy delete-user
supabase functions deploy send-report-email
supabase functions deploy send-monthly-report
```

### PWA
- `public/manifest.json` — manifest installable Android/iOS
- `public/sw.js` — Service Worker (cache assets statiques, navigation offline-first)
- Enregistrement dans `src/main.tsx` au chargement de la page

---

## Initialisation d'un premier admin

Après avoir exécuté `supabase/migrations/001_initial_schema.sql`, créer le premier utilisateur manuellement dans Supabase Dashboard → Auth → Users, puis :

```sql
INSERT INTO profiles (user_id, email, first_name, last_name, role, is_active)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'admin@example.com'),
  'admin@example.com', 'Prénom', 'Nom', 'admin', true
);
```
