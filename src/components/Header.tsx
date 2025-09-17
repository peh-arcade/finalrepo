import React from 'react';
import { Gamepad2, Trophy, Menu } from 'lucide-react';

interface HeaderProps {
  onMenuClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  return (
    <header className="relative z-50 backdrop-blur-xl border-b border-border/20">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center glow-pulse">
              <Gamepad2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="flex flex-col leading-tight">
              <h1 className="text-lg xs:text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                PEH Arcade Hub
              </h1>
              <p className="text-[10px] xs:text-xs text-muted-foreground">
                Powered by Gaming Excellence
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <a href="#games" className="game-btn-secondary">
              🎮 Games
            </a>
            <a href="#leaderboard" className="game-btn-secondary">
              <Trophy className="w-4 h-4 mr-2" />
              Leaderboard
            </a>
          </nav>

          {/* Mobile Menu Button */}
          <button 
            onClick={onMenuClick}
            className="md:hidden game-btn-secondary p-2"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};