"use client"

import { useEffect, useState } from "react"

const Projectile = ({ projectiles, currentPlayerId }) => {
  const [interpolatedProjectiles, setInterpolatedProjectiles] = useState([])

  useEffect(() => {
    if (!projectiles || projectiles.length === 0) {
      setInterpolatedProjectiles([])
      return
    }


    setInterpolatedProjectiles(
      projectiles.map((p) => ({
        ...p,
        renderX: p.position.x * 50,
        renderY: p.position.y * 50,
      })),
    )
  }, [projectiles])


  if (!interpolatedProjectiles || interpolatedProjectiles.length === 0) {
    return null
  }


  const getRotation = (direction) => {
    switch (direction) {
      case "up":
        return "0deg"
      case "right":
        return "90deg"
      case "down":
        return "180deg"
      case "left":
        return "270deg"
      default:
        return "0deg"
    }
  }


  const getProjectileColor = (projectile) => {
    if (projectile.playerId === currentPlayerId) {
      return "#8A2BE2"
    }
    return "#FF0000"
  }

  return (
    <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}>
      {interpolatedProjectiles.map((projectile) => {
        const color = getProjectileColor(projectile)

        return (
          <div
            key={projectile.id}
            style={{
              position: "absolute",
              top: `${projectile.renderY + 15}px`,
              left: `${projectile.renderX + 15}px`,
              width: "20px",
              height: "20px",
              zIndex: 9,
              transform: `rotate(${getRotation(projectile.direction)})`,
              transition: "top 0.05s linear, left 0.05s linear", 
            }}
          >
            <div
              style={{
                position: "absolute",
                width: "20px",
                height: "20px",
                backgroundColor: color,
                borderRadius: "50%",
                boxShadow: `0 0 15px 5px ${color}80`,
                zIndex: 9,
                animation: "pulse 0.5s infinite alternate",
              }}
            />

            <div
              style={{
                position: "absolute",
                width: "30px",
                height: "10px",
                backgroundColor: `${color}80`,
                borderRadius: "5px",
                transform: "translateX(-15px)",
                zIndex: 8,
                opacity: 0.7,
              }}
            />

            <div
              style={{
                position: "absolute",
                width: "6px",
                height: "6px",
                backgroundColor: "white",
                borderRadius: "50%",
                top: "7px",
                left: "7px",
                zIndex: 10,
              }}
            />
          </div>
        )
      })}

      <style jsx>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export default Projectile

