import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, RotateCcw, Play, Pause, ChevronLeft, ChevronRight, RotateCw, ChevronDown } from 'lucide-react';

interface TetrisGameProps {
  onClose: () => void;
}

interface Position {
  x: number;
  y: number;
}

type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

interface Tetromino {
  type: TetrominoType;
  position: Position;
  rotation: number;
  shape: number[][];
}

const TETROMINOES = {
  I: [[[1, 1, 1, 1]]],
  O: [[[1, 1], [1, 1]]],
  T: [[[0, 1, 0], [1, 1, 1]], [[1, 0], [1, 1], [1, 0]], [[1, 1, 1], [0, 1, 0]], [[0, 1], [1, 1], [0, 1]]],
  S: [[[0, 1, 1], [1, 1, 0]], [[1, 0], [1, 1], [0, 1]]],
  Z: [[[1, 1, 0], [0, 1, 1]], [[0, 1], [1, 1], [1, 0]]],
  J: [[[1, 0, 0], [1, 1, 1]], [[1, 1], [1, 0], [1, 0]], [[1, 1, 1], [0, 0, 1]], [[0, 1], [0, 1], [1, 1]]],
  L: [[[0, 0, 1], [1, 1, 1]], [[1, 0], [1, 0], [1, 1]], [[1, 1, 1], [1, 0, 0]], [[1, 1], [0, 1], [0, 1]]]
};

const COLORS = {
  I: 'bg-cyan-500',
  O: 'bg-yellow-500',
  T: 'bg-purple-500',
  S: 'bg-green-500',
  Z: 'bg-red-500',
  J: 'bg-blue-500',
  L: 'bg-orange-500'
};

