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

Solar Sentinel model (MeshyAI). Four **separate** FBX files — one per animation — loaded via `useFBX`. The mesh comes from the Idle FBX; clips are extracted by index (`fbx.animations[0]`).

| State | Animation           | Trigger                                           |
| ----- | ------------------- | ------------------------------------------------- |
| Idle  | `Idle_60FPS.fbx`    | default when still                                |
| Sway  | `Sway_60FPS.fbx`    | still for 3 s (`PLAYER_DEFAULTS.IDLE_SWAY_DELAY`) |
| Walk  | `Walking_60FPS.fbx` | WASD held                                         |
| Jump  | `Jump_60FPS.fbx`    | Space (LoopOnce; `mixer.finished` resets state)   |

PBR textures applied via `useTexture` + `THREE.MeshStandardMaterial`. No attack logic.

### Barbarians (`app/components/Barbarian/Barbarian.tsx`)

XBot model. Walk animation always active. Logic:

1. On first frame, walk **toward** the player.
2. When the barbarian's X crosses the player's X, start a 300 ms timer.
3. After 300 ms, reverse direction (`directionRef.current *= -1`).
4. Repeat indefinitely.

No AI server required — behavior is fully local.

### World (`app/components/World/World.tsx`)

30 grass blocks, boulders, invisible floor. Camera follows player X.

## Asset Locations

```
public/
  models/
    Player/
      SolarSentinel/
        Idle_60FPS.fbx
        Walking_60FPS.fbx
        Sway_60FPS.fbx
        Jump_60FPS.fbx
        textures/  (color, metallic, normal, roughness PNGs)
    Barbarian/
      XBot.fbx
  models/
    IdleWithoutSkin.fbx    ← shared barbarian idle (unused currently)
    WalkingWithoutSkin.fbx ← barbarian walk animation
  audio/
    paladin-attack.wav     ← unused (attacks removed)
  textures/
    grass.jpg
    sky.jpg
```

## Constants (`app/constants.ts`)

- `PLAYER_DEFAULTS` — Solar Sentinel FBX/texture paths, `IDLE_SWAY_DELAY: 3`
- `BARBARIAN_DEFAULTS` — just `MODEL` path
- `SHARED_DEFAULTS` — move speed, jump velocity, collider sizes, shared animation paths

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

Set `VITE_WS_URL` in the Netlify dashboard if an AI server is ever reconnected.

## Dead Code

`app/ai/` (BarbarianAIClient, ActionApplier, sharedTypes) — the AI decision server (`dg-decision-server`) is no longer used. These files are kept for reference but not imported anywhere except `sharedTypes` (used for `ClientPlayerState` type in `Player.tsx` and `page.tsx`).
