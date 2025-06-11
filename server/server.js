/** @format */

//__________________________ DECLARATION DES VARIABLES __________________________
const { clear } = require("console");
const express = require("express");
const http = require("http");
const path = require("path");
const WebSocket = require("ws");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const port = process.env.PORT_BACK;
const basePath = process.env.BASE_PATH;
const timer = 60;

const sounds = [
  "sound1.mp3",
  "sound2.mp3",
  "sound3.mp3",
  "sound4.mp3",
  "sound5.mp3",
  "sound6.mp3",
];

const gameState = {
  players: {},
  grid: Array(50)
    .fill()
    .map(() => Array(50).fill(null)),
  timer: timer,
  chat: [],
};

//__________________________ GESTION DES WEBSOCKETS __________________________
wss.on("connection", (ws) => {
  const playerId = Math.random().toString(36).substr(2, 9);
  const playerColor = `#${Math.floor(Math.random() * 16777215).toString(16)}`;
  gameState.players[playerId] = {
    x: 25,
    y: 25,
    color: playerColor,
    score: 0,
    direction: { dx: 1, dy: 0 },
    playerId,
  };

  ws.send(JSON.stringify({ type: "currentPlayer", playerId }));
  broadcastGameState();

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      const player = gameState.players[playerId];
      switch (data.type) {
        case "chat":
          if (data.message) {
            const chatMessage = { playerColor, message: data.message };
            gameState.chat.push(chatMessage);
            broadcastToAll({ type: "chat", chat: gameState.chat });
          }
          break;

        case "sound":
          const selectedSound = sounds[data.soundIndex];
          if (selectedSound) {
            broadcastToAll({ type: "sound", sound: selectedSound });
          }
          break;

        case "changeDirection":
          if (player && data.direction) {
            player.direction = data.direction;
          }
          break;

        default:
          console.log("Type de message non reconnu :", data.type);
      }
    } catch (error) {
      console.error("Erreur WebSocket :", error);
    }
  });

  ws.on("close", () => {
    delete gameState.players[playerId];
    gameState.grid = gameState.grid.map((row) =>
      row.map((cell) => (cell === playerColor ? null : cell))
    );
    broadcastGameState();
  });

  function broadcastGameState() {
    broadcastToAll({ type: "update", gameState });
  }

  function broadcastToAll(data) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  }

  setInterval(() => {
    Object.values(gameState.players).forEach((player) => {
      if (player) {
        player.x = Math.max(0, Math.min(49, player.x + player.direction.dx));
        player.y = Math.max(0, Math.min(49, player.y + player.direction.dy));
        gameState.grid[player.y][player.x] = player.color;
        const totalCells = gameState.grid.flat().length;
        const paintedCells = gameState.grid
          .flat()
          .filter((cell) => cell === player.color).length;
        player.score = Math.floor((paintedCells / totalCells) * 100);
      }
    });
    broadcastGameState();
  }, 50);

  setInterval(() => {
    gameState.timer -= 1;
    if (gameState.timer <= 0) {
      const scorePlayerPodium = Object.values(gameState.players).sort(
        (a, b) => b.score - a.score
      );
      let chatMessage;
      if (scorePlayerPodium.length === 0) {
        chatMessage = "🏆 Fin du jeu ! Aucun joueur n'a participé !";
      } else {
        chatMessage = `🏆 Fin du jeu !\n🥇 ${scorePlayerPodium[0].color} : ${scorePlayerPodium[0].score}%`;
        if (scorePlayerPodium[1])
          chatMessage += `\n🥈 ${scorePlayerPodium[1].color} : ${scorePlayerPodium[1].score}%`;
        if (scorePlayerPodium[2])
          chatMessage += `\n🥉 ${scorePlayerPodium[2].color} : ${scorePlayerPodium[2].score}%`;
      }
      gameState.chat.push({ message: chatMessage });
      broadcastToAll({ type: "chat", chat: gameState.chat });
      gameState.timer = timer;
      gameState.chat = [];
      gameState.grid = gameState.grid.map((row) => row.map(() => null));
      Object.values(gameState.players).forEach((player) => (player.score = 0));
    }
    broadcastGameState();
  }, 1000);
});

app.use(basePath, express.static(path.resolve(__dirname, "../build")));
app.get(`${basePath}/*`, (req, res) => {
  res.sendFile(path.resolve(__dirname, "../build", "index.html"));
});

app.post(`${basePath}/api/players`, (req, res) => {
  res.json(Object.values(gameState.players).length);
});

server.listen(port, () => {
  const separator = "═".repeat(50);
  console.log(`\n${separator}`);
  console.log("✨ Serveur WebSocket et Express démarré avec succès ! ✨");
  console.log(
    `🚀 En écoute sur : \x1b[33mhttp://localhost:${port}${basePath}\x1b[0m`
  );
  console.log(`${separator}\n`);
});
