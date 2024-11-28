import { Audio, AudioListener, AudioLoader, AxesHelper, BoxGeometry, CameraHelper, Color, CylinderGeometry, DirectionalLight, Fog, GridHelper, Group, HemisphereLight, IUniform, Light, Mesh, MeshBasicMaterial, MeshPhongMaterial, MeshPhysicalMaterial, PerspectiveCamera, PointLight, Scene, SphereGeometry, SpotLight, Vector3, WebGLRenderer } from "three";
import { FirstPersonControls, FontLoader, OrbitControls, Sky, TextGeometry } from "three/examples/jsm/Addons.js";
import Rollercoaster from "./Rollercoaster";
import SpinningChairs from "./SpinningChairs";
import Ground from "./Ground";
import fontUrl from "../assets/Lobster_Regular.txt";
import windUrl from "../assets/wind.mp3";

/*
    Contiene la escena del parque de diversiones
*/
export default class Park {
    /* Escena */
    scene = new Scene();

    /* Cámaras propias de esta clase */
    activeCamera: PerspectiveCamera;
    orbitalCamera: PerspectiveCamera;
    orbitalCameraControls: OrbitControls;
    orbitalCameraTarget: any = null;
    firstPersonCamera: PerspectiveCamera;
    firstPersonControls: FirstPersonControls;

    /* Luces y cielo */
    sunLight?: DirectionalLight;
    flashlight: SpotLight;
    lampLights: Light[] = [];
    lampBoxMaterial?: MeshPhongMaterial;
    skySunUniform?: IUniform<any>;
    dayCycleTime: number = 0;
    dayCycleSpeed: number = 0.3333;

    /* Helpers */
    planeHelper?: GridHelper;
    axesHelper?: AxesHelper;
    sunLightHelper?: CameraHelper;
    testObject: Mesh;

    /* Subcomponentes */
    rollercoaster: Rollercoaster;
    spinningChairs: SpinningChairs;

    /* Audio */
    globalSound: Audio;

    constructor(domElement: HTMLElement, audioListener: AudioListener) {
        const testGeometry = new SphereGeometry();
        const material = new MeshBasicMaterial({ color: 0xffffff });
        this.testObject = new Mesh(testGeometry, material);
        this.scene.add(this.testObject);

        this.scene.fog = new Fog(0x555555, 100, 1000);

        // Montaña rusa
        this.rollercoaster = new Rollercoaster(this.scene, audioListener);
        this.rollercoaster.group.position.set(0, 10, 0);

        // Sillas
        this.spinningChairs = new SpinningChairs(this.scene, audioListener);
        this.spinningChairs.group.position.set(40, 0, -40);

        // Piso
        this.scene.add(new Ground().group);

        // Cámara orbital
        this.activeCamera = new PerspectiveCamera();
        this.activeCamera.position.set(70, 70, 70);
        this.orbitalCameraControls = new OrbitControls(this.activeCamera, domElement);
        this.orbitalCamera = this.activeCamera;
        this.orbitalCameraControls.target.set(20, 0, 0);
        this.orbitalCameraControls.update();
        this.activeCamera.add(audioListener);

        // Cámara primer persona
        this.firstPersonCamera = new PerspectiveCamera();
        this.firstPersonCamera.lookAt(1, 0, 0);
        this.firstPersonCamera.position.set(1, 10, 1);
        const controls = new FirstPersonControls(this.firstPersonCamera, domElement);
        this.firstPersonControls = controls;
        controls.lookSpeed = 0.01;

        // Luces y cielo
        this.flashlight = new SpotLight(0xffffff, 20, 0, Math.PI / 10, 0.2, 0.3);
        this.updateFlashLight();
        this.scene.add(this.flashlight);
        this.createLights();
        this.createSky();
        this.createLamps();

        // Helpers
        this.createHelpers();

        // Letras 3D
        this.create3DLetters();

        // Audio
        this.globalSound = new Audio(audioListener);
    }

    create3DLetters() {
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
        const pointAt = this.activeCamera.localToWorld(new Vector3(0, 0, -10));
        this.testObject.position.copy(pointAt);
        this.flashlight.position.copy(this.activeCamera.position);
        this.flashlight.target = this.testObject;
    }

