import Updater from './updater';
import createLogger from './logger';
import config from '../config';

const logger = createLogger('sync-github');

const settings = config.get('sync');
logger.info(settings);
module.exports = new Updater(settings).run();
