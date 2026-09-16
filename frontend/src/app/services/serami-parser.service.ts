import { Injectable } from '@angular/core';
import * as xpath from 'xpath';
import { DOMParser } from '@xmldom/xmldom';
import { Page, Variable } from '../classes/interfaces';
import { from, Observable } from 'rxjs';
import { Utils } from '../classes/utils';

@Injectable({
  providedIn: 'root'
})
export class SeramiParserService {

  parse(xml: string): Observable<Variable[]> {
    const document = new DOMParser().parseFromString(xml, 'text/xml');
    const nodes = xpath.select('//parameter', document);
    return from(
      Promise.all(nodes.map(node => this.parseParameterNode(node as any)))
        .then(items => items.filter((item): item is Variable => item !== null))
        .then(items => this.sortAndIndexVariables(this.expandBitVariables(items)))
    );
  }

  getPages(variables: Variable[], maxLength: number = Number.MAX_VALUE): Page[] {
    const eepromPages = this.buildPages(variables.filter(item => item.memory === 'eeprom'), maxLength, true);
    const ramPages = this.buildPages(variables.filter(item => item.memory === 'ram'), maxLength, false);
    return eepromPages.concat(ramPages);
  }

  sanitizeString(str: string): string {
    return Utils.sanitizeString(str);
  }

  getPattern(type: string, bit: number, reverse: boolean, signed: boolean = false): string {
    const byte = bit / 8;
    if (type === 'RwmsParameterBase') {
      if (byte === 1)
        return signed ? 'b' : 'B';
      if (byte === 2)
        return (reverse ? '<' : '>') + (signed ? 'h' : 'H');
      if (byte === 4)
        return (reverse ? '<' : '>') + (signed ? 'i' : 'I');
      if (byte === 8)
        return (reverse ? '<' : '>') + (signed ? 'q' : 'Q');
    }
    if (type === 'AlphanumericParameterBase')
      return byte + 's';
    return 'ERROR';
  }

  private parseParameterNode(node: any): Variable | null {
    const type = this.nodeChildValue('type', node);
    if (type === 'RwmsParameterBase')
      return this.buildRwmsParameterBase(node);
    return null;
  }

  private expandBitVariables(variables: Variable[]): Variable[] {
    const expanded: Variable[] = [];
    variables.forEach(variable => {
      if (variable.type !== 'RwmsParameterBase' || variable.bits == null) {
        expanded.push(variable);
        return;
      }

      if (variable.varKey)
        expanded.push(variable);

      let bitIndex = 0;
      for (const bit of variable.bits) {
        if (bit === null) {
          bitIndex++;
          continue;
        }
        expanded.push(this.buildBitVariable(variable, bit, bitIndex));
        bitIndex++;
      }
    });
    return expanded;
  }

  private buildBitVariable(parent: Variable, bit: string, bitIndex: number): Variable {
    const mask = Math.pow(2, bitIndex);
    const sanitizedName = parent.sanitizedName + '_' + bit;

    return {
      ...parent,
      varKey: undefined,
      type: 'RwmsParameterBaseBit',
      name: parent.name + '_' + bit,
      mask,
      hash: [(parent.memory === 'eeprom' ? 'E' : 'R'), String(parent.address), String(mask)].join('_'),
      sanitizedName,
      min: 0,
      max: 1,
      bits: null,
      readExp: null,
      writeExp: null,
    } as Variable;
  }

  private sortAndIndexVariables(variables: Variable[]): Variable[] {
    return variables
      .sort((a, b) => (a.name + a.description).localeCompare(b.name + b.description))
      .map((item, index) => {
        item.sort = index * 10;
        return item;
      });
  }

