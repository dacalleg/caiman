import { Variable } from "./interfaces";

export class Utils {

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
            .replace(/\$([0-9a-f]+)/gi, "0x$1")
        return expval;
    }

    static convertValuesToRead(variables: Variable[], values: (number | null)[]) {
        let ret = [] as number[];
        const params = variables.filter(v => v.varKey !== undefined);
        const hashes = variables.map(v => v.hash);

        var re = new RegExp('#', 'g');
        for (let i = 0; i < variables.length; i++) {
            if (values[i] !== null) {
                try {
                    const variable = variables[i];
                    const value = values[i]! & variable.mask!;

                    if (variable.type === "RwmsParameterBaseBit") {
                        ret.push(value > 0 ? 1 : 0);
                        continue;
                    }

                    if (!variable.readExp) {
                        ret.push(value);
                    } else {
                        const expval = this.sanitizeExp(variable.readExp);
                        let exp = expval.replace(re, "" + value);
                        params.forEach(p => exp = exp.replace(new RegExp(p.varKey!, 'g'), "" + values[hashes.indexOf(p.hash)]));
                        /*try
                        {
                            if(Number.isNaN(eval(exp)))
                                console.log(exp);
                        }catch
                        {
                            console.log(exp);
                        }*/

                        ret.push(eval(exp));
                    }
                }
                catch (ex) {
                    ret.push(NaN);
                }
            }
            else {
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
