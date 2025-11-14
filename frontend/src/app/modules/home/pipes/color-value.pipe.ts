import { Pipe, PipeTransform } from '@angular/core';
import {VariableValue} from "../../../classes/interfaces";

@Pipe({
  name: 'colorValue'
})
export class ColorValuePipe implements PipeTransform {

  transform(value: VariableValue|undefined|null): string {
    if(!value)
      return "rgb(240 240 240)";
    if(value.variable.colors)
    {
      if(value.variable.colors.length > 0)
      {
        for(let i=0;i<value.variable.colors.length;i++)
        {
          let item = value.variable.colors[i];
          switch (item.condition.operator)
          {
            case "=":
              if(value.value === item.condition.value )
                return item.color;
              break;
            case ">":
              if(value.value > item.condition.value )
                return item.color;
              break;
            case "<":
              if(value.value < item.condition.value )
                return item.color;
              break;
            case ">=":
              if(value.value >= item.condition.value )
                return item.color;
              break;
            case "<=":
              if(value.value <= item.condition.value )
                return item.color;
              break;
          }
        }
      }
    }
    return "rgb(240 240 240)";
  }

}
