import { Variable } from "./interfaces";

const HASH_PLACEHOLDER = '#';
const HASH_REGEX = /#/g;

type TextRange = [number, number];

export class Utils {

    public static sanitizeString(str: string): string {
        return str.trim().toLowerCase()
            .normalize('NFD').replace(/([\u0300-\u036f]|[^0-9a-zA-Z])/g, ' ')
            .replace(/ /g, '_')
            .replace(/\//g, '_')
            .replace(/-/g, '_')
            .replace(/\./g, '_')
            .replace(/\(/g, '')
            .replace(/\)/g, '')
            .replace(/(_)\1+/g, '$1')
            .replace(/(\w+)_$/gm, '$1');
    }

    private static nanDebugLogged = new Set<string>();

    private static logNaNOnce(variable: Variable, formula: string) {
        if (this.nanDebugLogged.has(variable.hash))
            return;
        this.nanDebugLogged.add(variable.hash);
        console.warn('[variable NaN]', variable.varKey ?? variable.hash, formula);
    }

    private static coerceNumericBound(value: unknown, fallback: number): number {
        return typeof value === 'number' && !Number.isNaN(value) ? value : fallback;
    }

    private static bitMaxFromBitCount(bit: number): number {
        return (2 ** bit) - 1;
    }

    private static evaluateBoundsFromSanitizedExp(
        sanitized: string,
        min: number,
        max: number,
        computeStep = false
    ): { min: number; max: number; step?: number } {
        const bounds = { min, max } as { min: number; max: number; step?: number };
        try {
            bounds.min = eval(sanitized.replace(HASH_REGEX, String(min)));
        }
        catch {
        }
        try {
            bounds.max = eval(sanitized.replace(HASH_REGEX, String(max)));
        }
        catch {
        }
        if (computeStep) {
            try {
                const atOne = eval(sanitized.replace(HASH_REGEX, '1'));
                const atTwo = eval(sanitized.replace(HASH_REGEX, '2'));
                bounds.step = atTwo - atOne;
            }
            catch {
            }
        }
        return bounds;
    }

    public static sanitizeExp(expval: string) {
        expval = expval
            .replace(/&amp;/g, "+")
            .replace(/mod/gi, "%")
            .replace(/AND/gi, "&")
            .replace(/int\(/gi, "Math.floor(")
            .replace(/\$([0-9a-f]+)/gi, "0x$1");
        expval = this.replaceSeramiAmpersand(expval);
        return this.normalizeSeramiExp(expval);
    }

    public static normalizeReadExp(exp: string | null | undefined): string | null | undefined {
        if (!exp || exp === HASH_PLACEHOLDER)
            return exp;
        if (this.parseMaskOnlyFormula(exp) !== null)
            return null;
        return this.sanitizeExp(exp);
    }

    public static parseMaskOnlyFormula(formula: string | null | undefined): number | null {
        if (!formula || typeof formula !== 'string')
            return null;
        const trimmed = formula.trim();
        const patterns = [
            /^\(\s*#\s*AND\s*(\d+)\s*\)$/i,
            /^#\s*AND\s*(\d+)$/i,
            /^\(\s*#\s*&\s*(\d+)\s*\)$/,
            /^#\s*&\s*(\d+)$/,
        ];
        for (const pattern of patterns) {
            const match = trimmed.match(pattern);
            if (match)
                return parseInt(match[1], 10);
        }
        return null;
    }

    public static isLegacyFakeMaskFormula(formula: string | null | undefined): boolean {
        if (!formula || typeof formula !== 'string')
            return false;
        return /^\(\s*#\s*AND\s*(\d+)\s*\)$/i.test(formula.trim());
    }

    public static resolveReadExpForBuild(
        rawReadExp: string | null | undefined,
        realMin: number,
        realMax: number,
        currentMask: number
    ): { mask: number; readExp: string | null | undefined; min: number; max: number; step: number } {
        let mask = currentMask;
        let min = realMin;
        let max = realMax;
        let step = 1;
        let expval = rawReadExp;
        const maskOnly = this.parseMaskOnlyFormula(rawReadExp);

        if (maskOnly !== null) {
            mask = maskOnly;
            expval = null;
            if (this.isLegacyFakeMaskFormula(rawReadExp)) {
                min = 0;
                max = 1;
            }
        }
        else if (expval && expval !== HASH_PLACEHOLDER) {
            const sanitized = this.sanitizeExp(expval);
            if (!this.producesStringOutput(sanitized, realMin, realMax)) {
                const bounds = this.evaluateBoundsFromSanitizedExp(sanitized, realMin, realMax, true);
                min = bounds.min;
                max = bounds.max;
                step = bounds.step ?? step;
            }
        }

        const readExp = maskOnly !== null ? null : this.normalizeReadExp(expval);
        return { mask, readExp, min, max, step };
    }

    public static producesStringOutput(readExp: string, min: unknown = 0, max: unknown = 255): boolean {
        if (!readExp || readExp === HASH_PLACEHOLDER)
            return false;
        const lo = this.coerceNumericBound(min, 0);
        const hi = this.coerceNumericBound(max, 255);
        const samples = [lo, hi, Math.floor((lo + hi) / 2), 30, 0, 255];
        const unique = samples.filter((v, i, a) => a.indexOf(v) === i && v >= lo && v <= hi);
        for (const raw of unique) {
            try {
                const exp = this.sanitizeExp(readExp).replace(HASH_REGEX, String(raw));
                if (typeof eval(exp) === 'string')
                    return true;
            }
            catch {
            }
        }
        return false;
    }

    public static getAllMaskValues(mask: number): number[] {
        const values: number[] = [];
        for (let i = 0; i <= mask; i++) {
            if (i === (i & mask))
                values.push(i);
        }
        return values;
    }

    public static buildStringValueOptions(config: {
        readExp: string;
        mask: number;
        min?: number;
        max?: number;
        step?: number;
        bit: number;
        type?: string;
    }): string[][] {
        const variable = {
            readExp: config.readExp,
            mask: config.mask,
            min: config.min,
            max: config.max,
            step: config.step ?? 1,
            bit: config.bit,
            type: config.type ?? 'RwmsParameterBase',
        } as Variable;
        const bitMax = this.bitMaxFromBitCount(config.bit);
        const realMin = this.coerceNumericBound(config.min, 0);
        const realMax = this.coerceNumericBound(config.max, bitMax);
        const step = typeof config.step === 'number' && config.step > 0 && !Number.isNaN(config.step) ? config.step : 1;
        const options: string[][] = [];
        for (const raw of this.getAllMaskValues(config.mask)) {
            if (raw < realMin || raw > realMax || raw % step !== 0)
                continue;
            const [result] = this.convertValuesToRead([variable], [raw]);
            options.push([String(raw), String(result)]);
        }
        return options;
    }

    public static applyStringValueOptionsIfNeeded(variable: Variable) {
        if (!variable.readExp || variable.readExp === HASH_PLACEHOLDER)
            return;
        const bitMax = this.bitMaxFromBitCount(variable.bit);
        const probeMin = this.coerceNumericBound(variable.min, 0);
        const probeMax = this.coerceNumericBound(variable.max, bitMax);
        if (!this.producesStringOutput(variable.readExp, probeMin, probeMax)
            && !this.producesStringOutput(variable.readExp, 0, bitMax))
            return;
        if (!variable.values?.length) {
            const options = this.buildStringValueOptions({
                readExp: variable.readExp,
                mask: variable.mask!,
                min: probeMin,
                max: probeMax,
                step: 1,
                bit: variable.bit,
                type: variable.type,
            });
            if (options.length === 0)
                return;
            variable.values = options;
        }
        variable.readExp = null;
    }

    public static hasLogicalAnd(exp: string): boolean {
        if (/\bAND\b/i.test(exp))
            return true;
        for (let i = 0; i < exp.length; i++) {
            if (exp[i] !== '&' || this.isInsideString(exp, i))
                continue;
            const left = this.scanSeramiOperandLeft(exp, i);
            const right = this.scanSeramiOperandRight(exp, i);
            if (!left || !right)
                continue;
            const leftStr = exp.substring(left[0], left[1] + 1);
            const rightStr = exp.substring(right[0], right[1] + 1);
            if (!this.isStringLiteralOperand(leftStr) && !this.isStringLiteralOperand(rightStr))
                return true;
        }
        return false;
    }

    static convertValuesToRead(variables: Variable[], values: (number | null)[]) {
        const results = [] as (number | string)[];
        const params = variables.filter(v => v.varKey !== undefined);
        const hashes = variables.map(v => v.hash);

        for (let i = 0; i < variables.length; i++) {
            const variable = variables[i];
            if (values[i] === null) {
                this.logNaNOnce(variable, variable.readExp ?? '(null raw value)');
                results.push(NaN);
                continue;
            }

            let formula = variable.readExp ?? String(values[i]);
            try {
                const maskedValue = values[i]! & variable.mask!;

                if (variable.type === "RwmsParameterBaseBit") {
                    results.push(maskedValue > 0 ? 1 : 0);
                    continue;
                }

                if (!variable.readExp) {
                    formula = String(maskedValue);
                    if (Number.isNaN(maskedValue))
                        this.logNaNOnce(variable, formula);
                    results.push(maskedValue);
                    continue;
                }

                const expval = this.sanitizeExp(variable.readExp);
                let exp = expval.replace(HASH_REGEX, String(maskedValue));
                params.forEach(p => exp = exp.replace(new RegExp(p.varKey!, 'g'), String(values[hashes.indexOf(p.hash)])));
                formula = exp;
                const result = eval(exp);
                if (Number.isNaN(result))
                    this.logNaNOnce(variable, formula);
                results.push(result);
            }
            catch {
                this.logNaNOnce(variable, formula);
                results.push(NaN);
            }
        }
        return results;
    }

    static convertValuesToWrite(variables: Variable[], values: (number | string)[], skipValues = false) {
        const results = [] as number[];

        for (let i = 0; i < variables.length; i++) {
            const variable = variables[i];
            const value = typeof values[i] === 'string' ? parseFloat(values[i] as string) : values[i] as number;

            if (variable.type === "RwmsParameterBaseBit") {
                results.push(value > 0 ? variable.mask! : 0);
                continue;
            }

            if (variable.button) {
                results.push(value);
                continue;
            }

            if (!skipValues && variable.values && variable.values.length > 0) {
                const keys = variable.values.map(item => item[0]);
                if (keys.includes(String(value))) {
                    results.push(value);
                    continue;
                }
            }

            if (!variable.writeExp) {
                if (variable.readExp) {
                    const expval = this.sanitizeExp(variable.readExp);
                    const fn = (x: number) => eval(expval.replace(HASH_REGEX, String(x)) + " - " + value);
                    const result = Utils.bisectionAlgorithm(fn, 0, this.bitMaxFromBitCount(variable.bit));
                    if (result == null)
                        throw new Error("Bisection Error");
                    results.push(Math.round(result));
                }
                else {
                    results.push(value);
                }
            }
            else {
                results.push(eval(variable.writeExp.replace(HASH_REGEX, String(value))));
            }
        }
        return results;
    }

    static bisectionAlgorithm(
        f: (x: number) => number,
        a: number,
        b: number,
        tolerance: number = 0.01
    ): number | null {
        let left = a;
        let right = b;
        let fleft = f(left);
        let fright = f(right);

        if (fleft === 0)
            return left;

        if (fright === 0)
            return right;

        if (fleft * fright >= 0)
            return null;

        while (Math.abs(right - left) > tolerance) {
            const mid = (left + right) / 2;
            const value = f(mid);

            if (Math.abs(value) < tolerance)
                return mid;

            if (value * f(left) < 0)
                right = mid;
            else
                left = mid;
        }

        return (left + right) / 2;
    }

    static newtonRaphson(f: (x: number) => number, x0: number, h: number = 0.0001) {
        let x1 = x0 - f(x0) / Utils.derivative(f, x0, h);
        while (Math.abs(x1 - x0) > h) {
            x0 = x1;
            x1 = x0 - f(x0) / Utils.derivative(f, x0, h);
        }
        return x1;
    }

    static derivative(f: (x: number) => number, x: number, h: number = 0.0001) {
        return (f(x + h) - f(x - h)) / (2 * h);
    }

    static hex2bin(hex: string): string {
        return parseInt(hex, 16).toString(2).padStart(8, '0');
    }

    private static normalizeSeramiExp(expval: string): string {
        let prev = '';
        let cur = expval;
        while (prev !== cur) {
            prev = cur;
            cur = this.replaceSLen(cur);
            cur = this.replaceIntegerDivision(cur);
            cur = this.convertIIF(cur);
            cur = this.convertEquality(cur);
        }
        return cur;
    }

    private static isInsideString(s: string, idx: number): boolean {
        let inString = false;
        let stringChar = '';
        for (let i = 0; i < idx; i++) {
            const c = s[i];
            if (inString) {
                if (c === stringChar && s[i - 1] !== '\\')
                    inString = false;
                continue;
            }
            if (c === '"' || c === "'") {
                inString = true;
                stringChar = c;
            }
        }
        return inString;
    }

    private static findMatchingParen(s: string, openIdx: number): number {
        if (s[openIdx] !== '(')
            return -1;
        let depth = 0;
        for (let i = openIdx; i < s.length; i++) {
            if (this.isInsideString(s, i))
                continue;
            if (s[i] === '(')
                depth++;
            else if (s[i] === ')') {
                depth--;
                if (depth === 0)
                    return i;
            }
        }
        return -1;
    }

    private static splitArgs(s: string): string[] {
        const args: string[] = [];
        let depth = 0;
        let inString = false;
        let stringChar = '';
        let current = '';
        for (let i = 0; i < s.length; i++) {
            const c = s[i];
            if (inString) {
                current += c;
                if (c === stringChar && s[i - 1] !== '\\')
                    inString = false;
                continue;
            }
            if (c === '"' || c === "'") {
                inString = true;
                stringChar = c;
                current += c;
                continue;
            }
            if (c === '(') {
                depth++;
                current += c;
                continue;
            }
            if (c === ')') {
                depth--;
                current += c;
                continue;
            }
            if (c === ',' && depth === 0) {
                args.push(current);
                current = '';
                continue;
            }
            current += c;
        }
        if (current)
            args.push(current);
        return args;
    }

    private static replaceSLen(exp: string): string {
        const re = /\bs_len\s*\(/gi;
        let match = re.exec(exp);
        while (match) {
            const openParen = match.index + match[0].length - 1;
            const closeParen = this.findMatchingParen(exp, openParen);
            if (closeParen < 0)
                break;
            const arg = exp.substring(openParen + 1, closeParen);
            const replacement = `String(${arg}).length`;
            exp = exp.substring(0, match.index) + replacement + exp.substring(closeParen + 1);
            re.lastIndex = 0;
            match = re.exec(exp);
        }
        return exp;
    }

    private static isStringLiteralOperand(operand: string): boolean {
        const trimmed = operand.trim();
        return (trimmed.startsWith('"') && trimmed.endsWith('"'))
            || (trimmed.startsWith("'") && trimmed.endsWith("'"));
    }

    private static scanSeramiOperandLeft(s: string, ampIdx: number): TextRange | null {
        let i = ampIdx - 1;
        while (i >= 0 && /\s/.test(s[i]))
            i--;
        if (i < 0)
            return null;

        if (s[i] === '"' || s[i] === "'") {
            const end = i;
            const quote = s[i];
            i--;
            while (i >= 0) {
                if (s[i] === quote && s[i - 1] !== '\\')
                    return [i, end];
                i--;
            }
            return null;
        }

        if (s[i] === ')') {
            let depth = 1;
            const end = i;
            i--;
            while (i >= 0) {
                if (this.isInsideString(s, i)) {
                    i--;
                    continue;
                }
                if (s[i] === ')')
                    depth++;
                else if (s[i] === '(') {
                    depth--;
                    if (depth === 0) {
                        let start = i;
                        while (start > 0 && /[a-zA-Z0-9_]/.test(s[start - 1]))
                            start--;
                        return [start, end];
                    }
                }
                i--;
            }
            return null;
        }

        const end = i;
        while (i >= 0 && /[0-9.#a-zA-Z_]/.test(s[i]))
            i--;
        if (i < end)
            return [i + 1, end];
        return null;
    }

    private static scanSeramiOperandRight(s: string, ampIdx: number): TextRange | null {
        let i = ampIdx + 1;
        while (i < s.length && /\s/.test(s[i]))
            i++;
        if (i >= s.length)
            return null;

        if (s[i] === '"' || s[i] === "'") {
            const start = i;
            const quote = s[i];
            i++;
            while (i < s.length) {
                if (s[i] === quote && s[i - 1] !== '\\')
                    return [start, i];
                i++;
            }
            return null;
        }

        if (s[i] === '(') {
            const close = this.findMatchingParen(s, i);
            if (close < 0)
                return null;
            return [i, close];
        }

        if (/[a-zA-Z_]/.test(s[i])) {
            const start = i;
            while (i < s.length && /[a-zA-Z0-9_]/.test(s[i]))
                i++;
            if (i < s.length && s[i] === '(') {
                const close = this.findMatchingParen(s, i);
                if (close >= 0)
                    return [start, close];
            }
            return [start, i - 1];
        }

        const start = i;
        while (i < s.length && /[0-9.#]/.test(s[i]))
            i++;
        if (i > start)
            return [start, i - 1];
        return null;
    }

    private static replaceSeramiAmpersand(exp: string): string {
        let result = '';
        for (let i = 0; i < exp.length; i++) {
            if (exp[i] === '&' && !this.isInsideString(exp, i)) {
                const left = this.scanSeramiOperandLeft(exp, i);
                const right = this.scanSeramiOperandRight(exp, i);
                if (!left || !right) {
                    result += exp[i];
                    continue;
                }
                const leftStr = exp.substring(left[0], left[1] + 1);
                const rightStr = exp.substring(right[0], right[1] + 1);
                const isConcat = this.isStringLiteralOperand(leftStr) || this.isStringLiteralOperand(rightStr);
                result += isConcat ? '+' : '&';
                continue;
            }
            result += exp[i];
        }
        return result;
    }

    private static scanOperandLeft(s: string, backslashIdx: number): TextRange | null {
        let i = backslashIdx - 1;
        while (i >= 0 && /\s/.test(s[i]))
            i--;
        if (i < 0)
            return null;

        if (s[i] === ')') {
            let depth = 1;
            let j = i - 1;
            while (j >= 0) {
                if (this.isInsideString(s, j)) {
                    j--;
                    continue;
                }
                if (s[j] === ')')
                    depth++;
                else if (s[j] === '(') {
                    depth--;
                    if (depth === 0)
                        return [j, i];
                }
                j--;
            }
            return null;
        }

        let end = i;
        while (i >= 0 && /[0-9.#]/.test(s[i]))
            i--;
        if (i < end)
            return [i + 1, end];
        return null;
    }

    private static scanOperandRight(s: string, backslashIdx: number): TextRange | null {
        let i = backslashIdx + 1;
        while (i < s.length && /\s/.test(s[i]))
            i++;
        if (i >= s.length)
            return null;

        if (s[i] === '(') {
            const close = this.findMatchingParen(s, i);
            if (close < 0)
                return null;
            return [i, close];
        }

        let start = i;
        while (i < s.length && /[0-9.#]/.test(s[i]))
            i++;
        if (i > start)
            return [start, i - 1];
        return null;
    }

    private static replaceIntegerDivision(exp: string): string {
        let changed = true;
        while (changed) {
            changed = false;
            for (let i = 0; i < exp.length; i++) {
                if (exp[i] !== '\\' || this.isInsideString(exp, i))
                    continue;
                const left = this.scanOperandLeft(exp, i);
                const right = this.scanOperandRight(exp, i);
                if (!left || !right)
                    continue;
                const leftStr = exp.substring(left[0], left[1] + 1);
                const rightStr = exp.substring(right[0], right[1] + 1);
                exp = exp.substring(0, left[0]) + `Math.floor(${leftStr}/${rightStr})` + exp.substring(right[1] + 1);
                changed = true;
                break;
            }
        }
        return exp;
    }

    private static convertIIF(exp: string): string {
        let changed = true;
        while (changed) {
            changed = false;
            const re = /\biif\s*\(/gi;
            let match: RegExpExecArray | null;
            while ((match = re.exec(exp)) !== null) {
                const openParen = match.index + match[0].length - 1;
                const closeParen = this.findMatchingParen(exp, openParen);
                if (closeParen < 0)
                    continue;
                const inner = exp.substring(openParen + 1, closeParen);
                if (/\biif\s*\(/i.test(inner))
                    continue;
                const args = this.splitArgs(inner);
                if (args.length !== 3)
                    continue;
                const replacement = `(${args[0].trim()} ? ${args[1].trim()} : ${args[2].trim()})`;
                exp = exp.substring(0, match.index) + replacement + exp.substring(closeParen + 1);
                changed = true;
                break;
            }
        }
        return exp;
    }

    private static convertEquality(exp: string): string {
        let result = '';
        let inString = false;
        let stringChar = '';
        for (let i = 0; i < exp.length; i++) {
            const c = exp[i];
            if (inString) {
                result += c;
                if (c === stringChar && exp[i - 1] !== '\\')
                    inString = false;
                continue;
            }
            if (c === '"' || c === "'") {
                inString = true;
                stringChar = c;
                result += c;
                continue;
            }
            if (c === '=' && exp[i + 1] !== '=' && exp[i - 1] !== '=' && exp[i - 1] !== '!' && exp[i - 1] !== '<' && exp[i - 1] !== '>') {
                result += '==';
                continue;
            }
            result += c;
        }
        return result;
    }
}
