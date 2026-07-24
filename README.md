# Corden

Corden: Room and space management system. Solves physical clutter via simple, efficient digital tracking. Designed for speed and ease of use. Rapidly prototyped using AI-driven development to enable better organization habits.

## Architecture & Stack
- **Framework:** React 19 + TypeScript
- **Build Tool:** Vite 8
- **Styling:** TailwindCSS 4
- **Pattern:** MVC structure (`src/models`, `src/views`, `src/controllers`)

## Color Palette
Base furniture/UI colors used in the application:
- Primary/Default: `#4F759B`
- Bed: `#6475B8`
- Chair: `#6D8E72`
- Sofa: `#A56C57`
- Table: `#B89C64`
- Desk: `#64B8B4`
- Shelf: `#B86464`
- Lamp: `#B8B464`
- Wardrobe: `#7E64B8`
- Carpet: `#64B86D`
- Mirror: `#B864A4`

## Project Structure
- `src/views`: UI components (Dashboard, Login).
- `src/models`: Data & Context management (AuthContext).
- `src/controllers`: Business logic (authController).

## Current Status
- Environment bootstrapped.
- Dependencies installed (`--legacy-peer-deps` used to handle `vite@8` conflicts with `@vitejs/plugin-react`).
- Authentication flow initialized (`AuthContext`, `Login` view).
- Dashboard view established.
