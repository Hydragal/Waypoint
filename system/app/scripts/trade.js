// trade.js — 1.5.6 trading: the barter window (backlog 157; docs/TRADE_V1_SPEC.md, local). The owner, 2026-10-18: "a barter screen the gm/
// players put items and/or money into on their side. both people trading see the other's offer and when both sides confirm, the trade is
// completed", and 2026-10-24: "using npcs as merchants with inventories of items they sell". The host judges every step (net.js tradeDo); this
// window only draws the host's view (net.tradeNow, the 'wptrade' event) and asks through the net.trade* calls. Every word is a text node
import { showConfirm } from './dialogs.js';
import { toast } from './io.js';

var _tw = { view: null, asked: Object.create(null), shown: false };

// [sinkcheck:tradewin-start]
function twEl(doc, tag, cls, text) { var e = doc.createElement(tag); if (cls) e.className = cls; if (text !== undefined && text !== null) e.textContent = String(text); return e; }
function twNum(n) { if (typeof n !== 'number' || !isFinite(n)) return ''; return Math.floor(n) === n ? String(n) : String(Number(n.toFixed(2))); }
function twMine(v) { return !v ? [] : v.you === 'both' ? ['a', 'b'] : v.you === 'a' || v.you === 'b' ? [v.you] : []; }
// a side's lines as an offer the host takes back (net.tradePut)
function twOffer(lines) { return (lines || []).map(function(l) { return l.key !== undefined ? { fid: l.fid, rowId: l.rowId, key: l.key, amt: l.amt } : { fid: l.fid, rowId: l.rowId, qty: l.qty }; }); }
// what may still be added: one choice a row by its quantity, and one for each figure that a trade may split, never one already on the table
function twChoices(offerable, lines) {
    var used = Object.create(null); (lines || []).forEach(function(l) { used[l.fid + '|' + l.rowId] = 1; });
    var out = [];
    (offerable || []).forEach(function(e) {
        if (used[e.fid + '|' + e.rowId]) return;
        out.push({ v: 'q|' + e.fid + '|' + e.rowId, text: e.list + ': ' + e.name + (e.qty > 1 ? ' (' + e.qty + ')' : '') + (e.no ? ' — ' + e.no : ''), no: !!e.no });
        (e.split || []).forEach(function(s) { if (!e.no && s.max > 0) out.push({ v: 'a|' + e.fid + '|' + e.rowId + '|' + s.key, text: e.list + ': ' + s.label + ' from ' + e.name + ' (' + twNum(s.max) + ')', no: false }); });
    });
    return out;
}
function twTotal(lines) { var t = 0, any = false; (lines || []).forEach(function(l) { if (typeof l.price === 'number' && l.qty) { t += l.price * l.qty; any = true; } }); return any ? t : null; }
// draw the window's body for a view: doc the page, root the body to fill, off { a: [...], b: [...] } what each side of this screen may offer,
// act(kind, side, arg) the window's own handler
function twDraw(doc, root, v, off, act) {
    while (root.firstChild) root.removeChild(root.firstChild);
    var mine = twMine(v), cols = twEl(doc, 'div', 'trade-cols');
    ['a', 'b'].forEach(function(sd) {
        var s = v[sd], me = mine.indexOf(sd) >= 0, col = twEl(doc, 'div', 'trade-col' + (me ? ' trade-mine' : ''));
        col.appendChild(twEl(doc, 'div', 'trade-who', s.name + (me && mine.length === 1 ? ' (you)' : '')));
        var list = twEl(doc, 'div', 'trade-lines');
        if (!s.lines.length) list.appendChild(twEl(doc, 'div', 'trade-none', me ? 'Nothing yet. Add something from the sheet.' : 'Nothing yet.'));
        s.lines.forEach(function(l, i) {
            var row = twEl(doc, 'div', 'trade-line'), nm = twEl(doc, 'span', 'trade-name', l.key !== undefined ? l.label + ' from ' + l.name : l.name); row.appendChild(nm);
            if (me && v.status === 'open') {
                var box = doc.createElement('input'); box.type = 'number'; box.className = 'trade-num'; box.min = l.key !== undefined ? '0.01' : '1'; box.step = l.key !== undefined ? '0.01' : '1';
                box.value = twNum(l.key !== undefined ? l.amt : l.qty); box.title = l.key !== undefined ? 'How much of it you give' : 'How many you give'; box.setAttribute('aria-label', box.title);
                box.addEventListener('change', function() { act('num', sd, { i: i, n: Number(box.value) }); }); row.appendChild(box);
                var x = twEl(doc, 'button', 'tool ghost trade-x', '×'); x.type = 'button'; x.title = 'Take it off the table'; x.setAttribute('aria-label', 'Take ' + l.name + ' off the table'); x.addEventListener('click', function() { act('drop', sd, i); }); row.appendChild(x);
            } else row.appendChild(twEl(doc, 'span', 'trade-qty', l.key !== undefined ? twNum(l.amt) : 'x' + l.qty));
            if (typeof l.price === 'number' && l.key === undefined) row.appendChild(twEl(doc, 'span', 'trade-price', twNum(l.price * l.qty)));
            list.appendChild(row);
        });
        col.appendChild(list);
        if (me && v.status === 'open') (s.gets || []).forEach(function(g) {   // the receiver picks the chip an amount lands on
            var gr = twEl(doc, 'label', 'trade-into'); gr.appendChild(twEl(doc, 'span', null, g.label + ' you get goes onto'));
            var gs = doc.createElement('select'); gs.className = 'trade-into-sel'; gs.title = 'Which of your rows of ' + g.list + ' gets it'; gs.setAttribute('aria-label', gs.title);
            var g0 = twEl(doc, 'option', null, 'The first that fits'); g0.value = ''; gs.appendChild(g0);
            (g.opts || []).forEach(function(o) { var e = twEl(doc, 'option', null, o.name + (typeof o.cur === 'number' ? ' (' + twNum(o.cur) + ')' : '')); e.value = o.rowId; gs.appendChild(e); });
            var gn = twEl(doc, 'option', null, 'A new one'); gn.value = '+'; gs.appendChild(gn);
            gs.value = g.pick || ''; gs.addEventListener('change', function() { act('into', sd, { fid: g.fid, row: gs.value }); });
            gr.appendChild(gs); col.appendChild(gr);
        });
        var tot = twTotal(s.lines); if (tot !== null) col.appendChild(twEl(doc, 'div', 'trade-total', 'Worth at list price: ' + twNum(tot)));
        if (me && v.status === 'open') {
            var ch = twChoices(off[sd], s.lines), sel = doc.createElement('select'); sel.className = 'trade-add'; sel.title = 'Put a row of your sheet on the table'; sel.setAttribute('aria-label', 'Add from ' + s.name + '’s sheet');
            var o0 = twEl(doc, 'option', null, ch.length ? 'Add from ' + s.name + '’s sheet…' : 'Nothing left to add'); o0.value = ''; sel.appendChild(o0);
            ch.forEach(function(c) { var o = twEl(doc, 'option', null, c.text); o.value = c.v; if (c.no) o.disabled = true; sel.appendChild(o); });
            sel.addEventListener('change', function() { if (sel.value) act('add', sd, sel.value); });
            col.appendChild(sel);
            var ok = twEl(doc, 'button', 'tool trade-ok' + (s.ok ? ' on' : ''), s.ok ? 'Confirmed' : 'Confirm'); ok.type = 'button'; ok.setAttribute('aria-pressed', s.ok ? 'true' : 'false');
            ok.title = s.ok ? 'Take your confirm back' : 'You agree to this trade as it stands. Any change clears both confirms';
            ok.addEventListener('click', function() { act('ok', sd, !s.ok); }); col.appendChild(ok);
        } else if (v.status === 'open') col.appendChild(twEl(doc, 'div', 'trade-state' + (s.ok ? ' on' : ''), s.ok ? s.name + ' has confirmed.' : 'Waiting for ' + s.name + ' to confirm.'));
        cols.appendChild(col);
    });
    root.appendChild(cols);
    var line = v.status === 'asking' ? (mine.indexOf('a') >= 0 ? 'Waiting for ' + v.b.name + ' to answer.' : v.a.name + ' asks to trade.') : (v.msg || 'Both sides confirm, and everything moves at once.');
    root.appendChild(twEl(doc, 'div', 'trade-msg', line));
}
// [sinkcheck:tradewin-end]

