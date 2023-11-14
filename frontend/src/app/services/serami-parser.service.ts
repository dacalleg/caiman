import { Injectable } from '@angular/core';
import * as xpath from "xpath";
import { DOMParser } from "@xmldom/xmldom"
import { Page, Variable } from "../classes/interfaces";
import { from, Observable } from "rxjs";
import { Utils } from '../classes/utils';

@Injectable({
  providedIn: 'root'
})
export class SeramiParserService {

  constructor() {
  }

  parse(xml: string): Observable<Variable[]> {
    const document = new DOMParser().parseFromString(xml, 'text/xml');
    let nodes = xpath.select("//parameter", document);
    return from(Promise.all(nodes.map(async node => {
      const type = this.nodeChildValue("type", node);
      if (type === "RwmsParameterBase")
        return this.buildRwmsParameterBase(node)
      /*if (type === "AlphanumericParameterBase")
        return this.buildAlphanumericParameterBase(node)*/
      return null;
    })).then(items => items.filter(item => item !== null) as Variable[]).then(items => {
      let ret = [] as Variable[];
      items.forEach(variable => {
        if (variable.type === "RwmsParameterBase" && variable.bits != null) {
          let index = 0;
          if (variable.varKey)
            ret.push(variable)
          ret = ret.concat(...variable.bits.map(bit => {

            if (bit === null) {
              index++
              return null;
            }
            const mask = Math.pow(2, index)
            const sanitizedName = variable.sanitizedName + "_" + bit
            const value = {
              ...variable,
              varKey: undefined,
              type: "RwmsParameterBaseBit",
              name: variable.name + "_" + bit,
              mask: mask,
              hash: [(variable.memory === "eeprom" ? "E" : "R"), "" + variable.address, "" + mask].join("_"),
              sanitizedName: sanitizedName,
              min: 0,
              max: 1,
              bits: null,
              readExp: null,
              writeExp: null,
            } as Variable;

            index++;

            return value
          }).filter(item => item !== null) as Variable[]);
        } else {
          ret.push(variable);
        }
      });
      return ret;
    }));
  }

  private nodeChildValue(nodeName: string, node: any) {
    const ret = xpath.select1("./" + nodeName + "/text()", node) as any;
    if (ret != null)
      return ret.nodeValue;
    return null;
  }

