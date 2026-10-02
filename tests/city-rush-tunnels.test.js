import test from 'node:test';
import assert from 'node:assert/strict';
import { CITY_RUSH_CITIES, CITY_RUSH_LANE_X, CITY_RUSH_LAP_LENGTH, cityRushMinimapPoint } from '../src/games/cityRushRules.js';
import {
  CITY_RUSH_TUNNEL_GAP,
  CITY_RUSH_TUNNEL_LANE_HALF,
  CITY_RUSH_TUNNEL_LENGTH,
  CITY_RUSH_TUNNEL_MIN_OPEN_LANES,
  CITY_RUSH_TUNNEL_MONUMENT,
  CITY_RUSH_TUNNEL_PLANS,
  CITY_RUSH_TUNNEL_WALL_LEAD,
  cityRushTunnelAt,
  cityRushTunnelCurtain,
  cityRushTunnelLaneFor,
  cityRushTunnelLaneOpen,
  cityRushTunnelMinimapBands,
  cityRushTunnelNearestOpenLane,
  cityRushTunnelPlanFits,
  cityRushTunnelShade,
  cityRushTunnelWallAt,
  cityRushTunnels,
} from '../src/games/cityRushTunnels.js';

const LANES = CITY_RUSH_LANE_X.map((_, lane) => lane);

test('les tremis sont posés sur certains circuits, pas sur tous', () => {
  const withTunnels = CITY_RUSH_CITIES.filter((city) => cityRushTunnels(city.id).length > 0);
  assert.ok(withTunnels.length >= 2, 'au moins deux circuits ont des tremis');
  assert.ok(withTunnels.length <= CITY_RUSH_CITIES.length - 1, 'tous les circuits n’en ont pas');
  for (const city of CITY_RUSH_CITIES) {
    assert.ok(Array.isArray(CITY_RUSH_TUNNEL_PLANS[city.id]), `${city.id} a un plan écrit`);
    const tunnels = cityRushTunnels(city.id);
    assert.ok(tunnels.length <= 3, `${city.id} : trois tremis au plus`);
    // Chaque créneau écrit devient une voûte : un plan mal tracé se verrait ici.
    assert.equal(tunnels.length, CITY_RUSH_TUNNEL_PLANS[city.id].length, `${city.id} : tous les créneaux sont traçables`);
    if (tunnels.length) assert.ok(tunnels.length >= 2, `${city.id} : deux tremis au moins quand le circuit en a`);
  }
});

test('chaque tremis est court et laisse au moins deux voies ouvertes', () => {
  for (const city of CITY_RUSH_CITIES) {
    for (const tunnel of cityRushTunnels(city.id)) {
      assert.equal(tunnel.exit - tunnel.entry, CITY_RUSH_TUNNEL_LENGTH, `${city.id}/${tunnel.id} : longueur`);
      assert.ok(tunnel.entry > 0 && tunnel.exit < CITY_RUSH_LAP_LENGTH, `${city.id}/${tunnel.id} : dans le tour`);
      assert.ok(tunnel.openLanes.length >= CITY_RUSH_TUNNEL_MIN_OPEN_LANES, `${city.id}/${tunnel.id} : deux voies libres minimum`);
      assert.ok(tunnel.openLanes.length < LANES.length, `${city.id}/${tunnel.id} : la chaussée se resserre vraiment`);
      const contiguous = tunnel.openLanes.every((lane, index) => index === 0 || lane === tunnel.openLanes[index - 1] + 1);
      assert.ok(contiguous, `${city.id}/${tunnel.id} : le couloir est d’un seul tenant`);
      assert.equal(tunnel.openLanes.length + tunnel.closedLanes.length, LANES.length);
      for (const lane of tunnel.closedLanes) assert.ok(!tunnel.openLanes.includes(lane), 'une voie est soit ouverte, soit murée');
    }
  }
});

