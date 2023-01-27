import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'byteorder'
})
export class ByteorderPipe implements PipeTransform {

  transform(value: string|null): string|null {
    if(value === null)
      return null;
    if(value.includes(">"))
      return "big endian"
    if(value.includes("<"))
      return "little endian"
    return null;
  }

}
