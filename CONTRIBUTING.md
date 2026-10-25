# 🗺️ Roadmap — SketchShop

Bienvenue sur la feuille de route (**Roadmap**) de **SketchShop** ! Ce document recense les idées, améliorations prévues et fonctionnalités à venir pour faire évoluer l'application d'un mini-outil de dessin vers un studio créatif complet et innovant, alliant le dessin géométrique/pixel et la puissance de l'IA générative.

---

## 🎯 Piliers Stratégiques

1. **Manipulation & Vectoriel** : Donner le plein contrôle sur chaque élément graphique (sélection, déplacement, redimensionnement).
2. **IA Créative & Assistive** : Faire de l'IA un véritable co-créateur graphique interactif (pas seulement un générateur "one-shot").
3. **Studio Graphique (Core)** : Enrichir la boîte à outils essentielle (texte, pipette, seau de peinture, modes de fusion).
4. **Export, Sauvegarde & Workflow** : Permettre d'enregistrer, recharger, exporter en haute qualité (SVG vectoriel, PNG, projet `.sketch`).
5. **Performance & Collaboration** : Maintenir un framerate fluide et ouvrir la porte au temps réel.

---

## 🚀 Phase 1 : Manipulation d'Objets & Transformations *(Priorité Immédiate)*

> *Objectif : Passer d'un dessin purement "pixel figé" à une vraie manipulation d'objets éditables.*

- [x] **Boîte de délimitation (Bounding Box) & Sélection :**
  - Sélectionner un objet / forme au clic ou par zone rectangulaire (lasso / cadre de sélection).
  - Affichage d'un rectangle de sélection avec 8 poignées d'ancrage (coins et bords).
- [ ] **Transformations interactives :**
  - **Déplacement (Move / Drag & Drop)** : Glisser-déposer un objet à n'importe quel endroit du canvas.
  - **Redimensionnement (Scale / Resize)** : Agrandir ou réduire proportionnellement (`Shift`) ou librement.
  - **Rotation** : Poignée de rotation pour pivoter les formes avec angle en degrés (magnétisme à 15°/45° avec `Shift`).
- [ ] **Opérations sur les objets :**
  - Duplication rapide (`Ctrl + D` ou `Alt + Drag`).
  - Suppression (`Suppr` / `Backspace`).
  - Alignements automatiques (centrer horizontalement/verticalement, aligner à gauche/droite).
  - Ordre d'empilement (Z-index : *Mettre au premier plan*, *Reculer d'un plan*).
  - Miroir horizontal & vertical (Flip X / Flip Y).

---

## 🤖 Phase 2 : Super-pouvoirs IA (Gemini & Vision)

> *Objectif : Une IA interactive qui comprend le contexte graphique et collabore avec l'artiste.*

- [ ] **Édition itérative & conversationnelle :**
  - Pouvoir affiner la scène générée (*ex : "ajoute une lune dans le ciel"*, *"change la couleur du toit en bleu"* sans tout redessiner à zéro).
- [ ] **Inpainting / Génération ciblée par zone :**
  - Sélectionner une zone ou un calque précis et demander à l'IA de générer uniquement à l'intérieur de cette zone.
- [ ] **Image-to-Canvas (Vectorisation stylisée) :**
  - Importer une image/photo et demander à Gemini de la réinterpréter en 20 à 40 formes géométriques p5.js éditables.
- [ ] **Générateur de Palettes Harmoniques IA :**
  - Proposer 5 couleurs assorties selon une ambiance ou un mot-clé (*"Cyberpunk"*, *"Pastel été"*, *"Forêt mystique"*).
- [ ] **Presets de styles graphiques :**
  - Boutons de style pour orienter le prompt (*Pixel Art*, *Flat Design*, *Bauhaus / Géométrique*, *Vaporwave*, *Minimaliste*).

---

## 🎨 Phase 3 : Boîte à Outils Créative (Core Tools)

> *Objectif : Compléter la trousse à outils indispensable pour les illustrateurs et designers.*

- [ ] **Outil Texte riche :**
  - Saisie de texte directement sur le canvas avec choix de polices rétro / modernes, taille, couleur et alignement.
- [ ] **Pipette (Color Picker / Eyedropper) :**
  - Prélever n'importe quelle couleur sur le canvas d'un simple clic.
- [ ] **Remplissage (Paint Bucket / Flood Fill) :**
  - Remplir une zone délimitée ou une forme fermée avec la couleur active.
- [ ] **Outils géométriques supplémentaires :**
  - Étoile, polygone régulier, ellipse libre, flèche vectorielle.
- [ ] **Pinceaux & Styles de tracé :**
  - Pinceau pixel 1px précis avec magnétisme pour le pixel art.
  - Pinceau calligraphique / néon avec dégradé.
  - Outil Tracé droit (maintenir `Shift` pour contraindre les angles à 0°, 45°, 90°).

---

## 📑 Phase 4 : Calques & Compositing Avancés

- [x] **Modes de fusion des calques (Blend Modes) :**
  - *Multiply*, *Screen*, *Overlay*, *Darken*, *Lighten*.
- [x] **Gestion des calques améliorée :**
  - Duplication et fusion de calques (*Merge Down*).
  - Masques de calque ou masques d'écrêtage (*Clipping Mask*).
  - Verrouillage de la transparence (dessiner uniquement sur les pixels existants).

---

## 💾 Phase 5 : Gestion de Projet, Sauvegarde & Export

- [ ] **Format de projet natif `.sketch` :**
  - Sauvegarder et recharger un projet complet au format JSON (contenant les calques, objets vectoriels, dimensions et historique).
  - Sauvegarde automatique locale (LocalStorage / IndexedDB) pour ne jamais perdre son travail lors d'un rafraîchissement.
- [ ] **Export vectoriel SVG :**
  - Exporter directement la scène générée par l'IA ou les formes géométriques en vrai format vectoriel SVG infiniment zoomable.
- [ ] **Options d'export étendues :**
  - Choix de l'échelle d'exportation (x1, x2, x4 pour un pixel art net en haute résolution).
  - Export GIF animé (pour capturer le processus de dessin).

---

## ⚡ Phase 6 : Ergonomie, DevOps & Temps Réel

- [ ] **Panneau d'historique visuel :**
  - Liste chronologique des actions pour revenir en arrière à une étape précise en un clic (au-delà du simple Undo/Redo).
- [ ] **Panneau de raccourcis clavier (`?`) :**
  - Modal d'aide rappelant tous les raccourcis (`B` pour Brush, `E` pour Eraser, `V` pour Move, `Space + Drag` pour Pan).
- [ ] **Déploiement en ligne & CI/CD :**
  - Hébergement du backend Node/Express sur Render / Fly.io pour rendre l'IA accessible à tous les visiteurs en ligne.
  - Déploiement automatique du frontend sur GitHub Pages via GitHub Actions.
- [ ] **Collaboration temps réel (Futur) :**
  - Mode multijoueur via WebSockets pour dessiner à plusieurs sur le même canvas en temps réel.

---

> 💡 *Cette roadmap est un document vivant. N'hésite pas à cocher les cases au fur et à mesure des Pull Requests ou à ajouter de nouvelles idées inspirées par vos utilisateurs !*
