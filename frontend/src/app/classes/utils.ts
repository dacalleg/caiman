import { Variable } from "./interfaces";

export class Utils {
    static convertValuesToRead(variables: Variable[], values: number[]) {
        let ret = [] as number[];
        const params = variables.filter(v => v.varKey !== undefined);
        const hashes = variables.map(v => v.hash);

        var re = new RegExp('#', 'g');
        for (let i = 0; i < variables.length; i++) {
            try {
                const variable = variables[i];
                const value = values[i] & variable.mask!;

                if (variable.type === "RwmsParameterBaseBit") {
                    ret.push(value > 0 ? 1 : 0);
                    continue;
                }

                if (!variable.readExp) {
                    ret.push(value);
                } else {
                    let exp = variable.readExp.replace(re, "" + value);
                    params.forEach(p => exp = exp.replace(new RegExp(p.varKey!, 'g'), "" + values[hashes.indexOf(p.hash)]));
                    ret.push(eval(exp));
                }
            }
            catch (ex) {
                ret.push(NaN);
            }
        }
        return ret;
    }

    static convertValuesToWrite(variables: Variable[], values: number[]) {
        let ret = [] as number[];
        
        var re = new RegExp('#', 'g');
        for (let i = 0; i < variables.length; i++) {
            const variable = variables[i];
            const value = values[i];

            if (variable.type === "RwmsParameterBaseBit") {
                ret.push(value > 0 ? variable.mask! : 0);
                continue;
            }

            if(variable.values && variable.values.length > 0) {
                ret.push(value);
                continue;
            }

            if (!variable.writeExp) {
                if (variable.readExp) {
                    //Calculate reverse formula
                    const fn = (x: number) => {
                        let exp = variable.readExp!.replace(re, "" + x) + " - " + value;
                        return eval(exp);
                    }
                    const result = Utils.newtonRaphson(fn, 0, 0.1);
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
}
