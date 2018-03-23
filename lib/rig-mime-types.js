'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.init = init;

var _mimeTypes = require('@paulcbetts/mime-types');

var _mimeTypes2 = _interopRequireDefault(_mimeTypes);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const typesToRig = {
  'text/typescript': 'ts',
  'text/tsx': 'tsx',
  'text/jade': 'jade',
  'text/cson': 'cson',
  'text/stylus': 'styl',
  'text/sass': 'sass',
  'text/scss': 'scss',
  'text/vue': 'vue',
  'text/graphql': 'graphql'
};

/**
 * Adds MIME types for types not in the mime-types package
 *
 * @private
 */
function init() {
  Object.keys(typesToRig).forEach(type => {
    let ext = typesToRig[type];

    _mimeTypes2.default.types[ext] = type;
    _mimeTypes2.default.extensions[type] = [ext];
  });
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9yaWctbWltZS10eXBlcy5qcyJdLCJuYW1lcyI6WyJpbml0IiwidHlwZXNUb1JpZyIsIk9iamVjdCIsImtleXMiLCJmb3JFYWNoIiwidHlwZSIsImV4dCIsInR5cGVzIiwiZXh0ZW5zaW9ucyJdLCJtYXBwaW5ncyI6Ijs7Ozs7UUFtQmdCQSxJLEdBQUFBLEk7O0FBbkJoQjs7Ozs7O0FBRUEsTUFBTUMsYUFBYTtBQUNqQixxQkFBbUIsSUFERjtBQUVqQixjQUFZLEtBRks7QUFHakIsZUFBYSxNQUhJO0FBSWpCLGVBQWEsTUFKSTtBQUtqQixpQkFBZSxNQUxFO0FBTWpCLGVBQWEsTUFOSTtBQU9qQixlQUFhLE1BUEk7QUFRakIsY0FBWSxLQVJLO0FBU2pCLGtCQUFnQjtBQVRDLENBQW5COztBQVlBOzs7OztBQUtPLFNBQVNELElBQVQsR0FBZ0I7QUFDckJFLFNBQU9DLElBQVAsQ0FBWUYsVUFBWixFQUF3QkcsT0FBeEIsQ0FBaUNDLElBQUQsSUFBVTtBQUN4QyxRQUFJQyxNQUFNTCxXQUFXSSxJQUFYLENBQVY7O0FBRUEsd0JBQVVFLEtBQVYsQ0FBZ0JELEdBQWhCLElBQXVCRCxJQUF2QjtBQUNBLHdCQUFVRyxVQUFWLENBQXFCSCxJQUFyQixJQUE2QixDQUFDQyxHQUFELENBQTdCO0FBQ0QsR0FMRDtBQU1EIiwiZmlsZSI6InJpZy1taW1lLXR5cGVzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IG1pbWVUeXBlcyBmcm9tICdAcGF1bGNiZXR0cy9taW1lLXR5cGVzJztcblxuY29uc3QgdHlwZXNUb1JpZyA9IHtcbiAgJ3RleHQvdHlwZXNjcmlwdCc6ICd0cycsXG4gICd0ZXh0L3RzeCc6ICd0c3gnLFxuICAndGV4dC9qYWRlJzogJ2phZGUnLFxuICAndGV4dC9jc29uJzogJ2Nzb24nLFxuICAndGV4dC9zdHlsdXMnOiAnc3R5bCcsXG4gICd0ZXh0L3Nhc3MnOiAnc2FzcycsXG4gICd0ZXh0L3Njc3MnOiAnc2NzcycsXG4gICd0ZXh0L3Z1ZSc6ICd2dWUnLFxuICAndGV4dC9ncmFwaHFsJzogJ2dyYXBocWwnLFxufTtcblxuLyoqXG4gKiBBZGRzIE1JTUUgdHlwZXMgZm9yIHR5cGVzIG5vdCBpbiB0aGUgbWltZS10eXBlcyBwYWNrYWdlXG4gKlxuICogQHByaXZhdGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGluaXQoKSB7XG4gIE9iamVjdC5rZXlzKHR5cGVzVG9SaWcpLmZvckVhY2goKHR5cGUpID0+IHtcbiAgICBsZXQgZXh0ID0gdHlwZXNUb1JpZ1t0eXBlXTtcblxuICAgIG1pbWVUeXBlcy50eXBlc1tleHRdID0gdHlwZTtcbiAgICBtaW1lVHlwZXMuZXh0ZW5zaW9uc1t0eXBlXSA9IFtleHRdO1xuICB9KTtcbn1cbiJdfQ==