/**
 * Accumulation Function Section
 * =============================
 *
 * Fourth section of The Rolling Odometer lesson.
 * Learning objective: See that the integral is not just a number but a function A(x)
 * of the upper bound - students drag a sweep point and watch A(x) build as a function.
 */

import React, { useRef, useState, type ReactElement } from "react";
import { StackLayout } from "@/components/layouts";
import { Block } from "@/components/templates";
import {
    EditableH2,
    EditableParagraph,
    InlineScrubbleNumber,
    InlineSpotColor,
    InlineFeedback,
    InlineClozeChoice,
    InteractionHintSequence,
} from "@/components/atoms";
import { Figure, FigureSlider } from "@/components/molecules";
import { useVar, useSetVar } from "@/stores";
import { clamp, useSpring, type Vec2 } from "@/lib/motion";
import {
    numberPropsFromDefinition,
    choicePropsFromDefinition,
    getVariableInfo,
} from "../variables";
import { speedAtTime, computeAreaUnderCurve } from "../model";

// ── View constants ────────────────────────────────────────────────────────────
// Layout sized to fit all content: snapshot row + two stacked graphs + axes

const VIEW_WIDTH = 560;
const PADDING = { top: 28, right: 24, bottom: 24, left: 56 };
const GRAPH_WIDTH = VIEW_WIDTH - PADDING.left - PADDING.right;
const GRAPH_HEIGHT = 90; // Compact graph height
const GAP_BETWEEN_GRAPHS = 32;
const LOWER_GRAPH_TOP = PADDING.top + GRAPH_HEIGHT + GAP_BETWEEN_GRAPHS;
// Total height: PADDING.top (28) + GRAPH_HEIGHT (90) + GAP (32) + GRAPH_HEIGHT (90) + PADDING.bottom (24) = 264
const VIEW_HEIGHT = PADDING.top + GRAPH_HEIGHT + GAP_BETWEEN_GRAPHS + GRAPH_HEIGHT + PADDING.bottom;

const X_MIN = 0;
const X_MAX = 8;
const Y_MIN = 0;
const Y_MAX = 70;
const A_MAX = 350; // Max accumulated area for scaling

// Design language colors
const INK = "#334155";
const INK_STRUCTURE = "#64748B";
const INK_QUIET = "#CBD5E1";
const ACCENT = "#62D0AD"; // Teal - sweep point and accumulated area
const ACCENT_FILL = "rgba(98, 208, 173, 0.15)";
const COVARIATION = "#8E90F5"; // Indigo - the A(x) curve
const LOCKED_COLOR = "#94A3B8"; // Muted color for locked bound a

// ── Coordinate transforms ─────────────────────────────────────────────────────

function xToScreen(x: number): number {
    return PADDING.left + ((x - X_MIN) / (X_MAX - X_MIN)) * GRAPH_WIDTH;
}

function yToScreen(y: number, yMin: number, yMax: number, graphTop: number, graphHeight: number): number {
    return graphTop + graphHeight - ((y - yMin) / (yMax - yMin)) * graphHeight;
}

function screenToX(screenX: number): number {
    return X_MIN + ((screenX - PADDING.left) / GRAPH_WIDTH) * (X_MAX - X_MIN);
}

// ── Speed curve path ──────────────────────────────────────────────────────────

function generateSpeedCurvePath(): string {
    const points: string[] = [];
    const numSegments = 100;
    for (let i = 0; i <= numSegments; i++) {
        const t = X_MIN + (i / numSegments) * (X_MAX - X_MIN);
        const y = speedAtTime(t);
        const sx = xToScreen(t);
        const sy = yToScreen(y, Y_MIN, Y_MAX, PADDING.top, GRAPH_HEIGHT);
        points.push(`${i === 0 ? "M" : "L"} ${sx.toFixed(1)} ${sy.toFixed(1)}`);
    }
    return points.join(" ");
}

// ── Shaded area path (from a to x) ────────────────────────────────────────────

