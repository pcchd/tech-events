const Observable = require('rxjs/Rx').Observable;
const debug = require('debug')('app:gh-deployer');
const path = require('path');
const rimraf$ = Observable.bindNodeCallback(require('rimraf'));
const ncp$ = Observable.bindNodeCallback(require('ncp').ncp);

const baseDir = path.resolve(__dirname, '../../');
const siteDir = process.env.SITE_DIR || path.resolve(`${baseDir}/_site`);

const Git = require('simple-git')(baseDir);

const gCheckout$ = Observable.bindNodeCallback(Git.checkout.bind(Git));
const gStash$ = Observable.bindNodeCallback(Git.stash.bind(Git));
const gPush$ = Observable.bindNodeCallback(Git.push.bind(Git));
const gAdd$ = Observable.bindNodeCallback(Git.add.bind(Git));
const gCommit$ = Observable.bindNodeCallback(Git.commit.bind(Git));

module.exports = (theme$) => {
  const gitSet$ = gCheckout$('master')
        .do(() => debug('Checkout out ot master'))
        .flatMap(() => gStash$())
        .flatMap(() => gCheckout$('gh-pages'));

  const gitReset$ = gCheckout$('master')
        .flatMap(() => gStash$({pop: null}));

  return theme$
  // do on complete
    .do(null, null, () => {
      debug('Preparing to deploy');

      gitSet$
        .do(() => debug('Cleaning gh-pages work tree'))
        .flatMap(() => rimraf$('!(node_modules|_site)'))
        .do(() => debug('Copying everything from %s to %s', siteDir, baseDir))
        .flatMap(() => ncp$(siteDir, baseDir))
        .flatMap(() => rimraf$(siteDir))
        .do(() => debug('git add -A'))
        .flatMap(() => gAdd$('*'))
        .do(() => debug('git commit -m "gh-deployer deploying"'))
        .flatMap(() => gCommit$('gh-deployer deploying'))
        .do(() => debug('git push origin gh-pages'))
        .flatMap(() => gPush$('origin', 'gh-pages'))
        .do(() => debug('Deployment successful. Resetting work tree.'))
        .flatMap(() => gitReset$)
        .subscribe({
          error: (err) => {
            // eslint-disable-next-line no-console
            console.error('Error occured while deploying to gh-pages');
            debug(err);

            return err;
          }
        });
    });
};
