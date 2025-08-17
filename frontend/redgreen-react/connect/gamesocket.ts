// useGameSocket.ts
import { io, Socket } from "socket.io-client";
import { useEffect, useState } from "react";

export function useGameSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameLight, setGameLight] = useState<"RED" | "GREEN">("GREEN");
  const [roundEndTime, setRoundEndTime] = useState<number | null>(null);
  const [players, setPlayers] = useState<Record<string, { name: string; position: number }>>({});

  useEffect(() => {
    const s = io("https://redgreen-host.onrender.com");
    setSocket(s);

    s.on("welcome", (data) => {
      setGameLight(data.gameLight);
      setRoundEndTime(data.roundEndTime);
      if (data.players) setPlayers(data.players);
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

    return () => {
      s.disconnect();
    };
  }, []);

  return { socket, gameLight, roundEndTime, players};
}
