const subscriptionIdForm = document.getElementById('subscription_id_form');
const tabChecker = chrome.runtime.connect({name: "popup"}),
    productToPaypalPlan = {
        'premium1': 'P-7PV11688BR3236543MANOSAY',
        'premium1yearly': 'P-9A7762231G453654PMANOSXY',
        'premium2': 'P-71N72439LN054844PMANOTLA',
        'premium2yearly': 'P-7LU20710TF7096448MAQYAAA',
    };

const toggleDebug = e => chrome.storage.local.set({trv_mt4_debug: e.target.checked});

const addDebugToggler = () => {
    const checkbox = document.getElementById('toggle_debug');

    getFromStorage('trv_mt4_debug', 'local').then(result => checkbox.checked = result?.trv_mt4_debug);
    checkbox.addEventListener('change', toggleDebug);
};

const saveUserSubscription = subscriptionID => chrome.storage.sync.set({trv_mt4_paypal_subscription: subscriptionID});

const initPayPalButton = (containerId, userEmail) => {
    paypal.Buttons({
        style: {
            shape: 'rect',
            color: 'black',
            layout: 'horizontal',
            label: 'subscribe'
        },
        createSubscription: (data, actions) => actions.subscription.create({
            'plan_id': productToPaypalPlan[containerId],
            'custom_id': userEmail
        }),
        onApprove: data => {
            markPurchase(data.subscriptionID, containerId)
            changeSubscription(data.subscriptionID);
        }
    }).render(`#${containerId}`)
}

function changeSubscription(licenseId, saveToStore = true) {
    if (!licenseId) return;
    if (saveToStore) saveUserSubscription(licenseId);

    markStatusSuccessful('paypal-subscription');
    document.getElementById('paypal_subscription_id').textContent = licenseId + " ";
    // document.getElementById('paypal_subscription_id').appendChild(document.createTextNode(licenseId));
    document.getElementById('paypal_subscription_id').appendChild(createReplaceButton());
}

const createReplaceButton = () => {
    const button = document.createElement('a');
    button.href = null;
    button.appendChild(document.createTextNode('replace'));
    button.addEventListener('click', showForm);

    return button;
};

const addExistingSubscription = e => {
    e.preventDefault();
    const id = subscriptionIdForm.elements['id'];

    if (id.value) {
        changeSubscription(id.value);
        id.value = null;
        subscriptionIdForm.classList.add('hidden');
    } else {
        id.classList.add('invalid');
    }
}

const markStatusSuccessful = (elementId) => {
    const statusCol = document.getElementById(`${elementId}-status`);

    statusCol.classList.remove('danger');
    statusCol.classList.add('success');
    statusCol.textContent = '✓';
}

const showForm = (e) => {
    e.preventDefault();
    subscriptionIdForm.classList.remove('hidden');
}

const setChromeUser = (user) => {
    if (!user) return;

    markStatusSuccessful('chrome-account');
    document.getElementById('chrome-account-email').textContent = user.email;
}

const setTradingViewUser = (user) => {
    if (!user) return;

    markStatusSuccessful('tradingview-account')
    document.getElementById('trdvw_user_name').textContent = user.username;
}

r(() => {
    chrome.identity.getProfileUserInfo({accountStatus: "ANY"}, userInfo => {
        if (userInfo.email) {
            setChromeUser(userInfo)
            Object.keys(productToPaypalPlan).forEach(key => initPayPalButton(key, userInfo.email));
            subscriptionIdForm.addEventListener('submit', addExistingSubscription);
            document.getElementById('add_subscription_id_form').addEventListener('click', showForm);
            getFromStorage('trv_mt4_paypal_subscription')
                .then(res => changeSubscription(res.trv_mt4_paypal_subscription, false))
        }
    });
    addDebugToggler();
    getFromStorage('trdvwUser').then(result => setTradingViewUser(result.trdvwUser))
});
