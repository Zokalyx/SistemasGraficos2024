import { AudioListener, AudioLoader, AxesHelper, BoxGeometry, CameraHelper, CylinderGeometry, DoubleSide, EquirectangularReflectionMapping, Group, Matrix4, Mesh, MeshPhongMaterial, Path, PerspectiveCamera, PositionalAudio, RepeatWrapping, Scene, Shape, ShapeGeometry, SphereGeometry, TextureLoader, Vector3 } from "three";
import { ParametricGeometry, RGBELoader } from "three/examples/jsm/Addons.js";
import CurveWithNormalsAndSpeed from "./CurveWithNormals";
import { HeartCurve } from "three/examples/jsm/curves/CurveExtras.js";
import rustNormalUrl from "../assets/rust_normal.jpg";
import starAlphaUrl from "../assets/star_alpha.jpg";
import starDiffuseUrl from "../assets/star_diffuse.jpg";
// Con vite no se puede importar archivos .hdr fácilmente, pero agregando
// assetsInclude: ["**/*.hdr"] en vite.config.ts funcionó, aunque a typescript
// no le gusta el import.
// @ts-ignore
import reflectionMapUrl from "../assets/limpopo_golf_course_1k.hdr";
import rollercoasterSoundUrl from "../assets/rollercoaster.mp3";

/*
    Contiene la pista de la montaña rusa, el carrito, los soportes y los túneles
*/
export default class Rollercoaster {
    // Todo lo de la pista en sí
    group = new Group();
    rollercoasterPathMesh: Mesh;
    rollercoasterPath: CurveWithNormalsAndSpeed;
    supportingPoles: Group[];

    // Carrito
    cart: Group;
    cartCoordinate = 0;
    cartAudio?: PositionalAudio;

    // Túneles
    tunnels: Mesh[];

    // Cámaras
    cartFrontCamera?: PerspectiveCamera;
    cartBackCamera?: PerspectiveCamera;
    cartSideCamera?: PerspectiveCamera;

    // Helpers
    rollercoasterPathHelpers: AxesHelper[];
    cameraHelpers: CameraHelper[] = [];


    constructor(scene: Scene, audioListener: AudioListener) {
        // Camino de la montaña rusa
        this.rollercoasterPath = new CurveWithNormalsAndSpeed(this.points(), this.normals(), this.speed());
        const geometry = new ParametricGeometry(this.createParametricGeometryFunction(), 100, 400);
        const rgbeLoader = new RGBELoader(); // Para HDR.
        const reflectionMap = rgbeLoader.load(reflectionMapUrl, (texture) => {
            texture.mapping = EquirectangularReflectionMapping;
        });
        const material = new MeshPhongMaterial({ color: 0xfaebcc, shininess: 1000, reflectivity: 0.5, envMap: reflectionMap });
        this.rollercoasterPathMesh = new Mesh(geometry, material);
        this.rollercoasterPathMesh.castShadow = true;
        this.rollercoasterPathMesh.receiveShadow = true;
        this.rollercoasterPathHelpers = this.createHelpers();

        // Carrito
        this.cart = this.createCart(audioListener);
        this.updateCartPosition();
        for (const cartHelper of this.cameraHelpers) {
            scene.add(cartHelper);
        }

        // Cosas extra
        this.tunnels = this.createTunnels();
        this.supportingPoles = this.createPoles();

        // Cargar todo
        this.load(scene);
    }

    load(scene: Scene) {
        this.group.add(this.rollercoasterPathMesh);
        this.group.add(this.cart);
        for (const helper of this.rollercoasterPathHelpers) {
            this.group.add(helper);
        }
        for (const tunnel of this.tunnels) {
            this.group.add(tunnel);
        }
        for (const pole of this.supportingPoles) {
            this.group.add(pole);
        }

        scene.add(this.group);
    }

