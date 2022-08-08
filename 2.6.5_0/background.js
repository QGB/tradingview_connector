let access_token, runningTabId;
const titlePrefix = 'TradingView Alerts to MT4/MT5.\n';
const tradingView = new TradingView();

const tunnelDispatcher = (alert) => runningTabId && chrome.tabs.sendMessage(runningTabId, alert);

tradingView.setListenerDispatcher(tunnelDispatcher)

chrome.runtime.onConnect.addListener(port => {
    if ("tabChecker" === port.name) {
        port.onMessage.addListener((msg, sendingPort) => {
            if (msg.ping) initExtension(sendingPort.sender.tab.id);
            if (msg.socket) setSocketStatus(msg.socket);
            if (msg.method === "tradingview.user") {
                console.info(`Starting TradingView event stream socket for user ${msg.value.username || null}...`);
                tradingView.setTradingViewUser(msg.value);
                tradingView.toggleTradingViewListeners();
            }
        });

        port.onDisconnect.addListener((sendingPort) => {
            if (sendingPort.sender.tab.id === runningTabId) {
                runningTabId = null;
                initExtension();
            }
        });
    }
});

const setSocketStatus = (status) => {
    const isOpen = 'open' === status;
    const colorMapping = {'open': '#0F0', 'hidden': '#FF0'}
    const titleMapping = {
        'open': 'Connected to TradingConnector desktop app.',
        'hidden': 'Alerts Log is hidden... Not possible to process the alerts!'
    }

    chrome.browserAction.setBadgeBackgroundColor({color: colorMapping[status] ?? '#F00'});
    chrome.browserAction.setBadgeText({text: isOpen ? " " :"!"});
    chrome.browserAction.setTitle({
        title: titlePrefix + (titleMapping[status] ?? 'Not connected to TradingConnector desktop app!\n' +
            'Please make sure TradingConnector desktop app and ExpertAdvisor are running and refresh TradingView website.\n' +
            'If this doesn\'t help, contact the support.')
    });

    if (isOpen) {
        chrome.identity.getProfileUserInfo({accountStatus: "ANY"}, userInfo => {
            if (userInfo.email) {
                chrome.storage.sync.get('trv_mt4_paypal_subscription', result => {
                    let data = {
                        user_info: {user_email: userInfo.email, paypal_subscription: result.trv_mt4_paypal_subscription}
                    };
                    chrome.tabs.sendMessage(runningTabId, data);
                })
            }
        });
    }
};

const initExtension = (currentTabId) => {
    chrome.tabs.query({url: "https://*.tradingview.com/*"}, (tabs) => {
        if (chrome.runtime.lastError) console.warn(chrome.runtime.lastError);

        if (!runningTabId || runningTabId === currentTabId) {
            const tab = tabs.filter((tab) => tab.active)[0] || tabs[0];

            if (tab) {
                runningTabId = tab.id;
                chrome.tabs.sendMessage(runningTabId, {start: true});
            } else {
                chrome.storage.sync.remove('trdvwUser');
                setSocketStatus('close');
            }
        }
    });
};

const getAccessToken = (requestStart) => {
    chrome.identity.getAuthToken({interactive: true}, token => {
        if (chrome.runtime.lastError) {
            console.warn('Failed to fetch google chrome auth token: ', chrome.runtime.lastError);
            return;
        }

        access_token = token;
        if (runningTabId) chrome.tabs.sendMessage(runningTabId, {app_id: chrome.runtime.id, token: token});

        if (undefined !== requestStart) {
            requestStart();
        }
    });
};

const xhrWithAuth = (method, url, callback) => {
    let retry = true;

    getToken();

    function getToken() {
        getAccessToken(requestStart);
    }

    function requestStart() {
        const xhr = new XMLHttpRequest();
        xhr.open(method, url);
        xhr.setRequestHeader('Authorization', 'Bearer ' + access_token);
        xhr.onload = requestComplete;
        xhr.send();
    }

    function requestComplete() {
        if (401 == this.status && retry) {
            retry = false;
            chrome.identity.removeCachedAuthToken({token: access_token}, getToken);
        } else {
            callback(null, this.status, this.response);
        }
    }
};

const hackTradingViewStream = () => {
    const fixTVOrigin = headers => {
        if (!headers || !headers.initiator || !headers.initiator.includes(chrome.runtime.id)) {
            return {}
        }

        const requestHeaders = headers.requestHeaders.filter(header => header.name !== "Origin")
        requestHeaders.push({name: "Origin", value: "https://tradingview.com"})
        return {requestHeaders: requestHeaders}
    }
    let tryFallback = false
    try {
        chrome.webRequest.onBeforeSendHeaders.addListener(fixTVOrigin, {urls: ["https://*.tradingview.com/*"]}, ["blocking", "requestHeaders", "extraHeaders"])
    } catch(e) {
        console.error(e)
        tryFallback = true
    }
    if (tryFallback) try {
        chrome.webRequest.onBeforeSendHeaders.addListener(fixTVOrigin, {urls: ["https://*.tradingview.com/*"]}, ["blocking", "requestHeaders"])
    } catch(e) {
        console.error(e)
        log.warn("Unable to activate required workaround for TV event stream – please make sure your Chrome version is up to date and you have granted PV the necessary permissions!")
    }
}

hackTradingViewStream();
