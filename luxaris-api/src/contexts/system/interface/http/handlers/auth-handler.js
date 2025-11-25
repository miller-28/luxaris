class AuthHandler {
	constructor(register_user_use_case, login_user_use_case, refresh_token_use_case) {
		this.register_user_use_case = register_user_use_case;
		this.login_user_use_case = login_user_use_case;
		this.refresh_token_use_case = refresh_token_use_case;
	}

	async register(req, res, next) {
		try {
			const result = await this.register_user_use_case.execute(req.body);
			res.status(201).json(result);
		} catch (error) {
			next(error);
		}
	}

	async login(req, res, next) {
		try {
			const result = await this.login_user_use_case.execute(req.body);
			res.status(200).json(result);
		} catch (error) {
			next(error);
		}
	}

	async refresh(req, res, next) {
		try {
			const result = await this.refresh_token_use_case.execute(req.body);
			res.status(200).json(result);
		} catch (error) {
			next(error);
		}
	}
}

module.exports = AuthHandler;
