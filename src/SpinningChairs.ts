import { BoxGeometry, CircleGeometry, CylinderGeometry, Group, Matrix4, Mesh, MeshPhongMaterial, PointLight, Scene, SphereGeometry, TextureLoader, Vector3 } from "three";
import { BufferGeometryUtils } from "three/examples/jsm/Addons.js";
import spiralUrl from "../assets/spiral.jpg";

export default class SpinningChairs {
    group = new Group();
    spinningPart = new Group();
    mainPole: Mesh;
    support: Mesh;
    chairs: Group[] = [];
    rotationSpeed = 0;
    rotationAngle = 0;
    time = 0;

    constructor(scene: Scene) {
        const height = 20;

        const mainPoleMaterial = new MeshPhongMaterial({ color: 0xaaaaaa });
        const mainPoleGeometry = new CylinderGeometry(2, 2, height);
        this.mainPole = new Mesh(mainPoleGeometry, mainPoleMaterial);
        this.mainPole.position.setY(height / 2);
        this.mainPole.castShadow = true;
        this.mainPole.receiveShadow = true;

        const supportMaterial = new MeshPhongMaterial({ color: 0x6688aa });
        const supportGeometry = new CylinderGeometry(2.5, 5, height / 3);
        this.support = new Mesh(supportGeometry, supportMaterial);
        this.support.receiveShadow = true;
        this.support.castShadow = true;

        this.createSpinningPart();
        this.spinningPart.position.setY(height);

        this.load(scene);
    }

    update(timeDelta: number) {
        this.time += timeDelta;
        this.rotationSpeed = 1.5 * (Math.cos(this.time / 2) + 1);
        this.rotationAngle += this.rotationSpeed * timeDelta;
        this.spinningPart.setRotationFromAxisAngle(new Vector3(0, 1, 0), this.rotationAngle);
        this.positionChairs();
    }

    createSpinningPart() {
        // Crea todo lo que rota, incluyendo el techo y todas las sillas
        const roofPoleMaterial = new MeshPhongMaterial({ color: 0x123456 });
        const roofPoleGeometryPart1 = new CylinderGeometry(15, 15, 2);
        const roofPoleGeometryPart2 = new CylinderGeometry(15, 0, 2);
        roofPoleGeometryPart2.applyMatrix4(new Matrix4().makeTranslation(0, -2, 0));
        const roofPoleGeometry = BufferGeometryUtils.mergeGeometries([roofPoleGeometryPart1, roofPoleGeometryPart2]);
        const roofPole = new Mesh(roofPoleGeometry, roofPoleMaterial);
        roofPole.receiveShadow = true;
        roofPole.castShadow = true;
        this.spinningPart.add(roofPole);

        const topSpiralGeometry = new CircleGeometry(15);
        const texture = new TextureLoader().load(spiralUrl);
        const topSpiralMaterial = new MeshPhongMaterial({ map: texture });
        const spiralMesh = new Mesh(topSpiralGeometry, topSpiralMaterial);
        spiralMesh.position.set(0, 1.01, 0);
        spiralMesh.rotateX(-Math.PI / 2);
        this.spinningPart.add(spiralMesh);

        // const light = new PointLight();
        const lightSphereGeometry = new SphereGeometry(0.5);
        const lightSphereMaterial = new MeshPhongMaterial({ emissive: 0xdddd99 });
        const lightSphereMesh = new Mesh(lightSphereGeometry, lightSphereMaterial);
        const lightSphere = new Group();
        // lightSphere.add(light);
        lightSphere.add(lightSphereMesh);

        const n = 7;
        for (let i = 0; i < n; i++) {
            const lightInstance = lightSphere.clone();
            lightInstance.position.set(15 * Math.cos(2 * Math.PI * i / n), 0, 15 * Math.sin(2 * Math.PI * i / n));
            this.spinningPart.add(lightInstance);
        }

        const cableLength = 15;

        const chairSeatGeometry = new BoxGeometry();
        const chairSeatMaterial = new MeshPhongMaterial({ color: 0xffffff });
        const chairSeat = new Mesh(chairSeatGeometry, chairSeatMaterial);
        chairSeat.position.setY(-cableLength);
        chairSeat.receiveShadow = true;
        chairSeat.castShadow = true;

        const chairCableGeometry = new CylinderGeometry(0.1, 0.1, cableLength);
        const chairCableMaterial = new MeshPhongMaterial({ color: 0xffffff });
        const chairCable = new Mesh(chairCableGeometry, chairCableMaterial);
        chairCable.position.setY(-cableLength / 2);
        chairCable.receiveShadow = true;
        chairCable.castShadow = true;

        const baseChair = new Group();
        baseChair.add(chairSeat);
        baseChair.add(chairCable);

        // Sillas
        const chairCount = 20;
        for (let i = 0; i < chairCount; i++) {
            const chair = baseChair.clone()
            // Este array es para luego actualizar la posición individual de las sillas.
            this.chairs.push(chair);
            // Esto es para agregar en la escena
            this.spinningPart.add(chair);
        }

        this.positionChairs();
    }

    positionChairs() {
        const chairCount = this.chairs.length;
        const radius = 10;
        // De esta manera nunca nos pasamos de los 90°.
        const thetaAngle = Math.atan(this.rotationSpeed / 2);
        this.chairs.forEach((chair, index) => {
            const phiAngle = Math.PI * 2 * index / chairCount;

            chair.rotation.set(0, -phiAngle, thetaAngle, "XYZ");

            chair.position.set(radius * Math.cos(phiAngle), 0, radius * Math.sin(phiAngle));
        });
    }

    load(scene: Scene) {
        this.group.add(this.support);
        this.group.add(this.mainPole);
        this.group.add(this.spinningPart);

        scene.add(this.group);
    }
}