/* The dice drawings (1.5.8, backlog 149) — pure, importing nothing. The owner, 2026-10-17: "lets make a full assortment of dice icon SVGs
   that GM can choose from for their character sheet field rolls and general rolls"; 2026-10-25: "implement the custom dice icons for the
   character sheet where there are currently emoji dice icons", and of the drawings on docs/sheets/dice-icons-sheet.html, the face (A) for
   1d6, three faces (C) for 3d6 and the rest of the set: "those look pretty good". Line drawings in the toolbar's own style (style.css
   .ico): every path is a constant below, as the sheet drew it on the 24 by 24 grid, and a pip is a stroke of no length that the class
   ico-pip draws round and wider. lookcheck pins the set by its hash: a changed or a new drawing is shown to the owner first.
   dieNode draws one with createElementNS (never markup); dieSvg writes the same drawing as markup from these constants alone, for a page
   that writes its rows as markup. Which die a roll shows is systemcore's to judge (dieOf, cleanDie); a name this set lacks draws the d6.
   Published as window.wpDieIcons. */
'use strict';

var SVG_NS = 'http://www.w3.org/2000/svg';
var FACE = 'M7 4h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z';
var COIN = 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z';
function P(d) { return Object.freeze({ d: d }); }
function PIP(d) { return Object.freeze({ d: d, pip: true }); }
// The order is the System editor's list and systemcore's DIE_NAMES (systemcheck holds the two together)
var DIE_ICONS = Object.freeze({
    d2: Object.freeze([P(COIN), P('M12 6.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z')]),
    d4: Object.freeze([P('M12 3L21 19.5H3z'), P('M12 3v10.5M3 19.5l9-6 9 6')]),
    d6: Object.freeze([P(FACE), PIP('M8.5 8.5h0M12 12h0M15.5 15.5h0')]),
    '2d6': Object.freeze([P('M5 4h6a2 2 0 0 1 2 2v1.5M3 6a2 2 0 0 1 2-2M3 6v6a2 2 0 0 0 2 2h1.5'), P('M10 9.5h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z'), PIP('M5.5 7h0M11.5 13h0M15.5 17h0')]),
    '3d6': Object.freeze([P('M5 3h6a2 2 0 0 1 2 2v1.5M3 5a2 2 0 0 1 2-2M3 5v6a2 2 0 0 0 2 2h1.5'), P('M13 3h6a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-1.5'), P('M9.5 9.5h6a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z'), PIP('M5.5 6h0M17 6h0M10.8 12.5h0M14.2 17.5h0M12.5 15h0')]),
    d8: Object.freeze([P('M12 2.5L20.5 12 12 21.5 3.5 12z'), P('M3.5 12l8.5 3.5 8.5-3.5M12 2.5v13')]),
    d10: Object.freeze([P('M12 3.5l8.5 7L12 20l-8.5-9.5z'), P('M12 3.5L8.5 12l3.5 2.5 3.5-2.5zM12 14.5V20M3.5 10.5l5 1.5M20.5 10.5l-5 1.5M8.5 12l-.8 3.2M15.5 12l.8 3.2')]),
    d12: Object.freeze([P('M12 3l5.29 1.72 3.27 4.5v5.56l-3.27 4.5L12 21l-5.29-1.72-3.27-4.5V9.22l3.27-4.5z'), P('M12 7.2l4.57 3.32-1.75 5.36H9.18l-1.75-5.36z'), P('M12 7.2V3M16.57 10.52l3.99-1.3M14.82 15.88l2.47 3.4M9.18 15.88l-2.47 3.4M7.43 10.52l-3.99-1.3')]),
    d20: Object.freeze([P('M12 2.5l8.5 4.75v9.5L12 21.5l-8.5-4.75v-9.5z'), P('M12 7l5 8.5H7z'), P('M12 7V2.5M12 7l-8.5.25M12 7l8.5.25M7 15.5l-3.5 1.25M7 15.5l5 6M17 15.5l3.5 1.25M17 15.5l-5 6M7 15.5L3.5 7.25M17 15.5l3.5-8.25')]),
    d100: Object.freeze([P(COIN), P('M12 8.6l3.2 2.3-1.2 3.8h-4l-1.2-3.8z'), P('M12 8.6V3.3M15.2 10.9l5.3-1.7M14 14.7l3.3 4.5M10 14.7l-3.3 4.5M8.8 10.9l-5.3-1.7'), P('M6.4 5.8l2.4 5.1M17.6 5.8l-2.4 5.1M20.9 13.5l-6.9 1.2M3.1 13.5l6.9 1.2M12 20.9v-6.2')]),
    dF: Object.freeze([P(FACE), P('M12 8v8M8 12h8')]),
    '4dF': Object.freeze([P('M4 3h6a1.5 1.5 0 0 1 1.5 1.5v6A1.5 1.5 0 0 1 10 12H4a1.5 1.5 0 0 1-1.5-1.5v-6A1.5 1.5 0 0 1 4 3z'), P('M14 3h6a1.5 1.5 0 0 1 1.5 1.5v6A1.5 1.5 0 0 1 20 12h-6a1.5 1.5 0 0 1-1.5-1.5v-6A1.5 1.5 0 0 1 14 3z'), P('M4 13.5h6a1.5 1.5 0 0 1 1.5 1.5v6A1.5 1.5 0 0 1 10 22.5H4A1.5 1.5 0 0 1 2.5 21v-6A1.5 1.5 0 0 1 4 13.5z'), P('M14 13.5h6a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-1.5 1.5h-6a1.5 1.5 0 0 1-1.5-1.5v-6a1.5 1.5 0 0 1 1.5-1.5z'), P('M7 5.5v4M5 7.5h4M15 7.5h4M17 16v4M15 18h4')])
});
// The words the System editor's list gives each, in the same order
var DIE_LABELS = Object.freeze({ d2: 'Coin (d2)', d4: 'd4', d6: 'd6', '2d6': '2d6', '3d6': '3d6', d8: 'd8', d10: 'd10', d12: 'd12', d20: 'd20', d100: 'd100', dF: 'Fate die (dF)', '4dF': 'Four Fate dice (4dF)' });
var DIE_DEFAULT = 'd6';
function partsOf(name) { return typeof name === 'string' && Object.prototype.hasOwnProperty.call(DIE_ICONS, name) ? DIE_ICONS[name] : DIE_ICONS[DIE_DEFAULT]; }
var CLS_RE = /^[a-z][a-z0-9-]{0,40}$/;
function clsOf(cls) { return 'ico ico-die' + (typeof cls === 'string' && CLS_RE.test(cls) ? ' ' + cls : ''); }
// One die drawn as an svg element of doc, made by name: its class (ico ico-die, and one plain class name of the caller's), its grid, its paths
function dieNode(doc, name, cls) {
    var svg = doc.createElementNS(SVG_NS, 'svg'); svg.setAttribute('class', clsOf(cls)); svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
    partsOf(name).forEach(function(p) { var e = doc.createElementNS(SVG_NS, 'path'); if (p.pip) e.setAttribute('class', 'ico-pip'); e.setAttribute('d', p.d); svg.appendChild(e); });
    return svg;
}
// The same drawing as markup, written from the constants above alone (the name only picks one of them)
function dieSvg(name, cls) {
    return '<svg class="' + clsOf(cls) + '" viewBox="0 0 24 24" aria-hidden="true">' + partsOf(name).map(function(p) { return '<path' + (p.pip ? ' class="ico-pip"' : '') + ' d="' + p.d + '"/>'; }).join('') + '</svg>';
}
var API = Object.freeze({ DIE_ICONS: DIE_ICONS, DIE_LABELS: DIE_LABELS, DIE_DEFAULT: DIE_DEFAULT, dieNode: dieNode, dieSvg: dieSvg });
if (typeof window !== 'undefined') window.wpDieIcons = API;
export { DIE_ICONS, DIE_LABELS, DIE_DEFAULT, dieNode, dieSvg };
