/**
 * Variables Configuration
 * =======================
 * 
 * CENTRAL PLACE TO DEFINE ALL SHARED VARIABLES
 * 
 * This file defines all variables that can be shared across sections.
 * AI agents should read this file to understand what variables are available.
 * 
 * USAGE:
 * 1. Define variables here with their default values and metadata
 * 2. Use them in any section with: const x = useVar('variableName', defaultValue)
 * 3. Update them with: setVar('variableName', newValue)
 */

import { type VarValue } from '@/stores';

/**
 * Variable definition with metadata
 */
export interface VariableDefinition {
    /** Default value */
    defaultValue: VarValue;
    /** Human-readable label */
    label?: string;
    /** Description for AI agents */
    description?: string;
    /** Variable type hint */
    type?: 'number' | 'text' | 'boolean' | 'select' | 'array' | 'object' | 'spotColor' | 'linkedHighlight';
    /** Unit (e.g., 'Hz', '°', 'm/s') - for numbers */
    unit?: string;
    /** Minimum value (for number sliders) */
    min?: number;
    /** Maximum value (for number sliders) */
    max?: number;
    /** Step increment (for number sliders) */
    step?: number;
    /** Display color for InlineScrubbleNumber / InlineSpotColor (e.g. '#D81B60') */
    color?: string;
    /** Options for 'select' type variables */
    options?: string[];
    /** Placeholder text for text inputs */
    placeholder?: string;
    /** Correct answer for cloze input validation */
    correctAnswer?: string;
    /** Whether cloze matching is case sensitive */
    caseSensitive?: boolean;
    /** Background color for inline components */
    bgColor?: string;
    /** Schema hint for object types (for AI agents) */
    schema?: string;
}

/**
 * =====================================================
 * 🎯 DEFINE YOUR VARIABLES HERE
 * =====================================================
 * 
 * SUPPORTED TYPES:
 * 
 * 1. NUMBER (slider):
 *    { defaultValue: 5, type: 'number', min: 0, max: 10, step: 1 }
 * 
 * 2. TEXT (free text):
 *    { defaultValue: 'Hello', type: 'text', placeholder: 'Enter text...' }
 * 
 * 3. SELECT (dropdown):
 *    { defaultValue: 'sine', type: 'select', options: ['sine', 'cosine', 'tangent'] }
 * 
 * 4. BOOLEAN (toggle):
 *    { defaultValue: true, type: 'boolean' }
 * 
 * 5. ARRAY (list of numbers):
 *    { defaultValue: [1, 2, 3], type: 'array' }
 * 
 * 6. OBJECT (complex data):
 *    { defaultValue: { x: 5, y: 10 }, type: 'object', schema: '{ x: number, y: number }' }
 */
