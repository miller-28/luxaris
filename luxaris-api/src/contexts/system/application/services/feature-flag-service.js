class FeatureFlagService {
    constructor(feature_flag_repository, cache_client) {
        this.repository = feature_flag_repository;
        this.cache = cache_client;
        this.cache_ttl = 300; // 5 minutes
        this.cache_prefix = 'feature_flag:';
    }

    async is_enabled(key) {
        const flag = await this.get_flag(key);
        if (!flag) {
            return false; // Default to disabled if flag doesn't exist
        }
        return flag.is_enabled && this._parse_value(flag.value);
    }

    async get_flag(key) {
        // Try cache first
        if (this.cache) {
            const cache_key = `${this.cache_prefix}${key}`;
            const cached = await this.cache.get(cache_key);
			
            if (cached) {
                return JSON.parse(cached);
            }
        }

        // Fetch from database
        const flag = await this.repository.get_by_key(key);

        // Cache the result
        if (flag && this.cache) {
            const cache_key = `${this.cache_prefix}${key}`;
            await this.cache.set(cache_key, JSON.stringify(flag), this.cache_ttl);
        }

        return flag;
    }

    async get_all_flags(enabled_only = false) {
        const filters = enabled_only ? { is_enabled: true } : {};
        return await this.repository.get_all(filters);
    }

    async set_flag(key, value, description = null, is_enabled = true) {
        const exists = await this.repository.exists(key);

        let flag;
        if (exists) {
            flag = await this.repository.update(key, { value, description, is_enabled });
        } else {
            flag = await this.repository.create({ key, value, description, is_enabled });
        }

        // Invalidate cache
        if (this.cache) {
            const cache_key = `${this.cache_prefix}${key}`;
            await this.cache.del(cache_key);
        }

        return flag;
    }

    async enable_flag(key) {
        const flag = await this.repository.update(key, { is_enabled: true });
		
        // Invalidate cache
        if (this.cache && flag) {
            const cache_key = `${this.cache_prefix}${key}`;
            await this.cache.del(cache_key);
        }

        return flag;
    }

    async disable_flag(key) {
        const flag = await this.repository.update(key, { is_enabled: false });
		
        // Invalidate cache
        if (this.cache && flag) {
            const cache_key = `${this.cache_prefix}${key}`;
            await this.cache.del(cache_key);
        }

        return flag;
    }

    async delete_flag(key) {
        const flag = await this.repository.delete(key);
		
        // Invalidate cache
        if (this.cache && flag) {
            const cache_key = `${this.cache_prefix}${key}`;
            await this.cache.del(cache_key);
        }

        return flag;
    }

    _parse_value(value) {
        if (typeof value === 'boolean') {
            return value;
        }
        if (typeof value === 'string') {
            return value.toLowerCase() === 'true';
        }
        return Boolean(value);
    }
}

module.exports = FeatureFlagService;
