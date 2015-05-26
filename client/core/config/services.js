export var init = (ns, oc, config) => {

	oc
		.get('$Dictionary')
		.init(config.dictionary);

	oc
		.get('$Dispatcher')
		.clear();

	oc
		.get('$Request')
		.init(config.request);

	oc
		.get('$Response')
		.init(config.response);

	if (!oc.get('$Window').isClient()) {
		oc
			.get('$CookieStorage')
			.clear();

		oc
			.get('$SessionStorage')
			.clear();

		oc
			.get('$CacheStorage')
			.clear();
	}

	oc
		.get('$CookieStorage')
		.init({secure: oc.get('$SECURE')});

	oc
		.get('$SessionStorage')
		.init();

	oc
		.get('$CacheStorage')
		.init();

	oc
		.get('$Router')
		.init(config.router);

	oc
		.get('$PageManager')
		.init();

	oc
		.get('$PageStateManager')
		.clear();

};
