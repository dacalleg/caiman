import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {
  bufferCount,
  catchError,
  combineLatest,
  concat,
  concatMap,
  from,
  ignoreElements,
  map,
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
  Board,
  Country,
  DeviceInfoResponse,
  Failure,
  Gateway,
  Info,
  LogItem,
  Operation,
  ProductModel,
  Registry,
  SeramiACL,
  SeramiEntry,
  Ticket,
  Variable,
  VariableInfoOverride
} from '../classes/interfaces';
import {AuthService} from './auth.service';
import {OfflineCacheService} from './offline-cache.service';
import {TranslationProviderService} from './translation-provider.service';
import {TranslationService} from './translation.service';
import { COUNTRIES } from '../classes/countries';

interface DeferredRequest {
  url: string;
  body: any;
  id: string;
}

interface ProductResponse {
  model: any;
  board: any;
  gateway: Gateway | null;
}

interface SyncBatchItem {
  key: string;
  model: any;
  board: any;
}

interface SyncBatchResponse {
  products: SyncBatchItem[];
  board_keys: string[];
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
    private OfflineCache: OfflineCacheService,
    private TranslationProvider: TranslationProviderService,
    private Translation: TranslationService) {
    this.options$ = this.Http.get<AguaOptions>(environment.endpoint + "/wp-json/caiman/v1/options").pipe(shareReplay(1));
    this.info$ = this.Http.get<Info>(environment.endpoint + "/wp-json/caiman/v1/info").pipe(shareReplay(1));
    this.products$ = this.Translation.getCurrentLanguage().pipe(
      take(1),
      switchMap((lang) => this.Http.get<{ name: string, key: string }[]>(
        environment.endpoint + "/wp-json/caiman/v1/model" + (lang !== "it" ? "?lang=" + lang : "")
      )),
      catchError(() => of([])),
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
    const syncLogs$ = from(this.getDeferredHttpQueue()).pipe(
      concatMap(req => this.Http.post<any>(req.url, req.body).pipe(
        tap(() => this.removeFromDeferredHttpQueue(req.id))
      )),
      ignoreElements()
    );

    const syncProducts$ = combineLatest([
      this.Translation.getCurrentLanguage(),
      this.Auth.getRoles(),
      this.getAllProducts(),
    ]).pipe(
      take(1),
      switchMap(([lang, roles, allProducts]) => {
        const productsToSync = allProducts.filter(product => this.shouldSyncProduct(product.key));
        const total = productsToSync.length;

        if (total === 0) {
          return of(1);
        }

        const syncUrl = this.buildSyncUrl(lang, productsToSync.map(product => product.key).join(','));

        return this.Http.get<SyncBatchResponse>(syncUrl).pipe(
          switchMap(batch => {
            if (batch.board_keys.length === 0) {
              return of({ batch, seramiEntries: [] as SeramiEntry[] });
            }
            const seramiUrl = environment.endpoint + '/api/serami/batch?keys=' + encodeURIComponent(batch.board_keys.join(','));
            return this.Http.get<SeramiEntry[]>(seramiUrl).pipe(
              map(seramiEntries => ({ batch, seramiEntries })),
            );
          }),
          switchMap(({ batch, seramiEntries }) => {
            const seramiByKey = Object.fromEntries(
              seramiEntries
                .filter(entry => entry.key)
                .map(entry => [entry.key!, entry])
            );
            let succeeded = 0;

            return from(productsToSync).pipe(
              concatMap(product => {
                const item = batch.products.find(entry => entry.key === product.key);
                if (!item) {
                  console.log('Error Sync ', product.name, '- product data not found');
                  return of(succeeded / total);
                }

                const board = this.parseBoard(item.board);
                const serami = seramiByKey[board.key];
                if (!serami) {
                  console.log('Error Sync ', product.name, '- serami not found');
                  return of(succeeded / total);
                }

                const productInfo = this.buildProductInfo(item.model, board, roles, null, serami.data);

                return from(Promise.all([
                  this.OfflineCache.saveProduct(product.key, lang, productInfo),
                  this.OfflineCache.saveSerami(board.key, serami),
                ])).pipe(
                  tap(() => {
                    succeeded = succeeded + 1;
                    localStorage.setItem('last_sync_prod_' + product.key, String(Date.now()));
                  }),
                  map(() => succeeded / total),
                  catchError(() => {
                    console.log('Error Sync ', product.name);
                    return of(succeeded / total);
                  }),
                );
              }),
            );
          }),
          catchError(err => {
            console.log('Sync batch failed', err);
            return of(0);
          }),
        );
      }),
    );

    return concat(
      syncLogs$,
      syncProducts$
    );
  }

  getProductInfoByPrefix(prefix: string, gateway: string | undefined = undefined): Observable<ProductModel> {
    return combineLatest([this.Translation.getCurrentLanguage(), this.Auth.getRoles()]).pipe(
      take(1),
      switchMap(([lang, roles]) => this.fetchProduct({ prefix, gateway, lang }).pipe(
        map(response => ({
          model: response.model,
          board: this.parseBoard(response.board),
          gateway: response.gateway,
          roles,
        })),
      )),
      switchMap(({ model, board, gateway, roles }) => this.getSerami(board.key).pipe(
        map(serami => this.buildProductInfo(model, board, roles, gateway, serami.data)),
      )),
    );
  }

  getProductInfo(product: string, gateway: string | undefined = undefined): Observable<ProductModel> {
    return combineLatest([this.Translation.getCurrentLanguage(), this.Auth.getRoles()]).pipe(
      take(1),
      switchMap(([lang, roles]) => {
        if (!navigator.onLine) {
          return this.loadCachedProduct(product, lang, gateway);
        }

        return this.fetchProduct({ key: product, gateway, lang }).pipe(
          map(response => ({
            model: response.model,
            board: this.parseBoard(response.board),
            gateway: response.gateway,
            roles,
          })),
          switchMap(({ model, board, gateway: gw, roles }) => this.getSerami(board.key).pipe(
            map(serami => this.buildProductInfo(model, board, roles, gw, serami.data)),
          )),
          tap(productInfo => this.OfflineCache.saveProduct(product, lang, productInfo)),
          catchError(err => this.loadCachedProduct(product, lang, gateway, err)),
        );
      }),
    );
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

  getSerami(key: string) {
    return this.Http.get<SeramiEntry>(environment.endpoint + "/api/serami/get/" + key).pipe(
      tap(entry => this.OfflineCache.saveSerami(key, entry)),
      catchError(err => from(this.OfflineCache.getSerami(key)).pipe(
        switchMap(cached => cached ? of(cached) : throwError(() => err)),
      )),
    );
  }

  updateSerami(data: SeramiEntry) {
    return this.Http.post<any>(environment.endpoint + "/api/serami/update", data);
  }

  deleteSerami(key: string) {
    return this.Http.post<any>(environment.endpoint + "/api/serami/delete", {key: key});
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

  getOperationByKey(key: string) {
    return this.Http.get<Operation>(environment.endpoint + "/api/operation/key/" + key);
  }

  confirmOperation(key: string, from_email?: string) {
    return this.Http.post<Operation>(environment.endpoint + "/api/operation/confirm", {
      key: key,
      from_email: from_email
    });
  }

  updateOperation(operation: Operation) {
    return this.Http.post<any>(environment.endpoint + "/api/operation/update", {...operation});
  }

  updateRegistry(registry: Registry) {
    return this.Http.post<any>(environment.endpoint + "/api/registry/update", {...registry, key: undefined});
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

  private buildSyncUrl(lang: string, keys: string) {
    const query = new URLSearchParams();
    if (lang !== 'it')
      query.set('lang', lang);
    query.set('keys', keys);
    return environment.endpoint + '/wp-json/caiman/v1/sync?' + query.toString();
  }

  private shouldSyncProduct(key: string) {
    const value = localStorage.getItem('last_sync_prod_' + key);
    if (value === null)
      return true;
    return Date.now() - Number(value) > 3600 * 24 * 7 * 1000;
  }

  private loadCachedProduct(productKey: string, lang: string, gateway?: string, originalError?: unknown) {
    if (gateway) {
      return throwError(() => originalError ?? new Error('Product not found'));
    }

    return from(this.OfflineCache.getProduct(productKey, lang)).pipe(
      switchMap(cached => cached
        ? of(cached)
        : throwError(() => originalError ?? new Error('Product not found'))
      ),
    );
  }

  private fetchProduct(params: { key?: string; prefix?: string; gateway?: string; lang: string }) {
    const query = new URLSearchParams();
    if (params.key)
      query.set('key', params.key);
    if (params.prefix)
      query.set('prefix', params.prefix);
    if (params.gateway)
      query.set('gateway', params.gateway);
    if (params.lang !== 'it')
      query.set('lang', params.lang);

    return this.Http.get<ProductResponse>(environment.endpoint + '/wp-json/caiman/v1/product?' + query.toString()).pipe(
      catchError(err => {
        if (err.status === 404)
          return throwError(() => new Error('Product not found'));
        return throwError(() => err);
      }),
    );
  }

  private parseBoard(item: any): Board {
    let serami_acl = [] as SeramiACL[];
    if (item.acf.serami_acl) {
      serami_acl = item.acf.serami_acl.map((acl: any) => {
        return {
          ...acl,
          hidden_variables: acl.hidden_variables ? acl.hidden_variables.split("\r\n") : [],
          hidden_groups: acl.hidden_groups ? acl.hidden_groups.split("\r\n") : [],
          only_read_variables: acl.only_read_variables ? acl.only_read_variables.split("\r\n") : [],
          writable_variables: acl.writable_variables ? acl.writable_variables.split("\r\n") : []
        }
      })
    }
    return {
      id: item.id,
      serami_acl: serami_acl,
      firmware_list: item.acf.firmware || [],
      database: item.acf.database || [],
      serami_var_formula_override: item.acf.serami_var_formula_override || [],
      key: item.acf.key
    } as Board
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

  private buildProductInfo(item: any, board: Board, roles: string[], gateway: Gateway | null = null, variables: Variable[]): ProductModel {
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
      const options = serami_var_opt_override.find(item => item.id === id)?.options.split("\n").reduce((acc: {
        [key: string]: string
      }, item: string) => {
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
        writable: writable,
      } as VariableInfoOverride
    })

    return {
      id: item.id,
      name: item.name,
      description: item.description || "",
      id_product: item.acf.key,
      serami_acl: board.serami_acl,
      gateway_firmware_list: gateway !== null ? gateway.firmware_list : [],
      board_firmware_list: board.firmware_list,
      video: item.acf.video || [],
      documents: item.acf.documents || [],
      links: item.acf.links || [],
      serami_var_override: var_override || [],
      serami_group_override: item.acf.serami_group_override || [],
      database: board.database || [],
      image: item.image || null,
      faq: item.acf.faq || [],
      prefix: item.acf.prefix,
      variables: variables
    } as ProductModel
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
