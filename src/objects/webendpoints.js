const elasticsearch = require('elasticsearch');
const stripe = require('stripe')(process.env.STRIPE_KEY);

const zcAdminClient = new elasticsearch.Client({
    host: process.env.ESCONN_ADMIN_STRING,
    log: 'error'
});

module.exports = {
    createSession: async (req) => {
        return new Promise ( async (resolve, reject) => {
            try{
                const checkoutOptions = {
                    payment_method_types: ['card'],
                    client_reference_id: req.body._id,
                    success_url: process.env.STRIPE_SUCCESS_URL,
                    cancel_url: process.env.STRIPE_CANCEL_URL
                };


                // Shape of checkout session is different for subscriptions vs. products
                // This following code requires the purchase to be either one-off or subscription,
                // NO MIXING OF THE TWO PURCHASE TYPES.
                switch (req.body._source.purchaseData.purchaseType) {
                    case 'subscription':
                        checkoutOptions.subscription_data = {
                            items: req.body._source.purchaseData.productData
                        };
                        break;
                    case 'product':
                        checkoutOptions.line_items = req.body._source.purchaseData.productData
                        break;
                    default:
                        reject( new Error('No purchaseType'));
                        break;
                }

                const session = await stripe.checkout.sessions.create(checkoutOptions);

                zcAdminClient.index ( {
                    index: process.env.STRIPE_SESSION_INDEX,
                    body: {
                        session: session,
                        purchaseRequestId: req.body._id,
                        env: process.env.NODE_INSTANCE,
                        createDate: new Date()
                    },
                    id: session.id
                })
                    .then(
                        r => {
                            return resolve(session);
                        },
                        e => {
                            return reject (e);
                        });
            }
            catch (e) {
                return reject (e);
            }
        });
    },

    getStripeSubscriptions: (req) => {
        return new Promise ( (resolve, reject) => {
            const q = {
                query: { match: { paymentReferenceId: req.body.paymentReferenceId}},
                sort: { createDate: 'asc' }
            };
            console.log(JSON.stringify(q, null, 4));

            zcAdminClient.search ( {
                index: 'pc-stripe-subscription',
                type: '_doc',
                body: q
            })
                .then(
                    r => {
                        console.log(req.body.paymentReferenceId, r.hits.hits.length);
                        return resolve(r);
                    },
                    e => {
                        return reject (e);
                    });
        });
    },

    getSubcriptionPaymentHistory: (req) => {
        return new Promise ( (resolve, reject) => {
            const q = {
                query: {
                    bool: {
                        must: [
                            { "term": {"subscription": req.body.subscriptionId}},
                            { "term": {"webhookInfo.type": "invoice.payment_succeeded"}}
                        ]
                    }
                },
                sort: { createDate: 'asc' }
            };
            console.log(JSON.stringify(q, null, 4));

            zcAdminClient.search ( {
                index: 'pc-stripe-webhook',
                type: '_doc',
                body: q
            })
                .then(
                    r => {
                        console.log(req.body.paymentReferenceId, r.hits.hits.length);
                        return resolve(r);
                    },
                    e => {
                        return reject (e);
                    });
        });
    },

    getSession: (req) => {
        return new Promise ( (resolve, reject) => {
            zcAdminClient.get ( {
                index: 'pc-stripe-session',
                type: '_doc',
                id: req.body.sessionId
            })
                .then(
                    r => {
                        return resolve(r);
                    },
                    e => {
                        return reject (e);
                    });
        });
    },

    getPayments: (req) => {
        return new Promise ( (resolve, reject) => {
            const query = {
                query: {
                    match: { pc_payment_setup_id: req.body.paymentReferenceId}
                }
            };

            zcAdminClient.search ( {
                index: 'pc-payment',
                type: '_doc',
                body: query
            })
                .then(
                    r => {
                        return resolve(r);
                    },
                    e => {
                        return reject (e);
                    });
        });
    },

    savePurchaseRequest: (req) => {
        return new Promise ( (resolve, reject) => {
            const options = {
                index: process.env.STRIPE_PURCHASE_REQUEST_INDEX,
                body: req.body._source
            };

            // With this check, this code can create and update
            if ('_id' in req.body) {
                options.id = req.body._id;
            }

            zcAdminClient.index ( options )
                .then(
                    r => {
                        return resolve(r);
                        },
                    e => {
                        return reject (e);
                    });
        });
    }
};

const delay = (ms) => {
    return new Promise ( (resolve, reject) => {
        setTimeout( () => {return resolve();}, ms);
    });
};
