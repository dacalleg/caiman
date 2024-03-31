import {Injectable} from '@angular/core';
import {ComponentStore} from "@ngrx/component-store";
import {DeviceProduct, Project, Variable, ViewOption} from "../classes/interfaces";
import {SeramiParserService} from "./serami-parser.service";
import {first, map, take} from "rxjs";
import {Utils} from '../classes/utils';

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
      return {...project, device: device} as Project;
    });
  }

  setAddressFormat(format: number) {
    this.componentStore.setState((project) => {
      return {...project, view: {...project.view, addressFormat: format}}
    });
  }

  setExtendedView(enable: boolean) {
    this.componentStore.setState((project) => {
      return {...project, view: {...project.view, extendedView: enable}}
    });
  }

  setAddressModbus(modbus: boolean) {
    this.componentStore.setState((project) => {
      return {...project, view: {...project.view, modbus: modbus}}
    });
  }

  setViewOptions(view: ViewOption) {
    this.componentStore.setState((project) => {
      return {...project, view: {...view}}
    });
  }

  getVariables() {
    return this.componentStore.state$.pipe(
      map(item => item.variables)
    );
  }

  getVariablesWithVariableKey() {
    return this.componentStore.state$.pipe(
      map(item => item.variables.filter(v => v.varKey !== undefined))
    )
  }

  getVariableByHash(hash: string) {
    return this.getVariables().pipe(
      map(item => item.find(v => v.hash === hash)),
      take(1)
    );
  }

  getVariablesByRoles(r: string[]) {
    const roles = r.concat("all");
    return this.componentStore.state$.pipe(
      map(state => {
        if (state.device && state.device.info) {
          let hidden_groups = state.device.info.serami_acl.find(acl => roles.includes(acl.role))?.hidden_groups || [];
          let hidden_variables = state.device.info.serami_acl.find(acl => roles.includes(acl.role))?.hidden_variables || [];
          return state.variables.filter(variable => !hidden_groups.includes(variable.group) && !hidden_variables.includes(variable.hash));
        }
        return [];
      })
    );
  }

  getGroups() {
    return this.componentStore.state$.pipe(map(project => {
        const tmp = project.variables.map(item => item.group);
        return tmp.filter((x, i, a) => a.indexOf(x) == i)
      })
    );
  }

  getGroupsByRole(roles: string[]) {
    return this.getVariablesByRoles(roles).pipe(map(variables => {
        const tmp = variables.map(item => item.group);
        return tmp.filter((x, i, a) => a.indexOf(x) == i)
      })
    );
  }

  loadFromJson(data: Variable[]) {
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
            if (override_variable?.read_exp) {
              variable.readExp = override_variable.read_exp;

              if (variable.readExp && variable.readExp !== "#") {
                var re = new RegExp('#', 'g');

                try {
                  variable.min = eval(Utils.sanitizeExp(variable.readExp).replace(re, "" + variable.min))
                } catch (ex) {
                }
                try {
                  variable.max = eval(Utils.sanitizeExp(variable.readExp).replace(re, "" + variable.max))
                } catch (ex) {
                }
              }
            }
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
      return {
        ...project,
        variables: data,
        view: {addressFormat: 16, modbus: false, modbusEEpromOffset: 4096, extendedView: false}
      } as Project;
    })
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
              if (override_variable?.read_exp) {
                variable.readExp = override_variable.read_exp;

                if (variable.readExp && variable.readExp !== "#") {
                  var re = new RegExp('#', 'g');

                  try {
                    variable.min = eval(Utils.sanitizeExp(variable.readExp).replace(re, "" + variable.min))
                  } catch (ex) {
                  }
                  try {
                    variable.max = eval(Utils.sanitizeExp(variable.readExp).replace(re, "" + variable.max))
                  } catch (ex) {
                  }
                }
              }
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
        return {
          ...project,
          variables: data,
          view: {addressFormat: 16, modbus: false, modbusEEpromOffset: 4096, extendedView: false}
        } as Project;
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
