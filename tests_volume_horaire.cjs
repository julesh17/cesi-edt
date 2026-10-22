// Tests de non-régression autonomes : node tests_volume_horaire.cjs
const fs = require('fs');
const vm = require('vm');
const assert = require('node:assert/strict');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, 'templates', 'dashboard.html'), 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
assert.ok(scripts.length >= 2);
const js = scripts.at(-1)[1].replace(/\binitDashboard\(\);\s*$/, '');
const elements = {};
const context = {
    document: { getElementById(id) { return elements[id] ??= { innerHTML: '' }; } },
    console, Date, Intl, navigator: {}, setTimeout
};
vm.createContext(context);
vm.runInContext(js, context);
const outputs = vm.runInContext(`
    const makeEvent = (date, promo, duration, groups, teachers, summary='Électronique') => {
        const startDt = new Date(date + 'T08:00:00');
        return { startDt, endDt: new Date(startDt.getTime() + duration*3600000),
                 promo_label: promo, groups, teachers, summary };
    };
    ALL_EVENTS_FLAT = [
        makeEvent('2026-10-02', 'P1', 2, ['G 1'], ['T1']),     // 1h étudiant, 2h formateur
        makeEvent('2026-10-03', 'P1', 2, ['G 2'], ['T1']),     // 1h étudiant, 2h formateur
        makeEvent('2026-10-04', 'P1', 3, [], ['T1', 'T2']),    // 3h étudiant, 6h formateurs
        makeEvent('2026-10-05', 'P1', 2, ['G 1', 'G 2'], ['T1']),  // 2h étudiant, 2h formateur
        makeEvent('2026-10-06', 'P2', 4, [], ['T3']),          // 4h étudiant, 4h formateur
        makeEvent('2026-10-07', 'P2', 2, [], []),              // 2h étudiant, 0h formateur
        makeEvent('2026-10-08', 'P1', 100, [], ['T1'], 'Période entreprise'), // ignorée
        makeEvent('2026-11-02', 'P2', 2, ['G 1'], ['T4','T5']) // 1h étudiant, 4h formateurs
    ];
    renderCfaiHoursTable();
    JSON.stringify(cfaiMonthlyTotals(ALL_EVENTS_FLAT));
`, context);
const months = JSON.parse(outputs);
assert.deepEqual(months['2026-10'], { p1: 7, p2: 6, trainerP1: 12, trainerP2: 4 });
assert.deepEqual(months['2026-11'], { p1: 0, p2: 1, trainerP1: 0, trainerP2: 4 });
assert.match(elements['cfai-hours-table'].innerHTML, /Heures étudiants P1/);
assert.match(elements['cfai-hours-table'].innerHTML, /Heures formateurs P1/);
assert.match(elements['cfai-hours-table'].innerHTML, /Heures formateurs P2/);
assert.match(elements['cfai-hours-table'].innerHTML, /<td[^>]*>12<\/td>/); // 12 h formateurs P1 en octobre
assert.match(elements['cfai-hours-table'].innerHTML, /<td[^>]*>4<\/td>/); // 4 h formateurs P2 en octobre
assert.match(elements['cfai-hours-table'].innerHTML, /TOTAL ANNÉE/);
assert.match(elements['cfai-hours-table'].innerHTML, /row-total/);
assert.equal((elements['cfai-hours-table'].innerHTML.match(/<tr/g) || []).length, 4);

for (const id of ['panel-volume-horaire', 'panel-budget']) assert.ok(html.includes('id="' + id + '"'));
assert.equal((html.match(/id="cfai-hours-table"/g) || []).length, 1);
console.log('OK : volumes étudiants/formateurs distincts P1/P2, demi-groupes, co-animation, autonomie, exclusions et tableau annuel.');
