import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { bufferCount, catchError, combineLatest, filter, from, map, Observable, of, shareReplay, switchMap, take, tap, toArray } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AguaOptions, Board, DeviceInfoResponse, Gateway, LogItem, ProductInfo, SeramiACL, Ticket, Translation, UserData, VariableInfoOverride } from '../classes/interfaces';
import { AuthService } from './auth.service';
import { TranslationProviderService } from './translation-provider.service';
import { TranslationService } from './translation.service';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private options$: Observable<AguaOptions>;

  constructor(
    private Http: HttpClient,
    private Auth: AuthService,
    private TranslationProvider: TranslationProviderService,
    private Translation: TranslationService) {
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

  getDeviceInfoFromMac(mac: string, productKey: string | null = null) {
    return combineLatest([
      this.getAguaHeaders(),
      this.options$,
    ]).pipe(
      switchMap(([headers, options]) => this.Http.post<DeviceInfoResponse>(options.agua_endpoint + "/deviceInfoFromMac", { mac: mac }, { headers: headers })),
      map(response => response.device_product[0]),
      switchMap(response => {
        if (productKey)
          return this.getProductInfo(productKey, response.boards_status.Type).pipe(
            map(info => {
              response.info = info;
              return response;
            }));
        return this.getProductInfo(response.id_product, response.boards_status.Type).pipe(
          map(info => {
            response.info = info;
            return response;
          }))
      })
    );
  }

  private getBoard(id: string) {
    return this.Http.get<any>(environment.endpoint + "/wp-json/wp/v2/board/" + id).pipe(
      map(item => {
        let serami_acl = [] as SeramiACL[];
        if (item.acf.serami_acl) {
          serami_acl = item.acf.serami_acl.map((item: any) => {
            return {
              ...item,
              hidden_variables: item.hidden_variables ? item.hidden_variables.split("\r\n") : [],
              hidden_groups: item.hidden_groups ? item.hidden_groups.split("\r\n") : [],
              only_read_variables: item.only_read_variables ? item.only_read_variables.split("\r\n") : [],
              writable_variables: item.writable_variables ? item.writable_variables.split("\r\n") : []
            }
          })
        }
        return {
          id: item.id,
          serami_file: item.acf.serami_file,
          serami_acl: serami_acl,
          firmware_list: item.acf.firmware || [],
          database: item.acf.database || [],
          serami_var_formula_override: item.acf.serami_var_formula_override || [],
        } as Board
      })
    )
  }

  private getGateway(type: string, board: string) {
    return this.Http.get<number[]>(environment.endpoint + "/wp-json/caiman/v1/gateway/" + board + "/" + type).pipe(
      switchMap(ids => this.Http.get<any>(environment.endpoint + "/wp-json/wp/v2/gateway/" + ids[0])),
      map(item => {
        return {
          id: item.id,
          board: item.acf.board,
          type: item.acf.type,
          firmware_list: item.acf.firmware || [],
        } as Gateway
      }),
      catchError(err => of(null))
    )
  }

  getAllProducts() {
    return this.Translation.getCurrentLanguage().pipe(
      switchMap((lang) => this.Http.get<any[]>(environment.endpoint + "/wp-json/wp/v2/model/?" + (lang !== "it" ? "lang=" + lang : "")).pipe(
        switchMap(arr => from(arr)),
        map((item) => {
          return {
            name: item.title.rendered as string,
            key: item.acf.key as string,
          }
        }),
        toArray()
      )),
    )
  }


  private buildProductInfo(item: any, board: Board, roles: string[], gateway: Gateway | null = null) {
    let serami_var_override = item.acf.serami_var_override as any[] || [];
    let serami_var_opt_override = item.acf.serami_var_opt_override as any[] || [];
    let serami_var_formula_override = board.serami_var_formula_override as any[] || [];
    let writable_variables = board.serami_acl.find(item => roles.includes(item.role) || item.role === 'all')?.writable_variables || [];
    let only_read_variables = board.serami_acl.find(item => roles.includes(item.role) || item.role === 'all')?.only_read_variables || [];

    let identifiers = [].concat(
      ...serami_var_override.map(item => item.id),
      ...serami_var_opt_override.map(item => item.id),
      ...serami_var_formula_override.map(item => item.id)
    ).filter((item, pos, arr) => {
      return arr.indexOf(item) == pos;
    });

    const var_override = identifiers.map(id => {
      const info = serami_var_override.find(item => item.id === id);
      const options = serami_var_opt_override.find(item => item.id === id)?.options.split("\n").reduce((acc: { [key: string]: string }, item: string) => {
        const [key, value] = item.split(":");
        acc[value.trim()] = key.trim();
        return acc;
      }, {} as { [key: string]: string });
      const formula = serami_var_formula_override.find(item => item.id === id);

      let is_writable = writable_variables.includes(id);
      let is_only_readable = only_read_variables.includes(id);
      let writable = undefined as boolean | undefined;
      if (is_writable)
        writable = true;
      if (is_only_readable)
        writable = false;

      return {
        id: id,
        title: info ? info.title : undefined,
        description: info ? info.description : undefined,
        options: options ? options : undefined,
        read_exp: formula ? formula.read_exp : undefined,
        write_exp: formula ? formula.write_exp : undefined,
        writable: writable
      } as VariableInfoOverride
    })

    return {
      id: item.id,
      name: item.title.rendered,
      description: item.excerpt.rendered ? item.excerpt.rendered.replace(/(<([^>]+)>)/gi, "") : "",
      id_product: item.acf.key,
      serami_file: board.serami_file,
      serami_acl: board.serami_acl,
      gateway_firmware_list: gateway !== null ? gateway.firmware_list : [],
      board_firmware_list: board.firmware_list,
      video: item.acf.video || [],
      documents: item.acf.documents || [],
      serami_var_override: var_override || [],
      serami_group_override: item.acf.serami_group_override || [],
      database: board.database || [],
      image: item["_links"]["wp:featuredmedia"].length > 0 ? item["_links"]["wp:featuredmedia"][0]["href"] : null,
      faq: item.acf.faq || []
    } as ProductInfo
  }


  getProductInfo(product: string, gateway: string) {
    return combineLatest([of(product), this.Translation.getCurrentLanguage()]).pipe(
      switchMap(([product, lang]) => this.Http.get<any[]>(environment.endpoint + "/wp-json/wp/v2/model/?key=" + product + (lang !== "it" ? "&lang=" + lang : ""))),
      switchMap(arr => from(arr)),
      switchMap(item => combineLatest([of(item), this.getBoard(item.acf.board), this.getGateway(gateway, item.acf.board), this.Auth.getRoles()])),
      take(1),
      map(([item, board, gateway, roles]) => this.buildProductInfo(item, board, roles, gateway)),
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

  getMedia(href: string) {
    return this.Http.get<any>(href).pipe(
      map(response => response.source_url)
    )
  }

  getAttachmentUrl(id: number | string) {
    return this.Http.get<any>(environment.endpoint + "/wp-json/wp/v2/media/" + id).pipe(
      map(response => response.source_url)
    )
  }

  getAttachmentUrlWithoutSSL(id: number | string) {
    return this.Http.get<{ url: string, md5: string }>(environment.endpoint + "/wp-json/caiman/v1/unsecure_file/" + id)
  }

  getAttachmentContent(id: number, responseType: 'text' | 'blob' = 'text') {
    return this.getAttachmentUrl(id).pipe(
      switchMap(url => this.Http.get(url, { responseType: 'text' }))
    )
  }

  getAguaEnv() {
    return this.options$;
  }

  getTranslations() {
    return this.TranslationProvider.getAvailableTranslations();
  }

  getTickets(serial: string) {
    return this.Http.post<Ticket[]>(environment.endpoint + "/api/ticket/get", { serial: serial }).pipe(map(resp => {
      return resp.map(item => {
        item.createdAt = new Date(item.createdAt);
        return item;
      })
    }))
  }

  addTicket(ticket: Partial<Ticket>, parent: Ticket) {
    return this.Http.post<Ticket>(environment.endpoint + "/api/ticket/add", { ticket: ticket, parent: parent.id });
  }

  createLogForDevice(serial: string, log: LogItem)
  {
    return this.Http.post(environment.endpoint + "/api/logs", {...log, serial: serial, date: log.date.toJSON().slice(0, 19).replace('T', ' ')});
  }

  createLogForGateway(gatewayId: string, log: LogItem)
  {
    return this.Http.post(environment.endpoint + "/api/logs", {...log, gateway: gatewayId, date: log.date.toJSON().slice(0, 19).replace('T', ' ')});
  }

  getLogsForDevice(serial: string)
  {
    return this.Http.get<any[]>(environment.endpoint + "/api/logs/serial/" + serial).pipe(map(resp => {
      return resp.map(item => {
        item.date = new Date(item.date);
        return item as LogItem;
      })
    }));
  }

  closeTicket(ticket: Ticket) {
    return this.Http.post<Ticket>(environment.endpoint + "/api/ticket/close", { id: ticket.id });
  }

  chunkUpload(file: File, chunkSize: number = 1024 * 1024) {
    const splitted = file.name.split(".", 2);
    const ext = splitted[1];
    const filename = this.makeid(10);
    return from(file.arrayBuffer()).pipe(
      bufferCount(chunkSize),
      map(buffer => new Blob(buffer, { type: file.type })),
      switchMap(blob => from(this.blobToBase64(blob))),
      switchMap(base64 => this.Http.post(environment.endpoint + "/api/chunkupload", { name: filename, ext: ext, chunk: base64 })),
      map(() => filename + "." + ext)
    );
  }

  private makeid(length = 8) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

  private blobToBase64(blob: Blob) {
    return new Promise<string>(resolve => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split('base64,')[1];
        resolve(base64);
      };
      reader.readAsDataURL(blob);
    });
  }
}
