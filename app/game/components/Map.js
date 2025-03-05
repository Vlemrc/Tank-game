const Map = ({ players }) => {
  // Créer une grille 10x10
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(10, 50px)",
        gridTemplateRows: "repeat(10, 50px)",
        position: "relative", // Important pour le positionnement absolu des tanks
      }}
    >
      {/* Afficher la grille */}
      {Array.from({ length: 100 }).map((_, index) => (
        <div
          key={index}
          style={{
            width: "50px",
            height: "50px",
            backgroundColor: "lightgrey",
            border: "1px solid black",
          }}
        />
      ))}

      {/* Ne pas afficher les tanks ici, nous utiliserons le composant Tank séparé */}
    </div>
  )
}

export default Map

