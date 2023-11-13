import { Pipe, PipeTransform } from '@angular/core';
import { Variable } from 'src/app/classes/interfaces';

@Pipe({
  name: 'search'
})
export class SearchPipe implements PipeTransform {

  transform(variables: Variable[]|undefined, search: string|undefined): Variable[] {
    if(variables == null)
      return [];
    if(search == null)
      return [];
    return variables.filter(v => {
      let text = v.hash + v.name;
      return text.toLowerCase().includes(search.toLowerCase());
    })
  }

}
