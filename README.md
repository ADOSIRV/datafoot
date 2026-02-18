# DataFoot — Suivi des performances footballistiques

Application web progressive (PWA) complète pour le suivi des jongles footballistiques par joueur (pied droit, pied gauche, tête), avec gestion multi-rôles, mode hors-ligne, export PDF et envoi email automatique.

---

## Fonctionnalités principales

- **Suivi des performances** : saisie des jongles par session (pied droit, pied gauche, tête)
- **Historique & graphiques** : courbes de progression individuelles par joueur
- **5 rôles utilisateur** : Admin global, District, Admin club, Entraîneur, Joueur
- **Mode hors-ligne (PWA)** : saisie et consultation sans connexion, synchronisation auto
- **Export PDF** : rapport individuel avec graphiques et historique de sessions
- **Envoi email** : rapports mensuels automatisés via Resend / SMTP
- **Paramétrage Supabase dynamique** : URL + clé API configurables depuis l'interface admin
- **Responsive** : PC, tablette, mobile

---

## Stack technique

| Couche         | Technologie                                  |
|----------------|----------------------------------------------|
| Frontend       | React 18 + TypeScript + Vite                 |
| Styles         | Tailwind CSS v3                              |
| Routing        | React Router v6                              |
| Formulaires    | React Hook Form + Zod                        |
| Graphiques     | Recharts                                     |
| Export PDF     | jsPDF + html2canvas                          |
| Base de données| Supabase (PostgreSQL + RLS)                  |
| Cache offline  | Dexie.js (IndexedDB)                         |
| PWA            | Service Worker natif                         |
| Edge Functions | Deno (Supabase Functions)                    |
| Email          | Resend API                                   |

---

## Installation rapide

### 1. Installer les dépendances

```bash
npm install
```

### 2. Configurer Supabase

Copier `.env.example` en `.env` :

```bash
cp .env.example .env
```

Renseigner :
```
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-anon
```

> Les paramètres peuvent aussi être configurés depuis l'interface Admin → Paramètres.

### 3. Créer le schéma de base de données

Exécuter dans le SQL Editor de Supabase :
```
supabase/migrations/001_initial_schema.sql
```

### 4. Déployer les Edge Functions

```bash
supabase functions deploy create-user
supabase functions deploy delete-user
supabase functions deploy send-monthly-report
supabase functions deploy send-report-email

# Secrets requis
supabase secrets set RESEND_API_KEY=...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
```

### 5. Lancer

```bash
npm run dev      # Développement → http://localhost:5173
npm run build    # Build production
npm run preview  # Preview du build
```

---

## Architecture des fichiers

```
src/
├── components/
│   ├── charts/        # ProgressionChart (Recharts), StatsRadar
│   └── shared/        # AppLayout, Sidebar, Modal, Toast, EmptyState...
├── contexts/          # AuthContext, OfflineContext, ToastContext
├── pages/
│   ├── admin/         # Clubs, Teams, Users, Settings (Supabase)
│   ├── district/      # Clubs en lecture seule
│   ├── club-admin/    # Gestion équipes/joueurs/coaches
│   ├── coach/         # Saisie performances, vue joueurs
│   └── player/        # Profil, historique, graphiques
├── services/
│   ├── api.ts         # Toutes les requêtes Supabase
│   ├── auth.ts        # Authentification
│   ├── offline.ts     # Dexie.js (IndexedDB) — cache offline
│   ├── pdf.ts         # Génération PDF (jsPDF + html2canvas)
│   ├── supabase.ts    # Client Supabase configurable dynamiquement
│   └── sync.ts        # Synchronisation des données offline
└── types/index.ts     # Types TypeScript complets

supabase/
├── migrations/
│   └── 001_initial_schema.sql   # Schéma + RLS + triggers
└── functions/
    ├── create-user/          # Création utilisateur auth+profil
    ├── delete-user/          # Suppression utilisateur
    ├── send-monthly-report/  # Rapport mensuel automatique
    └── send-report-email/    # Envoi rapport individuel

public/
├── manifest.json    # PWA manifest
└── sw.js            # Service Worker (offline)
```

---

## Rôles et permissions

| Rôle         | Droits                                                                  |
|--------------|-------------------------------------------------------------------------|
| `admin`      | Gestion complète clubs/équipes/utilisateurs + paramètres Supabase      |
| `district`   | Lecture seule des clubs/équipes/joueurs sous sa supervision            |
| `club_admin` | Gestion de ses équipes, joueurs, entraîneurs                           |
| `coach`      | Saisie des performances, consultation historique de ses équipes        |
| `player`     | Consultation de son propre profil, historique et graphiques            |

---

## Mode hors-ligne

1. À la connexion, les données sont mises en cache (IndexedDB)
2. Hors ligne : la saisie s'enregistre dans une file d'attente locale
3. Retour en ligne : synchronisation automatique
4. Le Service Worker met en cache les assets pour accès instantané

---

## Déploiement mobile (PWA)

**Android** : Chrome → menu → "Ajouter à l'écran d'accueil"

**iOS** : Safari → Partager → "Sur l'écran d'accueil"

Pour une app native (Capacitor) :
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap init && npm run build && npx cap sync
npx cap open android  # ou ios
```

---

## Licence

MIT — DataFoot © 2025
