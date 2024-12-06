/** @format */

//__________________________ DECLARATION DES VARIABLES __________________________
const { clear } = require("console");
const express = require("express");
const http = require("http");
const path = require("path");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const port = process.env.PORT || 8080;
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
  players: {}, // { id: { x, y, color, score, direction: { dx, dy } } }
  grid: Array(50)
    .fill()
    .map(() => Array(50).fill(null)), // Grille de couleurs
  timer: timer, // Timer de jeu
  chat: [], // Ajout d'un tableau pour stocker les messages de chat
};

//__________________________ GESTION DES WEBSOCKETS __________________________

//__________________________Connexion des joueurs__________________________

wss.on("connection", (ws) => {
  const playerId = Math.random().toString(36).substr(2, 9);
  const playerColor = `#${Math.floor(Math.random() * 16777215).toString(16)}`;
  gameState.players[playerId] = {
    x: 25,
    y: 25,
    color: playerColor,
    score: 0,
    direction: { dx: 1, dy: 0 }, // Direction initiale
    playerId,
  };

  // Envoyer l'ID du joueur courant au client
  ws.send(JSON.stringify({ type: "currentPlayer", playerId }));
  broadcastGameState();

  //__________________________Gestion des messages WebSocket__________________________
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
            // Diffuser le son à tous les clients
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

  // __________________________Gestion de la déconnexion__________________________
  ws.on("close", () => {
    delete gameState.players[playerId];
    gameState.grid = gameState.grid.map((row) =>
      row.map((cell) => (cell === playerColor ? null : cell))
    );
    broadcastGameState();
  });

  //__________________________Fonction de diffusion de l'état du jeu________________
  function broadcastGameState() {
    const state = JSON.stringify({ type: "update", gameState });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(state);
      }
    });
  }

  //__________________________Gestion du jeu__________________________
  // mise à jour de la position des joueurs et de la grille (toutes les 50 ms)
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
  }, 50);

  // Réinitialisation périodique de la grille et des scores (toutes les secondes)
  setInterval(() => {
    gameState.timer -= 1;
    if (gameState.timer <= 0) {
      //diffuser une message dans le chat pour annoncer la fin du jeu avec le score des joueurs
      //creation tableau des scores
      const scores = Object.values(gameState.players).map(
        (player) => `${player.color}: ${player.score}%`
      );
      const scorePlayerPodium = Object.values(gameState.players).sort(
        (a, b) => b.score - a.score
      );

      if (scorePlayerPodium.length === 0) {
        const chatMessage0 = {
          message: `____________________________\n🏆 Fin du jeu ! 🏆\nAucun joueur n'a participé !\n ____________________________`,
        };
        gameState.chat.push(chatMessage0);
      } else {
        switch (scorePlayerPodium.length) {
          case 1:
            const chatMessage1 = {
              message: `____________________________\n🏆 Fin du jeu ! 🏆\n🥇 ${scorePlayerPodium[0].color} : ${scorePlayerPodium[0].score}% \n ____________________________`,
            };
            gameState.chat.push(chatMessage1);
            break;

          case 2:
            const chatMessage2 = {
              message: `____________________________\n🏆 Fin du jeu ! 🏆\n🥇 ${scorePlayerPodium[0].color} : ${scorePlayerPodium[0].score}%\n🥈 ${scorePlayerPodium[1].color} : ${scorePlayerPodium[1].score}% \n ____________________________`,
            };
            gameState.chat.push(chatMessage2);
            break;

          case 3:
            const chatMessage3 = {
              message: `____________________________\n🏆 Fin du jeu ! 🏆\n🥇 ${scorePlayerPodium[0].color} : ${scorePlayerPodium[0].score}%\n🥈 ${scorePlayerPodium[1].color} : ${scorePlayerPodium[1].score}%\n🥉 ${scorePlayerPodium[2].color} : ${scorePlayerPodium[2].score}% \n ____________________________`,
            };
            gameState.chat.push(chatMessage3);
            break;

          default: // Pour les cas où il y a plus de 3 joueurs
            const chatMessage4 = {
              message: `____________________________\n🏆 Fin du jeu ! 🏆\n🥇 ${scorePlayerPodium[0].color} : ${scorePlayerPodium[0].score}%\n🥈 ${scorePlayerPodium[1].color} : ${scorePlayerPodium[1].score}%\n🥉 ${scorePlayerPodium[2].color} : ${scorePlayerPodium[2].score}% \n ____________________________`,
            };

            gameState.chat.push(chatMessage4);

            break;
        }
      }
      // Diffuser le chat
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: "chat", chat: gameState.chat }));
        }
      });
      gameState.timer = timer;
      gameState.chat = [];
      gameState.message = [];
      gameState.grid = gameState.grid.map((row) => row.map(() => null));
      Object.values(gameState.players).forEach((player) => (player.score = 0));
    }
    broadcastGameState();
  }, 1000);
});

// Rendre le front-end React
app.use(express.static(path.resolve(__dirname, "../build")));
app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "../build", "index.html"));
});

//renvoie le nombre de joueur (menu accueil)
app.post("/api/players", (req, res) => {
  res.json(Object.values(gameState.players).length);
});

server.listen(port, () => {
  clear();
  const separator = "═".repeat(50);
  console.log(`\n${separator}`);
  console.log("✨ Serveur WebSocket et Express démarré avec succès ! ✨");
  console.log(`🚀 En écoute sur le port : \x1b[33m${port}\x1b[0m`);
  console.log(`${separator}\n`);
});
