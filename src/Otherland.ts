import { WebGLRenderer } from "three";
import Park from "./Park";

export default class Otherland {
    renderer = new WebGLRenderer({ antialias: true });
    park: Park;
    lastTime = 0;

    constructor(container: HTMLDivElement) {
        this.renderer.shadowMap.enabled = true;
        this.park = new Park(this.renderer.domElement);
        this.setupRendering(container);
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
        this.park.update(time / 1000, timeDelta);
    }
}