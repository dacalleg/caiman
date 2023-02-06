import { Variable } from "./interfaces";

export class Utils {
    static convertValuesToRead(variables: Variable[], values: number[]) {
        let ret = [] as number[];
        var re = new RegExp('#', 'g');
        for (let i = 0; i < variables.length; i++) {
            try {
                const variable = variables[i];
                const value = values[i];
                if (!variable.readExp) {
                    ret.push(value);
                } else {
                    ret.push(eval(variable.readExp.replace(re, "" + value)));
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
            if (!variable.writeExp) {
                ret.push(value);
            } else {
                ret.push(eval(variable.writeExp.replace(re, "" + value)));
            }
        }
        return ret;
    }
}
