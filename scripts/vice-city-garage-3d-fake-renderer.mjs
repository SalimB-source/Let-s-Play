/** Renderer factice : assez pour construire et animer la scène sans GPU. */
export class WebGLRenderer {
  constructor() {
    this.domElement = document.createElement('canvas');
    this.domElement.className = 'city-rush-hub-stage-canvas-element';
    this.shadowMap = { enabled: false, type: 0, autoUpdate: true, needsUpdate: false };
    this.toneMapping = 0;
    this.toneMappingExposure = 1;
    this.outputColorSpace = '';
    this.setPixelRatio = () => {};
    this.setSize = () => {};
    this.render = (scene, camera) => {
      globalThis.__renders = globalThis.__renders || [];
      globalThis.__renders.push({ scene, camera, at: performance.now() });
    };
    this.dispose = () => {};
    this.forceContextLoss = () => {};
    this.getContext = () => null;
    this.capabilities = { isWebGL2: true, getMaxAnisotropy: () => 1 };
    this.extensions = { get: () => null, has: () => false };
    this.info = {
      render: { calls: 0, triangles: 0 },
      memory: { geometries: 0, textures: 0 },
      autoReset: true,
      reset: () => {},
    };
    this.properties = { get: () => undefined, remove: () => {}, update: () => {}, dispose: () => {} };
    this.state = { reset: () => {}, setRenderTarget: () => {}, setScissorTest: () => {} };
    this.allocTextureUnit = () => 0;
    this.setAnimationLoop = () => {};
    this.xr = {
      enabled: false,
      isPresenting: false,
      addEventListener() {},
      removeEventListener() {},
      setSession: () => Promise.resolve(),
    };
  }
}
