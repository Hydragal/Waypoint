/* blastcore.js — explosives in play, the pure half (1.5.8; the owner, 2026-10-25, by prompt: "Blast damage by the book" and "Throw like the
   site"; and "once it starts using the site throws, it should automatically place an explosive in the area indicated in the throw, following
   rules on when it automatically detonates and causes damage", "we also need to consider how mines work", "Mines only activate when they are
   stepped on, as opposed to grenades that automatically detonate once deployed").

   It reads nothing but its arguments: whiteboard.js places, rolls and applies on the host. What is the GM's to set lives in the system's Combat
   card (systemcore cleanCombat's `blast`): the falloff a token's share of a blast takes, the throw's roll, the scatter of a miss, and how near
   and how far a thing may be thrown. With none set a blast is what it always was.

   Published as window.wpBlastCore when a window exists. */
var VERSION = 1;
var hasOwn = function(o, k) { return Object.prototype.hasOwnProperty.call(o, k); };
var isObj = function(v) { return !!v && typeof v === 'object' && !Array.isArray(v); };
var fin = function(v) { return typeof v === 'number' && isFinite(v); };
var CTRL = /[\u0000-\u001f\u007f]/g;
function text(v, n) { return typeof v === 'string' ? v.slice(0, n).replace(CTRL, ' ').trim() : ''; }

// The eight ways a miss lands, in the site's words (use-dice-roller.ts getScatterResult), each with its turn from the line of the throw in
// degrees: Long is on past the aim, Short back toward the thrower, Right a quarter turn clockwise on the board (whose y runs down)
var SCATTER_WAYS = Object.freeze(['Short', 'Short and to the right', 'Right', 'Long and to the right', 'Long', 'Long and to the left', 'Left', 'Short and to the left']);
var SCATTER_TURN = Object.freeze([180, 135, 90, 45, 0, -45, -90, -135]);
// ... and the six of the book (fix log (eo): "a direction the GM rolls (1d for the six hex sides)"), a sixth of a turn apart
var SCATTER_WAYS6 = Object.freeze(['Long', 'Long and to the right', 'Short and to the right', 'Short', 'Short and to the left', 'Long and to the left']);
var SCATTER_TURN6 = Object.freeze([0, 60, 120, 180, -120, -60]);

