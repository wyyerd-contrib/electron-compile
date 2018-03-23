'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createCompilerHostFromProjectRoot = exports.createCompilerHostFromConfigFile = exports.createCompilerHostFromBabelRc = undefined;

/**
 * Creates a compiler host from a .babelrc file. This method is usually called
 * from {@link createCompilerHostFromProjectRoot} instead of used directly.
 *
 * @param  {string} file  The path to a .babelrc file
 *
 * @param  {string} rootCacheDir (optional)  The directory to use as a cache.
 *
 * @return {Promise<CompilerHost>}  A set-up compiler host
 */
let createCompilerHostFromBabelRc = exports.createCompilerHostFromBabelRc = (() => {
  var _ref = _asyncToGenerator(function* (file) {
    let rootCacheDir = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    let sourceMapPath = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

    let info = JSON.parse((yield _promise.pfs.readFile(file, 'utf8')));

    // package.json
    if ('babel' in info) {
      info = info.babel;
    }

    if ('env' in info) {
      let ourEnv = process.env.BABEL_ENV || process.env.NODE_ENV || 'development';
      info = info.env[ourEnv];
    }

    // Are we still package.json (i.e. is there no babel info whatsoever?)
    if ('name' in info && 'version' in info) {
      let appRoot = _path2.default.dirname(file);
      return createCompilerHostFromConfiguration({
        appRoot: appRoot,
        options: getDefaultConfiguration(appRoot),
        rootCacheDir,
        sourceMapPath
      });
    }

    return createCompilerHostFromConfiguration({
      appRoot: _path2.default.dirname(file),
      options: {
        'application/javascript': info
      },
      rootCacheDir,
      sourceMapPath
    });
  });

  return function createCompilerHostFromBabelRc(_x5) {
    return _ref.apply(this, arguments);
  };
})();

/**
 * Creates a compiler host from a .compilerc file. This method is usually called
 * from {@link createCompilerHostFromProjectRoot} instead of used directly.
 *
 * @param  {string} file  The path to a .compilerc file
 *
 * @param  {string} rootCacheDir (optional)  The directory to use as a cache.
 *
 * @return {Promise<CompilerHost>}  A set-up compiler host
 */


let createCompilerHostFromConfigFile = exports.createCompilerHostFromConfigFile = (() => {
  var _ref2 = _asyncToGenerator(function* (file) {
    let rootCacheDir = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    let sourceMapPath = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

    let info = JSON.parse((yield _promise.pfs.readFile(file, 'utf8')));

    if ('env' in info) {
      let ourEnv = process.env.ELECTRON_COMPILE_ENV || process.env.NODE_ENV || 'development';
      info = info.env[ourEnv];
    }

    return createCompilerHostFromConfiguration({
      appRoot: _path2.default.dirname(file),
      options: info,
      rootCacheDir,
      sourceMapPath
    });
  });

  return function createCompilerHostFromConfigFile(_x8) {
    return _ref2.apply(this, arguments);
  };
})();

/**
 * Creates a configured {@link CompilerHost} instance from the project root
 * directory. This method first searches for a .compilerc (or .compilerc.json), then falls back to the
 * default locations for Babel configuration info. If neither are found, defaults
 * to standard settings
 *
 * @param  {string} rootDir  The root application directory (i.e. the directory
 *                           that has the app's package.json)
 *
 * @param  {string} rootCacheDir (optional)  The directory to use as a cache.
 *
 * @param {string} sourceMapPath (optional) The directory to store sourcemap separately
 *                               if compiler option enabled to emit.
 *
 * @return {Promise<CompilerHost>}  A set-up compiler host
 */


let createCompilerHostFromProjectRoot = exports.createCompilerHostFromProjectRoot = (() => {
  var _ref3 = _asyncToGenerator(function* (rootDir) {
    let rootCacheDir = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    let sourceMapPath = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

    let compilerc = _path2.default.join(rootDir, '.compilerc');
    if (statSyncNoException(compilerc)) {
      d(`Found a .compilerc at ${compilerc}, using it`);
      return yield createCompilerHostFromConfigFile(compilerc, rootCacheDir, sourceMapPath);
    }
    compilerc += '.json';
    if (statSyncNoException(compilerc)) {
      d(`Found a .compilerc at ${compilerc}, using it`);
      return yield createCompilerHostFromConfigFile(compilerc, rootCacheDir, sourceMapPath);
    }

    let babelrc = _path2.default.join(rootDir, '.babelrc');
    if (statSyncNoException(babelrc)) {
      d(`Found a .babelrc at ${babelrc}, using it`);
      return yield createCompilerHostFromBabelRc(babelrc, rootCacheDir, sourceMapPath);
    }

    d(`Using package.json or default parameters at ${rootDir}`);
    return yield createCompilerHostFromBabelRc(_path2.default.join(rootDir, 'package.json'), rootCacheDir, sourceMapPath);
  });

  return function createCompilerHostFromProjectRoot(_x11) {
    return _ref3.apply(this, arguments);
  };
})();

exports.initializeGlobalHooks = initializeGlobalHooks;
exports.init = init;
exports.createCompilerHostFromConfiguration = createCompilerHostFromConfiguration;
exports.createCompilerHostFromBabelRcSync = createCompilerHostFromBabelRcSync;
exports.createCompilerHostFromConfigFileSync = createCompilerHostFromConfigFileSync;
exports.createCompilerHostFromProjectRootSync = createCompilerHostFromProjectRootSync;
exports.calculateDefaultCompileCacheDirectory = calculateDefaultCompileCacheDirectory;
exports.getDefaultConfiguration = getDefaultConfiguration;
exports.createCompilers = createCompilers;

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _zlib = require('zlib');

var _zlib2 = _interopRequireDefault(_zlib);

var _mkdirp = require('mkdirp');

var _mkdirp2 = _interopRequireDefault(_mkdirp);

var _promise = require('./promise');

var _fileChangeCache = require('./file-change-cache');

var _fileChangeCache2 = _interopRequireDefault(_fileChangeCache);

var _compilerHost = require('./compiler-host');

var _compilerHost2 = _interopRequireDefault(_compilerHost);

var _requireHook = require('./require-hook');

var _requireHook2 = _interopRequireDefault(_requireHook);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const d = require('debug')('electron-compile:config-parser');

// NB: We intentionally delay-load this so that in production, you can create
// cache-only versions of these compilers
let allCompilerClasses = null;

function statSyncNoException(fsPath) {
  if ('statSyncNoException' in _fs2.default) {
    return _fs2.default.statSyncNoException(fsPath);
  }

  try {
    return _fs2.default.statSync(fsPath);
  } catch (e) {
    return null;
  }
}

/**
 * Initialize the global hooks (protocol hook for file:, node.js hook)
 * independent of initializing the compiler. This method is usually called by
 * init instead of directly
 *
 * @param {CompilerHost} compilerHost  The compiler host to use.
 *
 */
function initializeGlobalHooks(compilerHost) {
  let isProduction = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

  let globalVar = global || window;
  globalVar.globalCompilerHost = compilerHost;

  (0, _requireHook2.default)(compilerHost, isProduction);

  if ('type' in process && process.type === 'browser') {
    var _require = require('electron');

    const app = _require.app;

    var _require2 = require('./protocol-hook');

    const initializeProtocolHook = _require2.initializeProtocolHook;


    let protoify = function () {
      initializeProtocolHook(compilerHost);
    };
    if (app.isReady()) {
      protoify();
    } else {
      app.on('ready', protoify);
    }
  }
}

/**
 * Initialize electron-compile and set it up, either for development or
 * production use. This is almost always the only method you need to use in order
 * to use electron-compile.
 *
 * @param  {string} appRoot  The top-level directory for your application (i.e.
 *                           the one which has your package.json).
 *
 * @param  {string} mainModule  The module to require in, relative to the module
 *                              calling init, that will start your app. Write this
 *                              as if you were writing a require call from here.
 *
 * @param  {bool} productionMode   If explicitly True/False, will set read-only
 *                                 mode to be disabled/enabled. If not, we'll
 *                                 guess based on the presence of a production
 *                                 cache.
 *
 * @param  {string} cacheDir  If not passed in, read-only will look in
 *                            `appRoot/.cache` and dev mode will compile to a
 *                            temporary directory. If it is passed in, both modes
 *                            will cache to/from `appRoot/{cacheDir}`
 *
 * @param {string} sourceMapPath (optional) The directory to store sourcemap separately
 *                               if compiler option enabled to emit.
 *                               Default to cachePath if not specified, will be ignored for read-only mode.
 */