  buildRwmsParameterBase(node: any): Variable {
    const bit = Math.pow(2, parseInt(this.nodeChildValue('datatype', node) ?? '') + 3);
    const memory = this.toBoolean(this.nodeChildValue('memory', node));
    const sanitizedName = this.sanitizeString(this.nodeChildValue('label', node) ?? '') as string;
    const description = this.nodeChildValue('description', node) as string;
    const address = parseInt(this.nodeChildValue('startaddress', node) ?? '', 16) as number;
    let mask = parseInt(this.nodeChildValue('mask', node) ?? '', 16);
    const varName = this.nodeChildValue('var_name', node) as string;
    const rawExpreval = this.nodeChildValue('expreval', node);
    const realmin = parseInt(this.nodeChildValue('set_min', node) ?? '');
    const realmax = parseInt(this.nodeChildValue('set_max', node) ?? '');
    const type = this.nodeChildValue('type', node) as string;
    const reverse = this.toBoolean(this.nodeChildValue('reversebytes', node));
    const signed = this.detectSignedFormula(rawExpreval);
    const readExpConfig = Utils.resolveReadExpForBuild(rawExpreval, realmin, realmax, mask);

    const variable = {
      type,
      description,
      varKey: varName.trim() !== '' ? varName.trim() : undefined,
      group: this.nodeChildValue('parent', node) as string,
      name: this.nodeChildValue('label', node) as string,
      hash: [(memory ? 'E' : 'R'), String(address), String(readExpConfig.mask)].join('_'),
      sanitizedName,
      address,
      min: readExpConfig.min,
      max: readExpConfig.max,
      readonly: this.toBoolean(this.nodeChildValue('readonly', node)),
      memory: memory ? 'eeprom' : 'ram',
      mask: readExpConfig.mask,
      bit,
      readExp: readExpConfig.readExp,
      writeExp: null,
      values: this.values(this.nodeChildValue('customvaluemsg', node)),
      bits: this.getBitDescriptions(node),
      pattern: this.getPattern(type, bit, reverse, signed),
      signed,
      formatstring: this.nodeChildValue('formatstring', node),
      step: readExpConfig.step,
    } as Variable;

    Utils.applyStringValueOptionsIfNeeded(variable);
    return variable;
  }

  private detectSignedFormula(rawExpreval: string | null): boolean {
    if (!rawExpreval || typeof rawExpreval !== 'string')
      return false;
    const upper = rawExpreval.toUpperCase();
    return upper.includes('IIF') && (upper.includes('65535/2') || upper.includes('255/2'));
  }

  private buildPages(variables: Variable[], maxLength: number, eeprom: boolean): Page[] {
    return this.pages(variables, maxLength).map(item => ({
      start: item[0],
      end: item[1],
      eeprom,
    } as Page));
  }

  private pages(variables: Variable[], maxLength: number = Number.MAX_VALUE): number[][] {
    if (variables.length === 0)
      return [];

    const ranges: number[][] = [];
    const sorted = [...variables].sort((a, b) => a.address - b.address);
    let start = sorted[0].address - (sorted[0].address % 2);
    let last = start;

    sorted.forEach(item => {
      if (item.address + (item.bit / 8) - start > maxLength) {
        ranges.push([start, this.alignPageEnd(last)]);
        start = item.address - (item.address % 2);
      }
      last = item.address + (item.bit / 8);
    });

    ranges.push([start, this.alignPageEnd(last)]);
    return ranges;
  }

  private alignPageEnd(address: number): number {
    return address + (address % 2);
  }

  private nodeChildValue(nodeName: string, node: any): string | null {
    const ret = xpath.select1('./' + nodeName + '/text()', node) as any;
    if (ret != null)
      return ret.nodeValue;
    return null;
  }

  private getBitDescriptions(node: any): (string | null)[] | null {
    const visualmode = parseInt(this.nodeChildValue('visualmode', node) ?? '');
    if (visualmode !== 8)
      return null;

    const descriptions: (string | null)[] = [];
    const mask = Utils.hex2bin(this.nodeChildValue('mask', node) ?? '').split('').reverse();
    for (const i of [...Array(32).keys()]) {
      const val = xpath.select1('./bitsdescrption/' + 'bit' + i + 'descr' + '/text()', node) as any;
      if (val == null)
        continue;
      if (mask[i] === '1')
        descriptions[i] = val.nodeValue === ('Bit ' + i) ? null : this.sanitizeString(val.nodeValue);
      else
        descriptions[i] = null;
    }

    const allNull = descriptions.reduce((acc, item) => acc && item === null, true);
    return allNull ? null : descriptions;
  }

  private values(str: string | null): string[][] {
    if (!str)
      return [];
    const trimmed = str.trim();
    if (trimmed === '')
      return [];
    return trimmed.split('\t').map(item => item.split(';'));
  }

  private toBoolean(str: string | null): boolean {
    if (!str)
      return false;
    return str === '1' || str.toLowerCase() === 'true';
  }

}
