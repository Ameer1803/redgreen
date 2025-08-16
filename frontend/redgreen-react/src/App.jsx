import React, { useEffect, useRef, useState } from "react";
import "./App.css";
import { initGestureDetector, stopGestureDetector } from "../mediapipe/detect";
import { useGameSocket } from "../socket/gamesocket";
import WelcomeOverlay from "./welcome";


export default function App() {
  // Local player walk toggle (will be set by Mediapipe later).
  const [walking, setWalking] = useState(false);
  // Simple position (server will authoritatively update in real app).
  const [pos, setPos] = useState(0);
  const [confidence, setConfidence] = useState("0.0");
  const [timeLeft, setTimeLeft] = useState("0:00");
  const [gameOver, setGameOver] = useState(false);
  const [finished, setFinished] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [startTime, setStartTime] = useState(Date.now());
  const [playerName, setPlayerName] = useState(localStorage.getItem("playerName") || "");
  // Webcam preview (no processing yet)
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

   const bestFinishers = [
    { name: "weifhrw", time: "1:30:383" },
    { name: "weifhrw", time: "1:30:383" },
    { name: "weifhrw", time: "1:30:383" },
    { name: "weifhrw", time: "1:30:383" },
    { name: "weifhrw", time: "1:30:383" },
  ];

  const { socket, gameLight: serverGameLight, roundEndTime, players, leaderboard } = useGameSocket();
  const gameLight = serverGameLight === "GREEN" ? "green" : "red";


    useEffect(() => {
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadeddata = () => {
            initGestureDetector(
              videoRef.current,
              canvasRef.current,
              ({ gesture, score }) => {
                if (gesture === "Open_Palm") setWalking(true);
                else if (gesture === "Closed_Fist") setWalking(false);
                setConfidence((score * 100).toFixed(1));
              }
            );
          };
        }
      } catch (e) {
        console.warn("Webcam not available:", e);
      }
    })();
    return () => stopGestureDetector();
  }, []);

  useEffect(() => {
    if (!roundEndTime) {
      setTimeLeft("0:00");
      return;
    }
    function updateTime() {
      const ms = Math.max(0, roundEndTime - Date.now());
      const sec = Math.floor(ms / 1000);
      const min = Math.floor(sec / 60);
      const remSec = sec % 60;
      setTimeLeft(`${min}:${remSec.toString().padStart(2, "0")}`);
    }
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [roundEndTime]);

  useEffect(() => {
    console.log(players)
    if (gameLight === "red" && walking && !gameOver) {
      const timeout = setTimeout(() => {
        if (walking && gameLight === "red") {
          setGameOver(true);
        }
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [gameLight, walking, gameOver]);

  useEffect(() => {
    if (gameOver || finished) return;
    let hasEmitted = false; // <-- local guard
    const intervalId = setInterval(() => {
      if (gameLight === "green" && walking) {
        setPos((prevPos) => {
          const nextPos = Math.min(prevPos + 0.8, 100);
          if (nextPos >= 100 && !hasEmitted) {
            hasEmitted = true; // prevent further emits
            setFinished(true);
            const finishTime = Date.now() - startTime;
            if (socket && playerName) {
              socket.emit("playerFinished", { name: playerName, time: finishTime });
            }
          }
          return nextPos;
        });
      }
    }, 100);
    return () => clearInterval(intervalId);
  }, [gameLight, walking, gameOver, finished, socket, playerName, startTime]);

  //round beginning logic here
  useEffect(() => {
    setPos(0);
    setGameOver(false);
    setFinished(false);
    setWalking(false);
    setStartTime(Date.now());
  }, [roundEndTime]);

  // Send position to backend when it changes
  useEffect(() => {
    if (socket) {
      socket.emit("playerUpdate", { position: pos });
    }
  }, [pos, socket]);

  // TODO: Replace this with your WebSocket handler:
  // ws.onmessage = (msg) => setGameLight(msg.light); // "red" | "green"

  // Use the value from the socket:

  return (
    <>
    {showWelcome && (
      <WelcomeOverlay
        socket={socket}
        onSubmit={() => setShowWelcome(false)}
      />
    )}
    <div className={`app app-${gameLight}`}>

      {/* Main area: left = track, right = light/rules panel */}
      <main className="main">
        {/* Track */}
        <TrackSection pos={pos} gameOver={gameOver} finished={finished} players={players} mySocketId={socket?.id} />
      </main>

      {/* Bottom bar */}
      <footer className="bottombar">
        {/* Bottom-left: site title + description */}
        <div className="container">
          <div className = "images">
          {/* <img className = "logo" src = "image.png" alt = "icg logo"></img> */}
          <img className = "titleImg" src = "Red.png" alt = "title logo"></img>
          </div>
          <div className = "info">
            <div className="timer">
              <h3> Time Left </h3>
              <h3>{timeLeft}</h3>
            </div>

            <div className = "finishers">
              <h3>Leaderboard</h3>
              <ul>
                {leaderboard.map((entry, idx) => (
                  <li key={idx}>
                    <span className="finisher-no">{idx + 1}</span>
                    <span className="finisher-name">{entry.name}</span>
                    <span className="finisher-time">{(entry.time / 1000).toFixed(2)} s</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom-right: webcam + processed input */}
        <div className="io-panel">
          <div className="cam">
            <video ref={videoRef} autoPlay playsInline muted />
            <canvas
              ref={canvasRef}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                pointerEvents: "none",
                width: "100%",
                height: "100%",
              }}
            />
            <div className="cam-label">webcam</div>
          </div>
        </div>
        <div className ="io-panel mediapipe-section">
          <h3> Detected Symbol</h3>
          <div className="emoji">{walking ? "🖐️" : "✊"}</div>
          <table>
            <tbody>
              <tr>
                <td>Input method</td>
                <td>{walking ? "Walk": "Still"}</td>
              </tr>
              <tr>
                <td>Confidence Score</td>
                <td>{confidence}</td>
              </tr>
            </tbody>
          </table>
          
        </div>
      </footer>
    </div>
    </>
  );
}

// Simple seeded pseudo-random function for stable vertical placement
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
      {/* My player: always centered vertically */}
      <div
        className="player"
        style={{
          left: `calc(${pos}% - 10px)`,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 2,
        }}
        title={`You (${pos.toFixed(0)}%)`}
      />
      {/* Other players: small, green, random vertical position */}
      {otherPlayers.map((p) => (
        <div
          key={p.id}
          style={{
            left: `calc(${p.position}% - 6px)`,
            top: `${Math.round(seededRandom(p.id) * 90) + 5}%`,
            width: "12px",
            height: "12px",
            background: "var(--green)",
            borderRadius: "50%",
            position: "absolute",
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            className="player other"
            style={{
              width: "12px",
              height: "12px",
              background: "var(--green)",
              borderRadius: "50%",
            }}
            title={`${p.name} (${p.position.toFixed(0)}%)`}
          />
          <span
            style={{
              fontSize: "0.7em",
              color: "rgba(222, 236, 222, 1)",
              marginTop: "15  px",
              whiteSpace: "nowrap",
              textShadow: "0 1px 2px #000",
              lineHeight: 1,
            }}
          >
            {p.name}
          </span>
        </div>
      ))}
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
