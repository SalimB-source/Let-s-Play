import { narrowPassageBodies } from './roadCodeExercises.js';
import { addTeachingHalo, isExerciseSign } from './drivingTeachingGlow.js';
import { drawNoParkingSign } from './parkingChoiceExercise.js';
import { crosswalkStripes, addRoadCrosswalks } from './roadCrosswalks.js';
import * as THREE from 'three';
import { SCHOOL_BUMPS, SCHOOL_CROSSINGS, SCHOOL_STOP_JUNCTION, schoolBumpHeight, schoolSignLayout, schoolApproachPlacement, SCHOOL_ROUNDABOUT } from './drivingSchoolRoads.js';

function signTexture(type, label, rightTraffic = false) {
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256;
  const c = canvas.getContext('2d');
  c.lineWidth = 18; c.strokeStyle = '#d5242b'; c.fillStyle = '#fff';
  if (type === 'stop') {
    c.beginPath(); for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; const x = 128 + Math.cos(a) * 116, y = 128 + Math.sin(a) * 116; if (i) c.lineTo(x, y); else c.moveTo(x, y); } c.closePath(); c.fillStyle = '#c9232c'; c.fill(); c.lineWidth = 5; c.strokeStyle = '#fff'; c.stroke(); c.fillStyle = '#fff'; c.font = 'bold 66px sans-serif';
  } else if (type === 'warning' || type === 'yield' || type === 'giratory-warning') {
    c.beginPath(); if (type === 'yield') { c.moveTo(20, 30); c.lineTo(236, 30); c.lineTo(128, 225); } else { c.moveTo(128, 20); c.lineTo(236, 225); c.lineTo(20, 225); } c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#111'; c.font = 'bold 75px sans-serif';
  } else if (type === 'roundabout') {
    c.fillStyle = '#1661b1'; c.beginPath(); c.arc(128, 128, 115, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#fff'; c.fillStyle = '#fff'; c.lineWidth = 15;
    for (let i = 0; i < 3; i++) {
      const direction = rightTraffic ? -1 : 1;
      const a = i * Math.PI * 2 / 3, end = a + direction * 1.25;
      c.beginPath(); c.arc(128, 128, 65, a, end, rightTraffic); c.stroke();
      const x = 128 + 65 * Math.cos(end), y = 128 + 65 * Math.sin(end);
      c.save(); c.translate(x, y); c.rotate(end + (rightTraffic ? -1 : 1) * Math.PI / 2); c.beginPath(); c.moveTo(13, 0); c.lineTo(-13, -20); c.lineTo(-13, 20); c.closePath(); c.fill(); c.restore();
    }
  } else if (type === 'pedestrian') {
    c.fillStyle = '#1763b5'; c.fillRect(12, 12, 232, 232); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(128, 32); c.lineTo(225, 218); c.lineTo(31, 218); c.closePath(); c.fill();
    c.fillStyle = '#111'; c.beginPath(); c.arc(136, 100, 12, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#111'; c.lineWidth = 10; c.lineCap = 'round'; c.beginPath(); c.moveTo(133, 121); c.lineTo(116, 155); c.lineTo(98, 192); c.moveTo(116, 155); c.lineTo(152, 190); c.moveTo(125, 133); c.lineTo(150, 151); c.moveTo(125, 133); c.lineTo(97, 148); c.stroke();
  } else if (type === 'priority-road') {
    c.beginPath(); c.moveTo(128,12); c.lineTo(244,128); c.lineTo(128,244); c.lineTo(12,128); c.closePath(); c.fillStyle='#fff'; c.fill(); c.strokeStyle='#222'; c.lineWidth=5; c.stroke();
    c.beginPath(); c.moveTo(128,38); c.lineTo(218,128); c.lineTo(128,218); c.lineTo(38,128); c.closePath(); c.fillStyle='#ffdc3f'; c.fill();
  } else if (type === 'narrow-yield' || type === 'narrow-priority') {
    const priority=type==='narrow-priority';
    if(priority){c.fillStyle='#1661b1';c.fillRect(12,12,232,232);}else{c.beginPath();c.arc(128,128,110,0,Math.PI*2);c.fill();c.stroke();}
    const arrow=(x,up,color)=>{c.save();c.translate(x,128);if(!up)c.rotate(Math.PI);c.fillStyle=color;c.beginPath();c.moveTo(-10,62);c.lineTo(10,62);c.lineTo(10,-23);c.lineTo(28,-23);c.lineTo(0,-62);c.lineTo(-28,-23);c.lineTo(-10,-23);c.closePath();c.fill();c.restore();};
    arrow(87,false,priority?'#e94442':'#151515');arrow(169,true,priority?'#fff':'#d5242b');
  } else if (type === 'no-parking') {
    drawNoParkingSign(c);
  } else if (type === 'parking') {
    c.fillStyle = '#1661b1'; c.fillRect(12, 12, 232, 232); c.fillStyle = '#fff'; c.font = 'bold 160px sans-serif';
  } else { c.beginPath(); c.arc(128, 128, 109, 0, Math.PI * 2); c.fill(); c.stroke(); c.fillStyle = '#111'; c.font = 'bold 110px sans-serif'; }
  c.textAlign = 'center'; c.textBaseline = 'middle';
  if (type === 'warning') { c.beginPath(); c.lineWidth = 14; c.strokeStyle = '#111'; c.moveTo(72, 181); c.lineTo(90, 181); c.quadraticCurveTo(128, 115, 166, 181); c.lineTo(184, 181); c.stroke(); }
  else if (type === 'giratory-warning') {
    c.strokeStyle = '#111'; c.fillStyle = '#111'; c.lineWidth = 9;
    for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3, end = a - 1.3; c.beginPath(); c.arc(128, 157, 37, a, end, true); c.stroke(); c.save(); c.translate(128 + Math.cos(end) * 37, 157 + Math.sin(end) * 37); c.rotate(end - Math.PI / 2); c.beginPath(); c.moveTo(10, 0); c.lineTo(-10, -12); c.lineTo(-10, 12); c.closePath(); c.fill(); c.restore(); }
  }
  else if (type !== 'yield' && type !== 'pedestrian' && type !== 'roundabout' && !['priority-road','narrow-yield','narrow-priority'].includes(type)) c.fillText(label, 128, type === 'parking' ? 140 : 135);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}
