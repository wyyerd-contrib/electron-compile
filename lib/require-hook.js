'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = registerRequireExtension;

var _mimeTypes = require('@paulcbetts/mime-types');

var _mimeTypes2 = _interopRequireDefault(_mimeTypes);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

let HMR = false;

const d = require('debug')('electron-compile:require-hook');
let electron = null;

if (process.type === 'renderer') {
  window.__hot = [];
  electron = require('electron');
  HMR = electron.remote.getGlobal('__electron_compile_hmr_enabled__');

  if (HMR) {
    electron.ipcRenderer.on('__electron-compile__HMR', () => {
      d("Got HMR signal!");

      // Reset the module cache
      let cache = require('module')._cache;
      let toEject = Object.keys(cache).filter(x => x && !x.match(/[\\\/](node_modules|.*\.asar)[\\\/]/i));
      toEject.forEach(x => {
        d(`Removing node module entry for ${x}`);
        delete cache[x];
      });

      window.__hot.forEach(fn => fn());
    });
  }
}

/**
 * Initializes the node.js hook that allows us to intercept files loaded by
 * node.js and rewrite them. This method along with {@link initializeProtocolHook}
 * are the top-level methods that electron-compile actually uses to intercept
 * code that Electron loads.
 *
 * @param  {CompilerHost} compilerHost  The compiler host to use for compilation.
 */
