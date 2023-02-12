import { Pipe, PipeTransform } from '@angular/core';
import { map, Observable, of } from 'rxjs';
import { WithRole } from 'src/app/classes/interfaces';
import { AuthService } from 'src/app/services/auth.service';

@Pipe({
  name: 'withRole'
})
export class WithRolePipe implements PipeTransform {

  constructor(private authService: AuthService) {

  }

  transform(value: WithRole[] | null | undefined): Observable<any[]> {
    if (value === null || value === undefined) {
      return of([]);
    }
    return this.authService.getRoles().pipe(
      map(roles => {
        return value.filter(item => item.role === "all" || roles.includes("administrator") || roles.includes(item.role))
      })
    )
  }
}