test('les voûtes ne recouvrent ni le départ, ni le portique, ni le monument', () => {
  for (const city of CITY_RUSH_CITIES) {
    const tunnels = cityRushTunnels(city.id);
    for (const tunnel of tunnels) {
      assert.ok(cityRushTunnelPlanFits(tunnel.entry), `${city.id}/${tunnel.id} : créneau dégagé`);
      const monumentGap = Math.abs(tunnel.entry - CITY_RUSH_TUNNEL_MONUMENT);
      assert.ok(monumentGap >= 12 || tunnel.exit <= CITY_RUSH_TUNNEL_MONUMENT - 12, `${city.id}/${tunnel.id} : le monument reste visible`);
    }
    for (let index = 1; index < tunnels.length; index += 1) {
      const gap = tunnels[index].entry - tunnels[index - 1].exit;
      assert.ok(gap >= CITY_RUSH_TUNNEL_GAP, `${city.id} : ${Math.round(gap)} m entre deux tremis`);
    }
  }
  // Un créneau trop près du départ est refusé, pas décalé.
  assert.equal(cityRushTunnelPlanFits(40), false);
  assert.equal(cityRushTunnelPlanFits(300), false);
  assert.equal(cityRushTunnelPlanFits(CITY_RUSH_TUNNEL_MONUMENT), false);
  assert.equal(cityRushTunnelPlanFits(96), true);
});

test('chaque paroi mure exactement les voies fermées, du bord jusqu’au couloir', () => {
  for (const city of CITY_RUSH_CITIES) {
    for (const tunnel of cityRushTunnels(city.id)) {
      const label = `${city.id}/${tunnel.id}`;
      const walledLanes = tunnel.walls.flatMap((wall) => wall.closedLanes);
      assert.deepEqual([...walledLanes].sort(), [...tunnel.closedLanes], `${label} : toutes les voies murées ont leur paroi`);
      for (const wall of tunnel.walls) {
        assert.ok(wall.width > 0, `${label} : une paroi a une épaisseur`);
        assert.equal(wall.corridor, wall.side === 'left' ? 1 : -1, `${label} : la paroi est du bon côté du couloir`);
        // La paroi va du bord de la chaussée au bord du couloir ouvert, du
        // côté de cette paroi-là (un resserrement central en a deux).
        const lanes = wall.closedLanes;
        const corridorLane = wall.side === 'left' ? lanes[lanes.length - 1] + 1 : lanes[0] - 1;
        const expected = CITY_RUSH_LANE_X[corridorLane] + (wall.side === 'left' ? -1 : 1) * CITY_RUSH_TUNNEL_LANE_HALF;
        assert.equal(wall.outerX, expected, `${label} : la paroi s’arrête au couloir`);
        assert.equal(Math.sign(wall.innerX), wall.side === 'left' ? -1 : 1, `${label} : la paroi touche le bord de la chaussée`);
        // Aucune voie ouverte n'est recouverte par la paroi.
        for (const lane of tunnel.openLanes) {
          const laneX = CITY_RUSH_LANE_X[lane];
          const inside = laneX > Math.min(wall.innerX, wall.outerX) && laneX < Math.max(wall.innerX, wall.outerX);
          assert.ok(!inside, `${label} : la voie ${lane} reste libre`);
        }
      }
    }
  }
});

test('cityRushTunnelAt suit la bouche à bouche, sans déborder', () => {
  const [tunnel] = cityRushTunnels('vice-city');
  const list = cityRushTunnels('vice-city');
  assert.equal(cityRushTunnelAt(tunnel.entry - 0.01, list), null);
  assert.equal(cityRushTunnelAt(tunnel.entry, list)?.id, tunnel.id);
  assert.equal(cityRushTunnelAt((tunnel.entry + tunnel.exit) / 2, list)?.id, tunnel.id);
  assert.equal(cityRushTunnelAt(tunnel.exit, list)?.id, tunnel.id);
  assert.equal(cityRushTunnelAt(tunnel.exit + 0.01, list), null);
  assert.equal(cityRushTunnelAt(Number.NaN, list), null);
  assert.equal(cityRushTunnelAt(0, null), null);
  // La paroi mord quelques mètres avant la bouche : les cônes sont là.
  assert.equal(cityRushTunnelAt(tunnel.entry - CITY_RUSH_TUNNEL_WALL_LEAD, list), null);
  assert.equal(cityRushTunnelWallAt(tunnel.entry - CITY_RUSH_TUNNEL_WALL_LEAD, list)?.id, tunnel.id);
  assert.equal(cityRushTunnelWallAt(tunnel.entry - CITY_RUSH_TUNNEL_WALL_LEAD - 0.5, list), null);
  assert.equal(cityRushTunnelWallAt(tunnel.exit + 0.5, list), null);
  assert.equal(cityRushTunnelWallAt(tunnel.exit + 0.5, list, CITY_RUSH_TUNNEL_WALL_LEAD, 2)?.id, tunnel.id);
});

