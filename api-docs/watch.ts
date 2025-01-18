import {spawn} from 'node:child_process';
import {join} from 'node:path';
import {stderr, stdout} from 'node:process';
// @ts-expect-error TS(7016): Could not find a declaration file
import sane from 'sane';

const watcherPy = sane(join(__dirname, '../src/sentry'));
const watcherJson = sane(join(__dirname, '../api-docs'));

const watchers = [watcherPy, watcherJson];

let isCurrentlyRunning = false;

const makeApiDocsCommand = function () {
  if (isCurrentlyRunning) {
    console.log('already rebuilding docs');
    return;
  }
  console.log('rebuilding OpenAPI schema...');
  isCurrentlyRunning = true;
  const buildCommand = spawn('make', ['-C', '../', 'build-api-docs']);

  buildCommand.stdout.on('data', function (data) {
    stdout.write(data.toString());
  });

  buildCommand.stderr.on('data', function (data) {
    stderr.write('stderr: ' + data.toString());
  });

  buildCommand.on('exit', function () {
    isCurrentlyRunning = false;
  });
};

for (const w of watchers) {
  w.on('change', makeApiDocsCommand);
  w.on('add', makeApiDocsCommand);
  w.on('delete', makeApiDocsCommand);
}
console.log('rebuilding OpenAPI schema on changes');
