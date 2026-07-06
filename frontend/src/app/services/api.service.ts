import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {
  bufferCount,
  catchError,
  combineLatest,
  concat,
  concatMap,
  delay, filter,
  from,
  ignoreElements,
  map, mergeMap,
  Observable,
  of,
  shareReplay,
  switchMap,
  take,
  tap,
  throwError,
  toArray
} from 'rxjs';
import {environment} from 'src/environments/environment';
import {
  AguaOptions,
  Country,
  Database,
  DeviceInfoResponse,
  Failure,
  Firmware,
  Gateway,
  Info,
  LogItem,
  Operation,
  ProductInfo,
  Registry,
  SeramiEntry,
  Ticket,
  Variable,
  BoardData
} from '../classes/interfaces';
import {AuthService} from './auth.service';
import {TranslationProviderService} from './translation-provider.service';
import {TranslationService} from './translation.service';
import { COUNTRIES } from '../classes/countries';

interface DeferredRequest {
  url: string;
  body: any;
  id: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private options$: Observable<AguaOptions>;
  private info$: Observable<Info>;
  private products$: Observable<{ name: string, key: string }[]>;

  constructor(
    private Http: HttpClient,
    private Auth: AuthService,
    private TranslationProvider: TranslationProviderService,
    private Translation: TranslationService) {
    this.options$ = this.Http.get<AguaOptions>(environment.endpoint + "/wp-json/caiman/v1/options").pipe(shareReplay(1));
    this.info$ = this.Http.get<Info>(environment.endpoint + "/wp-json/caiman/v1/info").pipe(shareReplay(1));
    this.products$ = this.Translation.getCurrentLanguage().pipe(
      take(1),
      switchMap((lang) => of(1, 2, 3, 4, 5, 6, 7, 8, 9, 10).pipe(
        concatMap(page => this.Http.get<any[]>(environment.endpoint + "/wp-json/wp/v2/model/?" + (lang !== "it" ? "lang=" + lang : "") + "&page=" + page + "&per_page=" + 99).pipe(
          switchMap(arr => from(arr)),
          map(item => {
            return {
              name: item.title.rendered as string,
              key: item.acf.key as string,
            }
          }),
        ))
      )),
      catchError((err, caught) => of()),
      toArray(),
      map(arr => arr.sort((a, b) => a.name.localeCompare(b.name))),
      shareReplay(1)
    )
  }

