'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.rigHtmlDocumentToInitializeElectronCompile = rigHtmlDocumentToInitializeElectronCompile;
exports.addBypassChecker = addBypassChecker;
exports.initializeProtocolHook = initializeProtocolHook;

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _mimeTypes = require('@paulcbetts/mime-types');

var _mimeTypes2 = _interopRequireDefault(_mimeTypes);

var _lruCache = require('lru-cache');

var _lruCache2 = _interopRequireDefault(_lruCache);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const magicWords = "__magic__file__to__help__electron__compile.js";

// NB: These are duped in initialize-renderer so we can save startup time, make
// sure to run both!
const magicGlobalForRootCacheDir = '__electron_compile_root_cache_dir';
const magicGlobalForAppRootDir = '__electron_compile_app_root_dir';

const d = require('debug')('electron-compile:protocol-hook');

let protocol = null;

const mapStatCache = new _lruCache2.default({ length: 512 });
function doesMapFileExist(filePath) {
  let ret = mapStatCache.get(filePath);
  if (ret !== undefined) return Promise.resolve(ret);

  return new Promise(res => {
    _fs2.default.lstat(filePath, (err, s) => {
      let failed = err || !s;

      mapStatCache.set(filePath, !failed);
      res(!failed);
    });
  });
}

/**
 * Adds our script header to the top of all HTML files
 *
 * @private
 */
function rigHtmlDocumentToInitializeElectronCompile(doc) {
  let lines = doc.split("\n");
  let replacement = `<head><script src="${magicWords}"></script>`;
  let replacedHead = false;

  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].match(/<head>/i)) continue;

    lines[i] = lines[i].replace(/<head>/i, replacement);
    replacedHead = true;
    break;
  }

  if (!replacedHead) {
    replacement = `<html$1><head><script src="${magicWords}"></script></head>`;
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].match(/<html/i)) continue;

      lines[i] = lines[i].replace(/<html([^>]+)>/i, replacement);
      break;
    }
  }

  return lines.join("\n");
}

function requestFileJob(filePath, finish) {
  _fs2.default.readFile(filePath, (err, buf) => {
    if (err) {
      if (err.errno === 34) {
        finish(-6); // net::ERR_FILE_NOT_FOUND
        return;
      } else {
        finish(-2); // net::FAILED
        return;
      }
    }

    finish({
      data: buf,
      mimeType: _mimeTypes2.default.lookup(filePath) || 'text/plain'
    });
  });
}

const bypassCheckers = [];

/**
 * Adds a function that will be called on electron-compile's protocol hook
 * used to intercept file requests.  Use this to bypass electron-compile
 * entirely for certain URI's.
 * 
 * @param {Function} bypassChecker Function that will be called with the file path to determine whether to bypass or not
 */
function addBypassChecker(bypassChecker) {
  bypassCheckers.push(bypassChecker);
}

/**
 * Initializes the protocol hook on file: that allows us to intercept files
 * loaded by Chromium and rewrite them. This method along with
 * {@link registerRequireExtension} are the top-level methods that electron-compile
 * actually uses to intercept code that Electron loads.
 *
 * @param  {CompilerHost} compilerHost  The compiler host to use for compilation.
 */
