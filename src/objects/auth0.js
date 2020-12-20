
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

                const url = 'https://' + process.env.AUTH0_DOMAIN + '/api/v2/users/' + req.body.auth0_sub_id;

                var options = { headers: { authorization: 'Bearer ' + token.access_token } };

                const response = await got.get(url, options);

                if (body.statusCode && body.statusCode != 200) { return reject(body); }

                return resolve(body);
            } catch (e) {
                return reject (e);
            }
        });
    },

    searchUser: (params) => {
        return new Promise ( async ( resolve, reject ) => {
            const token = await getTokenTMAuth0MgmtAPI();

            var options = { method: 'GET',
                url: 'https://' + process.env.AUTH0_DOMAIN + '/api/v2/users',
                qs:  {q: params.search_field + ':"' + params.search_value + '"', search_engine: 'v3'},
                headers: { authorization: 'Bearer ' + token.access_token }
            };

            request(options, function (error, response, body) {
                if (error) { return reject(error); }

                if (body.statusCode && body.statusCode != 200) { return reject(body); }

                return resolve(body);
            });
        });
    },

    setUsersStripeCustomerId: (params) => {
        return new Promise ( async (resolve, reject) => {
            try {
                // Only top-level values of app_metadata are merged
                // Get current value and merge manually
                const user = JSON.parse(await module.exports.getUser({body: { auth0_sub_id: params.auth0_sub_id }}));

                const token = await getTokenTMAuth0MgmtAPI();

                if (user.app_metadata) {
                    if (user.app_metadata.stripe_customer_id) {
                        console.log('Customer aready has stripe_customer_id', JSON.stringify(params));
                    }
                }

                const userUpdateBody = { app_metadata: {stripe_customer_id: params.stripe_customer_id} };

                var options = { method: 'PATCH',
                    url: 'https://' + process.env.AUTH0_DOMAIN + '/api/v2/users/' + params.auth0_sub_id,
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
    },

    setUserAppMetadata: (params) => {
        return new Promise ( async ( resolve, reject ) => {
            try {
                // Only top-level values of app_metadata are merged
                // Get current value and merge manually
                let user;
                if ('auth0_sub_id' in params) {
                    user = JSON.parse(await module.exports.getUser({body: { auth0_sub_id: params.auth0_sub_id }}));
                } else {
                    const users = JSON.parse(await module.exports.searchUser(params));
                    if (users.length > 1) { return reject( new Error ('Too many users match criteria.')); }
                    if (users.length < 1) { return reject( new Error ('Too few users match criteria.')); }
                    user = users[0];
                }

                const token = await getTokenTMAuth0MgmtAPI();

                console.log('user.app_metadata');
                console.log(JSON.stringify(user.app_metadata, null, 4));

                user.app_metadata[params.app_metadata_var_name] = params.app_metadata_var_value;

                var options = {
                    method: 'PATCH',
                    url: 'https://' + process.env.AUTH0_DOMAIN + '/api/v2/users/' + user.user_id,
                    body: { app_metadata: user.app_metadata },
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
        })
    },

    setUserRoles: (params) => {
        return new Promise ( async (resolve, reject) => {
            const token = await getTokenTMAuth0MgmtAPI();

            var options = { method: 'POST',
                url: 'https://' + process.env.AUTH0_DOMAIN + '/api/v2/users/' + params.auth0_sub_id + '/roles',
                headers: { authorization: 'Bearer ' + token.access_token },
                body: {
                    roles: params.roles
                },
                json: true
            };

            request(options, (error, response) => {
                if (error) { return reject(error); }

                // Correct response code is 204, but accept all 200s
                if (response.statusCode && (response.statusCode < 200 || response.statusCode >=300)) { return reject(body); }

                return resolve(response);
            });
        });
    },

    removeUserRoles: (params) => {
        return new Promise ( async (resolve, reject) => {
            const token = await getTokenTMAuth0MgmtAPI();

            var options = { method: 'DELETE',
                url: 'https://' + process.env.AUTH0_DOMAIN + '/api/v2/users/' + params.auth0_sub_id + '/roles',
                headers: { authorization: 'Bearer ' + token.access_token },
                body: {
                    roles: params.roles
                },
                json: true
            };

            request(options, (error, response) => {
                if (error) { return reject(error); }

                // Correct response code is 204, but accept all 200s
                if (response.statusCode && (response.statusCode < 200 || response.statusCode >=300)) { return reject(body); }

                return resolve(response);
            });
        });
    },

    getUserRole: (params) => {
        return new Promise ( (resolve, reject) => {
            return resolve({});
        });
    }
};

function getTokenTMAuth0MgmtAPI() {
    return new Promise(async (resolve, reject) => {
        try {
            if (tokenTMAuth0MgmtAPI) {
                if (Date.now() - tokenTMAuth0MgmtAPIDateTime < 600000) {
                    return resolve(tokenTMAuth0MgmtAPI);
                }
            }

            const url = 'https://' + process.env.AUTH0_DOMAIN + '/oauth/token';

            var options = {
                headers: { 'content-type': 'application/json' },
                json: {
                    client_id: process.env.AUTH0_MGMT_APPLICATION_CLIENT_ID,
                    client_secret: process.env.AUTH0_MGMT_APPLICATION_CLIENT_SECRET,
                    audience: 'https://' + process.env.AUTH0_DOMAIN + '/api/v2/',
                    grant_type: "client_credentials"
                },
                responseType: 'json'
            };

            const response = await got.post(url, options);

            if (response.statusCode && response.statusCode !== 200) {
                return reject(response.body);
            }

            tokenTMAuth0MgmtAPIDateTime = new Date();
            tokenTMAuth0MgmtAPI = response.body;

            return resolve(response.body);

        } catch (e) {
            return reject (e);
        }

    });
}
