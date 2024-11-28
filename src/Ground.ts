import { CircleGeometry, ExtrudeGeometry, Group, Mesh, MeshPhongMaterial, PlaneGeometry, RepeatWrapping, Shape, TextureLoader, Vector2, Vector3 } from "three";
import { Water } from "three/examples/jsm/objects/Water2.js";
import grassTextureUrl from "../assets/seamless_grass.jpg";
import rockTextureUrl from "../assets/rock.jpg";
import soilTextureUrl from "../assets/soil.jpg";
import pathMaskUrl from "../assets/path.jpg";
import waterNormal1Url from "../assets/water_normal_1.jpg";
import waterNormal2Url from "../assets/water_normal_2.jpg";
import { ConvexGeometry } from "three/examples/jsm/Addons.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const customUnifoms = `
    uniform sampler2D grassTexture;
    uniform sampler2D rockTexture;
    uniform sampler2D dirtTexture;
    uniform sampler2D pathMask;
`

const customShader = `
    vec4 grassColor = texture2D(grassTexture, 200.0 * vUv);
    vec4 rockColor = texture2D(rockTexture, 200.0 * vUv);
    vec4 dirtColor = texture2D(dirtTexture, 200.0 * vUv);
    vec2 maskUv = vUv - 0.5;
    maskUv = maskUv * 20.0;
    maskUv = maskUv + 0.5;
    float pathMask = texture2D(pathMask, maskUv).r;

    diffuseColor = mix(grassColor, dirtColor, smoothstep(0.35, 0.7, pathMask));
    diffuseColor = mix(diffuseColor, rockColor, smoothstep(0.75, 0.85, pathMask));
`
/*
    Contiene el piso, rocas y la pileta
*/
export default class Ground {
    group: Group;

    constructor() {
        // Texturas
        const loader = new TextureLoader();
        const grassTexture = loader.load(grassTextureUrl);
        grassTexture.wrapS = RepeatWrapping;
        grassTexture.wrapT = RepeatWrapping;

        const rockTexture = loader.load(rockTextureUrl);
        rockTexture.wrapS = RepeatWrapping;
        rockTexture.wrapT = RepeatWrapping;

        const dirtTexture = loader.load(soilTextureUrl);
        dirtTexture.wrapS = RepeatWrapping;
        dirtTexture.wrapT = RepeatWrapping;

        const pathMask = loader.load(pathMaskUrl);

        // Material base
        const material = new MeshPhongMaterial({
            color: 0xffffff,
            specular: 0xffffff,
            shininess: 2,
        });

        const uniforms = {
            grassTexture: { value: grassTexture, type: "t" },
            rockTexture: { value: rockTexture, type: "t" },
            dirtTexture: { value: dirtTexture, type: "t" },
            pathMask: { value: pathMask, type: "t" },
        };

        // Asegurarse de poder usar las coordenadas `vUv` en el shader
        material.defines = { USE_UV: true };

        // Reemplazar el shader del MeshPhongMaterial y definir uniforms
        material.onBeforeCompile = (shader) => {
            shader.uniforms.grassTexture = uniforms.grassTexture;
            shader.uniforms.rockTexture = uniforms.rockTexture;
            shader.uniforms.dirtTexture = uniforms.dirtTexture;
            shader.uniforms.pathMask = uniforms.pathMask;

            shader.fragmentShader = customUnifoms + shader.fragmentShader;
            shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", customShader);

            // console.debug(shader.vertexShader);
            // console.debug(shader.fragmentShader);
        }

        // Piso en sí
        const geometry = new CircleGeometry(1000);
        const ground = new Mesh(geometry, material);
        ground.rotateX(-Math.PI / 2);
        ground.rotateZ(Math.PI / 2);
        ground.receiveShadow = true;

        // Piletita (agua)
        const waterGeometry = new PlaneGeometry(20, 60);
        const waterNormal1 = new TextureLoader().load(waterNormal1Url);
        const waterNormal2 = new TextureLoader().load(waterNormal2Url);
        const water = new Water(waterGeometry, {
            color: 0x77aaff,
            scale: 2,
            flowDirection: new Vector2(1, 1),
            textureWidth: 1024,
            textureHeight: 1024,
            normalMap0: waterNormal1,
            normalMap1: waterNormal2,
        });

        // Borde de pileta
        const frame = this.createPoolFrame(20, 60, 0.5);
        const waterGroup = new Group();
        waterGroup.add(water);
        waterGroup.add(frame);
        waterGroup.rotateX(-Math.PI / 2);
        waterGroup.position.set(-20, 0.1, 0);

        // Agregar todo
        this.group = new Group();
        this.group.add(waterGroup);
        this.group.add(this.createRocksMesh())
        this.group.add(ground);
    }

    createRocksMesh() {
        const positions = [
            new Vector2(-5, 2),
            new Vector2(30, 20),
            new Vector2(45, 10),
            new Vector2(45, -10),
            new Vector2(30, -30),
            new Vector2(5, -25),
            new Vector2(-45, -40),
            new Vector2(-35, 0),
        ];

        const material = new MeshPhongMaterial({ color: 0x666666 });

        // Se combinará todo en una única geometría y finalmente en un único mesh.
        let totalGeometry = null;

        for (const position of positions) {
            // Nube de puntos
            const n = Math.floor(Math.random() * 100) + 10;
            const points = [];
            for (let i = 0; i < n; i++) {
                points.push(new Vector3(Math.random() * 3, Math.random() * 2, Math.random() * 3));
            }

            // Convex Hull
            const geometry = new ConvexGeometry(points);
            geometry.translate(position.x, -1, position.y);

            // Unir geometrías en una sola
            if (totalGeometry === null) {
                totalGeometry = geometry;
            } else {
                totalGeometry = mergeGeometries([totalGeometry, geometry]);
            }
        }

        // Recién ahora crear un solo mesh
        const mesh = new Mesh(totalGeometry!, material);
        mesh.receiveShadow = true;
        mesh.castShadow = true;

        return mesh;
    }

    createPoolFrame(width: number, height: number, radius: number) {
        // Rectángulo exterior
        const outerShape = new Shape();
        outerShape.moveTo(-width / 2 - radius, -height / 2 - radius);
        outerShape.lineTo(width / 2 + radius, -height / 2 - radius);
        outerShape.lineTo(width / 2 + radius, height / 2 + radius);
        outerShape.lineTo(-width / 2 - radius, height / 2 + radius);
        outerShape.lineTo(-width / 2 - radius, -height / 2 - radius);

        // Rectángulo interior
        const innerShape = new Shape();
        innerShape.moveTo(-width / 2 + radius, -height / 2 + radius);
        innerShape.lineTo(width / 2 - radius, -height / 2 + radius);
        innerShape.lineTo(width / 2 - radius, height / 2 - radius);
        innerShape.lineTo(-width / 2 + radius, height / 2 - radius);
        innerShape.lineTo(-width / 2 + radius, -height / 2 + radius);

        outerShape.holes.push(innerShape);

        const extrudeSettings = {
            depth: radius,
            bevelEnabled: false,
        };

        const geometry = new ExtrudeGeometry(outerShape, extrudeSettings);
        const material = new MeshPhongMaterial({ color: 0xeeeeee, shininess: 30 });

        const mesh = new Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        return mesh;
    }
}