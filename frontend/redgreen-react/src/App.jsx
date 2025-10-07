import React, { useEffect, useRef, useState } from "react";
  import "./App.css";
  import { initGestureDetector, stopGestureDetector } from "../mediapipe/detect";
  import { useGameSocket } from "../connect/gamesocket";
  import WelcomeOverlay from "./components/welcome";
  import TrackSection from "./components/track";
  import { saveScore, getTop5 } from "../connect/supabaseClient";

  export default function App() {
    // --- NEW: State for tracking connection status ---
    const [isLoading, setIsLoading] = useState(true);

    const [walking, setWalking] = useState(false);
    const [pos, setPos] = useState(0);
    const [confidence, setConfidence] = useState("0.0");
    const [timeLeft, setTimeLeft] = useState("0:00");
    const [gameOver, setGameOver] = useState(false);
    const [finished, setFinished] = useState(false);
    const [showWelcome, setShowWelcome] = useState(true);
    const [startTime, setStartTime] = useState(Date.now());
    const [playerName, setPlayerName] = useState(localStorage.getItem("playerName") || "");
    const [leaderboard, setLeaderboard] = useState([]);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    const { socket, gameLight, roundEndTime, players } = useGameSocket();

    // --- NEW: useEffect to handle socket connection status ---
    useEffect(() => {
      if (socket) {
        // Function to run on connection
        const onConnect = () => {
          console.log("Connected to server.");
          setIsLoading(false);
        };

        // Function to run on disconnection
        const onDisconnect = () => {
          console.log("Disconnected from server.");
          setIsLoading(true);
        };

        // Check initial connection status
        if (socket.connected) {
          onConnect();
        }

        // Add event listeners
        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);

        // Cleanup on component unmount
        return () => {
          socket.off("connect", onConnect);
          socket.off("disconnect", onDisconnect);
        };
      }
    }, [socket]);


    //video feed
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

  //time and round updation
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

  //game logic
  useEffect(() => {
    console.log(players)
    if (gameLight === "RED" && walking && !gameOver) {
      const timeout = setTimeout(() => {
        if (walking && gameLight === "RED") {
          setGameOver(true);
        }
      }, 600);
      return () => clearTimeout(timeout);
    }
  }, [gameLight, walking, gameOver]);

  //update position and finish logic
  useEffect(() => {
    if (gameOver || finished) return;
    let hasEmitted = false; // make sure we dont submit to leaderboard more than once
    const intervalId = setInterval(() => {
      if (gameLight === "GREEN" && walking) {
        setPos((prevPos) => {
          const nextPos = Math.min(prevPos + 0.8, 100);
          if (nextPos >= 100 && !hasEmitted) {
            hasEmitted = true;
            setFinished(true);
            const finishTime = Date.now() - startTime;
            if (socket && playerName) {
              saveScore(playerName, finishTime).then(() => {
              getTop5().then(setLeaderboard);
              });
            }
          }
          return nextPos;
        });
      }
    }, 100);
    return () => clearInterval(intervalId);
  }, [gameLight, walking, gameOver, finished, socket, playerName, startTime]);

  //round restart logic here
  useEffect(() => {
    setPos(0);
    setGameOver(false);
    setFinished(false);
    setWalking(false);
    setStartTime(Date.now());

    getTop5().then(setLeaderboard);
  }, [roundEndTime]);

  // Send position to backend when it changes
  useEffect(() => {
    if (socket) {
      socket.emit("playerUpdate", { position: pos });
    }
  }, [pos, socket]);

    // --- NEW: Conditional rendering for the loading screen ---
    if (isLoading) {
      return (
        <div className="loading-screen">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <h2>Connecting to server...</h2>
            <p>Establishing connection to game server</p>
          </div>
        </div>
      );
    }

    return (
      <>
      {showWelcome && (
        <WelcomeOverlay
          socket={socket}
          onSubmit={() => setShowWelcome(false)}
        />
      )}
      <div className={`app app-${gameLight}`}>


        <main className="main">
          <TrackSection pos={pos} gameOver={gameOver} finished={finished} players={players} mySocketId={socket?.id} />
        </main>


        <footer className="bottombar">

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
                {/* <h3>Leaderboard</h3> */}
                <ul>
                  {leaderboard.map((entry, idx) => (
                    <li key={idx}>
                      <span className="finisher-no">{idx + 1}</span>
                      <span className="finisher-name">{entry.player_name}</span>
                      <span className="finisher-time">{(entry.time_ms / 1000).toFixed(2)} s</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>


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