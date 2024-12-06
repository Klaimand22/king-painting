/** @format */

import React from "react";
import { BrowserRouter as Router, Route, Routes, Link } from "react-router-dom";
import { PaintbrushIcon } from "lucide-react";
import Game from "./Game";
import { useState } from "react";

// fetch en post pour récupérer le nombre de joueurs /api/players

// Composants pour chaque page
function Home() {
  const [nombreJoueurs, setNombreJoueurs] = useState(0);
  fetch("/api/players", {
    method: "POST",
  })
    .then((response) => response.json())
    .then((data) => {
      setNombreJoueurs(data);
      console.log("Nombre de joueurs en ligne :", nombreJoueurs);
    });

  // si connexion sur mobile alors on redirige vers le composant Phone
  if (window.innerWidth < 768) {
    return <Phone />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary-background">
      <div className="text-center space-y-16 p-32 bg-red-400 text-white rounded-xl shadow-xl">
        <div className="space-y-4">
          <PaintbrushIcon className="w-16 h-16 mx-auto text-primary" />
          <h1 className="text-4xl font-bold">King-Painting</h1>
          <p className="text-muted-foreground text-lg"></p>
        </div>
        <div className="space-x-4">
          <Link
            to="/game"
            className="btn btn-primary bg-white p-4 text-black rounded-xl hover:bg-red-400 transition-all duration-500 hover:text-white px-8 mt-7"
          >
            Rejoindre la partie public
          </Link>
        </div>
        <h2 className="text-muted-foreground text-sm">
          {" "}
          {nombreJoueurs} joueurs en ligne
        </h2>
      </div>
    </div>
  );
}

function JoinGame() {
  return <Game />;
}

function Phone() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary-background bg-red-400">
      <h1 className="text-4xl font-bold text-white text-center">
        King-Painting est disponible uniquement sur ordinateur
      </h1>
    </div>
  );
}

// Application principale
export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game/" element={<JoinGame />} />
      </Routes>
    </Router>
  );
}
