/**
 * Riemann Sums Section — The Rolling Odometer Lesson
 * ====================================================
 *
 * Second section building on area intuition. Students discover that curved
 * areas can be approximated with rectangles, and understand why we need
 * infinitely many rectangles for exact area.
 *
 * Mini-spec: "Slider Increases Rectangle Count Under Curve"
 * - Manipulated variable: n (number of rectangles)
 * - Primary feedback: Rectangles redraw with new widths/heights
 * - Aha moment: Error shrinks but never reaches zero at finite n
 */

import React, { useRef, useEffect, type ReactElement } from "react";
import { StackLayout } from "@/components/layouts";
import { Block } from "@/components/templates";
import {
    EditableH2,
    EditableParagraph,
    InlineScrubbleNumber,
    InlineClozeChoice,
    InlineFeedback,
    InlineSpotColor,
    InteractionHintSequence,
    RevealOnInteraction,
} from "@/components/atoms";
import { Figure, FigureSlider } from "@/components/molecules";
import { useVar, useSetVar } from "@/stores";
import { useSpring } from "@/lib/motion";
import {
    speedAtTime,
    computeAreaUnderCurve,
    computeLeftRiemannSum,
    getRiemannRectangles,
    getSpeedExtent,
} from "../model";
import {
    getVariableInfo,
    numberPropsFromDefinition,
    choicePropsFromDefinition,
} from "../variables";

// ── Constants ─────────────────────────────────────────────────────────────────

const VIEW_WIDTH = 560;
const VIEW_HEIGHT = 340;
const PADDING = { top: 40, right: 40, bottom: 50, left: 60 };
const PLOT_WIDTH = VIEW_WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = VIEW_HEIGHT - PADDING.top - PADDING.bottom;

// Frozen bounds (carried over from area-intuition)
const BOUND_A = 0;
const BOUND_B = 8;

// Default number of rectangles (poses the problem)
const DEFAULT_N = 4;

// Colors (following FIGURE_DESIGN_LANGUAGE.md)
const ACCENT = "#62D0AD"; // Soft Teal - rectangles and primary accent
const INK = "#334155"; // Warm dark gray - labels
const INK_STRUCTURE = "#64748B"; // Lighter gray - axes
const INK_QUIET = "#CBD5E1"; // Quietest gray - grid
const CURVE_COLOR = "#8E90F5"; // Soft Indigo - the speed curve
const ERROR_COLOR = "#F7B23B"; // Warm Amber - error indicator

// ── Drawing Component ─────────────────────────────────────────────────────────

