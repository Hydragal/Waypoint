/* A page of plain objects for voice chat (voice.js): elements made by name and text nodes, stub peer connections as an engine shapes them,
   a stub microphone and a clock, and voice.js loaded whole on them with its import read from the real voicecore and its internals handed
   back. Required by tools/voicecheck.js and tools/sinkcheck.js; not a suite. */
'use strict';
const path = require('path'), fs = require('fs');
const read = f => fs.readFileSync(path.join(__dirname, '..', 'system', 'app', f), 'utf8').replace(/\r\n/g, '\n');
/* ---------- a page of plain objects: elements made by name and text nodes, and nothing that reads markup ---------- */
function mkPage(world) {
    const els = {};
    const mkEl = (tag) => {
        const e = { tag: String(tag).toUpperCase(), kids: [], style: {}, attrs: {}, dataset: {}, className: '', title: '', type: '', checked: false, value: '', disabled: false, L: {}, parent: null, _text: '' };
        e.classList = { toggle(c, on) { const s = new Set(e.className.split(' ').filter(Boolean)); if (on === undefined ? !s.has(c) : on) s.add(c); else s.delete(c); e.className = [...s].join(' '); return s.has(c); },
            contains: c => e.className.split(' ').indexOf(c) >= 0, add(c) { e.classList.toggle(c, true); }, remove(c) { e.classList.toggle(c, false); } };
        e.addEventListener = (t, f) => { (e.L[t] = e.L[t] || []).push(f); };
        e.fire = (t, ev) => { ev = Object.assign({ target: e, stopPropagation() {}, preventDefault() { this.prevented = true; } }, ev || {}); (e.L[t] || []).slice().forEach(f => f.call(e, ev)); return ev; };
        e.appendChild = c => { e.kids.push(c); c.parent = e; return c; };
        e.setAttribute = (k, v) => { e.attrs[k] = String(v); };
        e.getAttribute = k => (Object.prototype.hasOwnProperty.call(e.attrs, k) ? e.attrs[k] : null);
        Object.defineProperty(e, 'textContent', { get() { return e._text + e.kids.map(k => (k.nodeType === 3 ? k.text : k.textContent)).join(''); }, set(v) { e.kids = []; e._text = String(v); } });
        Object.defineProperty(e, 'innerHTML', { get() { return ''; }, set() { world.markup++; } });
        Object.defineProperty(e, 'outerHTML', { set() { world.markup++; } });
        e.insertAdjacentHTML = () => { world.markup++; };
        e.querySelectorAll = sel => { const want = sel.replace(/^\./, ''), out = []; const walk = n => n.kids.forEach(k => { if (k.nodeType !== 3) { if (k.className.split(' ').indexOf(want) >= 0) out.push(k); walk(k); } }); walk(e); return out; };
        e.closest = sel => { for (let p = e; p; p = p.parent) if (sel.charAt(0) === '#' && p.id === sel.slice(1)) return p; return null; };
        e.getBoundingClientRect = () => ({ left: 300, top: 4, right: 328, bottom: 30, width: 28, height: 26 });
        e.click = () => e.fire('click');
        world.made.push(e);
        return e;
    };
    ['voiceInd', 'voicePop', 'voiceNow', 'voiceBody'].forEach(id => { els[id] = mkEl(id === 'voiceInd' ? 'button' : 'div'); els[id].id = id; });
    els.voicePop.style.display = 'none'; els.voiceInd.style.display = 'none';
    els.voicePop.appendChild(els.voiceNow); els.voicePop.appendChild(els.voiceBody);
    const doc = { L: {}, getElementById: id => (Object.prototype.hasOwnProperty.call(els, id) ? els[id] : null), createElement: mkEl,
        createElementNS: (ns, tag) => { const e = mkEl(tag); e.ns = ns; return e; }, createTextNode: t => ({ nodeType: 3, text: String(t) }),
        addEventListener(t, f, c) { (doc.L[t] = doc.L[t] || []).push(f); }, write() { world.markup++; } };
    return { doc, els, mkEl };
}

/* ---------- stub peer connections, as an engine shapes them ---------- */
function mkRTC(world) {
    let n = 0;
    return class PC {
        constructor(cfg) { this.cfg = cfg; this.tx = []; this.closed = false; this.localDescription = null; this.remoteDescription = null; this.connectionState = 'new'; this.cands = []; this.offers = 0; world.pcs.push(this); }
        addTransceiver(what, init) {
            const self = this, tx = { mid: null, direction: init && init.direction, sender: { track: typeof what === 'string' ? null : what, params: null, replaceTrack(t) { this.track = t; return Promise.resolve(); }, getParameters() { return { encodings: [{}] }; }, setParameters(p) { this.params = p; return Promise.resolve(); } },
                receiver: { track: { kind: 'audio', id: 'rx' + (++n) } } };
            if (self.closed) throw new Error('closed');
            this.tx.push(tx); return tx;
        }
        getTransceivers() { return this.tx; }
        createOffer() { this.offers++; return Promise.resolve({ type: 'offer', sdp: 'v=0\r\nlines=' + this.tx.length + '\r\n' }); }
        setLocalDescription(d) { this.localDescription = d; this.tx.forEach((t, i) => { if (t.mid === null) t.mid = String(i); }); return Promise.resolve(); }
        setRemoteDescription(d) {
            if (world.failRemote) return Promise.reject(new Error('refused'));
            this.remoteDescription = d;
            if (d.type === 'offer') { const m = /lines=(\d+)/.exec(d.sdp), want = m ? +m[1] : 1; while (this.tx.length < want) { const tx = this.addTransceiver('audio', { direction: 'recvonly' }); tx.mid = String(this.tx.length - 1); } }
            return Promise.resolve();
        }
        createAnswer() { return Promise.resolve({ type: 'answer', sdp: 'v=0\r\nanswer\r\n' }); }
        addIceCandidate(c) { this.cands.push(c); return Promise.resolve(); }
        close() { this.closed = true; this.connectionState = 'closed'; }
        state(s) { this.connectionState = s; if (this.onconnectionstatechange) this.onconnectionstatechange(); }
    };
}

