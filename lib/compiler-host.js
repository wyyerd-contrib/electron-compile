'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _mimeTypes = require('@paulcbetts/mime-types');

var _mimeTypes2 = _interopRequireDefault(_mimeTypes);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _zlib = require('zlib');

var _zlib2 = _interopRequireDefault(_zlib);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _promise = require('./promise');

var _forAllFiles = require('./for-all-files');

var _compileCache = require('./compile-cache');

var _compileCache2 = _interopRequireDefault(_compileCache);

var _fileChangeCache = require('./file-change-cache');

var _fileChangeCache2 = _interopRequireDefault(_fileChangeCache);

var _readOnlyCompiler = require('./read-only-compiler');

var _readOnlyCompiler2 = _interopRequireDefault(_readOnlyCompiler);

var _browserSignal = require('./browser-signal');

require('rxjs/add/operator/map');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const d = require('debug')('electron-compile:compiler-host');

require('./rig-mime-types').init();

// This isn't even my
const finalForms = {
  'text/javascript': true,
  'application/javascript': true,
  'text/html': true,
  'text/css': true,
  'image/svg+xml': true,
  'application/json': true
};

/**
 * This class is the top-level class that encapsulates all of the logic of
 * compiling and caching application code. If you're looking for a "Main class",
 * this is it.
 *
 * This class can be created directly but it is usually created via the methods
 * in config-parser, which will among other things, set up the compiler options
 * given a project root.
 *
 * CompilerHost is also the top-level class that knows how to serialize all of the
 * information necessary to recreate itself, either as a development host (i.e.
 * will allow cache misses and actual compilation), or as a read-only version of
 * itself for production.
 */
class CompilerHost {
  /**
   * Creates an instance of CompilerHost. You probably want to use the methods
   * in config-parser for development, or {@link createReadonlyFromConfiguration}
   * for production instead.
   *
   * @param  {string} rootCacheDir  The root directory to use for the cache
   *
   * @param  {Object} compilers  an Object whose keys are input MIME types and
   *                             whose values are instances of CompilerBase. Create
   *                             this via the {@link createCompilers} method in
   *                             config-parser.
   *
   * @param  {FileChangedCache} fileChangeCache  A file-change cache that is
   *                                             optionally pre-loaded.
   *
   * @param  {boolean} readOnlyMode  If True, cache misses will fail and
   *                                 compilation will not be attempted.
   *
   * @param  {CompilerBase} fallbackCompiler (optional)  When a file is compiled
   *                                         which doesn't have a matching compiler,
   *                                         this compiler will be used instead. If
   *                                         null, will fail compilation. A good
   *                                         alternate fallback is the compiler for
   *                                         'text/plain', which is guaranteed to be
   *                                         present.
   *
   * @param {string} sourceMapPath (optional) The directory to store sourcemap separately
   *                               if compiler option enabled to emit.
   *                               Default to cachePath if not specified.
   */
  constructor(rootCacheDir, compilers, fileChangeCache, readOnlyMode) {
    let fallbackCompiler = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : null;
    let sourceMapPath = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : null;
    let mimeTypesToRegister = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : null;

    let compilersByMimeType = Object.assign({}, compilers);
    Object.assign(this, { rootCacheDir, compilersByMimeType, fileChangeCache, readOnlyMode, fallbackCompiler });
    this.appRoot = this.fileChangeCache.appRoot;

    this.cachesForCompilers = Object.keys(compilersByMimeType).reduce((acc, x) => {
      let compiler = compilersByMimeType[x];
      if (acc.has(compiler)) return acc;

      acc.set(compiler, _compileCache2.default.createFromCompiler(rootCacheDir, compiler, fileChangeCache, readOnlyMode, sourceMapPath));
      return acc;
    }, new Map());

    this.mimeTypesToRegister = mimeTypesToRegister || {};
  }

  /**
   * Creates a production-mode CompilerHost from the previously saved
   * configuration
   *
   * @param  {string} rootCacheDir  The root directory to use for the cache. This
   *                                cache must have cache information saved via
   *                                {@link saveConfiguration}
   *
   * @param  {string} appRoot  The top-level directory for your application (i.e.
   *                           the one which has your package.json).
   *
   * @param  {CompilerBase} fallbackCompiler (optional)  When a file is compiled
   *                                         which doesn't have a matching compiler,
   *                                         this compiler will be used instead. If
   *                                         null, will fail compilation. A good
   *                                         alternate fallback is the compiler for
   *                                         'text/plain', which is guaranteed to be
   *                                         present.
   *
   * @return {Promise<CompilerHost>}  A read-only CompilerHost
   */
  static createReadonlyFromConfiguration(rootCacheDir, appRoot) {
    let fallbackCompiler = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
    return _asyncToGenerator(function* () {
      let target = _path2.default.join(rootCacheDir, 'compiler-info.json.gz');
      let buf = yield _promise.pfs.readFile(target);
      let info = JSON.parse((yield _promise.pzlib.gunzip(buf)));

      let fileChangeCache = _fileChangeCache2.default.loadFromData(info.fileChangeCache, appRoot, true);

      let compilers = Object.keys(info.compilers).reduce(function (acc, x) {
        let cur = info.compilers[x];
        acc[x] = new _readOnlyCompiler2.default(cur.name, cur.compilerVersion, cur.compilerOptions, cur.inputMimeTypes);

        return acc;
      }, {});

      return new CompilerHost(rootCacheDir, compilers, fileChangeCache, true, fallbackCompiler, null, info.mimeTypesToRegister);
    })();
  }

  /**
   * Creates a development-mode CompilerHost from the previously saved
   * configuration.
   *
   * @param  {string} rootCacheDir  The root directory to use for the cache. This
   *                                cache must have cache information saved via
   *                                {@link saveConfiguration}
   *
   * @param  {string} appRoot  The top-level directory for your application (i.e.
   *                           the one which has your package.json).
   *
   * @param  {Object} compilersByMimeType  an Object whose keys are input MIME
   *                                       types and whose values are instances
   *                                       of CompilerBase. Create this via the
   *                                       {@link createCompilers} method in
   *                                       config-parser.
   *
   * @param  {CompilerBase} fallbackCompiler (optional)  When a file is compiled
   *                                         which doesn't have a matching compiler,
   *                                         this compiler will be used instead. If
   *                                         null, will fail compilation. A good
   *                                         alternate fallback is the compiler for
   *                                         'text/plain', which is guaranteed to be
   *                                         present.
   *
   * @return {Promise<CompilerHost>}  A read-only CompilerHost
   */
  static createFromConfiguration(rootCacheDir, appRoot, compilersByMimeType) {
    let fallbackCompiler = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
    return _asyncToGenerator(function* () {
      let target = _path2.default.join(rootCacheDir, 'compiler-info.json.gz');
      let buf = yield _promise.pfs.readFile(target);
      let info = JSON.parse((yield _promise.pzlib.gunzip(buf)));

      let fileChangeCache = _fileChangeCache2.default.loadFromData(info.fileChangeCache, appRoot, false);

      Object.keys(info.compilers).forEach(function (x) {
        let cur = info.compilers[x];
        compilersByMimeType[x].compilerOptions = cur.compilerOptions;
      });

      return new CompilerHost(rootCacheDir, compilersByMimeType, fileChangeCache, false, fallbackCompiler, null, info.mimeTypesToRegister);
    })();
  }

  /**
   * Saves the current compiler configuration to a file that
   * {@link createReadonlyFromConfiguration} can use to recreate the current
   * compiler environment
   *
   * @return {Promise}  Completion
   */
  saveConfiguration() {
    var _this = this;

    return _asyncToGenerator(function* () {
      let serializedCompilerOpts = Object.keys(_this.compilersByMimeType).reduce(function (acc, x) {
        let compiler = _this.compilersByMimeType[x];
        let Klass = Object.getPrototypeOf(compiler).constructor;

        let val = {
          name: Klass.name,
          inputMimeTypes: Klass.getInputMimeTypes(),
          compilerOptions: compiler.compilerOptions,
          compilerVersion: compiler.getCompilerVersion()
        };

        acc[x] = val;
        return acc;
      }, {});

      let info = {
        fileChangeCache: _this.fileChangeCache.getSavedData(),
        compilers: serializedCompilerOpts,
        mimeTypesToRegister: _this.mimeTypesToRegister
      };

      let target = _path2.default.join(_this.rootCacheDir, 'compiler-info.json.gz');
      let buf = yield _promise.pzlib.gzip(new Buffer(JSON.stringify(info)));
      yield _promise.pfs.writeFile(target, buf);
    })();
  }