function RiemannSumsDrawing() {
    const setVar = useSetVar();
    const n = useVar<number>("riemannSums_n", DEFAULT_N);
    const a = BOUND_A; // Frozen
    const b = BOUND_B; // Frozen

    const svgRef = useRef<SVGSVGElement>(null);

    // Compute derived values from the model
    const deltaX = (b - a) / n;
    const riemannSum = computeLeftRiemannSum(a, b, n);
    const trueArea = computeAreaUnderCurve(a, b);
    const error = Math.abs(trueArea - riemannSum);
    const errorPercent = trueArea > 0 ? (error / trueArea) * 100 : 0;

    // Get rectangle data from model - pick first rectangle for sample display
    const rectangles = getRiemannRectangles(a, b, n);
    const sampleRect = rectangles[0];
    const sampleArea = sampleRect ? sampleRect.width * sampleRect.height : 0;

    // Write derived values to store for verification
    useEffect(() => {
        setVar("riemannSums_a", a);
        setVar("riemannSums_b", b);
        setVar("riemannSums_deltaX", deltaX);
        setVar("riemannSums_riemannSum", riemannSum);
        setVar("riemannSums_trueArea", trueArea);
        setVar("riemannSums_error", error);
        setVar("riemannSums_errorPercent", errorPercent);
    }, [n, setVar, deltaX, riemannSum, trueArea, error, errorPercent, a, b]);

    // Get y-extent for scaling
    const speedExtent = getSpeedExtent(a, b);
    const yMin = 0;
    const yMax = speedExtent.max * 1.15; // 15% padding

    // Coordinate transforms
    const xScale = (t: number) => PADDING.left + ((t - a) / (b - a)) * PLOT_WIDTH;
    const yScale = (v: number) => PADDING.top + PLOT_HEIGHT - ((v - yMin) / (yMax - yMin)) * PLOT_HEIGHT;

    // Generate curve path
    const curvePath = (() => {
        const points: string[] = [];
        const numSamples = 200;
        for (let i = 0; i <= numSamples; i++) {
            const t = a + (b - a) * (i / numSamples);
            const speed = speedAtTime(t);
            const x = xScale(t);
            const y = yScale(speed);
            points.push(`${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`);
        }
        return points.join(" ");
    })();

    // Spring for smooth sum value changes
    const displayedSum = useSpring(riemannSum, { stiffness: 150, damping: 18 });

    return (
        <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            className="block w-full"
            style={{ overflow: "hidden", maxHeight: `${VIEW_HEIGHT}px` }}
            role="img"
            aria-label="Riemann sum visualization with adjustable rectangle count"
        >
            {/* Grid lines */}
            <g stroke={INK_QUIET} strokeWidth="1">
                {[0, 20, 40, 60].map((v) => (
                    <line
                        key={`grid-h-${v}`}
                        x1={PADDING.left}
                        y1={yScale(v)}
                        x2={VIEW_WIDTH - PADDING.right}
                        y2={yScale(v)}
                        strokeDasharray="4 4"
                    />
                ))}
                {[0, 2, 4, 6, 8].map((t) => (
                    <line
                        key={`grid-v-${t}`}
                        x1={xScale(t)}
                        y1={PADDING.top}
                        x2={xScale(t)}
                        y2={VIEW_HEIGHT - PADDING.bottom}
                        strokeDasharray="4 4"
                    />
                ))}
            </g>

            {/* Axes */}
            <g stroke={INK_STRUCTURE} strokeWidth="2" strokeLinecap="round">
                <line
                    x1={PADDING.left}
                    y1={VIEW_HEIGHT - PADDING.bottom}
                    x2={VIEW_WIDTH - PADDING.right}
                    y2={VIEW_HEIGHT - PADDING.bottom}
                />
                <line
                    x1={PADDING.left}
                    y1={PADDING.top}
                    x2={PADDING.left}
                    y2={VIEW_HEIGHT - PADDING.bottom}
                />
            </g>

            {/* Axis labels */}
            <g fontSize="12" fill={INK} style={{ fontVariantNumeric: "tabular-nums" }}>
                <text x={VIEW_WIDTH / 2} y={VIEW_HEIGHT - 10} textAnchor="middle">
                    Time (hours)
                </text>
                <text
                    x={15}
                    y={VIEW_HEIGHT / 2}
                    textAnchor="middle"
                    transform={`rotate(-90, 15, ${VIEW_HEIGHT / 2})`}
                >
                    Speed (mph)
                </text>
                {/* X-axis ticks */}
                {[0, 2, 4, 6, 8].map((t) => (
                    <text key={`x-${t}`} x={xScale(t)} y={VIEW_HEIGHT - PADDING.bottom + 18} textAnchor="middle">
                        {t}
                    </text>
                ))}
                {/* Y-axis ticks */}
                {[0, 20, 40, 60].map((v) => (
                    <text key={`y-${v}`} x={PADDING.left - 8} y={yScale(v) + 4} textAnchor="end">
                        {v}
                    </text>
                ))}
            </g>

            {/* Riemann rectangles */}
            <g data-concept="riemannSums_riemannSum">
                {rectangles.map((rect, i) => (
                    <rect
                        key={`rect-${i}`}
                        x={xScale(rect.x)}
                        y={yScale(rect.height)}
                        width={(PLOT_WIDTH / n) - 1}
                        height={yScale(0) - yScale(rect.height)}
                        fill={`${ACCENT}26`}
                        stroke={ACCENT}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                ))}
            </g>

            {/* The speed curve - drawn on top */}
            <path
                d={curvePath}
                fill="none"
                stroke={CURVE_COLOR}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* Readouts panel - left side */}
            <g fontSize="12" style={{ fontVariantNumeric: "tabular-nums" }}>
                {/* Odometer display */}
                <rect
                    x={PADDING.left + 10}
                    y={PADDING.top + 8}
                    width={150}
                    height={58}
                    rx="6"
                    fill="#F8FAFC"
                    stroke={INK_QUIET}
                    strokeWidth="1.5"
                />
                <text x={PADDING.left + 20} y={PADDING.top + 26} fill={INK_STRUCTURE} fontSize="10">
                    ODOMETER ESTIMATE
                </text>
                <text
                    x={PADDING.left + 85}
                    y={PADDING.top + 50}
                    fill={ACCENT}
                    fontSize="20"
                    fontWeight="600"
                    textAnchor="middle"
                    data-concept="riemannSums_riemannSum"
                >
                    {displayedSum.toFixed(1)} mi
                </text>

                {/* True value (target) - shown separately as per mini-spec */}
                <text x={PADDING.left + 20} y={PADDING.top + 82} fill={INK_STRUCTURE} fontSize="10">
                    True distance:
                </text>
                <text
                    x={PADDING.left + 95}
                    y={PADDING.top + 82}
                    fill={INK}
                    fontSize="12"
                    fontWeight="500"
                    data-concept="riemannSums_trueArea"
                >
                    {trueArea.toFixed(1)} mi
                </text>

                {/* Error gauge - shows percentage for user, raw value for verification */}
                <text x={PADDING.left + 20} y={PADDING.top + 100} fill={INK_STRUCTURE} fontSize="10">
                    Error:
                </text>
                <text
                    x={PADDING.left + 55}
                    y={PADDING.top + 100}
                    fill={ERROR_COLOR}
                    fontSize="12"
                    fontWeight="600"
                    data-concept="riemannSums_errorPercent"
                >
                    {errorPercent.toFixed(1)}%
                </text>
                {/* Hidden element for verification - raw error value */}
                <text
                    x={0}
                    y={0}
                    opacity={0}
                    data-concept="riemannSums_error"
                >
                    {error.toFixed(2)}
                </text>
            </g>

            {/* Causal chain panel - right side (shows Δx, sample rect area, running sum) */}
            <g fontSize="11" style={{ fontVariantNumeric: "tabular-nums" }}>
                <rect
                    x={VIEW_WIDTH - PADDING.right - 160}
                    y={PADDING.top + 8}
                    width={155}
                    height={95}
                    rx="6"
                    fill="#F8FAFC"
                    stroke={INK_QUIET}
                    strokeWidth="1.5"
                />
                <text
                    x={VIEW_WIDTH - PADDING.right - 150}
                    y={PADDING.top + 24}
                    fill={INK_STRUCTURE}
                    fontSize="10"
                >
                    CAUSAL CHAIN
                </text>

                {/* Rectangle width Δx */}
                <text x={VIEW_WIDTH - PADDING.right - 150} y={PADDING.top + 42} fill={INK}>
                    Δx = (b−a)/n =
                </text>
                <text
                    x={VIEW_WIDTH - PADDING.right - 20}
                    y={PADDING.top + 42}
                    fill={ACCENT}
                    fontWeight="500"
                    textAnchor="end"
                    data-concept="riemannSums_deltaX"
                >
                    {deltaX.toFixed(2)} hr
                </text>

                {/* Sample rectangle height */}
                <text x={VIEW_WIDTH - PADDING.right - 150} y={PADDING.top + 60} fill={INK}>
                    1st rect height =
                </text>
                <text
                    x={VIEW_WIDTH - PADDING.right - 20}
                    y={PADDING.top + 60}
                    fill={CURVE_COLOR}
                    fontWeight="500"
                    textAnchor="end"
                >
                    {sampleRect ? sampleRect.height.toFixed(1) : 0} mph
                </text>

                {/* Sample rectangle area */}
                <text x={VIEW_WIDTH - PADDING.right - 150} y={PADDING.top + 78} fill={INK}>
                    1st rect area =
                </text>
                <text
                    x={VIEW_WIDTH - PADDING.right - 20}
                    y={PADDING.top + 78}
                    fill={ACCENT}
                    fontWeight="500"
                    textAnchor="end"
                >
                    {sampleArea.toFixed(1)} mi
                </text>

                {/* Running sum */}
                <text x={VIEW_WIDTH - PADDING.right - 150} y={PADDING.top + 96} fill={INK}>
                    Sum of {n} rects =
                </text>
                <text
                    x={VIEW_WIDTH - PADDING.right - 20}
                    y={PADDING.top + 96}
                    fill={ACCENT}
                    fontWeight="600"
                    textAnchor="end"
                >
                    {riemannSum.toFixed(1)} mi
                </text>
            </g>

            {/* N value badge - prominent display of rectangle count */}
            <g data-concept="riemannSums_n">
                <rect
                    x={VIEW_WIDTH / 2 - 45}
                    y={PADDING.top + 8}
                    width={90}
                    height={28}
                    rx="14"
                    fill={ACCENT}
                />
                <text
                    x={VIEW_WIDTH / 2}
                    y={PADDING.top + 27}
                    textAnchor="middle"
                    fill="white"
                    fontSize="14"
                    fontWeight="600"
                >
                    n = {n} rects
                </text>
            </g>

            {/* Hidden elements for verification - frozen bounds */}
            <text x={0} y={0} opacity={0} data-concept="riemannSums_a">{a}</text>
            <text x={0} y={0} opacity={0} data-concept="riemannSums_b">{b}</text>
        </svg>
    );
}

