import { AudioListener, WebGLRenderer } from "three";
import Park from "./Park";
import { GUI } from "dat.gui";
import Stats from "three/examples/jsm/libs/stats.module.js";

export default class Otherland {
    renderer = new WebGLRenderer({ antialias: true });
    park: Park;
    lastTime = 0;
    parameters: any;
    container: HTMLDivElement;
    audioListener: AudioListener;
    audioRunning: boolean = false;
    stats: Stats;

    constructor(container: HTMLDivElement) {
        this.stats = new Stats;
        document.body.append(this.stats.dom);

        this.audioListener = new AudioListener();

        this.parameters = {
            mute: true,
            cartSpeed: 1,
            chairsSpeed: 1,
            volume: 50,
            timeOfDay: 0,
            automaticDay: true,
            showHelpers: false,
            flashlight: false,
            cartFrontCamera: () => {
                this.park.setCartFrontCamera(container.offsetWidth / container.offsetHeight);
            },
            cartBackCamera: () => {
                this.park.setCartBackCamera(container.offsetWidth / container.offsetHeight);
            },
            cartSideCamera: () => {
                this.park.setCartSideCamera(container.offsetWidth / container.offsetHeight);
            },
            orbitalCamera: () => {
                this.park.setOrbitalCamera(container.offsetWidth / container.offsetHeight);
            },
            orbitalRollercoasterCamera: () => {
                this.park.setRollercoasterOrbitalCamera(container.offsetWidth / container.offsetHeight);
            },
            orbitalChairsCamera: () => {
                this.park.setChairsOrbitalCamera(container.offsetWidth / container.offsetHeight);
            },
            firstPersonCamera: () => {
                this.park.setFirstPersonCamera(container.offsetWidth / container.offsetHeight);
            },
            chairsCamera: () => {
                this.park.setChairCamera(container.offsetWidth / container.offsetHeight);
            }
        }

        this.renderer.shadowMap.enabled = true;
        this.renderer.toneMappingExposure = 0.1;
        this.park = new Park(this.renderer.domElement, this.audioListener);
        this.setupRendering(container);
        this.setupGui();
        this.container = container;
    }

    setupGui() {
        const gui = new GUI();

        const audioFolder = gui.addFolder("Audio");
        const simulationFolder = gui.addFolder("Animación");
        const cameraFolder = gui.addFolder("Cámaras [C]");
        const extrasFolder = gui.addFolder("Extras");

        audioFolder.add(this.parameters, "mute").name("Silenciar").onChange(value => {
            if (!this.audioRunning) {
                this.park.startAudio();
                this.audioRunning = true;
            }
            this.audioListener.setMasterVolume(value ? 0 : this.parameters.volume / 100);
        });
        simulationFolder.add(this.parameters, "cartSpeed", 0, 3).name("Velocidad de carrito");
        simulationFolder.add(this.parameters, "chairsSpeed", 0, 3).name("Velocidad de las sillas");
        audioFolder.add(this.parameters, "volume", 0, 100).name("Volumen").onChange(value => {
            this.audioListener.setMasterVolume(this.parameters.mute ? 0 : value / 100);
        });

        simulationFolder.add(this.parameters, "timeOfDay", 0, 24).step(0.1).name("Hora del día").onChange(value => {
            this.park.setTimeOfDay(value);
        });
        simulationFolder.add(this.parameters, "automaticDay").name("Avanzar hora automáticamente");
        extrasFolder.add(this.parameters, "showHelpers").name("Mostrar helpers").onChange(value => {
            this.park.setHelpers(value);
        });
        const flashlightControl = extrasFolder.add(this.parameters, "flashlight").name("Linterna [L]").onChange(value => {
            this.park.setFlashlight(value);
        });

        cameraFolder.add(this.parameters, "cartFrontCamera").name("Cámara frontal de carrito");
        cameraFolder.add(this.parameters, "cartBackCamera").name("Cámara trasera de carrito");
        cameraFolder.add(this.parameters, "cartSideCamera").name("Cámara lateral de carrito");
        cameraFolder.add(this.parameters, "orbitalCamera").name("Cámara orbital");
        cameraFolder.add(this.parameters, "orbitalRollercoasterCamera").name("Cámara orbital de montaña rusa");
        cameraFolder.add(this.parameters, "orbitalChairsCamera").name("Cámara orbital de sillas giradoras");
        cameraFolder.add(this.parameters, "firstPersonCamera").name("Cámara en primera persona");
        cameraFolder.add(this.parameters, "chairsCamera").name("Cámara de silla voladora");

        this.park.setTimeOfDay(this.parameters.timeOfDay);
        this.park.setHelpers(this.parameters.showHelpers);
        this.park.setFlashlight(this.parameters.flashlight);
        this.audioListener.setMasterVolume(this.parameters.mute ? 0 : this.parameters.volume / 100);

        document.addEventListener("keydown", event => {
            if (event.key === "c") {
                this.park.cycleCamera(this.container.offsetWidth / this.container.offsetHeight);
            } else if (event.key === "l") {
                this.parameters.flashlight = !this.parameters.flashlight;
                this.park.setFlashlight(this.parameters.flashlight);
                flashlightControl.updateDisplay();
            }
        });
    }

    setupRendering(container: HTMLDivElement) {
        container.append(this.renderer.domElement);
        this.resize(container);
        window.addEventListener("resize", () => { this.resize(container) });
        this.renderer.setAnimationLoop(this.animate);
    }

    resize = (container: HTMLDivElement) => {
        this.park.updateAspect(container.offsetWidth / container.offsetHeight);
        this.renderer.setSize(container.offsetWidth, container.offsetHeight);
    }

    animate = (time: number) => {
        const timeDelta = (time - this.lastTime) / 1000;
        this.lastTime = time;

        this.park.render(this.renderer);
        this.park.update(time / 1000, timeDelta, this.parameters.automaticDay, this.parameters.cartSpeed, this.parameters.chairsSpeed);

        this.stats.update();
    }
}