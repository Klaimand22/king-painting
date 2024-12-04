const { clear } = require("console");
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Configuration de l'état du jeu -> Stocke les informations des joueurs et la grille de couleurs
const gameState = {
  players: {}, // Stocke les informations des joueurs { id: { x, y, color, score } }
  grid: Array(50)
    .fill()
    .map(() => Array(50).fill(null)), // Stocke les couleurs de la grille
  timer: 10,
};

// Chat en ligne -> Stocke les messages du chat
const chat = [];
const sounds = ['test.mp3'];



// Fonction pour mettre à jour le jeu toutes les secondes -> Réinitialise la grille après 60 secondes
setInterval(() => {
  gameState.timer -= 1;
  if (gameState.timer <= 0) {
    gameState.timer = 60;
    gameState.grid = gameState.grid.map((row) => row.map(() => null));
  }

  // si le timer est à 0, on remet à 0 les scores des joueurs et on enleve les couleurs de la grille
  if (gameState.timer === 0) {
    Object.keys(gameState.players).forEach((playerId) => {
      gameState.players[playerId].score = 0;
    });
    gameState.grid = gameState.grid.map((row) => row.map(() => null));
  }

  broadcastGameState();
}, 1000);


// Fonction pour diffuser à tous les clients l'état du jeu mis à jour
function broadcastGameState() {
  const state = JSON.stringify({ type: "update", gameState });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(state);
    }
  });
}

// Gérer les connexions WebSocket des clients -> Gérer les messages de déplacement et de score
wss.on("connection", (ws) => {
  const playerId = Math.random().toString(36).substr(2, 9);
  const playerColor = `#${Math.floor(Math.random() * 16777215).toString(16)}`;
  gameState.players[playerId] = { x: 25, y: 25, color: playerColor, score: 0 };
  broadcastGameState();

  // Gérer les messages des clients -> Gérer les déplacements et les scores
  ws.on("message", (message) => {
    const data = JSON.parse(message);

    if (data.type === "chat") {
        const chatMessage = { playerColor, message: data.message };
        chat.push(chatMessage);

        // Diffuser le chat
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: "chat", chat }));
          }
        });
      }



      if (data.type === "sound") {
        const selectedSound = sounds[data.soundIndex];
        if (selectedSound) {
          // Diffuser le son
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: "sound", sound: selectedSound }));
            }
          });
        }
      }


    //calculer le score des joueurs
    if (data.type === "score") {
      const players = gameState.players;
      const playersScore = Object.keys(players).map((playerId) => {
        return {
          id: playerId,
          score: players[playerId].score,
        };
      });
      ws.send(JSON.stringify({ type: "score", playersScore }));
    }



    if (data.type === "move") {
      const player = gameState.players[playerId];
      if (player) {
        // Mise à jour de la position du joueur
        const { dx, dy } = data;
        player.x = Math.max(0, Math.min(49, player.x + dx));
        player.y = Math.max(0, Math.min(49, player.y + dy));

        // Peindre sur la grille
        gameState.grid[player.y][player.x] = player.color;

        // calculer le score suivant la peinture de la meme couleur de joueur en fonction de la surface totale de la grille
        const totalCells = gameState.grid.flat().length;
        const playerCells = gameState.grid
          .flat()
          .filter((cell) => cell === player.color).length;
        player.score = Math.floor((playerCells / totalCells) * 100);

        // Diffuser les changements
        broadcastGameState();
      }
    }

    if (data.type === "chat") {
      chat.push(data.message);
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: "chat", chat }));
        }
      });
    }

  });
  // Gérer la déconnexion du joueur -> Si un joueur se déconnecte, supprimez-le de l'état du jeu
  ws.on("close", () => {
    delete gameState.players[playerId];
    // supprimer les cellules peintes par le joueur
    gameState.grid = gameState.grid.map((row) =>
      row.map((cell) => (cell === playerColor ? null : cell))
    );
    broadcastGameState();
  });
});

// Serveur Express
server.listen(8080, () => {
  clear();
  const separator = "═".repeat(50);
  console.log(`\n${separator}`);
  console.log("✨ Serveur WebSocket et Express démarré avec succès ! ✨");
  console.log(`🚀 En écoute sur le port : \x1b[33m8080\x1b[0m`);
  console.log(`${separator}\n`);
});
