import { Vector3 } from 'three';

export const SHARED_DEFAULTS = {
  ANIMATIONS: {
    IDLE: '/models/IdleWithoutSkin.fbx',
    WALK: '/models/WalkingWithoutSkin.fbx',
  },
  MOVE_SPEED: 3,
  SCALE: 0.01,
  JUMP: {
    VELOCITY: 7,
    GRAVITY: 13,
  },
  COLLIDERS: {
    BODY: { halfHeight: 0.5, radius: 0.5, position: [0, 0, 0] as const },
    GROUND_SPHERE: { radius: 0.01, position: [0, -0.89, 0] as const },
    TORSO: {
      halfHeight: 0.19,
      radius: 0.1,
      position: [0, 0.24, 0] as const,
      offset: { y: -0.85, z: -0.02 },
    },
    HEAD: {
      halfHeight: 0.05,
      radius: 0.1,
      position: [0, 0.7, 0] as const,
      offset: { y: -0.84, z: 0.02 },
    },
  },
};

export const PLAYER_DEFAULTS = {
  MODELS: {
    IDLE: '/models/Player/SolarSentinel/Idle_60FPS.fbx',
    WALK: '/models/Player/SolarSentinel/Walking_60FPS.fbx',
    SWAY: '/models/Player/SolarSentinel/Sway_60FPS.fbx',
    JUMP: '/models/Player/SolarSentinel/Jump_60FPS.fbx',
  },
  TEXTURES: {
    COLOR: '/models/Player/SolarSentinel/textures/color.png',
    METALLIC: '/models/Player/SolarSentinel/textures/metallic.png',
    NORMAL: '/models/Player/SolarSentinel/textures/normal.png',
    ROUGHNESS: '/models/Player/SolarSentinel/textures/roughness.png',
  },
  IDLE_SWAY_DELAY: 3,
};

export const CONTROLS_DEFAULTS = {
  // It takes approx 32 frames to execute attack animation
  MECHANICS_TIMEOUT: 320,
  KEYBOARD: {
    w: false,
    a: false,
    s: false,
    d: false,
    q: false,
    e: false,
    p: false,
    space: false,
    ctrl: false,
  },
  ANALOG_STICK: {
    INIT_POS: { x: 0, y: 0 },
    STICK_RADIUS: 40,
    KNOB_RADIUS: 12,
    DEAD_ZONE: 0.1,
  },
};

export const BARBARIAN_DEFAULTS = {
  MODEL: '/models/Barbarian/XBot.fbx',
};

export const GAME_DEFAULTS = {
  INITIAL_BARBARIAN_COUNT: 1,
  PLAYER_MAX_HP: 100,
};

export const DEFAULT_COLORS = {
  HP_RED: '#f05252',
};

export const ENVIRONMENT_DEFAULTS = {
  enableShadows: true,
  ambientLight: {
    intensity: 0.5,
  },
  directionalLight: {
    position: new Vector3(5, 5, 5),
    intensity: 1,
  },
  camera: {
    position: new Vector3(0, 1.5, 10),
    fov: 60,
  },
  orbitControls: {
    enablePan: true,
    enableZoom: true,
    enableRotate: true,
  },
  groundBlock: {
    width: 5.4,
    height: 5.4,
    depth: 5.4,
    screenFillCount: 5,
    extraCount: 25,
  },
  platform: {
    width: 5.4,
    height: 0.4,
    depth: 5.4,
    y: 0.785,
    color: '#8B4513',
    spawnInterval: 5,
  },
  groundDim: 100,
  groundRotation: -Math.PI / 2,
  texture: {
    ground: '/textures/grass.jpg',
    sky: '/textures/sky.jpg',
  },
};

export const LEVA_THEMES = {
  mobile: {
    sizes: {
      rootWidth: '210px',
      controlWidth: '48px',
      titleBarHeight: '24px',
      rowHeight: '24px',
    },
    fontSizes: {
      root: '9px',
    },
  },
  tablet: {
    sizes: {
      rootWidth: '300px',
      controlWidth: '72px',
      titleBarHeight: '36px',
      rowHeight: '30px',
    },
    fontSizes: {
      root: '12px',
    },
  },
  desktop: {
    sizes: {
      rootWidth: '360px',
      controlWidth: '160px',
      titleBarHeight: '40px',
      rowHeight: '32px',
    },
    fontSizes: {
      root: '12px',
    },
  },
};
