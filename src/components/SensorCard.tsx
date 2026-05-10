import React from 'react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';

interface SensorCardProps {
  label: string;
  value: number | string;
  unit: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'stable';
  status?: 'nominal' | 'warning' | 'critical';
  className?: string;
}

export const SensorCard: React.FC<SensorCardProps> = ({
  label,
  value,
  unit,
  icon: Icon,
  trend,
  status = 'nominal',
  className
}) => {
  const statusColors = {
    nominal: 'text-bio-accent',
    warning: 'text-yellow-600',
    critical: 'text-bio-alert'
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "bg-bio-card bento-card shadow-sm hover:shadow-md group",
        className
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] uppercase tracking-widest text-bio-muted font-bold">
          {label}
        </span>
        <div className="w-8 h-8 rounded-full bg-bio-bg flex items-center justify-center text-bio-muted group-hover:text-bio-accent group-hover:bg-bio-card-alt transition-all">
          <Icon size={14} />
        </div>
      </div>
      
      <div className="flex items-baseline gap-1">
        <span className={cn("text-3xl font-semibold tracking-tighter", statusColors[status])}>
          {value}
        </span>
        <span className="text-xs text-bio-muted font-medium">{unit}</span>
      </div>

      {trend && (
        <div className="mt-3 flex items-center gap-1.5 grayscale opacity-70">
          <span className="text-[9px] uppercase font-bold text-bio-muted mono-data">
            {trend === 'stable' ? '● Steady' : trend === 'up' ? '▲ Rising' : '▼ Lowering'}
          </span>
        </div>
      )}
    </motion.div>
  );
};
