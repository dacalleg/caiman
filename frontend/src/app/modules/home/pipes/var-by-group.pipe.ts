import {Pipe, PipeTransform} from '@angular/core';
import { Variable } from 'src/app/classes/interfaces';

@Pipe({
  name: 'varByGroup'
})
export class VarByGroupPipe implements PipeTransform {

  transform(value: Variable[] | null, group: string): Variable[] {
    if (value === null) {
      return [];
    }
    return value.filter(item => item.group === group).sort((a,b) => (a.sort || 0) - (b.sort || 0));
  }

}
