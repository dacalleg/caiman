import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'operationOption'
})
export class OperationOptionPipe implements PipeTransform {

  transform(value: string): string {
    switch (value) {
      case "":
        return "not_selected"
      case "NC":
        return "not_verifiable";
      case "N":
        return "no";
      case "Y":
        return "yes";
      case "CNF":
        return "conforming";
      case "NCNF":
        return "not_conforming";
      case "W":
        return "under_warranty";
      case "NW":
        return "out_warranty";
      case "I":
        return "technical_assistance";
      case "F":
        return "first_ignition";
      default:
        return "Error"
    }
  }

}
