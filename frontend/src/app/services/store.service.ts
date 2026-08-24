import { Injectable } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
import { DeviceProduct, Project, Variable, VariableInfoOverride, ViewOption } from '../classes/interfaces';
import { sortGroupNames, uniqueGroupNames } from '../classes/serami-groups';
import { SeramiParserService } from './serami-parser.service';
import { combineLatest, first, map, take } from 'rxjs';
import { Utils } from '../classes/utils';

const DEFAULT_VIEW: ViewOption = {
  addressFormat: 16,
  modbus: false,
  modbusEEpromOffset: 4096,
  extendedView: false,
};

@Injectable({
  providedIn: 'root'
})
export class StoreService {

  constructor(
    private readonly componentStore: ComponentStore<Project>,
    private readonly seramiParser: SeramiParserService
  ) {
    this.componentStore.setState(this.getEmptyProject());
    this.componentStore.state$.subscribe(project => {
      if (project.variables.length > 0)
        localStorage.setItem('serami_current_project', JSON.stringify(project));
      else
        localStorage.removeItem('serami_current_project');
    });
  }

  getProject() {
    return this.componentStore.state$;
  }

  setDevice(device: DeviceProduct) {
    this.componentStore.setState(project => ({ ...project, device } as Project));
  }

  setAddressFormat(format: number) {
    this.componentStore.setState(project => ({
      ...project,
      view: { ...project.view, addressFormat: format },
    }));
  }

  setExtendedView(enable: boolean) {
    this.componentStore.setState(project => ({
      ...project,
      view: { ...project.view, extendedView: enable },
    }));
  }

  setAddressModbus(modbus: boolean) {
    this.componentStore.setState(project => ({
      ...project,
      view: { ...project.view, modbus },
    }));
  }

  setViewOptions(view: ViewOption) {
    this.componentStore.setState(project => ({ ...project, view: { ...view } }));
  }

  getVariables() {
    return this.componentStore.state$.pipe(map(project => project.variables));
  }

  getVariablesWithVariableKey() {
    return this.componentStore.state$.pipe(
      map(project => project.variables.filter(v => v.varKey !== undefined))
    );
  }

  getVariableByHash(hash: string) {
    return this.getVariables().pipe(
      map(variables => variables.find(v => v.hash === hash)),
      take(1)
    );
  }

  getVariablesByRoles(roles: string[]) {
    const expandedRoles = roles.concat('all');
    return this.componentStore.state$.pipe(
      map(state => {
        if (!state.device?.info)
          return [];
        const acl = state.device.info.serami_acl.find(entry => expandedRoles.includes(entry.role));
        const hiddenGroups = acl?.hidden_groups ?? [];
        const hiddenVariables = acl?.hidden_variables ?? [];
        return state.variables.filter(
          variable => !hiddenGroups.includes(variable.group) && !hiddenVariables.includes(variable.hash)
        );
      })
    );
  }

  getGroups() {
    return this.componentStore.state$.pipe(
      map(project => sortGroupNames(uniqueGroupNames(project.variables), project.groups))
    );
  }

  getGroupsByRole(roles: string[]) {
    return combineLatest([
      this.getVariablesByRoles(roles),
      this.componentStore.state$.pipe(map(project => project.groups)),
    ]).pipe(
      map(([variables, groups]) => sortGroupNames(uniqueGroupNames(variables), groups))
    );
  }

  loadFromJson(data: Variable[], groups?: Project['groups']) {
    this.componentStore.setState(project => ({
      ...this.buildProjectWithVariables(project, data),
      groups: groups ?? undefined,
    }));
  }

  loadFromSnet(xml: string) {
    this.seramiParser.parse(xml).pipe(first()).subscribe(data => {
      this.componentStore.setState(project => this.buildProjectWithVariables(project, data));
    });
  }

  closeProject() {
    this.componentStore.setState(this.getEmptyProject());
  }

  private buildProjectWithVariables(project: Project, variables: Variable[]): Project {
    return {
      ...project,
      variables: this.applySeramiVarOverrides(variables, project.device?.info.serami_var_override),
      view: DEFAULT_VIEW,
    } as Project;
  }

  private applySeramiVarOverrides(variables: Variable[], overrides?: VariableInfoOverride[]): Variable[] {
    if (!overrides)
      return variables;

    return variables.map(variable => {
      const override = overrides.find(entry => entry.id === variable.hash);
      if (!override)
        return variable;

      if (override.title)
        variable.name = override.title;
      if (override.description)
        variable.description = override.description;
      if (override.read_exp)
        Utils.applyReadExpOverride(variable, override.read_exp);
      if (override.writable !== undefined)
        variable.readonly = !override.writable;
      if (override.options)
        variable.values = Object.keys(override.options).map(key => [override.options![key], key]);

      return variable;
    });
  }

  private getEmptyProject(): Project {
    return { variables: [], view: DEFAULT_VIEW } as Project;
  }

}
