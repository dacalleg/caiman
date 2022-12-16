import {Injectable} from '@angular/core';
import {StoreService} from "./store.service";
import {Variable} from "../classes/interfaces";

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  constructor(private Store: StoreService) {
  }

  variableToModbusNavel(variables: Variable[], modbusEEpromOffset: number) {
    let names = [] as string[];
    let converted = variables.map(item => {
      if (names.includes(item.sanitizedName)) {
        let index = 1;
        let new_name = item.sanitizedName + "_" + index;
        while (names.includes(new_name)) {
          index++;
          new_name = item.sanitizedName + "_" + index;
        }
        item.sanitizedName = new_name;
      }
      names.push(item.sanitizedName);
      return item;
    });
    converted = converted.map(item => {
      if (item.memory !== "eeprom")
        return item;
      return {...item, address: (modbusEEpromOffset * 2) + item.address};
    });
    converted = converted.sort((a, b) => a.address - b.address)
    converted = this.uniq(converted, 'hash');
    return converted.reduce((acc, item) => {
      acc[item.sanitizedName] = {
        "a": item.address,
        "p": item.pattern,
        "b": item.bit / 8
      }
      if (item.type === "RwmsParameterBase")
        acc[item.sanitizedName]["t"] = 1;
      if (item.readExp !== null)
        acc[item.sanitizedName]["re"] = item.readExp;
      if (item.writeExp !== null)
        acc[item.sanitizedName]["we"] = item.writeExp;
      return acc;
    }, {} as any);
  }

  private uniq(a: any[], param: string) {
    return a.filter(function (item, pos, array) {
      return array.map(function (mapItem) {
        return mapItem[param];
      }).indexOf(item[param]) === pos;
    })
  }

  variableToNova(variables: Variable[]) {
    let names = [] as string[];
    let converted = variables.map(item => {
      if (names.includes(item.sanitizedName)) {
        let index = 1;
        let new_name = item.sanitizedName + "_" + index;
        while (names.includes(new_name)) {
          index++;
          new_name = item.sanitizedName + "_" + index;
        }
        item.sanitizedName = new_name;
      }
      names.push(item.sanitizedName);
      return item;
    });
    converted = converted.sort((a, b) => a.address - b.address)
    converted = this.uniq(converted, 'hash');

    let groups = converted.map(item => item.group).filter((value, index, self) => {
      return self.indexOf(value) === index;
    });
    const variableGroups = groups.map(group => {
      const variables = converted.filter(item => item.group === group).map(variable => {
        return {
          _id: this.makeid(16),
          key: variable.sanitizedName,
          description: [],
          name: [],
          formula: null,
          formulaInverse: null,
          min: variable.min,
          max: variable.max,
          step: 1,
          measurementUnit: null,
          typeOf: variable.type === "RwmsParameterBase" ? "numeric" : "string",
          format: "1.2-2",
          message: null,
          render: "textbox",
          save: false,
          readOnly: variable.readonly,
          options: variable.values?.map(item => item[0] + ":" + item[1]).join("\n"),
          writeOnly: false
        }
      })
      return {
        name: [{language: null, name: group}],
        variables: variables
      }
    });
    const novatype = {
      _id: this.makeid(16),
      events: [],
      board: "board_" + this.makeid(16),
      name: "import_" + this.makeid(16),
      variableGroups: variableGroups
    }
    return novatype;
  }

  private makeid(length: number) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }
}
