/* eslint-disable no-unused-vars */
import Updater from './updater';
import Bluebird from 'bluebird';
import sinon from 'sinon';
import assert from 'assert';
import express from 'express';
import _ from 'lodash';
import bodyParser from 'body-parser';

describe('Updater', function suite() {

	const settings = {
		'github' : {
			'base_url' : 'https://api.github.com/',
			'org' : 'my_organization',
			'client_id' : 'xxxx_id',
			'client_secret' : 'xxxx_secret',
			'batch_size' : 100
		},
		'api' : {
			'key' : 'xxx_key',
			'base_url' : 'http://localhost:1337'
		}
	};

	beforeEach(function beforeEach() {
		this.sandbox = sinon.sandbox.create();
	});

	afterEach(function afterEach() {
		this.sandbox.restore();
	});

	it('can be instantiated', function test() {
		assert(new Updater(settings) instanceof Updater); // this enforces coverage test
	});

	it('will throw an error if github config is not passed', function test() {
		assert.throws(function () {
			return new Updater();
		});
	});


	it('will throw an if api config is not passed', function test() {
		assert.throws(function () {
			const _settings = _.clone(settings);
			delete _settings.api;
			return new Updater(_settings);
		});
	});


	it('will throw an error if config options not present or invalid', function test() {
		assert.throws(function () {
			const _settings = _.cloneDeep(settings);
			_settings.github.base_url = 1234; // eslint-disable-line camelcase
			return new Updater(_settings);
		}, 'invalid base url');

		assert.throws(function () {
			const _settings = _.cloneDeep(settings);
			delete _settings.github.base_url;
			return new Updater(_settings);
		}, 'missing base url');

		assert.throws(function () {
			const _settings = _.cloneDeep(settings);
			_settings.github.batch_size = 'asdf'; // eslint-disable-line camelcase

			return new Updater(_settings);
		}, 'invalid batch size');

		assert.throws(function () {
			const _settings = _.cloneDeep(settings);
			delete _settings.github.batch_size;
			return new Updater(_settings);
		}, 'batch size missing');

		assert.throws(function () {
			const _settings = _.cloneDeep(settings);
			delete _settings.github.org;

			return new Updater(_settings);
		}, 'org missing');

		assert.throws(function () {
			const _settings = _.cloneDeep(settings);
			_settings.github.org = 1234;

			return new Updater(_settings);
		}, 'org invalid');

		assert.throws(function () {
			const _settings = _.cloneDeep(settings);
			delete _settings.github.client_id;

			return new Updater(_settings);
		}, 'client id missing');

		assert.throws(function () {
			const _settings = _.cloneDeep(settings);
			_settings.github.client_id = 1234; // eslint-disable-line camelcase

			return new Updater(_settings);
		}, 'client id invalid');

		assert.throws(function () {
			const _settings = _.cloneDeep(settings);
			delete _settings.github.client_secret;
			return new Updater(_settings);
		}, 'client secret missing');

		assert.throws(function () {
			const _settings = _.cloneDeep(settings);
			_settings.github.client_secret = 1234; // eslint-disable-line camelcase

			return new Updater(_settings);
		}, 'client secret invalid');

		assert.throws(function () {
			const _settings = _.cloneDeep(settings);
			delete _settings.api.base_url; // eslint-disable-line camelcase

			return new Updater(_settings);
		}, 'api base url missing');

		assert.throws(function () {
			const _settings = _.cloneDeep(settings);
			_settings.api.base_url = 1234; // eslint-disable-line camelcase

			return new Updater(_settings);
		}, 'api base url invalid');

		assert.throws(function () {
			const _settings = _.cloneDeep(settings);
			_settings.api.key = 1234; // eslint-disable-line camelcase

			return new Updater(_settings);
		}, 'api key invalid');

	});

	it('githubRequest calls request with correctly crafted github url', function test() {
		const updater = new Updater(settings);
		const stub = this.sandbox.stub(updater, 'request');
		updater.githubFetch(2);
		const calls = stub.getCalls();
		assert(calls[0].args[0].url === `${settings.github.base_url}/orgs/${settings.github.org}/repos?page=2&per_page=${settings.github.batch_size}&client_id=${settings.github.client_id}&client_secret=${settings.github.client_secret}`);
	});

	it('multiple calls to getBatch will result in offset being updated', function test() {
		const updater = new Updater(settings);
		const stub = this.sandbox.stub(updater, 'githubFetch');
		stub.returns(Bluebird.resolve({body : '[]'}));

		function assertion() {
			const calls = stub.getCalls()
				.map(x => x.args[0]);
			assert.deepEqual(calls, [1, 2, 3]);
		}

		return updater.getBatch()
			.bind(updater)
			.then(updater.getBatch)
			.then(updater.getBatch)
			.then(assertion);
	});

	it('smoke test it will post valid repo objects to remote endpoint', function test() {

		const _settings = _.clone(settings);

		/* eslint-disable camelcase */
		_settings.github.base_url = 'http://localhost:1337'; // @todo maybe make configurable
		_settings.github.batch_size = 1;
		/* eslint-enable camelcase */

		const fixtures = [{
			'id': 1,
			'name': 'repo_1',
			'pushed_at': '2015-02-11T17:31:49Z',
			'git_url': 'git://github.com/org_1/repo_1.git',
			'stargazers_count': 56,
			'forks_count': 9,
			'open_issues_count': 2,
			'forks': 9
		},
		{
			'id': 2,
			'name': 'repo_2',
			'pushed_at': '2015-02-11T18:30:25Z',
			'git_url': 'git://github.com/org_1/repo_2.git',
			'stargazers_count': 36,
			'forks_count': 2,
			'open_issues_count': 2,
			'forks': 3
		},
		{
			'id': 3,
			'name': 'repo_3',
			'pushed_at': '2015-01-11T17:21:12Z',
			'git_url': 'git://github.com/org_1/repo_3.git',
			'stargazers_count': 23,
			'forks_count': 3,
			'open_issues_count': 1,
			'forks': 5
		}];

		let counter = 0;
		let repoStore = [];

		// this server is mocks the github api and our remote endpoint
		const app = express();

		app.use(bodyParser.json());

		// mock github api
		app.get(`/orgs/${_settings.github.org}/repos`, function (req, res) {
			const response = fixtures[counter] ? [fixtures[counter]] : [];
			counter++;
			return res.json(response);
		});

		// mock our remote endpoint
		app.post('/repos', function (req, res) {
			repoStore = repoStore.concat(req.body);
			return res.send('ok!');
		});

		var server = app.listen(1337);
		server.closeAsync = Bluebird.promisify(server.close);

		const updater = new Updater(_settings);

		function assertion() {
			assert.deepEqual(repoStore, fixtures);
		}

		return updater
			.run()
			.then(assertion)
			.then(() => server.closeAsync());
	});

	it('will generate correct saveUri with api key', function test() {
		const updater = new Updater(settings);
		assert(updater.saveUri === `${settings.api.base_url}/repos?api_key=${settings.api.key}`);
	});


	it('will generate correct saveUri without api key', function test() {
		const _settings = _.clone(settings);
		delete _settings.api.key;
		const updater = new Updater(settings);
		assert(updater.saveUri === `${settings.api.base_url}/repos`);
	});


});
