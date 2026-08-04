'use strict';

const Razorpay = require('razorpay');
const crypto = require('crypto');

// Lazy-initialize Razorpay so missing keys don't crash Strapi on startup.
// The instance is created on first use, not at module load time.
let _razorpay = null;
function getRazorpay() {
  if (!_razorpay) {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_id || key_id === 'rzp_test_REPLACE_ME' || !key_secret || key_secret === 'REPLACE_ME_WITH_YOUR_SECRET') {
      throw new Error('Razorpay keys are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.');
    }
    _razorpay = new Razorpay({ key_id, key_secret });
  }
  return _razorpay;
}

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
        receipt: `rcpt_${Date.now()}`,
        notes: {
          userId,
          billingCycle: billingCycle || 'monthly',
        },
      };

      const order = await getRazorpay().orders.create(options);

      ctx.body = {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      };
    } catch (error) {
      strapi.log.error('Razorpay create-order error:', error);
      ctx.internalServerError(error.message || 'Failed to create payment order');
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

      strapi.log.info(`[Verify] Received: orderId=${razorpay_order_id}, paymentId=${razorpay_payment_id}, userId=${userId}, clerkId=${clerkId}`);

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return ctx.badRequest('Missing payment verification fields');
      }

      // Verify signature
      const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      strapi.log.info(`[Verify] Generated sig: ${generatedSignature.substring(0, 10)}... Received sig: ${razorpay_signature.substring(0, 10)}...`);

      if (generatedSignature !== razorpay_signature) {
        strapi.log.error('[Verify] Signature mismatch!');
        return ctx.unauthorized('Invalid payment signature');
      }

      strapi.log.info('[Verify] Signature verified successfully');

      // Find the Strapi user by clerkId and upgrade to pro
      let strapiUser = null;

      if (clerkId) {
        // Find by clerkId first (this is what the frontend sends)
        strapi.log.info(`[Verify] Looking up user by clerkid: ${clerkId}`);
        const users = await strapi.entityService.findMany('plugin::users-permissions.user', {
          filters: { clerkid: clerkId },
          limit: 1,
        });

        strapi.log.info(`[Verify] Found ${users?.length || 0} users with clerkid=${clerkId}`);

        if (users && users.length > 0) {
          strapi.log.info(`[Verify] Upgrading user ${users[0].id} (${users[0].email}) to pro`);
          strapiUser = await strapi.entityService.update('plugin::users-permissions.user', users[0].id, {
            data: { subscriptionTier: 'pro' },
          });
          strapi.log.info(`[Verify] User ${strapiUser.id} subscriptionTier is now: ${strapiUser.subscriptionTier}`);
        }
      } else if (userId) {
        // Update directly by Strapi user ID
        strapi.log.info(`[Verify] Updating user by Strapi ID: ${userId}`);
        strapiUser = await strapi.entityService.update('plugin::users-permissions.user', userId, {
          data: { subscriptionTier: 'pro' },
        });
      }

      if (!strapiUser) {
        strapi.log.error(`[Verify] User not found! clerkId=${clerkId}, userId=${userId}`);
        return ctx.notFound('User not found. Please contact support with your payment ID: ' + razorpay_payment_id);
      }

      strapi.log.info(`User ${strapiUser.id} upgraded to Pro after successful payment`);

      ctx.body = {
        success: true,
        message: 'Payment verified. Welcome to Pro!',
        subscriptionTier: 'pro',
      };
    } catch (error) {
      strapi.log.error('Razorpay verify-payment error:', error);
      ctx.internalServerError(error.message || 'Payment verification failed');
    }
  },
};
