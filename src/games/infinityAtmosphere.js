import * as THREE from 'three';

/** Palette du Château : boiseries chaudes au premier plan, brume pourpre-ambrée au loin. */
export const INFINITY_ATMOSPHERE = Object.freeze({
  background: 0x160710,
  fog: 0x381520,
  exposure: 1.08,
  hemiSky: 0xffe0a8,
  hemiGround: 0x582936,
  sunLight: 0xffc982,
  rimLight: 0xff8c66,
  // Force des faisceaux du soleil de la Grande Arche (voir README). Ils sont
  // figés : ce ciel ne dépend pas du temps (voir `makeInfinitySky`).
  rays: 0.6,
});

/** Disque solaire cadré au cœur de la Grande Arche, bien dégagé au-dessus du pont. */
export const INFINITY_SUN = Object.freeze({ x: 0, elevation: 6.5, z: -95, radius: 3.95 });

const SKY_VERTEX = /* glsl */ `
  uniform mat4 uInverseProjection;
  varying vec3 vViewRay;

  void main() {
    // Un seul quad plein écran, sans bord de panorama visible en portrait,
    // en plein écran ou quand le champ de vision s'élargit pendant un turbo.
    vViewRay = (uInverseProjection * vec4(position.xy, 1.0, 1.0)).xyz;
    gl_Position = vec4(position.xy, 1.0, 1.0);
  }
`;

const SKY_FRAGMENT = /* glsl */ `
  uniform mat4 uCameraWorld;
  uniform vec3 uCameraPosition;
  uniform vec3 uSunPosition;
  uniform float uSunRadius;
  uniform vec3 uFog;
  uniform vec3 uHorizon;
  uniform vec3 uCrimson;
  uniform vec3 uZenith;
  uniform vec3 uGlow;
  uniform vec3 uSunLower;
  uniform vec3 uSunUpper;
  uniform float uRays;
  varying vec3 vViewRay;

  float hash21(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  float noise(vec2 p) {
    vec2 cell = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash21(cell), hash21(cell + vec2(1.0, 0.0)), f.x),
      mix(hash21(cell + vec2(0.0, 1.0)), hash21(cell + vec2(1.0)), f.x),
      f.y
    );
  }

  void main() {
    vec3 ray = normalize((uCameraWorld * vec4(vViewRay, 0.0)).xyz);
    float skyDistance = (uCameraPosition.z - uSunPosition.z) / max(-ray.z, 0.03);
    vec2 skyPoint = uCameraPosition.xy + ray.xy * skyDistance;
    float height = skyPoint.y;

    // Continuité C0 et C1 avec le bout du pont (height ≈ 0.40) :
    // - sur les flancs (|x| >= 3.1, y compris la piste 3 voies mobile), le bas
    //   du ciel reste à 100 % dans uFog ;
    // - au centre du pont, la brume du tablier converge vers vec3(0.18, 0.028, 0.025)
    //   à height = 0.40, d'où le ciel et la couronne solaire s'élèvent avec
    //   une pente douce (pow 1.6) jusqu'au disque solaire (bas à height = 2.55).
    float centerBridge = exp(-pow(skyPoint.x / 2.4, 2.0));
    vec3 bridgeTipColor = mix(uFog, vec3(0.18, 0.028, 0.025), centerBridge);
    float rise = pow(smoothstep(0.38, 3.8, height), 1.55);
    float sideRise = pow(smoothstep(1.6, 5.2, height), 1.4);
    float horizonFade = mix(sideRise, rise, exp(-pow(skyPoint.x / 4.2, 2.0)));
    vec3 sky = mix(uHorizon, uCrimson, smoothstep(4.5, 28.0, height));
    sky = mix(sky, uZenith, smoothstep(20.0, 76.0, height));
    sky = mix(bridgeTipColor, sky, horizonFade);

    // Distance angulaire : le soleil reste parfaitement circulaire.
    vec3 toSun = uSunPosition - uCameraPosition;
    vec3 sunDirection = normalize(toSun);
    float sunR = 2.0 * sin(atan(uSunRadius / length(toSun)) * 0.5);
    float r = length(ray - sunDirection);
    float radial = r / sunR;

    // Couronne solaire radiale à pente nulle en height = 0.40 : aucune marche
    // derrière l'extrémité du pont, ni débordement sur les côtés de la piste 3 voies.
    float coronaEnvelope = pow(smoothstep(0.38, 2.8, height), 1.6)
      * mix(smoothstep(1.8, 4.2, height), 1.0, exp(-pow(skyPoint.x / 3.2, 2.0)));
    float outerBloom = exp(-radial * radial / 6.8) * coronaEnvelope;
    float midCorona = exp(-radial * radial / 1.55) * coronaEnvelope;
    float rimAureole = exp(-max(radial - 0.94, 0.0) * 5.2) * coronaEnvelope;
    sky += uHorizon * (outerBloom * 0.28);
    sky += uGlow * (midCorona * 0.36 + rimAureole * 0.28);

    // Voiles de brume écarlates très doux en altitude.
    vec2 cloudPoint = skyPoint * vec2(0.04, 0.18);
    float clouds = noise(cloudPoint) * 0.65 + noise(cloudPoint * 2.1) * 0.35;
    float cloudMask = smoothstep(0.52, 0.82, clouds) * 0.16
      * smoothstep(13.0, 22.0, height) * (1.0 - smoothstep(42.0, 68.0, height))
      * (1.0 - exp(-radial * radial / 3.5));
    sky = mix(sky, uHorizon * 0.85, cloudMask);

    // Disque solaire HDR anti-aliasé au pixel (fwidth) : l'intensité > 1
    // compense la compression ACES pour garder un cœur ivoire-or éclatant
    // et une base vermillon-corail bien franche.
    float edge = max(fwidth(r) * 1.15, 0.00008);
    float disc = (1.0 - smoothstep(sunR - edge, sunR + edge, r)) * smoothstep(1.1, 2.1, height);
    vec3 sunUp = normalize(vec3(0.0, 1.0, 0.0) - sunDirection * sunDirection.y);

    // Faisceaux de l'Arche (voir README). Ils sont FIGÉS : ce shader ne dépend pas
    // du temps, c'est ce qui permet de n'y toucher jamais après sa création. Ils
    // s'appuient sur l'enveloppe de la couronne, donc ils ne débordent ni derrière
    // le bout du pont ni sur les flancs. uRays = 0 en graphismes baissés.
    if (uRays > 0.001) {
      vec3 sunRight = normalize(cross(sunDirection, sunUp));
      vec3 offset = ray - sunDirection;
      float angle = atan(dot(offset, sunUp), dot(offset, sunRight));
      float spokes = 0.5 + 0.5 * sin(angle * 7.0 + sin(angle * 2.6) * 1.6);
      sky += uGlow * (pow(max(spokes, 0.0), 2.8) * coronaEnvelope * 0.14 * uRays);
    }

    float vertical = dot(ray - sunDirection, sunUp) / sunR;
    float solarHeight = smoothstep(-1.0, 1.0, vertical);
    vec3 sunMid = mix(uSunLower, uSunUpper, 0.52) * 2.15;
    vec3 sunColor = mix(uSunLower * 1.75, sunMid, smoothstep(0.0, 0.55, solarHeight));
    sunColor = mix(sunColor, uSunUpper * 2.85, smoothstep(0.42, 1.0, solarHeight));

    // Légère incandescence centrale et fin voile d'horizon sur le bas du limbe.
    float coreBoost = 1.0 - min(radial * radial, 1.0);
    sunColor *= 0.92 + 0.16 * coreBoost;
    float lowerWisp = smoothstep(0.24, -0.05, solarHeight)
      * (0.5 + 0.5 * sin(skyPoint.y * 5.2 + noise(skyPoint * vec2(0.18, 0.6)) * 2.2));
    sunColor = mix(sunColor, uSunLower * 1.35, lowerWisp * 0.20);

    gl_FragColor = vec4(mix(sky, sunColor, disc), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    // Dithering sous un niveau 8 bits, après conversion : dégradés sans paliers.
    gl_FragColor.rgb += (hash21(gl_FragCoord.xy) - 0.5) / 255.0;
  }
`;

