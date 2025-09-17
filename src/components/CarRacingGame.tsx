import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, RotateCcw, Play, Pause, ChevronLeft, ChevronRight } from 'lucide-react';
// Import car images
import car1Png from "../assets/car1.png";
import car2Png from "../assets/car2.png";
import car3Png from "../assets/car3.png";
import car4Png from "../assets/car4.png";
import car5Png from "../assets/car5.png";
import car6Png from "../assets/car6.png";
// Import track and environment images
import trackPng from "../assets/track.png";
import treesPng from "../assets/trees.png";

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
  carImage: string;
  id: number;
}

export const CarRacingGame: React.FC<CarRacingGameProps> = ({ onClose }) => {
  const GAME_WIDTH = 400;
  const GAME_HEIGHT = 600;
  const LANE_COUNT = 4;
  const LANE_WIDTH = GAME_WIDTH / LANE_COUNT;
  const PLAYER_Y = GAME_HEIGHT - 120;
  const OBSTACLE_SPEED = 4;
  const SPAWN_RATE = 0.012;

  // Configurable car dimensions - easily adjustable
  const carConfig = {
    player: {
      width: 65,
      height: 85,
      scale: 1.0,
      // Collision hitbox adjustment (smaller than visual size for better gameplay)
      hitboxScale: 0.75 // Car hitbox is 75% of visual size
    },
    obstacle: {
      width: 60,
      height: 80,
      scale: 1.0,
      hitboxScale: 0.8
    }
  };

  // Calculate actual dimensions
  const playerCarDimensions = {
    width: carConfig.player.width * carConfig.player.scale,
    height: carConfig.player.height * carConfig.player.scale,
    collisionWidth: carConfig.player.width * carConfig.player.scale * carConfig.player.hitboxScale,
    collisionHeight: carConfig.player.height * carConfig.player.scale * carConfig.player.hitboxScale
  };

  const obstacleCarDimensions = {
    width: carConfig.obstacle.width * carConfig.obstacle.scale,
    height: carConfig.obstacle.height * carConfig.obstacle.scale,
    collisionWidth: carConfig.obstacle.width * carConfig.obstacle.scale * carConfig.obstacle.hitboxScale,
    collisionHeight: carConfig.obstacle.height * carConfig.obstacle.scale * carConfig.obstacle.hitboxScale
  };

  const gameRef = useRef<HTMLDivElement>(null);
  const gameCanvasRef = useRef<HTMLDivElement>(null);
  const [playerCar, setPlayerCar] = useState<Car>({ 
    x: LANE_WIDTH * 1.5, 
    y: PLAYER_Y, 
    lane: 1 
  });
  const [obstacleCars, setObstacleCars] = useState<ObstacleCar[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [distance, setDistance] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('carRacingHighScore') || '0');
  });
  const [scale, setScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showTouchFeedback, setShowTouchFeedback] = useState(false);

  // Image refs for car sprites and environment
  const playerCarImageRef = useRef<HTMLImageElement | null>(null);
  const obstacleCarImagesRef = useRef<HTMLImageElement[]>([]);
  const trackImageRef = useRef<HTMLImageElement | null>(null);
  const treesImageRef = useRef<HTMLImageElement | null>(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const carIdCounter = useRef(0);

  const carImages = [car2Png, car3Png, car4Png, car5Png, car6Png]; // Excluding car1 (player car)

  // Mobile detection and haptic feedback
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || 'ontouchstart' in window);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Haptic feedback function
  const triggerHapticFeedback = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(30); // Short vibration for movement
    }
  };

  const triggerCrashHaptic = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100, 50, 100]); // Pattern for crash
    }
  };

  // Enhanced touch feedback
  const showTouchIndicator = () => {
    setShowTouchFeedback(true);
    setTimeout(() => setShowTouchFeedback(false), 150);
  };

  // Load car images and environment assets
  useEffect(() => {
    let loadedCount = 0;
    const totalImages = carImages.length + 3; // +1 for player car, +1 for track, +1 for trees

    const checkAllLoaded = () => {
      loadedCount++;
      if (loadedCount === totalImages) {
        setImagesLoaded(true);
      }
    };

    // Load player car (car1)
    const playerImg = new Image();
    playerImg.onload = checkAllLoaded;
    playerImg.onerror = () => {
      console.warn("Failed to load car1.png, using fallback");
      checkAllLoaded();
    };
    playerImg.src = car1Png;
    playerCarImageRef.current = playerImg;

    // Load track image
    const trackImg = new Image();
    trackImg.onload = checkAllLoaded;
    trackImg.onerror = () => {
      console.warn("Failed to load track.png, using fallback");
      checkAllLoaded();
    };
    trackImg.src = trackPng;
    trackImageRef.current = trackImg;

    // Load trees image
    const treesImg = new Image();
    treesImg.onload = checkAllLoaded;
    treesImg.onerror = () => {
      console.warn("Failed to load trees.png, using fallback");
      checkAllLoaded();
    };
    treesImg.src = treesPng;
    treesImageRef.current = treesImg;

    // Load obstacle cars
    obstacleCarImagesRef.current = [];
    carImages.forEach((carSrc, index) => {
      const img = new Image();
      img.onload = checkAllLoaded;
      img.onerror = () => {
        console.warn(`Failed to load car${index + 2}.png, using fallback`);
        checkAllLoaded();
      };
      img.src = carSrc;
      obstacleCarImagesRef.current[index] = img;
    });

    return () => {
      // Cleanup if needed
    };
  }, []);

  const movePlayer = useCallback((direction: 'left' | 'right') => {
    if (!isPlaying || gameOver) return;
    
    setPlayerCar(prev => {
      let newLane = prev.lane;
      
      if (direction === 'left' && newLane > 0) {
        newLane--;
      } else if (direction === 'right' && newLane < LANE_COUNT - 1) {
        newLane++;
      }
      
      if (newLane !== prev.lane) {
        if (isMobile) {
          triggerHapticFeedback();
          showTouchIndicator();
        }
      }
      
      return {
        ...prev,
        lane: newLane,
        x: newLane * LANE_WIDTH + (LANE_WIDTH - playerCarDimensions.width) / 2
      };
    });
  }, [isPlaying, gameOver, LANE_COUNT, LANE_WIDTH, playerCarDimensions.width, isMobile]);

  const generateObstacleCar = useCallback((): ObstacleCar => {
    const lane = Math.floor(Math.random() * LANE_COUNT);
    const x = lane * LANE_WIDTH + (LANE_WIDTH - obstacleCarDimensions.width) / 2;
    const carImageIndex = Math.floor(Math.random() * carImages.length);
    
    return {
      x,
      y: -obstacleCarDimensions.height,
      lane,
      carImage: carImages[carImageIndex],
      id: carIdCounter.current++
    };
  }, [LANE_COUNT, LANE_WIDTH, obstacleCarDimensions.width, obstacleCarDimensions.height, carImages]);

  // Enhanced collision detection with precise hitboxes
  const checkCollision = useCallback((player: Car, obstacles: ObstacleCar[]): boolean => {
    // Player car collision circle for more natural collision
    const playerCircle = {
      x: player.x + playerCarDimensions.width / 2,
      y: player.y + playerCarDimensions.height / 2,
      radius: Math.min(playerCarDimensions.collisionWidth, playerCarDimensions.collisionHeight) / 2.5
    };

    for (const obstacle of obstacles) {
      // Obstacle car as rectangle with smaller hitbox
      const obstacleRect = {
        x: obstacle.x + (obstacleCarDimensions.width - obstacleCarDimensions.collisionWidth) / 2,
        y: obstacle.y + (obstacleCarDimensions.height - obstacleCarDimensions.collisionHeight) / 2,
        w: obstacleCarDimensions.collisionWidth,
        h: obstacleCarDimensions.collisionHeight
      };

      // Circle-rectangle collision detection
      const closestX = Math.max(obstacleRect.x, Math.min(playerCircle.x, obstacleRect.x + obstacleRect.w));
      const closestY = Math.max(obstacleRect.y, Math.min(playerCircle.y, obstacleRect.y + obstacleRect.h));
      
      const distanceX = playerCircle.x - closestX;
      const distanceY = playerCircle.y - closestY;
      const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);
      
      if (distanceSquared < (playerCircle.radius * playerCircle.radius)) {
        return true;
      }
    }

    return false;
  }, [playerCarDimensions, obstacleCarDimensions]);

  // Game loop
  useEffect(() => {
    if (!isPlaying || !imagesLoaded) return;

    const gameLoop = setInterval(() => {
      setObstacleCars(prev => {
        let newObstacles = prev.map(car => ({ ...car, y: car.y + OBSTACLE_SPEED * speed }));
        
        // Remove cars that are off screen
        newObstacles = newObstacles.filter(car => car.y < GAME_HEIGHT + obstacleCarDimensions.height);
        
        // Add new obstacles
        if (Math.random() < SPAWN_RATE * speed) {
          const newCar = generateObstacleCar();
          const hasCarInLane = newObstacles.some(car => 
            car.lane === newCar.lane && car.y < 150
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
      setSpeed(prev => Math.min(prev + 0.002, 2.5));
    }, 1000 / 60); // 60 FPS

    return () => clearInterval(gameLoop);
  }, [isPlaying, speed, generateObstacleCar, imagesLoaded, obstacleCarDimensions.height]);

  // Collision detection
  useEffect(() => {
    if (isPlaying && checkCollision(playerCar, obstacleCars)) {
      setGameOver(true);
      setIsPlaying(false);
      if (isMobile) {
        triggerCrashHaptic();
      }
      if (score > highScore) {
        setHighScore(score);
        localStorage.setItem('carRacingHighScore', score.toString());
      }
    }
  }, [playerCar, obstacleCars, isPlaying, checkCollision, score, highScore, isMobile]);

  // Enhanced touch and keyboard controls
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
        case ' ':
          e.preventDefault();
          if (gameOver) return;
          setIsPlaying(prev => !prev);
          break;
      }
    };

    let touchStartX = 0;
    
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndX = e.changedTouches[0].clientX;
      const diff = touchStartX - touchEndX;
      
      if (Math.abs(diff) > 15) {
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
  }, [movePlayer, gameOver]);

  // Fullscreen management
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

  // Start game immediately in fullscreen
  const startGame = async () => {
    if (gameOver) {
      resetGame();
    }
    setShowIntro(false);
    setIsPlaying(true);
    await enterFullscreen();
  };

  // Auto-start game on component mount
  useEffect(() => {
    startGame();
  }, []);

  const resetGame = () => {
    setIsPlaying(false);
    setGameOver(false);
    setShowIntro(false);
    setPlayerCar({ 
      x: LANE_WIDTH * 1.5 + (LANE_WIDTH - playerCarDimensions.width) / 2, 
      y: PLAYER_Y, 
      lane: 1 
    });
    setObstacleCars([]);
    setScore(0);
    setSpeed(1);
    setDistance(0);
  };

  const handleRestart = () => {
    resetGame();
    setShowIntro(false);
    setIsPlaying(true);
    if (isMobile) {
      triggerHapticFeedback();
    }
  };

  // Enhanced responsive scaling
  useEffect(() => {
    const handleResize = () => {
      const vw = window.innerWidth - 48;
      const vh = window.innerHeight - 240;
      const s = Math.min(1, vw / GAME_WIDTH, vh / GAME_HEIGHT);
      setScale(s < 0.5 ? 0.5 : s);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!imagesLoaded) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-white">Loading cars...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Touch feedback indicator */}
      {showTouchFeedback && (
        <div 
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.3)',
            pointerEvents: 'none',
            zIndex: 100,
            animation: 'touchRipple 0.3s ease-out'
          }}
        />
      )}

      <div
        ref={gameCanvasRef}
        className="relative w-full h-full overflow-hidden select-none"
      >
        {/* Enhanced Racing Track Background with Images */}
        <div className="absolute inset-0">
          {/* Track Background - Use track.png if available, fallback to gradient */}
          {trackImageRef.current ? (
            <div 
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${trackImageRef.current.src})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'repeat-y',
                transform: `translateY(${((distance * speed * 1.5) % (window.innerHeight * 2)) - window.innerHeight}px)`
              }}
            />
          ) : (
            /* Fallback road design */
            <div className="absolute inset-0 bg-gradient-to-b from-gray-700 via-gray-800 to-gray-900">
              {/* Road texture overlay */}
              <div className="absolute inset-0 opacity-30" 
                   style={{
                     backgroundImage: `repeating-linear-gradient(
                       90deg,
                       transparent,
                       transparent 3px,
                       rgba(255,255,255,0.05) 3px,
                       rgba(255,255,255,0.05) 6px
                     ), repeating-linear-gradient(
                       0deg,
                       transparent,
                       transparent 2px,
                       rgba(0,0,0,0.1) 2px,
                       rgba(0,0,0,0.1) 4px
                     )`
                   }}>
              </div>
            </div>
          )}

          {/* Enhanced Side Trees/Environment - Use trees.png if available */}
          {treesImageRef.current && (
            <>
              {/* Left side trees - more visible on mobile */}
              <div 
                className="absolute left-0 top-0 h-full opacity-90"
                style={{
                  width: window.innerWidth > 768 ? '80px' : '60px',
                  backgroundImage: `url(${treesImageRef.current.src})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center right',
                  backgroundRepeat: 'repeat-y',
                  transform: `translateY(${((distance * speed * 0.8) % (window.innerHeight * 2)) - window.innerHeight}px)`,
                  filter: 'brightness(0.9) contrast(1.1)'
                }}
              />
              
              {/* Right side trees - more visible on mobile */}
              <div 
                className="absolute right-0 top-0 h-full opacity-90"
                style={{
                  width: window.innerWidth > 768 ? '80px' : '60px',
                  backgroundImage: `url(${treesImageRef.current.src})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center left',
                  backgroundRepeat: 'repeat-y',
                  transform: `translateY(${((distance * speed * 0.8) % (window.innerHeight * 2)) - window.innerHeight}px) scaleX(-1)`,
                  filter: 'brightness(0.9) contrast(1.1)'
                }}
              />
            </>
          )}

          {/* Responsive Lane dividers */}
          {Array.from({ length: 3 }).map((_, i) => {
            const laneWidth = (window.innerWidth - 160) / 4; // Account for trees
            const startX = 80; // After left trees
            return (
              <div key={i} className="absolute h-full z-10"
                   style={{ 
                     left: startX + (i + 1) * laneWidth - 1.5,
                     width: 3
                   }}>
                {/* Animated dashed lines moving down */}
                <div className="absolute inset-0 overflow-hidden">
                  {Array.from({ length: Math.ceil(window.innerHeight / 60) + 8 }).map((_, j) => (
                    <div
                      key={j}
                      className="absolute bg-white shadow-sm"
                      style={{
                        left: 0,
                        width: 3,
                        height: 30,
                        top: j * 60 - ((distance * speed * 2) % 60),
                        opacity: 0.9,
                        borderRadius: '1px'
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
          
          {/* Track boundaries - responsive */}
          <div className="absolute top-0 w-2 h-full bg-yellow-400 shadow-md opacity-90 z-10" 
               style={{ left: '78px' }}></div>
          <div className="absolute top-0 w-2 h-full bg-yellow-400 shadow-md opacity-90 z-10" 
               style={{ right: '78px' }}></div>

          {/* Player Car - responsive positioning */}
          <div
            className="absolute transition-all duration-200 ease-out z-20"
            style={{
              left: 80 + (playerCar.lane * ((window.innerWidth - 160) / 4)) + (((window.innerWidth - 160) / 4) - playerCarDimensions.width) / 2,
              top: window.innerHeight - 150,
              width: playerCarDimensions.width,
              height: playerCarDimensions.height,
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))'
            }}
          >
            {playerCarImageRef.current ? (
              <img
                src={playerCarImageRef.current.src}
                alt="Player car"
                className="w-full h-full object-contain"
                style={{ imageRendering: 'crisp-edges' }}
              />
            ) : (
              // Fallback player car
              <div className="w-full h-full bg-gradient-to-b from-blue-400 to-blue-600 rounded-lg border-2 border-blue-300">
                <div className="absolute inset-2 bg-gradient-to-b from-blue-200 to-blue-400 rounded-md"></div>
              </div>
            )}
          </div>

          {/* Obstacle Cars - responsive positioning */}
          {obstacleCars.map((car) => (
            <div
              key={car.id}
              className="absolute z-15"
              style={{
                left: 80 + (car.lane * ((window.innerWidth - 160) / 4)) + (((window.innerWidth - 160) / 4) - obstacleCarDimensions.width) / 2,
                top: car.y,
                width: obstacleCarDimensions.width,
                height: obstacleCarDimensions.height,
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
              }}
            >
              {obstacleCarImagesRef.current[carImages.indexOf(car.carImage)] ? (
                <img
                  src={car.carImage}
                  alt="Obstacle car"
                  className="w-full h-full object-contain transform rotate-180"
                  style={{ imageRendering: 'crisp-edges' }}
                />
              ) : (
                // Fallback obstacle car
                <div className="w-full h-full bg-gradient-to-b from-red-400 to-red-600 rounded-lg border-2 border-red-300 transform rotate-180">
                  <div className="absolute inset-2 bg-gradient-to-b from-red-200 to-red-400 rounded-md"></div>
                </div>
              )}
            </div>
          ))}

          {/* Enhanced Speed Lines Effect */}
          {isPlaying && Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="absolute bg-gradient-to-b from-white/50 to-transparent z-5"
              style={{
                left: 80 + Math.random() * (window.innerWidth - 160),
                width: Math.random() * 3 + 1,
                height: Math.random() * 40 + 20,
                transform: `translateY(${((distance * speed * 5) % (window.innerHeight + 100)) - 50 + i * 15}px)`,
                opacity: speed > 1.5 ? 0.8 : 0.5
              }}
            />
          ))}

          {/* Top Racing HUD */}
          <div className="absolute top-0 left-0 right-0 z-25 p-4">
            <div className="flex justify-between items-center">
              <div className="bg-black/90 backdrop-blur-sm rounded-2xl p-4 border border-white/20 flex gap-6">
                <div className="text-center">
                  <div className="text-xl font-bold text-green-400">{score}</div>
                  <div className="text-xs text-gray-400">Points</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-blue-400">{Math.floor(distance / 10)}m</div>
                  <div className="text-xs text-gray-400">Distance</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-yellow-400">{speed.toFixed(1)}x</div>
                  <div className="text-xs text-gray-400">Speed</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-red-400">{highScore}</div>
                  <div className="text-xs text-gray-400">Best</div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="bg-gray-800/90 backdrop-blur-sm hover:bg-gray-700/90 rounded-full p-3 border border-white/20 transition-colors"
                aria-label="Exit race"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>

          {/* Bottom Racing Controls (removed old bottom bar) */}
          {/*
            OLD:
            {isMobile && (
              <div className="absolute bottom-0 left-0 right-0 z-25 p-4">
                <div className="bg-black/90 ..."> ... </div>
              </div>
            )}
          */}

          {/* Side Steering Buttons (mobile) */}
          {isMobile && !gameOver && (
            <>
              <button
                aria-label="Move Left"
                onPointerDown={() => {
                  movePlayer('left');
                  if (isMobile) {
                    triggerHapticFeedback();
                    showTouchIndicator();
                  }
                }}
                disabled={!isPlaying || playerCar.lane === 0}
                className={`absolute z-30 flex items-center justify-center
                  text-white font-semibold select-none
                  rounded-xl shadow
                  active:scale-95 transition-transform
                  border border-white/10
                  ${playerCar.lane === 0 || !isPlaying ? 'bg-blue-600/50 cursor-not-allowed' : 'bg-blue-600'}
                `}
                style={{
                  left: '14px',
                  bottom: '18px',
                  width: '72px',
                  height: '72px'
                }}
              >
                <ChevronLeft className="w-8 h-8" />
              </button>

              <button
                aria-label="Move Right"
                onPointerDown={() => {
                  movePlayer('right');
                  if (isMobile) {
                    triggerHapticFeedback();
                    showTouchIndicator();
                  }
                }}
                disabled={!isPlaying || playerCar.lane === LANE_COUNT - 1}
                className={`absolute z-30 flex items-center justify-center
                  text-white font-semibold select-none
                  rounded-xl shadow
                  active:scale-95 transition-transform
                  border border-white/10
                  ${playerCar.lane === LANE_COUNT - 1 || !isPlaying ? 'bg-blue-600/50 cursor-not-allowed' : 'bg-blue-600'}
                `}
                style={{
                  right: '14px',
                  bottom: '18px',
                  width: '72px',
                  height: '72px'
                }}
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </>
          )}

          {/* Show intro hint */}
          {showIntro && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-30">
              <div className="text-center space-y-6 bg-black/60 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                <div className="text-white">
                  <h3 className="text-3xl font-bold mb-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    🏁 Ready to Race?
                  </h3>
                  <p className="text-gray-300 mb-6">
                    {isMobile ? "Swipe left/right to navigate the racing track" : "Use arrow keys or A/D to navigate the racing track"}
                  </p>
                </div>
                <button
                  onClick={() => setShowIntro(false)}
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-12 py-6 rounded-2xl text-2xl font-bold flex items-center transition-all transform hover:scale-105"
                >
                  <Play className="w-8 h-8 mr-4" /> 🏎️ Start Racing
                </button>
              </div>
            </div>
          )}

          {/* Game Over Overlay */}
          {gameOver && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-30">
              <div className="text-center space-y-6 bg-black/70 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                <h3 className="text-4xl font-bold text-white bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
                  💥 Race Over!
                </h3>
                <div className="text-white">
                  <p className="text-xl mb-2">🏆 Final Score: {score}</p>
                  <p className="text-lg text-gray-300">🏁 Distance: {Math.floor(distance / 10)}m</p>
                  <p className="text-lg text-gray-300">⚡ Top Speed: {speed.toFixed(1)}x</p>
                  {score === highScore && score > 0 && (
                    <p className="text-yellow-400 font-semibold text-xl mt-4">🥇 New Championship Record!</p>
                  )}
                </div>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={handleRestart}
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-8 py-4 rounded-2xl text-lg font-semibold flex items-center transition-all"
                  >
                    <RotateCcw className="w-6 h-6 mr-3" /> 🏁 Race Again
                  </button>
                  <button
                    onClick={onClose}
                    className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-8 py-4 rounded-2xl text-lg font-semibold transition-all"
                  >
                    🏠 Exit Track
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};