import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { GameGrid } from '@/components/GameGrid';
import { SnakeGame } from '@/components/SnakeGame';
import { Game2048 } from '@/components/Game2048';
import { FlappyBirdGame } from '@/components/FlappyBirdGame';
import { CarRacingGame } from '@/components/CarRacingGame';

const Index = () => {
  const [selectedGame, setSelectedGame] = useState<string | null>(null);

  const handleGameSelect = (gameId: string) => {
    setSelectedGame(gameId);
  };

  const handleCloseGame = () => {
    setSelectedGame(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <GameGrid onGameSelect={handleGameSelect} />
      </main>

      {/* Game Modals */}
      {selectedGame === 'snake' && (
        <SnakeGame onClose={handleCloseGame} />
      )}
      
      {selectedGame === 'flappybird' && (
        <FlappyBirdGame onExit={handleCloseGame} onScore={() => {}} />
      )}
      {selectedGame === 'racing' && (
        <CarRacingGame onClose={handleCloseGame} />
      )}
      {selectedGame === '2048' && (
        <Game2048 onClose={handleCloseGame} />
      )}
      {/* Footer */}
      <footer className="py-12 border-t border-border/20">
        <div className="container mx-auto px-4 text-center">
          <div className="space-y-2">
            <p className="text-muted-foreground">
              Built with ❤️ for the ultimate timepass
            </p>
            <p className="text-sm text-muted-foreground">
              Powered by <span className="font-semibold text-primary">PEH Network Hub</span> © 2025
            </p>
            <p className="text-xs text-muted-foreground">
              This version is beta version. If any feedback mail to <a href="mailto:contactpehnetworkhub@gmail.com" className="underline">contactpehnetworkhub@gmail.com</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
