import React, { useState, useEffect, useCallback, useRef } from "react";
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
  const GRID_ROWS = 20; // height
  const GRID_COLS = 25; // width
  const CELL_SIZE = 20;
  const INITIAL_SNAKE: Position[] = [{ x: Math.floor(GRID_COLS / 2), y: Math.floor(GRID_ROWS / 2) }]; // properly centered
  const INITIAL_DIRECTION: Direction = "RIGHT";

  const [snake, setSnake] = useState<Position[]>(INITIAL_SNAKE);
  const [food, setFood] = useState<Position>({ x: 15, y: 15 });
  const [direction, setDirection] = useState<Direction>(INITIAL_DIRECTION);
  const [nextDirection, setNextDirection] = useState<Direction>(INITIAL_DIRECTION);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem("snakeHighScore") || "0"));
  const [gameOver, setGameOver] = useState(false);
  const [cellSize, setCellSize] = useState(CELL_SIZE);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Generate new food - corrected for any grid dimensions
  const generateFood = useCallback((): Position => {
    const emptyCells: Position[] = [];
    for (let x = 0; x < GRID_COLS; x++) {
      for (let y = 0; y < GRID_ROWS; y++) {
        if (!snake.some((s) => s.x === x && s.y === y)) emptyCells.push({ x, y });
      }
    }
    if (emptyCells.length === 0) return { x: Math.floor(GRID_COLS / 2), y: Math.floor(GRID_ROWS / 2) };
    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
  }, [snake]);

  const resetGame = () => {
    const initialSnake = [{ x: Math.floor(GRID_COLS / 2), y: Math.floor(GRID_ROWS / 2) }];
    setSnake(initialSnake);
    // Generate food away from initial snake position
    let newFood;
    do {
      newFood = { x: Math.floor(Math.random() * GRID_COLS), y: Math.floor(Math.random() * GRID_ROWS) };
    } while (newFood.x === initialSnake[0].x && newFood.y === initialSnake[0].y);
    setFood(newFood);
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
      if (head.x < 0 || head.x >= GRID_COLS || head.y < 0 || head.y >= GRID_ROWS) {
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

  // Fullscreen management - only for game canvas
  const gameCanvasRef = useRef<HTMLDivElement>(null);

  const enterFullscreen = useCallback(async () => {
    try {
      if (gameCanvasRef.current && gameCanvasRef.current.requestFullscreen) {
        await gameCanvasRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (error) {
      console.log('Fullscreen not supported or denied');
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.exitFullscreen && document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.log('Exit fullscreen error');
    }
    setIsFullscreen(false);
  }, []);

  const handleGoBack = useCallback(async () => {
    await exitFullscreen();
    onClose();
  }, [exitFullscreen, onClose]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Modified start game
  const startGame = async () => {
    if (gameOver) resetGame();
    setIsPlaying(true);
    await enterFullscreen();
  };

  useEffect(() => {
    const resize = () => {
      const isMobile = window.innerWidth < 768;
      const marginWidth = isMobile ? 40 : 160;
      const marginHeight = isMobile ? 300 : 200;
      const maxWidth = isMobile ? window.innerWidth - marginWidth : Math.min(800, window.innerWidth - marginWidth);
      const maxHeight = isMobile ? window.innerHeight - marginHeight : Math.min(600, window.innerHeight - marginHeight);
      const sizeByWidth = Math.floor(maxWidth / GRID_COLS);
      const sizeByHeight = Math.floor(maxHeight / GRID_ROWS);
      const size = Math.min(sizeByWidth, sizeByHeight);
      setCellSize(Math.max(6, size));
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Touch controls for fullscreen
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!isFullscreen) return;
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };
    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current || e.changedTouches.length === 0) return;
      const touchEnd = e.changedTouches[0];
      const deltaX = touchEnd.clientX - touchStartRef.current.x;
      const deltaY = touchEnd.clientY - touchStartRef.current.y;
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);
      // Minimum swipe distance
      if (absDeltaX < 40 && absDeltaY < 40) return;
      // Determine swipe direction
      if (absDeltaX > absDeltaY) {
        // Horizontal swipe
        if (deltaX > 0 && direction !== "LEFT") {
          setNextDirection("RIGHT");
        } else if (deltaX < 0 && direction !== "RIGHT") {
          setNextDirection("LEFT");
        }
      } else {
        // Vertical swipe
        if (deltaY > 0 && direction !== "UP") {
          setNextDirection("DOWN");
        } else if (deltaY < 0 && direction !== "DOWN") {
          setNextDirection("UP");
        }
      }
    };
    const canvas = gameCanvasRef.current;
    if (canvas) {
      canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
      canvas.addEventListener('touchend', handleTouchEnd, { passive: true });
    }
    return () => {
      if (canvas) {
        canvas.removeEventListener('touchstart', handleTouchStart);
        canvas.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [isFullscreen, direction]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="game-card w-full max-w-full mx-auto max-h-[100vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-sm">🐍</span>
            </div>
            <h2 className="text-2xl font-bold text-foreground">Snake</h2>
          </div>
          <button
            onClick={handleGoBack}
            className="game-btn-secondary p-2 hover:bg-destructive hover:text-destructive-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
          {/* Stats / Info - Full width container */}
          <div className="space-y-4 w-full">
            <div className="grid grid-cols-3 gap-4 text-center w-full">
              <div className="bg-gradient-to-br from-accent/20 to-accent/5 rounded-lg p-4 border border-accent/20 w-full">
                <div className="text-2xl font-bold text-accent">{score}</div>
                <div className="text-xs text-muted-foreground">Current Score</div>
              </div>
              <div className="bg-gradient-to-br from-green-500/20 to-green-500/5 rounded-lg p-4 border border-green-500/20 w-full">
                <div className="text-2xl font-bold text-green-500">{snake.length}</div>
                <div className="text-xs text-muted-foreground">Snake Length</div>
              </div>
              <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg p-4 border border-primary/20 w-full">
                <div className="text-2xl font-bold text-primary">{highScore}</div>
                <div className="text-xs text-muted-foreground">Best Score</div>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-secondary/50 border border-border/50 space-y-2 w-full">
              <div className="text-sm font-semibold text-foreground">Instructions</div>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Arrow keys to move</li>
                <li>Avoid walls & yourself</li>
                <li>Eat apples to grow</li>
                <li>Pause: Space / Button</li>
              </ul>
            </div>
          </div>

          {/* Game Board - Centered and full screen capable */}
          <div className="relative flex justify-center w-full lg:col-span-1">
            <div
              ref={gameCanvasRef}
              className={`relative ${isFullscreen ? 'fixed inset-0 bg-black z-[60]' : ''} bg-black border border-border/50 rounded-xl overflow-hidden`}
              style={
                isFullscreen
                  ? { width: '100vw', height: '100vh', borderRadius: 0 }
                  : {
                      width: `${GRID_COLS * cellSize}px`,
                      height: `${GRID_ROWS * cellSize}px`,
                      backgroundSize: `${cellSize}px ${cellSize}px`,
                      backgroundImage:
                        "linear-gradient(to right, #333 1px, transparent 1px), linear-gradient(to bottom, #333 1px, transparent 1px)",
                    }
              }
            >
              {isFullscreen ? (
                <div className="relative w-full h-full">
                  <p style={{ color: 'black' }}>hi there</p>

                  
                  {/* Top UI Bar - Score and Exit - Full width */}
                  <div className="absolute top-0 left-0 right-0 z-20 p-6">
                    <div className="flex justify-between items-center w-full">
                      {/* Score Panel - Extended with Length, Current, and Best */}

<div className="bg-black/90 backdrop-blur-sm rounded-2xl p-6 border border-white/20 flex-1 max-w-4xl mx-auto">
                        <div className="text-white grid grid-cols-3 gap-6 text-center max-w-4xl">
                          <div>
                            <div className="text-2xl font-bold text-green-400 max-w-4xl">{snake.length}</div>
                            <div className="text-sm text-gray-400">Length</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-blue-400  max-w-4xl">{score}</div>
                            <div className="text-sm text-gray-400">Score</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-yellow-400  max-w-4xl">{highScore}</div>
                            <div className="text-sm text-gray-400">Best</div>
                          </div>
                        </div>
                      </div>
                      {/* Exit Button */}
                      <button
                        onClick={exitFullscreen}
                        className="bg-gray-800/90 backdrop-blur-sm hover:bg-gray-700/90 rounded-full p-4 border border-white/20 transition-colors ml-6"
                      >
                        <X className="w-8 h-8 text-white" />
                      </button>
                    </div>
                  </div>

                  {/* Game Canvas - Full screen optimized */}
                  <div
                    className="relative w-full h-full"
                    style={{
                      marginTop: '120px',
                      marginBottom: '100px',
                      backgroundSize: `${window.innerWidth / GRID_COLS}px ${(window.innerHeight - 220) / GRID_ROWS}px`,
                      backgroundImage:
                        "linear-gradient(to right, #333 1px, transparent 1px), linear-gradient(to bottom, #333 1px, transparent 1px)",
                    }}
                  >
                    {/* Top stats inside canvas */}
                    {/* <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/70 backdrop-blur-sm rounded-2xl p-4 flex gap-6 z-50 border border-white/20">
                      <div className="text-center">
                        <div className="text-green-400 font-bold text-2xl">{snake.length}</div>
                        <div className="text-sm text-gray-300">Length</div>
                      </div>
                      <div className="text-center">
                        <div className="text-blue-400 font-bold text-2xl">{score}</div>
                        <div className="text-sm text-gray-300">Score</div>
                      </div>
                      <div className="text-center">
                        <div className="text-yellow-400 font-bold text-2xl">{highScore}</div>
                        <div className="text-sm text-gray-300">Best</div>
                      </div>
                    </div> */}

                    {/* Snake segments */}
                    {snake.map((segment, idx) => {
                      const fullscreenCellWidth = window.innerWidth / GRID_COLS;
                      const fullscreenCellHeight = (window.innerHeight - 220) / GRID_ROWS;
                      return (
                        <div
                          key={idx}
                          className="absolute rounded-sm shadow-lg"
                          style={{
                            width: `${fullscreenCellWidth - 4}px`,
                            height: `${fullscreenCellHeight - 4}px`,
                            left: `${segment.x * fullscreenCellWidth + 2}px`,
                            top: `${segment.y * fullscreenCellHeight + 2}px`,
                            backgroundColor: idx === 0 ? '#ffffff' : '#f0f0f0',
                            border: idx === 0 ? '2px solid #e0e0e0' : '1px solid #d0d0d0',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                          }}
                        />
                      );
                    })}

                    {/* Food */}
                    <div
                      className="absolute flex items-center justify-center"
                      style={{
                        width: `${window.innerWidth / GRID_COLS - 4}px`,
                        height: `${(window.innerHeight - 220) / GRID_ROWS - 4}px`,
                        left: `${food.x * (window.innerWidth / GRID_COLS) + 2}px`,
                        top: `${food.y * ((window.innerHeight - 220) / GRID_ROWS) + 2}px`,
                        fontSize: `${Math.min(
                          Math.min(window.innerWidth / GRID_COLS, (window.innerHeight - 220) / GRID_ROWS) * 0.8,
                          40
                        )}px`,
                        textShadow: '2px 2px 6px rgba(0,0,0,0.8)',
                      }}
                    >
                      🍎
                    </div>

                    {/* Game Over Overlay */}
                    {gameOver && (
                      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center">
                        <div className="text-center space-y-6 text-white bg-black/80 backdrop-blur-sm rounded-3xl p-10 border border-white/20 max-w-md">
                          <h3 className="text-5xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                            Game Over!
                          </h3>
                          {score === highScore && score > 0 && (
                            <p className="text-yellow-400 font-semibold text-2xl">🏆 New High Score!</p>
                          )}
                          <div className="flex gap-6 justify-center">
                            <button
                              onClick={startGame}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl text-xl font-semibold flex items-center transition-colors"
                            >
                              <RotateCcw className="w-6 h-6 mr-3" /> Play Again
                            </button>
                            <button
                              onClick={exitFullscreen}
                              className="bg-gray-600 hover:bg-gray-700 text-white px-8 py-4 rounded-2xl text-xl font-semibold transition-colors"
                            >
                              Go Back
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Start Game Overlay */}
                    {!isPlaying && !gameOver && (
                      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center">
                        <div className="text-center space-y-8 bg-black/80 backdrop-blur-sm rounded-3xl p-12 border border-white/20">
                          <div className="text-white">
                            <h3 className="text-5xl font-bold mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                              Ready to Play?
                            </h3>
                            <p className="text-xl text-gray-300">Use arrow keys or swipe to control the snake</p>
                          </div>
                          <button
                            onClick={startGame}
                            className="bg-green-600 hover:bg-green-700 text-white px-16 py-6 rounded-2xl text-2xl font-bold flex items-center transition-colors"
                          >
                            <Play className="w-8 h-8 mr-4" /> Start Game
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom Control Instructions - Full width */}
                  <div className="absolute bottom-0 left-0 right-0 z-20 p-6">
                    <div className="bg-black/90 backdrop-blur-sm rounded-2xl p-6 border border-white/20 w-full">
                      {/* <div className="flex justify-center items-center gap-12 text-white">
                        <div className="flex items-center gap-4">
                          <div className="bg-blue-600 rounded-lg p-3">
                            <span className="text-3xl">⬅️➡️</span>
                          </div>
                          <span className="text-xl font-medium">Horizontal</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="bg-blue-600 rounded-lg p-3">
                            <span className="text-3xl">⬆️⬇️</span>
                          </div>
                          <span className="text-xl font-medium">Vertical</span>
                        </div>
                      </div> */}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Regular game view - professional white snake */}
                  {snake.map((segment, idx) => (
                    <div
                      key={idx}
                      className="absolute rounded-sm shadow-md"
                      style={{
                        width: `${cellSize - 2}px`,
                        height: `${cellSize - 2}px`,
                        left: `${segment.x * cellSize + 1}px`,
                        top: `${segment.y * cellSize + 1}px`,
                        backgroundColor: idx === 0 ? '#ffffff' : '#f0f0f0',
                        border: idx === 0 ? '2px solid #e0e0e0' : '1px solid #d0d0d0',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                      }}
                    />
                  ))}

                  {/* Regular food styling - clean without circle */}
                  <div
                    className="absolute flex items-center justify-center"
                    style={{
                      width: `${cellSize - 2}px`,
                      height: `${cellSize - 2}px`,
                      left: `${food.x * cellSize + 1}px`,
                      top: `${food.y * cellSize + 1}px`,
                      fontSize: `${Math.min(16, cellSize * 0.8)}px`,
                    }}
                  >
                    🍎
                  </div>

                  {/* Professional game over overlay */}
                  {gameOver && (
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center">
                      <div className="text-center space-y-6 text-white bg-black/60 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                        <h3 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                          Game Over!
                        </h3>
                        {score === highScore && score > 0 && (
                          <p className="text-yellow-400 font-semibold text-xl">🏆 New High Score!</p>
                        )}
                        <div className="flex gap-4 justify-center">
                          <button
                            onClick={startGame}
                            className="game-btn-primary px-8 py-4 text-lg flex items-center justify-center"
                          >
                            <RotateCcw className="w-6 h-6 mr-3" /> Play Again
                          </button>
                          <button
                            onClick={exitFullscreen}
                            className="game-btn-secondary px-8 py-4 text-lg"
                          >
                            Go Back
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Professional start game overlay */}
                  {!isPlaying && !gameOver && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center">
                      <div className="text-center space-y-6 bg-black/60 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                        <div className="text-white">
                          <h3 className="text-3xl font-bold mb-4">Ready to Play?</h3>
                          <p className="text-gray-300 mb-6">Use arrow keys or swipe to control the snake</p>
                        </div>
                        <button
                          onClick={startGame}
                          className="game-btn-primary px-12 py-6 text-2xl flex items-center"
                        >
                          <Play className="w-8 h-8 mr-4" /> Start Game
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Controls - Full width */}
          <div className="space-y-4 w-full">
            <div className="flex gap-2">
              <button onClick={pauseToggle} disabled={gameOver} className="game-btn-secondary flex-1 py-3">
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              <button onClick={resetGame} className="game-btn-secondary flex-1 py-3">
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