function init(appRoot, mainModule) {
  let productionMode = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
  let cacheDir = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
  let sourceMapPath = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : null;

  let compilerHost = null;
  let rootCacheDir = _path2.default.join(appRoot, cacheDir || '.cache');

  if (productionMode === null) {
    productionMode = !!statSyncNoException(rootCacheDir);
  }

  if (productionMode) {
    compilerHost = _compilerHost2.default.createReadonlyFromConfigurationSync(rootCacheDir, appRoot);
  } else {
    // if cacheDir was passed in, pass it along. Otherwise, default to a tempdir.
    const cachePath = cacheDir ? rootCacheDir : null;
    const mapPath = sourceMapPath ? _path2.default.join(appRoot, sourceMapPath) : cachePath;
    compilerHost = createCompilerHostFromProjectRootSync(appRoot, cachePath, mapPath);
  }

  initializeGlobalHooks(compilerHost, productionMode);
  require.main.require(mainModule);
}

/**
 * Creates a {@link CompilerHost} with the given information. This method is
 * usually called by {@link createCompilerHostFromProjectRoot}.
 *
 * @private
 */
function createCompilerHostFromConfiguration(info) {
  let compilers = createCompilers();
  let rootCacheDir = info.rootCacheDir || calculateDefaultCompileCacheDirectory();
  const sourceMapPath = info.sourceMapPath || info.rootCacheDir;

  if (info.sourceMapPath) {
    createSourceMapDirectory(sourceMapPath);
  }

  d(`Creating CompilerHost: ${JSON.stringify(info)}, rootCacheDir = ${rootCacheDir}, sourceMapPath = ${sourceMapPath}`);
  let fileChangeCache = new _fileChangeCache2.default(info.appRoot);

  let compilerInfo = _path2.default.join(rootCacheDir, 'compiler-info.json.gz');
  let json = {};
  if (_fs2.default.existsSync(compilerInfo)) {
    let buf = _fs2.default.readFileSync(compilerInfo);
    json = JSON.parse(_zlib2.default.gunzipSync(buf));
    fileChangeCache = _fileChangeCache2.default.loadFromData(json.fileChangeCache, info.appRoot, false);
  }

  Object.keys(info.options || {}).forEach(x => {
    let opts = info.options[x];
    if (!(x in compilers)) {
      throw new Error(`Found compiler settings for missing compiler: ${x}`);
    }

    // NB: Let's hope this isn't a valid compiler option...
    if (opts.passthrough) {
      compilers[x] = compilers['text/plain'];
      delete opts.passthrough;
    }

    d(`Setting options for ${x}: ${JSON.stringify(opts)}`);
    compilers[x].compilerOptions = opts;
  });

  let ret = new _compilerHost2.default(rootCacheDir, compilers, fileChangeCache, false, compilers['text/plain'], null, json.mimeTypesToRegister);

  // NB: It's super important that we guarantee that the configuration is saved
  // out, because we'll need to re-read it in the renderer process
  d(`Created compiler host with options: ${JSON.stringify(info)}`);
  ret.saveConfigurationSync();
  return ret;
}function createCompilerHostFromBabelRcSync(file) {
  let rootCacheDir = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  let sourceMapPath = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

  let info = JSON.parse(_fs2.default.readFileSync(file, 'utf8'));

  // package.json
  if ('babel' in info) {
    info = info.babel;
  }

  if ('env' in info) {
    let ourEnv = process.env.BABEL_ENV || process.env.NODE_ENV || 'development';
    info = info.env[ourEnv];
  }

  // Are we still package.json (i.e. is there no babel info whatsoever?)
  if ('name' in info && 'version' in info) {
    let appRoot = _path2.default.dirname(file);
    return createCompilerHostFromConfiguration({
      appRoot: appRoot,
      options: getDefaultConfiguration(appRoot),
      rootCacheDir,
      sourceMapPath
    });
  }

  return createCompilerHostFromConfiguration({
    appRoot: _path2.default.dirname(file),
    options: {
      'application/javascript': info
    },
    rootCacheDir,
    sourceMapPath
  });
}

function createCompilerHostFromConfigFileSync(file) {
  let rootCacheDir = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  let sourceMapPath = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

  let info = JSON.parse(_fs2.default.readFileSync(file, 'utf8'));

  if ('env' in info) {
    let ourEnv = process.env.ELECTRON_COMPILE_ENV || process.env.NODE_ENV || 'development';
    info = info.env[ourEnv];
  }

  return createCompilerHostFromConfiguration({
    appRoot: _path2.default.dirname(file),
    options: info,
    rootCacheDir,
    sourceMapPath
  });
}

function createCompilerHostFromProjectRootSync(rootDir) {
  let rootCacheDir = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  let sourceMapPath = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

  let compilerc = _path2.default.join(rootDir, '.compilerc');
  if (statSyncNoException(compilerc)) {
    d(`Found a .compilerc at ${compilerc}, using it`);
    return createCompilerHostFromConfigFileSync(compilerc, rootCacheDir, sourceMapPath);
  }

  let babelrc = _path2.default.join(rootDir, '.babelrc');
  if (statSyncNoException(babelrc)) {
    d(`Found a .babelrc at ${babelrc}, using it`);
    return createCompilerHostFromBabelRcSync(babelrc, rootCacheDir, sourceMapPath);
  }

  d(`Using package.json or default parameters at ${rootDir}`);
  return createCompilerHostFromBabelRcSync(_path2.default.join(rootDir, 'package.json'), rootCacheDir, sourceMapPath);
}

/**
 * Returns what electron-compile would use as a default rootCacheDir. Usually only
 * used for debugging purposes
 *
 * @return {string}  A path that may or may not exist where electron-compile would
 *                   set up a development mode cache.
 */
function calculateDefaultCompileCacheDirectory() {
  let tmpDir = process.env.TEMP || process.env.TMPDIR || '/tmp';
  let hash = require('crypto').createHash('md5').update(process.execPath).digest('hex');

  let cacheDir = _path2.default.join(tmpDir, `compileCache_${hash}`);
  _mkdirp2.default.sync(cacheDir);

  d(`Using default cache directory: ${cacheDir}`);
  return cacheDir;
}

function createSourceMapDirectory(sourceMapPath) {
  _mkdirp2.default.sync(sourceMapPath);
  d(`Using separate sourcemap path at ${sourceMapPath}`);
}

function getElectronVersion(rootDir) {
  if (process.versions.electron) {
    return process.versions.electron;
  }

  let ourPkgJson = require(_path2.default.join(rootDir, 'package.json'));

  let version = ['electron-prebuilt-compile', 'electron'].map(mod => {
    if (ourPkgJson.devDependencies && ourPkgJson.devDependencies[mod]) {
      // NB: lol this code
      let verRange = ourPkgJson.devDependencies[mod];
      let m = verRange.match(/(\d+\.\d+\.\d+)/);
      if (m && m[1]) return m[1];
    }

    try {
      return process.mainModule.require(`${mod}/package.json`).version;
    } catch (e) {
      // NB: This usually doesn't work, but sometimes maybe?
    }

    try {
      let p = _path2.default.join(rootDir, mod, 'package.json');
      return require(p).version;
    } catch (e) {
      return null;
    }
  }).find(x => !!x);

  if (!version) {
    throw new Error("Can't automatically discover the version of Electron, you probably need a .compilerc file");
  }

  return version;
}

/**
 * Returns the default .configrc if no configuration information can be found.
 *
 * @return {Object}  A list of default config settings for electron-compiler.
 */
function getDefaultConfiguration(rootDir) {
  return {
    'application/javascript': {
      "presets": [["env", {
        "targets": {
          "electron": getElectronVersion(rootDir)
        }
      }], "react"],
      "sourceMaps": "inline"
    }
  };
}

/**
 * Allows you to create new instances of all compilers that are supported by
 * electron-compile and use them directly. Currently supports Babel, CoffeeScript,
 * TypeScript, Less, and Jade.
 *
 * @return {Object}  An Object whose Keys are MIME types, and whose values
 * are instances of @{link CompilerBase}.
 */
