'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.watchPathDirect = watchPathDirect;
exports.watchPath = watchPath;

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _Observable = require('rxjs/Observable');

var _Subscription = require('rxjs/Subscription');

var _lruCache = require('lru-cache');

var _lruCache2 = _interopRequireDefault(_lruCache);

require('rxjs/add/operator/publish');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function watchPathDirect(directory) {
  return _Observable.Observable.create(subj => {
    let dead = false;

    const watcher = _fs2.default.watch(directory, {}, (eventType, fileName) => {
      if (dead) return;
      subj.next({ eventType, fileName });
    });

    watcher.on('error', e => {
      dead = true;
      subj.error(e);
    });

    return new _Subscription.Subscription(() => {
      if (!dead) {
        watcher.close();
      }
    });
  });
}

const pathCache = new _lruCache2.default({ length: 256 });
function watchPath(directory) {
  let ret = pathCache.get(directory);
  if (ret) return ret;

  ret = watchPathDirect(directory).publish().refCount();
  pathCache.set(directory, ret);
  return ret;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9wYXRod2F0Y2hlci1yeC5qcyJdLCJuYW1lcyI6WyJ3YXRjaFBhdGhEaXJlY3QiLCJ3YXRjaFBhdGgiLCJkaXJlY3RvcnkiLCJjcmVhdGUiLCJzdWJqIiwiZGVhZCIsIndhdGNoZXIiLCJ3YXRjaCIsImV2ZW50VHlwZSIsImZpbGVOYW1lIiwibmV4dCIsIm9uIiwiZSIsImVycm9yIiwiY2xvc2UiLCJwYXRoQ2FjaGUiLCJsZW5ndGgiLCJyZXQiLCJnZXQiLCJwdWJsaXNoIiwicmVmQ291bnQiLCJzZXQiXSwibWFwcGluZ3MiOiI7Ozs7O1FBT2dCQSxlLEdBQUFBLGU7UUFtQkFDLFMsR0FBQUEsUzs7QUExQmhCOzs7O0FBQ0E7O0FBQ0E7O0FBQ0E7Ozs7QUFFQTs7OztBQUVPLFNBQVNELGVBQVQsQ0FBeUJFLFNBQXpCLEVBQW9DO0FBQ3pDLFNBQU8sdUJBQVdDLE1BQVgsQ0FBbUJDLElBQUQsSUFBVTtBQUNqQyxRQUFJQyxPQUFPLEtBQVg7O0FBRUEsVUFBTUMsVUFBVSxhQUFHQyxLQUFILENBQVNMLFNBQVQsRUFBb0IsRUFBcEIsRUFBd0IsQ0FBQ00sU0FBRCxFQUFZQyxRQUFaLEtBQXlCO0FBQy9ELFVBQUlKLElBQUosRUFBVTtBQUNWRCxXQUFLTSxJQUFMLENBQVUsRUFBQ0YsU0FBRCxFQUFZQyxRQUFaLEVBQVY7QUFDRCxLQUhlLENBQWhCOztBQUtBSCxZQUFRSyxFQUFSLENBQVcsT0FBWCxFQUFxQkMsQ0FBRCxJQUFPO0FBQ3pCUCxhQUFPLElBQVA7QUFDQUQsV0FBS1MsS0FBTCxDQUFXRCxDQUFYO0FBQ0QsS0FIRDs7QUFLQSxXQUFPLCtCQUFpQixNQUFNO0FBQUUsVUFBSSxDQUFDUCxJQUFMLEVBQVc7QUFBRUMsZ0JBQVFRLEtBQVI7QUFBa0I7QUFBRSxLQUExRCxDQUFQO0FBQ0QsR0FkTSxDQUFQO0FBZUQ7O0FBRUQsTUFBTUMsWUFBWSx1QkFBUSxFQUFFQyxRQUFRLEdBQVYsRUFBUixDQUFsQjtBQUNPLFNBQVNmLFNBQVQsQ0FBbUJDLFNBQW5CLEVBQThCO0FBQ25DLE1BQUllLE1BQU1GLFVBQVVHLEdBQVYsQ0FBY2hCLFNBQWQsQ0FBVjtBQUNBLE1BQUllLEdBQUosRUFBUyxPQUFPQSxHQUFQOztBQUVUQSxRQUFNakIsZ0JBQWdCRSxTQUFoQixFQUEyQmlCLE9BQTNCLEdBQXFDQyxRQUFyQyxFQUFOO0FBQ0FMLFlBQVVNLEdBQVYsQ0FBY25CLFNBQWQsRUFBeUJlLEdBQXpCO0FBQ0EsU0FBT0EsR0FBUDtBQUNEIiwiZmlsZSI6InBhdGh3YXRjaGVyLXJ4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7T2JzZXJ2YWJsZX0gZnJvbSAncnhqcy9PYnNlcnZhYmxlJztcbmltcG9ydCB7U3Vic2NyaXB0aW9ufSBmcm9tICdyeGpzL1N1YnNjcmlwdGlvbic7XG5pbXBvcnQgTFJVIGZyb20gJ2xydS1jYWNoZSc7XG5cbmltcG9ydCAncnhqcy9hZGQvb3BlcmF0b3IvcHVibGlzaCc7XG5cbmV4cG9ydCBmdW5jdGlvbiB3YXRjaFBhdGhEaXJlY3QoZGlyZWN0b3J5KSB7XG4gIHJldHVybiBPYnNlcnZhYmxlLmNyZWF0ZSgoc3ViaikgPT4ge1xuICAgIGxldCBkZWFkID0gZmFsc2U7XG5cbiAgICBjb25zdCB3YXRjaGVyID0gZnMud2F0Y2goZGlyZWN0b3J5LCB7fSwgKGV2ZW50VHlwZSwgZmlsZU5hbWUpID0+IHtcbiAgICAgIGlmIChkZWFkKSByZXR1cm47XG4gICAgICBzdWJqLm5leHQoe2V2ZW50VHlwZSwgZmlsZU5hbWV9KTtcbiAgICB9KTtcblxuICAgIHdhdGNoZXIub24oJ2Vycm9yJywgKGUpID0+IHtcbiAgICAgIGRlYWQgPSB0cnVlO1xuICAgICAgc3Viai5lcnJvcihlKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBuZXcgU3Vic2NyaXB0aW9uKCgpID0+IHsgaWYgKCFkZWFkKSB7IHdhdGNoZXIuY2xvc2UoKTsgfSB9KTtcbiAgfSk7XG59XG5cbmNvbnN0IHBhdGhDYWNoZSA9IG5ldyBMUlUoeyBsZW5ndGg6IDI1NiB9KTtcbmV4cG9ydCBmdW5jdGlvbiB3YXRjaFBhdGgoZGlyZWN0b3J5KSB7XG4gIGxldCByZXQgPSBwYXRoQ2FjaGUuZ2V0KGRpcmVjdG9yeSk7XG4gIGlmIChyZXQpIHJldHVybiByZXQ7XG5cbiAgcmV0ID0gd2F0Y2hQYXRoRGlyZWN0KGRpcmVjdG9yeSkucHVibGlzaCgpLnJlZkNvdW50KCk7XG4gIHBhdGhDYWNoZS5zZXQoZGlyZWN0b3J5LCByZXQpO1xuICByZXR1cm4gcmV0O1xufVxuIl19