function generateShadedAreaPath(a: number, x: number): string {
    if (x <= a) return "";
    const points: string[] = [];
    const numSegments = 50;
    const startX = xToScreen(a);
    const baseY = yToScreen(0, Y_MIN, Y_MAX, PADDING.top, GRAPH_HEIGHT);

    points.push(`M ${startX.toFixed(1)} ${baseY.toFixed(1)}`);

    for (let i = 0; i <= numSegments; i++) {
        const t = a + (i / numSegments) * (x - a);
        const y = speedAtTime(t);
        const sx = xToScreen(t);
        const sy = yToScreen(y, Y_MIN, Y_MAX, PADDING.top, GRAPH_HEIGHT);
        points.push(`L ${sx.toFixed(1)} ${sy.toFixed(1)}`);
    }

    const endX = xToScreen(x);
    points.push(`L ${endX.toFixed(1)} ${baseY.toFixed(1)}`);
    points.push("Z");

    return points.join(" ");
}

// ── A(x) curve path ───────────────────────────────────────────────────────────

function generateAccumulationCurvePath(a: number, currentX: number): string {
    if (currentX <= a) return "";
    const points: string[] = [];
    const numSegments = 50;

    for (let i = 0; i <= numSegments; i++) {
        const t = a + (i / numSegments) * (currentX - a);
        const area = computeAreaUnderCurve(a, t);
        const sx = xToScreen(t);
        const sy = yToScreen(area, 0, A_MAX, LOWER_GRAPH_TOP, GRAPH_HEIGHT);
        points.push(`${i === 0 ? "M" : "L"} ${sx.toFixed(1)} ${sy.toFixed(1)}`);
    }

    return points.join(" ");
}

// ── The bespoke figure drawing ────────────────────────────────────────────────