  async sha256(message: string) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => ('00' + b.toString(16)).slice(-2)).join('');
  }

  getInfo() {
    return this.info$;
  }

  getDeviceInfoFromMac(mac: string, productKey: string | null = null) {
    return combineLatest([
      this.getAguaHeaders(),
      this.options$,
    ]).pipe(
      switchMap(([headers, options]) => this.Http.post<DeviceInfoResponse>(
        options.agua_endpoint + "/deviceInfoFromMac",
        {mac: mac},
        {headers: headers}
      )),
      switchMap(response => {
        if (!response.Success)
          return throwError(() => new Error('error.device.api_failed'));
        const device = response.device_product?.[0];
        if (!device)
          return throwError(() => new Error('error.device.not_found'));
        const productId = productKey ?? device.id_product;
        if (!productId)
          return throwError(() => new Error('error.product.not_found'));
        return this.getProductInfo(productId, device.boards_status?.Type).pipe(
          map(info => {
            device.info = info;
            return device;
          })
        );
      }),
      catchError(err => throwError(() => this.toDeviceLookupError(err))),
    );
  }

  private toDeviceLookupError(err: unknown): Error {
    if (err instanceof Error) {
      if (err.message === 'Product not found')
        return new Error('error.product.not_found');
      if (err.message.startsWith('error.'))
        return err;
    }
    return new Error('error.device.generic');
  }

  getFailures() {
    return this.Translation.getCurrentLanguage().pipe(
      take(1),
      switchMap((lang) => this.Http.get<any[]>(environment.endpoint + "/wp-json/wp/v2/failure/?" + (lang !== "it" ? "lang=" + lang : "")).pipe(
        switchMap(arr => from(arr)),
        map((item) => {
          return {
            name: item.title.rendered as string,
            key: item.acf.key as string,
            description: ""
          } as Failure
        }),
        toArray(),
      )),
    )
  }

  getAllProducts() {
    return this.products$;
  }

  sync() {
    let products = 0;
    let counter: number = 0;

    const syncLogs$ = from(this.getDeferredHttpQueue()).pipe(
      concatMap(req => this.Http.post<any>(req.url, req.body).pipe(
        tap(() => this.removeFromDeferredHttpQueue(req.id))
      )),
      ignoreElements()
    )

    const syncProducts$ = this.getAllProducts().pipe(
      tap(arr => products = arr.length),
      switchMap(products => from(products)),
      filter(product => {
        let value = localStorage.getItem("last_sync_prod_" + product.key)
        if (value !== null) {
          const last = +value;
          const now = new Date();
          return now.getTime() - last > 3600 * 24 * 7 * 1000
        }
        return true;
      }),
      concatMap(product => this.getProductInfo(product.key).pipe(
        delay(2000),
        tap(() => {
          counter = counter + 1;
          const now = new Date();
          localStorage.setItem("last_sync_prod_" + product.key, "" + now.getTime())
        }),
        map(() => counter / products),
        catchError((err => {
          counter = counter +  1;
          console.log("Error Sync ", product.name)
          return of(counter / products);
        }))
      )),
    )

    return concat(
      syncLogs$,
      syncProducts$
    )
  }

  getProductInfoByPrefix(prefix: string, gateway: string | undefined = undefined) {
    return combineLatest([of(prefix), this.Translation.getCurrentLanguage()]).pipe(
      switchMap(([product, lang]) => this.Http.get<any[]>(environment.endpoint + "/wp-json/wp/v2/model/?prefix=" + prefix + (lang !== "it" ? "&lang=" + lang : ""))),
      switchMap(arr => {
        if(arr.length == 0)
          return throwError(() => new Error("Product not found"))
        return from(arr)
      }),
      switchMap(item => combineLatest([of(item), this.getBoard(item.acf.board), gateway ? this.getGateway(gateway, item.acf.board) : of(null)])),
      take(1),
      switchMap(([item, board, gateway]) => this.getSerami(board.key).pipe(map(serami => [item, board, gateway, serami]))),
      map(([item, board, gateway, serami]) => this.buildProductInfo(item, board, gateway, serami.data)),
      switchMap(item => {
        if (item.image) {
          return this.getMedia(item.image).pipe(map(image => {
            item.image = image;
            return item;
          }))
        } else {
          return of(item);
        }
      }),
    )
  }

  getProductInfo(product: string, gateway: string | undefined = undefined) {
    return combineLatest([of(product), this.Translation.getCurrentLanguage()]).pipe(
      switchMap(([product, lang]) => this.Http.get<any[]>(environment.endpoint + "/wp-json/wp/v2/model/?key=" + product + (lang !== "it" ? "&lang=" + lang : ""))),
      switchMap(arr => {
        if(arr.length == 0)
          return throwError(() => new Error("Product not found"))
        return from(arr)
      }),
      switchMap(item => combineLatest([of(item), this.getBoard(item.acf.board), gateway ? this.getGateway(gateway, item.acf.board) : of(null)])),
      take(1),
      switchMap(([item, board, gateway]) => this.getSerami(board.key).pipe(map(serami => [item, board, gateway, serami]))),
      map(([item, board, gateway, serami]) => this.buildProductInfo(item, board, gateway, serami.data)),
      switchMap(item => {
        if (item.image) {
          return this.getMedia(item.image).pipe(map(image => {
            item.image = image;
            return item;
          }))
        } else {
          return of(item);
        }
      }),
    )
  }

  getMedia(href: string) {
    return this.Http.get<any>(href).pipe(
      map(response => response.source_url),
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
      switchMap(url => this.Http.get(url, {responseType: 'text'})),
    )
  }

  getAguaEnv() {
    return this.options$;
  }

  getTranslations() {
    return this.TranslationProvider.getAvailableTranslations();
  }

  getSeramiList() {
    return this.Http.get<SeramiEntry[]>(environment.endpoint + "/api/serami").pipe(map(arr => arr.sort((a,b) => a.name.localeCompare(b.name))));
  }

  getSerami(id: string) {
    return this.Http.get<SeramiEntry>(environment.endpoint + "/api/serami/get/" + id);
  }

  updateSerami(data: SeramiEntry) {
    return this.Http.post<any>(environment.endpoint + "/api/serami/update", data);
  }

  deleteSerami(id: string) {
    return this.Http.post<any>(environment.endpoint + "/api/serami/delete", { id: id });
  }

  getTickets(serial: string) {
    return this.Http.get<Ticket[]>(environment.endpoint + "/api/ticket/get/" + serial).pipe(map(resp => {
      return resp.map(item => {
        item.createdAt = new Date(item.createdAt);
        return item;
      })
    }))
  }

  addTicket(ticket: Partial<Ticket>, parent: Ticket) {
    return this.Http.post<Ticket>(environment.endpoint + "/api/ticket/add", {ticket: ticket, parent: parent.id});
  }

  createLogForDevice(serial: string, log: LogItem) {
    return this.Http.post(environment.endpoint + "/api/logs", {
      ...log,
      serial: serial,
      date: log.date.toJSON().slice(0, 19).replace('T', ' ')
    }).pipe(
      catchError(err => {
        const req = {
          id: this.makeid(),
          url: environment.endpoint + "/api/logs",
          body: {...log, serial: serial, date: log.date.toJSON().slice(0, 19).replace('T', ' ')}
        }
        this.addToDeferredHttpQueue(req);
        return throwError(() => err)
      })
    );
  }

  createLogForGateway(gatewayId: string, log: LogItem) {
    return this.Http.post(environment.endpoint + "/api/logs", {
      ...log,
      gateway: gatewayId,
      date: log.date.toJSON().slice(0, 19).replace('T', ' ')
    });
  }

  getLogsForDevice(serial: string) {
    return this.Http.get<any[]>(environment.endpoint + "/api/logs/serial/" + serial).pipe(map(resp => {
      return resp.map(item => {
        item.date = new Date(item.date);
        return item as LogItem;
      })
    }));
  }

  closeTicket(ticket: Ticket) {
    return this.Http.post<Ticket>(environment.endpoint + "/api/ticket/close", {id: ticket.id});
  }

  chunkUpload(file: File, chunkSize: number = 1024 * 1024) {
    const splitted = file.name.split(".", 2);
    const ext = splitted[1];
    const filename = this.makeid(10);
    return from(file.arrayBuffer()).pipe(
      bufferCount(chunkSize),
      map(buffer => new Blob(buffer, {type: file.type})),
      switchMap(blob => from(this.blobToBase64(blob))),
      switchMap(base64 => this.Http.post(environment.endpoint + "/api/chunkupload", {
        name: filename,
        ext: ext,
        chunk: base64
      })),
      map(() => filename + "." + ext)
    );
  }

  getCountries() {
    return of(COUNTRIES).pipe(map(countries => {
      return countries.map(c => {
        return {
          name: c.name,
          code: c["alpha-2"]
        } as Country
      }).sort((a, b) => a.name.localeCompare(b.name));
    }), shareReplay(1))
  }

  getRegistries(serial: string) {
    return this.Http.get<Registry[]>(environment.endpoint + "/api/registry/get/" + serial).pipe(
      map(resp => {
        return resp.map(item => {
          if (item.createdAt)
            item.createdAt = new Date(item.createdAt);
          return item;
        }).sort((b, a) => {
          if (a.createdAt && b.createdAt)
            return a.createdAt.getTime() - b.createdAt.getTime();
          return 0
        })
      }),
    )
  }

  getLastRegisry(serial: string) {
    return this.getRegistries(serial).pipe(
      map(registries => registries.length > 0 ? registries[0] : null)
    )
  }

  getOperations(serial: string) {
    return this.Http.get<Operation[]>(environment.endpoint + "/api/operation/get/" + serial).pipe(
      map(resp => {
        return resp.map(item => {
          if (item.createdAt)
            item.createdAt = new Date(item.createdAt);
          return item;
        }).sort((b, a) => {
          if (a.createdAt && b.createdAt)
            return a.createdAt.getTime() - b.createdAt.getTime();
          return 0
        })
      }),
    )
  }

  getOperationById(id: string) {
    return this.Http.get<Operation>(environment.endpoint + "/api/operation/id/" + id);
  }

  confirmOperation(id: string, from_email?: string) {
    return this.Http.post<Operation>(environment.endpoint + "/api/operation/confirm", {
      id: id,
      from_email: from_email
    });
  }

  updateOperation(operation: Operation) {
    return this.Http.post<any>(environment.endpoint + "/api/operation/update", {...operation});
  }

  updateRegistry(registry: Registry) {
    return this.Http.post<any>(environment.endpoint + "/api/registry/update", {...registry});
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

  private getBoard(id: string) {
    return this.Http.get<any>(environment.endpoint + "/wp-json/wp/v2/board/" + id).pipe(
      map(item => ({
        firmware_list: item.acf.firmware || [],
        database: item.acf.database || [],
        key: item.acf.key
      } as BoardData))
    )
  }

  private getGateway(type: string, board: string) {
    return this.Http.get<number[]>(environment.endpoint + "/wp-json/caiman/v1/gateway/" + board + "/" + type).pipe(
      switchMap(ids => {
        if (ids.length > 0)
          return of(ids[0]).pipe(
            switchMap(id => this.Http.get<any>(environment.endpoint + "/wp-json/wp/v2/gateway/" + id)),
            map(item => {
              return {
                id: item.id,
                board: item.acf.board,
                type: item.acf.type,
                firmware_list: item.acf.firmware || [],
              } as Gateway
            })
          )
        else {
          return of(null);
        }
      }),
    )
  }

  private getDeferredHttpQueue() {
    const q = localStorage.getItem("http_queue");
    if (q) {
      return JSON.parse(q) as DeferredRequest[];
    }
    return [] as DeferredRequest[];
  }

  private removeFromDeferredHttpQueue(id: string) {
    let queue = this.getDeferredHttpQueue();
    queue = queue.filter(item => item.id !== id);
    localStorage.setItem("http_queue", JSON.stringify(queue));
  }

  private addToDeferredHttpQueue(req: DeferredRequest) {
    let queue = this.getDeferredHttpQueue();
    queue = queue.concat(req);
    localStorage.setItem("http_queue", JSON.stringify(queue));
  }

  private buildProductInfo(item: any, board: BoardData, gateway: Gateway | null = null, variables: Variable[]) {
    return {
      id: item.id,
      name: item.title.rendered,
      description: item.excerpt.rendered ? item.excerpt.rendered.replace(/(<([^>]+)>)/gi, "") : "",
      id_product: item.acf.key,
      gateway_firmware_list: gateway !== null ? gateway.firmware_list : [],
      board_firmware_list: board.firmware_list,
      video: item.acf.video || [],
      documents: item.acf.documents || [],
      links: item.acf.links || [],
      database: board.database || [],
      image: item["_links"]["wp:featuredmedia"] && item["_links"]["wp:featuredmedia"].length > 0 ? item["_links"]["wp:featuredmedia"][0]["href"] : null,
      faq: item.acf.faq || [],
      variables
    } as ProductInfo
  }

  ransomOrder(uuid: string)
  {
    return this.Http.post<{status: string}>(environment.endpoint + "/wp-json/caiman/v1/ransom_order", {uuid: uuid});
  }

  useToken()
  {
    return this.Http.post<{status: string}>(environment.endpoint + "/wp-json/caiman/v1/use_token", null);
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
