// useGameSocket.ts
import { io, Socket } from "socket.io-client";
import { useEffect, useState } from "react";

interface LeaderboardEntry {
  name: string;
  time: number; // in milliseconds
}

export function useGameSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameLight, setGameLight] = useState<"RED" | "GREEN">("GREEN");
  const [roundEndTime, setRoundEndTime] = useState<number | null>(null);
  const [players, setPlayers] = useState<Record<string, { name: string; position: number }>>({});
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    const s = io("https://redgreen-host.onrender.com");
    setSocket(s);

    s.on("welcome", (data) => {
      setGameLight(data.gameLight);
      setRoundEndTime(data.roundEndTime);
      if (data.players) setPlayers(data.players);
      if (data.leaderboard) setLeaderboard(data.leaderboard);
    });

    s.on("roundStarted", (data) => {
      setRoundEndTime(data.roundEndTime);
    });

    s.on("gameLight", (data) => {
      setGameLight(data.light);
    });

    s.on("roundEnded", () => {
      setRoundEndTime(null);
    });

    s.on("playersUpdate", (players) => {
      setPlayers(players);
    });

    s.on("leaderboardUpdate", (lb) => {
      setLeaderboard(lb);
    });

    return () => {
      s.disconnect();
    };
  }, []);

  return { socket, gameLight, roundEndTime, players, leaderboard };
}