function AccumulationFunctionDrawing() {
    const setVar = useSetVar();
    const sweepX = useVar<number>("accumulationFunction_sweepX", 0);
    const startA = useVar<number>("accumulationFunction_startA", 0);

    const [dragging, setDragging] = useState(false);
    const [hovered, setHovered] = useState(false);
    const svgRef = useRef<SVGSVGElement>(null);

    // Compute derived values from model
    const accumulatedArea = computeAreaUnderCurve(startA, sweepX);
    const currentSpeed = speedAtTime(sweepX);

    // Write derived values to store for verification
    React.useEffect(() => {
        setVar("accumulationFunction_accumulatedArea", accumulatedArea);
        setVar("accumulationFunction_currentSpeed", currentSpeed);
    }, [accumulatedArea, currentSpeed, setVar]);

    // Spring for handle affordance
    const handleScale = useSpring(dragging || hovered ? 1.15 : 1, {
        stiffness: 400,
        damping: 26,
    });

    // Pointer handling for drag
    const svgPointFromEvent = (event: React.PointerEvent): Vec2 => {
        const svg = svgRef.current;
        if (!svg) return { x: 0, y: 0 };
        const rect = svg.getBoundingClientRect();
        return {
            x: ((event.clientX - rect.left) / rect.width) * VIEW_WIDTH,
            y: ((event.clientY - rect.top) / rect.height) * VIEW_HEIGHT,
        };
    };

    const handlePointerMove = (event: React.PointerEvent) => {
        if (!dragging) return;
        const point = svgPointFromEvent(event);
        const newX = clamp(screenToX(point.x), startA, X_MAX);
        setVar("accumulationFunction_sweepX", newX);
    };

    // Screen positions
    const sweepScreenX = xToScreen(sweepX);
    const startScreenX = xToScreen(startA);
    const baseY = yToScreen(0, Y_MIN, Y_MAX, PADDING.top, GRAPH_HEIGHT);
    const sweepSpeedY = yToScreen(currentSpeed, Y_MIN, Y_MAX, PADDING.top, GRAPH_HEIGHT);
    const sweepAreaY = yToScreen(accumulatedArea, 0, A_MAX, LOWER_GRAPH_TOP, GRAPH_HEIGHT);
    const lowerBaseY = yToScreen(0, 0, A_MAX, LOWER_GRAPH_TOP, GRAPH_HEIGHT);

    const speedCurvePath = generateSpeedCurvePath();
    const shadedAreaPath = generateShadedAreaPath(startA, sweepX);
    const accumulationCurvePath = generateAccumulationCurvePath(startA, sweepX);

    return (
        <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            className="block w-full h-auto"
            role="img"
            aria-label="Speed curve with draggable sweep point showing accumulated area as a function"
        >
            <defs>
                <filter id="accumulation-handle-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#0F172A" floodOpacity="0.25" />
                </filter>
            </defs>

            {/* Upper graph: f(x) speed curve */}
            <g>
                {/* Y-axis label */}
                <text
                    x={PADDING.left - 40}
                    y={PADDING.top + GRAPH_HEIGHT / 2}
                    fill={INK}
                    fontSize="11"
                    textAnchor="middle"
                    transform={`rotate(-90 ${PADDING.left - 40} ${PADDING.top + GRAPH_HEIGHT / 2})`}
                >
                    Speed f(t)
                </text>

                {/* Axes */}
                <line
                    x1={PADDING.left}
                    y1={baseY}
                    x2={PADDING.left + GRAPH_WIDTH}
                    y2={baseY}
                    stroke={INK_STRUCTURE}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                />
                <line
                    x1={PADDING.left}
                    y1={PADDING.top}
                    x2={PADDING.left}
                    y2={baseY}
                    stroke={INK_STRUCTURE}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                />

                {/* Y-axis ticks */}
                {[0, 20, 40, 60].map((val) => {
                    const y = yToScreen(val, Y_MIN, Y_MAX, PADDING.top, GRAPH_HEIGHT);
                    return (
                        <g key={val}>
                            <line
                                x1={PADDING.left - 4}
                                y1={y}
                                x2={PADDING.left}
                                y2={y}
                                stroke={INK_QUIET}
                                strokeWidth="1.5"
                            />
                            <text x={PADDING.left - 8} y={y + 4} fill={INK_QUIET} fontSize="10" textAnchor="end">
                                {val}
                            </text>
                        </g>
                    );
                })}

                {/* Shaded area under curve */}
                {sweepX > startA && (
                    <path
                        d={shadedAreaPath}
                        fill={ACCENT_FILL}
                        data-concept="accumulationFunction_accumulatedArea"
                    />
                )}

                {/* Speed curve */}
                <path
                    d={speedCurvePath}
                    fill="none"
                    stroke={INK_STRUCTURE}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* Locked start bound a marker */}
                <g transform={`translate(${startScreenX}, ${baseY})`}>
                    <line y1={-GRAPH_HEIGHT} y2="0" stroke={LOCKED_COLOR} strokeWidth="1.5" strokeDasharray="4 3" />
                    <text y="14" fill={LOCKED_COLOR} fontSize="10" textAnchor="middle">
                        a = {startA}
                    </text>
                </g>

                {/* Sweep point x with vertical line */}
                <g>
                    <line
                        x1={sweepScreenX}
                        y1={sweepSpeedY}
                        x2={sweepScreenX}
                        y2={baseY}
                        stroke={ACCENT}
                        strokeWidth="2"
                        strokeDasharray="4 3"
                    />

                    {/* Point on curve */}
                    <circle
                        cx={sweepScreenX}
                        cy={sweepSpeedY}
                        r="5"
                        fill={ACCENT}
                    />

                    {/* Draggable handle on x-axis */}
                    <g
                        transform={`translate(${sweepScreenX}, ${baseY}) scale(${handleScale})`}
                        data-concept="accumulationFunction_sweepX"
                    >
                        <circle
                            r="12"
                            fill={ACCENT}
                            filter="url(#accumulation-handle-shadow)"
                        />
                        <text y="4" fill="white" fontSize="9" textAnchor="middle" fontWeight="600">
                            x
                        </text>
                    </g>

                    {/* Invisible hit area */}
                    <circle
                        cx={sweepScreenX}
                        cy={baseY}
                        r="24"
                        fill="transparent"
                        style={{ cursor: dragging ? "grabbing" : "grab", touchAction: "none" }}
                        onPointerDown={(e) => {
                            e.currentTarget.setPointerCapture(e.pointerId);
                            setDragging(true);
                        }}
                        onPointerMove={handlePointerMove}
                        onPointerUp={() => setDragging(false)}
                        onPointerCancel={() => setDragging(false)}
                        onPointerEnter={() => setHovered(true)}
                        onPointerLeave={() => setHovered(false)}
                    />

                </g>

                {/* Current speed readout - positioned to right of point */}
                <text x={sweepScreenX + 12} y={sweepSpeedY - 6} fill={INK} fontSize="10">
                    f({sweepX.toFixed(1)}) = {currentSpeed.toFixed(1)}
                </text>
            </g>

            {/* Lower graph: A(x) accumulation function */}
            <g>
                {/* Y-axis label */}
                <text
                    x={PADDING.left - 40}
                    y={LOWER_GRAPH_TOP + GRAPH_HEIGHT / 2}
                    fill={COVARIATION}
                    fontSize="11"
                    textAnchor="middle"
                    transform={`rotate(-90 ${PADDING.left - 40} ${LOWER_GRAPH_TOP + GRAPH_HEIGHT / 2})`}
                >
                    Area A(x)
                </text>

                {/* Axes */}
                <line
                    x1={PADDING.left}
                    y1={lowerBaseY}
                    x2={PADDING.left + GRAPH_WIDTH}
                    y2={lowerBaseY}
                    stroke={INK_STRUCTURE}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                />
                <line
                    x1={PADDING.left}
                    y1={LOWER_GRAPH_TOP}
                    x2={PADDING.left}
                    y2={lowerBaseY}
                    stroke={INK_STRUCTURE}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                />

                {/* Y-axis ticks */}
                {[0, 100, 200, 300].map((val) => {
                    const y = yToScreen(val, 0, A_MAX, LOWER_GRAPH_TOP, GRAPH_HEIGHT);
                    return (
                        <g key={val}>
                            <line
                                x1={PADDING.left - 4}
                                y1={y}
                                x2={PADDING.left}
                                y2={y}
                                stroke={INK_QUIET}
                                strokeWidth="1.5"
                            />
                            <text x={PADDING.left - 8} y={y + 4} fill={INK_QUIET} fontSize="10" textAnchor="end">
                                {val}
                            </text>
                        </g>
                    );
                })}

                {/* X-axis ticks */}
                {[0, 2, 4, 6, 8].map((val) => {
                    const x = xToScreen(val);
                    return (
                        <g key={val}>
                            <line
                                x1={x}
                                y1={lowerBaseY}
                                x2={x}
                                y2={lowerBaseY + 4}
                                stroke={INK_QUIET}
                                strokeWidth="1.5"
                            />
                            <text x={x} y={lowerBaseY + 16} fill={INK_QUIET} fontSize="10" textAnchor="middle">
                                {val}
                            </text>
                        </g>
                    );
                })}

                {/* A(x) curve - the star of the show */}
                {sweepX > startA && (
                    <path
                        d={accumulationCurvePath}
                        fill="none"
                        stroke={COVARIATION}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        data-concept="accumulationFunction_accumulatedArea"
                    />
                )}

                {/* Current A(x) point */}
                <circle
                    cx={sweepScreenX}
                    cy={sweepAreaY}
                    r="6"
                    fill={COVARIATION}
                />

                {/* Vertical dashed line connecting both graphs */}
                <line
                    x1={sweepScreenX}
                    y1={baseY + 4}
                    x2={sweepScreenX}
                    y2={LOWER_GRAPH_TOP}
                    stroke={ACCENT}
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                    opacity="0.4"
                />

                {/* A(x) value readout */}
                <text
                    x={sweepScreenX + 10}
                    y={sweepAreaY - 8}
                    fill={COVARIATION}
                    fontSize="10"
                    fontWeight="500"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                    data-concept="accumulationFunction_accumulatedArea"
                >
                    A({sweepX.toFixed(1)}) = {accumulatedArea.toFixed(1)}
                </text>
            </g>
        </svg>
    );
}