function createCompilers() {
  if (!allCompilerClasses) {
    // First we want to see if electron-compilers itself has been installed with
    // devDependencies. If that's not the case, check to see if
    // electron-compilers is installed as a peer dependency (probably as a
    // devDependency of the root project).
    const locations = ['electron-compilers', '../../electron-compilers'];

    for (let location of locations) {
      try {
        allCompilerClasses = require(location);
      } catch (e) {
        // Yolo
      }
    }

    if (!allCompilerClasses) {
      throw new Error("Electron compilers not found but were requested to be loaded");
    }
  }

  // NB: Note that this code is carefully set up so that InlineHtmlCompiler
  // (i.e. classes with `createFromCompilers`) initially get an empty object,
  // but will have a reference to the final result of what we return, which
  // resolves the circular dependency we'd otherwise have here.
  let ret = {};
  let instantiatedClasses = allCompilerClasses.map(Klass => {
    if ('createFromCompilers' in Klass) {
      return Klass.createFromCompilers(ret);
    } else {
      return new Klass();
    }
  });

  instantiatedClasses.reduce((acc, x) => {
    let Klass = Object.getPrototypeOf(x).constructor;

    for (let type of Klass.getInputMimeTypes()) {
      acc[type] = x;
    }
    return acc;
  }, ret);

  return ret;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9jb25maWctcGFyc2VyLmpzIl0sIm5hbWVzIjpbImZpbGUiLCJyb290Q2FjaGVEaXIiLCJzb3VyY2VNYXBQYXRoIiwiaW5mbyIsIkpTT04iLCJwYXJzZSIsInJlYWRGaWxlIiwiYmFiZWwiLCJvdXJFbnYiLCJwcm9jZXNzIiwiZW52IiwiQkFCRUxfRU5WIiwiTk9ERV9FTlYiLCJhcHBSb290IiwiZGlybmFtZSIsImNyZWF0ZUNvbXBpbGVySG9zdEZyb21Db25maWd1cmF0aW9uIiwib3B0aW9ucyIsImdldERlZmF1bHRDb25maWd1cmF0aW9uIiwiY3JlYXRlQ29tcGlsZXJIb3N0RnJvbUJhYmVsUmMiLCJFTEVDVFJPTl9DT01QSUxFX0VOViIsImNyZWF0ZUNvbXBpbGVySG9zdEZyb21Db25maWdGaWxlIiwicm9vdERpciIsImNvbXBpbGVyYyIsImpvaW4iLCJzdGF0U3luY05vRXhjZXB0aW9uIiwiZCIsImJhYmVscmMiLCJjcmVhdGVDb21waWxlckhvc3RGcm9tUHJvamVjdFJvb3QiLCJpbml0aWFsaXplR2xvYmFsSG9va3MiLCJpbml0IiwiY3JlYXRlQ29tcGlsZXJIb3N0RnJvbUJhYmVsUmNTeW5jIiwiY3JlYXRlQ29tcGlsZXJIb3N0RnJvbUNvbmZpZ0ZpbGVTeW5jIiwiY3JlYXRlQ29tcGlsZXJIb3N0RnJvbVByb2plY3RSb290U3luYyIsImNhbGN1bGF0ZURlZmF1bHRDb21waWxlQ2FjaGVEaXJlY3RvcnkiLCJjcmVhdGVDb21waWxlcnMiLCJyZXF1aXJlIiwiYWxsQ29tcGlsZXJDbGFzc2VzIiwiZnNQYXRoIiwic3RhdFN5bmMiLCJlIiwiY29tcGlsZXJIb3N0IiwiaXNQcm9kdWN0aW9uIiwiZ2xvYmFsVmFyIiwiZ2xvYmFsIiwid2luZG93IiwiZ2xvYmFsQ29tcGlsZXJIb3N0IiwidHlwZSIsImFwcCIsImluaXRpYWxpemVQcm90b2NvbEhvb2siLCJwcm90b2lmeSIsImlzUmVhZHkiLCJvbiIsIm1haW5Nb2R1bGUiLCJwcm9kdWN0aW9uTW9kZSIsImNhY2hlRGlyIiwiY3JlYXRlUmVhZG9ubHlGcm9tQ29uZmlndXJhdGlvblN5bmMiLCJjYWNoZVBhdGgiLCJtYXBQYXRoIiwibWFpbiIsImNvbXBpbGVycyIsImNyZWF0ZVNvdXJjZU1hcERpcmVjdG9yeSIsInN0cmluZ2lmeSIsImZpbGVDaGFuZ2VDYWNoZSIsImNvbXBpbGVySW5mbyIsImpzb24iLCJleGlzdHNTeW5jIiwiYnVmIiwicmVhZEZpbGVTeW5jIiwiZ3VuemlwU3luYyIsImxvYWRGcm9tRGF0YSIsIk9iamVjdCIsImtleXMiLCJmb3JFYWNoIiwieCIsIm9wdHMiLCJFcnJvciIsInBhc3N0aHJvdWdoIiwiY29tcGlsZXJPcHRpb25zIiwicmV0IiwibWltZVR5cGVzVG9SZWdpc3RlciIsInNhdmVDb25maWd1cmF0aW9uU3luYyIsInRtcERpciIsIlRFTVAiLCJUTVBESVIiLCJoYXNoIiwiY3JlYXRlSGFzaCIsInVwZGF0ZSIsImV4ZWNQYXRoIiwiZGlnZXN0Iiwic3luYyIsImdldEVsZWN0cm9uVmVyc2lvbiIsInZlcnNpb25zIiwiZWxlY3Ryb24iLCJvdXJQa2dKc29uIiwidmVyc2lvbiIsIm1hcCIsIm1vZCIsImRldkRlcGVuZGVuY2llcyIsInZlclJhbmdlIiwibSIsIm1hdGNoIiwicCIsImZpbmQiLCJsb2NhdGlvbnMiLCJsb2NhdGlvbiIsImluc3RhbnRpYXRlZENsYXNzZXMiLCJLbGFzcyIsImNyZWF0ZUZyb21Db21waWxlcnMiLCJyZWR1Y2UiLCJhY2MiLCJnZXRQcm90b3R5cGVPZiIsImNvbnN0cnVjdG9yIiwiZ2V0SW5wdXRNaW1lVHlwZXMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUE0SkE7Ozs7Ozs7Ozs7OytCQVVPLFdBQTZDQSxJQUE3QyxFQUE0RjtBQUFBLFFBQXpDQyxZQUF5Qyx1RUFBNUIsSUFBNEI7QUFBQSxRQUF0QkMsYUFBc0IsdUVBQU4sSUFBTTs7QUFDakcsUUFBSUMsT0FBT0MsS0FBS0MsS0FBTCxFQUFXLE1BQU0sYUFBSUMsUUFBSixDQUFhTixJQUFi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UDtBQUNELEtBRkQsTUFFTztBQUNMLGFBQU8sSUFBSTRCLEtBQUosRUFBUDtBQUNEO0FBQ0YsR0FOeUIsQ0FBMUI7O0FBUUFELHNCQUFvQkcsTUFBcEIsQ0FBMkIsQ0FBQ0MsR0FBRCxFQUFLcEMsQ0FBTCxLQUFXO0FBQ3BDLFFBQUlpQyxRQUFRcEMsT0FBT3dDLGNBQVAsQ0FBc0JyQyxDQUF0QixFQUF5QnNDLFdBQXJDOztBQUVBLFNBQUssSUFBSWpFLElBQVQsSUFBaUI0RCxNQUFNTSxpQkFBTixFQUFqQixFQUE0QztBQUFFSCxVQUFJL0QsSUFBSixJQUFZMkIsQ0FBWjtBQUFnQjtBQUM5RCxXQUFPb0MsR0FBUDtBQUNELEdBTEQsRUFLRy9CLEdBTEg7O0FBT0EsU0FBT0EsR0FBUDtBQUNEIiwiZmlsZSI6ImNvbmZpZy1wYXJzZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgemxpYiBmcm9tICd6bGliJztcbmltcG9ydCBta2RpcnAgZnJvbSAnbWtkaXJwJztcbmltcG9ydCB7cGZzfSBmcm9tICcuL3Byb21pc2UnO1xuXG5pbXBvcnQgRmlsZUNoYW5nZWRDYWNoZSBmcm9tICcuL2ZpbGUtY2hhbmdlLWNhY2hlJztcbmltcG9ydCBDb21waWxlckhvc3QgZnJvbSAnLi9jb21waWxlci1ob3N0JztcbmltcG9ydCByZWdpc3RlclJlcXVpcmVFeHRlbnNpb24gZnJvbSAnLi9yZXF1aXJlLWhvb2snO1xuXG5jb25zdCBkID0gcmVxdWlyZSgnZGVidWcnKSgnZWxlY3Ryb24tY29tcGlsZTpjb25maWctcGFyc2VyJyk7XG5cbi8vIE5COiBXZSBpbnRlbnRpb25hbGx5IGRlbGF5LWxvYWQgdGhpcyBzbyB0aGF0IGluIHByb2R1Y3Rpb24sIHlvdSBjYW4gY3JlYXRlXG4vLyBjYWNoZS1vbmx5IHZlcnNpb25zIG9mIHRoZXNlIGNvbXBpbGVyc1xubGV0IGFsbENvbXBpbGVyQ2xhc3NlcyA9IG51bGw7XG5cbmZ1bmN0aW9uIHN0YXRTeW5jTm9FeGNlcHRpb24oZnNQYXRoKSB7XG4gIGlmICgnc3RhdFN5bmNOb0V4Y2VwdGlvbicgaW4gZnMpIHtcbiAgICByZXR1cm4gZnMuc3RhdFN5bmNOb0V4Y2VwdGlvbihmc1BhdGgpO1xuICB9XG5cbiAgdHJ5IHtcbiAgICByZXR1cm4gZnMuc3RhdFN5bmMoZnNQYXRoKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cblxuLyoqXG4gKiBJbml0aWFsaXplIHRoZSBnbG9iYWwgaG9va3MgKHByb3RvY29sIGhvb2sgZm9yIGZpbGU6LCBub2RlLmpzIGhvb2spXG4gKiBpbmRlcGVuZGVudCBvZiBpbml0aWFsaXppbmcgdGhlIGNvbXBpbGVyLiBUaGlzIG1ldGhvZCBpcyB1c3VhbGx5IGNhbGxlZCBieVxuICogaW5pdCBpbnN0ZWFkIG9mIGRpcmVjdGx5XG4gKlxuICogQHBhcmFtIHtDb21waWxlckhvc3R9IGNvbXBpbGVySG9zdCAgVGhlIGNvbXBpbGVyIGhvc3QgdG8gdXNlLlxuICpcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGluaXRpYWxpemVHbG9iYWxIb29rcyhjb21waWxlckhvc3QsIGlzUHJvZHVjdGlvbj1mYWxzZSkge1xuICBsZXQgZ2xvYmFsVmFyID0gKGdsb2JhbCB8fCB3aW5kb3cpO1xuICBnbG9iYWxWYXIuZ2xvYmFsQ29tcGlsZXJIb3N0ID0gY29tcGlsZXJIb3N0O1xuXG4gIHJlZ2lzdGVyUmVxdWlyZUV4dGVuc2lvbihjb21waWxlckhvc3QsIGlzUHJvZHVjdGlvbik7XG5cbiAgaWYgKCd0eXBlJyBpbiBwcm9jZXNzICYmIHByb2Nlc3MudHlwZSA9PT0gJ2Jyb3dzZXInKSB7XG4gICAgY29uc3QgeyBhcHAgfSA9IHJlcXVpcmUoJ2VsZWN0cm9uJyk7XG4gICAgY29uc3QgeyBpbml0aWFsaXplUHJvdG9jb2xIb29rIH0gPSByZXF1aXJlKCcuL3Byb3RvY29sLWhvb2snKTtcblxuICAgIGxldCBwcm90b2lmeSA9IGZ1bmN0aW9uKCkgeyBpbml0aWFsaXplUHJvdG9jb2xIb29rKGNvbXBpbGVySG9zdCk7IH07XG4gICAgaWYgKGFwcC5pc1JlYWR5KCkpIHtcbiAgICAgIHByb3RvaWZ5KCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGFwcC5vbigncmVhZHknLCBwcm90b2lmeSk7XG4gICAgfVxuICB9XG59XG5cblxuLyoqXG4gKiBJbml0aWFsaXplIGVsZWN0cm9uLWNvbXBpbGUgYW5kIHNldCBpdCB1cCwgZWl0aGVyIGZvciBkZXZlbG9wbWVudCBvclxuICogcHJvZHVjdGlvbiB1c2UuIFRoaXMgaXMgYWxtb3N0IGFsd2F5cyB0aGUgb25seSBtZXRob2QgeW91IG5lZWQgdG8gdXNlIGluIG9yZGVyXG4gKiB0byB1c2UgZWxlY3Ryb24tY29tcGlsZS5cbiAqXG4gKiBAcGFyYW0gIHtzdHJpbmd9IGFwcFJvb3QgIFRoZSB0b3AtbGV2ZWwgZGlyZWN0b3J5IGZvciB5b3VyIGFwcGxpY2F0aW9uIChpLmUuXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoZSBvbmUgd2hpY2ggaGFzIHlvdXIgcGFja2FnZS5qc29uKS5cbiAqXG4gKiBAcGFyYW0gIHtzdHJpbmd9IG1haW5Nb2R1bGUgIFRoZSBtb2R1bGUgdG8gcmVxdWlyZSBpbiwgcmVsYXRpdmUgdG8gdGhlIG1vZHVsZVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsaW5nIGluaXQsIHRoYXQgd2lsbCBzdGFydCB5b3VyIGFwcC4gV3JpdGUgdGhpc1xuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcyBpZiB5b3Ugd2VyZSB3cml0aW5nIGEgcmVxdWlyZSBjYWxsIGZyb20gaGVyZS5cbiAqXG4gKiBAcGFyYW0gIHtib29sfSBwcm9kdWN0aW9uTW9kZSAgIElmIGV4cGxpY2l0bHkgVHJ1ZS9GYWxzZSwgd2lsbCBzZXQgcmVhZC1vbmx5XG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vZGUgdG8gYmUgZGlzYWJsZWQvZW5hYmxlZC4gSWYgbm90LCB3ZSdsbFxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBndWVzcyBiYXNlZCBvbiB0aGUgcHJlc2VuY2Ugb2YgYSBwcm9kdWN0aW9uXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhY2hlLlxuICpcbiAqIEBwYXJhbSAge3N0cmluZ30gY2FjaGVEaXIgIElmIG5vdCBwYXNzZWQgaW4sIHJlYWQtb25seSB3aWxsIGxvb2sgaW5cbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgIGBhcHBSb290Ly5jYWNoZWAgYW5kIGRldiBtb2RlIHdpbGwgY29tcGlsZSB0byBhXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wb3JhcnkgZGlyZWN0b3J5LiBJZiBpdCBpcyBwYXNzZWQgaW4sIGJvdGggbW9kZXNcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpbGwgY2FjaGUgdG8vZnJvbSBgYXBwUm9vdC97Y2FjaGVEaXJ9YFxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBzb3VyY2VNYXBQYXRoIChvcHRpb25hbCkgVGhlIGRpcmVjdG9yeSB0byBzdG9yZSBzb3VyY2VtYXAgc2VwYXJhdGVseVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgY29tcGlsZXIgb3B0aW9uIGVuYWJsZWQgdG8gZW1pdC5cbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIERlZmF1bHQgdG8gY2FjaGVQYXRoIGlmIG5vdCBzcGVjaWZpZWQsIHdpbGwgYmUgaWdub3JlZCBmb3IgcmVhZC1vbmx5IG1vZGUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbml0KGFwcFJvb3QsIG1haW5Nb2R1bGUsIHByb2R1Y3Rpb25Nb2RlID0gbnVsbCwgY2FjaGVEaXIgPSBudWxsLCBzb3VyY2VNYXBQYXRoID0gbnVsbCkge1xuICBsZXQgY29tcGlsZXJIb3N0ID0gbnVsbDtcbiAgbGV0IHJvb3RDYWNoZURpciA9IHBhdGguam9pbihhcHBSb290LCBjYWNoZURpciB8fCAnLmNhY2hlJyk7XG5cbiAgaWYgKHByb2R1Y3Rpb25Nb2RlID09PSBudWxsKSB7XG4gICAgcHJvZHVjdGlvbk1vZGUgPSAhIXN0YXRTeW5jTm9FeGNlcHRpb24ocm9vdENhY2hlRGlyKTtcbiAgfVxuXG4gIGlmIChwcm9kdWN0aW9uTW9kZSkge1xuICAgIGNvbXBpbGVySG9zdCA9IENvbXBpbGVySG9zdC5jcmVhdGVSZWFkb25seUZyb21Db25maWd1cmF0aW9uU3luYyhyb290Q2FjaGVEaXIsIGFwcFJvb3QpO1xuICB9IGVsc2Uge1xuICAgIC8vIGlmIGNhY2hlRGlyIHdhcyBwYXNzZWQgaW4sIHBhc3MgaXQgYWxvbmcuIE90aGVyd2lzZSwgZGVmYXVsdCB0byBhIHRlbXBkaXIuXG4gICAgY29uc3QgY2FjaGVQYXRoID0gY2FjaGVEaXIgPyByb290Q2FjaGVEaXIgOiBudWxsO1xuICAgIGNvbnN0IG1hcFBhdGggPSBzb3VyY2VNYXBQYXRoID8gcGF0aC5qb2luKGFwcFJvb3QsIHNvdXJjZU1hcFBhdGgpIDogY2FjaGVQYXRoO1xuICAgIGNvbXBpbGVySG9zdCA9IGNyZWF0ZUNvbXBpbGVySG9zdEZyb21Qcm9qZWN0Um9vdFN5bmMoYXBwUm9vdCwgY2FjaGVQYXRoLCBtYXBQYXRoKTtcbiAgfVxuXG4gIGluaXRpYWxpemVHbG9iYWxIb29rcyhjb21waWxlckhvc3QsIHByb2R1Y3Rpb25Nb2RlKTtcbiAgcmVxdWlyZS5tYWluLnJlcXVpcmUobWFpbk1vZHVsZSk7XG59XG5cblxuLyoqXG4gKiBDcmVhdGVzIGEge0BsaW5rIENvbXBpbGVySG9zdH0gd2l0aCB0aGUgZ2l2ZW4gaW5mb3JtYXRpb24uIFRoaXMgbWV0aG9kIGlzXG4gKiB1c3VhbGx5IGNhbGxlZCBieSB7QGxpbmsgY3JlYXRlQ29tcGlsZXJIb3N0RnJvbVByb2plY3RSb290fS5cbiAqXG4gKiBAcHJpdmF0ZVxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlQ29tcGlsZXJIb3N0RnJvbUNvbmZpZ3VyYXRpb24oaW5mbykge1xuICBsZXQgY29tcGlsZXJzID0gY3JlYXRlQ29tcGlsZXJzKCk7XG4gIGxldCByb290Q2FjaGVEaXIgPSBpbmZvLnJvb3RDYWNoZURpciB8fCBjYWxjdWxhdGVEZWZhdWx0Q29tcGlsZUNhY2hlRGlyZWN0b3J5KCk7XG4gIGNvbnN0IHNvdXJjZU1hcFBhdGggPSBpbmZvLnNvdXJjZU1hcFBhdGggfHwgaW5mby5yb290Q2FjaGVEaXI7XG5cbiAgaWYgKGluZm8uc291cmNlTWFwUGF0aCkge1xuICAgIGNyZWF0ZVNvdXJjZU1hcERpcmVjdG9yeShzb3VyY2VNYXBQYXRoKTtcbiAgfVxuXG4gIGQoYENyZWF0aW5nIENvbXBpbGVySG9zdDogJHtKU09OLnN0cmluZ2lmeShpbmZvKX0sIHJvb3RDYWNoZURpciA9ICR7cm9vdENhY2hlRGlyfSwgc291cmNlTWFwUGF0aCA9ICR7c291cmNlTWFwUGF0aH1gKTtcbiAgbGV0IGZpbGVDaGFuZ2VDYWNoZSA9IG5ldyBGaWxlQ2hhbmdlZENhY2hlKGluZm8uYXBwUm9vdCk7XG5cbiAgbGV0IGNvbXBpbGVySW5mbyA9IHBhdGguam9pbihyb290Q2FjaGVEaXIsICdjb21waWxlci1pbmZvLmpzb24uZ3onKTtcbiAgbGV0IGpzb24gPSB7fTtcbiAgaWYgKGZzLmV4aXN0c1N5bmMoY29tcGlsZXJJbmZvKSkge1xuICAgIGxldCBidWYgPSBmcy5yZWFkRmlsZVN5bmMoY29tcGlsZXJJbmZvKTtcbiAgICBqc29uID0gSlNPTi5wYXJzZSh6bGliLmd1bnppcFN5bmMoYnVmKSk7XG4gICAgZmlsZUNoYW5nZUNhY2hlID0gRmlsZUNoYW5nZWRDYWNoZS5sb2FkRnJvbURhdGEoanNvbi5maWxlQ2hhbmdlQ2FjaGUsIGluZm8uYXBwUm9vdCwgZmFsc2UpO1xuICB9XG5cbiAgT2JqZWN0LmtleXMoaW5mby5vcHRpb25zIHx8IHt9KS5mb3JFYWNoKCh4KSA9PiB7XG4gICAgbGV0IG9wdHMgPSBpbmZvLm9wdGlvbnNbeF07XG4gICAgaWYgKCEoeCBpbiBjb21waWxlcnMpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEZvdW5kIGNvbXBpbGVyIHNldHRpbmdzIGZvciBtaXNzaW5nIGNvbXBpbGVyOiAke3h9YCk7XG4gICAgfVxuXG4gICAgLy8gTkI6IExldCdzIGhvcGUgdGhpcyBpc24ndCBhIHZhbGlkIGNvbXBpbGVyIG9wdGlvbi4uLlxuICAgIGlmIChvcHRzLnBhc3N0aHJvdWdoKSB7XG4gICAgICBjb21waWxlcnNbeF0gPSBjb21waWxlcnNbJ3RleHQvcGxhaW4nXTtcbiAgICAgIGRlbGV0ZSBvcHRzLnBhc3N0aHJvdWdoO1xuICAgIH1cblxuICAgIGQoYFNldHRpbmcgb3B0aW9ucyBmb3IgJHt4fTogJHtKU09OLnN0cmluZ2lmeShvcHRzKX1gKTtcbiAgICBjb21waWxlcnNbeF0uY29tcGlsZXJPcHRpb25zID0gb3B0cztcbiAgfSk7XG5cbiAgbGV0IHJldCA9IG5ldyBDb21waWxlckhvc3Qocm9vdENhY2hlRGlyLCBjb21waWxlcnMsIGZpbGVDaGFuZ2VDYWNoZSwgZmFsc2UsIGNvbXBpbGVyc1sndGV4dC9wbGFpbiddLCBudWxsLCBqc29uLm1pbWVUeXBlc1RvUmVnaXN0ZXIpO1xuXG4gIC8vIE5COiBJdCdzIHN1cGVyIGltcG9ydGFudCB0aGF0IHdlIGd1YXJhbnRlZSB0aGF0IHRoZSBjb25maWd1cmF0aW9uIGlzIHNhdmVkXG4gIC8vIG91dCwgYmVjYXVzZSB3ZSdsbCBuZWVkIHRvIHJlLXJlYWQgaXQgaW4gdGhlIHJlbmRlcmVyIHByb2Nlc3NcbiAgZChgQ3JlYXRlZCBjb21waWxlciBob3N0IHdpdGggb3B0aW9uczogJHtKU09OLnN0cmluZ2lmeShpbmZvKX1gKTtcbiAgcmV0LnNhdmVDb25maWd1cmF0aW9uU3luYygpO1xuICByZXR1cm4gcmV0O1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBjb21waWxlciBob3N0IGZyb20gYSAuYmFiZWxyYyBmaWxlLiBUaGlzIG1ldGhvZCBpcyB1c3VhbGx5IGNhbGxlZFxuICogZnJvbSB7QGxpbmsgY3JlYXRlQ29tcGlsZXJIb3N0RnJvbVByb2plY3RSb290fSBpbnN0ZWFkIG9mIHVzZWQgZGlyZWN0bHkuXG4gKlxuICogQHBhcmFtICB7c3RyaW5nfSBmaWxlICBUaGUgcGF0aCB0byBhIC5iYWJlbHJjIGZpbGVcbiAqXG4gKiBAcGFyYW0gIHtzdHJpbmd9IHJvb3RDYWNoZURpciAob3B0aW9uYWwpICBUaGUgZGlyZWN0b3J5IHRvIHVzZSBhcyBhIGNhY2hlLlxuICpcbiAqIEByZXR1cm4ge1Byb21pc2U8Q29tcGlsZXJIb3N0Pn0gIEEgc2V0LXVwIGNvbXBpbGVyIGhvc3RcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNyZWF0ZUNvbXBpbGVySG9zdEZyb21CYWJlbFJjKGZpbGUsIHJvb3RDYWNoZURpcj1udWxsLCBzb3VyY2VNYXBQYXRoID0gbnVsbCkge1xuICBsZXQgaW5mbyA9IEpTT04ucGFyc2UoYXdhaXQgcGZzLnJlYWRGaWxlKGZpbGUsICd1dGY4JykpO1xuXG4gIC8vIHBhY2thZ2UuanNvblxuICBpZiAoJ2JhYmVsJyBpbiBpbmZvKSB7XG4gICAgaW5mbyA9IGluZm8uYmFiZWw7XG4gIH1cblxuICBpZiAoJ2VudicgaW4gaW5mbykge1xuICAgIGxldCBvdXJFbnYgPSBwcm9jZXNzLmVudi5CQUJFTF9FTlYgfHwgcHJvY2Vzcy5lbnYuTk9ERV9FTlYgfHwgJ2RldmVsb3BtZW50JztcbiAgICBpbmZvID0gaW5mby5lbnZbb3VyRW52XTtcbiAgfVxuXG4gIC8vIEFyZSB3ZSBzdGlsbCBwYWNrYWdlLmpzb24gKGkuZS4gaXMgdGhlcmUgbm8gYmFiZWwgaW5mbyB3aGF0c29ldmVyPylcbiAgaWYgKCduYW1lJyBpbiBpbmZvICYmICd2ZXJzaW9uJyBpbiBpbmZvKSB7XG4gICAgbGV0IGFwcFJvb3QgPSBwYXRoLmRpcm5hbWUoZmlsZSk7XG4gICAgcmV0dXJuIGNyZWF0ZUNvbXBpbGVySG9zdEZyb21Db25maWd1cmF0aW9uKHtcbiAgICAgIGFwcFJvb3Q6IGFwcFJvb3QsXG4gICAgICBvcHRpb25zOiBnZXREZWZhdWx0Q29uZmlndXJhdGlvbihhcHBSb290KSxcbiAgICAgIHJvb3RDYWNoZURpcixcbiAgICAgIHNvdXJjZU1hcFBhdGhcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBjcmVhdGVDb21waWxlckhvc3RGcm9tQ29uZmlndXJhdGlvbih7XG4gICAgYXBwUm9vdDogcGF0aC5kaXJuYW1lKGZpbGUpLFxuICAgIG9wdGlvbnM6IHtcbiAgICAgICdhcHBsaWNhdGlvbi9qYXZhc2NyaXB0JzogaW5mb1xuICAgIH0sXG4gICAgcm9vdENhY2hlRGlyLFxuICAgIHNvdXJjZU1hcFBhdGhcbiAgfSk7XG59XG5cblxuLyoqXG4gKiBDcmVhdGVzIGEgY29tcGlsZXIgaG9zdCBmcm9tIGEgLmNvbXBpbGVyYyBmaWxlLiBUaGlzIG1ldGhvZCBpcyB1c3VhbGx5IGNhbGxlZFxuICogZnJvbSB7QGxpbmsgY3JlYXRlQ29tcGlsZXJIb3N0RnJvbVByb2plY3RSb290fSBpbnN0ZWFkIG9mIHVzZWQgZGlyZWN0bHkuXG4gKlxuICogQHBhcmFtICB7c3RyaW5nfSBmaWxlICBUaGUgcGF0aCB0byBhIC5jb21waWxlcmMgZmlsZVxuICpcbiAqIEBwYXJhbSAge3N0cmluZ30gcm9vdENhY2hlRGlyIChvcHRpb25hbCkgIFRoZSBkaXJlY3RvcnkgdG8gdXNlIGFzIGEgY2FjaGUuXG4gKlxuICogQHJldHVybiB7UHJvbWlzZTxDb21waWxlckhvc3Q+fSAgQSBzZXQtdXAgY29tcGlsZXIgaG9zdFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY3JlYXRlQ29tcGlsZXJIb3N0RnJvbUNvbmZpZ0ZpbGUoZmlsZSwgcm9vdENhY2hlRGlyPW51bGwsIHNvdXJjZU1hcFBhdGggPSBudWxsKSB7XG4gIGxldCBpbmZvID0gSlNPTi5wYXJzZShhd2FpdCBwZnMucmVhZEZpbGUoZmlsZSwgJ3V0ZjgnKSk7XG5cbiAgaWYgKCdlbnYnIGluIGluZm8pIHtcbiAgICBsZXQgb3VyRW52ID0gcHJvY2Vzcy5lbnYuRUxFQ1RST05fQ09NUElMRV9FTlYgfHwgcHJvY2Vzcy5lbnYuTk9ERV9FTlYgfHwgJ2RldmVsb3BtZW50JztcbiAgICBpbmZvID0gaW5mby5lbnZbb3VyRW52XTtcbiAgfVxuXG4gIHJldHVybiBjcmVhdGVDb21waWxlckhvc3RGcm9tQ29uZmlndXJhdGlvbih7XG4gICAgYXBwUm9vdDogcGF0aC5kaXJuYW1lKGZpbGUpLFxuICAgIG9wdGlvbnM6IGluZm8sXG4gICAgcm9vdENhY2hlRGlyLFxuICAgIHNvdXJjZU1hcFBhdGhcbiAgfSk7XG59XG5cblxuLyoqXG4gKiBDcmVhdGVzIGEgY29uZmlndXJlZCB7QGxpbmsgQ29tcGlsZXJIb3N0fSBpbnN0YW5jZSBmcm9tIHRoZSBwcm9qZWN0IHJvb3RcbiAqIGRpcmVjdG9yeS4gVGhpcyBtZXRob2QgZmlyc3Qgc2VhcmNoZXMgZm9yIGEgLmNvbXBpbGVyYyAob3IgLmNvbXBpbGVyYy5qc29uKSwgdGhlbiBmYWxscyBiYWNrIHRvIHRoZVxuICogZGVmYXVsdCBsb2NhdGlvbnMgZm9yIEJhYmVsIGNvbmZpZ3VyYXRpb24gaW5mby4gSWYgbmVpdGhlciBhcmUgZm91bmQsIGRlZmF1bHRzXG4gKiB0byBzdGFuZGFyZCBzZXR0aW5nc1xuICpcbiAqIEBwYXJhbSAge3N0cmluZ30gcm9vdERpciAgVGhlIHJvb3QgYXBwbGljYXRpb24gZGlyZWN0b3J5IChpLmUuIHRoZSBkaXJlY3RvcnlcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdCBoYXMgdGhlIGFwcCdzIHBhY2thZ2UuanNvbilcbiAqXG4gKiBAcGFyYW0gIHtzdHJpbmd9IHJvb3RDYWNoZURpciAob3B0aW9uYWwpICBUaGUgZGlyZWN0b3J5IHRvIHVzZSBhcyBhIGNhY2hlLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBzb3VyY2VNYXBQYXRoIChvcHRpb25hbCkgVGhlIGRpcmVjdG9yeSB0byBzdG9yZSBzb3VyY2VtYXAgc2VwYXJhdGVseVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgY29tcGlsZXIgb3B0aW9uIGVuYWJsZWQgdG8gZW1pdC5cbiAqXG4gKiBAcmV0dXJuIHtQcm9taXNlPENvbXBpbGVySG9zdD59ICBBIHNldC11cCBjb21waWxlciBob3N0XG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjcmVhdGVDb21waWxlckhvc3RGcm9tUHJvamVjdFJvb3Qocm9vdERpciwgcm9vdENhY2hlRGlyID0gbnVsbCwgc291cmNlTWFwUGF0aCA9IG51bGwpIHtcbiAgbGV0IGNvbXBpbGVyYyA9IHBhdGguam9pbihyb290RGlyLCAnLmNvbXBpbGVyYycpO1xuICBpZiAoc3RhdFN5bmNOb0V4Y2VwdGlvbihjb21waWxlcmMpKSB7XG4gICAgZChgRm91bmQgYSAuY29tcGlsZXJjIGF0ICR7Y29tcGlsZXJjfSwgdXNpbmcgaXRgKTtcbiAgICByZXR1cm4gYXdhaXQgY3JlYXRlQ29tcGlsZXJIb3N0RnJvbUNvbmZpZ0ZpbGUoY29tcGlsZXJjLCByb290Q2FjaGVEaXIsIHNvdXJjZU1hcFBhdGgpO1xuICB9XG4gIGNvbXBpbGVyYyArPSAnLmpzb24nO1xuICBpZiAoc3RhdFN5bmNOb0V4Y2VwdGlvbihjb21waWxlcmMpKSB7XG4gICAgZChgRm91bmQgYSAuY29tcGlsZXJjIGF0ICR7Y29tcGlsZXJjfSwgdXNpbmcgaXRgKTtcbiAgICByZXR1cm4gYXdhaXQgY3JlYXRlQ29tcGlsZXJIb3N0RnJvbUNvbmZpZ0ZpbGUoY29tcGlsZXJjLCByb290Q2FjaGVEaXIsIHNvdXJjZU1hcFBhdGgpO1xuICB9XG5cbiAgbGV0IGJhYmVscmMgPSBwYXRoLmpvaW4ocm9vdERpciwgJy5iYWJlbHJjJyk7XG4gIGlmIChzdGF0U3luY05vRXhjZXB0aW9uKGJhYmVscmMpKSB7XG4gICAgZChgRm91bmQgYSAuYmFiZWxyYyBhdCAke2JhYmVscmN9LCB1c2luZyBpdGApO1xuICAgIHJldHVybiBhd2FpdCBjcmVhdGVDb21waWxlckhvc3RGcm9tQmFiZWxSYyhiYWJlbHJjLCByb290Q2FjaGVEaXIsIHNvdXJjZU1hcFBhdGgpO1xuICB9XG5cbiAgZChgVXNpbmcgcGFja2FnZS5qc29uIG9yIGRlZmF1bHQgcGFyYW1ldGVycyBhdCAke3Jvb3REaXJ9YCk7XG4gIHJldHVybiBhd2FpdCBjcmVhdGVDb21waWxlckhvc3RGcm9tQmFiZWxSYyhwYXRoLmpvaW4ocm9vdERpciwgJ3BhY2thZ2UuanNvbicpLCByb290Q2FjaGVEaXIsIHNvdXJjZU1hcFBhdGgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlQ29tcGlsZXJIb3N0RnJvbUJhYmVsUmNTeW5jKGZpbGUsIHJvb3RDYWNoZURpcj1udWxsLCBzb3VyY2VNYXBQYXRoID0gbnVsbCkge1xuICBsZXQgaW5mbyA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKGZpbGUsICd1dGY4JykpO1xuXG4gIC8vIHBhY2thZ2UuanNvblxuICBpZiAoJ2JhYmVsJyBpbiBpbmZvKSB7XG4gICAgaW5mbyA9IGluZm8uYmFiZWw7XG4gIH1cblxuICBpZiAoJ2VudicgaW4gaW5mbykge1xuICAgIGxldCBvdXJFbnYgPSBwcm9jZXNzLmVudi5CQUJFTF9FTlYgfHwgcHJvY2Vzcy5lbnYuTk9ERV9FTlYgfHwgJ2RldmVsb3BtZW50JztcbiAgICBpbmZvID0gaW5mby5lbnZbb3VyRW52XTtcbiAgfVxuXG4gIC8vIEFyZSB3ZSBzdGlsbCBwYWNrYWdlLmpzb24gKGkuZS4gaXMgdGhlcmUgbm8gYmFiZWwgaW5mbyB3aGF0c29ldmVyPylcbiAgaWYgKCduYW1lJyBpbiBpbmZvICYmICd2ZXJzaW9uJyBpbiBpbmZvKSB7XG4gICAgbGV0IGFwcFJvb3QgPSBwYXRoLmRpcm5hbWUoZmlsZSlcbiAgICByZXR1cm4gY3JlYXRlQ29tcGlsZXJIb3N0RnJvbUNvbmZpZ3VyYXRpb24oe1xuICAgICAgYXBwUm9vdDogYXBwUm9vdCxcbiAgICAgIG9wdGlvbnM6IGdldERlZmF1bHRDb25maWd1cmF0aW9uKGFwcFJvb3QpLFxuICAgICAgcm9vdENhY2hlRGlyLFxuICAgICAgc291cmNlTWFwUGF0aFxuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIGNyZWF0ZUNvbXBpbGVySG9zdEZyb21Db25maWd1cmF0aW9uKHtcbiAgICBhcHBSb290OiBwYXRoLmRpcm5hbWUoZmlsZSksXG4gICAgb3B0aW9uczoge1xuICAgICAgJ2FwcGxpY2F0aW9uL2phdmFzY3JpcHQnOiBpbmZvXG4gICAgfSxcbiAgICByb290Q2FjaGVEaXIsXG4gICAgc291cmNlTWFwUGF0aFxuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUNvbXBpbGVySG9zdEZyb21Db25maWdGaWxlU3luYyhmaWxlLCByb290Q2FjaGVEaXI9bnVsbCwgc291cmNlTWFwUGF0aCA9IG51bGwpIHtcbiAgbGV0IGluZm8gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhmaWxlLCAndXRmOCcpKTtcblxuICBpZiAoJ2VudicgaW4gaW5mbykge1xuICAgIGxldCBvdXJFbnYgPSBwcm9jZXNzLmVudi5FTEVDVFJPTl9DT01QSUxFX0VOViB8fCBwcm9jZXNzLmVudi5OT0RFX0VOViB8fCAnZGV2ZWxvcG1lbnQnO1xuICAgIGluZm8gPSBpbmZvLmVudltvdXJFbnZdO1xuICB9XG5cbiAgcmV0dXJuIGNyZWF0ZUNvbXBpbGVySG9zdEZyb21Db25maWd1cmF0aW9uKHtcbiAgICBhcHBSb290OiBwYXRoLmRpcm5hbWUoZmlsZSksXG4gICAgb3B0aW9uczogaW5mbyxcbiAgICByb290Q2FjaGVEaXIsXG4gICAgc291cmNlTWFwUGF0aFxuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUNvbXBpbGVySG9zdEZyb21Qcm9qZWN0Um9vdFN5bmMocm9vdERpciwgcm9vdENhY2hlRGlyID0gbnVsbCwgc291cmNlTWFwUGF0aCA9IG51bGwpIHtcbiAgbGV0IGNvbXBpbGVyYyA9IHBhdGguam9pbihyb290RGlyLCAnLmNvbXBpbGVyYycpO1xuICBpZiAoc3RhdFN5bmNOb0V4Y2VwdGlvbihjb21waWxlcmMpKSB7XG4gICAgZChgRm91bmQgYSAuY29tcGlsZXJjIGF0ICR7Y29tcGlsZXJjfSwgdXNpbmcgaXRgKTtcbiAgICByZXR1cm4gY3JlYXRlQ29tcGlsZXJIb3N0RnJvbUNvbmZpZ0ZpbGVTeW5jKGNvbXBpbGVyYywgcm9vdENhY2hlRGlyLCBzb3VyY2VNYXBQYXRoKTtcbiAgfVxuXG4gIGxldCBiYWJlbHJjID0gcGF0aC5qb2luKHJvb3REaXIsICcuYmFiZWxyYycpO1xuICBpZiAoc3RhdFN5bmNOb0V4Y2VwdGlvbihiYWJlbHJjKSkge1xuICAgIGQoYEZvdW5kIGEgLmJhYmVscmMgYXQgJHtiYWJlbHJjfSwgdXNpbmcgaXRgKTtcbiAgICByZXR1cm4gY3JlYXRlQ29tcGlsZXJIb3N0RnJvbUJhYmVsUmNTeW5jKGJhYmVscmMsIHJvb3RDYWNoZURpciwgc291cmNlTWFwUGF0aCk7XG4gIH1cblxuICBkKGBVc2luZyBwYWNrYWdlLmpzb24gb3IgZGVmYXVsdCBwYXJhbWV0ZXJzIGF0ICR7cm9vdERpcn1gKTtcbiAgcmV0dXJuIGNyZWF0ZUNvbXBpbGVySG9zdEZyb21CYWJlbFJjU3luYyhwYXRoLmpvaW4ocm9vdERpciwgJ3BhY2thZ2UuanNvbicpLCByb290Q2FjaGVEaXIsIHNvdXJjZU1hcFBhdGgpO1xufVxuXG4vKipcbiAqIFJldHVybnMgd2hhdCBlbGVjdHJvbi1jb21waWxlIHdvdWxkIHVzZSBhcyBhIGRlZmF1bHQgcm9vdENhY2hlRGlyLiBVc3VhbGx5IG9ubHlcbiAqIHVzZWQgZm9yIGRlYnVnZ2luZyBwdXJwb3Nlc1xuICpcbiAqIEByZXR1cm4ge3N0cmluZ30gIEEgcGF0aCB0aGF0IG1heSBvciBtYXkgbm90IGV4aXN0IHdoZXJlIGVsZWN0cm9uLWNvbXBpbGUgd291bGRcbiAqICAgICAgICAgICAgICAgICAgIHNldCB1cCBhIGRldmVsb3BtZW50IG1vZGUgY2FjaGUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjYWxjdWxhdGVEZWZhdWx0Q29tcGlsZUNhY2hlRGlyZWN0b3J5KCkge1xuICBsZXQgdG1wRGlyID0gcHJvY2Vzcy5lbnYuVEVNUCB8fCBwcm9jZXNzLmVudi5UTVBESVIgfHwgJy90bXAnO1xuICBsZXQgaGFzaCA9IHJlcXVpcmUoJ2NyeXB0bycpLmNyZWF0ZUhhc2goJ21kNScpLnVwZGF0ZShwcm9jZXNzLmV4ZWNQYXRoKS5kaWdlc3QoJ2hleCcpO1xuXG4gIGxldCBjYWNoZURpciA9IHBhdGguam9pbih0bXBEaXIsIGBjb21waWxlQ2FjaGVfJHtoYXNofWApO1xuICBta2RpcnAuc3luYyhjYWNoZURpcik7XG5cbiAgZChgVXNpbmcgZGVmYXVsdCBjYWNoZSBkaXJlY3Rvcnk6ICR7Y2FjaGVEaXJ9YCk7XG4gIHJldHVybiBjYWNoZURpcjtcbn1cblxuZnVuY3Rpb24gY3JlYXRlU291cmNlTWFwRGlyZWN0b3J5KHNvdXJjZU1hcFBhdGgpIHtcbiAgbWtkaXJwLnN5bmMoc291cmNlTWFwUGF0aCk7XG4gIGQoYFVzaW5nIHNlcGFyYXRlIHNvdXJjZW1hcCBwYXRoIGF0ICR7c291cmNlTWFwUGF0aH1gKTtcbn1cblxuZnVuY3Rpb24gZ2V0RWxlY3Ryb25WZXJzaW9uKHJvb3REaXIpIHtcbiAgaWYgKHByb2Nlc3MudmVyc2lvbnMuZWxlY3Ryb24pIHtcbiAgICByZXR1cm4gcHJvY2Vzcy52ZXJzaW9ucy5lbGVjdHJvbjtcbiAgfVxuXG4gIGxldCBvdXJQa2dKc29uID0gcmVxdWlyZShwYXRoLmpvaW4ocm9vdERpciwgJ3BhY2thZ2UuanNvbicpKTtcblxuICBsZXQgdmVyc2lvbiA9IFsnZWxlY3Ryb24tcHJlYnVpbHQtY29tcGlsZScsICdlbGVjdHJvbiddLm1hcChtb2QgPT4ge1xuICAgIGlmIChvdXJQa2dKc29uLmRldkRlcGVuZGVuY2llcyAmJiBvdXJQa2dKc29uLmRldkRlcGVuZGVuY2llc1ttb2RdKSB7XG4gICAgICAvLyBOQjogbG9sIHRoaXMgY29kZVxuICAgICAgbGV0IHZlclJhbmdlID0gb3VyUGtnSnNvbi5kZXZEZXBlbmRlbmNpZXNbbW9kXTtcbiAgICAgIGxldCBtID0gdmVyUmFuZ2UubWF0Y2goLyhcXGQrXFwuXFxkK1xcLlxcZCspLyk7XG4gICAgICBpZiAobSAmJiBtWzFdKSByZXR1cm4gbVsxXTtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgcmV0dXJuIHByb2Nlc3MubWFpbk1vZHVsZS5yZXF1aXJlKGAke21vZH0vcGFja2FnZS5qc29uYCkudmVyc2lvbjtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAvLyBOQjogVGhpcyB1c3VhbGx5IGRvZXNuJ3Qgd29yaywgYnV0IHNvbWV0aW1lcyBtYXliZT9cbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgbGV0IHAgPSBwYXRoLmpvaW4ocm9vdERpciwgbW9kLCAncGFja2FnZS5qc29uJyk7XG4gICAgICByZXR1cm4gcmVxdWlyZShwKS52ZXJzaW9uO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfSkuZmluZCh4ID0+ICEheCk7XG5cbiAgaWYgKCF2ZXJzaW9uKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3QgYXV0b21hdGljYWxseSBkaXNjb3ZlciB0aGUgdmVyc2lvbiBvZiBFbGVjdHJvbiwgeW91IHByb2JhYmx5IG5lZWQgYSAuY29tcGlsZXJjIGZpbGVcIik7XG4gIH1cblxuICByZXR1cm4gdmVyc2lvbjtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBkZWZhdWx0IC5jb25maWdyYyBpZiBubyBjb25maWd1cmF0aW9uIGluZm9ybWF0aW9uIGNhbiBiZSBmb3VuZC5cbiAqXG4gKiBAcmV0dXJuIHtPYmplY3R9ICBBIGxpc3Qgb2YgZGVmYXVsdCBjb25maWcgc2V0dGluZ3MgZm9yIGVsZWN0cm9uLWNvbXBpbGVyLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RGVmYXVsdENvbmZpZ3VyYXRpb24ocm9vdERpcikge1xuICByZXR1cm4ge1xuICAgICdhcHBsaWNhdGlvbi9qYXZhc2NyaXB0Jzoge1xuICAgICAgXCJwcmVzZXRzXCI6IFtcbiAgICAgICAgW1wiZW52XCIsIHtcbiAgICAgICAgICBcInRhcmdldHNcIjoge1xuICAgICAgICAgICAgXCJlbGVjdHJvblwiOiBnZXRFbGVjdHJvblZlcnNpb24ocm9vdERpcilcbiAgICAgICAgICB9XG4gICAgICAgIH1dLFxuICAgICAgICBcInJlYWN0XCJcbiAgICAgIF0sXG4gICAgICBcInNvdXJjZU1hcHNcIjogXCJpbmxpbmVcIlxuICAgIH1cbiAgfTtcbn1cblxuLyoqXG4gKiBBbGxvd3MgeW91IHRvIGNyZWF0ZSBuZXcgaW5zdGFuY2VzIG9mIGFsbCBjb21waWxlcnMgdGhhdCBhcmUgc3VwcG9ydGVkIGJ5XG4gKiBlbGVjdHJvbi1jb21waWxlIGFuZCB1c2UgdGhlbSBkaXJlY3RseS4gQ3VycmVudGx5IHN1cHBvcnRzIEJhYmVsLCBDb2ZmZWVTY3JpcHQsXG4gKiBUeXBlU2NyaXB0LCBMZXNzLCBhbmQgSmFkZS5cbiAqXG4gKiBAcmV0dXJuIHtPYmplY3R9ICBBbiBPYmplY3Qgd2hvc2UgS2V5cyBhcmUgTUlNRSB0eXBlcywgYW5kIHdob3NlIHZhbHVlc1xuICogYXJlIGluc3RhbmNlcyBvZiBAe2xpbmsgQ29tcGlsZXJCYXNlfS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUNvbXBpbGVycygpIHtcbiAgaWYgKCFhbGxDb21waWxlckNsYXNzZXMpIHtcbiAgICAvLyBGaXJzdCB3ZSB3YW50IHRvIHNlZSBpZiBlbGVjdHJvbi1jb21waWxlcnMgaXRzZWxmIGhhcyBiZWVuIGluc3RhbGxlZCB3aXRoXG4gICAgLy8gZGV2RGVwZW5kZW5jaWVzLiBJZiB0aGF0J3Mgbm90IHRoZSBjYXNlLCBjaGVjayB0byBzZWUgaWZcbiAgICAvLyBlbGVjdHJvbi1jb21waWxlcnMgaXMgaW5zdGFsbGVkIGFzIGEgcGVlciBkZXBlbmRlbmN5IChwcm9iYWJseSBhcyBhXG4gICAgLy8gZGV2RGVwZW5kZW5jeSBvZiB0aGUgcm9vdCBwcm9qZWN0KS5cbiAgICBjb25zdCBsb2NhdGlvbnMgPSBbJ2VsZWN0cm9uLWNvbXBpbGVycycsICcuLi8uLi9lbGVjdHJvbi1jb21waWxlcnMnXTtcblxuICAgIGZvciAobGV0IGxvY2F0aW9uIG9mIGxvY2F0aW9ucykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgYWxsQ29tcGlsZXJDbGFzc2VzID0gcmVxdWlyZShsb2NhdGlvbik7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIC8vIFlvbG9cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIWFsbENvbXBpbGVyQ2xhc3Nlcykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRWxlY3Ryb24gY29tcGlsZXJzIG5vdCBmb3VuZCBidXQgd2VyZSByZXF1ZXN0ZWQgdG8gYmUgbG9hZGVkXCIpO1xuICAgIH1cbiAgfVxuXG4gIC8vIE5COiBOb3RlIHRoYXQgdGhpcyBjb2RlIGlzIGNhcmVmdWxseSBzZXQgdXAgc28gdGhhdCBJbmxpbmVIdG1sQ29tcGlsZXJcbiAgLy8gKGkuZS4gY2xhc3NlcyB3aXRoIGBjcmVhdGVGcm9tQ29tcGlsZXJzYCkgaW5pdGlhbGx5IGdldCBhbiBlbXB0eSBvYmplY3QsXG4gIC8vIGJ1dCB3aWxsIGhhdmUgYSByZWZlcmVuY2UgdG8gdGhlIGZpbmFsIHJlc3VsdCBvZiB3aGF0IHdlIHJldHVybiwgd2hpY2hcbiAgLy8gcmVzb2x2ZXMgdGhlIGNpcmN1bGFyIGRlcGVuZGVuY3kgd2UnZCBvdGhlcndpc2UgaGF2ZSBoZXJlLlxuICBsZXQgcmV0ID0ge307XG4gIGxldCBpbnN0YW50aWF0ZWRDbGFzc2VzID0gYWxsQ29tcGlsZXJDbGFzc2VzLm1hcCgoS2xhc3MpID0+IHtcbiAgICBpZiAoJ2NyZWF0ZUZyb21Db21waWxlcnMnIGluIEtsYXNzKSB7XG4gICAgICByZXR1cm4gS2xhc3MuY3JlYXRlRnJvbUNvbXBpbGVycyhyZXQpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbmV3IEtsYXNzKCk7XG4gICAgfVxuICB9KTtcblxuICBpbnN0YW50aWF0ZWRDbGFzc2VzLnJlZHVjZSgoYWNjLHgpID0+IHtcbiAgICBsZXQgS2xhc3MgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YoeCkuY29uc3RydWN0b3I7XG5cbiAgICBmb3IgKGxldCB0eXBlIG9mIEtsYXNzLmdldElucHV0TWltZVR5cGVzKCkpIHsgYWNjW3R5cGVdID0geDsgfVxuICAgIHJldHVybiBhY2M7XG4gIH0sIHJldCk7XG5cbiAgcmV0dXJuIHJldDtcbn1cbiJdfQ==