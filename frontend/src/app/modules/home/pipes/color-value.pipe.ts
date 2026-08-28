import { Pipe, PipeTransform } from '@angular/core';
import {Variable, VariableValue} from "../../../classes/interfaces";

@Pipe({
  name: 'colorValue'
})
export class ColorValuePipe implements PipeTransform {

  transform(value: VariableValue|undefined|null, variable: Variable): string|null {
    if(!value)
      return null;
    if(variable.colors)
    {
      if(variable.colors.length > 0)
      {
        const numericValue = Number(value.value);
        if (Number.isNaN(numericValue)) {
          return null;
        }
        for(let i=0;i<variable.colors.length;i++)
        {
          let item = variable.colors[i];
          switch (item.condition.operator)
          {
            case "=":
              if(numericValue === item.condition.value )
                return item.color;
              break;
            case ">":
              if(numericValue > item.condition.value )
                return item.color;
              break;
            case "<":
              if(numericValue < item.condition.value )
                return item.color;
              break;
            case ">=":
              if(numericValue >= item.condition.value )
                return item.color;
              break;
            case "<=":
              if(numericValue <= item.condition.value )
                return item.color;
              break;
          }
        }
      }
    }
    return null;
  }

}
