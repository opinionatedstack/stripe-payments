// Infrastructure Objects
const elasticsearch = require('elasticsearch');
const stripe = require('stripe')(process.env.STRIPE_KEY);
const asyncPackage = require ('async');
const mongoDb = require ('./paymentsMongoDb');
const ObjectID = require('mongodb').ObjectID;

// Project Objects
const auth0 = require ('./auth0');

module.exports = {
    createSession: async (params) => {
        return new Promise ( async (resolve, reject) => {
            try{
                const checkoutOptions = {
                    payment_method_types: ['card'],
                    client_reference_id: params.auth0UserSub,
                    customer: params.stripe_customer_id,
                    success_url: process.env.STRIPE_SUCCESS_URL,
                    cancel_url: process.env.STRIPE_CANCEL_URL,
                    subscription_data: {
                        items: [ { plan: params.plan_id } ]
                    }
                };

                const session = await stripe.checkout.sessions.create(checkoutOptions);

                //console.log('create.session');
                //console.log(JSON.stringify(session, null, 4));


                const mongoDbResult = await mongoDb.db.collection(process.env.STRIPE_SESSION_INDEX).insertOne(
                    {
                        _id: session.id,
                        session: session,
                        env: process.env.NODE_INSTANCE,
                        createDate: new Date(),
                        ... params
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

    getSession: (params) => {
        return new Promise ( async (resolve, reject) => {
            try {
                const mdbR = await mongoDb.db.collection(process.env.STRIPE_SESSION_INDEX).find({ _id: params.sessionId }).toArray();

                return resolve (mdbR);
            } catch (e) {
                return reject (e);
            }
        });
    },

    sessionCancelled: (params) => {
        return new Promise ( async (resolve, reject) => {
            const mdbSession = await mongoDb.db.collection(process.env.STRIPE_SESSION_INDEX).findOne({ _id: params.sessionId });

            if (!mdbSession) { throw Error('Webhook checkoutSessionCompleted session id not found'); }

            const updateObject = {
                completed: false,
                cancelled: true
            };

            if ('sessionCancelledReason' in params) {
                updateObject.sessionCancelledReason = params.sessionCancelledReason;
            }

            const mdbSessionUpdate = await mongoDb.db.collection(process.env.STRIPE_SESSION_INDEX).updateOne({ _id: params.sessionId }, {
                $set: updateObject
            });

            const purchaseRequestUpdate = await mongoDb.db.collection(process.env.PURCHASE_INDEX).updateOne({ _id: mdbSession.purchaseRequestId }, {
                $set: updateObject
            });

            return resolve ({});
        });
    },

    sessionCompleted: (params) => {
        return new Promise ( async (resolve, reject) => {
            const mdbSession = await mongoDb.db.collection(process.env.STRIPE_SESSION_INDEX).findOne({ _id: params.sessionId });

            if (!mdbSession) { throw Error('Webhook checkoutSessionCompleted session id not found'); }

            const updateObject = {
                completed: true
            };

            if ('sessionCancelledReason' in params) {
                updateObject.sessionCancelledReason = params.sessionCancelledReason;
            }

            const mdbSessionUpdate = await mongoDb.db.collection(process.env.STRIPE_SESSION_INDEX).updateOne({ _id: params.sessionId }, {
                $set: updateObject
            });

            const purchaseRequestUpdate = await mongoDb.db.collection(process.env.PURCHASE_INDEX).updateOne({ _id: mdbSession.purchaseRequestId }, {
                $set: updateObject
            });

            return resolve ({});
        });
    },

    getCompletedSessionsByAuth0UserId: (params) => {
        return new Promise ( async (resolve, reject) => {
            try {
                const resultsObj = await mongoDb.db.collection(process.env.STRIPE_SESSION_INDEX).find({
                    auth0UserSub: params.user_id,
                    completed: true
                })
                    .skip(params.from)
                    .limit(params.size)
                    .sort({createDate: -1}); // -1 = descending, 1 = ascending

                const resultsArray = [resultsObj.count(), resultsObj.toArray()];
                const promiseResults = await Promise.all(resultsArray);

                return resolve ({ total: promiseResults[0], records: promiseResults[1] });
            } catch (e) {
                return reject (e);
            }
        });
    },

    getPaymentsBySubscriptionId: (params) => {
        return new Promise ( async (resolve, reject) => {
            try {
                const resultsObj = await mongoDb.db.collection(process.env.STRIPE_PAYMENT_INDEX).find({
                    subscription: params.subscriptionId
                })
                    .skip(params.from)
                    .limit(params.size)
                    .sort({createDate: -1});

                const resultsArray = [resultsObj.count(), resultsObj.toArray()];
                const promiseResults = await Promise.all(resultsArray);

                return resolve ({ total: promiseResults[0], records: promiseResults[1] });
            } catch (e) {
                return reject (e);
            }
        });
    },

    getSubscriptionById: (params) => {
        return new Promise ( async (resolve, reject ) => {
            try {
                const data = await stripe.subscriptions.retrieve( params.stripeSubscriptionId);
                return resolve (data);
            } catch (e) {
                return reject (e);
            }
        });
    },

    getPlanById: (params) => {
        return new Promise ( async (resolve, reject ) => {
            try {
                const data = await stripe.plans.retrieve( params.planId);
                return resolve (data);
            } catch (e) {
                return reject (e);
            }
        });
    },

    getProductById: (params) => {
        return new Promise ( async (resolve, reject ) => {
            try {
                const data = await stripe.products.retrieve( params.productId);
                return resolve (data);
            } catch (e) {
                return reject (e);
            }
        });
    },

    getCustomerById: (params) => {
        return new Promise ( async (resolve, reject ) => {
            try {
                console.log(params.stripeCustomerId);
                const data = await stripe.customers.retrieve( params.stripeCustomerId);
                return resolve (data);
            } catch (e) {
                return reject (e);
            }
        });
    },

    getSubscriptionsByCustomerId: (params) => {
        return new Promise ( async (resolve, reject ) => {
            try {
                const stripeParams = {
                    customer: params.stripeCustomerId,
                    limit: params.size,
                    status: params.status ? params.status : 'all'
                };

                // Pagination at Stripe is based on objectIDs, not counts.
                // Therefore it cannot be passed in on the first page.
                if ('starting_after' in params ) { params.starting_after = params.starting_after; }

                const data = await stripe.subscriptions.list( stripeParams );
                return resolve (data);
            } catch (e) {
                return reject (e);
            }
        });
    },

    getInvoiceList: (params) => {
        return new Promise ( async (resolve, reject ) => {
            try {
                const stripeParams = { limit: params.size };

                // Pagination at Stripe is based on objectIDs, not counts.
                // Therefore it cannot be passed in on the first page.
                if ('starting_after' in params ) { stripeParams.starting_after = params.starting_after; }

                if ('stripeCustomerId' in params) { stripeParams.customer = params.stripeCustomerId; }
                if ('stripeSubscriptionId' in params) { stripeParams.subscription = params.stripeSubscriptionId; }

                const data = await stripe.invoices.list( stripeParams );
                return resolve (data);
            } catch (e) {
                return reject (e);
            }
        });
    },

    cancelSubscription: (params) => {
        return new Promise ( async (resolve, reject ) => {
            try {
                const data = await stripe.subscriptions.del( params.stripeSubscriptionId );
                return resolve (data);
            } catch (e) {
                return reject (e);
            }
        });
    },

    getBillingProductsPlans: (params) => {
        // This returns only active billing products with active plans
        return new Promise ( async (resolve, reject) => {
            try {
                const stripeParams = { limit: params.size };

                const data = await stripe.products.list( stripeParams );

                const pricingPlanParams = { limit: 100 };

                asyncPackage.mapLimit(data.data, 1, async product => { // <- no callback!
                    const pricingPlanParams = {
                        limit: 100, // if you have more than this, this needs rethinking. For now, UI forsees two or three plans
                        product: product.id
                    };

                    if (product.type === 'good') {
                        return product;
                    }
                    else {
                        const plans = await stripe.plans.list(pricingPlanParams);
                        product.plans = plans.data;
                        return product;
                    }
                }, (err, contents) => {
                    if (err) throw err;

                    const productsWithPlans = contents.filter( products => {
                        if (!('plans' in products)) { return false; }
                        return (products.plans.length > 0);
                    });

                    //console.log (JSON.stringify(productsWithPlans, null, 4));

                    return resolve (productsWithPlans);
                });
            } catch (e) {
                return reject (e);
            }
        });
    },

    createCustomer: (params) => {
        return new Promise ( async (resolve, reject) => {
            try {
                const stripeParams = {
                    // Email used in Stripe to display and search for customers
                    // To prevent them from becoming disaligned, save auth0UserId instead
                    email: params.email,
                    metadata: {
                        auth0_user_sub: params.auth0UserSub
                    }
                };

                const data = await stripe.customers.create( stripeParams );
                const auth0UserUpdateResult = await auth0.setUsersStripeCustomerId({
                    auth0_sub_id: params.auth0UserSub,
                    stripe_customer_id: data.id
                } );

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
