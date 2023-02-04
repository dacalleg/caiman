import { RxStompConfig } from '@stomp/rx-stomp';
import { environment } from '../environments/environment';

export const myRxStompConfig: RxStompConfig = {
    brokerURL: 'ws://' + environment.host + '/ws',

    connectHeaders: {
        login: 'rabbitmq',
        passcode: 'rabbitmq',
    },

    heartbeatIncoming: 0, // Typical value 0 - disabled
    heartbeatOutgoing: 20000, // Typical value 20000 - every 20 seconds

    reconnectDelay: 500,

    debug: (msg: string): void => {
        console.log(new Date(), msg);
    },
};