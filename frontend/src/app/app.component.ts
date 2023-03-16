import { Component, OnInit } from '@angular/core';
import { ApiService } from './services/api.service';
import { TranslationService } from './services/translation.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

  constructor(private translation: TranslationService, private Api: ApiService) {
    
  }

  ngOnInit(): void {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.body.appendChild(tag);
    this.Api.sync().subscribe({
      complete: () => {
        console.log("Syncronization Completed")
      },
      error: (err) => {
        console.log("Syncronization Error")
      }
    })
  }
}
