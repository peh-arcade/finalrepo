import React, { useState, useEffect, useCallback } from "react";
import { X, RotateCcw, Play, Pause } from "lucide-react";

interface SnakeGameProps {
  onClose: () => void;
}

interface Position {
  x: number;
  y: number;
}

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

export const SnakeGame: React.FC<SnakeGameProps> = ({ onClose }) => {
  const GRID_SIZE = 20;
  const CELL_SIZE = 20;
  const INITIAL_SNAKE: Position[] = [{ x: 10, y: 10 }];
  const INITIAL_DIRECTION: Direction = "RIGHT";

  const [snake, setSnake] = useState<Position[]>(INITIAL_SNAKE);
  const [food, setFood] = useState<Position>({ x: 15, y: 15 });
  const [direction, setDirection] = useState<Direction>(INITIAL_DIRECTION);
  const [nextDirection, setNextDirection] = useState<Direction>(INITIAL_DIRECTION);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(
    () => parseInt(localStorage.getItem("snakeHighScore") || "0")
  );
  const [gameOver, setGameOver] = useState(false);
  const [cellSize, setCellSize] = useState(CELL_SIZE);

  // Generate new food
  const generateFood = useCallback((): Position => {
    const emptyCells: Position[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        if (!snake.some((s) => s.x === x && s.y === y)) emptyCells.push({ x, y });
      }
    }
    if (emptyCells.length === 0) return { x: 0, y: 0 };
    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
  }, [snake]);

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setFood(generateFood());
    setDirection(INITIAL_DIRECTION);
    setNextDirection(INITIAL_DIRECTION);
    setIsPlaying(false);
    setScore(0);
    setGameOver(false);
  };

  const moveSnake = useCallback(() => {
    setSnake((prevSnake) => {
      if (!isPlaying || gameOver) return prevSnake;

      const newSnake = [...prevSnake];
      const head = { ...newSnake[0] };

      setDirection(nextDirection);

      switch (nextDirection) {
        case "UP":
          head.y -= 1;
          break;
        case "DOWN":
          head.y += 1;
          break;
        case "LEFT":
          head.x -= 1;
          break;
        case "RIGHT":
          head.x += 1;
          break;
      }

      if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        setGameOver(true);
        setIsPlaying(false);
        return prevSnake;
      }

      if (newSnake.some((segment) => segment.x === head.x && segment.y === head.y)) {
        setGameOver(true);
        setIsPlaying(false);
        return prevSnake;
      }

      newSnake.unshift(head);

      if (head.x === food.x && head.y === food.y) {
        const newScore = score + 10;
        setScore(newScore);
        if (newScore > highScore) {
          setHighScore(newScore);
          localStorage.setItem("snakeHighScore", newScore.toString());
        }
        setFood(generateFood());
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [food, gameOver, isPlaying, nextDirection, score, highScore, generateFood]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(moveSnake, 150);
    return () => clearInterval(interval);
  }, [moveSnake, isPlaying]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowUp":
          if (direction !== "DOWN") setNextDirection("UP");
          break;
        case "ArrowDown":
          if (direction !== "UP") setNextDirection("DOWN");
          break;
        case "ArrowLeft":
          if (direction !== "RIGHT") setNextDirection("LEFT");
          break;
        case "ArrowRight":
          if (direction !== "LEFT") setNextDirection("RIGHT");
          break;
        case " ":
          setIsPlaying((prev) => !prev);
          break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [direction]);

  const pauseToggle = () => {
    if (gameOver) return;
    setIsPlaying((prev) => !prev);
  };

  const startGame = () => {
    if (gameOver) resetGame();
    setIsPlaying(true);
  };

  useEffect(() => {
    const resize = () => {
      const maxWidth = Math.min(400, window.innerWidth - 160);
      const size = Math.floor(maxWidth / GRID_SIZE);
      setCellSize(Math.max(12, Math.min(24, size)));
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="game-card w-full max-w-5xl mx-auto max-h-[100vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-sm">🐍</span>
            </div>
            <h2 className="text-2xl font-bold text-foreground">Snake</h2>
          </div>
          <button
            onClick={onClose}
            className="game-btn-secondary p-2 hover:bg-destructive hover:text-destructive-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Stats / Info */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-accent">{score}</div>
                  <div className="text-xs text-muted-foreground">Score</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">{highScore}</div>
                  <div className="text-xs text-muted-foreground">Best</div>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-secondary/50 border border-border/50 space-y-2">
                <div className="text-sm font-semibold text-foreground">Instructions</div>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Arrow keys to move</li>
                  <li>Avoid walls & yourself</li>
                  <li>Eat apples to grow</li>
                  <li>Pause: Space / Button</li>
                </ul>
              </div>
            </div>

          {/* Game Board */}
          <div className="relative flex justify-center">
            <div
              className="relative bg-black border border-border/50 rounded-xl overflow-hidden"
              style={{
                width: `${GRID_SIZE * cellSize}px`,
                height: `${GRID_SIZE * cellSize}px`,
                backgroundSize: `${cellSize}px ${cellSize}px`,
                backgroundImage:
                  "linear-gradient(to right, #333 1px, transparent 1px), linear-gradient(to bottom, #333 1px, transparent 1px)",
              }}
            >
              {/* Snake */}
              {snake.map((segment, idx) => (
                <div
                  key={idx}
                  className="absolute bg-white rounded-sm"
                  style={{
                    width: `${cellSize - 2}px`,
                    height: `${cellSize - 2}px`,
                    left: `${segment.x * cellSize + 1}px`,
                    top: `${segment.y * cellSize + 1}px`,
                  }}
                />
              ))}

              {/* Food */}
              <div
                className="absolute flex items-center justify-center"
                style={{
                  width: `${cellSize - 4}px`,
                  height: `${cellSize - 4}px`,
                  left: `${food.x * cellSize + 2}px`,
                  top: `${food.y * cellSize + 2}px`,
                  fontSize: Math.min(24, cellSize) + 'px',
                }}
              >
                🍎
              </div>

              {/* Overlays */}
              {gameOver && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                  <div className="text-center space-y-4 text-white">
                    <h3 className="text-3xl font-bold">Game Over!</h3>
                    <p className="text-lg">Score: {score}</p>
                    <button
                      onClick={startGame}
                      className="game-btn-primary px-6 py-3 flex items-center justify-center mx-auto"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" /> Play Again
                    </button>
                  </div>
                </div>
              )}

              {!isPlaying && !gameOver && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <button
                    onClick={startGame}
                    className="game-btn-primary px-8 py-4 flex items-center"
                  >
                    <Play className="w-5 h-5 mr-2" /> Start Game
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-4">
            <div className="flex gap-2">
              <button
                onClick={pauseToggle}
                disabled={gameOver}
                className="game-btn-secondary flex-1 py-3"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              <button
                onClick={resetGame}
                className="game-btn-secondary flex-1 py-3"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 rounded-lg bg-accent/10 border border-accent/20 text-xs text-muted-foreground space-y-1">
              <p className="text-accent font-semibold mb-1">Tips</p>
              <p>Space to pause/resume</p>
              <p>Grow by eating apples</p>
              <p>Avoid collisions</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
