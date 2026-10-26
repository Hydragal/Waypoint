/* One step of a flow as one line of the app's log (1.6.0; the owner, 2026-10-26: "document and add logs so you can print out step by step
   error logs when needed", and "this should be a general standing rule"). Every feature whose steps can fail writes its start, each step, its
   end and a failure with where it stood, through stepLog, in these words: "<area> <step> key=value ...". A value is a number, a truth value,
   a snapshot's name or a short word with no space; anything else is written ?, so a line never carries a campaign's name or content.
   stepLine is pure (Node runs it). stepLog posts the line to /api/log (the installed app appends it to saves/error.log; the dev server drops
   it) and, with window.wpStepDebug set to true (or { <area's first word>: true }) in the developer console, prints it there too.
   Published as window.wpStepLog. */

var FILE = /^(data|keep)-[A-Za-z0-9_-]+\.json$/;
function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
function stepLine(area, step, facts) {
    var out = String(area || '').replace(/[^a-z0-9 .-]/gi, '').slice(0, 30).trim() + ' ' + String(step || '').replace(/[^a-z0-9-]/gi, '').slice(0, 40);
    if (isObj(facts)) Object.keys(facts).slice(0, 12).forEach(function(k) {
        var v = facts[k], s = typeof v === 'number' && isFinite(v) ? String(v) : typeof v === 'boolean' ? String(v) : typeof v === 'string' && (FILE.test(v) || /^[a-z0-9_.:-]{0,60}$/i.test(v)) ? v : '?';
        out += ' ' + String(k).replace(/[^a-z0-9]/gi, '').slice(0, 20) + '=' + s;
    });
    return out;
}
function stepLog(area, step, facts) {
    var line = stepLine(area, step, facts);
    if (typeof window === 'undefined') return line;
    try { if (typeof fetch === 'function') { var p = fetch('/api/log', { method: 'POST', body: line }); if (p && typeof p.catch === 'function') p.catch(function() {}); } } catch (e) {}
    try { var dbg = window.wpStepDebug, first = String(area || '').split(' ')[0]; if (dbg === true || (isObj(dbg) && dbg[first] === true)) console.info(line); } catch (e) {}
    return line;
}
if (typeof window !== 'undefined') window.wpStepLog = stepLog;
export { stepLine, stepLog };
