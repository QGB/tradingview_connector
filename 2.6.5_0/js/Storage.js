window.STORAGE = {
    local: {},
    sync: {},
}

function StorageInternal(storageArea) {
    storageArea = storageArea || "sync"

    function assignDeep(target, ...args) {
        const isObject = (o) => typeof o === "function" || Object.prototype.toString.call(o) === "[object Object]"
        const isPrimitive = (o) => typeof o === "object" ? o === null : typeof o !== "function"
        const isValidKey = (key) => key !== "__proto__" && key !== "constructor" && key !== "prototype"

        if (isPrimitive(target)) {
            target = args.shift()
        }
        if (!target) {
            target = {}
        }
        for (let i = 0; i < args.length; i++) {
            const value = args[i]
            if (isObject(value)) {
                const keys = Object.keys(value)
                for (let j = 0; j < keys.length; j++) {
                    const key = keys[j]
                    if (isValidKey(key)) {
                        if (isObject(target[key]) && isObject(value[key])) {
                            target[key] = assignDeep(target[key], value[key])
                        } else {
                            target[key] = value[key]
                        }
                    }
                }
            }
        }

        return target
    }

    return {
        clearStorage: function () {
            window.STORAGE[storageArea] = {
                updated: Date.now(),
            }
        },
        getStorageValue: function (...keys) {
            // Load existing
            const storage = window.STORAGE[storageArea] || {}
            storage.updated = storage.updated || Date.now()
            // Find desired leaf
            return getObjectStack(storage, ...keys)
        },
        removeStorageValue: function (...keys) {
            // Load existing
            let storage = this.getStorageValue()
            // Remove desired leaf
            removeObjectStack(storage, ...keys)
            storage.updated = Date.now()
        },
        setStorageValue: function (...keysEndWithValue) {
            // Load existing
            let storage = this.getStorageValue()
            // Merge new value
            const append = setObjectStack(...keysEndWithValue)
            storage = assignDeep({}, storage, append)
            storage.updated = Date.now()
            // Store new data
            window.STORAGE[storageArea] = storage
        },
    }
}
