'use strict';

const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

module.exports = {
  /**
   * POST /api/payment/create-order
   * Creates a Razorpay order for the Pro plan
   */
  async createOrder(ctx) {
    try {
      const { amount, currency = 'INR', userId, billingCycle } = ctx.request.body;

      if (!amount || !userId) {
        return ctx.badRequest('amount and userId are required');
      }

      const options = {
        amount: amount * 100, // Razorpay expects paise (multiply by 100)
        currency,
        receipt: `receipt_${userId}_${Date.now()}`,
        notes: {
          userId,
          billingCycle: billingCycle || 'monthly',
        },
      };

      const order = await razorpay.orders.create(options);

      ctx.body = {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      };
    } catch (error) {
      strapi.log.error('Razorpay create-order error:', error);
      ctx.internalServerError('Failed to create payment order');
    }
  },

  /**
   * POST /api/payment/verify
   * Verifies Razorpay payment signature and upgrades user to Pro
   */
  async verifyPayment(ctx) {
    try {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        userId,   // Strapi user ID (numeric)
        clerkId,  // Clerk user ID string
      } = ctx.request.body;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return ctx.badRequest('Missing payment verification fields');
      }

      // Verify signature
      const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (generatedSignature !== razorpay_signature) {
        return ctx.unauthorized('Invalid payment signature');
      }

      // Find the Strapi user by clerkId and upgrade to pro
      let strapiUser = null;

      if (userId) {
        // Update directly by Strapi user ID
        strapiUser = await strapi.entityService.update('plugin::users-permissions.user', userId, {
          data: { subscriptionTier: 'pro' },
        });
      } else if (clerkId) {
        // Find by clerkId
        const users = await strapi.entityService.findMany('plugin::users-permissions.user', {
          filters: { clerkid: clerkId },
          limit: 1,
        });

        if (users && users.length > 0) {
          strapiUser = await strapi.entityService.update('plugin::users-permissions.user', users[0].id, {
            data: { subscriptionTier: 'pro' },
          });
        }
      }

      if (!strapiUser) {
        return ctx.notFound('User not found');
      }

      strapi.log.info(`User ${strapiUser.id} upgraded to Pro after successful payment`);

      ctx.body = {
        success: true,
        message: 'Payment verified. Welcome to Pro!',
        subscriptionTier: 'pro',
      };
    } catch (error) {
      strapi.log.error('Razorpay verify-payment error:', error);
      ctx.internalServerError('Payment verification failed');
    }
  },
};
