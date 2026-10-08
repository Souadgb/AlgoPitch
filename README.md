# AlgoPitch

Classement des meilleurs analystes du club : chaque membre publie un **prix cible** et une **date limite**
sur un ticker. Si le cours touche la cible avant la date limite, la prédiction est réussie, sinon elle échoue.

- **Backend** : Django 6.1 + Django REST Framework (`backend/`)
- **Frontend** : React 19 + TypeScript + Vite + TanStack Query + Tailwind 4 (`frontend/`)
- **Données de marché** : yfinance (remplaçable par FMP, voir plus bas)

## Lancer le projet en local

Deux terminaux :

```powershell
# Terminal 1 — API Django (http://127.0.0.1:8000)
cd backend
python -m venv .venv            # première fois uniquement
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\python manage.py migrate
.venv\Scripts\python manage.py createsuperuser   # compte admin (optionnel)
.venv\Scripts\python manage.py seed_demo         # membres et prédictions fictifs (optionnel)
.venv\Scripts\python manage.py runserver
```

```powershell
# Terminal 2 — Frontend (http://localhost:5173)
cd frontend
npm install                     # première fois uniquement
npm run dev
```

Ouvre **http://localhost:5173**. Vite redirige `/api` et `/admin` vers Django.

- **Inscription** : réservée aux adresses `@ens.etsmtl.ca`. En local, aucun e-mail n'est envoyé : le lien de
  vérification s'affiche dans le terminal Django.
- **Compte de démo** (après `seed_demo`) : `demo.camille@ens.etsmtl.ca` / `demo-AlgoPitch-2026`
- **Administration** : http://localhost:5173/admin/

## Clôture quotidienne des prédictions

```powershell
cd backend
.venv\Scripts\python manage.py resolve_predictions
```

À lancer une fois par jour, après la clôture des marchés (manuellement ou via le Planificateur de tâches
Windows). `--date AAAA-MM-JJ` permet de simuler un autre jour.

## Règles

| Règle | Détail |
|---|---|
| Sens | Déduit du prix cible : au-dessus du cours = hausse, en dessous = baisse |
| Succès | Le **plus haut** du jour (hausse) ou le **plus bas** du jour (baisse) touche la cible avant la date limite |
| Jour de publication | Ignoré : seules les séances suivantes comptent |
| Garde-fous | Écart d'au moins ±5 % avec le cours actuel ; date limite entre 7 et 365 jours |
| Après publication | Ni modification ni suppression ; une seule prédiction en cours par ticker et par membre |
| Données manquantes | Si yfinance ne répond pas, la prédiction reste ouverte et sera revérifiée au prochain passage |

Les garde-fous se règlent dans `backend/config/settings.py` (`PREDICTION_*`). Ils sont aussi recopiés dans
`frontend/src/lib/rules.ts` pour la validation en direct.

### Classement et étoiles

- **Score** : borne basse de l'intervalle de Wilson à 95 % du taux de succès, calculée sur les prédictions
  clôturées. Elle pénalise les petits échantillons : 1/1 donne un score de 20,7, et 19/20 donne 76,4.
- **Départage** : à score égal, celui qui a le plus de prédictions clôturées passe devant.
- **Étoiles** : percentile du score parmi les membres classés, de ½ à 5 étoiles. Le premier a 5 étoiles.
- Les membres qui n'ont encore aucune prédiction clôturée apparaissent dans « En attente de classement ».

## Passer à Financial Modeling Prep (FMP)

Le fournisseur de prix est isolé derrière `markets/providers/base.py` (`PriceProvider`). Pour passer à FMP :

1. Créer `markets/providers/fmp_provider.py` qui implémente `search`, `get_quote`, `get_last_price` et
   `get_daily_bars`.
2. Dans `settings.py` : `PRICE_PROVIDER = 'markets.providers.fmp_provider.FMPProvider'`.

## Tests

```powershell
cd backend; .venv\Scripts\python manage.py test
cd frontend; npm run build; npm run lint
```

## Limites connues (V1)

- **Splits d'actions** : yfinance ajuste l'historique après un split, alors que le prix de départ et le prix
  cible enregistrés ne sont pas ajustés. Une prédiction en cours pendant un split peut donc être faussée.
- **Étoiles par percentile** : avec très peu de membres classés, elles sont très contrastées (avec 2 membres,
  l'un a 5 étoiles et l'autre ½).
- SQLite et serveur de développement uniquement : il faudra PostgreSQL et une configuration de production
  (secret key, DEBUG, SMTP) avant de déployer.
