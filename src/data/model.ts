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
