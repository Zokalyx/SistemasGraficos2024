import { AxesHelper, BackSide, CameraHelper, CircleGeometry, CylinderGeometry, DirectionalLight, GridHelper, HemisphereLight, Mesh, MeshBasicMaterial, MeshPhongMaterial, PerspectiveCamera, Scene, WebGLRenderer } from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import Rollercoaster from "./Rollercoaster";
import SpinningChairs from "./SpinningChairs";

export default class Park {
    scene = new Scene();
    camera: PerspectiveCamera;
    rollercoaster: Rollercoaster;
    spinningChairs: SpinningChairs;
    sunLight?: DirectionalLight;

    constructor(domElement: HTMLElement) {
        this.rollercoaster = new Rollercoaster(this.scene);
        this.rollercoaster.group.position.set(0, 10, 0);

        this.spinningChairs = new SpinningChairs(this.scene);
        this.spinningChairs.group.position.set(40, 0, -40);

        const groundGeometry = new CircleGeometry(1000);
        const groundMaterial = new MeshPhongMaterial({ color: 0x33ff33 });
        const ground = new Mesh(groundGeometry, groundMaterial);
        ground.rotateX(-Math.PI / 2);
        ground.receiveShadow = true;
        this.scene.add(ground);

        this.camera = new PerspectiveCamera();
        this.camera.position.set(0, 6, 6);
        this.camera.lookAt(0, 0, 0);
        new OrbitControls(this.camera, domElement);

        this.createLights();
        this.createHelpers();
    }

    createLights() {
        const skycubeGeometry = new CylinderGeometry(1000, 1000, 1000);
        const skycubeMaterial = new MeshBasicMaterial({ color: 0x33ddff, side: BackSide });
        const skycube = new Mesh(skycubeGeometry, skycubeMaterial);
        this.scene.add(skycube);

        const sunlight = new DirectionalLight();
        sunlight.position.set(0, 60, 30);
        sunlight.castShadow = true;
        this.scene.add(sunlight);
        this.sunLight = sunlight;

        sunlight.shadow.camera.left = -80;
        sunlight.shadow.camera.right = 80;
        sunlight.shadow.camera.top = 80;
        sunlight.shadow.camera.bottom = -80;
        sunlight.shadow.camera.far = 300;
        sunlight.shadow.bias = -0.0005;
        const sunlightShadowHelper = new CameraHelper(sunlight.shadow.camera);
        this.scene.add(sunlightShadowHelper);

        const hemisphereLight = new HemisphereLight(0xaaaaff, 0xaaffaa, 0.5);
        this.scene.add(hemisphereLight);
    }

    createHelpers() {
        const planeHelper = new GridHelper(100);
        this.scene.add(planeHelper);

        const axisHelper = new AxesHelper(10);
        this.scene.add(axisHelper);
    }

    updateAspect(aspect: number) {
        this.camera.aspect = aspect;
        this.camera.updateProjectionMatrix();
    }

    update(time: number, timeDelta: number) {
        this.rollercoaster.updateCart(timeDelta);
        this.spinningChairs.update(timeDelta);

        if (this.sunLight) {
            const dayTime = time / 2;
            this.sunLight.position.set(80 * Math.cos(dayTime), 80 * Math.sin(dayTime), 30);
            this.sunLight.intensity = Math.sin(dayTime) > 0 ? Math.sin(dayTime) : 0;
        }
    }

    render(renderer: WebGLRenderer) {
        if (!this.camera) {
            throw new Error("No hay una cámara activa");
        }
        renderer.render(this.scene, this.camera);
    }
}