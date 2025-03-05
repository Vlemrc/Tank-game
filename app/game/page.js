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

  const socketRef = useRef(null)

  const keyHandlerRef = useRef(null)

  const animationFrameRef = useRef(null)

  // Initialisation socketio
  useEffect(() => {
    socketRef.current = io("http://localhost:3001", { transports: ["websocket"] })

    socketRef.current.on("connect", () => {
      console.log("🔌 Connecté au serveur Socket.IO")
      setSocketReady(true)
      window.socketId = socketRef.current.id
    })

    socketRef.current.on("playersUpdate", (updatedPlayers) => {
      console.log("📢 Mise à jour des joueurs reçue:", updatedPlayers)

      const currentPlayer = updatedPlayers.find((p) => p.id === socketRef.current?.id)
      if (currentPlayer && currentPlayer.eliminated && !playerEliminated) {
        console.log("💀 Vous avez été éliminé !")
        setPlayerEliminated(true)
        setEliminationMessage("Vous avez été éliminé !")
      }

      setPlayers(updatedPlayers)

      const newPositions = updatedPlayers.reduce((acc, player) => {
        acc[player.id] = player.position
        return acc
      }, {})

      console.log("🗺️ Nouvelles positions:", newPositions)
      setPositions(newPositions)
    })

    socketRef.current.on("playerEliminated", (data) => {
      console.log(`💀 Joueur éliminé: ${data.playerName} (${data.playerId})`)

      if (data.playerId === socketRef.current?.id) {
        setPlayerEliminated(true)
        setEliminationMessage("Vous avez été éliminé !")
      } else {
        setEliminationMessage(`${data.playerName} a été éliminé !`)
        setTimeout(() => setEliminationMessage(""), 3000)
      }
    })

    // Gesiton des joueurs qui quittent après la fin de la partie
    socketRef.current.on("playerLeftAfterGame", (data) => {
      console.log(`👋 Joueur parti après la fin: ${data.playerName} (${data.playerId})`)

      setPlayers((prev) => prev.filter((p) => p.id !== data.playerId))

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

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        delete window.socketId
      }
    }
  }, [playerEliminated])

  // Cooldown affichage
  useEffect(() => {
    if (lastShot === 0) return

    const interval = setInterval(() => {
      const remaining = Math.max(0, 500 - (Date.now() - lastShot))
      setCooldownTimer(remaining)

      if (remaining === 0) {
        clearInterval(interval)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [lastShot])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!gameStarted || !socketRef.current || gameOver || playerEliminated) return

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
        console.log(`🔼 Touche pressée : ${event.key}`)
        socketRef.current.emit("move", { direction: event.key })
      } else if (event.key === " " || event.code === "Space") {
        console.log("🔫 Tir demandé")
        const now = Date.now()

        if (now - lastShot < 500) {
          return
        }

        setLastShot(now)
        socketRef.current.emit("shoot")
      }
    }

    keyHandlerRef.current = handleKeyDown

    if (gameStarted && !gameOver && !playerEliminated) {
      console.log("🎮 Event keydown ajouté !")
      window.addEventListener("keydown", handleKeyDown)
    }

    return () => {
      if (keyHandlerRef.current) {
        console.log("⛔ Event keydown retiré !")
        window.removeEventListener("keydown", keyHandlerRef.current)
      }
    }
  }, [gameStarted, lastShot, gameOver, playerEliminated])

  // Fonction pour rejoindre une partie
  const joinGame = () => {
    if (name.trim() !== "" && socketRef.current) {
      socketRef.current.emit("joinGame", name)
      setInLobby(true)
    } else if (!socketRef.current) {
      console.error("⚠️ Socket non initialisé")
      alert("Connexion au serveur en cours... Veuillez réessayer dans quelques secondes.")
    }
  }

  const startGame = () => {
    if (socketRef.current) {
      socketRef.current.emit("startGame")
    }
  }

  const restartGame = () => {
    if (socketRef.current) {
      socketRef.current.emit("restartGame")
    }
  }

  // retour sur la gome
  const quitGame = () => {
    if (socketRef.current) {
      socketRef.current.emit("leaveGame")
      socketRef.current.disconnect()
      router.push("/")
    }
  }

  // Écran de fin de game
  const renderGameOver = () => {
    if (!gameOver || !winner) return null

    return (
      <div className="absolute rounded-lg inset-0 flex flex-col items-center justify-center z-50">
        <div className="bg-white flex flex-col p-6 rounded-lg shadow-lg text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4 text-black">Partie terminée !</h2>
          <p className="text-xl text-black !mb-6">
            {winner.id === socketRef.current?.id ? "🏆 Vous avez gagné ! 🏆" : `🏆 ${winner.name} a gagné ! 🏆`}
          </p>

          <div className="flex flex-row gap-4 justify-center">
            <button onClick={quitGame} className="!p-2 !px-4 !rounded-md bg-green-900 text-white px-4 py-2 rounded hover:bg-green-950 transition-all">
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
      <div className="absolute inset-0 bg-red-900 rounded-lg bg-opacity-30 flex items-center justify-center z-40">
        <div className="bg-white p-4 rounded-lg shadow-lg text-center flex flex-col items-center gap-4">
          <h2 className="text-xl font-bold text-red-600 mb-2">Vous avez été éliminé !</h2>
          <button onClick={quitGame} className="!p-2 !px-4 !rounded-md bg-red-800 text-white px-4 py-2 rounded hover:bg-red-900 transition-all">
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
      <div className="fixed top-8 left-5 p-2">
        <h3 className="font-indie text-2xl !mb-3">Statut des joueurs</h3>
        <ul>
          {players.map((player) => (
            <li key={player.id}>
              <span className="font-indie text-xl">{player.name}</span> : {player.eliminated ? <span className="rainbow-text font-bold">Explosé</span> : "Menace"}
              <span className="text-green-600 font-indie text-xl">{player.id === socketRef.current?.id ? " (Vous)" : ""}</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  // Jsplus ct pour quoi
  const renderEliminationMessage = () => {
    if (!eliminationMessage) return null

    return 
  }

  return (
    <div className="h-full w-full flex items-center justify-center">
      {!gameStarted ? (
        !inLobby ? (
          <div className="flex flex-col items-center justify-center h-screen gap-4">
            <h1 className="text-4xl absolute left-8 top-8">TANKS ARENA</h1>
            <h2 className="text-2xl mb-4">Rejoindre une partie</h2>
            <input
              type="text"
              placeholder="Votre nom"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border p-2 mb-2 w-64 rounded-md border-green-700"
            />
            <button
              onClick={joinGame}
              className={`!p-2 !px-4 !rounded-md !bg-green-800 hover:!bg-green-900 !transition-all ${socketReady ? "bg-blue-500 text-white" : "bg-gray-300 text-gray-600"}`}
              disabled={!socketReady}
            >
              {socketReady ? "Rejoindre" : "Connexion en cours..."}
            </button>
            {!socketReady && <p className="text-sm text-red-500 mt-2">Connexion au serveur en cours...</p>}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-screen">
            <h1 className="text-4xl absolute left-8 top-8">TANKS ARENA</h1>
            <h2 className="text-2xl">Salle d'attente</h2>
            <p className="text-sm !mb-3">Joueurs connectés : {players.length} / 4</p>
            <ul className="!mb-4 flex flex-col items-center">
              {players.map((player) => (
                <li key={player.id} className="font-indie text-xl">
                  {player.name} {player.id === socketRef.current?.id ? "(Vous)" : ""}
                </li>
              ))}
            </ul>

            {countdown !== null ? (
              <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)'}} className="fixed top-1/2 left-1/2 -translate-1/2 text-white h-full w-full flex items-center justify-center z-50">
                <h3 className="font-200 font-indie font-bold">{countdown}</h3>
              </div>
            ) : (
              <div className="flex flex-row gap-4">
                {players.length >= 2 && (
                  <button onClick={startGame} className="!p-2 !px-4 !rounded-md bg-green-500 text-white p-2 rounded">
                    Lancer la partie
                  </button>
                )}
                <button onClick={quitGame} className="!p-2 !px-4 !rounded-md bg-red-500 text-white p-2 rounded">
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
          {renderPlayerStatus()}
          {renderEliminationMessage()}

          <div className="fixed bottom-12 left-5 flex flex-col">
            <h3 className="font-indie text-2xl">Contrôles</h3>
            <p><span className="font-indie text-xl">Flèches</span> : Déplacer le tank</p>
            <p><span className="font-indie text-xl">Espace</span> : Tirer</p>
            <button
              onClick={quitGame}
              className="!p-2 !px-4 !rounded-md !mt-4 bg-green-800 hover:bg-green-900 transition-all text-white px-2 py-1 rounded text-sm"
            >
              Quitter
            </button>
          </div>
          {renderEliminatedOverlay()}
          {renderGameOver()}
        </div>
      )}
    </div>
  )
}

export default GamePage

