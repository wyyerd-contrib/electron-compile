'use strict';

var _configParser = require('./config-parser');

var configParser = _interopRequireWildcard(_configParser);

var _compilerHost = require('./compiler-host');

var _compilerHost2 = _interopRequireDefault(_compilerHost);

var _fileChangeCache = require('./file-change-cache');

var _fileChangeCache2 = _interopRequireDefault(_fileChangeCache);

var _compileCache = require('./compile-cache');

var _compileCache2 = _interopRequireDefault(_compileCache);

var _protocolHook = require('./protocol-hook');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

//import {enableLiveReload} from './live-reload';
//import {watchPath} from './pathwatcher-rx';

let enableLiveReload = null;
let watchPath = null;

module.exports = Object.assign({
  // NB: delay-load live-reload so we don't load RxJS in production
  enableLiveReload: function () {
    enableLiveReload = enableLiveReload || require('./live-reload').enableLiveReload;
    return enableLiveReload(...arguments);
  },
  watchPath: function () {
    watchPath = watchPath || require('./pathwatcher-rx').watchPath;
    return watchPath(...arguments);
  }
}, configParser, { CompilerHost: _compilerHost2.default, FileChangedCache: _fileChangeCache2.default, CompileCache: _compileCache2.default, addBypassChecker: _protocolHook.addBypassChecker });
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC5qcyJdLCJuYW1lcyI6WyJjb25maWdQYXJzZXIiLCJlbmFibGVMaXZlUmVsb2FkIiwid2F0Y2hQYXRoIiwibW9kdWxlIiwiZXhwb3J0cyIsIk9iamVjdCIsImFzc2lnbiIsInJlcXVpcmUiLCJDb21waWxlckhvc3QiLCJGaWxlQ2hhbmdlZENhY2hlIiwiQ29tcGlsZUNhY2hlIiwiYWRkQnlwYXNzQ2hlY2tlciJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7SUFBWUEsWTs7QUFFWjs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7Ozs7O0FBQ0E7QUFDQTs7QUFFQSxJQUFJQyxtQkFBbUIsSUFBdkI7QUFDQSxJQUFJQyxZQUFZLElBQWhCOztBQUVBQyxPQUFPQyxPQUFQLEdBQWlCQyxPQUFPQyxNQUFQLENBQWM7QUFDN0I7QUFDQUwsb0JBQWtCLFlBQWtCO0FBQ2xDQSx1QkFBbUJBLG9CQUFvQk0sUUFBUSxlQUFSLEVBQXlCTixnQkFBaEU7QUFDQSxXQUFPQSxpQkFBaUIsWUFBakIsQ0FBUDtBQUNELEdBTDRCO0FBTTdCQyxhQUFXLFlBQWtCO0FBQzNCQSxnQkFBWUEsYUFBYUssUUFBUSxrQkFBUixFQUE0QkwsU0FBckQ7QUFDQSxXQUFPQSxVQUFVLFlBQVYsQ0FBUDtBQUNEO0FBVDRCLENBQWQsRUFXZkYsWUFYZSxFQVlmLEVBQUVRLG9DQUFGLEVBQWdCQywyQ0FBaEIsRUFBa0NDLG9DQUFsQyxFQUFnREMsZ0RBQWhELEVBWmUsQ0FBakIiLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjb25maWdQYXJzZXIgZnJvbSAnLi9jb25maWctcGFyc2VyJztcblxuaW1wb3J0IENvbXBpbGVySG9zdCBmcm9tICcuL2NvbXBpbGVyLWhvc3QnO1xuaW1wb3J0IEZpbGVDaGFuZ2VkQ2FjaGUgZnJvbSAnLi9maWxlLWNoYW5nZS1jYWNoZSc7XG5pbXBvcnQgQ29tcGlsZUNhY2hlIGZyb20gJy4vY29tcGlsZS1jYWNoZSc7XG5pbXBvcnQge2FkZEJ5cGFzc0NoZWNrZXJ9IGZyb20gJy4vcHJvdG9jb2wtaG9vayc7XG4vL2ltcG9ydCB7ZW5hYmxlTGl2ZVJlbG9hZH0gZnJvbSAnLi9saXZlLXJlbG9hZCc7XG4vL2ltcG9ydCB7d2F0Y2hQYXRofSBmcm9tICcuL3BhdGh3YXRjaGVyLXJ4JztcblxubGV0IGVuYWJsZUxpdmVSZWxvYWQgPSBudWxsO1xubGV0IHdhdGNoUGF0aCA9IG51bGw7XG5cbm1vZHVsZS5leHBvcnRzID0gT2JqZWN0LmFzc2lnbih7XG4gIC8vIE5COiBkZWxheS1sb2FkIGxpdmUtcmVsb2FkIHNvIHdlIGRvbid0IGxvYWQgUnhKUyBpbiBwcm9kdWN0aW9uXG4gIGVuYWJsZUxpdmVSZWxvYWQ6IGZ1bmN0aW9uKC4uLmFyZ3MpIHtcbiAgICBlbmFibGVMaXZlUmVsb2FkID0gZW5hYmxlTGl2ZVJlbG9hZCB8fCByZXF1aXJlKCcuL2xpdmUtcmVsb2FkJykuZW5hYmxlTGl2ZVJlbG9hZDtcbiAgICByZXR1cm4gZW5hYmxlTGl2ZVJlbG9hZCguLi5hcmdzKTtcbiAgfSxcbiAgd2F0Y2hQYXRoOiBmdW5jdGlvbiguLi5hcmdzKSB7XG4gICAgd2F0Y2hQYXRoID0gd2F0Y2hQYXRoIHx8IHJlcXVpcmUoJy4vcGF0aHdhdGNoZXItcngnKS53YXRjaFBhdGg7XG4gICAgcmV0dXJuIHdhdGNoUGF0aCguLi5hcmdzKTtcbiAgfSxcbn0sXG4gIGNvbmZpZ1BhcnNlcixcbiAgeyBDb21waWxlckhvc3QsIEZpbGVDaGFuZ2VkQ2FjaGUsIENvbXBpbGVDYWNoZSwgYWRkQnlwYXNzQ2hlY2tlciB9XG4pO1xuIl19