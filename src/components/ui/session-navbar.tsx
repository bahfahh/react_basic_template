"use client";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  Blocks,
  ChevronsUpDown,
  FileClock,
  GraduationCap,
  Layout,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  MessagesSquare,
  PanelLeftClose, // Icon for toggle button
  PanelLeftOpen,  // Icon for toggle button
  Plus,
  Settings,
  UserCircle,
  UserCog,
  UserSearch,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react"; // Added useEffect
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

// --- Prop Interface ---
interface SessionNavBarProps {
  isPinnedOpen: boolean;
  togglePinnedOpen: () => void;
}

// --- Animation Variants ---
const sidebarVariants = {
  open: { width: "15rem" },
  closed: { width: "3.05rem" },
};

// Text/Content variants (simplified for clarity)
const textVariants = {
  open: { opacity: 1, x: 0, transition: { duration: 0.2, delay: 0.1 } },
  closed: { opacity: 0, x: -10, transition: { duration: 0.1 } },
};

const transitionProps = {
  type: "tween",
  ease: "easeOut",
  duration: 0.2,
};

// Stagger variants for list items
const listStaggerVariants = {
  open: { transition: { staggerChildren: 0.03, delayChildren: 0.1 } },
  closed: { transition: { staggerChildren: 0.02, staggerDirection: -1 } },
};


