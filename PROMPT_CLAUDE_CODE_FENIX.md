# PROMPT CLAUDE CODE - Application FENIX Stats

## CONTEXTE PROJET

Tu travailles sur **FENIX Stats**, une application web HTML autonome (fichier unique) pour le suivi statistique des joueurs du centre de formation FENIX Toulouse (handball professionnel, Starligue).

**Fichier principal** : `Appli WEB TOTAL.html` (ou `fenix-stats-v3.html`)

---

## ARCHITECTURE TECHNIQUE

### Stack
- **HTML/CSS/JS** pur (fichier unique, pas de build)
- **SheetJS (xlsx.js)** pour parser les fichiers Excel
- **Canvas** pour les graphiques
- **LocalStorage** pour sauvegarder les analyses coach
- **Conçu pour iPad** (offline, responsive)

### Structure des données Excel (20 colonnes)
```javascript
const COLS = {
    position: 0,      // Numéro d'action / timing
    rencontre: 1,     // Nom du match (ex: "J01 FENIX-AIX")
    club: 2,          // "FENIX" ou nom adversaire
    phase_att: 3,     // Phase attaque (+, -, 6v6...)
    ge: 4,            // Gardien/Espace (Pen, 6m, 9m, Aile...)
    defense: 5,       // Type défense
    resultat: 6,      // But, Tir raté, PB, PO, Jet franc
    joueur: 7,        // Nom du tireur
    finalite: 8,      // Tir arrêté, Poteau...
    enclenchement: 9, // Type d'enclenchement (Jeu placé, CA, etc.)
    gardien: 10,      // Nom du gardien
    position_tir: 11, // Position de tir
    field_position: 12, // Zone terrain
    periode: 13,      // 1 ou 2 (mi-temps)
    possession: 14,   // Numéro possession
    position_terrain: 15,
    action_joueur: 16, // Joueurs impliqués (séparés par ;)
    action_att: 17,   // Actions ATT (PD, PD DG...) séparées par ;
    action_def: 18,   // Actions DEF séparées par ;
    impact: 19        // Coordonnées impact "x;y"
};
```

---

## PAGES EXISTANTES

### 1. 📊 Dashboard
- Filtre multi-sélection des matchs (checkboxes)
- Stats FENIX vs Adversaire (moyenne si plusieurs matchs, total si 1 match)
- Indicateurs : Possessions, Buts, % Réussite, PB, Pen obtenus, Neutralisé
- Bouton 📈 pour graphique modal (multi-stats, filtre période MT1/MT2)
- Tableau récap joueurs

### 2. 🏆 Match
- Terrain avec nuage de points (canvas)
- Stats par équipe (FENIX / Adversaire)
- Filtres : Match, GE

### 3. 🔍 Analyse (NOUVEAU)
- **Timeline** : 2 courbes (FENIX bleu, Adversaire rouge) montrant l'évolution du score
- **Moments clés** : Détection des séquences (3+ buts d'affilée)
- **Analyse IA** : Diagnostic auto victoire/défaite avec causes
- **Analyse Coach** : Zone texte sauvegardée en local par match
- **Indicateurs** : Comparatif visuel avec couleurs (avantage/désavantage)
- **Chat IA** : Questions en langage naturel
  - Enclenchements (comment on a marqué)
  - Supériorités numériques (+/-)
  - Meilleur buteur, gardien, pertes de balle...

### 4. 👥 Joueurs
- Cartes joueurs avec stats
- Modal détaillée match par match

### 5. ⭐ Notes
- Actions ATT+/-, DEF+/-
- Calcul de notes

### 6. 🥅 Gardiens
- Stats gardiens (arrêts, %)

### 7. 🎯 Impact
- Visualisation des impacts de tir

---

## COULEURS FENIX

```css
--fenix-blue: #0A2463;
--fenix-blue-light: #1E3A8A;
--fenix-success: #10B981; /* Buts, positif */
--fenix-danger: #EF4444;  /* Tirs ratés, négatif */
--fenix-warning: #8B4513; /* PB (marron) */
```

---

## AMÉLIORATIONS POSSIBLES

### Prioritaires
1. **Connecter le Chat IA à l'API Claude** pour des réponses plus intelligentes
2. **Affiner la timeline** : ajouter marqueurs mi-temps, minutes si disponibles
3. **Exporter l'analyse** en PDF
4. **Comparer plusieurs matchs** dans la page Analyse

### Fonctionnalités à ajouter
- Heatmaps par joueur (zones de tir favorites)
- Tendances sur plusieurs matchs (progression/régression)
- Stats par poste (ailier, pivot, arrière...)
- Alertes automatiques (ex: joueur en difficulté)
- Mode présentation pour briefing équipe

### Technique
- PWA (Service Worker pour offline)
- Photos joueurs en base64 intégrées
- Optimisation performance (gros fichiers Excel)

---

## CONVENTIONS DE CODE

- Pas de frameworks (vanilla JS)
- Fonctions préfixées par page : `updateDashboard()`, `updateAnalysePage()`
- Variables globales : `DATA`, `MATCHS`, `JOUEURS_FENIX`, `COLS`
- Canvas pour graphiques personnalisés
- LocalStorage pour persistance : `fenix_coach_analyses`

---

## COMMANDE TYPE

```
Améliore [FONCTIONNALITÉ] dans l'application FENIX Stats.
Le fichier est "Appli WEB TOTAL.html".
[DÉTAILS DE CE QUE TU VEUX]
```

---

## EXEMPLE DE DEMANDE

"Ajoute une heatmap des tirs par joueur dans la page Joueurs. Quand on clique sur un joueur, affiche un terrain avec ses positions de tir colorées par résultat (vert = but, rouge = raté). Utilise la colonne impact (x;y) pour les coordonnées."

