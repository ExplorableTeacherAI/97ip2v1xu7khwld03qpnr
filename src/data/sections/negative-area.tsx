/**
 * Negative Area Section — Signed Area and Reversing
 * =================================================
 *
 * Third section: students discover that regions below the x-axis contribute
 * negative area, and the integral measures NET signed area.
 */

import React, { useRef, useState, useEffect, useCallback, type ReactElement } from "react";
import { StackLayout, SplitLayout } from "@/components/layouts";
import { Block } from "@/components/templates";
import {
    EditableH2,
    EditableParagraph,
    InlineScrubbleNumber,
    InlineFeedback,
    InlineClozeChoice,
    InteractionHintSequence,
} from "@/components/atoms";
import { Figure, FigureSlider, FormulaBlock } from "@/components/molecules";
import { useVar, useSetVar } from "@/stores";
import { clamp, useSpring } from "@/lib/motion";
import {
    velocityWithOffset,
    computeSignedArea,
    getVelocityExtent,
    getPositiveRegionPolygons,
    getNegativeRegionPolygons,
} from "../model";
import {
    getVariableInfo,
    numberPropsFromDefinition,
    choicePropsFromDefinition,
} from "../variables";

// ── Colors (matching design language) ──────────────────────────────────────────

const TEAL = "#62D0AD";           // positive area (forward)
const CORAL = "#F4A89A";          // negative area (reverse)
const INK = "#334155";            // labels
const INK_STRUCTURE = "#64748B";  // outlines, axis
const INK_QUIET = "#CBD5E1";      // grid lines
const PAPER_FILL = "#F8FAFC";     // background regions

// ── View constants ──────────────────────────────────────────────────────────────

const VIEW_WIDTH = 560;
const VIEW_HEIGHT = 340;
const PADDING = { left: 50, right: 30, top: 30, bottom: 50 };
const PLOT_WIDTH = VIEW_WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = VIEW_HEIGHT - PADDING.top - PADDING.bottom;

// ── Helper: convert data coords to SVG coords ─────────────────────────────────

function toSvgX(t: number, a: number, b: number): number {
    return PADDING.left + ((t - a) / (b - a)) * PLOT_WIDTH;
}

function toSvgY(v: number, extent: { min: number; max: number }): number {
    const range = extent.max - extent.min;
    return PADDING.top + ((extent.max - v) / range) * PLOT_HEIGHT;
}

// ── The Bespoke Signed Area Visualization ─────────────────────────────────────

