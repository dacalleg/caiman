import {Component, Input, OnChanges, SimpleChanges} from '@angular/core';
import {Variable, VariableColor} from "../../../../classes/interfaces";

@Component({
  selector: 'app-edit-colors',
  templateUrl: './edit-colors.component.html',
  styleUrls: ['./edit-colors.component.scss']
})
export class EditColorsComponent implements OnChanges {
  @Input() variable: Variable | undefined;
  list: string;

  constructor() {
    this.list = "";
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.list = "";
    if (this.variable && this.variable.colors)
      this.list = this.variable.colors.map(item => item.condition.operator + ":" + item.condition.value + ":" + item.color ).join("\n")
  }

  onListChange($event: string) {
    this.list = $event;
    if (this.variable) {
      const lines = $event.split("\n");
      this.variable.colors = lines.map(line => {
        if(line === "")
          return null;
        const pieces = line.split(":");
        if(pieces.length !== 3)
          return null;
        return {
          condition: {
            operator: pieces[0],
            value: +pieces[1]
          },
          color: pieces[2],

        } as VariableColor
      }).filter((item => item !== null)).map(item => item!)
    }
  }


}
