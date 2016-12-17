 /**
 * @fileOverview Theme builder plugin emits an object with following general structure:
 *
 * { [slug]: { [content], [data] }, index: { [content], [data] } }
 *
 * `content` is the HTML content, i.e the HTML obtained by applying the data to theme.
 * `data` is the event that was received.
 *
 * Each event is added as a property to the object emitted.
 * There is a special property `index` which keeps index of all the events.
 * `data` property of `index` is array of all events' modified data (e.g description's length reduced).
 *
 * @name 10-theme-builder.js
 * @author Charanjit Singh
 * @license MIT
 */

const debug = require('debug')('app:theme-builder');
const Mustache = require('mustache');
const Observable = require('rxjs/Rx').Observable;
const path = require('path');
const R = require('ramda');
const moment = require('moment');
const readFile$ = Observable.bindNodeCallback(require('fs').readFile);

const themePath = path.resolve(__dirname, '../../theme/');

const buildIndexPage = (template, previousIndex, newEvent) => {
  const event = {
    date: moment(newEvent.startTime).format('MMMM Do, YYYY'),
    title: newEvent.name,
    description: `${R.compose(R.take(420), R.trim)(newEvent.description)}...`,
    startTime: moment(newEvent.startTime).format('hh:mm'),
    endTime: moment(newEvent.endTime).format('hh:mm'),
    location: newEvent.address,
    rsvpLink: newEvent.rsvpLink,
    rsvpCount: newEvent.rsvpCount
  };
  const events = R.append(event, previousIndex.data);
  const content = Mustache.render(template, {events});
  const newIndex = {
    content,
    data: events
  };

  debug('Build index with %d events', events.length);

  return newIndex;
};

module.exports = (events$) => {
  const builtTheme = {
    index: {}
  };

  const indexTemplate$ = readFile$(path.resolve(themePath, 'index.html'), 'utf-8');

  return indexTemplate$
    .combineLatest(
      events$,
      (indexTemplate, event) => ({indexTemplate, event})
    )
    .scan((accum, {indexTemplate, event}) => {
      const index = buildIndexPage(indexTemplate, accum.index, event);

      return Object.assign(accum, {index});
    }, builtTheme);
};
