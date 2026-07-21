/**
 * FTC Connection Section — The Fundamental Theorem of Calculus
 * ============================================================
 *
 * The climax of The Rolling Odometer lesson: students discover that
 * A'(x) = f(x) — the derivative of the accumulation function equals
 * the original function. Integration and differentiation are inverses.
 */

import React, { useRef, useState, useMemo, useCallback, type ReactElement } from "react";
import { StackLayout } from "@/components/layouts";
import { Block } from "@/components/templates";
import {
    EditableH2,
    EditableParagraph,
    InlineSpotColor,
    InlineFeedback,
    InlineClozeChoice,
    InteractionHintSequence,
} from "@/components/atoms";
import { Figure, FigureSlider } from "@/components/molecules";
import { useVar, useSetVar } from "@/stores";
import { clamp, useSpring } from "@/lib/motion";
import {
    getVariableInfo,
    numberPropsFromDefinition,
    choicePropsFromDefinition,
} from "../variables";
import {
    speedAtTime,
    accumulationFunction,
    accumulationDerivative,
} from "../model";

// ── View constants ────────────────────────────────────────────────────────────
// Compact layout to fit within the ~340px max figure height constraint

const VIEW_WIDTH = 560;
const VIEW_HEIGHT = 280; // Very compact height for section bounds
const GRAPH_HEIGHT = 100; // Compact graph display
const GRAPH_GAP = 20; // Compact gap between graphs
const PADDING_X = 48;
const PADDING_Y = 16;

// Graph domains
const X_MIN = 0;
const X_MAX = 8;
const F_Y_MAX = 70;
const A_Y_MAX = 320;

// Colors following the design language
const INK = "#334155";
const INK_STRUCTURE = "#64748B";
const INK_QUIET = "#CBD5E1";
const ACCENT_TEAL = "#62D0AD"; // Primary: x position, A(x)
const ACCENT_INDIGO = "#8E90F5"; // f(x) curve and values
const ACCENT_AMBER = "#F7B23B"; // Tangent line / slope
const FILL_TEAL = "rgba(98, 208, 173, 0.15)";

// Transform from math coordinates to SVG coordinates
function xToSvg(x: number): number {
    return PADDING_X + ((x - X_MIN) / (X_MAX - X_MIN)) * (VIEW_WIDTH - 2 * PADDING_X);
}

function fYToSvg(y: number): number {
    return PADDING_Y + GRAPH_HEIGHT - (y / F_Y_MAX) * GRAPH_HEIGHT;
}

function aYToSvg(y: number): number {
    const topOfAGraph = PADDING_Y + GRAPH_HEIGHT + GRAPH_GAP;
    return topOfAGraph + GRAPH_HEIGHT - (y / A_Y_MAX) * GRAPH_HEIGHT;
}

// ── Flower Component (planted along A(x) curve) ───────────────────────────────

interface FlowerProps {
    x: number;
    slope: number;
    aValue: number;
    blooming: boolean;
    petalY: number;
    opacity: number;
}

function Flower({ x, slope, aValue, blooming, petalY, opacity }: FlowerProps) {
    const svgX = xToSvg(x);
    const svgY = aYToSvg(aValue);
    const angle = Math.atan(slope / 50) * (180 / Math.PI); // Convert slope to visual angle

    // Stem tilts with the slope
    const stemLength = blooming ? 20 : 15;
    const petalSvgY = fYToSvg(petalY);

    return (
        <g data-concept="flower" style={{ opacity }}>
            {/* Stem on accumulation curve */}
            <line
                x1={svgX}
                y1={svgY}
                x2={svgX}
                y2={svgY - stemLength}
                stroke={ACCENT_TEAL}
                strokeWidth="2"
                strokeLinecap="round"
                transform={`rotate(${-angle} ${svgX} ${svgY})`}
            />
            {/* Flower head */}
            <circle
                cx={svgX + Math.sin(-angle * Math.PI / 180) * stemLength}
                cy={svgY - stemLength * Math.cos(-angle * Math.PI / 180)}
                r={blooming ? 6 : 4}
                fill={blooming ? ACCENT_AMBER : INK_QUIET}
            />
            {/* Petal floating up to f(x) graph */}
            {blooming && (
                <g>
                    {/* Dashed line connecting petal to its landing spot */}
                    <line
                        x1={svgX}
                        y1={svgY - stemLength}
                        x2={svgX}
                        y2={petalSvgY}
                        stroke={ACCENT_AMBER}
                        strokeWidth="1"
                        strokeDasharray="3,3"
                        opacity="0.5"
                    />
                    {/* Petal at f(x) height */}
                    <circle
                        cx={svgX}
                        cy={petalSvgY}
                        r="5"
                        fill={ACCENT_AMBER}
                    />
                </g>
            )}
        </g>
    );
}