function registerRequireExtension(compilerHost, isProduction) {
  if (HMR) {
    try {
      require('module').prototype.hot = {
        accept: cb => window.__hot.push(cb)
      };

      require.main.require('react-hot-loader/patch');
    } catch (e) {
      console.error(`Couldn't require react-hot-loader/patch, you need to add react-hot-loader@3 as a dependency! ${e.message}`);
    }
  }

  let mimeTypeList = isProduction ? Object.keys(compilerHost.mimeTypesToRegister) : Object.keys(compilerHost.compilersByMimeType);

  mimeTypeList.forEach(mimeType => {
    let ext = _mimeTypes2.default.extension(mimeType);

    require.extensions[`.${ext}`] = (module, filename) => {
      var _compilerHost$compile = compilerHost.compileSync(filename);

      let code = _compilerHost$compile.code;


      if (code === null) {
        console.error(`null code returned for "${filename}".  Please raise an issue on 'electron-compile' with the contents of this file.`);
      }

      module._compile(code, filename);
    };
  });
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9yZXF1aXJlLWhvb2suanMiXSwibmFtZXMiOlsicmVnaXN0ZXJSZXF1aXJlRXh0ZW5zaW9uIiwiSE1SIiwiZCIsInJlcXVpcmUiLCJlbGVjdHJvbiIsInByb2Nlc3MiLCJ0eXBlIiwid2luZG93IiwiX19ob3QiLCJyZW1vdGUiLCJnZXRHbG9iYWwiLCJpcGNSZW5kZXJlciIsIm9uIiwiY2FjaGUiLCJfY2FjaGUiLCJ0b0VqZWN0IiwiT2JqZWN0Iiwia2V5cyIsImZpbHRlciIsIngiLCJtYXRjaCIsImZvckVhY2giLCJmbiIsImNvbXBpbGVySG9zdCIsImlzUHJvZHVjdGlvbiIsInByb3RvdHlwZSIsImhvdCIsImFjY2VwdCIsImNiIiwicHVzaCIsIm1haW4iLCJlIiwiY29uc29sZSIsImVycm9yIiwibWVzc2FnZSIsIm1pbWVUeXBlTGlzdCIsIm1pbWVUeXBlc1RvUmVnaXN0ZXIiLCJjb21waWxlcnNCeU1pbWVUeXBlIiwibWltZVR5cGUiLCJleHQiLCJleHRlbnNpb24iLCJleHRlbnNpb25zIiwibW9kdWxlIiwiZmlsZW5hbWUiLCJjb21waWxlU3luYyIsImNvZGUiLCJfY29tcGlsZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7a0JBcUN3QkEsd0I7O0FBckN4Qjs7Ozs7O0FBRUEsSUFBSUMsTUFBTSxLQUFWOztBQUVBLE1BQU1DLElBQUlDLFFBQVEsT0FBUixFQUFpQiwrQkFBakIsQ0FBVjtBQUNBLElBQUlDLFdBQVcsSUFBZjs7QUFFQSxJQUFJQyxRQUFRQyxJQUFSLEtBQWlCLFVBQXJCLEVBQWlDO0FBQy9CQyxTQUFPQyxLQUFQLEdBQWUsRUFBZjtBQUNBSixhQUFXRCxRQUFRLFVBQVIsQ0FBWDtBQUNBRixRQUFNRyxTQUFTSyxNQUFULENBQWdCQyxTQUFoQixDQUEwQixrQ0FBMUIsQ0FBTjs7QUFFQSxNQUFJVCxHQUFKLEVBQVM7QUFDUEcsYUFBU08sV0FBVCxDQUFxQkMsRUFBckIsQ0FBd0IseUJBQXhCLEVBQW1ELE1BQU07QUFDdkRWLFFBQUUsaUJBQUY7O0FBRUE7QUFDQSxVQUFJVyxRQUFRVixRQUFRLFFBQVIsRUFBa0JXLE1BQTlCO0FBQ0EsVUFBSUMsVUFBVUMsT0FBT0MsSUFBUCxDQUFZSixLQUFaLEVBQW1CSyxNQUFuQixDQUEwQkMsS0FBS0EsS0FBSyxDQUFDQSxFQUFFQyxLQUFGLENBQVEsc0NBQVIsQ0FBckMsQ0FBZDtBQUNBTCxjQUFRTSxPQUFSLENBQWdCRixLQUFLO0FBQ25CakIsVUFBRyxrQ0FBaUNpQixDQUFFLEVBQXRDO0FBQ0EsZUFBT04sTUFBTU0sQ0FBTixDQUFQO0FBQ0QsT0FIRDs7QUFLQVosYUFBT0MsS0FBUCxDQUFhYSxPQUFiLENBQXFCQyxNQUFNQSxJQUEzQjtBQUNELEtBWkQ7QUFhRDtBQUNGOztBQUVEOzs7Ozs7OztBQVFlLFNBQVN0Qix3QkFBVCxDQUFrQ3VCLFlBQWxDLEVBQWdEQyxZQUFoRCxFQUE4RDtBQUMzRSxNQUFJdkIsR0FBSixFQUFTO0FBQ1AsUUFBSTtBQUNGRSxjQUFRLFFBQVIsRUFBa0JzQixTQUFsQixDQUE0QkMsR0FBNUIsR0FBa0M7QUFDaENDLGdCQUFTQyxFQUFELElBQVFyQixPQUFPQyxLQUFQLENBQWFxQixJQUFiLENBQWtCRCxFQUFsQjtBQURnQixPQUFsQzs7QUFJQXpCLGNBQVEyQixJQUFSLENBQWEzQixPQUFiLENBQXFCLHdCQUFyQjtBQUNELEtBTkQsQ0FNRSxPQUFPNEIsQ0FBUCxFQUFVO0FBQ1ZDLGNBQVFDLEtBQVIsQ0FBZSxnR0FBK0ZGLEVBQUVHLE9BQVEsRUFBeEg7QUFDRDtBQUNGOztBQUVELE1BQUlDLGVBQWVYLGVBQ2pCUixPQUFPQyxJQUFQLENBQVlNLGFBQWFhLG1CQUF6QixDQURpQixHQUVqQnBCLE9BQU9DLElBQVAsQ0FBWU0sYUFBYWMsbUJBQXpCLENBRkY7O0FBSUFGLGVBQWFkLE9BQWIsQ0FBc0JpQixRQUFELElBQWM7QUFDakMsUUFBSUMsTUFBTSxvQkFBVUMsU0FBVixDQUFvQkYsUUFBcEIsQ0FBVjs7QUFFQW5DLFlBQVFzQyxVQUFSLENBQW9CLElBQUdGLEdBQUksRUFBM0IsSUFBZ0MsQ0FBQ0csTUFBRCxFQUFTQyxRQUFULEtBQXNCO0FBQUEsa0NBQ3ZDcEIsYUFBYXFCLFdBQWIsQ0FBeUJELFFBQXpCLENBRHVDOztBQUFBLFVBQy9DRSxJQUQrQyx5QkFDL0NBLElBRCtDOzs7QUFHcEQsVUFBSUEsU0FBUyxJQUFiLEVBQW1CO0FBQ2pCYixnQkFBUUMsS0FBUixDQUFlLDJCQUEwQlUsUUFBUyxpRkFBbEQ7QUFDRDs7QUFFREQsYUFBT0ksUUFBUCxDQUFnQkQsSUFBaEIsRUFBc0JGLFFBQXRCO0FBQ0QsS0FSRDtBQVNELEdBWkQ7QUFhRCIsImZpbGUiOiJyZXF1aXJlLWhvb2suanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgbWltZVR5cGVzIGZyb20gJ0BwYXVsY2JldHRzL21pbWUtdHlwZXMnO1xuXG5sZXQgSE1SID0gZmFsc2U7XG5cbmNvbnN0IGQgPSByZXF1aXJlKCdkZWJ1ZycpKCdlbGVjdHJvbi1jb21waWxlOnJlcXVpcmUtaG9vaycpO1xubGV0IGVsZWN0cm9uID0gbnVsbDtcblxuaWYgKHByb2Nlc3MudHlwZSA9PT0gJ3JlbmRlcmVyJykge1xuICB3aW5kb3cuX19ob3QgPSBbXTtcbiAgZWxlY3Ryb24gPSByZXF1aXJlKCdlbGVjdHJvbicpO1xuICBITVIgPSBlbGVjdHJvbi5yZW1vdGUuZ2V0R2xvYmFsKCdfX2VsZWN0cm9uX2NvbXBpbGVfaG1yX2VuYWJsZWRfXycpO1xuXG4gIGlmIChITVIpIHtcbiAgICBlbGVjdHJvbi5pcGNSZW5kZXJlci5vbignX19lbGVjdHJvbi1jb21waWxlX19ITVInLCAoKSA9PiB7XG4gICAgICBkKFwiR290IEhNUiBzaWduYWwhXCIpO1xuXG4gICAgICAvLyBSZXNldCB0aGUgbW9kdWxlIGNhY2hlXG4gICAgICBsZXQgY2FjaGUgPSByZXF1aXJlKCdtb2R1bGUnKS5fY2FjaGU7XG4gICAgICBsZXQgdG9FamVjdCA9IE9iamVjdC5rZXlzKGNhY2hlKS5maWx0ZXIoeCA9PiB4ICYmICF4Lm1hdGNoKC9bXFxcXFxcL10obm9kZV9tb2R1bGVzfC4qXFwuYXNhcilbXFxcXFxcL10vaSkpO1xuICAgICAgdG9FamVjdC5mb3JFYWNoKHggPT4ge1xuICAgICAgICBkKGBSZW1vdmluZyBub2RlIG1vZHVsZSBlbnRyeSBmb3IgJHt4fWApO1xuICAgICAgICBkZWxldGUgY2FjaGVbeF07XG4gICAgICB9KTtcblxuICAgICAgd2luZG93Ll9faG90LmZvckVhY2goZm4gPT4gZm4oKSk7XG4gICAgfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBJbml0aWFsaXplcyB0aGUgbm9kZS5qcyBob29rIHRoYXQgYWxsb3dzIHVzIHRvIGludGVyY2VwdCBmaWxlcyBsb2FkZWQgYnlcbiAqIG5vZGUuanMgYW5kIHJld3JpdGUgdGhlbS4gVGhpcyBtZXRob2QgYWxvbmcgd2l0aCB7QGxpbmsgaW5pdGlhbGl6ZVByb3RvY29sSG9va31cbiAqIGFyZSB0aGUgdG9wLWxldmVsIG1ldGhvZHMgdGhhdCBlbGVjdHJvbi1jb21waWxlIGFjdHVhbGx5IHVzZXMgdG8gaW50ZXJjZXB0XG4gKiBjb2RlIHRoYXQgRWxlY3Ryb24gbG9hZHMuXG4gKlxuICogQHBhcmFtICB7Q29tcGlsZXJIb3N0fSBjb21waWxlckhvc3QgIFRoZSBjb21waWxlciBob3N0IHRvIHVzZSBmb3IgY29tcGlsYXRpb24uXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHJlZ2lzdGVyUmVxdWlyZUV4dGVuc2lvbihjb21waWxlckhvc3QsIGlzUHJvZHVjdGlvbikge1xuICBpZiAoSE1SKSB7XG4gICAgdHJ5IHtcbiAgICAgIHJlcXVpcmUoJ21vZHVsZScpLnByb3RvdHlwZS5ob3QgPSB7XG4gICAgICAgIGFjY2VwdDogKGNiKSA9PiB3aW5kb3cuX19ob3QucHVzaChjYilcbiAgICAgIH07XG5cbiAgICAgIHJlcXVpcmUubWFpbi5yZXF1aXJlKCdyZWFjdC1ob3QtbG9hZGVyL3BhdGNoJyk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgY29uc29sZS5lcnJvcihgQ291bGRuJ3QgcmVxdWlyZSByZWFjdC1ob3QtbG9hZGVyL3BhdGNoLCB5b3UgbmVlZCB0byBhZGQgcmVhY3QtaG90LWxvYWRlckAzIGFzIGEgZGVwZW5kZW5jeSEgJHtlLm1lc3NhZ2V9YCk7XG4gICAgfVxuICB9XG5cbiAgbGV0IG1pbWVUeXBlTGlzdCA9IGlzUHJvZHVjdGlvbiA/XG4gICAgT2JqZWN0LmtleXMoY29tcGlsZXJIb3N0Lm1pbWVUeXBlc1RvUmVnaXN0ZXIpIDpcbiAgICBPYmplY3Qua2V5cyhjb21waWxlckhvc3QuY29tcGlsZXJzQnlNaW1lVHlwZSk7XG5cbiAgbWltZVR5cGVMaXN0LmZvckVhY2goKG1pbWVUeXBlKSA9PiB7XG4gICAgbGV0IGV4dCA9IG1pbWVUeXBlcy5leHRlbnNpb24obWltZVR5cGUpO1xuXG4gICAgcmVxdWlyZS5leHRlbnNpb25zW2AuJHtleHR9YF0gPSAobW9kdWxlLCBmaWxlbmFtZSkgPT4ge1xuICAgICAgbGV0IHtjb2RlfSA9IGNvbXBpbGVySG9zdC5jb21waWxlU3luYyhmaWxlbmFtZSk7XG5cbiAgICAgIGlmIChjb2RlID09PSBudWxsKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYG51bGwgY29kZSByZXR1cm5lZCBmb3IgXCIke2ZpbGVuYW1lfVwiLiAgUGxlYXNlIHJhaXNlIGFuIGlzc3VlIG9uICdlbGVjdHJvbi1jb21waWxlJyB3aXRoIHRoZSBjb250ZW50cyBvZiB0aGlzIGZpbGUuYCk7XG4gICAgICB9XG5cbiAgICAgIG1vZHVsZS5fY29tcGlsZShjb2RlLCBmaWxlbmFtZSk7XG4gICAgfTtcbiAgfSk7XG59XG4iXX0=