function twNet() { return window.wpNet || null; }
function twGm() { var n = twNet(); return !(n && n.active && n.role === 'client'); }
function twModal() { return document.getElementById('tradeModal'); }
function twShow(on) { var m = twModal(); if (!m) return; m.style.display = on ? 'flex' : 'none'; _tw.shown = !!on; }
function twAct(kind, sd, arg) {
    var n = twNet(), v = _tw.view; if (!n || !v) return;
    var side = v.you === 'both' ? sd : undefined, lines = twOffer(v[sd].lines), say = function(r) { if (r && r.error && typeof toast === 'function') toast(r.error); };
    if (kind === 'add') {
        var p = String(arg).split('|');
        if (p[0] === 'q') lines.push({ fid: p[1], rowId: p[2], qty: 1 }); else if (p[0] === 'a') { var e = (n.tradeOffer(v[sd].charId, twGm()) || []).filter(function(x) { return x.fid === p[1] && x.rowId === p[2]; })[0], sp = e && e.split.filter(function(s) { return s.key === p[3]; })[0]; lines.push({ fid: p[1], rowId: p[2], key: p[3], amt: sp ? Math.min(sp.max, 1) : 1 }); }
        say(n.tradePut(v.tid, lines, side));
    } else if (kind === 'num') { var l = lines[arg.i]; if (!l) return; if (!(arg.n > 0)) lines.splice(arg.i, 1); else if (l.key !== undefined) l.amt = arg.n; else l.qty = Math.floor(arg.n); say(n.tradePut(v.tid, lines, side)); }
    else if (kind === 'drop') { lines.splice(arg, 1); say(n.tradePut(v.tid, lines, side)); }
    else if (kind === 'ok') say(n.tradeConfirm(v.tid, arg === true, side));
    else if (kind === 'into' && n.tradeInto) say(n.tradeInto(v.tid, arg.fid, arg.row, side));
}
function twRender() {
    var v = _tw.view, body = document.getElementById('tradeBody'); if (!body) return;
    if (!v) { twShow(false); return; }
    var n = twNet(), off = { a: [], b: [] }; twMine(v).forEach(function(sd) { off[sd] = n && n.tradeOffer ? n.tradeOffer(v[sd].charId, twGm()) : []; });
    var t = document.getElementById('tradeTitle'); if (t) t.textContent = 'Trade: ' + v.a.name + ' and ' + v.b.name;
    twDraw(document, body, v, off, twAct);
    twShow(true);
}
// the side asked answers by a question; the GM's ask also waits in the bell until it is answered
function twAsk(v) {
    if (_tw.asked[v.tid]) return; _tw.asked[v.tid] = 1;
    showConfirm(v.a.name + ' asks to trade with ' + v.b.name + '.', function(ans) { var n = twNet(); if (n && n.tradeAnswer) { var r = n.tradeAnswer(v.tid, ans === true); if (r && r.error && typeof toast === 'function') toast(r.error); } }, { yes: 'Trade', noEnter: true });
}
function twOn(e) {
    var v = e && e.detail; if (!v || typeof v.tid !== 'string') return;
    if (v.status === 'done' || v.status === 'cancelled') {
        if (_tw.view && _tw.view.tid === v.tid) { _tw.view = null; twShow(false); }
        delete _tw.asked[v.tid]; if (v.msg && typeof toast === 'function') toast(v.msg);
        var nx = twNet() && twNet().tradeNow ? twNet().tradeNow() : null; if (nx) { _tw.view = nx; twRender(); }
        return;
    }
    if (v.status === 'asking' && v.you === 'b') { twAsk(v); return; }
    _tw.view = v; twRender();
}
// the right-click rows: a player for the character they play on this map, the GM as the one NPC selected
function mineOn(map, sel) {
    var n = twNet(); if (!n || !map || !Array.isArray(map.whiteboard)) return null;
    var own = function(w) { return w && w.isChar && w.charId && !w.waiting && w.ownerId === n.myId; };
    if (sel && own(sel)) return sel;
    return map.whiteboard.find(own) || null;
}
function canAsk(tok, map, sel) {   // { from, to, label } or null
    var n = twNet(); if (!n || window.wpStream || !tok || !tok.isChar || !tok.charId || tok.hidden || tok.waiting) return null;
    if (n.active && n.role === 'client') {
        if (tok.ownerId === n.myId) return null; var me = mineOn(map, sel); if (!me || me.charId === tok.charId) return null;
        return { from: me.charId, to: tok.charId, label: 'Trade with ' + (tok.charName || tok.name || 'them') + '…' };
    }
    if (!sel || sel === tok || !sel.isChar || !sel.charId || sel.charId === tok.charId || sel.waiting) return null;
    var ch = window.wpSheets && window.wpSheets.charById ? window.wpSheets.charById(sel.charId) : null; if (!ch || !(ch.npc || !ch.ownerId)) return null;
    return { from: sel.charId, to: tok.charId, label: 'Trade as ' + (ch.name || sel.name || 'NPC') + ' with ' + (tok.charName || tok.name || 'them') + '…' };
}
function ask(from, to) { var n = twNet(); if (!n || !n.tradeAsk) return; var r = n.tradeAsk(from, to); if (r && r.error && typeof toast === 'function') toast(r.error); }

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    window.addEventListener('wptrade', twOn);
    var nk = window.wpNoticeKinds = window.wpNoticeKinds || {};
    nk.trade = { label: 'Answer', still: function(tid) { var n = twNet(), vs = n && n.tradeViews ? n.tradeViews() : []; return vs.some(function(v) { return v.tid === tid && v.status === 'asking'; }); },
        run: function(tid) { var n = twNet(), v = (n && n.tradeViews ? n.tradeViews() : []).filter(function(x) { return x.tid === tid; })[0]; if (v) { delete _tw.asked[tid]; twAsk(v); } } };
    var wire = function() {
        var cl = document.getElementById('tradeCloseBtn'), ca = document.getElementById('tradeCancelBtn');
        var end = function() { var v = _tw.view; if (!v) { twShow(false); return; } showConfirm('End this trade for both sides?', function(ans) { if (ans === true && twNet()) { var r = twNet().tradeCancel(v.tid); if (r && r.error && typeof toast === 'function') toast(r.error); } }); };
        if (cl) cl.addEventListener('click', end); if (ca) ca.addEventListener('click', end);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
    window.wpTrade = { ask: ask, canAsk: canAsk, mineOn: mineOn, render: twRender, draw: twDraw, choices: twChoices };
}
export { twDraw, twChoices, twOffer, canAsk };
