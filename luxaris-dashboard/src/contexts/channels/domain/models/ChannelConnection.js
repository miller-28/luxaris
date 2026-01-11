/**
 * ChannelConnection Domain Model
 * Represents a connected social media account
 */
export class ChannelConnection {

    constructor(data) {
        this.id = data.id;
        this.user_id = data.user_id;
        this.channel_id = data.channel_id;
        this.channel_name = data.channel_name;
        this.channel_display_name = data.channel_display_name;
        this.channel_icon = data.channel_icon;
        this.channel_color = data.channel_color;
        this.account_name = data.account_name;
        this.account_username = data.account_username;
        this.account_avatar = data.account_avatar;
        this.status = data.status; // 'active', 'error', 'expired'
        this.error_message = data.error_message;
        this.last_used_at = data.last_used_at;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    static fromApi(data) {
        return new ChannelConnection(data);
    }

    toApi() {
        return {
            id: this.id,
            user_id: this.user_id,
            channel_id: this.channel_id,
            channel_name: this.channel_name,
            channel_display_name: this.channel_display_name,
            channel_icon: this.channel_icon,
            channel_color: this.channel_color,
            account_name: this.account_name,
            account_username: this.account_username,
            account_avatar: this.account_avatar,
            status: this.status,
            error_message: this.error_message,
            last_used_at: this.last_used_at,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }

    get isActive() {
        return this.status === 'connected' || this.status === 'active';
    }

    get hasError() {
        return this.status === 'error';
    }

    get isExpired() {
        return this.status === 'expired';
    }

    get statusColor() {
        switch (this.status) {
            case 'active':
                return 'success';
            case 'error':
                return 'error';
            case 'expired':
                return 'warning';
            default:
                return 'default';
        }
    }
}