/**
 * Ciel du Château, en un draw call et sans texture externe. Les matrices sont
 * référencées, pas copiées : le cadrage suit les resize et le turbo sans update
 * ni allocation par image. Le shader ne dépend pas du temps.
 *
 * `rays` est la force des faisceaux du soleil (voir README) : elle vient de
 * l'ambiance du terrain et se change à chaud (graphismes baissés).
 */
export function makeInfinitySky(camera, rays = 0) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    depthWrite: false,
    depthTest: false,
    fog: false,
    uniforms: {
      uInverseProjection: { value: camera.projectionMatrixInverse },
      uCameraWorld: { value: camera.matrixWorld },
      uCameraPosition: { value: camera.position },
      uSunPosition: { value: new THREE.Vector3(INFINITY_SUN.x, INFINITY_SUN.elevation, INFINITY_SUN.z) },
      uSunRadius: { value: INFINITY_SUN.radius },
      uFog: { value: new THREE.Color(INFINITY_ATMOSPHERE.fog) },
      uHorizon: { value: new THREE.Color(0xc93822) },
      uCrimson: { value: new THREE.Color(0x4a1222) },
      uZenith: { value: new THREE.Color(INFINITY_ATMOSPHERE.background) },
      uGlow: { value: new THREE.Color(0xff9436) },
      uSunLower: { value: new THREE.Color(0xff4a1c) },
      uSunUpper: { value: new THREE.Color(0xffe89e) },
      uRays: { value: rays },
    },
    vertexShader: SKY_VERTEX,
    fragmentShader: SKY_FRAGMENT,
  }));
  mesh.name = 'infinity-sky';
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  return mesh;
}