/* ---------- voice.js, loaded whole: its import read from the real voicecore, its internals handed back ---------- */
const voiceSrc = read('scripts/voice.js');
function loadVoice(core, o) {
    o = o || {};
    const world = { pcs: [], gum: [], markup: 0, made: [], timers: [], intervals: [], winL: {}, clock: 1000000, audios: [], sent: [], store: {}, failRemote: false };
    const P = mkPage(world);
    const store = { getItem: k => (Object.prototype.hasOwnProperty.call(world.store, k) ? world.store[k] : null), setItem: (k, v) => { world.store[k] = String(v); }, removeItem: k => { delete world.store[k]; } };
    if (o.profile) world.store.wp_profile = JSON.stringify(o.profile);
    const track = () => ({ kind: 'audio', enabled: true, stopped: false, L: {}, stop() { this.stopped = true; }, addEventListener(t, f) { this.L[t] = f; } });
    const stream = () => { const t = track(); return { t, getAudioTracks: () => [t], getTracks: () => [t] }; };
    const nav = { mediaDevices: { getUserMedia: c => { world.gum.push(c); if (o.noMic) return Promise.reject(Object.assign(new Error('no'), { name: 'NotAllowedError' })); const s = stream(); world.lastMic = s; return Promise.resolve(s); }, enumerateDevices: () => Promise.resolve([]), addEventListener() {} } };
    class Audio { constructor() { this.muted = false; this.volume = 1; this.srcObject = null; this.paused = true; world.audios.push(this); } play() { this.paused = false; return Promise.resolve(); } pause() { this.paused = true; } }
    class MediaStream { constructor(ts) { this.ts = ts; } getTracks() { return this.ts; } }
    const conns = [];
    const net = Object.assign({ active: true, role: o.role || 'host', myId: o.role === 'client' ? 'u_me' : 'u_gm', conns, roster: Object.create(null), foreign: true, syncedPeer: 'gm-peer', stream: false, rtcConfig: () => ({ iceServers: [{ urls: 'stun:stun.example:3478' }] }) }, o.net || {});
    const conn = (peer, pid, name) => { const c = { peer, open: true, sent: [], send(m) { const copy = JSON.parse(JSON.stringify(m)); c.sent.push(copy); world.sent.push([peer, copy]); } }; conns.push(c); if (pid) net.roster[peer] = { id: pid, name }; return c; };
    const win = { wpNet: net, wpDiceCore: o.noLimit ? undefined : o.dice, innerWidth: 1200, addEventListener(t, f) { (world.winL[t] = world.winL[t] || []).push(f); } };
    const Dt = { now: () => world.clock };
    const timers = { setTimeout: (f, ms) => { const t = { f, ms, on: true }; world.timers.push(t); return t; }, clearTimeout: t => { if (t) t.on = false; }, setInterval: (f, ms) => { world.intervals.push({ f, ms }); return world.intervals.length; }, clearInterval() {} };
    const NAMES = Object.keys(core).filter(k => k !== 'default');
    const body = voiceSrc.replace(/^import \{[^}]*\} from '\.\/voicecore\.js';$/m, 'var { ' + NAMES.join(', ') + ' } = __core;');
    if (body === voiceSrc) throw new Error('voicecheck: the import line of voice.js was not found');
    const api = new Function('window', 'document', 'navigator', 'localStorage', 'crypto', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'RTCPeerConnection', 'Audio', 'MediaStream', 'Date', '__core', '"use strict";\n' + body +
        '\nreturn { me: me, prefs: prefs, hub: hub, up: function() { return up; }, voices: voices, fromHost: fromHost, fromPlayer: fromPlayer, connGone: connGone, join: join, leave: leave, setMuted: setMuted, setDeaf: setDeaf, setVol: setVol, setPeerMute: setPeerMute, setMode: setMode, escape: escape, popOpen: popOpen, binding: function(v) { if (v !== undefined) binding = v; return binding; }, members: members };')(
        win, P.doc, nav, store, globalThis.crypto, timers.setTimeout, timers.clearTimeout, timers.setInterval, timers.clearInterval, mkRTC(world), Audio, MediaStream, Dt, core);
    const key = ev => { (world.winL.keydown || []).forEach(f => f(Object.assign({ code: '', key: '', ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, repeat: false, target: { tagName: 'DIV' }, preventDefault() { this.prevented = true; }, stopPropagation() {} }, ev))); };
    return { api, world, win, net, conn, P, els: P.els, key, fire: () => { const t = world.timers.filter(x => x.on); t.forEach(x => { x.on = false; x.f(); }); return t.length; } };
}

module.exports = { loadVoice, voiceSrc, mkPage, mkRTC };
