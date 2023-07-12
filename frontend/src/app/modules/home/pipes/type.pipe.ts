import { Pipe, PipeTransform } from '@angular/core';
import { Variable } from 'src/app/classes/interfaces';
import { Utils } from 'src/app/classes/utils';

@Pipe({
  name: 'type'
})
export class TypePipe implements PipeTransform {

  transform(value: Variable | null): string | null {
    if (value === null)
      return null;
    if (value.type === "AlphanumericParameterBase")
      return "string"
    if (value.mask) {
      const binaryMask = Utils.hex2bin(value.mask.toString(16));
      const ones = binaryMask.split("").reduce((acc, item) => {
        acc = acc + (item === "1" ? 1 : 0);
        return acc;
      }, 0);
      if (ones === 1)
        return "boolean";
      return "number";
    }
    return "undefined";
  }

}