    createPoles() {
        const poles = [];

        const floorLevel = -12;

        // Material
        const normalTexture = new TextureLoader().load(rustNormalUrl);
        normalTexture.wrapS = RepeatWrapping;
        normalTexture.wrapT = RepeatWrapping;
        const rgbeLoader = new RGBELoader();
        const reflectionMap = rgbeLoader.load(reflectionMapUrl, (texture) => {
            texture.mapping = EquirectangularReflectionMapping;
        });
        const material = new MeshPhongMaterial({ color: 0xAAAAAA, normalMap: normalTexture, shininess: 100, envMap: reflectionMap, reflectivity: 0.5 });

        // Esto evita un corte abrupto de la columna arriba de todo
        const topSphereGeometry = new SphereGeometry(0.5);
        const topSphere = new Mesh(topSphereGeometry, material);

        // Posicionar todo según la coordenada del camino (proporcional a distancia)
        const coordinates = [0, 0.075, 0.15, 0.2, 0.26, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.63, 0.82, 0.85, 0.95];
        for (const coordinate of coordinates) {
            // Ajusto para que el apoyo quede contra la parte de "abajo" de la pista y no se meta dentro del camino.
            const position = this.rollercoasterPath.getPosition(coordinate).sub(new Vector3(0.5, 0, 0).applyMatrix4(this.rollercoasterPath.getRotationMatrix(coordinate)));
            const height = position.y - floorLevel;

            // El soporte en sí
            const geometry = new CylinderGeometry(0.5, 0.5, height);
            for (let i = 0; i < geometry.attributes.uv.count; i++) {
                // Ajustar para que el UV mantenga proporciones reales sin importar la altura del cilindro
                geometry.attributes.uv.setY(i, geometry.attributes.uv.getY(i) * height);
            }
            const cylinderMesh = new Mesh(geometry, material);
            cylinderMesh.castShadow = true;
            cylinderMesh.receiveShadow = true;

            // Todo junto
            const poleGroup = new Group();
            poleGroup.position.set(position.x, position.y - height / 2, position.z);
            poleGroup.add(cylinderMesh);
            const topSphereInstance = topSphere.clone();
            topSphereInstance.position.setY(height / 2);
            poleGroup.add(topSphereInstance);

            poles.push(poleGroup);
        }

        return poles;
    }

    createTunnels() {
        const tunnels = [];

        // Material
        const alphaTexture = new TextureLoader().load(starAlphaUrl);
        const diffuseTexture = new TextureLoader().load(starDiffuseUrl);
        alphaTexture.wrapS = RepeatWrapping;
        alphaTexture.wrapT = RepeatWrapping;
        alphaTexture.repeat.set(5, 5);
        diffuseTexture.wrapS = RepeatWrapping;
        diffuseTexture.wrapT = RepeatWrapping;
        diffuseTexture.repeat.set(5, 5);
        const material = new MeshPhongMaterial({ side: DoubleSide, alphaMap: alphaTexture, transparent: true, alphaTest: 0.5, shininess: 300, map: diffuseTexture });

        // Túnel 1
        const geometry1 = new ParametricGeometry((u: number, v: number, target: Vector3) => {
            // Círculo
            const radius = 2;
            const scaleZ = 3 + 0.75 * Math.cos(6 * Math.PI * v);
            const scaleY = 3 + 0.75 * Math.cos(6 * Math.PI * v + Math.PI / 2);
            target.set(v * 30, scaleY * radius * Math.sin(2 * Math.PI * u), -radius * scaleZ * Math.cos(2 * Math.PI * u));
        }, 100, 100);
        const mesh1 = new Mesh(geometry1, material);
        mesh1.position.set(-15, 10, 45)
        mesh1.rotation.set(0, 0, -0.1);
        mesh1.castShadow = true;
        mesh1.receiveShadow = true;
        tunnels.push(mesh1);

        // Túnel 2
        const curve = new HeartCurve(0.5);
        const geometry2 = new ParametricGeometry((u: number, v: number, target: Vector3) => {
            const x = curve.getPoint(u).x;
            const y = curve.getPoint(u).y;
            const rotationMatrix = new Matrix4().makeRotationZ(2 * Math.PI * v);
            target.set(x, y, v * 25);
            target.applyMatrix4(rotationMatrix);
        }, 100, 100);
        const mesh2 = new Mesh(geometry2, material);
        mesh2.position.set(-19, 0, -23)
        mesh2.rotation.set(0, 0, 0);
        mesh2.castShadow = true;
        mesh2.receiveShadow = true;
        tunnels.push(mesh2);

        return tunnels;
    }

