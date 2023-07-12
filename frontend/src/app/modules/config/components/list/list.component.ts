import { Component, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, from, switchMap } from 'rxjs';
import { SeramiEntry } from 'src/app/classes/interfaces';
import { ApiService } from 'src/app/services/api.service';
import { SeramiParserService } from 'src/app/services/serami-parser.service';

@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ListComponent {
  list$: Observable<SeramiEntry[]>;
  @ViewChild("file") file: ElementRef | null;

  constructor(private Api: ApiService, private Router: Router, private Serami: SeramiParserService) {
    this.file = null;
    this.list$ = this.Api.getSeramiList();
  }

  openConfig(key: string) {
    this.Router.navigate(["/config/edit", key])
  }

  onFileChange($event: Event) {
    this.readFile($event.target).pipe(
      switchMap(data => this.Serami.parse(data)),
      switchMap(variables => this.Api.updateSerami({ name: "Import", data: variables }))
    ).subscribe(() => {
      self.location.reload();
    })
  }

  readFile(inputValue: any): Observable<string> {
    return from(new Promise<string>(resolve => {
      let file: File = inputValue.files[0];
      let myReader: FileReader = new FileReader();

      myReader.onloadend = function (e) {
        resolve(myReader.result as string)
      }
      myReader.readAsText(file);
    }))
  }

  importSnet2() {
    if (this.file)
      this.file.nativeElement.click();
  }
}
