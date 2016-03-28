#sync-github

batch sync process to retrieve github repository information and post to our remote api endpoint.

## Settings
* **github** - object - github related configuration
	* **base_url** - string - (*default: https://api.github.com/*) - base url of the github api
	* **org** - string - github id of your organization (e.g. *underarmour*)
	* **client_id** - string - client id of your oauth authorized github application (*see note below*)
	* **client_secret** - string - client secret of your oauth authorized github application (*see note below*)
	* **batch_size** - integer - (*default: 100*) number of repos to retrieve from github at a time (leverages per_page attribute of github api)
* **api** - object - configuration related to service-github-data api
	* **base_url** - string - base url of service-github-data api
	* **key** - string - optional (api key of service-github-data api)

### Note about ouath client_id client_secret:

OAuth Client Id and Secret are needed so this application does not run into rate limit issues. To generate please see this repository (INSERT LINK HERE) **NOTE** It is adviseable **NOT** to store secrets inside of config file in git (**THIS IS BAD**).

This application can be configured using environment variables with the `__` nested namespace seperator. (see [nconf](https://github.com/indexzero/nconf) repo for more info.)

## Running
This application is meant to be scheduled at a reasonable interval in order to keep our github data accurate over time. Because of the service-github-listener (which should listen to github webhooks and update data store) this is only necessary every once in a while. This application makes no determination of how it is scheduled (use whatever scheduler you like). One example would be to run it as a cron job.

*for example copy and paste the following line into a crontab file:*

```
0 0 * * * node /path/to/main.js
```

## TODO
* handle errors better
* add exponential backoff in case of github request failures (or api send failures)

## System Requirements
this application has been tested with:

* node v5.1.1
* Mac OSX (likely works in all linux environments although I have not tested thoroughly)

## Development

### gulp tasks

Main Tasks
------------------------------
	default
	help
	lint
	mocha
	test

Sub Tasks
------------------------------
	lint:js
	lint:jsx
	lint:package
	lint:whitespace
