import Bluebird from 'bluebird';
import request from './request';
import createLogger from './logger';
import _ from 'lodash';

const logger = createLogger('sync-github');

export default class Updater {

	constructor(settings = {}) {

		if (!_.isObject(settings.github)) {
			throw new Error('must provide github configuration');
		}

		if (!_.isObject(settings.api)) {
			throw new Error('must provide api configuration');
		}

		this.apiBaseUrl = settings.api.base_url;
		this.apiKey = settings.api.key;
		this.githubBaseUrl = settings.github.base_url;
		this.batchSize = parseInt(settings.github.batch_size, 10);
		this.org = settings.github.org;
		this.clientId = settings.github.client_id;
		this.clientSecret = settings.github.client_secret;

		if (!_.isString(this.apiBaseUrl) || _.isEmpty(this.apiBaseUrl)) {
			throw new TypeError('must provide a valid url for api.base_url setting');
		}

		if (this.apiKey && !_.isString(this.apiKey)) {
			throw new TypeError('must provide a string for api.key setting');
		}

		if (!_.isString(this.githubBaseUrl) || _.isEmpty(this.githubBaseUrl)) {
			throw new TypeError('must provide a valid url for github.base_url setting');
		}

		if (!_.isString(this.org) || _.isEmpty(this.org)) {
			throw new TypeError('must provide a valid url for github.base_url setting');
		}

		if (_.isNaN(this.batchSize)) {
			throw new TypeError('must provide an integer value for github batch_size');
		}

		if (!_.isString(this.clientId) || _.isEmpty(this.clientId)) {
			throw new TypeError('must provide a valid string for github.client_id setting');
		}

		if (!_.isString(this.clientSecret) || _.isEmpty(this.clientSecret)) {
			throw new TypeError('must provide a valid string for github.client_secret setting');
		}

		this.saveUri = `${this.apiBaseUrl}/repos`;

		this.batchOffset = 1;
	}

	// mainly for testing purposes;
	request(urlOrOptions) {
		return request(urlOrOptions);
	}

	githubFetch(offset) {
		const options = {
			url : `${this.githubBaseUrl}/orgs/${this.org}/repos?page=${offset}&per_page=${this.batchSize}&client_id=${this.clientId}&client_secret=${this.clientSecret}`,
			headers : {
				'User-Agent' : 'node.js request module'
			}
		};
		logger.debug(`fetching url ${options.url}`);

		return this.request(options);
	}

	// @todo handle errors + exponential backoff
	getBatch() {
		return this.githubFetch(this.batchOffset)
			.then(({body}) => body)
			.then(x => {
				try {
					return JSON.parse(x);
				} catch (e) {
					logger.error('had an issue parsing', x);
					logger.error(e);
				}
			})
			.tap(() => this.batchOffset++);
	}

	saveRepos(repos) {
		const options = {
			uri: this.saveUri,
			method: 'POST',
			json: repos
		};

		if (this.apiKey) {
			options.headers = {
				'x-api-key' : this.apiKey
			};
		}

		return this.request(options);

	}

	// @todo extract this function to a common lib
	transformResponse(repo) {
		return _.pick(repo, [
			'id',
			'name',
			'description',
			'pushed_at',
			'git_url',
			'stargazers_count',
			'forks_count',
			'open_issues_count',
			'forks'
		]);
	};

	getBatchAndUpdate() {
		return this.getBatch()
			.then(_repos => {
				if (_repos.length === 0) {
					return Bluebird.resolve(this.batchOffset);
				}

				try {
					const repos = _repos.map(this.transformResponse);

					return this.saveRepos(repos)
						.bind(this)
						.then(this.getBatchAndUpdate);
				} catch (e) {
					logger.error(`uh oh could not transform response! ${JSON.stringify(_repos, null, 4)}`);
					logger.error(e);
				}
			});
	}

	run() {
		return this.getBatchAndUpdate();
	}

}
