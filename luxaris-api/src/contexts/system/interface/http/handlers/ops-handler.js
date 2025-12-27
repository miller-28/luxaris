class OpsHandler {
    constructor(health_check_service, feature_flag_service, app_data_service) {
        this.health_check_service = health_check_service;
        this.feature_flag_service = feature_flag_service;
        this.app_data_service = app_data_service;
    }

    async get_health(req, res, next) {
        try {
            const health = await this.health_check_service.check_health();
			
            // Set appropriate HTTP status code based on health
            const status_code = health.status === 'healthy' ? 200 : 
			                   health.status === 'degraded' ? 200 : 503;
			
            res.status(status_code).json(health);
        } catch (error) {
            next(error);
        }
    }

    async get_status(req, res, next) {
        try {
            const status = await this.health_check_service.get_status();
            res.status(200).json(status);
        } catch (error) {
            next(error);
        }
    }

    async get_feature_flags(req, res, next) {
        try {
            const enabled_only = req.query.enabled_only === 'true';
            const flags = await this.feature_flag_service.get_all_flags(enabled_only);
			
            res.status(200).json({
                flags,
                count: flags.length
            });
        } catch (error) {
            next(error);
        }
    }

    async get_feature_flag(req, res, next) {
        try {
            const { key } = req.params;
            const flag = await this.feature_flag_service.get_flag(key);
			
            if (!flag) {
                return res.status(404).json({
                    errors: [{
                        error_code: 'FEATURE_FLAG_NOT_FOUND',
                        error_description: `Feature flag '${key}' not found`,
                        error_severity: 'error'
                    }]
                });
            }
			
            res.status(200).json(flag);
        } catch (error) {
            next(error);
        }
    }

    async check_feature_flag(req, res, next) {
        try {
            const { key } = req.params;
            const is_enabled = await this.feature_flag_service.is_enabled(key);
			
            res.status(200).json({
                key,
                enabled: is_enabled
            });
        } catch (error) {
            next(error);
        }
    }

    async get_app_data(req, res, next) {
        try {
            const app_data = await this.app_data_service.get_app_data();
            
            res.status(200).json({
                timezones: app_data.timezones,
                countries: app_data.countries,
                metadata: {
                    timezones_count: app_data.timezones.length,
                    countries_count: app_data.countries.length,
                    cached: true
                }
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = OpsHandler;
