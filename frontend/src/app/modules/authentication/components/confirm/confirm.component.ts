import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { combineLatest, switchMap, take } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-confirm',
  templateUrl: './confirm.component.html',
  styleUrls: ['./confirm.component.scss']
})
export class ConfirmComponent {

  error: string | null = null;
  finish: boolean = false;

  constructor(private ActivatedRoute: ActivatedRoute, private AuthService: AuthService) { 
    this.ActivatedRoute.queryParams.pipe(take(1)).pipe(
      switchMap((params) => this.AuthService.confirmEmail(params["email"], params["reg_code"]))
    ).subscribe({
      error: (error) => {
        this.error = error.error.error_code;
      },
      complete: () => {
        this.finish = true;
      }
    })
  }
}
