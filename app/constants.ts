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
  MODEL: '/models/Player/Paladin.fbx',
  ANIMATIONS: {
    IDLE: 'Armature|Idle',
    WALK: 'Armature|Walk',
    NORMAL: 'Armature|Normal_Attack',
    CROUCH: 'Armature|Crouch',
    JUMP: 'Armature|Jump',
    CROUCH_ATTACK: 'Armature|Crouch_Normal_Attack',
    SPECIAL: 'Armature|Special_Attack',
  },
  RAYCAST: {
    SWORD_LENGTH: 2.0,
    SWORD_SIDE_OFFSET: 0.4,
    SPECIAL_DELAY: 0.3,
    COLOR: 0x00ff00,
  },
  ATTACK_SOUND: '/audio/paladin-attack.wav',
  ATTACK_SOUND_DURATION_MS: 700,
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
  ANIMATIONS: {
    NORMAL: '/models/Barbarian/PunchingWithoutSkin2.fbx',
    JUMP: '/models/Barbarian/JumpingWithoutSkin.fbx',
    LEFT_BLOCK: '/models/Barbarian/LeftBlockWithoutSkin.fbx',
    RIGHT_BLOCK: '/models/Barbarian/RightBlockWithoutSkin.fbx',
    KICK: '/models/Barbarian/KickingWithoutSkin.fbx',
    DUCK: '/models/Barbarian/DuckingWithoutSkin.fbx',
  },
  JUMP: {
    VELOCITY: 5,
    GRAVITY: 12,
  },
  COLLIDERS: {
    HAND: {
      halfHeight: 0.01,
      radius: 0.16,
      position: [0, 0.4, 0.75] as const,
      offset: { y: -0.89, z: 0 },
    },
  },
  UTILITY_AI: {
    /** Euclidean distance (m) within which the barbarian auto-attacks. */
    ATTACK_RANGE: 1.2,
    /**
     * Min ms to hold ATTACK before re-evaluating distance.
     * Must be >= attackSpeed (320 ms) so one full punch completes.
     * Also used as the strategic-action defer window.
     */
    MIN_ATTACK_DURATION_MS: 400,
    /** Server actions the utility AI must not cancel mid-animation. */
    STRATEGIC_ACTIONS: ['JUMP'] as const,
  },
  enableBarbarianWalk: false,
  barbarianWalkDurationMS: 500,
  enableBarbarianAttack: false,
  attackSpeed: CONTROLS_DEFAULTS.MECHANICS_TIMEOUT,
  enableBarbarianJump: false,
  jumpDurationMS: 1000,
  enableBarbarianLeftBlock: false,
  blockDurationMS: CONTROLS_DEFAULTS.MECHANICS_TIMEOUT,
  enableBarbarianRightBlock: false,
  rightBlockDurationMS: CONTROLS_DEFAULTS.MECHANICS_TIMEOUT,
  enableBarbarianKick: false,
  kickSpeed: CONTROLS_DEFAULTS.MECHANICS_TIMEOUT,
  enableBarbarianDuck: false,
  duckDurationMS: CONTROLS_DEFAULTS.MECHANICS_TIMEOUT,
};

export const GAME_DEFAULTS = {
  INITIAL_BARBARIAN_COUNT: 1,
  INITIAL_BARBARIAN_HP: 1,
  PLAYER_MAX_HP: 100,
  BOULDER_HP: 3,
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
