import { Variable } from "./interfaces";

export class Utils {

    private static nanDebugLogged = new Set<string>();

    private static logNaNOnce(variable: Variable, formula: string) {
        if (this.nanDebugLogged.has(variable.hash))
            return;
        this.nanDebugLogged.add(variable.hash);
        console.warn('[variable NaN]', variable.varKey ?? variable.hash, formula);
    }

    //IIF(S_LEN(Math.floor(144/6)) = 1, '0' + Math.floor(144/6), Math.floor(144/6)) + ':' + IIF(S_LEN((144 MOD 6) * 10) = 1, '0' + (144 MOD 6) * 10, (144 MOD 6) * 10)
    public static sanitizeExp(expval: string) {
        expval = expval
            .replace(/&/g, "+")
            .replace(/mod/g, "%")
            .replace(/MOD/g, "%")
            .replace(/AND/g, "&")
            .replace(/and/g, "&")
            .replace(/&amp;/g, "+")
            .replace(/int\(/g, "Math.floor(")
            .replace(/INT\(/g, "Math.floor(")
            .replace(/\$([0-9a-f]+)/gi, "0x$1");
        return this.normalizeSeramiExp(expval);
    }

    private static normalizeSeramiExp(expval: string): string {
        let prev = '';
        let cur = expval;
        while (prev !== cur) {
            prev = cur;
            cur = this.replaceSLen(cur);
            cur = this.replaceIntegerDivision(cur);
            cur = this.convertIIF(cur);
            cur = this.convertPythonIfElse(cur);
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

    private static scanOperandLeft(s: string, backslashIdx: number): [number, number] | null {
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

    private static scanOperandRight(s: string, backslashIdx: number): [number, number] | null {
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

    private static findTopLevelKeyword(s: string, keyword: string, fromEnd = false): number {
        const lower = keyword.toLowerCase();
        const indices: number[] = [];
        for (let i = 0; i <= s.length - keyword.length; i++) {
            if (this.isInsideString(s, i))
                continue;
            if (s.substring(i, i + keyword.length).toLowerCase() !== lower)
                continue;
            let depth = 0;
            let valid = true;
            for (let j = 0; j < i; j++) {
                if (this.isInsideString(s, j))
                    continue;
                if (s[j] === '(')
                    depth++;
                else if (s[j] === ')')
                    depth--;
            }
            if (depth === 0)
                indices.push(i);
        }
        if (indices.length === 0)
            return -1;
        return fromEnd ? indices[indices.length - 1] : indices[0];
    }

    private static convertPythonIfElse(exp: string): string {
        let changed = true;
        while (changed) {
            changed = false;
            const elseIdx = this.findTopLevelKeyword(exp, ' else ');
            if (elseIdx < 0)
                break;
            const beforeElse = exp.substring(0, elseIdx);
            const ifIdx = this.findTopLevelKeyword(beforeElse, ' if ', true);
            if (ifIdx < 0)
                break;
            const trueBranch = beforeElse.substring(0, ifIdx).trim();
            const cond = beforeElse.substring(ifIdx + 4).trim();
            let falseBranch = exp.substring(elseIdx + 6).trim();
            const suffix = this.extractSuffixAfterIfElse(falseBranch);
            if (suffix) {
                falseBranch = suffix.branch;
                exp = `(${cond} ? ${trueBranch} : ${falseBranch})${suffix.suffix}`;
            } else {
                falseBranch = this.balanceClosingParens(falseBranch);
                exp = `(${cond} ? ${trueBranch} : ${falseBranch})`;
            }
            changed = true;
        }
        return exp;
    }

    private static extractSuffixAfterIfElse(falseBranch: string): { branch: string; suffix: string } | null {
        let depth = 0;
        for (let i = 0; i < falseBranch.length; i++) {
            if (this.isInsideString(falseBranch, i))
                continue;
            if (falseBranch[i] === '(')
                depth++;
            else if (falseBranch[i] === ')')
                depth--;
            else if (falseBranch[i] === '+' && depth <= 0)
                return {
                    branch: this.balanceClosingParens(falseBranch.substring(0, i).trim()),
                    suffix: falseBranch.substring(i),
                };
        }
        return null;
    }

    private static balanceClosingParens(s: string): string {
        let opens = 0;
        let closes = 0;
        for (let i = 0; i < s.length; i++) {
            if (this.isInsideString(s, i))
                continue;
            if (s[i] === '(')
                opens++;
            else if (s[i] === ')')
                closes++;
        }
        let result = s;
        while (closes > opens && result.endsWith(')')) {
            result = result.slice(0, -1).trimEnd();
            closes--;
        }
        return result;
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

    static convertValuesToRead(variables: Variable[], values: (number | null)[]) {
        let ret = [] as number[];
        const params = variables.filter(v => v.varKey !== undefined);
        const hashes = variables.map(v => v.hash);

        var re = new RegExp('#', 'g');
        for (let i = 0; i < variables.length; i++) {
            const variable = variables[i];
            if (values[i] !== null) {
                let formula = variable.readExp ?? String(values[i]);
                try {
                    const value = values[i]! & variable.mask!;

                    if (variable.type === "RwmsParameterBaseBit") {
                        ret.push(value > 0 ? 1 : 0);
                        continue;
                    }

                    if (!variable.readExp) {
                        formula = String(value);
                        if (Number.isNaN(value))
                            this.logNaNOnce(variable, formula);
                        ret.push(value);
                    } else {
                        const expval = this.sanitizeExp(variable.readExp);
                        let exp = expval.replace(re, "" + value);
                        params.forEach(p => exp = exp.replace(new RegExp(p.varKey!, 'g'), "" + values[hashes.indexOf(p.hash)]));
                        formula = exp;
                        const result = eval(exp);
                        if (Number.isNaN(result))
                            this.logNaNOnce(variable, formula);
                        ret.push(result);
                    }
                }
                catch (ex) {
                    this.logNaNOnce(variable, formula);
                    ret.push(NaN);
                }
            }
            else {
                this.logNaNOnce(variable, variable.readExp ?? '(null raw value)');
                ret.push(NaN);
            }
        }
        return ret;
    }

    static convertValuesToWrite(variables: Variable[], values: number[], skipValues=false) {
        let ret = [] as number[];

        var re = new RegExp('#', 'g');
        for (let i = 0; i < variables.length; i++) {
            const variable = variables[i];
            const value = values[i];

            if (variable.type === "RwmsParameterBaseBit") {
                ret.push(value > 0 ? variable.mask! : 0);
                continue;
            }

            if (!skipValues && variable.values && variable.values.length > 0) {
                const keys = variable.values.map(item => item[0]);
                if (keys.includes("" + value)) {
                    ret.push(value);
                    continue;
                }
            }

            if (!variable.writeExp) {
                if (variable.readExp) {
                    //Calculate reverse formula
                    const expval = this.sanitizeExp(variable.readExp);
                    const fn = (x: number) => {
                        let exp = expval.replace(re, "" + x) + " - " + value;
                        //let exp = variable.readExp!.replace(re, "" + x) + " - " + value;
                        return eval(exp);
                    }
                    //const result = Utils.newtonRaphson(fn, 0, 0.1);
                    const result = Utils.bisectionAlgorithm(fn, 0, (2 ** variable.bit - 1))
                    if (result == null) {
                        throw new Error("Bisection Error")
                    }
                    ret.push(Math.round(result));
                }
                else {
                    ret.push(value);
                }
            } else {
                ret.push(eval(variable.writeExp.replace(re, "" + value)));
            }
        }
        return ret;
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

        if (fleft * fright >= 0) {
            return null; // L'algoritmo di bisezione richiede che f(a) * f(b) < 0
        }

        while (Math.abs(right - left) > tolerance) {
            const mid = (left + right) / 2;
            const value = f(mid);

            if (Math.abs(value) < tolerance) {
                return mid; // L'intervallo è sufficientemente piccolo
            }

            if (value * f(left) < 0) {
                right = mid; // Il punto medio cade a sinistra
            } else {
                left = mid; // Il punto medio cade a destra
            }
        }

        return (left + right) / 2; // Restituisce il valore approssimato
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
        return (parseInt(hex, 16).toString(2)).padStart(8, '0');
    }
}
