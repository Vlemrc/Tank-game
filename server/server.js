const { Server } = require("socket.io")
const http = require("http")
const express = require("express")

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: "*",
  },
})

const MAP_SIZE = 10
let players = []
let projectiles = []
let projectileId = 0
let gameInProgress = false
let gameWinner = null
let gameEnded = false // Nouvelle variable pour suivre si le jeu est terminé

// Fonction pour calculer la distance entre deux points
const calculateDistance = (pos1, pos2) => {
  return Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2))
}

// Fonction pour trouver l'ennemi le plus proche
const findClosestEnemy = (currentPlayer) => {
  let closestEnemy = null
  let minDistance = Number.POSITIVE_INFINITY

  players.forEach((player) => {
    if (player.id !== currentPlayer.id && !player.eliminated) {
      const distance = calculateDistance(currentPlayer.position, player.position)
      if (distance < minDistance) {
        minDistance = distance
        closestEnemy = player
      }
    }
  })

  return closestEnemy
}

// Fonction pour calculer la direction vers une cible
const calculateDirection = (from, to) => {
  // Calculer les différences
  const dx = to.x - from.x
  const dy = to.y - from.y

  // Si la différence horizontale est plus grande
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx > 0 ? "right" : "left"
  } else {
    return dy > 0 ? "down" : "up"
  }
}

// Fonction pour réinitialiser complètement la partie
const resetGame = () => {
  players = []
  projectiles = []
  gameInProgress = false
  gameWinner = null
  gameEnded = false
  console.log("🔄 Réinitialisation complète du jeu")
}

// Fonction pour notifier les autres joueurs qu'un joueur a quitté après la fin de partie
const notifyPlayerLeftAfterGame = (playerId, playerName) => {
  console.log(`👋 Le joueur ${playerName} (${playerId}) a quitté après la fin de partie`)

  // Informer les autres joueurs qu'un joueur a quitté
  io.emit("playerLeftAfterGame", {
    playerId: playerId,
    playerName: playerName,
    remainingPlayers: players.filter((p) => p.id !== playerId).length,
  })

  // Retirer le joueur de la liste
  players = players.filter((p) => p.id !== playerId)

  // Si tous les joueurs ont quitté, réinitialiser complètement le jeu
  if (players.length === 0) {
    console.log("🧹 Tous les joueurs ont quitté, réinitialisation du jeu")
    resetGame()
  }
}

// Fonction pour vérifier si la partie est terminée
const checkGameEnd = () => {
  // Compter les joueurs encore en vie
  const alivePlayers = players.filter((player) => !player.eliminated)

  console.log(`🔍 Vérification fin de partie: ${alivePlayers.length} joueurs en vie sur ${players.length} total`)

  // Si un seul joueur est en vie, c'est le gagnant
  if (alivePlayers.length === 1 && players.length > 1) {
    gameWinner = alivePlayers[0]
    gameInProgress = false
    gameEnded = true // Marquer le jeu comme terminé

    // Annoncer le gagnant à tous les joueurs
    io.emit("gameOver", {
      winner: gameWinner,
      players: players,
    })

    console.log(`🏆 Partie terminée ! Le gagnant est ${gameWinner.name}`)

    // Réinitialiser les projectiles
    projectiles = []
    io.emit("projectilesUpdate", projectiles)

    return true
  }

  return false
}

// Fonction pour éliminer un joueur
const eliminatePlayer = (playerId) => {
  const playerIndex = players.findIndex((p) => p.id === playerId)

  if (playerIndex !== -1 && !players[playerIndex].eliminated) {
    // Marquer le joueur comme éliminé
    players[playerIndex].eliminated = true
    console.log(`☠️ Le joueur ${players[playerIndex].name} (${playerId}) a été éliminé !`)

    // Envoyer la mise à jour des joueurs à tous les clients
    io.emit("playersUpdate", players)

    // Envoyer un événement spécifique pour l'élimination
    io.emit("playerEliminated", {
      playerId: playerId,
      playerName: players[playerIndex].name,
    })

    // Vérifier si la partie est terminée
    return checkGameEnd()
  }

  return false
}

// Fonction pour gérer le départ d'un joueur
const handlePlayerLeave = (playerId) => {
  const playerIndex = players.findIndex((p) => p.id === playerId)

  if (playerIndex === -1) return

  const playerName = players[playerIndex].name

  // Si le jeu est terminé, notifier les autres joueurs
  if (gameEnded) {
    notifyPlayerLeftAfterGame(playerId, playerName)
    return
  }

  // Si le jeu est en cours, éliminer le joueur
  if (gameInProgress) {
    eliminatePlayer(playerId)
    return
  }

  // Si on est dans le lobby, simplement retirer le joueur
  players = players.filter((p) => p.id !== playerId)
  io.emit("playersUpdate", players)

  console.log(`👋 Le joueur ${playerName} (${playerId}) a quitté la partie`)
}

