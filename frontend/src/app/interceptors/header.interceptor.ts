import {
    HttpEvent,
    HttpInterceptor,
    HttpHandler,
    HttpRequest,
    HttpHeaders
} from '@angular/common/http';
import { map, Observable, of, switchMap, take } from 'rxjs';
import { TranslationService } from '../services/translation.service';

export class HeaderInterceptor implements HttpInterceptor {

    constructor() {

    }

    private getHeaders() {
        return of(new HttpHeaders().set('language', localStorage.getItem('language')!));
    }


    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        console.log(new Date());
        return this.getHeaders().pipe(
            switchMap(headers => {
                let reqHeaders = req.headers;
                if(req.url.includes("wp-json/caiman/v1"))
                {
                    headers.keys().forEach(key => {
                        reqHeaders = reqHeaders.set(key, headers.get(key)!);
                    });
                }
                return next.handle(req.clone({ headers: reqHeaders }));
            })
        );

        return next.handle(req);
    }
}