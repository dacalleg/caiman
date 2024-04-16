import { Component, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbNav } from '@ng-bootstrap/ng-bootstrap';
import { BehaviorSubject, Observable, Subject, combineLatest, concat, filter, map, merge, of, shareReplay, switchMap, take, tap } from 'rxjs';
import { SeramiEntry, Variable } from 'src/app/classes/interfaces';
import { Utils } from 'src/app/classes/utils';
import { ApiService } from 'src/app/services/api.service';
import { SeramiParserService } from 'src/app/services/serami-parser.service';

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
  refresh$: Subject<void>;
  seramiEntry: SeramiEntry;
  currentGroup$: BehaviorSubject<string>;
  variables$: Observable<Variable[]>;
  seramiEntry$: Observable<SeramiEntry>;
  groups$: Observable<string[]>;
  variables: Variable[];
  groups: string[];
  logs: CheckLog[];
  search: string | undefined;

  constructor(private activatedRoute: ActivatedRoute, private Api: ApiService, private Router: Router) {
    this.refresh$ = new Subject();
    this.logs = [];
    this.seramiEntry = { data: [], name: "" };
    this.groups = [];
    this.variables = [];
    this.currentGroup$ = new BehaviorSubject<string>("");

    let s$ = this.activatedRoute.params.pipe(
      filter(params => params["key"] != null),
      map(params => params["key"]),
      switchMap(key => this.Api.getSerami(key)),
      tap(s => this.seramiEntry = s)
    )

    let s1$ = concat(of(this.seramiEntry), s$);

    this.seramiEntry$ = merge(
      s1$,
      this.refresh$.pipe(switchMap(() => of(this.seramiEntry)))
    ).pipe(shareReplay(1));

    this.groups$ = this.seramiEntry$.pipe(
      map(s => {
        const tmp = s.data.map(item => item.group);
        return tmp.filter((x, i, a) => a.indexOf(x) == i)
      }),
    );

    this.groups$.pipe(filter(g => g.length > 0), map(g => g.sort((b,a) => b.localeCompare(a)))).subscribe(g => this.groups = g);

    this.variables$ = combineLatest([
      this.seramiEntry$,
      this.currentGroup$
    ]).pipe(
      map(([entry, group]) => {
        return entry.data.filter(v => v.group == group);
      }),
      shareReplay(1)
    )

    this.groups$.pipe(take(1)).subscribe(groups => {
      this.changeGroup(groups[0]);
    });
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
      this.nav.select(this.groups.length + 1);
    }

    this.clearLog();
    this.seramiEntry$.pipe(take(1)).subscribe(entry => {
      this.checkDuplicates(entry.data);
      entry.data.forEach(variable => {
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
    })
  }

  check(variable: Variable) {
    if (variable.readExp?.includes("&"))
      this.addLog({ type: "Warning in Formula", variables: [variable], message: "contains logical operation" })
  }

  checkFormula(variable: Variable, target: number) {
    let results;

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
    return true;
  }



  save() {
    this.Api.updateSerami(this.seramiEntry).subscribe(() => {
      this.Router.navigate(["/config/list"]);
    });
  }

  updateHash(v: Variable) {
    v.hash = [v.memory == "eeprom" ? "E" : "R", "" + v.address, "" + v.mask].join("_")
  }

  moveToGroup(v: Variable, group: string) {
    v.group = group;
    this.refresh$.next();
  }

  changeGroupName($event: Event, oldName: string) {
    const target = $event.target as HTMLInputElement;
    const newName = target.value;
    if (oldName !== newName) {
      this.seramiEntry.data.filter(i => i.group == oldName).forEach(i => i.group = newName);
      const index = this.groups.indexOf(oldName);
      this.groups[index] = newName;
      this.refresh$.next();
    }
  }

  newGroup() {
    const name = "New Group";
    this.groups.push(name)
  }

  deleteVariable(variable: Variable) {
    let h = (Math.random() + 1).toString(36).substring(7);
    variable.group = h
    this.seramiEntry.data = this.seramiEntry.data.filter(item => item.group !== h)

    this.refresh$.next();
  }

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
    this.refresh$.next();
  }


  serachFor(variable: Variable) {
    this.search = variable.hash;
    if (this.nav)
      this.nav.select(this.groups.length);
  }
}
