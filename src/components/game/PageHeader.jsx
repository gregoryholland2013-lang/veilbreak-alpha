import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Home } from 'lucide-react';

export default function PageHeader({ title, showBack = true, subtitle = '' }) {
  const navigate = useNavigate();

  return (
    <div className="sticky top-[58px] z-30 border-b border-primary/10 bg-[#090d18]/88 backdrop-blur-xl">
      <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
        {showBack ? (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-background/70 text-muted-foreground transition-all hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
            aria-label="Go back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        ) : (
          <div className="h-9 w-9" />
        )}

        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-lg font-black uppercase tracking-wide text-primary text-glow-gold">
            {title}
          </h1>

          {subtitle && (
            <p className="mt-0.5 truncate text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>

        {showBack ? (
          <Link
            to="/"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-background/70 text-muted-foreground transition-all hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
            aria-label="Go home"
          >
            <Home className="h-4 w-4" />
          </Link>
        ) : (
          <div className="h-9 w-9" />
        )}
      </div>
    </div>
  );
}