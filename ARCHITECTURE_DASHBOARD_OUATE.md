# ARCHITECTURE_DASHBOARD_OUATE.md

> **Audit littéral du code — généré le 2026-04-13**
> Projet Lovable : `d9cd4d1e-fe4d-40df-b94b-d9bb3139b78c`
> Supabase project ref : `btkjdqelvvqmtguhhkdv`
> Organisation ID : `12c2a92a-8ede-425c-b660-61962dc1d68c`

---

## Table des matières

1. [Schéma BDD complet](#1-schéma-bdd-complet)
2. [Inventaire des Edge Functions](#2-inventaire-des-edge-functions)
3. [Intégrations externes](#3-intégrations-externes)
4. [Crons actifs](#4-crons-actifs)
5. [Frontend — Structure du Dashboard](#5-frontend--structure-du-dashboard)
6. [AccessGate et flux d'authentification](#6-accessgate-et-flux-dauthentification)
7. [Manifeste des fichiers src/](#7-manifeste-des-fichiers-src)
8. [Secrets configurés](#8-secrets-configurés)

---

## 1. Schéma BDD complet

### 1.1 Table `diagnostic_sessions`

| Colonne | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | No | `gen_random_uuid()` |
| session_code | varchar | No | (trigger `generate_session_code`) |
| created_at | timestamptz | Yes | `now()` |
| status | varchar | No | `'en_cours'` |
| source | varchar | Yes | — |
| utm_campaign | varchar | Yes | — |
| device | varchar | Yes | — |
| user_name | varchar | Yes | — |
| relationship | varchar | Yes | — |
| email | varchar | Yes | — |
| phone | varchar | Yes | — |
| optin_email | boolean | Yes | `false` |
| optin_sms | boolean | Yes | `false` |
| number_of_children | integer | Yes | — |
| locale | varchar | Yes | — |
| result_url | varchar | Yes | — |
| adapted_tone | varchar | Yes | — |
| conversion | boolean | Yes | `false` |
| exit_type | varchar | Yes | — |
| existing_ouate_products | text | Yes | — |
| is_existing_client | boolean | Yes | `false` |
| recommended_cart_amount | numeric | Yes | — |
| recommended_products | text | Yes | — |
| validated_cart_amount | numeric | Yes | — |
| validated_products | text | Yes | — |
| selected_cart_amount | numeric | Yes | — |
| cart_selected_at | timestamptz | Yes | — |
| checkout_started | boolean | No | `false` |
| checkout_at | timestamptz | Yes | — |
| upsell_potential | varchar | Yes | — |
| duration_seconds | integer | Yes | — |
| abandoned_at_step | varchar | Yes | — |
| question_path | text | Yes | — |
| back_navigation_count | integer | Yes | `0` |
| has_optional_details | boolean | Yes | `false` |
| behavior_tags | text | Yes | — |
| engagement_score | integer | Yes | — |
| routine_size_preference | varchar | Yes | — |
| priorities_ordered | text | Yes | — |
| trust_triggers_ordered | text | Yes | — |
| content_format_preference | varchar | Yes | — |
| avg_response_time | double precision | Yes | — |
| total_text_length | integer | Yes | — |
| has_detailed_responses | boolean | Yes | `false` |
| step_timestamps | jsonb | Yes | — |
| persona_code | varchar | Yes | — |
| matching_score | integer | Yes | — |
| over_quota | boolean | Yes | `false` |

**Triggers :**
- `generate_session_code` — BEFORE INSERT, génère un code alphanumérique de 7 caractères unique (chars `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`).
- `validate_diagnostic_session` — BEFORE INSERT/UPDATE, valide les valeurs enum de `status`, `source`, `device`, `relationship`, `adapted_tone`, `exit_type`, `upsell_potential`, `routine_size_preference`, `content_format_preference`, et borne `engagement_score` entre 0 et 100.

**RLS :** `Service role full access sessions` — ALL pour `public` avec `true`.

---

### 1.2 Table `diagnostic_children`

| Colonne | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | No | `gen_random_uuid()` |
| session_id | uuid | No | — |
| child_index | integer | No | — |
| first_name | varchar | Yes | — |
| birth_date | date | Yes | — |
| age | integer | Yes | — |
| age_range | varchar | Yes | — |
| skin_concern | varchar | Yes | — |
| has_routine | boolean | Yes | — |
| routine_satisfaction | integer | Yes | — |
| routine_issue | varchar | Yes | — |
| routine_issue_details | text | Yes | — |
| has_ouate_products | boolean | Yes | — |
| ouate_products | text | Yes | — |
| existing_routine_description | text | Yes | — |
| skin_reactivity | varchar | Yes | — |
| reactivity_details | text | Yes | — |
| exclude_fragrance | boolean | Yes | `false` |
| dynamic_question_1 | text | Yes | — |
| dynamic_answer_1 | text | Yes | — |
| dynamic_question_2 | text | Yes | — |
| dynamic_answer_2 | text | Yes | — |
| dynamic_question_3 | text | Yes | — |
| dynamic_answer_3 | text | Yes | — |
| dynamic_insight_targets | text | Yes | — |

**FK :** `session_id` → `diagnostic_sessions.id` ON DELETE CASCADE
**Trigger :** `validate_diagnostic_child` — valide `age_range` ∈ {4-6, 7-9, 10-11}, `skin_concern` ∈ {imperfections, sensible, seche, atopique, normale}, `routine_issue`, `skin_reactivity`, `routine_satisfaction` entre 0 et 10.
**RLS :** `Service role full access children` — ALL pour `public`.

---

### 1.3 Table `diagnostic_responses` (legacy)

| Colonne | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | No | `gen_random_uuid()` |
| session_id | text | No | — |
| created_at | timestamptz | Yes | `now()` |
| child_name | text | Yes | — |
| child_age | integer | Yes | — |
| parent_name | text | Yes | — |
| email | text | Yes | — |
| phone | text | Yes | — |
| email_optin | boolean | Yes | `false` |
| sms_optin | boolean | Yes | `false` |
| detected_persona | text | Yes | — |
| persona_confidence | real | Yes | — |
| persona_scores | jsonb | Yes | `'{}'` |
| answers | jsonb | Yes | `'{}'` |
| metadata | jsonb | Yes | `'{}'` |
| source_url | text | Yes | — |
| utm_source/medium/campaign/content/term | text | Yes | — |

**RLS :** INSERT pour anon/authenticated, SELECT/UPDATE pour authenticated. Pas de DELETE.

---

### 1.4 Table `personas`

| Colonne | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | No | `gen_random_uuid()` |
| code | varchar | No | — |
| name | varchar | No | — |
| full_label | varchar | No | — |
| description | text | Yes | — |
| criteria | jsonb | No | `'{}'` |
| is_active | boolean | Yes | `true` |
| is_pool | boolean | Yes | `false` |
| is_auto_created | boolean | Yes | `false` |
| is_existing_client_persona | boolean | Yes | `false` |
| session_count | integer | Yes | `0` |
| avg_matching_score | numeric | Yes | `0` |
| min_sessions | integer | Yes | `20` |
| source_personas | ARRAY | Yes | — |
| detection_source | varchar | Yes | — |
| auto_created_at | timestamptz | Yes | — |
| created_at | timestamptz | Yes | `now()` |
| updated_at | timestamptz | Yes | `now()` |

**RLS :** SELECT public ; ALL pour public (service role).

---

### 1.5 Table `persona_detection_log`

| Colonne | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | No | `gen_random_uuid()` |
| created_at | timestamptz | Yes | `now()` |
| detection_type | varchar | No | — |
| details | jsonb | No | — |
| action_taken | varchar | No | — |
| persona_code_created | varchar | Yes | — |
| sessions_affected | integer | Yes | `0` |

**RLS :** SELECT public ; ALL public.

---

### 1.6 Table `shopify_orders`

| Colonne | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | No | `gen_random_uuid()` |
| shopify_order_id | text | No | — |
| order_number | text | Yes | — |
| customer_email | text | Yes | — |
| total_price | numeric | Yes | — |
| currency | text | Yes | `'EUR'` |
| created_at | timestamptz | Yes | `now()` |
| is_from_diagnostic | boolean | Yes | `false` |
| diagnostic_session_id | text | Yes | — |

**RLS :** ALL public.

---

### 1.7 Table `ouate_products`

| Colonne | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | No | `gen_random_uuid()` |
| shopify_product_id | bigint | No | — |
| title | varchar | No | — |
| handle | varchar | No | — |
| description | text | Yes | — |
| product_type | varchar | Yes | — |
| vendor | varchar | Yes | — |
| tags | ARRAY | Yes | — |
| price_min | numeric | Yes | — |
| price_max | numeric | Yes | — |
| variants | jsonb | Yes | — |
| images | jsonb | Yes | — |
| status | varchar | Yes | `'active'` |
| published_at | timestamptz | Yes | — |
| shopify_url | text | Yes | — |
| synced_at | timestamptz | Yes | `now()` |
| created_at | timestamptz | Yes | `now()` |

**RLS :** SELECT public ; ALL public.

---

### 1.8 Table `marketing_recommendations`

| Colonne | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | No | `gen_random_uuid()` |
| week_start | date | No | — |
| title | text | Yes | — |
| brief | text | Yes | — |
| category | text | Yes | — |
| persona_cible | text | Yes | — |
| persona_code | text | Yes | — |
| priority | integer | No | `1` |
| recommendation_version | integer | No | `1` |
| generation_status | text | No | `'complete'` |
| generation_type | text | Yes | `'global'` |
| action_status | text | No | `'todo'` |
| status | varchar | Yes | `'active'` |
| content | jsonb | No | `'{}'` |
| targeting | jsonb | No | `'{}'` |
| sources_inspirations | jsonb | No | `'[]'` |
| campaigns_overview | jsonb | No | `'[]'` |
| emails_v2 | jsonb | No | `'[]'` |
| offers_v2 | jsonb | No | `'[]'` |
| ads_v2 | jsonb | No | `'[]'` |
| generation_config | jsonb | No | `'{}'` |
| generated_categories | jsonb | Yes | `'["ads","offers","emails"]'` |
| pre_calculated_context | jsonb | Yes | — |
| persona_focus | jsonb | Yes | — |
| checklist | jsonb | Yes | — |
| ads/email/offers_recommendations | jsonb | Yes | — |
| sources_consulted | jsonb | Yes | — |
| generated_at | timestamptz | Yes | `now()` |
| completed_at | timestamptz | Yes | — |
| feedback_score | text | Yes | — |
| feedback_notes | text | Yes | — |
| feedback_results | jsonb | Yes | — |
| feedback_entered_at | timestamptz | Yes | — |

**RLS :** ALL public.

---

### 1.9 Table `market_intelligence`

| Colonne | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | No | `gen_random_uuid()` |
| project_id | text | No | `'ouate'` |
| month_year | text | No | — |
| status | text | No | `'pending'` |
| perplexity_ads/email/offers | jsonb | Yes | `'{}'` |
| gemini_ads/email/offers_analysis | jsonb | Yes | `'{}'` |
| client_context | jsonb | Yes | `'{}'` |
| personas_snapshot | jsonb | Yes | `'{}'` |
| weekly_trends_refresh | jsonb | Yes | — |
| models_used | jsonb | Yes | `'{}'` |
| error_log | text | Yes | — |
| generation_duration_ms | integer | Yes | — |
| created_at/updated_at | timestamptz | Yes | `now()` |

**RLS :** ALL public.

---

### 1.10 Table `marketing_sources`

| Colonne | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | No | `gen_random_uuid()` |
| project_id | text | No | `'ouate'` |
| category | text | No | — |
| source_name | text | No | — |
| source_url | text | Yes | — |
| description | text | Yes | — |
| tier | integer | Yes | `1` |
| is_active | boolean | Yes | `true` |
| created_at | timestamptz | Yes | `now()` |

**RLS :** ALL public.

---

### 1.11 Table `funnel_recommendations`

| Colonne | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | No | `gen_random_uuid()` |
| week_start | date | No | — |
| step | text | No | — |
| issue | text | No | — |
| recommendation | text | No | — |
| applied | boolean | No | `false` |
| applied_at | timestamptz | Yes | — |
| kept_from_previous | boolean | No | `false` |
| created_at | timestamptz | No | `now()` |

**RLS :** ALL public.

---

### 1.12 Table `aski_chats`

| Colonne | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | No | `gen_random_uuid()` |
| title | text | No | `'Nouvelle conversation'` |
| is_archived | boolean | Yes | `false` |
| created_at/updated_at | timestamptz | Yes | `now()` |

**RLS :** INSERT, SELECT, UPDATE pour anon/authenticated. Pas de DELETE.

---

### 1.13 Table `aski_messages`

| Colonne | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | No | `gen_random_uuid()` |
| chat_id | uuid | No | — |
| role | text | No | — |
| content | text | No | — |
| tokens_used | integer | Yes | `0` |
| response_time_ms | integer | Yes | `0` |
| created_at | timestamptz | Yes | `now()` |

**FK :** `chat_id` → `aski_chats.id`
**RLS :** INSERT, SELECT pour anon/authenticated. Pas d'UPDATE ni DELETE.

---

### 1.14 Table `aski_memory`

| Colonne | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | No | `gen_random_uuid()` |
| category | text | No | — |
| insight | text | No | — |
| confidence | integer | No | `1` |
| is_active | boolean | No | `true` |
| source_chat_ids | uuid[] | No | `'{}'` |
| last_confirmed_at | timestamptz | No | `now()` |
| expires_at | timestamptz | No | `now() + 60 days` |
| created_at/updated_at | timestamptz | No | `now()` |

**RLS :** ALL public.

---

### 1.15 Table `api_usage_logs`

| Colonne | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | No | `gen_random_uuid()` |
| edge_function | text | No | — |
| api_provider | text | No | — |
| model | text | Yes | — |
| tokens_used | integer | Yes | `0` |
| input_tokens | integer | Yes | `0` |
| output_tokens | integer | Yes | `0` |
| total_tokens | integer | Yes | `0` |
| api_calls | integer | Yes | `1` |
| metadata | jsonb | Yes | `'{}'` |
| created_at | timestamptz | Yes | `now()` |

**RLS :** INSERT anon/authenticated ; ALL service_role.

---

### 1.16 Table `client_plan`

| Colonne | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | No | `gen_random_uuid()` |
| project_id | text | No | — |
| plan | text | No | `'starter'` |
| sessions_limit | integer | No | `500` |
| aski_limit | integer | No | `100` |
| recos_monthly_limit | integer | No | `6` |
| billing_cycle | text | No | `'monthly'` |
| created_at/updated_at | timestamptz | No | `now()` |

**RLS :** ALL public. Synchronisée automatiquement par `get-org-limits`.

---

### 1.17 Table `recommendation_usage`

| Colonne | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | No | `gen_random_uuid()` |
| project_id | text | No | — |
| month_year | text | No | — |
| total_generated | integer | No | `0` |
| monthly_limit | integer | No | `36` |
| plan | text | No | `'starter'` |
| generations_log | jsonb | Yes | `'[]'` |
| created_at/updated_at | timestamptz | Yes | `now()` |

**RLS :** ALL public.

---

### 1.18 Table `usage_tracking`

| Colonne | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | No | `gen_random_uuid()` |
| project_id | text | No | — |
| period_type | text | No | — |
| period_start | date | No | — |
| sessions_used | integer | No | `0` |
| aski_conversations_used | integer | No | `0` |
| recos_used | integer | No | `0` |
| updated_at | timestamptz | No | `now()` |

**RLS :** ALL public.

---

### 1.19 Database Functions

| Fonction | Type | Description |
|---|---|---|
| `generate_session_code()` | Trigger BEFORE INSERT on `diagnostic_sessions` | Génère un code unique de 7 chars si `session_code` est NULL |
| `validate_diagnostic_session()` | Trigger BEFORE INSERT/UPDATE | Valide les enums : status, source, device, relationship, adapted_tone, exit_type, upsell_potential, routine_size_preference, content_format_preference, engagement_score ∈ [0,100] |
| `validate_diagnostic_child()` | Trigger BEFORE INSERT/UPDATE | Valide : age_range, skin_concern, routine_issue, skin_reactivity, routine_satisfaction ∈ [0,10] |
| `update_updated_at_column()` | Trigger | Met à jour `updated_at = now()` |

---

## 2. Inventaire des Edge Functions

### 2.1 `diagnostic-webhook` (580 lignes)
**Rôle :** Point d'entrée principal du diagnostic. Reçoit les données du diagnostic (depuis l'app diagnostic) et les persiste.
**Config :** `verify_jwt = false`
**Authentification :** Header `x-webhook-secret` comparé à `DIAGNOSTIC_WEBHOOK_SECRET`.

**Entrée (POST) :**
- Nouveau format : `{ session_code, status, source, device, email, children: [...], ... }`
- Legacy : `{ session_id, child_name, child_age, ... }`

**Logique détaillée :**
1. Valide le secret webhook
2. Détecte le format (session_code → nouveau, session_id → legacy)
3. **Nouveau format :**
   - Upsert dans `diagnostic_sessions` avec logique COALESCE (ne pas écraser les valeurs existantes par null)
   - Vérifie le quota diagnostic mensuel via `client_plan.sessions_limit`
   - Flag `over_quota = true` si dépassé
   - Notifications fire-and-forget au portail à 80% et 100% du quota
   - Delete-then-insert des enfants dans `diagnostic_children`
   - Si `status = "termine"` : calcule le persona via `computePersonaWithScore()` (scoring pondéré identity 25%, need 50%, behavior 25%), assigne `adapted_tone` via `computeAdaptedTone()`, et déclenche `sync-klaviyo-persona` en fire-and-forget
4. **Legacy format :** Upsert dans `diagnostic_responses`

**Appels externes :** Portail admin (`quota-threshold-reached`), `sync-klaviyo-persona`, `report-error`
**Sortie :** `{ success, id, format }`

---

### 2.2 `diagnostic-performance` (526 lignes)
**Rôle :** Agrège les métriques de performance du diagnostic pour le dashboard.
**Config :** pas dans config.toml (JWT requis par défaut)

**Entrée (POST) :** `{ from?, to?, includeDetails? }`

**Logique détaillée :**
1. Charge les `diagnostic_sessions` (nouveau format, depuis cutoff 2026-02-08) avec `diagnostic_children(*)` joints
2. Pagination manuelle des `diagnostic_responses` (legacy)
3. Calcule : totalResponses, completedResponses, completionRate, optins, personaDistribution
4. Calcule le funnel macro (started → completed → optinEmail → recommendation → addToCart → checkout → purchase) depuis `diagnostic_sessions` + `shopify_orders`
5. Calcule le funnel détaillé (11 étapes basées sur `question_path`)
6. Calcule la timeseries revenue jour par jour depuis `shopify_orders` (groupé par Europe/Paris)
7. Si `includeDetails = true` : retourne le détail de chaque session avec enfants mappés, catégorisé par source (new/legacy)

**Sortie :** `{ totalResponses, completionRate, funnel, detailedFunnel, revenueTimeseries, sessions? }`

---

### 2.3 `persona-stats` (429 lignes)
**Rôle :** Statistiques détaillées par persona pour l'onglet Personas.
**Config :** `verify_jwt = false`

**Entrée (POST) :** `{ from?, to? }`

**Logique détaillée :**
1. Charge toutes les sessions terminées avec enfants (pagination manuelle pour dépasser 1000 rows)
2. Charge les commandes Shopify pour la période
3. Pour chaque session sans persona_code (ou P0), recalcule un code via `assignPersonaCode()` (hardcoded P1-P9)
4. Agrège par persona : profil (age_range, reactivity, fragrance), psychologie (priorités, trust triggers, routine size), comportement (durée, engagement, format, optins), top produits, business (conversions, revenue, AOV, écart panier)
5. Génère 3 insights automatiques par persona (comparaisons vs moyenne globale)

**Sortie :** `{ totalCompleted, globalAvg, personas: [...] }`

---

### 2.4 `persona-priorities` (250 lignes)
**Rôle :** Identifie les 3 personas prioritaires (meilleur ROI acquisition, plus gros levier de croissance, meilleur potentiel LTV).
**Config :** `verify_jwt = false`

**Entrée (POST) :** aucun body requis

**Logique détaillée :**
1. Charge sessions terminées des 30 derniers jours + commandes Shopify
2. Calcule par persona : volume, conversion rate, AOV, totalRevenue, optin email %, multi-enfants %, âge dominant
3. **Best ROI Acquisition** : `(convRate/100) × AOV` le plus élevé (exclut les personas existing-client)
4. **Best Growth** : persona avec le plus gros CA manquant `(globalConvRate - personaConvRate) × volume × AOV` (exclut best ROI)
5. **Best LTV** : score = `scoreAge × (optinEmailPct/100) × coeffMulti × (AOV/50)` (exclut les deux précédents)

**Sortie :** `{ globalConvRate, globalAOV, totalSessions, bestROI, bestGrowth, bestLTV }`

---

### 2.5 `detect-persona-clusters` (976 lignes)
**Rôle :** Détecte automatiquement de nouveaux clusters de personas, les crée, et réattribue les sessions.
**Config :** `verify_jwt = false`

**Entrée (POST) :** `{ dry_run?, min_cluster_size? (30), min_split_size? (20), max_persona_size? (80), weak_score_threshold? (75) }`

**Logique détaillée :**
1. **Phase A :** Charge toutes les sessions terminées + personas actifs + enfants (pagination)
2. **Phase G (early) :** Met à jour `session_count` et `avg_matching_score` pour tous les personas
3. **Phase B — Détection :**
   - B1 : Nouveaux clusters depuis les sessions P0 (groupement NEED → IDENTITY → validation similarité ≥ 75%)
   - B2 : Split des personas trop grands (> max_persona_size) par champ behavior
   - B3 : Recombinaison de sessions faibles (matching_score < 75%), uniquement si gain de score ≥ 5%
4. **Phase C :** Génération d'identité (nom, prénom, label, description) via `generatePersonaIdentity()`
5. **Phase D :** Construction des critères de scoring via `buildCriteriaFromCluster()` avec poids fixes (identity 25%, need 50%, behavior 25%)
6. **Phase E :** Création en DB (insert persona + log dans `persona_detection_log`)
7. **Phase F :** Réattribution des sessions affectées avec re-scoring complet
8. **Phase G (final) :** Mise à jour des compteurs

**Appels externes :** Aucun
**Sortie :** `{ dry_run, detected, created, reassigned, new_personas, session_count_updates }`

---

### 2.6 `aski-chat` (956 lignes)
**Rôle :** Assistant IA conversationnel (Aski) du dashboard.
**Config :** `verify_jwt = false`

**Entrée (POST) :** `{ chatId?, userMessage }`

**Logique détaillée :**
1. Vérifie le quota mensuel Aski via `client_plan.aski_limit` (compte les messages user du mois)
2. Notifications fire-and-forget au portail à 80% et 100%
3. Si quota atteint → HTTP 429
4. Crée un chat si `chatId` absent
5. Insère le message user dans `aski_messages`
6. Charge l'historique (20 derniers messages)
7. **Chargement parallèle massif :** personas, sessions terminées, enfants, produits Shopify, recommandations marketing (20 dernières), sources marketing, market intelligence (3 derniers mois), mémoire Aski (top 15 par confiance), + appel Perplexity conditionnel
8. Construit les insights par persona en temps réel (conversion, AOV, score, distributions)
9. Construit un system prompt de ~600+ lignes avec : ton de marque, catalogue produits, insights personas, métriques globales, intelligence de marché, sources marketing, résultats des recommandations, mémoire de marque
10. **Appel IA avec fallback :**
    - Primaire : Anthropic Claude (claude-sonnet-4-20250514), timeout 90s
    - Fallback : Lovable AI Gateway (google/gemini-2.5-flash), timeout 90s
11. Log l'usage API dans `api_usage_logs`
12. Sauvegarde la réponse dans `aski_messages`
13. Met à jour le titre du chat via un appel IA séparé (si < 3 messages)

**Appels externes :** Perplexity API (sonar-pro, conditionnel), Anthropic API, Lovable AI Gateway, portail admin (quota-threshold-reached), report-error
**Sortie :** `{ reply, chatId, questions_used, questions_limit }`

---

### 2.7 `aski-daily-learn` (259 lignes)
**Rôle :** Cron quotidien — extrait des directives de marque des conversations Aski des dernières 24h et les stocke en mémoire.
**Config :** pas dans config.toml

**Entrée (POST) :** aucun body requis

**Logique détaillée :**
1. Expire les mémoires anciennes (`is_active = false` si `expires_at < now()`)
2. Charge les conversations des dernières 24h
3. Charge les mémoires existantes actives
4. Appelle Lovable AI Gateway (google/gemini-3-flash-preview) avec un prompt d'extraction de directives
5. Parse le JSON retourné
6. Pour chaque insight extrait :
   - Si `matches_existing_id` : incrémente la confiance + reset expiration à 60 jours
   - Sinon : crée un nouvel insight (max 15 actifs)
7. Log l'usage dans `api_usage_logs`

**Appels externes :** Lovable AI Gateway
**Sortie :** `{ success, analyzed, new_insights, confirmed_insights, total_active }`

---

### 2.8 `sync-klaviyo-persona` (315 lignes)
**Rôle :** Synchronise les données d'un profil diagnostic vers Klaviyo après complétion d'une session.
**Config :** `verify_jwt = false`

**Entrée (POST) :** `{ session_id }`

**Logique détaillée :**
1. Charge la session depuis `diagnostic_sessions`
2. Skip si pas d'email
3. Charge le `full_label` du persona depuis la table `personas`
4. Charge les enfants triés par âge DESC
5. Construit les propriétés dynamiques (questions/réponses IA) et enrichissement (routine, réactivité)
6. Construit le payload Klaviyo profile-import avec : persona, scores, conversion, produits recommandés/validés, optins
7. **Appel Klaviyo avec retry (max 3) :** profile-import avec timeout 15s, exponential backoff sur 5xx/429
8. Traite le 409 comme succès (profil existant)
9. Si opt-in actif : appel subscribe vers la liste `TExMiq` (non-bloquant)

**Appels externes :** Klaviyo API (`profile-import`, `profile-subscription-bulk-create-jobs`), report-error
**Sortie :** `{ success, persona_code, email }`

---

### 2.9 `backfill-klaviyo` (96 lignes)
**Rôle :** Backfill massif des profils Klaviyo pour les sessions passées.
**Config :** `verify_jwt = false`

**Entrée (POST) :** `{ since? (default "2026-02-12") }`

**Logique détaillée :**
1. Charge toutes les sessions terminées avec email depuis `since`
2. Traite par batch de 20 sessions, 300ms de délai inter-batch
3. Appelle `sync-klaviyo-persona` pour chaque session

**Sortie :** `{ success, total, processed, errors, since }`

---

### 2.10 `generate-marketing-recommendations` (321 lignes)
**Rôle :** API layer pour les recommandations marketing V3. GET pour lire, POST pour modifier.
**Config :** `verify_jwt = false`

**Entrée :**
- **GET :** Retourne toutes les recommandations actives + quota + dernière intelligence
- **POST :** `{ action: "update_status"|"submit_feedback", recommendation_id, status?, results?, notes? }`

**Logique détaillée :**
- GET : Requête parallèle `marketing_recommendations` (status=active) + quota (comptage mensuel vs `client_plan.recos_monthly_limit`) + `market_intelligence` (dernière)
- POST update_status : Met à jour `action_status` (todo/in_progress/done) + `completed_at`
- POST submit_feedback : Charge la recommandation, calcule le `feedback_score` automatiquement (good/average/poor) en comparant les résultats réels aux KPIs attendus, sauvegarde

**Sortie GET :** `{ recommendations, quota, intelligence }`

---

### 2.11 `generate-recommendation-content` (873 lignes)
**Rôle :** Génération on-demand d'une recommandation marketing complète via Claude Sonnet.
**Config :** `verify_jwt = false`

**Entrée (POST) :** `{ category: "ads"|"emails"|"offers" }`

**Logique détaillée :**
1. Vérifie le quota mensuel via `client_plan.recos_monthly_limit`
2. Notifications fire-and-forget au portail à 80%/100%
3. Charge le contexte : market_intelligence, personas, feedback historique, recommandations de la semaine, catalogue produits
4. Construit un system prompt massif (~500 lignes) avec : règles de marque, anti-hallucination produit, pricing/marge, schéma JSON par catégorie
5. Appelle Claude Sonnet 4 (claude-sonnet-4-20250514) via Anthropic API directe, timeout 90s
6. **Validation anti-hallucination :** `validateGeneratedCopy()` détecte les chiffres inventés, claims non vérifiés, garanties fictives
7. Si validation échoue : retry avec prompt corrigé (max 2 retry)
8. Parse robuste du JSON (code blocks, extraction)
9. Insère dans `marketing_recommendations` (version 3)
10. Log usage + met à jour `recommendation_usage`

**Appels externes :** Anthropic API (claude-sonnet-4), portail admin (quota-threshold-reached)
**Sortie :** `{ success, recommendation, quota }`

---

### 2.12 `generate-funnel-recommendations` (242 lignes)
**Rôle :** Génère 3 recommandations d'optimisation du tunnel de conversion basées sur les données des 7 derniers jours.
**Config :** `verify_jwt = false`

**Entrée (POST) :** aucun body requis

**Logique détaillée :**
1. Calcule le funnel des 7 derniers jours (sessions → completion → optin → recommendation → cart → checkout → purchase)
2. Identifie les top 3 étapes d'abandon
3. Charge les recommandations précédentes non appliquées
4. Appelle Lovable AI Gateway (google/gemini-2.5-flash) avec le résumé du funnel
5. Parse le JSON, supprime les anciennes non-appliquées, insère les 3 nouvelles

**Appels externes :** Lovable AI Gateway
**Sortie :** `{ success, recommendations }`

---

### 2.13 `monthly-market-intelligence` (852 lignes)
**Rôle :** Pipeline mensuel de veille concurrentielle en 2 étapes.
**Config :** `verify_jwt = false`

**Entrée (POST) :** `{ force? }`

**Logique détaillée :**
1. **Step 0 :** Collecte les données personas des 30 derniers jours
2. **Step 1 — Perplexity (3 appels parallèles) :** Recherche tendances pour ads, email, offres. Modèle : sonar-pro. Timeout 60s chacun. Résultats stockés dans `market_intelligence.perplexity_*`
3. **Step 2 — Gemini (3 appels séquentiels) :** Analyse approfondie par le Lovable AI Gateway (google/gemini-3.1-pro-preview). Timeout 120s. Chaque analyse produit un JSON structuré (tendances, hooks performants, erreurs à éviter, benchmarks). Résultats stockés dans `gemini_*_analysis`
4. Calcule la durée totale + modèles utilisés

**Appels externes :** Perplexity API (sonar-pro ×3), Lovable AI Gateway (gemini-3.1-pro-preview ×3), report-error
**Sortie :** `{ success, month_year, duration_ms, models_used }`

---

### 2.14 `weekly-intelligence-refresh` (239 lignes)
**Rôle :** Rafraîchissement hebdomadaire léger — met à jour les métriques personas et les tendances courtes.
**Config :** `verify_jwt = false`

**Entrée (POST) :** `{ force? }`

**Logique détaillée :**
1. Guard : ne s'exécute que le lundi (sauf `force = true`)
2. Charge la dernière `market_intelligence` complète
3. Rafraîchit les métriques personas (sessions_30d, conversion_rate, avg_cart) et met à jour `personas_snapshot`
4. Appel Perplexity (sonar-pro, 1 appel) pour 5 tendances de la semaine, stockées dans `weekly_trends_refresh`

**Appels externes :** Perplexity API
**Sortie :** `{ status, personas_refreshed, trends_refreshed, trends_count }`

---

### 2.15 `ga4-analytics` (252 lignes)
**Rôle :** Proxy vers Google Analytics 4 Data API pour récupérer les sessions du site et les vues diagnostic.
**Config :** `verify_jwt = false`

**Entrée (POST) :** `{ start_date, end_date }` (format YYYY-MM-DD)

**Logique détaillée :**
1. Génère un JWT signé RS256 avec le service account GA4
2. Échange le JWT contre un access token OAuth2
3. Appelle GA4 Data API en parallèle :
   - `runReport()` : sessions totales du site
   - `runReportLandingPage()` : sessions landing sur `/pages/diagnostic-de-peau`

**Secrets utilisés :** `GA4_PROPERTY_ID`, `GA4_SERVICE_ACCOUNT_EMAIL`, `GA4_SERVICE_ACCOUNT_PRIVATE_KEY`
**Sortie :** `{ site_sessions, diagnostic_page_sessions }`

---

### 2.16 `shopify-order-webhook` (201 lignes)
**Rôle :** Webhook Shopify `orders/paid`. Enregistre les commandes et attribue les conversions aux sessions diagnostiques.
**Config :** `verify_jwt = false`

**Authentification :** HMAC SHA-256 via `SHOPIFY_WEBHOOK_SECRET`

**Logique détaillée :**
1. Vérifie la signature HMAC
2. Cherche `_diag_session` dans les propriétés des line items → match direct par `session_code`
3. Si trouvé : marque la session comme `conversion = true` + `validated_cart_amount` + `validated_products`
4. Fallback par email : cherche une session non convertie avec le même email dans les 5 derniers jours
5. **Toujours** upsert dans `shopify_orders` (avec `is_from_diagnostic` flag)

**Sortie :** `{ success, matched, isFromDiagnostic }`

---

### 2.17 `shopify-checkout-webhook` (135 lignes)
**Rôle :** Webhook Shopify `checkouts/create`. Marque le début du checkout dans la session diagnostic.
**Config :** `verify_jwt = false`

**Authentification :** HMAC SHA-256 via `SHOPIFY_CHECKOUT_WEBHOOK_SECRET`

**Logique détaillée :**
1. Vérifie HMAC
2. Cherche `_diag_session` dans les line items
3. Si trouvé et pas déjà marqué : update `checkout_started = true`, `checkout_at = now()`

**Sortie :** `{ success, matched }`

---

### 2.18 `sync-shopify-products` (188 lignes)
**Rôle :** Synchronise le catalogue produit depuis Shopify Storefront API vers `ouate_products`.
**Config :** `verify_jwt = false`

**Logique détaillée :**
1. Utilise l'API Storefront GraphQL (version 2024-01) du store `www-ouate-paris-com.myshopify.com`
2. Pagine tous les produits (250 par page)
3. Upsert chaque produit dans `ouate_products` (on conflict `shopify_product_id`)

**Secret :** `SHOPIFY_STOREFRONT_ACCESS_TOKEN`
**Sortie :** `{ success, synced, errors, total }`

---

### 2.19 `import-shopify-csv` (277 lignes)
**Rôle :** Importe des commandes Shopify depuis un fichier CSV.
**Config :** `verify_jwt = false`

**Entrée :** CSV via body texte, multipart/form-data, ou `{ csv_url }`

**Logique détaillée :**
1. Parse le CSV (support des champs multilignes entre guillemets)
2. Déduplique par nom de commande
3. Filtre : uniquement `financial_status = paid` et `refunded_amount <= 0`
4. Match par email vers `diagnostic_sessions` pour attribution
5. Attribution diagnostic si code promo contient "DIAG-15" ou match email
6. Upsert dans `shopify_orders`

**Sortie :** `{ success, totalRowsInCsv, uniqueOrders, filteredOut, upserted, errors }`

---

### 2.20 `get-org-limits` (133 lignes)
**Rôle :** Proxy sécurisé vers le portail admin pour récupérer les limites de l'organisation et synchroniser `client_plan`.
**Config :** `verify_jwt = false`

**Logique détaillée :**
1. Appelle le portail admin (`https://srzbcuhwrpkfhubbbeuw.supabase.co/functions/v1/get-organization-limits`) en POST avec `{ organization_id }` et header `x-api-key: MONITORING_API_KEY`
2. Timeout 8s
3. Valide la forme de la réponse (`success`, `plan`, `aski_limit`, `sessions_limit`, `recos_limit`)
4. Synchronise `client_plan` locale via UPDATE
5. Fallback : lit `client_plan` locale, puis hardcoded scale

**Sortie :** `{ plan, aski_limit, sessions_limit, recos_limit, source: "portal"|"local_client_plan"|"hardcoded_fallback" }`

---

### 2.21 `get-usage-stats` (162 lignes)
**Rôle :** Expose les statistiques d'usage pour le portail admin.
**Authentification :** Header `x-api-key` comparé à `USAGE_STATS_API_KEY`
**CORS :** Restreint à `app.ask-it.ai` et `srzbcuhwrpkfhubbbeuw.supabase.co`

**Entrée (POST) :** `{ month?: "YYYY-MM" | "all" }`

**Logique détaillée :**
1. Mode "all" : itère tous les mois depuis le premier log
2. Mode mois spécifique : données du mois demandé
3. Agrège : questions Aski, tokens, sessions diagnostic, recommandations marketing, usage API par modèle
4. Calcule les flags de blocage (`aski_blocked`, `reco_blocked`, `diagnostic_over_limit`)
5. Retourne aussi le `pending_feedback` (recommandations terminées sans feedback)

**Sortie :** `{ success, period, questions_asked, diagnostic_sessions, marketing_recommendations, aski_blocked, reco_blocked, pending_feedback, api_usage }`

---

## 3. Intégrations externes

### 3.1 Shopify

| Élément | Détail |
|---|---|
| Store | `www-ouate-paris-com.myshopify.com` |
| API Storefront | GraphQL, version 2024-01 |
| Webhook orders/paid | `shopify-order-webhook`, HMAC via `SHOPIFY_WEBHOOK_SECRET` |
| Webhook checkouts/create | `shopify-checkout-webhook`, HMAC via `SHOPIFY_CHECKOUT_WEBHOOK_SECRET` |
| Sync produits | `sync-shopify-products` via Storefront API |
| Import CSV | `import-shopify-csv` |
| Secrets | `SHOPIFY_STOREFRONT_ACCESS_TOKEN`, `SHOPIFY_WEBHOOK_SECRET`, `SHOPIFY_CHECKOUT_WEBHOOK_SECRET`, `SHOPIFY_ACCESS_TOKEN`, `SHOPIFY_ADMIN_ACCESS_TOKEN` |

### 3.2 Klaviyo

| Élément | Détail |
|---|---|
| Endpoint profile | `https://a.klaviyo.com/api/profile-import/` |
| Endpoint subscribe | `https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs/` |
| Revision header | `2024-02-15` |
| Liste d'abonnement | ID `TExMiq` |
| Retry | Max 3, timeout 15s, exponential backoff |
| Secret | `KLAVIYO_API_KEY` |

### 3.3 Google Analytics 4

| Élément | Détail |
|---|---|
| API | GA4 Data API (`analyticsdata.googleapis.com/v1beta`) |
| Auth | Service account JWT → OAuth2 token |
| Scope | `analytics.readonly` |
| Rapports | Sessions totales + sessions landing `/pages/diagnostic-de-peau` |
| Secrets | `GA4_PROPERTY_ID`, `GA4_SERVICE_ACCOUNT_EMAIL`, `GA4_SERVICE_ACCOUNT_PRIVATE_KEY` |

### 3.4 Perplexity

| Élément | Détail |
|---|---|
| Endpoint | `https://api.perplexity.ai/chat/completions` |
| Modèle | `sonar-pro` |
| Timeout | 30s (aski-chat), 60s (monthly-market-intelligence) |
| Utilisé par | `aski-chat` (conditionnel), `monthly-market-intelligence` (3 appels parallèles), `weekly-intelligence-refresh` (1 appel) |
| Filtre | `search_recency_filter: "month"` |
| Secret | `PERPLEXITY_API_KEY` (managed by connector) |

### 3.5 Anthropic

| Élément | Détail |
|---|---|
| Endpoint | `https://api.anthropic.com/v1/messages` |
| Modèle | `claude-sonnet-4-20250514` |
| Version | `anthropic-version: 2023-06-01` |
| Timeout | 90s |
| Utilisé par | `aski-chat` (primaire), `generate-recommendation-content` |
| Secret | `ANTHROPIC_API_KEY` |

### 3.6 Lovable AI Gateway

| Élément | Détail |
|---|---|
| Endpoint | `https://ai.gateway.lovable.dev/v1/chat/completions` |
| Modèles utilisés | `google/gemini-2.5-flash` (aski-chat fallback, generate-funnel-recommendations), `google/gemini-3-flash-preview` (aski-daily-learn), `google/gemini-3.1-pro-preview` (monthly-market-intelligence) |
| Auth | `Bearer LOVABLE_API_KEY` |
| Secret | `LOVABLE_API_KEY` |

### 3.7 Portail Admin Ask-It

| Élément | Détail |
|---|---|
| URL portail | `https://srzbcuhwrpkfhubbbeuw.supabase.co/functions/v1/` |
| Endpoints appelés | `get-organization-limits` (POST, x-api-key), `quota-threshold-reached` (POST, x-api-key), `report-error` (POST, x-monitoring-key) |
| Organisation ID | `12c2a92a-8ede-425c-b660-61962dc1d68c` |
| Secrets | `MONITORING_API_KEY`, `USAGE_STATS_API_KEY`, `ORGANIZATION_ID` |

---

## 4. Crons actifs

| Fonction | Fréquence | Description |
|---|---|---|
| `sync-shopify-products` | Quotidien 05:00 UTC | Synchronise le catalogue Shopify → `ouate_products` |
| `aski-daily-learn` | Quotidien | Extrait les directives de marque des conversations Aski |
| `generate-funnel-recommendations` | Hebdomadaire | Génère 3 recommandations d'optimisation funnel |
| `weekly-intelligence-refresh` | Lundi 07:00 UTC | Rafraîchit les métriques personas + tendances Perplexity |
| `monthly-market-intelligence` | Mensuel (1er du mois) | Pipeline complet Perplexity + Gemini pour la veille concurrentielle |
| `detect-persona-clusters` | Périodique | Détecte de nouveaux clusters, split/recombinaison de personas |

---

## 5. Frontend — Structure du Dashboard

Le dashboard est une SPA React avec un unique composant page `Dashboard.tsx` (597 lignes), organisé en 8 onglets via `Tabs`.

### 5.1 Onglet « Vue d'ensemble » (`overview`)

**Composants :**
- `MetricCard` ×4 : CA via diagnostic, taux de conversion diag, AOV après diagnostic, diagnostics complétés
- `TopPersonasPotential` : Affiche les 3 personas prioritaires (meilleur ROI, plus gros levier, meilleur LTV)
- `OverviewDiagnosticStats` : Statistiques diagnostic agrégées
- `UsageOverview` : Visualisation de l'usage (sessions, Aski, recommandations) vs limites du plan
- `DiagnosticPreview` : Aperçu des dernières sessions

**Hooks :** `useBusinessMetrics(dateRange)`, `useDiagnosticStats(dateRange)`, `useUsageLimits()`

**Données affichées :** CA total/diag, taux de conversion diag vs global, AOV diag vs non-diag, diagnostics complétés/total, taux de complétion, usage du plan

---

### 5.2 Onglet « Personas » (`personas`)

**Composant :** `PersonasTab`

**Hooks :** `usePersonaStats(dateRange)`, `usePersonaProfiles()`

**Données affichées :** Pour chaque persona : volume, %, profil démographique (age_range, multiChildren, reactivity), psychologie (priorités, trust triggers, routine size), comportement (durée, engagement, format, optins), top 5 produits, business (conversions, revenue, AOV, écart panier), 3 insights automatiques

---

### 5.3 Onglet « Diagnostic » (`analytics`)

**Composant :** `DiagnosticsAnalytics`

**Hooks :** `useDiagnosticStats(dateRange)`

**Données affichées :** Totaux (sessions, complétés, taux), opt-ins (email, SMS, double), distribution personas, dernières sessions

---

### 5.4 Onglet « Business » (`business`)

**Composant :** `BusinessMetrics`

**Hooks :** `useBusinessMetrics(dateRange)`, `useRevenueTimeseries(dateRange, granularity)`, `useInsightsMetrics(dateRange)`

**Données affichées :** Revenue total/diag/non-diag, AOV, commandes, sessions GA4, taux de conversion, courbe revenue jour/semaine/mois (recharts), routine complète %, écart panier, top produit acheté, % nouveaux clients

---

### 5.5 Onglet « Funnel » (`funnel`)

**Composants :**
- `FunnelVisualization` : Funnel macro en 7 étapes (sessions → complétés → optin email → recommandation → ajout panier → checkout → achat)
- `DetailedFunnelVisualization` : Funnel détaillé en 11 étapes du questionnaire diagnostic (basé sur `question_path`)

**Hooks :** `useDiagnosticStats(dateRange)`

---

### 5.6 Onglet « Marketing IA » (`marketing`)

**Composant :** `MarketingRecommendations` → redirige vers `src/components/dashboard/marketing/MarketingRecommendations.tsx`

**Sous-onglets :**
- **Vue d'ensemble** (`MarketingOverviewTab`) : Tâches actives, historique des recommandations terminées, quota
- **Publicité** (`MarketingAdsTab`) : Recommandations ads (V3), génération on-demand
- **Emailing** (`MarketingEmailsTab`) : Recommandations emails (V3)
- **Offres** (`MarketingOffersTab`) : Recommandations offres (V3)

**Sous-composants :** `RecommendationCard`, `CampaignCard`, `FeedbackForm`, `OverviewTaskCard`, `OverviewHistoryCard`, `CopyButton`, `FormatBadge`, `PersonaBadge`, `PriorityIndicator`, `RecosQuotaBanner`

**Hook :** `useMarketingRecommendations()` — gère le state, la génération, les mises à jour de statut et le feedback

---

### 5.7 Onglet « Aski » (`alerts`)

**Composants :**
- `AskiAvatar` : Avatar animé CSS (cercle pulsant avec icône Bot)
- `AskiChat` : Interface de chat complète avec historique des conversations, gestion des chats, envoi de messages, indicateur de quota

**Hook :** Appels directs à l'edge function `aski-chat` via `supabase.functions.invoke()`

---

### 5.8 Onglet « Réponses » (`responses`)

**Composant :** `ResponsesSection`

**Hook :** `useDiagnosticSessions(dateRange)` — appelle `diagnostic-performance` avec `includeDetails: true`

**Données affichées :** Tableau détaillé de toutes les sessions avec : code, date, nom, email, persona, score, tone, conversion, produits recommandés/validés, montants, durée, engagement, enfants (détail skin_concern, age, routine, questions IA)

---

### 5.9 Header global

**Composants :**
- Logo Ask-It
- Nom du plan actuel (via `useUsageLimits().plan`)
- `DateRangePicker` : Sélecteur de période
- Bouton déconnexion (clear session + redirect)
- Dialog export PDF (sélection de sections, génération via html2canvas + jsPDF)
- Dialog support

**Composant bannière :** `QuotaBanner` — affiche les alertes de quota (80%+) pour sessions, Aski, recommandations

---

## 6. AccessGate et flux d'authentification

**Fichier :** `src/components/AccessGate.tsx` (201 lignes)

**Flux :**
1. Au chargement, vérifie si une session existe dans `sessionStorage` (clé `askit_access`, durée 8h)
2. Si session valide → `granted` → affiche les children (le dashboard)
3. Si pas de session → cherche `?access_token=` dans l'URL
4. Si pas de token → `denied` → affiche la page de blocage avec CTA vers `https://app.ask-it.ai/login`
5. Si token présent → POST vers `https://srzbcuhwrpkfhubbbeuw.supabase.co/functions/v1/verify-dashboard-token` avec `{ token }`
6. Si `data.valid` → stocke la session (`user_email`, `user_role`, `organization_id`), nettoie l'URL, → `granted`
7. Sinon → `denied`

**Pages :**
- `AccessLoader` : Spinner avec logo Ask-It sur fond noir
- `AccessBlocked` : Carte blanche avec icône cadenas, texte FR, CTA "Se connecter"

**Export :** `clearAccessSession()` — utilisé par le bouton déconnexion du dashboard

---

## 7. Manifeste des fichiers src/

### Pages
| Fichier | Rôle |
|---|---|
| `src/pages/Dashboard.tsx` | Page principale du dashboard, 8 onglets, 597 lignes |
| `src/pages/Index.tsx` | (non utilisé, redirige) |
| `src/pages/NotFound.tsx` | Page 404 |

### Components — Dashboard
| Fichier | Rôle |
|---|---|
| `src/components/AccessGate.tsx` | Gate d'accès par token portail |
| `src/components/AskiAvatar/AskiAvatar.tsx` | Avatar animé d'Aski |
| `src/components/AskiAvatar/AskiAvatar.css` | CSS de l'avatar |
| `src/components/NavLink.tsx` | Composant de lien navigation |
| `src/components/dashboard/AlertsSection.tsx` | Section alertes |
| `src/components/dashboard/AskiChat.tsx` | Interface de chat Aski |
| `src/components/dashboard/BusinessMetrics.tsx` | Métriques business (revenue, AOV, graphs) |
| `src/components/dashboard/DateRangePicker.tsx` | Sélecteur de dates |
| `src/components/dashboard/DetailedFunnelVisualization.tsx` | Funnel détaillé (11 étapes) |
| `src/components/dashboard/DiagnosticPreview.tsx` | Aperçu des diagnostics récents |
| `src/components/dashboard/DiagnosticsAnalytics.tsx` | Analytics diagnostic (totaux, optins, personas) |
| `src/components/dashboard/FunnelVisualization.tsx` | Funnel macro (7 étapes) |
| `src/components/dashboard/MetricCard.tsx` | Carte métrique réutilisable |
| `src/components/dashboard/OverviewDiagnosticStats.tsx` | Stats diagnostic pour la vue d'ensemble |
| `src/components/dashboard/PersonaCard.tsx` | Carte persona individuelle |
| `src/components/dashboard/PersonasOverviewPreview.tsx` | Aperçu personas (remplacé par TopPersonasPotential) |
| `src/components/dashboard/PersonasTab.tsx` | Onglet complet Personas |
| `src/components/dashboard/QuotaBanner.tsx` | Bannière d'alerte quota |
| `src/components/dashboard/ResponsesSection.tsx` | Tableau détaillé des réponses |
| `src/components/dashboard/SessionsTable.tsx` | Tableau des sessions |
| `src/components/dashboard/TopPersonasPotential.tsx` | Top 3 personas prioritaires |
| `src/components/dashboard/UsageOverview.tsx` | Visualisation de l'usage vs limites |

### Components — Marketing
| Fichier | Rôle |
|---|---|
| `src/components/dashboard/MarketingRecommendations.tsx` | Re-export pour backward compat |
| `src/components/dashboard/marketing/MarketingRecommendations.tsx` | Composant principal marketing (sous-onglets) |
| `src/components/dashboard/marketing/MarketingOverviewTab.tsx` | Vue d'ensemble marketing |
| `src/components/dashboard/marketing/MarketingAdsTab.tsx` | Onglet publicité |
| `src/components/dashboard/marketing/MarketingEmailsTab.tsx` | Onglet emailing |
| `src/components/dashboard/marketing/MarketingOffersTab.tsx` | Onglet offres |
| `src/components/dashboard/marketing/CampaignCard.tsx` | Carte de campagne |
| `src/components/dashboard/marketing/RecommendationCard.tsx` | Carte de recommandation V3 |
| `src/components/dashboard/marketing/FeedbackForm.tsx` | Formulaire de résultats |
| `src/components/dashboard/marketing/OverviewTaskCard.tsx` | Carte tâche active |
| `src/components/dashboard/marketing/OverviewHistoryCard.tsx` | Carte historique |
| `src/components/dashboard/marketing/legacy/LegacyRecommendations.tsx` | Recommandations legacy |
| `src/components/dashboard/marketing/shared/CopyButton.tsx` | Bouton copier |
| `src/components/dashboard/marketing/shared/FormatBadge.tsx` | Badge format (video_ugc, image, carousel...) |
| `src/components/dashboard/marketing/shared/PersonaBadge.tsx` | Badge persona |
| `src/components/dashboard/marketing/shared/PriorityIndicator.tsx` | Indicateur de priorité |
| `src/components/dashboard/marketing/shared/RecosQuotaBanner.tsx` | Bannière quota recommandations |
| `src/components/dashboard/shared/UpgradePrompt.tsx` | Prompt d'upgrade de plan |

### Hooks
| Fichier | Rôle |
|---|---|
| `src/hooks/useBusinessMetrics.ts` | Métriques business (revenue, AOV, GA4) |
| `src/hooks/useDiagnosticStats.ts` | Stats diagnostic via `diagnostic-performance` |
| `src/hooks/useDiagnosticSessions.ts` | Sessions détaillées via `diagnostic-performance` (includeDetails) |
| `src/hooks/useInsightsMetrics.ts` | Métriques insights (routine, écart panier, top produit) |
| `src/hooks/useMarketingRecommendations.ts` | State complet des recommandations marketing |
| `src/hooks/usePersonaPriorities.ts` | 3 personas prioritaires via `persona-priorities` |
| `src/hooks/usePersonaProfiles.ts` | Profils personas depuis la table `personas` (avec cache) |
| `src/hooks/usePersonaStats.ts` | Stats détaillées par persona via `persona-stats` |
| `src/hooks/useRevenueTimeseries.ts` | Timeseries revenue par jour/semaine/mois |
| `src/hooks/useUsageLimits.ts` | Limites du plan via `get-org-limits` (cache 5 min) |
| `src/hooks/use-mobile.tsx` | Détection mobile |
| `src/hooks/use-toast.ts` | Hook toast |

### Constants & Lib
| Fichier | Rôle |
|---|---|
| `src/constants/personas.ts` | Définitions hardcoded P1-P9 (fallback) : displayName, title, fullLabel, description |
| `src/lib/utils.ts` | Utilitaire `cn()` (clsx + tailwind-merge) |
| `src/lib/error-reporter.ts` | Reporter d'erreurs frontend : intercepte fetch, détecte les boucles, rapport vers portail admin |

### Core
| Fichier | Rôle |
|---|---|
| `src/App.tsx` | Point d'entrée : QueryClientProvider, BrowserRouter, AccessGate, Routes |
| `src/main.tsx` | Bootstrap React |
| `src/App.css` | Styles globaux |
| `src/index.css` | Tokens Tailwind / design system |
| `src/vite-env.d.ts` | Déclarations Vite |

### Types
| Fichier | Rôle |
|---|---|
| `src/types/diagnostic.ts` | Types TypeScript pour `DiagnosticSession` |
| `src/integrations/supabase/types.ts` | Types auto-générés (read-only) |
| `src/integrations/supabase/client.ts` | Client Supabase auto-configuré (read-only) |

### UI Components (shadcn/ui)
Tous dans `src/components/ui/` : accordion, alert-dialog, alert, aspect-ratio, avatar, badge, breadcrumb, button, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, form, hover-card, input-otp, input, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, switch, table, tabs, textarea, toast, toaster, toggle-group, toggle, tooltip

---

## 8. Secrets configurés

| Nom du secret | Usage |
|---|---|
| `SUPABASE_URL` | URL du projet Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service role |
| `SUPABASE_ANON_KEY` | Clé anon |
| `SUPABASE_PUBLISHABLE_KEY` | Clé publishable |
| `SUPABASE_DB_URL` | URL directe de la base |
| `LOVABLE_API_KEY` | Authentification Lovable AI Gateway |
| `ANTHROPIC_API_KEY` | API Anthropic (Claude) |
| `PERPLEXITY_API_KEY` | API Perplexity (managed by connector) |
| `GEMINI_API_KEY` | API Google Gemini |
| `MONITORING_API_KEY` | Clé d'authentification portail admin (report-error, get-org-limits) |
| `USAGE_STATS_API_KEY` | Clé d'authentification get-usage-stats |
| `ORGANIZATION_ID` | ID de l'organisation Ouate côté portail admin |
| `DIAGNOSTIC_WEBHOOK_SECRET` | Secret de validation du webhook diagnostic |
| `SHOPIFY_STOREFRONT_ACCESS_TOKEN` | Token Storefront API Shopify |
| `SHOPIFY_ACCESS_TOKEN` | Token Shopify (général) |
| `SHOPIFY_ADMIN_ACCESS_TOKEN` | Token Admin API Shopify |
| `SHOPIFY_WEBHOOK_SECRET` | Secret HMAC webhook orders/paid |
| `SHOPIFY_CHECKOUT_WEBHOOK_SECRET` | Secret HMAC webhook checkouts/create |
| `KLAVIYO_API_KEY` | Clé API Klaviyo |
| `GA4_PROPERTY_ID` | ID de la propriété GA4 |
| `GA4_SERVICE_ACCOUNT_EMAIL` | Email du service account GA4 |
| `GA4_SERVICE_ACCOUNT_PRIVATE_KEY` | Clé privée RSA du service account GA4 |

---

### Storage Buckets

| Bucket | Public |
|---|---|
| `csv-imports` | Oui |