  /**
   * Compiles a file and returns the compiled result.
   *
   * @param  {string} filePath  The path to the file to compile
   *
   * @return {Promise<object>}  An Object with the compiled result
   *
   * @property {Object} hashInfo  The hash information returned from getHashForPath
   * @property {string} code  The source code if the file was a text file
   * @property {Buffer} binaryData  The file if it was a binary file
   * @property {string} mimeType  The MIME type saved in the cache.
   * @property {string[]} dependentFiles  The dependent files returned from
   *                                      compiling the file, if any.
   */
  compile(filePath) {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      let ret = yield _this2.readOnlyMode ? _this2.compileReadOnly(filePath) : _this2.fullCompile(filePath);

      if (ret.mimeType === 'application/javascript') {
        _this2.mimeTypesToRegister[_mimeTypes2.default.lookup(filePath)] = true;
      }

      return ret;
    })();
  }

  /**
   * Handles compilation in read-only mode
   *
   * @private
   */
  compileReadOnly(filePath) {
    var _this3 = this;

    return _asyncToGenerator(function* () {
      // We guarantee that node_modules are always shipped directly
      let type = _mimeTypes2.default.lookup(filePath);
      if (_fileChangeCache2.default.isInNodeModules(filePath)) {
        return {
          mimeType: type || 'application/javascript',
          code: yield _promise.pfs.readFile(filePath, 'utf8')
        };
      }

      let hashInfo = yield _this3.fileChangeCache.getHashForPath(filePath);

      // NB: Here, we're basically only using the compiler here to find
      // the appropriate CompileCache
      let compiler = CompilerHost.shouldPassthrough(hashInfo) ? _this3.getPassthroughCompiler() : _this3.compilersByMimeType[type || '__lolnothere'];

      // NB: We don't put this into shouldPassthrough because Inline HTML
      // compiler is technically of type finalForms (i.e. a browser can
      // natively handle this content), yet its compiler is
      // InlineHtmlCompiler. However, we still want to catch standard CSS files
      // which will be processed by PassthroughCompiler.
      if (finalForms[type] && !compiler) {
        compiler = _this3.getPassthroughCompiler();
      }

      if (!compiler) {
        compiler = _this3.fallbackCompiler;

        var _ref = yield compiler.get(filePath);

        let code = _ref.code,
            binaryData = _ref.binaryData,
            mimeType = _ref.mimeType;

        return { code: code || binaryData, mimeType };
      }

      let cache = _this3.cachesForCompilers.get(compiler);

      var _ref2 = yield cache.get(filePath);

      let code = _ref2.code,
          binaryData = _ref2.binaryData,
          mimeType = _ref2.mimeType;


      code = code || binaryData;
      if (!code || !mimeType) {
        throw new Error(`Asked to compile ${filePath} in production, is this file not precompiled?`);
      }

      return { code, mimeType };
    })();
  }

  /**
   * Handles compilation in read-write mode
   *
   * @private
   */
  fullCompile(filePath) {
    var _this4 = this;

    return _asyncToGenerator(function* () {
      d(`Compiling ${filePath}`);
      let type = _mimeTypes2.default.lookup(filePath);

      (0, _browserSignal.send)('electron-compile-compiled-file', { filePath, mimeType: type });

      let hashInfo = yield _this4.fileChangeCache.getHashForPath(filePath);

      if (hashInfo.isInNodeModules) {
        let code = hashInfo.sourceCode || (yield _promise.pfs.readFile(filePath, 'utf8'));
        code = yield CompilerHost.fixNodeModulesSourceMapping(code, filePath, _this4.fileChangeCache.appRoot);
        return { code, mimeType: type };
      }

      let compiler = CompilerHost.shouldPassthrough(hashInfo) ? _this4.getPassthroughCompiler() : _this4.compilersByMimeType[type || '__lolnothere'];

      if (!compiler) {
        d(`Falling back to passthrough compiler for ${filePath}`);
        compiler = _this4.fallbackCompiler;
      }

      if (!compiler) {
        throw new Error(`Couldn't find a compiler for ${filePath}`);
      }

      let cache = _this4.cachesForCompilers.get(compiler);
      return yield cache.getOrFetch(filePath, function (filePath, hashInfo) {
        return _this4.compileUncached(filePath, hashInfo, compiler);
      });
    })();
  }

  /**
   * Handles invoking compilers independent of caching
   *
   * @private
   */
  compileUncached(filePath, hashInfo, compiler) {
    var _this5 = this;

    return _asyncToGenerator(function* () {
      let inputMimeType = _mimeTypes2.default.lookup(filePath);

      if (hashInfo.isFileBinary) {
        return {
          binaryData: hashInfo.binaryData || (yield _promise.pfs.readFile(filePath)),
          mimeType: inputMimeType,
          dependentFiles: []
        };
      }

      let ctx = {};
      let code = hashInfo.sourceCode || (yield _promise.pfs.readFile(filePath, 'utf8'));

      if (!(yield compiler.shouldCompileFile(code, ctx))) {
        d(`Compiler returned false for shouldCompileFile: ${filePath}`);
        return { code, mimeType: _mimeTypes2.default.lookup(filePath), dependentFiles: [] };
      }

      let dependentFiles = yield compiler.determineDependentFiles(code, filePath, ctx);

      d(`Using compiler options: ${JSON.stringify(compiler.compilerOptions)}`);
      let result = yield compiler.compile(code, filePath, ctx);

      let shouldInlineHtmlify = inputMimeType !== 'text/html' && result.mimeType === 'text/html';

      let isPassthrough = result.mimeType === 'text/plain' || !result.mimeType || CompilerHost.shouldPassthrough(hashInfo);

      if (finalForms[result.mimeType] && !shouldInlineHtmlify || isPassthrough) {
        // Got something we can use in-browser, let's return it
        return Object.assign(result, { dependentFiles });
      } else {
        d(`Recursively compiling result of ${filePath} with non-final MIME type ${result.mimeType}, input was ${inputMimeType}`);

        hashInfo = Object.assign({ sourceCode: result.code, mimeType: result.mimeType }, hashInfo);
        compiler = _this5.compilersByMimeType[result.mimeType || '__lolnothere'];

        if (!compiler) {
          d(`Recursive compile failed - intermediate result: ${JSON.stringify(result)}`);

          throw new Error(`Compiling ${filePath} resulted in a MIME type of ${result.mimeType}, which we don't know how to handle`);
        }

        return yield _this5.compileUncached(`${filePath}.${_mimeTypes2.default.extension(result.mimeType || 'txt')}`, hashInfo, compiler);
      }
    })();
  }

  /**
   * Pre-caches an entire directory of files recursively. Usually used for
   * building custom compiler tooling.
   *
   * @param  {string} rootDirectory  The top-level directory to compile
   *
   * @param  {Function} shouldCompile (optional)  A Function which allows the
   *                                  caller to disable compiling certain files.
   *                                  It takes a fully-qualified path to a file,
   *                                  and should return a Boolean.
   *
   * @return {Promise}  Completion.
   */
  compileAll(rootDirectory) {
    var _this6 = this;

    let shouldCompile = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    return _asyncToGenerator(function* () {
      let should = shouldCompile || function () {
        return true;
      };

      yield (0, _forAllFiles.forAllFiles)(rootDirectory, function (f) {
        if (!should(f)) return;

        d(`Compiling ${f}`);
        return _this6.compile(f, _this6.compilersByMimeType);
      });
    })();
  }

  listenToCompileEvents() {
    return (0, _browserSignal.listen)('electron-compile-compiled-file').map((_ref3) => {
      var _ref4 = _slicedToArray(_ref3, 1);

      let x = _ref4[0];
      return x;
    });
  }

  /*
   * Sync Methods
   */

  compileSync(filePath) {
    let ret = this.readOnlyMode ? this.compileReadOnlySync(filePath) : this.fullCompileSync(filePath);

    if (ret.mimeType === 'application/javascript') {
      this.mimeTypesToRegister[_mimeTypes2.default.lookup(filePath)] = true;
    }

    return ret;
  }

  static createReadonlyFromConfigurationSync(rootCacheDir, appRoot) {
    let fallbackCompiler = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

    let target = _path2.default.join(rootCacheDir, 'compiler-info.json.gz');
    let buf = _fs2.default.readFileSync(target);
    let info = JSON.parse(_zlib2.default.gunzipSync(buf));

    let fileChangeCache = _fileChangeCache2.default.loadFromData(info.fileChangeCache, appRoot, true);

    let compilers = Object.keys(info.compilers).reduce((acc, x) => {
      let cur = info.compilers[x];
      acc[x] = new _readOnlyCompiler2.default(cur.name, cur.compilerVersion, cur.compilerOptions, cur.inputMimeTypes);

      return acc;
    }, {});

    return new CompilerHost(rootCacheDir, compilers, fileChangeCache, true, fallbackCompiler, null, info.mimeTypesToRegister);
  }

  static createFromConfigurationSync(rootCacheDir, appRoot, compilersByMimeType) {
    let fallbackCompiler = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;

    let target = _path2.default.join(rootCacheDir, 'compiler-info.json.gz');
    let buf = _fs2.default.readFileSync(target);
    let info = JSON.parse(_zlib2.default.gunzipSync(buf));

    let fileChangeCache = _fileChangeCache2.default.loadFromData(info.fileChangeCache, appRoot, false);

    Object.keys(info.compilers).forEach(x => {
      let cur = info.compilers[x];
      compilersByMimeType[x].compilerOptions = cur.compilerOptions;
    });

    return new CompilerHost(rootCacheDir, compilersByMimeType, fileChangeCache, false, fallbackCompiler, null, info.mimeTypesToRegister);
  }

  saveConfigurationSync() {
    let serializedCompilerOpts = Object.keys(this.compilersByMimeType).reduce((acc, x) => {
      let compiler = this.compilersByMimeType[x];
      let Klass = Object.getPrototypeOf(compiler).constructor;

      let val = {
        name: Klass.name,
        inputMimeTypes: Klass.getInputMimeTypes(),
        compilerOptions: compiler.compilerOptions,
        compilerVersion: compiler.getCompilerVersion()
      };

      acc[x] = val;
      return acc;
    }, {});

    let info = {
      fileChangeCache: this.fileChangeCache.getSavedData(),
      compilers: serializedCompilerOpts,
      mimeTypesToRegister: this.mimeTypesToRegister
    };

    let target = _path2.default.join(this.rootCacheDir, 'compiler-info.json.gz');
    let buf = _zlib2.default.gzipSync(new Buffer(JSON.stringify(info)));
    _fs2.default.writeFileSync(target, buf);
  }

  compileReadOnlySync(filePath) {
    // We guarantee that node_modules are always shipped directly
    let type = _mimeTypes2.default.lookup(filePath);
    if (_fileChangeCache2.default.isInNodeModules(filePath)) {
      return {
        mimeType: type || 'application/javascript',
        code: _fs2.default.readFileSync(filePath, 'utf8')
      };
    }

    let hashInfo = this.fileChangeCache.getHashForPathSync(filePath);

    // We guarantee that node_modules are always shipped directly
    if (hashInfo.isInNodeModules) {
      return {
        mimeType: type,
        code: hashInfo.sourceCode || _fs2.default.readFileSync(filePath, 'utf8')
      };
    }

    // NB: Here, we're basically only using the compiler here to find
    // the appropriate CompileCache
    let compiler = CompilerHost.shouldPassthrough(hashInfo) ? this.getPassthroughCompiler() : this.compilersByMimeType[type || '__lolnothere'];

    // NB: We don't put this into shouldPassthrough because Inline HTML
    // compiler is technically of type finalForms (i.e. a browser can
    // natively handle this content), yet its compiler is
    // InlineHtmlCompiler. However, we still want to catch standard CSS files
    // which will be processed by PassthroughCompiler.
    if (finalForms[type] && !compiler) {
      compiler = this.getPassthroughCompiler();
    }

    if (!compiler) {
      compiler = this.fallbackCompiler;

      var _compiler$getSync = compiler.getSync(filePath);

      let code = _compiler$getSync.code,
          binaryData = _compiler$getSync.binaryData,
          mimeType = _compiler$getSync.mimeType;

      return { code: code || binaryData, mimeType };
    }

    let cache = this.cachesForCompilers.get(compiler);

    var _cache$getSync = cache.getSync(filePath);

    let code = _cache$getSync.code,
        binaryData = _cache$getSync.binaryData,
        mimeType = _cache$getSync.mimeType;


    code = code || binaryData;
    if (!code || !mimeType) {
      throw new Error(`Asked to compile ${filePath} in production, is this file not precompiled?`);
    }

    return { code, mimeType };
  }

  fullCompileSync(filePath) {
    d(`Compiling ${filePath}`);

    let type = _mimeTypes2.default.lookup(filePath);

    (0, _browserSignal.send)('electron-compile-compiled-file', { filePath, mimeType: type });

    let hashInfo = this.fileChangeCache.getHashForPathSync(filePath);

    if (hashInfo.isInNodeModules) {
      let code = hashInfo.sourceCode || _fs2.default.readFileSync(filePath, 'utf8');
      code = CompilerHost.fixNodeModulesSourceMappingSync(code, filePath, this.fileChangeCache.appRoot);
      return { code, mimeType: type };
    }

    let compiler = CompilerHost.shouldPassthrough(hashInfo) ? this.getPassthroughCompiler() : this.compilersByMimeType[type || '__lolnothere'];

    if (!compiler) {
      d(`Falling back to passthrough compiler for ${filePath}`);
      compiler = this.fallbackCompiler;
    }

    if (!compiler) {
      throw new Error(`Couldn't find a compiler for ${filePath}`);
    }

    let cache = this.cachesForCompilers.get(compiler);
    return cache.getOrFetchSync(filePath, (filePath, hashInfo) => this.compileUncachedSync(filePath, hashInfo, compiler));
  }

  compileUncachedSync(filePath, hashInfo, compiler) {
    let inputMimeType = _mimeTypes2.default.lookup(filePath);

    if (hashInfo.isFileBinary) {
      return {
        binaryData: hashInfo.binaryData || _fs2.default.readFileSync(filePath),
        mimeType: inputMimeType,
        dependentFiles: []
      };
    }

    let ctx = {};
    let code = hashInfo.sourceCode || _fs2.default.readFileSync(filePath, 'utf8');

    if (!compiler.shouldCompileFileSync(code, ctx)) {
      d(`Compiler returned false for shouldCompileFile: ${filePath}`);
      return { code, mimeType: _mimeTypes2.default.lookup(filePath), dependentFiles: [] };
    }

    let dependentFiles = compiler.determineDependentFilesSync(code, filePath, ctx);

    let result = compiler.compileSync(code, filePath, ctx);

    let shouldInlineHtmlify = inputMimeType !== 'text/html' && result.mimeType === 'text/html';

    let isPassthrough = result.mimeType === 'text/plain' || !result.mimeType || CompilerHost.shouldPassthrough(hashInfo);

    if (finalForms[result.mimeType] && !shouldInlineHtmlify || isPassthrough) {
      // Got something we can use in-browser, let's return it
      return Object.assign(result, { dependentFiles });
    } else {
      d(`Recursively compiling result of ${filePath} with non-final MIME type ${result.mimeType}, input was ${inputMimeType}`);

      hashInfo = Object.assign({ sourceCode: result.code, mimeType: result.mimeType }, hashInfo);
      compiler = this.compilersByMimeType[result.mimeType || '__lolnothere'];

      if (!compiler) {
        d(`Recursive compile failed - intermediate result: ${JSON.stringify(result)}`);

        throw new Error(`Compiling ${filePath} resulted in a MIME type of ${result.mimeType}, which we don't know how to handle`);
      }

      return this.compileUncachedSync(`${filePath}.${_mimeTypes2.default.extension(result.mimeType || 'txt')}`, hashInfo, compiler);
    }
  }

  compileAllSync(rootDirectory) {
    let shouldCompile = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

    let should = shouldCompile || function () {
      return true;
    };

    (0, _forAllFiles.forAllFilesSync)(rootDirectory, f => {
      if (!should(f)) return;
      return this.compileSync(f, this.compilersByMimeType);
    });
  }

  /*
   * Other stuff
   */

  /**
   * Returns the passthrough compiler
   *
   * @private
   */
  getPassthroughCompiler() {
    return this.compilersByMimeType['text/plain'];
  }

  /**
   * Determines whether we should even try to compile the content. Note that in
   * some cases, content will still be in cache even if this returns true, and
   * in other cases (isInNodeModules), we'll know explicitly to not even bother
   * looking in the cache.
   *
   * @private
   */
  static shouldPassthrough(hashInfo) {
    return hashInfo.isMinified || hashInfo.isInNodeModules || hashInfo.hasSourceMap || hashInfo.isFileBinary;
  }

  /**
   * Look at the code of a node modules and see the sourceMapping path.
   * If there is any, check the path and try to fix it with and
   * root relative path.
   * @private
   */
  static fixNodeModulesSourceMapping(sourceCode, sourcePath, appRoot) {
    return _asyncToGenerator(function* () {
      let regexSourceMapping = /\/\/#.*sourceMappingURL=(?!data:)([^"'].*)/i;
      let sourceMappingCheck = sourceCode.match(regexSourceMapping);

      if (sourceMappingCheck && sourceMappingCheck[1] && sourceMappingCheck[1] !== '') {
        let sourceMapPath = sourceMappingCheck[1];

        try {
          yield _promise.pfs.stat(sourceMapPath);
        } catch (error) {
          let normRoot = _path2.default.normalize(appRoot);
          let absPathToModule = _path2.default.dirname(sourcePath.replace(normRoot, '').substring(1));
          let newMapPath = _path2.default.join(absPathToModule, sourceMapPath);

          return sourceCode.replace(regexSourceMapping, `//# sourceMappingURL=${newMapPath}`);
        }
      }

      return sourceCode;
    })();
  }

  /**
   * Look at the code of a node modules and see the sourceMapping path.
   * If there is any, check the path and try to fix it with and
   * root relative path.
   * @private
   */
  static fixNodeModulesSourceMappingSync(sourceCode, sourcePath, appRoot) {
    let regexSourceMapping = /\/\/#.*sourceMappingURL=(?!data:)([^"'].*)/i;
    let sourceMappingCheck = sourceCode.match(regexSourceMapping);

    if (sourceMappingCheck && sourceMappingCheck[1] && sourceMappingCheck[1] !== '') {
      let sourceMapPath = sourceMappingCheck[1];

      try {
        _fs2.default.statSync(sourceMapPath);
      } catch (error) {
        let normRoot = _path2.default.normalize(appRoot);
        let absPathToModule = _path2.default.dirname(sourcePath.replace(normRoot, '').substring(1));
        let newMapPath = _path2.default.join(absPathToModule, sourceMapPath);

        return sourceCode.replace(regexSourceMapping, `//# sourceMappingURL=${newMapPath}`);
      }
    }

    return sourceCode;
  }
}
exports.default = CompilerHost;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9jb21waWxlci1ob3N0LmpzIl0sIm5hbWVzIjpbImQiLCJyZXF1aXJlIiwiaW5pdCIsImZpbmFsRm9ybXMiLCJDb21waWxlckhvc3QiLCJjb25zdHJ1Y3RvciIsInJvb3RDYWNoZURpciIsImNvbXBpbGVycyIsImZpbGVDaGFuZ2VDYWNoZSIsInJlYWRPbmx5TW9kZSIsImZhbGxiYWNrQ29tcGlsZXIiLCJzb3VyY2VNYXBQYXRoIiwibWltZVR5cGVzVG9SZWdpc3RlciIsImNvbXBpbGVyc0J5TWltZVR5cGUiLCJPYmplY3QiLCJhc3NpZ24iLCJhcHBSb290IiwiY2FjaGVzRm9yQ29tcGlsZXJzIiwia2V5cyIsInJlZHVjZSIsImFjYyIsIngiLCJjb21waWxlciIsImhhcyIsInNldCIsImNyZWF0ZUZyb21Db21waWxlciIsIk1hcCIsImNyZWF0ZVJlYWRvbmx5RnJvbUNvbmZpZ3VyYXRpb24iLCJ0YXJnZXQiLCJqb2luIiwiYnVmIiwicmVhZEZpbGUiLCJpbmZvIiwiSlNPTiIsInBhcnNlIiwiZ3VuemlwIiwibG9hZEZyb21EYXRhIiwiY3VyIiwibmFtZSIsImNvbXBpbGVyVmVyc2lvbiIsImNvbXBpbGVyT3B0aW9ucyIsImlucHV0TWltZVR5cGVzIiwiY3JlYXRlRnJvbUNvbmZpZ3VyYXRpb24iLCJmb3JFYWNoIiwic2F2ZUNvbmZpZ3VyYXRpb24iLCJzZXJpYWxpemVkQ29tcGlsZXJPcHRzIiwiS2xhc3MiLCJnZXRQcm90b3R5cGVPZiIsInZhbCIsImdldElucHV0TWltZVR5cGVzIiwiZ2V0Q29tcGlsZXJWZXJzaW9uIiwiZ2V0U2F2ZWREYXRhIiwiZ3ppcCIsIkJ1ZmZlciIsInN0cmluZ2lmeSIsIndyaXRlRmlsZSIsImNvbXBpbGUiLCJmaWxlUGF0aCIsInJldCIsImNvbXBpbGVSZWFkT25seSIsImZ1bGxDb21waWxlIiwibWltZVR5cGUiLCJsb29rdXAiLCJ0eXBlIiwiaXNJbk5vZGVNb2R1bGVzIiwiY29kZSIsImhhc2hJbmZvIiwiZ2V0SGFzaEZvclBhdGgiLCJzaG91bGRQYXNzdGhyb3VnaCIsImdldFBhc3N0aHJvdWdoQ29tcGlsZXIiLCJnZXQiLCJiaW5hcnlEYXRhIiwiY2FjaGUiLCJFcnJvciIsInNvdXJjZUNvZGUiLCJmaXhOb2RlTW9kdWxlc1NvdXJjZU1hcHBpbmciLCJnZXRPckZldGNoIiwiY29tcGlsZVVuY2FjaGVkIiwiaW5wdXRNaW1lVHlwZSIsImlzRmlsZUJpbmFyeSIsImRlcGVuZGVudEZpbGVzIiwiY3R4Iiwic2hvdWxkQ29tcGlsZUZpbGUiLCJkZXRlcm1pbmVEZXBlbmRlbnRGaWxlcyIsInJlc3VsdCIsInNob3VsZElubGluZUh0bWxpZnkiLCJpc1Bhc3N0aHJvdWdoIiwiZXh0ZW5zaW9uIiwiY29tcGlsZUFsbCIsInJvb3REaXJlY3RvcnkiLCJzaG91bGRDb21waWxlIiwic2hvdWxkIiwiZiIsImxpc3RlblRvQ29tcGlsZUV2ZW50cyIsIm1hcCIsImNvbXBpbGVTeW5jIiwiY29tcGlsZVJlYWRPbmx5U3luYyIsImZ1bGxDb21waWxlU3luYyIsImNyZWF0ZVJlYWRvbmx5RnJvbUNvbmZpZ3VyYXRpb25TeW5jIiwicmVhZEZpbGVTeW5jIiwiZ3VuemlwU3luYyIsImNyZWF0ZUZyb21Db25maWd1cmF0aW9uU3luYyIsInNhdmVDb25maWd1cmF0aW9uU3luYyIsImd6aXBTeW5jIiwid3JpdGVGaWxlU3luYyIsImdldEhhc2hGb3JQYXRoU3luYyIsImdldFN5bmMiLCJmaXhOb2RlTW9kdWxlc1NvdXJjZU1hcHBpbmdTeW5jIiwiZ2V0T3JGZXRjaFN5bmMiLCJjb21waWxlVW5jYWNoZWRTeW5jIiwic2hvdWxkQ29tcGlsZUZpbGVTeW5jIiwiZGV0ZXJtaW5lRGVwZW5kZW50RmlsZXNTeW5jIiwiY29tcGlsZUFsbFN5bmMiLCJpc01pbmlmaWVkIiwiaGFzU291cmNlTWFwIiwic291cmNlUGF0aCIsInJlZ2V4U291cmNlTWFwcGluZyIsInNvdXJjZU1hcHBpbmdDaGVjayIsIm1hdGNoIiwic3RhdCIsImVycm9yIiwibm9ybVJvb3QiLCJub3JtYWxpemUiLCJhYnNQYXRoVG9Nb2R1bGUiLCJkaXJuYW1lIiwicmVwbGFjZSIsInN1YnN0cmluZyIsIm5ld01hcFBhdGgiLCJzdGF0U3luYyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOztBQUVBOztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOztBQUlBOzs7Ozs7QUFGQSxNQUFNQSxJQUFJQyxRQUFRLE9BQVIsRUFBaUIsZ0NBQWpCLENBQVY7O0FBSUFBLFFBQVEsa0JBQVIsRUFBNEJDLElBQTVCOztBQUVBO0FBQ0EsTUFBTUMsYUFBYTtBQUNqQixxQkFBbUIsSUFERjtBQUVqQiw0QkFBMEIsSUFGVDtBQUdqQixlQUFhLElBSEk7QUFJakIsY0FBWSxJQUpLO0FBS2pCLG1CQUFpQixJQUxBO0FBTWpCLHNCQUFvQjtBQU5ILENBQW5COztBQVNBOzs7Ozs7Ozs7Ozs7OztBQWNlLE1BQU1DLFlBQU4sQ0FBbUI7QUFDaEM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQThCQUMsY0FBWUMsWUFBWixFQUEwQkMsU0FBMUIsRUFBcUNDLGVBQXJDLEVBQXNEQyxZQUF0RCxFQUErSTtBQUFBLFFBQTNFQyxnQkFBMkUsdUVBQXhELElBQXdEO0FBQUEsUUFBbERDLGFBQWtELHVFQUFsQyxJQUFrQztBQUFBLFFBQTVCQyxtQkFBNEIsdUVBQU4sSUFBTTs7QUFDN0ksUUFBSUMsc0JBQXNCQyxPQUFPQyxNQUFQLENBQWMsRUFBZCxFQUFrQlIsU0FBbEIsQ0FBMUI7QUFDQU8sV0FBT0MsTUFBUCxDQUFjLElBQWQsRUFBb0IsRUFBQ1QsWUFBRCxFQUFlTyxtQkFBZixFQUFvQ0wsZUFBcEMsRUFBcURDLFlBQXJELEVBQW1FQyxnQkFBbkUsRUFBcEI7QUFDQSxTQUFLTSxPQUFMLEdBQWUsS0FBS1IsZUFBTCxDQUFxQlEsT0FBcEM7O0FBRUEsU0FBS0Msa0JBQUwsR0FBMEJILE9BQU9JLElBQVAsQ0FBWUwsbUJBQVosRUFBaUNN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LEVBQTdCLEVBQWlDSyxTQUFqQyxDQUEyQyxDQUEzQyxDQUFiLENBQXRCO0FBQ0EsWUFBSUMsYUFBYSxlQUFLbEcsSUFBTCxDQUFVOEYsZUFBVixFQUEyQmhILGFBQTNCLENBQWpCOztBQUVBLGVBQU8rRCxXQUFXbUQsT0FBWCxDQUFtQlQsa0JBQW5CLEVBQXdDLHdCQUF1QlcsVUFBVyxFQUExRSxDQUFQO0FBQ0Q7QUFDRjs7QUFFRCxXQUFPckQsVUFBUDtBQUNEO0FBNXBCK0I7a0JBQWJ0RSxZIiwiZmlsZSI6ImNvbXBpbGVyLWhvc3QuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgbWltZVR5cGVzIGZyb20gJ0BwYXVsY2JldHRzL21pbWUtdHlwZXMnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCB6bGliIGZyb20gJ3psaWInO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge3BmcywgcHpsaWJ9IGZyb20gJy4vcHJvbWlzZSc7XG5cbmltcG9ydCB7Zm9yQWxsRmlsZXMsIGZvckFsbEZpbGVzU3luY30gZnJvbSAnLi9mb3ItYWxsLWZpbGVzJztcbmltcG9ydCBDb21waWxlQ2FjaGUgZnJvbSAnLi9jb21waWxlLWNhY2hlJztcbmltcG9ydCBGaWxlQ2hhbmdlZENhY2hlIGZyb20gJy4vZmlsZS1jaGFuZ2UtY2FjaGUnO1xuaW1wb3J0IFJlYWRPbmx5Q29tcGlsZXIgZnJvbSAnLi9yZWFkLW9ubHktY29tcGlsZXInO1xuaW1wb3J0IHtsaXN0ZW4sIHNlbmR9IGZyb20gJy4vYnJvd3Nlci1zaWduYWwnO1xuXG5jb25zdCBkID0gcmVxdWlyZSgnZGVidWcnKSgnZWxlY3Ryb24tY29tcGlsZTpjb21waWxlci1ob3N0Jyk7XG5cbmltcG9ydCAncnhqcy9hZGQvb3BlcmF0b3IvbWFwJztcblxucmVxdWlyZSgnLi9yaWctbWltZS10eXBlcycpLmluaXQoKTtcblxuLy8gVGhpcyBpc24ndCBldmVuIG15XG5jb25zdCBmaW5hbEZvcm1zID0ge1xuICAndGV4dC9qYXZhc2NyaXB0JzogdHJ1ZSxcbiAgJ2FwcGxpY2F0aW9uL2phdmFzY3JpcHQnOiB0cnVlLFxuICAndGV4dC9odG1sJzogdHJ1ZSxcbiAgJ3RleHQvY3NzJzogdHJ1ZSxcbiAgJ2ltYWdlL3N2Zyt4bWwnOiB0cnVlLFxuICAnYXBwbGljYXRpb24vanNvbic6IHRydWVcbn07XG5cbi8qKlxuICogVGhpcyBjbGFzcyBpcyB0aGUgdG9wLWxldmVsIGNsYXNzIHRoYXQgZW5jYXBzdWxhdGVzIGFsbCBvZiB0aGUgbG9naWMgb2ZcbiAqIGNvbXBpbGluZyBhbmQgY2FjaGluZyBhcHBsaWNhdGlvbiBjb2RlLiBJZiB5b3UncmUgbG9va2luZyBmb3IgYSBcIk1haW4gY2xhc3NcIixcbiAqIHRoaXMgaXMgaXQuXG4gKlxuICogVGhpcyBjbGFzcyBjYW4gYmUgY3JlYXRlZCBkaXJlY3RseSBidXQgaXQgaXMgdXN1YWxseSBjcmVhdGVkIHZpYSB0aGUgbWV0aG9kc1xuICogaW4gY29uZmlnLXBhcnNlciwgd2hpY2ggd2lsbCBhbW9uZyBvdGhlciB0aGluZ3MsIHNldCB1cCB0aGUgY29tcGlsZXIgb3B0aW9uc1xuICogZ2l2ZW4gYSBwcm9qZWN0IHJvb3QuXG4gKlxuICogQ29tcGlsZXJIb3N0IGlzIGFsc28gdGhlIHRvcC1sZXZlbCBjbGFzcyB0aGF0IGtub3dzIGhvdyB0byBzZXJpYWxpemUgYWxsIG9mIHRoZVxuICogaW5mb3JtYXRpb24gbmVjZXNzYXJ5IHRvIHJlY3JlYXRlIGl0c2VsZiwgZWl0aGVyIGFzIGEgZGV2ZWxvcG1lbnQgaG9zdCAoaS5lLlxuICogd2lsbCBhbGxvdyBjYWNoZSBtaXNzZXMgYW5kIGFjdHVhbCBjb21waWxhdGlvbiksIG9yIGFzIGEgcmVhZC1vbmx5IHZlcnNpb24gb2ZcbiAqIGl0c2VsZiBmb3IgcHJvZHVjdGlvbi5cbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQ29tcGlsZXJIb3N0IHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYW4gaW5zdGFuY2Ugb2YgQ29tcGlsZXJIb3N0LiBZb3UgcHJvYmFibHkgd2FudCB0byB1c2UgdGhlIG1ldGhvZHNcbiAgICogaW4gY29uZmlnLXBhcnNlciBmb3IgZGV2ZWxvcG1lbnQsIG9yIHtAbGluayBjcmVhdGVSZWFkb25seUZyb21Db25maWd1cmF0aW9ufVxuICAgKiBmb3IgcHJvZHVjdGlvbiBpbnN0ZWFkLlxuICAgKlxuICAgKiBAcGFyYW0gIHtzdHJpbmd9IHJvb3RDYWNoZURpciAgVGhlIHJvb3QgZGlyZWN0b3J5IHRvIHVzZSBmb3IgdGhlIGNhY2hlXG4gICAqXG4gICAqIEBwYXJhbSAge09iamVjdH0gY29tcGlsZXJzICBhbiBPYmplY3Qgd2hvc2Uga2V5cyBhcmUgaW5wdXQgTUlNRSB0eXBlcyBhbmRcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdob3NlIHZhbHVlcyBhcmUgaW5zdGFuY2VzIG9mIENvbXBpbGVyQmFzZS4gQ3JlYXRlXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzIHZpYSB0aGUge0BsaW5rIGNyZWF0ZUNvbXBpbGVyc30gbWV0aG9kIGluXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25maWctcGFyc2VyLlxuICAgKlxuICAgKiBAcGFyYW0gIHtGaWxlQ2hhbmdlZENhY2hlfSBmaWxlQ2hhbmdlQ2FjaGUgIEEgZmlsZS1jaGFuZ2UgY2FjaGUgdGhhdCBpc1xuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbmFsbHkgcHJlLWxvYWRlZC5cbiAgICpcbiAgICogQHBhcmFtICB7Ym9vbGVhbn0gcmVhZE9ubHlNb2RlICBJZiBUcnVlLCBjYWNoZSBtaXNzZXMgd2lsbCBmYWlsIGFuZFxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBpbGF0aW9uIHdpbGwgbm90IGJlIGF0dGVtcHRlZC5cbiAgICpcbiAgICogQHBhcmFtICB7Q29tcGlsZXJCYXNlfSBmYWxsYmFja0NvbXBpbGVyIChvcHRpb25hbCkgIFdoZW4gYSBmaWxlIGlzIGNvbXBpbGVkXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aGljaCBkb2Vzbid0IGhhdmUgYSBtYXRjaGluZyBjb21waWxlcixcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMgY29tcGlsZXIgd2lsbCBiZSB1c2VkIGluc3RlYWQuIElmXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBudWxsLCB3aWxsIGZhaWwgY29tcGlsYXRpb24uIEEgZ29vZFxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWx0ZXJuYXRlIGZhbGxiYWNrIGlzIHRoZSBjb21waWxlciBmb3JcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICd0ZXh0L3BsYWluJywgd2hpY2ggaXMgZ3VhcmFudGVlZCB0byBiZVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJlc2VudC5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHNvdXJjZU1hcFBhdGggKG9wdGlvbmFsKSBUaGUgZGlyZWN0b3J5IHRvIHN0b3JlIHNvdXJjZW1hcCBzZXBhcmF0ZWx5XG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIGNvbXBpbGVyIG9wdGlvbiBlbmFibGVkIHRvIGVtaXQuXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIERlZmF1bHQgdG8gY2FjaGVQYXRoIGlmIG5vdCBzcGVjaWZpZWQuXG4gICAqL1xuICBjb25zdHJ1Y3Rvcihyb290Q2FjaGVEaXIsIGNvbXBpbGVycywgZmlsZUNoYW5nZUNhY2hlLCByZWFkT25seU1vZGUsIGZhbGxiYWNrQ29tcGlsZXIgPSBudWxsLCBzb3VyY2VNYXBQYXRoID0gbnVsbCwgbWltZVR5cGVzVG9SZWdpc3RlciA9IG51bGwpIHtcbiAgICBsZXQgY29tcGlsZXJzQnlNaW1lVHlwZSA9IE9iamVjdC5hc3NpZ24oe30sIGNvbXBpbGVycyk7XG4gICAgT2JqZWN0LmFzc2lnbih0aGlzLCB7cm9vdENhY2hlRGlyLCBjb21waWxlcnNCeU1pbWVUeXBlLCBmaWxlQ2hhbmdlQ2FjaGUsIHJlYWRPbmx5TW9kZSwgZmFsbGJhY2tDb21waWxlcn0pO1xuICAgIHRoaXMuYXBwUm9vdCA9IHRoaXMuZmlsZUNoYW5nZUNhY2hlLmFwcFJvb3Q7XG5cbiAgICB0aGlzLmNhY2hlc0ZvckNvbXBpbGVycyA9IE9iamVjdC5rZXlzKGNvbXBpbGVyc0J5TWltZVR5cGUpLnJlZHVjZSgoYWNjLCB4KSA9PiB7XG4gICAgICBsZXQgY29tcGlsZXIgPSBjb21waWxlcnNCeU1pbWVUeXBlW3hdO1xuICAgICAgaWYgKGFjYy5oYXMoY29tcGlsZXIpKSByZXR1cm4gYWNjO1xuXG4gICAgICBhY2Muc2V0KFxuICAgICAgICBjb21waWxlcixcbiAgICAgICAgQ29tcGlsZUNhY2hlLmNyZWF0ZUZyb21Db21waWxlcihyb290Q2FjaGVEaXIsIGNvbXBpbGVyLCBmaWxlQ2hhbmdlQ2FjaGUsIHJlYWRPbmx5TW9kZSwgc291cmNlTWFwUGF0aCkpO1xuICAgICAgcmV0dXJuIGFjYztcbiAgICB9LCBuZXcgTWFwKCkpO1xuXG4gICAgdGhpcy5taW1lVHlwZXNUb1JlZ2lzdGVyID0gbWltZVR5cGVzVG9SZWdpc3RlciB8fCB7fTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgcHJvZHVjdGlvbi1tb2RlIENvbXBpbGVySG9zdCBmcm9tIHRoZSBwcmV2aW91c2x5IHNhdmVkXG4gICAqIGNvbmZpZ3VyYXRpb25cbiAgICpcbiAgICogQHBhcmFtICB7c3RyaW5nfSByb290Q2FjaGVEaXIgIFRoZSByb290IGRpcmVjdG9yeSB0byB1c2UgZm9yIHRoZSBjYWNoZS4gVGhpc1xuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FjaGUgbXVzdCBoYXZlIGNhY2hlIGluZm9ybWF0aW9uIHNhdmVkIHZpYVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge0BsaW5rIHNhdmVDb25maWd1cmF0aW9ufVxuICAgKlxuICAgKiBAcGFyYW0gIHtzdHJpbmd9IGFwcFJvb3QgIFRoZSB0b3AtbGV2ZWwgZGlyZWN0b3J5IGZvciB5b3VyIGFwcGxpY2F0aW9uIChpLmUuXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhlIG9uZSB3aGljaCBoYXMgeW91ciBwYWNrYWdlLmpzb24pLlxuICAgKlxuICAgKiBAcGFyYW0gIHtDb21waWxlckJhc2V9IGZhbGxiYWNrQ29tcGlsZXIgKG9wdGlvbmFsKSAgV2hlbiBhIGZpbGUgaXMgY29tcGlsZWRcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdoaWNoIGRvZXNuJ3QgaGF2ZSBhIG1hdGNoaW5nIGNvbXBpbGVyLFxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcyBjb21waWxlciB3aWxsIGJlIHVzZWQgaW5zdGVhZC4gSWZcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG51bGwsIHdpbGwgZmFpbCBjb21waWxhdGlvbi4gQSBnb29kXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbHRlcm5hdGUgZmFsbGJhY2sgaXMgdGhlIGNvbXBpbGVyIGZvclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3RleHQvcGxhaW4nLCB3aGljaCBpcyBndWFyYW50ZWVkIHRvIGJlXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmVzZW50LlxuICAgKlxuICAgKiBAcmV0dXJuIHtQcm9taXNlPENvbXBpbGVySG9zdD59ICBBIHJlYWQtb25seSBDb21waWxlckhvc3RcbiAgICovXG4gIHN0YXRpYyBhc3luYyBjcmVhdGVSZWFkb25seUZyb21Db25maWd1cmF0aW9uKHJvb3RDYWNoZURpciwgYXBwUm9vdCwgZmFsbGJhY2tDb21waWxlcj1udWxsKSB7XG4gICAgbGV0IHRhcmdldCA9IHBhdGguam9pbihyb290Q2FjaGVEaXIsICdjb21waWxlci1pbmZvLmpzb24uZ3onKTtcbiAgICBsZXQgYnVmID0gYXdhaXQgcGZzLnJlYWRGaWxlKHRhcmdldCk7XG4gICAgbGV0IGluZm8gPSBKU09OLnBhcnNlKGF3YWl0IHB6bGliLmd1bnppcChidWYpKTtcblxuICAgIGxldCBmaWxlQ2hhbmdlQ2FjaGUgPSBGaWxlQ2hhbmdlZENhY2hlLmxvYWRGcm9tRGF0YShpbmZvLmZpbGVDaGFuZ2VDYWNoZSwgYXBwUm9vdCwgdHJ1ZSk7XG5cbiAgICBsZXQgY29tcGlsZXJzID0gT2JqZWN0LmtleXMoaW5mby5jb21waWxlcnMpLnJlZHVjZSgoYWNjLCB4KSA9PiB7XG4gICAgICBsZXQgY3VyID0gaW5mby5jb21waWxlcnNbeF07XG4gICAgICBhY2NbeF0gPSBuZXcgUmVhZE9ubHlDb21waWxlcihjdXIubmFtZSwgY3VyLmNvbXBpbGVyVmVyc2lvbiwgY3VyLmNvbXBpbGVyT3B0aW9ucywgY3VyLmlucHV0TWltZVR5cGVzKTtcblxuICAgICAgcmV0dXJuIGFjYztcbiAgICB9LCB7fSk7XG5cbiAgICByZXR1cm4gbmV3IENvbXBpbGVySG9zdChyb290Q2FjaGVEaXIsIGNvbXBpbGVycywgZmlsZUNoYW5nZUNhY2hlLCB0cnVlLCBmYWxsYmFja0NvbXBpbGVyLCBudWxsLCBpbmZvLm1pbWVUeXBlc1RvUmVnaXN0ZXIpO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBkZXZlbG9wbWVudC1tb2RlIENvbXBpbGVySG9zdCBmcm9tIHRoZSBwcmV2aW91c2x5IHNhdmVkXG4gICAqIGNvbmZpZ3VyYXRpb24uXG4gICAqXG4gICAqIEBwYXJhbSAge3N0cmluZ30gcm9vdENhY2hlRGlyICBUaGUgcm9vdCBkaXJlY3RvcnkgdG8gdXNlIGZvciB0aGUgY2FjaGUuIFRoaXNcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhY2hlIG11c3QgaGF2ZSBjYWNoZSBpbmZvcm1hdGlvbiBzYXZlZCB2aWFcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtAbGluayBzYXZlQ29uZmlndXJhdGlvbn1cbiAgICpcbiAgICogQHBhcmFtICB7c3RyaW5nfSBhcHBSb290ICBUaGUgdG9wLWxldmVsIGRpcmVjdG9yeSBmb3IgeW91ciBhcHBsaWNhdGlvbiAoaS5lLlxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoZSBvbmUgd2hpY2ggaGFzIHlvdXIgcGFja2FnZS5qc29uKS5cbiAgICpcbiAgICogQHBhcmFtICB7T2JqZWN0fSBjb21waWxlcnNCeU1pbWVUeXBlICBhbiBPYmplY3Qgd2hvc2Uga2V5cyBhcmUgaW5wdXQgTUlNRVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGVzIGFuZCB3aG9zZSB2YWx1ZXMgYXJlIGluc3RhbmNlc1xuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9mIENvbXBpbGVyQmFzZS4gQ3JlYXRlIHRoaXMgdmlhIHRoZVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtAbGluayBjcmVhdGVDb21waWxlcnN9IG1ldGhvZCBpblxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpZy1wYXJzZXIuXG4gICAqXG4gICAqIEBwYXJhbSAge0NvbXBpbGVyQmFzZX0gZmFsbGJhY2tDb21waWxlciAob3B0aW9uYWwpICBXaGVuIGEgZmlsZSBpcyBjb21waWxlZFxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2hpY2ggZG9lc24ndCBoYXZlIGEgbWF0Y2hpbmcgY29tcGlsZXIsXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzIGNvbXBpbGVyIHdpbGwgYmUgdXNlZCBpbnN0ZWFkLiBJZlxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbnVsbCwgd2lsbCBmYWlsIGNvbXBpbGF0aW9uLiBBIGdvb2RcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFsdGVybmF0ZSBmYWxsYmFjayBpcyB0aGUgY29tcGlsZXIgZm9yXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAndGV4dC9wbGFpbicsIHdoaWNoIGlzIGd1YXJhbnRlZWQgdG8gYmVcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByZXNlbnQuXG4gICAqXG4gICAqIEByZXR1cm4ge1Byb21pc2U8Q29tcGlsZXJIb3N0Pn0gIEEgcmVhZC1vbmx5IENvbXBpbGVySG9zdFxuICAgKi9cbiAgc3RhdGljIGFzeW5jIGNyZWF0ZUZyb21Db25maWd1cmF0aW9uKHJvb3RDYWNoZURpciwgYXBwUm9vdCwgY29tcGlsZXJzQnlNaW1lVHlwZSwgZmFsbGJhY2tDb21waWxlcj1udWxsKSB7XG4gICAgbGV0IHRhcmdldCA9IHBhdGguam9pbihyb290Q2FjaGVEaXIsICdjb21waWxlci1pbmZvLmpzb24uZ3onKTtcbiAgICBsZXQgYnVmID0gYXdhaXQgcGZzLnJlYWRGaWxlKHRhcmdldCk7XG4gICAgbGV0IGluZm8gPSBKU09OLnBhcnNlKGF3YWl0IHB6bGliLmd1bnppcChidWYpKTtcblxuICAgIGxldCBmaWxlQ2hhbmdlQ2FjaGUgPSBGaWxlQ2hhbmdlZENhY2hlLmxvYWRGcm9tRGF0YShpbmZvLmZpbGVDaGFuZ2VDYWNoZSwgYXBwUm9vdCwgZmFsc2UpO1xuXG4gICAgT2JqZWN0LmtleXMoaW5mby5jb21waWxlcnMpLmZvckVhY2goKHgpID0+IHtcbiAgICAgIGxldCBjdXIgPSBpbmZvLmNvbXBpbGVyc1t4XTtcbiAgICAgIGNvbXBpbGVyc0J5TWltZVR5cGVbeF0uY29tcGlsZXJPcHRpb25zID0gY3VyLmNvbXBpbGVyT3B0aW9ucztcbiAgICB9KTtcblxuICAgIHJldHVybiBuZXcgQ29tcGlsZXJIb3N0KHJvb3RDYWNoZURpciwgY29tcGlsZXJzQnlNaW1lVHlwZSwgZmlsZUNoYW5nZUNhY2hlLCBmYWxzZSwgZmFsbGJhY2tDb21waWxlciwgbnVsbCwgaW5mby5taW1lVHlwZXNUb1JlZ2lzdGVyKTtcbiAgfVxuXG5cbiAgLyoqXG4gICAqIFNhdmVzIHRoZSBjdXJyZW50IGNvbXBpbGVyIGNvbmZpZ3VyYXRpb24gdG8gYSBmaWxlIHRoYXRcbiAgICoge0BsaW5rIGNyZWF0ZVJlYWRvbmx5RnJvbUNvbmZpZ3VyYXRpb259IGNhbiB1c2UgdG8gcmVjcmVhdGUgdGhlIGN1cnJlbnRcbiAgICogY29tcGlsZXIgZW52aXJvbm1lbnRcbiAgICpcbiAgICogQHJldHVybiB7UHJvbWlzZX0gIENvbXBsZXRpb25cbiAgICovXG4gIGFzeW5jIHNhdmVDb25maWd1cmF0aW9uKCkge1xuICAgIGxldCBzZXJpYWxpemVkQ29tcGlsZXJPcHRzID0gT2JqZWN0LmtleXModGhpcy5jb21waWxlcnNCeU1pbWVUeXBlKS5yZWR1Y2UoKGFjYywgeCkgPT4ge1xuICAgICAgbGV0IGNvbXBpbGVyID0gdGhpcy5jb21waWxlcnNCeU1pbWVUeXBlW3hdO1xuICAgICAgbGV0IEtsYXNzID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKGNvbXBpbGVyKS5jb25zdHJ1Y3RvcjtcblxuICAgICAgbGV0IHZhbCA9IHtcbiAgICAgICAgbmFtZTogS2xhc3MubmFtZSxcbiAgICAgICAgaW5wdXRNaW1lVHlwZXM6IEtsYXNzLmdldElucHV0TWltZVR5cGVzKCksXG4gICAgICAgIGNvbXBpbGVyT3B0aW9uczogY29tcGlsZXIuY29tcGlsZXJPcHRpb25zLFxuICAgICAgICBjb21waWxlclZlcnNpb246IGNvbXBpbGVyLmdldENvbXBpbGVyVmVyc2lvbigpXG4gICAgICB9O1xuXG4gICAgICBhY2NbeF0gPSB2YWw7XG4gICAgICByZXR1cm4gYWNjO1xuICAgIH0sIHt9KTtcblxuICAgIGxldCBpbmZvID0ge1xuICAgICAgZmlsZUNoYW5nZUNhY2hlOiB0aGlzLmZpbGVDaGFuZ2VDYWNoZS5nZXRTYXZlZERhdGEoKSxcbiAgICAgIGNvbXBpbGVyczogc2VyaWFsaXplZENvbXBpbGVyT3B0cyxcbiAgICAgIG1pbWVUeXBlc1RvUmVnaXN0ZXI6IHRoaXMubWltZVR5cGVzVG9SZWdpc3RlclxuICAgIH07XG5cbiAgICBsZXQgdGFyZ2V0ID0gcGF0aC5qb2luKHRoaXMucm9vdENhY2hlRGlyLCAnY29tcGlsZXItaW5mby5qc29uLmd6Jyk7XG4gICAgbGV0IGJ1ZiA9IGF3YWl0IHB6bGliLmd6aXAobmV3IEJ1ZmZlcihKU09OLnN0cmluZ2lmeShpbmZvKSkpO1xuICAgIGF3YWl0IHBmcy53cml0ZUZpbGUodGFyZ2V0LCBidWYpO1xuICB9XG5cbiAgLyoqXG4gICAqIENvbXBpbGVzIGEgZmlsZSBhbmQgcmV0dXJucyB0aGUgY29tcGlsZWQgcmVzdWx0LlxuICAgKlxuICAgKiBAcGFyYW0gIHtzdHJpbmd9IGZpbGVQYXRoICBUaGUgcGF0aCB0byB0aGUgZmlsZSB0byBjb21waWxlXG4gICAqXG4gICAqIEByZXR1cm4ge1Byb21pc2U8b2JqZWN0Pn0gIEFuIE9iamVjdCB3aXRoIHRoZSBjb21waWxlZCByZXN1bHRcbiAgICpcbiAgICogQHByb3BlcnR5IHtPYmplY3R9IGhhc2hJbmZvICBUaGUgaGFzaCBpbmZvcm1hdGlvbiByZXR1cm5lZCBmcm9tIGdldEhhc2hGb3JQYXRoXG4gICAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBjb2RlICBUaGUgc291cmNlIGNvZGUgaWYgdGhlIGZpbGUgd2FzIGEgdGV4dCBmaWxlXG4gICAqIEBwcm9wZXJ0eSB7QnVmZmVyfSBiaW5hcnlEYXRhICBUaGUgZmlsZSBpZiBpdCB3YXMgYSBiaW5hcnkgZmlsZVxuICAgKiBAcHJvcGVydHkge3N0cmluZ30gbWltZVR5cGUgIFRoZSBNSU1FIHR5cGUgc2F2ZWQgaW4gdGhlIGNhY2hlLlxuICAgKiBAcHJvcGVydHkge3N0cmluZ1tdfSBkZXBlbmRlbnRGaWxlcyAgVGhlIGRlcGVuZGVudCBmaWxlcyByZXR1cm5lZCBmcm9tXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21waWxpbmcgdGhlIGZpbGUsIGlmIGFueS5cbiAgICovXG4gIGFzeW5jIGNvbXBpbGUoZmlsZVBhdGgpIHtcbiAgICBsZXQgcmV0ID0gYXdhaXQgKHRoaXMucmVhZE9ubHlNb2RlID8gdGhpcy5jb21waWxlUmVhZE9ubHkoZmlsZVBhdGgpIDogdGhpcy5mdWxsQ29tcGlsZShmaWxlUGF0aCkpO1xuXG4gICAgaWYgKHJldC5taW1lVHlwZSA9PT0gJ2FwcGxpY2F0aW9uL2phdmFzY3JpcHQnKSB7XG4gICAgICB0aGlzLm1pbWVUeXBlc1RvUmVnaXN0ZXJbbWltZVR5cGVzLmxvb2t1cChmaWxlUGF0aCldID0gdHJ1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmV0O1xuICB9XG5cblxuICAvKipcbiAgICogSGFuZGxlcyBjb21waWxhdGlvbiBpbiByZWFkLW9ubHkgbW9kZVxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgYXN5bmMgY29tcGlsZVJlYWRPbmx5KGZpbGVQYXRoKSB7XG4gICAgLy8gV2UgZ3VhcmFudGVlIHRoYXQgbm9kZV9tb2R1bGVzIGFyZSBhbHdheXMgc2hpcHBlZCBkaXJlY3RseVxuICAgIGxldCB0eXBlID0gbWltZVR5cGVzLmxvb2t1cChmaWxlUGF0aCk7XG4gICAgaWYgKEZpbGVDaGFuZ2VkQ2FjaGUuaXNJbk5vZGVNb2R1bGVzKGZpbGVQYXRoKSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbWltZVR5cGU6IHR5cGUgfHwgJ2FwcGxpY2F0aW9uL2phdmFzY3JpcHQnLFxuICAgICAgICBjb2RlOiBhd2FpdCBwZnMucmVhZEZpbGUoZmlsZVBhdGgsICd1dGY4JylcbiAgICAgIH07XG4gICAgfVxuXG4gICAgbGV0IGhhc2hJbmZvID0gYXdhaXQgdGhpcy5maWxlQ2hhbmdlQ2FjaGUuZ2V0SGFzaEZvclBhdGgoZmlsZVBhdGgpO1xuXG4gICAgLy8gTkI6IEhlcmUsIHdlJ3JlIGJhc2ljYWxseSBvbmx5IHVzaW5nIHRoZSBjb21waWxlciBoZXJlIHRvIGZpbmRcbiAgICAvLyB0aGUgYXBwcm9wcmlhdGUgQ29tcGlsZUNhY2hlXG4gICAgbGV0IGNvbXBpbGVyID0gQ29tcGlsZXJIb3N0LnNob3VsZFBhc3N0aHJvdWdoKGhhc2hJbmZvKSA/XG4gICAgICB0aGlzLmdldFBhc3N0aHJvdWdoQ29tcGlsZXIoKSA6XG4gICAgICB0aGlzLmNvbXBpbGVyc0J5TWltZVR5cGVbdHlwZSB8fCAnX19sb2xub3RoZXJlJ107XG5cblxuICAgIC8vIE5COiBXZSBkb24ndCBwdXQgdGhpcyBpbnRvIHNob3VsZFBhc3N0aHJvdWdoIGJlY2F1c2UgSW5saW5lIEhUTUxcbiAgICAvLyBjb21waWxlciBpcyB0ZWNobmljYWxseSBvZiB0eXBlIGZpbmFsRm9ybXMgKGkuZS4gYSBicm93c2VyIGNhblxuICAgIC8vIG5hdGl2ZWx5IGhhbmRsZSB0aGlzIGNvbnRlbnQpLCB5ZXQgaXRzIGNvbXBpbGVyIGlzXG4gICAgLy8gSW5saW5lSHRtbENvbXBpbGVyLiBIb3dldmVyLCB3ZSBzdGlsbCB3YW50IHRvIGNhdGNoIHN0YW5kYXJkIENTUyBmaWxlc1xuICAgIC8vIHdoaWNoIHdpbGwgYmUgcHJvY2Vzc2VkIGJ5IFBhc3N0aHJvdWdoQ29tcGlsZXIuXG4gICAgaWYgKGZpbmFsRm9ybXNbdHlwZV0gJiYgIWNvbXBpbGVyKSB7XG4gICAgICBjb21waWxlciA9IHRoaXMuZ2V0UGFzc3Rocm91Z2hDb21waWxlcigpO1xuICAgIH1cblxuICAgIGlmICghY29tcGlsZXIpIHtcbiAgICAgIGNvbXBpbGVyID0gdGhpcy5mYWxsYmFja0NvbXBpbGVyO1xuXG4gICAgICBsZXQgeyBjb2RlLCBiaW5hcnlEYXRhLCBtaW1lVHlwZSB9ID0gYXdhaXQgY29tcGlsZXIuZ2V0KGZpbGVQYXRoKTtcbiAgICAgIHJldHVybiB7IGNvZGU6IGNvZGUgfHwgYmluYXJ5RGF0YSwgbWltZVR5cGUgfTtcbiAgICB9XG5cbiAgICBsZXQgY2FjaGUgPSB0aGlzLmNhY2hlc0ZvckNvbXBpbGVycy5nZXQoY29tcGlsZXIpO1xuICAgIGxldCB7Y29kZSwgYmluYXJ5RGF0YSwgbWltZVR5cGV9ID0gYXdhaXQgY2FjaGUuZ2V0KGZpbGVQYXRoKTtcblxuICAgIGNvZGUgPSBjb2RlIHx8IGJpbmFyeURhdGE7XG4gICAgaWYgKCFjb2RlIHx8ICFtaW1lVHlwZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBBc2tlZCB0byBjb21waWxlICR7ZmlsZVBhdGh9IGluIHByb2R1Y3Rpb24sIGlzIHRoaXMgZmlsZSBub3QgcHJlY29tcGlsZWQ/YCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHsgY29kZSwgbWltZVR5cGUgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBIYW5kbGVzIGNvbXBpbGF0aW9uIGluIHJlYWQtd3JpdGUgbW9kZVxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgYXN5bmMgZnVsbENvbXBpbGUoZmlsZVBhdGgpIHtcbiAgICBkKGBDb21waWxpbmcgJHtmaWxlUGF0aH1gKTtcbiAgICBsZXQgdHlwZSA9IG1pbWVUeXBlcy5sb29rdXAoZmlsZVBhdGgpO1xuXG4gICAgc2VuZCgnZWxlY3Ryb24tY29tcGlsZS1jb21waWxlZC1maWxlJywgeyBmaWxlUGF0aCwgbWltZVR5cGU6IHR5cGUgfSk7XG5cbiAgICBsZXQgaGFzaEluZm8gPSBhd2FpdCB0aGlzLmZpbGVDaGFuZ2VDYWNoZS5nZXRIYXNoRm9yUGF0aChmaWxlUGF0aCk7XG5cbiAgICBpZiAoaGFzaEluZm8uaXNJbk5vZGVNb2R1bGVzKSB7XG4gICAgICBsZXQgY29kZSA9IGhhc2hJbmZvLnNvdXJjZUNvZGUgfHwgYXdhaXQgcGZzLnJlYWRGaWxlKGZpbGVQYXRoLCAndXRmOCcpO1xuICAgICAgY29kZSA9IGF3YWl0IENvbXBpbGVySG9zdC5maXhOb2RlTW9kdWxlc1NvdXJjZU1hcHBpbmcoY29kZSwgZmlsZVBhdGgsIHRoaXMuZmlsZUNoYW5nZUNhY2hlLmFwcFJvb3QpO1xuICAgICAgcmV0dXJuIHsgY29kZSwgbWltZVR5cGU6IHR5cGUgfTtcbiAgICB9XG5cbiAgICBsZXQgY29tcGlsZXIgPSBDb21waWxlckhvc3Quc2hvdWxkUGFzc3Rocm91Z2goaGFzaEluZm8pID9cbiAgICAgIHRoaXMuZ2V0UGFzc3Rocm91Z2hDb21waWxlcigpIDpcbiAgICAgIHRoaXMuY29tcGlsZXJzQnlNaW1lVHlwZVt0eXBlIHx8ICdfX2xvbG5vdGhlcmUnXTtcblxuICAgIGlmICghY29tcGlsZXIpIHtcbiAgICAgIGQoYEZhbGxpbmcgYmFjayB0byBwYXNzdGhyb3VnaCBjb21waWxlciBmb3IgJHtmaWxlUGF0aH1gKTtcbiAgICAgIGNvbXBpbGVyID0gdGhpcy5mYWxsYmFja0NvbXBpbGVyO1xuICAgIH1cblxuICAgIGlmICghY29tcGlsZXIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ291bGRuJ3QgZmluZCBhIGNvbXBpbGVyIGZvciAke2ZpbGVQYXRofWApO1xuICAgIH1cblxuICAgIGxldCBjYWNoZSA9IHRoaXMuY2FjaGVzRm9yQ29tcGlsZXJzLmdldChjb21waWxlcik7XG4gICAgcmV0dXJuIGF3YWl0IGNhY2hlLmdldE9yRmV0Y2goXG4gICAgICBmaWxlUGF0aCxcbiAgICAgIChmaWxlUGF0aCwgaGFzaEluZm8pID0+IHRoaXMuY29tcGlsZVVuY2FjaGVkKGZpbGVQYXRoLCBoYXNoSW5mbywgY29tcGlsZXIpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBIYW5kbGVzIGludm9raW5nIGNvbXBpbGVycyBpbmRlcGVuZGVudCBvZiBjYWNoaW5nXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBhc3luYyBjb21waWxlVW5jYWNoZWQoZmlsZVBhdGgsIGhhc2hJbmZvLCBjb21waWxlcikge1xuICAgIGxldCBpbnB1dE1pbWVUeXBlID0gbWltZVR5cGVzLmxvb2t1cChmaWxlUGF0aCk7XG5cbiAgICBpZiAoaGFzaEluZm8uaXNGaWxlQmluYXJ5KSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBiaW5hcnlEYXRhOiBoYXNoSW5mby5iaW5hcnlEYXRhIHx8IGF3YWl0IHBmcy5yZWFkRmlsZShmaWxlUGF0aCksXG4gICAgICAgIG1pbWVUeXBlOiBpbnB1dE1pbWVUeXBlLFxuICAgICAgICBkZXBlbmRlbnRGaWxlczogW11cbiAgICAgIH07XG4gICAgfVxuXG4gICAgbGV0IGN0eCA9IHt9O1xuICAgIGxldCBjb2RlID0gaGFzaEluZm8uc291cmNlQ29kZSB8fCBhd2FpdCBwZnMucmVhZEZpbGUoZmlsZVBhdGgsICd1dGY4Jyk7XG5cbiAgICBpZiAoIShhd2FpdCBjb21waWxlci5zaG91bGRDb21waWxlRmlsZShjb2RlLCBjdHgpKSkge1xuICAgICAgZChgQ29tcGlsZXIgcmV0dXJuZWQgZmFsc2UgZm9yIHNob3VsZENvbXBpbGVGaWxlOiAke2ZpbGVQYXRofWApO1xuICAgICAgcmV0dXJuIHsgY29kZSwgbWltZVR5cGU6IG1pbWVUeXBlcy5sb29rdXAoZmlsZVBhdGgpLCBkZXBlbmRlbnRGaWxlczogW10gfTtcbiAgICB9XG5cbiAgICBsZXQgZGVwZW5kZW50RmlsZXMgPSBhd2FpdCBjb21waWxlci5kZXRlcm1pbmVEZXBlbmRlbnRGaWxlcyhjb2RlLCBmaWxlUGF0aCwgY3R4KTtcblxuICAgIGQoYFVzaW5nIGNvbXBpbGVyIG9wdGlvbnM6ICR7SlNPTi5zdHJpbmdpZnkoY29tcGlsZXIuY29tcGlsZXJPcHRpb25zKX1gKTtcbiAgICBsZXQgcmVzdWx0ID0gYXdhaXQgY29tcGlsZXIuY29tcGlsZShjb2RlLCBmaWxlUGF0aCwgY3R4KTtcblxuICAgIGxldCBzaG91bGRJbmxpbmVIdG1saWZ5ID1cbiAgICAgIGlucHV0TWltZVR5cGUgIT09ICd0ZXh0L2h0bWwnICYmXG4gICAgICByZXN1bHQubWltZVR5cGUgPT09ICd0ZXh0L2h0bWwnO1xuXG4gICAgbGV0IGlzUGFzc3Rocm91Z2ggPVxuICAgICAgcmVzdWx0Lm1pbWVUeXBlID09PSAndGV4dC9wbGFpbicgfHxcbiAgICAgICFyZXN1bHQubWltZVR5cGUgfHxcbiAgICAgIENvbXBpbGVySG9zdC5zaG91bGRQYXNzdGhyb3VnaChoYXNoSW5mbyk7XG5cbiAgICBpZiAoKGZpbmFsRm9ybXNbcmVzdWx0Lm1pbWVUeXBlXSAmJiAhc2hvdWxkSW5saW5lSHRtbGlmeSkgfHwgaXNQYXNzdGhyb3VnaCkge1xuICAgICAgLy8gR290IHNvbWV0aGluZyB3ZSBjYW4gdXNlIGluLWJyb3dzZXIsIGxldCdzIHJldHVybiBpdFxuICAgICAgcmV0dXJuIE9iamVjdC5hc3NpZ24ocmVzdWx0LCB7ZGVwZW5kZW50RmlsZXN9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgZChgUmVjdXJzaXZlbHkgY29tcGlsaW5nIHJlc3VsdCBvZiAke2ZpbGVQYXRofSB3aXRoIG5vbi1maW5hbCBNSU1FIHR5cGUgJHtyZXN1bHQubWltZVR5cGV9LCBpbnB1dCB3YXMgJHtpbnB1dE1pbWVUeXBlfWApO1xuXG4gICAgICBoYXNoSW5mbyA9IE9iamVjdC5hc3NpZ24oeyBzb3VyY2VDb2RlOiByZXN1bHQuY29kZSwgbWltZVR5cGU6IHJlc3VsdC5taW1lVHlwZSB9LCBoYXNoSW5mbyk7XG4gICAgICBjb21waWxlciA9IHRoaXMuY29tcGlsZXJzQnlNaW1lVHlwZVtyZXN1bHQubWltZVR5cGUgfHwgJ19fbG9sbm90aGVyZSddO1xuXG4gICAgICBpZiAoIWNvbXBpbGVyKSB7XG4gICAgICAgIGQoYFJlY3Vyc2l2ZSBjb21waWxlIGZhaWxlZCAtIGludGVybWVkaWF0ZSByZXN1bHQ6ICR7SlNPTi5zdHJpbmdpZnkocmVzdWx0KX1gKTtcblxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENvbXBpbGluZyAke2ZpbGVQYXRofSByZXN1bHRlZCBpbiBhIE1JTUUgdHlwZSBvZiAke3Jlc3VsdC5taW1lVHlwZX0sIHdoaWNoIHdlIGRvbid0IGtub3cgaG93IHRvIGhhbmRsZWApO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gYXdhaXQgdGhpcy5jb21waWxlVW5jYWNoZWQoXG4gICAgICAgIGAke2ZpbGVQYXRofS4ke21pbWVUeXBlcy5leHRlbnNpb24ocmVzdWx0Lm1pbWVUeXBlIHx8ICd0eHQnKX1gLFxuICAgICAgICBoYXNoSW5mbywgY29tcGlsZXIpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBQcmUtY2FjaGVzIGFuIGVudGlyZSBkaXJlY3Rvcnkgb2YgZmlsZXMgcmVjdXJzaXZlbHkuIFVzdWFsbHkgdXNlZCBmb3JcbiAgICogYnVpbGRpbmcgY3VzdG9tIGNvbXBpbGVyIHRvb2xpbmcuXG4gICAqXG4gICAqIEBwYXJhbSAge3N0cmluZ30gcm9vdERpcmVjdG9yeSAgVGhlIHRvcC1sZXZlbCBkaXJlY3RvcnkgdG8gY29tcGlsZVxuICAgKlxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gc2hvdWxkQ29tcGlsZSAob3B0aW9uYWwpICBBIEZ1bmN0aW9uIHdoaWNoIGFsbG93cyB0aGVcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGVyIHRvIGRpc2FibGUgY29tcGlsaW5nIGNlcnRhaW4gZmlsZXMuXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHRha2VzIGEgZnVsbHktcXVhbGlmaWVkIHBhdGggdG8gYSBmaWxlLFxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbmQgc2hvdWxkIHJldHVybiBhIEJvb2xlYW4uXG4gICAqXG4gICAqIEByZXR1cm4ge1Byb21pc2V9ICBDb21wbGV0aW9uLlxuICAgKi9cbiAgYXN5bmMgY29tcGlsZUFsbChyb290RGlyZWN0b3J5LCBzaG91bGRDb21waWxlPW51bGwpIHtcbiAgICBsZXQgc2hvdWxkID0gc2hvdWxkQ29tcGlsZSB8fCBmdW5jdGlvbigpIHtyZXR1cm4gdHJ1ZTt9O1xuXG4gICAgYXdhaXQgZm9yQWxsRmlsZXMocm9vdERpcmVjdG9yeSwgKGYpID0+IHtcbiAgICAgIGlmICghc2hvdWxkKGYpKSByZXR1cm47XG5cbiAgICAgIGQoYENvbXBpbGluZyAke2Z9YCk7XG4gICAgICByZXR1cm4gdGhpcy5jb21waWxlKGYsIHRoaXMuY29tcGlsZXJzQnlNaW1lVHlwZSk7XG4gICAgfSk7XG4gIH1cblxuICBsaXN0ZW5Ub0NvbXBpbGVFdmVudHMoKSB7XG4gICAgcmV0dXJuIGxpc3RlbignZWxlY3Ryb24tY29tcGlsZS1jb21waWxlZC1maWxlJykubWFwKChbeF0pID0+IHgpO1xuICB9XG5cbiAgLypcbiAgICogU3luYyBNZXRob2RzXG4gICAqL1xuXG4gIGNvbXBpbGVTeW5jKGZpbGVQYXRoKSB7XG4gICAgbGV0IHJldCA9ICh0aGlzLnJlYWRPbmx5TW9kZSA/XG4gICAgICB0aGlzLmNvbXBpbGVSZWFkT25seVN5bmMoZmlsZVBhdGgpIDpcbiAgICAgIHRoaXMuZnVsbENvbXBpbGVTeW5jKGZpbGVQYXRoKSk7XG5cbiAgICBpZiAocmV0Lm1pbWVUeXBlID09PSAnYXBwbGljYXRpb24vamF2YXNjcmlwdCcpIHtcbiAgICAgIHRoaXMubWltZVR5cGVzVG9SZWdpc3RlclttaW1lVHlwZXMubG9va3VwKGZpbGVQYXRoKV0gPSB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiByZXQ7XG4gIH1cblxuICBzdGF0aWMgY3JlYXRlUmVhZG9ubHlGcm9tQ29uZmlndXJhdGlvblN5bmMocm9vdENhY2hlRGlyLCBhcHBSb290LCBmYWxsYmFja0NvbXBpbGVyPW51bGwpIHtcbiAgICBsZXQgdGFyZ2V0ID0gcGF0aC5qb2luKHJvb3RDYWNoZURpciwgJ2NvbXBpbGVyLWluZm8uanNvbi5neicpO1xuICAgIGxldCBidWYgPSBmcy5yZWFkRmlsZVN5bmModGFyZ2V0KTtcbiAgICBsZXQgaW5mbyA9IEpTT04ucGFyc2UoemxpYi5ndW56aXBTeW5jKGJ1ZikpO1xuXG4gICAgbGV0IGZpbGVDaGFuZ2VDYWNoZSA9IEZpbGVDaGFuZ2VkQ2FjaGUubG9hZEZyb21EYXRhKGluZm8uZmlsZUNoYW5nZUNhY2hlLCBhcHBSb290LCB0cnVlKTtcblxuICAgIGxldCBjb21waWxlcnMgPSBPYmplY3Qua2V5cyhpbmZvLmNvbXBpbGVycykucmVkdWNlKChhY2MsIHgpID0+IHtcbiAgICAgIGxldCBjdXIgPSBpbmZvLmNvbXBpbGVyc1t4XTtcbiAgICAgIGFjY1t4XSA9IG5ldyBSZWFkT25seUNvbXBpbGVyKGN1ci5uYW1lLCBjdXIuY29tcGlsZXJWZXJzaW9uLCBjdXIuY29tcGlsZXJPcHRpb25zLCBjdXIuaW5wdXRNaW1lVHlwZXMpO1xuXG4gICAgICByZXR1cm4gYWNjO1xuICAgIH0sIHt9KTtcblxuICAgIHJldHVybiBuZXcgQ29tcGlsZXJIb3N0KHJvb3RDYWNoZURpciwgY29tcGlsZXJzLCBmaWxlQ2hhbmdlQ2FjaGUsIHRydWUsIGZhbGxiYWNrQ29tcGlsZXIsIG51bGwsIGluZm8ubWltZVR5cGVzVG9SZWdpc3Rlcik7XG4gIH1cblxuICBzdGF0aWMgY3JlYXRlRnJvbUNvbmZpZ3VyYXRpb25TeW5jKHJvb3RDYWNoZURpciwgYXBwUm9vdCwgY29tcGlsZXJzQnlNaW1lVHlwZSwgZmFsbGJhY2tDb21waWxlcj1udWxsKSB7XG4gICAgbGV0IHRhcmdldCA9IHBhdGguam9pbihyb290Q2FjaGVEaXIsICdjb21waWxlci1pbmZvLmpzb24uZ3onKTtcbiAgICBsZXQgYnVmID0gZnMucmVhZEZpbGVTeW5jKHRhcmdldCk7XG4gICAgbGV0IGluZm8gPSBKU09OLnBhcnNlKHpsaWIuZ3VuemlwU3luYyhidWYpKTtcblxuICAgIGxldCBmaWxlQ2hhbmdlQ2FjaGUgPSBGaWxlQ2hhbmdlZENhY2hlLmxvYWRGcm9tRGF0YShpbmZvLmZpbGVDaGFuZ2VDYWNoZSwgYXBwUm9vdCwgZmFsc2UpO1xuXG4gICAgT2JqZWN0LmtleXMoaW5mby5jb21waWxlcnMpLmZvckVhY2goKHgpID0+IHtcbiAgICAgIGxldCBjdXIgPSBpbmZvLmNvbXBpbGVyc1t4XTtcbiAgICAgIGNvbXBpbGVyc0J5TWltZVR5cGVbeF0uY29tcGlsZXJPcHRpb25zID0gY3VyLmNvbXBpbGVyT3B0aW9ucztcbiAgICB9KTtcblxuICAgIHJldHVybiBuZXcgQ29tcGlsZXJIb3N0KHJvb3RDYWNoZURpciwgY29tcGlsZXJzQnlNaW1lVHlwZSwgZmlsZUNoYW5nZUNhY2hlLCBmYWxzZSwgZmFsbGJhY2tDb21waWxlciwgbnVsbCwgaW5mby5taW1lVHlwZXNUb1JlZ2lzdGVyKTtcbiAgfVxuXG4gIHNhdmVDb25maWd1cmF0aW9uU3luYygpIHtcbiAgICBsZXQgc2VyaWFsaXplZENvbXBpbGVyT3B0cyA9IE9iamVjdC5rZXlzKHRoaXMuY29tcGlsZXJzQnlNaW1lVHlwZSkucmVkdWNlKChhY2MsIHgpID0+IHtcbiAgICAgIGxldCBjb21waWxlciA9IHRoaXMuY29tcGlsZXJzQnlNaW1lVHlwZVt4XTtcbiAgICAgIGxldCBLbGFzcyA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihjb21waWxlcikuY29uc3RydWN0b3I7XG5cbiAgICAgIGxldCB2YWwgPSB7XG4gICAgICAgIG5hbWU6IEtsYXNzLm5hbWUsXG4gICAgICAgIGlucHV0TWltZVR5cGVzOiBLbGFzcy5nZXRJbnB1dE1pbWVUeXBlcygpLFxuICAgICAgICBjb21waWxlck9wdGlvbnM6IGNvbXBpbGVyLmNvbXBpbGVyT3B0aW9ucyxcbiAgICAgICAgY29tcGlsZXJWZXJzaW9uOiBjb21waWxlci5nZXRDb21waWxlclZlcnNpb24oKVxuICAgICAgfTtcblxuICAgICAgYWNjW3hdID0gdmFsO1xuICAgICAgcmV0dXJuIGFjYztcbiAgICB9LCB7fSk7XG5cbiAgICBsZXQgaW5mbyA9IHtcbiAgICAgIGZpbGVDaGFuZ2VDYWNoZTogdGhpcy5maWxlQ2hhbmdlQ2FjaGUuZ2V0U2F2ZWREYXRhKCksXG4gICAgICBjb21waWxlcnM6IHNlcmlhbGl6ZWRDb21waWxlck9wdHMsXG4gICAgICBtaW1lVHlwZXNUb1JlZ2lzdGVyOiB0aGlzLm1pbWVUeXBlc1RvUmVnaXN0ZXJcbiAgICB9O1xuXG4gICAgbGV0IHRhcmdldCA9IHBhdGguam9pbih0aGlzLnJvb3RDYWNoZURpciwgJ2NvbXBpbGVyLWluZm8uanNvbi5neicpO1xuICAgIGxldCBidWYgPSB6bGliLmd6aXBTeW5jKG5ldyBCdWZmZXIoSlNPTi5zdHJpbmdpZnkoaW5mbykpKTtcbiAgICBmcy53cml0ZUZpbGVTeW5jKHRhcmdldCwgYnVmKTtcbiAgfVxuXG4gIGNvbXBpbGVSZWFkT25seVN5bmMoZmlsZVBhdGgpIHtcbiAgICAvLyBXZSBndWFyYW50ZWUgdGhhdCBub2RlX21vZHVsZXMgYXJlIGFsd2F5cyBzaGlwcGVkIGRpcmVjdGx5XG4gICAgbGV0IHR5cGUgPSBtaW1lVHlwZXMubG9va3VwKGZpbGVQYXRoKTtcbiAgICBpZiAoRmlsZUNoYW5nZWRDYWNoZS5pc0luTm9kZU1vZHVsZXMoZmlsZVBhdGgpKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBtaW1lVHlwZTogdHlwZSB8fCAnYXBwbGljYXRpb24vamF2YXNjcmlwdCcsXG4gICAgICAgIGNvZGU6IGZzLnJlYWRGaWxlU3luYyhmaWxlUGF0aCwgJ3V0ZjgnKVxuICAgICAgfTtcbiAgICB9XG5cbiAgICBsZXQgaGFzaEluZm8gPSB0aGlzLmZpbGVDaGFuZ2VDYWNoZS5nZXRIYXNoRm9yUGF0aFN5bmMoZmlsZVBhdGgpO1xuXG4gICAgLy8gV2UgZ3VhcmFudGVlIHRoYXQgbm9kZV9tb2R1bGVzIGFyZSBhbHdheXMgc2hpcHBlZCBkaXJlY3RseVxuICAgIGlmIChoYXNoSW5mby5pc0luTm9kZU1vZHVsZXMpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG1pbWVUeXBlOiB0eXBlLFxuICAgICAgICBjb2RlOiBoYXNoSW5mby5zb3VyY2VDb2RlIHx8IGZzLnJlYWRGaWxlU3luYyhmaWxlUGF0aCwgJ3V0ZjgnKVxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBOQjogSGVyZSwgd2UncmUgYmFzaWNhbGx5IG9ubHkgdXNpbmcgdGhlIGNvbXBpbGVyIGhlcmUgdG8gZmluZFxuICAgIC8vIHRoZSBhcHByb3ByaWF0ZSBDb21waWxlQ2FjaGVcbiAgICBsZXQgY29tcGlsZXIgPSBDb21waWxlckhvc3Quc2hvdWxkUGFzc3Rocm91Z2goaGFzaEluZm8pID9cbiAgICAgIHRoaXMuZ2V0UGFzc3Rocm91Z2hDb21waWxlcigpIDpcbiAgICAgIHRoaXMuY29tcGlsZXJzQnlNaW1lVHlwZVt0eXBlIHx8ICdfX2xvbG5vdGhlcmUnXTtcblxuICAgIC8vIE5COiBXZSBkb24ndCBwdXQgdGhpcyBpbnRvIHNob3VsZFBhc3N0aHJvdWdoIGJlY2F1c2UgSW5saW5lIEhUTUxcbiAgICAvLyBjb21waWxlciBpcyB0ZWNobmljYWxseSBvZiB0eXBlIGZpbmFsRm9ybXMgKGkuZS4gYSBicm93c2VyIGNhblxuICAgIC8vIG5hdGl2ZWx5IGhhbmRsZSB0aGlzIGNvbnRlbnQpLCB5ZXQgaXRzIGNvbXBpbGVyIGlzXG4gICAgLy8gSW5saW5lSHRtbENvbXBpbGVyLiBIb3dldmVyLCB3ZSBzdGlsbCB3YW50IHRvIGNhdGNoIHN0YW5kYXJkIENTUyBmaWxlc1xuICAgIC8vIHdoaWNoIHdpbGwgYmUgcHJvY2Vzc2VkIGJ5IFBhc3N0aHJvdWdoQ29tcGlsZXIuXG4gICAgaWYgKGZpbmFsRm9ybXNbdHlwZV0gJiYgIWNvbXBpbGVyKSB7XG4gICAgICBjb21waWxlciA9IHRoaXMuZ2V0UGFzc3Rocm91Z2hDb21waWxlcigpO1xuICAgIH1cblxuICAgIGlmICghY29tcGlsZXIpIHtcbiAgICAgIGNvbXBpbGVyID0gdGhpcy5mYWxsYmFja0NvbXBpbGVyO1xuXG4gICAgICBsZXQgeyBjb2RlLCBiaW5hcnlEYXRhLCBtaW1lVHlwZSB9ID0gY29tcGlsZXIuZ2V0U3luYyhmaWxlUGF0aCk7XG4gICAgICByZXR1cm4geyBjb2RlOiBjb2RlIHx8IGJpbmFyeURhdGEsIG1pbWVUeXBlIH07XG4gICAgfVxuXG4gICAgbGV0IGNhY2hlID0gdGhpcy5jYWNoZXNGb3JDb21waWxlcnMuZ2V0KGNvbXBpbGVyKTtcbiAgICBsZXQge2NvZGUsIGJpbmFyeURhdGEsIG1pbWVUeXBlfSA9IGNhY2hlLmdldFN5bmMoZmlsZVBhdGgpO1xuXG4gICAgY29kZSA9IGNvZGUgfHwgYmluYXJ5RGF0YTtcbiAgICBpZiAoIWNvZGUgfHwgIW1pbWVUeXBlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEFza2VkIHRvIGNvbXBpbGUgJHtmaWxlUGF0aH0gaW4gcHJvZHVjdGlvbiwgaXMgdGhpcyBmaWxlIG5vdCBwcmVjb21waWxlZD9gKTtcbiAgICB9XG5cbiAgICByZXR1cm4geyBjb2RlLCBtaW1lVHlwZSB9O1xuICB9XG5cbiAgZnVsbENvbXBpbGVTeW5jKGZpbGVQYXRoKSB7XG4gICAgZChgQ29tcGlsaW5nICR7ZmlsZVBhdGh9YCk7XG5cbiAgICBsZXQgdHlwZSA9IG1pbWVUeXBlcy5sb29rdXAoZmlsZVBhdGgpO1xuXG4gICAgc2VuZCgnZWxlY3Ryb24tY29tcGlsZS1jb21waWxlZC1maWxlJywgeyBmaWxlUGF0aCwgbWltZVR5cGU6IHR5cGUgfSk7XG5cbiAgICBsZXQgaGFzaEluZm8gPSB0aGlzLmZpbGVDaGFuZ2VDYWNoZS5nZXRIYXNoRm9yUGF0aFN5bmMoZmlsZVBhdGgpO1xuXG4gICAgaWYgKGhhc2hJbmZvLmlzSW5Ob2RlTW9kdWxlcykge1xuICAgICAgbGV0IGNvZGUgPSBoYXNoSW5mby5zb3VyY2VDb2RlIHx8IGZzLnJlYWRGaWxlU3luYyhmaWxlUGF0aCwgJ3V0ZjgnKTtcbiAgICAgIGNvZGUgPSBDb21waWxlckhvc3QuZml4Tm9kZU1vZHVsZXNTb3VyY2VNYXBwaW5nU3luYyhjb2RlLCBmaWxlUGF0aCwgdGhpcy5maWxlQ2hhbmdlQ2FjaGUuYXBwUm9vdCk7XG4gICAgICByZXR1cm4geyBjb2RlLCBtaW1lVHlwZTogdHlwZSB9O1xuICAgIH1cblxuICAgIGxldCBjb21waWxlciA9IENvbXBpbGVySG9zdC5zaG91bGRQYXNzdGhyb3VnaChoYXNoSW5mbykgP1xuICAgICAgdGhpcy5nZXRQYXNzdGhyb3VnaENvbXBpbGVyKCkgOlxuICAgICAgdGhpcy5jb21waWxlcnNCeU1pbWVUeXBlW3R5cGUgfHwgJ19fbG9sbm90aGVyZSddO1xuXG4gICAgaWYgKCFjb21waWxlcikge1xuICAgICAgZChgRmFsbGluZyBiYWNrIHRvIHBhc3N0aHJvdWdoIGNvbXBpbGVyIGZvciAke2ZpbGVQYXRofWApO1xuICAgICAgY29tcGlsZXIgPSB0aGlzLmZhbGxiYWNrQ29tcGlsZXI7XG4gICAgfVxuXG4gICAgaWYgKCFjb21waWxlcikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZG4ndCBmaW5kIGEgY29tcGlsZXIgZm9yICR7ZmlsZVBhdGh9YCk7XG4gICAgfVxuXG4gICAgbGV0IGNhY2hlID0gdGhpcy5jYWNoZXNGb3JDb21waWxlcnMuZ2V0KGNvbXBpbGVyKTtcbiAgICByZXR1cm4gY2FjaGUuZ2V0T3JGZXRjaFN5bmMoXG4gICAgICBmaWxlUGF0aCxcbiAgICAgIChmaWxlUGF0aCwgaGFzaEluZm8pID0+IHRoaXMuY29tcGlsZVVuY2FjaGVkU3luYyhmaWxlUGF0aCwgaGFzaEluZm8sIGNvbXBpbGVyKSk7XG4gIH1cblxuICBjb21waWxlVW5jYWNoZWRTeW5jKGZpbGVQYXRoLCBoYXNoSW5mbywgY29tcGlsZXIpIHtcbiAgICBsZXQgaW5wdXRNaW1lVHlwZSA9IG1pbWVUeXBlcy5sb29rdXAoZmlsZVBhdGgpO1xuXG4gICAgaWYgKGhhc2hJbmZvLmlzRmlsZUJpbmFyeSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgYmluYXJ5RGF0YTogaGFzaEluZm8uYmluYXJ5RGF0YSB8fCBmcy5yZWFkRmlsZVN5bmMoZmlsZVBhdGgpLFxuICAgICAgICBtaW1lVHlwZTogaW5wdXRNaW1lVHlwZSxcbiAgICAgICAgZGVwZW5kZW50RmlsZXM6IFtdXG4gICAgICB9O1xuICAgIH1cblxuICAgIGxldCBjdHggPSB7fTtcbiAgICBsZXQgY29kZSA9IGhhc2hJbmZvLnNvdXJjZUNvZGUgfHwgZnMucmVhZEZpbGVTeW5jKGZpbGVQYXRoLCAndXRmOCcpO1xuXG4gICAgaWYgKCEoY29tcGlsZXIuc2hvdWxkQ29tcGlsZUZpbGVTeW5jKGNvZGUsIGN0eCkpKSB7XG4gICAgICBkKGBDb21waWxlciByZXR1cm5lZCBmYWxzZSBmb3Igc2hvdWxkQ29tcGlsZUZpbGU6ICR7ZmlsZVBhdGh9YCk7XG4gICAgICByZXR1cm4geyBjb2RlLCBtaW1lVHlwZTogbWltZVR5cGVzLmxvb2t1cChmaWxlUGF0aCksIGRlcGVuZGVudEZpbGVzOiBbXSB9O1xuICAgIH1cblxuICAgIGxldCBkZXBlbmRlbnRGaWxlcyA9IGNvbXBpbGVyLmRldGVybWluZURlcGVuZGVudEZpbGVzU3luYyhjb2RlLCBmaWxlUGF0aCwgY3R4KTtcblxuICAgIGxldCByZXN1bHQgPSBjb21waWxlci5jb21waWxlU3luYyhjb2RlLCBmaWxlUGF0aCwgY3R4KTtcblxuICAgIGxldCBzaG91bGRJbmxpbmVIdG1saWZ5ID1cbiAgICAgIGlucHV0TWltZVR5cGUgIT09ICd0ZXh0L2h0bWwnICYmXG4gICAgICByZXN1bHQubWltZVR5cGUgPT09ICd0ZXh0L2h0bWwnO1xuXG4gICAgbGV0IGlzUGFzc3Rocm91Z2ggPVxuICAgICAgcmVzdWx0Lm1pbWVUeXBlID09PSAndGV4dC9wbGFpbicgfHxcbiAgICAgICFyZXN1bHQubWltZVR5cGUgfHxcbiAgICAgIENvbXBpbGVySG9zdC5zaG91bGRQYXNzdGhyb3VnaChoYXNoSW5mbyk7XG5cbiAgICBpZiAoKGZpbmFsRm9ybXNbcmVzdWx0Lm1pbWVUeXBlXSAmJiAhc2hvdWxkSW5saW5lSHRtbGlmeSkgfHwgaXNQYXNzdGhyb3VnaCkge1xuICAgICAgLy8gR290IHNvbWV0aGluZyB3ZSBjYW4gdXNlIGluLWJyb3dzZXIsIGxldCdzIHJldHVybiBpdFxuICAgICAgcmV0dXJuIE9iamVjdC5hc3NpZ24ocmVzdWx0LCB7ZGVwZW5kZW50RmlsZXN9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgZChgUmVjdXJzaXZlbHkgY29tcGlsaW5nIHJlc3VsdCBvZiAke2ZpbGVQYXRofSB3aXRoIG5vbi1maW5hbCBNSU1FIHR5cGUgJHtyZXN1bHQubWltZVR5cGV9LCBpbnB1dCB3YXMgJHtpbnB1dE1pbWVUeXBlfWApO1xuXG4gICAgICBoYXNoSW5mbyA9IE9iamVjdC5hc3NpZ24oeyBzb3VyY2VDb2RlOiByZXN1bHQuY29kZSwgbWltZVR5cGU6IHJlc3VsdC5taW1lVHlwZSB9LCBoYXNoSW5mbyk7XG4gICAgICBjb21waWxlciA9IHRoaXMuY29tcGlsZXJzQnlNaW1lVHlwZVtyZXN1bHQubWltZVR5cGUgfHwgJ19fbG9sbm90aGVyZSddO1xuXG4gICAgICBpZiAoIWNvbXBpbGVyKSB7XG4gICAgICAgIGQoYFJlY3Vyc2l2ZSBjb21waWxlIGZhaWxlZCAtIGludGVybWVkaWF0ZSByZXN1bHQ6ICR7SlNPTi5zdHJpbmdpZnkocmVzdWx0KX1gKTtcblxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENvbXBpbGluZyAke2ZpbGVQYXRofSByZXN1bHRlZCBpbiBhIE1JTUUgdHlwZSBvZiAke3Jlc3VsdC5taW1lVHlwZX0sIHdoaWNoIHdlIGRvbid0IGtub3cgaG93IHRvIGhhbmRsZWApO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcy5jb21waWxlVW5jYWNoZWRTeW5jKFxuICAgICAgICBgJHtmaWxlUGF0aH0uJHttaW1lVHlwZXMuZXh0ZW5zaW9uKHJlc3VsdC5taW1lVHlwZSB8fCAndHh0Jyl9YCxcbiAgICAgICAgaGFzaEluZm8sIGNvbXBpbGVyKTtcbiAgICB9XG4gIH1cblxuICBjb21waWxlQWxsU3luYyhyb290RGlyZWN0b3J5LCBzaG91bGRDb21waWxlPW51bGwpIHtcbiAgICBsZXQgc2hvdWxkID0gc2hvdWxkQ29tcGlsZSB8fCBmdW5jdGlvbigpIHtyZXR1cm4gdHJ1ZTt9O1xuXG4gICAgZm9yQWxsRmlsZXNTeW5jKHJvb3REaXJlY3RvcnksIChmKSA9PiB7XG4gICAgICBpZiAoIXNob3VsZChmKSkgcmV0dXJuO1xuICAgICAgcmV0dXJuIHRoaXMuY29tcGlsZVN5bmMoZiwgdGhpcy5jb21waWxlcnNCeU1pbWVUeXBlKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qXG4gICAqIE90aGVyIHN0dWZmXG4gICAqL1xuXG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIHBhc3N0aHJvdWdoIGNvbXBpbGVyXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBnZXRQYXNzdGhyb3VnaENvbXBpbGVyKCkge1xuICAgIHJldHVybiB0aGlzLmNvbXBpbGVyc0J5TWltZVR5cGVbJ3RleHQvcGxhaW4nXTtcbiAgfVxuXG5cbiAgLyoqXG4gICAqIERldGVybWluZXMgd2hldGhlciB3ZSBzaG91bGQgZXZlbiB0cnkgdG8gY29tcGlsZSB0aGUgY29udGVudC4gTm90ZSB0aGF0IGluXG4gICAqIHNvbWUgY2FzZXMsIGNvbnRlbnQgd2lsbCBzdGlsbCBiZSBpbiBjYWNoZSBldmVuIGlmIHRoaXMgcmV0dXJucyB0cnVlLCBhbmRcbiAgICogaW4gb3RoZXIgY2FzZXMgKGlzSW5Ob2RlTW9kdWxlcyksIHdlJ2xsIGtub3cgZXhwbGljaXRseSB0byBub3QgZXZlbiBib3RoZXJcbiAgICogbG9va2luZyBpbiB0aGUgY2FjaGUuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBzdGF0aWMgc2hvdWxkUGFzc3Rocm91Z2goaGFzaEluZm8pIHtcbiAgICByZXR1cm4gaGFzaEluZm8uaXNNaW5pZmllZCB8fCBoYXNoSW5mby5pc0luTm9kZU1vZHVsZXMgfHwgaGFzaEluZm8uaGFzU291cmNlTWFwIHx8IGhhc2hJbmZvLmlzRmlsZUJpbmFyeTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb29rIGF0IHRoZSBjb2RlIG9mIGEgbm9kZSBtb2R1bGVzIGFuZCBzZWUgdGhlIHNvdXJjZU1hcHBpbmcgcGF0aC5cbiAgICogSWYgdGhlcmUgaXMgYW55LCBjaGVjayB0aGUgcGF0aCBhbmQgdHJ5IHRvIGZpeCBpdCB3aXRoIGFuZFxuICAgKiByb290IHJlbGF0aXZlIHBhdGguXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBzdGF0aWMgYXN5bmMgZml4Tm9kZU1vZHVsZXNTb3VyY2VNYXBwaW5nKHNvdXJjZUNvZGUsIHNvdXJjZVBhdGgsIGFwcFJvb3QpIHtcbiAgICBsZXQgcmVnZXhTb3VyY2VNYXBwaW5nID0gL1xcL1xcLyMuKnNvdXJjZU1hcHBpbmdVUkw9KD8hZGF0YTopKFteXCInXS4qKS9pO1xuICAgIGxldCBzb3VyY2VNYXBwaW5nQ2hlY2sgPSBzb3VyY2VDb2RlLm1hdGNoKHJlZ2V4U291cmNlTWFwcGluZyk7XG5cbiAgICBpZiAoc291cmNlTWFwcGluZ0NoZWNrICYmIHNvdXJjZU1hcHBpbmdDaGVja1sxXSAmJiBzb3VyY2VNYXBwaW5nQ2hlY2tbMV0gIT09ICcnKXtcbiAgICAgIGxldCBzb3VyY2VNYXBQYXRoID0gc291cmNlTWFwcGluZ0NoZWNrWzFdO1xuXG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBwZnMuc3RhdChzb3VyY2VNYXBQYXRoKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGxldCBub3JtUm9vdCA9IHBhdGgubm9ybWFsaXplKGFwcFJvb3QpO1xuICAgICAgICBsZXQgYWJzUGF0aFRvTW9kdWxlID0gcGF0aC5kaXJuYW1lKHNvdXJjZVBhdGgucmVwbGFjZShub3JtUm9vdCwgJycpLnN1YnN0cmluZygxKSk7XG4gICAgICAgIGxldCBuZXdNYXBQYXRoID0gcGF0aC5qb2luKGFic1BhdGhUb01vZHVsZSwgc291cmNlTWFwUGF0aCk7XG5cbiAgICAgICAgcmV0dXJuIHNvdXJjZUNvZGUucmVwbGFjZShyZWdleFNvdXJjZU1hcHBpbmcsIGAvLyMgc291cmNlTWFwcGluZ1VSTD0ke25ld01hcFBhdGh9YCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHNvdXJjZUNvZGU7XG4gIH1cblxuICAvKipcbiAgICogTG9vayBhdCB0aGUgY29kZSBvZiBhIG5vZGUgbW9kdWxlcyBhbmQgc2VlIHRoZSBzb3VyY2VNYXBwaW5nIHBhdGguXG4gICAqIElmIHRoZXJlIGlzIGFueSwgY2hlY2sgdGhlIHBhdGggYW5kIHRyeSB0byBmaXggaXQgd2l0aCBhbmRcbiAgICogcm9vdCByZWxhdGl2ZSBwYXRoLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgc3RhdGljIGZpeE5vZGVNb2R1bGVzU291cmNlTWFwcGluZ1N5bmMoc291cmNlQ29kZSwgc291cmNlUGF0aCwgYXBwUm9vdCkge1xuICAgIGxldCByZWdleFNvdXJjZU1hcHBpbmcgPSAvXFwvXFwvIy4qc291cmNlTWFwcGluZ1VSTD0oPyFkYXRhOikoW15cIiddLiopL2k7XG4gICAgbGV0IHNvdXJjZU1hcHBpbmdDaGVjayA9IHNvdXJjZUNvZGUubWF0Y2gocmVnZXhTb3VyY2VNYXBwaW5nKTtcblxuICAgIGlmIChzb3VyY2VNYXBwaW5nQ2hlY2sgJiYgc291cmNlTWFwcGluZ0NoZWNrWzFdICYmIHNvdXJjZU1hcHBpbmdDaGVja1sxXSAhPT0gJycpe1xuICAgICAgbGV0IHNvdXJjZU1hcFBhdGggPSBzb3VyY2VNYXBwaW5nQ2hlY2tbMV07XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGZzLnN0YXRTeW5jKHNvdXJjZU1hcFBhdGgpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgbGV0IG5vcm1Sb290ID0gcGF0aC5ub3JtYWxpemUoYXBwUm9vdCk7XG4gICAgICAgIGxldCBhYnNQYXRoVG9Nb2R1bGUgPSBwYXRoLmRpcm5hbWUoc291cmNlUGF0aC5yZXBsYWNlKG5vcm1Sb290LCAnJykuc3Vic3RyaW5nKDEpKTtcbiAgICAgICAgbGV0IG5ld01hcFBhdGggPSBwYXRoLmpvaW4oYWJzUGF0aFRvTW9kdWxlLCBzb3VyY2VNYXBQYXRoKTtcblxuICAgICAgICByZXR1cm4gc291cmNlQ29kZS5yZXBsYWNlKHJlZ2V4U291cmNlTWFwcGluZywgYC8vIyBzb3VyY2VNYXBwaW5nVVJMPSR7bmV3TWFwUGF0aH1gKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gc291cmNlQ29kZTtcbiAgfVxufVxuIl19