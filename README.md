# Corden

Corden: Room and space management system. Solves physical clutter via simple, efficient digital tracking. Designed for speed and ease of use. Rapidly prototyped using AI-driven development to enable better organization habits.

## Architecture & Stack
- **Framework:** React 19 + TypeScript
- **Build Tool:** Vite 8
- **Styling:** TailwindCSS 4
- **Pattern:** MVC structure (`src/models`, `src/views`, `src/controllers`)

## Project Structure
- `src/views`: UI components (Dashboard, Login).
- `src/models`: Data & Context management (AuthContext).
- `src/controllers`: Business logic (authController).

## Current Status
- Environment bootstrapped.
- Dependencies installed (`--legacy-peer-deps` used to handle `vite@8` conflicts with `@vitejs/plugin-react`).
- Authentication flow initialized (`AuthContext`, `Login` view).
- Dashboard view established.
