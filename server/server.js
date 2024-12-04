/** @format */
const { clear } = require("console");
const express = require("express");
const http = require("http");
const path = require("path");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const port = process.env.PORT || 8080;

// Configuration de l'état du jeu
const gameState = {
  players: {}, // { id: { x, y, color, score, direction: { dx, dy } } }
  grid: Array(50)
    .fill()
    .map(() => Array(50).fill(null)), // Grille de couleurs
  timer: 10,
  chat: [], // Ajout d'un tableau pour stocker les messages de chat
};

// Liste des sons disponibles
const sounds = ["sound1.mp3", "sound2.mp3", "sound3.mp3"]; // Remplacez par vos fichiers sonores

// Réinitialisation périodique de la grille et des scores
setInterval(() => {
  gameState.timer -= 1;
  if (gameState.timer <= 0) {
    gameState.timer = 60;
    gameState.grid = gameState.grid.map((row) => row.map(() => null));
    Object.values(gameState.players).forEach((player) => (player.score = 0));
  }
  broadcastGameState();
}, 2000);

// Mise à jour automatique des positions des joueurs
setInterval(() => {
  Object.values(gameState.players).forEach((player) => {
    if (player) {
      // Mise à jour des positions en fonction de la direction
      player.x = Math.max(0, Math.min(49, player.x + player.direction.dx));
      player.y = Math.max(0, Math.min(49, player.y + player.direction.dy));

      // Coloration de la grille
      gameState.grid[player.y][player.x] = player.color;

      // Calcul du score en fonction des cellules peintes
      const totalCells = gameState.grid.flat().length;
      const paintedCells = gameState.grid
        .flat()
        .filter((cell) => cell === player.color).length;
      player.score = Math.floor((paintedCells / totalCells) * 100);
    }
  });
  broadcastGameState();
}, 50); // Mise à jour toutes les 50ms

// Diffusion de l'état du jeu à tous les clients
function broadcastGameState() {
  const state = JSON.stringify({ type: "update", gameState });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(state);
    }
  });
}

// Gestion des connexions WebSocket
wss.on("connection", (ws) => {
  const playerId = Math.random().toString(36).substr(2, 9);
  const playerColor = `#${Math.floor(Math.random() * 16777215).toString(16)}`;
  gameState.players[playerId] = {
    x: 25,
    y: 25,
    color: playerColor,
    score: 0,
    direction: { dx: 1, dy: 0 }, // Direction initiale
  };
  broadcastGameState();

  ws.on("message", (message) => {
    try {
      // Analyser le message JSON
      const data = JSON.parse(message);
      // Récupérer le joueur actuel
      const player = gameState.players[playerId];
      // Gestion des messages WebSocket
      switch (data.type) {
        case "chat":
          if (data.message) {
            const chatMessage = { playerColor, message: data.message };
            gameState.chat.push(chatMessage);

            // Diffuser le chat
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(
                  JSON.stringify({ type: "chat", chat: gameState.chat })
                );
              }
            });
          }
          break;

        case "sound":
          const selectedSound = sounds[data.soundIndex];
          if (selectedSound) {
            // Diffuser le son
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(
                  JSON.stringify({ type: "sound", sound: selectedSound })
                );
              }
            });
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
      console.error(
        "Erreur lors de la gestion d'un message WebSocket :",
        error
      );
    }
  });

  // Déconnexion du joueur
  ws.on("close", () => {
    delete gameState.players[playerId];
    gameState.grid = gameState.grid.map((row) =>
      row.map((cell) => (cell === playerColor ? null : cell))
    );
    broadcastGameState();
  });
});

// Rendre le front-end React
app.use(express.static(path.resolve(__dirname, "../build")));
app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "../build", "index.html"));
});

server.listen(port, () => {
  clear();
  const separator = "═".repeat(50);
  console.log(`\n${separator}`);
  console.log("✨ Serveur WebSocket et Express démarré avec succès ! ✨");
  console.log(`🚀 En écoute sur le port : \x1b[33m${port}\x1b[0m`);
  console.log(`${separator}\n`);
});