// ── The Bespoke FTC Visualization ─────────────────────────────────────────────

function FTCVisualization() {
    const setVar = useSetVar();
    const xPos = useVar<number>("ftc_xPosition", 2);
    const boundA = useVar<number>("ftc_boundA", 0);
    const flowers = useVar<number[]>("ftc_flowersPlanted", []);

    const [dragging, setDragging] = useState(false);
    const [hovered, setHovered] = useState(false);
    const svgRef = useRef<SVGSVGElement>(null);

    // Compute derived values from the domain model
    const fValue = speedAtTime(xPos);
    const areaValue = accumulationFunction(boundA, xPos);
    const slopeValue = accumulationDerivative(boundA, xPos);

    // Write derived values to the store for verification
    React.useEffect(() => {
        setVar("ftc_fValue", fValue);
        setVar("ftc_areaValue", areaValue);
        setVar("ftc_slopeValue", slopeValue);
    }, [fValue, areaValue, slopeValue, setVar]);

    // Spring for handle affordance
    const handleScale = useSpring(dragging || hovered ? 1.15 : 1, {
        stiffness: 400,
        damping: 26,
    });

    // Generate curve paths
    const fCurvePath = useMemo(() => {
        const points: string[] = [];
        for (let i = 0; i <= 100; i++) {
            const x = X_MIN + (X_MAX - X_MIN) * (i / 100);
            const y = speedAtTime(x);
            const svgX = xToSvg(x);
            const svgY = fYToSvg(y);
            points.push(i === 0 ? `M ${svgX} ${svgY}` : `L ${svgX} ${svgY}`);
        }
        return points.join(" ");
    }, []);

    const aCurvePath = useMemo(() => {
        const points: string[] = [];
        for (let i = 0; i <= 100; i++) {
            const x = boundA + (X_MAX - boundA) * (i / 100);
            const y = accumulationFunction(boundA, x);
            const svgX = xToSvg(x);
            const svgY = aYToSvg(y);
            points.push(i === 0 ? `M ${svgX} ${svgY}` : `L ${svgX} ${svgY}`);
        }
        return points.join(" ");
    }, [boundA]);

    // Shaded area under f(x) from a to x
    const shadedAreaPath = useMemo(() => {
        const points: string[] = [];
        const startX = xToSvg(boundA);
        const endX = xToSvg(xPos);
        const baseline = fYToSvg(0);

        // Start at bottom left
        points.push(`M ${startX} ${baseline}`);

        // Trace the curve
        for (let i = 0; i <= 50; i++) {
            const t = boundA + (xPos - boundA) * (i / 50);
            const y = speedAtTime(t);
            points.push(`L ${xToSvg(t)} ${fYToSvg(y)}`);
        }

        // Back to baseline
        points.push(`L ${endX} ${baseline}`);
        points.push("Z");

        return points.join(" ");
    }, [boundA, xPos]);

    // Tangent line on A(x): line through (xPos, areaValue) with slope = slopeValue
    const tangentLine = useMemo(() => {
        const x1 = Math.max(boundA, xPos - 1.5);
        const x2 = Math.min(X_MAX, xPos + 1.5);
        const y1 = areaValue + slopeValue * (x1 - xPos);
        const y2 = areaValue + slopeValue * (x2 - xPos);
        return {
            x1: xToSvg(x1),
            y1: aYToSvg(clamp(y1, 0, A_Y_MAX)),
            x2: xToSvg(x2),
            y2: aYToSvg(clamp(y2, 0, A_Y_MAX)),
        };
    }, [xPos, areaValue, slopeValue, boundA]);

    // SVG coordinate conversion for dragging
    const svgPointFromEvent = useCallback((event: React.PointerEvent): number => {
        const svg = svgRef.current;
        if (!svg) return xPos;
        const rect = svg.getBoundingClientRect();
        const svgX = ((event.clientX - rect.left) / rect.width) * VIEW_WIDTH;
        // Convert back to math coordinates
        const mathX = X_MIN + ((svgX - PADDING_X) / (VIEW_WIDTH - 2 * PADDING_X)) * (X_MAX - X_MIN);
        return clamp(mathX, 0.5, 8);
    }, [xPos]);

    const handlePointerMove = useCallback((event: React.PointerEvent<SVGCircleElement>) => {
        if (!dragging) return;
        const newX = svgPointFromEvent(event);
        setVar("ftc_xPosition", newX);
    }, [dragging, svgPointFromEvent, setVar]);

    // Handle click to plant a flower
    const handleCanvasClick = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
        const svg = svgRef.current;
        if (!svg || dragging) return;

        const rect = svg.getBoundingClientRect();
        const svgY = ((event.clientY - rect.top) / rect.height) * VIEW_HEIGHT;

        // Only plant if clicking in the A(x) graph region
        const aGraphTop = PADDING_Y + GRAPH_HEIGHT + GRAPH_GAP;
        const aGraphBottom = aGraphTop + GRAPH_HEIGHT;

        if (svgY >= aGraphTop && svgY <= aGraphBottom) {
            const svgX = ((event.clientX - rect.left) / rect.width) * VIEW_WIDTH;
            const mathX = X_MIN + ((svgX - PADDING_X) / (VIEW_WIDTH - 2 * PADDING_X)) * (X_MAX - X_MIN);

            if (mathX >= boundA + 0.5 && mathX <= X_MAX - 0.5) {
                // Add flower at this position
                const currentFlowers = Array.isArray(flowers) ? flowers : [];
                if (currentFlowers.length < 8 && !currentFlowers.some(f => Math.abs(f - mathX) < 0.3)) {
                    setVar("ftc_flowersPlanted", [...currentFlowers, mathX]);
                }
            }
        }
    }, [dragging, flowers, boundA, setVar]);

    // Current position marker SVG coordinates
    const markerSvgX = xToSvg(xPos);
    const fMarkerY = fYToSvg(fValue);
    const aMarkerY = aYToSvg(areaValue);

    return (
        <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            className="block h-full w-full"
            preserveAspectRatio="xMidYMid meet"
            style={{ overflow: "hidden", maxHeight: `${VIEW_HEIGHT}px` }}
            role="img"
            aria-label="Two synchronized graphs showing the speed curve f(x) and accumulation function A(x)"
            onClick={handleCanvasClick}
        >
            <defs>
                <filter id="ftc-handle-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#0F172A" floodOpacity="0.25" />
                </filter>
            </defs>

            {/* ═══ Top Graph: f(x) Speed Curve ═══ */}
            <g data-concept="f-graph">
                {/* Background and axes */}
                <rect
                    x={PADDING_X}
                    y={PADDING_Y}
                    width={VIEW_WIDTH - 2 * PADDING_X}
                    height={GRAPH_HEIGHT}
                    fill="#FAFBFC"
                    stroke={INK_QUIET}
                    strokeWidth="1"
                />

                {/* Horizontal gridlines */}
                {[20, 40, 60].map((y) => (
                    <line
                        key={`f-grid-${y}`}
                        x1={PADDING_X}
                        y1={fYToSvg(y)}
                        x2={VIEW_WIDTH - PADDING_X}
                        y2={fYToSvg(y)}
                        stroke={INK_QUIET}
                        strokeWidth="0.5"
                        strokeDasharray="2,4"
                    />
                ))}

                {/* Y-axis label */}
                <text
                    x={PADDING_X - 8}
                    y={PADDING_Y + GRAPH_HEIGHT / 2}
                    fill={INK}
                    fontSize="12"
                    textAnchor="end"
                    dominantBaseline="middle"
                    fontStyle="italic"
                >
                    f(x)
                </text>
                <text
                    x={PADDING_X - 8}
                    y={PADDING_Y + GRAPH_HEIGHT / 2 + 14}
                    fill={INK_STRUCTURE}
                    fontSize="10"
                    textAnchor="end"
                >
                    speed
                </text>

                {/* Shaded area under curve */}
                <path
                    d={shadedAreaPath}
                    fill={FILL_TEAL}
                    data-concept="shaded-area"
                />

                {/* The f(x) curve */}
                <path
                    d={fCurvePath}
                    fill="none"
                    stroke={ACCENT_INDIGO}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    data-concept="f-curve"
                />

                {/* Vertical line at x */}
                <line
                    x1={markerSvgX}
                    y1={PADDING_Y}
                    x2={markerSvgX}
                    y2={fYToSvg(0)}
                    stroke={ACCENT_TEAL}
                    strokeWidth="1.5"
                    strokeDasharray="4,3"
                />

                {/* Horizontal line showing f(x) height */}
                <line
                    x1={PADDING_X}
                    y1={fMarkerY}
                    x2={markerSvgX}
                    y2={fMarkerY}
                    stroke={ACCENT_INDIGO}
                    strokeWidth="2"
                    strokeDasharray="6,3"
                />

                {/* f(x) value readout */}
                <g data-concept="ftc_fValue">
                    <rect
                        x={PADDING_X - 48}
                        y={fMarkerY - 10}
                        width="42"
                        height="20"
                        fill="white"
                        stroke={ACCENT_INDIGO}
                        strokeWidth="1"
                        rx="3"
                    />
                    <text
                        x={PADDING_X - 27}
                        y={fMarkerY + 4}
                        fill={ACCENT_INDIGO}
                        fontSize="12"
                        textAnchor="middle"
                        fontWeight="600"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                        {fValue.toFixed(1)}
                    </text>
                </g>

                {/* Point on f(x) curve */}
                <circle
                    cx={markerSvgX}
                    cy={fMarkerY}
                    r="5"
                    fill={ACCENT_INDIGO}
                />
            </g>

            {/* ═══ Bottom Graph: A(x) Accumulation Function ═══ */}
            <g data-concept="a-graph" transform={`translate(0, ${GRAPH_HEIGHT + GRAPH_GAP})`}>
                {/* Background and axes */}
                <rect
                    x={PADDING_X}
                    y={PADDING_Y}
                    width={VIEW_WIDTH - 2 * PADDING_X}
                    height={GRAPH_HEIGHT}
                    fill="#FAFBFC"
                    stroke={INK_QUIET}
                    strokeWidth="1"
                />

                {/* Horizontal gridlines */}
                {[100, 200, 300].map((y) => (
                    <line
                        key={`a-grid-${y}`}
                        x1={PADDING_X}
                        y1={aYToSvg(y) - (GRAPH_HEIGHT + GRAPH_GAP)}
                        x2={VIEW_WIDTH - PADDING_X}
                        y2={aYToSvg(y) - (GRAPH_HEIGHT + GRAPH_GAP)}
                        stroke={INK_QUIET}
                        strokeWidth="0.5"
                        strokeDasharray="2,4"
                    />
                ))}

                {/* Y-axis label */}
                <text
                    x={PADDING_X - 8}
                    y={PADDING_Y + GRAPH_HEIGHT / 2}
                    fill={INK}
                    fontSize="12"
                    textAnchor="end"
                    dominantBaseline="middle"
                    fontStyle="italic"
                >
                    A(x)
                </text>
                <text
                    x={PADDING_X - 8}
                    y={PADDING_Y + GRAPH_HEIGHT / 2 + 14}
                    fill={INK_STRUCTURE}
                    fontSize="10"
                    textAnchor="end"
                >
                    area
                </text>

                {/* The A(x) curve */}
                <path
                    d={aCurvePath}
                    fill="none"
                    stroke={ACCENT_TEAL}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    transform={`translate(0, ${-(GRAPH_HEIGHT + GRAPH_GAP)})`}
                    data-concept="a-curve"
                />

                {/* Tangent line on A(x) */}
                <line
                    x1={tangentLine.x1}
                    y1={tangentLine.y1 - (GRAPH_HEIGHT + GRAPH_GAP)}
                    x2={tangentLine.x2}
                    y2={tangentLine.y2 - (GRAPH_HEIGHT + GRAPH_GAP)}
                    stroke={ACCENT_AMBER}
                    strokeWidth="3"
                    strokeLinecap="round"
                    data-concept="ftc_slopeValue"
                />

                {/* Slope readout - positioned to stay within bounds */}
                {(() => {
                    // Note: We're inside a transformed group, so y-coordinates are relative to the A(x) graph
                    // The tangent line y-values have already been adjusted by -(GRAPH_HEIGHT + GRAPH_GAP)
                    const readoutWidth = 62;
                    const readoutHeight = 22;

                    // Calculate local y position (within the transformed coordinate system)
                    const tangentMidY = (tangentLine.y1 + tangentLine.y2) / 2 - (GRAPH_HEIGHT + GRAPH_GAP);

                    // Position readout on left side of tangent when near right edge
                    const nearRightEdge = tangentLine.x2 + readoutWidth + 12 > VIEW_WIDTH - PADDING_X;
                    const readoutX = nearRightEdge
                        ? Math.max(PADDING_X + 4, tangentLine.x1 - readoutWidth - 8)
                        : Math.min(tangentLine.x2 + 8, VIEW_WIDTH - PADDING_X - readoutWidth - 4);

                    // Place readout above the tangent line midpoint, clamped within the graph area
                    const readoutY = Math.max(
                        PADDING_Y + 2,
                        Math.min(tangentMidY - readoutHeight - 4, PADDING_Y + GRAPH_HEIGHT - readoutHeight - 4)
                    );

                    return (
                        <g data-concept="slope-readout">
                            <rect
                                x={readoutX}
                                y={readoutY}
                                width={readoutWidth}
                                height={readoutHeight}
                                fill="white"
                                stroke={ACCENT_AMBER}
                                strokeWidth="1"
                                rx="4"
                            />
                            <text
                                x={readoutX + 6}
                                y={readoutY + 15}
                                fill={INK}
                                fontSize="10"
                            >
                                slope:
                            </text>
                            <text
                                x={readoutX + readoutWidth - 6}
                                y={readoutY + 15}
                                fill={ACCENT_AMBER}
                                fontSize="11"
                                fontWeight="600"
                                textAnchor="end"
                                style={{ fontVariantNumeric: "tabular-nums" }}
                            >
                                {slopeValue.toFixed(1)}
                            </text>
                        </g>
                    );
                })()}

                {/* Planted flowers */}
                {Array.isArray(flowers) && flowers.map((fx, i) => {
                    const fSlope = accumulationDerivative(boundA, fx);
                    const fArea = accumulationFunction(boundA, fx);
                    const fHeight = speedAtTime(fx);
                    return (
                        <g key={i} transform={`translate(0, ${-(GRAPH_HEIGHT + GRAPH_GAP)})`}>
                            <Flower
                                x={fx}
                                slope={fSlope}
                                aValue={fArea}
                                blooming={true}
                                petalY={fHeight}
                                opacity={0.9}
                            />
                        </g>
                    );
                })}

                {/* Point on A(x) curve */}
                <circle
                    cx={markerSvgX}
                    cy={aMarkerY - (GRAPH_HEIGHT + GRAPH_GAP)}
                    r="5"
                    fill={ACCENT_TEAL}
                />

                {/* A(x) value readout */}
                <g data-concept="ftc_areaValue">
                    <rect
                        x={PADDING_X - 48}
                        y={aMarkerY - (GRAPH_HEIGHT + GRAPH_GAP) - 10}
                        width="42"
                        height="20"
                        fill="white"
                        stroke={ACCENT_TEAL}
                        strokeWidth="1"
                        rx="3"
                    />
                    <text
                        x={PADDING_X - 27}
                        y={aMarkerY - (GRAPH_HEIGHT + GRAPH_GAP) + 4}
                        fill={ACCENT_TEAL}
                        fontSize="11"
                        textAnchor="middle"
                        fontWeight="600"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                        {areaValue.toFixed(0)}
                    </text>
                </g>
            </g>

            {/* ═══ Shared X-Axis and Draggable Handle ═══ */}
            <g data-concept="x-axis">
                {/* X-axis line */}
                <line
                    x1={PADDING_X}
                    y1={VIEW_HEIGHT - 22}
                    x2={VIEW_WIDTH - PADDING_X}
                    y2={VIEW_HEIGHT - 22}
                    stroke={INK_STRUCTURE}
                    strokeWidth="1.5"
                />

                {/* X-axis ticks and labels */}
                {[0, 2, 4, 6, 8].map((x) => (
                    <g key={`x-tick-${x}`}>
                        <line
                            x1={xToSvg(x)}
                            y1={VIEW_HEIGHT - 22}
                            x2={xToSvg(x)}
                            y2={VIEW_HEIGHT - 16}
                            stroke={INK_STRUCTURE}
                            strokeWidth="1.5"
                        />
                        <text
                            x={xToSvg(x)}
                            y={VIEW_HEIGHT - 4}
                            fill={INK}
                            fontSize="10"
                            textAnchor="middle"
                        >
                            {x}
                        </text>
                    </g>
                ))}

                {/* Axis label */}
                <text
                    x={VIEW_WIDTH - PADDING_X - 8}
                    y={VIEW_HEIGHT - 8}
                    fill={INK}
                    fontSize="11"
                    fontStyle="italic"
                    textAnchor="end"
                >
                    x
                </text>

                {/* Current x position readout */}
                <g data-concept="ftc_xPosition">
                    <rect
                        x={markerSvgX - 20}
                        y={VIEW_HEIGHT - 42}
                        width="40"
                        height="16"
                        fill="white"
                        stroke={ACCENT_TEAL}
                        strokeWidth="1"
                        rx="3"
                    />
                    <text
                        x={markerSvgX}
                        y={VIEW_HEIGHT - 30}
                        fill={ACCENT_TEAL}
                        fontSize="10"
                        textAnchor="middle"
                        fontWeight="600"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                        x = {xPos.toFixed(1)}
                    </text>
                </g>

                {/* Draggable handle on x-axis */}
                <g transform={`translate(${markerSvgX} ${VIEW_HEIGHT - 22}) scale(${handleScale})`}>
                    <circle
                        r="10"
                        fill={ACCENT_TEAL}
                        filter="url(#ftc-handle-shadow)"
                        data-concept="x-handle"
                    />
                    {/* Arrow indicators showing it's draggable horizontally */}
                    <path
                        d="M -4 0 L -7 -2.5 L -7 2.5 Z M 4 0 L 7 -2.5 L 7 2.5 Z"
                        fill="white"
                    />
                </g>

                {/* Invisible hit area for dragging */}
                <circle
                    cx={markerSvgX}
                    cy={VIEW_HEIGHT - 22}
                    r="20"
                    fill="transparent"
                    style={{ cursor: dragging ? "grabbing" : "grab", touchAction: "none" }}
                    onPointerDown={(event) => {
                        event.currentTarget.setPointerCapture(event.pointerId);
                        setDragging(true);
                    }}
                    onPointerMove={handlePointerMove}
                    onPointerUp={() => setDragging(false)}
                    onPointerCancel={() => setDragging(false)}
                    onPointerEnter={() => setHovered(true)}
                    onPointerLeave={() => setHovered(false)}
                />
            </g>

            {/* Connection indicator: slope = f(x) */}
            <g>
                <text
                    x={VIEW_WIDTH - PADDING_X - 10}
                    y={PADDING_Y + GRAPH_HEIGHT + GRAPH_GAP / 2 + 3}
                    fill={INK}
                    fontSize="12"
                    textAnchor="end"
                    fontWeight="500"
                >
                    <tspan fill={ACCENT_AMBER}>slope</tspan>
                    <tspan> = </tspan>
                    <tspan fill={ACCENT_INDIGO}>{fValue.toFixed(1)}</tspan>
                    <tspan> ≈ </tspan>
                    <tspan fill={ACCENT_INDIGO}>f(x)</tspan>
                </text>
            </g>
        </svg>
    );
}

