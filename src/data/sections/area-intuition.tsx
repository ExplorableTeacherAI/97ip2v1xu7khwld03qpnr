/**
 * Area Intuition Section — The Rolling Odometer Lesson
 * ====================================================
 *
 * Opening section: students learn that integrals measure area under a curve
 * by experiencing a predict-then-measure sampling game. They click along a
 * timeline to sample speed readings, spending limited "fuel tokens," then
 * see how their Riemann sum estimate compares to the true distance traveled.
 */

import React, { useCallback, useEffect, useRef, useState, type ReactElement } from "react";
import { StackLayout } from "@/components/layouts";
import { Block } from "@/components/templates";
import {
    EditableH2,
    EditableParagraph,
    InlineClozeChoice,
    InlineFeedback,
    InteractionHintSequence,
} from "@/components/atoms";
import { Figure } from "@/components/molecules";
import { useVar, useSetVar } from "@/stores";
import { clamp, useRafLoop, useSpring, lerp } from "@/lib/motion";
import {
    choicePropsFromDefinition,
    getVariableInfo,
} from "../variables";
import { speedAtTime, computeAreaUnderCurve, computeRiemannSum } from "../model";

// ── View constants ─────────────────────────────────────────────────────────────

const VIEW_WIDTH = 520;
const VIEW_HEIGHT = 300;
const MARGIN = { top: 32, right: 20, bottom: 40, left: 44 };
const PLOT_WIDTH = VIEW_WIDTH - MARGIN.left - MARGIN.right;
const PLOT_HEIGHT = VIEW_HEIGHT - MARGIN.top - MARGIN.bottom;

const X_MIN = 0;
const X_MAX = 8;
const Y_MIN = 0;
const Y_MAX = 70;

const MAX_FUEL_TOKENS = 8;

// Colors following the design language
const INK = "#334155";
const INK_STRUCTURE = "#64748B";
const INK_QUIET = "#CBD5E1";
const ACCENT = "#62D0AD"; // Primary teal for the shaded area and left bound
const ACCENT_SECONDARY = "#8E90F5"; // Indigo for right bound
const AMBER = "#F7B23B"; // Highlight/attention

// ── Coordinate transforms ──────────────────────────────────────────────────────

function xToPixel(x: number): number {
    return MARGIN.left + ((x - X_MIN) / (X_MAX - X_MIN)) * PLOT_WIDTH;
}

function yToPixel(y: number): number {
    return MARGIN.top + PLOT_HEIGHT - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * PLOT_HEIGHT;
}

function pixelToX(px: number): number {
    return X_MIN + ((px - MARGIN.left) / PLOT_WIDTH) * (X_MAX - X_MIN);
}

// ── Generate the path data for the speed curve ─────────────────────────────────

