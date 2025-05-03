import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { SessionNavBar } from '@/components/ui/session-navbar';
import { cn } from '@/lib/utils';

// Define sidebar widths
const collapsedSidebarWidth = "3.05rem"; // Approx 49px
const expandedSidebarWidth = "15rem"; // Approx 240px

export const MainLayout = () => {
  const [isPinnedOpen, setIsPinnedOpen] = useState(false); // State for pinned open/closed

  const togglePinnedOpen = () => {
    setIsPinnedOpen(prev => !prev);
  };

  // Determine current sidebar width based on pinned state
  const currentSidebarWidth = isPinnedOpen ? expandedSidebarWidth : collapsedSidebarWidth;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <SessionNavBar
        isPinnedOpen={isPinnedOpen}
        togglePinnedOpen={togglePinnedOpen}
      />
      <main
        className={cn(
          // Removed overflow-hidden during previous debug step, keep it removed for now
          "flex-1 flex flex-col transition-[padding-left] duration-200 ease-out"
        )}
        // Apply dynamic padding-left based on the sidebar's current width state
        style={{ paddingLeft: currentSidebarWidth }}
      >
        {/* Ensure Outlet container takes full height */}
        <div className="flex-1 overflow-auto"> {/* Added overflow-auto back */}
           <Outlet /> {/* Page content will be rendered here */}
        </div>
      </main>
    </div>
  );
};