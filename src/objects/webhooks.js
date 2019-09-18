const elasticsearch = require('elasticsearch');
const stripe = require('stripe')(process.env.STRIPE_KEY);

const zcAdminClient = new elasticsearch.Client({
    host: process.env.ESCONN_ADMIN_STRING,
    log: 'error'
});

module.exports = {
    webhook: (req) => {
        return new Promise ( async (resolve, reject ) => {

            console.log(req.body.type);
            const webhook = req.body;
            webhook.createDate = new Date();
            const webhookIndexResult = await zcAdminClient.index ( {
                index: process.env.STRIPE_WEBHOOK_INDEX,
                body: webhook
            });

            var webhookDataObject = webhook.data.object;
            webhookDataObject.createDate = webhook.createDate;

            switch (webhook.type) {
                case 'customer.subscription.created':

                    const sub = await zcAdminClient.index ( {
                        index: process.env.STRIPE_SUBSCRIPTION_INDEX,
                        id: webhookDataObject.id,
                        body: webhookDataObject,
                        refresh: true
                    });

                    break;
                case 'checkout.session.completed':

                    const sessionUpdate = await zcAdminClient.update ( {
                        index: process.env.STRIPE_SESSION_INDEX,
                        id: webhookDataObject.id,
                        retry_on_conflict: 5,
                        body: {
                            script : {
                                source: 'ctx._source.paymentReferenceId = params.paymentReferenceId;' +
                                    'ctx._source.env = params.env;' +
                                    'ctx._source.session.subscription = params.subscription;' +
                                    'ctx._source.session.customer = params.customer;' +
                                    'ctx._source.checkoutSessionCompletedWebhookInfo= params.WHInfo',
                                lang: 'painless',
                                params: {
                                    paymentReferenceId: paymentReferenceId,
                                    env: env,
                                    WHInfo: webhookDataObject.webhookInfo,
                                    subscription: webhookDataObject.subscription,
                                    customer: webhookDataObject.customer
                                }
                            }
                        }
                    });

                    const query = {
                        query: {
                            match: {
                                paymentReferenceId: paymentReferenceId
                            }
                        }
                    };

                    const preUpdatePaymentSetups = await zcAdminClient.search ( {
                        index: process.env.STRIPE_PURCHASE_REQUEST_INDEX,
                        body: query
                    });
                    const perUpdatePaymentSetup = preUpdatePaymentSetups.hits.hits[0];

                    const queryUpdate = {
                        query: {
                            match: {
                                paymentReferenceId: paymentReferenceId
                            }
                        },
                        script: {
                            source: 'ctx._source.stripeSubscriptionId=params.subscription;' +
                                'ctx._source.stripeCustomerId=params.customer',
                            lang: "painless",
                            params: {
                                subscription: webhookDataObject.subscription,
                                customer: webhookDataObject.customer
                            }
                        }
                    };

                    const resultUpdateByQuery = await zcAdminClient.updateByQuery ( {
                        index: process.env.STRIPE_PURCHASE_REQUEST_INDEX,
                        wait_for_completion: true,
                        body: query
                    });

                    return resolve (resultUpdateByQuery);

                    break;
                case 'invoice.payment_succeeded':

                    await delay(3000);

                    const pob = {
                        index: process.env.STRIPE_PURCHASE_REQUEST_INDEX,
                        body: {
                            query: {match: { stripeSubscriptionId: webhookDataObject.subscription }}
                        }
                    };
                    const paymentSetups = await zcAdminClient.search (pob);

                    const paymentSetup = paymentSetups.hits.hits[0];

                    const b = {
                        createDate: new Date(),
                        stripeSubscriptionId: webhookDataObject.subscription,
                        stripeCustomerId: webhookDataObject.customer,
                        stripeId: webhookDataObject.id,
                        amount: webhookDataObject.amount_paid / 100,
                        tax: webhookDataObject.tax ? webhookDataObject.tax/100: 0,
                        total: webhookDataObject.total/100,
                        pc_stripe_webhook_id: webhook._id,
                        pc_payment_setup_id: paymentSetup._id,
                        period_start: new Date(webhookDataObject.lines.data[0].period.start * 1000),
                        period_end: new Date(webhookDataObject.lines.data[0].period.end * 1000),
                        payment_type: 'credit-card',
                        payment_provider: 'stripe'
                    };

                    const pcPayment = await zcAdminClient.index ( {
                        index: 'pc-payment',
                        body: b
                    });

                    return resolve({});

                    break;
            }

        });
    }
};

const delay = (ms) => { return new Promise ( (resolve, reject) => { setTimeout( () => {return resolve();}, ms); }); };
