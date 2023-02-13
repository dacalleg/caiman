import {
    HttpEvent,
    HttpInterceptor,
    HttpHandler,
    HttpRequest,
    HttpHeaders
} from '@angular/common/http';
import { Observable, of, switchMap } from 'rxjs';

export class HeaderInterceptor implements HttpInterceptor {

    constructor() {

    }

    private getHeaders() {
        return of(new HttpHeaders().set('language', localStorage.getItem('language')!));
    }


    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
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
    }
}