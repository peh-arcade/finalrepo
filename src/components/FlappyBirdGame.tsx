// src/pages/FlappyBirdGame.tsx
import React, { useRef, useEffect, useState } from "react";
import "./FlamingoPage.css";
// Import the bird image
import birdPng from "../assets/bird.png";

interface FlappyBirdGameProps {
  onExit: () => void;
  onScore: (score: number) => void;
}

interface Bird {
  x: number;
  y: number;
  w: number;
  h: number;
  vy: number;
  rotation: number;
}

interface Pipe {
  x: number;
  centerY: number;
  passed: boolean;
}

export function FlappyBirdGame({ onExit, onScore }: FlappyBirdGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Use refs for per-frame state
  const runningRef = useRef(false);
  const gameOverRef = useRef(false);
  const showIntroRef = useRef(true);

  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number>(
    () => parseInt(localStorage.getItem("flappy_best") || "0", 10)
  );
  const [showIntro, setShowIntro] = useState(true);

  // --- Game constants ---
  const gravity = 1000;
  const flapVelocity = -350;
  const pipeSpeedBase = 160;
  // Reasonable gap for playability
  const pipeGap = 220;
  const pipeWidth = 60;
  const spawnIntervalBase = 1.6;
  const groundHeight = 80;

  // Configurable image dimensions - easily adjustable
  const imageConfig = {
    bird: {
      width: 150,
      height: 80,
      scale: 1.0,
      // Collision hitbox adjustment (smaller than visual size for better gameplay)
      hitboxScale: 0.7 // Bird hitbox is 70% of visual size
    },
    pipe: {
      width: 60,
      height: 400,
      scale: 1.0,
      // Pipe collision adjustment
      hitboxPadding: 2 // Reduce pipe collision area by 2px on each side
    },
    cloud: {
      width: 200,
      height: 100,
      scale: 1.0
    }
  };

  // Calculate actual dimensions
  const birdDimensions = {
    width: imageConfig.bird.width * imageConfig.bird.scale,
    height: imageConfig.bird.height * imageConfig.bird.scale,
    // Collision dimensions (smaller for more forgiving gameplay)
    collisionWidth: imageConfig.bird.width * imageConfig.bird.scale * imageConfig.bird.hitboxScale,
    collisionHeight: imageConfig.bird.height * imageConfig.bird.scale * imageConfig.bird.hitboxScale
  };

  const pipeDimensions = {
    width: imageConfig.pipe.width * imageConfig.pipe.scale,
    height: imageConfig.pipe.height * imageConfig.pipe.scale,
    // Collision dimensions (slightly smaller)
    collisionWidth: imageConfig.pipe.width * imageConfig.pipe.scale - (imageConfig.pipe.hitboxPadding * 2),
    collisionX: imageConfig.pipe.hitboxPadding
  };

  const cloudDimensions = {
    width: imageConfig.cloud.width * imageConfig.cloud.scale,
    height: imageConfig.cloud.height * imageConfig.cloud.scale
  };

  const birdRef = useRef<Bird>({ 
    x: 0, 
    y: 0, 
    w: birdDimensions.width, 
    h: birdDimensions.height, 
    vy: 0, 
    rotation: 0 
  });
  const pipesRef = useRef<Pipe[]>([]);
  const spawnTimerRef = useRef<number>(0);
  const canvasSizeRef = useRef<{ w: number; h: number }>({ w: 360, h: 640 });
  const scoreRef = useRef<number>(0);

  // Image refs for sprites
  const birdImageRef = useRef<HTMLImageElement | null>(null);
  const pipeImageRef = useRef<HTMLImageElement | null>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  // Handle game over
  function handleGameOver() {
    if (gameOverRef.current) return;
    gameOverRef.current = true;
    runningRef.current = false;
    setGameOver(true);
    setRunning(false);
    onScore(scoreRef.current);
  }

  // Load images
  useEffect(() => {
    let loadedCount = 0;
    const totalImages = 3;

    const checkAllLoaded = () => {
      loadedCount++;
      if (loadedCount === totalImages) {
        setImagesLoaded(true);
      }
    };

    // Create bird image using the imported PNG with configurable dimensions
    const birdImg = new Image();
    birdImg.onload = checkAllLoaded;
    birdImg.onerror = () => {
      console.warn("Failed to load bird.png, using fallback SVG");
      // Fallback to SVG if PNG fails to load with configurable dimensions
      birdImg.src = "data:image/svg+xml;base64," + btoa(`
        <svg width="${birdDimensions.width}" height="${birdDimensions.height}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="birdGrad" cx="0.3" cy="0.3">
              <stop offset="0%" stop-color="#FFE135"/>
              <stop offset="100%" stop-color="#FFA000"/>
            </radialGradient>
          </defs>
          <ellipse cx="${birdDimensions.width/2}" cy="${birdDimensions.height/2}" rx="${birdDimensions.width/2.1}" ry="${birdDimensions.height/2.1}" fill="url(#birdGrad)" stroke="#FF6B00" stroke-width="1"/>
          <circle cx="${birdDimensions.width * 0.67}" cy="${birdDimensions.height * 0.33}" r="3" fill="#000"/>
          <circle cx="${birdDimensions.width * 0.71}" cy="${birdDimensions.height * 0.3}" r="1" fill="#FFF"/>
          <path d="M${birdDimensions.width * 0.83} ${birdDimensions.height * 0.4} L${birdDimensions.width} ${birdDimensions.height * 0.33} L${birdDimensions.width} ${birdDimensions.height * 0.53} L${birdDimensions.width * 0.83} ${birdDimensions.height * 0.5} Z" fill="#FF8F00"/>
          <path d="M${birdDimensions.width * 0.12} ${birdDimensions.height * 0.67} L${birdDimensions.width * 0.36} ${birdDimensions.height * 0.83} L${birdDimensions.width * 0.36} ${birdDimensions.height * 0.93} L${birdDimensions.width * 0.12} ${birdDimensions.height * 0.83} Z" fill="#FF8F00"/>
        </svg>
      `);
      checkAllLoaded();
    };
    // Try to load the PNG first
    birdImg.src = birdPng;
    birdImageRef.current = birdImg;

    // Create pipe image with configurable dimensions
    const pipeImg = new Image();
    pipeImg.onload = checkAllLoaded;
    pipeImg.onerror = checkAllLoaded;
    pipeImg.src = "data:image/svg+xml;base64," + btoa(`
      <svg width="${pipeDimensions.width}" height="${pipeDimensions.height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="pipeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#4CAF50"/>
            <stop offset="50%" stop-color="#66BB6A"/>
            <stop offset="100%" stop-color="#2E7D32"/>
          </linearGradient>
        </defs>
        <rect x="${pipeDimensions.width * 0.08}" y="0" width="${pipeDimensions.width * 0.83}" height="${pipeDimensions.height}" fill="url(#pipeGrad)" stroke="#1B5E20" stroke-width="2"/>
        <rect x="0" y="0" width="${pipeDimensions.width}" height="${pipeDimensions.height * 0.05}" fill="#4CAF50" stroke="#1B5E20" stroke-width="2"/>
        <rect x="0" y="${pipeDimensions.height * 0.95}" width="${pipeDimensions.width}" height="${pipeDimensions.height * 0.05}" fill="#4CAF50" stroke="#1B5E20" stroke-width="2"/>
        <!-- Pipe highlights -->
        <rect x="${pipeDimensions.width * 0.13}" y="${pipeDimensions.height * 0.0125}" width="${pipeDimensions.width * 0.13}" height="${pipeDimensions.height * 0.975}" fill="#81C784" opacity="0.7"/>
        <rect x="${pipeDimensions.width * 0.73}" y="${pipeDimensions.height * 0.0125}" width="${pipeDimensions.width * 0.13}" height="${pipeDimensions.height * 0.975}" fill="#2E7D32" opacity="0.5"/>
      </svg>
    `);
    pipeImageRef.current = pipeImg;

    // Create background clouds with configurable dimensions
    const bgImg = new Image();
    bgImg.onload = checkAllLoaded;
    bgImg.onerror = checkAllLoaded;
    bgImg.src = "data:image/svg+xml;base64," + btoa(`
      <svg width="${cloudDimensions.width}" height="${cloudDimensions.height}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${cloudDimensions.width * 0.25}" cy="${cloudDimensions.height * 0.5}" r="${cloudDimensions.height * 0.25}" fill="#FFF" opacity="0.8"/>
        <circle cx="${cloudDimensions.width * 0.35}" cy="${cloudDimensions.height * 0.45}" r="${cloudDimensions.height * 0.3}" fill="#FFF" opacity="0.8"/>
        <circle cx="${cloudDimensions.width * 0.45}" cy="${cloudDimensions.height * 0.5}" r="${cloudDimensions.height * 0.25}" fill="#FFF" opacity="0.8"/>
        <circle cx="${cloudDimensions.width * 0.75}" cy="${cloudDimensions.height * 0.3}" r="${cloudDimensions.height * 0.2}" fill="#FFF" opacity="0.6"/>
        <circle cx="${cloudDimensions.width * 0.825}" cy="${cloudDimensions.height * 0.25}" r="${cloudDimensions.height * 0.25}" fill="#FFF" opacity="0.6"/>
        <circle cx="${cloudDimensions.width * 0.9}" cy="${cloudDimensions.height * 0.3}" r="${cloudDimensions.height * 0.2}" fill="#FFF" opacity="0.6"/>
      </svg>
    `);
    backgroundImageRef.current = bgImg;

    return () => {
      // Cleanup if needed
    };
  }, [birdDimensions.width, birdDimensions.height, pipeDimensions.width, pipeDimensions.height, cloudDimensions.width, cloudDimensions.height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imagesLoaded) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Resize canvas to fit container
    function resize() {
      const parent = canvas.parentElement;
      if (!parent) return;
      const ratio = window.devicePixelRatio || 1;
      const vw = parent.clientWidth;
      const vh = parent.clientHeight;
      canvas.style.width = vw + "px";
      canvas.style.height = vh + "px";
      canvas.width = Math.round(vw * ratio);
      canvas.height = Math.round(vh * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      canvasSizeRef.current = { w: vw, h: vh };
      const bird = birdRef.current;
      bird.x = vw * 0.28;
      bird.y = vh * 0.45;
    }

    window.addEventListener("resize", resize);
    resize();

    function resetGameVars() {
      const bird = birdRef.current;
      bird.vy = 0;
      bird.rotation = 0;
      bird.y = canvasSizeRef.current.h * 0.45;
      // Update bird dimensions
      bird.w = birdDimensions.width;
      bird.h = birdDimensions.height;
      pipesRef.current = [];
      spawnTimerRef.current = 0;
      scoreRef.current = 0;
      setScore(0);
      setGameOver(false);
      setRunning(false);
      setShowIntro(true);
      runningRef.current = false;
      gameOverRef.current = false;
      showIntroRef.current = true;
    }

    function spawnPipe() {
      const h = canvasSizeRef.current.h;
      // Ensure the gap is always fully visible within the canvas
      const minCenter = pipeGap / 2 + 10;
      const maxCenter = h - pipeGap / 2 - 10;
      const centerY = Math.random() * (maxCenter - minCenter) + minCenter;
      const x = canvasSizeRef.current.w + 40;
      pipesRef.current.push({ x, centerY, passed: false });
    }

    // Improved collision detection function
    function rectsCollide(
      a: { x: number; y: number; w: number; h: number },
      b: { x: number; y: number; w: number; h: number }
    ) {
      // Add small buffer to make collision less sensitive
      const buffer = 1;
      return !(
        a.x + a.w - buffer < b.x + buffer ||
        a.x + buffer > b.x + b.w - buffer ||
        a.y + a.h - buffer < b.y + buffer ||
        a.y + buffer > b.y + b.h - buffer
      );
    }

    // Circular collision detection for more natural bird collision
    function circleRectCollide(
      circle: { x: number; y: number; radius: number },
      rect: { x: number; y: number; w: number; h: number }
    ) {
      // Find the closest point on the rectangle to the circle center
      const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.w));
      const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.h));
      
      // Calculate the distance between the circle center and closest point
      const distanceX = circle.x - closestX;
      const distanceY = circle.y - closestY;
      const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);
      
      return distanceSquared < (circle.radius * circle.radius);
    }

    function update(dt: number) {
      if (!runningRef.current || gameOverRef.current) return;
      
      const bird = birdRef.current;
      bird.vy += gravity * dt;
      bird.y += bird.vy * dt;
      bird.rotation = Math.max(-0.9, Math.min(1.0, bird.vy / 600));

      const speed = pipeSpeedBase + scoreRef.current * 3;
      for (let i = pipesRef.current.length - 1; i >= 0; i--) {
        pipesRef.current[i].x -= speed * dt;

        if (
          !pipesRef.current[i].passed &&
          pipesRef.current[i].x + pipeDimensions.width < bird.x
        ) {
          pipesRef.current[i].passed = true;
          scoreRef.current += 1;
          setScore(scoreRef.current);
          if (scoreRef.current > best) {
            setBest(scoreRef.current);
            localStorage.setItem("flappy_best", String(scoreRef.current));
          }
        }
        if (pipesRef.current[i].x < -pipeDimensions.width - 40) {
          pipesRef.current.splice(i, 1);
        }
      }

      const spawnInterval = Math.max(
        0.9,
        spawnIntervalBase - Math.min(0.8, scoreRef.current * 0.03)
      );
      spawnTimerRef.current += dt;
      if (spawnTimerRef.current >= spawnInterval) {
        spawnTimerRef.current = 0;
        spawnPipe();
      }

      // Precise collision with ground / ceiling using smaller hitbox
      const birdTop = bird.y - (birdDimensions.collisionHeight / 2);
      const birdBottom = bird.y + (birdDimensions.collisionHeight / 2);
      
      if (birdBottom >= canvasSizeRef.current.h - groundHeight || birdTop <= 0) {
        handleGameOver();
      }

      // Enhanced collision with pipes using circular collision for bird
      for (const p of pipesRef.current) {
        // Bird as circle for more natural collision
        const birdCircle = {
          x: bird.x,
          y: bird.y,
          radius: Math.min(birdDimensions.collisionWidth, birdDimensions.collisionHeight) / 2.2 // Slightly smaller radius
        };
        
        // Top pipe rectangle (with adjusted collision area)
        const topRect = {
          x: p.x + pipeDimensions.collisionX,
          y: 0,
          w: pipeDimensions.collisionWidth,
          h: p.centerY - pipeGap / 2,
        };
        
        // Bottom pipe rectangle (with adjusted collision area)
        const bottomRect = {
          x: p.x + pipeDimensions.collisionX,
          y: p.centerY + pipeGap / 2,
          w: pipeDimensions.collisionWidth,
          h: canvasSizeRef.current.h - groundHeight - (p.centerY + pipeGap / 2),
        };

        // Check collision with both pipes using circle-rectangle collision
        if (circleRectCollide(birdCircle, topRect) || circleRectCollide(birdCircle, bottomRect)) {
          handleGameOver();
        }
      }
    }

    function draw() {
      const vw = canvasSizeRef.current.w;
      const vh = canvasSizeRef.current.h;
      ctx.clearRect(0, 0, vw, vh);

      // Enhanced background with clouds
      const g = ctx.createLinearGradient(0, 0, 0, vh);
      g.addColorStop(0, "#87CEEB");
      g.addColorStop(0.7, "#98D8E8");
      g.addColorStop(1, "#B0E0E6");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, vw, vh);

      // Draw moving clouds with configurable dimensions
      if (backgroundImageRef.current) {
        const cloudSpeed = 0.5;
        const cloudOffset = (Date.now() * cloudSpeed) % 400;
        for (let i = -1; i < Math.ceil(vw / cloudDimensions.width) + 1; i++) {
          ctx.globalAlpha = 0.3;
          ctx.drawImage(
            backgroundImageRef.current,
            i * cloudDimensions.width - cloudOffset,
            vh * 0.1,
            cloudDimensions.width,
            cloudDimensions.height
          );
          ctx.drawImage(
            backgroundImageRef.current,
            i * cloudDimensions.width - cloudOffset + cloudDimensions.width/2,
            vh * 0.25,
            cloudDimensions.width,
            cloudDimensions.height
          );
        }
        ctx.globalAlpha = 1;
      }

      // Enhanced ground with texture
      const groundGradient = ctx.createLinearGradient(0, vh - groundHeight, 0, vh);
      groundGradient.addColorStop(0, "#8BC34A");
      groundGradient.addColorStop(0.3, "#689F38");
      groundGradient.addColorStop(1, "#558B2F");
      ctx.fillStyle = groundGradient;
      ctx.fillRect(0, vh - groundHeight, vw, groundHeight);

      // Add grass texture
      ctx.fillStyle = "#4CAF50";
      for (let i = 0; i < vw; i += 10) {
        ctx.fillRect(i, vh - groundHeight, 2, 5);
        ctx.fillRect(i + 5, vh - groundHeight + 2, 2, 3);
      }

      // Draw pipes with configurable dimensions
      if (pipeImageRef.current) {
        for (const p of pipesRef.current) {
          // Top pipe (flipped)
          ctx.save();
          ctx.translate(p.x + pipeDimensions.width / 2, p.centerY - pipeGap / 2);
          ctx.scale(1, -1);
          ctx.drawImage(
            pipeImageRef.current,
            -pipeDimensions.width / 2,
            0,
            pipeDimensions.width,
            p.centerY - pipeGap / 2
          );
          ctx.restore();

          // Bottom pipe
          ctx.drawImage(
            pipeImageRef.current,
            p.x,
            p.centerY + pipeGap / 2,
            pipeDimensions.width,
            vh - groundHeight - (p.centerY + pipeGap / 2)
          );
        }
      } else {
        // Fallback to colored rectangles with configurable dimensions
        ctx.fillStyle = "#2aa02a";
        for (const p of pipesRef.current) {
          ctx.fillRect(p.x, 0, pipeDimensions.width, p.centerY - pipeGap / 2);
          ctx.fillRect(p.x, p.centerY + pipeGap / 2, pipeDimensions.width, vh - groundHeight - (p.centerY + pipeGap / 2));
        }
      }

      // Draw bird with configurable dimensions
      const bird = birdRef.current;
      ctx.save();
      ctx.translate(bird.x, bird.y);
      ctx.rotate(bird.rotation);

      // Add bird shadow with configurable dimensions
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = "#000";
      if (birdImageRef.current) {
        ctx.drawImage(birdImageRef.current, -bird.w / 2 + 2, -bird.h / 2 + 2, bird.w, bird.h);
      }
      ctx.globalAlpha = 1;

      // Draw main bird with configurable dimensions
      if (birdImageRef.current) {
        ctx.drawImage(birdImageRef.current, -bird.w / 2, -bird.h / 2, bird.w, bird.h);
      } else {
        // Fallback bird design with configurable dimensions
        ctx.fillStyle = "#ffdd57";
        ctx.beginPath();
        ctx.ellipse(0, 0, bird.w / 2, bird.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#222";
        ctx.beginPath();
        ctx.arc(bird.w * 0.14, -2, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Add wing flap effect with configurable dimensions
      if (bird.vy < 0) {
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = "#FFF";
        ctx.beginPath();
        ctx.ellipse(-bird.w * 0.2, 0, bird.w * 0.3, bird.h * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      ctx.restore();
    }

    function loop(ts: number) {
      const last = lastTimeRef.current || ts;
      const dt = Math.min(0.05, (ts - last) / 1000);
      lastTimeRef.current = ts;
      update(dt);
      draw();
      rafRef.current = requestAnimationFrame(loop);
    }

    resetGameVars();
    rafRef.current = requestAnimationFrame(loop);

    function flap() {
      if (gameOverRef.current) return;
      if (!runningRef.current) {
        runningRef.current = true;
        setRunning(true);
        showIntroRef.current = false;
        setShowIntro(false);
      }
      birdRef.current.vy = flapVelocity;
    }

    function onPointerDown(e: PointerEvent) {
      if (
        e.target === canvas.parentElement ||
        (e.target as HTMLElement).tagName === "CANVAS"
      ) {
        flap();
        e.preventDefault();
      }
    }

    const canvasWrap = canvas.parentElement;
    if (canvasWrap) {
      canvasWrap.addEventListener("pointerdown", onPointerDown, { passive: false });
    }

    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (canvasWrap) canvasWrap.removeEventListener("pointerdown", onPointerDown);
    };
    // Remove best from dependencies to prevent game restart on high score
    // eslint-disable-next-line
  }, [imagesLoaded, birdDimensions.width, birdDimensions.height, pipeDimensions.width, pipeDimensions.height, cloudDimensions.width, cloudDimensions.height]);

  function handleRestart() {
    // Reset all game variables to initial state
    const bird = birdRef.current;
    bird.vy = 0;
    bird.rotation = 0;
    bird.y = canvasSizeRef.current.h * 0.45;
    pipesRef.current = [];
    spawnTimerRef.current = 0;
    scoreRef.current = 0;
    
    // Reset React state
    setScore(0);
    setShowIntro(false);
    setGameOver(false);
    setRunning(true);
    
    // Reset refs
    showIntroRef.current = false;
    gameOverRef.current = false;
    runningRef.current = true;
  }

  return (
    <div className="flamingo-overlay">
      <div className="flamingo-topbar">
        <button className="f-back" onClick={onExit}>
          ✕
        </button>
        <div className="f-score">
          Score: <strong>{score}</strong>
        </div>
        <div className="f-high">
          Best: <strong>{best}</strong>
        </div>
      </div>

      <div className="flamingo-canvas-wrap">
        <canvas ref={canvasRef} className="flamingo-canvas" />

        {showIntro && <div className="f-hint">Tap to Start</div>}

        {gameOver && (
          <div className="f-gameover">
            <div className="f-card">
              <h3>Game Over</h3>
              <p>Score: {score}</p>
              <div className="f-actions">
                <button className="f-btn" onClick={handleRestart}>
                  Play Again
                </button>
                <button className="f-btn" onClick={onExit}>
                  Exit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flamingo-footer">
        <button
          className="f-control"
          onClick={() => {
            if (!gameOverRef.current) {
              if (!runningRef.current) {
                runningRef.current = true;
                setRunning(true);
                showIntroRef.current = false;
                setShowIntro(false);
              }
              birdRef.current.vy = flapVelocity;
            }
          }}
        >
          FLAP
        </button>
        <div className="f-controls-right">
          <button
            className="f-small"
            onClick={() => {
              runningRef.current = !runningRef.current;
              setRunning(runningRef.current);
            }}
          >
            {running ? "Pause" : "Resume"}
          </button>
          <button className="f-small" onClick={handleRestart}>
            Restart
          </button>
        </div>
      </div>
    </div>
  );
}