test('le rabattement vise la voie ouverte la plus proche', () => {
  for (const city of CITY_RUSH_CITIES) {
    for (const tunnel of cityRushTunnels(city.id)) {
      const label = `${city.id}/${tunnel.id}`;
      for (const lane of LANES) {
        const held = cityRushTunnelNearestOpenLane(tunnel, lane);
        assert.ok(tunnel.openLanes.includes(held), `${label} : la voie ${lane} se rabat sur une voie ouverte`);
        assert.equal(cityRushTunnelLaneOpen(tunnel, held), true);
        for (const open of tunnel.openLanes) {
          assert.ok(Math.abs(open - lane) >= Math.abs(held - lane), `${label} : ${held} est la plus proche de ${lane}`);
        }
      }
      // Dans le tremis, une voie murée ramène au couloir ; une voie ouverte reste.
      const middle = (tunnel.entry + tunnel.exit) / 2;
      for (const lane of tunnel.openLanes) assert.equal(cityRushTunnelLaneFor(middle, lane, [tunnel]), lane, `${label} : la voie ${lane} se garde`);
      for (const lane of tunnel.closedLanes) {
        assert.ok(tunnel.openLanes.includes(cityRushTunnelLaneFor(middle, lane, [tunnel])), `${label} : la voie ${lane} se rabat`);
      }
      // Hors du tremis, aucune contrainte.
      assert.equal(cityRushTunnelLaneFor(tunnel.entry - CITY_RUSH_TUNNEL_GAP - 1, tunnel.closedLanes[0], [tunnel]), tunnel.closedLanes[0]);
      assert.equal(cityRushTunnelLaneFor(tunnel.exit + 1, tunnel.closedLanes[0], [tunnel]), tunnel.closedLanes[0]);
    }
  }
});

test('les IA anticipent la paroi, le joueur est retenu plus tard', () => {
  const [tunnel] = cityRushTunnels('vice-city');
  const closed = tunnel.closedLanes[0];
  const open = tunnel.openLanes[0];
  // 60 m avant la bouche : la police se rabat (70 m de marge), le joueur non (26 m).
  const approach = tunnel.entry - 60;
  assert.equal(cityRushTunnelLaneFor(approach, closed, [tunnel], 70), open);
  assert.equal(cityRushTunnelLaneFor(approach, closed, [tunnel], 26), closed);
  assert.equal(cityRushTunnelLaneFor(approach, closed, [tunnel], 70) !== closed, true);
  // À 20 m, le joueur est déjà retenu.
  assert.equal(cityRushTunnelLaneFor(tunnel.entry - 20, closed, [tunnel], 26), open);
});

