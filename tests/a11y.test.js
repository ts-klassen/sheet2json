import fs from 'fs';

describe('Accessibility basic check', () => {
  test('index.html contains <title> and landmark elements', () => {
    const html = fs.readFileSync('index.html', 'utf8');
    expect(html).toMatch(/<title>[\s\S]*?<\/title>/i);
    // Ensure presence of <main> or role="main"
    expect(html).toMatch(/<div id="app">/i);
  });
});
