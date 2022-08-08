let debug;
const tabChecker = chrome.runtime.connect({name: 'tabChecker'});
const connector = new TradingConnector(tabChecker);

getFromStorage('trv_mt4_debug', 'local').then(res => debug = res.trv_mt4_debug || false);

const init = (startSocket = true) => {
    if (startSocket) {
        connector.setupSocket();
    } else {
        setTimeout(() => init(startSocket), 250);
    }
};

const resource = (filename) => {
    let script = document.createElement("script");
    script.src = chrome.extension.getURL(filename);
    script.type = "text/javascript";

    return script;
}

const message = (obj) => {
    if (obj && obj.source === window && obj.data  && obj.data.method) {
        tabChecker.postMessage(obj.data)
    }
}

r(() => {
    const element = document.body || document.head || document.documentElement;
    const manifest = chrome.runtime.getManifest();

    for (let filename of manifest.web_accessible_resources) {
        let script = resource(filename);
        if (!element.querySelector("script[src*='" + filename + "']")) {
            element.appendChild(script);
        }
    }

    window.addEventListener("message", message);
    tabChecker.postMessage({ping: "pong"});

    chrome.runtime.onMessage.addListener(msg => {
        if (msg.token) connector.wsSend(msg);
        if (msg.user_info) connector.wsSend(msg.user_info);
        if (msg.start) init();
        if (msg.alert) connector.parseAlert(msg);
    });
});
