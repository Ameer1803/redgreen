// server.ts
import { Server } from "socket.io";
import express from "express";
import http from "http";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }, // allow React dev server
});

let roundActive = false;
let roundEndTime: number | null = null;
let gameLight: "RED" | "GREEN" = "GREEN";
let lightTimeout: NodeJS.Timeout | null = null;

function startNewRound() {
  roundActive = true;
roundEndTime = Date.now() + 90_000; // 1 minute 30 seconds from now
  io.emit("roundStarted", { roundEndTime });

  scheduleNextLight();
  setTimeout(endRound, 90_000);
}

function scheduleNextLight() {
  const delay = (1 + Math.floor(Math.random() * 4)) * 1000; // 1-4s
  lightTimeout = setTimeout(() => {
    gameLight = gameLight === "RED" ? "GREEN" : "RED";
    io.emit("gameLight", { light: gameLight });
    scheduleNextLight();
  }, delay);
}

function endRound() {
  roundActive = false;
  if (lightTimeout) clearTimeout(lightTimeout);
  io.emit("roundEnded", {});

  // Immediately start new round
  setTimeout(startNewRound, 100);
}

interface Player {
  name: string;
  position: number;
}

const players: Record<string, Player> = {};

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  // Default until we get their real name
  players[socket.id] = { name: "Anonymous", position: 0 };

  // Send current round info to new player
  socket.emit("welcome", {
    roundActive,
    roundEndTime,
    gameLight,
    players,
    leaderboard,
  });

  // Handle name set
  socket.on("setName", (name: string) => {
    players[socket.id].name = name;
    io.emit("playersUpdate", players);
  });

  // Handle position updates
  socket.on("playerUpdate", (data: { position: number }) => {
    if (players[socket.id]) {
      players[socket.id].position = data.position;
      io.emit("playersUpdate", players);
    }
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("playersUpdate", players);
    console.log("Player disconnected:", socket.id);
  });

  socket.on("playerFinished", (data: { name: string; time: number }) => {
    updateLeaderboard(data.name, data.time);
    io.emit("leaderboardUpdate", leaderboard);
  });
});

// Start first round when server boots
startNewRound();

server.listen(3000, () => {
  console.log("Game server running on port 3000");
});

interface LeaderboardEntry {
  name: string;
  time: number; // in ms
}

const leaderboard: LeaderboardEntry[] = [];

function updateLeaderboard(name: string, time: number) {
  leaderboard.push({ name, time });
  leaderboard.sort((a, b) => a.time - b.time); // fastest first
  if (leaderboard.length > 5) leaderboard.length = 5;
}