export const variableDefinitions: Record<string, VariableDefinition> = {
    // ========================================
    // AREA INTUITION SECTION VARIABLES
    // ========================================

    // Left bound of the integration region (a)
    areaIntuition_boundA: {
        defaultValue: 0,
        type: 'number',
        label: 'Start time (a)',
        description: 'Left bound of the region under the speed curve',
        unit: 's',
        min: 0,
        max: 7,
        step: 0.1,
        color: '#62D0AD',
    },

    // Right bound of the integration region (b)
    areaIntuition_boundB: {
        defaultValue: 8,
        type: 'number',
        label: 'End time (b)',
        description: 'Right bound of the region under the speed curve',
        unit: 's',
        min: 1,
        max: 8,
        step: 0.1,
        color: '#8E90F5',
    },

    // True computed area (derived, readonly)
    areaIntuition_trueArea: {
        defaultValue: 0,
        type: 'number',
        label: 'True distance',
        description: 'The actual computed area under the speed curve between a and b',
        unit: 'mi',
    },

    // Number of fuel tokens (samples) the student has used
    areaIntuition_samplesUsed: {
        defaultValue: 0,
        type: 'number',
        label: 'Samples used',
        description: 'How many fuel tokens the student has spent on speed checks',
        min: 0,
        max: 8,
        step: 1,
    },

    // Array of x-positions where the student has clicked to sample
    areaIntuition_samplePoints: {
        defaultValue: [],
        type: 'array',
        label: 'Sample points',
        description: 'X-positions along the timeline where student has checked speed',
    },

    // The estimated distance from the Riemann sum
    areaIntuition_estimatedDistance: {
        defaultValue: 0,
        type: 'number',
        label: 'Estimated distance',
        description: 'Distance estimated from the sample points using Riemann sum',
        unit: 'mi',
    },

    // Whether the student has clicked to reveal/measure the area
    areaIntuition_revealed: {
        defaultValue: false,
        type: 'boolean',
        label: 'Area revealed',
        description: 'Whether the student has triggered the reveal animation',
    },

    // Fill animation progress (0 to 1)
    areaIntuition_fillProgress: {
        defaultValue: 0,
        type: 'number',
        label: 'Fill progress',
        description: 'Animation progress of the liquid fill (0 to 1)',
        min: 0,
        max: 1,
        step: 0.01,
    },

    // The current animated area value during fill
    areaIntuition_animatedArea: {
        defaultValue: 0,
        type: 'number',
        label: 'Animated area',
        description: 'The displayed area value that climbs during animation',
    },

    // Assessment question answer
    areaIntuition_answerSampling: {
        defaultValue: '',
        type: 'select',
        label: 'Sampling strategy answer',
        description: 'Student answer about where to place samples',
        placeholder: '???',
        correctAnswer: 'where speed changes quickly',
        options: ['where speed is highest', 'where speed changes quickly', 'evenly spaced', 'at random times'],
        color: '#62D0AD',
    },

    // ========================================
    // FTC CONNECTION SECTION VARIABLES
    // ========================================

    ftc_xPosition: {
        defaultValue: 2,
        type: 'number',
        label: 'X Position',
        description: 'The x-position where we evaluate f(x), A(x), and A\'(x)',
        min: 0.5,
        max: 8,
        step: 0.1,
        color: '#62D0AD',
    },

    ftc_boundA: {
        defaultValue: 0,
        type: 'number',
        label: 'Left Bound (a)',
        description: 'The left integration bound, frozen from previous section',
        min: 0,
        max: 0,
        step: 0.1,
        color: '#8E90F5',
    },

    ftc_fValue: {
        defaultValue: 0,
        type: 'number',
        label: 'f(x) Value',
        description: 'The height of the speed curve at x (derived)',
        color: '#8E90F5',
    },

    ftc_areaValue: {
        defaultValue: 0,
        type: 'number',
        label: 'A(x) Value',
        description: 'The accumulated area under f from a to x (derived)',
        color: '#62D0AD',
    },

    ftc_slopeValue: {
        defaultValue: 0,
        type: 'number',
        label: 'Slope A\'(x)',
        description: 'The slope of the accumulation function at x (derived)',
        color: '#F7B23B',
    },

    ftc_showGhosts: {
        defaultValue: false,
        type: 'boolean',
        label: 'Show Ghost Tangents',
        description: 'Toggle to show ghost tangent lines at previous positions',
    },

    ftc_flowersPlanted: {
        defaultValue: [],
        type: 'array',
        label: 'Flower Positions',
        description: 'X-positions where flowers have been planted',
    },

    answer_ftc_derivative: {
        defaultValue: '',
        type: 'text',
        label: 'FTC Derivative Answer',
        description: 'Student answer for what the derivative of A(x) equals',
        placeholder: '???',
        correctAnswer: 'f(x)',
        color: '#62D0AD',
    },

    answer_ftc_relationship: {
        defaultValue: '',
        type: 'select',
        label: 'FTC Relationship Answer',
        description: 'Student answer for the relationship between integration and differentiation',
        placeholder: '???',
        correctAnswer: 'inverse operations',
        options: ['the same operation', 'inverse operations', 'unrelated operations', 'opposite signs'],
        color: '#8E90F5',
    },

    // ========================================
    // CALCULATING INTEGRALS SECTION VARIABLES
    // ========================================

    // Lower bound of integration (frozen/inherited from previous section)
    calcIntegrals_a: {
        defaultValue: 0,
        type: 'number',
        label: 'Lower bound (a)',
        description: 'Left integration bound, frozen from previous sections',
        min: 0,
        max: 0,
        step: 0.1,
        color: '#8E90F5',
    },

    // Upper bound of integration (scrubbable)
    calcIntegrals_b: {
        defaultValue: 5,
        type: 'number',
        label: 'Upper bound (b)',
        description: 'Right integration bound, student-scrubbable',
        min: 1,
        max: 8,
        step: 0.5,
        color: '#62D0AD',
    },

    // Antiderivative evaluated at a: F(a)
    calcIntegrals_Fa: {
        defaultValue: 0,
        type: 'number',
        label: 'F(a)',
        description: 'Antiderivative evaluated at lower bound (derived)',
        color: '#8E90F5',
    },

    // Antiderivative evaluated at b: F(b)
    calcIntegrals_Fb: {
        defaultValue: 25,
        type: 'number',
        label: 'F(b)',
        description: 'Antiderivative evaluated at upper bound (derived)',
        color: '#62D0AD',
    },

    // The difference F(b) - F(a)
    calcIntegrals_difference: {
        defaultValue: 25,
        type: 'number',
        label: 'F(b) - F(a)',
        description: 'The definite integral result (derived)',
        color: '#F7B23B',
    },

    // The shaded area under f(x) from a to b
    calcIntegrals_area: {
        defaultValue: 25,
        type: 'number',
        label: 'Area',
        description: 'Geometric area under f(x) between bounds (derived)',
        color: '#F7B23B',
    },

    // Which element is currently highlighted
    calcIntegrals_activeHighlight: {
        defaultValue: '',
        type: 'text',
        label: 'Active highlight',
        description: 'Which element is currently highlighted (integral, antiderivative, eval-a, eval-b, difference)',
    },

    // The speed function type (carried over from previous sections)
    calcIntegrals_f: {
        defaultValue: 'linear',
        type: 'text',
        label: 'Function type',
        description: 'The type of speed function being integrated (linear: v(t)=2t)',
    },

    // Assessment answer for integral calculation
    answer_calcIntegrals_result: {
        defaultValue: '',
        type: 'text',
        label: 'Integral result answer',
        description: 'Student answer for the integral calculation result',
        placeholder: '???',
        correctAnswer: '25',
        color: '#F7B23B',
    },

    // Assessment answer for why F(b)-F(a) gives area
    answer_calcIntegrals_why: {
        defaultValue: '',
        type: 'select',
        label: 'Why FTC works answer',
        description: 'Student answer for why the subtraction gives area',
        placeholder: '???',
        correctAnswer: 'F measures accumulated area, so F(b)-F(a) is the area between a and b',
        options: [
            'F(b) and F(a) are just numbers we subtract',
            'F measures accumulated area, so F(b)-F(a) is the area between a and b',
            'The antiderivative is always equal to the area',
            'Subtraction always gives the area under a curve'
        ],
        color: '#62D0AD',
    },

    // ========================================
    // ACCUMULATION FUNCTION SECTION VARIABLES
    // ========================================

    // Sweep point x (the upper bound being dragged)
    accumulationFunction_sweepX: {
        defaultValue: 0,
        type: 'number',
        label: 'Upper bound (x)',
        description: 'Current position of the sweep point - the upper bound of integration',
        unit: 's',
        min: 0,
        max: 8,
        step: 0.1,
        color: '#62D0AD',
    },

    // Start bound a (inherited/frozen from previous sections)
    accumulationFunction_startA: {
        defaultValue: 0,
        type: 'number',
        label: 'Start bound (a)',
        description: 'Fixed starting point of integration - inherited from earlier sections',
        unit: 's',
        min: 0,
        max: 0,
        step: 0,
    },

    // Accumulated area A(x) - derived
    accumulationFunction_accumulatedArea: {
        defaultValue: 0,
        type: 'number',
        label: 'Accumulated distance A(x)',
        description: 'The integral from a to x - the total accumulated area under the speed curve',
        unit: 'mi',
    },

    // Current speed f(x) at sweep position - derived
    accumulationFunction_currentSpeed: {
        defaultValue: 30,
        type: 'number',
        label: 'Current speed f(x)',
        description: 'The speed at the current sweep position',
        unit: 'mph',
    },

    // Snapshot count
    accumulationFunction_snapshotCount: {
        defaultValue: 0,
        type: 'number',
        label: 'Snapshots taken',
        description: 'Number of position snapshots the student has captured',
        min: 0,
        max: 10,
        step: 1,
    },

    // Array of snapshots
    accumulationFunction_snapshots: {
        defaultValue: [],
        type: 'array',
        label: 'Snapshot gallery',
        description: 'Array of {x, area} objects representing captured moments',
    },

    // Assessment question: integral as function
    accumulationFunction_answerIntegralType: {
        defaultValue: '',
        type: 'select',
        label: 'Integral type answer',
        description: 'Student answer about what type of object the accumulation function is',
        placeholder: '???',
        correctAnswer: 'a function of x',
        options: ['a single number', 'a function of x', 'a constant', 'undefined'],
        color: '#62D0AD',
    },

    // ========================================
    // GLOBAL INTEGRATION PARAMETERS
    // (Shared across sections, initialized here)
    // ========================================

    // Left integration bound (unlocked in area-intuition, carried forward)
    a: {
        defaultValue: 0,
        type: 'number',
        label: 'Start bound (a)',
        description: 'Left integration bound, set in area-intuition and carried over',
        unit: 's',
        min: 0,
        max: 7,
        step: 0.1,
        color: '#62D0AD',
    },

    // Right integration bound (unlocked in area-intuition, carried forward)
    b: {
        defaultValue: 8,
        type: 'number',
        label: 'End bound (b)',
        description: 'Right integration bound, set in area-intuition and carried over',
        unit: 's',
        min: 1,
        max: 8,
        step: 0.1,
        color: '#8E90F5',
    },

    // Number of rectangles (unlocked in riemann-sums, carried forward)
    n: {
        defaultValue: 8,
        type: 'number',
        label: 'Number of rectangles',
        description: 'Number of rectangles in Riemann sum partition, set in riemann-sums and carried over',
        min: 1,
        max: 200,
        step: 1,
        color: '#62D0AD',
    },

    // ========================================
    // NEGATIVE AREA SECTION VARIABLES
    // ========================================

    // Vertical offset of the velocity curve (draggable)
    negativeArea_offset: {
        defaultValue: 0,
        type: 'number',
        label: 'Curve offset',
        description: 'Vertical offset of the velocity curve, controls how much is above/below x-axis',
        unit: '',
        min: -40,
        max: 40,
        step: 1,
        color: '#62D0AD',
    },

    // Positive area magnitude (above x-axis)
    negativeArea_positiveArea: {
        defaultValue: 0,
        type: 'number',
        label: 'Positive area',
        description: 'The total area of the curve above the x-axis (teal shading)',
    },

    // Negative area magnitude (below x-axis, shown as positive)
    negativeArea_negativeArea: {
        defaultValue: 0,
        type: 'number',
        label: 'Negative area',
        description: 'The total area of the curve below the x-axis (coral shading)',
    },

    // Net signed area (positive - negative)
    negativeArea_netArea: {
        defaultValue: 0,
        type: 'number',
        label: 'Net area',
        description: 'The signed sum: positive area minus negative area magnitude',
    },

    // Assessment answer for signed area question
    negativeArea_answerSignedArea: {
        defaultValue: '',
        type: 'text',
        label: 'Signed area answer',
        description: 'Student answer for the signed area assessment question',
        placeholder: '???',
        correctAnswer: 'subtracts',
        color: '#62D0AD',
    },

    // ========================================
    // RIEMANN SUMS SECTION VARIABLES
    // ========================================

    // Number of rectangles in the partition (n) - the key manipulated variable
    riemannSums_n: {
        defaultValue: 4,
        type: 'number',
        label: 'Number of rectangles',
        description: 'Number of rectangles in the Riemann sum partition',
        min: 1,
        max: 200,
        step: 1,
        color: '#62D0AD',
    },

    // Left bound (carried over from area-intuition, frozen)
    riemannSums_a: {
        defaultValue: 0,
        type: 'number',
        label: 'Start time (a)',
        description: 'Left bound of integration - carried over from previous section, locked',
        unit: 's',
    },

    // Right bound (carried over from area-intuition, frozen)
    riemannSums_b: {
        defaultValue: 8,
        type: 'number',
        label: 'End time (b)',
        description: 'Right bound of integration - carried over from previous section, locked',
        unit: 's',
    },

    // Derived: width of each rectangle
    riemannSums_deltaX: {
        defaultValue: 2,
        type: 'number',
        label: 'Rectangle width (Δx)',
        description: 'Width of each rectangle = (b-a)/n',
        unit: 's',
    },

    // Derived: total Riemann sum
    riemannSums_riemannSum: {
        defaultValue: 0,
        type: 'number',
        label: 'Rectangle sum',
        description: 'Total area of all rectangles (left Riemann sum)',
        unit: 'mi',
    },

    // Derived: true area (high-precision)
    riemannSums_trueArea: {
        defaultValue: 0,
        type: 'number',
        label: 'True distance',
        description: 'True area under the curve from high-precision integration',
        unit: 'mi',
    },

    // Derived: absolute error (initial value computed for n=4, a=0, b=8)
    // trueArea ≈ 251.9, riemannSum(n=4) ≈ 236.2, error ≈ 15.7
    riemannSums_error: {
        defaultValue: 15.7,
        type: 'number',
        label: 'Error',
        description: 'Absolute difference between Riemann sum and true area',
        unit: 'mi',
    },

    // Derived: error as percentage (initial value: 15.7/251.9 ≈ 6.2%)
    riemannSums_errorPercent: {
        defaultValue: 6.2,
        type: 'number',
        label: 'Error %',
        description: 'Error as a percentage of true area',
        unit: '%',
    },

    // Whether student has explored the n control
    riemannSums_explored: {
        defaultValue: false,
        type: 'boolean',
        label: 'Explored',
        description: 'Whether the student has interacted with the n slider',
    },

    // Assessment question answer
    riemannSums_answerWhyInfinite: {
        defaultValue: '',
        type: 'select',
        label: 'Why infinite rectangles answer',
        description: 'Student answer about why we need infinite rectangles',
        placeholder: '???',
        correctAnswer: 'There is always a gap between rectangle tops and the curve',
        options: [
            'The rectangles are too tall',
            'There is always a gap between rectangle tops and the curve',
            'The curve is too complex to measure',
            'We run out of computing power'
        ],
        color: '#62D0AD',
    },

    // ========================================
    // ADD YOUR VARIABLES HERE
    // ========================================

    // Uncomment and modify these examples for your lesson:

    /*
    // ─────────────────────────────────────────
    // NUMBER - Use with sliders
    // ─────────────────────────────────────────
    myValue: {
        defaultValue: 5,
        type: 'number',
        label: 'My Value',
        description: 'A number that controls something',
        unit: 'm',           // optional unit display
        min: 0,
        max: 10,
        step: 0.5,
    },

    // ─────────────────────────────────────────
    // TEXT - Free text input
    // ─────────────────────────────────────────
    lessonTitle: {
        defaultValue: 'My Lesson',
        type: 'text',
        label: 'Lesson Title',
        description: 'The title of your lesson',
        placeholder: 'Enter a title...',
    },

    // ─────────────────────────────────────────
    // SELECT - Dropdown with options
    // ─────────────────────────────────────────
    difficulty: {
        defaultValue: 'medium',
        type: 'select',
        label: 'Difficulty',
        description: 'The difficulty level of the lesson',
        options: ['easy', 'medium', 'hard', 'expert'],
    },

    // ─────────────────────────────────────────
    // BOOLEAN - Toggle switch
    // ─────────────────────────────────────────
    showHints: {
        defaultValue: true,
        type: 'boolean',
        label: 'Show Hints',
        description: 'Toggle to show or hide hints',
    },

    // ─────────────────────────────────────────
    // ARRAY - List of numbers
    // ─────────────────────────────────────────
    dataPoints: {
        defaultValue: [1, 4, 9, 16, 25],
        type: 'array',
        label: 'Data Points',
        description: 'Y-values for plotting a graph',
    },

    // ─────────────────────────────────────────
    // OBJECT - Complex structured data
    // ─────────────────────────────────────────
    graphSettings: {
        defaultValue: { 
            xMin: -10, 
            xMax: 10, 
            showGrid: true 
        },
        type: 'object',
        label: 'Graph Settings',
        description: 'Configuration for the graph display',
        schema: '{ xMin: number, xMax: number, showGrid: boolean }',
    },
    */
};

