const assert = require('assert');
const fs = require('fs');

const layout = fs.readFileSync('app/_layout.tsx', 'utf8');

assert(
  !layout.includes('if (readyRef.current) return;'),
  'auth redirect effect must rerun when session changes after login'
);

console.log('auth redirect guard check passed');
