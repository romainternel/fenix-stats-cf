# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projet

**FENIX Stats** — Application web de suivi statistique des joueurs du centre de formation FENIX Toulouse (handball professionnel, Starligue). Conçue pour iPad, offline, utilisée par le staff technique.

## Architecture

**Fichier unique** : `FENIX-HANDBALL-CF-SUIVI.html` (~5600 lignes). Pas de build, pas de framework — HTML/CSS/JS vanilla. On ouvre le fichier directement dans le navigateur.

**Librairies externes (CDN)** :
- `xlsx.js` v0.18.5 — parsing des fichiers Excel
- `Chart.js` v4.4.0 — graphiques
- Google Fonts (Bebas Neue, Inter)

## Démarrage

Ouvrir `FENIX-HANDBALL-CF-SUIVI.html` directement dans un navigateur (double-clic ou Live Server). Aucune installation requise. Importer un fichier `.xlsx` via le bouton d'import pour charger les données.

## Structure des données

### Fichier Excel — colonnes (objet `COLS`)
```
position:0, rencontre:1, club:2, phase_att:3, ge:4, defense:5,
resultat:6, joueur:7, finalite:8, enclenchement:9, gardien:10,
position_tir:11, field_position:12, periode:13, possession:14,
position_terrain:15, action_joueur:16, action_att:17, action_def:18,
impact:19, saison:20
```
- `impact` : coordonnées `"x;y"` en % du but (vue face/ALG/ALD)
- `action_joueur`, `action_att`, `action_def` : valeurs séparées par `;`

### Feuilles Excel optionnelles
- **"Joueurs"** : colonnes `Nom` + `Poste` → charge `JOUEURS_TERRAIN` (positions sur le terrain)
- **"Temps de jeu"** : colonnes `Nom` + `J01`, `J02`... → charge `TEMPS_JEU`

### État global (variables JS)
```js
DATA           // Tableau brut de toutes les lignes Excel (tableau de tableaux)
MATCHS         // Liste des matchs uniques (ex: ["J01 FENIX-AIX", ...])
SAISONS        // Liste des saisons uniques
JOUEURS_FENIX  // Joueurs FENIX ayant tiré
GARDIENS_FENIX // Dérivé de JOUEURS_TERRAIN où poste === 'GB'
TEMPS_JEU      // { nomLower: { 'J01': minutes, ... } }
FIELD_POSITIONS // Zones de tir uniques
IMPACT_DOTS    // { alg: [], face: [], ald: [] } — points de tir par vue
GARDIEN_DOTS   // { alg: [], face: [], ald: [] } — arrêts gardien par vue
```

### Persistance
`localStorage` : `fenix_data` (DATA), `fenix_data_date`, `fenix_data_filename`, `fenix_temps_jeu`, `fenix_coach_analyses`

## Pages et navigation

Navigation via `refreshPage(page)` → appelle `update[PageName]Page()`.

| Page ID | Fonction principale | Contenu |
|---------|-------------------|---------|
| `dashboard` | `updateDashboard()` | Stats globales FENIX vs Adversaire, tableau joueurs |
| `match` | `updateMatchPage()` | Terrain canvas + nuage de points, stats équipes |
| `analyse` | `updateAnalysePage()` | Timeline score, moments clés, analyse coach |
| `joueurs` | `updateJoueursPage()` | Cartes joueurs, modal détaillée, terrain interactif |
| `notes` | `updateNotesPage()` | Actions ATT/DEF +/-, calcul de notes |
| `notegraph` | `updateNoteGraph()` | Graphique progression d'un joueur |
| `gardiens` | `updateGardiensPage()` | Stats gardiens, canvas arrêts par vue |
| `impact` | `updateImpactPage()` | Canvas impacts de tir (ALG/face/ALD) + sélecteur de zones |

## Seuils d'efficacité par poste (`EFF_SEUILS`)

Standards D1 Starligue 2024-25. Vert ≥ `hi`, Bleu ≥ `mid`, Rouge < `mid`.
```
PIV: hi=79, mid=74   AG: hi=74, mid=69   AD: hi=74, mid=69
DC:  hi=64, mid=59   ARD: hi=63, mid=58  ARG: hi=60, mid=55
GB:  hi=35, mid=30   (% arrêts)
```

## Conventions de code