// Nouvelle approche pour la mise à jour des projectiles
const updateProjectiles = () => {
  if (!gameInProgress || players.length < 2) return

  // Tableau pour stocker les projectiles à supprimer
  const projectilesToRemove = []

  // Parcourir tous les projectiles et mettre à jour leur position
  projectiles.forEach((projectile) => {
    // Calculer la nouvelle position en fonction de la direction
    const newPosition = { ...projectile.position }

    switch (projectile.direction) {
      case "up":
        newPosition.y -= 0.3
        break
      case "down":
        newPosition.y += 0.3
        break
      case "left":
        newPosition.x -= 0.3
        break
      case "right":
        newPosition.x += 0.3
        break
    }

    // Vérifier si le projectile sort de la carte
    if (newPosition.x < 0 || newPosition.x >= MAP_SIZE || newPosition.y < 0 || newPosition.y >= MAP_SIZE) {
      projectilesToRemove.push(projectile.id)
      console.log(`🧱 Projectile ${projectile.id} a touché un mur`)
      return
    }

    // Vérifier la collision avec un joueur
    let collision = false
    let hitPlayerId = null

    players.forEach((player) => {
      // Ne pas vérifier les joueurs déjà éliminés
      if (player.eliminated) return

      // Ne pas vérifier le joueur qui a tiré
      if (player.id === projectile.playerId) return

      // Calculer la distance entre le projectile et le joueur
      const distance = calculateDistance(newPosition, player.position)

      // Si le projectile est suffisamment proche du joueur (dans un rayon de 0.7 unité)
      if (distance < 0.7) {
        collision = true
        hitPlayerId = player.id
        console.log(
          `💥 Projectile ${projectile.id} a touché le joueur ${player.id} (${player.name}) à distance ${distance}`,
        )
      }
    })

    if (collision) {
      // Marquer le projectile pour suppression
      projectilesToRemove.push(projectile.id)

      // Éliminer le joueur touché
      if (hitPlayerId) {
        eliminatePlayer(hitPlayerId)
      }
    } else {
      // Mettre à jour la position du projectile
      projectile.position = newPosition
    }
  })

  // Supprimer les projectiles qui ont touché quelque chose
  if (projectilesToRemove.length > 0) {
    projectiles = projectiles.filter((p) => !projectilesToRemove.includes(p.id))
  }

  // Envoyer les mises à jour à tous les clients
  io.emit("projectilesUpdate", projectiles)
}

// Exécuter la mise à jour des projectiles plus fréquemment (toutes les 50ms)
setInterval(updateProjectiles, 30)