export const TetrisGame: React.FC<TetrisGameProps> = ({ onClose }) => {
  const GRID_WIDTH = 14; // increased from 10
  const GRID_HEIGHT = 26; // increased from 20
  const INITIAL_SPEED = 800;
  const BASE_CELL = 20;

  const [scale, setScale] = useState(1);
  const [grid, setGrid] = useState<(TetrominoType | null)[][]>(() => 
    Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill(null))
  );
  const [currentPiece, setCurrentPiece] = useState<Tetromino | null>(null);
  const [nextPiece, setNextPiece] = useState<TetrominoType>(() => 
    Object.keys(TETROMINOES)[Math.floor(Math.random() * 7)] as TetrominoType
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('tetrisHighScore') || '0');
  });
  // Smooth fall interpolation (0..1 between logical drops)
  const [fallProgress, setFallProgress] = useState(0);
  const lastDropRef = React.useRef<number>(performance.now());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const gameCanvasRef = useRef<HTMLDivElement>(null);

  const generateTetromino = useCallback((type: TetrominoType): Tetromino => {
    return {
      type,
      position: { x: Math.floor(GRID_WIDTH / 2) - 1, y: 0 },
      rotation: 0,
      shape: TETROMINOES[type][0]
    };
  }, [GRID_WIDTH]);

  const getRandomTetromino = useCallback((): TetrominoType => {
    const types = Object.keys(TETROMINOES) as TetrominoType[];
    return types[Math.floor(Math.random() * types.length)];
  }, []);

  const isValidPosition = useCallback((piece: Tetromino, newGrid = grid): boolean => {
    const shapes = TETROMINOES[piece.type];
    const shape = shapes[piece.rotation % shapes.length];
    
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const newX = piece.position.x + x;
          const newY = piece.position.y + y;
          
          if (newX < 0 || newX >= GRID_WIDTH || newY >= GRID_HEIGHT) {
            return false;
          }
          
          if (newY >= 0 && newGrid[newY][newX]) {
            return false;
          }
        }
      }
    }
    return true;
  }, [grid, GRID_WIDTH, GRID_HEIGHT]);

  const placePiece = useCallback((piece: Tetromino): (TetrominoType | null)[][] => {
    const newGrid = grid.map(row => [...row]);
    const shapes = TETROMINOES[piece.type];
    const shape = shapes[piece.rotation % shapes.length];
    
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const newX = piece.position.x + x;
          const newY = piece.position.y + y;
          if (newY >= 0) {
            newGrid[newY][newX] = piece.type;
          }
        }
      }
    }
    return newGrid;
  }, [grid]);

  const clearLines = useCallback((newGrid: (TetrominoType | null)[][]): { grid: (TetrominoType | null)[][], linesCleared: number } => {
    const linesToClear: number[] = [];
    
    for (let y = 0; y < GRID_HEIGHT; y++) {
      if (newGrid[y].every(cell => cell !== null)) {
        linesToClear.push(y);
      }
    }
    
    if (linesToClear.length === 0) {
      return { grid: newGrid, linesCleared: 0 };
    }
    
    const filteredGrid = newGrid.filter((_, index) => !linesToClear.includes(index));
    const clearedGrid = [
      ...Array(linesToClear.length).fill(null).map(() => Array(GRID_WIDTH).fill(null)),
      ...filteredGrid
    ];
    
    return { grid: clearedGrid, linesCleared: linesToClear.length };
  }, [GRID_WIDTH, GRID_HEIGHT]);

  const movePiece = useCallback((direction: 'left' | 'right' | 'down') => {
    if (!currentPiece || !isPlaying || gameOver) return;

    const newPosition = { ...currentPiece.position };
    
    switch (direction) {
      case 'left':
        newPosition.x -= 1;
        break;
      case 'right':
        newPosition.x += 1;
        break;
      case 'down':
        newPosition.y += 1;
        break;
    }

    const newPiece = { ...currentPiece, position: newPosition };
    
    if (isValidPosition(newPiece)) {
      setCurrentPiece(newPiece);
      if (direction === 'down') {
        lastDropRef.current = performance.now();
        setFallProgress(0);
      }
    } else if (direction === 'down') {
      // Place piece at current position (not newPosition)
      const newGrid = placePiece(currentPiece);
      const { grid: clearedGrid, linesCleared } = clearLines(newGrid);
      
      setGrid(clearedGrid);
      setLines(prev => prev + linesCleared);
      // Score based on successfully placed pieces + line bonus
      setScore(prev => prev + 1 + (linesCleared * 10 * level));
      
      // Check for game over
      const newPiece = generateTetromino(nextPiece);
      if (!isValidPosition(newPiece, clearedGrid)) {
        setGameOver(true);
        setIsPlaying(false);
        if (score + 1 + (linesCleared * 10 * level) > highScore) {
          setHighScore(score + 1 + (linesCleared * 10 * level));
          localStorage.setItem('tetrisHighScore', (score + 1 + (linesCleared * 10 * level)).toString());
        }
      } else {
        setCurrentPiece(newPiece);
        lastDropRef.current = performance.now();
        setFallProgress(0);
        setNextPiece(getRandomTetromino());
      }
    }
  }, [currentPiece, isPlaying, gameOver, isValidPosition, placePiece, clearLines, generateTetromino, nextPiece, getRandomTetromino, score, level, highScore]);

  const rotatePiece = useCallback(() => {
    if (!currentPiece || !isPlaying || gameOver) return;

    const shapes = TETROMINOES[currentPiece.type];
    const newRotation = (currentPiece.rotation + 1) % shapes.length;
    const newPiece = { ...currentPiece, rotation: newRotation, shape: shapes[newRotation] };
    
    if (isValidPosition(newPiece)) {
      setCurrentPiece(newPiece);
    }
  }, [currentPiece, isPlaying, gameOver, isValidPosition]);

  const dropPiece = useCallback(() => {
    if (!currentPiece || !isPlaying || gameOver) return;
    
    let newPiece = { ...currentPiece };
    while (isValidPosition({ ...newPiece, position: { ...newPiece.position, y: newPiece.position.y + 1 } })) {
      newPiece.position.y += 1;
    }
    setCurrentPiece(newPiece);
    // Trigger placement immediately
    setTimeout(() => movePiece('down'), 50);
    lastDropRef.current = performance.now();
    setFallProgress(0);
  }, [currentPiece, isPlaying, gameOver, isValidPosition, movePiece]);

  // Game loop
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      movePiece('down');
    }, speed);
    
    return () => clearInterval(interval);
  }, [movePiece, speed, isPlaying]);

  // requestAnimationFrame loop for smooth interpolation
  useEffect(() => {
    if (!isPlaying || gameOver) return;
    let frame: number;
    const loop = () => {
      const now = performance.now();
      const progress = Math.min((now - lastDropRef.current) / speed, 1);
      setFallProgress(progress);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, gameOver, speed]);

  // Level progression
  useEffect(() => {
    const newLevel = Math.floor(lines / 10) + 1;
    if (newLevel !== level) {
      setLevel(newLevel);
      setSpeed(Math.max(100, INITIAL_SPEED - (newLevel - 1) * 50));
    }
  }, [lines, level, INITIAL_SPEED]);

  // Touch controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          movePiece('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          movePiece('right');
          break;
        case 'ArrowDown':
          e.preventDefault();
          movePiece('down');
          break;
        case 'ArrowUp':
        case ' ':
          e.preventDefault();
          rotatePiece();
          break;
        case 'Enter':
          e.preventDefault();
          dropPiece();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [movePiece, rotatePiece, dropPiece]);

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
      if (absDeltaX < 30 && absDeltaY < 30) {
        // Tap - rotate piece
        rotatePiece();
        return;
      }

      // Determine swipe direction
      if (absDeltaX > absDeltaY) {
        // Horizontal swipe
        if (deltaX > 0) {
          movePiece('right');
        } else {
          movePiece('left');
        }
      } else {
        // Vertical swipe
        if (deltaY > 0) {
          movePiece('down');
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
  }, [isFullscreen, movePiece, rotatePiece]);

  useEffect(() => {
    // responsive board scaling
    const baseW = GRID_WIDTH * BASE_CELL + 16;
    const baseH = GRID_HEIGHT * BASE_CELL + 16;
    const handleResize = () => {
      const vw = window.innerWidth - 64;
      const vh = window.innerHeight - 300;
      const s = Math.min(1, vw / baseW, vh / baseH);
      setScale(Math.max(0.6, s));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fullscreen management - only for game canvas
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

  // Modified start game to enter fullscreen
  const startGame = async () => {
    if (gameOver) {
      setGrid(Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill(null)));
      setScore(0);
      setLines(0);
      setLevel(1);
      setSpeed(INITIAL_SPEED);
      setGameOver(false);
    }
    const newPiece = generateTetromino(nextPiece);
    setCurrentPiece(newPiece);
    lastDropRef.current = performance.now();
    setFallProgress(0);
    setNextPiece(getRandomTetromino());
    setIsPlaying(true);
    
    // Enter fullscreen when starting
    await enterFullscreen();
  };

  const resetGame = () => {
    setIsPlaying(false);
    setGameOver(false);
    setCurrentPiece(null);
    setGrid(Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill(null)));
    setScore(0);
    setLines(0);
    setLevel(1);
    setSpeed(INITIAL_SPEED);
  };

  const renderGrid = () => {
    // static settled blocks only (no current falling piece)
    return grid;
  };

  // Active falling piece with interpolated Y
  const renderActivePiece = () => {
    if (!currentPiece) return null;
    const shapes = TETROMINOES[currentPiece.type];
    const shape = shapes[currentPiece.rotation % shapes.length];
    
    const cellWidth = isFullscreen ? (window.innerWidth * 0.8) / GRID_WIDTH : BASE_CELL;
    const cellHeight = isFullscreen ? (window.innerHeight * 0.85) / GRID_HEIGHT : BASE_CELL;
    
    return (
      <div className="absolute pointer-events-none">
        {shape.map((row, y) =>
          row.map((cell, x) =>
            cell ? (
              <div
                key={`a-${x}-${y}`}
                className={`absolute rounded-sm shadow ${COLORS[currentPiece.type]}`}
                style={isFullscreen ? {
                  width: cellWidth - 2,
                  height: cellHeight - 2,
                  left: (currentPiece.position.x + x) * cellWidth + 1,
                  top: (currentPiece.position.y + fallProgress + y) * cellHeight + 1,
                  transition: 'left 90ms linear'
                } : {
                  width: BASE_CELL - 4,
                  height: BASE_CELL - 4,
                  left: (currentPiece.position.x + x) * BASE_CELL + 2,
                  top: (currentPiece.position.y + fallProgress + y) * BASE_CELL + 2,
                  transition: 'left 90ms linear'
                }}
              />
            ) : null
          )
        )}
      </div>
    );
  };

  const renderNextPiece = () => {
    const shape = TETROMINOES[nextPiece][0];
    return (
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${shape[0].length}, 1fr)` }}
      >
        {shape.map((row, y) =>
          row.map((cell, x) => (
            <div
              key={`${y}-${x}`}
              className={`w-4 h-4 rounded-sm ${cell ? COLORS[nextPiece] : 'bg-muted/30'}`}
            />
          ))
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="game-card w-full max-w-full mx-auto max-h-[100vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-sm">🧩</span>
            </div>
            <h2 className="text-2xl font-bold text-foreground">Tetris</h2>
          </div>
          <button
            onClick={handleGoBack}
            className="game-btn-secondary p-2 hover:bg-destructive hover:text-destructive-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
          {/* Game Stats - Full width */}
          <div className="space-y-4 w-full">
            <div className="grid grid-cols-2 gap-4 text-center w-full">
              <div className="bg-gradient-to-br from-accent/20 to-accent/5 rounded-lg p-4 border border-accent/20">
                <div className="text-2xl font-bold text-accent">{score}</div>
                <div className="text-sm text-muted-foreground">Pieces</div>
              </div>
              <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg p-4 border border-primary/20">
                <div className="text-xl font-bold text-primary">{highScore}</div>
                <div className="text-sm text-muted-foreground">Best</div>
              </div>
              <div className="bg-gradient-to-br from-secondary/20 to-secondary/5 rounded-lg p-4 border border-secondary/20">
                <div className="text-lg font-semibold text-foreground">{lines}</div>
                <div className="text-sm text-muted-foreground">Lines</div>
              </div>
              <div className="bg-gradient-to-br from-muted/20 to-muted/5 rounded-lg p-4 border border-muted/20">
                <div className="text-lg font-semibold text-foreground">{level}</div>
                <div className="text-sm text-muted-foreground">Level</div>
              </div>
            </div>

            {/* Next Piece */}
            <div className="p-4 rounded-lg bg-secondary/50 border border-border/50 w-full">
              <div className="text-sm text-muted-foreground mb-2">Next</div>
              <div className="flex justify-center">
                {renderNextPiece()}
              </div>
            </div>
          </div>

          {/* Game Board - Centered */}
          <div className="relative flex justify-center w-full lg:col-span-1">
            <div
              ref={gameCanvasRef}
              className={`${isFullscreen ? 'fixed inset-0 bg-black flex items-center justify-center z-[60]' : ''}`}
              style={isFullscreen ? {
                width: '100vw',
                height: '100vh'
              } : {
                width: (GRID_WIDTH * BASE_CELL + 16) * scale,
                height: (GRID_HEIGHT * BASE_CELL + 16) * scale
              }}
            >
              <div
                className="bg-game-bg border border-border/50 rounded-xl p-2 relative overflow-hidden"
                style={isFullscreen ? {
                  width: window.innerWidth * 0.8,
                  height: window.innerHeight * 0.85,
                  transform: 'none',
                  transformOrigin: 'center',
                  display: 'grid',
                  gridTemplateColumns: `repeat(${GRID_WIDTH}, 1fr)`,
                  gridTemplateRows: `repeat(${GRID_HEIGHT}, 1fr)`,
                  gap: '1px',
                  borderRadius: '12px'
                } : {
                  width: GRID_WIDTH * BASE_CELL + 16,
                  height: GRID_HEIGHT * BASE_CELL + 16,
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                  display: 'grid',
                  gridTemplateColumns: `repeat(${GRID_WIDTH}, 1fr)`,
                  gridTemplateRows: `repeat(${GRID_HEIGHT}, 1fr)`,
                  gap: '1px'
                }}
              >
                {/* Score display in fullscreen */}
                {isFullscreen && (
                  <div className="absolute -top-20 left-0 text-white">
                    <div className="bg-black/60 rounded-lg p-4">
                      <div className="text-xl font-bold">Pieces: {score}</div>
                      <div className="text-lg">Level: {level}</div>
                      <div className="text-lg">Score: {score}</div>
                    </div>
                  </div>
                )}

                {/* Updated grid rendering with better sizing */}
                {renderGrid().map((row, y) =>
                  row.map((cell, x) => (
                    <div
                      key={`${y}-${x}`}
                      className={`rounded-sm border border-border/20 ${
                        cell ? COLORS[cell] : 'bg-muted/10'
                      } transition-colors`}
                      style={{
                        width: '100%',
                        height: '100%'
                      }}
                    />
                  ))
                )}
                {renderActivePiece()}

                {/* Fullscreen Exit Button - better positioning */}
                {isFullscreen && (
                  <button
                    onClick={exitFullscreen}
                    className="absolute -top-20 right-0 game-btn-secondary p-4 z-10"
                  >
                    <X className="w-8 h-8" />
                  </button>
                )}

                {/* Fullscreen Touch Instructions - improved */}
                {isFullscreen && (
                  <div className="absolute -bottom-20 left-0 right-0 text-center">
                    <div className="bg-black/70 rounded-lg p-4 text-white text-lg backdrop-blur-sm">
                      <div className="flex justify-center items-center gap-4">
                        <span>↔️ Swipe: Move</span>
                        <span>👆 Tap: Rotate</span>
                        <span>⬇️ Swipe Down: Drop</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Game Over Overlay */}
            {gameOver && (
              <div className="absolute inset-0 bg-black/70 rounded-xl flex items-center justify-center">
                <div className="text-center space-y-4">
                  <h3 className="text-3xl font-bold text-foreground">Game Over!</h3>
                  <p className="text-lg text-muted-foreground">Score: {score}</p>
                  <p className="text-lg text-muted-foreground">Lines: {lines}</p>
                  {score === highScore && score > 0 && (
                    <p className="text-accent font-semibold">🎉 New High Score!</p>
                  )}
                  <div className="flex gap-4 justify-center">
                    <button onClick={startGame} className="game-btn-primary">
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Play Again
                    </button>
                    <button onClick={exitFullscreen} className="game-btn-secondary">
                      Go Back
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Start Game Overlay */}
            {!isPlaying && !gameOver && (
              <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                <button onClick={startGame} className="game-btn-primary text-lg px-8 py-4">
                  <Play className="w-5 h-5 mr-2" />
                  Start Game
                </button>
              </div>
            )}
          </div>

          {/* Mobile Controls */}
          <div className="space-y-4 w-full">
            <div className="grid grid-cols-3 gap-2">
              <div></div>
              <button
                onClick={rotatePiece}
                disabled={gameOver || !isPlaying}
                className="game-btn-secondary p-3"
              >
                <RotateCw className="w-5 h-5" />
              </button>
              <div></div>
              
              <button
                onClick={() => movePiece('left')}
                disabled={gameOver || !isPlaying}
                className="game-btn-secondary p-3"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => movePiece('down')}
                disabled={gameOver || !isPlaying}
                className="game-btn-secondary p-3"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => movePiece('right')}
                disabled={gameOver || !isPlaying}
                className="game-btn-secondary p-3"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                disabled={gameOver}
                className="game-btn-secondary flex-1 py-2"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button
                onClick={resetGame}
                className="game-btn-secondary flex-1 py-2"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center space-y-1">
              <p className="text-xs text-muted-foreground">
                Use arrow keys or buttons
              </p>
              <p className="text-xs text-muted-foreground">
                Space/Up: Rotate, Enter: Drop
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};