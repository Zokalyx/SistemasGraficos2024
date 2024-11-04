import { BoxGeometry, CylinderGeometry, Group, Matrix4, Mesh, MeshPhongMaterial, Scene, Vector3 } from "three";
import { BufferGeometryUtils } from "three/examples/jsm/Addons.js";

export default class SpinningChairs {
    group = new Group();
    spinningPart = new Group();
    mainPole: Mesh;
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

        this.createSpinningPart();
        this.spinningPart.position.setY(height);

        this.load(scene);
    }

    update(timeDelta: number) {
        this.time += timeDelta;
        this.rotationSpeed = Math.cos(this.time / 2) + 1;
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
        this.group.add(this.mainPole);
        this.group.add(this.spinningPart);

        scene.add(this.group);
    }
}