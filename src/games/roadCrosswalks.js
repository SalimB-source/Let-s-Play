import * as THREE from 'three';

// Full-width zebra: long bands run along traffic, spaced across the road.
export const CROSSWALK_STRIPE_WIDTH = .6;
export const CROSSWALK_STRIPE_LENGTH = 4;
export const CROSSWALK_STRIPE_OFFSETS = Object.freeze(Array.from({ length: 11 }, (_, i) => (i - 5) * 1.2));

export function crosswalkStripes(x, z, axis) {
  return CROSSWALK_STRIPE_OFFSETS.map((offset) => ({
    x: x + (axis === 'z' ? offset : 0),
    z: z + (axis === 'x' ? offset : 0), axis,
  }));
}

export function createCrosswalkMaterial() {
  let map = null;
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128;
    const context = canvas.getContext('2d');
    if (context) {
      const pixels = context.createImageData(128, 128);
      let seed = 713;
      for (let i = 0; i < pixels.data.length; i += 4) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        const shade = 239 + (seed % 17);
        pixels.data[i] = shade; pixels.data[i + 1] = shade; pixels.data[i + 2] = shade - 3; pixels.data[i + 3] = 255;
      }
      context.putImageData(pixels, 0, 0);
      map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
      map.anisotropy = 4;
    }
  }
  return new THREE.MeshStandardMaterial({
    color: 0xffffff, map, roughness: .88, metalness: 0,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    depthTest: true, depthWrite: true,
  });
}

export function crosswalkGeometry(stripes, elevation) {
  const positions = [], uvs = [], indices = [];
  for (const { x, z, axis } of stripes) {
    const halfX = (axis === 'z' ? CROSSWALK_STRIPE_WIDTH : CROSSWALK_STRIPE_LENGTH) / 2;
    const halfZ = (axis === 'z' ? CROSSWALK_STRIPE_LENGTH : CROSSWALK_STRIPE_WIDTH) / 2;
    const index = positions.length / 3;
    for (const [dx, dz] of [[-halfX, -halfZ], [-halfX, halfZ], [halfX, halfZ], [halfX, -halfZ]]) {
      positions.push(x + dx, elevation(x + dx, z + dz) + .052, z + dz);
    }
    uvs.push(0, 0, 0, 1, 1, 1, 1, 0);
    indices.push(index, index + 1, index + 2, index, index + 2, index + 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  return geometry;
}

export function addRoadCrosswalks(scene, stripes, elevation, material = createCrosswalkMaterial()) {
  const mesh = new THREE.Mesh(crosswalkGeometry(stripes, elevation), material);
  mesh.name = 'road-pedestrian-zebra-markings'; mesh.receiveShadow = true;
  scene.add(mesh); return mesh;
}
