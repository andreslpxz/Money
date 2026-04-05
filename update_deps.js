const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

pkg.dependencies['ai'] = '^3.1.0';

fs.writeFileSync('./package.json', JSON.stringify(pkg, null, 2));
