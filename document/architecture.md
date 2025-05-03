# Project Architecture & Documentation

## 1. Overview

This project is an AI Chatbot web application built with a modern frontend stack. It features a main chat interface and a separate homepage.

## 2. Core Technologies

*   **Framework/Library:** React (v18)
*   **Build Tool:** Vite
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS v3
*   **UI Components:** shadcn/ui
    *   Components are added via CLI (`npx shadcn@latest add <component>`) and reside in `src/components/ui`.
    *   Configuration is managed in `components.json`.
    *   Uses Radix UI primitives internally.
    *   Styled with Tailwind CSS.
    *   Class merging/conditional classes handled by `clsx` and `tailwind-merge` via the `cn` utility (`src/lib/utils.ts`).
*   **Routing:** React Router DOM (v6+)
*   **Animation:** Framer Motion (used in `SessionNavBar`)
*   **Icons:** Lucide React

## 3. Project Structure

```
.
├── document/             # Project documentation (like this file)
├── public/               # Static assets (e.g., vite.svg)
├── src/                  # Main application source code
│   ├── assets/           # Static assets used in components (e.g., react.svg)
│   ├── components/       # Reusable React components
│   │   ├── blocks/       # Large, composite UI blocks (e.g., hero-section.tsx)
│   │   ├── chat/         # Components specific to the chat feature
│   │   ├── layout/       # Layout structure components (e.g., MainLayout.tsx)
│   │   └── ui/           # shadcn/ui components & custom primitive UI elements
│   ├── hooks/            # Custom React hooks (e.g., useChat.ts)
│   ├── lib/              # Utility functions (e.g., utils.ts for cn)
│   ├── pages/            # Page-level components mapped to routes
│   ├── services/         # API interaction logic (e.g., chatService.ts)
│   ├── types/            # TypeScript type definitions (e.g., chat.ts)
│   ├── App.css           # Minimal global styles (mostly handled by index.css/Tailwind)
│   ├── App.tsx           # Root component defining routes
│   ├── index.css         # Tailwind directives, global styles, custom animations
│   ├── main.tsx          # Application entry point (renders App into DOM)
│   └── vite-env.d.ts     # Vite TypeScript environment types
├── .gitignore
├── components.json       # shadcn/ui configuration
├── index.html            # Main HTML entry point
├── package.json          # Project dependencies and scripts
├── postcss.config.js     # PostCSS configuration (for Tailwind)
├── tailwind.config.js    # Tailwind CSS configuration
└── tsconfig.json         # TypeScript configuration (and related files)
```

## 4. UI Component Integration

### shadcn/ui

*   Components are added using `npx shadcn@latest add <component-name>`.
*   The component code is copied directly into `src/components/ui/`. This allows for direct modification and customization.
*   Styling relies heavily on Tailwind utility classes defined within the component files.
*   The `cn` utility function (`src/lib/utils.ts`) is crucial for conditionally applying Tailwind classes.

### Custom Components

*   Follow standard React/TypeScript best practices.
*   Place components in the appropriate directory based on their scope (`ui`, `chat`, `layout`, `blocks`).
*   Use Tailwind CSS for styling and `cn` for managing classes.

### Recent Integrations (May 2025)

1.  **`AIInputWithSuggestions` (`src/components/ui/`)**:
    *   **Purpose:** Replaced the basic chat textarea with an enhanced input supporting suggestion buttons and auto-resizing.
    *   **Dependencies:** `Textarea` (shadcn), `useAutoResizeTextarea` (custom hook), `lucide-react`.
    *   **Integration:** Used within `src/components/chat/ChatInput.tsx`. Manages its own input value state. `onSubmit` prop connects to the sending logic in `ChatContainer`.
2.  **`SessionNavBar` (`src/components/ui/`)**:
    *   **Purpose:** Provides main application navigation, replacing the previous `ChatHistory` sidebar in the chat view. Features hover expansion and a persistent pin toggle.
    *   **Dependencies:** `framer-motion`, several shadcn/ui components (`DropdownMenu`, `Avatar`, `Button`, `ScrollArea`, `Separator`, `Badge`), `lucide-react`.
    *   **Integration:** Used within `src/components/layout/MainLayout.tsx`. The pinned open/closed state (`isPinnedOpen`) and the toggle function (`togglePinnedOpen`) are managed by `MainLayout` and passed as props.
    *   **Note:** Resolved a `React.Children.only` error related to Radix UI's `asChild` prop by removing `asChild` and restructuring the content within `DropdownMenuTrigger` using ternary operators.
3.  **`HeroSection` (`src/components/blocks/`)**:
    *   **Purpose:** Provides the content for the application's homepage.
    *   **Dependencies:** `InfiniteSlider` & `ProgressiveBlur` (custom basic implementations in `src/components/ui/`), `Button` (shadcn), `lucide-react`.
    *   **Integration:** Rendered directly by `src/pages/Home/HomePage.tsx`. The "Start Building" button links to `/chat`.
4.  **`InfiniteSlider` & `ProgressiveBlur` (`src/components/ui/`)**:
    *   **Purpose:** Basic implementations created to support `HeroSection`. `InfiniteSlider` uses CSS animation for a logo carousel effect. `ProgressiveBlur` uses CSS gradients for an edge fade effect.
    *   **Integration:** Used by `HeroSection`. `InfiniteSlider` requires keyframes added to `src/index.css`.

## 5. Routing (`src/App.tsx`)

*   Uses `react-router-dom` v6+.
*   `<BrowserRouter>` wraps the application.
*   `<Routes>` defines the route configurations.
*   A nested route structure with `<MainLayout />` is used to apply the sidebar (`SessionNavBar`) to specific routes (`/chat`).
    *   `MainLayout` renders the `SessionNavBar` and an `<Outlet />` where the matched child route component (e.g., `ChatPage`) is rendered.
*   The homepage route (`/`) is defined *outside* the `MainLayout` route, so it renders without the sidebar.

## 6. State Management

*   **UI State:** Primarily managed locally within components using `useState` (e.g., sidebar hover/pin state, mobile menu state).
*   **Chat State:** Managed via the custom hook `src/hooks/useChat.ts`. This hook encapsulates logic for fetching/managing chat sessions, messages, loading states, and interacting with the `chatService`.

## 7. Future Modifications Guide

*   **Adding/Modifying UI:**
    *   For common UI elements, check if a suitable shadcn/ui component exists and add it via `npx shadcn@latest add <component>`. Modify the generated file in `src/components/ui/` as needed.
    *   For custom components, create them in the relevant `src/components/` subdirectory.
    *   Use Tailwind CSS utility classes for styling.
*   **Changing Layout:**
    *   For global changes affecting pages with the sidebar, modify `src/components/layout/MainLayout.tsx` and potentially `src/components/ui/session-navbar.tsx`.
    *   For page-specific layout, modify the corresponding component in `src/pages/`.
*   **Updating Chat Logic:**
    *   Modify the `src/hooks/useChat.ts` hook for changes related to session management, message handling, or API calls.
    *   Update components in `src/components/chat/` if UI changes are needed.
*   **Adding Routes:**
    *   Define new `<Route>` elements in `src/App.tsx`.
    *   Decide whether the new route should be nested within the `<Route element={<MainLayout />}>` (to include the sidebar) or defined separately.
    *   Create the corresponding page component in `src/pages/`.