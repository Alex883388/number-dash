// Fills the /*__SHARED:name__*/ markers in a game's page with shared/<name>.js (or, for a name
// ending in .css, with that stylesheet), so every game ships as one self-contained file while
// the shared code lives in one place. A shared file may use markers too (filled the same way, a
// few levels deep). The header comment of each shared file is left out.
const fs = require('fs'), path = require('path');

module.exports = function inlineShared(text, depth) {
  if ((depth || 0) > 3) throw new Error('shared files include each other too deeply');
  return text.replace(/\/\*__SHARED:([a-z-]+(?:\.css)?)__\*\//g, (marker, name) => {
    const fileName = name.endsWith('.css') ? name : name + '.js', file = path.join(__dirname, fileName);
    if (!fs.existsSync(file)) throw new Error('missing shared file ' + fileName);
    const body = fs.readFileSync(file, 'utf8').replace(/^\/\* shared\/[\s\S]*?\*\/\r?\n/, '').replace(/\r?\n$/, '');
    return module.exports(body, (depth || 0) + 1);
  });
};
