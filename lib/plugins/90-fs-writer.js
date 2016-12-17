const Observable = require('rxjs/Rx').Observable;
const debug = require('debug')('app:fs-writer');
const path = require('path');
const fs = require('fs');

const writeFile$ = Observable.bindNodeCallback(fs.writeFile);
const mkdir$ = Observable.bindNodeCallback(fs.mkdir);
const rimraf$ = Observable.bindNodeCallback(require('rimraf'));
const ncp$ = Observable.bindNodeCallback(require('ncp').ncp);

const cssDir = process.env.SITE_DIR || path.resolve(__dirname, '../../theme/css');
const siteDir = process.env.SITE_DIR || path.resolve(__dirname, '../../_site');

// eslint-disable-next-line arrow-body-style
module.exports = (theme$) => {
  return rimraf$(siteDir)
    .flatMap(() => mkdir$(siteDir))
    .flatMap(() => ncp$(cssDir, `${siteDir}/css`))
    .combineLatest(theme$, (_, theme) => theme)
    .flatMap((theme) => {
      const filesToWrite = Object.keys(theme);

      return Observable
        .from(filesToWrite)
        .flatMap((name) => {
          const filepath = path.resolve(siteDir, `${name}.html`);

          debug('Writing file', filepath);

          return writeFile$(filepath, theme[name].content);
        });
    });
};
