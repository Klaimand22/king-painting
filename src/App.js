import React, { useEffect, useState, useRef } from "react";

const GRID_SIZE = 50;
const CELL_SIZE = 10;

const App = () => {
  const [grid, setGrid] = useState(
    Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(null))
  );
  const [players, setPlayers] = useState({});
  const [chat, setChat] = useState([]);
  const [message, setMessage] = useState("");
  const wsRef = useRef(null);
  const chatEndRef = useRef(null);

  const [timer, setTimer] = useState(10);

  useEffect(() => {
    wsRef.current = new WebSocket("ws://localhost:8080");

    wsRef.current.onmessage = (message) => {
      const data = JSON.parse(message.data);
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
    const moves = {
      ArrowUp: { dx: 0, dy: -1 },
      ArrowDown: { dx: 0, dy: 1 },
      ArrowLeft: { dx: -1, dy: 0 },
      ArrowRight: { dx: 1, dy: 0 },
    };
    if (moves[e.key]) {
      wsRef.current.send(JSON.stringify({ type: "move", ...moves[e.key] }));
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const sendMessage = () => {
    if (message.trim()) {
      wsRef.current.send(JSON.stringify({ type: "chat", message }));
      setMessage("");
    }
  };

  const playSound = (index) => {
    wsRef.current.send(JSON.stringify({ type: "sound", soundIndex: index }));
  };

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chat]);


  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Tableau des scores */}
      <aside className="w-64 bg-black p-4 flex flex-col items-start border-r border-white">
        <h1 className="text-xl font-bold mb-4">Tableau des Scores</h1>
        <div className="flex flex-col gap-3">
          {Object.values(players).map((player, index) => (
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
                <span className="text-gray-400">{player.id}</span>:{" "}
                {player.score} %
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Aire de jeu */}
      <main className="flex-1 flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold mb-16">King-Painting</h1>
        <div className="text-2xl font-bold mb-16">{timer} secondes restantes</div>
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
        <p className="text-sm mt-8 font-sans"> Utilisez les touches fléchées pour vous déplacer</p>
        <p className="text-sm font-sans">Le but du jeu est de colorier le plus de cases possible avant la fin du temps imparti</p>
      </main>

      {/* Chat et Soundboard */}
      <aside className=" bg-black p-4 flex flex-col items-start border-l border-white">
        <h1 className="text-xl font-bold mb-4">Chat en ligne</h1>
        <div className="flex flex-col gap-2 mb-4 overflow-y-scroll h-64 w-full">
          {chat.map((msg, index) => (
            <div key={index} className="text-sm">
              <span className="text-gray-400"><div style={{ backgroundColor: msg.playerColor, width: '10px', height: '10px', display: 'inline-block', marginRight: '5px' }}></div>{msg.message}</span>
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
            className="bg-blue-500 px-4 py-2 text-sm rounded"
          >
            Envoyer
          </button>
        </div>

        <h1 className="text-xl font-bold mt-6 mb-2">Soundboard</h1>
        <div className="flex flex-wrap gap-2">
          {["Sound 1", "Sound 2", "Sound 3"].map((label, index) => (
            <button
              key={index}
              onClick={() => playSound(index)}
              className="bg-gray-700 px-4 py-2 text-sm rounded hover:bg-gray-600"
            >
              {label}
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
};

export default App;
