/** @format */

import React, { useEffect, useState, useRef } from "react";
//___________________DECLARATION DES VARIABLES_______________________
const GRID_SIZE = 50;
const CELL_SIZE = 10;
const Game = () => {
  const [grid, setGrid] = useState(
    Array(GRID_SIZE)
      .fill()
      .map(() => Array(GRID_SIZE).fill(null))
  );
  const [players, setPlayers] = useState({});
  const [chat, setChat] = useState([]);
  const [message, setMessage] = useState("");
  const wsRef = useRef(null);
  const chatEndRef = useRef(null);
  const [timer, setTimer] = useState(10);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const soundList = [
    "sound1.mp3",
    "sound2.mp3",
    "sound3.mp3",
    "sound4.mp3",
    "sound5.mp3",
    "sound6.mp3",
  ];

  const playSound = (index) => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: "sound", soundIndex: index }));
    }
  };
  //___________________GESTION DES WEBSOCKETS_______________________
  useEffect(() => {
    const wsUrl = process.env.REACT_APP_WEBSOCKET_URL;

    if (!wsUrl) {
      console.error("Aucune URL WebSocket");
      return;
    }

    wsRef.current = new WebSocket(wsUrl);
    wsRef.current.onopen = () => {
      console.log("Connexion établie avec le serveur WebSocket");
    };

    wsRef.current.onmessage = (message) => {
      const data = JSON.parse(message.data);
      if (data.type === "currentPlayer") {
        setCurrentPlayer(data.playerId);
        console.log("Joueur : ", data.playerId);
      }
      if (data.type === "update") {
        setGrid(data.gameState.grid);
        setPlayers(data.gameState.players);
        setTimer(data.gameState.timer);
      }
      if (data.type === "chat") {
        setChat(data.chat);
      }
      if (data.type === "sound") {
        const audio = new Audio(`/sounds/${data.sound}`);
        audio.play();
      }
    };

    return () => wsRef.current.close();
  }, []);

  const handleKeyDown = (e) => {
    const directions = {
      ArrowUp: { dx: 0, dy: -1 },
      ArrowDown: { dx: 0, dy: 1 },
      ArrowLeft: { dx: -1, dy: 0 },
      ArrowRight: { dx: 1, dy: 0 },
    };
    if (directions[e.key]) {
      wsRef.current.send(
        JSON.stringify({
          type: "changeDirection",
          direction: directions[e.key],
        })
      );
    }
  };
  //___________________GESTION DES TOUCHES_______________________
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  //___________________ENVOI DE MESSAGES_______________________
  const sendMessage = () => {
    if (message.trim()) {
      wsRef.current.send(JSON.stringify({ type: "chat", message }));
      setMessage("");
    }
  };

  //___________________SCROLL AUTOMATIQUE DU CHAT_______________________
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chat]);

  return (
    <div className="h-screen bg-black text-white flex w-screen min-h-screen overflow-y-auto">
      {/* _______________________Tableau des Scores_______________________ */}
      <aside className="w-64 bg-black p-4 flex flex-col items-start border-r border-white h-full min-h-0">
        <h1 className="text-xl font-bold mb-4">Tableau des Scores</h1>
        <div className="flex flex-col gap-3 overflow-y-auto">
          {Object.values(players)
            .sort((a, b) => b.score - a.score) // Trier les joueurs par score décroissant
            .map((player, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  style={{
                    backgroundColor: player.color,
                    width: "20px",
                    height: "20px",
                  }}
                  className="rounded"
                />
                <div className="text-sm font-medium">
                  <span className="text-gray-400">{player.name}</span>:{" "}
                  {player.score} %
                  {player.playerId === currentPlayer && (
                    <span className="text-yellow-400"> (vous)</span>
                  )}
                </div>
              </div>
            ))}
        </div>
      </aside>
      {/* _______________________Jeu_______________________ */}
      <main className="flex-1 flex flex-col items-center justify-center min-h-0">
        <h1 className="text-5xl font-bold mb-8">King-Painting</h1>
        <div className="text-2xl font-bold mb-16">
          {timer} secondes restantes
        </div>
        <div
          className="relative"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
          }}
        >
          {grid.map((row, y) =>
            row.map((cell, x) => (
              <div
                key={`${x}-${y}`}
                className="border border-gray-800"
                style={{
                  width: `${CELL_SIZE}px`,
                  height: `${CELL_SIZE}px`,
                  backgroundColor: cell || "black",
                }}
              />
            ))
          )}
          {Object.values(players).map((player, index) => (
            <div
              key={index}
              className="absolute"
              style={{
                top: `${player.y * CELL_SIZE}px`,
                left: `${player.x * CELL_SIZE}px`,
                width: `${CELL_SIZE}px`,
                height: `${CELL_SIZE}px`,
                backgroundColor: player.color,
              }}
            />
          ))}
        </div>
      </main>
      {/*____________________________________Chat et Soundboard_______________________________________*/}
      <aside className="bg-black p-4 flex flex-col items-start border-l border-white h-full min-h-0">
        <h1 className="text-xl font-bold mb-4">Chat en ligne</h1>
        <div className="flex flex-col gap-2 mb-4 overflow-y-auto h-64 w-full">
          {chat.map((msg, index) => (
            <div key={index} className="text-sm">
              <span className="text-gray-400">
                {msg.message.split("\n").map((line, lineIndex) => {
                  {
                    /*____________________________________REDECOUPE LE TEXTE_______________________________________*/
                  }
                  const colorMatch = line.match(/#([0-9a-fA-F]{6})/);
                  const scoreMatch = line;
                  const message = line.replace(/#([0-9a-fA-F]{6})/g, "");

                  const lineColor = colorMatch
                    ? colorMatch[0]
                    : msg.playerColor;
                  const lineScore = scoreMatch ? scoreMatch[0] : null;
                  return (
                    <div
                      key={lineIndex}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: "2px",
                      }}
                    >
                      <div
                        style={{
                          backgroundColor: lineColor,
                          width: "10px",
                          height: "10px",
                          marginRight: "5px",
                        }}
                      ></div>
                      <span>
                        {lineScore && (
                          <span className="text-gray-400">{message}</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </span>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Votre message..."
            className="flex-1 bg-gray-800 p-2 text-sm text-white rounded"
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button
            onClick={sendMessage}
            className="bg-blue-500 px-4 py-2 text-sm rounded hover:bg-blue-600 transition-colors duration-300"
          >
            Envoyer
          </button>
        </div>
        <h1 className="text-xl font-bold mt-6 mb-2">Soundboard</h1>
        <div className="w-full mb-4 h-auto overflow-y-auto p-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            {soundList.map((sound, index) => (
              <button
                key={index}
                onClick={() => playSound(index)}
                className="bg-gray-700 px-4 py-2 text-sm rounded hover:bg-gray-600"
              >
                Sound {index + 1}
              </button>
            ))}
          </div>
        </div>

        <h1 className="text-xl font-bold mt-6 mb-2">Règles du jeu</h1>
        <p className="text-sm">
          - Déplacez-vous avec les flèches du clavier
          <br />
          - Coloriez le plus de cases possible
          <br />- Le joueur avec le plus de cases coloriées gagne
        </p>
      </aside>
    </div>
  );
};

export default Game;
