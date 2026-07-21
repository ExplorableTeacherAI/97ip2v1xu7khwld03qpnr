/**
 * Domain Model — The Rolling Odometer Lesson
 * ==========================================
 *
 * Mathematical functions and constants for the integral/area lesson.
 * Every section's figure computes from these functions; no section
 * re-implements the math locally.
 */

/**
 * The speed curve function: represents a car's speed over time on a trip.
 * Uses a sinusoidal with some variation to create an interesting curve.
 * Returns speed in units (e.g., mph or km/h).
 */
export function speedAtTime(t: number): number {
    // A curve that has interesting variation: peaks and valleys
    // representing coasting, braking, accelerating on a route
    return 30 + 20 * Math.sin(t * 0.8) + 10 * Math.sin(t * 1.5) * Math.cos(t * 0.3);
}

/**
 * Compute the definite integral (area) under the speed curve
 * from time a to time b using numerical integration (Simpson's rule).
 * This represents the total distance traveled.
 */
export function computeAreaUnderCurve(a: number, b: number, numSegments = 100): number {
    if (a >= b) return 0;

    const h = (b - a) / numSegments;
    let sum = speedAtTime(a) + speedAtTime(b);

    for (let i = 1; i < numSegments; i++) {
        const x = a + i * h;
        sum += speedAtTime(x) * (i % 2 === 0 ? 2 : 4);
    }

    return (h / 3) * sum;
}

/**
 * Compute the area using Riemann sum (rectangle method) for visualization.
 * This is what students implicitly do when they sample discrete speeds.
 */
export function computeRiemannSum(
    a: number,
    b: number,
    samplePoints: number[]
): number {
    if (samplePoints.length === 0) return 0;

    // Sort sample points
    const sorted = [...samplePoints].sort((x, y) => x - y);

    // Include bounds if not already present
    if (sorted[0] > a) sorted.unshift(a);
    if (sorted[sorted.length - 1] < b) sorted.push(b);

    let sum = 0;
    for (let i = 0; i < sorted.length - 1; i++) {
        const width = sorted[i + 1] - sorted[i];
        const height = speedAtTime(sorted[i]);
        sum += width * height;
    }

    return sum;
}

/**
 * Get the y-extent of the speed curve over a range for proper scaling.
 */
export function getSpeedExtent(a: number, b: number, samples = 50): { min: number; max: number } {
    let min = Infinity;
    let max = -Infinity;

    for (let i = 0; i <= samples; i++) {
        const t = a + (b - a) * (i / samples);
        const speed = speedAtTime(t);
        if (speed < min) min = speed;
        if (speed > max) max = speed;
    }

    return { min, max };
}

// ── Riemann Sums Section ──────────────────────────────────────────────────────

/**
 * Compute the left Riemann sum for the speed curve.
 * Uses n equally-spaced rectangles from a to b, each with height = speed at left endpoint.
 */
export function computeLeftRiemannSum(a: number, b: number, n: number): number {
    if (n < 1 || a >= b) return 0;

    const deltaX = (b - a) / n;
    let sum = 0;

    for (let i = 0; i < n; i++) {
        const x = a + i * deltaX;
        const height = speedAtTime(x);
        sum += height * deltaX;
    }

    return sum;
}

/**
 * Get the data for drawing n Riemann rectangles.
 * Returns array of {x, width, height} for each rectangle.
 */
export function getRiemannRectangles(
    a: number,
    b: number,
    n: number
): Array<{ x: number; width: number; height: number }> {
    if (n < 1 || a >= b) return [];

    const deltaX = (b - a) / n;
    const rectangles: Array<{ x: number; width: number; height: number }> = [];

    for (let i = 0; i < n; i++) {
        const x = a + i * deltaX;
        rectangles.push({
            x,
            width: deltaX,
            height: speedAtTime(x),
        });
    }

    return rectangles;
}

// ── FTC Connection Section (Accumulation and Derivative) ─────────────────────

/**
 * Compute the accumulation function A(x) = ∫[a to x] f(t) dt.
 * This represents total distance traveled from start (a) to position x.
 */
export function accumulationFunction(a: number, x: number): number {
    return computeAreaUnderCurve(a, x);
}

/**
 * Compute the numerical derivative of the accumulation function at x.
 * Uses central difference method: A'(x) ≈ [A(x+h) - A(x-h)] / 2h
 * By the Fundamental Theorem of Calculus, this should equal f(x).
 */
export function accumulationDerivative(a: number, x: number, h = 0.01): number {
    const aPlus = accumulationFunction(a, x + h);
    const aMinus = accumulationFunction(a, x - h);
    return (aPlus - aMinus) / (2 * h);
}

/**
 * Generate points for drawing the accumulation function A(x) curve.
 * Returns array of {x, y} points from a to maxX.
 */
export function getAccumulationCurvePoints(
    a: number,
    maxX: number,
    numPoints = 100
): Array<{ x: number; y: number }> {
    const points: Array<{ x: number; y: number }> = [];
    const step = (maxX - a) / numPoints;

    for (let i = 0; i <= numPoints; i++) {
        const x = a + i * step;
        const y = accumulationFunction(a, x);
        points.push({ x, y });
    }

    return points;
}