function SignedAreaDrawing() {
    const setVar = useSetVar();
    const offset = useVar<number>("negativeArea_offset", 0);

    // Get carried-over bounds (frozen from previous sections)
    const a = useVar<number>("a", 0);
    const b = useVar<number>("b", 8);

    const [dragging, setDragging] = useState(false);
    const [hovered, setHovered] = useState(false);
    const svgRef = useRef<SVGSVGElement>(null);
    const dragStartY = useRef(0);
    const dragStartOffset = useRef(0);

    // Compute signed areas from the model
    const { positive, negative, net } = computeSignedArea(a, b, offset);

    // Update store with derived values
    useEffect(() => {
        setVar("negativeArea_positiveArea", positive);
        setVar("negativeArea_negativeArea", negative);
        setVar("negativeArea_netArea", net);
    }, [positive, negative, net, setVar]);

    // Get velocity extent for scaling
    const extent = getVelocityExtent(a, b, offset);
    // Ensure y-axis spans both positive and negative with padding
    const yPadding = (extent.max - extent.min) * 0.15;
    const displayExtent = {
        min: Math.min(extent.min - yPadding, -10),
        max: Math.max(extent.max + yPadding, 10),
    };

    // Spring animation for smooth offset changes
    const animatedOffset = useSpring(offset, { stiffness: 200, damping: 25 });

    // Get polygon regions for positive and negative areas
    const positivePolygons = getPositiveRegionPolygons(a, b, animatedOffset);
    const negativePolygons = getNegativeRegionPolygons(a, b, animatedOffset);

    // Generate curve points
    const curvePoints: string = (() => {
        const points: string[] = [];
        const numPoints = 100;
        const step = (b - a) / numPoints;
        for (let i = 0; i <= numPoints; i++) {
            const t = a + i * step;
            const v = velocityWithOffset(t, animatedOffset);
            points.push(`${toSvgX(t, a, b)},${toSvgY(v, displayExtent)}`);
        }
        return points.join(" ");
    })();

    // Convert data polygon to SVG path
    const polygonToPath = (polygon: Array<{ x: number; y: number }>): string => {
        if (polygon.length < 3) return "";
        const points = polygon.map(
            (p) => `${toSvgX(p.x, a, b)},${toSvgY(p.y, displayExtent)}`
        );
        return `M${points.join("L")}Z`;
    };

    // Drag handlers for vertical offset adjustment
    const handlePointerDown = useCallback((event: React.PointerEvent<SVGGElement>) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
        dragStartY.current = event.clientY;
        dragStartOffset.current = offset;
    }, [offset]);

    const handlePointerMove = useCallback((event: React.PointerEvent<SVGGElement>) => {
        if (!dragging) return;
        const dy = dragStartY.current - event.clientY;
        // Map pixels to offset units (50 pixels = 10 units)
        const deltaOffset = (dy / 50) * 10;
        const newOffset = clamp(dragStartOffset.current + deltaOffset, -40, 40);
        setVar("negativeArea_offset", Math.round(newOffset));
    }, [dragging, setVar]);

    const handlePointerUp = useCallback(() => {
        setDragging(false);
    }, []);

    // Y-axis zero line position
    const zeroY = toSvgY(0, displayExtent);

    // Area readout positions
    const positiveAreaY = zeroY - 30;
    const negativeAreaY = zeroY + 40;

    return (
        <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            className="block w-full"
            style={{ overflow: "hidden", maxHeight: `${VIEW_HEIGHT}px` }}
            role="img"
            aria-label="Velocity curve showing positive and negative area regions"
        >
            <defs>
                <filter id="negative-area-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#0F172A" floodOpacity="0.2" />
                </filter>
            </defs>

            {/* Background */}
            <rect x="0" y="0" width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="white" />

            {/* Grid lines */}
            <g stroke={INK_QUIET} strokeWidth="1" opacity="0.5">
                {/* Horizontal grid lines */}
                {[-40, -20, 0, 20, 40].map((v) => {
                    const y = toSvgY(v, displayExtent);
                    if (y < PADDING.top || y > VIEW_HEIGHT - PADDING.bottom) return null;
                    return (
                        <line
                            key={`h-${v}`}
                            x1={PADDING.left}
                            y1={y}
                            x2={VIEW_WIDTH - PADDING.right}
                            y2={y}
                            strokeDasharray={v === 0 ? "none" : "4,4"}
                        />
                    );
                })}
                {/* Vertical grid lines */}
                {[0, 2, 4, 6, 8].map((t) => (
                    <line
                        key={`v-${t}`}
                        x1={toSvgX(t, a, b)}
                        y1={PADDING.top}
                        x2={toSvgX(t, a, b)}
                        y2={VIEW_HEIGHT - PADDING.bottom}
                        strokeDasharray="4,4"
                    />
                ))}
            </g>

            {/* X-axis (zero line) — emphasized */}
            <line
                x1={PADDING.left}
                y1={zeroY}
                x2={VIEW_WIDTH - PADDING.right}
                y2={zeroY}
                stroke={INK_STRUCTURE}
                strokeWidth="2"
            />

            {/* Y-axis */}
            <line
                x1={PADDING.left}
                y1={PADDING.top}
                x2={PADDING.left}
                y2={VIEW_HEIGHT - PADDING.bottom}
                stroke={INK_STRUCTURE}
                strokeWidth="1.5"
            />

            {/* Positive area regions (teal) */}
            {positivePolygons.map((polygon, i) => (
                <path
                    key={`pos-${i}`}
                    d={polygonToPath(polygon)}
                    fill={TEAL}
                    opacity="0.35"
                    data-concept="negativeArea_positiveArea"
                />
            ))}

            {/* Negative area regions (coral) */}
            {negativePolygons.map((polygon, i) => (
                <path
                    key={`neg-${i}`}
                    d={polygonToPath(polygon)}
                    fill={CORAL}
                    opacity="0.4"
                    data-concept="negativeArea_negativeArea"
                />
            ))}

            {/* Velocity curve (draggable) */}
            <g
                style={{ cursor: dragging ? "grabbing" : "grab" }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onPointerEnter={() => setHovered(true)}
                onPointerLeave={() => setHovered(false)}
            >
                {/* Invisible wider hit area */}
                <polyline
                    points={curvePoints}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="24"
                />
                {/* Visible curve */}
                <polyline
                    points={curvePoints}
                    fill="none"
                    stroke={INK_STRUCTURE}
                    strokeWidth={dragging || hovered ? 3.5 : 2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                        filter: hovered || dragging ? "url(#negative-area-shadow)" : "none",
                        transition: "stroke-width 0.15s ease-out",
                    }}
                    data-concept="negativeArea_offset"
                />
            </g>

            {/* Axis labels */}
            <text
                x={VIEW_WIDTH / 2}
                y={VIEW_HEIGHT - 10}
                textAnchor="middle"
                fill={INK}
                fontSize="12"
            >
                time (s)
            </text>
            <text
                x={15}
                y={VIEW_HEIGHT / 2}
                textAnchor="middle"
                fill={INK}
                fontSize="12"
                transform={`rotate(-90, 15, ${VIEW_HEIGHT / 2})`}
            >
                velocity (mph)
            </text>

            {/* X-axis tick labels */}
            {[0, 2, 4, 6, 8].map((t) => (
                <text
                    key={`x-label-${t}`}
                    x={toSvgX(t, a, b)}
                    y={VIEW_HEIGHT - PADDING.bottom + 18}
                    textAnchor="middle"
                    fill={INK}
                    fontSize="11"
                >
                    {t}
                </text>
            ))}

            {/* Area readouts */}
            <g style={{ fontVariantNumeric: "tabular-nums" }} fontSize="13">
                {/* Positive area readout */}
                <text
                    x={VIEW_WIDTH - PADDING.right - 10}
                    y={Math.max(positiveAreaY, PADDING.top + 20)}
                    textAnchor="end"
                    fill={TEAL}
                    fontWeight="600"
                >
                    +{positive.toFixed(1)}
                </text>

                {/* Negative area readout */}
                <text
                    x={VIEW_WIDTH - PADDING.right - 10}
                    y={Math.min(negativeAreaY, VIEW_HEIGHT - PADDING.bottom - 10)}
                    textAnchor="end"
                    fill={CORAL}
                    fontWeight="600"
                >
                    −{negative.toFixed(1)}
                </text>
            </g>

            {/* Net area display */}
            <g transform={`translate(${PADDING.left + 10}, ${PADDING.top + 10})`}>
                <rect
                    x="0"
                    y="0"
                    width="120"
                    height="50"
                    rx="6"
                    fill={PAPER_FILL}
                    stroke={INK_QUIET}
                    strokeWidth="1"
                />
                <text x="60" y="18" textAnchor="middle" fill={INK_STRUCTURE} fontSize="11">
                    Net Area
                </text>
                <text
                    x="60"
                    y="40"
                    textAnchor="middle"
                    fill={net >= 0 ? TEAL : CORAL}
                    fontWeight="700"
                    fontSize="18"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                    data-concept="negativeArea_netArea"
                >
                    {net.toFixed(1)}
                </text>
            </g>

            {/* Drag instruction indicator */}
            <g
                transform={`translate(${VIEW_WIDTH - 120}, ${PADDING.top + 10})`}
                opacity={dragging ? 0 : 0.7}
                style={{ transition: "opacity 0.2s" }}
            >
                <text
                    x="0"
                    y="12"
                    fill={INK_STRUCTURE}
                    fontSize="11"
                >
                    ↕ Drag curve up/down
                </text>
            </g>
        </svg>
    );
}

