import { Pipe, PipeTransform } from '@angular/core';
import { map, Observable, tap } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';

@Pipe({
  name: 'roleInCurrentUser'
})
export class RoleInCurrentUserPipe implements PipeTransform {

  constructor(private AuthService: AuthService) {

  }

  transform(value: string): Observable<boolean> {
    return this.AuthService.getRoles().pipe(
      map(roles => roles.includes(value as string)
    ));
  }

}
