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
  roundEndTime = Date.now() + 60_000; // 1 minute from now
  io.emit("roundStarted", { roundEndTime });

  scheduleNextLight();
  setTimeout(endRound, 60_000);
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

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  // Send current round info to new player
  socket.emit("welcome", {
    roundActive,
    roundEndTime,
    gameLight,
  });

  socket.on("playerUpdate", (data) => {
    // later: save to DB
    console.log("Update from player:", socket.id, data);
  });

  socket.on("disconnect", () => {
    console.log("Player disconnected:", socket.id);
  });
});

// Start first round when server boots
startNewRound();

server.listen(3000, () => {
  console.log("Game server running on port 3000");
});
