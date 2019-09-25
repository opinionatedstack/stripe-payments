const elasticsearch = require('elasticsearch');
const stripe = require('stripe')(process.env.STRIPE_KEY);

/*
const zcAdminClient = new elasticsearch.Client({
    host: process.env.ESCONN_ADMIN_STRING,
    log: 'error'
});
*/

const mongoDb = require ('./paymentsMongoDb');
const ObjectID = require('mongodb').ObjectID;

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
                switch (req.body.purchaseData.purchaseType) {
                    case 'subscription':
                        checkoutOptions.subscription_data = {
                            items: req.body.purchaseData.productData
                        };
                        break;
                    case 'product':
                        checkoutOptions.line_items = req.body.purchaseData.productData;
                        break;
                    default:
                        reject( new Error('No purchaseType'));
                        break;
                }

                const session = await stripe.checkout.sessions.create(checkoutOptions);

                const mongoDbResult = await mongoDb.db.collection(process.env.STRIPE_SESSION_INDEX).insertOne(
                    {
                        _id: session.id,
                        session: session,
                        purchaseRequestId: new ObjectID(req.body._id),
                        env: process.env.NODE_INSTANCE,
                        createDate: new Date()
                    }
                );
/*
                const elasticsearchResult = await zcAdminClient.index ( {
                    index: process.env.STRIPE_SESSION_INDEX,
                    body: {
                        session: session,
                        purchaseRequestId: req.body._id,
                        env: process.env.NODE_INSTANCE,
                        createDate: new Date()
                    },
                    id: session.id
                });
*/
                return resolve (session);
            }
            catch (e) {
                console.log(e);
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
        return new Promise ( async (resolve, reject) => {
            try {
                /*
                // ES Code

                onst options = {
                    index: process.env.PURCHASE_INDEX,
                    body: req.body._source
                };

                // With this check, this code can create and update
                if ('_id' in req.body) {
                    options.id = req.body._id;
                }

                const esR = await zcAdminClient.index ( options );

                req.body._source._id = esR._id;
                 */

                // MongoDb Code
                const mdbR = await mongoDb.db.collection(process.env.PURCHASE_INDEX).insertOne (req.body);

                return resolve(req.body);
            }
            catch (e) {
                return reject (e);
            }
        });
    },

    sessionCancelled: (req) => {
        return new Promise ( async (resolve, reject) => {
            const mdbSession = await mongoDb.db.collection(process.env.STRIPE_SESSION_INDEX).findOne({ _id: req.body.sessionId });

            if (!mdbSession) { throw Error('Webhook checkoutSessionCompleted session id not found'); }

            const updateObject = {
                completed: false,
                cancelled: true
            };

            if ('sessionCancelledReason' in req.body) {
                updateObject.sessionCancelledReason = req.body.sessionCancelledReason;
            }

            const mdbSessionUpdate = await mongoDb.db.collection(process.env.STRIPE_SESSION_INDEX).updateOne({ _id: req.body.sessionId }, {
                $set: updateObject
            });

            const purchaseRequestUpdate = await mongoDb.db.collection(process.env.PURCHASE_INDEX).updateOne({ _id: mdbSession.purchaseRequestId }, {
                $set: updateObject
            });

            return resolve ({});
        });
    }
};

const delay = (ms) => {
    return new Promise ( (resolve, reject) => {
        setTimeout( () => {return resolve();}, ms);
    });
};