function initializeProtocolHook(compilerHost) {
  protocol = protocol || require('electron').protocol;

  global[magicGlobalForRootCacheDir] = compilerHost.rootCacheDir;
  global[magicGlobalForAppRootDir] = compilerHost.appRoot;

  const electronCompileSetupCode = `if (window.require) require('electron-compile/lib/initialize-renderer').initializeRendererProcess(${compilerHost.readOnlyMode});`;

  protocol.interceptBufferProtocol('file', (() => {
    var _ref = _asyncToGenerator(function* (request, finish) {
      let uri = _url2.default.parse(request.url);

      d(`Intercepting url ${request.url}`);
      if (request.url.indexOf(magicWords) > -1) {
        finish({
          mimeType: 'application/javascript',
          data: new Buffer(electronCompileSetupCode, 'utf8')
        });

        return;
      }

      // This is a protocol-relative URL that has gone pear-shaped in Electron,
      // let's rewrite it
      if (uri.host && uri.host.length > 1) {
        //let newUri = request.url.replace(/^file:/, "https:");
        // TODO: Jump off this bridge later
        d(`TODO: Found bogus protocol-relative URL, can't fix it up!!`);
        finish(-2);
        return;
      }

      let filePath = decodeURIComponent(uri.pathname);

      // NB: pathname has a leading '/' on Win32 for some reason
      if (process.platform === 'win32') {
        filePath = filePath.slice(1);
      }

      // NB: Special-case files coming from atom.asar or node_modules
      if (filePath.match(/[\/\\](atom|electron).asar/) || filePath.match(/[\/\\](node_modules|bower_components)/)) {
        // NBs on NBs: If we're loading an HTML file from node_modules, we still have
        // to do the HTML document rigging
        if (filePath.match(/\.html?$/i)) {
          let riggedContents = null;
          _fs2.default.readFile(filePath, 'utf8', function (err, contents) {
            if (err) {
              if (err.errno === 34) {
                finish(-6); // net::ERR_FILE_NOT_FOUND
                return;
              } else {
                finish(-2); // net::FAILED
                return;
              }
            }

            riggedContents = rigHtmlDocumentToInitializeElectronCompile(contents);
            finish({ data: new Buffer(riggedContents), mimeType: 'text/html' });
            return;
          });

          return;
        }

        requestFileJob(filePath, finish);
        return;
      }

      // NB: Chromium will somehow decide that external source map references
      // aren't relative to the file that was loaded for node.js modules, but
      // relative to the HTML file. Since we can't really figure out what the
      // real path is, we just need to squelch it.
      if (filePath.match(/\.map$/i) && !(yield doesMapFileExist(filePath))) {
        finish({ data: new Buffer("", 'utf8'), mimeType: 'text/plain' });
        return;
      }

      for (const bypassChecker of bypassCheckers) {
        if (bypassChecker(filePath)) {
          d('bypassing compilers for:', filePath);
          requestFileJob(filePath, finish);
          return;
        }
      }

      try {
        let result = yield compilerHost.compile(filePath);

        if (result.mimeType === 'text/html') {
          result.code = rigHtmlDocumentToInitializeElectronCompile(result.code);
        }

        if (result.binaryData || result.code instanceof Buffer) {
          finish({ data: result.binaryData || result.code, mimeType: result.mimeType });
          return;
        } else {
          finish({ data: new Buffer(result.code), mimeType: result.mimeType });
          return;
        }
      } catch (e) {
        let err = `Failed to compile ${filePath}: ${e.message}\n${e.stack}`;
        d(err);

        if (e.errno === 34 /*ENOENT*/) {
            finish(-6); // net::ERR_FILE_NOT_FOUND
            return;
          }

        finish({ mimeType: 'text/plain', data: new Buffer(err) });
        return;
      }
    });

    return function (_x, _x2) {
      return _ref.apply(this, arguments);
    };
  })());
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9wcm90b2NvbC1ob29rLmpzIl0sIm5hbWVzIjpbInJpZ0h0bWxEb2N1bWVudFRvSW5pdGlhbGl6ZUVsZWN0cm9uQ29tcGlsZSIsImFkZEJ5cGFzc0NoZWNrZXIiLCJpbml0aWFsaXplUHJvdG9jb2xIb29rIiwibWFnaWNXb3JkcyIsIm1hZ2ljR2xvYmFsRm9yUm9vdENhY2hlRGlyIiwibWFnaWNHbG9iYWxGb3JBcHBSb290RGlyIiwiZCIsInJlcXVpcmUiLCJwcm90b2NvbCIsIm1hcFN0YXRDYWNoZSIsImxlbmd0aCIsImRvZXNNYXBGaWxlRXhpc3QiLCJmaWxlUGF0aCIsInJldCIsImdldCIsInVuZGVmaW5lZCIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVzIiwibHN0YXQiLCJlcnIiLCJzIiwiZmFpbGVkIiwic2V0IiwiZG9jIiwibGluZXMiLCJzcGxpdCIsInJlcGxhY2VtZW50IiwicmVwbGFjZWRIZWFkIiwiaSIsIm1hdGNoIiwicmVwbGFjZSIsImpvaW4iLCJyZXF1ZXN0RmlsZUpvYiIsImZpbmlzaCIsInJlYWRGaWxlIiwiYnVmIiwiZXJybm8iLCJkYXRhIiwibWltZVR5cGUiLCJsb29rdXAiLCJieXBhc3NDaGVja2VycyIsImJ5cGFzc0NoZWNrZXIiLCJwdXNoIiwiY29tcGlsZXJIb3N0IiwiZ2xvYmFsIiwicm9vdENhY2hlRGlyIiwiYXBwUm9vdCIsImVsZWN0cm9uQ29tcGlsZVNldHVwQ29kZSIsInJlYWRPbmx5TW9kZSIsImludGVyY2VwdEJ1ZmZlclByb3RvY29sIiwicmVxdWVzdCIsInVyaSIsInBhcnNlIiwidXJsIiwiaW5kZXhPZiIsIkJ1ZmZlciIsImhvc3QiLCJkZWNvZGVVUklDb21wb25lbnQiLCJwYXRobmFtZSIsInByb2Nlc3MiLCJwbGF0Zm9ybSIsInNsaWNlIiwicmlnZ2VkQ29udGVudHMiLCJjb250ZW50cyIsInJlc3VsdCIsImNvbXBpbGUiLCJjb2RlIiwiYmluYXJ5RGF0YSIsImUiLCJtZXNzYWdlIiwic3RhY2si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anMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgdXJsIGZyb20gJ3VybCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IG1pbWUgZnJvbSAnQHBhdWxjYmV0dHMvbWltZS10eXBlcyc7XG5pbXBvcnQgTFJVIGZyb20gJ2xydS1jYWNoZSc7XG5cbmNvbnN0IG1hZ2ljV29yZHMgPSBcIl9fbWFnaWNfX2ZpbGVfX3RvX19oZWxwX19lbGVjdHJvbl9fY29tcGlsZS5qc1wiO1xuXG4vLyBOQjogVGhlc2UgYXJlIGR1cGVkIGluIGluaXRpYWxpemUtcmVuZGVyZXIgc28gd2UgY2FuIHNhdmUgc3RhcnR1cCB0aW1lLCBtYWtlXG4vLyBzdXJlIHRvIHJ1biBib3RoIVxuY29uc3QgbWFnaWNHbG9iYWxGb3JSb290Q2FjaGVEaXIgPSAnX19lbGVjdHJvbl9jb21waWxlX3Jvb3RfY2FjaGVfZGlyJztcbmNvbnN0IG1hZ2ljR2xvYmFsRm9yQXBwUm9vdERpciA9ICdfX2VsZWN0cm9uX2NvbXBpbGVfYXBwX3Jvb3RfZGlyJztcblxuY29uc3QgZCA9IHJlcXVpcmUoJ2RlYnVnJykoJ2VsZWN0cm9uLWNvbXBpbGU6cHJvdG9jb2wtaG9vaycpO1xuXG5sZXQgcHJvdG9jb2wgPSBudWxsO1xuXG5jb25zdCBtYXBTdGF0Q2FjaGUgPSBuZXcgTFJVKHtsZW5ndGg6IDUxMn0pO1xuZnVuY3Rpb24gZG9lc01hcEZpbGVFeGlzdChmaWxlUGF0aCkge1xuICBsZXQgcmV0ID0gbWFwU3RhdENhY2hlLmdldChmaWxlUGF0aCk7XG4gIGlmIChyZXQgIT09IHVuZGVmaW5lZCkgcmV0dXJuIFByb21pc2UucmVzb2x2ZShyZXQpO1xuXG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzKSA9PiB7XG4gICAgZnMubHN0YXQoZmlsZVBhdGgsIChlcnIsIHMpID0+IHtcbiAgICAgIGxldCBmYWlsZWQgPSAoZXJyIHx8ICFzKTtcblxuICAgICAgbWFwU3RhdENhY2hlLnNldChmaWxlUGF0aCwgIWZhaWxlZCk7XG4gICAgICByZXMoIWZhaWxlZCk7XG4gICAgfSk7XG4gIH0pO1xufVxuXG4vKipcbiAqIEFkZHMgb3VyIHNjcmlwdCBoZWFkZXIgdG8gdGhlIHRvcCBvZiBhbGwgSFRNTCBmaWxlc1xuICpcbiAqIEBwcml2YXRlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByaWdIdG1sRG9jdW1lbnRUb0luaXRpYWxpemVFbGVjdHJvbkNvbXBpbGUoZG9jKSB7XG4gIGxldCBsaW5lcyA9IGRvYy5zcGxpdChcIlxcblwiKTtcbiAgbGV0IHJlcGxhY2VtZW50ID0gYDxoZWFkPjxzY3JpcHQgc3JjPVwiJHttYWdpY1dvcmRzfVwiPjwvc2NyaXB0PmA7XG4gIGxldCByZXBsYWNlZEhlYWQgPSBmYWxzZTtcblxuICBmb3IgKGxldCBpPTA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xuICAgIGlmICghbGluZXNbaV0ubWF0Y2goLzxoZWFkPi9pKSkgY29udGludWU7XG5cbiAgICBsaW5lc1tpXSA9IChsaW5lc1tpXSkucmVwbGFjZSgvPGhlYWQ+L2ksIHJlcGxhY2VtZW50KTtcbiAgICByZXBsYWNlZEhlYWQgPSB0cnVlO1xuICAgIGJyZWFrO1xuICB9XG5cbiAgaWYgKCFyZXBsYWNlZEhlYWQpIHtcbiAgICByZXBsYWNlbWVudCA9IGA8aHRtbCQxPjxoZWFkPjxzY3JpcHQgc3JjPVwiJHttYWdpY1dvcmRzfVwiPjwvc2NyaXB0PjwvaGVhZD5gO1xuICAgIGZvciAobGV0IGk9MDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoIWxpbmVzW2ldLm1hdGNoKC88aHRtbC9pKSkgY29udGludWU7XG5cbiAgICAgIGxpbmVzW2ldID0gKGxpbmVzW2ldKS5yZXBsYWNlKC88aHRtbChbXj5dKyk+L2ksIHJlcGxhY2VtZW50KTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBsaW5lcy5qb2luKFwiXFxuXCIpO1xufVxuXG5mdW5jdGlvbiByZXF1ZXN0RmlsZUpvYihmaWxlUGF0aCwgZmluaXNoKSB7XG4gIGZzLnJlYWRGaWxlKGZpbGVQYXRoLCAoZXJyLCBidWYpID0+IHtcbiAgICBpZiAoZXJyKSB7XG4gICAgICBpZiAoZXJyLmVycm5vID09PSAzNCkge1xuICAgICAgICBmaW5pc2goLTYpOyAvLyBuZXQ6OkVSUl9GSUxFX05PVF9GT1VORFxuICAgICAgICByZXR1cm47XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmaW5pc2goLTIpOyAvLyBuZXQ6OkZBSUxFRFxuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuXG4gICAgZmluaXNoKHtcbiAgICAgIGRhdGE6IGJ1ZixcbiAgICAgIG1pbWVUeXBlOiBtaW1lLmxvb2t1cChmaWxlUGF0aCkgfHwgJ3RleHQvcGxhaW4nXG4gICAgfSk7XG4gIH0pO1xufVxuXG5jb25zdCBieXBhc3NDaGVja2VycyA9IFtdO1xuXG4vKipcbiAqIEFkZHMgYSBmdW5jdGlvbiB0aGF0IHdpbGwgYmUgY2FsbGVkIG9uIGVsZWN0cm9uLWNvbXBpbGUncyBwcm90b2NvbCBob29rXG4gKiB1c2VkIHRvIGludGVyY2VwdCBmaWxlIHJlcXVlc3RzLiAgVXNlIHRoaXMgdG8gYnlwYXNzIGVsZWN0cm9uLWNvbXBpbGVcbiAqIGVudGlyZWx5IGZvciBjZXJ0YWluIFVSSSdzLlxuICogXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBieXBhc3NDaGVja2VyIEZ1bmN0aW9uIHRoYXQgd2lsbCBiZSBjYWxsZWQgd2l0aCB0aGUgZmlsZSBwYXRoIHRvIGRldGVybWluZSB3aGV0aGVyIHRvIGJ5cGFzcyBvciBub3RcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFkZEJ5cGFzc0NoZWNrZXIoYnlwYXNzQ2hlY2tlcikge1xuICBieXBhc3NDaGVja2Vycy5wdXNoKGJ5cGFzc0NoZWNrZXIpO1xufVxuXG4vKipcbiAqIEluaXRpYWxpemVzIHRoZSBwcm90b2NvbCBob29rIG9uIGZpbGU6IHRoYXQgYWxsb3dzIHVzIHRvIGludGVyY2VwdCBmaWxlc1xuICogbG9hZGVkIGJ5IENocm9taXVtIGFuZCByZXdyaXRlIHRoZW0uIFRoaXMgbWV0aG9kIGFsb25nIHdpdGhcbiAqIHtAbGluayByZWdpc3RlclJlcXVpcmVFeHRlbnNpb259IGFyZSB0aGUgdG9wLWxldmVsIG1ldGhvZHMgdGhhdCBlbGVjdHJvbi1jb21waWxlXG4gKiBhY3R1YWxseSB1c2VzIHRvIGludGVyY2VwdCBjb2RlIHRoYXQgRWxlY3Ryb24gbG9hZHMuXG4gKlxuICogQHBhcmFtICB7Q29tcGlsZXJIb3N0fSBjb21waWxlckhvc3QgIFRoZSBjb21waWxlciBob3N0IHRvIHVzZSBmb3IgY29tcGlsYXRpb24uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbml0aWFsaXplUHJvdG9jb2xIb29rKGNvbXBpbGVySG9zdCkge1xuICBwcm90b2NvbCA9IHByb3RvY29sIHx8IHJlcXVpcmUoJ2VsZWN0cm9uJykucHJvdG9jb2w7XG5cbiAgZ2xvYmFsW21hZ2ljR2xvYmFsRm9yUm9vdENhY2hlRGlyXSA9IGNvbXBpbGVySG9zdC5yb290Q2FjaGVEaXI7XG4gIGdsb2JhbFttYWdpY0dsb2JhbEZvckFwcFJvb3REaXJdID0gY29tcGlsZXJIb3N0LmFwcFJvb3Q7XG5cbiAgY29uc3QgZWxlY3Ryb25Db21waWxlU2V0dXBDb2RlID0gYGlmICh3aW5kb3cucmVxdWlyZSkgcmVxdWlyZSgnZWxlY3Ryb24tY29tcGlsZS9saWIvaW5pdGlhbGl6ZS1yZW5kZXJlcicpLmluaXRpYWxpemVSZW5kZXJlclByb2Nlc3MoJHtjb21waWxlckhvc3QucmVhZE9ubHlNb2RlfSk7YDtcblxuICBwcm90b2NvbC5pbnRlcmNlcHRCdWZmZXJQcm90b2NvbCgnZmlsZScsIGFzeW5jIGZ1bmN0aW9uKHJlcXVlc3QsIGZpbmlzaCkge1xuICAgIGxldCB1cmkgPSB1cmwucGFyc2UocmVxdWVzdC51cmwpO1xuXG4gICAgZChgSW50ZXJjZXB0aW5nIHVybCAke3JlcXVlc3QudXJsfWApO1xuICAgIGlmIChyZXF1ZXN0LnVybC5pbmRleE9mKG1hZ2ljV29yZHMpID4gLTEpIHtcbiAgICAgIGZpbmlzaCh7XG4gICAgICAgIG1pbWVUeXBlOiAnYXBwbGljYXRpb24vamF2YXNjcmlwdCcsXG4gICAgICAgIGRhdGE6IG5ldyBCdWZmZXIoZWxlY3Ryb25Db21waWxlU2V0dXBDb2RlLCAndXRmOCcpXG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIFRoaXMgaXMgYSBwcm90b2NvbC1yZWxhdGl2ZSBVUkwgdGhhdCBoYXMgZ29uZSBwZWFyLXNoYXBlZCBpbiBFbGVjdHJvbixcbiAgICAvLyBsZXQncyByZXdyaXRlIGl0XG4gICAgaWYgKHVyaS5ob3N0ICYmIHVyaS5ob3N0Lmxlbmd0aCA+IDEpIHtcbiAgICAgIC8vbGV0IG5ld1VyaSA9IHJlcXVlc3QudXJsLnJlcGxhY2UoL15maWxlOi8sIFwiaHR0cHM6XCIpO1xuICAgICAgLy8gVE9ETzogSnVtcCBvZmYgdGhpcyBicmlkZ2UgbGF0ZXJcbiAgICAgIGQoYFRPRE86IEZvdW5kIGJvZ3VzIHByb3RvY29sLXJlbGF0aXZlIFVSTCwgY2FuJ3QgZml4IGl0IHVwISFgKTtcbiAgICAgIGZpbmlzaCgtMik7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbGV0IGZpbGVQYXRoID0gZGVjb2RlVVJJQ29tcG9uZW50KHVyaS5wYXRobmFtZSk7XG5cbiAgICAvLyBOQjogcGF0aG5hbWUgaGFzIGEgbGVhZGluZyAnLycgb24gV2luMzIgZm9yIHNvbWUgcmVhc29uXG4gICAgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW4zMicpIHtcbiAgICAgIGZpbGVQYXRoID0gZmlsZVBhdGguc2xpY2UoMSk7XG4gICAgfVxuXG4gICAgLy8gTkI6IFNwZWNpYWwtY2FzZSBmaWxlcyBjb21pbmcgZnJvbSBhdG9tLmFzYXIgb3Igbm9kZV9tb2R1bGVzXG4gICAgaWYgKGZpbGVQYXRoLm1hdGNoKC9bXFwvXFxcXF0oYXRvbXxlbGVjdHJvbikuYXNhci8pIHx8IGZpbGVQYXRoLm1hdGNoKC9bXFwvXFxcXF0obm9kZV9tb2R1bGVzfGJvd2VyX2NvbXBvbmVudHMpLykpIHtcbiAgICAgIC8vIE5CcyBvbiBOQnM6IElmIHdlJ3JlIGxvYWRpbmcgYW4gSFRNTCBmaWxlIGZyb20gbm9kZV9tb2R1bGVzLCB3ZSBzdGlsbCBoYXZlXG4gICAgICAvLyB0byBkbyB0aGUgSFRNTCBkb2N1bWVudCByaWdnaW5nXG4gICAgICBpZiAoZmlsZVBhdGgubWF0Y2goL1xcLmh0bWw/JC9pKSkge1xuICAgICAgICBsZXQgcmlnZ2VkQ29udGVudHMgPSBudWxsO1xuICAgICAgICBmcy5yZWFkRmlsZShmaWxlUGF0aCwgJ3V0ZjgnLCAoZXJyLCBjb250ZW50cykgPT4ge1xuICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgIGlmIChlcnIuZXJybm8gPT09IDM0KSB7XG4gICAgICAgICAgICAgIGZpbmlzaCgtNik7IC8vIG5ldDo6RVJSX0ZJTEVfTk9UX0ZPVU5EXG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGZpbmlzaCgtMik7IC8vIG5ldDo6RkFJTEVEXG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICByaWdnZWRDb250ZW50cyA9IHJpZ0h0bWxEb2N1bWVudFRvSW5pdGlhbGl6ZUVsZWN0cm9uQ29tcGlsZShjb250ZW50cyk7XG4gICAgICAgICAgZmluaXNoKHsgZGF0YTogbmV3IEJ1ZmZlcihyaWdnZWRDb250ZW50cyksIG1pbWVUeXBlOiAndGV4dC9odG1sJyB9KTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgcmVxdWVzdEZpbGVKb2IoZmlsZVBhdGgsIGZpbmlzaCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gTkI6IENocm9taXVtIHdpbGwgc29tZWhvdyBkZWNpZGUgdGhhdCBleHRlcm5hbCBzb3VyY2UgbWFwIHJlZmVyZW5jZXNcbiAgICAvLyBhcmVuJ3QgcmVsYXRpdmUgdG8gdGhlIGZpbGUgdGhhdCB3YXMgbG9hZGVkIGZvciBub2RlLmpzIG1vZHVsZXMsIGJ1dFxuICAgIC8vIHJlbGF0aXZlIHRvIHRoZSBIVE1MIGZpbGUuIFNpbmNlIHdlIGNhbid0IHJlYWxseSBmaWd1cmUgb3V0IHdoYXQgdGhlXG4gICAgLy8gcmVhbCBwYXRoIGlzLCB3ZSBqdXN0IG5lZWQgdG8gc3F1ZWxjaCBpdC5cbiAgICBpZiAoZmlsZVBhdGgubWF0Y2goL1xcLm1hcCQvaSkgJiYgIShhd2FpdCBkb2VzTWFwRmlsZUV4aXN0KGZpbGVQYXRoKSkpIHtcbiAgICAgIGZpbmlzaCh7IGRhdGE6IG5ldyBCdWZmZXIoXCJcIiwgJ3V0ZjgnKSwgbWltZVR5cGU6ICd0ZXh0L3BsYWluJyB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IGJ5cGFzc0NoZWNrZXIgb2YgYnlwYXNzQ2hlY2tlcnMpIHtcbiAgICAgIGlmIChieXBhc3NDaGVja2VyKGZpbGVQYXRoKSkge1xuICAgICAgICBkKCdieXBhc3NpbmcgY29tcGlsZXJzIGZvcjonLCBmaWxlUGF0aCk7XG4gICAgICAgIHJlcXVlc3RGaWxlSm9iKGZpbGVQYXRoLCBmaW5pc2gpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIGxldCByZXN1bHQgPSBhd2FpdCBjb21waWxlckhvc3QuY29tcGlsZShmaWxlUGF0aCk7XG5cbiAgICAgIGlmIChyZXN1bHQubWltZVR5cGUgPT09ICd0ZXh0L2h0bWwnKSB7XG4gICAgICAgIHJlc3VsdC5jb2RlID0gcmlnSHRtbERvY3VtZW50VG9Jbml0aWFsaXplRWxlY3Ryb25Db21waWxlKHJlc3VsdC5jb2RlKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHJlc3VsdC5iaW5hcnlEYXRhIHx8IHJlc3VsdC5jb2RlIGluc3RhbmNlb2YgQnVmZmVyKSB7XG4gICAgICAgIGZpbmlzaCh7IGRhdGE6IHJlc3VsdC5iaW5hcnlEYXRhIHx8IHJlc3VsdC5jb2RlLCBtaW1lVHlwZTogcmVzdWx0Lm1pbWVUeXBlIH0pO1xuICAgICAgICByZXR1cm47XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmaW5pc2goeyBkYXRhOiBuZXcgQnVmZmVyKHJlc3VsdC5jb2RlKSwgbWltZVR5cGU6IHJlc3VsdC5taW1lVHlwZSB9KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGxldCBlcnIgPSBgRmFpbGVkIHRvIGNvbXBpbGUgJHtmaWxlUGF0aH06ICR7ZS5tZXNzYWdlfVxcbiR7ZS5zdGFja31gO1xuICAgICAgZChlcnIpO1xuXG4gICAgICBpZiAoZS5lcnJubyA9PT0gMzQgLypFTk9FTlQqLykge1xuICAgICAgICBmaW5pc2goLTYpOyAvLyBuZXQ6OkVSUl9GSUxFX05PVF9GT1VORFxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGZpbmlzaCh7IG1pbWVUeXBlOiAndGV4dC9wbGFpbicsIGRhdGE6IG5ldyBCdWZmZXIoZXJyKSB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH0pO1xufVxuIl19