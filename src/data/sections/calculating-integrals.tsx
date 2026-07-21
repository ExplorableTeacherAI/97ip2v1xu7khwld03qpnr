/**
 * Calculating Integrals Section — The Grand Finale
 * =================================================
 *
 * Students apply the FTC to calculate definite integrals using F(b) - F(a),
 * seeing the connection between symbolic calculation and geometric meaning.
 * Uses v(t) = 2t with antiderivative D(t) = t² for exact symbolic computation.
 */

import React, { useRef, useState, useEffect, type ReactElement } from "react";
import { StackLayout, SplitLayout } from "@/components/layouts";
import { Block } from "@/components/templates";
import {
    EditableH2,
    EditableParagraph,
    InlineScrubbleNumber,
    InlineSpotColor,
    InlineFormula,
    InlineFeedback,
    InlineClozeInput,
    InlineClozeChoice,
    InteractionHintSequence,
} from "@/components/atoms";
import { Figure, FigureSlider, FormulaBlock } from "@/components/molecules";
import { useVar, useSetVar } from "@/stores";
import { clamp, useSpring, lerp } from "@/lib/motion";
import {
    simpleSpeedFunction,
    simpleAntiderivative,
    computeFTCIntegral,
    getSimpleSpeedCurvePoints,
    getAntiderivativeCurvePoints,
    getAreaPolygonPoints,
} from "../model";
import {
    getVariableInfo,
    numberPropsFromDefinition,
    clozePropsFromDefinition,
    choicePropsFromDefinition,
} from "../variables";

// ── Color palette (per FIGURE_DESIGN_LANGUAGE.md) ─────────────────────────────

const ACCENT = "#62D0AD"; // Primary: upper bound b, F(b), main interactive
const ACCENT_SECONDARY = "#8E90F5"; // Secondary: lower bound a, F(a)
const HIGHLIGHT = "#F7B23B"; // Result: F(b)-F(a), the area
const INK = "#334155"; // Labels, text
const INK_STRUCTURE = "#64748B"; // Axes, structure lines
const INK_QUIET = "#94A3B8"; // Grid, minor elements
const PAPER_FILL = "#F1F5F9"; // Background fills
const AREA_FILL = "rgba(247, 178, 59, 0.18)"; // Shaded area under curve

// ── View constants ────────────────────────────────────────────────────────────

const VIEW_WIDTH = 560;
const VIEW_HEIGHT = 400;
const MARGIN = { top: 40, right: 40, bottom: 50, left: 60 };
const PLOT_WIDTH = VIEW_WIDTH - MARGIN.left - MARGIN.right;
const PLOT_HEIGHT = VIEW_HEIGHT - MARGIN.top - MARGIN.bottom;

// Domain bounds
const T_MIN = 0;
const T_MAX = 8;
const DEFAULT_B = 5;

// ── The bespoke split-screen visualization ────────────────────────────────────

