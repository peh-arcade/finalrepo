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
  const LANE_COUNT = 4; // Increased for better racing feel
  const LANE_WIDTH = GAME_WIDTH / LANE_COUNT;
  const CAR_WIDTH = 45;
  const CAR_HEIGHT = 80;
  const PLAYER_Y = GAME_HEIGHT - 120;
  const OBSTACLE_SPEED = 3;
  const SPAWN_RATE = 0.015;

  const gameRef = useRef<HTMLDivElement>(null);
  const gameCanvasRef = useRef<HTMLDivElement>(null);
  const [playerCar, setPlayerCar] = useState<Car>({ x: LANE_WIDTH * 1.5, y: PLAYER_Y, lane: 1 });
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
  const [isFullscreen, setIsFullscreen] = useState(false);

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
  }, [isPlaying, gameOver, LANE_COUNT, LANE_WIDTH, CAR_WIDTH]);

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

    // Enhanced touch controls
    let touchStartX = 0;
    
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndX = e.changedTouches[0].clientX;
      const diff = touchStartX - touchEndX;
      
      if (Math.abs(diff) > 20) { // Reduced minimum swipe distance
        if (diff > 0) {
          movePlayer('left');
        } else {
          movePlayer('right');
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    
    const canvas = gameCanvasRef.current;
    if (canvas) {
      canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
      canvas.addEventListener('touchend', handleTouchEnd, { passive: true });
    }

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      if (canvas) {
        canvas.removeEventListener('touchstart', handleTouchStart);
        canvas.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [movePlayer]);

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

  // Modified start game
  const startGame = async () => {
    if (gameOver) {
      setPlayerCar({ x: LANE_WIDTH * 1.5 + (LANE_WIDTH - CAR_WIDTH) / 2, y: PLAYER_Y, lane: 1 });
      setObstacleCars([]);
      setScore(0);
      setSpeed(1);
      setDistance(0);
      setGameOver(false);
    }
    setIsPlaying(true);
    await enterFullscreen();
  };

  const resetGame = () => {
    setIsPlaying(false);
    setGameOver(false);
    setPlayerCar({ x: LANE_WIDTH * 1.5 + (LANE_WIDTH - CAR_WIDTH) / 2, y: PLAYER_Y, lane: 1 });
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
    <div className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center ${isFullscreen ? 'p-0' : 'p-2 sm:p-4'}`}>
      <div className={`game-card w-full mx-auto ${isFullscreen ? 'max-w-none h-full' : 'max-w-2xl max-h-[100vh]'} overflow-y-auto`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-sm">🏎️</span>
            </div>
            <h2 className="text-2xl font-bold text-foreground">Car Racing</h2>
          </div>
          <button
            onClick={handleGoBack}
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
              style={isFullscreen ? {} : {
                width: GAME_WIDTH * scale,
                height: GAME_HEIGHT * scale,
                position: 'relative'
              }}
            >
              <div
                ref={gameCanvasRef}
                className={`relative mx-auto bg-gray-600 border border-border/50 rounded-xl overflow-hidden select-none ${isFullscreen ? 'fixed inset-0 z-[60]' : ''}`}
                style={isFullscreen ? {
                  width: '100vw',
                  height: '100vh',
                  borderRadius: 0,
                  transform: 'none'
                } : {
                  width: GAME_WIDTH,
                  height: GAME_HEIGHT,
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left'
                }}
              >
                {/* Game content scaled to fullscreen */}
                <div 
                  className="relative w-full h-full"
                  style={isFullscreen ? {
                    width: '100vw',
                    height: '100vh',
                    transform: 'none'
                  } : {}}
                >
                  {/* Enhanced Road Background */}
                  <div className="absolute inset-0 bg-gradient-to-b from-gray-600 via-gray-700 to-gray-800">
                    {/* Road Surface Texture */}
                    <div className="absolute inset-0 opacity-20" 
                         style={{
                           backgroundImage: `repeating-linear-gradient(
                             90deg,
                             transparent,
                             transparent 2px,
                             rgba(255,255,255,0.1) 2px,
                             rgba(255,255,255,0.1) 4px
                           )`
                         }}>
                    </div>
                    
                    {/* Professional Lane Dividers */}
                    {Array.from({ length: LANE_COUNT - 1 }).map((_, i) => (
                      <div key={i} className="absolute w-1 h-full bg-white/80"
                           style={{ left: (i + 1) * LANE_WIDTH - 0.5 }}>
                        {/* Animated dashed center lines */}
                        <div className="absolute inset-0 overflow-hidden">
                          {Array.from({ length: Math.ceil(GAME_HEIGHT / 40) + 5 }).map((_, j) => (
                            <div
                              key={j}
                              className="absolute w-1 h-20 bg-yellow-300 shadow-sm"
                              style={{
                                left: 0,
                                top: j * 50 - ((distance * speed * 2) % 50),
                                opacity: 0.9
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                    
                    {/* Road shoulder lines */}
                    <div className="absolute left-0 top-0 w-3 h-full bg-yellow-400 shadow-lg"></div>
                    <div className="absolute right-0 top-0 w-3 h-full bg-yellow-400 shadow-lg"></div>
                    
                    {/* Side barriers */}
                    <div className="absolute -left-2 top-0 w-2 h-full bg-red-600"></div>
                    <div className="absolute -right-2 top-0 w-2 h-full bg-red-600"></div>
                  </div>

                  {/* Professional Player Car */}
                  <div
                    className="absolute transition-all duration-200 ease-out"
                    style={{
                      left: playerCar.x,
                      top: playerCar.y,
                      width: CAR_WIDTH,
                      height: CAR_HEIGHT,
                      filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
                    }}
                  >
                    {/* Car Body */}
                    <div className="absolute inset-0 bg-gradient-to-b from-blue-400 via-blue-600 to-blue-800 rounded-lg border-2 border-blue-300">
                      {/* Car Hood */}
                      <div className="absolute top-2 left-2 right-2 h-8 bg-gradient-to-b from-blue-200 to-blue-400 rounded-md border border-blue-300"></div>
                      {/* Windshield */}
                      <div className="absolute top-12 left-3 right-3 h-12 bg-gradient-to-b from-cyan-200 to-cyan-400 rounded-sm border border-cyan-300 opacity-80"></div>
                      {/* Side Windows */}
                      <div className="absolute top-12 left-1 w-2 h-8 bg-cyan-300 rounded-sm opacity-60"></div>
                      <div className="absolute top-12 right-1 w-2 h-8 bg-cyan-300 rounded-sm opacity-60"></div>
                      {/* Rear Window */}
                      <div className="absolute bottom-8 left-3 right-3 h-6 bg-gradient-to-b from-cyan-300 to-cyan-500 rounded-sm opacity-70"></div>
                      {/* Headlights */}
                      <div className="absolute top-1 left-1 w-3 h-3 bg-yellow-200 rounded-full border border-yellow-400"></div>
                      <div className="absolute top-1 right-1 w-3 h-3 bg-yellow-200 rounded-full border border-yellow-400"></div>
                      {/* Taillights */}
                      <div className="absolute bottom-1 left-1 w-3 h-2 bg-red-400 rounded-sm"></div>
                      <div className="absolute bottom-1 right-1 w-3 h-2 bg-red-400 rounded-sm"></div>
                      {/* Racing Stripes */}
                      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1 h-full bg-white opacity-60"></div>
                    </div>
                  </div>

                  {/* Professional Obstacle Cars */}
                  {obstacleCars.map((car, index) => (
                    <div
                      key={index}
                      className="absolute transition-opacity duration-200"
                      style={{
                        left: car.x,
                        top: car.y,
                        width: CAR_WIDTH,
                        height: CAR_HEIGHT,
                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
                      }}
                    >
                      {/* Obstacle Car Body */}
                      <div className={`absolute inset-0 ${car.color} rounded-lg border-2 border-black/20`}>
                        {/* Car Hood */}
                        <div className="absolute top-2 left-2 right-2 h-6 bg-white/20 rounded-md"></div>
                        {/* Windshield */}
                        <div className="absolute top-10 left-3 right-3 h-10 bg-blue-200/60 rounded-sm"></div>
                        {/* Side details */}
                        <div className="absolute top-10 left-1 w-1 h-6 bg-black/30 rounded-sm"></div>
                        <div className="absolute top-10 right-1 w-1 h-6 bg-black/30 rounded-sm"></div>
                        {/* Rear details */}
                        <div className="absolute bottom-6 left-3 right-3 h-4 bg-blue-200/40 rounded-sm"></div>
                        {/* Taillights */}
                        <div className="absolute bottom-1 left-1 w-2 h-2 bg-red-300 rounded-sm"></div>
                        <div className="absolute bottom-1 right-1 w-2 h-2 bg-red-300 rounded-sm"></div>
                      </div>
                    </div>
                  ))}

                  {/* Enhanced Speed Lines Effect */}
                  {isPlaying && Array.from({ length: 30 }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute bg-gradient-to-b from-white/30 to-transparent"
                      style={{
                        left: Math.random() * GAME_WIDTH,
                        width: Math.random() * 2 + 1,
                        height: Math.random() * 40 + 20,
                        transform: `translateY(${((distance * speed * 3) % (GAME_HEIGHT + 100)) - 50 + i * 20}px)`,
                        opacity: speed > 1.5 ? 0.6 : 0.3
                      }}
                    />
                  ))}

                  {/* Track boundaries visual enhancement */}
                  <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-white/40 to-white/10"></div>
                  <div className="absolute right-0 top-0 w-1 h-full bg-gradient-to-b from-white/40 to-white/10"></div>

                  {/* Game Over Overlay with Go Back */}
                  {gameOver && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                      <div className="text-center space-y-4">
                        <h3 className="text-3xl font-bold text-white">Crash!</h3>
                        <p className="text-lg text-white/80">Score: {score}</p>
                        <p className="text-lg text-white/80">Distance: {Math.floor(distance / 10)}m</p>
                        {score === highScore && score > 0 && (
                          <p className="text-yellow-400 font-semibold">🎉 New High Score!</p>
                        )}
                        <div className="flex gap-4 justify-center">
                          <button onClick={startGame} className="game-btn-primary">
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Play Again
                          </button>
                          <button onClick={handleGoBack} className="game-btn-secondary">
                            Go Back
                          </button>
                        </div>
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
                      <div className="flex justify-between items-center">
                        <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 text-white">
                          <div className="text-lg font-bold">{score}</div>
                          <div className="text-xs opacity-80">Score</div>
                        </div>
                        <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 text-white">
                          <div className="text-lg font-bold">{Math.floor(distance / 10)}m</div>
                          <div className="text-xs opacity-80">Distance</div>
                        </div>
                        <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 text-white">
                          <div className="text-lg font-bold">{speed.toFixed(1)}x</div>
                          <div className="text-xs opacity-80">Speed</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Enhanced Fullscreen instructions */}
                  {isFullscreen && !gameOver && isPlaying && (
                    <div className="absolute bottom-6 left-6 right-6 text-center">
                      <div className="bg-black/70 backdrop-blur-sm rounded-xl p-4 text-white border border-white/20">
                        <div className="flex justify-center items-center gap-6">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">⬅️</div>
                            <span>Swipe Left</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">➡️</div>
                            <span>Swipe Right</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
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