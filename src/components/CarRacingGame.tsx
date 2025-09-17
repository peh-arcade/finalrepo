import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, RotateCcw, Play, Pause, ChevronLeft, ChevronRight } from 'lucide-react';

interface CarRacingGameProps {
  onClose: () => void;
}

interface Car {
  x: number;
  y: number;
  lane: number;
}

interface ObstacleCar {
  x: number;
  y: number;
  lane: number;
  color: string;
}

export const CarRacingGame: React.FC<CarRacingGameProps> = ({ onClose }) => {
  const GAME_WIDTH = 400;
  const GAME_HEIGHT = 600;
  const LANE_COUNT = 3;
  const LANE_WIDTH = GAME_WIDTH / LANE_COUNT;
  const CAR_WIDTH = 40;
  const CAR_HEIGHT = 60;
  const PLAYER_Y = GAME_HEIGHT - 100;
  const OBSTACLE_SPEED = 4;
  const SPAWN_RATE = 0.02;

  const gameRef = useRef<HTMLDivElement>(null);
  const [playerCar, setPlayerCar] = useState<Car>({ x: LANE_WIDTH, y: PLAYER_Y, lane: 1 });
  const [obstacleCars, setObstacleCars] = useState<ObstacleCar[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [distance, setDistance] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('carRacingHighScore') || '0');
  });
  const [scale, setScale] = useState(1);

  const carColors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500'];

  const movePlayer = useCallback((direction: 'left' | 'right') => {
    if (!isPlaying || gameOver) return;
    
    setPlayerCar(prev => {
      let newLane = prev.lane;
      
      if (direction === 'left' && newLane > 0) {
        newLane--;
      } else if (direction === 'right' && newLane < LANE_COUNT - 1) {
        newLane++;
      }
      
      return {
        ...prev,
        lane: newLane,
        x: newLane * LANE_WIDTH + (LANE_WIDTH - CAR_WIDTH) / 2
      };
    });
  }, [isPlaying, gameOver]);

  const generateObstacleCar = useCallback((): ObstacleCar => {
    const lane = Math.floor(Math.random() * LANE_COUNT);
    const x = lane * LANE_WIDTH + (LANE_WIDTH - CAR_WIDTH) / 2;
    const color = carColors[Math.floor(Math.random() * carColors.length)];
    
    return {
      x,
      y: -CAR_HEIGHT,
      lane,
      color
    };
  }, []);

  const checkCollision = useCallback((player: Car, obstacles: ObstacleCar[]): boolean => {
    const playerLeft = player.x;
    const playerRight = player.x + CAR_WIDTH;
    const playerTop = player.y;
    const playerBottom = player.y + CAR_HEIGHT;

    for (const obstacle of obstacles) {
      const obstacleLeft = obstacle.x;
      const obstacleRight = obstacle.x + CAR_WIDTH;
      const obstacleTop = obstacle.y;
      const obstacleBottom = obstacle.y + CAR_HEIGHT;

      if (
        playerLeft < obstacleRight &&
        playerRight > obstacleLeft &&
        playerTop < obstacleBottom &&
        playerBottom > obstacleTop
      ) {
        return true;
      }
    }

    return false;
  }, []);

  // Game loop
  useEffect(() => {
    if (!isPlaying) return;

    const gameLoop = setInterval(() => {
      setObstacleCars(prev => {
        let newObstacles = prev.map(car => ({ ...car, y: car.y + OBSTACLE_SPEED * speed }));
        
        // Remove cars that are off screen
        newObstacles = newObstacles.filter(car => car.y < GAME_HEIGHT + CAR_HEIGHT);
        
        // Add new obstacles
        if (Math.random() < SPAWN_RATE * speed) {
          // Don't spawn if there's already a car in the lane at the top
          const newCar = generateObstacleCar();
          const hasCarInLane = newObstacles.some(car => 
            car.lane === newCar.lane && car.y < 100
          );
          if (!hasCarInLane) {
            newObstacles.push(newCar);
          }
        }

        return newObstacles;
      });

      setDistance(prev => prev + speed);
      setScore(prev => prev + Math.floor(speed));
      
      // Increase speed gradually
      setSpeed(prev => Math.min(prev + 0.001, 3));
    }, 1000 / 60); // 60 FPS

    return () => clearInterval(gameLoop);
  }, [isPlaying, speed, generateObstacleCar]);

  // Collision detection
  useEffect(() => {
    if (isPlaying && checkCollision(playerCar, obstacleCars)) {
      setGameOver(true);
      setIsPlaying(false);
      if (score > highScore) {
        setHighScore(score);
        localStorage.setItem('carRacingHighScore', score.toString());
      }
    }
  }, [playerCar, obstacleCars, isPlaying, checkCollision, score, highScore]);

  // Touch and keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          movePlayer('left');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          movePlayer('right');
          break;
      }
    };

    // Touch controls
    let touchStartX = 0;
    
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndX = e.changedTouches[0].clientX;
      const diff = touchStartX - touchEndX;
      
      if (Math.abs(diff) > 30) { // Minimum swipe distance
        if (diff > 0) {
          movePlayer('left');
        } else {
          movePlayer('right');
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    if (gameRef.current) {
      gameRef.current.addEventListener('touchstart', handleTouchStart);
      gameRef.current.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      if (gameRef.current) {
        gameRef.current.removeEventListener('touchstart', handleTouchStart);
        gameRef.current.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [movePlayer]);

  const startGame = () => {
    if (gameOver) {
      setPlayerCar({ x: LANE_WIDTH, y: PLAYER_Y, lane: 1 });
      setObstacleCars([]);
      setScore(0);
      setSpeed(1);
      setDistance(0);
      setGameOver(false);
    }
    setIsPlaying(true);
  };

  const resetGame = () => {
    setIsPlaying(false);
    setGameOver(false);
    setPlayerCar({ x: LANE_WIDTH, y: PLAYER_Y, lane: 1 });
    setObstacleCars([]);
    setScore(0);
    setSpeed(1);
    setDistance(0);
  };

  useEffect(() => {
    const handleResize = () => {
      const vw = window.innerWidth - 48;
      const vh = window.innerHeight - 240;
      const s = Math.min(1, vw / GAME_WIDTH, vh / GAME_HEIGHT);
      setScale(s < 0.55 ? 0.55 : s);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="game-card w-full max-w-2xl mx-auto max-h-[100vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-sm">🏎️</span>
            </div>
            <h2 className="text-2xl font-bold text-foreground">Car Racing</h2>
          </div>
          <button
            onClick={onClose}
            className="game-btn-secondary p-2 hover:bg-destructive hover:text-destructive-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Game Stats */}
          <div className="space-y-4">
            <div className="space-y-3">
              <div>
                <div className="text-2xl font-bold text-accent">{score}</div>
                <div className="text-sm text-muted-foreground">Score</div>
              </div>
              <div>
                <div className="text-xl font-bold text-primary">{highScore}</div>
                <div className="text-sm text-muted-foreground">Best</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-foreground">{Math.floor(distance / 10)}m</div>
                <div className="text-sm text-muted-foreground">Distance</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-foreground">{speed.toFixed(1)}x</div>
                <div className="text-sm text-muted-foreground">Speed</div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-secondary/50 border border-border/50">
              <div className="text-sm text-muted-foreground mb-2">Instructions</div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Switch lanes to avoid cars</p>
                <p>• Speed increases over time</p>
                <p>• Score points for distance</p>
              </div>
            </div>
          </div>

          {/* Game Area */}
          <div className="relative">
            <div
              className="mx-auto origin-top-left"
              style={{
                width: GAME_WIDTH * scale,
                height: GAME_HEIGHT * scale,
                position: 'relative'
              }}
            >
              <div
                ref={gameRef}
                className="relative mx-auto bg-gray-600 border border-border/50 rounded-xl overflow-hidden select-none"
                style={{
                  width: GAME_WIDTH,
                  height: GAME_HEIGHT,
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left'
                }}
              >
                {/* Road */}
                <div className="absolute inset-0 bg-gray-700">
                  {/* Lane dividers */}
                  {Array.from({ length: LANE_COUNT - 1 }).map((_, i) => (
                    <div key={i}>
                      {/* Animated dashed lines */}
                      {Array.from({ length: Math.ceil(GAME_HEIGHT / 40) }).map((_, j) => (
                        <div
                          key={j}
                          className="absolute w-1 h-6 bg-white"
                          style={{
                            left: (i + 1) * LANE_WIDTH - 0.5,
                            top: j * 40 - ((distance * speed) % 40),
                          }}
                        />
                      ))}
                    </div>
                  ))}
                  
                  {/* Road edges */}
                  <div className="absolute left-0 top-0 w-2 h-full bg-yellow-400"></div>
                  <div className="absolute right-0 top-0 w-2 h-full bg-yellow-400"></div>
                </div>

                {/* Player Car */}
                <div
                  className="absolute bg-blue-600 border-2 border-blue-400 rounded-sm transition-all duration-200"
                  style={{
                    left: playerCar.x,
                    top: playerCar.y,
                    width: CAR_WIDTH,
                    height: CAR_HEIGHT,
                  }}
                >
                  <div className="absolute top-1 left-1 right-1 h-2 bg-blue-300 rounded-sm"></div>
                  <div className="absolute bottom-1 left-1 right-1 h-2 bg-blue-300 rounded-sm"></div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-4 bg-cyan-300 rounded-sm"></div>
                </div>

                {/* Obstacle Cars */}
                {obstacleCars.map((car, index) => (
                  <div
                    key={index}
                    className={`absolute ${car.color} border-2 border-opacity-60 rounded-sm`}
                    style={{
                      left: car.x,
                      top: car.y,
                      width: CAR_WIDTH,
                      height: CAR_HEIGHT,
                    }}
                  >
                    <div className="absolute top-1 left-1 right-1 h-2 bg-white/30 rounded-sm"></div>
                    <div className="absolute bottom-1 left-1 right-1 h-2 bg-white/30 rounded-sm"></div>
                  </div>
                ))}

                {/* Speed Lines Effect */}
                {isPlaying && Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-px bg-white/20"
                    style={{
                      left: Math.random() * GAME_WIDTH,
                      top: -10,
                      height: Math.random() * 20 + 10,
                      transform: `translateY(${((distance * speed * 2) % GAME_HEIGHT) + i * 30}px)`,
                    }}
                  />
                ))}

                {/* Game Over Overlay */}
                {gameOver && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <h3 className="text-3xl font-bold text-white">Crash!</h3>
                      <p className="text-lg text-white/80">Score: {score}</p>
                      <p className="text-lg text-white/80">Distance: {Math.floor(distance / 10)}m</p>
                      {score === highScore && score > 0 && (
                        <p className="text-yellow-400 font-semibold">🎉 New High Score!</p>
                      )}
                      <button onClick={startGame} className="game-btn-primary">
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Play Again
                      </button>
                    </div>
                  </div>
                )}

                {/* Start Game Overlay */}
                {!isPlaying && !gameOver && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <button onClick={startGame} className="game-btn-primary text-lg px-8 py-4">
                        <Play className="w-5 h-5 mr-2" />
                        Start Race
                      </button>
                      <p className="text-white/80 text-sm">Avoid the traffic!</p>
                    </div>
                  </div>
                )}

                {/* Score display during game */}
                {isPlaying && !gameOver && (
                  <div className="absolute top-4 left-4 right-4">
                    <div className="flex justify-between text-white drop-shadow-lg">
                      <div className="text-lg font-bold">{score}</div>
                      <div className="text-lg font-bold">{Math.floor(distance / 10)}m</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => movePlayer('left')}
                disabled={gameOver || !isPlaying}
                className="game-btn-secondary p-4"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={() => movePlayer('right')}
                disabled={gameOver || !isPlaying}
                className="game-btn-secondary p-4"
              >
                <ChevronRight className="w-6 h-6" />
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

            <div className="text-center space-y-2">
              <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
                <p className="text-sm font-semibold text-accent mb-2">Mobile Controls</p>
                <p className="text-xs text-muted-foreground">
                  Swipe left/right on the game area or use the buttons!
                </p>
              </div>
              
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Desktop: Arrow keys or A/D</p>
                <p>Mobile: Swipe or tap buttons</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};