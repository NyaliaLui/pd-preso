import * as THREE from 'three';

export function getAnimation(model: THREE.Group<THREE.Object3DEventMap>) {
  if (model.animations.length !== 1)
    throw new Error(`Unexpected number of animations: ${model.name}`);
  return model.animations[0];
}

export function getAnimationByName(
  clips: THREE.AnimationClip[],
  name: string,
): THREE.AnimationClip {
  const clip = clips.find((c) => c.name === name);
  if (!clip)
    throw new Error(
      `Animation "${name}" not found. Available: ${clips.map((c) => c.name).join(', ')}`,
    );
  return clip;
}

// Log all children of a model with their positions
export function logModelChildren(
  object: THREE.Object3D,
  indent: number = 0,
): void {
  const prefix = '  '.repeat(indent);
  const pos = object.position;
  const worldPos = new THREE.Vector3();
  object.getWorldPosition(worldPos);

  console.log(
    `${prefix}${object.name || '(unnamed)'} [${object.type}]`,
    `local: (${pos.x.toFixed(3)}, ${pos.y.toFixed(3)}, ${pos.z.toFixed(3)})`,
    `world: (${worldPos.x.toFixed(3)}, ${worldPos.y.toFixed(3)}, ${worldPos.z.toFixed(3)})`,
  );
}

export function getBoneList(object: THREE.Object3D): THREE.Bone[] {
  const boneList: THREE.Bone[] = [];

  if (object instanceof THREE.Bone) {
    boneList.push(object);
  }

  for (let i = 0; i < object.children.length; i++) {
    boneList.push(...getBoneList(object.children[i]));
  }

  return boneList;
}

export interface BoneVertexMap {
  [boneName: string]: number; // Maps bone name to vertex index in the position buffer
}

/**
 * Creates a map from bone names to their vertex indices in the SkeletonHelper geometry.
 * The SkeletonHelper creates 2 vertices per bone (parent position and bone position).
 * Each bone with a Bone parent adds 2 vertices, so bone at index i has vertices at i*2 and i*2+1.
 */
export function makeBoneVertexMap(bones: THREE.Bone[]): BoneVertexMap {
  const map: BoneVertexMap = {};
  let vertexIndex = 0;

  for (let i = 0; i < bones.length; i++) {
    const bone = bones[i];

    // SkeletonHelper only creates vertices for bones with a Bone parent
    if (bone.parent && bone.parent instanceof THREE.Bone) {
      // vertexIndex points to parent position, vertexIndex+1 points to bone position
      map[bone.name] = vertexIndex + 1; // +1 to get the bone's own position (not parent)
      vertexIndex += 2; // Each bone adds 2 vertices
    }
  }

  return map;
}

/**
 * Generates vertices for a fan (circular sector) shape in the XZ plane.
 * The fan is centered at the origin with the arc facing +Z.
 */
export function makeFanVertices(
  innerRadius: number,
  outerRadius: number,
  halfAngle: number,
  halfThickness: number,
  segments: number,
): Float32Array {
  const pts: number[] = [];

  // Generate points on both the top and bottom faces for thickness
  for (const y of [-halfThickness, halfThickness]) {
    // Origin point
    pts.push(0, y, 0);

    // Inner arc
    for (let i = 0; i <= segments; i++) {
      const theta = -halfAngle + (2 * halfAngle * i) / segments;
      pts.push(innerRadius * Math.sin(theta), y, innerRadius * Math.cos(theta));
    }

    // Outer arc
    for (let i = 0; i <= segments; i++) {
      const theta = -halfAngle + (2 * halfAngle * i) / segments;
      pts.push(outerRadius * Math.sin(theta), y, outerRadius * Math.cos(theta));
    }
  }

  return new Float32Array(pts);
}

/**
 * Gets the world position of a bone from the SkeletonHelper's geometry buffer.
 * Call helper.update() before this to ensure positions are current.
 */
export function getBoneWorldPosition(
  boneName: string,
  boneVertexMap: BoneVertexMap,
  positions: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
): THREE.Vector3 | null {
  const vertexIndex = boneVertexMap[boneName];
  if (vertexIndex === undefined) {
    return null;
  }

  return new THREE.Vector3(
    positions.getX(vertexIndex),
    positions.getY(vertexIndex),
    positions.getZ(vertexIndex),
  );
}