io.on("connection", (socket) => {
  console.log(`🟢 Un joueur s'est connecté : ${socket.id}`)

  const spawnPositions = [
    { x: 0, y: 0 }, // Coin haut gauche
    { x: 9, y: 9 }, // Coin bas droit
    { x: 0, y: 9 }, // Coin bas gauche
    { x: 9, y: 0 }, // Coin haut droit
  ]

  // Stocker le dernier moment où le joueur a tiré
  const lastShot = {}

  socket.on("joinGame", (name) => {
    if (players.length < 4 && !gameInProgress && !gameEnded) {
      // Modifier la structure des joueurs pour inclure la direction
      const newPlayer = {
        id: socket.id,
        name,
        position: spawnPositions[players.length], // Assigner une position unique
        eliminated: false,
        direction: "up", // Direction par défaut: vers le haut
      }
      players.push(newPlayer)
      lastShot[socket.id] = 0 // Initialiser le temps du dernier tir
      console.log(`👤 ${name} rejoint la partie à la position:`, newPlayer.position)

      io.emit("playersUpdate", players)
      socket.emit("projectilesUpdate", projectiles) // Envoyer les projectiles existants au nouveau joueur
    } else if (gameInProgress || gameEnded) {
      // Informer le joueur que la partie est déjà en cours ou terminée
      socket.emit("gameInProgress")
    }
  })

  socket.on("startGame", () => {
    if (players.length >= 2 && !gameInProgress && !gameEnded) {
      console.log("🎮 Démarrage de la partie demandé")

      // Réinitialiser l'état du jeu
      gameWinner = null
      gameInProgress = true
      gameEnded = false
      projectiles = []

      // Réinitialiser les joueurs éliminés
      players.forEach((player) => {
        player.eliminated = false
      })

      // Compte à rebours optionnel
      let count = 3
      const countdownInterval = setInterval(() => {
        io.emit("countdown", count)
        count--

        if (count < 0) {
          clearInterval(countdownInterval)
          io.emit("startGame")
        }
      }, 1000)
    }
  })

  socket.on("restartGame", () => {
    // Réinitialiser l'état du jeu
    gameWinner = null
    gameInProgress = false
    gameEnded = false
    projectiles = []

    // Réinitialiser les positions des joueurs
    players.forEach((player, index) => {
      player.position = spawnPositions[index % 4]
      player.eliminated = false
    })

    // Informer tous les joueurs du retour au lobby
    io.emit("returnToLobby", players)
  })

  socket.on("leaveGame", () => {
    handlePlayerLeave(socket.id)
  })

  // Dans la gestion du mouvement, mettre à jour la direction
  socket.on("move", ({ direction }) => {
    if (!gameInProgress) return

    console.log(`🎮 Mouvement reçu de ${socket.id}: ${direction}`)

    const playerIndex = players.findIndex((p) => p.id === socket.id)
    if (playerIndex === -1) {
      console.log(`⚠️ Joueur ${socket.id} non trouvé`)
      return
    }

    const player = players[playerIndex]

    // JE vérifie si le joueur est éliminé
    if (player.eliminated) {
      console.log(`⚠️ Le joueur ${socket.id} est éliminé et ne peut pas se déplacer`)
      return
    }

    const oldPosition = { ...player.position }

    // Mise à jour la direction du joueur
    switch (direction) {
      case "ArrowUp":
        player.direction = "up"
        if (player.position.y > 0) player.position.y -= 1
        break
      case "ArrowDown":
        player.direction = "down"
        if (player.position.y < MAP_SIZE - 1) player.position.y += 1
        break
      case "ArrowLeft":
        player.direction = "left"
        if (player.position.x > 0) player.position.x -= 1
        break
      case "ArrowRight":
        player.direction = "right"
        if (player.position.x < MAP_SIZE - 1) player.position.x += 1
        break
    }

    // Je vérifie si la position a changé
    if (oldPosition.x !== player.position.x || oldPosition.y !== player.position.y) {
      console.log(
        `🚚 ${socket.id} se déplace de (${oldPosition.x},${oldPosition.y}) à (${player.position.x},${player.position.y}) direction: ${player.direction}`,
      )

      // Mettre à jour le joueur dans le tableau
      players[playerIndex] = player

      // J'envoie la mise à jour à tous les clients
      io.emit("playersUpdate", players)
    } else {
      console.log(`⚠️ Mouvement impossible pour ${socket.id}`)
    }
  })

  socket.on("shoot", () => {
    if (!gameInProgress) return

    const now = Date.now()

    // Durée du cooldown entre les tirs
    if (now - (lastShot[socket.id] || 0) < 500) {
      console.log(`⏱️ Cooldown actif pour ${socket.id}`)
      return
    }

    const playerIndex = players.findIndex((p) => p.id === socket.id)
    if (playerIndex === -1) return

    const player = players[playerIndex]

    // Je verifie si le joueur est éliminé
    if (player.eliminated) {
      console.log(`⚠️ Le joueur ${socket.id} est éliminé et ne peut pas tirer`)
      return
    }

    const closestEnemy = findClosestEnemy(player)

    if (!closestEnemy) {
      console.log(`⚠️ Pas d'ennemi trouvé pour ${socket.id}`)
      return
    }

    // Déterminer la direction du tir
    const direction = calculateDirection(player.position, closestEnemy.position)

    // Calculer la position initiale du projectile (devant le tank)
    const initialPosition = { ...player.position }

    // Créer un nouveau projectile
    const newProjectile = {
      id: projectileId++,
      playerId: socket.id,
      position: initialPosition,
      direction,
      createdAt: now,
    }

    console.log(`🔫 ${socket.id} tire en direction de ${closestEnemy.id} (${direction})`)

    // Ajouter le projectile à la liste
    projectiles.push(newProjectile)

    // Mettre à jour le temps du dernier tir
    lastShot[socket.id] = now

    // Envoyer la mise à jour des projectiles à tous les clients
    io.emit("projectilesUpdate", projectiles)
  })

  socket.on("disconnect", () => {
    console.log(`🔴 Un joueur s'est déconnecté : ${socket.id}`)

    // Utiliser la fonction de gestion du départ d'un joueur
    handlePlayerLeave(socket.id)

    delete lastShot[socket.id]
  })
})

server.listen(3001, () => {
  console.log("🚀 Serveur Socket.IO lancé sur http://localhost:3001")
})

