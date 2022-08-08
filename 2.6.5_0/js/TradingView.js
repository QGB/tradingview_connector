function TradingView() {
    let state = {
        dispatcher: null,
        permissions: {
            origins: [
                "https://*.tradingview.com/*"
            ]
        },
        sockets: {},
    }

    function createAccount(o) {
        o = o || {}
        const channel = o.channel || null
        const enabled = channel !== null
        const id = o.id || 0
        const username = o.username || null
        const userpic = o.userpic || null
        return {
            channel,
            enabled,
            id,
            username,
            userpic
        }
    }

    function createSocket(channel) {
        const socket = new EventSource(`https://pushstream.tradingview.com/message-pipe-es/public/private_${channel}?_=${Date.now()}`);
        socket.onmessage = (e) => {
            const data = safeJSON(e.data)
            const response = safeJSON(data.text.content)

            if (data.channel === "private_" + channel) {
                const payload = {
                    alert: response.p || {},
                    method: response.m
                }

                if (!state.dispatcher) {
                    throw new Error("Listener Dispatcher is not configured")
                }
                state.dispatcher(payload)
            }
        }
        return socket
    }


    return Object.assign(
        {},
        StorageInternal("sync"),
        {
            getTradingViewAccounts: function () {
                const storage = this.getStorageValue("TRADINGVIEW") || {}
                return Object.values(storage)
            },
            removeTradingViewAccount: function (id) {
                this.removeStorageValue("TRADINGVIEW", id)
            },
            setListenerDispatcher: function (dispatcher) {
                state.dispatcher = dispatcher
            },
            setTradingViewUser: function (user) {
                const updated = createAccount(user)
                const current = this.getStorageValue("TRADINGVIEW", updated.id) || {}
                const account = {
                    channel: updated.channel || current.channel,
                    enabled: true,
                    id: current.hasOwnProperty("id") ? current.id : updated.id,
                    username: updated.username || current.username,
                    userpic: updated.userpic || current.userpic,
                }
                if (account.id > 0) {
                    this.setStorageValue("TRADINGVIEW", account.id, account)
                    chrome.storage.sync.set({'trdvwUser': account})
                }

                const legacyChannel = this.getStorageValue("TRADINGVIEW", -1, "channel")
                if (legacyChannel === account.channel) {
                    this.removeTradingViewAccount(-1)
                }
            },
            toggleTradingViewListeners: async function () {
                const accounts = this.getTradingViewAccounts()
                for (const { id, channel, enabled, } of accounts) {
                    const socket = state.sockets.hasOwnProperty(id) ? state.sockets[id] : null
                    if (channel && enabled && !socket) {
                        state.sockets[id] = createSocket(channel)
                    }
                    if ((!channel || !enabled) && socket) {
                        delete state.sockets[id]
                        socket.setConfig("reconnect", false)
                        socket.close()
                    }
                }
            },
        },
    )
}
