import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {
  bufferCount,
  catchError,
  combineLatest,
  concat,
  concatMap,
  defer,
  firstValueFrom,
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
  SeramiEntry,
  SeramiTranslationsImportResult,
  Ticket,
  Variable
} from '../classes/interfaces';
import {AuthService} from './auth.service';
import {OfflineCacheService} from './offline-cache.service';
import {TranslationProviderService} from './translation-provider.service';
import {TranslationService} from './translation.service';
import { COUNTRIES } from '../classes/countries';

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
  gateways: GatewayResponse[];
}

interface GatewayResponse {
  id: number;
  board: number;
  type: string;
  firmware_list: Gateway['firmware_list'];
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private options$: Observable<AguaOptions>;

  constructor(
    private Http: HttpClient,
    private Auth: AuthService,
    private OfflineCache: OfflineCacheService,
    private TranslationProvider: TranslationProviderService,
    private Translation: TranslationService) {
    this.options$ = this.Http.get<AguaOptions>(environment.endpoint + "/wp-json/caiman/v1/options").pipe(shareReplay(1));
  }

  async sha256(message: string) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => ('00' + b.toString(16)).slice(-2)).join('');
  }

  getInfo(): Observable<Info> {
    if (this.isOffline()) {
      return from(this.OfflineCache.getInfo()).pipe(
        map(info => info ?? { logo: '' }),
      );
    }

    return this.Http.get<Info>(environment.endpoint + "/wp-json/caiman/v1/info").pipe(
      tap(info => {
        this.OfflineCache.saveInfo(info);
        if (info.logo) {
          this.cacheImage(info.logo);
        }
      }),
      catchError(() => from(this.OfflineCache.getInfo()).pipe(
        map(info => info ?? { logo: '' }),
      )),
      shareReplay(1),
    );
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

  getAllProducts(): Observable<{ name: string, key: string }[]> {
    return this.Translation.getCurrentLanguage().pipe(
      take(1),
      switchMap((lang) => {
        if (this.isOffline()) {
          return from(this.OfflineCache.getModels(lang)).pipe(
            map(arr => arr.sort((a, b) => a.name.localeCompare(b.name))),
          );
        }

        return this.Http.get<{ name: string, key: string }[]>(
          environment.endpoint + "/wp-json/caiman/v1/model" + (lang !== "it" ? "?lang=" + lang : "")
        ).pipe(
          tap(models => this.OfflineCache.saveModels(lang, models)),
          map(arr => arr.sort((a, b) => a.name.localeCompare(b.name))),
          catchError(() => from(this.OfflineCache.getModels(lang)).pipe(
            map(arr => arr.sort((a, b) => a.name.localeCompare(b.name))),
          )),
        );
      }),
    );
  }

  sync(): Observable<number> {
    const syncDeferred$ = from(this.flushDeferredQueue()).pipe(ignoreElements());
    const syncData$ = combineLatest([this.Auth.getRoles()]).pipe(
      take(1),
      switchMap(([roles]) => defer(() => this.syncAllEntities(roles))),
      catchError(err => {
        console.log('Sync failed', err);
        return of(0);
      }),
    );

    return concat(syncDeferred$, syncData$);
  }

  getProductInfoByPrefix(prefix: string, gateway: string | undefined = undefined): Observable<ProductModel> {
    return combineLatest([this.Translation.getCurrentLanguage(), this.Auth.getRoles()]).pipe(
      take(1),
      switchMap(([lang, roles]) => {
        if (this.isOffline()) {
          return this.loadCachedProductByPrefix(prefix, lang, gateway);
        }

        return this.fetchProduct({ prefix, gateway, lang }).pipe(
          map(response => ({
            model: response.model,
            board: this.parseBoard(response.board),
            gateway: response.gateway,
            roles,
          })),
          switchMap(({ model, board, gateway: gatewayDetail, roles: userRoles }) => this.getSerami(board.key).pipe(
            map(serami => this.buildProductInfo(model, board, userRoles, gatewayDetail, serami.data, serami.groups)),
          )),
          catchError(err => this.loadCachedProductByPrefix(prefix, lang, gateway, err)),
        );
      }),
    );
  }

  getProductInfo(product: string, gateway: string | undefined = undefined): Observable<ProductModel> {
    return combineLatest([this.Translation.getCurrentLanguage(), this.Auth.getRoles()]).pipe(
      take(1),
      switchMap(([lang, roles]) => {
        if (this.isOffline()) {
          return this.loadCachedProduct(product, lang, gateway);
        }

        return this.fetchProduct({ key: product, gateway, lang }).pipe(
          map(response => ({
            model: response.model,
            board: this.parseBoard(response.board),
            gateway: response.gateway,
            roles,
          })),
          switchMap(({ model, board, gateway: gw, roles: userRoles }) => this.getSerami(board.key).pipe(
            map(serami => this.buildProductInfo(model, board, userRoles, gw, serami.data, serami.groups)),
          )),
          tap(productInfo => this.OfflineCache.saveProduct(product, lang, productInfo, gateway)),
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

  exportSeramiTranslations(key: string) {
    return this.Http.get(environment.endpoint + "/api/serami/export-translations/" + key, {
      responseType: 'blob',
      observe: 'response',
    });
  }

  importSeramiTranslations(key: string, csv: string) {
    return this.Http.post<SeramiTranslationsImportResult>(
      environment.endpoint + "/api/serami/import-translations/" + key,
      { csv }
    );
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
        };
        from(this.OfflineCache.saveDeferredRequest(req)).subscribe();
        return throwError(() => err);
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
    const { key, createdAt, updatedAt, ...payload } = registry;
    return this.Http.post<any>(environment.endpoint + "/api/registry/update", payload);
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

  private isOffline(): boolean {
    return !navigator.onLine;
  }

  private buildSyncUrl(lang: string) {
    const query = new URLSearchParams();
    if (lang !== 'it') {
      query.set('lang', lang);
    }
    return environment.endpoint + '/wp-json/caiman/v1/sync?' + query.toString();
  }

  private syncAllEntities(roles: string[]): Observable<number> {
    return new Observable<number>(subscriber => {
      (async () => {
        try {
          const configuredLanguages = await firstValueFrom(
            this.TranslationProvider.getAvailableLanguages()
          );
          const languages = configuredLanguages.length > 0
            ? configuredLanguages
            : ['it'];
          const seramiList = await firstValueFrom(
            this.Http.get<SeramiEntry[]>(environment.endpoint + '/api/serami')
          );
          const seramiKeys = seramiList
            .filter(entry => entry.key)
            .map(entry => entry.key!);

          let seramiEntries: SeramiEntry[] = [];
          if (seramiKeys.length > 0) {
            const seramiUrl = environment.endpoint + '/api/serami/batch?keys=' + encodeURIComponent(seramiKeys.join(','));
            seramiEntries = await firstValueFrom(this.Http.get<SeramiEntry[]>(seramiUrl));
          }

          const seramiByKey = Object.fromEntries(
            seramiEntries
              .filter(entry => entry.key)
              .map(entry => [entry.key!, entry])
          );

          const languageBatches = await Promise.all(
            languages.map(lang => firstValueFrom(
              this.Http.get<SyncBatchResponse>(this.buildSyncUrl(lang))
            ))
          );

          const productCount = languageBatches.reduce((count, batch) => count + batch.products.length, 0);
          const imageCount = languageBatches.reduce((count, batch) => {
            return count + batch.products.filter(item => item.model?.image).length;
          }, 0);
          const totalSteps = seramiEntries.length + productCount + imageCount + languages.length + 1;
          let completedSteps = 0;

          const reportProgress = () => {
            completedSteps = completedSteps + 1;
            subscriber.next(Math.min(completedSteps / totalSteps, 1));
          };

          for (const entry of seramiEntries) {
            await this.OfflineCache.saveSerami(entry.key!, entry);
            reportProgress();
          }

          const allBoards = new Map<number, Board>();
          const allGateways = new Map<string, Gateway>();
          const cachedImages = new Set<string>();

          for (let index = 0; index < languages.length; index++) {
            const lang = languages[index];
            const batch = languageBatches[index];

            for (const item of batch.products) {
              const board = this.parseBoard(item.board);
              allBoards.set(Number(item.board.id), board);
            }

            const models = batch.products.map(item => ({
              name: item.model.name as string,
              key: item.key,
            }));
            await this.OfflineCache.saveModels(lang, models);

            for (const item of batch.products) {
              const board = this.parseBoard(item.board);
              const serami = seramiByKey[board.key];
              if (!serami) {
                console.log('Error Sync', item.model.name, '- serami not found');
                reportProgress();
                continue;
              }

              const baseProduct = this.buildProductInfo(item.model, board, roles, null, serami.data, serami.groups);
              await this.OfflineCache.saveProduct(item.key, lang, baseProduct);

              const boardGateways = this.resolveGatewaysForBoard(Number(item.board.id), batch.gateways ?? []);
              for (const gateway of boardGateways) {
                const productWithGateway = this.buildProductInfo(item.model, board, roles, gateway, serami.data, serami.groups);
                await this.OfflineCache.saveProduct(item.key, lang, productWithGateway, gateway.type);
                allGateways.set(`${item.board.id}:${gateway.type}`, gateway);
              }

              if (item.model.image && !cachedImages.has(item.model.image)) {
                await this.cacheImage(item.model.image);
                cachedImages.add(item.model.image);
                reportProgress();
              }

              reportProgress();
            }

            reportProgress();
          }

          await this.OfflineCache.saveAllBoards(
            [...allBoards.entries()].map(([id, board]) => ({ id, board }))
          );
          await this.OfflineCache.saveAllGateways([...allGateways.values()]);

          const info = await firstValueFrom(this.Http.get<Info>(environment.endpoint + '/wp-json/caiman/v1/info'));
          await this.OfflineCache.saveInfo(info);
          if (info.logo) {
            await this.cacheImage(info.logo);
          }
          reportProgress();

          await this.OfflineCache.saveSyncMeta({
            lastSyncAt: Date.now(),
            lastFullSyncAt: Date.now(),
          });

          subscriber.next(1);
          subscriber.complete();
        } catch (error) {
          subscriber.error(error);
        }
      })();
    });
  }

  private resolveGatewaysForBoard(boardId: number, gateways: GatewayResponse[]): Gateway[] {
    const parsedGateways = gateways.map(gateway => this.parseGateway(gateway));
    const boardSpecific = parsedGateways.filter(gateway => Number(gateway.board) === boardId);
    const coveredTypes = new Set(boardSpecific.map(gateway => gateway.type));
    const generic = parsedGateways.filter(
      gateway => !gateway.board && gateway.type && !coveredTypes.has(gateway.type)
    );

    return [...boardSpecific, ...generic];
  }

  private parseGateway(item: GatewayResponse): Gateway {
    return {
      type: item.type,
      board: item.board,
      firmware_list: item.firmware_list || [],
    };
  }

  private async cacheImage(url: string): Promise<void> {
    try {
      const blob = await firstValueFrom(this.Http.get(url, { responseType: 'blob' }));
      await this.OfflineCache.saveImage(url, blob);
    } catch (error) {
      console.log('Error caching image', url, error);
    }
  }

  private async flushDeferredQueue(): Promise<void> {
    const queue = await this.OfflineCache.getDeferredRequests();
    for (const request of queue) {
      try {
        await firstValueFrom(this.Http.post(request.url, request.body));
        await this.OfflineCache.removeDeferredRequest(request.id);
      } catch (error) {
        console.log('Deferred request failed', request.id, error);
      }
    }
  }

  private loadCachedProduct(
    productKey: string,
    lang: string,
    gateway: string | undefined,
    originalError?: unknown
  ): Observable<ProductModel> {
    return from(this.resolveCachedProduct(productKey, lang, gateway)).pipe(
      switchMap(product => product
        ? of(product)
        : throwError(() => originalError ?? new Error('Product not found'))
      ),
    );
  }

  private loadCachedProductByPrefix(
    prefix: string,
    lang: string,
    gateway: string | undefined,
    originalError?: unknown
  ): Observable<ProductModel> {
    return from(this.findCachedProductKeyByPrefix(prefix, lang)).pipe(
      switchMap(productKey => productKey
        ? this.loadCachedProduct(productKey, lang, gateway, originalError)
        : throwError(() => originalError ?? new Error('Product not found'))
      ),
    );
  }

  private async findCachedProductKeyByPrefix(prefix: string, lang: string): Promise<string | null> {
    const models = await this.OfflineCache.getModels(lang);

    for (const model of models) {
      const product = await this.OfflineCache.getProduct(model.key, lang);
      if (product?.prefix === prefix) {
        return model.key;
      }
    }

    return null;
  }

  private async resolveCachedProduct(
    productKey: string,
    lang: string,
    gateway: string | undefined,
  ): Promise<ProductModel | null> {
    return this.OfflineCache.getProduct(productKey, lang, gateway);
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
    return {
      id: item.id,
      firmware_list: item.acf.firmware.map((item: any) => ({ revision: item.revision, file: item.file ? item.file.ID : null, role: item.role })) || [],
      database: item.acf.database || [],
      key: item.acf.key
    } as Board
  }

  private buildProductInfo(item: any, board: Board, _roles: string[], gateway: Gateway | null = null, variables: Variable[], groups?: ProductModel['groups']): ProductModel {
    return {
      id: item.id,
      name: item.name,
      description: item.description || "",
      id_product: item.acf.key,
      gateway_firmware_list: gateway !== null ? gateway.firmware_list : [],
      board_firmware_list: board.firmware_list,
      video: item.acf.video || [],
      documents: item.acf.documents || [],
      links: item.acf.links || [],
      database: board.database || [],
      image: item.image || null,
      faq: item.acf.faq || [],
      prefix: item.acf.prefix,
      variables: variables,
      groups: groups ?? undefined,
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