// ── Figure Shell Composition ──────────────────────────────────────────────────

function FTCFigure() {
    const setVar = useSetVar();

    return (
        <Figure
            id="ftc-connection-visualization"
            onReset={() => {
                setVar("ftc_xPosition", 2);
                setVar("ftc_flowersPlanted", []);
            }}
            caption="The speed curve f(x) sits above its accumulation A(x). Drag the teal handle along the x-axis and watch the tangent line's slope match the height of f(x) at every position."
        >
            <div className="w-full" style={{ aspectRatio: "560 / 340", maxHeight: "340px", overflow: "hidden" }}>
                <FTCVisualization />
            </div>
            <div className="px-6 pb-4 pt-2">
                <FigureSlider
                    varName="ftc_xPosition"
                    label="Position x"
                    {...numberPropsFromDefinition(getVariableInfo("ftc_xPosition"))}
                    formatValue={(v) => v.toFixed(1)}
                />
            </div>
            <InteractionHintSequence
                hintKey="ftc-connection-drag"
                steps={[
                    {
                        gesture: "drag-horizontal",
                        label: "Drag the teal handle along the x-axis",
                        position: { x: "25%", y: "75%" },
                        dragPath: {
                            type: "line",
                            startOffset: { x: -40, y: 0 },
                            endOffset: { x: 40, y: 0 },
                        },
                    },
                ]}
            />
        </Figure>
    );
}