    cartProfile() {
        // Parámetros de un rectángulo redondeado
        // No viene cerrado - se puede cerrar aparte.
        const r = 0.3;
        const h = 1.6 / 2;
        const w = 1.2 / 2;

        const profile = new Path();

        // bottom-right
        profile.moveTo(w, -h + r);
        profile.bezierCurveTo(w, -h, w, -h, w - r, -h);

        // bottom-left
        profile.lineTo(-w + r, -h);
        profile.bezierCurveTo(-w, -h, -w, -h, -w, -h + r);

        // top-left
        profile.lineTo(-w, h - r);
        profile.bezierCurveTo(-w, h, -w, h, -w + r, h);

        // top-right
        profile.lineTo(w - r, h);
        profile.bezierCurveTo(w, h, w, h, w, h - r);

        return profile;
    }

    createCartGeometry() {
        const profile = this.cartProfile();

        // Parte central, sin cerrar, donde entran las sillas
        const mainGeometry = new ParametricGeometry((u, v, target) => {
            const point2D = profile.getPoint(u);
            const point = new Vector3(point2D.x, 2 * v - 1, point2D.y);
            target.set(point.x, point.y, point.z);
        }, 50, 50);

        // Parte "piramidal", con el perfil cerrado
        profile.closePath();
        const frontGeometry = new ParametricGeometry((u, v, target) => {
            const point2D = profile.getPoint(u);
            const factor = 1.0 - v / 3;

            const point = new Vector3(point2D.x * factor, v, point2D.y * factor);
            target.set(point.x, point.y, point.z);
        }, 50, 10);

        // Tapas 2D
        const capGeometry = new ShapeGeometry(new Shape(profile.getPoints()));
        capGeometry.rotateX(Math.PI / 2);
        capGeometry.scale(0.666, 0.666, 0.666);

        return [mainGeometry, frontGeometry, capGeometry];
    }

    createChairMesh() {
        const material = new MeshPhongMaterial({ color: 0x123456 });

        // Asiento
        const seatGeometry = new BoxGeometry(0.2, 0.5, 0.8);
        const seatMesh = new Mesh(seatGeometry, material);

        // Respaldo
        const backGeometry = new BoxGeometry(1.0, 0.2, 0.8);
        const backMesh = new Mesh(backGeometry, material);
        backMesh.position.set(0, -0.3, 0);

        const group = new Group();
        group.add(seatMesh);
        group.add(backMesh);

        return group;
    }

