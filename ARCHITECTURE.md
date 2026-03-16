# Architecture Technique — Dashboard Ouate Paris (Ask-It)

> Version : Mars 2026 | Projet : `btkjdqelvvqmtguhhkdv` (Lovable Cloud)

---

## Table des matières

1. [Schéma BDD complet](#1-schéma-bdd-complet)
2. [Edge Functions — Inventaire](#2-edge-functions--inventaire)
3. [diagnostic-webhook — Logique détaillée](#3-diagnostic-webhook--logique-détaillée)
4. [Système de Personas](#4-système-de-personas)
5. [Recommandations Marketing](#5-recommandations-marketing)
6. [Aski — Architecture du chatbot](#6-aski--architecture-du-chatbot)
7. [Intégrations externes](#7-intégrations-externes)
8. [Crons actifs](#8-crons-actifs)
9. [Frontend — Structure des onglets](#9-frontend--structure-des-onglets)
10. [Sécurité & Accès](#10-sécurité--accès)
11. [Manifeste des fichiers](#11-manifeste-des-fichiers)

---

## 1. Schéma BDD complet

### `diagnostic_sessions`
Table principale : chaque session de diagnostic démarrée sur le site.

| Colonne | Type | Default | Description |
|---------|------|---------|-------------|
| `id` | uuid | gen_random_uuid() | Clé primaire |
| `session_code` | varchar | généré par trigger | Code court unique (ex: `A3B4C5D`) |
| `status` | varchar | `'en_cours'` | `en_cours` \| `termine` \| `abandonne` |
| `created_at` | timestamptz | now() | Date de création |
| `user_name` | varchar | null | Prénom du parent |
| `relationship` | varchar | null | `parent_mama` \| `parent_papa` \| `beau_parent` \| `grand_parent` \| `autre` |
| `email` | varchar | null | Email normalisé en lowercase |
| `phone` | varchar | null | Téléphone |
| `optin_email` | boolean | false | Consentement email |
| `optin_sms` | boolean | false | Consentement SMS |
| `number_of_children` | int | null | Nombre d'enfants |
| `locale` | varchar | null | Langue détectée |
| `source` | varchar | null | `ads` \| `direct` \| `email` \| `social` \| `qrcode` \| `partenaire` |
| `utm_campaign` | varchar | null | Paramètre UTM |
| `device` | varchar | null | `mobile` \| `desktop` \| `tablet` |
| `persona_code` | varchar | null | Code persona assigné (P0–P9+) |
| `matching_score` | int | null | Score de matching 0–100 |
| `adapted_tone` | varchar | null | Ton adapté : `playful` \| `empowering` \| `factual` \| `transparent` \| `expert` |
| `result_url` | varchar | null | URL de la page résultat |
| `conversion` | boolean | false | A commandé |
| `exit_type` | varchar | null | `cta_principal` \| `cta_secondaire` \| `abandon` |
| `is_existing_client` | boolean | false | Client déjà Ouate |
| `recommended_products` | text | null | Produits recommandés (CSV) |
| `recommended_cart_amount` | numeric | null | Montant panier recommandé |
| `validated_products` | text | null | Produits commandés (CSV) |
| `validated_cart_amount` | numeric | null | Montant commande réelle |
| `selected_cart_amount` | numeric | null | Montant panier sélectionné |
| `cart_selected_at` | timestamptz | null | Date de sélection panier |
| `checkout_started` | boolean | false | Checkout initié |
| `checkout_at` | timestamptz | null | Date checkout |
| `upsell_potential` | varchar | null | `faible` \| `moyen` \| `eleve` |
| `existing_ouate_products` | text | null | Produits Ouate déjà possédés |
| `duration_seconds` | int | null | Durée totale du diagnostic |
| `abandoned_at_step` | varchar | null | Étape d'abandon |
| `question_path` | text | null | Chemin de questions parcouru |
| `back_navigation_count` | int | 0 | Nombre de retours en arrière |
| `has_optional_details` | boolean | false | A rempli des détails optionnels |
| `behavior_tags` | text | null | Tags comportementaux |
| `engagement_score` | int | null | Score d'engagement 0–100 |
| `routine_size_preference` | varchar | null | `minimal` \| `simple` \| `complete` |
| `priorities_ordered` | text | null | Priorités ordonnées (CSV) |
| `trust_triggers_ordered` | text | null | Déclencheurs de confiance (CSV) |
| `content_format_preference` | varchar | null | `visual` \| `short` \| `complete` |
| `avg_response_time` | float | null | Temps de réponse moyen (ms) |
| `total_text_length` | int | null | Longueur totale des réponses texte |
| `has_detailed_responses` | boolean | false | A fourni des réponses détaillées |
| `step_timestamps` | jsonb | null | Timestamps par étape |

**Trigger** : `generate_session_code()` — génère automatiquement un `session_code` unique de 7 caractères si null.
**Trigger** : `validate_diagnostic_session()` — valide les valeurs ENUM.
**RLS** : Service role only (toutes les opérations via Edge Functions).

---

### `diagnostic_children`
Données par enfant, liées à une session.

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid | Clé primaire |
| `session_id` | uuid | FK → `diagnostic_sessions.id` |
| `child_index` | int | Index (0 = premier enfant) |
| `first_name` | varchar | Prénom de l'enfant |
| `birth_date` | date | Date de naissance |
| `age` | int | Âge calculé |
| `age_range` | varchar | `4-6` \| `7-9` \| `10-11` |
| `skin_concern` | varchar | `imperfections` \| `sensible` \| `seche` \| `atopique` \| `normale` |
| `has_routine` | boolean | A déjà une routine |
| `routine_satisfaction` | int | Score satisfaction 0–10 |
| `routine_issue` | varchar | `not_adapted` \| `no_visible_results` \| `not_tolerated` \| `too_complicated` \| `other` |
| `routine_issue_details` | text | Détails libres |
| `has_ouate_products` | boolean | Possède des produits Ouate |
| `ouate_products` | text | Liste des produits Ouate |
| `existing_routine_description` | text | Description libre de la routine |
| `skin_reactivity` | varchar | `environment` \| `products` \| `no` |
| `reactivity_details` | text | Détails réactivité |
| `exclude_fragrance` | boolean | Exclure les parfums |
| `dynamic_question_1–3` | text | Questions IA générées |
| `dynamic_answer_1–3` | text | Réponses aux questions IA |
| `dynamic_insight_targets` | text | Cibles d'insights IA |

**Trigger** : `validate_diagnostic_child()` — valide les ENUM (age_range, skin_concern, etc.).
**RLS** : Service role only.

---

### `personas`
Source de vérité des segments clients.

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid | Clé primaire |
| `code` | varchar | Identifiant unique (P1, P2…, P10+) |
| `name` | varchar | Prénom du persona (Sophie, Emma…) |
| `full_label` | varchar | Label complet (ex: "Sophie — Novice Imperfections") |
| `description` | text | Description narrative |
| `criteria` | jsonb | Critères de scoring (voir §4) |
| `is_active` | boolean | true = actif |
| `is_pool` | boolean | true = pool P0 (non attribué) |
| `is_existing_client_persona` | boolean | true = personas P8/P9 |
| `is_auto_created` | boolean | Créé automatiquement par detect-persona-clusters |
| `auto_created_at` | timestamptz | Date de création automatique |
| `session_count` | int | Nombre de sessions associées |
| `avg_matching_score` | numeric | Score moyen de matching |
| `min_sessions` | int | Seuil minimum de sessions |
| `detection_source` | varchar | Source de détection |
| `source_personas` | text[] | Personas sources (pour fusions) |
| `created_at` / `updated_at` | timestamptz | Dates |

**Structure JSON du champ `criteria`** :
```json
{
  "identity": {
    "weight": 0.25,
    "criteria": [
      { "field": "is_existing_client", "values": [false], "weight": 0.5, "required": true },
      { "field": "relationship", "values": ["parent_mama"], "weight": 0.5 }
    ]
  },
  "need": {
    "weight": 0.50,
    "criteria": [
      { "field": "child.skin_concern", "values": ["imperfections"], "weight": 0.6, "required": true },
      { "field": "child.age_range", "values": ["4-6", "7-9"], "weight": 0.4 }
    ]
  },
  "behavior": {
    "weight": 0.25,
    "criteria": [
      { "field": "priority_1", "values": ["efficacite"], "weight": 1.0 }
    ]
  }
}
```

**Opérateurs supportés** : `gte`, `lte`, ou égalité implicite (array de valeurs).
**RLS** : Lecture publique + Service role full access.

---

### `diagnostic_responses`
Table legacy (format avant Feb 2026). Conservée pour rétrocompatibilité.

| Colonnes principales | Description |
|---------------------|-------------|
| `session_id` | Identifiant de session (string, pas UUID) |
| `email`, `phone` | Contact |
| `email_optin`, `sms_optin` | Consentements |
| `child_name`, `child_age` | Données enfant |
| `parent_name` | Prénom parent |
| `detected_persona` | Code persona détecté |
| `persona_confidence` | Score de confiance |
| `persona_scores` | jsonb des scores par persona |
| `answers` | jsonb des réponses brutes |
| `metadata` | jsonb de métadonnées |
| `source_url`, `utm_*` | Tracking |

---

### `ouate_products`
Catalogue produits synchronisé depuis Shopify Storefront API.

| Colonne | Type | Description |
|---------|------|-------------|
| `shopify_product_id` | bigint | ID Shopify unique |
| `title` | varchar | Nom du produit |
| `handle` | varchar | Slug Shopify |
| `description` | text | Description (tronquée à 500 chars) |
| `product_type` | varchar | Type (soin, coffret, nettoyant…) |
| `vendor` | varchar | Marque |
| `tags` | text[] | Tags Shopify |
| `price_min` / `price_max` | numeric | Fourchette de prix |
| `variants` | jsonb | Variantes (id, title, price, sku, available) |
| `images` | jsonb | Images (src, alt) |
| `status` | varchar | `active` \| `archived` |
| `shopify_url` | text | URL produit sur ouate-paris.com |
| `synced_at` | timestamptz | Dernière synchronisation |

---

### `shopify_orders`
Commandes reçues via webhook Shopify.

| Colonne | Type | Description |
|---------|------|-------------|
| `shopify_order_id` | text | ID Shopify (unique, clé de dédup) |
| `order_number` | text | Numéro lisible (#1234) |
| `customer_email` | text | Email client |
| `total_price` | numeric | Montant total |
| `currency` | text | Devise (EUR) |
| `is_from_diagnostic` | boolean | Lié à un diagnostic |
| `diagnostic_session_id` | text | `session_code` de la session (pas UUID) |

---

### `marketing_recommendations`
Recommandations marketing générées par Claude Sonnet.

| Colonne | Type | Description |
|---------|------|-------------|
| `week_start` | date | Lundi de la semaine |
| `generated_at` | timestamptz | Date de génération |
| `recommendation_version` | int | 1 = legacy, 2+ = V2 |
| `generation_type` | text | `global` \| `ads` \| `offers` \| `emails` |
| `status` | varchar | `active` |
| `generated_categories` | jsonb | Catégories générées (ex: `["ads","offers","emails"]`) |
| `ads_v2` | jsonb | Tableau de recommandations Ads V2 |
| `offers_v2` | jsonb | Tableau d'offres V2 |
| `emails_v2` | jsonb | Tableau d'emails V2 |
| `campaigns_overview` | jsonb | Campagnes transversales |
| `checklist` | jsonb | Checklist hebdomadaire |
| `persona_focus` | jsonb | Focus persona de la semaine |
| `generation_config` | jsonb | Config de génération |
| `ads_recommendations` | jsonb | Legacy V1 (rétrocompat) |
| `email_recommendations` | jsonb | Legacy V1 |
| `offers_recommendations` | jsonb | Legacy V1 |

---

### `market_intelligence`
Intelligence de marché mensuelle pré-calculée.

| Colonne | Type | Description |
|---------|------|-------------|
| `month_year` | text | Format `2026-03` |
| `project_id` | text | `ouate` |
| `status` | text | `pending` → `perplexity_done` → `completed` |
| `perplexity_ads/email/offers` | jsonb | Recherches Perplexity brutes (query, raw_response, sources) |
| `gemini_ads/email/offers_analysis` | jsonb | Analyses Gemini 3.1 Pro (analysis, personas_insights) |
| `personas_snapshot` | jsonb | Snapshot des personas au moment de la génération |
| `client_context` | jsonb | Contexte marque (produits hardcodés pour Ouate) |
| `models_used` | jsonb | Modèles utilisés |
| `generation_duration_ms` | int | Durée totale de génération |
| `error_log` | text | Log d'erreur si échec |

---

### `api_usage_logs`
Tracking de toutes les consommations API IA.

| Colonne | Type | Description |
|---------|------|-------------|
| `edge_function` | text | Nom de la fonction appelante |
| `api_provider` | text | `lovable-ai` \| `anthropic` \| `perplexity` |
| `model` | text | Modèle exact utilisé dynamiquement |
| `input_tokens` | int | Tokens en entrée |
| `output_tokens` | int | Tokens en sortie |
| `total_tokens` | int | Total tokens |
| `tokens_used` | int | Legacy (colonne historique) |
| `api_calls` | int | Nombre d'appels (1 par row) |
| `metadata` | jsonb | Contexte additionnel (type d'appel, etc.) |

**Index** : `created_at`, `api_provider`, `model`, `edge_function`.
**Pattern** : Tous les inserts sont fire-and-forget (`.then().catch()`) pour ne jamais bloquer.

---

### `aski_chats`
Conversations avec Aski.

| Colonne | Description |
|---------|-------------|
| `id` | UUID conversation |
| `title` | Titre généré par Gemini Flash Lite |
| `is_archived` | Archivé |
| `created_at` / `updated_at` | Dates |

---

### `aski_messages`
Messages individuels.

| Colonne | Description |
|---------|-------------|
| `chat_id` | FK → `aski_chats.id` |
| `role` | `user` \| `assistant` |
| `content` | Texte du message |
| `tokens_used` | Tokens consommés (legacy) |
| `response_time_ms` | Temps de réponse |

---

### `recommendation_usage`
Quota mensuel de générations marketing.

| Colonne | Description |
|---------|-------------|
| `project_id` | `ouate` |
| `month_year` | Format `2026-03` |
| `total_generated` | Total généré ce mois |
| `monthly_limit` | Plafond (36 crédits) |
| `plan` | `starter` |
| `generations_log` | jsonb historique |

**Coûts en crédits** : Global = 9 | Catégorie = 3 | Unitaire = 1.

---

### `funnel_recommendations`
Recommandations d'optimisation de funnel.

| Colonne | Description |
|---------|-------------|
| `week_start` | Lundi de la semaine |
| `step` | Étape du tunnel concernée |
| `issue` | Problème identifié |
| `recommendation` | Action recommandée |
| `applied` | Marquée comme appliquée |
| `applied_at` | Date d'application |
| `kept_from_previous` | Gardée de la semaine précédente |

---

### `marketing_sources`
213 sources marketing de référence.

| Colonne | Description |
|---------|-------------|
| `source_name` | Nom de la source |
| `source_url` | URL |
| `category` | `ads` \| `email` \| `offers` |
| `tier` | 1 = premium, 2 = standard |
| `project_id` | `ouate` |
| `is_active` | Active |

---

### `persona_detection_log`
Journal des actions de détection automatique.

| Colonne | Description |
|---------|-------------|
| `detection_type` | Type de détection |
| `action_taken` | Action effectuée |
| `persona_code_created` | Code persona créé |
| `sessions_affected` | Nombre de sessions impactées |
| `details` | jsonb détails complets |

---

## 2. Edge Functions — Inventaire

### Vue d'ensemble

| Fonction | Déclencheur | APIs externes | JWT vérifié |
|----------|-------------|---------------|-------------|
| `diagnostic-webhook` | POST webhook (depuis site diagnostic) | — | Non |
| `diagnostic-performance` | POST (frontend) | — | Non |
| `persona-stats` | POST (frontend) | — | Non |
| `persona-priorities` | POST (frontend) | — | Non |
| `aski-chat` | POST (frontend) | Lovable AI (Gemini), Perplexity | Non |
| `generate-marketing-recommendations` | POST (frontend) | Anthropic (Claude) | Non |
| `generate-funnel-recommendations` | POST (frontend) | Lovable AI (Gemini Flash) | Non |
| `monthly-market-intelligence` | Cron (1er du mois, 03:00 UTC) | Perplexity, Lovable AI (Gemini) | Non |
| `detect-persona-clusters` | Cron (lundi, 06:00 UTC) | — | Non |
| `sync-klaviyo-persona` | Invoqué par diagnostic-webhook | Klaviyo API | Non |
| `backfill-klaviyo` | POST manuel | → sync-klaviyo-persona | Non |
| `shopify-order-webhook` | POST webhook Shopify | — | Non |
| `shopify-checkout-webhook` | POST webhook Shopify | — | Non |
| `sync-shopify-products` | POST manuel / cron | Shopify Storefront API | Non |
| `import-shopify-csv` | POST (upload fichier) | — | Non |
| `ga4-analytics` | POST (frontend) | Google Analytics Data API | Non |
| `get-usage-stats` | POST (portail Ask-It) | — | Non |

---

### `diagnostic-webhook`
**Rôle** : Reçoit les données du diagnostic depuis le site Ouate, les normalise, assigne un persona, et déclenche la sync Klaviyo.

**Flow** :
1. Valide le secret `x-webhook-secret` vs `DIAGNOSTIC_WEBHOOK_SECRET`
2. Détecte le format : `session_code` → nouveau format | `session_id` → legacy
3. **Format nouveau** : COALESCE (ne pas écraser avec null), upsert `diagnostic_sessions`, delete+insert `diagnostic_children`, calcule persona + tone si `status=termine`, invoque `sync-klaviyo-persona`
4. **Format legacy** : Upsert `diagnostic_responses` avec validation FK persona

---

### `diagnostic-performance`
**Rôle** : Calcule toutes les métriques d'analytics (funnel, timeseries revenus, distribution personas) pour le dashboard.

**Flow** :
1. Charge `diagnostic_sessions` (nouveau format) + `diagnostic_responses` (legacy) avec pagination
2. Charge `shopify_orders` pour funnel et timeseries revenus
3. Calcule funnel étape par étape (started → completed → optin → recommendation → cart → checkout → purchase)
4. Construit le timeseries revenu par jour (avec/sans diagnostic)
5. Retourne tout en une réponse JSON structurée

---

### `persona-stats`
**Rôle** : Statistiques détaillées par persona (profil, psychologie, comportement, business).

**Flow** :
1. Charge toutes les sessions terminées (pagination 1000/page)
2. Charge `shopify_orders` pour la période
3. Assigne les codes personas (utilise `persona_code` stocké, ou recalcule si P0/absent)
4. Pour chaque persona : profil démographique, distribution psychologique, métriques business, top produits, insights auto-générés
5. Calcule moyennes globales pour comparaison

---

### `persona-priorities`
**Rôle** : Identifie les 3 personas prioritaires (Meilleur ROI, Plus fort levier croissance, Meilleur LTV).

**Algorithme** :
- **Meilleur ROI** : `(convRate / 100) * aov` → valeur par session (hors clients existants)
- **Levier croissance** : `(globalConvPct - convRate) / 100 * volume * aov` → CA manquant si conversion = moyenne
- **Meilleur LTV** : `scoreAge × (optinEmailPct/100) × coeffMulti × (aov/50)` (scoreAge : 4-6 ans = 3, 7-9 = 2, 10-11 = 1)

---

### `sync-klaviyo-persona`
**Rôle** : Met à jour le profil Klaviyo avec le persona et toutes les données de session.

**Flow** :
1. Charge la session + enfants depuis BDD
2. Normalise l'email en lowercase
3. Charge le `full_label` depuis la table `personas`
4. Construit le payload Klaviyo (persona, scores, conversion, produits, données enfants dynamiques)
5. Appelle `POST /api/profile-import/` (Klaviyo revision 2024-02-15)
6. Si optin actif : appelle `POST /api/profile-subscription-bulk-create-jobs/` sur la liste `TExMiq`

---

### `backfill-klaviyo`
**Rôle** : Rejoue la sync Klaviyo pour toutes les sessions terminées avec email depuis une date donnée.

**Paramètre** : `since` (default: `2026-02-12`)
**Pattern** : Traitement par batch de 20 avec délai de 300ms entre batches (respect rate limits Klaviyo).

---

### `shopify-order-webhook`
**Rôle** : Reçoit les commandes Shopify, tente d'attribuer à une session diagnostic.

**Flow** :
1. Valide HMAC SHA-256 avec `SHOPIFY_WEBHOOK_SECRET`
2. Cherche propriété `_diag_session` dans les line items → match direct par `session_code`
3. Si pas de match direct et email présent → fallback email sur les 5 derniers jours
4. Upsert `shopify_orders` (toujours, même sans match)
5. Si match : met `conversion=true`, `validated_cart_amount`, `validated_products`

---

### `shopify-checkout-webhook`
**Rôle** : Marque `checkout_started=true` quand un checkout est initié.

**Flow** :
1. Valide HMAC avec `SHOPIFY_CHECKOUT_WEBHOOK_SECRET`
2. Cherche `_diag_session` dans les line items
3. Met à jour `checkout_started=true` et `checkout_at`

---

### `sync-shopify-products`
**Rôle** : Synchronise le catalogue Shopify dans `ouate_products`.

**Flow** :
1. Interroge l'API Storefront GraphQL avec pagination (250 produits par page)
2. Pour chaque produit : upsert dans `ouate_products` (conflit sur `shopify_product_id`)
3. Tronque la description à 500 chars

**Credentials** : `SHOPIFY_STOREFRONT_ACCESS_TOKEN`

---

### `import-shopify-csv`
**Rôle** : Importe des commandes historiques depuis un export CSV Shopify.

**Flow** :
1. Parse CSV (multipart form-data, JSON+url, ou raw body)
2. Déduplique par numéro de commande
3. Filtre : status=paid ET refunded=0
4. Tente de matcher par email avec `diagnostic_sessions`
5. Détecte attribution diagnostic si code promo `DIAG-15` ou email match
6. Upsert `shopify_orders`

---

### `ga4-analytics`
**Rôle** : Récupère les sessions GA4 pour le site et la page diagnostic.

**Flow** :
1. Génère un JWT signé RS256 pour le service account Google
2. Échange le JWT contre un OAuth token Google
3. Appelle GA4 Data API pour 2 métriques : sessions totales + sessions landing page `/pages/diagnostic-de-peau`

**Credentials** : `GA4_PROPERTY_ID`, `GA4_SERVICE_ACCOUNT_EMAIL`, `GA4_SERVICE_ACCOUNT_PRIVATE_KEY`

---

### `get-usage-stats`
**Rôle** : Expose les métriques de consommation au portail Ask-It.

**Sécurité** : Header `x-api-key` vérifié contre `USAGE_STATS_API_KEY`. CORS restreint à `app.ask-it.ai`.

**Réponse** :
```json
{
  "success": true,
  "period": "2026-03",
  "questions_asked": 45,
  "tokens_used": 580000,
  "diagnostic_sessions": 119,
  "api_usage": [
    {
      "edge_function": "aski-chat",
      "api_provider": "lovable-ai",
      "model": "google/gemini-2.5-pro",
      "input_tokens": 100000,
      "output_tokens": 480000,
      "total_tokens": 580000,
      "calls": 45
    }
  ]
}
```

---

## 3. diagnostic-webhook — Logique détaillée

### Authentification
```
Header: x-webhook-secret: <valeur>
Secret attendu: DIAGNOSTIC_WEBHOOK_SECRET (Supabase secret)
```

### Détection du format
```
payload.session_code → handleNewFormat()
payload.session_id   → handleLegacyFormat()
```

### handleNewFormat() — Étapes

**1. COALESCE intelligent**
Pour chaque champ : utilise la valeur entrante si non-null/undefined, sinon conserve la valeur existante en BDD. Permet des mises à jour partielles sans écraser les données existantes.

**2. Normalisation email**
```javascript
email: payload.email.toLowerCase().trim()
```

**3. Upsert diagnostic_sessions**
Conflit sur `session_code`. `ignoreDuplicates: false` = mise à jour si existant.

**4. Gestion des enfants**
Si `payload.children` présent : delete all + insert (idempotent).

**5. Assignation persona (si status=termine)**
Appelle `computePersonaWithScore()` :

### Algorithme computePersonaWithScore()

```
1. Charge tous les personas actifs (is_pool=false) depuis la table personas

2. Prépare sessionValues :
   - Champs session : relationship, is_existing_client, number_of_children,
     priority_1 (1er élément de priorities_ordered), routine_size_preference,
     trust_trigger_1 (1er élément), content_format_preference
   - Champs enfant (child1) : child.skin_concern, child.age_range,
     child.has_routine, child.skin_reactivity, child.has_ouate_products,
     child.exclude_fragrance, child.routine_satisfaction
   - Critère spécial : child.skin_concern_different = (child1.skin_concern != child2.skin_concern)

3. Pour chaque persona, pour chaque niveau [identity, need, behavior] :
   a. Calcule levelScore = Σ(criterionWeight) pour chaque critère matché
   b. contribution = (levelScore / levelTotalWeight) × levelWeight
   c. totalScore += contribution
   d. Si criterion.required=true et non matché → blockedByRequired=true → score=0

4. Scores finaux :
   scores[persona.code] = blockedByRequired ? 0 : Math.round(totalScore * 100)

5. Sélection du meilleur :
   - Score maximum
   - Si égalité : departage par needScore (niveau "need")
   - Si bestScore < 60% → P0 (non attribué)
```

**Poids par niveau** :
- Identity : 25% (`weight: 0.25`)
- Need : 50% (`weight: 0.50`)
- Behavior : 25% (`weight: 0.25`)

**Seuil minimum** : 60% pour être assigné (sinon P0)

### computeAdaptedTone()

```
priority_1 → mapping :
  ludique   → playful
  autonomie → empowering
  efficacite → factual
  clean     → transparent

trust_trigger_1 :
  scientific_validation | proof_results → expert

Default : factual
```

### Sync Klaviyo (fire-and-forget)
```javascript
supabase.functions.invoke("sync-klaviyo-persona", {
  body: { session_id: session.id }
}).catch(err => console.error(...));
```

---

## 4. Système de Personas

### Personas manuels (P1–P9)

| Code | Nom | Profil |
|------|-----|--------|
| P1 | Novice Imperfections Enfant | Nouveau client, enfant 4-9 ans, imperfections |
| P2 | Novice Imperfections Pré-ado | Nouveau client, 10-11 ans, imperfections |
| P3 | Novice Atopique | Nouveau client, peau atopique |
| P4 | Novice Sensible | Nouveau client, peau sensible |
| P5 | Multi-enfants Besoins Mixtes | Plusieurs enfants, types de peau différents |
| P6 | Novice Découverte | Nouveau client, peau sèche ou normale |
| P7 | L'Insatisfaite | A déjà une routine mais insatisfaite |
| P8 | Fidèle Imperfections | Client existant, enfant avec imperfections |
| P9 | Fidèle Exploratrice | Client existant, explore d'autres besoins |
| P0 | Non attribué | Score < 60% ou aucun persona dominant |

### detect-persona-clusters — 3 mécanismes

**Paramètres configurables** :
```
min_cluster_size   : 15  (minimum sessions pour créer un nouveau persona)
min_split_size     : 20  (minimum sessions pour scinder un persona)
max_persona_size   : 80  (seuil de scission)
weak_score_threshold : 75 (seuil de recombinaison)
dry_run            : false (simulation sans écriture)
```

#### Mécanisme B1 : Détection nouveaux clusters (depuis P0)
1. Prend toutes les sessions P0 (non attribuées)
2. Pour chaque critère clé, calcule la fréquence d'apparition
3. Si une valeur couvre ≥ 50% des sessions → critère dominant
4. Si ≥ 3 critères dominants sur ≥ 2 niveaux → cluster candidat
5. Filtre : sessions matchant ≥ 3 critères dominants
6. Si ≥ `min_cluster_size` → crée le nouveau persona

#### Mécanisme B2 : Scission (persona trop large)
1. Pour chaque persona avec `session_count > max_persona_size`
2. Cherche des sous-groupes comportementaux (priority_1, routine_size, trust_trigger)
3. Si un sous-groupe a ≥ `min_split_size` sessions avec un cluster propre → crée un nouveau persona

#### Mécanisme B3 : Recombinaison (sessions à faible score)
1. Pour chaque session avec `matching_score < weak_score_threshold`
2. Recalcule le score avec TOUS les personas actifs
3. Si un meilleur match existe → réassigne la session

### Création automatique d'un persona

```
1. getNextPersonaCode() → P10, P11, P12...
2. generatePersonaIdentity(cluster) :
   - Choisit un prénom français libre
   - Génère nom, full_label et description narrative
3. buildCriteriaFromCluster() :
   - Transforme les critères dominants en structure JSON scores
   - Normalise les poids (1 / nb_critères)
4. Crée dans table personas (is_auto_created=true)
5. Met à jour persona_code des sessions concernées
6. Sync Klaviyo pour chaque session
7. Log dans persona_detection_log
```

### Désactivation automatique
Personas auto-créés avec `session_count < 10` et `auto_created_at` > 30 jours → désactivés.

---

## 5. Recommandations Marketing

### Architecture en deux phases

```
Phase A (mensuelle, cron 1er du mois 03:00 UTC)
  monthly-market-intelligence
  ├── STEP 0: Collecte données personas (30 derniers jours)
  ├── STEP 1: 3 appels Perplexity parallèles (sonar-pro)
  │     ├── Requête Ads (tendances Meta/TikTok, formats, CPM, benchmarks)
  │     ├── Requête Email (benchmarks Klaviyo, flows, KPIs)
  │     └── Requête Offres (bundles, pricing, calendrier commercial)
  ├── STEP 2: 3 appels Gemini 3.1 Pro séquentiels
  │     ├── Analyse Ads (croise Perplexity + 213 sources + personas)
  │     ├── Analyse Email
  │     └── Analyse Offres
  └── Sauvegarde dans market_intelligence (status: completed)

Phase B (à la demande, déclenché par frontend)
  generate-marketing-recommendations
  ├── Charge market_intelligence du mois en cours
  ├── 1 appel Claude Sonnet 4.6 par catégorie
  └── Sauvegarde dans marketing_recommendations
```

### Requêtes Perplexity exactes (monthly-market-intelligence)

**Ads** :
> Recherche approfondie des tendances actuelles en publicité digitale (Meta Ads, TikTok Ads, Instagram Ads, Pinterest Ads) pour le secteur cosmétique naturelle pour bébés et enfants, marché français et international. Inclure : formats qui performent (reel, UGC, statique, carrousel, before/after), hooks, ciblage, CPM moyens, marques DTC performantes, erreurs à éviter. Focus 30 derniers jours.

**Email** :
> Recherche approfondie des meilleures pratiques actuelles en email marketing e-commerce pour le secteur cosmétique naturelle pour bébés et enfants. Inclure : taux d'ouverture/clic benchmarks 2026, flows à fort ROI, innovations segmentation, best practices Klaviyo DTC cosmétique, fréquence optimale.

**Offres** :
> Recherche approfondie des stratégies d'offres, bundles et pricing pour e-commerce cosmétique bébés et enfants. Inclure : techniques bundling, prix psychologiques, mécaniques de lancement, upsell post-achat, calendrier commercial, marques DTC premium qui gèrent bien leurs offres.

### Analyse Gemini — Structure de sortie

```json
{
  "analysis": {
    "synthese_marche": "string",
    "tendances_cles": ["string"],
    "opportunites_immediates": ["string"],
    "benchmark_kpis": {},
    "erreurs_a_eviter": ["string"]
  },
  "personas_insights": [
    {
      "persona_code": "P1",
      "persona_name": "string",
      "angle_specifique": "string",
      "message_cle": "string",
      "format_recommande": "string",
      "timing_optimal": "string"
    }
  ],
  "sources_recommandees": ["string"]
}
```

### System prompt Claude (generate-marketing-recommendations)

```
Tu es le directeur marketing IA d'Ask-It. Tu génères des recommandations marketing
ultra-détaillées et immédiatement actionnables pour des marques e-commerce DTC.

RÈGLES ABSOLUES :
1. Ne recommande JAMAIS un produit hors du catalogue fourni
2. Tout le contenu visible EN FRANÇAIS, prêt à l'emploi
3. Prompts IA de génération visuelle EN ANGLAIS
4. Utilise les VRAIS prix des produits du catalogue
5. Cible un persona SPÉCIFIQUE pour chaque recommandation
6. Pas d'URLs inventées — null si non vérifié
7. Inspirations = vraies marques connues
8. Ton : bienveillant, expert, naturel, rassurant pour les parents
9. INTERDIT : emojis, jargon non expliqué
10. Chaque recommandation UNIQUE — formats, personas et angles variés

Retourne UNIQUEMENT un JSON valide.
```

### Mode Global — Orchestration frontend

```
frontend orchestre 4 appels séquentiels :
1. ads   → { ads_v2: [...] }           → sauvegarde dans record.ads_v2
2. offers → { offers_v2: [...] }       → sauvegarde dans record.offers_v2
3. emails → { emails_v2: [...] }       → sauvegarde dans record.emails_v2
4. finalize → { campaigns_overview, checklist, persona_focus }

Plafond : 16 000 tokens max par étape
Timeout interne : 130s (limite Supabase : 150s)
```

### Coût en crédits

| Type | Crédits consommés |
|------|-------------------|
| Global (4 appels) | 9 |
| Catégorie unique | 3 |
| Unitaire (single_ad/offer/email) | 1 |

---

## 6. Aski — Architecture du chatbot

### Modèles utilisés

| Usage | Provider | Modèle |
|-------|----------|--------|
| Réponse principale | Lovable AI | `google/gemini-2.5-pro` |
| Titre de conversation | Lovable AI | `google/gemini-2.5-flash-lite` |
| Recherche web | Perplexity | `sonar-pro` |

### Quota mensuel
200 questions par organisation (comptées sur `aski_messages.role='user'` depuis le 1er du mois).

### Détection du besoin Perplexity

Mots-clés déclencheurs :
```
tendance, benchmark, marché, concurren, stratégie, best practice, meilleure pratique,
industrie, secteur, comment font, qu'est-ce qui marche, nouvell, récent, innovation,
étude, statistique, taux moyen, moyenne du marché, meta ads, tiktok, facebook,
instagram, klaviyo, email marketing, newsletter, acquisition, rétention, bundle,
upsell, cross-sell, fidélisation, ltv, skincare enfant, cosmétique enfant, dtc,
e-commerce, 2024, 2025, 2026
```

### Chargement parallèle des données

```javascript
await Promise.all([
  personas (is_active=true, is_pool=false),
  diagnostic_sessions (status=termine, ~30 champs),
  diagnostic_children (skin_concern, age_range, has_routine...),
  ouate_products (status=active, tous les champs produits),
  marketing_recommendations (dernière active, checklist+recos),
  callPerplexity(userMessage) // si mots-clés détectés
])
```

### Construction des insights personas

Pour chaque persona, calcule en temps réel depuis les sessions :
- Nombre de sessions, score moyen, taux de conversion, AOV, optin email
- Top peaux, tranches d'âge, priorités, tons adaptés, trust triggers, formats, taille routine

### System prompt Aski (structure)

```
Tu es Aski, l'assistant IA expert marketing d'Ouate Paris. 15 ans d'expérience DTC e-commerce cosmétique enfants.

=== GAMME DE PRODUITS (sync Shopify temps réel) ===
• [produit] (type) — prix | Variantes | Tags | Description

RÈGLE : Ne recommander QUE les produits listés. Si absent → n'existe pas.

=== PERSONAS + INSIGHTS TEMPS RÉEL (N sessions terminées) ===
[Pour chaque persona : label, description, sessions, score, conversion, AOV, email optin,
 distribution peaux, âges, priorités, tons, trust triggers, formats, routines]

=== MÉTRIQUES GLOBALES ===
Sessions terminées | Taux conversion global | AOV moyen
Mois actuel | Mois précédent | Évolution

=== BASE DE CONNAISSANCES — 226 SOURCES ===
CAT 1 — ADS META/TIKTOK (82 sources) : Motion App, Flighted, Pilothouse...
CAT 2 — EMAILING/KLAVIYO (66 sources) : Klaviyo Blog, Chase Dimond...
CAT 3 — OFFRES/BUNDLES (66 sources) : Shopify Blog, Rebuy, Bold Commerce...

[Si Perplexity] === RECHERCHE TEMPS RÉEL ===
[Résultat sonar-pro]

[Si recos récentes] === DERNIÈRES RECOMMANDATIONS MARKETING ===
[Tâches en cours]

=== RÈGLES ===
1. Français, concis, actionnable
2. Utiliser les prénoms des personas, jamais les codes
3. Citer uniquement les données fournies
4. Ne recommander que les produits du catalogue
```

### Génération du titre

Après la première réponse, génère un titre de conversation avec Gemini Flash Lite :
```
Génère un titre court (5 mots max) en français pour cette conversation.
Premier message utilisateur : "[message]"
Réponds UNIQUEMENT avec le titre, sans guillemets ni ponctuation finale.
```

### Comptage des tokens

- **Legacy** : `aski_messages.tokens_used` (total par message assistant)
- **Nouveau** : `api_usage_logs` (input + output séparés, par appel)

---

## 7. Intégrations externes

### Shopify Storefront API (sync produits)

| Paramètre | Valeur |
|-----------|--------|
| Secret | `SHOPIFY_STOREFRONT_ACCESS_TOKEN` |
| Endpoint | `https://www-ouate-paris-com.myshopify.com/api/2024-01/graphql.json` |
| Méthode | POST GraphQL |
| Format | `X-Shopify-Storefront-Access-Token: <token>` |
| Données | products (id, title, handle, description, variants, images, priceRange, tags) |
| Pagination | 250 produits/page, curseur |

### Shopify Webhooks

| Webhook | Secret | Vérification |
|---------|--------|--------------|
| `orders/paid` | `SHOPIFY_WEBHOOK_SECRET` | HMAC SHA-256 header `x-shopify-hmac-sha256` |
| `checkouts/create` | `SHOPIFY_CHECKOUT_WEBHOOK_SECRET` | HMAC SHA-256 |

**Propriété clé** : `_diag_session` dans les line_items properties → `session_code`

### Klaviyo

| Paramètre | Valeur |
|-----------|--------|
| Secret | `KLAVIYO_API_KEY` |
| Endpoints | `POST /api/profile-import/` et `POST /api/profile-subscription-bulk-create-jobs/` |
| Revision | `2024-02-15` |
| Authentification | `Klaviyo-API-Key <clé>` |
| Liste optin | ID `TExMiq` |

**Propriétés Klaviyo poussées** :
- `persona`, `persona_code`, `adapted_tone`
- `matching_score`, `engagement_score`
- `conversion_status`, `is_existing_client`, `exit_type`
- `recommended_products`, `recommended_cart_amount`, `upsell_potential`
- `validated_products`, `validated_cart_amount`, `selected_cart_amount`
- `existing_ouate_products`, `diagnostic_duration_seconds`
- `optin_email`, `optin_sms`
- Données dynamiques par enfant : `child_1_dynamic_q1`, `child_1_dynamic_a1`, etc.

### Perplexity

| Paramètre | Valeur |
|-----------|--------|
| Secret | `PERPLEXITY_API_KEY` (via connecteur) |
| Endpoint | `https://api.perplexity.ai/chat/completions` |
| Modèle | `sonar-pro` |
| Timeout | 30s (aski-chat) / 60s (monthly-market-intelligence) |
| Filtre recency | `month` (monthly-market-intelligence) |

### Lovable AI Gateway (Gemini)

| Paramètre | Valeur |
|-----------|--------|
| Secret | `LOVABLE_API_KEY` |
| Endpoint | `https://ai.gateway.lovable.dev/v1/chat/completions` |
| Format | OpenAI-compatible |

| Fonction | Modèle |
|----------|--------|
| `aski-chat` (réponse principale) | `google/gemini-2.5-pro` |
| `aski-chat` (titre) | `google/gemini-2.5-flash-lite` |
| `generate-funnel-recommendations` | `google/gemini-2.5-flash` |
| `monthly-market-intelligence` | `google/gemini-3.1-pro-preview` |

### Anthropic (Claude)

| Paramètre | Valeur |
|-----------|--------|
| Secret | `ANTHROPIC_API_KEY` |
| Endpoint | `https://api.anthropic.com/v1/messages` |
| Modèle | `claude-sonnet-4-6` |
| Authentification | `x-api-key: <clé>` + `anthropic-version: 2023-06-01` |
| Timeout | 120s |
| Max tokens | 16 000 |

### Google Analytics 4

| Paramètre | Valeur |
|-----------|--------|
| Secrets | `GA4_PROPERTY_ID`, `GA4_SERVICE_ACCOUNT_EMAIL`, `GA4_SERVICE_ACCOUNT_PRIVATE_KEY` |
| Endpoint OAuth | `https://oauth2.googleapis.com/token` |
| Endpoint Data API | `https://analyticsdata.googleapis.com/v1beta/properties/{id}:runReport` |
| Scope | `https://www.googleapis.com/auth/analytics.readonly` |
| Auth | JWT RS256 signé → Bearer OAuth2 token |

---

## 8. Crons actifs

| Nom | Fréquence | Fonction déclenchée | Description |
|-----|-----------|---------------------|-------------|
| `monthly-market-intelligence` | 1er du mois, 03:00 UTC | `monthly-market-intelligence` | Recherches Perplexity + analyses Gemini pour alimenter la base de connaissances marketing du mois |
| `detect-persona-clusters` | Lundi, 06:00 UTC | `detect-persona-clusters` | Analyse les clusters P0, détecte les nouveaux personas, scinde les personas trop larges, désactive les auto-créés sans sessions |

> **Note** : Les crons sont définis dans la configuration Supabase et ne sont pas visibles dans le code. Les Edge Functions acceptent aussi des appels manuels POST pour tests.

---

## 9. Frontend — Structure des onglets

### Accès et authentification (AccessGate)

Le dashboard est protégé par `AccessGate.tsx` :
1. Vérifie `sessionStorage` (session 8h) → accès immédiat si valide
2. Vérifie `?access_token=` dans l'URL → appelle `verify-dashboard-token` sur le portail Ask-It (`srzbcuhwrpkfhubbbeuw.supabase.co`)
3. Si token valide → stocke session, nettoie l'URL
4. Si invalide → affiche page "Accès restreint" avec lien vers app.ask-it.ai

### Onglets du Dashboard

#### 1. Vue d'ensemble (`overview`)
**Composants** : `MetricCard`, `OverviewDiagnosticStats`, `TopPersonasPotential`, `DiagnosticPreview`

**Données** :
- `useBusinessMetrics(dateRange)` → sessions, conversion, AOV, revenus (via `diagnostic-performance`)
- `useDiagnosticStats(dateRange)` → taux complétion, optins (via `diagnostic-performance`)
- Preview des 3 personas prioritaires (via `persona-priorities`)
- Aperçu du dernier diagnostic

---

#### 2. Personas (`personas`)
**Composants** : `PersonasTab`, `PersonaCard`

**Données** :
- `usePersonaStats(dateRange)` → appelle `persona-stats` (statistiques détaillées par persona)
- `usePersonaPriorities()` → appelle `persona-priorities` (3 personas prioritaires)
- `usePersonaProfiles()` → charge la table `personas` directement

**Affichage par persona** :
- Profil démographique (tranches d'âge, réactivité, multi-enfants)
- Psychologie (priorités, trust triggers, préférences routine)
- Comportement (durée, format, engagement, optins)
- Top 5 produits recommandés
- Métriques business (conversions, AOV, revenus)
- Insights auto-générés (comparaison globale)

---

#### 3. Diagnostics / Analytics (`analytics`)
**Composants** : `DiagnosticsAnalytics`, `ResponsesSection`, `SessionsTable`

**Données** :
- `useDiagnosticSessions(dateRange)` → appelle `diagnostic-performance` avec `includeDetails:true`
- Pagination locale des sessions

**Affichage** :
- Tableau des sessions récentes (code, date, persona, score, conversion, statut)
- Distribution des personas
- Métriques optin
- Filtres par date

---

#### 4. Business (`business`)
**Composants** : `BusinessMetrics`

**Données** :
- `useBusinessMetrics(dateRange)` → via `diagnostic-performance`
- `useRevenueTimeseries(dateRange)` → extrait `revenueTimeseries` de `diagnostic-performance`
- `useInsightsMetrics()` → métriques d'insights

**Affichage** :
- Revenus avec/sans diagnostic (timeseries)
- AOV, taux de conversion, panier moyen
- Comparaison mois en cours vs précédent

---

#### 5. Funnel (`funnel`)
**Composants** : `FunnelVisualization`, `DetailedFunnelVisualization`, `AlertsSection`

**Données** :
- `diagnostic-performance` → champ `funnel` et `detailedFunnel`
- `marketing_recommendations` → alertes et checklist

**Affichage** :
- Entonnoir macro (Started → Completed → Optin → Recommendation → Cart → Checkout → Purchase)
- Entonnoir détaillé par étape du questionnaire (Prénom → Type peau → Routine → Questions IA → Opt-in → Recommandation)
- Alertes marketing issues de `generate-funnel-recommendations`

---

#### 6. Marketing IA (`marketing`)
**Composants** : `MarketingRecommendations`, `MarketingOverviewTab`, `MarketingAdsTab`, `MarketingEmailsTab`, `MarketingOffersTab`

**Données** :
- `useMarketingRecommendations()` → charge `marketing_recommendations` et `recommendation_usage` directement depuis Supabase

**Affichage** :
- Onglet Aperçu : campagnes transversales, checklist hebdomadaire, focus persona
- Onglet Ads : recommandations ads V2 avec format, persona, hook, script, ciblage, A/B test
- Onglet Emails : recommandations email avec objet, structure, segment Klaviyo, flow position
- Onglet Offres : recommandations offres/bundles avec composition, pricing, plan de lancement
- Boutons de génération par catégorie (`GenerateCategoryButton`)
- Barre de quota (`QuotaBar`)
- Fallback Legacy si aucune donnée V2

---

#### 7. Aski — Chatbot IA (`aski`)
**Composants** : `AskiChat`, `AskiAvatar`

**Données** :
- Appelle `aski-chat` (Edge Function) pour chaque message
- Charge l'historique depuis `aski_chats` + `aski_messages` directement

**Affichage** :
- Interface de chat avec historique des conversations
- Compteur de questions (X/200 ce mois)
- Liste des conversations archivables
- Avatar animé Aski
- Message de bienvenue (style `text-lg`)

---

### Fonctionnalités transversales

- **DateRangePicker** : Filtre global appliqué à tous les onglets
- **Export PDF** : `html2canvas` + `jsPDF`, export par section sélectionnée
- **Polling automatique** : `useDiagnosticSessions` se rafraîchit toutes les 2 minutes

---

## 10. Sécurité & Accès

### Protection du dashboard
- Accès via token temporaire généré par le portail Ask-It
- Session stockée en `sessionStorage` (8h, non persistée entre onglets)
- Déconnexion via `clearAccessSession()` + redirection

### Protection des Edge Functions
- `diagnostic-webhook` : `x-webhook-secret` header
- `get-usage-stats` : `x-api-key` header + CORS restreint à `app.ask-it.ai`
- `shopify-order-webhook` : HMAC SHA-256 Shopify
- `shopify-checkout-webhook` : HMAC SHA-256 Shopify
- Autres fonctions frontend : CORS ouvert (`*`), sécurité via service_role key côté Supabase

### RLS (Row Level Security)
- Tables sensibles (sessions, orders, logs) : `service_role` uniquement
- Tables de référence (personas, produits) : lecture publique autorisée
- `aski_chats/messages` : lecture/insertion par `anon` et `authenticated`
- `diagnostic_responses` : lecture/update par `authenticated`, insertion par `anon`

---

## 11. Manifeste des fichiers

### Pages

| Fichier | Rôle |
|---------|------|
| `src/pages/Dashboard.tsx` | Page principale avec tous les onglets, header, export PDF, date picker |
| `src/pages/Index.tsx` | Page d'accueil (redirige vers Dashboard) |
| `src/pages/NotFound.tsx` | Page 404 |

### Composants — Dashboard

| Fichier | Rôle |
|---------|------|
| `src/components/AccessGate.tsx` | Protection d'accès via token Ask-It |
| `src/components/NavLink.tsx` | Lien de navigation interne |
| `src/components/AskiAvatar/AskiAvatar.tsx` | Avatar animé du chatbot Aski |
| `src/components/AskiAvatar/AskiAvatar.css` | Styles de l'avatar |
| `src/components/dashboard/AskiChat.tsx` | Interface complète du chatbot |
| `src/components/dashboard/PersonasTab.tsx` | Onglet personas avec cartes détaillées |
| `src/components/dashboard/PersonaCard.tsx` | Carte individuelle d'un persona |
| `src/components/dashboard/BusinessMetrics.tsx` | Métriques business et timeseries revenus |
| `src/components/dashboard/DiagnosticsAnalytics.tsx` | Analytics et tableau des sessions |
| `src/components/dashboard/FunnelVisualization.tsx` | Visualisation funnel macro |
| `src/components/dashboard/DetailedFunnelVisualization.tsx` | Funnel détaillé par étape questionnaire |
| `src/components/dashboard/MarketingRecommendations.tsx` | Hub marketing IA (dispatch vers sous-onglets) |
| `src/components/dashboard/MetricCard.tsx` | Carte métrique générique |
| `src/components/dashboard/DateRangePicker.tsx` | Sélecteur de plage de dates |
| `src/components/dashboard/AlertsSection.tsx` | Alertes et recommandations funnel |
| `src/components/dashboard/DiagnosticPreview.tsx` | Aperçu du dernier diagnostic |
| `src/components/dashboard/OverviewDiagnosticStats.tsx` | Stats globales vue d'ensemble |
| `src/components/dashboard/PersonasOverviewPreview.tsx` | Preview personas (remplacé par TopPersonasPotential) |
| `src/components/dashboard/TopPersonasPotential.tsx` | 3 personas prioritaires (ROI, Croissance, LTV) |
| `src/components/dashboard/ResponsesSection.tsx` | Section réponses et sessions récentes |
| `src/components/dashboard/SessionsTable.tsx` | Tableau des sessions diagnostics |

### Composants — Marketing

| Fichier | Rôle |
|---------|------|
| `src/components/dashboard/marketing/MarketingOverviewTab.tsx` | Onglet aperçu marketing (campagnes, checklist) |
| `src/components/dashboard/marketing/MarketingAdsTab.tsx` | Onglet publicités |
| `src/components/dashboard/marketing/MarketingEmailsTab.tsx` | Onglet emails |
| `src/components/dashboard/marketing/MarketingOffersTab.tsx` | Onglet offres et bundles |
| `src/components/dashboard/marketing/AdsRecommendationCard.tsx` | Carte recommandation ads V2 |
| `src/components/dashboard/marketing/EmailsRecommendationCard.tsx` | Carte recommandation email V2 |
| `src/components/dashboard/marketing/OffersRecommendationCard.tsx` | Carte recommandation offre V2 |
| `src/components/dashboard/marketing/RecommendationCard.tsx` | Carte générique (legacy) |
| `src/components/dashboard/marketing/CampaignCard.tsx` | Carte campagne transversale |
| `src/components/dashboard/marketing/GenerateCategoryButton.tsx` | Bouton de génération par catégorie |
| `src/components/dashboard/marketing/GenerationProgressLoader.tsx` | Loader de génération |
| `src/components/dashboard/marketing/QuotaBar.tsx` | Barre de quota mensuel |
| `src/components/dashboard/marketing/MarketingRecommendations.tsx` | Composant de recommandations marketing |
| `src/components/dashboard/marketing/legacy/LegacyRecommendations.tsx` | Affichage legacy si pas de données V2 |
| `src/components/dashboard/marketing/shared/CopyButton.tsx` | Bouton copier dans le presse-papier |
| `src/components/dashboard/marketing/shared/FormatBadge.tsx` | Badge de format (reel, email, bundle…) |
| `src/components/dashboard/marketing/shared/PersonaBadge.tsx` | Badge persona cible |
| `src/components/dashboard/marketing/shared/PriorityIndicator.tsx` | Indicateur de priorité |

### Hooks

| Fichier | Rôle |
|---------|------|
| `src/hooks/useBusinessMetrics.ts` | Métriques business via diagnostic-performance |
| `src/hooks/useDiagnosticStats.ts` | Stats diagnostics globales |
| `src/hooks/useDiagnosticSessions.ts` | Liste détaillée des sessions (polling 2min) |
| `src/hooks/usePersonaStats.ts` | Stats détaillées par persona via persona-stats |
| `src/hooks/usePersonaPriorities.ts` | 3 personas prioritaires via persona-priorities |
| `src/hooks/usePersonaProfiles.ts` | Profils personas depuis table personas |
| `src/hooks/useMarketingRecommendations.ts` | Recommandations marketing depuis BDD |
| `src/hooks/useInsightsMetrics.ts` | Métriques d'insights complémentaires |
| `src/hooks/useRevenueTimeseries.ts` | Timeseries revenus |
| `src/hooks/use-mobile.tsx` | Détection mobile |
| `src/hooks/use-toast.ts` | Toast notifications |

### Edge Functions

| Fichier | Rôle |
|---------|------|
| `supabase/functions/diagnostic-webhook/index.ts` | Webhook principal du diagnostic |
| `supabase/functions/diagnostic-performance/index.ts` | Analytics et métriques performance |
| `supabase/functions/persona-stats/index.ts` | Statistiques détaillées par persona |
| `supabase/functions/persona-priorities/index.ts` | Top 3 personas prioritaires |
| `supabase/functions/aski-chat/index.ts` | Chatbot IA Aski (Gemini + Perplexity) |
| `supabase/functions/generate-marketing-recommendations/index.ts` | Génération recommandations Claude |
| `supabase/functions/generate-funnel-recommendations/index.ts` | Recommandations optimisation funnel |
| `supabase/functions/monthly-market-intelligence/index.ts` | Intelligence marché mensuelle |
| `supabase/functions/detect-persona-clusters/index.ts` | Détection automatique de personas |
| `supabase/functions/sync-klaviyo-persona/index.ts` | Synchronisation Klaviyo |
| `supabase/functions/backfill-klaviyo/index.ts` | Rattrapage historique Klaviyo |
| `supabase/functions/shopify-order-webhook/index.ts` | Webhook commandes Shopify |
| `supabase/functions/shopify-checkout-webhook/index.ts` | Webhook checkout Shopify |
| `supabase/functions/sync-shopify-products/index.ts` | Synchronisation catalogue produits |
| `supabase/functions/import-shopify-csv/index.ts` | Import CSV commandes historiques |
| `supabase/functions/ga4-analytics/index.ts` | Données Google Analytics 4 |
| `supabase/functions/get-usage-stats/index.ts` | API de consommation pour portail Ask-It |

### Configuration

| Fichier | Rôle |
|---------|------|
| `supabase/config.toml` | Configuration Supabase (JWT désactivé pour toutes les fonctions) |
| `supabase/migrations/` | Historique des migrations SQL |
| `src/integrations/supabase/client.ts` | Client Supabase (auto-généré, ne pas modifier) |
| `src/integrations/supabase/types.ts` | Types TypeScript BDD (auto-générés, ne pas modifier) |
| `tailwind.config.ts` | Configuration Tailwind et design tokens |
| `src/index.css` | Variables CSS globales et tokens sémantiques |
| `src/constants/personas.ts` | Constantes des personas (codes, labels) |
| `src/types/diagnostic.ts` | Types TypeScript pour les données diagnostics |
| `vite.config.ts` | Configuration Vite |
| `tsconfig.json` | Configuration TypeScript |
| `package.json` | Dépendances npm |

### Assets

| Fichier | Rôle |
|---------|------|
| `src/assets/ask-it-logo.png` | Logo Ask-It |
| `src/assets/persona-*.png` | Avatars des personas (P1–P9, Sophie, Emma, Léa) |
| `public/lovable-uploads/30b93e71-*.png` | Logo Ask-It version header |
| `public/favicon.ico` | Favicon |
| `public/robots.txt` | Robots.txt |

---

*Documentation générée le 2026-03-16. À mettre à jour lors de chaque évolution architecturale majeure.*