// ── Figure Wrapper ────────────────────────────────────────────────────────────

// Milestone values as per mini-spec goal structure
const MILESTONES = [4, 10, 50, 100];

function RiemannSumsFigure() {
    const setVar = useSetVar();

    return (
        <Figure
            id="riemann-sums-odometer"
            onReset={() => {
                setVar("riemannSums_n", DEFAULT_N);
                setVar("riemannSums_explored", false);
            }}
            caption="The odometer approximates distance using rectangles. Drag the slider to add more rectangles and watch the estimate converge toward the true distance."
        >
            <div style={{ maxHeight: "360px", overflow: "hidden" }}>
                <RiemannSumsDrawing />
            </div>
            <div className="px-6 pb-5 space-y-3">
                <FigureSlider
                    varName="riemannSums_n"
                    label="Number of rectangles"
                    {...numberPropsFromDefinition(getVariableInfo("riemannSums_n"))}
                    formatValue={(v) => `${Math.round(v)}`}
                    onChange={() => setVar("riemannSums_explored", true)}
                />
                {/* Milestone buttons as per mini-spec goal structure */}
                <div className="flex items-center justify-center gap-2 text-sm">
                    <span className="text-slate-500">Try:</span>
                    {MILESTONES.map((m) => (
                        <button
                            key={m}
                            onClick={() => {
                                setVar("riemannSums_n", m);
                                setVar("riemannSums_explored", true);
                            }}
                            className="px-3 py-1 rounded-full bg-slate-100 hover:bg-teal-100 text-slate-700 hover:text-teal-700 transition-colors font-medium"
                        >
                            n = {m}
                        </button>
                    ))}
                </div>
            </div>
            <InteractionHintSequence
                hintKey="riemann-sums-slider-drag"
                steps={[
                    {
                        gesture: "drag-horizontal",
                        label: "Drag the slider to add more rectangles",
                        position: { x: "50%", y: "92%" },
                    },
                ]}
            />
        </Figure>
    );
}

