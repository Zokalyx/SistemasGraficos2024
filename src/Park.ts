import { AudioListener, AxesHelper, BoxGeometry, CameraHelper, Color, CylinderGeometry, DirectionalLight, Fog, GridHelper, Group, HemisphereLight, IUniform, Light, Mesh, MeshBasicMaterial, MeshPhongMaterial, MeshPhysicalMaterial, PerspectiveCamera, PointLight, Scene, SphereGeometry, SpotLight, Vector3, WebGLRenderer } from "three";
import { FirstPersonControls, FontLoader, OrbitControls, Sky, TextGeometry } from "three/examples/jsm/Addons.js";
import Rollercoaster from "./Rollercoaster";
import SpinningChairs from "./SpinningChairs";
import Ground from "./Ground";
import fontUrl from "../assets/Lobster_Regular.txt";

export default class Park {
    scene = new Scene();
    camera: PerspectiveCamera;
    rollercoaster: Rollercoaster;
    spinningChairs: SpinningChairs;
    sunLight?: DirectionalLight;
    skySunUniform?: IUniform<any>;
    lampLights: Light[] = [];
    lampBoxMaterial?: MeshPhongMaterial;
    planeHelper?: GridHelper;
    axesHelper?: AxesHelper;
    sunLightHelper?: CameraHelper;
    orbitalCamera: PerspectiveCamera;
    orbitalCameraControls: OrbitControls;
    firstPersonCamera: PerspectiveCamera;
    firstPersonControls: FirstPersonControls;
    targetting: any = null;
    flashlight: SpotLight;

    testObject: Mesh;

    constructor(domElement: HTMLElement, audioListener: AudioListener) {
        const testGeometry = new SphereGeometry();
        const material = new MeshBasicMaterial({ color: 0xffffff });
        this.testObject = new Mesh(testGeometry, material);
        this.scene.add(this.testObject);

        this.scene.fog = new Fog(0x555555, 100, 1000);

        this.rollercoaster = new Rollercoaster(this.scene, audioListener);
        this.rollercoaster.group.position.set(0, 10, 0);

        this.spinningChairs = new SpinningChairs(this.scene);
        this.spinningChairs.group.position.set(40, 0, -40);

        this.scene.add(new Ground().group);

        this.camera = new PerspectiveCamera();
        this.camera.position.set(70, 70, 70);
        this.orbitalCameraControls = new OrbitControls(this.camera, domElement);
        this.orbitalCamera = this.camera;
        this.orbitalCameraControls.target.set(20, 0, 0);
        this.orbitalCameraControls.update();

        this.flashlight = new SpotLight(0xffffff, 20, 0, Math.PI / 10, 0.2, 0.3);
        this.updateFlashLight();
        this.scene.add(this.flashlight);

        this.firstPersonCamera = new PerspectiveCamera();
        this.firstPersonCamera.lookAt(1, 0, 0);
        this.firstPersonCamera.position.set(1, 10, 1);
        const controls = new FirstPersonControls(this.firstPersonCamera, domElement);
        this.firstPersonControls = controls;
        controls.lookSpeed = 0.01;

        this.createLights();
        this.createHelpers();
        this.createSky();
        this.createLamps();

        this.camera.add(audioListener);

        this.createSign();
    }

    createSign() {
        const loader = new FontLoader();
        loader.load(fontUrl, font => {
            const geometry = new TextGeometry("OTHERLAND", {
                font: font,
                size: 4,
                depth: 2,
            });

            const material = new MeshPhysicalMaterial({
                color: 0x049ef4,
                metalness: 0.6,
                roughness: 0.0,
                iridescence: 1.0,
                flatShading: true,
            });
            const mesh = new Mesh(geometry, material);

            mesh.position.set(-5, 0, -15);
            mesh.receiveShadow = true;
            mesh.castShadow = true;

            this.scene.add(mesh);
        });
    }

    setFlashlight(value: boolean) {
        this.flashlight.intensity = value ? 20 : 0;
    }

    updateFlashLight() {
        const pointAt = this.camera.localToWorld(new Vector3(0, 0, -10));
        this.testObject.position.copy(pointAt);
        this.flashlight.position.copy(this.camera.position);
        this.flashlight.target = this.testObject;
    }

