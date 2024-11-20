import { CircleGeometry, Group, Mesh, MeshPhongMaterial, PlaneGeometry, RepeatWrapping, TextureLoader, Vector2 } from "three";
import { Water } from "three/examples/jsm/objects/Water2.js";

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

    diffuseColor = mix(grassColor, dirtColor, smoothstep(0.5, 0.7, pathMask));
    diffuseColor = mix(diffuseColor, rockColor, smoothstep(0.75, 0.85, pathMask));
`

export default class Ground {
    group: Group;

    constructor() {
        const loader = new TextureLoader();
        const grassTexture = loader.load("../assets/seamless_grass.jpg");
        grassTexture.wrapS = RepeatWrapping;
        grassTexture.wrapT = RepeatWrapping;

        const rockTexture = loader.load("../assets/rock.jpg");
        rockTexture.wrapS = RepeatWrapping;
        rockTexture.wrapT = RepeatWrapping;

        const dirtTexture = loader.load("../assets/soil.jpg");

        dirtTexture.wrapS = RepeatWrapping;
        dirtTexture.wrapT = RepeatWrapping;

        const pathMask = loader.load("../assets/path.jpg");

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

        material.defines = { USE_UV: true };

        material.onBeforeCompile = (shader) => {
            shader.uniforms.grassTexture = uniforms.grassTexture;
            shader.uniforms.rockTexture = uniforms.rockTexture;
            shader.uniforms.dirtTexture = uniforms.dirtTexture;
            shader.uniforms.pathMask = uniforms.pathMask;

            shader.fragmentShader = customUnifoms + shader.fragmentShader;
            shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", customShader);

            console.debug(shader.vertexShader);
            console.debug(shader.fragmentShader);
        }

        const geometry = new CircleGeometry(1000);

        const ground = new Mesh(geometry, material);
        ground.rotateX(-Math.PI / 2);
        ground.rotateZ(Math.PI / 2);
        ground.receiveShadow = true;

        const waterGeometry = new PlaneGeometry(20, 60);
        const waterNormal1 = new TextureLoader().load("../assets/water_normal_1.jpg");
        const waterNormal2 = new TextureLoader().load("../assets/water_normal_2.jpg");
        const water = new Water(waterGeometry, {
            color: 0x77aaff,
            scale: 2,
            flowDirection: new Vector2(1, 1),
            textureWidth: 1024,
            textureHeight: 1024,
            normalMap0: waterNormal1,
            normalMap1: waterNormal2,
        });
        water.rotateX(-Math.PI / 2);
        water.position.set(-20, 0.01, 0);

        this.group = new Group();
        this.group.add(water);
        this.group.add(ground);
    }
}