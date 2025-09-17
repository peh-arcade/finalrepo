import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, RotateCcw, Play, Pause } from 'lucide-react';

interface FlappyBirdGameProps {
  onClose: () => void;
}

interface Bird {
  y: number;
  velocity: number;
}

interface Pipe {
  x: number;
  gapY: number;
  passed: boolean;
}

export const FlappyBirdGame: React.FC<FlappyBirdGameProps> = ({ onClose }) => {
  const GAME_WIDTH = 400;
  const GAME_HEIGHT = 600;
  const BIRD_SIZE = 30;
  const PIPE_WIDTH = 60;
  const PIPE_GAP = 150;
  const GRAVITY = 0.5;
  const JUMP_FORCE = -10;
  const PIPE_SPEED = 3;

  const gameRef = useRef<HTMLDivElement>(null);
  const [bird, setBird] = useState<Bird>({ y: GAME_HEIGHT / 2, velocity: 0 });
  const [pipes, setPipes] = useState<Pipe[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('flappyBirdHighScore') || '0');
  });
  const [scale, setScale] = useState(1);

  const jump = useCallback(() => {
    if (!isPlaying || gameOver) return;
    setBird(prev => ({ ...prev, velocity: JUMP_FORCE }));
  }, [isPlaying, gameOver]);

  const generatePipe = useCallback((): Pipe => {
    const gapY = Math.random() * (GAME_HEIGHT - PIPE_GAP - 100) + 50;
    return {
      x: GAME_WIDTH,
      gapY,
      passed: false
    };
  }, []);

  const checkCollision = useCallback((birdY: number, pipes: Pipe[]): boolean => {
    const birdX = 50;
    const birdLeft = birdX;
    const birdRight = birdX + BIRD_SIZE;
    const birdTop = birdY;
    const birdBottom = birdY + BIRD_SIZE;

    // Check ground and ceiling collision
    if (birdTop <= 0 || birdBottom >= GAME_HEIGHT) {
      return true;
    }

    // Check pipe collision
    for (const pipe of pipes) {
      const pipeLeft = pipe.x;
      const pipeRight = pipe.x + PIPE_WIDTH;
      
      if (birdRight > pipeLeft && birdLeft < pipeRight) {
        if (birdTop < pipe.gapY || birdBottom > pipe.gapY + PIPE_GAP) {
          return true;
        }
      }
    }

    return false;
  }, []);

  // Game loop
  useEffect(() => {
    if (!isPlaying) return;

    const gameLoop = setInterval(() => {
      setBird(prev => {
        const newY = prev.y + prev.velocity;
        const newVelocity = prev.velocity + GRAVITY;
        return { y: newY, velocity: newVelocity };
      });

      setPipes(prev => {
        let newPipes = prev.map(pipe => ({ ...pipe, x: pipe.x - PIPE_SPEED }));
        
        // Remove pipes that are off screen
        newPipes = newPipes.filter(pipe => pipe.x > -PIPE_WIDTH);
        
        // Add new pipe if needed
        if (newPipes.length === 0 || newPipes[newPipes.length - 1].x < GAME_WIDTH - 200) {
          newPipes.push(generatePipe());
        }

        // Check for scoring
        newPipes.forEach(pipe => {
          if (!pipe.passed && pipe.x + PIPE_WIDTH < 50) {
            pipe.passed = true;
            setScore(prev => {
              const newScore = prev + 1;
              if (newScore > highScore) {
                setHighScore(newScore);
                localStorage.setItem('flappyBirdHighScore', newScore.toString());
              }
              return newScore;
            });
          }
        });

        return newPipes;
      });
    }, 1000 / 60); // 60 FPS

    return () => clearInterval(gameLoop);
  }, [isPlaying, generatePipe, highScore]);

  // Collision detection
  useEffect(() => {
    if (isPlaying && checkCollision(bird.y, pipes)) {
      setGameOver(true);
      setIsPlaying(false);
    }
  }, [bird.y, pipes, isPlaying, checkCollision]);

  // Touch and keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === 'ArrowUp') {
        e.preventDefault();
        jump();
      }
    };

    const handleClick = () => {
      jump();
    };

    const handleTouch = (e: TouchEvent) => {
      e.preventDefault();
      jump();
    };

    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('click', handleClick);
    window.addEventListener('touchstart', handleTouch);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('touchstart', handleTouch);
    };
  }, [jump]);

  const startGame = () => {
    if (gameOver) {
      setBird({ y: GAME_HEIGHT / 2, velocity: 0 });
      setPipes([]);
      setScore(0);
      setGameOver(false);
    }
    setIsPlaying(true);
  };

  const resetGame = () => {
    setIsPlaying(false);
    setGameOver(false);
    setBird({ y: GAME_HEIGHT / 2, velocity: 0 });
    setPipes([]);
    setScore(0);
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
              <span className="text-sm">🐦</span>
            </div>
            <h2 className="text-2xl font-bold text-foreground">Flappy Bird</h2>
          </div>
          <button
            onClick={onClose}
            className="game-btn-secondary p-2 hover:bg-destructive hover:text-destructive-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Score Display */}
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
            </div>

            <div className="p-4 rounded-lg bg-secondary/50 border border-border/50">
              <div className="text-sm text-muted-foreground mb-2">Instructions</div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Tap or press Space to flap</p>
                <p>• Avoid pipes and ground</p>
                <p>• Pass through gaps to score</p>
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
                className="relative bg-gradient-to-b from-blue-400 to-blue-600 border border-border/50 rounded-xl overflow-hidden cursor-pointer select-none"
                style={{
                  width: GAME_WIDTH,
                  height: GAME_HEIGHT,
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left'
                }}
                onClick={jump}
              >
                {/* Background */}
                <div className="absolute inset-0 bg-gradient-to-b from-blue-400 via-blue-500 to-green-400">
                  {/* Clouds */}
                  <div className="absolute top-10 left-10 w-16 h-8 bg-white/30 rounded-full"></div>
                  <div className="absolute top-20 right-20 w-12 h-6 bg-white/20 rounded-full"></div>
                  <div className="absolute top-32 left-32 w-20 h-10 bg-white/25 rounded-full"></div>
                </div>

                {/* Bird */}
                <div
                  className="absolute bg-yellow-400 border-2 border-orange-400 rounded-full transition-transform duration-75"
                  style={{
                    width: BIRD_SIZE,
                    height: BIRD_SIZE,
                    left: 50,
                    top: bird.y,
                    transform: `rotate(${Math.min(Math.max(bird.velocity * 3, -45), 45)}deg)`
                  }}
                >
                  <div className="absolute top-1 left-1 w-2 h-2 bg-black rounded-full"></div>
                  <div className="absolute top-3 right-1 w-1 h-1 bg-orange-600 rounded-full"></div>
                </div>

                {/* Pipes */}
                {pipes.map((pipe, index) => (
                  <div key={index}>
                    {/* Top pipe */}
                    <div
                      className="absolute bg-green-600 border-r-4 border-green-700"
                      style={{
                        left: pipe.x,
                        top: 0,
                        width: PIPE_WIDTH,
                        height: pipe.gapY
                      }}
                    >
                      <div
                        className="absolute bottom-0 left-0 bg-green-500 border-2 border-green-700"
                        style={{
                          width: PIPE_WIDTH + 8,
                          height: 30,
                          marginLeft: -4
                        }}
                      ></div>
                    </div>
                    
                    {/* Bottom pipe */}
                    <div
                      className="absolute bg-green-600 border-r-4 border-green-700"
                      style={{
                        left: pipe.x,
                        top: pipe.gapY + PIPE_GAP,
                        width: PIPE_WIDTH,
                        height: GAME_HEIGHT - pipe.gapY - PIPE_GAP
                      }}
                    >
                      <div
                        className="absolute top-0 left-0 bg-green-500 border-2 border-green-700"
                        style={{
                          width: PIPE_WIDTH + 8,
                          height: 30,
                          marginLeft: -4
                        }}
                      ></div>
                    </div>
                  </div>
                ))}

                {/* Ground */}
                <div className="absolute bottom-0 left-0 right-0 h-4 bg-green-600 border-t-2 border-green-700"></div>

                {/* Game Over Overlay */}
                {gameOver && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <h3 className="text-3xl font-bold text-white">Game Over!</h3>
                      <p className="text-lg text-white/80">Score: {score}</p>
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
                        Start Game
                      </button>
                      <p className="text-white/80 text-sm">Tap to flap!</p>
                    </div>
                  </div>
                )}

                {/* Score display during game */}
                {isPlaying && !gameOver && (
                  <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
                    <div className="text-4xl font-bold text-white text-center drop-shadow-lg">
                      {score}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                disabled={gameOver}
                className="game-btn-secondary py-3"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              <button
                onClick={resetGame}
                className="game-btn-secondary py-3"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center space-y-2">
              <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
                <p className="text-sm font-semibold text-accent mb-2">Mobile Controls</p>
                <p className="text-xs text-muted-foreground">
                  Tap anywhere on the game area to make the bird flap upward!
                </p>
              </div>
              
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Desktop: Space or click</p>
                <p>Mobile: Tap the game area</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};