    createCart(audioListener: AudioListener) {
        /* En el carrito, "adelante" es +y y "atrás" es -y */
        /* Arriba es +x */

        // Audio
        const sound = new PositionalAudio(audioListener);
        this.cartAudio = sound;

        const [mainGeometry, frontGeometry, capGeometry] = this.createCartGeometry();
        const material = new MeshPhongMaterial({ color: 0xff0000, side: DoubleSide, shininess: 100, reflectivity: 1 });

        // Parte central
        mainGeometry.applyMatrix4(new Matrix4().makeTranslation(1, 0, 0));
        const mesh = new Mesh(mainGeometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // "Nariz" del carrito
        const frontMesh = new Mesh(frontGeometry, material);
        frontMesh.castShadow = true;
        frontMesh.receiveShadow = true;
        frontMesh.position.set(1, 1, 0);

        // "Cola" del carrito
        const backMesh = new Mesh(frontGeometry, material);
        backMesh.castShadow = true;
        backMesh.receiveShadow = true;
        backMesh.rotateX(Math.PI);
        backMesh.position.set(1, -1, 0);

        // Tapa trasera
        const backCap = new Mesh(capGeometry, material);
        backCap.castShadow = true;
        backMesh.receiveShadow = true;
        backCap.position.set(1, -2, 0);

        // Tapa frontal
        const frontCap = new Mesh(capGeometry, material);
        frontCap.castShadow = true;
        frontCap.receiveShadow = true;
        frontCap.position.set(1, 2, 0);

        // Asientos
        const seat1 = this.createChairMesh();
        seat1.castShadow = true;
        seat1.receiveShadow = true;
        seat1.position.set(1, 0.5, 0);

        const seat2 = this.createChairMesh();
        seat2.castShadow = true;
        seat2.receiveShadow = true;
        seat2.position.set(1, -0.5, 0);

        // Cámara frontal
        const frontCamera = new PerspectiveCamera(90);
        this.cartFrontCamera = frontCamera;
        this.cartFrontCamera.lookAt(0, 1, 0);
        this.cartFrontCamera.position.set(1.5, 2, 0);
        this.cartFrontCamera.rotateZ(-Math.PI / 2);
        this.cartFrontCamera.add(audioListener);

        const frontHelper = new CameraHelper(frontCamera);
        this.cameraHelpers.push(frontHelper);

        // Cámara trasera
        const backCamera = new PerspectiveCamera(90);
        this.cartBackCamera = backCamera;
        this.cartBackCamera.lookAt(0, -1, 0);
        this.cartBackCamera.position.set(1.5, -2, 0);
        this.cartBackCamera.rotateZ(-Math.PI / 2);

        const backHelper = new CameraHelper(backCamera)
        this.cameraHelpers.push(backHelper);

        // Cámara lateral
        const sideCamera = new PerspectiveCamera(90);
        this.cartSideCamera = sideCamera;
        sideCamera.lookAt(-0.5, 0, 1);
        sideCamera.position.set(5, 0, -5);
        sideCamera.rotateZ(Math.PI / 2);

        // Combinar todo
        const cartGroup = new Group();
        cartGroup.add(frontCamera);
        cartGroup.add(backCamera);
        cartGroup.add(sideCamera);
        cartGroup.add(sound);
        cartGroup.add(mesh);
        cartGroup.add(frontMesh);
        cartGroup.add(backMesh);
        cartGroup.add(backCap);
        cartGroup.add(frontCap);
        cartGroup.add(seat1);
        cartGroup.add(seat2);

        return cartGroup;
    }

    startAudio() {
        const audioLoader = new AudioLoader();
        const sound = this.cartAudio!;
        audioLoader.load(rollercoasterSoundUrl, buffer => {
            sound.setBuffer(buffer);
            sound.setLoop(true);
            sound.setRefDistance(5);
            sound.play();
        });
    }

    updateCart(timeDelta: number, externalSpeed: number) {
        const speed = this.rollercoasterPath.getSpeed(this.cartCoordinate);
        const playbackSpeed = Math.pow(speed, 0.3) + 1.2;
        this.cartAudio!.setPlaybackRate(playbackSpeed);
        this.cartAudio!.setVolume(speed + 0.2);
        this.cartCoordinate = (this.cartCoordinate + speed * externalSpeed * timeDelta) % 1;
        this.updateCartPosition();
    }

    updateCartPosition() {
        const positionMatrix = this.rollercoasterPath.getTranslationMatrix(this.cartCoordinate);
        const rotationMatrix = this.rollercoasterPath.getRotationMatrix(this.cartCoordinate);

        this.cart.position.set(0, 0, 0);
        this.cart.position.applyMatrix4(positionMatrix);
        this.cart.rotation.setFromRotationMatrix(rotationMatrix);
    }

    rollercoasterProfile() {
        // Basado en el enunciado del TP (aproximado)
        const curve = new Path();
        curve.moveTo(-0.9, 0.5);
        curve.lineTo(-0.9, 0.3);
        curve.bezierCurveTo(-0.45, 0.3, -0.45, 0.1, 0, 0.1);
        curve.bezierCurveTo(0.45, 0.1, 0.45, 0.3, 0.9, 0.3);
        curve.lineTo(0.9, 0.5);
        curve.bezierCurveTo(1, 0.5, 1, 0.5, 1, 0.4);
        curve.lineTo(1, 0.1);
        curve.bezierCurveTo(1, 0, 1, 0, 0.9, -0.1);
        curve.bezierCurveTo(0.5, -0.2, 0.5, -0.7, 0, -0.7);
        curve.bezierCurveTo(-0.5, -0.7, -0.5, -0.2, -0.9, -0.1);
        curve.bezierCurveTo(-1, 0, -1, 0, -1, 0.1);
        curve.lineTo(-1, 0.4);
        curve.bezierCurveTo(-1, 0.5, -1, 0.5, -0.9, 0.5);
        curve.closePath();
        return curve;
    }

    speed() {
        return [
            // 1-5: Comienzo y primera mitad de loop
            0.3,
            0.75,
            0.5,
            0.5,
            0.5, // parte más alta de loop

            // 6-10: Segunda parte de primer loop
            0.5,
            0.9,
            1.2,
            1.5,
            1.8,

            // 11-15: Parte más recta de todas
            2.4,
            3,
            3,
            2.4,
            2,

            // 16-20: Parte recta pero empieza a curvar
            1.8,
            1.7,
            1.6,
            1.5,
            1.4,

            // 21-25: Loop horizontal
            1.3,
            1.1,
            1,
            1,
            1,

            // 26-30: Empieza a subir
            0.9,
            0.9,
            0.8,
            0.8, // Parte más alta de toda
            1,

            // 31-35: Baja y empieza a darse vuelta
            1.5,
            2,
            2.5,
            2,
            1.5,

            // 36-40: Vueltita final
            1.5,
            1.5,
            1.5,
            1.5,
            1.5,

            // Termina
            1.3,
            1.1,
            0.9,
            0.5,
        ].map(speed => speed * 0.05);
    }

    points() {
        return [
            // 1-5: Comienzo y primera mitad de loop
            new Vector3(0, 0, 0),
            new Vector3(0, 0, 15),
            new Vector3(5, 3, 20),
            new Vector3(10, 7, 25),
            new Vector3(20, 12, 18), // parte más alta de loop

            // 6-10: Segunda parte de primer loop
            new Vector3(22, 15, 15),
            new Vector3(20, 19, 14),
            new Vector3(17, 20, 13),
            new Vector3(14, 17, 10),
            new Vector3(15, 10, 10),

            // 11-15: Parte más recta de todas
            new Vector3(18, 5, 14),
            new Vector3(22, 3, 17),
            new Vector3(25, 3, 30),
            new Vector3(20, 4, 40),
            new Vector3(10, 6, 45),

            // 16-20: Parte recta pero empieza a curvar
            new Vector3(-20, 8, 45),
            new Vector3(-40, 10, 30),
            new Vector3(-40, 12, 10),
            new Vector3(-22, 10, 8),
            new Vector3(-10, 8, 20),

            // 21-25: Loop horizontal
            new Vector3(-20, 6, 30),
            new Vector3(-32, 4, 22),
            new Vector3(-40, 2, 10),
            new Vector3(-40, 4, 0),
            new Vector3(-38, 8, -5),

            // 26-30: Empieza a subir
            new Vector3(-37, 15, -6),
            new Vector3(-35, 30, -3),
            new Vector3(-25, 40, 5),
            new Vector3(-24, 42, 10), // Parte más alta de toda
            new Vector3(-23, 39, 15),

            // 31-35: Baja y empieza a darse vuelta
            new Vector3(-23, 30, 17),
            new Vector3(-22, 15, 18),
            new Vector3(-22, 8, 16),
            new Vector3(-21, 3, 11),
            new Vector3(-20, 0, 0),

            // 36-40: Vueltita final
            new Vector3(-20, 0, -20),
            new Vector3(-19, 1, -24),
            new Vector3(-17, 2, -27),
            new Vector3(-14, 3, -29),
            new Vector3(-10, 3.5, -30),

            // Termina
            new Vector3(-6, 3, -29),
            new Vector3(-3, 2, -27),
            new Vector3(-1, 1, -24),
            new Vector3(0, 0, -20),
        ];
    }

    normals() {
        return [
            // 1-5: Comienzo y primera mitad de loop
            new Vector3(0, 1, 0),
            new Vector3(0.2, 1, 0),
            new Vector3(0.2, 1, -0.2),
            new Vector3(0, 1, -1),
            new Vector3(-1, 0.5, 0),

            new Vector3(-1, 0, 0),
            new Vector3(-1, -1, 0),
            new Vector3(0, -1, 0),
            new Vector3(0.5, -0.5, 0),
            new Vector3(0.25, 1, 0.25),

            new Vector3(0, 1, 0),
            new Vector3(0, 1, 0),
            new Vector3(-0.5, 1, 0),
            new Vector3(-0.5, 1, -0.5),
            new Vector3(-0.25, 1, -1),

            new Vector3(0.5, 1, -2),
            new Vector3(1, 1, -1),
            new Vector3(1, 0.5, 0),
            new Vector3(0, 0.5, 1),
            new Vector3(-1, 0.5, 0.5),

            new Vector3(-1, 0.25, -0.5),
            new Vector3(-0.5, 0.25, -1),
            new Vector3(0.5, 1, 0),
            new Vector3(0, 1, 0.5),
            new Vector3(0, 1, 1),

            new Vector3(0, 0.25, 1),
            new Vector3(0, 0, 1),
            new Vector3(0, -0.5, 1),
            new Vector3(0, -1, 0),
            new Vector3(0, -0.5, -1),

            new Vector3(0, 0, -1),
            new Vector3(0, 0, -1),
            new Vector3(0, 1, -1),
            new Vector3(1, 1, -0.5),
            new Vector3(1, 0, 0),

            new Vector3(1, -1, 0),
            new Vector3(0, -1, 0),
            new Vector3(-1, -1, 0),
            new Vector3(-1, -1, -1),
            new Vector3(0, 0, -1),

            new Vector3(0, 1, -1),
            new Vector3(1, 1, -1),
            new Vector3(1, 1, 0),
            new Vector3(0, 1, 0),
        ];
    }

    createHelpers() {
        const pointCount = this.points().length;
        const helpers = [];

        for (let i = 0; i < pointCount; i++) {
            const u = i / (pointCount - 1);
            const point = this.rollercoasterPath.getPosition(u);
            const matrix = this.rollercoasterPath.getRotationMatrix(u);

            const helper = new AxesHelper(3);
            helper.position.set(point.x, point.y, point.z);
            helper.rotation.setFromRotationMatrix(matrix);
            helpers.push(helper);
        }

        return helpers;
    }

    setHelpers(value: boolean) {
        for (const helper of this.rollercoasterPathHelpers) {
            helper.visible = value;
        }
        for (const helper of this.cameraHelpers) {
            helper.visible = value;
        }
    }

    createParametricGeometryFunction() {
        const profile = this.rollercoasterProfile();

        return (u: number, v: number, target: Vector3) => {
            const pointInProfile = profile.getPoint(u);

            const point = new Vector3(pointInProfile.y, 0, -pointInProfile.x);
            const matrizNivelTraslación = this.rollercoasterPath.getTranslationMatrix(v);
            const matrizNivelRotación = this.rollercoasterPath.getRotationMatrix(v);
            point.applyMatrix4(matrizNivelRotación);
            point.applyMatrix4(matrizNivelTraslación);

            target.set(point.x, point.y, point.z);
        }
    }
}