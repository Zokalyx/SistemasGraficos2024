import { CatmullRomCurve3, Matrix4, Vector3 } from "three";

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
        // Consultar...
        this.speeds = new CatmullRomCurve3(speeds.map((speed, index) => new Vector3(speed, index, 0)));
    }

    convertDistanceCoordinateToNormalCoordinate(u: number) {
        return this.pointPath.getUtoTmapping(u, 0);
    }

    getSpeed(u: number) {
        return this.speeds.getPoint(this.convertDistanceCoordinateToNormalCoordinate(u)).x;
    }

    getPosition(u: number) {
        return this.pointPath.getPoint(this.convertDistanceCoordinateToNormalCoordinate(u));
    }

    getTranslationMatrix(u: number) {
        return new Matrix4().makeTranslation(this.pointPath.getPoint(this.convertDistanceCoordinateToNormalCoordinate(u)));
    }

    getRotationMatrix(u: number) {
        const tangent = this.pointPath.getTangent(this.convertDistanceCoordinateToNormalCoordinate(u));
        const normal = this.normalPath.getPoint(this.convertDistanceCoordinateToNormalCoordinate(u));

        // La normal puede no estar alineada a la tangente.
        // Proyectamos la normal al plano perpendicular de la tangente.
        normal.sub(tangent.clone().multiplyScalar(tangent.dot(normal))).normalize();

        const binormal = normal.clone().cross(tangent);

        return new Matrix4().makeBasis(normal, tangent, binormal);
    }
}