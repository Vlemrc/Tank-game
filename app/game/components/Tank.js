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

  // Ajouter cette fonction pour obtenir la rotation en fonction de la direction
  const getRotation = (direction) => {
    switch (direction) {
      case "up":
        return "rotate(0deg)"
      case "right":
        return "rotate(90deg)"
      case "down":
        return "rotate(180deg)"
      case "left":
        return "rotate(-90deg)"
      default:
        return "rotate(0deg)"
    }
  }

  return (
    <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}>
      {activePlayers.map((playerId) => {
        const position = positions[playerId]
        const player = playerMap[playerId]
        const playerName = player.name || "Joueur"
        const isCurrentPlayer = playerId === window.socketId

        // Déterminer la couleur du tank en fonction du joueur
        const tankColor = isCurrentPlayer ? "#8A2BE2" : "#FF0000" // Violet pour le joueur actuel, rouge pour les adversaires

        console.log(`🚀 Affichage du tank ${playerName} à la position:`, position)

        // Modifier le rendu du tank pour appliquer la rotation
        return (
          <div key={playerId} style={{ position: "absolute", top: 0, left: 0 }}>
            {/* Le tank SVG */}
            <div
              style={{
                position: "absolute",
                top: `${position.y * 50}px`, // Chaque case fait 50px
                left: `${position.x * 50}px`,
                width: "50px",
                height: "50px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 10, // S'assurer que les tanks sont au-dessus de la grille
                transition: "all 0.2s ease-in-out", // Animation fluide lors des déplacements
              }}
            >
              <svg
                viewBox="0 0 313.63 409.6"
                style={{
                  width: "40px",
                  height: "40px",
                  transform: getRotation(player.direction), // Appliquer la rotation en fonction de la direction
                  transition: "transform 0.2s ease-in-out", // Animation fluide pour la rotation
                }}
              >
                <path
                  d="M172.79,0c1.77,1,4.8,4.93,4.8,6.79v108.98h54.4c-2.04-11.83,4.5-25.4,17.27-27.08,8.69-1.14,39.26-1.21,47.74.12,8.68,1.37,16.89,10.34,16.63,19.33v281.11c.23,9.34-8.33,18.28-17.3,19.46-9.68,1.27-35.57,1.06-45.52.06-13.94-1.41-20.76-13.99-18.81-27.14H81.59c1.8,14.48-5.16,26.05-20.36,27.18-9.79.73-36.36,1.28-45.27-.4-7.44-1.4-14.67-8.68-15.76-16.21l-.2-285.61c.59-8.18,7.99-16.11,15.95-17.61s40.07-1.38,48.37-.3c12.77,1.67,19.31,15.25,17.27,27.08h54.4V6.79c0-1.86,3.03-5.78,4.8-6.79h32ZM163.99,115.77V14.77l-1.2-1.2h-12l-1.2,1.2v101h14.4ZM55.99,170.06c.4-2.27,2.06-4.75,3.58-6.4,2.1-2.28,8.06-4.84,8.42-6.77-1.07-15.18,1.41-32.2.03-47.15-.39-4.23-2.41-7.05-6.82-7.57-9.01-1.06-30.83-.87-40.06-.02-2.2.2-7.56,1.97-7.56,4.43v63.47h42.4ZM257.59,170.06h42.4v-63.47c0-2.46-5.36-4.23-7.56-4.43-9.23-.84-31.05-1.04-40.06.02-4.41.52-6.43,3.33-6.82,7.57-1.37,14.95,1.1,31.97.03,47.15.37,1.93,6.33,4.49,8.42,6.77,1.52,1.66,3.18,4.14,3.58,6.4ZM129.59,129.34h-48v36.33c0,5.3-15.16,3.85-13.6,11.98l.38,144.13c.33,6.05,13.22,4.93,13.22,9.96v36.33h20.8v-17.96c0-.28,1.71-4.38,2.08-5.11,7.67-15.52,36.29-15.44,43.42.43,3.09,6.88,1.11,14.03,1.81,21.34l.64.96,13.3-.4c1.21-7.29-1.04-14.37,1.8-21.36,6.67-16.4,35.92-16.67,43.67-.97.36.73,2.08,4.84,2.08,5.11v17.96h20.8v-36.33c0-5.03,12.89-3.91,13.22-9.96l.38-144.13c1.56-8.13-13.6-6.68-13.6-11.98v-36.33h-48v15.57c0,.39,2.56,1.65,3.2,2.4,1.59,1.87,4,6.46,4,8.78v21.16h24.4c6.72,0,17.1,12.44,16.39,19.57-2.14,33.28,2.87,70.16.04,103.02-.95,10.98-7.79,18.86-18.84,20.32-36.2-2.02-75.37,2.72-111.23.04-11.89-.89-19.37-8.54-20.39-20.37-2.85-33.06,2.12-70.24.11-103.74-.49-6.88,9.87-18.85,16.31-18.85h24.4v-21.16c0-2.32,2.42-6.91,4-8.78.64-.75,3.2-2.01,3.2-2.4v-15.57ZM170.39,129.34h-27.2v13.57h27.2v-13.57ZM177.59,177.25v-19.56l-1.2-1.2h-39.2l-1.2,1.2v19.56h41.6ZM54.39,183.63H13.59v34.33h40.8v-34.33ZM299.99,183.63h-40.8v34.33h40.8v-34.33ZM100.56,190.99c-4.08,1.36-5.03,4.26-5.4,8.18-2.92,31.39,2.27,67.2,0,99.06-.03,4.59,2.76,8.51,7.59,8.39,34.77-2.47,73.81,3.15,108.08,0,5.5-.51,7.1-3.13,7.59-8.39,2.94-31.37-2.29-67.22,0-99.06-.01-3.52-1.47-6.58-4.79-8l-113.07-.19ZM54.39,231.54H13.59v27.15h40.8v-27.15ZM299.99,231.54h-40.8v27.15h40.8v-27.15ZM54.39,272.26H13.59v41.52h40.8v-41.52ZM299.99,272.26h-40.8v41.52h40.8v-41.52ZM55.99,327.35H13.59v63.47c0,2.46,5.36,4.23,7.56,4.43,9.23.84,31.05,1.04,40.06-.02,4.41-.52,6.43-3.33,6.82-7.57,1.37-14.95-1.1-31.97-.03-47.15-.37-1.93-6.33-4.49-8.42-6.77-1.52-1.66-3.18-4.14-3.58-6.4ZM299.99,327.35h-42.4c-.4,2.27-2.06,4.75-3.58,6.4-2.1,2.28-8.06,4.84-8.42,6.77,1.07,15.18-1.41,32.2-.03,47.15.39,4.23,2.41,7.05,6.82,7.57,9.01,1.06,30.83.87,40.06.02,2.2-.2,7.56-1.97,7.56-4.43v-63.47ZM115.99,351.7v16.37h20v-16.37c0-.21-2.04-2.71-2.62-3.04-4.04-2.29-15.94-2.06-17.38,3.04ZM197.59,368.07v-16.37c0-.3-3.02-3.04-3.78-3.41-3.29-1.6-10.41-1.43-13.6.37-.59.33-2.62,2.83-2.62,3.04v16.37h20Z"
                  fill={tankColor}
                />
                <path
                  d="M154.96,204.56c13.53.86,29.85-1.73,43.05-.19,2.8.33,5.01,1.72,6.04,4.35,1.34,3.43,1.1,18.05.73,22.4-1.18,13.74-9.33,20.34-22.75,21.21-18.71,1.21-31.06-3.14-32.47-23.56-.4-5.81-1.69-22.64,5.4-24.21ZM191.19,217.97h-27.2v16.37c0,.23,2.68,2.8,3.26,3.13,3.61,2.03,18.34,2.11,21.52-.75.59-.53,2.42-4.31,2.42-4.77v-13.97Z"
                  fill={tankColor}
                />
                <path
                  d="M175.84,258.87c25.8-1.83,29.57,37.08,5.28,40.47-29.87,4.16-32.32-38.55-5.28-40.47ZM177.18,272.64c-8.77.24-8.87,13.28.02,13.26,9.71-.02,8.47-13.49-.02-13.26Z"
                  fill={tankColor}
                />
                <path
                  d="M120.54,219.82c3.09,2.81,3.02,14.62-.95,17.31-11.27,7.64-15.78-17.63-4.59-19.02,1.73-.21,4.25.55,5.53,1.71Z"
                  fill={tankColor}
                />
                <path
                  d="M120.54,291.16c-1.28,1.17-3.81,1.93-5.53,1.71-11.19-1.39-6.68-26.66,4.59-19.02,3.96,2.69,4.03,14.49.95,17.31Z"
                  fill={tankColor}
                />
                <path
                  d="M120.56,246.95c3.4,2.86,4.08,19.98-5.59,18.77-11.57-1.45-5.79-28.32,5.59-18.77Z"
                  fill={tankColor}
                />
                <path
                  d="M270.91,356.37c2.54,2.53,2.52,16.31,1.71,19.91-1.52,6.76-11.76,6.72-13.26,0-.63-2.8-.51-13.46.02-16.41.98-5.4,7.65-7.35,11.53-3.5Z"
                  fill={tankColor}
                />
                <path
                  d="M281.84,379.79c-.98-.9-1.72-2.76-1.89-4.1-.57-4.65-1.21-18.6,3.43-20.59,11.55-4.94,11.29,13.34,9.84,20.2-1.14,5.43-7.06,8.44-11.39,4.49Z"
                  fill={tankColor}
                />
                <path
                  d="M52.53,356.34c2.41,2.63,2.49,16.38,1.69,19.94-1.52,6.76-11.76,6.72-13.26,0-.58-2.57-.57-13.84-.12-16.55.85-5.1,8.22-7.18,11.7-3.38Z"
                  fill={tankColor}
                />
                <path
                  d="M31.74,379.79c-2.7,2.46-7.32,2.2-9.72-.57-2.96-3.41-2.89-18.22-.43-21.93s8.2-3.98,10.78-.38c2.04,2.84,2.11,20.38-.63,22.88Z"
                  fill={tankColor}
                />
                <path
                  d="M52.53,141.07c-3.58,3.91-10.58,1.83-11.55-3.53-.53-2.95-.65-13.61-.02-16.41,1.54-6.88,11.69-6.99,13.26,0,.8,3.55.72,17.31-1.69,19.94Z"
                  fill={tankColor}
                />
                <path
                  d="M26.21,115.91c3.76-.47,6.95,1.98,7.4,5.83.37,3.14.45,13.77-.19,16.61-1.2,5.36-9.01,6.13-11.86,1.8-3.03-4.6-3.44-23.23,4.65-24.24Z"
                  fill={tankColor}
                />
                <path
                  d="M270.93,141.07c-3.58,3.91-10.58,1.83-11.55-3.53-.53-2.95-.65-13.61-.02-16.41,1.54-6.88,11.69-6.99,13.26,0,.8,3.55.72,17.31-1.69,19.94Z"
                  fill={tankColor}
                />
                <path
                  d="M285.39,115.91c9.32-1.53,8.78,12.72,8.18,18.61-1.12,11.05-12.62,10.93-13.61,2.42-.37-3.15-.45-13.77.19-16.61.49-2.18,3.14-4.08,5.23-4.42Z"
                  fill={tankColor}
                />
              </svg>
            </div>

            {/* Le pseudo au-dessus du tank */}
            <div
              style={{
                position: "absolute",
                top: `${position.y * 50 - 20}px`, // 20px au-dessus du tank
                left: `${position.x * 50}px`,
                width: "50px",
                textAlign: "center",
                fontWeight: "bold",
                color: isCurrentPlayer ? "#8A2BE2" : "#FF0000", // Même couleur que le tank
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

