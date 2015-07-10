import ns from 'imajs/client/core/namespace.js';

ns.namespace('Core.Page.Render');

/**
 * Server-side page renderer. The renderer renders the page into the HTML
 * markup and sends it to the client.
 *
 * @class Server
 * @extends Core.Abstract.PageRender
 * @namespace Core.Page.Render
 * @module Core
 * @submodule Core.Page
 */
export default class Server extends ns.Core.Abstract.PageRender {

	/**
	 * Initializes the server-side page renderer.
	 *
	 * @method contructor
	 * @constructor
	 * @param {Core.Page.Render.Factory} factory Factory for receive $Utils to view.
	 * @param {Vendor.Helper} Helper The IMA.js helper methods.
	 * @param {Vendor.React} React React framework instance to use to render the
	 *        page.
	 * @param {Object<string, *>} settings Application setting for the current
	 *        application environment.
	 * @param {Core.Router.Response} response Utility for sending the page markup
	 *        to the client as a response to the current HTTP request.
	 * @param {Core.Interface.Cache} cache Resource cache caching the results of
	 *        HTTP requests made by services used by the rendered page.
	 */
	constructor(factory, Helper, React, settings, response, cache, oc) {
		super(factory, Helper, React, settings);

		/**
		 * Utility for sending the page markup to the client as a response to the
		 * current HTTP request.
		 *
		 * @private
		 * @property _response
		 * @type {Core.Router.Response}
		 */
		this._response = response;

		/**
		 * The resource cache, caching the results of all HTTP requests made by the
		 * services using by the rendered page. The state of the cache will then be
		 * serialized and sent to the client to re-initialize the page at the
		 * client side.
		 *
		 * @private
		 * @property _cache
		 * @type {Core.Interface.Cache}
		 */
		this._cache = cache;

		/**
		 * @private
		 * @property _utils
		 * @type {Object<string, *>}
		 */
		this._oc = oc;

	}

	/**
	 * Renders the page using the provided controller and view. The actual
	 * behavior of this method differs at the client and the at server in the
	 * following way:
	 *
	 * On server, the method renders the page to a string containing HTML markup
	 * to send to the client.
	 *
	 * On client, the method renders the page into DOM, re-using the DOM created
	 * from the HTML markup send by the server if possible.
	 *
	 * @inheritDoc
	 * @override
	 * @method mount
	 * @abstract
	 * @param {Core.Abstract.Controller} controller
	 * @param {Vendor.React.Component} view
	 * @return {Promise}
	 */
	mount(controller, view) {
		var loadPromises = this._wrapEachKeyToPromise(controller.load());

		return (
			this._Helper
				.allPromiseHash(loadPromises)
				.then((fetchedResources) => {
					controller.setState(fetchedResources);
					controller.setMetaParams(fetchedResources);

					var props = this._generateViewProps(controller.getState());
					var reactElementView = this._factory.wrapView(view, props);
					var pageMarkup = this._React.renderToString(reactElementView);

					var documentView = ns.get(this._settings.$Page.$Render.documentView);
					var documentViewFactory = this._React.createFactory(documentView);
					var appMarkup = this._React.renderToStaticMarkup(documentViewFactory({
						page: pageMarkup,
						revivalSettings: this._getRevivalSettings(),
						metaManager: controller.getMetaManager(),
						$Utils: this._factory.getUtils()
					}));
					var html = '<!doctype html>\n' + appMarkup;

					this._response
						.status(controller.getHttpStatus())
						.send(html);

					return {html, status: controller.getHttpStatus()};
				})
		);
	}

	/**
	 * Only update controller state and React view not call constructor.
	 *
	 * It is useful for same controller and view, where only change url params.
	 * Then it is possible to reuse same controller and view.
	 *
	 * @inheritDoc
	 * @override
	 * @method update
	 * @param {Core.Decorator.Controller} controller
	 * @param {Object<string, string>=} [params={}] Last route params.
	 * @return {Promise}
	 */
	update(controller, params = {}) {
		return this.mount(controller, params);
	}

	/**
	 * Unmount view from the DOM. Then React always call constructor
	 * for new mounting view.
	 *
	 * @inheritDoc
	 * @override
	 * @method unmount
	 */
	unmount() {
		if (this._reactiveView) {
			this._reactiveView = null;
		}
	}

	/**
	 * THe HTML code will include a script settings the "revival"
	 * data for the application at the client-side.
	 *
	 * @method _getRevivalSettings
	 * @private
	 * @return {string} HTML code containing script element to include into
	 *         the rendered page.
	 */
	_getRevivalSettings() {
		return (
			'<script>' +
			' window.$IMA = window.$IMA || {};' +
			' window.$IMA.Cache = ' + (this._cache.serialize()) + ';' +
			' window.$IMA.$Language = "' + (this._settings.$Language) + '";' +
			' window.$IMA.$Env = "' + (this._settings.$Env) + '";' +
			' window.$IMA.$Debug = "' + (this._settings.$Debug) + '";' +
			' window.$IMA.$Protocol = "' + (this._settings.$Protocol) + '";' +
			' window.$IMA.$Domain = "' + (this._settings.$Domain) + '";' +
			' window.$IMA.$Root = "' + (this._settings.$Root) + '";' +
			' window.$IMA.$LanguagePartPath = "' + (this._settings.$LanguagePartPath) + '";' +
			'</script>'
		);
	}

	/**
	 * Creates a copy of the provided data map object that has the values of its
	 * fields wrapped into Promises.
	 *
	 * The the values that are already Promises will referenced directly without
	 * wrapping then into another Promise.
	 *
	 * @method _wrapEachKeyToPromise
	 * @protected
	 * @param {Object<string, *>} dataMap A map of data that should have its
	 *        values wrapped into Promises.
	 * @return {Object<string, Promise>} A copy of the provided data
	 *         map that has all its values wrapped into promises.
	 */
	_wrapEachKeyToPromise(dataMap) {
		var copy = {};

		for (var field of Object.keys(dataMap)) {
			var value = dataMap[field];

			if (value instanceof Promise) {
				copy[field] = value;
			} else {
				copy[field] = Promise.resolve(value);
			}
		}

		return copy;
	}
}

ns.Core.Page.Render.Server = Server;
