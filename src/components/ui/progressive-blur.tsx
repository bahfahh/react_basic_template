import React from 'react';
import { cn } from '@/lib/utils';

interface ProgressiveBlurProps {
  direction?: 'left' | 'right' | 'top' | 'bottom';
  blurIntensity?: number; // Not directly used in this simple implementation
  className?: string;
}

export const ProgressiveBlur: React.FC<ProgressiveBlurProps> = ({
  direction = 'left',
  className,
}) => {
  const gradientDirection = {
    left: 'bg-gradient-to-r',
    right: 'bg-gradient-to-l',
    top: 'bg-gradient-to-b',
    bottom: 'bg-gradient-to-t',
  }[direction];

  return (
    <div
      className={cn(
        'absolute inset-0 pointer-events-none', // Positioned absolutely, covers parent
        gradientDirection,
        'from-background to-transparent', // Gradient from background color to transparent
        className
      )}
      aria-hidden="true" // Hide from screen readers
    />
  );
};