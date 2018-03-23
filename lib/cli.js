#!/usr/bin/env node
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.main = undefined;

let main = exports.main = (() => {
  var _ref = _asyncToGenerator(function* (appDir, sourceDirs, cacheDir, sourceMapDir) {
    let compilerHost = null;
    if (!cacheDir || cacheDir.length < 1) {
      cacheDir = '.cache';
    }

    let rootCacheDir = _path2.default.join(appDir, cacheDir);
    _mkdirp2.default.sync(rootCacheDir);
    let mapDir = rootCacheDir;

    if (sourceMapDir) {
      mapDir = _path2.default.join(appDir, sourceMapDir);
      d(`specifed separate source map dir at ${mapDir}, creating it`);
      _mkdirp2.default.sync(mapDir);
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`Using NODE_ENV = ${process.env.NODE_ENV || 'development'}`);
    }

    d(`main: ${appDir}, ${JSON.stringify(sourceDirs)}`);
    try {
      compilerHost = yield (0, _configParser.createCompilerHostFromProjectRoot)(appDir, rootCacheDir, sourceMapDir);
    } catch (e) {
      console.error(`Couldn't set up compilers: ${e.message}`);
      d(e.stack);

      throw e;
    }

    yield Promise.all(sourceDirs.map(function (dir) {
      return (0, _forAllFiles.forAllFiles)(dir, (() => {
        var _ref2 = _asyncToGenerator(function* (f) {
          try {
            d(`Starting compilation for ${f}`);
            yield compilerHost.compile(f);
          } catch (e) {
            console.error(`Failed to compile file: ${f}`);
            console.error(e.message);

            d(e.stack);
          }
        });

        return function (_x5) {
          return _ref2.apply(this, arguments);
        };
      })());
    }));

    d('Saving out configuration');
    yield compilerHost.saveConfiguration();
  });

  return function main(_x, _x2, _x3, _x4) {
    return _ref.apply(this, arguments);
  };
})();

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _mkdirp = require('mkdirp');

var _mkdirp2 = _interopRequireDefault(_mkdirp);

var _configParser = require('./config-parser');

var _forAllFiles = require('./for-all-files');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

process.on('unhandledRejection', e => {
  d(e.message || e);
  d(e.stack || '');
});

process.on('uncaughtException', e => {
  d(e.message || e);
  d(e.stack || '');
});

const d = require('debug')('electron-compile');

const yargs = require('yargs').usage('Usage: electron-compile --appdir [root-app-dir] paths...').alias('a', 'appdir').describe('a', 'The top-level application directory (i.e. where your package.json is)').default('a', process.cwd()).alias('c', 'cachedir').describe('c', 'The directory to put the cache').alias('s', 'sourcemapdir').describe('s', 'The directory to store sourcemap if compiler configured to have sourcemap file. Default to cachedir if not specified.').help('h').alias('h', 'help').epilog('Copyright 2015');