/**
 * Get the extent (min/max) of the accumulation function for proper scaling.
 */
export function getAccumulationExtent(
    a: number,
    maxX: number,
    samples = 50
): { min: number; max: number } {
    let min = 0;
    let max = 0;

    for (let i = 0; i <= samples; i++) {
        const x = a + (maxX - a) * (i / samples);
        const aValue = accumulationFunction(a, x);
        if (aValue < min) min = aValue;
        if (aValue > max) max = aValue;
    }

    return { min, max };
}

/**
 * Calculate tangent line parameters at point x on the accumulation curve.
 * Returns the slope and y-intercept for the tangent line.
 */
export function getTangentLineParams(
    a: number,
    x: number
): { slope: number; yIntercept: number; aValue: number } {
    const aValue = accumulationFunction(a, x);
    const slope = accumulationDerivative(a, x);
    // Point-slope form: y - aValue = slope * (t - x)
    // => y = slope * t - slope * x + aValue
    const yIntercept = aValue - slope * x;

    return { slope, yIntercept, aValue };
}

// ── Calculating Integrals Section (Symbolic FTC) ────────────────────────────

/**
 * Simple linear speed function for the calculating integrals section.
 * v(t) = 2t (miles per minute) — chosen for exact symbolic computation.
 * The teacher-approved narrative uses this: "v(t) = 2t miles per minute".
 */
export function simpleSpeedFunction(t: number): number {
    return 2 * t;
}

/**
 * The antiderivative of v(t) = 2t, which is D(t) = t².
 * This is the "position recipe" that the Accumulator Box reveals.
 */
export function simpleAntiderivative(t: number): number {
    return t * t;
}

/**
 * Compute the definite integral using the Fundamental Theorem of Calculus:
 * ∫[a to b] 2t dt = t²|[a to b] = b² - a²
 *
 * Returns an object with F(a), F(b), and their difference for display.
 */
export function computeFTCIntegral(
    a: number,
    b: number
): { Fa: number; Fb: number; difference: number; area: number } {
    const Fa = simpleAntiderivative(a);
    const Fb = simpleAntiderivative(b);
    const difference = Fb - Fa;
    // Area is exactly the same as the symbolic difference (the FTC magic)
    const area = difference;

    return { Fa, Fb, difference, area };
}

/**
 * Generate points for drawing the simple speed curve v(t) = 2t.
 */
export function getSimpleSpeedCurvePoints(
    minT: number,
    maxT: number,
    numPoints = 50
): Array<{ x: number; y: number }> {
    const points: Array<{ x: number; y: number }> = [];
    const step = (maxT - minT) / numPoints;

    for (let i = 0; i <= numPoints; i++) {
        const t = minT + i * step;
        points.push({ x: t, y: simpleSpeedFunction(t) });
    }

    return points;
}

/**
 * Generate points for drawing the antiderivative D(t) = t².
 */
export function getAntiderivativeCurvePoints(
    minT: number,
    maxT: number,
    numPoints = 50
): Array<{ x: number; y: number }> {
    const points: Array<{ x: number; y: number }> = [];
    const step = (maxT - minT) / numPoints;

    for (let i = 0; i <= numPoints; i++) {
        const t = minT + i * step;
        points.push({ x: t, y: simpleAntiderivative(t) });
    }

    return points;
}

/**
 * Get the area polygon points (for shading under the speed curve).
 * Returns vertices of the region from (a, 0) along the curve to (b, 0).
 */
export function getAreaPolygonPoints(
    a: number,
    b: number,
    numPoints = 50
): Array<{ x: number; y: number }> {
    const points: Array<{ x: number; y: number }> = [];

    // Start at (a, 0)
    points.push({ x: a, y: 0 });

    // Along the curve from a to b
    const step = (b - a) / numPoints;
    for (let i = 0; i <= numPoints; i++) {
        const t = a + i * step;
        points.push({ x: t, y: simpleSpeedFunction(t) });
    }

    // Back down to (b, 0)
    points.push({ x: b, y: 0 });

    return points;
}

// ── Negative Area Section (Signed Area) ──────────────────────────────────────

/**
 * Velocity function that can go negative (for the negative area section).
 * A sinusoidal that naturally crosses zero, showing positive and negative regions.
 * The offset parameter shifts the entire curve up or down.
 */
export function velocityWithOffset(t: number, offset: number): number {
    // Base curve: a sine wave that oscillates around y = offset
    // Centered so that at offset = 0, the curve crosses zero naturally
    return offset + 25 * Math.sin(t * 0.8) + 15 * Math.sin(t * 1.3);
}

/**
 * Compute the signed area under the velocity curve with offset.
 * Positive area (above x-axis) and negative area (below x-axis) are computed separately.
 * Returns { positive, negative, net } where net = positive - |negative|.
 */
