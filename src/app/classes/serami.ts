import { catchError, concatMap, filter, map, Observable, of, range, retry, switchMap, tap, throwError, toArray } from "rxjs";
import { Channel, ChannelProtocol, Variable } from "./interfaces";

enum SeramiConst {
  RWMS_CMD_W = 0x4,
  RWMS_CMD_R_R = 0x0,
  RWMS_CMD_R_E = 0x1,
  RWMS_CMD_W_R = 0x4,
  RWMS_CMD_W_E = 0x5,
  RWMS_CMD_R_R_EXT = 0x2,
  RWMS_CMD_R_E_EXT = 0x3,
  RWMS_CMD_W_R_EXT = 0x6,
  RWMS_CMD_W_E_EXT = 0x7,
  RWMS_DEF_DEV_ADDR = 0x00,
  RWMS_TYPE_WORD = 0x80,
  RWMS_TYPE_BYTE = 0x00
}

export class Serami implements ChannelProtocol {

  channel: Channel;

  constructor(channel: Channel) {
    this.channel = channel;
  }

  read(address: number, memory: string) {
    if (memory === "ram") {
      return this.readRam(address);
    }
    if (memory === "eeprom") {
      return this.readEeprom(address);
    }
    throw "memory parameter invalid";
  }

  write(address: number, data: number, memory: string) {
    if (memory === "ram") {
      return this.writeRam(address, data);
    }
    if (memory === "eeprom") {
      return this.writeEeprom(address, data);
    }
    throw "memory parameter invalid";
  }

  readMultiple(address: number, size: number, memory: string) {
    if (memory === "ram") {
      return this.readMultipleRam(address, size);
    }
    if (memory === "eeprom") {
      return this.readMultipleEeprom(address, size);
    }
    throw "memory parameter invalid";
  }

  writeMultiple(address: number, buffer: Uint8Array, memory: string) {
    if (memory === "ram") {
      return this.writeMultipleRam(address, buffer);
    }
    if (memory === "eeprom") {
      return this.writeMultipleEeprom(address, buffer);
    }
    throw "memory parameter invalid";
  }

  readRam(address: number) {
    const req = new Uint8Array(2);
    req[0] = (SeramiConst.RWMS_CMD_R_R << 5) + (address >> 8);
    req[1] = address & 255
    return this.sendToChannel(req);
  }

  readEeprom(address: number) {
    const req = new Uint8Array(2);
    req[0] = (SeramiConst.RWMS_CMD_R_E << 5) + (address >> 8);
    req[1] = address & 255
    return this.sendToChannel(req);
  }

  writeRam(address: number, value: number) {
    const req = new Uint8Array(4);
    req[0] = (SeramiConst.RWMS_CMD_W_R << 5) + (address >> 8);
    req[1] = address & 255
    req[2] = value
    req[3] = req[0] + req[1] + req[2]
    return this.sendToChannel(req);
  }

  writeEeprom(address: number, value: number) {
    const req = new Uint8Array(4);
    req[0] = (SeramiConst.RWMS_CMD_W_E << 5) + (address >> 8);
    req[1] = address & 255
    req[2] = value
    req[3] = req[0] + req[1] + req[2]
    return this.sendToChannel(req);
  }

  readMultipleRam(address: number, size: number) {
    return range(0, size).pipe(
      concatMap((index) => this.readRam(address + index)),
      toArray(),
      map(values => new Uint8Array(values))
    );
  }

  readMultipleEeprom(address: number, size: number) {
    return range(0, size).pipe(
      concatMap((index) => this.readEeprom(address + index)),
      toArray(),
      map(values => new Uint8Array(values))
    );
  }

  writeMultipleRam(address: number, data: Uint8Array) {
    return range(0, data.length).pipe(
      concatMap((index) => this.writeRam(address + index, data[index])),
      switchMap(() => this.readMultipleRam(address, data.length))
    );
  }

  writeMultipleEeprom(address: number, data: Uint8Array) {
    return range(0, data.length).pipe(
      concatMap((index) => this.writeEeprom(address + index, data[index])),
      switchMap(() => this.readMultipleRam(address, data.length))
    );
  }

  readPage(start: number, end: number, eeprom = false) {
    if (eeprom) {
      return this.readMultipleEeprom(start, end - start);
    } else {
      return this.readMultipleRam(start, end - start);
    }
  }

  readVariable(variable: Variable) {
    //return of(new Uint8Array([...Array(variable.bit/8).keys()])).pipe(tap(() => console.log("Read ", variable.name)));
    return this.readMultiple(variable.address, variable.bit / 8, variable.memory)
  }

  writeVariable(variable: Variable, buffer: Uint8Array) {
    //return of(new Uint8Array([...Array(variable.bit/8).keys()])).pipe(tap(() => console.log("Write ", variable.name, "value", buffer)));
    return this.writeMultiple(variable.address, buffer, variable.memory)
  }

  sendToChannel(data: Uint8Array): Observable<number> {
    return this.channel.write(new Uint8Array([0, 2, ...data])).pipe(map(res => {
      if (((data[0] + data[1] + res[1]) & 255) == res[0]) {
        return res[1];
      } else {
        throw new Error("ChecksumError");
      }
    }),
      retry(3),
      catchError(err => of()),
    ) as Observable<number>;
  }
}