/**
 * Get all variable names (for AI agents to discover)
 */
export const getVariableNames = (): string[] => {
    return Object.keys(variableDefinitions);
};

/**
 * Get a variable's default value
 */
export const getDefaultValue = (name: string): VarValue => {
    return variableDefinitions[name]?.defaultValue ?? 0;
};

/**
 * Get a variable's metadata
 */
export const getVariableInfo = (name: string): VariableDefinition | undefined => {
    return variableDefinitions[name];
};

/**
 * Get all default values as a record (for initialization)
 */
export const getDefaultValues = (): Record<string, VarValue> => {
    const defaults: Record<string, VarValue> = {};
    for (const [name, def] of Object.entries(variableDefinitions)) {
        defaults[name] = def.defaultValue;
    }
    return defaults;
};

/**
 * Get number props for InlineScrubbleNumber from a variable definition.
 * Use with getVariableInfo(name) in blocks.tsx, or getExampleVariableInfo(name) in exampleBlocks.tsx.
 */
export function numberPropsFromDefinition(def: VariableDefinition | undefined): {
    defaultValue?: number;
    min?: number;
    max?: number;
    step?: number;
    color?: string;
} {
    if (!def || def.type !== 'number') return {};
    return {
        defaultValue: def.defaultValue as number,
        min: def.min,
        max: def.max,
        step: def.step,
        ...(def.color ? { color: def.color } : {}),
    };
}

