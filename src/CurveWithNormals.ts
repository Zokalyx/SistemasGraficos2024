import { CatmullRomCurve3, Matrix4, Vector3 } from "three";

/*
    Define una curva especial para poder definir 3 cosas en cada punto de control
    de una CatmullRomCurve3:

    - Posición
    - Orientación (usando una aproximación de la normal)
    - Un parámetro escalar (llamado "velocidad" acá, para poder usarlo con el carrito de la montaña rusa)
*/
export default class CurveWithNormalsAndSpeed {
    pointPath: CatmullRomCurve3;
    normalPath: CatmullRomCurve3;
    speeds: CatmullRomCurve3;

    constructor(points: Vector3[], normals: Vector3[], speeds: number[]) {
        if (points.length !== normals.length || points.length !== speeds.length) {
            throw new Error("Puntos, normales y velocidades deben de tener la misma longitud!");
        }

        this.pointPath = new CatmullRomCurve3(points, true, "centripetal", 0.1);
        this.normalPath = new CatmullRomCurve3(normals, true);
        // Las velocidades son algo escalar, así que esto es un "hack" para poder interpolar
        // un valor escalar de manera suave.
        // Hay un "círculo" en el plano YZ, y la coordenada X es la velocidad.
        // De esta manera, la curva ficticia será muy suave y por ende la velocidad también.
        this.speeds = new CatmullRomCurve3(
            speeds.map((speed, index) =>
                new Vector3(
                    speed,
                    Math.cos(2 * Math.PI * index / speeds.length),
                    Math.sin(2 * Math.PI * index / speeds.length)
                )
            ),
            true
        );
    }

    // Si queremos referenciar un punto específico según la DISTANCIA de la curva,
    // nos tenemos que basar en el pointPath. Pero las demás curvas tendrán otras coordenadas
    // asociadas al mismo punto físico! Tenemos que convertir todo a coordenadas comunes, para que
    // no importe la longitud de cada curva.
    convertDistanceCoordinateToCommonCoordinate(u: number) {
        return this.pointPath.getUtoTmapping(u, 0);
    }

    getSpeed(u: number) {
        return this.speeds.getPoint(this.convertDistanceCoordinateToCommonCoordinate(u)).x;
    }

    getPosition(u: number) {
        return this.pointPath.getPoint(this.convertDistanceCoordinateToCommonCoordinate(u));
    }

    getTranslationMatrix(u: number) {
        return new Matrix4().makeTranslation(this.pointPath.getPoint(this.convertDistanceCoordinateToCommonCoordinate(u)));
    }

    getRotationMatrix(u: number) {
        const tangent = this.pointPath.getTangent(this.convertDistanceCoordinateToCommonCoordinate(u));
        const normal = this.normalPath.getPoint(this.convertDistanceCoordinateToCommonCoordinate(u));

        // La normal puede no estar alineada a la tangente.
        // Proyectamos la normal al plano perpendicular de la tangente.
        // La normal que pasa el usuario es una "aproximación".
        normal.sub(tangent.clone().multiplyScalar(tangent.dot(normal))).normalize();

        const binormal = normal.clone().cross(tangent);

        return new Matrix4().makeBasis(normal, tangent, binormal);
    }
}