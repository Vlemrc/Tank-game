const Map = ({ players }) => {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(10, 50px)",
        gridTemplateRows: "repeat(10, 50px)",
        position: "relative",
      }}
      className="rounded-lg"
    >
      {Array.from({ length: 100 }).map((_, index) => (
        <div
          key={index}
          style={{
            width: "50px",
            height: "50px",
            backgroundColor: "rgba(0, 0, 0, 0.2)",
            border: "1px dotted rgba(0,0,0, 0.1)",
          }}
          className="rounded-lg"
        />
      ))}
    </div>
  )
}

export default Map

