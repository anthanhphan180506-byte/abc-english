// Chạy: npm test
import { Tests } from './src/lib/tests.js';
import { Seed } from './src/lib/seed.js';
const res = Tests.run(); let bad = 0;
res.forEach((r) => { if (!r.ok) bad++; console.log((r.ok ? 'PASS ' : 'FAIL ') + r.ref + ' ' + r.name + (r.ok ? '' : '\n     -> ' + r.err)); });
const db = Seed.build();
console.log(`\nSeed OK: ${db.classes.length} lớp, ${db.enrollments.length} đăng ký, ${db.requests.length} yêu cầu`);
console.log(`${res.length - bad}/${res.length} ca đạt`); process.exit(bad ? 1 : 0);
