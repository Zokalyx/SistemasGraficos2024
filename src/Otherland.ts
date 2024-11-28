import { AudioListener, WebGLRenderer } from "three";
import Park from "./Park";
import { GUI } from "dat.gui";
import Stats from "three/examples/jsm/libs/stats.module.js";

/*
    Maneja el flujo de todo el programa
*/
export default class Otherland {
    audioListener: AudioListener;
    audioRunning: boolean = false;

    park: Park;

    renderer = new WebGLRenderer({ antialias: true });
    container: HTMLDivElement;
    lastFrameTime = 0;

    stats: Stats;
    guiParameters: any;

    constructor(container: HTMLDivElement) {
        this.audioListener = new AudioListener();

        this.park = new Park(this.renderer.domElement, this.audioListener);

        this.container = container;
        this.setupRendering(container);

        this.stats = new Stats;
        document.body.append(this.stats.dom);

        this.guiParameters = this.createGuiParameters(container);
        this.setupGui();
    }

    createGuiParameters(container: HTMLDivElement) {
        return {
            mute: true,
            cartSpeed: 1,
            chairsSpeed: 1,
            volume: 50,
            timeOfDay: 0,
            timeOfDaySpeed: 1,
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
        };
    }

    setupGui() {
        const gui = new GUI();

        const audioFolder = gui.addFolder("Audio");
        const simulationFolder = gui.addFolder("Animación");
        const cameraFolder = gui.addFolder("Cámaras [C]");
        const extrasFolder = gui.addFolder("Extras");

        audioFolder.add(this.guiParameters, "mute").name("Silenciar").onChange(value => {
            if (!this.audioRunning) {
                this.park.startAudio();
                this.audioRunning = true;
            }
            this.audioListener.setMasterVolume(value ? 0 : this.guiParameters.volume / 100);
        });
        simulationFolder.add(this.guiParameters, "cartSpeed", 0, 3).name("Velocidad de carrito");
        simulationFolder.add(this.guiParameters, "chairsSpeed", 0, 3).name("Velocidad de las sillas");
        audioFolder.add(this.guiParameters, "volume", 0, 100).name("Volumen").onChange(value => {
            this.audioListener.setMasterVolume(this.guiParameters.mute ? 0 : value / 100);
        });

        simulationFolder.add(this.guiParameters, "timeOfDaySpeed", 0, 3).name("Velocidad del día").onChange(value => {
            this.park.setDayCycleSpeed(value);
        })
        simulationFolder.add(this.guiParameters, "timeOfDay", 0, 24).step(0.1).name("Hora del día").onChange(value => {
            this.park.setTimeOfDay(value);
        });
        simulationFolder.add(this.guiParameters, "automaticDay").name("Avanzar hora automáticamente");
        extrasFolder.add(this.guiParameters, "showHelpers").name("Mostrar helpers").onChange(value => {
            this.park.setHelpers(value);
        });
        const flashlightControl = extrasFolder.add(this.guiParameters, "flashlight").name("Linterna [L]").onChange(value => {
            this.park.setFlashlight(value);
        });

        cameraFolder.add(this.guiParameters, "cartFrontCamera").name("Cámara frontal de carrito");
        cameraFolder.add(this.guiParameters, "cartBackCamera").name("Cámara trasera de carrito");
        cameraFolder.add(this.guiParameters, "cartSideCamera").name("Cámara lateral de carrito");
        cameraFolder.add(this.guiParameters, "orbitalCamera").name("Cámara orbital");
        cameraFolder.add(this.guiParameters, "orbitalRollercoasterCamera").name("Cámara orbital de montaña rusa");
        cameraFolder.add(this.guiParameters, "orbitalChairsCamera").name("Cámara orbital de sillas giradoras");
        cameraFolder.add(this.guiParameters, "firstPersonCamera").name("Cámara en primera persona");
        cameraFolder.add(this.guiParameters, "chairsCamera").name("Cámara de silla voladora");

        this.park.setTimeOfDay(this.guiParameters.timeOfDay);
        this.park.setHelpers(this.guiParameters.showHelpers);
        this.park.setFlashlight(this.guiParameters.flashlight);
        this.audioListener.setMasterVolume(this.guiParameters.mute ? 0 : this.guiParameters.volume / 100);

        document.addEventListener("keydown", event => {
            if (event.key === "c") {
                this.park.cycleCamera(this.container.offsetWidth / this.container.offsetHeight);
            } else if (event.key === "l") {
                this.guiParameters.flashlight = !this.guiParameters.flashlight;
                this.park.setFlashlight(this.guiParameters.flashlight);
                flashlightControl.updateDisplay();
            }
        });
    }

    setupRendering(container: HTMLDivElement) {
        this.renderer.shadowMap.enabled = true;
        this.renderer.toneMappingExposure = 0.1;
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
        const timeDelta = (time - this.lastFrameTime) / 1000;
        this.lastFrameTime = time;

        this.park.render(this.renderer);
        this.park.update(timeDelta, this.guiParameters.automaticDay, this.guiParameters.cartSpeed, this.guiParameters.chairsSpeed);

        this.stats.update();
    }
}