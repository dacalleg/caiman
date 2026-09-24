import { Variable } from './interfaces';
import { Utils } from './utils';

export type ParseVariableJsonError =
  | 'empty'
  | 'invalid_json'
  | 'array'
  | 'serami_entry'
  | 'not_object';

export type ParseVariableJsonResult =
  | { ok: true; variable: Variable }
  | { ok: false; error: ParseVariableJsonError };

export function buildVariableHash(memory: string, address: number, mask?: number): string {
  const prefix = memory === 'eeprom' ? 'E' : 'R';
  return `${prefix}_${address}_${mask ?? 255}`;
}

export function createVariableDefaults(group: string): Variable {
  const name = 'New Variable';
  return {
    type: 'RwmsParameterBase',
    description: '',
    varKey: undefined,
    group,
    name,
    hash: buildVariableHash('ram', 0, 255),
    sanitizedName: Utils.sanitizeString(name),
    address: 0,
    min: 0,
    max: 1,
    readonly: false,
    memory: 'ram',
    mask: 255,
    bit: 8,
    readExp: '#',
    writeExp: null,
    values: [],
    bits: null,
    pattern: 'B',
    signed: false,
    formatstring: '{0}',
    acl: [],
  };
}

export function nextVariableSort(groupVariables: Variable[]): number {
  if (groupVariables.length === 0) {
    return 10;
  }
  const maxSort = Math.max(...groupVariables.map(variable => variable.sort ?? 0));
  return maxSort + 10;
}

function isSeramiEntryShape(value: Record<string, unknown>): boolean {
  return typeof value['name'] === 'string' && Array.isArray(value['data']);
}

export function parseAndNormalizeVariableJson(
  raw: string,
  targetGroup: string,
  existingInGroup: Variable[]
): ParseVariableJsonResult {
  if (!raw.trim()) {
    return { ok: false, error: 'empty' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'invalid_json' };
  }

  if (parsed === null) {
    return { ok: false, error: 'not_object' };
  }

  if (Array.isArray(parsed)) {
    return { ok: false, error: 'array' };
  }

  if (typeof parsed !== 'object') {
    return { ok: false, error: 'not_object' };
  }

  const record = parsed as Record<string, unknown>;
  if (isSeramiEntryShape(record)) {
    return { ok: false, error: 'serami_entry' };
  }

  const defaults = createVariableDefaults(targetGroup);
  const partial = parsed as Partial<Variable>;
  const merged: Variable = {
    ...defaults,
    ...partial,
    group: targetGroup,
    varKey: undefined,
    values: partial.values ?? defaults.values,
    bits: partial.bits !== undefined ? partial.bits : defaults.bits,
    acl: partial.acl ?? defaults.acl,
  };

  if (partial.sanitizedName === undefined) {
    merged.sanitizedName = Utils.sanitizeString(merged.name ?? '');
  }

  merged.hash = buildVariableHash(
    merged.memory,
    merged.address,
    merged.mask ?? defaults.mask ?? 255
  );
  merged.sort = nextVariableSort(existingInGroup);

  const variable = structuredClone(merged);
  return { ok: true, variable };
}
