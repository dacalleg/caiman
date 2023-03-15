import { Component, ElementRef, ViewChild } from '@angular/core';
import { combineLatest, concat, concatMap, filter, from, map, merge, Observable, of, shareReplay, Subject, switchMap, take, tap, toArray } from 'rxjs';
import { Ticket } from 'src/app/classes/interfaces';
import { ApiService } from 'src/app/services/api.service';
import { AuthService } from 'src/app/services/auth.service';
import { StoreService } from 'src/app/services/store.service';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-tickets',
  templateUrl: './tickets.component.html',
  styleUrls: ['./tickets.component.scss']
})
export class TicketsComponent {

  @ViewChild('file') file: ElementRef | null;

  tickets$: Observable<Ticket[]>;
  selectTicket$: Subject<string>;
  selectedTicket$: Observable<Ticket | null>;

  newTicket: Partial<Ticket>;
  attachments: File[];
  allowedExt = ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'];
  visibleForm: string | null;
  reloadTicket$: Subject<void>;

  constructor(private Api: ApiService, private Store: StoreService, private Auth: AuthService) {
    this.attachments = [];
    this.file = null;
    this.visibleForm = null;
    this.newTicket = this.createEmptyTicket();
    this.reloadTicket$ = new Subject<void>();


    this.tickets$ = concat(
      of(void 0),
      this.reloadTicket$.asObservable()
    ).pipe(
      tap(value => console.log(value)),
      switchMap(() => this.Store.getProject().pipe(
        take(1),
        filter(project => project.device?.info.serial != null),
        map(project => project.device!.info!.serial!),
        switchMap(serial => this.Api.getTickets(serial)))
      ),
      shareReplay(1)
    )
    this.selectTicket$ = new Subject<string>();

    this.selectedTicket$ = combineLatest([
      this.selectTicket$.asObservable(),
      this.tickets$
    ]).pipe(
      switchMap(([id, tickets]) => of(tickets.find(ticket => ticket.id == id) || null)),
      tap(() => {
        this.newTicket = this.createEmptyTicket();
        this.visibleForm = null
      })
    );

    this.Store.getProject().pipe(
      take(1),
      filter(project => project.device?.info.serial != null),
      map(project => project.device?.info.serial!)
    ).subscribe(serial => {
      this.newTicket.serial = serial;
    })
  }

  sendMessaage(parent: Ticket) {
    from(this.attachments).pipe(
      concatMap(file => this.Api.chunkUpload(file)),
      tap(filename => this.newTicket.assets!.push({ path: filename })),
      toArray(),
      switchMap((paths) => combineLatest([
        of(paths),
        this.Store.getProject().pipe(take(1)),
        this.Auth.getUserData().pipe(take(1))
      ])),
      tap(([paths, project, user]) => {
        this.newTicket.assets = paths.map(path => ({ path: path }));
        this.newTicket.serial = project.device!.info.serial;
        this.newTicket.email = user.email;
      }),
      switchMap(() => this.Api.addTicket(this.newTicket, parent)),
      tap(() => this.reloadTicket$.next())
    ).subscribe({
      complete: () => {}
    });
  }

  selectTicket(ticket: Ticket) {
    this.selectTicket$.next(ticket.id);
  }


  onFileSelected(event: any) {
    if (event.target.files.length > 0) {
      const name = event.target.files[0].name;
      var splitted = name.split(".", 2);
      if (this.allowedExt.includes(splitted[1])) {
        this.attachments.push(event.target.files[0]);
      }
    }
  }

  addAsset() {
    this.file?.nativeElement.click();
  }

  showForm(id: string) {
    if (this.visibleForm == id) {
      this.visibleForm = null;
    }
    else {
      this.visibleForm = id;
    }
  }

  createEmptyTicket(){
    return {
      id: uuidv4(),
      text: "",
      customer: 0,
      serial: "",
      status: "open",
      children: [],
      assets: []
    } as Partial<Ticket>;
  }
}
