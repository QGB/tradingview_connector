class TradingConnector {
    constructor(tabChecker) {
        this.tabChecker = tabChecker
    }
    setupSocket = () => {
        this.socket = new WebSocket('ws://127.0.0.1:6560');

        this.socket.onopen = () => {
            console.log("%cConnected to TradingConnector desktop app.", "color:green");
            this.tabChecker.postMessage({socket: 'open'});
        };
        this.socket.onclose = () => {
            console.log("%cTradingConnector desktop app disconnected.", "color:red");
            this.tabChecker.postMessage({socket: 'close'});
        };
        this.socket.onerror = (e) => {
            console.log("%cError occurred while trying to connect to TradingConnector desktop app.", "color:red");
            this.tabChecker.postMessage({socket: 'error'});
        };
    };

    fillSendObject = (id, sym, desc) => {
        if (sym && desc) {
            if (debug) console.debug(`Prepare alert: ${id} ${sym}: ${desc}`);
            const currentTimestamp = Math.floor(Date.now() / 1000);
            const [market, symbol] = sym.split(':')
            const signal = {
                id: currentTimestamp,
                symbol: symbol,
                command: desc,
                time: currentTimestamp
            };

            this.wsSend(signal);
        }
    };

    wsSend = (signal) => {
        if (this.socket && this.socket.OPEN === this.socket.readyState) {
            if (debug) console.debug('Sending the message to TradingConnector',JSON.stringify(signal));
            this.socket.send(JSON.stringify(signal));
        } else if (!this.socket || (this.socket && this.socket.CLOSED !== this.socket.readyState)) {
            if (debug) console.debug('Waiting for connection with TradingConnector. Retry sending the message.');
            setTimeout(() => this.wsSend(signal), 250);
        }
    };

    parseAlert = (message) => {
        const alert = message.alert;

        if ('event' === message.method) {
            this.fillSendObject(alert.id, alert.sym, alert.desc)
        }
    }
}
