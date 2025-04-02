import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Obstacle extends GameObject {
  passed: boolean;
  type: 'smallCactus' | 'largeCactus';
}

interface Cloud extends GameObject {
  speed: number;
}

const TRexGame: React.FC = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isJumping, setIsJumping] = useState(false);
  const [isDucking, setIsDucking] = useState(false);
  const [dino, setDino] = useState<GameObject>({
    x: 50,
    y: 200,
    width: 40,
    height: 40,
  });
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [clouds, setClouds] = useState<Cloud[]>([]);
  const [gameSpeed, setGameSpeed] = useState(5);
  const animationFrameRef = useRef<number>();
  const lastObstacleTimeRef = useRef<number>(0);
  const lastCloudTimeRef = useRef<number>(0);
  const frameCountRef = useRef(0);

  const jump = useCallback(() => {
    if (!isJumping && !gameOver && !isDucking) {
      setIsJumping(true);
      let jumpHeight = 0;
      let jumpVelocity = 20; // Increased from 15 to 20
      let gravity = 0.6; // Decreased from 0.8 to 0.6

      let jumpInterval = setInterval(() => {
        setDino(prev => {
          const newY = prev.y - jumpVelocity;
          jumpVelocity -= gravity;
          jumpHeight += jumpVelocity;

          if (newY >= 200) {
            clearInterval(jumpInterval);
            setIsJumping(false);
            return { ...prev, y: 200 };
          }

          return { ...prev, y: newY };
        });
      }, 20);
    }
  }, [isJumping, gameOver, isDucking]);

  const checkCollision = useCallback((dino: GameObject, obstacle: GameObject) => {
    // Adjust collision box to be more forgiving
    const dinoCollisionBox = {
      x: dino.x + 5,
      y: dino.y + 5,
      width: dino.width - 10,
      height: dino.height - 10,
    };

    return !(
      dinoCollisionBox.x + dinoCollisionBox.width < obstacle.x ||
      dinoCollisionBox.x > obstacle.x + obstacle.width ||
      dinoCollisionBox.y + dinoCollisionBox.height < obstacle.y ||
      dinoCollisionBox.y > obstacle.y + obstacle.height
    );
  }, []);

  const createObstacle = useCallback(() => {
    const types: ('smallCactus' | 'largeCactus')[] = ['smallCactus', 'largeCactus'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    return {
      x: 800,
      y: type === 'smallCactus' ? 200 : 180,
      width: type === 'smallCactus' ? 20 : 30,
      height: type === 'smallCactus' ? 40 : 60,
      passed: false,
      type,
    };
  }, []);

  const createCloud = useCallback(() => {
    return {
      x: 800,
      y: Math.random() * 100 + 50,
      width: 60,
      height: 30,
      speed: Math.random() * 2 + 1,
    };
  }, []);

  const gameLoop = useCallback(() => {
    if (!gameStarted || gameOver) return;

    frameCountRef.current += 1;

    // Increase game speed over time
    if (frameCountRef.current % 500 === 0) {
      setGameSpeed(prev => Math.min(prev + 0.5, 12));
    }

    const now = Date.now();
    
    // Spawn obstacles
    if (now - lastObstacleTimeRef.current > 2000 / (gameSpeed / 5)) {
      setObstacles(prev => [...prev, createObstacle()]);
      lastObstacleTimeRef.current = now;
    }

    // Spawn clouds
    if (now - lastCloudTimeRef.current > 3000) {
      setClouds(prev => [...prev, createCloud()]);
      lastCloudTimeRef.current = now;
    }

    // Update clouds
    setClouds(prev =>
      prev
        .map(cloud => ({
          ...cloud,
          x: cloud.x - cloud.speed,
        }))
        .filter(cloud => cloud.x > -100)
    );

    // Update obstacles
    setObstacles(prev =>
      prev
        .map(obstacle => {
          const newX = obstacle.x - gameSpeed;
          const newObstacle = { ...obstacle, x: newX };

          if (!obstacle.passed && newX < dino.x) {
            setScore(prev => prev + 1);
            newObstacle.passed = true;
          }

          if (checkCollision(dino, newObstacle)) {
            setGameOver(true);
            setHighScore(prev => Math.max(prev, score));
          }

          return newObstacle;
        })
        .filter(obstacle => obstacle.x > -50)
    );

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [gameStarted, gameOver, dino, score, gameSpeed, checkCollision, createObstacle, createCloud]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (!gameStarted) {
          setGameStarted(true);
          setGameOver(false);
          setScore(0);
          setObstacles([]);
          setClouds([]);
          setGameSpeed(5);
          frameCountRef.current = 0;
        } else if (gameOver) {
          setGameStarted(true);
          setGameOver(false);
          setScore(0);
          setObstacles([]);
          setClouds([]);
          setGameSpeed(5);
          frameCountRef.current = 0;
        } else {
          jump();
        }
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        if (!isJumping) {
          setIsDucking(true);
          setDino(prev => ({ ...prev, height: 20 }));
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowDown') {
        setIsDucking(false);
        setDino(prev => ({ ...prev, height: 40 }));
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameStarted, gameOver, jump, isJumping]);

  useEffect(() => {
    if (gameStarted && !gameOver) {
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameStarted, gameOver, gameLoop]);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="relative w-[800px] h-[400px] bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {gameStarted ? <WifiOff className="text-red-500" /> : <Wifi className="text-green-500" />}
        </div>
        
        <div className="absolute top-4 left-4">
          <div className="text-lg font-mono">Score: {score}</div>
          <div className="text-sm text-gray-600 font-mono">High Score: {highScore}</div>
        </div>

        {/* Clouds */}
        {clouds.map((cloud, index) => (
          <div
            key={`cloud-${index}`}
            className="absolute bg-gray-200"
            style={{
              left: cloud.x,
              top: cloud.y,
              width: cloud.width,
              height: cloud.height,
              borderRadius: '20px',
              opacity: 0.8,
            }}
          />
        ))}

        {/* Ground */}
        <div className="absolute bottom-0 w-full h-[2px] bg-gray-300" />

        {/* Dino */}
        <div
          className="absolute bg-gray-800 transition-transform"
          style={{
            left: dino.x,
            top: dino.y,
            width: dino.width,
            height: dino.height,
            clipPath: isDucking
              ? 'polygon(0% 100%, 100% 100%, 100% 50%, 0% 50%)'
              : 'polygon(0% 100%, 100% 100%, 100% 30%, 80% 30%, 80% 0%, 40% 0%, 40% 30%, 0% 30%)',
            transform: `rotate(${isJumping ? '-10deg' : '0deg'})`,
          }}
        />

        {/* Obstacles */}
        {obstacles.map((obstacle, index) => (
          <div
            key={`obstacle-${index}`}
            className="absolute bg-gray-800"
            style={{
              left: obstacle.x,
              top: obstacle.y,
              width: obstacle.width,
              height: obstacle.height,
              clipPath: obstacle.type === 'smallCactus'
                ? 'polygon(50% 0%, 80% 0%, 80% 100%, 20% 100%, 20% 0%, 50% 0%, 50% 20%, 90% 20%, 90% 40%, 50% 40%)'
                : 'polygon(30% 0%, 70% 0%, 70% 100%, 30% 100%, 30% 0%, 50% 0%, 50% 20%, 90% 20%, 90% 40%, 10% 40%, 10% 20%, 50% 20%)',
            }}
          />
        ))}

        {/* Game messages */}
        {!gameStarted && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">No Internet Connection</h2>
              <p className="text-gray-600 mb-4">Press SPACE or ↑ to start</p>
              <p className="text-gray-500 text-sm">Use ↑ to jump, ↓ to duck</p>
            </div>
          </div>
        )}

        {gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center text-white">
              <h2 className="text-3xl font-bold mb-4">Game Over!</h2>
              <p className="mb-4">Score: {score}</p>
              <p className="text-sm">Press SPACE or ↑ to restart</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TRexGame;