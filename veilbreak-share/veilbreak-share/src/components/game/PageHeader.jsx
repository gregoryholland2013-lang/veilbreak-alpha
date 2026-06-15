import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Home } from 'lucide-react';

export default function PageHeader({ title, showBack = true }) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-10">
      {showBack && (
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      <h1 className="font-display text-lg font-bold text-primary flex-1">{title}</h1>
      {showBack && (
        <Link
          to="/"
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <Home className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}