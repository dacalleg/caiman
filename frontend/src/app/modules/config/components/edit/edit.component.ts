import { Component, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbNav } from '@ng-bootstrap/ng-bootstrap';
import { BehaviorSubject, filter, map, switchMap, take, tap } from 'rxjs';
import { SeramiEntry, SeramiGroup, Variable } from 'src/app/classes/interfaces';
import { buildGroupTabs, renameGroup } from 'src/app/classes/serami-groups';
import { Utils } from 'src/app/classes/utils';
import { ApiService } from 'src/app/services/api.service';

interface CheckLog {
  variables: Variable[];
  type: string;
  message?: string;
}

@Component({
  selector: 'app-edit',
  templateUrl: './edit.component.html',
  styleUrls: ['./edit.component.scss']
})
export class EditComponent {



  @ViewChild("nav") nav: NgbNav | undefined;
  seramiEntry: SeramiEntry;
  currentGroup$: BehaviorSubject<string>;
  groupTabs: SeramiGroup[];
  variablesByGroup: Record<string, Variable[]> = {};
  logs: CheckLog[];
  search: string | undefined;
  expandedVariablePanelId: string | null = null;
  private readonly variablePanelKeys = new WeakMap<Variable, string>();
  private nextVariablePanelKey = 0;

  private static readonly SEARCH_TAB_ID = '__search__';
  private static readonly CHECK_TAB_ID = '__check__';

  constructor(private activatedRoute: ActivatedRoute, private Api: ApiService, private Router: Router) {
    this.logs = [];
    this.seramiEntry = { data: [], name: "" };
    this.groupTabs = [];
    this.currentGroup$ = new BehaviorSubject<string>("");

    this.activatedRoute.params.pipe(
      filter(params => params["key"] != null),
      map(params => params["key"]),
      switchMap(key => this.Api.getSerami(key)),
      tap(entry => {
        this.seramiEntry = entry;
        this.syncGroups();
        if (this.groupTabs.length > 0) {
          this.changeGroup(this.groupTabs[0].name);
        }
      }),
      take(1),
    ).subscribe();
  }

  syncGroups(): void {
    this.reorderGroupTabs();
    this.rebuildAllVariablesByGroup();
  }

  reorderGroupTabs(): void {
    this.seramiEntry.groups = buildGroupTabs(this.seramiEntry.data, this.seramiEntry.groups);
    this.groupTabs = [...this.seramiEntry.groups];
  }

  onGroupSortChange(group: SeramiGroup): void {
    const activeGroupName = group.name;
    const inputId = `groupsort-${group.name}`;
    this.reorderGroupTabs();
    this.nav?.select(activeGroupName);
    requestAnimationFrame(() => document.getElementById(inputId)?.focus());
  }

  trackGroupTab(_index: number, group: SeramiGroup): string {
    return group.name;
  }

  rebuildVariablesForGroup(groupName: string): void {
    this.variablesByGroup[groupName] = this.seramiEntry.data
      .filter(variable => variable.group === groupName)
      .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  }

  rebuildAllVariablesByGroup(): void {
    const groupNames = new Set([
      ...this.groupTabs.map(group => group.name),
      ...this.seramiEntry.data.map(variable => variable.group),
    ]);
    for (const groupName of groupNames) {
      this.rebuildVariablesForGroup(groupName);
    }
  }

  onGroupTabShown(group: SeramiGroup): void {
    this.changeGroup(group.name);
    this.rebuildVariablesForGroup(group.name);
  }

  changeGroup(group: string) {
    this.currentGroup$.next(group);
  }

  clearLog() {
    this.logs = [];
  }

  addLog(log: CheckLog) {
    this.logs.push(log);
  }

  beforeSave() {
    if (this.nav) {
      this.nav.select(EditComponent.CHECK_TAB_ID);
    }

    this.clearLog();
    this.checkDuplicates(this.seramiEntry.data);
    this.seramiEntry.data.forEach(variable => {
        this.check(variable);
        try {
          if (variable.min != null)
            this.checkFormula(variable, variable.min) ? null : this.addLog({ type: "Error in MIN", variables: [variable] });
        } catch {
          this.addLog({ type: "Error in MIN", variables: [variable] })
        }

        try {
          if (variable.max != null)
            this.checkFormula(variable, variable.max) ? null : this.addLog({ type: "Error in MAX", variables: [variable] });
        } catch {
          this.addLog({ type: "Error in MAX", variables: [variable] })
        }

        try {
          if (variable.min == null && variable.max == null)
            this.checkFormula(variable, 0);
        } catch {
          this.addLog({ type: "Error in Formula", variables: [variable] })
        }
      })
  }

  check(variable: Variable) {
    if (variable.readExp && Utils.hasLogicalAnd(variable.readExp))
      this.addLog({ type: "Warning in Formula", variables: [variable], message: "contains logical operation" })
  }

  checkFormula(variable: Variable, target: number) {
    let results;

    if(variable.readExp !== "" && variable.readExp !== "#")
    {
      if (variable.readonly) {
        results = Utils.convertValuesToRead([variable], [target])
        if (Number.isNaN(results[0])) {
          return false;
        }
        return true;
      } else {
        results = Utils.convertValuesToWrite([variable], [target], true)
        const a = results[0];
        if (Number.isNaN(a)) {
          return false;
        }
        results = Utils.convertValuesToRead([variable], [Math.round(a)])
        const b = results[0];
        if (Number.isNaN(b)) {
          return false;
        }
  
        if (target !== b)
          return false;
      }
    }

    return true;
  }



