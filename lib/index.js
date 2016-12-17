const Observable = require('rxjs/Rx').Observable;
const path = require('path');
const fs = require('fs');
const debug = require('debug')('app:main');
const R = require('ramda');

const readdir$ = Observable.bindNodeCallback(fs.readdir);
const readfile$ = Observable.bindNodeCallback(fs.readFile);
const resolvePath = str => path.resolve(__dirname, str);

/**
 * Load events from all .json files from given dir except those prefixed with `_`.
 * @param {string} dir Directory where all the data is stored.
 * @returns {Observable} Emits event object per event for all events in all files in data dir.
 * @throws {InvalidEventJSON} Throws inside the Observable chain.
 */
const getEvents$ = (dir) => {
  const filterInvalidFiles = R.filter(fileName => fileName[0] !== '_' && fileName.split('.').reverse()[0] === 'json');
  const events = readdir$(dir, 'utf-8')
        .flatMap(filterInvalidFiles)
        .map(name => resolvePath(`../data/${name}`))
        .do(name => debug('Reading %s', name))
        .flatMap(name => readfile$(name, 'utf-8'))
        .filter(content => !!content)
        .flatMap(JSON.parse)
        .catch(() => Observable.throw(new Error('InvalidEventJSON: Failed to parse json from data dir')));

  return events;
};

/**
 * Load all plugins from given dir.
 * @param {string} dir  Directory which contains plugins
 * @returns {Observable}  Emits one plugin function at a time
 */
const getPlugins$ = (dir) => {
  const filterInvalidFiles = R.filter(name => name[0] !== '_' && name.split('.').reverse()[0] === 'js');
  const plugins = readdir$(dir, 'utf-8')
        .flatMap(filterInvalidFiles)
        .do(name => debug('Loading plugin "%s"', name))
        .map(name => resolvePath(`./plugins/${name}`))
        .map(name => require(name)); // eslint-disable-line global-require, import/no-dynamic-require

  return plugins;
};

/**
 * Apply plugins to events in serial order.
 * Every time `events$` emit, it go through all the plugin-chain.
 * Output of first plugin goes to next plugin's input. First plugin gets raw data-unit from data dir.
 *
 * @param {Observable} plugins$ Must emit one function (returning an Observable) at a time
 * @param {Observable} events$ must emit one data-unit (event) at a time
 * @returns {Observable}
 */
const applyPlugins$ = (plugins$, events$) => {
  const result$ = plugins$
        .reduce((accum$, plugin) => plugin(accum$), events$)
        .flatMap(R.identity);

  return result$;
};

/**
 *  Apply all plugins on all the data.
 */
module.exports = () => {
  const events$ = getEvents$(resolvePath('../data/'));
  const plugins$ = getPlugins$(resolvePath('./plugins'));
  const result$ = applyPlugins$(plugins$, events$);

  result$.subscribe({
    next: R.identity,
    error: err => debug(err),
    complete: () => debug('We are done!')
  });
};
