import React from "react";
import { GameCard } from "./GameCard";
import { Gamepad2, Hash, Bird, Car } from "lucide-react";

interface GameGridProps {
  onGameSelect: (gameId: string) => void;
}

export const GameGrid: React.FC<GameGridProps> = ({ onGameSelect }) => {
  const games = [
    {
      id: "snake",
      title: "Snake",
      description: "Classic snake game with swipe controls",
      icon: Gamepad2,
      bestScore: localStorage.getItem("snakeHighScore") || "0",
      comingSoon: false,
    },
    {
      id: "2048",
      title: "2048",
      description: "Merge numbers to reach 2048",
      icon: Hash,
      bestScore: localStorage.getItem("2048HighScore") || "0",
      comingSoon: false,
    },
    {
      id: "flappybird",
      title: "Flappy Bird",
      description: "Tap to flap through obstacles",
      icon: Bird,
      bestScore: localStorage.getItem("flappy_best") || "0",
      comingSoon: false,
    },
    {
      id: "racing",
      title: "Car Racing",
      description: "Swipe to dodge traffic",
      icon: Car,
      bestScore: localStorage.getItem("carRacingHighScore") || "0",
      comingSoon: false,
    },
  ];

  return (
    <section id="games" className="py-10 sm:py-16">
      <div className="max-w-screen-lg mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-10 sm:mb-14">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
            Choose Your
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent ml-1">
              Adventure
            </span>
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
            Classic arcade games rebuilt for the modern era. Perfect for quick
            gaming sessions or competitive play.
          </p>
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {games.map((game) => (
            <GameCard
              key={game.id}
              title={game.title}
              description={game.description}
              icon={game.icon}
              bestScore={game.bestScore}
              onPlay={() => onGameSelect(game.id)}
              comingSoon={game.comingSoon}
            />
          ))}
        </div>

        {/* More Games Coming */}
        <div className="text-center mt-10 sm:mt-14">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-4 py-2 rounded-full bg-secondary/50 backdrop-blur-sm border border-border/50">
            <span className="text-accent animate-pulse">✨</span>
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">
              More games coming soon...
            </span>
            <span className="text-accent animate-pulse">✨</span>
          </div>
        </div>
      </div>
    </section>
  );
};
