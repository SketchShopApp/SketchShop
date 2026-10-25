# Directives & Guide d'Architecture — SketchShop

Ce document est destiné aux nouveaux collaborateurs du projet ainsi qu'aux assistants IA pour comprendre le fonctionnement global de **SketchShop**, son architecture, ses flux de données et la méthode de travail à respecter.

---

## 1. Présentation du Projet

**SketchShop** est une application web d'édition graphique matricielle inspirée des logiciels de retouche photo (Photoshop) et du creative coding. L'application permet la manipulation de calques, le dessin dynamique à la souris ou tablette, l'application de filtres visuels (Threshold, Pixelate, ASCII), l'assistance par IA générative pour créer des éléments vectoriels sur le canevas, ainsi que l'export haute fidélité d'images.

### Stack Technique
- **Framework & Langage** : React 19, TypeScript, Vite.
- **Moteur Graphique** : [P5.js](https://p5js.org/) via `@p5-wrapper/react`.
- **Gestion d'État Global** : [Zustand](https://github.com/pmndrs/zustand).
- **Navigation & Canvas Infini** : `react-zoom-pan-pinch`, `react-router`.
- **Styles & Animations** : Tailwind CSS v4, Motion (`motion/react`), `pixelarticons`.

---

## 2. Structure et Architecture du Codebase

```text
src/
├── assets/                 # Logos et médias statiques
├── core/                   # Définitions de types purs et logique métier centrale
│   ├── types.ts            # Outils, calques, scènes IA, styles, réglages de dessin
│   └── interpreter.ts      # Moteur d'interprétation des commandes graphiques IA
├── features/               # Fonctionnalités métier modulaires
│   ├── ai-chat/            # Assistant IA (ChatPanel, intégration prompt -> canvas)
│   ├── canvas/             # Composant P5Canvas, sketch p5.js et pipeline de filtres
│   │   ├── Canvas.tsx      # Boucle de rendu P5, interaction souris et calques p5.Graphics
│   │   └── filters.ts     # Filtres pixel (Threshold, Pixelate, ASCII)
│   ├── layers/             # Gestion des calques (SideBarLayer, LayerCard, drag-and-drop)
│   └── toolbar/            # Barre d'outils latérale (ToolBox) et barre contextuelle (ContextualBar)
├── hooks/                  # Hooks personnalisés (useKeyboardShortcuts pour pan & undo/redo)
├── layout/                 # Vues et conteneurs de haut niveau
│   ├── Workshop.tsx        # Espace de travail principal de l'éditeur
│   ├── PinZoomPinch.tsx    # Conteneur de zoom/pan autour du canevas
│   ├── CreateFile.tsx      # Écran de création / presets de documents
│   └── ExportPage.tsx      # Page d'exportation d'images (PNG, JPEG, WebP)
├── shared/components/      # Composants UI partagés (Navbar, Button, LayerCard)
└── store/
    └── useEditorStore.ts   # Store unique Zustand (source de vérité globale)
```

---

## 3. Le Store Global Zustand (`useEditorStore`) : Rôle et Fonctionnement

Le store global défini dans [`src/store/useEditorStore.ts`](file:///c:/Users/jeanp/Documents/webDev/mini-photoshop/mini-photoshop-vue/src/store/useEditorStore.ts) est la **source unique de vérité** de l'application. Il synchronise l'interface React avec l'exécution impérative de P5.js.

### Principales responsabilités du Store :
1. **État du Canevas (`canvasDimensions`, `canvasBackground`)** :
   - Dimensions en pixels (largeur, hauteur) et fond (couleur hexadécimale ou `'transparent'`).
   - Méthodes : `setCanvasDimensions`, `setCanvasBackground`, `resetEditor`.
2. **Outil Actif (`activeTool`)** :
   - Outil actuellement sélectionné (`'brush'`, `'eraser'`, `'select'`, `'move'`, `'square'`, `'shapes'`, etc.).
3. **Réglages du Dessin (`settings: DrawingSettings`)** :
   - Couleur de tracé, taille du pinceau (`brushSize`), opacité, mode dynamique (`isDynamicBrush`), paramètres des filtres (`pixelSize`, `threshold`, `asciiScale`).
4. **Gestion des Calques (`layers: Layer[]`)** :
   - Pile ordonnée des calques avec leurs propriétés : `id`, `name`, `isVisible`, `isLocked`, `isActive`, `opacity`.
   - Méthodes : `addLayer`, `deleteActiveLayer`, `setActiveLayer`, `toggleVisibility`, `toggleLock`, `updateActiveLayerOpacity`, `setLayers`.
5. **Gestion de l'Historique (Undo / Redo)** :
   - Conserve une pile de `HistorySnapshot` (plafonnée à 30 états par défaut).
   - Chaque instantané sauvegarde : l'état des calques, les dimensions, l'arrière-plan et le dictionnaire `layerData` (Map contenant les DataURLs des calques).
   - Méthodes : `saveHistory()`, `undo()`, `redo()`.
6. **Filtres et Effets Graphiques (`applyFilter`)** :
   - Enregistre une intention de filtre avec un `timestamp` (`{ type, timestamp }`).
   - Permet au sketch P5 de détecter le nouvel événement de filtrage et d'appliquer la transformation sur le calque actif.
7. **Assistant IA (`pendingAiScene`, `isAiChatOpen`)** :
   - Reçoit les scènes générées par l'IA et transmet l'ordre d'application au canevas.
8. **Persistance & Synchronisation d'Export (`previewUrl`, `layerData`)** :
   - `previewUrl` : DataURL global de l'image composée générée par P5, utilisé par `ExportPage`.
   - `layerData: Map<string, string>` : Données graphiques de chaque calque, permettant de recharger l'état visuel lors des opérations Undo/Redo ou de redimensionnement.

---

## 4. Fonctionnement Détaillé des Fonctionnalités

### 4.1. Le Moteur P5.js et le Système de Calques
Dans [`src/features/canvas/Canvas.tsx`](file:///c:/Users/jeanp/Documents/webDev/mini-photoshop/mini-photoshop-vue/src/features/canvas/Canvas.tsx) :
- Chaque calque de l'application possède une instance hors-écran de **`p5.Graphics`** stockée dans une Map (`layerGraphics`).
- Dans la méthode `draw()` de P5 :
  1. Le fond du canevas est repeint (ou effacé si transparent).
  2. Chaque calque visible est composité sur le canevas principal avec sa propre opacité (`p5.tint(...)` et `p5.image(...)`).
  3. Si l'utilisateur clique et glisse sur le canevas, l'outil actif dessine exclusivement sur le `p5.Graphics` du calque actif (à condition qu'il ne soit pas verrouillé).
  4. À la fin du trait (`mouseReleased`) ou périodiquement, l'image est exportée en DataURL vers le store pour mettre à jour l'historique et l'aperçu.

### 4.2. Les Filtres d'Image 2D
Définis dans [`src/features/canvas/filters.ts`](file:///c:/Users/jeanp/Documents/webDev/mini-photoshop/mini-photoshop-vue/src/features/canvas/filters.ts) :
- Les filtres manipulent directement le `CanvasRenderingContext2D` du `p5.Graphics` actif via `getImageData` et `putImageData`.
- **Threshold** : Binarise l'image en noir et blanc selon le seuil de luminance.
- **Pixelate** : Moyenne les couleurs de blocs de taille `pixelSize` pour un effet rétro pixel art.
- **ASCII** : Convertit les niveaux de gris en caractères typographiques monochromes (`@`, `#`, `*`, etc.).

### 4.3. L'Assistant IA & L'Interpréteur Graphique
- L'utilisateur saisit un prompt dans [`ChatPanel.tsx`](file:///c:/Users/jeanp/Documents/webDev/mini-photoshop/mini-photoshop-vue/src/features/ai-chat/ChatPanel.tsx).
- Une requête est envoyée à `/api/chat-to-canvas`, qui retourne un objet structuré `DrawingScene` contenant une liste de commandes graphiques vectorielles (`circle`, `rect`, `line`, `triangle`, `text`).
- [`interpreter.ts`](file:///c:/Users/jeanp/Documents/webDev/mini-photoshop/mini-photoshop-vue/src/core/interpreter.ts) convertit ces commandes en primitives de tracé P5 directement sur le calque actif.

### 4.4. Navigation, Raccourcis et Pan/Zoom
- [`PinZoomPinch.tsx`](file:///c:/Users/jeanp/Documents/webDev/mini-photoshop/mini-photoshop-vue/src/layout/PinZoomPinch.tsx) enveloppe le canevas avec `react-zoom-pan-pinch` pour permettre le zoom à la molette (`Ctrl + Molette`) et le déplacement.
- [`useKeyboardShortcuts.ts`](file:///c:/Users/jeanp/Documents/webDev/mini-photoshop/mini-photoshop-vue/src/hooks/useKeyboardShortcuts.ts) intercepte la barre d'espace pour basculer temporairement sur l'outil `move` (Pan main), et gère `Ctrl+Z` / `Ctrl+Shift+Z` pour Undo/Redo.

---

## 5. Comment Développer une Nouvelle Fonctionnalité

Pour ajouter proprement une nouvelle fonctionnalité, suivez ce guide étape par étape :

### Cas 1 : Ajouter un Nouvel Outil de Dessin (ex: Outil Pipette, Outil Cercle, Outil Ligne)
1. **Déclarer l'outil dans les types** :
   - Ouvrir [`src/core/types.ts`](file:///c:/Users/jeanp/Documents/webDev/mini-photoshop/mini-photoshop-vue/src/core/types.ts) et ajouter le nom de l'outil au type `Tool` (ex: `| 'line'`).
2. **Ajouter le bouton dans la barre d'outils** :
   - Modifier [`src/features/toolbar/ToolBox.tsx`](file:///c:/Users/jeanp/Documents/webDev/mini-photoshop/mini-photoshop-vue/src/features/toolbar/ToolBox.tsx) pour insérer l'icône, l'action `setActiveTool('line')` et le style de sélection actif.
3. **Ajouter les réglages spécifiques (si nécessaire)** :
   - Si l'outil nécessite de nouveaux paramètres, les déclarer dans `DrawingSettings` ([`src/core/types.ts`](file:///c:/Users/jeanp/Documents/webDev/mini-photoshop/mini-photoshop-vue/src/core/types.ts)).
   - Les initialiser dans `settings` dans [`src/store/useEditorStore.ts`](file:///c:/Users/jeanp/Documents/webDev/mini-photoshop/mini-photoshop-vue/src/store/useEditorStore.ts).
   - Ajouter les contrôles UI correspondants dans [`src/features/toolbar/ContextualBar.tsx`](file:///c:/Users/jeanp/Documents/webDev/mini-photoshop/mini-photoshop-vue/src/features/toolbar/ContextualBar.tsx).
4. **Implémenter le comportement dans le sketch P5** :
   - Ouvrir [`src/features/canvas/Canvas.tsx`](file:///c:/Users/jeanp/Documents/webDev/mini-photoshop/mini-photoshop-vue/src/features/canvas/Canvas.tsx).
   - Dans `mousePressed`, `draw` et/ou `mouseReleased`, ajouter la gestion des coordonnées et du tracé sur le calque actif (`g`).
   - Ne pas oublier d'appeler `needsSync = true; syncToStore(); saveHistoryProp?.();` à la fin de l'interaction pour sauvegarder dans l'historique Undo/Redo.

### Cas 2 : Ajouter un Nouveau Filtre Graphique
1. **Créer la fonction de traitement** :
   - Ajouter la fonction d'effet dans [`src/features/canvas/filters.ts`](file:///c:/Users/jeanp/Documents/webDev/mini-photoshop/mini-photoshop-vue/src/features/canvas/filters.ts).
2. **Mettre à jour le Store et les Types** :
   - Étendre le type de filtre dans `applyFilter` et `triggerFilter` dans [`src/store/useEditorStore.ts`](file:///c:/Users/jeanp/Documents/webDev/mini-photoshop/mini-photoshop-vue/src/store/useEditorStore.ts).
3. **Brancher le filtre dans P5** :
   - Dans `applyFilterEffect` dans [`src/features/canvas/Canvas.tsx`](file:///c:/Users/jeanp/Documents/webDev/mini-photoshop/mini-photoshop-vue/src/features/canvas/Canvas.tsx), ajouter le nouveau `case` dans le switch.
4. **Exposer le filtre dans l'interface** :
   - Ajouter l'option dans le menu déroulant de [`src/features/layers/SideBarLayer.tsx`](file:///c:/Users/jeanp/Documents/webDev/mini-photoshop/mini-photoshop-vue/src/features/layers/SideBarLayer.tsx) ou dans [`src/features/toolbar/ToolSettings.tsx`](file:///c:/Users/jeanp/Documents/webDev/mini-photoshop/mini-photoshop-vue/src/features/toolbar/ToolSettings.tsx).

---

## 6. Méthode de Travail et Workflow Git

Lors de vos interventions de développement (collaborateur ou IA), les règles suivantes doivent être rigoureusement respectées :

1. **Une branche par fonctionnalité** :
   - Ne jamais développer directement sur la branche principale (`main`).
   - Créer une nouvelle branche dédiée pour chaque nouvelle fonctionnalité (ex: `feature/nom-de-la-fonctionnalite` ou `fix/nom-du-bug`).
2. **Commits cadrés et propres** :
   - Réaliser des commits assez souvent avec des messages clairs et explicites.
   - Les commits doivent être créés **au nom de l'auteur du projet**.
3. **Fin de mission & Notification** :
   - À la fin de chaque fonctionnalité ou tâche, **prévenir explicitement que le travail est terminé** et résumer les modifications apportées.
4. **Validation et Merge Request** :
   - Ne pas fusionner directement dans la branche principale.
   - **Le propriétaire du projet lance lui-même la merge request (MR) et review le code.**