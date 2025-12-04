class Schedule {
  constructor(data) {
    this.id = data.id;
    this.post_variant_id = data.post_variant_id;
    this.channel_connection_id = data.channel_connection_id;
    this.run_at = data.run_at;
    this.timezone = data.timezone;
    this.status = data.status || 'pending';
    this.attempt_count = data.attempt_count || 0;
    this.last_attempt_at = data.last_attempt_at || null;
    this.error_code = data.error_code || null;
    this.error_message = data.error_message || null;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  /**
   * Check if schedule can be cancelled
   */
  can_cancel() {
    return ['pending', 'queued'].includes(this.status);
  }

  /**
   * Check if schedule can be rescheduled
   */
  can_reschedule() {
    return ['pending', 'failed'].includes(this.status);
  }

  /**
   * Check if schedule is in a final state
   */
  is_final() {
    return ['success', 'cancelled'].includes(this.status);
  }

  /**
   * Check if schedule is due for execution
   */
  is_due(now = new Date()) {
    return this.status === 'pending' && new Date(this.run_at) <= now;
  }

  /**
   * Check if schedule can be retried
   */
  can_retry(max_attempts = 5) {
    return this.attempt_count < max_attempts && ['failed', 'processing'].includes(this.status);
  }
}

module.exports = Schedule;
