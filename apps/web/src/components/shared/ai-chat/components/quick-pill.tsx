"use client"

import React from 'react';
import { cn } from "@/lib/utils";

interface QuickPillProps {
  icon: React.ElementType;
  label: string;
  color: 'primary' | 'pink' | 'blue' | 'emerald' | 'violet';
  onClick: () => void;
  index?: number;
}

const colorClasses = {
  primary: 'hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-primary/25',
  pink: 'hover:bg-pink-500 hover:text-white hover:border-pink-500 hover:shadow-pink-500/25',
  blue: 'hover:bg-blue-500 hover:text-white hover:border-blue-500 hover:shadow-blue-500/25',
  emerald: 'hover:bg-emerald-500 hover:text-white hover:border-emerald-500 hover:shadow-emerald-500/25',
  violet: 'hover:bg-violet-500 hover:text-white hover:border-violet-500 hover:shadow-violet-500/25',
};

export function QuickPill({ icon: Icon, label, color, onClick, index = 0 }: QuickPillProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-full border bg-card text-sm shrink-0",
        "transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95",
        "animate-in fade-in-0 slide-in-from-bottom-2",
        colorClasses[color]
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="font-medium">{label}</span>
    </button>
  );
}
