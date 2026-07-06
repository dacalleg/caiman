import { Injectable } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
import { first, map, take } from 'rxjs';
import { DeviceProduct, Project, Variable, ViewOption } from '../classes/interfaces';
import { SeramiParserService } from './serami-parser.service';

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

  getVariablesByRoles(_roles: string[]) {
    return this.getVariables();
  }

  getGroups() {
    return this.componentStore.state$.pipe(
      map(project => {
        const groups = project.variables.map(item => item.group);
        return groups.filter((group, index, all) => all.indexOf(group) === index);
      })
    );
  }

  getGroupsByRole(roles: string[]) {
    return this.getVariablesByRoles(roles).pipe(
      map(variables => {
        const groups = variables.map(item => item.group);
        return groups.filter((group, index, all) => all.indexOf(group) === index);
      })
    );
  }

  loadFromJson(data: Variable[]) {
    this.componentStore.setState(project => this.buildProjectWithVariables(project, data));
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
