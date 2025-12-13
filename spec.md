Bati est une application active où l'effort physique devient une aventure. Vous incarnez un héros dont le village grandit et se construit grâce à vos activités sportives. En accomplissant des quêtes et des aventures, vous gagnez des ressources pour développer votre village, affronter des monstres et interagir avec d'autres joueurs.

- DaisyUI
- Zustand
- Typescript
- React Native
- Expo
- [BiomeJS](https://biomejs.dev/)

-----------

# Spécification des Couleurs – Bati V2

**Style visé** : Minimaliste, Flashy, Cartoon

---

## 1. Palette de Couleurs

### 1.1. Couleurs Principales

| Couleur               | Code Hexadécimal | Usage Principal                                  |
|-----------------------|------------------|--------------------------------------------------|
| Bleu électrique       | `#3A86FF`        | Boutons, éléments interactifs, notifications   |
| Orange vif            | `#FF6B35`        | Récompenses, animations de victoire              |
| Vert menthe           | `#8BC34A`        | Santé, progression, éléments liés au Zen        |
| Violet profond        | `#8E24AA`        | Boss, défis spéciaux, éléments mystérieux       |

### 1.2. Couleurs Secondaires

| Couleur               | Code Hexadécimal | Usage Principal                                  |
|-----------------------|------------------|--------------------------------------------------|
| Jaune soleil          | `#FFD700`        | Animations, coffres, effets spéciaux            |
| Rose fluo             | `#FF4081`        | Interactions sociales, guildes                  |
| Turquoise             | `#00BCD4`        | Défis d'endurance, éléments aquatiques          |

### 1.3. Couleurs de Fond

| Couleur               | Code Hexadécimal | Usage Principal                                  |
|-----------------------|------------------|--------------------------------------------------|
| Gris clair            | `#F5F5F5`        | Arrière-plans, zones de texte                    |
| Noir profond          | `#121212`        | Textes, contours, éléments de contraste        |

### 1.4. Couleurs d'Accentuation

| Couleur               | Code Hexadécimal | Usage Principal                                  |
|-----------------------|------------------|--------------------------------------------------|
| Rouge flashy          | `#FF1744`        | Alertes, défaites, boss dangereux                |
| Vert fluo             | `#76FF03`        | Succès, quêtes validées, ressources gagnées     |

---

## 2. Règles d'Utilisation

### 2.1. Boutons et Éléments Interactifs

- **Boutons principaux** : Utiliser le **Bleu électrique (`#3A86FF`)** pour les actions principales.
- **Boutons secondaires** : Utiliser l'**Orange vif (`#FF6B35`)** pour les actions secondaires ou les récompenses.
- **Effets au survol** : Ajouter un dégradé ou une ombre avec le **Jaune soleil (`#FFD700`)** pour un effet dynamique.

### 2.2. Animations et Récompenses

- **Ouverture de coffre** : Utiliser un dégradé entre **Jaune soleil (`#FFD700`)** et **Orange vif (`#FF6B35`)**.
- **Effets de victoire** : Clignotement en **Vert fluo (`#76FF03`)** pour les gains de ressources.

### 2.3. Écran de Combat (Boss)

- **Arrière-plan** : **Violet profond (`#8E24AA`)** avec des motifs inspirés du boss.
- **Barre de vie du boss** : **Rouge flashy (`#FF1744`)** pour indiquer le danger.
- **Barre de vie du joueur** : **Vert menthe (`#8BC34A`)** pour la santé.

### 2.4. Écran Principal (Village)

- **Arrière-plan** : **Gris clair (`#F5F5F5`)** pour un aspect épuré.
- **Bâtiments et éléments** : Utiliser des couleurs vives (**Bleu électrique**, **Orange vif**, **Rose fluo**) pour les mettre en valeur.
- **Texte** : **Noir profond (`#121212`)** pour une lisibilité optimale.

### 2.5. Quêtes et Aventures

- **Cadre des quêtes** : **Turquoise (`#00BCD4`)** pour les défis d'endurance.
- **Quêtes validées** : **Vert fluo (`#76FF03`)** pour indiquer le succès.
- **Quêtes en cours** : **Bleu électrique (`#3A86FF`)** pour l'engagement.

---

## 3. Exemples Visuels

### 3.1. Écran de Victoire

- **Arrière-plan** : Dégradé de **Vert menthe (`#8BC34A`)** à **Jaune soleil (`#FFD700`)**.
- **Texte** : "Victoire !" en **Orange vif (`#FF6B35`)** avec une ombre en **Vert fluo (`#76FF03`)**.
- **Animation** : Éclats de lumière en **Jaune soleil (`#FFD700`)**.

### 3.2. Écran de Défaite

- **Arrière-plan** : **Noir profond (`#121212`)** avec des reflets **Rouge flashy (`#FF1744`)**.
- **Texte** : "Défaite..." en **Rouge flashy (`#FF1744`)** avec un contour blanc.
- **Animation** : Effet de fumée ou d'explosion en **Rouge flashy (`#FF1744`)**.

---

## 4. Notes Supplémentaires

- **Contraste** : Toujours vérifier que le texte est lisible sur les fonds colorés (ex : texte **Noir profond** sur **Gris clair** ou **Jaune soleil**).
- **Accessibilité** : Éviter les combinaisons de couleurs difficiles à distinguer pour les daltoniens (ex : Rouge/Vert).
- **Effets Cartoon** : Utiliser des contours noirs épais pour les éléments stylisés (bâtiments, personnages).

---

assets/app-icon.png is the app icon file.
