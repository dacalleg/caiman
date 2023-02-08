import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { combineLatest, filter, from, map, Observable, of, shareReplay, switchMap, take, tap } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AguaOptions, Board, DeviceInfoResponse, ProductInfo, SeramiACL } from '../classes/interfaces';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private options$: Observable<AguaOptions>;

  constructor(private Http: HttpClient, private Auth: AuthService) {
    this.options$ = this.Http.get<AguaOptions>(environment.endpoint + "/wp-json/caiman/v1/options").pipe(shareReplay(1));
  }

  private getAguaHeaders() {
    return combineLatest([
      this.Auth.getToken(),
      this.options$,
    ]).pipe(
      take(1),
      map(([token, env]) => {
        return new HttpHeaders()
          .set('content-type', 'application/json')
          .set('customer_code', "" + env.agua_customer_code)
          .set('id_brand', "" + env.agua_id_brand)
          .set('authorization', token || "")
          .set('local', 'false')
      }))
  }

  getDeviceInfoFromMac(mac: string) {
    return combineLatest([
      this.getAguaHeaders(),
      this.options$,
    ]).pipe(
      switchMap(([headers, options]) => this.Http.post<DeviceInfoResponse>(options.agua_endpoint + "/deviceInfoFromMac", { mac: mac }, { headers: headers })),
      map(response => response.device_product[0]),
      switchMap(response => this.getProductInfo(response.id_product).pipe(map(info => {
        response.info = info;
        return response;
      })))
    );
  }

  private getBoard(id: string) {
    return this.Http.get<any>(environment.endpoint + "/wp-json/wp/v2/board/" + id).pipe(
      map(item => {
        let serami_acl = [] as SeramiACL[];
        if (item.acf.serami_acl) {
          serami_acl = item.acf.serami_acl.map((item: any) => {
            return { ...item, hidden_variables: item.hidden_variables ? item.hidden_variables.split("\r\n") : [], hidden_groups: item.hidden_groups ? item.hidden_groups.split("\r\n") : [] }
          })
        }
        return {
          id: item.id,
          serami_file: item.acf.serami_file,
          serami_acl: serami_acl,
          gateway_firmware_list: item.acf.gateway_firmware_list || [],
        }
      })
    )
  }

  getProductInfo(id_product: string) {
    return this.Http.get<any[]>(environment.endpoint + "/wp-json/wp/v2/model?key=" + id_product).pipe(
      switchMap(arr => from(arr)),
      switchMap(item => combineLatest([of(item), this.getBoard(item.acf.board)])),
      map(([item, board]) => {
        return {
          id: item.id,
          name: item.title.rendered,
          description: item.excerpt.rendered ? item.excerpt.rendered.replace(/(<([^>]+)>)/gi, "") : "",
          id_product: item.acf.key,
          serami_file: board.serami_file,
          serami_acl: board.serami_acl,
          gateway_firmware_list: board.gateway_firmware_list,
          video: item.acf.video || [],
          documents: item.acf.documents || [],
          serami_var_override: item.acf.serami_var_override || [],
          serami_group_override: item.acf.serami_group_override || [],
          image: item["_links"]["wp:featuredmedia"].length > 0 ? item["_links"]["wp:featuredmedia"][0]["href"] : null,
          faq: item.acf.faq || []
        } as ProductInfo
      }),
      take(1),
      switchMap(item => {
        if (item.image) {
          return this.getMedia(item.image).pipe(map(image => {
            item.image = image;
            return item;
          }))
        } else {
          return of(item);
        }
      })
    )
  }

  getMedia(href: string, size: string = 'full') {
    return this.Http.get<any>(href).pipe(
      map(response => response.media_details.sizes[size].source_url)
    )
  }

  getAttachmentUrl(id: number|string) {
    return this.Http.get<any>(environment.endpoint + "/wp-json/wp/v2/media/" + id).pipe(
      map(response => response.source_url)
    )
  }

  getAttachmentContent(id: number, responseType: 'text' | 'blob' = 'text') {
    return this.getAttachmentUrl(id).pipe(
      switchMap(url => this.Http.get(url, { responseType: 'text' }))
    )
  }

  getUserInfo() {
    return this.Http.get<any>(environment.endpoint + "/wp-json/caiman/v1/me");
  }

  getAguaEnv() {
    return this.options$;
  }
}