// How many dice a damage formula rolls: the sum of every NdM's N (a bare dM is one), 0 with none. The book's safe distance reads it
function diceCount(expr) {
    if (typeof expr !== 'string') return 0;
    var n = 0, re = /(\d*)\s*d\s*(\d+|%|F)/gi, m, guard = 0;
    while ((m = re.exec(expr.slice(0, 1200))) && guard++ < 200) n += m[1] ? Math.min(1000, parseInt(m[1], 10)) : 1;
    return n;
}
// A token's share of a blast by the Combat card's falloff formula, with its four names: BlastDamage (what was rolled), BlastDistance (yards
// from the blast's centre, height counted), BlastDice (how many dice the damage rolled) and Direct (1 for the token struck directly, else 0).
// Centre: 1 for a token in the blast's own cell. No dice are ever rolled. A whole number, 0 or more, at most what was rolled; null where the formula cannot be worked out
function fallShare(F, formula, o) {
    if (!F || typeof F.evaluate !== 'function' || typeof formula !== 'string' || !formula || !isObj(o)) return null;
    var nm = { blastdamage: fin(o.dmg) ? o.dmg : 0, blastdistance: fin(o.dist) ? Math.max(0, o.dist) : 0, blastdice: fin(o.dice) ? o.dice : 0, direct: o.direct ? 1 : 0, centre: o.centre ? 1 : 0 };
    var r = F.evaluate(formula, { vars: function(n) { var l = String(n).toLowerCase(); return hasOwn(nm, l) ? nm[l] : undefined; }, random: function() { return NaN; } });   // a die fails at the die (as systemcore's noDice): the cleaner keeps none
    if (!r || !r.ok) return null;
    var v = typeof r.value === 'boolean' ? (r.value ? 1 : 0) : r.value; if (!fin(v)) return null;
    return Math.max(0, Math.min(fin(o.dmg) ? Math.max(0, Math.floor(o.dmg)) : 0, Math.floor(v)));
}
// What a throw's check means for where it lands (the site's rule): a critical failure goes off in the thrower's hand ('hand'), a success lands
// on its aim ('hit'), any other failure misses by its margin, at least 1 (a 17 or an 18 that is no critical misses by 1 where its margin is less)
function throwOutcome(check) {
    if (!isObj(check)) return { kind: 'hit', margin: 0 };
    if (check.crit === 'fumble') return { kind: 'fumble', margin: 0, natural: fin(check.total) ? check.total : null };
    if (check.pass) return { kind: 'hit', margin: 0 };
    var m = fin(check.margin) ? Math.floor(Math.abs(check.margin)) : 1;
    return { kind: 'miss', margin: Math.max(1, Math.min(100, m)) };
}
// Where a miss lands: from the aim, dist along the line of the throw turned by its way (an index of the ways: six, else eight). The line runs
// from the thrower to the aim; where the two stand on one point the line runs up the board. pxPer: board pixels to one unit of dist
function scatterPoint(aim, from, ft, way, pxPerFt, ways) {
    var six = ways !== 8, n = six ? 6 : 8, words = six ? SCATTER_WAYS6 : SCATTER_WAYS, turns = six ? SCATTER_TURN6 : SCATTER_TURN;
    if (!isObj(aim) || !fin(aim.x) || !fin(aim.y)) return null;
    var dx = isObj(from) && fin(from.x) ? aim.x - from.x : 0, dy = isObj(from) && fin(from.y) ? aim.y - from.y : 0, len = Math.hypot(dx, dy);
    var base = len > 1e-6 ? Math.atan2(dy, dx) : -Math.PI / 2, w = fin(way) ? ((Math.floor(way) % n) + n) % n : 0, a = base + turns[w] * Math.PI / 180;
    var d = (fin(ft) ? Math.max(0, ft) : 0) * (fin(pxPerFt) && pxPerFt > 0 ? pxPerFt : 0);
    return { x: Math.round((aim.x + Math.cos(a) * d) * 100) / 100, y: Math.round((aim.y + Math.sin(a) * d) * 100) / 100, way: w, words: words[w] };
}
// The scatter where the Combat card names no formula (the book, fix log (eo)): a yard a point missed, never more than half the distance thrown
function bookScatterYd(margin, thrownYd) {
    var m = fin(margin) ? Math.max(0, Math.min(100, Math.floor(margin))) : 1, half = fin(thrownYd) ? Math.max(0, thrownYd / 2) : m;
    return Math.min(m, half);
}
// A placed mine as its trigger zone carries it (the GM's own: a hidden zone travels to no player, and wireWbItem drops the key from every
// copy). What it holds: its blast (ft, a name, the damage formula's text, the damage type's key), the trigger radius in yards, the character
// that placed it and the row, its maker's name, whether it is the GM's alone, and the item's notes. Anything else is no key; null where no
// blast is left
var MINE_ID = /^c_[A-Za-z0-9_]{1,24}$/, MINE_FIELD = /^[A-Za-z0-9_]{1,64}$/, MINE_ROW = /^w_[A-Za-z0-9_]{1,24}$/, MINE_TYPE = /^[A-Za-z][A-Za-z0-9_]{0,23}$/;
function cleanMine(m) {
    if (!isObj(m)) return null;
    var ft = fin(m.ft) ? Math.round(m.ft) : 0; if (!(ft >= 1)) return null;
    var out = { ft: Math.min(3000, ft) };
    var nm = text(m.name, 240); if (nm) out.name = nm;
    var dm = text(m.damage, 1200); if (dm) out.damage = dm;
    if (typeof m.type === 'string' && MINE_TYPE.test(m.type)) out.type = m.type;
    out.trig = fin(m.trig) && m.trig > 0 ? Math.max(0.5, Math.min(100, Math.round(m.trig * 10) / 10)) : 2;
    if (typeof m.charId === 'string' && MINE_ID.test(m.charId)) out.charId = m.charId;
    if (typeof m.fieldId === 'string' && MINE_FIELD.test(m.fieldId)) out.fieldId = m.fieldId;
    if (typeof m.rowId === 'string' && MINE_ROW.test(m.rowId)) out.rowId = m.rowId;
    var by = text(m.by, 240); if (by) out.by = by;
    if (m.gmOnly === true) out.gmOnly = true;
    if (m.unarmed === true) out.unarmed = true;   // planted with a failed roll: it lies there and never goes off by a step (its planter knows)
    if (fin(m.ad) && m.ad > 0 && m.ad !== 1) out.ad = Math.max(0.1, Math.min(100, Math.round(m.ad * 10) / 10));
    var nt = text(m.notes, 800); if (nt) out.notes = nt;
    return out;
}
// Whether a token stands in a mine's trigger: its centre within the trigger radius of the zone's centre, in yards (yardsBetween: the map's own
// reading of two board points). A token that stood in it where the gesture began sets nothing off: it has to step in
function inTrigger(zone, tokCentre, yardsBetween) {
    if (!isObj(zone) || !isObj(zone.mine) || !isObj(tokCentre) || typeof yardsBetween !== 'function') return false;
    var c = { x: (Number(zone.x) || 0) + (Number(zone.w) || 0) / 2, y: (Number(zone.y) || 0) + (Number(zone.h) || 0) / 2 };
    var d = yardsBetween(c, tokCentre); return fin(d) && d <= (fin(zone.mine.trig) ? zone.mine.trig : 2) + 1e-9;
}
// The stand-in drawings a thrown explosive and a placed mine wear on the map until an item has an icon of its own: the app's own, plain
// geometry on a 24-unit square in the toolbar's line style (paths only, numbers and their own letters)
var STAND_INS = Object.freeze({
    grenade: Object.freeze(['M12 9a6 6 0 1 0 0 12 6 6 0 0 0 0-12z', 'M10 9V6h4v3', 'M14 7l4-3', 'M9.5 13.5h5M9.5 16.5h5']),
    mine: Object.freeze(['M4 15c0-2.5 3.6-4 8-4s8 1.5 8 4-3.6 4-8 4-8-1.5-8-4z', 'M12 11V7', 'M7.5 11.5L6 8.5M16.5 11.5L18 8.5', 'M10 7h4'])
});
var API = { VERSION: VERSION, SCATTER_WAYS: SCATTER_WAYS, SCATTER_TURN: SCATTER_TURN, SCATTER_WAYS6: SCATTER_WAYS6, SCATTER_TURN6: SCATTER_TURN6, diceCount: diceCount, fallShare: fallShare, throwOutcome: throwOutcome, scatterPoint: scatterPoint, bookScatterYd: bookScatterYd, cleanMine: cleanMine, inTrigger: inTrigger, STAND_INS: STAND_INS };
if (typeof window !== 'undefined') window.wpBlastCore = API;
export { VERSION, SCATTER_WAYS, SCATTER_TURN, SCATTER_WAYS6, SCATTER_TURN6, diceCount, fallShare, throwOutcome, scatterPoint, bookScatterYd, cleanMine, inTrigger, STAND_INS };
