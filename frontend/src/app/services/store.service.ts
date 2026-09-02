import { Injectable } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
import { DeviceProduct, Project, Variable, ViewOption } from '../classes/interfaces';
import { sortGroupNames, uniqueGroupNames } from '../classes/serami-groups';
import { SeramiParserService } from './serami-parser.service';
import { combineLatest, first, map, take } from 'rxjs';

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
    const isAdmin = roles.includes('administrator');

    return this.componentStore.state$.pipe(
      map(state => {
        if (!state.device?.info)
          return [];

        return state.variables.filter(variable => {
          if (isAdmin)
            return true;

          if (!variable.acl || variable.acl.length === 0)
            return true;

          return variable.acl.some(aclRole => roles.includes(aclRole));
        });
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
      variables,
      view: DEFAULT_VIEW,
    } as Project;
  }

  private getEmptyProject(): Project {
    return { variables: [], view: DEFAULT_VIEW } as Project;
  }

}
