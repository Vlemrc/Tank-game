# 🚀 Tank Battle - Jeu Multijoueur en Next.js

Tank Battle est un jeu multijoueur en ligne où des tanks s'affrontent sur une carte 10x10 avec des projectiles qui rebondissent. Il est développé avec **Next.js**, **Socket.IO** et **WebRTC** pour la communication entre les joueurs.

---

## 📌 Fonctionnalités

- 🎮 **Multijoueur en temps réel** avec **Socket.IO**
- 🗺️ **Carte de 10x10 cases** générée aléatoirement
- 🎯 **Dernier survivant gagne la partie**

---

## 🛠️ Technologies Utilisées

- **Next.js** (App Router)
- **Socket.IO** (communication en temps réel)
- **WebRTC** (connexion P2P entre joueurs)

---

## 🚀 Installation

### 1️⃣ Prérequis

- Node.js
- npm ou yarn

### 2️⃣ Cloner le projet

```bash
 git clone https://github.com/ton-repo/tank-battle.git
 cd tank-battle
```

### 3️⃣ Installer les dépendances

```bash
 npm install # ou yarn install
```

### 4️⃣ Lancer le serveur Next.js

```bash
 npm run dev
```

### 5️⃣ Lancer le serveur WebSocket (Backend Node.js)

Dans un autre terminal :

```bash
 cd server
 npm install  # Installer les dépendances du backend
 node server/server.js
```

Le serveur tourne maintenant sur **http://localhost:3000** et le WebSocket sur **http://localhost:3001**.

---

## 🎮 Comment Jouer ?

1. Ouvrir **http://localhost:3000**
2. Entrer un **pseudo** et cliquer sur "Rejoindre"
3. Attendre que minimum **1 à 3 joueurs rejoignent**
4. Appuyer sur **"Lancer la partie"**
5. Utiliser les flèches du clavier pour **se déplacer**
6. **Espace** pour tirer
7. Survivre et éliminer les autres !

---

## 📌 Améliorations Futures

- 🔊 Ajout des effets sonores
- 🏆 Classement des joueurs (système de score)
- 🎨 Amélioration des graphismes et animations

---

## 🏆 Crédit

**Développé par :** Antony Dos Santos & Victor Lemercier