    switchCameraTo(camera: PerspectiveCamera, aspect: number) {
        const listener = this.activeCamera.children.find(child => child instanceof AudioListener);
        this.activeCamera.remove(listener!);
        this.activeCamera = camera;
        this.activeCamera.add(listener!);
        this.updateAspect(aspect);
    }

    cycleCamera(aspect: number) {
        switch (this.activeCamera) {
            case this.orbitalCamera:
                if (this.orbitalCameraTarget === null) {
                    this.setRollercoasterOrbitalCamera(aspect);
                } else if (this.orbitalCameraTarget === this.rollercoaster) {
                    this.setChairsOrbitalCamera(aspect);
                } else if (this.orbitalCameraTarget === this.spinningChairs) {
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
        this.switchCameraTo(this.spinningChairs.camera!, aspect);
    }

    setCartFrontCamera(aspect: number) {
        this.switchCameraTo(this.rollercoaster.cartFrontCamera!, aspect);
    }

    setCartBackCamera(aspect: number) {
        this.switchCameraTo(this.rollercoaster.cartBackCamera!, aspect);
    }

    setOrbitalCamera(aspect: number) {
        this.switchCameraTo(this.orbitalCamera, aspect);
        this.orbitalCameraControls.target.set(20, 0, 0);
        this.orbitalCameraTarget = null;
        this.orbitalCameraControls.update();
    }

    setRollercoasterOrbitalCamera(aspect: number) {
        this.switchCameraTo(this.orbitalCamera, aspect);
        // const position = this.rollercoaster.group.position;
        // Posición hardcodeada para que quede bien centrada la cámara.
        this.orbitalCameraControls.target.set(-10, 10, 10);
        this.orbitalCameraTarget = this.rollercoaster;
        this.orbitalCameraControls.update();
    }

    setChairsOrbitalCamera(aspect: number) {
        this.switchCameraTo(this.orbitalCamera, aspect);
        const position = this.spinningChairs.group.position;
        this.orbitalCameraTarget = this.spinningChairs;
        this.orbitalCameraControls.target.set(position.x, position.y, position.z);
        this.orbitalCameraControls.update();
    }

    setCartSideCamera(aspect: number) {
        this.switchCameraTo(this.rollercoaster.cartSideCamera!, aspect);
    }

    setFirstPersonCamera(aspect: number) {
        this.switchCameraTo(this.firstPersonCamera, aspect);
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
        // Luz solar
        const sunlight = new DirectionalLight();
        sunlight.position.set(0, 60, 30);
        sunlight.castShadow = true;
        this.scene.add(sunlight);
        this.sunLight = sunlight;

        // Sombra de luz solar
        sunlight.shadow.camera.left = -80;
        sunlight.shadow.camera.right = 80;
        sunlight.shadow.camera.top = 80;
        sunlight.shadow.camera.bottom = -80;
        sunlight.shadow.camera.far = 300;
        sunlight.shadow.bias = -0.0005;
        const sunlightShadowHelper = new CameraHelper(sunlight.shadow.camera);
        this.scene.add(sunlightShadowHelper);
        this.sunLightHelper = sunlightShadowHelper;

        // Luz ambiente
        const hemisphereLight = new HemisphereLight(0xaaaaff, 0xaaffaa, 0.5);
        this.scene.add(hemisphereLight);
    }

    createLamps() {
        // Parámetros
        const height = 7;
        const radius = 0.5;

        // Luz en sí
        const poleLight = new PointLight(0xffffaa, 0, 0, 1);

        // Cajita donde está la luz
        const poleBoxMaterial = new MeshPhongMaterial({ emissive: 0xffffaa, emissiveIntensity: 0 });
        this.lampBoxMaterial = poleBoxMaterial;
        const poleBoxGeometry = new BoxGeometry(radius * 2, radius * 2, radius * 2);
        const poleBox = new Mesh(poleBoxGeometry, poleBoxMaterial);

        // Conjunto cajita + luz
        const poleLightGroup = new Group();
        poleLightGroup.add(poleLight);
        poleLightGroup.add(poleBox);
        poleLightGroup.position.set(0, height + radius, 0);

        // Poste en sí
        const poleMaterial = new MeshPhongMaterial({ color: 0x666666 });
        const poleGeometry = new CylinderGeometry(radius, radius, height);
        const poleMesh = new Mesh(poleGeometry, poleMaterial);
        poleMesh.position.setY(height / 2);
        poleMesh.castShadow = true;
        poleMesh.receiveShadow = true;

        // Base del poste
        const poleBaseGeometry = new CylinderGeometry(radius * 2, radius * 3, radius);
        const poleBase = new Mesh(poleBaseGeometry, poleMaterial);
        poleBase.castShadow = true;
        poleBase.receiveShadow = true;

        // Lampara completa
        const lamp = new Group();
        lamp.add(poleLightGroup);
        lamp.add(poleMesh);
        lamp.add(poleBase);

        // Posicionar todo
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
        this.activeCamera.aspect = aspect;
        this.activeCamera.updateProjectionMatrix();
        this.firstPersonControls.handleResize();
    }

    setTimeOfDay(time: number) {
        this.dayCycleTime = time;

        if (!this.sunLight) {
            return;
        }

        // "tiempo angular" sería convertir de 0 a 24 -> 0 a 2pi
        const angularTime = 2 * Math.PI * time / 24;

        // Definir día o noche, amanecer o atardecer
        const dawn = 6;
        const dusk = 18;
        const isDay = time >= dawn && time < dusk;
        const isDawn = Math.abs(time - dawn) < Math.abs(time - dusk);

        // Cuánto tiempo pasó desde el amanecer
        const dayTime = time - dawn;
        const angularDayTime = 2 * Math.PI * dayTime / 24;

        // Cuánto tiempo pasó desde el anochecer
        const nightTime = time - dusk;
        const angularNightTime = 2 * Math.PI * nightTime / 24;

        // Mover el sol
        this.sunLight.position.set(80 * Math.sin(angularTime), -80 * Math.cos(angularTime), 30);
        this.sunLight.intensity = isDay ? Math.sin(angularDayTime) : 0;
        this.skySunUniform!.value.copy(this.sunLight.position);

        // Ajustar lámparas
        for (const lampLight of this.lampLights) {
            lampLight.intensity = isDay ? 0 : 20 * Math.sin(angularNightTime);
        }
        this.lampBoxMaterial!.emissiveIntensity = isDay ? 0 : Math.sin(angularNightTime);

        // Ajustar color de fog
        const dayColor = new Color(0xcccccc);
        const nightColor = new Color(0x333333);
        const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);
        const root = (num: number, power: number) => num > 0 ? Math.pow(num, power) : - Math.pow(-num, power);
        const fogChangeSpeed = 3;
        const lerpFactor = (1 + root(clamp(fogChangeSpeed * (isDawn ? dayTime : -nightTime), -1, 1), 0.3)) / 2;
        this.scene.fog!.color.lerpColors(nightColor, dayColor, lerpFactor);
    }

    setDayCycleSpeed(value: number) {
        this.dayCycleSpeed = value;
    }

    updateAudio() {
        const cameraDistance = this.activeCamera.position.length();
        const volume = Math.min(0.25, 100 / cameraDistance);
        this.globalSound.setVolume(volume);
    }

    startAudio() {
        const audioLoader = new AudioLoader();
        const sound = this.globalSound
        audioLoader.load(windUrl, buffer => {
            sound.setBuffer(buffer);
            sound.setLoop(true);
            sound.setVolume(0.25);
            sound.play();
        });

        this.rollercoaster.startAudio();
        this.spinningChairs.startAudio();
    }

    update(timeDelta: number, automaticDayTimeUpdate: boolean, cartSpeed: number, chairsSpeed: number) {
        this.rollercoaster.updateCart(timeDelta, cartSpeed);
        this.spinningChairs.update(timeDelta, chairsSpeed);

        if (automaticDayTimeUpdate) {
            this.dayCycleTime = (this.dayCycleTime + timeDelta * this.dayCycleSpeed) % 24;
            this.setTimeOfDay(this.dayCycleTime);
        }

        this.firstPersonControls.update(10 * timeDelta);
        this.firstPersonCamera.position.setY(2);

        this.updateFlashLight();

        this.updateAudio();
    }

    render(renderer: WebGLRenderer) {
        if (!this.activeCamera) {
            throw new Error("No hay una cámara activa");
        }
        renderer.render(this.scene, this.activeCamera);
    }
}