/**
 * Channel Domain Model
 * Represents a social media platform available for connection
 */
export class Channel {
  
  constructor(data) {
    this.id = data.id;
    this.key = data.key; // Channel key (e.g., 'x', 'linkedin')
    this.name = data.name; // Display name (e.g., 'X (Twitter)', 'LinkedIn')
    this.status = data.status; // 'active' or 'inactive'
    this.limits = data.limits || {}; // Platform-specific limits (JSONB)
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  /**
   * Check if channel is active
   */
  get isActive() {
    return this.status === 'active';
  }

  /**
   * Get platform icon based on key
   */
  get icon() {
    const iconMap = {
      'x': 'mdi-twitter',
      'linkedin': 'mdi-linkedin',
      'facebook': 'mdi-facebook',
      'instagram': 'mdi-instagram'
    };
    return iconMap[this.key] || 'mdi-web';
  }

  /**
   * Get platform color based on key
   */
  get color() {
    const colorMap = {
      'x': '#000000',
      'linkedin': '#0077B5',
      'facebook': '#1877F2',
      'instagram': '#E4405F'
    };
    return colorMap[this.key] || '#1976d2';
  }

  /**
   * Get supported features from limits
   */
  get supportedFeatures() {
    const features = [];
    if (this.limits.supports_images) features.push('Images');
    if (this.limits.supports_links) features.push('Links');
    if (this.limits.supports_videos) features.push('Videos');
    if (this.limits.max_text_length) features.push(`Text: ${this.limits.max_text_length} chars`);
    return features;
  }

  static fromApi(data) {
    return new Channel(data);
  }

  toApi() {
    return {
      id: this.id,
      key: this.key,
      name: this.name,
      status: this.status,
      limits: this.limits
    };
  }
}
