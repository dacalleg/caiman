import { Injectable } from '@angular/core';
import { ComponentStore } from "@ngrx/component-store";
import { Project, Variable, ViewOption } from "../classes/interfaces";
import { SeramiParserService } from "./serami-parser.service";
import { first, map } from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class StoreService {

  constructor(
    private readonly componentStore: ComponentStore<Project>,
    private seramiParser: SeramiParserService
  ) {
    const lastproject = localStorage.getItem("serami_current_project");
    if (lastproject)
      this.componentStore.setState(JSON.parse(lastproject) as Project);
    else
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
    return this.componentStore.state$.pipe(map(item => item.variables));
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

  loadFromSnet(xml: string) {
    this.seramiParser.parse(xml).pipe(first()).subscribe(data => {
      this.componentStore.setState({
        variables: data,
        view: { addressFormat: 16, modbus: false, modbusEEpromOffset: 4096, extendedView: false }
      });
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
