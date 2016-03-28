import Bluebird from 'bluebird';
module.exports = Bluebird.promisify(require('request'));