- Fonctions préfixées par page : `updateDashboard()`, `updateMatchPage()`…
- `getSelectedMatches()` → retourne la liste des matchs cochés (filtre global)
- Canvas dessinés via `drawTerrain()`, `drawImpactCanvas()`, `drawGardienCanvas()`
- Couleurs FENIX en variables CSS : `--fenix-blue: #0A2463`, `--fenix-success: #10B981`, `--fenix-danger: #EF4444`, `--fenix-warning: #8B4513`
- Conçu pour iPad : touch-friendly, responsive, offline

## Références à explorer (Research Analyst)

- **handball.ai** — analytics handball IA
- **XPS Slideline** — outil d'analyse vidéo/stats pour le handball
- **Hudl, Statsbomb, InStat** — références analytics sport collectif général

## Agents BMAD

Agents globaux disponibles dans `C:\Users\gromi\.claude\agents\` :

| Commande | Agent | Rôle |
|----------|-------|------|
| "joue le Research Analyst" | `research-analyst.md` | Benchmark, challenge d'utilité, stats handball de référence |
| "joue le Brainstormer" | `brainstormer.md` | Idées sans filtre, inspiration cross-sport, vision 12 mois |
| "joue l'Analyst" | `analyst.md` | Brief, vision, cadrage du besoin |
| "joue le PM" | `product-manager.md` | PRD, features, priorités, critères d'acceptation |
| "joue le Designer" | `designer.md` | Maquettes ASCII, UX iPad, ergonomie |
| "joue l'Architect" | `architect.md` | Décisions techniques, impact sur le code existant |
| "joue le Scrum Master" | `scrum-master.md` | Découpage en stories atomiques |
| "joue le Developer" | `developer.md` | Implémentation des stories |
| "joue le QA" | `qa.md` | Validation, tests, feu vert pour git push |

Carte visuelle des agents : `agents-reference.html` (ouvrir dans le navigateur)
Livrables dans `docs/` (à créer) : `brief.md`, `prd.md`, `architecture.md`, `design/`, `stories/`, `qa/`, `research/`, `brainstorm/`

## Contexte de travail

- L'utilisateur préfère communiquer en **français**
- Dire **"sauvegarde"** pour que Claude mette à jour ce fichier CLAUDE.md avec l'état du projet

## État du projet / Roadmap

*(À mettre à jour à chaque session)*

### Session du 12/05/2026 — Ce qui a été fait
- Création du CLAUDE.md (ce fichier)
- GitHub CLI installé, repo créé : https://github.com/romainternel/fenix-stats-cf
- GitHub Pages activé : https://romainternel.github.io/fenix-stats-cf/
- Écran de connexion ajouté (mot de passe : Partage)
- Logo FENIX ajouté en favicon et sur l'écran de login
- 9 agents BMAD créés dans `C:\Users\gromi\.claude\agents\`
- Carte visuelle agents : `agents-reference.html`
- Agent schedulé lancé (audit Research+Brainstorm+Analyst) → mail à romainternel@gmail.com
  - Routine : https://claude.ai/code/routines/trig_01DAHvF3cUTL4KM7XqoeAUu5

### Fonctionnalités implémentées
- Import Excel multi-feuilles (données + joueurs + temps de jeu)
- Dashboard stats FENIX vs Adversaire (total ou moyenne/match)
- Terrain interactif avec positions joueurs (page Joueurs)
- Impact de tir sur 3 vues de but (ALG, face, ALD) avec filtres par zone
- Canvas gardien avec vue des arrêts
- Notes ATT/DEF avec calcul de scores
- Graphique progression joueur
- Seuils d'efficacité calibrés par poste (standards Starligue)
- Persistance localStorage

### Décision architecturale en attente
- **Éclater le fichier HTML unique** en `index.html` + `css/style.css` + `js/[page].js` — nécessaire avant d'ajouter de nouvelles features (fichier actuel : 663 Ko / 5634 lignes, risque de crash et saturation contexte Claude). Suivi d'un **hébergement GitHub Pages** pour accès iPad/phone sans transfert de fichier.

### Tâches futures identifiées
1. **Code couleur intelligent Impact** — Seuils contextuels par `poste × zone` (actuels : globaux par poste uniquement). Nécessite stats handball par field_position.
2. **Analyse zones préférentielles** — Clustering des X;Y par `field_position` pour identifier zones de réussite/échec par joueur (coaching individualisé).
3. **Connexion Chat IA à l'API Claude** — Remplacer les réponses générées localement.
4. **Export PDF** des analyses coach.
