import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { filter, from, map, of, switchMap, take, tap } from 'rxjs';
import { environment } from 'src/environments/environment';
import { DeviceInfoResponse, ProductInfo, SeramiACL } from '../classes/interfaces';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  constructor(private Http: HttpClient, private Auth: AuthService) { }

  private getAguaHeaders() {
    return this.Auth.getToken().pipe(map((token) => {
      return new HttpHeaders()
        .set('content-type', 'application/json')
        .set('customer_code', environment.agua_customer_code)
        .set('id_brand', environment.agua_id_brand)
        .set('authorization', token || "")
        .set('local', 'false')
    }))
  }

  getDeviceInfoFromMac(mac: string) {
    return this.getAguaHeaders().pipe(
      switchMap(headers => this.Http.post<DeviceInfoResponse>(environment.agua_endpoint + "/deviceInfoFromMac", { mac: mac }, { headers: headers })),
      map(response => response.device_product[0]),
      switchMap(response => this.getProductInfo(response.id_product).pipe(map(info => {
        response.info = info;
        return response;
      })))
    );
  }

  getProductInfo(id_product: string) {
    return this.Http.get<any[]>(environment.endpoint + "/wp-json/wp/v2/model").pipe(
      switchMap(response => {
        return from(
          response.map(item => {
            let serami_acl = [] as SeramiACL[];
            if (item.acf.serami_acl) {
              serami_acl = item.acf.serami_acl.map((item: any) => {
                return { ...item, hidden_variables: item.hidden_variables ? item.hidden_variables.split("\r\n") : [], hidden_groups: item.hidden_groups ? item.hidden_groups.split("\r\n") : [] }
              })
            }
            return {
              id: item.id,
              name: item.title.rendered,
              description: item.excerpt.rendered,
              id_product: item.acf.key,
              serami_file: item.acf.serami_file,
              video: item.acf.video || [],
              documents: item.acf.documents || [],
              serami_acl: serami_acl,
              gateway_firmware_list: item.acf.gateway_firmware_list || [],
              image: item["_links"]["wp:featuredmedia"].length > 0 ? item["_links"]["wp:featuredmedia"][0]["href"] : null,
              faq: item.acf.faq || []
            } as ProductInfo
          })
        )
      }),
      filter(item => item.id_product == id_product),
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

  getAttachmentUrl(id: number) {
    return this.Http.get<any>(environment.endpoint + "/wp-json/wp/v2/media/" + id).pipe(
      map(response => response.source_url)
    )
  }

  getAttachmentContent(id: number, responseType: 'text' | 'blob' = 'text') {
    return this.getAttachmentUrl(id).pipe(
      switchMap(url => this.Http.get(url, { responseType: 'text' }))
    )
  }
}