/**
 * Get cloze input props for InlineClozeInput from a variable definition.
 * Use with getVariableInfo(name) in blocks.tsx, or getExampleVariableInfo(name) in exampleBlocks.tsx.
 */
/**
 * Get cloze choice props for InlineClozeChoice from a variable definition.
 * Use with getVariableInfo(name) in blocks.tsx.
 */
export function choicePropsFromDefinition(def: VariableDefinition | undefined): {
    placeholder?: string;
    color?: string;
    bgColor?: string;
} {
    if (!def || def.type !== 'select') return {};
    return {
        ...(def.placeholder ? { placeholder: def.placeholder } : {}),
        ...(def.color ? { color: def.color } : {}),
        ...(def.bgColor ? { bgColor: def.bgColor } : {}),
    };
}

/**
 * Get toggle props for InlineToggle from a variable definition.
 * Use with getVariableInfo(name) in blocks.tsx.
 */
export function togglePropsFromDefinition(def: VariableDefinition | undefined): {
    color?: string;
    bgColor?: string;
} {
    if (!def || def.type !== 'select') return {};
    return {
        ...(def.color ? { color: def.color } : {}),
        ...(def.bgColor ? { bgColor: def.bgColor } : {}),
    };
}

export function clozePropsFromDefinition(def: VariableDefinition | undefined): {
    placeholder?: string;
    color?: string;
    bgColor?: string;
    caseSensitive?: boolean;
} {
    if (!def || def.type !== 'text') return {};
    return {
        ...(def.placeholder ? { placeholder: def.placeholder } : {}),
        ...(def.color ? { color: def.color } : {}),
        ...(def.bgColor ? { bgColor: def.bgColor } : {}),
        ...(def.caseSensitive !== undefined ? { caseSensitive: def.caseSensitive } : {}),
    };
}

