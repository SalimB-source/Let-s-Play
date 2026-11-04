import * as THREE from 'three';

export function createSchoolCyclist(person) {
  const group = new THREE.Group();
  group.name = 'driving-school-cyclist';
  const metal = new THREE.MeshStandardMaterial({ color: 0x203239, metalness: .5, roughness: .45 });
  const frame = new THREE.MeshStandardMaterial({ color: 0x24c3dc, metalness: .3, roughness: .5 });
  const tire = new THREE.MeshStandardMaterial({ color: 0x191e22, roughness: .95 });
  const wheels = [];
  for (const z of [-.64, .64]) {
    const wheel = new THREE.Group(); wheel.position.set(0, .36, z); wheel.rotation.y = Math.PI / 2;
    wheel.add(new THREE.Mesh(new THREE.TorusGeometry(.34, .035, 8, 28), tire));
    wheel.add(new THREE.Mesh(new THREE.TorusGeometry(.30, .012, 6, 28), metal));
    for (let i = 0; i < 6; i++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(.6, .009, .009), metal);
      spoke.rotation.z = i * Math.PI / 6; wheel.add(spoke);
    }
    group.add(wheel); wheels.push(wheel);
  }
  const tube = (a, b, material = frame) => {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), delta = end.clone().sub(start);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, delta.length(), 8), material);
    mesh.position.copy(start).add(end).multiplyScalar(.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()); group.add(mesh);
  };
  const rear = [0, .36, .64], crank = [0, .4, .05], saddle = [0, .94, .3], head = [0, .92, -.46], front = [0, .36, -.64];
  for (const [a, b] of [[rear, saddle], [rear, crank], [crank, saddle], [saddle, head], [crank, head], [head, front]]) tube(a, b);
  tube([-.32, 1.03, -.49], [.32, 1.03, -.49], metal);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(.24, .065, .28), tire); seat.position.set(0, .96, .3); group.add(seat);
  if (person.pistol) person.pistol.visible = false;
  if (person.muzzleFlash) person.muzzleFlash.visible = false;
  person.group.position.set(0, .19, .15); group.add(person.group);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(.17, 12, 10), new THREE.MeshStandardMaterial({ color: 0xffdb4b, roughness: .7 }));
  helmet.scale.set(1, .65, 1.1); helmet.position.set(0, 1.86, -.01); person.group.add(helmet);
  person.arms.forEach((arm) => { arm.rotation.x = .9; if (arm.userData.elbow) arm.userData.elbow.rotation.x = .35; });
  group.userData.width = .75; group.userData.length = 2.1;
  return { group, person, wheels };
}

export function animateSchoolCyclist(cyclist, traveled) {
  const phase = traveled / .34;
  cyclist.wheels.forEach((wheel) => { wheel.rotation.z = -phase; });
  cyclist.person.legs.forEach((leg, i) => {
    leg.rotation.x = .9 + Math.sin(phase + i * Math.PI) * .25;
    if (leg.userData.knee) leg.userData.knee.rotation.x = -1.2 - Math.sin(phase + i * Math.PI) * .3;
  });
}
