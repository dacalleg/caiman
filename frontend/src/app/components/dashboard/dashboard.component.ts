import { Component, OnInit } from '@angular/core';
import {ApiService} from "../../services/api.service";
import {concat, ignoreElements, Observable, of, shareReplay} from "rxjs";

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  sync$: Observable<number>;
  completed$: Observable<boolean>;

  constructor(private Api: ApiService) {
    this.sync$ = this.Api.sync().pipe(shareReplay(1));
    this.completed$ = concat(
      of(false),
      this.sync$.pipe(ignoreElements()),
      of(true)
    )
  }

  ngOnInit(): void {
  }

  openMobileMenu() {
    throw new Error('Method not implemented.');
  }
}
