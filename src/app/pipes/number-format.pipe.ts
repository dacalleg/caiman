import { Pipe, PipeTransform } from '@angular/core';
import {ViewOption} from "../classes/interfaces";

@Pipe({
  name: 'numberFormat'
})
export class NumberFormatPipe implements PipeTransform {

  transform(value: number | null, options: ViewOption | null = null): unknown {
    if (value === null)
      return null;
    if (options === null) {
      return "0x" + value.toString(16).toUpperCase();
    }
    if (options.addressFormat === 16)
      return "0x" + value.toString(16).toUpperCase();
    if (options.addressFormat === 10)
      return value;
    return value;
  }

}
