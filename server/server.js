const { Server } = require("socket.io")
const http = require("http")
const express = require("express")

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});


const MAP_SIZE = 10
let players = []
let projectiles = []
let projectileId = 0
let gameInProgress = false
let gameWinner = null
let gameEnded = false 

const calculateDistance = (pos1, pos2) => {
  return Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2))
}

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

const calculateDirection = (from, to) => {
  const dx = to.x - from.x
  const dy = to.y - from.y

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx > 0 ? "right" : "left"
  } else {
    return dy > 0 ? "down" : "up"
  }
}

const resetGame = () => {
  players = []
  projectiles = []
  gameInProgress = false
  gameWinner = null
  gameEnded = false
  console.log("🔄 Réinitialisation complète du jeu")
}

const notifyPlayerLeftAfterGame = (playerId, playerName) => {
  console.log(`👋 Le joueur ${playerName} (${playerId}) a quitté après la fin de partie`)

  io.emit("playerLeftAfterGame", {
    playerId: playerId,
    playerName: playerName,
    remainingPlayers: players.filter((p) => p.id !== playerId).length,
  })

  players = players.filter((p) => p.id !== playerId)

  if (players.length === 0) {
    console.log("🧹 Tous les joueurs ont quitté, réinitialisation du jeu")
    resetGame()
  }
}

// const checkGameEnd = () => {
//   const alivePlayers = players.filter((player) => !player.eliminated)

//   console.log(`🔍 Vérification fin de partie: ${alivePlayers.length} joueurs en vie sur ${players.length} total`)

//   if (alivePlayers.length === 1 && players.length > 1) {
//     gameWinner = alivePlayers[0]
//     gameInProgress = false
//     gameEnded = true

//     io.emit("gameOver", {
//       winner: gameWinner,
//       players: players,
//     })

//     console.log(`🏆 Partie terminée ! Le gagnant est ${gameWinner.name}`)
//     projectiles = []
//     io.emit("projectilesUpdate", projectiles)

//     return true
//   }

//   return false
// }
const checkGameEnd = () => {
  const alivePlayers = players.filter((player) => !player.eliminated);

  console.log(`🔍 Vérification fin de partie: ${alivePlayers.length} joueurs en vie sur ${players.length} total`);

  if (alivePlayers.length === 1 && players.length > 1) {
    gameWinner = alivePlayers[0];
    gameInProgress = false;
    gameEnded = true;

    io.emit("gameOver", {
      winner: gameWinner,
      players: players,
    });

    console.log(`🏆 Partie terminée ! Le gagnant est ${gameWinner.name}`);
    projectiles = [];
    io.emit("projectilesUpdate", projectiles);

    setTimeout(() => {
      console.log("🔄 Réinitialisation automatique du jeu après la fin de partie");
      resetGame();
      io.emit("returnToLobby");
    }, 5000); 

    return true;
  }
  return false;
};

const eliminatePlayer = (playerId) => {
  const playerIndex = players.findIndex((p) => p.id === playerId)

  if (playerIndex !== -1 && !players[playerIndex].eliminated) {
    players[playerIndex].eliminated = true
    console.log(`☠️ Le joueur ${players[playerIndex].name} (${playerId}) a été éliminé !`)

    io.emit("playersUpdate", players)

    io.emit("playerEliminated", {
      playerId: playerId,
      playerName: players[playerIndex].name,
    })

    return checkGameEnd()
  }

  return false
}

// Si un joueur part
const handlePlayerLeave = (playerId) => {
  const playerIndex = players.findIndex((p) => p.id === playerId)

  if (playerIndex === -1) return

  const playerName = players[playerIndex].name

  if (gameEnded) {
    notifyPlayerLeftAfterGame(playerId, playerName)
    return
  }

  if (gameInProgress) {
    eliminatePlayer(playerId)
    return
  }

  players = players.filter((p) => p.id !== playerId)
  io.emit("playersUpdate", players)

  console.log(`👋 Le joueur ${playerName} (${playerId}) a quitté la partie`)
}

const updateProjectiles = () => {
  if (!gameInProgress || players.length < 2) return
  const projectilesToRemove = []
  projectiles.forEach((projectile) => {
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

    if (newPosition.x < 0 || newPosition.x >= MAP_SIZE || newPosition.y < 0 || newPosition.y >= MAP_SIZE) {
      projectilesToRemove.push(projectile.id)
      console.log(`🧱 Projectile ${projectile.id} a touché un mur`)
      return
    }
    let collision = false
    let hitPlayerId = null

    players.forEach((player) => {
      if (player.eliminated) return
      if (player.id === projectile.playerId) return
      const distance = calculateDistance(newPosition, player.position)

      if (distance < 0.7) {
        collision = true
        hitPlayerId = player.id
        console.log(
          `💥 Projectile ${projectile.id} a touché le joueur ${player.id} (${player.name}) à distance ${distance}`,
        )
      }
    })

    if (collision) {
      projectilesToRemove.push(projectile.id)
      if (hitPlayerId) {
        eliminatePlayer(hitPlayerId)
      }
    } else {
      projectile.position = newPosition
    }
  })


  if (projectilesToRemove.length > 0) {
    projectiles = projectiles.filter((p) => !projectilesToRemove.includes(p.id))
  }

  io.emit("projectilesUpdate", projectiles)
}