// ── Figure shell composition ──────────────────────────────────────────────────

function AccumulationFunctionFigure() {
    const setVar = useSetVar();

    return (
        <Figure
            id="accumulation-function-figure"
            aspectRatio={`${VIEW_WIDTH} / ${VIEW_HEIGHT}`}
            onReset={() => {
                setVar("accumulationFunction_sweepX", 0);
            }}
            caption="Drag the teal x marker to explore how A(x) traces out a function."
        >
            <AccumulationFunctionDrawing />
            <div className="px-6 pb-3">
                <FigureSlider
                    varName="accumulationFunction_sweepX"
                    label="Sweep position (x)"
                    {...numberPropsFromDefinition(getVariableInfo("accumulationFunction_sweepX"))}
                    formatValue={(v) => `${v.toFixed(1)} s`}
                />
            </div>
            <InteractionHintSequence
                hintKey="accumulation-function-sweep-drag"
                steps={[
                    {
                        gesture: "drag-horizontal",
                        label: "Drag x along the axis to explore",
                        position: { x: "15%", y: "42%" },
                        dragPath: {
                            type: "line",
                            startOffset: { x: -20, y: 0 },
                            endOffset: { x: 40, y: 0 },
                        },
                    },
                ]}
            />
        </Figure>
    );
}

