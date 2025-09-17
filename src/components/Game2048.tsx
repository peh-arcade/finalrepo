import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, RotateCcw, Play, Pause, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import "./FlamingoPage.css";
import "./Game2048.css";

interface Game2048Props {
  onClose: () => void;
}

type Board = number[][];

interface TileAnimation {
  id: string;
  value: number;
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  isNew?: boolean;
  isMerged?: boolean;
}

export const Game2048: React.FC<Game2048Props> = ({ onClose }) => {
  const GRID_SIZE = 4;
  const CELL_SIZE = 106.25; // Official 2048 size
  const GRID_GAP = 15; // Official gap between tiles

  const [board, setBoard] = useState<Board>(() => initializeBoard());
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('2048HighScore') || '0');
  });
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [animations, setAnimations] = useState<TileAnimation[]>([]);
  const [animationId, setAnimationId] = useState(0);

  const gameCanvasRef = useRef<HTMLDivElement>(null);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  function initializeBoard(): Board {
    const newBoard = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));
    addRandomTile(newBoard);
    addRandomTile(newBoard);
    return newBoard;
  }

  function addRandomTile(board: Board): void {
    const emptyCells: Array<[number, number]> = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (board[i][j] === 0) {
          emptyCells.push([i, j]);
        }
      }
    }
    
    if (emptyCells.length > 0) {
      const randomIndex = Math.floor(Math.random() * emptyCells.length);
      const [row, col] = emptyCells[randomIndex];
      board[row][col] = Math.random() < 0.9 ? 2 : 4;
    }
  }

  function moveLeft(board: Board): { newBoard: Board; scoreIncrease: number; moved: boolean } {
    const newBoard = board.map(row => [...row]);
    let scoreIncrease = 0;
    let moved = false;

    for (let i = 0; i < GRID_SIZE; i++) {
      const row = newBoard[i].filter(val => val !== 0);
      
      for (let j = 0; j < row.length - 1; j++) {
        if (row[j] === row[j + 1]) {
          row[j] *= 2;
          scoreIncrease += row[j];
          row[j + 1] = 0;
          if (row[j] === 2048 && !won) {
            setWon(true);
          }
        }
      }
      
      const filteredRow = row.filter(val => val !== 0);
      while (filteredRow.length < GRID_SIZE) {
        filteredRow.push(0);
      }
      
      for (let j = 0; j < GRID_SIZE; j++) {
        if (newBoard[i][j] !== filteredRow[j]) {
          moved = true;
        }
        newBoard[i][j] = filteredRow[j];
      }
    }

    return { newBoard, scoreIncrease, moved };
  }

  function moveRight(board: Board): { newBoard: Board; scoreIncrease: number; moved: boolean } {
    const reversedBoard = board.map(row => [...row].reverse());
    const { newBoard, scoreIncrease, moved } = moveLeft(reversedBoard);
    return { newBoard: newBoard.map(row => [...row].reverse()), scoreIncrease, moved };
  }

  function moveUp(board: Board): { newBoard: Board; scoreIncrease: number; moved: boolean } {
    const transposed = transpose(board);
    const { newBoard, scoreIncrease, moved } = moveLeft(transposed);
    return { newBoard: transpose(newBoard), scoreIncrease, moved };
  }

  function moveDown(board: Board): { newBoard: Board; scoreIncrease: number; moved: boolean } {
    const transposed = transpose(board);
    const { newBoard, scoreIncrease, moved } = moveRight(transposed);
    return { newBoard: transpose(newBoard), scoreIncrease, moved };
  }

  function transpose(board: Board): Board {
    return board[0].map((_, colIndex) => board.map(row => row[colIndex]));
  }

  function isGameOver(board: Board): boolean {
    // Check for empty cells
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (board[i][j] === 0) return false;
      }
    }

    // Check for possible merges
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        const current = board[i][j];
        if (
          (j < GRID_SIZE - 1 && current === board[i][j + 1]) ||
          (i < GRID_SIZE - 1 && current === board[i + 1][j])
        ) {
          return false;
        }
      }
    }

    return true;
  }

  const handleMove = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (gameOver || !isPlaying) return;

    let result;
    switch (direction) {
      case 'left':
        result = moveLeft(board);
        break;
      case 'right':
        result = moveRight(board);
        break;
      case 'up':
        result = moveUp(board);
        break;
      case 'down':
        result = moveDown(board);
        break;
    }

    if (result.moved) {
      addRandomTile(result.newBoard);
      setBoard(result.newBoard);
      const newScore = score + result.scoreIncrease;
      setScore(newScore);

      if (newScore > highScore) {
        setHighScore(newScore);
        localStorage.setItem('2048HighScore', newScore.toString());
      }

      if (isGameOver(result.newBoard)) {
        setGameOver(true);
        setIsPlaying(false);
      }
    }
  }, [board, score, highScore, gameOver, isPlaying, won]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      e.preventDefault();
      switch (e.key) {
        case 'ArrowUp':
          handleMove('up');
          break;
        case 'ArrowDown':
          handleMove('down');
          break;
        case 'ArrowLeft':
          handleMove('left');
          break;
        case 'ArrowRight':
          handleMove('right');
          break;
        case ' ':
          if (gameOver) return;
          setIsPlaying(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleMove, gameOver]);

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
        if (deltaX > 0) {
          handleMove('right');
        } else {
          handleMove('left');
        }
      } else {
        if (deltaY > 0) {
          handleMove('down');
        } else {
          handleMove('up');
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
  }, [handleMove]);

  const handleRestart = () => {
    setBoard(initializeBoard());
    setScore(0);
    setGameOver(false);
    setWon(false);
    setIsPlaying(true);
    setAnimations([]);
  };

  const getTileClassName = (value: number): string => {
    if (value === 0) return 'tile-empty';
    return `tile-${value}`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // Calculate responsive dimensions
  const getResponsiveDimensions = () => {
    if (isMobile) {
      const screenWidth = window.innerWidth;
      const availableWidth = screenWidth - 40; // 20px padding on each side
      const gridSize = Math.min(availableWidth, 350); // Max 350px
      const cellSize = (gridSize - 45) / 4; // Account for gaps (15px * 3 gaps)
      return {
        gridSize,
        cellSize,
        gap: 10
      };
    }
    return {
      gridSize: 500,
      cellSize: CELL_SIZE,
      gap: GRID_GAP
    };
  };

  const dimensions = getResponsiveDimensions();

  return (
    <div className="flamingo-overlay">
      {/* Keep the flamingo topbar for consistency */}
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
        background: '#faf8ef', 
        padding: isMobile ? '10px' : '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 120px)', // Account for topbar and footer
        width: '100%'
      }}>
        <div className="game-2048-container" style={{
          maxWidth: isMobile ? '100%' : '500px',
          padding: isMobile ? '10px' : '20px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          {/* Game Header - Mobile optimized */}
          <div className="game-2048-header" style={{
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '15px' : '20px',
            marginBottom: isMobile ? '15px' : '20px',
            width: '100%',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h1 className="game-2048-title" style={{
              fontSize: isMobile ? '36px' : '48px',
              margin: 0,
              textAlign: 'center'
            }}>2048</h1>
            <div className="game-2048-scores" style={{
              gap: isMobile ? '10px' : '15px',
              justifyContent: 'center',
              display: 'flex'
            }}>
              <div className="score-container" style={{
                padding: isMobile ? '8px 15px' : '10px 20px',
                minWidth: isMobile ? '70px' : '80px'
              }}>
                <div className="score-label">SCORE</div>
                <div className="score-value" style={{
                  fontSize: isMobile ? '20px' : '25px'
                }}>{formatNumber(score)}</div>
              </div>
              <div className="score-container" style={{
                padding: isMobile ? '8px 15px' : '10px 20px',
                minWidth: isMobile ? '70px' : '80px'
              }}>
                <div className="score-label">BEST</div>
                <div className="score-value" style={{
                  fontSize: isMobile ? '20px' : '25px'
                }}>{formatNumber(highScore)}</div>
              </div>
            </div>
          </div>

          {/* Game Instructions - Mobile optimized */}
          <div className="game-2048-instructions" style={{
            marginBottom: isMobile ? '20px' : '30px',
            padding: isMobile ? '10px' : '15px',
            justifyContent: 'center',
            width: '100%',
            display: 'flex',
            alignItems: 'center'
          }}>
            <button className="restart-button" onClick={handleRestart} style={{
              padding: isMobile ? '10px 15px' : '12px 20px',
              fontSize: isMobile ? '14px' : '16px',
              margin: '0 auto'
            }}>
              <RotateCcw className="w-4 h-4 mr-2" />
              New Game
            </button>
          </div>

          {/* Game Grid - Perfectly responsive and centered */}
          <div 
            ref={gameCanvasRef}
            className="game-2048-grid-container"
            style={{
              width: dimensions.gridSize,
              height: dimensions.gridSize,
              margin: '0 auto',
              position: 'relative'
            }}
          >
            {/* Grid Background */}
            <div className="grid-background" style={{
              gridGap: `${dimensions.gap}px`,
              padding: `${dimensions.gap}px`
            }}>
              {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => (
                <div key={i} className="grid-cell" />
              ))}
            </div>

            {/* Game Tiles */}
            <div className="grid-tiles" style={{ 
              position: "absolute",
              top: dimensions.gap,
              left: dimensions.gap,
              width: `calc(100% - ${dimensions.gap * 2}px)`,
              height: `calc(100% - ${dimensions.gap * 2}px)`
            }}>
              {board.map((row, i) =>
                row.map((cell, j) =>
                  cell > 0 && (
                    <div
                      key={`${i}-${j}`}
                      className={`tile ${getTileClassName(cell)}`}
                      style={{
                        position: "absolute",
                        left: j * (dimensions.cellSize + dimensions.gap),
                        top: i * (dimensions.cellSize + dimensions.gap),
                        width: dimensions.cellSize,
                        height: dimensions.cellSize,
                        fontSize: isMobile ? 
                          (cell >= 1024 ? '18px' : cell >= 128 ? '22px' : cell >= 16 ? '26px' : '30px') :
                          (cell >= 1024 ? '35px' : cell >= 128 ? '45px' : cell >= 16 ? '50px' : '55px'),
                        lineHeight: `${dimensions.cellSize}px`
                      }}
                    >
                      {formatNumber(cell)}
                    </div>
                  )
                )
              )}
            </div>

            {/* Animation Layer */}
            <div className="animation-layer">
              {animations.map((anim) => (
                <div
                  key={anim.id}
                  className={`tile ${getTileClassName(anim.value)} ${anim.isNew ? 'tile-new' : ''} ${anim.isMerged ? 'tile-merged' : ''}`}
                  style={{
                    transform: `translate(${anim.toCol * (dimensions.cellSize + dimensions.gap)}px, ${anim.toRow * (dimensions.cellSize + dimensions.gap)}px)`,
                    width: dimensions.cellSize,
                    height: dimensions.cellSize
                  }}
                >
                  {formatNumber(anim.value)}
                </div>
              ))}
            </div>

            {/* Win overlay */}
            {won && !gameOver && (
              <div className="game-overlay win-overlay">
                <div className="overlay-content" style={{
                  padding: isMobile ? '30px' : '40px'
                }}>
                  <h2 className="overlay-title" style={{
                    fontSize: isMobile ? '40px' : '60px'
                  }}>You win!</h2>
                  <p className="overlay-message" style={{
                    fontSize: isMobile ? '16px' : '18px'
                  }}>Congratulations! You reached the 2048 tile!</p>
                  <div className="overlay-buttons" style={{
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: isMobile ? '10px' : '15px'
                  }}>
                    <button
                      className="overlay-button continue-button"
                      onClick={() => setWon(false)}
                      style={{
                        padding: isMobile ? '10px 20px' : '12px 24px',
                        fontSize: isMobile ? '14px' : '16px'
                      }}
                    >
                      Keep going
                    </button>
                    <button
                      className="overlay-button restart-button-overlay"
                      onClick={handleRestart}
                      style={{
                        padding: isMobile ? '10px 20px' : '12px 24px',
                        fontSize: isMobile ? '14px' : '16px'
                      }}
                    >
                      Try again
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Game Over overlay */}
            {gameOver && (
              <div className="game-overlay game-over-overlay">
                <div className="overlay-content" style={{
                  padding: isMobile ? '30px' : '40px'
                }}>
                  <h2 className="overlay-title" style={{
                    fontSize: isMobile ? '40px' : '60px'
                  }}>Game over!</h2>
                  <p className="overlay-message" style={{
                    fontSize: isMobile ? '16px' : '18px'
                  }}>No more moves available.</p>
                  {score === highScore && score > 0 && (
                    <p className="new-best" style={{
                      fontSize: isMobile ? '18px' : '20px'
                    }}>🏆 New Best Score!</p>
                  )}
                  <div className="overlay-buttons">
                    <button
                      className="overlay-button restart-button-overlay"
                      onClick={handleRestart}
                      style={{
                        padding: isMobile ? '10px 20px' : '12px 24px',
                        fontSize: isMobile ? '14px' : '16px'
                      }}
                    >
                      Try again
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Keep flamingo footer for consistency but simplified */}
      <div className="flamingo-footer" style={{ 
        background: 'rgba(250, 248, 239, 0.9)',
        padding: isMobile ? '8px' : '10px'
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
            background: '#8f7a66',
            padding: isMobile ? '10px 16px' : '12px 20px'
          }}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <div className="f-controls-right">
          <button 
            className="f-small" 
            onClick={handleRestart} 
            style={{ 
              background: '#8f7a66',
              padding: isMobile ? '6px 10px' : '8px 10px'
            }}
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Restart
          </button>
          <div className="text-xs text-gray-600 mt-1" style={{
            fontSize: isMobile ? '10px' : '12px'
          }}>
            {isMobile ? "Swipe to move tiles" : "Arrow keys to move"}
          </div>
        </div>
      </div>
    </div>
  );
};
