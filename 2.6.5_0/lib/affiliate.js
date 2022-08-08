const url = 'https://www.affiliatly.com/api_request.php?aid=AF-1029679',
    id_affiliatly = 'AF-1029679',
    productToPaypalPrice = {
        'premium1': 14.99,
        'premium1yearly': 49.99,
        'premium2': 149.99,
        'premium2yearly': 499.99,
    };

const sendMarkRequest = (post_data) => {
    const request = new XMLHttpRequest();

    request.open('POST', url + '&t=' + new Date().getTime(), true);
    request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    request.send(post_data);
};

const markPurchase = (order, plan) => {
    const price = productToPaypalPrice[plan] || 14.99;

    chrome.cookies.get({url: 'https://www.tradingconnector.com', name: 'affiliatly_v3'}, (item) => {
        if (item) {
            const data = item.value;
            let aff_uid = data.match(/&aff_uid=([0-9]+)/),
                id_user = data.match(/&id_user=([0-9]+)/),
                id_hash = data.match(/id_token=(\w+)/);

            if (aff_uid[1]) aff_uid = aff_uid[1];
            if (id_user[1]) id_user = id_user[1];
            if (id_hash[1]) id_hash = id_hash[1];


            if (aff_uid && id_user && id_hash) {
                const post_data = 'mode=mark&id_affiliatly=' + id_affiliatly + '&id_user=' + id_user
                    + '&id_hash=' + id_hash + '&aff_uid=' + aff_uid + '&order=' + order + '&price=' + price;

                sendMarkRequest(post_data);
            }
        }
    });
};
