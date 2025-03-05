const Tank = ({ positions, players }) => {
  console.log("🟢 Positions des tanks :", positions) // Debug
  console.log("🟢 Joueurs :", players) // Debug pour voir l'état des joueurs

  if (!positions || Object.keys(positions).length === 0) {
    console.log("⚠️ Aucune position de tank disponible")
    return null
  }

  // Créer un mapping des IDs vers les joueurs
  const playerMap = {}
  if (players && players.length > 0) {
    players.forEach((player) => {
      playerMap[player.id] = player
    })
  }

  // Filtrer les joueurs non éliminés
  const activePlayers = Object.keys(positions).filter((playerId) => {
    const player = playerMap[playerId]
    return player && !player.eliminated
  })

  console.log("🟢 Joueurs actifs:", activePlayers.length)

  return (
    <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}>
      {activePlayers.map((playerId) => {
        const position = positions[playerId]
        const player = playerMap[playerId]
        const playerName = player.name || "Joueur"

        console.log(`🚀 Affichage du tank ${playerName} à la position:`, position)

        return (
          <div key={playerId} style={{ position: "absolute", top: 0, left: 0 }}>
            {/* Le tank */}
            <div
              style={{
                position: "absolute",
                top: `${position.y * 50}px`, // Chaque case fait 50px
                left: `${position.x * 50}px`,
                width: "50px",
                height: "50px",
                backgroundColor: "red",
                border: "2px solid black",
                borderRadius: "5px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 10, // S'assurer que les tanks sont au-dessus de la grille
                transition: "all 0.2s ease-in-out", // Animation fluide lors des déplacements
              }}
            />

            {/* Le pseudo au-dessus du tank */}
            <div
              style={{
                position: "absolute",
                top: `${position.y * 50 - 20}px`, // 20px au-dessus du tank
                left: `${position.x * 50}px`,
                width: "50px",
                textAlign: "center",
                fontWeight: "bold",
                color: "black",
                backgroundColor: "rgba(255, 255, 255, 0.7)",
                padding: "2px",
                borderRadius: "3px",
                fontSize: "12px",
                zIndex: 11,
                transition: "all 0.2s ease-in-out",
              }}
            >
              {playerName}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default Tank

