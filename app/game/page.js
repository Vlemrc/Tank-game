"use client"

import { useState, useEffect, useRef } from "react"
import io from "socket.io-client"
import Map from "./components/Map"
import Tank from "./components/Tank"
import Projectile from "./components/Projectile"

const GamePage = () => {
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
      setPlayers(updatedPlayers)

      // Extraire les positions des joueurs mis à jour
      const newPositions = updatedPlayers.reduce((acc, player) => {
        acc[player.id] = player.position
        return acc
      }, {})

      console.log("🗺️ Nouvelles positions:", newPositions)
      setPositions(newPositions)
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
    })

    // Nettoyage à la fermeture du composant
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, []) // Dépendances vides pour n'exécuter qu'une seule fois

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
      if (!gameStarted || !socketRef.current) return

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
    if (gameStarted) {
      console.log("🎮 Event keydown ajouté !")
      window.addEventListener("keydown", handleKeyDown)
    }

    // Nettoyage
    return () => {
      if (gameStarted && keyHandlerRef.current) {
        console.log("⛔ Event keydown retiré !")
        window.removeEventListener("keydown", keyHandlerRef.current)
      }
    }
  }, [gameStarted, lastShot])

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
                <li key={player.id}>{player.name}</li>
              ))}
            </ul>

            {countdown !== null ? (
              <h3>La partie démarre dans {countdown}...</h3>
            ) : (
              players.length >= 2 && (
                <button onClick={startGame} className="bg-green-500 text-white p-2 rounded">
                  Lancer la partie
                </button>
              )
            )}
          </div>
        )
      ) : (
        <div className="relative" style={{ width: "500px", height: "500px", margin: "0 auto" }}>
          <Map players={players} />
          <Projectile projectiles={projectiles} currentPlayerId={socketRef.current?.id} />
          <Tank positions={positions} players={players} />

          <div className="absolute top-0 right-0 bg-white p-2 border">
            <h3>Contrôles:</h3>
            <p>Flèches: déplacer le tank</p>
            <p>Espace: tirer</p>
            {cooldownTimer > 0 && (
              <div className="mt-2">
                <p className="text-red-500">Cooldown: {(cooldownTimer / 1000).toFixed(1)}s</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default GamePage