  save() {
    this.syncGroups();
    this.Api.updateSerami(this.seramiEntry).subscribe(() => {
      this.Router.navigate(["/config/list"]);
    });
  }

  updateHash(v: Variable) {
    v.hash = [v.memory == "eeprom" ? "E" : "R", "" + v.address, "" + v.mask].join("_")
  }

  moveToGroup(variable: Variable, group: string) {
    const previousGroup = variable.group;
    variable.group = group;
    this.rebuildVariablesForGroup(previousGroup);
    this.rebuildVariablesForGroup(group);
  }

  changeGroupName($event: Event, oldName: string) {
    const target = $event.target as HTMLInputElement;
    const newName = target.value;
    if (oldName !== newName) {
      this.seramiEntry.data.filter(i => i.group == oldName).forEach(i => i.group = newName);
      this.seramiEntry.groups = renameGroup(this.seramiEntry.groups ?? [], oldName, newName);
      this.variablesByGroup[newName] = this.variablesByGroup[oldName] ?? [];
      delete this.variablesByGroup[oldName];
      this.syncGroups();
    }
  }

  newGroup() {
    const name = 'New Group';
    const nextSort = Math.max(0, ...(this.seramiEntry.groups ?? []).map(group => group.sort ?? 0)) + 10;
    this.seramiEntry.groups = [...(this.seramiEntry.groups ?? []), { name, sort: nextSort }];
    this.syncGroups();
    this.variablesByGroup[name] = [];
  }

  deleteVariable(variable: Variable) {
    const group = variable.group;
    this.seramiEntry.data = this.seramiEntry.data.filter(item => item !== variable);
    this.rebuildVariablesForGroup(group);
  }

  duplicateVariable(variable: Variable) {
    const copy: Variable = structuredClone(variable);
    copy.name = `${variable.name} (copia)`;
    copy.varKey = undefined;

    const groupVariables = this.seramiEntry.data
      .filter(item => item.group === variable.group)
      .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
    const position = groupVariables.indexOf(variable);
    const nextVariable = position >= 0 ? groupVariables[position + 1] : undefined;
    copy.sort = nextVariable != null
      ? ((variable.sort ?? 0) + (nextVariable.sort ?? 0)) / 2
      : (variable.sort ?? 0) + 10;

    const index = this.seramiEntry.data.indexOf(variable);
    if (index === -1) {
      this.seramiEntry.data.push(copy);
    } else {
      this.seramiEntry.data.splice(index + 1, 0, copy);
    }

    this.expandedVariablePanelId = this.variablePanelId(copy);
    this.changeGroup(variable.group);
    this.nav?.select(variable.group);
    this.rebuildVariablesForGroup(variable.group);
  }

  variablePanelId(variable: Variable): string {
    let panelKey = this.variablePanelKeys.get(variable);
    if (!panelKey) {
      panelKey = `panel-${++this.nextVariablePanelKey}`;
      this.variablePanelKeys.set(variable, panelKey);
    }
    return panelKey;
  }

  trackVariable = (_index: number, variable: Variable): string => {
    return this.variablePanelId(variable);
  };

  checkDuplicates(variables: Variable[]) {
    variables.map(i => i.hash)
      .filter((item, index, arr) => arr.indexOf(item) !== index)
      .map(hash => {
        return variables.filter(v => v.hash === hash)
      }).forEach(group => {
        for (let i = 0; i < group.length; i++) {
          const compare = group[i];
          const others = group.filter((item, index) => index > i);
          others.forEach(item => {
            if (!item.readonly && !compare.readonly) {
              if (item.min !== compare.min)
                this.addLog({ variables: [compare, item], type: "Error in duplicates", message: "MIN is different" })
              if (item.max !== compare.max)
                this.addLog({ variables: [compare, item], type: "Error in duplicates", message: "MAX is different" })
            }
            if (item.readExp !== compare.readExp)
              this.addLog({ variables: [compare, item], type: "Error in duplicates", message: "Formula is different" })
          })
        }
      })
  }

  newVariable(group: string) {
    this.seramiEntry.data.push(
      {
        type: "RwmsParameterBase",
        description: "",
        varKey: undefined,
        group: group,
        name: "New Variable",
        hash: "R_0_255",
        sanitizedName: "new_variable",
        address: 0,
        min: 0,
        max: 1,
        readonly: false,
        memory: "ram",
        mask: 255,
        bit: 8,
        readExp: "#",
        writeExp: null,
        values: [],
        bits: null,
        pattern: "B",
        signed: false,
        formatstring: "{0}"
      })
    this.rebuildVariablesForGroup(group);
  }


  serachFor(variable: Variable) {
    this.search = variable.hash;
    this.nav?.select(EditComponent.SEARCH_TAB_ID);
  }

  clearColors(variable: Variable) {
    variable.buttonTextColor = undefined;
    variable.buttonBackgroundColor = undefined;
  }
}
