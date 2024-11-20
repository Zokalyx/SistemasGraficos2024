import { AxesHelper, CameraHelper, DirectionalLight, GridHelper, HemisphereLight, IUniform, PerspectiveCamera, PointLight, PointLightHelper, Scene, Vector3, WebGLRenderer } from "three";
import { OrbitControls, Sky } from "three/examples/jsm/Addons.js";
import Rollercoaster from "./Rollercoaster";
import SpinningChairs from "./SpinningChairs";
import Ground from "./Ground";

export default class Park {
    scene = new Scene();
    camera: PerspectiveCamera;
    rollercoaster: Rollercoaster;
    spinningChairs: SpinningChairs;
    sunLight?: DirectionalLight;
    skySunUniform?: IUniform<any>;

    constructor(domElement: HTMLElement) {
        this.rollercoaster = new Rollercoaster(this.scene);
        this.rollercoaster.group.position.set(0, 10, 0);

        this.spinningChairs = new SpinningChairs(this.scene);
        this.spinningChairs.group.position.set(40, 0, -40);

        this.scene.add(new Ground().group);

        this.camera = new PerspectiveCamera();
        this.camera.position.set(0, 6, 6);
        this.camera.lookAt(0, 0, 0);
        new OrbitControls(this.camera, domElement);

        this.createLights();
        this.createHelpers();
        this.createSky();
    }

    createSky() {
        const sky = new Sky();
        sky.scale.setScalar(450000);
        this.scene.add(sky);

        const uniforms = sky.material.uniforms;
        uniforms['turbidity'].value = 2;
        uniforms['rayleigh'].value = 0.6;
        uniforms['mieCoefficient'].value = 0.002;
        uniforms['mieDirectionalG'].value = 0.9;

        this.skySunUniform = uniforms["sunPosition"];
    }

    createLights() {
        // const skycubeGeometry = new CylinderGeometry(1000, 1000, 1000);
        // const skycubeMaterial = new MeshBasicMaterial({ color: 0x33ddff, side: BackSide });
        // const skycube = new Mesh(skycubeGeometry, skycubeMaterial);
        // this.scene.add(skycube);

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

        const poleLight = new PointLight(0xffffaa, 15, 0, 1);
        const polePositions = [new Vector3(-50, 10, -50), new Vector3(50, 10, -50), new Vector3(-50, 10, 50), new Vector3(50, 10, 50),];
        for (const polePosition of polePositions) {
            const poleLightInstance = poleLight.clone();
            poleLightInstance.position.set(polePosition.x, polePosition.y, polePosition.z);
            this.scene.add(poleLightInstance);
            const poleLightHelper = new PointLightHelper(poleLightInstance);
            this.scene.add(poleLightHelper);
        }
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
            const dayTime = time / 5;
            this.sunLight.position.set(80 * Math.cos(dayTime), 80 * Math.sin(dayTime), 30);
            this.sunLight.intensity = Math.sin(dayTime) > 0 ? Math.sin(dayTime) : 0;
            this.skySunUniform!.value.copy(this.sunLight.position);
        }
    }

    render(renderer: WebGLRenderer) {
        if (!this.camera) {
            throw new Error("No hay una cámara activa");
        }
        renderer.render(this.scene, this.camera);
    }
}