function FTCCalculationDrawing() {
    const setVar = useSetVar();
    const a = useVar<number>("calcIntegrals_a", 0);
    const b = useVar<number>("calcIntegrals_b", DEFAULT_B);

    // Compute derived values from the model
    const { Fa, Fb, difference, area } = computeFTCIntegral(a, b);

    // Write derived values to the store for verification
    useEffect(() => {
        setVar("calcIntegrals_Fa", Fa);
        setVar("calcIntegrals_Fb", Fb);
        setVar("calcIntegrals_difference", difference);
        setVar("calcIntegrals_area", area);
        setVar("calcIntegrals_f", "linear"); // v(t) = 2t
    }, [Fa, Fb, difference, area, setVar]);

    // Spring for smooth animations
    const smoothB = useSpring(b, { stiffness: 200, damping: 24 });

    // Dragging state for upper bound
    const [dragging, setDragging] = useState(false);
    const [hovered, setHovered] = useState(false);
    const svgRef = useRef<SVGSVGElement>(null);

    // Scale functions
    const xScale = (t: number) =>
        MARGIN.left + ((t - T_MIN) / (T_MAX - T_MIN)) * PLOT_WIDTH;
    const yScaleSpeed = (v: number) => {
        const maxV = simpleSpeedFunction(T_MAX); // 16
        return MARGIN.top + PLOT_HEIGHT - (v / maxV) * PLOT_HEIGHT;
    };
    const yScalePosition = (d: number) => {
        const maxD = simpleAntiderivative(T_MAX); // 64
        return MARGIN.top + PLOT_HEIGHT - (d / maxD) * PLOT_HEIGHT;
    };

    // Generate curve points
    const speedCurvePoints = getSimpleSpeedCurvePoints(T_MIN, T_MAX, 80);
    const positionCurvePoints = getAntiderivativeCurvePoints(T_MIN, T_MAX, 80);

    // Area polygon (shaded region under speed curve)
    const areaPolygon = getAreaPolygonPoints(a, smoothB, 50);
    const areaPath = areaPolygon
        .map((p, i) => `${i === 0 ? "M" : "L"}${xScale(p.x)},${yScaleSpeed(p.y)}`)
        .join(" ") + " Z";

    // Speed curve path
    const speedPath = speedCurvePoints
        .map((p, i) => `${i === 0 ? "M" : "L"}${xScale(p.x)},${yScaleSpeed(p.y)}`)
        .join(" ");

    // Position curve path
    const positionPath = positionCurvePoints
        .map((p, i) => `${i === 0 ? "M" : "L"}${xScale(p.x)},${yScalePosition(p.y)}`)
        .join(" ");

    // Pointer handling for dragging b
    const svgPointFromEvent = (event: React.PointerEvent): number => {
        const svg = svgRef.current;
        if (!svg) return b;
        const rect = svg.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * VIEW_WIDTH;
        // Convert x position to t value
        const t = T_MIN + ((x - MARGIN.left) / PLOT_WIDTH) * (T_MAX - T_MIN);
        return clamp(t, 1, T_MAX);
    };

    const handlePointerDown = (event: React.PointerEvent) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
    };

    const handlePointerMove = (event: React.PointerEvent) => {
        if (!dragging) return;
        const newB = svgPointFromEvent(event);
        setVar("calcIntegrals_b", Math.round(newB * 2) / 2); // Snap to 0.5
    };

    const handlePointerUp = () => setDragging(false);

    // Handle scale for affordance
    const handleScale = useSpring(dragging || hovered ? 1.2 : 1, {
        stiffness: 400,
        damping: 26,
    });

    // Positions for key points
    const bX = xScale(smoothB);
    const aX = xScale(a);
    const FbY = yScalePosition(Fb);
    const FaY = yScalePosition(Fa);
    const vBY = yScaleSpeed(simpleSpeedFunction(smoothB));

    return (
        <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            className="block w-full"
            style={{ overflow: "hidden", maxHeight: `${VIEW_HEIGHT}px` }}
            role="img"
            aria-label="FTC calculation visualization showing speed curve, position curve, and the relationship F(b)-F(a) = Area"
        >
            <defs>
                <filter id="calc-handle-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#0F172A" floodOpacity="0.2" />
                </filter>
            </defs>

            {/* Background */}
            <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="white" />

            {/* Grid lines */}
            {[1, 2, 3, 4, 5, 6, 7, 8].map((t) => (
                <line
                    key={`grid-x-${t}`}
                    x1={xScale(t)}
                    y1={MARGIN.top}
                    x2={xScale(t)}
                    y2={MARGIN.top + PLOT_HEIGHT}
                    stroke={INK_QUIET}
                    strokeWidth="0.5"
                    strokeDasharray="4,4"
                    opacity="0.3"
                />
            ))}

            {/* Axes */}
            <line
                x1={MARGIN.left}
                y1={MARGIN.top + PLOT_HEIGHT}
                x2={MARGIN.left + PLOT_WIDTH}
                y2={MARGIN.top + PLOT_HEIGHT}
                stroke={INK_STRUCTURE}
                strokeWidth="1.5"
                strokeLinecap="round"
            />
            <line
                x1={MARGIN.left}
                y1={MARGIN.top}
                x2={MARGIN.left}
                y2={MARGIN.top + PLOT_HEIGHT}
                stroke={INK_STRUCTURE}
                strokeWidth="1.5"
                strokeLinecap="round"
            />

            {/* X-axis labels */}
            {[0, 2, 4, 6, 8].map((t) => (
                <text
                    key={`x-label-${t}`}
                    x={xScale(t)}
                    y={MARGIN.top + PLOT_HEIGHT + 20}
                    fill={INK}
                    fontSize="11"
                    textAnchor="middle"
                >
                    {t}
                </text>
            ))}
            <text
                x={MARGIN.left + PLOT_WIDTH / 2}
                y={MARGIN.top + PLOT_HEIGHT + 40}
                fill={INK}
                fontSize="12"
                textAnchor="middle"
            >
                t (minutes)
            </text>

            {/* Shaded area under speed curve (the geometric area) */}
            <path
                d={areaPath}
                fill={AREA_FILL}
                stroke={HIGHLIGHT}
                strokeWidth="1"
                data-concept="calcIntegrals_area"
            />

            {/* Speed curve v(t) = 2t */}
            <path
                d={speedPath}
                fill="none"
                stroke={INK_STRUCTURE}
                strokeWidth="2"
                strokeLinecap="round"
            />
            <text
                x={xScale(7.2)}
                y={yScaleSpeed(simpleSpeedFunction(7.2)) - 10}
                fill={INK_STRUCTURE}
                fontSize="12"
                fontStyle="italic"
            >
                v(t) = 2t
            </text>

            {/* Position curve D(t) = t² (the antiderivative) */}
            <path
                d={positionPath}
                fill="none"
                stroke={ACCENT}
                strokeWidth="2.5"
                strokeLinecap="round"
                data-concept="calcIntegrals_Fb"
            />
            <text
                x={xScale(7.5)}
                y={yScalePosition(simpleAntiderivative(7.5)) + 20}
                fill={ACCENT}
                fontSize="12"
                fontStyle="italic"
            >
                D(t) = t²
            </text>

            {/* Vertical line showing F(b) - F(a) on position curve */}
            <line
                x1={bX}
                y1={FbY}
                x2={bX}
                y2={FaY}
                stroke={HIGHLIGHT}
                strokeWidth="3"
                strokeLinecap="round"
                data-concept="calcIntegrals_difference"
            />

            {/* Point at F(a) on position curve */}
            <circle
                cx={aX}
                cy={FaY}
                r="5"
                fill={ACCENT_SECONDARY}
                stroke="white"
                strokeWidth="2"
            />
            <text
                x={aX - 8}
                y={FaY - 10}
                fill={ACCENT_SECONDARY}
                fontSize="11"
                textAnchor="end"
                style={{ fontVariantNumeric: "tabular-nums" }}
            >
                D({a.toFixed(0)}) = {Fa.toFixed(0)}
            </text>

            {/* Draggable point at F(b) on position curve */}
            <g transform={`translate(${bX}, ${FbY})`} data-concept="calcIntegrals_b">
                <circle
                    r={10 * handleScale}
                    fill={ACCENT}
                    filter="url(#calc-handle-shadow)"
                    style={{ cursor: dragging ? "grabbing" : "grab" }}
                />
            </g>
            <text
                x={bX + 8}
                y={FbY - 10}
                fill={ACCENT}
                fontSize="11"
                style={{ fontVariantNumeric: "tabular-nums" }}
            >
                D({b.toFixed(1)}) = {Fb.toFixed(1)}
            </text>

            {/* Invisible hit area for dragging */}
            <circle
                cx={bX}
                cy={FbY}
                r="24"
                fill="transparent"
                style={{ cursor: dragging ? "grabbing" : "grab", touchAction: "none" }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onPointerEnter={() => setHovered(true)}
                onPointerLeave={() => setHovered(false)}
            />

            {/* Vertical dashed line from b to both curves */}
            <line
                x1={bX}
                y1={MARGIN.top + PLOT_HEIGHT}
                x2={bX}
                y2={Math.min(FbY, vBY)}
                stroke={ACCENT}
                strokeWidth="1.5"
                strokeDasharray="4,4"
                opacity="0.6"
            />

            {/* Result readout box */}
            <g transform={`translate(${MARGIN.left + 10}, ${MARGIN.top + 10})`}>
                <rect
                    x="0"
                    y="0"
                    width="180"
                    height="70"
                    rx="8"
                    fill="white"
                    stroke={INK_QUIET}
                    strokeWidth="1"
                    opacity="0.95"
                />
                <text x="10" y="22" fill={INK} fontSize="12" fontWeight="600">
                    Calculation
                </text>
                <text x="10" y="42" fill={ACCENT} fontSize="11" style={{ fontVariantNumeric: "tabular-nums" }}>
                    D({b.toFixed(1)}) - D({a.toFixed(0)}) = {Fb.toFixed(1)} - {Fa.toFixed(0)}
                </text>
                <text x="10" y="60" fill={HIGHLIGHT} fontSize="13" fontWeight="600" style={{ fontVariantNumeric: "tabular-nums" }}>
                    = {difference.toFixed(1)} miles
                </text>
            </g>

            {/* Area readout */}
            <g transform={`translate(${bX - 40}, ${yScaleSpeed(simpleSpeedFunction(smoothB / 2)) + 5})`}>
                <rect
                    x="-30"
                    y="-12"
                    width="60"
                    height="24"
                    rx="4"
                    fill="white"
                    stroke={HIGHLIGHT}
                    strokeWidth="1"
                    opacity="0.9"
                />
                <text
                    x="0"
                    y="5"
                    fill={HIGHLIGHT}
                    fontSize="12"
                    textAnchor="middle"
                    fontWeight="600"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                >
                    Area = {area.toFixed(1)}
                </text>
            </g>
        </svg>
    );
}