    setCamera(camera: PerspectiveCamera, aspect: number) {
        const listener = this.camera.children.find(child => child instanceof AudioListener);
        this.camera.remove(listener!);
        this.camera = camera;
        this.camera.add(listener!);
        this.updateAspect(aspect);
    }

    cycleCamera(aspect: number) {
        switch (this.camera) {
            case this.orbitalCamera:
                if (this.targetting === null) {
                    this.setRollercoasterOrbitalCamera(aspect);
                } else if (this.targetting === this.rollercoaster) {
                    this.setChairsOrbitalCamera(aspect);
                } else if (this.targetting === this.spinningChairs) {
                    this.setFirstPersonCamera(aspect);
                }
                break;
            case this.firstPersonCamera:
                this.setChairCamera(aspect);
                break;
            case this.rollercoaster.cartBackCamera:
                this.setCartSideCamera(aspect);
                break;
            case this.rollercoaster.cartFrontCamera:
                this.setCartBackCamera(aspect);
                break;
            case this.rollercoaster.cartSideCamera:
                this.setOrbitalCamera(aspect);
                break;
            case this.spinningChairs.camera:
                this.setCartFrontCamera(aspect);
                break;
        }
    }

    setChairCamera(aspect: number) {
        this.setCamera(this.spinningChairs.camera!, aspect);
    }

    setCartFrontCamera(aspect: number) {
        this.setCamera(this.rollercoaster.cartFrontCamera!, aspect);
    }

    setCartBackCamera(aspect: number) {
        this.setCamera(this.rollercoaster.cartBackCamera!, aspect);
    }

    setOrbitalCamera(aspect: number) {
        this.setCamera(this.orbitalCamera, aspect);
        this.orbitalCameraControls.target.set(20, 0, 0);
        this.targetting = null;
        this.orbitalCameraControls.update();
    }

    setRollercoasterOrbitalCamera(aspect: number) {
        this.setCamera(this.orbitalCamera, aspect);
        // const position = this.rollercoaster.group.position;
        this.orbitalCameraControls.target.set(-10, 10, 10);
        this.targetting = this.rollercoaster;
        this.orbitalCameraControls.update();
    }

    setChairsOrbitalCamera(aspect: number) {
        this.setCamera(this.orbitalCamera, aspect);
        const position = this.spinningChairs.group.position;
        this.targetting = this.spinningChairs;
        this.orbitalCameraControls.target.set(position.x, position.y, position.z);
        this.orbitalCameraControls.update();
    }

    setCartSideCamera(aspect: number) {
        this.setCamera(this.rollercoaster.cartSideCamera!, aspect);
    }

    setFirstPersonCamera(aspect: number) {
        this.setCamera(this.firstPersonCamera, aspect);
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
        this.sunLightHelper = sunlightShadowHelper;

        const hemisphereLight = new HemisphereLight(0xaaaaff, 0xaaffaa, 0.5);
        this.scene.add(hemisphereLight);
    }

    createLamps() {
        const height = 7;
        const radius = 0.5;

        const poleLightGroup = new Group();
        const poleLight = new PointLight(0xffffaa, 0, 0, 1);
        // const poleLightHelper = new PointLightHelper(poleLight);
        // poleLightGroup.add(poleLightHelper);
        poleLightGroup.add(poleLight);

        const poleBoxMaterial = new MeshPhongMaterial({ emissive: 0xffffaa, emissiveIntensity: 0 });
        this.lampBoxMaterial = poleBoxMaterial;
        const poleBoxGeometry = new BoxGeometry(radius * 2, radius * 2, radius * 2);
        const poleBox = new Mesh(poleBoxGeometry, poleBoxMaterial);
        poleLightGroup.add(poleBox);

        poleLightGroup.position.set(0, height + radius, 0);

        const poleMaterial = new MeshPhongMaterial({ color: 0x666666 });
        const poleGeometry = new CylinderGeometry(radius, radius, height);
        const poleMesh = new Mesh(poleGeometry, poleMaterial);
        poleMesh.position.setY(height / 2);
        poleMesh.castShadow = true;
        poleMesh.receiveShadow = true;

        const poleBaseGeometry = new CylinderGeometry(radius * 2, radius * 3, radius);
        const poleBase = new Mesh(poleBaseGeometry, poleMaterial);
        poleBase.castShadow = true;
        poleBase.receiveShadow = true;

        const lamp = new Group();
        lamp.add(poleLightGroup);
        lamp.add(poleMesh);
        lamp.add(poleBase);

        const polePositions = [
            new Vector3(-40, 0, -40),
            new Vector3(20, 0, -20),
            new Vector3(-40, 0, 40),
            new Vector3(40, 0, 40),
            new Vector3(20, 0, 10),
            new Vector3(0, 0, 50),
            new Vector3(-50, 0, 0),
            new Vector3(0, 0, -50),
            new Vector3(50, 0, 10),
            new Vector3(50, 0, -10),
        ];
        for (const polePosition of polePositions) {
            const poleInstance = lamp.clone();
            poleInstance.position.set(polePosition.x, polePosition.y, polePosition.z);
            this.scene.add(poleInstance);

            // Agregar la luz al array
            const instanceLight = poleInstance.children[0].children.find(
                (child) => child instanceof PointLight
            );
            if (instanceLight) this.lampLights.push(instanceLight);
        }
    }

