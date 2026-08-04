'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/payment/create-order',
      handler: 'payment.createOrder',
      config: {
        auth: false,
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/payment/verify',
      handler: 'payment.verifyPayment',
      config: {
        auth: false,
        middlewares: [],
      },
    },
  ],
};