setInterval(updateProjectiles, 30)

io.on("connection", (socket) => {
  console.log(`🟢 Un joueur s'est connecté : ${socket.id}`)

  const spawnPositions = [
    { x: 0, y: 0 }, 
    { x: 9, y: 9 }, 
    { x: 0, y: 9 }, 
    { x: 9, y: 0 }, 
  ]

  const lastShot = {}

  socket.on("joinGame", (name) => {
    if (players.length < 4 && !gameInProgress && !gameEnded) {
      const newPlayer = {
        id: socket.id,
        name,
        position: spawnPositions[players.length], 
        eliminated: false,
        direction: "up",
      }
      players.push(newPlayer)
      lastShot[socket.id] = 0
      console.log(`👤 ${name} rejoint la partie à la position:`, newPlayer.position)

      io.emit("playersUpdate", players)
      socket.emit("projectilesUpdate", projectiles)
    } else if (gameInProgress || gameEnded) {
      socket.emit("gameInProgress")
    }
  })

  socket.on("startGame", () => {
    if (players.length >= 2 && !gameInProgress && !gameEnded) {
      console.log("🎮 Démarrage de la partie demandé")

      gameWinner = null
      gameInProgress = true
      gameEnded = false
      projectiles = []

      players.forEach((player) => {
        player.eliminated = false
      })

      // Compte à rebours sympa avant de démarrer le jeu
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
    gameWinner = null
    gameInProgress = false
    gameEnded = false
    projectiles = []

    // Réinitialiser les positions des joueurs
    players.forEach((player, index) => {
      player.position = spawnPositions[index % 4]
      player.eliminated = false
    })
    io.emit("returnToLobby", players)
  })

  socket.on("leaveGame", () => {
    handlePlayerLeave(socket.id)
  })

  socket.on("move", ({ direction }) => {
    if (!gameInProgress) return

    console.log(`🎮 Mouvement reçu de ${socket.id}: ${direction}`)

    const playerIndex = players.findIndex((p) => p.id === socket.id)
    if (playerIndex === -1) {
      console.log(`⚠️ Joueur ${socket.id} non trouvé`)
      return
    }

    const player = players[playerIndex]

    if (player.eliminated) {
      console.log(`⚠️ Le joueur ${socket.id} est éliminé et ne peut pas se déplacer`)
      return
    }

    const oldPosition = { ...player.position }

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
    if (oldPosition.x !== player.position.x || oldPosition.y !== player.position.y) {
      console.log(
        `🚚 ${socket.id} se déplace de (${oldPosition.x},${oldPosition.y}) à (${player.position.x},${player.position.y}) direction: ${player.direction}`,
      )
      players[playerIndex] = player
      io.emit("playersUpdate", players)
    } else {
      console.log(`⚠️ Mouvement impossible pour ${socket.id}`)
    }
  })

  socket.on("shoot", () => {
    if (!gameInProgress) return

    const now = Date.now()
    if (now - (lastShot[socket.id] || 0) < 500) {
      console.log(`⏱️ Cooldown actif pour ${socket.id}`)
      return
    }

    const playerIndex = players.findIndex((p) => p.id === socket.id)
    if (playerIndex === -1) return

    const player = players[playerIndex]
    if (player.eliminated) {
      console.log(`⚠️ Le joueur ${socket.id} est éliminé et ne peut pas tirer`)
      return
    }

    const closestEnemy = findClosestEnemy(player)

    if (!closestEnemy) {
      console.log(`⚠️ Pas d'ennemi trouvé pour ${socket.id}`)
      return
    }
    const direction = calculateDirection(player.position, closestEnemy.position)
    const initialPosition = { ...player.position }
    const newProjectile = {
      id: projectileId++,
      playerId: socket.id,
      position: initialPosition,
      direction,
      createdAt: now,
    }

    console.log(`🔫 ${socket.id} tire en direction de ${closestEnemy.id} (${direction})`)
    projectiles.push(newProjectile)
    lastShot[socket.id] = now
    io.emit("projectilesUpdate", projectiles)
  })

  socket.on("disconnect", () => {
    console.log(`🔴 Un joueur s'est déconnecté : ${socket.id}`)
    handlePlayerLeave(socket.id)
    delete lastShot[socket.id]
  })
})

const PORT = process.env.PORT || 10000; 

server.listen(PORT, () => {
  console.log(`🚀 Serveur Socket.IO lancé sur le port ${PORT}`);
});



