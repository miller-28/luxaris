class PublishEvent {
  constructor(data) {
    this.id = data.id;
    this.schedule_id = data.schedule_id;
    this.attempt_index = data.attempt_index;
    this.timestamp = data.timestamp;
    this.status = data.status; // 'success' | 'failed' | 'retried' | 'cancelled'
    this.external_post_id = data.external_post_id || null;
    this.external_url = data.external_url || null;
    this.error_code = data.error_code || null;
    this.error_message = data.error_message || null;
    this.raw_response = data.raw_response || null;
  }

  /**
   * Check if this event represents a successful publish
   */
  is_success() {
    return this.status === 'success';
  }

  /**
   * Check if this event represents a failure
   */
  is_failure() {
    return this.status === 'failed';
  }

  /**
   * Check if this event led to a retry
   */
  is_retry() {
    return this.status === 'retried';
  }
}

module.exports = PublishEvent;
