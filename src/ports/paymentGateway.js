/**
 * Payment gateway interface
 */

export class PaymentGateway {
  /**
   * Process a payment
   * @param {Object} paymentData - The payment data
   * @param {number} paymentData.amountCents - Amount in cents
   * @param {string} paymentData.currency - Currency code (e.g., 'USD')
   * @param {string} paymentData.paymentMethodId - Payment method identifier
   * @param {string} [paymentData.idempotencyKey] - Optional idempotency key
   * @returns {Promise<Object>} Payment result with transaction ID and status
   */
  async processPayment(paymentData) {
    throw new Error('Not implemented');
  }

  /**
   * Refund a payment
   * @param {string} transactionId - The transaction ID to refund
   * @param {number} [amountCents] - Amount to refund (optional, defaults to full amount)
   * @returns {Promise<Object>} Refund result with refund ID and status
   */
  async refundPayment(transactionId, amountCents) {
    throw new Error('Not implemented');
  }
}