test('la pénombre suit la caméra, le voile ne passe jamais devant elle', () => {
  const tunnels = cityRushTunnels('vice-city');
  const first = tunnels[0];
  const cameraLead = 18.34;
  assert.equal(cityRushTunnelShade(first.entry - 60, tunnels, cameraLead), 0);
  assert.equal(cityRushTunnelShade(first.entry + cameraLead - 5, tunnels, cameraLead), 0);
  assert.ok(cityRushTunnelShade(first.entry + cameraLead + 1, tunnels, cameraLead) > 0.5);
  assert.equal(cityRushTunnelShade(first.entry + cameraLead + 10, tunnels, cameraLead), 1);
  assert.equal(cityRushTunnelShade(first.exit + cameraLead, tunnels, cameraLead), 1);
  assert.equal(cityRushTunnelShade(first.exit + cameraLead + 5, tunnels, cameraLead), 0);
  assert.ok(cityRushTunnelShade(first.exit + cameraLead + 4, tunnels, cameraLead) < 0.25, 'la lumière revient en douceur');
  assert.equal(cityRushTunnelShade(first.exit + 4, tunnels, cameraLead), 1, 'la caméra est encore sous la voûte');
  assert.equal(cityRushTunnelShade(Number.NaN, tunnels, cameraLead), 0);
  // Le voile du fond est nul avant la bouche, plein au milieu, éteint à la sortie.
  assert.equal(cityRushTunnelCurtain(first.entry - 10, first), 0);
  assert.ok(cityRushTunnelCurtain(first.entry + 6, first) > 0.5);
  assert.equal(cityRushTunnelCurtain((first.entry + first.exit) / 2, first), 1);
  assert.equal(cityRushTunnelCurtain(first.exit - 1, first), 0);
  assert.equal(cityRushTunnelCurtain(first.entry + 6, null), 0);
});

test('la mini-carte porte la voûte et la bande des voies murées', () => {
  for (const city of CITY_RUSH_CITIES) {
    const bands = cityRushTunnelMinimapBands(city.id);
    assert.equal(bands.length, cityRushTunnels(city.id).length, `${city.id} : un repère par tremis`);
    for (const band of bands) {
      assert.ok(band.length > 2, `${city.id}/${band.id} : le souterrain se voit sur la carte`);
      assert.ok(Number.isFinite(band.deg) && Number.isFinite(band.x) && Number.isFinite(band.y));
      assert.ok(band.roadHalf > 0 && band.roadHalf < 5, `${city.id}/${band.id} : largeur de chaussée plausible`);
      const tunnel = cityRushTunnels(city.id).find((item) => item.id === band.id);
      assert.equal(band.walls.length, tunnel.walls.length, `${city.id}/${band.id} : une bande par paroi`);
      for (const [index, wall] of band.walls.entries()) {
        const lanes = tunnel.walls[index].closedLanes;
        assert.equal(tunnel.walls[index].side, wall.side, `${city.id}/${band.id} : la bande est du côté de la paroi`);
        assert.ok(wall.from < wall.to, `${city.id}/${band.id} : bande de paroi`);
        assert.ok(wall.from >= -band.roadHalf - 0.01 && wall.to <= band.roadHalf + 0.01, `${city.id}/${band.id} : la paroi tient dans la chaussée`);
        // La bande couvre exactement les voies murées de cette paroi : de
        // l'écartement des voies de la carte (1,45) et de leur demi-largeur.
        const laneSpacing = 1.45;
        const laneHalf = laneSpacing / 2;
        assert.ok(Math.abs(wall.from - ((Math.min(...lanes) - 1.5) * laneSpacing - laneHalf)) < 0.01, `${city.id}/${band.id} : bord de bande`);
        assert.ok(Math.abs(wall.to - ((Math.max(...lanes) - 1.5) * laneSpacing + laneHalf)) < 0.01, `${city.id}/${band.id} : bord de bande`);
      }
    }
    // Les deux bouts de la bande tombent sur les bouches du tremis : longitudes
    // opposées de part et d'autre du centre, à la distance projetée près.
    const [first] = cityRushTunnels(city.id);
    if (!first) continue;
    const [band] = bands;
    const entryPoint = cityRushMinimapPoint(first.entry, 1.5, { laneSpacing: 0 });
    const exitPoint = cityRushMinimapPoint(first.exit, 1.5, { laneSpacing: 0 });
    for (const end of [entryPoint, exitPoint]) {
      assert.ok(Math.abs(Math.hypot(band.x - end.x, band.y - end.y) - band.length / 2) < 0.5, `${city.id} : bande centrée sur le tremis`);
    }
    assert.ok(Math.hypot(entryPoint.x - exitPoint.x, entryPoint.y - exitPoint.y) >= band.length - 0.05, `${city.id} : la bande ne dépasse pas la bouche`);
  }
  assert.deepEqual(cityRushTunnelMinimapBands('inconnue').length, cityRushTunnels('inconnue').length);
});
