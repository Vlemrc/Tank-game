"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import io from "socket.io-client"
import Map from "./components/Map"
import Tank from "./components/Tank"
import Projectile from "./components/Projectile"

const GamePage = () => {
  const router = useRouter()
  const [name, setName] = useState("")
  const [players, setPlayers] = useState([])
  const [gameStarted, setGameStarted] = useState(false)
  const [inLobby, setInLobby] = useState(false)
  const [countdown, setCountdown] = useState(null)
  const [positions, setPositions] = useState({})
  const [projectiles, setProjectiles] = useState([])
  const [lastShot, setLastShot] = useState(0)
  const [socketReady, setSocketReady] = useState(false)
  const [cooldownTimer, setCooldownTimer] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [winner, setWinner] = useState(null)
  const [gameResults, setGameResults] = useState(null)
  const [playerEliminated, setPlayerEliminated] = useState(false)
  const [eliminationMessage, setEliminationMessage] = useState("")
  const [playerLeftMessage, setPlayerLeftMessage] = useState("")

  // Référence pour stocker le socket
  const socketRef = useRef(null)

  // Référence pour stocker la fonction handleKeyDown
  const keyHandlerRef = useRef(null)

  // Référence pour l'animation frame
  const animationFrameRef = useRef(null)

  // L'initiation de la connexion Socket.IO et la gestion des événements
  useEffect(() => {
    // Initialiser le socket
    socketRef.current = io("http://localhost:3001", { transports: ["websocket"] })

    // Configurer les écouteurs d'événements
    socketRef.current.on("connect", () => {
      console.log("🔌 Connecté au serveur Socket.IO")
      setSocketReady(true)
    })

    socketRef.current.on("playersUpdate", (updatedPlayers) => {
      console.log("📢 Mise à jour des joueurs reçue:", updatedPlayers)

      // Vérifier si le joueur actuel est éliminé
      const currentPlayer = updatedPlayers.find((p) => p.id === socketRef.current?.id)
      if (currentPlayer && currentPlayer.eliminated && !playerEliminated) {
        console.log("💀 Vous avez été éliminé !")
        setPlayerEliminated(true)
        setEliminationMessage("Vous avez été éliminé !")
      }

      setPlayers(updatedPlayers)

      // Extraire les positions des joueurs mis à jour
      const newPositions = updatedPlayers.reduce((acc, player) => {
        acc[player.id] = player.position
        return acc
      }, {})

      console.log("🗺️ Nouvelles positions:", newPositions)
      setPositions(newPositions)
    })

    socketRef.current.on("playerEliminated", (data) => {
      console.log(`💀 Joueur éliminé: ${data.playerName} (${data.playerId})`)

      // Si c'est le joueur actuel qui est éliminé
      if (data.playerId === socketRef.current?.id) {
        setPlayerEliminated(true)
        setEliminationMessage("Vous avez été éliminé !")
      } else {
        // Afficher un message temporaire pour l'élimination d'un autre joueur
        setEliminationMessage(`${data.playerName} a été éliminé !`)
        setTimeout(() => setEliminationMessage(""), 3000)
      }
    })

    // Nouvel événement pour gérer le départ d'un joueur après la fin de partie
    socketRef.current.on("playerLeftAfterGame", (data) => {
      console.log(`👋 Joueur parti après la fin: ${data.playerName} (${data.playerId})`)

      // Mettre à jour la liste des joueurs (le serveur l'a déjà fait, mais au cas où)
      setPlayers((prev) => prev.filter((p) => p.id !== data.playerId))

      // Afficher un message temporaire
      setPlayerLeftMessage(`${data.playerName} a quitté la partie (${data.remainingPlayers} joueurs restants)`)
      setTimeout(() => setPlayerLeftMessage(""), 5000)
    })

    socketRef.current.on("projectilesUpdate", (updatedProjectiles) => {
      console.log("🔫 Mise à jour des projectiles reçue:", updatedProjectiles.length, "projectiles")
      setProjectiles(updatedProjectiles)
    })

    socketRef.current.on("countdown", (timeLeft) => {
      setCountdown(timeLeft)
    })

    socketRef.current.on("startGame", () => {
      console.log("🎮 Démarrage du jeu!")
      setGameStarted(true)
      setGameOver(false)
      setWinner(null)
      setGameResults(null)
      setPlayerEliminated(false)
      setEliminationMessage("")
      setPlayerLeftMessage("")
    })

    socketRef.current.on("gameOver", (results) => {
      console.log("🏆 Partie terminée !", results)
      setGameOver(true)
      setWinner(results.winner)
      setGameResults(results)
    })

    socketRef.current.on("returnToLobby", (updatedPlayers) => {
      console.log("🔄 Retour au lobby")
      setGameStarted(false)
      setGameOver(false)
      setWinner(null)
      setGameResults(null)
      setPlayerEliminated(false)
      setEliminationMessage("")
      setPlayerLeftMessage("")
      setInLobby(true)
      setPlayers(updatedPlayers)
    })

    socketRef.current.on("gameInProgress", () => {
      alert("Une partie est déjà en cours. Veuillez attendre la fin de la partie.")
    })

    // Nettoyage à la fermeture du composant
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [playerEliminated]) // Ajout de playerEliminated comme dépendance

  // Effet pour mettre à jour le timer de cooldown
  useEffect(() => {
    if (lastShot === 0) return

    const interval = setInterval(() => {
      const remaining = Math.max(0, 1000 - (Date.now() - lastShot))
      setCooldownTimer(remaining)

      if (remaining === 0) {
        clearInterval(interval)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [lastShot])

  // Gestion des événements clavier séparée, dépendant de gameStarted
  useEffect(() => {
    // Définir la fonction de gestion des touches
    const handleKeyDown = (event) => {
      if (!gameStarted || !socketRef.current || gameOver || playerEliminated) return

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
        console.log(`🔼 Touche pressée : ${event.key}`)
        socketRef.current.emit("move", { direction: event.key })
      } else if (event.key === " " || event.code === "Space") {
        console.log("🔫 Tir demandé")
        const now = Date.now()

        // Vérification du cooldown côté client (pour feedback visuel)
        if (now - lastShot < 1000) {
          console.log("⏱️ Cooldown actif")
          return
        }

        setLastShot(now)
        socketRef.current.emit("shoot")
      }
    }

    // Stocker la référence pour le nettoyage
    keyHandlerRef.current = handleKeyDown

    // Ajouter l'écouteur d'événement seulement si le jeu a démarré
    if (gameStarted && !gameOver && !playerEliminated) {
      console.log("🎮 Event keydown ajouté !")
      window.addEventListener("keydown", handleKeyDown)
    }

    // Nettoyage
    return () => {
      if (keyHandlerRef.current) {
        console.log("⛔ Event keydown retiré !")
        window.removeEventListener("keydown", keyHandlerRef.current)
      }
    }
  }, [gameStarted, lastShot, gameOver, playerEliminated])

  // Fonction pour rejoindre la partie
  const joinGame = () => {
    if (name.trim() !== "" && socketRef.current) {
      socketRef.current.emit("joinGame", name)
      setInLobby(true)
    } else if (!socketRef.current) {
      console.error("⚠️ Socket non initialisé")
      alert("Connexion au serveur en cours... Veuillez réessayer dans quelques secondes.")
    }
  }

  // Fonction pour démarrer la partie (après la préparation)
  const startGame = () => {
    if (socketRef.current) {
      socketRef.current.emit("startGame")
    }
  }

  // Fonction pour redémarrer la partie
  const restartGame = () => {
    if (socketRef.current) {
      socketRef.current.emit("restartGame")
    }
  }

  // Fonction pour quitter la partie et retourner à l'accueil
  const quitGame = () => {
    if (socketRef.current) {
      // Informer le serveur que le joueur quitte la partie
      socketRef.current.emit("leaveGame")

      // Déconnecter le socket
      socketRef.current.disconnect()

      // Rediriger vers la page d'accueil
      router.push("/")
    }
  }

  // Rendu de l'écran de fin de partie
  const renderGameOver = () => {
    if (!gameOver || !winner) return null

    return (
      <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-lg text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">Partie terminée !</h2>
          <p className="text-xl mb-6">
            {winner.id === socketRef.current?.id ? "🏆 Vous avez gagné ! 🏆" : `🏆 ${winner.name} a gagné ! 🏆`}
          </p>

          <h3 className="text-lg font-semibold mb-2">Résultats :</h3>
          <ul className="mb-6">
            {players.map((player) => (
              <li key={player.id} className="mb-1">
                {player.name} - {player.eliminated ? "Éliminé" : "Vainqueur"}
                {player.id === socketRef.current?.id ? " (Vous)" : ""}
              </li>
            ))}
          </ul>

          {playerLeftMessage && (
            <div className="mb-4 p-2 bg-yellow-100 text-yellow-800 rounded">{playerLeftMessage}</div>
          )}

          <div className="flex space-x-4 justify-center">
            <button onClick={restartGame} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
              Retour au lobby
            </button>

            <button onClick={quitGame} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
              Quitter le jeu
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Rendu de l'indicateur de joueur éliminé
  const renderEliminatedOverlay = () => {
    if (!gameStarted || gameOver || !playerEliminated) return null

    return (
      <div className="absolute inset-0 bg-red-500 bg-opacity-30 flex items-center justify-center z-40">
        <div className="bg-white p-4 rounded-lg shadow-lg text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Vous avez été éliminé !</h2>
          <p>Vous pouvez continuer à regarder la partie.</p>
          <button onClick={quitGame} className="mt-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
            Quitter le jeu
          </button>
        </div>
      </div>
    )
  }

  // Afficher le statut des joueurs (pour le débogage)
  const renderPlayerStatus = () => {
    if (!gameStarted) return null

    return (
      <div className="absolute top-0 left-0 bg-white p-2 border">
        <h3>Statut des joueurs:</h3>
        <ul>
          {players.map((player) => (
            <li key={player.id}>
              {player.name}: {player.eliminated ? "Éliminé" : "En vie"}
              {player.id === socketRef.current?.id ? " (Vous)" : ""}
            </li>
          ))}
        </ul>
      </div>
    )
  }

  // Afficher les messages d'élimination
  const renderEliminationMessage = () => {
    if (!eliminationMessage) return null

    return (
      <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white p-2 rounded z-50">
        {eliminationMessage}
      </div>
    )
  }

  return (
    <div>
      {!gameStarted ? (
        !inLobby ? (
          <div className="flex flex-col items-center justify-center h-screen">
            <h2 className="text-2xl mb-4">Rejoindre une partie</h2>
            <input
              type="text"
              placeholder="Votre nom"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border p-2 mb-2 w-64"
            />
            <button
              onClick={joinGame}
              className={`p-2 rounded ${socketReady ? "bg-blue-500 text-white" : "bg-gray-300 text-gray-600"}`}
              disabled={!socketReady}
            >
              {socketReady ? "Rejoindre" : "Connexion en cours..."}
            </button>
            {!socketReady && <p className="text-sm text-red-500 mt-2">Connexion au serveur en cours...</p>}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-screen">
            <h2 className="text-2xl mb-4">Salle d'attente</h2>
            <p>Joueurs connectés : {players.length} / 4</p>
            <ul className="mb-4">
              {players.map((player) => (
                <li key={player.id}>
                  {player.name} {player.id === socketRef.current?.id ? "(Vous)" : ""}
                </li>
              ))}
            </ul>

            {countdown !== null ? (
              <h3>La partie démarre dans {countdown}...</h3>
            ) : (
              <div className="flex flex-col space-y-4">
                {players.length >= 2 && (
                  <button onClick={startGame} className="bg-green-500 text-white p-2 rounded">
                    Lancer la partie
                  </button>
                )}
                <button onClick={quitGame} className="bg-red-500 text-white p-2 rounded">
                  Quitter le jeu
                </button>
              </div>
            )}
          </div>
        )
      ) : (
        <div className="relative" style={{ width: "500px", height: "500px", margin: "0 auto" }}>
          <Map players={players} />
          <Projectile projectiles={projectiles} currentPlayerId={socketRef.current?.id} />
          <Tank positions={positions} players={players} />

          {/* Afficher le statut des joueurs pour le débogage */}
          {renderPlayerStatus()}

          {/* Afficher les messages d'élimination */}
          {renderEliminationMessage()}

          <div className="absolute top-0 right-0 bg-white p-2 border">
            <h3>Contrôles:</h3>
            <p>Flèches: déplacer le tank</p>
            <p>Espace: tirer</p>
            {cooldownTimer > 0 && (
              <div className="mt-2">
                <p className="text-red-500">Cooldown: {(cooldownTimer / 1000).toFixed(1)}s</p>
              </div>
            )}
            <button
              onClick={quitGame}
              className="mt-4 bg-red-500 text-white px-2 py-1 rounded text-sm hover:bg-red-600"
            >
              Quitter
            </button>
          </div>

          {/* Afficher l'overlay pour les joueurs éliminés */}
          {renderEliminatedOverlay()}

          {/* Afficher l'écran de fin de partie */}
          {renderGameOver()}
        </div>
      )}
    </div>
  )
}

export default GamePage