// ── Exported section blocks ───────────────────────────────────────────────────

export const accumulationFunctionBlocks: ReactElement[] = [
    <StackLayout key="layout-accumulation-function-heading" maxWidth="xl">
        <Block id="accumulation-function-heading" padding="md">
            <EditableH2 id="h2-accumulation-function-heading" blockId="accumulation-function-heading">
                The Integral as a Function
            </EditableH2>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-accumulation-function-intro" maxWidth="xl">
        <Block id="accumulation-function-intro" padding="sm">
            <EditableParagraph id="para-accumulation-function-intro" blockId="accumulation-function-intro">
                Stop the car at mile 2, then mile 5, then mile 8. Each stopping point gives a different odometer reading.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-accumulation-function-visualization" maxWidth="xl">
        <Block id="accumulation-function-visualization" padding="none" hasVisualization className="overflow-hidden">
            <AccumulationFunctionFigure />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-accumulation-function-exploration" maxWidth="xl">
        <Block id="accumulation-function-exploration" padding="sm">
            <EditableParagraph id="para-accumulation-function-exploration" blockId="accumulation-function-exploration">
                Drag the{" "}
                <InlineSpotColor varName="accumulationFunction_sweepX" color="#62D0AD">
                    teal x marker
                </InlineSpotColor>
                {" "}along the x-axis. Watch how the{" "}
                <InlineSpotColor varName="accumulationFunction_accumulatedArea" color="#8E90F5">
                    indigo A(x) curve
                </InlineSpotColor>
                {" "}traces out in the lower graph as x moves.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-accumulation-function-insight" maxWidth="xl">
        <Block id="accumulation-function-insight" padding="sm">
            <EditableParagraph id="para-accumulation-function-insight" blockId="accumulation-function-insight">
                Each position{" "}
                <InlineScrubbleNumber
                    varName="accumulationFunction_sweepX"
                    {...numberPropsFromDefinition(getVariableInfo("accumulationFunction_sweepX"))}
                    formatValue={(v) => `x = ${v.toFixed(1)}`}
                />{" "}
                has its own{" "}
                <InlineSpotColor varName="accumulationFunction_accumulatedArea" color="#8E90F5">
                    A(x)
                </InlineSpotColor>
                . The accumulated area isn't a single number; it's a function of the upper bound.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-accumulation-function-question" maxWidth="xl">
        <Block id="accumulation-function-question" padding="sm">
            <EditableParagraph id="para-accumulation-function-question" blockId="accumulation-function-question">
                When we write{" "}
                <InlineSpotColor varName="accumulationFunction_accumulatedArea" color="#8E90F5">
                    A(x)
                </InlineSpotColor>{" "}
                = ∫₀ˣ f(t) dt, the result is{" "}
                <InlineFeedback
                    varName="accumulationFunction_answerIntegralType"
                    correctValue="a function of x"
                    successMessage="Exactly right"
                    failureMessage="Look at the lower graph. As x changes, does A(x) stay the same, or does it trace out a curve?"
                    visualizationHint={{
                        blockId: "accumulation-function-visualization",
                        hintKey: "feedback-integral-type-hint",
                        steps: [
                            {
                                gesture: "drag-horizontal",
                                label: "Drag x and watch A(x) change in the lower graph",
                                position: { x: "50%", y: "70%" },
                                completionVar: "accumulationFunction_sweepX",
                                completionValue: 5,
                                completionTolerance: 1,
                            },
                        ],
                        label: "Explore the graphs",
                        resetVars: { accumulationFunction_sweepX: 1 },
                    }}
                >
                    <InlineClozeChoice
                        varName="accumulationFunction_answerIntegralType"
                        correctAnswer="a function of x"
                        options={["a single number", "a function of x", "a constant", "undefined"]}
                        {...choicePropsFromDefinition(getVariableInfo("accumulationFunction_answerIntegralType"))}
                    />
                </InlineFeedback>.
            </EditableParagraph>
        </Block>
    </StackLayout>,
];
