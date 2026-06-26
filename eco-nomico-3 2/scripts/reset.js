const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'eco.db');
let removed = 0;
for (const ext of ['', '-wal', '-shm']) {
    const p = DB_PATH + ext;
    if (fs.existsSync(p)) {
        fs.unlinkSync(p);
        removed++;
    }
}
console.log(`Reset completato (${removed} file rimossi).`);
