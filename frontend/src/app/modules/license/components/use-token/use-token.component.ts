import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-use-token',
  templateUrl: './use-token.component.html',
  styleUrls: ['./use-token.component.scss']
})
export class UseTokenComponent {

  constructor(private Api: ApiService, private Auth: AuthService, private Router: Router)
  {
    
  }

  use()
  {
    this.Api.useToken().pipe(tap(() => this.Auth.refreshUserData())).subscribe({
      complete: () => {
        setTimeout(() => {
          this.Router.navigate(["/dashboard/home"])
        }, 1000);
      },
      error: (err) => {

      }
    })
  }
}