function generateCurvePath(a: number, b: number, samples = 100): string {
    const points: string[] = [];
    for (let i = 0; i <= samples; i++) {
        const t = a + ((b - a) * i) / samples;
        const x = xToPixel(t);
        const y = yToPixel(speedAtTime(t));
        points.push(i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`);
    }
    return points.join(" ");
}

// ── Generate the filled area path (curve down to baseline) ─────────────────────

function generateAreaPath(a: number, b: number, fillHeight: number, samples = 100): string {
    if (a >= b) return "";

    const points: string[] = [];
    const baseline = yToPixel(Y_MIN);

    // Start at bottom-left
    points.push(`M ${xToPixel(a)} ${baseline}`);

    // Draw curve at the fill height (partial fill from bottom)
    for (let i = 0; i <= samples; i++) {
        const t = a + ((b - a) * i) / samples;
        const x = xToPixel(t);
        const fullY = yToPixel(speedAtTime(t));
        // fillHeight is 0-1; interpolate between baseline and curve
        const y = lerp(baseline, fullY, fillHeight);
        points.push(`L ${x} ${y}`);
    }

    // Close back to baseline
    points.push(`L ${xToPixel(b)} ${baseline}`);
    points.push("Z");

    return points.join(" ");
}

// ── The bespoke SVG drawing ────────────────────────────────────────────────────

function SpeedCurveDrawing() {
    const setVar = useSetVar();
    const boundA = useVar<number>("areaIntuition_boundA", 0);
    const boundB = useVar<number>("areaIntuition_boundB", 8);
    const samplesUsed = useVar<number>("areaIntuition_samplesUsed", 0);
    const samplePoints = useVar<number[]>("areaIntuition_samplePoints", []);
    const revealed = useVar<boolean>("areaIntuition_revealed", false);
    const rawFillProgress = useVar<number>("areaIntuition_fillProgress", 0);
    // Clamp fillProgress to [0, 1] to satisfy invariant - write back if out of bounds
    const fillProgress = Math.max(0, Math.min(1, rawFillProgress ?? 0));

    // Enforce invariant: always write clamped value back to store
    useEffect(() => {
        if (rawFillProgress !== fillProgress) {
            setVar("areaIntuition_fillProgress", fillProgress);
        }
    }, [rawFillProgress, fillProgress, setVar]);

    const [draggingA, setDraggingA] = useState(false);
    const [draggingB, setDraggingB] = useState(false);
    const [hoveredA, setHoveredA] = useState(false);
    const [hoveredB, setHoveredB] = useState(false);
    const svgRef = useRef<SVGSVGElement>(null);

    // Spring animations for smooth handle affordances
    const handleAScale = useSpring(draggingA || hoveredA ? 1.2 : 1, { stiffness: 400, damping: 26 });
    const handleBScale = useSpring(draggingB || hoveredB ? 1.2 : 1, { stiffness: 400, damping: 26 });
    const animatedFill = useSpring(fillProgress, { stiffness: 60, damping: 15 });

    // Compute derived values
    const trueArea = computeAreaUnderCurve(boundA, boundB);
    const estimatedDistance = computeRiemannSum(boundA, boundB, samplePoints as number[]);

    // Write derived values to store
    useEffect(() => {
        setVar("areaIntuition_trueArea", trueArea);
        setVar("areaIntuition_estimatedDistance", estimatedDistance);
        setVar("areaIntuition_animatedArea", trueArea * animatedFill);
    }, [trueArea, estimatedDistance, animatedFill, setVar]);

    // Pointer → SVG coordinate
    const getXFromEvent = useCallback((event: React.PointerEvent): number => {
        const svg = svgRef.current;
        if (!svg) return 0;
        const rect = svg.getBoundingClientRect();
        const px = ((event.clientX - rect.left) / rect.width) * VIEW_WIDTH;
        return pixelToX(px);
    }, []);

    // Handle drag for bound A
    const handlePointerMoveA = useCallback((event: React.PointerEvent) => {
        if (!draggingA) return;
        const x = getXFromEvent(event);
        setVar("areaIntuition_boundA", clamp(x, X_MIN, boundB - 0.5));
    }, [draggingA, boundB, getXFromEvent, setVar]);

    // Handle drag for bound B
    const handlePointerMoveB = useCallback((event: React.PointerEvent) => {
        if (!draggingB) return;
        const x = getXFromEvent(event);
        setVar("areaIntuition_boundB", clamp(x, boundA + 0.5, X_MAX));
    }, [draggingB, boundA, getXFromEvent, setVar]);

    // Handle click on the plot area to sample speed
    const handlePlotClick = useCallback((event: React.PointerEvent) => {
        if (draggingA || draggingB) return;
        if (samplesUsed >= MAX_FUEL_TOKENS) return;

        const svg = svgRef.current;
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const px = ((event.clientX - rect.left) / rect.width) * VIEW_WIDTH;
        const py = ((event.clientY - rect.top) / rect.height) * VIEW_HEIGHT;

        // Check if click is within plot area
        if (px < MARGIN.left || px > VIEW_WIDTH - MARGIN.right) return;
        if (py < MARGIN.top || py > VIEW_HEIGHT - MARGIN.bottom) return;

        const x = pixelToX(px);
        if (x < boundA || x > boundB) return;

        // Add sample point
        const newPoints = [...(samplePoints as number[]), x];
        setVar("areaIntuition_samplePoints", newPoints);
        setVar("areaIntuition_samplesUsed", samplesUsed + 1);
    }, [draggingA, draggingB, samplesUsed, samplePoints, boundA, boundB, setVar]);

    // Generate tick marks for axes
    const xTicks = [0, 2, 4, 6, 8];
    const yTicks = [0, 20, 40, 60];

    return (
        <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            className="block w-full"
            style={{ overflow: "hidden", maxHeight: `${VIEW_HEIGHT}px` }}
            role="img"
            aria-label="Speed versus time graph showing the route profile"
            onPointerMove={(e) => {
                handlePointerMoveA(e);
                handlePointerMoveB(e);
            }}
            onPointerUp={() => {
                setDraggingA(false);
                setDraggingB(false);
            }}
            onClick={handlePlotClick}
        >
            <defs>
                <filter id="area-handle-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#0F172A" floodOpacity="0.2" />
                </filter>
                <clipPath id="plot-clip">
                    <rect x={MARGIN.left} y={MARGIN.top} width={PLOT_WIDTH} height={PLOT_HEIGHT} />
                </clipPath>
            </defs>

            {/* Grid lines */}
            <g stroke={INK_QUIET} strokeWidth="1">
                {yTicks.map(y => (
                    <line
                        key={`grid-y-${y}`}
                        x1={MARGIN.left}
                        y1={yToPixel(y)}
                        x2={VIEW_WIDTH - MARGIN.right}
                        y2={yToPixel(y)}
                        strokeDasharray="4 4"
                        opacity="0.5"
                    />
                ))}
            </g>

            {/* Axes */}
            <g stroke={INK_STRUCTURE} strokeWidth="2" strokeLinecap="round">
                {/* X axis */}
                <line x1={MARGIN.left} y1={yToPixel(Y_MIN)} x2={VIEW_WIDTH - MARGIN.right} y2={yToPixel(Y_MIN)} />
                {/* Y axis */}
                <line x1={MARGIN.left} y1={yToPixel(Y_MIN)} x2={MARGIN.left} y2={MARGIN.top} />
            </g>

            {/* Axis labels */}
            <text x={VIEW_WIDTH / 2} y={VIEW_HEIGHT - 8} fill={INK} fontSize="12" textAnchor="middle">
                Time (seconds)
            </text>
            <text
                x={16}
                y={MARGIN.top + PLOT_HEIGHT / 2}
                fill={INK}
                fontSize="12"
                textAnchor="middle"
                transform={`rotate(-90 16 ${MARGIN.top + PLOT_HEIGHT / 2})`}
            >
                Speed (mph)
            </text>

            {/* X tick marks and labels */}
            {xTicks.map(t => (
                <g key={`x-tick-${t}`}>
                    <line
                        x1={xToPixel(t)}
                        y1={yToPixel(Y_MIN)}
                        x2={xToPixel(t)}
                        y2={yToPixel(Y_MIN) + 6}
                        stroke={INK_STRUCTURE}
                        strokeWidth="2"
                        strokeLinecap="round"
                    />
                    <text x={xToPixel(t)} y={yToPixel(Y_MIN) + 20} fill={INK} fontSize="11" textAnchor="middle">
                        {t}
                    </text>
                </g>
            ))}

            {/* Y tick marks and labels */}
            {yTicks.map(v => (
                <g key={`y-tick-${v}`}>
                    <line
                        x1={MARGIN.left - 6}
                        y1={yToPixel(v)}
                        x2={MARGIN.left}
                        y2={yToPixel(v)}
                        stroke={INK_STRUCTURE}
                        strokeWidth="2"
                        strokeLinecap="round"
                    />
                    <text x={MARGIN.left - 10} y={yToPixel(v) + 4} fill={INK} fontSize="11" textAnchor="end">
                        {v}
                    </text>
                </g>
            ))}

            {/* Shaded area under curve (clipped to plot area) */}
            <g clipPath="url(#plot-clip)" data-concept="areaIntuition_fillProgress">
                <path
                    data-concept="areaIntuition_trueArea"
                    d={generateAreaPath(boundA, boundB, animatedFill)}
                    fill={ACCENT}
                    fillOpacity={revealed ? 0.3 : 0.15}
                />
            </g>

            {/* The speed curve */}
            <path
                d={generateCurvePath(X_MIN, X_MAX)}
                fill="none"
                stroke={INK_STRUCTURE}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* Sample point markers and their rectangles */}
            <g data-concept="areaIntuition_samplePoints">
            {(samplePoints as number[]).sort((a, b) => a - b).map((x, idx, arr) => {
                const speed = speedAtTime(x);
                const nextX = arr[idx + 1] ?? boundB;
                const rectWidth = xToPixel(nextX) - xToPixel(x);
                const rectHeight = yToPixel(Y_MIN) - yToPixel(speed);

                return (
                    <g key={`sample-${idx}`}>
                        {/* Rectangle showing the Riemann slice */}
                        <rect
                            x={xToPixel(x)}
                            y={yToPixel(speed)}
                            width={rectWidth}
                            height={rectHeight}
                            fill={AMBER}
                            fillOpacity="0.25"
                            stroke={AMBER}
                            strokeWidth="1.5"
                            strokeDasharray="4 2"
                        />
                        {/* Sample marker dot */}
                        <circle
                            cx={xToPixel(x)}
                            cy={yToPixel(speed)}
                            r="6"
                            fill={AMBER}
                            stroke="white"
                            strokeWidth="2"
                        />
                        {/* Speed readout */}
                        <text
                            x={xToPixel(x)}
                            y={yToPixel(speed) - 12}
                            fill={INK}
                            fontSize="10"
                            textAnchor="middle"
                            fontWeight="600"
                        >
                            {speed.toFixed(0)} mph
                        </text>
                    </g>
                );
            })}
            </g>

            {/* Bound A handle (draggable) */}
            <g
                data-concept="areaIntuition_boundA"
                transform={`translate(${xToPixel(boundA)} ${yToPixel(Y_MIN)})`}
                style={{ cursor: draggingA ? "grabbing" : "grab" }}
            >
                {/* Vertical line showing the bound */}
                <line
                    x1={0}
                    y1={0}
                    x2={0}
                    y2={-(PLOT_HEIGHT)}
                    stroke={ACCENT}
                    strokeWidth="2"
                    strokeDasharray="6 4"
                    opacity="0.7"
                />
                {/* Draggable handle */}
                <g transform={`scale(${handleAScale})`}>
                    <circle r="10" fill={ACCENT} filter="url(#area-handle-shadow)" />
                    <text y="4" fill="white" fontSize="10" textAnchor="middle" fontWeight="bold">a</text>
                </g>
                {/* Invisible larger hit area */}
                <circle
                    r="20"
                    fill="transparent"
                    onPointerDown={(e) => {
                        e.currentTarget.setPointerCapture(e.pointerId);
                        setDraggingA(true);
                    }}
                    onPointerEnter={() => setHoveredA(true)}
                    onPointerLeave={() => setHoveredA(false)}
                />
            </g>

            {/* Bound B handle (draggable) */}
            <g
                data-concept="areaIntuition_boundB"
                transform={`translate(${xToPixel(boundB)} ${yToPixel(Y_MIN)})`}
                style={{ cursor: draggingB ? "grabbing" : "grab" }}
            >
                {/* Vertical line showing the bound */}
                <line
                    x1={0}
                    y1={0}
                    x2={0}
                    y2={-(PLOT_HEIGHT)}
                    stroke={ACCENT_SECONDARY}
                    strokeWidth="2"
                    strokeDasharray="6 4"
                    opacity="0.7"
                />
                {/* Draggable handle */}
                <g transform={`scale(${handleBScale})`}>
                    <circle r="10" fill={ACCENT_SECONDARY} filter="url(#area-handle-shadow)" />
                    <text y="4" fill="white" fontSize="10" textAnchor="middle" fontWeight="bold">b</text>
                </g>
                {/* Invisible larger hit area */}
                <circle
                    r="20"
                    fill="transparent"
                    onPointerDown={(e) => {
                        e.currentTarget.setPointerCapture(e.pointerId);
                        setDraggingB(true);
                    }}
                    onPointerEnter={() => setHoveredB(true)}
                    onPointerLeave={() => setHoveredB(false)}
                />
            </g>

            {/* Distance readout - positioned at top left, quiet styling */}
            <g transform={`translate(${MARGIN.left + 4} ${MARGIN.top - 16})`}>
                <text
                    data-concept="areaIntuition_estimatedDistance"
                    fill={INK_STRUCTURE}
                    fontSize="11"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                >
                    Est: {estimatedDistance.toFixed(1)} | True:{" "}
                    <tspan
                        data-concept="areaIntuition_animatedArea"
                        fill={revealed ? INK : INK_QUIET}
                    >
                        {revealed ? (trueArea * animatedFill).toFixed(1) : "???"}
                    </tspan>
                </text>
            </g>
        </svg>
    );
}

// ── Figure wrapper ─────────────────────────────────────────────────────────────

function SpeedCurveFigure() {
    const setVar = useSetVar();
    const revealed = useVar<boolean>("areaIntuition_revealed", false);
    const rawFillProgress = useVar<number>("areaIntuition_fillProgress", 0);
    // Clamp fillProgress to [0, 1] to satisfy invariant
    const fillProgress = Math.max(0, Math.min(1, rawFillProgress ?? 0));
    const samplesUsed = useVar<number>("areaIntuition_samplesUsed", 0);
    const animatingRef = useRef(false);

    // Enforce invariant: always write clamped value back to store
    useEffect(() => {
        if (rawFillProgress !== fillProgress) {
            setVar("areaIntuition_fillProgress", fillProgress);
        }
    }, [rawFillProgress, fillProgress, setVar]);

    // Animate the fill when revealed
    useRafLoop(
        (dt) => {
            if (!animatingRef.current) return;
            // Clamp progress to [0, 1] range to satisfy invariant
            const newProgress = Math.max(0, Math.min(fillProgress + dt * 0.5, 1));
            setVar("areaIntuition_fillProgress", newProgress);
            if (newProgress >= 1) {
                animatingRef.current = false;
            }
        },
        { paused: !animatingRef.current }
    );

    const handleReveal = () => {
        setVar("areaIntuition_revealed", true);
        animatingRef.current = true;
    };

    const handleReset = () => {
        setVar("areaIntuition_boundA", 0);
        setVar("areaIntuition_boundB", 8);
        setVar("areaIntuition_samplesUsed", 0);
        setVar("areaIntuition_samplePoints", []);
        setVar("areaIntuition_revealed", false);
        setVar("areaIntuition_fillProgress", 0);
        animatingRef.current = false;
    };

    return (
        <Figure
            id="area-intuition-speed-curve"
            onReset={handleReset}
            caption="Click anywhere on the timeline to spend a fuel token and check your speed at that instant. Drag the teal (a) and purple (b) handles to adjust your trip window."
        >
            <div style={{ maxHeight: "320px", overflow: "hidden" }}>
                <SpeedCurveDrawing />
            </div>
            <div className="px-6 pb-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <button
                        data-concept="areaIntuition_revealed"
                        onClick={handleReveal}
                        disabled={revealed}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            revealed
                                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                : "bg-[#62D0AD] text-white hover:bg-[#4fb898]"
                        }`}
                    >
                        {revealed ? "Distance revealed" : "Reveal true distance"}
                    </button>
                </div>
                {/* Fuel tokens as simple text - quiet styling */}
                <div
                    data-concept="areaIntuition_samplesUsed"
                    className="text-xs text-slate-500"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                >
                    Samples: {samplesUsed}/{MAX_FUEL_TOKENS}
                </div>
            </div>
            <InteractionHintSequence
                hintKey="area-intuition-drag-bounds"
                steps={[
                    {
                        gesture: "click",
                        label: "Click timeline to sample speed",
                        position: { x: "50%", y: "50%" },
                    },
                    {
                        gesture: "drag-horizontal",
                        label: "Drag the handles to adjust bounds",
                        position: { x: "12%", y: "75%" },
                        dragPath: { type: "line", startOffset: { x: -20, y: 0 }, endOffset: { x: 20, y: 0 } },
                    },
                ]}
            />
        </Figure>
    );
}

