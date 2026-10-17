// Fills the /*__SHARED:name__*/ markers in a game's page with shared/<name>.js, so every
// game ships as one self-contained file while the shared code lives in one place.
// The header comment of each shared file is left out of the built page.
const fs = require('fs'), path = require('path');

module.exports = function inlineShared(text) {
  return text.replace(/\/\*__SHARED:([a-z-]+)__\*\//g, (marker, name) => {
    const file = path.join(__dirname, name + '.js');
    if (!fs.existsSync(file)) throw new Error('missing shared file ' + name + '.js');
    return fs.readFileSync(file, 'utf8').replace(/^\/\* shared\/[\s\S]*?\*\/\r?\n/, '').replace(/\r?\n$/, '');
  });
};
