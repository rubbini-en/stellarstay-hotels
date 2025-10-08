/**
 * Port interface for reservation repository
 * Defines the contract that all reservation repository implementations must follow
 */

export class ReservationRepository {
  /**
   * Create a new reservation
   * @param {Object} reservation - The reservation data
   * @param {string} reservation.roomType - Room type (junior, king, presidential)
   * @param {string} reservation.checkIn - Check-in date (ISO string)
   * @param {string} reservation.checkOut - Check-out date (ISO string)
   * @param {number} reservation.numGuests - Number of guests
   * @param {boolean} reservation.includeBreakfast - Whether breakfast is included
   * @param {Object} reservation.pricingBreakdown - Pricing breakdown object
   * @param {string} [reservation.idempotencyKey] - Optional idempotency key
   * @returns {Promise<Object>} The created reservation with ID
   */
  async create(reservation) {
    throw new Error('Not implemented');
  }

  /**
   * Find a reservation by ID
   * @param {string} id - The reservation ID
   * @returns {Promise<Object|null>} The reservation or null if not found
   */
  async findById(id) {
    throw new Error('Not implemented');
  }

  /**
   * Find a reservation by idempotency key
   * @param {string} key - The idempotency key
   * @returns {Promise<Object|null>} The reservation or null if not found
   */
  async findByIdempotencyKey(key) {
    throw new Error('Not implemented');
  }

  /**
   * Check if there's an overlapping reservation for the given room type and dates
   * @param {string} roomType - The room type
   * @param {string} checkInISO - Check-in date (ISO string)
   * @param {string} checkOutISO - Check-out date (ISO string)
   * @returns {Promise<boolean>} True if there's an overlap, false otherwise
   */
  async hasOverlap(roomType, checkInISO, checkOutISO) {
    throw new Error('Not implemented');
  }
}
