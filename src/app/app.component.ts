import { Component } from '@angular/core';
import {SeramiParserService} from "./services/serami-parser.service";
import {Variable} from "./classes/interfaces";
import {map, Observable, shareReplay} from "rxjs";
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'serami';

  constructor() {
  }


}
