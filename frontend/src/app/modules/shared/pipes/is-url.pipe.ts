import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'isURL'
})
export class IsURLPipe implements PipeTransform {

  transform(value: string): boolean {
    try {
      return Boolean(new URL(value))
    } catch (e) {
      return false;
    }
  }
}
