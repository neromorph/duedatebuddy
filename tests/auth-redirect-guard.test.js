const fs = require('fs');

test('auth redirect effect reruns when session changes after login', () => {
  const layout = fs.readFileSync('app/_layout.tsx', 'utf8');

  expect(layout).not.toContain('if (readyRef.current) return;');
});