// ── Exported Section Blocks ───────────────────────────────────────────────────

export const riemannSumsBlocks: ReactElement[] = [
    // Section heading
    <StackLayout key="layout-riemann-sums-heading" maxWidth="xl">
        <Block id="riemann-sums-heading" padding="md">
            <EditableH2 id="h2-riemann-sums-heading" blockId="riemann-sums-heading">
                How the odometer estimates distance
            </EditableH2>
        </Block>
    </StackLayout>,

    // Introduction paragraph - trimmed to ~30 words
    <StackLayout key="layout-riemann-sums-intro" maxWidth="xl">
        <Block id="riemann-sums-intro" padding="sm">
            <EditableParagraph id="para-riemann-sums-intro" blockId="riemann-sums-intro">
                Your speed keeps changing throughout a trip. How does the odometer figure out the exact distance traveled?
            </EditableParagraph>
        </Block>
    </StackLayout>,

    // The main visualization
    <StackLayout key="layout-riemann-sums-visualization" maxWidth="xl">
        <Block id="riemann-sums-visualization" padding="sm" hasVisualization>
            <RiemannSumsFigure />
        </Block>
    </StackLayout>,

    // Explanation paragraph - trimmed to ~40 words
    <StackLayout key="layout-riemann-sums-explanation" maxWidth="xl">
        <Block id="riemann-sums-explanation" padding="sm">
            <EditableParagraph id="para-riemann-sums-explanation" blockId="riemann-sums-explanation">
                The odometer uses{" "}
                <InlineScrubbleNumber
                    varName="riemannSums_n"
                    {...numberPropsFromDefinition(getVariableInfo("riemannSums_n"))}
                    formatValue={(v) => `${Math.round(v)}`}
                />{" "}
                <InlineSpotColor varName="riemannSums_n" color={ACCENT}>rectangles</InlineSpotColor> to estimate distance. Drag the slider right and watch the rectangles multiply, the estimate improve, and the error shrink.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    // Aha moment paragraph - trimmed to ~35 words
    <StackLayout key="layout-riemann-sums-aha" maxWidth="xl">
        <Block id="riemann-sums-aha" padding="sm">
            <EditableParagraph id="para-riemann-sums-aha" blockId="riemann-sums-aha">
                Push the slider to maximum. The error shrinks but never hits zero. Exact area requires infinitely many infinitely thin rectangles. This limit is what an integral computes.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    // Assessment question
    <StackLayout key="layout-riemann-sums-assessment" maxWidth="xl">
        <Block id="riemann-sums-assessment" padding="sm">
            <EditableParagraph id="para-riemann-sums-assessment" blockId="riemann-sums-assessment">
                <RevealOnInteraction varName="riemannSums_explored">
                    Why can't we get the exact area with any finite number of rectangles?{" "}
                    <InlineFeedback
                        varName="riemannSums_answerWhyInfinite"
                        correctValue="There is always a gap between rectangle tops and the curve"
                        position="standalone"
                        successMessage="Exactly! Each rectangle either overshoots or undershoots the curve. The gaps only disappear in the limit of infinitely many rectangles"
                        failureMessage="Not quite."
                        hint="Look at where the rectangle tops meet the curve, even with many rectangles"
                        reviewBlockId="riemann-sums-visualization"
                        reviewLabel="Try the slider again"
                        visualizationHint={{
                            blockId: "riemann-sums-visualization",
                            hintKey: "riemann-sums-answer-hint",
                            steps: [
                                {
                                    gesture: "drag-horizontal",
                                    label: "Drag the slider to increase rectangles and watch the gaps",
                                    position: { x: "50%", y: "92%" },
                                    completionVar: "riemannSums_n",
                                    completionValue: 50,
                                    completionTolerance: 30,
                                },
                            ],
                            label: "See it yourself",
                            resetVars: { riemannSums_n: 4 },
                        }}
                    >
                        <InlineClozeChoice
                            varName="riemannSums_answerWhyInfinite"
                            correctAnswer="There is always a gap between rectangle tops and the curve"
                            options={[
                                "The rectangles are too tall",
                                "There is always a gap between rectangle tops and the curve",
                                "The curve is too complex to measure",
                                "We run out of computing power"
                            ]}
                            {...choicePropsFromDefinition(getVariableInfo("riemannSums_answerWhyInfinite"))}
                        />
                    </InlineFeedback>
                </RevealOnInteraction>
            </EditableParagraph>
        </Block>
    </StackLayout>,
];
