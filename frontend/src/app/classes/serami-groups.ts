import { SeramiGroup, Variable } from './interfaces';

export function uniqueGroupNames(variables: Variable[]): string[] {
  const groups = variables.map(item => item.group);
  return groups.filter((group, index, all) => all.indexOf(group) === index);
}

export function sortGroups(groups: SeramiGroup[]): SeramiGroup[] {
  return [...groups].sort((a, b) => {
    const sortDiff = (a.sort ?? 0) - (b.sort ?? 0);
    if (sortDiff !== 0) {
      return sortDiff;
    }
    return a.name.localeCompare(b.name);
  });
}

export function sortGroupNames(names: string[], metadata?: SeramiGroup[] | null): string[] {
  const sortByName = new Map((metadata ?? []).map(group => [group.name, group.sort ?? 0]));
  return [...names].sort((a, b) => {
    const sortDiff = (sortByName.get(a) ?? 0) - (sortByName.get(b) ?? 0);
    if (sortDiff !== 0) {
      return sortDiff;
    }
    return a.localeCompare(b);
  });
}

export function collectGroupNames(variables: Variable[], metadata?: SeramiGroup[] | null): string[] {
  const names = uniqueGroupNames(variables);
  for (const group of metadata ?? []) {
    if (!names.includes(group.name)) {
      names.push(group.name);
    }
  }
  return names;
}

export function syncGroupsMetadata(
  metadata: SeramiGroup[] | undefined,
  names: string[]
): SeramiGroup[] {
  const existing = new Map((metadata ?? []).map(group => [group.name, group]));
  let nextSort = Math.max(0, ...(metadata ?? []).map(group => group.sort ?? 0));
  const synced: SeramiGroup[] = [];

  for (const name of names) {
    const group = existing.get(name);
    if (group) {
      synced.push(group);
      continue;
    }
    nextSort += 10;
    synced.push({ name, sort: nextSort });
  }
  return synced;
}

export function renameGroup(metadata: SeramiGroup[], oldName: string, newName: string): SeramiGroup[] {
  return metadata.map(group => group.name === oldName ? { ...group, name: newName } : group);
}

export function buildGroupTabs(variables: Variable[], metadata?: SeramiGroup[] | null): SeramiGroup[] {
  const names = collectGroupNames(variables, metadata);
  const synced = syncGroupsMetadata(metadata ?? undefined, names);
  return sortGroups(synced);
}
