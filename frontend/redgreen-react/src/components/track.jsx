import React from "react";

function seededRandom(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return Math.abs(h % 1000) / 1000; // 0..1
}

function TrackSection({ pos, gameOver, finished, players, mySocketId }) {
  // Exclude self from other players
  const otherPlayers = Object.entries(players)
    .filter(([id]) => id !== mySocketId)
    .map(([id, p]) => ({ ...p, id }));

  return (
    <section className="track" style={{ position: "relative" }}>
      <div className="finish-line" />
      
      {/* client in center and others randomely spawned on y axis */}

      <div
        className="player"
        style={{
          left: `calc(${pos}% - 10px)`,
        }}
        title={`You (${pos.toFixed(0)}%)`}
      />
      
      {otherPlayers.map((p) => (
        <div
          key={p.id}
          className="player-wrapper"
          style={{
            left: `calc(${p.position}% - 6px)`,
            top: `${Math.round(seededRandom(p.id) * 90) + 5}%`
          }}
        >
          <div className="player other" title={`${p.name} (${p.position.toFixed(0)}%)`} />
          <span className = "player-name"> {p.name} </span>
        </div>
      ))}

      {/* disable game */}
      {gameOver && !finished && (
        <div className="game-over-overlay">
          <h2>If this was squid game, you'd be dead</h2>
          <p>Maybe practice your reflexes while you wait for the next round?</p>
        </div>
      )}
      {finished && (
        <div className="game-over-overlay">
          <h2>Congratulations!</h2>
          <p>You reached the finish line!</p>
        </div>
      )}
    </section>
  );
}

export default TrackSection;