export function SessionNavBar({ isPinnedOpen, togglePinnedOpen }: SessionNavBarProps) {
  // Local state for hover-based expansion, only active when not pinned open
  const [isHoverExpanded, setIsHoverExpanded] = useState(false);
  const { pathname } = useLocation();

  // Determine the actual current state (pinned or hover-expanded)
  const isEffectivelyOpen = isPinnedOpen || isHoverExpanded;

  // Handle mouse enter/leave only if not pinned open
  const handleMouseEnter = () => {
    if (!isPinnedOpen) {
      setIsHoverExpanded(true);
    }
  };

  const handleMouseLeave = () => {
    // No need to check isPinnedOpen here, hover state should always collapse on leave
    setIsHoverExpanded(false);
  };

  // Reset hover state if pinned state changes
  useEffect(() => {
    setIsHoverExpanded(false);
  }, [isPinnedOpen]);

  const handleSignOut = () => {
    console.log("Signing out...");
    // Add your sign-out logic here
  };

  return (
    <motion.div
      className={cn(
        "sidebar fixed left-0 top-0 z-40 h-full shrink-0 border-r bg-white dark:bg-black",
      )}
      // Animate based on the effective state (pinned or hover)
      animate={isEffectivelyOpen ? "open" : "closed"}
      variants={sidebarVariants}
      transition={transitionProps}
      // Apply hover handlers
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      // Set initial state based on isPinnedOpen prop
      initial={isPinnedOpen ? "open" : "closed"}
    >
      {/* Use motion.div for the main content container to apply stagger */}
      <motion.div
        className="relative z-40 flex h-full flex-col text-muted-foreground"
        // Apply stagger variants here
        variants={listStaggerVariants}
        initial={false} // Prevent initial stagger on load if not desired
        animate={isEffectivelyOpen ? "open" : "closed"}
      >
        {/* Top Section: Org Dropdown & Toggle Button */}
        <div className="flex h-[54px] w-full shrink-0 items-center justify-between border-b p-2">
          {/* Org Dropdown (only shows text when effectively open) */}
          <DropdownMenu modal={false}>
            {/* Remove asChild, let Trigger render button, apply styles directly */}
            <DropdownMenuTrigger
              disabled={!isEffectivelyOpen}
              className={cn(
                "flex items-center justify-start gap-2 px-2 transition-all rounded-md text-sm font-medium h-8", // Base styles like Button
                "hover:bg-muted hover:text-primary", // Hover styles like Button variant="ghost"
                isEffectivelyOpen ? "w-auto" : "w-full justify-center", // Dynamic width/justify
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", // Focus styles
                "disabled:pointer-events-none disabled:opacity-50" // Disabled styles
              )}
              aria-label="Organization Menu"
            >
              {/* Use ternary operator to render different content based on state */}
              {isEffectivelyOpen ? (
                <> {/* Use fragment here as direct child of trigger */}
                  <Avatar className='rounded size-4 shrink-0'>
                    <AvatarFallback>O</AvatarFallback>
                  </Avatar>
                  <span className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
                     <span className="text-sm font-medium">
                       {"Organization"}
                     </span>
                     <ChevronsUpDown className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                  </span>
                </>
              ) : (
                 <Avatar className='rounded size-4 shrink-0'> {/* Only Avatar when collapsed */}
                    <AvatarFallback>O</AvatarFallback>
                 </Avatar>
              )}
            </DropdownMenuTrigger>
            {/* Dropdown Content remains the same */}
             <DropdownMenuContent align="start" sideOffset={5}>
                  <DropdownMenuItem className="p-0"> {/* Remove padding from item */}
                    {/* Apply item styles directly to Link, remove asChild */}
                    <Link
                      to="/settings/members"
                      className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full gap-2"
                    >
                      <UserCog className="h-4 w-4" /> Manage members
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="p-0"> {/* Remove padding from item */}
                     {/* Apply item styles directly to Link, remove asChild */}
                    <Link
                      to="/settings/integrations"
                      className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full gap-2"
                    >
                      <Blocks className="h-4 w-4" /> Integrations
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="p-0"> {/* Remove padding from item */}
                     {/* Apply item styles directly to Link, remove asChild */}
                    <Link
                      to="/select-org"
                      className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full gap-2"
                    >
                      <Plus className="h-4 w-4" /> Create or join
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
          </DropdownMenu>

          {/* Toggle Button (only visible when effectively open) */}
           <motion.div variants={textVariants}>
             {isEffectivelyOpen && (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={togglePinnedOpen}
                    className="h-8 w-8 shrink-0"
                    aria-label={isPinnedOpen ? "Collapse Sidebar" : "Expand Sidebar"}
                >
                    {isPinnedOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
                </Button>
             )}
           </motion.div>
        </div>

        {/* Middle Section: Navigation Links */}
        <ScrollArea className="flex-grow p-2">
          {/* Apply stagger variants to the direct parent of motion.li items if needed, or handle individually */}
          <div className="flex w-full flex-col gap-1">
            {/* Dashboard Link */}
            <Link
              to="/dashboard"
              className={cn(
                "flex h-8 items-center rounded-md px-2 py-1.5 transition hover:bg-muted hover:text-primary",
                pathname?.includes("/dashboard") && "bg-muted text-blue-600 dark:text-blue-400",
              )}
            >
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              <motion.span variants={textVariants} className="ml-2 overflow-hidden whitespace-nowrap text-sm font-medium">
                {isEffectivelyOpen && "Dashboard"}
              </motion.span>
            </Link>

            {/* Reports Link */}
             <Link
              to="/reports"
              className={cn(
                "flex h-8 items-center rounded-md px-2 py-1.5 transition hover:bg-muted hover:text-primary",
                pathname?.includes("/reports") && "bg-muted text-blue-600 dark:text-blue-400",
              )}
            >
              <FileClock className="h-4 w-4 shrink-0" />
              <motion.span variants={textVariants} className="ml-2 overflow-hidden whitespace-nowrap text-sm font-medium">
                {isEffectivelyOpen && "Reports"}
              </motion.span>
            </Link>

            {/* Chat Link */}
            <Link
              to="/chat"
              className={cn(
                "flex h-8 items-center rounded-md px-2 py-1.5 transition hover:bg-muted hover:text-primary",
                pathname?.includes("/chat") && "bg-muted text-blue-600 dark:text-blue-400",
              )}
            >
              <MessagesSquare className="h-4 w-4 shrink-0" />
              <motion.span variants={textVariants} className="ml-2 flex items-center gap-2 overflow-hidden whitespace-nowrap text-sm font-medium">
                {isEffectivelyOpen && (
                  <>
                    Chat
                    <Badge
                      className="flex h-fit w-fit items-center gap-1.5 rounded border-none bg-blue-50 px-1.5 text-blue-600 dark:bg-blue-900 dark:text-blue-300"
                      variant="outline"
                    >
                      BETA
                    </Badge>
                  </>
                )}
              </motion.span>
            </Link>

            <Separator className="my-1 w-full" />

            {/* Deals Link */}
            <Link
              to="/deals"
              className={cn(
                "flex h-8 items-center rounded-md px-2 py-1.5 transition hover:bg-muted hover:text-primary",
                pathname?.includes("/deals") && "bg-muted text-blue-600 dark:text-blue-400",
              )}
            >
              <Layout className="h-4 w-4 shrink-0" />
              <motion.span variants={textVariants} className="ml-2 overflow-hidden whitespace-nowrap text-sm font-medium">
                {isEffectivelyOpen && "Deals"}
              </motion.span>
            </Link>

             {/* Accounts Link */}
            <Link
              to="/accounts"
              className={cn(
                "flex h-8 items-center rounded-md px-2 py-1.5 transition hover:bg-muted hover:text-primary",
                pathname?.includes("/accounts") && "bg-muted text-blue-600 dark:text-blue-400",
              )}
            >
              <UserCircle className="h-4 w-4 shrink-0" />
              <motion.span variants={textVariants} className="ml-2 overflow-hidden whitespace-nowrap text-sm font-medium">
                {isEffectivelyOpen && "Accounts"}
              </motion.span>
            </Link>

            {/* Competitors Link */}
            <Link
              to="/competitors"
              className={cn(
                "flex h-8 items-center rounded-md px-2 py-1.5 transition hover:bg-muted hover:text-primary",
                pathname?.includes("/competitors") && "bg-muted text-blue-600 dark:text-blue-400",
              )}
            >
              <UserSearch className="h-4 w-4 shrink-0" />
              <motion.span variants={textVariants} className="ml-2 overflow-hidden whitespace-nowrap text-sm font-medium">
                {isEffectivelyOpen && "Competitors"}
              </motion.span>
            </Link>

            <Separator className="my-1 w-full" />

            {/* Knowledge Base Link */}
            <Link
              to="/library/knowledge"
              className={cn(
                "flex h-8 items-center rounded-md px-2 py-1.5 transition hover:bg-muted hover:text-primary",
                pathname?.includes("/library") && "bg-muted text-blue-600 dark:text-blue-400",
              )}
            >
              <GraduationCap className="h-4 w-4 shrink-0" />
              <motion.span variants={textVariants} className="ml-2 overflow-hidden whitespace-nowrap text-sm font-medium">
                {isEffectivelyOpen && "Knowledge Base"}
              </motion.span>
            </Link>

            {/* Feedback Link */}
            <Link
              to="/feedback"
              className={cn(
                "flex h-8 items-center rounded-md px-2 py-1.5 transition hover:bg-muted hover:text-primary",
                pathname?.includes("/feedback") && "bg-muted text-blue-600 dark:text-blue-400",
              )}
            >
              <MessageSquareText className="h-4 w-4 shrink-0" />
              <motion.span variants={textVariants} className="ml-2 overflow-hidden whitespace-nowrap text-sm font-medium">
                {isEffectivelyOpen && "Feedback"}
              </motion.span>
            </Link>

            {/* Document Review Link */}
            <Link
              to="/review"
              className={cn(
                "flex h-8 items-center rounded-md px-2 py-1.5 transition hover:bg-muted hover:text-primary",
                pathname?.includes("/review") && "bg-muted text-blue-600 dark:text-blue-400",
              )}
            >
              <FileClock className="h-4 w-4 shrink-0" />
              <motion.span variants={textVariants} className="ml-2 overflow-hidden whitespace-nowrap text-sm font-medium">
                {isEffectivelyOpen && "Document Review"}
              </motion.span>
            </Link>
          </div>
        </ScrollArea>

        {/* Bottom Section: Settings & Account */}
        <div className="flex flex-col p-2 border-t">
          {/* Settings Link */}
          <Link
            to="/settings/profile"
            className="flex h-8 items-center rounded-md px-2 py-1.5 transition hover:bg-muted hover:text-primary"
          >
            <Settings className="h-4 w-4 shrink-0" />
            <motion.span variants={textVariants} className="ml-2 overflow-hidden whitespace-nowrap text-sm font-medium">
              {isEffectivelyOpen && "Settings"}
            </motion.span>
          </Link>

          {/* Account Dropdown */}
          <DropdownMenu modal={false}>
            {/* Remove asChild, let Trigger render button, apply styles directly */}
            <DropdownMenuTrigger
              disabled={!isEffectivelyOpen}
              className={cn(
                "flex w-full h-8 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition hover:bg-muted hover:text-primary", // Styles from the old div
                 "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", // Focus styles
                 "disabled:pointer-events-none disabled:opacity-50" // Disabled styles
              )}
            >
               {/* Use ternary operator to render different content based on state */}
               {isEffectivelyOpen ? (
                 <> {/* Use fragment here as direct child of trigger */}
                    <Avatar className="size-4 shrink-0">
                      <AvatarFallback>A</AvatarFallback>
                    </Avatar>
                    <span className="flex w-full items-center gap-2 overflow-hidden whitespace-nowrap">
                       <span className="text-sm font-medium">Account</span>
                       <ChevronsUpDown className="ml-auto h-4 w-4 text-muted-foreground/50 shrink-0" />
                    </span>
                 </>
               ) : (
                  <Avatar className="size-4 shrink-0"> {/* Only Avatar when collapsed */}
                     <AvatarFallback>A</AvatarFallback>
                  </Avatar>
               )}
            </DropdownMenuTrigger>
            {/* Dropdown Content remains the same */}
            <DropdownMenuContent sideOffset={5} align="start">
              <div className="flex flex-row items-center gap-2 p-2">
                <Avatar className="size-6">
                  <AvatarFallback>AL</AvatarFallback>
                </Avatar>
                <div className="flex flex-col text-left">
                  <span className="text-sm font-medium">{`Andrew Luo`}</span>
                  <span className="line-clamp-1 text-xs text-muted-foreground">{`andrew@usehindsight.com`}</span>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="p-0"> {/* Remove padding from item */}
                 {/* Apply item styles directly to Link, remove asChild */}
                <Link
                  to="/settings/profile"
                  className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full gap-2"
                >
                  <UserCircle className="h-4 w-4" /> Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex cursor-pointer items-center gap-2" onSelect={handleSignOut}>
                <LogOut className="h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>
    </motion.div>
  );
}