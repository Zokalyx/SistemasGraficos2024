import { WebGLRenderer } from "three";
import Park from "./Park";
import { GUI } from "dat.gui";

export default class Otherland {
    renderer = new WebGLRenderer({ antialias: true });
    park: Park;
    lastTime = 0;
    parameters: any;
    container: HTMLDivElement;

    constructor(container: HTMLDivElement) {
        this.parameters = {
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
            }
        }

        this.renderer.shadowMap.enabled = true;
        this.renderer.toneMappingExposure = 0.1;
        this.park = new Park(this.renderer.domElement);
        this.setupRendering(container);
        this.setupGui();
        this.container = container;
    }

    setupGui() {
        const gui = new GUI();

        gui.add(this.parameters, "timeOfDay", 0, 24).step(0.1).name("Hora del día").onChange(value => {
            this.park.setTimeOfDay(value);
        });
        gui.add(this.parameters, "automaticDay").name("Avanzar hora automáticamente");
        gui.add(this.parameters, "showHelpers").name("Mostrar helpers").onChange(value => {
            this.park.setHelpers(value);
        });
        const flashlightControl = gui.add(this.parameters, "flashlight").name("Linterna").onChange(value => {
            this.park.setFlashlight(value);
        });

        gui.add(this.parameters, "cartFrontCamera").name("Cámara frontal de carrito");
        gui.add(this.parameters, "cartBackCamera").name("Cámara trasera de carrito");
        gui.add(this.parameters, "cartSideCamera").name("Cámara lateral de carrito");
        gui.add(this.parameters, "orbitalCamera").name("Cámara orbital");
        gui.add(this.parameters, "orbitalRollercoasterCamera").name("Cámara orbital de montaña rusa");
        gui.add(this.parameters, "orbitalChairsCamera").name("Cámara orbital de sillas giradoras");
        gui.add(this.parameters, "firstPersonCamera").name("Cámara en primera persona");

        this.park.setTimeOfDay(this.parameters.timeOfDay);
        this.park.setHelpers(this.parameters.showHelpers);
        this.park.setFlashlight(this.parameters.flashlight);

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
        this.park.update(time / 1000, timeDelta, this.parameters.automaticDay);
    }
}