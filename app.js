'use strict';

// Entry point used by `npm start` and by hosts like GoDaddy/Passenger that
// run plain `node app.js`. The real server is TypeScript under src/,
// compiled to dist/ via `npm run build` - this file just boots that output.
module.exports = require('./dist/src/server');