if (process.mainModule === module) {
  const argv = yargs.argv;

  if (!argv._ || argv._.length < 1) {
    yargs.showHelp();
    process.exit(-1);
  }

  const sourceDirs = argv._;
  const appDir = argv.a;
  const cacheDir = argv.c;
  const sourceMapDir = argv.s;

  main(appDir, sourceDirs, cacheDir, sourceMapDir).then(() => process.exit(0)).catch(e => {
    console.error(e.message || e);
    d(e.stack);

    console.error("Compilation failed!\nFor extra information, set the DEBUG environment variable to '*'");
    process.exit(-1);
  });
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9jbGkuanMiXSwibmFtZXMiOlsiYXBwRGlyIiwic291cmNlRGlycyIsImNhY2hlRGlyIiwic291cmNlTWFwRGlyIiwiY29tcGlsZXJIb3N0IiwibGVuZ3RoIiwicm9vdENhY2hlRGlyIiwiam9pbiIsInN5bmMiLCJtYXBEaXIiLCJkIiwicHJvY2VzcyIsImVudiIsIk5PREVfRU5WIiwiY29uc29sZSIsImxvZyIsIkpTT04iLCJzdHJpbmdpZnkiLCJlIiwiZXJyb3IiLCJtZXNzYWdlIiwic3RhY2siLCJQcm9taXNlIiwiYWxsIiwibWFwIiwiZGlyIiwiZiIsImNvbXBpbGUiLCJzYXZlQ29uZmlndXJhdGlvbiIsIm1haW4iLCJvbiIsInJlcXVpcmUiLCJ5YXJncyIsInVzYWdlIiwiYWxpYXMiLCJkZXNjcmliZSIsImRlZmF1bHQiLCJjd2QiLCJoZWxwIiwiZXBpbG9nIiwibWFpbk1vZHVsZSIsIm1vZHVsZSIsImFyZ3YiLCJfIiwic2hvd0hlbHAiLCJleGl0IiwiYSIsImMiLCJzIiwidGhlbiIsImNhdGNoIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OzsrQkFrQk8sV0FBb0JBLE1BQXBCLEVBQTRCQyxVQUE1QixFQUF3Q0MsUUFBeEMsRUFBa0RDLFlBQWxELEVBQWdFO0FBQ3JFLFFBQUlDLGVBQWUsSUFBbkI7QUFDQSxRQUFJLENBQUNGLFFBQUQsSUFBYUEsU0FBU0csTUFBVCxHQUFrQixDQUFuQyxFQUFzQztBQUNwQ0gsaUJBQVcsUUFBWDtBQUNEOztBQUVELFFBQUlJLGVBQWUsZUFBS0MsSUFBTCxDQUFVUCxNQUFWLEVBQWtCRSxRQUFsQixDQUFuQjtBQUNBLHFCQUFPTSxJQUFQLENBQVlGLFlBQVo7QUFDQSxRQUFJRyxTQUFTSCxZQUFiOztBQUVBLFFBQUlILFlBQUosRUFBa0I7QUFDaEJNLGVBQVMsZUFBS0YsSUFBTCxDQUFVUCxNQUFWLEVBQWtCRyxZQUFsQixDQUFUO0FBQ0FPLFFBQUcsdUNBQXNDRCxNQUFPLGVBQWhEO0FBQ0EsdUJBQU9ELElB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QUFDQSxRQUFNM0MsU0FBUzBDLEtBQUtJLENBQXBCO0FBQ0EsUUFBTTVDLFdBQVd3QyxLQUFLSyxDQUF0QjtBQUNBLFFBQU01QyxlQUFldUMsS0FBS00sQ0FBMUI7O0FBRUFuQixPQUFLN0IsTUFBTCxFQUFhQyxVQUFiLEVBQXlCQyxRQUF6QixFQUFtQ0MsWUFBbkMsRUFDRzhDLElBREgsQ0FDUSxNQUFNdEMsUUFBUWtDLElBQVIsQ0FBYSxDQUFiLENBRGQsRUFFR0ssS0FGSCxDQUVVaEMsQ0FBRCxJQUFPO0FBQ1pKLFlBQVFLLEtBQVIsQ0FBY0QsRUFBRUUsT0FBRixJQUFhRixDQUEzQjtBQUNBUixNQUFFUSxFQUFFRyxLQUFKOztBQUVBUCxZQUFRSyxLQUFSLENBQWMsdUZBQWQ7QUFDQVIsWUFBUWtDLElBQVIsQ0FBYSxDQUFDLENBQWQ7QUFDRCxHQVJIO0FBU0QiLCJmaWxlIjoiY2xpLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG5cbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IG1rZGlycCBmcm9tICdta2RpcnAnO1xuXG5pbXBvcnQge2NyZWF0ZUNvbXBpbGVySG9zdEZyb21Qcm9qZWN0Um9vdH0gZnJvbSAnLi9jb25maWctcGFyc2VyJztcbmltcG9ydCB7Zm9yQWxsRmlsZXN9IGZyb20gJy4vZm9yLWFsbC1maWxlcyc7XG5cbnByb2Nlc3Mub24oJ3VuaGFuZGxlZFJlamVjdGlvbicsIChlKSA9PiB7XG4gIGQoZS5tZXNzYWdlIHx8IGUpO1xuICBkKGUuc3RhY2sgfHwgJycpO1xufSk7XG5cbnByb2Nlc3Mub24oJ3VuY2F1Z2h0RXhjZXB0aW9uJywgKGUpID0+IHtcbiAgZChlLm1lc3NhZ2UgfHwgZSk7XG4gIGQoZS5zdGFjayB8fCAnJyk7XG59KTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIG1haW4oYXBwRGlyLCBzb3VyY2VEaXJzLCBjYWNoZURpciwgc291cmNlTWFwRGlyKSB7XG4gIGxldCBjb21waWxlckhvc3QgPSBudWxsO1xuICBpZiAoIWNhY2hlRGlyIHx8IGNhY2hlRGlyLmxlbmd0aCA8IDEpIHtcbiAgICBjYWNoZURpciA9ICcuY2FjaGUnO1xuICB9XG5cbiAgbGV0IHJvb3RDYWNoZURpciA9IHBhdGguam9pbihhcHBEaXIsIGNhY2hlRGlyKTtcbiAgbWtkaXJwLnN5bmMocm9vdENhY2hlRGlyKTtcbiAgbGV0IG1hcERpciA9IHJvb3RDYWNoZURpcjtcblxuICBpZiAoc291cmNlTWFwRGlyKSB7XG4gICAgbWFwRGlyID0gcGF0aC5qb2luKGFwcERpciwgc291cmNlTWFwRGlyKTtcbiAgICBkKGBzcGVjaWZlZCBzZXBhcmF0ZSBzb3VyY2UgbWFwIGRpciBhdCAke21hcERpcn0sIGNyZWF0aW5nIGl0YCk7XG4gICAgbWtkaXJwLnN5bmMobWFwRGlyKTtcbiAgfVxuXG4gIGlmIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKSB7XG4gICAgY29uc29sZS5sb2coYFVzaW5nIE5PREVfRU5WID0gJHtwcm9jZXNzLmVudi5OT0RFX0VOViB8fCAnZGV2ZWxvcG1lbnQnfWApO1xuICB9XG5cbiAgZChgbWFpbjogJHthcHBEaXJ9LCAke0pTT04uc3RyaW5naWZ5KHNvdXJjZURpcnMpfWApO1xuICB0cnkge1xuICAgIGNvbXBpbGVySG9zdCA9IGF3YWl0IGNyZWF0ZUNvbXBpbGVySG9zdEZyb21Qcm9qZWN0Um9vdChhcHBEaXIsIHJvb3RDYWNoZURpciwgc291cmNlTWFwRGlyKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGNvbnNvbGUuZXJyb3IoYENvdWxkbid0IHNldCB1cCBjb21waWxlcnM6ICR7ZS5tZXNzYWdlfWApO1xuICAgIGQoZS5zdGFjayk7XG5cbiAgICB0aHJvdyBlO1xuICB9XG5cbiAgYXdhaXQgUHJvbWlzZS5hbGwoc291cmNlRGlycy5tYXAoKGRpcikgPT4gZm9yQWxsRmlsZXMoZGlyLCBhc3luYyAoZikgPT4ge1xuICAgIHRyeSB7XG4gICAgICBkKGBTdGFydGluZyBjb21waWxhdGlvbiBmb3IgJHtmfWApO1xuICAgICAgYXdhaXQgY29tcGlsZXJIb3N0LmNvbXBpbGUoZik7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgY29uc29sZS5lcnJvcihgRmFpbGVkIHRvIGNvbXBpbGUgZmlsZTogJHtmfWApO1xuICAgICAgY29uc29sZS5lcnJvcihlLm1lc3NhZ2UpO1xuXG4gICAgICBkKGUuc3RhY2spO1xuICAgIH1cbiAgfSkpKTtcblxuICBkKCdTYXZpbmcgb3V0IGNvbmZpZ3VyYXRpb24nKTtcbiAgYXdhaXQgY29tcGlsZXJIb3N0LnNhdmVDb25maWd1cmF0aW9uKCk7XG59XG5cbmNvbnN0IGQgPSByZXF1aXJlKCdkZWJ1ZycpKCdlbGVjdHJvbi1jb21waWxlJyk7XG5cbmNvbnN0IHlhcmdzID0gcmVxdWlyZSgneWFyZ3MnKVxuICAudXNhZ2UoJ1VzYWdlOiBlbGVjdHJvbi1jb21waWxlIC0tYXBwZGlyIFtyb290LWFwcC1kaXJdIHBhdGhzLi4uJylcbiAgLmFsaWFzKCdhJywgJ2FwcGRpcicpXG4gIC5kZXNjcmliZSgnYScsICdUaGUgdG9wLWxldmVsIGFwcGxpY2F0aW9uIGRpcmVjdG9yeSAoaS5lLiB3aGVyZSB5b3VyIHBhY2thZ2UuanNvbiBpcyknKVxuICAuZGVmYXVsdCgnYScsIHByb2Nlc3MuY3dkKCkpXG4gIC5hbGlhcygnYycsICdjYWNoZWRpcicpXG4gIC5kZXNjcmliZSgnYycsICdUaGUgZGlyZWN0b3J5IHRvIHB1dCB0aGUgY2FjaGUnKVxuICAuYWxpYXMoJ3MnLCAnc291cmNlbWFwZGlyJylcbiAgLmRlc2NyaWJlKCdzJywgJ1RoZSBkaXJlY3RvcnkgdG8gc3RvcmUgc291cmNlbWFwIGlmIGNvbXBpbGVyIGNvbmZpZ3VyZWQgdG8gaGF2ZSBzb3VyY2VtYXAgZmlsZS4gRGVmYXVsdCB0byBjYWNoZWRpciBpZiBub3Qgc3BlY2lmaWVkLicpXG4gIC5oZWxwKCdoJylcbiAgLmFsaWFzKCdoJywgJ2hlbHAnKVxuICAuZXBpbG9nKCdDb3B5cmlnaHQgMjAxNScpO1xuXG5pZiAocHJvY2Vzcy5tYWluTW9kdWxlID09PSBtb2R1bGUpIHtcbiAgY29uc3QgYXJndiA9IHlhcmdzLmFyZ3Y7XG5cbiAgaWYgKCFhcmd2Ll8gfHwgYXJndi5fLmxlbmd0aCA8IDEpIHtcbiAgICB5YXJncy5zaG93SGVscCgpO1xuICAgIHByb2Nlc3MuZXhpdCgtMSk7XG4gIH1cblxuICBjb25zdCBzb3VyY2VEaXJzID0gYXJndi5fO1xuICBjb25zdCBhcHBEaXIgPSBhcmd2LmE7XG4gIGNvbnN0IGNhY2hlRGlyID0gYXJndi5jO1xuICBjb25zdCBzb3VyY2VNYXBEaXIgPSBhcmd2LnM7XG5cbiAgbWFpbihhcHBEaXIsIHNvdXJjZURpcnMsIGNhY2hlRGlyLCBzb3VyY2VNYXBEaXIpXG4gICAgLnRoZW4oKCkgPT4gcHJvY2Vzcy5leGl0KDApKVxuICAgIC5jYXRjaCgoZSkgPT4ge1xuICAgICAgY29uc29sZS5lcnJvcihlLm1lc3NhZ2UgfHwgZSk7XG4gICAgICBkKGUuc3RhY2spO1xuXG4gICAgICBjb25zb2xlLmVycm9yKFwiQ29tcGlsYXRpb24gZmFpbGVkIVxcbkZvciBleHRyYSBpbmZvcm1hdGlvbiwgc2V0IHRoZSBERUJVRyBlbnZpcm9ubWVudCB2YXJpYWJsZSB0byAnKidcIik7XG4gICAgICBwcm9jZXNzLmV4aXQoLTEpO1xuICAgIH0pO1xufVxuIl19