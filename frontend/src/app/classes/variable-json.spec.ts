import { Variable } from './interfaces';
import { Utils } from './utils';
import {
  buildVariableHash,
  createVariableDefaults,
  nextVariableSort,
  parseAndNormalizeVariableJson,
} from './variable-json';

describe('buildVariableHash', () => {
  it('builds R_0_255 for ram memory at address 0 with mask 255', () => {
    expect(buildVariableHash('ram', 0, 255)).toBe('R_0_255');
  });

  it('builds E_12_1 for eeprom memory at address 12 with mask 1', () => {
    expect(buildVariableHash('eeprom', 12, 1)).toBe('E_12_1');
  });

  it('uses R prefix when memory is not eeprom', () => {
    expect(buildVariableHash('ram', 5, 10)).toBe('R_5_10');
    expect(buildVariableHash('unknown', 5, 10)).toBe('R_5_10');
  });
});

describe('createVariableDefaults', () => {
  it('returns the same defaults as newVariable for the given group', () => {
    const variable = createVariableDefaults('G');

    expect(variable.group).toBe('G');
    expect(variable.varKey).toBeUndefined();
    expect(variable.hash).toBe('R_0_255');
    expect(variable.name).toBe('New Variable');
    expect(variable.sanitizedName).toBe(Utils.sanitizeString('New Variable'));
    expect(variable.type).toBe('RwmsParameterBase');
    expect(variable.description).toBe('');
    expect(variable.address).toBe(0);
    expect(variable.min).toBe(0);
    expect(variable.max).toBe(1);
    expect(variable.readonly).toBe(false);
    expect(variable.memory).toBe('ram');
    expect(variable.mask).toBe(255);
    expect(variable.bit).toBe(8);
    expect(variable.readExp).toBe('#');
    expect(variable.writeExp).toBe(null);
    expect(variable.values).toEqual([]);
    expect(variable.bits).toBe(null);
    expect(variable.pattern).toBe('B');
    expect(variable.signed).toBe(false);
    expect(variable.formatstring).toBe('{0}');
    expect(variable.acl).toEqual([]);
  });
});

describe('nextVariableSort', () => {
  it('returns 10 for an empty group', () => {
    expect(nextVariableSort([])).toBe(10);
  });

  it('returns max sort plus 10 for variables with explicit sort values', () => {
    const groupVariables: Variable[] = [
      { sort: 5 } as Variable,
      { sort: 20 } as Variable,
    ];

    expect(nextVariableSort(groupVariables)).toBe(30);
  });

  it('treats missing sort as zero when computing the next value', () => {
    expect(nextVariableSort([{} as Variable])).toBe(10);
  });
});

describe('parseAndNormalizeVariableJson', () => {
  const targetGroup = 'TargetGroup';

  it('normalizes a complete pasted variable onto the target group', () => {
    const source: Variable = {
      type: 'RwmsParameterBase',
      description: 'desc',
      varKey: 'source_key',
      group: 'OtherGroup',
      name: 'Temperature',
      hash: 'STALE_HASH',
      sanitizedName: 'temperature',
      address: 42,
      min: 0,
      max: 100,
      readonly: true,
      memory: 'eeprom',
      mask: 65535,
      bit: 16,
      readExp: 'x*2',
      writeExp: null,
      values: [['0', 'off']],
      bits: null,
      pattern: 'W',
      signed: true,
      formatstring: '{0} C',
      acl: ['admin'],
      sort: 999,
      colors: [{ condition: { operator: 'eq', value: 0 }, color: '#fff' }],
      translatedName: { en: 'Temp' },
    };

    const existingInGroup: Variable[] = [{ sort: 0 } as Variable, { sort: 30 } as Variable];
    const result = parseAndNormalizeVariableJson(
      JSON.stringify(source),
      targetGroup,
      existingInGroup
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const variable = result.variable;
    expect(variable.group).toBe(targetGroup);
    expect(variable.varKey).toBeUndefined();
    expect(variable.address).toBe(42);
    expect(variable.mask).toBe(65535);
    expect(variable.memory).toBe('eeprom');
    expect(variable.hash).toBe('E_42_65535');
    expect(variable.sort).toBe(40);
    expect(variable.name).toBe('Temperature');
    expect(variable.colors).toEqual(source.colors);
    expect(variable.acl).toEqual(['admin']);
    expect(variable.translatedName).toEqual({ en: 'Temp' });
    expect(variable).not.toBe(source);
  });

  it('merges partial JSON with createVariableDefaults for missing fields', () => {
    const result = parseAndNormalizeVariableJson(
      JSON.stringify({ name: 'X', address: 7 }),
      targetGroup,
      []
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.variable.name).toBe('X');
    expect(result.variable.sanitizedName).toBe(Utils.sanitizeString('X'));
    expect(result.variable.address).toBe(7);
    expect(result.variable.mask).toBe(255);
    expect(result.variable.memory).toBe('ram');
    expect(result.variable.type).toBe('RwmsParameterBase');
    expect(result.variable.readExp).toBe('#');
  });

  it('recalculates hash from memory, address, and mask after merge', () => {
    const result = parseAndNormalizeVariableJson(
      JSON.stringify({
        memory: 'eeprom',
        address: 3,
        mask: 15,
        hash: 'wrong',
      }),
      targetGroup,
      []
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.variable.hash).toBe('E_3_15');
  });

  it('returns empty when raw text is blank or whitespace only', () => {
    expect(parseAndNormalizeVariableJson('', targetGroup, [])).toEqual({
      ok: false,
      error: 'empty',
    });
    expect(parseAndNormalizeVariableJson('   \n\t', targetGroup, [])).toEqual({
      ok: false,
      error: 'empty',
    });
  });

  it('returns invalid_json when JSON.parse fails', () => {
    expect(parseAndNormalizeVariableJson('{', targetGroup, [])).toEqual({
      ok: false,
      error: 'invalid_json',
    });
  });

  it('returns array when parsed JSON is an array', () => {
    expect(parseAndNormalizeVariableJson('[{"name":"x"}]', targetGroup, [])).toEqual({
      ok: false,
      error: 'array',
    });
  });

  it('returns serami_entry when parsed JSON looks like a SeramiEntry', () => {
    expect(
      parseAndNormalizeVariableJson(JSON.stringify({ name: 'C', data: [] }), targetGroup, [])
    ).toEqual({
      ok: false,
      error: 'serami_entry',
    });
  });

  it('returns not_object when parsed JSON is null', () => {
    expect(parseAndNormalizeVariableJson('null', targetGroup, [])).toEqual({
      ok: false,
      error: 'not_object',
    });
  });

  it('accepts an empty object as a new variable with defaults in the target group', () => {
    const result = parseAndNormalizeVariableJson('{}', targetGroup, [{ sort: 5 } as Variable]);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const defaults = createVariableDefaults(targetGroup);
    expect(result.variable.group).toBe(targetGroup);
    expect(result.variable.name).toBe(defaults.name);
    expect(result.variable.varKey).toBeUndefined();
    expect(result.variable.sort).toBe(15);
    expect(result.variable.hash).toBe(buildVariableHash(defaults.memory, defaults.address, defaults.mask));
  });
});
