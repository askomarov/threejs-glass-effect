import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import vertexShader from "./shaders/vertexShader.glsl";
import fragmentShader from "./shaders/fragmentShader.glsl";
import fragmentQuad from "./shaders/fragmentQuad.glsl";
import model from "./parrot.glb";
import modelTexture from "./model.jpg";
import grainTexture from "./grain.jpg";
import VirtualScroll from "virtual-scroll";
const scroller = new VirtualScroll();

class Sketch {
  constructor(containerId) {
    this.container = document.getElementById(containerId);

    // Основные параметры
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;

    this.mousePos = new THREE.Vector2(0, 0);
    this.target = new THREE.Vector2(0, 0);
    this.scene = this.createScene();
    this.scene.background = new THREE.Color(0xffffff);
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();

    this.gltf = new GLTFLoader();

    this.controls = this.addOrbitControls();
    this.material;

    // this.cube = this.createCube();
    this.clock;
    this.modelMixer;
    this.mouseEvents();

    this.initFinalScene();
    // Запускаем инициализацию
    this.init();
  }

  async init() {
    this.clock = new THREE.Clock();
    // Добавляем объекты на сцену
    this.addObjects();

    // Обработчики событий
    this.addEventListeners();

    // Добавляем освещение
    this.addLight();

    // Запуск анимации
    this.animate();
  }

  initFinalScene() {
    this.finalScene = new THREE.Scene();
    this.finalScene.background = new THREE.Color(0x686868);
    this.finalCamera = new THREE.OrthographicCamera(
      -1 * this.camera.aspect,
      1 * this.camera.aspect,
      1,
      -1,
      -100,
      100
    );

    this.materialQuad = new THREE.ShaderMaterial({
      extensions: {
        derivatives: "extension GL_OES_standard_derivatives : enable",
      },
      side: THREE.DoubleSide,
      uniforms: {
        time: { value: 0 },
        uTexture: { value: null },
        uGrain: { value: new THREE.TextureLoader().load(grainTexture) },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      fragmentShader: fragmentQuad,
      vertexShader: vertexShader,
    });

    this.dummy = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      this.materialQuad
    );

    this.blackBg = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 10),
      new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    this.blackBg.position.z = -1;
    this.finalScene.add(this.blackBg);
    this.finalScene.add(this.dummy);

    // scroller.on(event => {
    //   this.finalScene.position.y = event.y/1000;
    // })
  }
  // Создание сцены
  createScene() {
    const scene = new THREE.Scene();
    // scene.background = new THREE.Color(0x686868);
    return scene;
  }

  // Создание камеры
  createCamera() {
    const fov = 75;
    const aspect = this.width / this.height;
    const near = 0.1;
    const far = 1000;
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(-2, 0, 2);
    return camera;
  }

  // Создание рендера
  createRenderer() {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setSize(this.width, this.height);

    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    if (this.container) {
      this.container.appendChild(renderer.domElement);
    } else {
      console.error(`Элемент с id "${this.containerId}" не найден.`);
    }

    return renderer;
  }

  addLight() {
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xaa5500);
    this.scene.add(hemiLight);

    // this.scene.fog = new THREE.FogExp2(0x000000, 0.3);
  }

  // Добавление OrbitControls
  addOrbitControls() {
    return new OrbitControls(this.camera, this.renderer.domElement);
  }

  addObjects() {
    // this.scene.add(this.cube);
    this.renderTarget = new THREE.WebGLRenderTarget(this.width, this.height);
    this.material = new THREE.ShaderMaterial({
      extensions: {
        derivatives: "extension GL_OES_standard_derivatives : enable",
      },
      side: THREE.DoubleSide,
      uniforms: {
        time: { value: 0 },
        uTexture: { value: new THREE.TextureLoader().load(modelTexture) },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      fragmentShader: fragmentShader,
      vertexShader: vertexShader,
    });

    this.gltf.load(model, (obj) => {
      const model = obj.scene;
      let mesh = obj.scene.children[0];
      mesh.position.set(0, 0, 0);
      mesh.scale.set(0.05, 0.05, 0.05);
      this.scene.add(mesh);

      this.modelMixer = new THREE.AnimationMixer(mesh);
      const flyAnimation = this.modelMixer.clipAction(obj.animations[0]);
      flyAnimation.play();
    });
  }

  // Обработчик изменения размеров окна
  onWindowResize() {
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;

    this.renderer.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
  }

  onMouseMove(evt) {
    this.mousePos.x = ((evt.clientX / this.width) * 2 - 1) / 2;
    this.mousePos.y = (-(evt.clientY / this.height) * 2 + 1) / 2;
  }

  mouseEvents() {}

  initPostProcessing() {}

  // Добавление обработчиков событий
  addEventListeners() {
    window.addEventListener("resize", this.onWindowResize.bind(this));

    window.addEventListener("mousemove", this.onMouseMove.bind(this), false);
  }

  // Анимация
  animate() {
    requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();
    if (this.modelMixer) {
      this.modelMixer.update(delta);
    }

    // this.material.uniforms.time.value = delta;
    this.controls.update();
    this.materialQuad.uniforms.uTexture.value = this.renderTarget.texture;
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.finalScene, this.finalCamera);

    this.target.lerp(this.mousePos, 0.1);
    this.finalScene.position.y = this.target.y / 5;
    this.finalScene.position.x = this.target.x / 5;

    this.scene.position.y = -this.target.y / 3;
    this.scene.position.x = -this.target.x / 3;
  }
}

// Запуск инициализации, передаем id элемента
export default Sketch;

// Чтобы запустить, просто нужно создать экземпляр класса
// const sketch = new Sketch('canvas');
