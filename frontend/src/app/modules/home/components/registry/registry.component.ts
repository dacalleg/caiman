import { Component, Input, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Observable, Subject, combineLatest, delay, filter, map, merge, of, shareReplay, switchMap, take, tap } from 'rxjs';
import { Country, Project, Registry } from 'src/app/classes/interfaces';
import { ApiService } from 'src/app/services/api.service';
import { BuilderService } from 'src/app/services/builder.service';
import { StoreService } from 'src/app/services/store.service';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-registry',
  templateUrl: './registry.component.html',
  styleUrls: ['./registry.component.scss']
})
export class RegistryComponent {
  @ViewChild("myForm") myForm: NgForm|undefined;
  project$: Observable<Project>;
  countries$: Observable<Country[]>;
  registry: Registry;
  registries$: Observable<Registry[]>;
  update$: Subject<void>;

  constructor(
    private Store: StoreService,
    private Api: ApiService,
    private Builder: BuilderService,
    private Toast: ToastService
  ) {
    this.registry = this.Builder.buildRegistry();
    this.project$ = this.Store.getProject();
    this.countries$ = this.Api.getCountries();
    this.update$ = new Subject();
    const serial$ = this.project$.pipe(
      filter(p => p.device?.info.serial != null),
      map(p => p.device!.info.serial!),
      take(1)
    );
    serial$.subscribe(serial => this.registry.serial = serial);
    this.registries$ = merge(of(void 0), this.update$).pipe(
      switchMap(() => serial$),
      switchMap(serial => this.Api.getRegistries(serial)),
      tap(items => {
        this.registry = items.length > 0 ? items[0] : this.registry;
      }),
      shareReplay(1)
    )

    this.registries$.subscribe();
  }

  ngUpdateFirstIgnitionDate(event: string) {
    this.registry.first_ignition_date = new Date(event);
  }

  ngUpdatePurchaseDate(event: string) {
    this.registry.purchase_date = new Date(event);
  }

  onSubmit() {
    if(this.myForm?.form.valid)
    {
      this.Api.updateRegistry(this.registry).subscribe(() => {
        this.Toast.addSuccessToast("L\'anagrafica è stata salvata correttamente");
        this.update$.next();
      });
    }
  }
}
