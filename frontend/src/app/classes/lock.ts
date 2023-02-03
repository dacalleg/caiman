export class Lock {
  private queue: any[];
  private lock: boolean;


  constructor() {
    this.lock = false;
    this.queue = [];
  }

  releaseLock() {
    if (this.queue.length > 0) {
      const fn = this.queue.pop();
      fn();
    }else
    {
      this.lock = false;
    }
  }

  async acquireLock() {
    return new Promise<void>(resolve => {
      if (this.lock)
        this.queue.push(resolve);
      else {
        this.lock = true;
        resolve();
      }
    });
  }
}
