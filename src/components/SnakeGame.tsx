import React, { useState, useEffect, useCallback, useRef } from "react";
import { X, RotateCcw, Play, Pause, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import "./FlamingoPage.css";
import "./SnakeGame.css";

interface SnakeGameProps {
  onClose: () => void;
}

interface Position {
  x: number;
  y: number;
}

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

export const SnakeGame: React.FC<SnakeGameProps> = ({ onClose }) => {
  const GRID_ROWS = 25;
  const GRID_COLS = 35;
  const CELL_SIZE = 16; // Official Snake cell size
  const INITIAL_SNAKE: Position[] = [
    { x: Math.floor(GRID_COLS / 2), y: Math.floor(GRID_ROWS / 2) }
  ];
  const INITIAL_DIRECTION: Direction = "RIGHT";
  const GAME_SPEED = 150; // Official Snake speed

  const [snake, setSnake] = useState<Position[]>(INITIAL_SNAKE);
  const [food, setFood] = useState<Position>({ x: 15, y: 15 });
  const [direction, setDirection] = useState<Direction>(INITIAL_DIRECTION);
  const [nextDirection, setNextDirection] = useState<Direction>(INITIAL_DIRECTION);
  const [isPlaying, setIsPlaying] = useState(true);
  const [score, setScore] = useState(0);
  const [length, setLength] = useState(1);
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem("snakeHighScore") || "0"));
  const [gameOver, setGameOver] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const gameCanvasRef = useRef<HTMLDivElement>(null);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || 'ontouchstart' in window);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Generate new food in empty position
  const generateFood = useCallback((): Position => {
    const emptyCells: Position[] = [];
    for (let x = 0; x < GRID_COLS; x++) {
      for (let y = 0; y < GRID_ROWS; y++) {
        if (!snake.some((s) => s.x === x && s.y === y)) {
          emptyCells.push({ x, y });
        }
      }
    }
    if (emptyCells.length === 0) {
      return { x: Math.floor(GRID_COLS / 2), y: Math.floor(GRID_ROWS / 2) };
    }
    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
  }, [snake]);

  const resetGame = () => {
    const initialSnake = [{ x: Math.floor(GRID_COLS / 2), y: Math.floor(GRID_ROWS / 2) }];
    setSnake(initialSnake);
    setFood(generateFood());
    setDirection(INITIAL_DIRECTION);
    setNextDirection(INITIAL_DIRECTION);
    setIsPlaying(true);
    setScore(0);
    setLength(1);
    setGameOver(false);
  };

  const moveSnake = useCallback(() => {
    setSnake((prevSnake) => {
      if (!isPlaying || gameOver) return prevSnake;
      
      const newSnake = [...prevSnake];
      const head = { ...newSnake[0] };
      setDirection(nextDirection);
      
      // Move head based on direction
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
      
      // Check wall collision
      if (head.x < 0 || head.x >= GRID_COLS || head.y < 0 || head.y >= GRID_ROWS) {
        setGameOver(true);
        setIsPlaying(false);
        return prevSnake;
      }
      
      // Check self collision
      if (newSnake.some((segment) => segment.x === head.x && segment.y === head.y)) {
        setGameOver(true);
        setIsPlaying(false);
        return prevSnake;
      }
      
      newSnake.unshift(head);
      
      // Check food collision
      if (head.x === food.x && head.y === food.y) {
        const newScore = score + 10;
        const newLength = length + 1;
        setScore(newScore);
        setLength(newLength);
        
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
  }, [food, gameOver, isPlaying, nextDirection, score, length, highScore, generateFood]);

  // Game loop with official Snake timing
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(moveSnake, GAME_SPEED);
    return () => clearInterval(interval);
  }, [moveSnake, isPlaying]);

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      e.preventDefault();
      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          if (direction !== "DOWN") setNextDirection("UP");
          break;
        case "ArrowDown":
        case "s":
        case "S":
          if (direction !== "UP") setNextDirection("DOWN");
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          if (direction !== "RIGHT") setNextDirection("LEFT");
          break;
        case "ArrowRight":
        case "d":
        case "D":
          if (direction !== "LEFT") setNextDirection("RIGHT");
          break;
        case " ":
          if (gameOver) return;
          setIsPlaying((prev) => !prev);
          break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [direction, gameOver]);

  // Touch controls
  useEffect(() => {
    const touchStartRef = { current: null as { x: number; y: number } | null };
    
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
      
      if (absDeltaX < 30 && absDeltaY < 30) return;
      
      if (absDeltaX > absDeltaY) {
        if (deltaX > 0 && direction !== "LEFT") {
          setNextDirection("RIGHT");
        } else if (deltaX < 0 && direction !== "RIGHT") {
          setNextDirection("LEFT");
        }
      } else {
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
  }, [direction]);

  const handleRestart = () => {
    resetGame();
  };

  const handleDirectionChange = (newDirection: Direction) => {
    if (gameOver || !isPlaying) return;
    
    if (
      (newDirection === "UP" && direction !== "DOWN") ||
      (newDirection === "DOWN" && direction !== "UP") ||
      (newDirection === "LEFT" && direction !== "RIGHT") ||
      (newDirection === "RIGHT" && direction !== "LEFT")
    ) {
      setNextDirection(newDirection);
    }
  };

  const formatNumber = (num: number): string => {
    return num.toString().padStart(4, '0');
  };

  const gridWidth = GRID_COLS * CELL_SIZE;
  const gridHeight = GRID_ROWS * CELL_SIZE;

  return (
    <div className="flamingo-overlay">
      <div className="flamingo-topbar">
        <button className="f-back" onClick={onClose}>
          ✕
        </button>
        <div className="f-score">
          Score: <strong>{formatNumber(score)}</strong>
        </div>
        <div className="f-high">
          Best: <strong>{formatNumber(highScore)}</strong>
        </div>
      </div>

      <div className="flamingo-canvas-wrap" style={{ 
        background: '#000', 
        padding: isMobile ? '10px' : '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 120px)'
      }}>
        <div className="snake-game-container" style={{
          maxWidth: isMobile ? '100%' : '700px',
          width: '100%'
        }}>
          {/* Game Header */}
          <div className="snake-game-header">
            <h1 className="snake-game-title">SNAKE</h1>
            <div className="snake-game-scores">
              <div className="snake-score-container">
                <div className="snake-score-label">SCORE</div>
                <div className="snake-score-value">{formatNumber(score)}</div>
              </div>
              <div className="snake-score-container">
                <div className="snake-score-label">LENGTH</div>
                <div className="snake-score-value">{formatNumber(length)}</div>
              </div>
              <div className="snake-score-container">
                <div className="snake-score-label">RECORD</div>
                <div className="snake-score-value">{formatNumber(highScore)}</div>
              </div>
            </div>
          </div>

          {/* Game Controls */}
          <div className="snake-game-controls">
            <button className="snake-restart-button" onClick={handleRestart}>
              <RotateCcw className="w-4 h-4 mr-2" />
              NEW GAME
            </button>
          </div>

          {/* Game Grid */}
          <div 
            ref={gameCanvasRef}
            className="snake-game-grid-container"
            style={{
              width: isMobile ? Math.min(gridWidth, window.innerWidth - 40) : gridWidth,
              height: isMobile ? Math.min(gridHeight, (window.innerWidth - 40) * (gridHeight / gridWidth)) : gridHeight,
              margin: '0 auto',
              position: 'relative'
            }}
          >
            {/* Grid Background */}
            <div className="snake-grid-background" />

            {/* Game Status */}
            <div className="snake-game-status">
              {isPlaying ? "PLAYING" : gameOver ? "GAME OVER" : "PAUSED"}
            </div>

            {/* Snake segments */}
            {snake.map((segment, idx) => {
              const cellSizeActual = isMobile ? 
                Math.min(CELL_SIZE, (window.innerWidth - 40) / GRID_COLS) : 
                CELL_SIZE;
              
              return (
                <div
                  key={idx}
                  className={`snake-segment ${
                    idx === 0 ? 'snake-head' : 
                    idx === snake.length - 1 ? 'snake-tail' : 
                    'snake-body'
                  } moving`}
                  style={{
                    left: segment.x * cellSizeActual,
                    top: segment.y * cellSizeActual,
                    width: cellSizeActual - 1,
                    height: cellSizeActual - 1
                  }}
                />
              );
            })}

            {/* Food */}
            <div
              className="snake-food"
              style={{
                left: food.x * (isMobile ? 
                  Math.min(CELL_SIZE, (window.innerWidth - 40) / GRID_COLS) : 
                  CELL_SIZE),
                top: food.y * (isMobile ? 
                  Math.min(CELL_SIZE, (window.innerWidth - 40) / GRID_COLS) : 
                  CELL_SIZE),
                width: (isMobile ? 
                  Math.min(CELL_SIZE, (window.innerWidth - 40) / GRID_COLS) : 
                  CELL_SIZE) - 2,
                height: (isMobile ? 
                  Math.min(CELL_SIZE, (window.innerWidth - 40) / GRID_COLS) : 
                  CELL_SIZE) - 2
              }}
            />

            {/* Game Over overlay */}
            {gameOver && (
              <div className="snake-game-overlay">
                <div className="snake-overlay-content">
                  <h2 className="snake-overlay-title">GAME OVER</h2>
                  <p className="snake-overlay-message">The snake has crashed!</p>
                  <div className="snake-overlay-stats">
                    <div className="snake-overlay-stat">FINAL SCORE: {formatNumber(score)}</div>
                    <div className="snake-overlay-stat">SNAKE LENGTH: {formatNumber(length)}</div>
                    <div className="snake-overlay-stat">FOOD EATEN: {formatNumber(length - 1)}</div>
                  </div>
                  {score === highScore && score > 0 && (
                    <p className="snake-new-record">★ NEW RECORD! ★</p>
                  )}
                  <div className="snake-overlay-buttons">
                    <button className="snake-overlay-button" onClick={handleRestart}>
                      PLAY AGAIN
                    </button>
                    <button className="snake-overlay-button" onClick={onClose}>
                      EXIT
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Controls */}
          {isMobile && (
            <div className="snake-mobile-controls-grid h-[100px]">
              <div className="snake-mobile-controls-title">CONTROLS</div>
              <div className="snake-mobile-controls-grid h-[50px]">

                <div></div>
                <button 
                  className="snake-control-button" 
                  onClick={() => handleDirectionChange('UP')}
                  disabled={gameOver || !isPlaying}
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <div></div>
                <button 
                  className="snake-control-button" 
                  onClick={() => handleDirectionChange('LEFT')}
                  disabled={gameOver || !isPlaying}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                  className="snake-control-button" 
                  onClick={() => setIsPlaying(prev => !prev)}
                  disabled={gameOver}
                  style={{ background: isPlaying ? '#cc3300' : '#003300' }}
                >
                  {isPlaying ? '⏸' : '▶'}
                </button>
                <button 
                  className="snake-control-button" 
                  onClick={() => handleDirectionChange('RIGHT')}
                  disabled={gameOver || !isPlaying}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div></div>
                <button 
                  className="snake-control-button" 
                  onClick={() => handleDirectionChange('DOWN')}
                  disabled={gameOver || !isPlaying}
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <div></div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flamingo-footer" style={{ 
        background: 'rgba(0, 0, 0, 0.9)',
        borderTop: '1px solid #00ff00'
      }}>
        <button
          className="f-control"
          onClick={() => {
            if (!gameOver) {
              setIsPlaying(prev => !prev);
            }
          }}
          disabled={gameOver}
          style={{ 
            background: '#003300',
            color: '#00ff00',
            border: '1px solid #00ff00'
          }}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <div className="f-controls-right">
          <button 
            className="f-small" 
            onClick={handleRestart}
            style={{ 
              background: '#003300',
              color: '#00ff00',
              border: '1px solid #00ff00'
            }}
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            RESTART
          </button>
          <div className="text-xs mt-1" style={{
            fontSize: isMobile ? '10px' : '12px',
            color: '#00aa00',
            fontFamily: '"Courier New", monospace'
          }}>
            {isMobile ? "SWIPE OR TAP TO MOVE" : "ARROW KEYS OR WASD"}
          </div>
        </div>
      </div>
    </div>
  );
};