
var request = require("request");

var tokenTMAuth0MgmtAPI;
var tokenTMAuth0MgmtAPIDateTime;
var tokenAuth0AuthExtension;
var tokenAuth0AuthExtensionDateTime;

module.exports = {

    getUser: (req) => {
        return new Promise ( async (resolve, reject) => {
            try {
                const token = await getTokenTMAuth0MgmtAPI();

                var options = { method: 'GET',
                    url: process.env.AUTH0_DOMAIN + '/api/v2/users/' + req.body.auth0_sub_id,
                    headers: { authorization: 'Bearer ' + token.access_token }
                };

                request(options, function (error, response, body) {
                    if (error) { return reject(error); }

                    if (body.statusCode && body.statusCode != 200) { return reject(body); }

                    return resolve(body);
                });
            } catch (e) {
                return reject (e);
            }
        });
    },

    setUsersStripeCustomerId: (params) => {
        return new Promise ( async (resolve, reject) => {
            try {
                // Only top-level values of app_metadata are merged
                // Get current value and merge manually
                const user = JSON.parse(await module.exports.getUser({body: { auth0_sub_id: params.auth0_sub_id }}));

                const token = await getTokenTMAuth0MgmtAPI();

                let stripeCustomerIds = [];
                if (user.app_metadata) {
                    if (user.app_metadata.stripe_customer_ids) {
                        stripeCustomerIds = user.app_metadata.stripe_customer_ids;
                    }
                }

                if (stripeCustomerIds.indexOf(params.stripe_customer_id) > -1) {
                    return resolve(user);
                }

                stripeCustomerIds.unshift(params.stripe_customer_id);

                const userUpdateBody = { app_metadata: {stripe_customer_ids: stripeCustomerIds} };

                var options = { method: 'PATCH',
                    url: process.env.AUTH0_DOMAIN + '/api/v2/users/' + params.auth0_sub_id,
                    body: userUpdateBody,
                    headers: {
                        authorization: 'Bearer ' + token.access_token,
                        'content-type': 'application/json'
                    },
                    json: true
                };

                request(options, function (error, response, body) {
                    if (error) { return reject(error); }

                    if (body.statusCode && body.statusCode != 200) { return reject(body); }

                    return resolve(body);
                });
            } catch (e) {
                return reject (e);
            }
        });
    }
};

function getTokenTMAuth0MgmtAPI() {
    return new Promise(function (resolve, reject) {
        if (tokenTMAuth0MgmtAPI) {
            if (Date.now() - tokenTMAuth0MgmtAPIDateTime < 600000) {
                return resolve(tokenTMAuth0MgmtAPI);
            }
        }

        var options = {
            method: 'POST',
            url:  process.env.AUTH0_DOMAIN + '/oauth/token',
            headers: { 'content-type': 'application/json' },
            body: {
                client_id: process.env.AUTH0_MGMT_APPLICATION_CLIENT_ID,
                client_secret: process.env.AUTH0_MGMT_APPLICATION_CLIENT_SECRET,
                audience: process.env.AUTH0_DOMAIN + '/api/v2/',
                grant_type: "client_credentials"
            },
            json: true
        };

        request(options, function (error, response, body) {
            if (error) {
                return reject(error);
            }

            else if ('statusCode' in response && response.statusCode !== 200) {
                const e = new Error('Auth0 Error: ' + response.body.error_description);
                e.data = response.body;
                e.statusCode = response.statusCode;
                return reject (e);
            }

            tokenTMAuth0MgmtAPIDateTime = Date.now();
            tokenTMAuth0MgmtAPI = body;
            return resolve(body);
        });
    });
}