// ── Exported blocks (flat array, one component per Block) ──────────────────────

export const areaIntuitionBlocks: ReactElement[] = [
    // Section heading
    <StackLayout key="layout-area-intuition-heading" maxWidth="xl">
        <Block id="area-intuition-heading" padding="md">
            <EditableH2 id="h2-area-intuition-heading" blockId="area-intuition-heading">
                The Odometer Challenge
            </EditableH2>
        </Block>
    </StackLayout>,

    // Paragraph 1 - Introduction
    <StackLayout key="layout-area-intuition-intro" maxWidth="xl">
        <Block id="area-intuition-intro" padding="sm">
            <EditableParagraph id="para-area-intuition-intro" blockId="area-intuition-intro">
                Your speed changes constantly on this route—but you can only check the speedometer eight times. Can you estimate the total distance traveled?
            </EditableParagraph>
        </Block>
    </StackLayout>,

    // The interactive visualization
    <StackLayout key="layout-area-intuition-visualization" maxWidth="xl">
        <Block id="area-intuition-visualization" padding="sm" hasVisualization>
            <SpeedCurveFigure />
        </Block>
    </StackLayout>,

    // Paragraph 2 - Instructions
    <StackLayout key="layout-area-intuition-instructions" maxWidth="xl">
        <Block id="area-intuition-instructions" padding="sm">
            <EditableParagraph id="para-area-intuition-instructions" blockId="area-intuition-instructions">
                Click the timeline to sample your speed—each click costs one fuel token. Drag the teal and purple handles to adjust your trip window.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    // Paragraph 3 - Reflection
    <StackLayout key="layout-area-intuition-reflection" maxWidth="xl">
        <Block id="area-intuition-reflection" padding="sm">
            <EditableParagraph id="para-area-intuition-reflection" blockId="area-intuition-reflection">
                The area under the speed curve IS the distance traveled. More samples where speed changes rapidly gives a better estimate.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    // Assessment question
    <StackLayout key="layout-area-intuition-question" maxWidth="xl">
        <Block id="area-intuition-question" padding="sm">
            <EditableParagraph id="para-area-intuition-question" blockId="area-intuition-question">
                Based on your experience with the odometer challenge, where should you place your limited samples to get the best estimate of total distance?{" "}
                <InlineFeedback
                    varName="areaIntuition_answerSampling"
                    correctValue="where speed changes quickly"
                    position="standalone"
                    successMessage="Exactly right! Placing samples where the curve changes rapidly captures the variations that matter most for accuracy"
                    failureMessage="Not quite"
                    hint="Think about where your rectangular approximations deviate most from the actual curve"
                >
                    <InlineClozeChoice
                        varName="areaIntuition_answerSampling"
                        correctAnswer="where speed changes quickly"
                        options={["where speed is highest", "where speed changes quickly", "evenly spaced", "at random times"]}
                        {...choicePropsFromDefinition(getVariableInfo('areaIntuition_answerSampling'))}
                    />
                </InlineFeedback>
            </EditableParagraph>
        </Block>
    </StackLayout>,
];