/**
 * Get spot-color props for InlineSpotColor from a variable definition.
 * Extracts the `color` field.
 *
 * @example
 * <InlineSpotColor
 *     varName="radius"
 *     {...spotColorPropsFromDefinition(getVariableInfo('radius'))}
 * >
 *     radius
 * </InlineSpotColor>
 */
export function spotColorPropsFromDefinition(def: VariableDefinition | undefined): {
    color: string;
} {
    return {
        color: def?.color ?? '#8B5CF6',
    };
}

/**
 * Get linked-highlight props for InlineLinkedHighlight from a variable definition.
 * Extracts the `color` and `bgColor` fields.
 *
 * @example
 * <InlineLinkedHighlight
 *     varName="activeHighlight"
 *     highlightId="radius"
 *     {...linkedHighlightPropsFromDefinition(getVariableInfo('activeHighlight'))}
 * >
 *     radius
 * </InlineLinkedHighlight>
 */
export function linkedHighlightPropsFromDefinition(def: VariableDefinition | undefined): {
    color?: string;
    bgColor?: string;
} {
    return {
        ...(def?.color ? { color: def.color } : {}),
        ...(def?.bgColor ? { bgColor: def.bgColor } : {}),
    };
}

/**
 * Build the `variables` prop for FormulaBlock from variable definitions.
 *
 * Takes an array of variable names and returns the config map expected by
 * `<FormulaBlock variables={...} />`.
 *
 * @example
 * import { scrubVarsFromDefinitions } from './variables';
 *
 * <FormulaBlock
 *     latex="\scrub{mass} \times \scrub{accel}"
 *     variables={scrubVarsFromDefinitions(['mass', 'accel'])}
 * />
 */
export function scrubVarsFromDefinitions(
    varNames: string[],
): Record<string, { min?: number; max?: number; step?: number; color?: string }> {
    const result: Record<string, { min?: number; max?: number; step?: number; color?: string }> = {};
    for (const name of varNames) {
        const def = variableDefinitions[name];
        if (!def) continue;
        result[name] = {
            ...(def.min !== undefined ? { min: def.min } : {}),
            ...(def.max !== undefined ? { max: def.max } : {}),
            ...(def.step !== undefined ? { step: def.step } : {}),
            ...(def.color ? { color: def.color } : {}),
        };
    }
    return result;
}
