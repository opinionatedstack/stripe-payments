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
                    client_reference_id: req.body.auth0UserSub,
                    customer: req.body.stripe_customer_id,
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
                        env: process.env.NODE_INSTANCE,
                        createDate: new Date(),
                        ... req.body
                    }
                );

                return resolve (mongoDbResult.ops[0]);
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
        return new Promise ( async (resolve, reject) => {
            try {
                const mdbR = await mongoDb.db.collection(process.env.STRIPE_SESSION_INDEX).find({ _id: req.body.sessionId }).toArray();

                return resolve (mdbR);
            } catch (e) {
                return reject (e);
            }
        });
    },

    getPayments: (req) => {
        return new Promise ( async (resolve, reject) => {
            try {
                const searchCriteria = { completed: true };
                if ('user_id' in req.body) { searchCriteria.auth0UserSub = req.body.user_id; }

                const mdbR = await mongoDb.db.collection(process.env.PURCHASE_INDEX).find(searchCriteria).toArray();

                return resolve (mdbR);
            } catch (e) {
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
    },

    sessionCompleted: (req) => {
        return new Promise ( async (resolve, reject) => {
            const mdbSession = await mongoDb.db.collection(process.env.STRIPE_SESSION_INDEX).findOne({ _id: req.body.sessionId });

            if (!mdbSession) { throw Error('Webhook checkoutSessionCompleted session id not found'); }

            const updateObject = {
                completed: true
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
    },

    getCompletedSessionsByAuth0UserId: (req) => {
        return new Promise ( async (resolve, reject) => {
            try {
                const resultsObj = await mongoDb.db.collection(process.env.STRIPE_SESSION_INDEX).find({
                    auth0UserSub: req.body.user_id,
                    completed: true
                })
                    .skip(req.body.from)
                    .limit(req.body.size)
                    .sort({createDate: -1}); // -1 = descending, 1 = ascending

                const resultsArray = [resultsObj.count(), resultsObj.toArray()];
                const promiseResults = await Promise.all(resultsArray);

                return resolve ({ total: promiseResults[0], records: promiseResults[1] });
            } catch (e) {
                return reject (e);
            }
        });
    },

    getPaymentsBySubscriptionId: (req) => {
        return new Promise ( async (resolve, reject) => {
            try {
                const resultsObj = await mongoDb.db.collection(process.env.STRIPE_PAYMENT_INDEX).find({
                    subscription: req.body.subscriptionId
                })
                    .skip(req.body.from)
                    .limit(req.body.size)
                    .sort({createDate: -1});

                const resultsArray = [resultsObj.count(), resultsObj.toArray()];
                const promiseResults = await Promise.all(resultsArray);

                return resolve ({ total: promiseResults[0], records: promiseResults[1] });
            } catch (e) {
                return reject (e);
            }
        });
    },

    getSubscriptionById: (req) => {
        return new Promise ( async (resolve, reject ) => {
            try {
                const data = await stripe.subscriptions.retrieve( req.body.stripeSubscriptionId);
                return resolve (data);
            } catch (e) {
                return reject (e);
            }
        })
    },

    getPlanById: (req) => {
        return new Promise ( async (resolve, reject ) => {
            try {
                const data = await stripe.plans.retrieve( req.body.planId);
                return resolve (data);
            } catch (e) {
                return reject (e);
            }
        })
    },

    getProductById: (req) => {
        return new Promise ( async (resolve, reject ) => {
            try {
                const data = await stripe.products.retrieve( req.body.productId);
                return resolve (data);
            } catch (e) {
                return reject (e);
            }
        })
    },

    getCustomerById: (req) => {
        return new Promise ( async (resolve, reject ) => {
            try {
                console.log(req.body.stripeCustomerId);
                const data = await stripe.customers.retrieve( req.body.stripeCustomerId);
                return resolve (data);
            } catch (e) {
                return reject (e);
            }
        })
    },

    getSubscriptionsByCustomerId: (req) => {
        return new Promise ( async (resolve, reject ) => {
            try {
                const params = {
                    customer: req.body.stripeCustomerId,
                    limit: req.body.size,
                    status: 'all'
                };

                // Pagination at Stripe is based on objectIDs, not counts.
                // Therefore it cannot be passed in on the first page.
                if ('starting_after' in req.body ) { params.starting_after = req.body.starting_after; }

                const data = await stripe.subscriptions.list( params );
                return resolve (data);
            } catch (e) {
                return reject (e);
            }
        })
    },

    getInvoiceList: (req) => {
        return new Promise ( async (resolve, reject ) => {
            try {
                const params = { limit: req.body.size };

                // Pagination at Stripe is based on objectIDs, not counts.
                // Therefore it cannot be passed in on the first page.
                if ('starting_after' in req.body ) { params.starting_after = req.body.starting_after; }

                if ('stripeCustomerId' in req.body) { params.customer = req.body.stripeCustomerId; }
                if ('stripeSubscriptionId' in req.body) { params.subscription = req.body.stripeSubscriptionId; }

                const data = await stripe.invoices.list( params );
                return resolve (data);
            } catch (e) {
                return reject (e);
            }
        })
    },

    cancelSubscription: (req) => {
        return new Promise ( async (resolve, reject ) => {
            try {
                const data = await stripe.subscriptions.del( req.body.stripeSubscriptionId);
                return resolve (data);
            } catch (e) {
                return reject (e);
            }
        })
    }

};

const delay = (ms) => {
    return new Promise ( (resolve, reject) => {
        setTimeout( () => {return resolve();}, ms);
    });
};
