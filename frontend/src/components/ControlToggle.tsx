import React from 'react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface ControlToggleProps {
  label: string;
  isOn: boolean;
  onToggle: () => void;
  mode: 'auto' | 'manual';
  onModeToggle: () => void;
  className?: string;
}

export const ControlToggle: React.FC<ControlToggleProps> = ({
  label,
  isOn,
  onToggle,
  mode,
  onModeToggle,
  className
}) => {
  return (
    <div className={cn("bg-bio-bg p-4 rounded-3xl border border-bio-border flex flex-col gap-4", className)}>
      <div className="flex justify-between items-center gap-2">
        <span className="text-xs font-bold text-bio-text uppercase tracking-tight truncate">{label}</span>
        <button 
          onClick={onModeToggle}
          className={cn(
            "text-[8px] px-2 py-0.5 rounded-full border uppercase font-bold tracking-widest transition-all",
            mode === 'auto' 
              ? "bg-bio-accent text-white border-bio-accent" 
              : "bg-white text-bio-muted border-bio-border"
          )}
        >
          {mode}
        </button>
      </div>

      <div className="flex justify-between items-center">
        <span className={cn(
          "text-[10px] font-bold uppercase tracking-widest",
          isOn ? "text-bio-accent" : "text-bio-muted/50"
        )}>
          {isOn ? "ACTIVE" : "STANDBY"}
        </span>

        <button
          onClick={onToggle}
          disabled={mode === 'auto'}
          className={cn(
            "w-10 h-5 rounded-full relative transition-colors duration-300 focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed",
            isOn ? "bg-bio-accent" : "bg-bio-border"
          )}
        >
          <motion.div
            animate={{ x: isOn ? 22 : 2 }}
            className="w-4 h-4 bg-white rounded-full absolute top-0.5 shadow-sm"
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        </button>
      </div>
    </div>
  );
};