// ── Figure wrapper ─────────────────────────────────────────────────────────────

function SignedAreaFigure() {
    const setVar = useSetVar();

    return (
        <Figure
            id="negative-area-signed-area"
            onReset={() => {
                setVar("negativeArea_offset", 0);
            }}
            caption="Drag the velocity curve up or down. Watch how positive area (teal, above the axis) and negative area (coral, below the axis) combine to give the net integral."
        >
            <div style={{ maxHeight: "360px", overflow: "hidden" }}>
                <SignedAreaDrawing />
            </div>
            <div className="px-6 pb-5">
                <FigureSlider
                    varName="negativeArea_offset"
                    label="Vertical offset"
                    {...numberPropsFromDefinition(getVariableInfo("negativeArea_offset"))}
                    formatValue={(v) => (v >= 0 ? `+${v}` : `${v}`)}
                />
            </div>
            <InteractionHintSequence
                hintKey="negative-area-drag-curve"
                steps={[
                    {
                        gesture: "drag-vertical",
                        label: "Drag the curve up or down",
                        position: { x: "50%", y: "45%" },
                        dragPath: {
                            type: "line",
                            startOffset: { x: 0, y: 20 },
                            endOffset: { x: 0, y: -20 },
                        },
                    },
                ]}
            />
        </Figure>
    );
}