    setHelpers(value: boolean) {
        this.planeHelper!.visible = value;
        this.axesHelper!.visible = value;
        this.sunLightHelper!.visible = value;
        this.rollercoaster.setHelpers(value);
        this.testObject.visible = false;
    }

    createHelpers() {
        const planeHelper = new GridHelper(100);
        this.planeHelper = planeHelper;
        this.scene.add(planeHelper);

        const axisHelper = new AxesHelper(10);
        this.axesHelper = axisHelper;
        this.scene.add(axisHelper);
    }

    updateAspect(aspect: number) {
        this.camera.aspect = aspect;
        this.camera.updateProjectionMatrix();
        this.firstPersonControls.handleResize();
    }

    setTimeOfDay(time: number) {
        if (!this.sunLight) {
            return;
        }

        const angularTime = 2 * Math.PI * time / 24;

        const dawn = 6;
        const dusk = 18;
        const isDay = time >= dawn && time < dusk;

        const dayTime = time - dawn;
        const angularDayTime = 2 * Math.PI * dayTime / 24;

        const nightTime = time - dusk;
        const angularNightTime = 2 * Math.PI * nightTime / 24;

        this.sunLight.position.set(80 * Math.sin(angularTime), -80 * Math.cos(angularTime), 30);
        this.sunLight.intensity = isDay ? Math.sin(angularDayTime) : 0;
        this.skySunUniform!.value.copy(this.sunLight.position);

        for (const lampLight of this.lampLights) {
            lampLight.intensity = isDay ? 0 : 20 * Math.sin(angularNightTime);
        }
        this.lampBoxMaterial!.emissiveIntensity = isDay ? 0 : Math.sin(angularNightTime);

        const dayColor = new Color(0xcccccc);
        const nightColor = new Color(0x333333);
        const intermediateColor = new Color().lerpColors(dayColor, nightColor, 0.5);
        const mainColor = isDay ? dayColor : nightColor;
        const lerpFactor = Math.pow(isDay ? Math.sin(angularDayTime) : Math.sin(angularNightTime), 0.1);
        this.scene.fog!.color.lerpColors(intermediateColor, mainColor, lerpFactor);
    }

    startAudio() {
        this.rollercoaster.startAudio();
    }

    update(time: number, timeDelta: number, automaticDayTimeUpdate: boolean, cartSpeed: number, chairsSpeed: number) {
        this.rollercoaster.updateCart(timeDelta, cartSpeed);
        this.spinningChairs.update(timeDelta, chairsSpeed);

        if (automaticDayTimeUpdate) {
            if (this.sunLight) {
                const dayTime = time / 3 % 24;
                this.setTimeOfDay(dayTime);
            }
        }

        this.firstPersonControls.update(10 * timeDelta);
        this.firstPersonCamera.position.setY(2);

        this.updateFlashLight();
    }

    render(renderer: WebGLRenderer) {
        if (!this.camera) {
            throw new Error("No hay una cámara activa");
        }
        renderer.render(this.scene, this.camera);
    }
}