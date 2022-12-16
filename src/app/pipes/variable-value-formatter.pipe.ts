import {Pipe, PipeTransform} from '@angular/core';
import {DeviceData, Variable} from "../classes/interfaces";
import struct from "../classes/struct";

@Pipe({
  name: 'variableValueFormatter'
})
export class VariableValueFormatterPipe implements PipeTransform {

  transform(value: DeviceData | null, variable: Variable): string|number|boolean|null {
    if (value === null)
      return null;
    const offset = variable.address - value.startAddress;
    const s = struct(variable.pattern);
    const data = value.buffer.subarray(offset, offset + (variable.bit / 8));
    let ret = s.unpack(data.buffer)[0];
    if (variable.mask && variable.mask !== (Math.pow(2, variable.bit) - 1)) {
      ret = ret & variable.mask;
      if (variable.binaryMask) {
        const ones = variable.binaryMask.split("").reduce((acc, item) => {
          acc = acc + (item === "1" ? 1 : 0);
          return acc;
        }, 0);
        if (ones === 1)
          return ret > 0 ? 1 : 0;
      }
    }
    variable.readExp?.forEach(item => {
      try{
        ret = eval(item.replace("x", ret))
      }
      catch (ex)
      {

      }
    });
    if(variable.values) {
      for (let i = 0; i < variable.values.length; i++) {
        const item = variable.values[i]
        if (item[0] == ret)
          return item[1];
      }
    }
    return ret;
  }

}