// ── Exported Section Blocks ────────────────────────────────────────────────────

export const negativeAreaBlocks: ReactElement[] = [
    // Section heading
    <StackLayout key="layout-negative-area-heading" maxWidth="xl">
        <Block id="negative-area-heading" padding="md">
            <EditableH2 id="h2-negative-area-heading" blockId="negative-area-heading">
                When the Curve Dips Below
            </EditableH2>
        </Block>
    </StackLayout>,

    // Main visualization with explanation
    <SplitLayout key="layout-negative-area-main" ratio="1:1" gap="lg">
        <div className="space-y-4">
            <Block id="negative-area-explanation" padding="sm">
                <EditableParagraph id="para-negative-area-explanation" blockId="negative-area-explanation">
                    Drag the curve up or down and watch the shaded regions change. Teal area above the axis adds to the integral; coral area below subtracts.
                </EditableParagraph>
            </Block>
            <Block id="negative-area-offset-control" padding="sm">
                <EditableParagraph id="para-negative-area-offset" blockId="negative-area-offset-control">
                    Shift the curve by{" "}
                    <InlineScrubbleNumber
                        varName="negativeArea_offset"
                        {...numberPropsFromDefinition(getVariableInfo("negativeArea_offset"))}
                        formatValue={(v) => (v >= 0 ? `+${v}` : `${v}`)}
                    />{" "}
                    units. Can you find the position where positive and negative areas exactly cancel?
                </EditableParagraph>
            </Block>
        </div>
        <Block id="negative-area-viz" padding="sm" hasVisualization>
            <SignedAreaFigure />
        </Block>
    </SplitLayout>,

    // Formula display
    <StackLayout key="layout-negative-area-formula" maxWidth="xl">
        <Block id="negative-area-formula" padding="sm">
            <FormulaBlock
                latex="\int_a^b v(t)\,dt = \text{(positive area)} - \text{(negative area)} = \text{net displacement}"
            />
        </Block>
    </StackLayout>,

    // Assessment question
    <StackLayout key="layout-negative-area-question" maxWidth="xl">
        <Block id="negative-area-question" padding="md">
            <EditableParagraph id="para-negative-area-question" blockId="negative-area-question">
                When velocity is negative (the curve is below the x-axis), the integral{" "}
                <InlineFeedback
                    varName="negativeArea_answerSignedArea"
                    correctValue="subtracts"
                    position="mid"
                    successMessage="✓ — exactly! Negative velocity means backward motion, which subtracts from total displacement"
                    failureMessage="✗"
                    hint="Think about what happens to your position when you drive in reverse"
                >
                    <InlineClozeChoice
                        varName="negativeArea_answerSignedArea"
                        {...choicePropsFromDefinition(getVariableInfo("negativeArea_answerSignedArea"))}
                        options={["adds", "subtracts", "stays the same"]}
                        correctAnswer="subtracts"
                    />
                </InlineFeedback>{" "}
                from the total displacement.
            </EditableParagraph>
        </Block>
    </StackLayout>,
];