// ── Exported Section Blocks ───────────────────────────────────────────────────

export const ftcConnectionBlocks: ReactElement[] = [
    <StackLayout key="layout-ftc-heading" maxWidth="xl">
        <Block id="ftc-connection-heading" padding="md">
            <EditableH2 id="h2-ftc-connection" blockId="ftc-connection-heading">
                The Fundamental Connection
            </EditableH2>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-ftc-intro" maxWidth="xl">
        <Block id="ftc-connection-intro" padding="sm">
            <EditableParagraph id="para-ftc-intro" blockId="ftc-connection-intro">
                The faster the speedometer reads, the quicker miles rack up. If you measure how fast the{" "}
                <InlineSpotColor varName="ftc_areaValue" color="#62D0AD">odometer</InlineSpotColor>{" "}
                changes at any moment, what number appears?
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-ftc-visualization" maxWidth="xl">
        <Block id="ftc-connection-visualization" padding="sm" hasVisualization>
            <FTCFigure />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-ftc-explore" maxWidth="xl">
        <Block id="ftc-connection-explore" padding="sm">
            <EditableParagraph id="para-ftc-explore" blockId="ftc-connection-explore">
                Drag the{" "}
                <InlineSpotColor varName="ftc_xPosition" color="#62D0AD">teal handle</InlineSpotColor>{" "}
                along the x-axis and watch the{" "}
                <InlineSpotColor varName="ftc_slopeValue" color="#F7B23B">amber tangent line</InlineSpotColor>{" "}
                update. Compare its slope to the height of{" "}
                <InlineSpotColor varName="ftc_fValue" color="#8E90F5">f(x)</InlineSpotColor>{" "}
                above.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-ftc-theorem" maxWidth="xl">
        <Block id="ftc-connection-theorem" padding="sm">
            <EditableParagraph id="para-ftc-theorem" blockId="ftc-connection-theorem">
                The slope of A(x) always equals f(x). This is the Fundamental Theorem of Calculus: differentiation and integration are inverse operations.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-ftc-question" maxWidth="xl">
        <Block id="ftc-connection-question" padding="md">
            <EditableParagraph id="para-ftc-question" blockId="ftc-connection-question">
                Integration and differentiation are{" "}
                <InlineFeedback
                    varName="answer_ftc_relationship"
                    correctValue="inverse operations"
                    position="terminal"
                    successMessage="— exactly! They undo each other. Differentiating an integral brings you back to the original function"
                    failureMessage="— not quite."
                    hint="Think about what happens when you take the derivative of accumulated area"
                    reviewBlockId="ftc-connection-visualization"
                    reviewLabel="Explore the visualization again"
                >
                    <InlineClozeChoice
                        varName="answer_ftc_relationship"
                        correctAnswer="inverse operations"
                        options={["the same operation", "inverse operations", "unrelated operations", "opposite signs"]}
                        {...choicePropsFromDefinition(getVariableInfo("answer_ftc_relationship"))}
                    />
                </InlineFeedback>.
            </EditableParagraph>
        </Block>
    </StackLayout>,
];