export function computeSignedArea(
    a: number,
    b: number,
    offset: number,
    numSegments = 200
): { positive: number; negative: number; net: number } {
    if (a >= b) return { positive: 0, negative: 0, net: 0 };

    const h = (b - a) / numSegments;
    let positive = 0;
    let negative = 0;

    for (let i = 0; i < numSegments; i++) {
        const t = a + (i + 0.5) * h; // midpoint of segment
        const v = velocityWithOffset(t, offset);
        const area = v * h;

        if (v > 0) {
            positive += area;
        } else {
            negative += Math.abs(area);
        }
    }

    return {
        positive,
        negative,
        net: positive - negative,
    };
}

/**
 * Get the velocity extent (min/max) over a range for proper chart scaling.
 */
export function getVelocityExtent(
    a: number,
    b: number,
    offset: number,
    samples = 100
): { min: number; max: number } {
    let min = Infinity;
    let max = -Infinity;

    for (let i = 0; i <= samples; i++) {
        const t = a + (b - a) * (i / samples);
        const v = velocityWithOffset(t, offset);
        if (v < min) min = v;
        if (v > max) max = v;
    }

    return { min, max };
}

/**
 * Generate polygon points for the positive (above x-axis) region.
 * Each segment is a "run" of points where velocity > 0.
 */
export function getPositiveRegionPolygons(
    a: number,
    b: number,
    offset: number,
    numPoints = 100
): Array<Array<{ x: number; y: number }>> {
    const polygons: Array<Array<{ x: number; y: number }>> = [];
    const step = (b - a) / numPoints;
    let currentPolygon: Array<{ x: number; y: number }> = [];
    let inPositive = false;

    for (let i = 0; i <= numPoints; i++) {
        const t = a + i * step;
        const v = velocityWithOffset(t, offset);

        if (v > 0) {
            if (!inPositive) {
                // Starting a new positive region
                currentPolygon = [{ x: t, y: 0 }];
                inPositive = true;
            }
            currentPolygon.push({ x: t, y: v });
        } else {
            if (inPositive) {
                // Ending positive region — close the polygon
                currentPolygon.push({ x: t, y: 0 });
                polygons.push(currentPolygon);
                inPositive = false;
            }
        }
    }

    // Close any remaining polygon
    if (inPositive && currentPolygon.length > 2) {
        currentPolygon.push({ x: b, y: 0 });
        polygons.push(currentPolygon);
    }

    return polygons;
}

/**
 * Generate polygon points for the negative (below x-axis) region.
 * Each segment is a "run" of points where velocity < 0.
 */
export function getNegativeRegionPolygons(
    a: number,
    b: number,
    offset: number,
    numPoints = 100
): Array<Array<{ x: number; y: number }>> {
    const polygons: Array<Array<{ x: number; y: number }>> = [];
    const step = (b - a) / numPoints;
    let currentPolygon: Array<{ x: number; y: number }> = [];
    let inNegative = false;

    for (let i = 0; i <= numPoints; i++) {
        const t = a + i * step;
        const v = velocityWithOffset(t, offset);

        if (v < 0) {
            if (!inNegative) {
                // Starting a new negative region
                currentPolygon = [{ x: t, y: 0 }];
                inNegative = true;
            }
            currentPolygon.push({ x: t, y: v });
        } else {
            if (inNegative) {
                // Ending negative region — close the polygon
                currentPolygon.push({ x: t, y: 0 });
                polygons.push(currentPolygon);
                inNegative = false;
            }
        }
    }

    // Close any remaining polygon
    if (inNegative && currentPolygon.length > 2) {
        currentPolygon.push({ x: b, y: 0 });
        polygons.push(currentPolygon);
    }

    return polygons;
}

/**
 * Waypoint configuration for the cargo delivery game.
 * Each waypoint has a position along the timeline and the region type (forward or reverse).
 */
export interface Waypoint {
    time: number;
    velocity: number; // positive = forward, negative = reverse
}

/**
 * Define the waypoints for the cargo delivery challenge.
 * Returns 4 waypoints at specific times along the velocity curve.
 */
export function getCargoWaypoints(offset: number): Waypoint[] {
    const times = [1, 2.5, 5, 7];
    return times.map(t => ({
        time: t,
        velocity: velocityWithOffset(t, offset),
    }));
}

/**
 * Compute the cargo total given waypoint operations.
 * Each waypoint contributes ±1 cargo based on operation and velocity sign.
 * PICKUP in forward region = +1, PICKUP in reverse region = -1
 * DROPOFF in forward region = -1, DROPOFF in reverse region = +1
 */
export function computeCargoTotal(
    waypoints: Waypoint[],
    operations: ('pickup' | 'dropoff')[]
): number {
    let total = 0;
    for (let i = 0; i < waypoints.length; i++) {
        const op = operations[i] ?? 'pickup';
        const isForward = waypoints[i].velocity > 0;
        const isPickup = op === 'pickup';

        // The sign: forward + pickup = +1, forward + dropoff = -1
        //           reverse + pickup = -1, reverse + dropoff = +1
        if (isForward) {
            total += isPickup ? 1 : -1;
        } else {
            total += isPickup ? -1 : 1;
        }
    }
    return total;
}
