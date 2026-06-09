# pd-preso

Browser-based 3D game for PD (Professional Development) presentations.

## Tech Stack

- **Vite** — build tool and dev server (`npm run dev` → `http://localhost:5173`)
- **React 19** + **TypeScript**
- **React Three Fiber** — React renderer for Three.js
- **@react-three/rapier** — Rapier physics engine
- **@react-three/drei** — helpers (`useFBX`, `useTexture`, etc.)
- **Tailwind CSS v4** + **Flowbite React** — UI components
- **Netlify** — deployment target (`netlify.toml` at root)

## Key Architecture

### Player (`app/components/Player/Player.tsx`)

Lady Knight model (MeshyAI). Four **separate** FBX files — one per animation — loaded via `useFBX`. The mesh comes from the Idle FBX; clips are extracted by index (`fbx.animations[0]`).

| State | Animation        | Trigger                                           |
| ----- | ---------------- | ------------------------------------------------- |
| Idle  | `Idle_60FPS.fbx` | default when still                                |
| Sway  | `Sway_60FPS.fbx` | still for 3 s (`PLAYER_DEFAULTS.IDLE_SWAY_DELAY`) |
| Walk  | `Walk_60FPS.fbx` | WASD held                                         |
| Jump  | `Jump_60FPS.fbx` | Space (LoopOnce; `mixer.finished` resets state)   |

PBR textures applied via `useTexture` + `THREE.MeshStandardMaterial`. No attack logic.

### World (`app/components/World/World.tsx`)

30 grass blocks, invisible floor. Camera follows player X.

## Asset Locations

```
public/
  models/
    Player/
      LadyKnight/
        Idle_60FPS.fbx
        Walk_60FPS.fbx
        Sway_60FPS.fbx
        Jump_60FPS.fbx
        textures/  (color, metallic, normal, roughness PNGs)
  audio/
    paladin-attack.wav     ← unused
  textures/
    grass.jpg
    sky.jpg
```

## Constants (`app/constants.ts`)

- `PLAYER_DEFAULTS` — Lady Knight FBX/texture paths, `IDLE_SWAY_DELAY: 3`
- `SHARED_DEFAULTS` — move speed, jump velocity, collider sizes
- `GAME_DEFAULTS` — `PLAYER_MAX_HP`
- `CONTROLS_DEFAULTS` — keyboard key state, analog stick config

## Scripts

```bash
npm run dev      # Vite dev server
npm run build    # Production build → dist/
npm run preview  # Serve the dist/ build locally
```

## Deployment

Netlify reads `netlify.toml`:

- Build command: `npm run build`
- Publish dir: `dist/`
- COEP/COOP headers set (required by Rapier's SharedArrayBuffer usage)
