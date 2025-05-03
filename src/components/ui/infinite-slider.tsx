import React from 'react';
import { cn } from '@/lib/utils';

interface InfiniteSliderProps {
  children: React.ReactNode;
  speed?: number; // Speed in seconds for one full scroll cycle
  gap?: number; // Gap in pixels between items
  className?: string;
}

export const InfiniteSlider: React.FC<InfiniteSliderProps> = ({
  children,
  speed = 40, // Default speed
  gap = 28, // Default gap (corresponds to gap-7 in Tailwind)
  className,
}) => {
  const childrenArray = React.Children.toArray(children);

  // Inline style for animation duration
  const animationStyle = {
    '--scroll-duration': `${speed}s`,
    '--gap': `${gap}px`,
  } as React.CSSProperties;

  return (
    <div
      className={cn("w-full overflow-hidden", className)}
      style={animationStyle}
    >
      <div className="flex animate-infinite-scroll hover:[animation-play-state:paused]">
        {/* Render children twice for seamless loop */}
        {childrenArray.map((child, index) => (
          <div key={`item-${index}`} className="flex-shrink-0" style={{ marginRight: `var(--gap)` }}>
            {child}
          </div>
        ))}
        {childrenArray.map((child, index) => (
          <div key={`item-clone-${index}`} className="flex-shrink-0" style={{ marginRight: `var(--gap)` }}>
            {child}
          </div>
        ))}
      </div>
    </div>
  );
};

// Add the animation keyframes to your global CSS (e.g., src/index.css)
/*
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer utilities {
  @keyframes infinite-scroll {
    from { transform: translateX(0); }
    to { transform: translateX(-100%); }
  }
  .animate-infinite-scroll {
    animation: infinite-scroll var(--scroll-duration) linear infinite;
    width: max-content; // Ensure the container is wide enough
  }
}
*/