import { Injectable } from '@angular/core';
import { ComponentStore } from "@ngrx/component-store";
import { DeviceProduct, Project, Variable, ViewOption } from "../classes/interfaces";
import { SeramiParserService } from "./serami-parser.service";
import { first, from, map, switchMap, take } from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class StoreService {

  constructor(
    private readonly componentStore: ComponentStore<Project>,
    private seramiParser: SeramiParserService
  ) {
    /*const lastproject = localStorage.getItem("serami_current_project");
    if (lastproject)
      this.componentStore.setState(JSON.parse(lastproject) as Project);
    else*/
    this.componentStore.setState(this.getEmptyProject());
    this.componentStore.state$.subscribe(project => {
      if (project.variables.length > 0)
        localStorage.setItem("serami_current_project", JSON.stringify(project));
      else
        localStorage.removeItem("serami_current_project");
    })
  }

  getProject() {
    return this.componentStore.state$;
  }

  setDevice(device: DeviceProduct) {
    this.componentStore.setState((project) => {
      return { ...project, device: device } as Project;
    });
  }

  setAddressFormat(format: number) {
    this.componentStore.setState((project) => {
      return { ...project, view: { ...project.view, addressFormat: format } }
    });
  }

  setExtendedView(enable: boolean) {
    this.componentStore.setState((project) => {
      return { ...project, view: { ...project.view, extendedView: enable } }
    });
  }

  setAddressModbus(modbus: boolean) {
    this.componentStore.setState((project) => {
      return { ...project, view: { ...project.view, modbus: modbus } }
    });
  }

  setViewOptions(view: ViewOption) {
    this.componentStore.setState((project) => {
      return { ...project, view: { ...view } }
    });
  }

  getVariables() {
    return this.componentStore.state$.pipe(
      map(item => item.variables)
    );
  }

  getVariableByHash(hash: string) {
    return this.getVariables().pipe(
      map(item => item.find(v => v.hash === hash)),
      take(1)
    );
  }

  getVariablesByRoles(roles: string[]) {
    return this.componentStore.state$.pipe(
      map(state => {
        if (state.device && state.device.info) {
          const hidden_groups = state.device.info.serami_acl.find(acl => roles.includes(acl.role))?.hidden_groups;
          const hidden_variables = state.device.info.serami_acl.find(acl => roles.includes(acl.role))?.hidden_variables;
          if (!hidden_groups)
            return state.variables;
          if (!hidden_variables)
            return state.variables;
          return state.variables.filter(variable => !hidden_groups.includes(variable.group) && !hidden_variables.includes(variable.hash));
        }
        return [];
      })
    );
  }

  showVariable(variable: Variable) {
    this.componentStore.setState((project) => {
      let variables = project.variables.map(v => {
        if (v.hash === variable.hash)
          v.hide = false;
        return v;
      });
      return { ...project, variables: variables } as Project;
    })
  }

  hideVariable(variable: Variable) {
    this.componentStore.setState((project) => {
      let variables = project.variables.map(v => {
        if (v.hash === variable.hash)
          v.hide = true;
        return v;
      });
      return { ...project, variables: variables } as Project;
    })
  }

  getGroups() {
    return this.componentStore.state$.pipe(map(project => {
      const tmp = project.variables.map(item => item.group);
      return tmp.filter((x, i, a) => a.indexOf(x) == i)
    }));
  }

  getGroupsByRole(roles: string[]) {
    return this.getVariablesByRoles(roles).pipe(map(variables => {
      const tmp = variables.map(item => item.group);
      return tmp.filter((x, i, a) => a.indexOf(x) == i)
    }));
  }

  loadFromSnet(xml: string) {
    this.seramiParser.parse(xml).pipe(first()).subscribe(data => {
      this.componentStore.setState((project) => {
        let overrides = project.device?.info.serami_var_override;
        if (overrides) {
          data = data.map(variable => {
            const override_variable = overrides!.find(ov => ov.id === variable.hash);
            if (override_variable) {
              if (override_variable?.title)
                variable.name = override_variable.title;
              if (override_variable?.description)
                variable.description = override_variable.description;
              if (override_variable?.writable !== undefined)
                variable.readonly = !override_variable.writable;
              if (override_variable?.options)
                variable.values = Object.keys(override_variable.options).map(key => {
                  return [override_variable.options![key], key]
                })
            }
            return variable;
          });
        }
        return { ...project, variables: data, view: { addressFormat: 16, modbus: false, modbusEEpromOffset: 4096, extendedView: false } } as Project;
      })
    });
  }

  closeProject() {
    this.componentStore.setState(this.getEmptyProject());
  }

  private getEmptyProject() {
    return {
      variables: [], view: {
        addressFormat: 16,
        modbus: false,
        modbusEEpromOffset: 4096,
        extendedView: false
      }
    } as Project;
  }

}