// ── Figure shell composition ─────────────────────────────────────────────────

function FTCCalculationFigure() {
    const setVar = useSetVar();

    return (
        <div style={{ maxHeight: "560px", overflow: "hidden" }}>
            <Figure
                id="calculating-integrals-figure"
                onReset={() => {
                    setVar("calcIntegrals_b", DEFAULT_B);
                }}
                caption="Drag the teal point along the position curve D(t) = t² and watch the calculation update. The vertical orange bar shows D(b) - D(a), which exactly equals the shaded area under the speed curve."
            >
                <FTCCalculationDrawing />
                <div className="px-6 pb-5">
                    <FigureSlider
                        varName="calcIntegrals_b"
                        label="End time (b)"
                        {...numberPropsFromDefinition(getVariableInfo("calcIntegrals_b"))}
                        formatValue={(v) => `${v.toFixed(1)} min`}
                    />
                </div>
                <InteractionHintSequence
                    hintKey="calculating-integrals-drag"
                    steps={[
                        {
                            gesture: "drag-horizontal",
                            label: "Drag the teal point to change the upper bound",
                            position: { x: "75%", y: "30%" },
                            dragPath: {
                                type: "line",
                                startOffset: { x: -30, y: 0 },
                                endOffset: { x: 30, y: 0 },
                            },
                        },
                    ]}
                />
            </Figure>
        </div>
    );
}

