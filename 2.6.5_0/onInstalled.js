chrome.runtime.onInstalled.addListener((details) => {
    if ('install' === details.reason) {
        chrome.storage.local.set({trv_mt4_install_time: Date.now()});
    }
});