export function exerciseCrosswalkStripes(exercise) {
  return (exercise?.crossings ?? []).flatMap((crossing) => crosswalkStripes(crossing.x, crossing.z, crossing.axis));
}

export function addDrivingSchoolScenery(scene, elevation, exercise) {
  const textures = new Map();
  const material = (color) => new THREE.MeshStandardMaterial({ color, roughness: .85 });
  const white = material(0xf4f0da), pole = material(0x7f8991), yellow = material(0xeac747);
  function box(x, z, width, depth, mat, y = .06, height = .035) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mat);
    mesh.position.set(x, elevation(x, z) + y, z); scene.add(mesh); return mesh;
  }
  function sign(type, label, x, z, yaw) {
    const key = `${type}:${label}`;
    if (!textures.has(key)) textures.set(key, signTexture(type, label, exercise?.trafficSide === 'right'));
    const group = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, 2.8, 8), pole); post.position.y = 1.4; group.add(post);
    const size = type === 'stop' ? 1.2 : 1.05;
    // A legible front, never a mirrored duplicate for oncoming traffic.
    const geometry = new THREE.PlaneGeometry(size, size);
    const face = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: textures.get(key), transparent: true, alphaTest: .1 }));
    face.position.set(0, 2.5, .07); group.add(face);
    const backCanvas = document.createElement('canvas'); backCanvas.width = 256; backCanvas.height = 256;
    const backContext = backCanvas.getContext('2d'); backContext.drawImage(textures.get(key).image, 0, 0);
    backContext.globalCompositeOperation = 'source-in'; backContext.fillStyle = '#68747b'; backContext.fillRect(0, 0, 256, 256);
    const backTexture = new THREE.CanvasTexture(backCanvas); backTexture.colorSpace = THREE.SRGBColorSpace;
    const back = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ map: backTexture, transparent: true, alphaTest: .1, side: THREE.BackSide }));
    back.position.set(0, 2.5, .06); group.add(back);
    if (isExerciseSign(exercise, x, z)) addTeachingHalo(group, { width: size * 2, height: size * 2, y: 2.5, z: .025 });
    group.position.set(x, elevation(x, z), z); group.rotation.y = yaw; scene.add(group); return group;
  }
  if (exercise?.narrowPassage) {
    const p=exercise.narrowPassage;
    for (const body of narrowPassageBodies(exercise)) {
      const wall=box(body.x,body.z,body.width,body.depth,material(0x87918e),.3,.6);wall.name='school-narrow-passage-wall';
      for(let z=p.minZ+1;z<p.maxZ;z+=3) box(body.x,z,body.width,.6,yellow,.615,.03);
    }
    sign('narrow-yield','',p.x+7.9,p.maxZ+5,0);
    sign('narrow-priority','',p.x-7.9,p.minZ-6,Math.PI);
  }
  if (exercise?.crossings?.length) {
    addRoadCrosswalks(scene, exerciseCrosswalkStripes(exercise), elevation);
    for (const crossing of exercise.crossings) {
      sign('pedestrian', '', crossing.x + 7.9, crossing.z + 3, 0);
    }
  }
  if (exercise?.parkingChoice) {
    const config = exercise.parkingChoice, location = config.sign;
    const post = sign('no-parking', '', location.x, location.z, location.yaw);
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 90;
    const context = canvas.getContext('2d');
    context.fillStyle = '#fff'; context.fillRect(0, 0, 256, 90);
    context.strokeStyle = '#161616'; context.lineWidth = 5; context.strokeRect(3, 3, 250, 84);
    context.fillStyle = '#111'; context.font = 'bold 42px sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle';
    context.fillText(`${location.extent} m`, 128, 46);
    for (const x of [27, 229]) {
      context.beginPath(); context.moveTo(x, 18); context.lineTo(x, 72);
      context.moveTo(x - 7, 26); context.lineTo(x, 18); context.lineTo(x + 7, 26);
      context.moveTo(x - 7, 64); context.lineTo(x, 72); context.lineTo(x + 7, 64); context.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.05, .37), new THREE.MeshBasicMaterial({ map: texture }));
    panel.position.set(0, 1.72, .075); post.add(panel);
    const zone = config.forbidden;
    for (let z = zone.z - zone.depth / 2 + 1; z < zone.z + zone.depth / 2; z += 3) {
      box(zone.x - zone.width / 2 + .05, z, .14, 1.8, yellow);
    }
  }
  if (exercise?.parkingBay) {
    const { x, z, width, depth, side = 1 } = exercise.parkingBay;
    // Open on the road side: a real bay, not decorative lines across traffic.
    for (const side of [-1, 1]) box(x, z + side * depth / 2, width, .10, white);
    box(x + side * width / 2, z, .10, depth, white);
    sign('parking', 'P', exercise.center.x + side * 7.9, z + side * 4, side === -1 ? Math.PI : 0);
  }
  if (exercise?.laneDivider) {
    const { z, startX, endX, lanes } = exercise.laneDivider;
    for (let x = startX; x <= endX; x += 5) box(x, z, 2, .12, white);
    const arrow = new THREE.Shape();
    arrow.moveTo(1.4, 0); arrow.lineTo(.3, .65); arrow.lineTo(.3, .2);
    arrow.lineTo(-1.3, .2); arrow.lineTo(-1.3, -.2); arrow.lineTo(.3, -.2); arrow.lineTo(.3, -.65); arrow.closePath();
    const geometry = new THREE.ShapeGeometry(arrow); geometry.rotateX(-Math.PI / 2);
    for (const laneZ of lanes) {
      const mesh = new THREE.Mesh(geometry, white);
      mesh.position.set(startX + 15, elevation(startX + 15, laneZ) + .055, laneZ);
      scene.add(mesh);
    }
  }
  if (exercise?.jurisdiction === 'FR') {
    const c = exercise.center;
    if (exercise.rule === 'yield' || exercise.rule === 'stop') {
      // Northbound French approach: signs on the RIGHT verge, facing south.
      sign(exercise.rule, exercise.rule === 'stop' ? 'STOP' : '', c.x + 7.9, c.z + 18, 0);
      if (exercise.rule === 'stop') box(c.x + 1.8, c.z + 18, 3.5, .5, white);
      else for (const x of [.5, 1.6, 2.7]) box(c.x + x, c.z + 18, .65, .35, white);
    }
    if (exercise.rule === 'priority-road') {
      sign('priority-road','',c.x+7.9,c.z+28,0);
      const lateral=schoolApproachPlacement(c,'x',-1,18,-7.9);
      sign('yield','',lateral.x,lateral.z,lateral.yaw);
      for (const dz of [-.5,-1.6,-2.7]) box(c.x+18,c.z+dz,.35,.65,white);
    }
    if (exercise.rule === 'giratory') {
      sign('giratory-warning', '', c.x + 7.9, c.z + 40, 0);
      for (const axis of ['x', 'z']) for (const d of [-1, 1]) {
        const placement = schoolApproachPlacement(c, axis, d, 30, -7.9);
        sign('yield', '', placement.x, placement.z, placement.yaw);
        const mandatory = schoolApproachPlacement(c, axis, d, 26, -7.9);
        sign('roundabout', '', mandatory.x, mandatory.z, mandatory.yaw);
        for (const offset of [.5, 1.6, 2.7]) {
          const line = schoolApproachPlacement(c, axis, d, 28, -offset);
          box(line.x, line.z, axis === 'x' ? .35 : .65, axis === 'x' ? .65 : .35, white);
        }
      }
      // Counterclockwise arrows on the French ring, not the old clockwise markings.
      const shape = new THREE.Shape(); shape.moveTo(0, 1.4); shape.lineTo(-.7, .3); shape.lineTo(-.2, .3); shape.lineTo(-.2, -1.4); shape.lineTo(.2, -1.4); shape.lineTo(.2, .3); shape.lineTo(.7, .3); shape.closePath();
      const geometry = new THREE.ShapeGeometry(shape); geometry.rotateX(-Math.PI / 2);
      for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; const mesh = new THREE.Mesh(geometry, white); mesh.position.set(c.x + 18 * Math.cos(a), .1, c.z + 18 * Math.sin(a)); mesh.rotation.y = -a; scene.add(mesh); }
    }
    // Unmarked priority-to-right exercise deliberately has no priority signs.
    return;
  }
  for (const bump of SCHOOL_BUMPS) {
    // Sample the exact same rounded profile that the wheels ride over.
    const geometry = new THREE.PlaneGeometry(bump.axis === 'x' ? 4 : 13.6, bump.axis === 'x' ? 13.6 : 4, 32, 32); geometry.rotateX(-Math.PI / 2);
    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) { const x = bump.x + pos.getX(i), z = bump.z + pos.getZ(i); pos.setY(i, elevation(x, z) + schoolBumpHeight(x, z) + .02); }
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material(0x31353a)); mesh.position.set(bump.x, 0, bump.z); mesh.receiveShadow = true; scene.add(mesh);
    for (let i = -5; i <= 5; i += 2) box(bump.x + (bump.axis === 'z' ? i : 0), bump.z + (bump.axis === 'x' ? i : 0), bump.axis === 'z' ? 1 : 2, bump.axis === 'z' ? 2 : 1, yellow, .2);
  }
  for (const placement of schoolSignLayout()) {
    sign(placement.type, placement.label, placement.x, placement.z, placement.yaw);
  }
  addRoadCrosswalks(scene, SCHOOL_CROSSINGS.flatMap((crossing) => crosswalkStripes(crossing.x, crossing.z, crossing.axis)), elevation);
  for (const axis of ['x', 'z']) for (const d of [-1, 1]) {
    const placement = schoolApproachPlacement(SCHOOL_STOP_JUNCTION, axis, d, 18, -1.8);
    box(placement.x, placement.z, axis === 'x' ? .5 : 3.5, axis === 'x' ? 3.5 : .5, white);
  }
  // Broken give-way lines cover the incoming RIGHT lane, before the ring.
  for (const axis of ['x', 'z']) for (const d of [-1, 1]) {
    for (const offset of [.5, 1.6, 2.7]) {
      const placement = schoolApproachPlacement(SCHOOL_ROUNDABOUT, axis, d, 28, -offset);
      box(placement.x, placement.z, axis === 'x' ? .35 : .65, axis === 'x' ? .65 : .35, white);
    }
  }
  // Counterclockwise arrows on the ring for right-hand traffic.
  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(-.18, -1.5); arrowShape.lineTo(.18, -1.5);
  arrowShape.lineTo(.18, .4); arrowShape.lineTo(.65, .4);
  arrowShape.lineTo(0, 1.5); arrowShape.lineTo(-.65, .4);
  arrowShape.lineTo(-.18, .4); arrowShape.closePath();
  const arrowGeometry = new THREE.ShapeGeometry(arrowShape); arrowGeometry.rotateX(-Math.PI / 2);
  function arrow(x, z, yaw) {
    const mesh = new THREE.Mesh(arrowGeometry, white);
    mesh.position.set(x, elevation(x, z) + .075, z); mesh.rotation.y = yaw; scene.add(mesh);
  }
  for (let i = 0; i < 3; i++) {
    const angle = i * Math.PI * 2 / 3;
    arrow(200 + 18 * Math.cos(angle), 200 + 18 * Math.sin(angle), -angle);
  }
  for (const axis of ['x', 'z']) for (const street of [-200, -100, 100, 200]) for (const direction of [-1, 1]) {
    const center = axis === 'x' ? { x: -250, z: street } : { x: street, z: 50 };
    const placement = schoolApproachPlacement(center, axis, direction, 0, -2.35);
    // Geometry points along local -Z; the sign face looks along +Z.
    arrow(placement.x, placement.z, placement.yaw);
  }
  // Low-speed manoeuvre bays, along the existing kerb (not an obstacle course).
  for (const z of [-145, -153, -161]) {
    box(-205.5, z, 2.6, .12, white); box(-206.8, z + 4, .12, 8, white); box(-204.2, z + 4, .12, 8, white);
  }
  box(-205.5, -137, 2.6, .12, white);
}
