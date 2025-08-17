import React, { useState } from "react";

export default function WelcomeOverlay({ onSubmit, socket }) {
  const [playerName, setPlayerName] = useState(
    localStorage.getItem("playerName") || ""
  );

  function handleNameSubmit(e) {
    e.preventDefault();
    if (playerName.trim()) {
      localStorage.setItem("playerName", playerName.trim());
      if (socket) socket.emit("setName", playerName.trim());
      if (onSubmit) onSubmit(playerName.trim());
    }
  }

  return (
    <div className="welcome-overlay">
      <div className="welcome-box">
        <h1>Red Light - Green Light</h1>
        <p>
          <b>How to play:</b> <br />
          Move forward when the light is <span style={{color: "var(--green)"}}>green</span> by showing an open palm to your webcam.<br />
          Stop moving when the light is <span style={{color: "var(--red)"}}>red</span> by making a fist.<br />
          If you move on red, you’re out for the round!
        </p>
        <p>
          <b>Privacy:</b><br />
          Your webcam video is <u>never transmitted</u>—it stays on your device and is only used for gesture detection in your browser.
        </p>
        <form onSubmit={handleNameSubmit} className="welcome-form">
          <label>
            <b>Enter your name to start:</b>
            <input
              type="text"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              maxLength={16}
              required
              autoFocus
            />
          </label>
          <button type="submit">Enter Lobby</button>
        </form>
        <p style={{fontSize: "0.9em", color: "#888", marginTop: "8px"}}>
          Please allow video access when prompted.
        </p>
      </div>
    </div>
  );
}