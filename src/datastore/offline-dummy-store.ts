import { EventEmitter } from 'events';
import { PgStoreEventEmitter } from './pg-store-event-emitter';
import { PgStore } from './pg-store';

export const OfflineDummyStore: PgStore = new Proxy(new EventEmitter() as PgStoreEventEmitter, {
  get(target: any, propKey) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    if (propKey === 'eventEmitter') return target;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    if (propKey in target) return target[propKey];
    return function () {
      throw new Error(
        `Cannot call function on the Dummy datastore. Check if the application is running in offline mode.`
      );
    };
  },
});