  private hasFakeMask(formula: string)
  {
    const regex = /\(\s*#\s*AND\s*(\d+)\)/gm;
    const str = formula.toUpperCase();
    let m;

    while ((m = regex.exec(str)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === regex.lastIndex) {
            regex.lastIndex++;
        }

        return parseInt(m[1]);
    }
    return null;
  }

  buildRwmsParameterBase(node: any): Variable {
    var re = new RegExp('#', 'g');
    const bit = Math.pow(2, (parseInt(this.nodeChildValue("datatype", node)) + 3));
    const memory = this.toBoolean(this.nodeChildValue("memory", node));
    const sanitizedName = this.sanitizeString(this.nodeChildValue("label", node)) as string;
    const description = this.nodeChildValue("description", node) as string;
    let address = parseInt(this.nodeChildValue("startaddress", node), 16) as number;
    let mask = parseInt(this.nodeChildValue("mask", node), 16);
    const varName = this.nodeChildValue("var_name", node) as string;
    let expval = this.nodeChildValue("expreval", node)
    let signed = false;
    if (expval && typeof expval === "string") {
      expval = Utils.sanitizeExp(expval);
      if (expval.includes("IIF")) {
        expval = expval.substring(4, expval.length - 1);
        const pieces = expval.split(",")
        if (pieces[0].includes("65535/2") || pieces[0].includes("255/2")) {
          expval = pieces[1];
          signed = true;
        }
        else {
          expval = pieces[1] + " if " + pieces[0] + " else " + pieces[2];
        }
      }
    }
    const type = this.nodeChildValue("type", node) as string;
    const reverse = this.toBoolean(this.nodeChildValue("reversebytes", node));
    const realmin = parseInt(this.nodeChildValue("set_min", node));
    const realmax = parseInt(this.nodeChildValue("set_max", node));

    let min = realmin;
    let max = realmax;
    
    if (expval && expval !== "#") {
      try {
        min = eval(Utils.sanitizeExp(expval).replace(re, "" + realmin))
      }
      catch (ex) {
      }
      try {
        max =  eval(Utils.sanitizeExp(expval).replace(re, "" + realmax))
      }
      catch (ex) {
      }
    }

    const fakeMask = this.hasFakeMask(this.nodeChildValue("expreval", node));
    if(fakeMask)
    {
      const regex = /\(\s*#\s*AND\s*(\d+)\)/gm;
      mask = fakeMask;
      expval = expval.replace(regex, "#");
      min = 0;
      max = 1;
    }

    return {
      type: type,
      description: description,
      varKey: varName.trim() !== "" ? varName.trim() : undefined,
      group: this.nodeChildValue("parent", node) as string,
      name: this.nodeChildValue("label", node) as string,
      hash: [(memory ? "E" : "R"), "" + address, "" + mask].join("_"),
      sanitizedName: sanitizedName,
      address: address,
      min: min,
      max: max,
      readonly: this.toBoolean(this.nodeChildValue("readonly", node)),
      memory: memory ? "eeprom" : "ram",
      mask: mask,
      bit: bit,
      readExp: expval,
      writeExp: null,
      values: this.values(this.nodeChildValue("customvaluemsg", node)),
      bits: this.getChildrens("bitsdescrption", node),
      pattern: this.getPattern(type, bit, reverse, signed),
      signed: signed,
      formatstring: this.nodeChildValue("formatstring", node)
    };
  }

  buildAlphanumericParameterBase(node: any): Variable {
    const description = this.nodeChildValue("description", node) as string;
    const bit = parseInt(this.nodeChildValue("text_value_length", node)) * 8 as number;
    const memory = this.toBoolean(this.nodeChildValue("memory", node));
    const sanitizedName = this.sanitizeString(this.nodeChildValue("label", node)) as string;
    const address = parseInt(this.nodeChildValue("startaddress", node), 16) as number;
    const type = this.nodeChildValue("type", node) as string;
    return {
      description: description,
      group: this.nodeChildValue("parent", node) as string,
      type: this.nodeChildValue("type", node) as string,
      name: this.nodeChildValue("label", node) as string,
      hash: [(memory ? "E" : "R"), "" + address, "" + bit].join("_"),
      sanitizedName: sanitizedName,
      address: address,
      readonly: true,
      memory: memory ? "eeprom" : "ram",
      bit: bit,
      pattern: this.getPattern(type, bit, false),
      signed: false,
      formatstring: this.nodeChildValue("formatstring", node)
    };
  }

  getPattern(type: string, bit: number, reverse: boolean, signed: boolean = false): string {
    let byte = bit / 8;
    if (type === "RwmsParameterBase") {
      if (byte === 1)
        return (!signed ? 'B' : 'b')
      if (byte === 2)
        return (reverse ? '<' : '>') + (!signed ? 'H' : 'h')
      if (byte === 4)
        return (reverse ? '<' : '>') + (!signed ? 'I' : 'i')
      if (byte === 8)
        return (reverse ? '<' : '>') + (!signed ? 'Q' : 'q')
    }
    if (type === "AlphanumericParameterBase") {
      return byte + "s";
    }
    return "ERROR";
  }

  getPages(variables: Variable[], maxLength: number = Number.MAX_VALUE) {
    let eepromPages = this.pages(variables.filter(item => item.memory === "eeprom"), maxLength).map(item => {
      return { start: item[0], end: item[1], eeprom: true } as Page;
    });
    let ramPages = this.pages(variables.filter(item => item.memory === "ram"), maxLength).map(item => {
      return { start: item[0], end: item[1], eeprom: false } as Page;
    });
    return eepromPages.concat(ramPages);
  }

  private pages(variables: Variable[], maxLength: number = Number.MAX_VALUE): number[][] {
    if (variables.length === 0)
      return [];
    let ret = [] as number[][];
    let start = null as number | null;
    let last = null as number | null;
    variables.sort((a, b) => {
      return a.address - b.address;
    }).forEach(item => {
      if (start === null)
        start = item.address - (item.address % 2);
      if ((item.address + (item.bit / 8) - start) > (maxLength)) {
        ret.push([start as number, last as number]);
        start = item.address - (item.address % 2);
      }
      last = item.address + (item.bit / 8);
      last = (last as number + (last as number % 2)) as number
    });
    last = (last as number + (last as number % 2)) as number
    ret.push([start as number, last as number]);
    return ret;
  }

  sanitizeString(str: string): string {
    return str.trim().toLowerCase()
      .normalize('NFD').replace(/([\u0300-\u036f]|[^0-9a-zA-Z])/g, ' ')
      .replace(/ /g, "_")
      .replace(/\//g, "_")
      .replace(/-/g, "_")
      .replace(/\./g, "_")
      .replace(/\(/g, "")
      .replace(/\)/g, "")
      .replace(/(_)\1+/g, '$1')
      .replace(/(\w+)_$/gm, '$1');
  }

  getChildrens(nodeName: string, node: any): (string | null)[] | null {
    const visualmode = parseInt(this.nodeChildValue("visualmode", node));
    if (visualmode !== 8)
      return null;
    let ret = [];
    const mask = Utils.hex2bin(this.nodeChildValue("mask", node)).split("").reverse();
    for (let i of [...Array(32).keys()]) {
      const val = xpath.select1("./" + nodeName + "/" + "bit" + i + "descr" + "/text()", node) as any;
      if (val != null) {
        if (mask[i] === "1")
          ret[i] = val.nodeValue === ("Bit " + i) ? null : this.sanitizeString(val.nodeValue);
        else
          ret[i] = null;
      }
    }
    const allNull = ret.reduce((acc, item) => acc && item === null, true)
    return allNull ? null : ret;
  }

  values(str: string): string[][] {
    if (str) {
      const tmp = str.trim();
      if (tmp === "")
        return [];
      return tmp.split("\t").map(item => item.split(";"));
    }
    return [];
  }

  toBoolean(str: string): boolean {
    if (str)
      return str === "1" || str.toLowerCase() === "true";
    return false;
  }

}