// ── Reactive derived values component ─────────────────────────────────────────

function ReactiveDifferenceValue() {
    const b = useVar<number>("calcIntegrals_b", DEFAULT_B);
    const a = useVar<number>("calcIntegrals_a", 0);
    const { difference } = computeFTCIntegral(a, b);
    return <span style={{ fontVariantNumeric: "tabular-nums" }}>{difference.toFixed(0)}</span>;
}


// ── Exported section blocks ───────────────────────────────────────────────────

export const calculatingIntegralsBlocks: ReactElement[] = [
    // Section heading
    <StackLayout key="layout-calculating-integrals-heading" maxWidth="xl">
        <Block id="calculating-integrals-heading" padding="md">
            <EditableH2 id="h2-calculating-integrals-heading" blockId="calculating-integrals-heading">
                Building the Prediction Machine
            </EditableH2>
        </Block>
    </StackLayout>,

    // Intro paragraph - the hook
    <StackLayout key="layout-calculating-integrals-intro" maxWidth="xl">
        <Block id="calculating-integrals-intro" padding="sm">
            <EditableParagraph id="para-calculating-integrals-intro" blockId="calculating-integrals-intro">
                Given speed <InlineFormula latex="v(t) = 2t" colorMap={{}} />, how do you predict the total distance?
                Find the antiderivative <InlineFormula latex="D(t) = t^2" colorMap={{}} />.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    // The formula block showing the FTC calculation
    <StackLayout key="layout-calculating-integrals-formula" maxWidth="xl">
        <Block id="calculating-integrals-formula" padding="md">
            <FormulaBlock
                latex="\int_{\clr{a}{0}}^{\scrub{calcIntegrals_b}} 2t \, dt = t^2 \Big|_{\clr{a}{0}}^{\clr{b}{b}} = \clr{b}{b}^2 - 0 = \clr{result}{\text{?}}"
                variables={{
                    calcIntegrals_b: { min: 1, max: 8, step: 0.5, color: ACCENT },
                }}
                colorMap={{
                    a: ACCENT_SECONDARY,
                    b: ACCENT,
                    result: HIGHLIGHT,
                }}
            />
        </Block>
    </StackLayout>,

    // Interactive visualization
    <StackLayout key="layout-calculating-integrals-figure" maxWidth="xl">
        <Block id="calculating-integrals-figure" padding="sm" hasVisualization>
            <FTCCalculationFigure />
        </Block>
    </StackLayout>,

    // Explanation of the pipeline
    <StackLayout key="layout-calculating-integrals-pipeline" maxWidth="xl">
        <Block id="calculating-integrals-pipeline" padding="sm">
            <EditableParagraph id="para-calculating-integrals-pipeline" blockId="calculating-integrals-pipeline">
                Drag the teal point to change t ={" "}
                <InlineScrubbleNumber
                    varName="calcIntegrals_b"
                    {...numberPropsFromDefinition(getVariableInfo("calcIntegrals_b"))}
                    formatValue={(v) => v.toFixed(1)}
                />
                . Watch D(b) − D(0) ={" "}
                <InlineSpotColor varName="calcIntegrals_difference" color={HIGHLIGHT}>
                    <ReactiveDifferenceValue />
                </InlineSpotColor>{" "}
                match the shaded area exactly.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    // Assessment question 1: Calculate the integral
    <StackLayout key="layout-calculating-integrals-question-result" maxWidth="xl">
        <Block id="calculating-integrals-question-result" padding="sm">
            <EditableParagraph id="para-calculating-integrals-question-result" blockId="calculating-integrals-question-result">
                If a car's speed follows <InlineFormula latex="v(t) = 2t" colorMap={{}} /> and travels from
                t = 0 to t = 5 minutes, the total distance is{" "}
                <InlineFeedback
                    varName="answer_calcIntegrals_result"
                    correctValue="25"
                    position="terminal"
                    successMessage="— exactly! D(5) - D(0) = 25 - 0 = 25 miles"
                    failureMessage="— not quite."
                    hint="Use D(t) = t², then compute D(5) - D(0)"
                    reviewBlockId="calculating-integrals-figure"
                    reviewLabel="Try the calculation machine"
                >
                    <InlineClozeInput
                        varName="answer_calcIntegrals_result"
                        correctAnswer="25"
                        {...clozePropsFromDefinition(getVariableInfo("answer_calcIntegrals_result"))}
                    />
                </InlineFeedback>{" "}
                miles.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    // Assessment question 2: Why does F(b) - F(a) give the area?
    <StackLayout key="layout-calculating-integrals-question-why" maxWidth="xl">
        <Block id="calculating-integrals-question-why" padding="sm">
            <EditableParagraph id="para-calculating-integrals-question-why" blockId="calculating-integrals-question-why">
                Why does subtracting D(b) − D(a) give the area under the speed curve? Because{" "}
                <InlineFeedback
                    varName="answer_calcIntegrals_why"
                    correctValue="F measures accumulated area, so F(b)-F(a) is the area between a and b"
                    position="terminal"
                    successMessage="— exactly! D(t) measures total accumulated distance from the start. So D(b) tells you the distance from 0 to b, and D(a) tells you the distance from 0 to a. Subtracting removes the part you don't want, leaving just the distance from a to b"
                    failureMessage="— think about what D(t) represents."
                    hint="D(t) accumulates distance from the start. What happens when you subtract?"
                    reviewBlockId="calculating-integrals-figure"
                    reviewLabel="Watch how the areas relate"
                >
                    <InlineClozeChoice
                        varName="answer_calcIntegrals_why"
                        correctAnswer="F measures accumulated area, so F(b)-F(a) is the area between a and b"
                        options={[
                            "F(b) and F(a) are just numbers we subtract",
                            "F measures accumulated area, so F(b)-F(a) is the area between a and b",
                            "The antiderivative is always equal to the area",
                            "Subtraction always gives the area under a curve"
                        ]}
                        {...choicePropsFromDefinition(getVariableInfo("answer_calcIntegrals_why"))}
                    />
                </InlineFeedback>.
            </EditableParagraph>
        </Block>
    </StackLayout>,
];
