/* 413 Growth scroll engine (v3.3, Nov 14, 2026). Techniques studied from award-winning sites (Lenis smooth
   scroll, velocity marquees, word light-up, line masks, clip reveals, push-back handoffs, odometers); our own code.
   Needs nothing; uses Lenis (smooth inertial scrolling) when it loaded. With "reduce motion" on, it does nothing
   and the page shows every section complete and still.

   Scenes:  A. statement that lights up word by word (pinned)     D. velocity marquees (town ticker, big type)
            B. missed-call story (pinned phone, odometer total)   E. pilot opens as a circle; the section above pushes back
            C. Our work film strip (desktop, clip reveals, skew)   F. section headings reveal word by word on arrival */
(function () {
  'use strict';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var root = document.documentElement;
  root.classList.add('scrollfx');

  /* Smooth inertial scrolling. Phones keep their own native scrolling (Lenis leaves touch alone by default). */
  var lenis = null;
  if (window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.09, wheelMultiplier: 1 });
    root.style.scrollBehavior = 'auto';
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href'); if (id.length < 2) return;
        var t = document.querySelector(id); if (!t) return;
        e.preventDefault(); lenis.scrollTo(t, { offset: -70, duration: 1.4 });
        history.replaceState(null, '', id);
      });
    });
  }

  /* F. Section headings: each word rises out of a mask when the heading comes into view */
  function splitWords(el) {
    var i = 0;
    (function wrap(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var o = document.createElement('span'); o.className = 'wm';
            var inner = document.createElement('span'); inner.className = 'wm__i'; inner.textContent = part;
            inner.style.setProperty('--i', i++);
            o.appendChild(inner); frag.appendChild(o);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1 && !n.classList.contains('pop')) { wrap(n); }
      });
    })(el);
    return i;
  }
  var headIO = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('words-in'); headIO.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -18% 0px' });
  $$('.section .head h2, .case h2, .story h2, .pilot h2, #book h2, .check-grid h2, .ba h2').forEach(function (h) {
    if (h.closest('.hero')) return;
    splitWords(h); h.classList.add('words'); headIO.observe(h);
  });

  /* A. The statement: words go from faint to full as you scroll; <em> words end in brass */
  var statement = document.querySelector('.statement');
  var sWords = [];
  if (statement) {
    var txt = statement.querySelector('.statement__text');
    (function wrap(node, brass) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var w = document.createElement('span'); w.className = 'lw' + (brass ? ' lw--b' : ''); w.textContent = part;
            frag.appendChild(w); sWords.push(w);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1) { wrap(n, brass || n.tagName === 'EM'); }
      });
    })(txt, false);
    statement.classList.add('statement--live');
  }

  /* B. The story: an odometer for the total */
  var story = document.querySelector('.story'), steps = [], fill = null, total = null;
  if (story) {
    story.classList.add('story--live');
    steps = $$('.story__steps li', story); fill = story.querySelector('.story__bar i'); total = story.querySelector('.story__total strong');
    var digits = total.textContent.trim();                      // "$350"
    total.setAttribute('aria-label', digits); total.textContent = '';
    digits.split('').forEach(function (ch, k) {
      if (!/\d/.test(ch)) { var s = document.createElement('span'); s.textContent = ch; s.setAttribute('aria-hidden', 'true'); total.appendChild(s); return; }
      var d = document.createElement('span'); d.className = 'odo'; d.setAttribute('aria-hidden', 'true');
      var reel = document.createElement('span'); reel.className = 'odo__reel';
      for (var n = 0; n <= 10 + +ch; n++) { var c = document.createElement('span'); c.textContent = n % 10; reel.appendChild(c); }
      reel.style.setProperty('--n', 10 + +ch); reel.style.setProperty('--d', (k * 0.12) + 's');
      d.appendChild(reel); total.appendChild(d);
    });
  }

  /* C. Film strip (desktop) */
  var work = document.querySelector('.work'), film = false;
  function filmCheck() {
    var want = !!work && innerWidth >= 960 && work.querySelectorAll('.work__card').length > 2;
    if (want === film) return;
    film = want; work.classList.toggle('work--film', film);
    if (!film) {
      work.querySelector('.work__rail').style.transform = '';
      $$('.work__card', work).forEach(function (c) {
        c.style.transform = ''; c.style.opacity = '';
        var sh = c.querySelector('.work__shot'); if (sh) sh.style.clipPath = '';
        var i = c.querySelector('img'); if (i) { i.style.objectPosition = ''; i.style.transform = ''; }
      });
    }
  }
  filmCheck();

  /* D. Velocity marquees: always drifting, faster and skewed when you scroll fast */
  var marquees = [];
  function addMarquee(row, mover, periodEl, dir, base) {
    marquees.push({ row: row, mover: mover, periodEl: periodEl, dir: dir, base: base, x: 0, skew: 0, period: 0 });
  }
  var ticker = document.querySelector('.ticker');
  if (ticker) { var tt = ticker.querySelector('.ticker__track'); addMarquee(ticker, tt, tt.querySelector('ul'), 1, 0.45); ticker.classList.add('ticker--js'); }
  $$('.bigtype__row').forEach(function (row, k) {
    var span = row.querySelector('span');
    span.innerHTML = span.innerHTML + span.innerHTML;          // two copies so it can loop forever
    addMarquee(row, span, null, k ? -1 : 1, 0.6);
  });
  var big = document.querySelector('.bigtype');
  if (big) big.classList.add('bigtype--js');
  function measure() {
    marquees.forEach(function (m) { m.period = m.periodEl ? m.periodEl.getBoundingClientRect().width : m.mover.scrollWidth / 2; });
  }
  measure();
  addEventListener('resize', function () { filmCheck(); measure(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

  var pilot = document.querySelector('.pilot');
  var lastY = scrollY, vel = 0;

  function frame(time) {
    if (lenis) lenis.raf(time);
    var y = lenis ? lenis.scroll : scrollY;
    var v = lenis ? lenis.velocity : (y - lastY);
    lastY = y; vel += (v - vel) * 0.2;
    var vh = innerHeight, vw = innerWidth;

    /* D */
    marquees.forEach(function (m) {
      if (!m.period) return;
      var r = m.row.getBoundingClientRect(); if (r.bottom < -50 || r.top > vh + 50) return;
      var speed = m.base + Math.min(14, Math.abs(vel) * 0.32);
      var dir = m.dir * (vel < -0.5 ? -1 : 1);
      m.x -= speed * dir;
      if (m.x <= -m.period) m.x += m.period; if (m.x > 0) m.x -= m.period;
      var target = clamp(-vel * 0.35, -8, 8); m.skew += (target - m.skew) * 0.12;
      m.mover.style.transform = 'translate3d(' + m.x.toFixed(1) + 'px,0,0) skewX(' + m.skew.toFixed(2) + 'deg)';
      if (m.row.classList.contains('bigtype__row')) m.row.style.setProperty('--heat', Math.min(1, Math.abs(m.skew) / 6).toFixed(2));
    });

    /* A */
    if (statement) {
      var sr = statement.getBoundingClientRect(), sp = clamp((-sr.top + vh * 0.25) / (sr.height - vh * 0.6), 0, 1), n = sWords.length;
      sWords.forEach(function (w, i) { var k = clamp(sp * (n + 2) - i, 0, 1); w.style.opacity = (0.16 + 0.84 * k).toFixed(3); w.classList.toggle('lit', k > 0.98); });
    }

    /* B */
    if (story) {
      var r = story.getBoundingClientRect(), p = clamp(-r.top / (r.height - vh), 0, 1);
      var step = Math.min(steps.length - 1, Math.floor(p * (steps.length + 0.6)));
      for (var i = 0; i < 5; i++) story.classList.toggle('at-' + i, i <= step);
      steps.forEach(function (li, j) { li.classList.toggle('on', j === step); li.classList.toggle('done', j < step); });
      if (fill) fill.style.transform = 'scaleX(' + p.toFixed(3) + ')';
      total.classList.toggle('set', step === steps.length - 1);
    }

    /* C */
    if (film) {
      var wr = work.getBoundingClientRect(), wp = clamp(-wr.top / (wr.height - vh), 0, 1);
      var track = work.querySelector('.work__rail'), shift = Math.max(0, track.scrollWidth - track.clientWidth);
      var tskew = clamp(-vel * 0.12, -4, 4);
      track.style.transform = 'translate3d(' + (-wp * shift).toFixed(1) + 'px,0,0) skewX(' + tskew.toFixed(2) + 'deg)';
      $$('.work__card', work).forEach(function (c) {
        var cr = c.getBoundingClientRect(), d = (cr.left + cr.width / 2 - vw / 2) / vw;
        var enter = clamp((vw - cr.left) / (vw * 0.45), 0, 1), e = 1 - Math.pow(1 - enter, 3);
        c.style.transform = 'scale(' + (1 - Math.min(0.12, Math.abs(d) * 0.2)).toFixed(3) + ')';
        c.style.opacity = (1 - Math.min(0.5, Math.abs(d) * 0.85)).toFixed(2);
        c.style.setProperty('--rule', (clamp(1 - Math.abs(d) * 2.2, 0, 1) * 100).toFixed(0) + '%');
        var sh = c.querySelector('.work__shot');
        if (sh) sh.style.clipPath = e >= 0.999 ? 'inset(0 round 14px)' : 'inset(' + ((1 - e) * 14).toFixed(2) + '% ' + ((1 - e) * 10).toFixed(2) + '% round ' + (14 + (1 - e) * 18).toFixed(0) + 'px)';
        var img = c.querySelector('img');
        if (img) { img.style.objectPosition = '50% ' + (clamp(-cr.left / cr.width, 0, 1) * 100).toFixed(1) + '%'; img.style.transform = 'scale(' + (1.18 - 0.18 * e).toFixed(3) + ')'; }
      });
    }

    /* E */
    if (pilot) {
      var pr = pilot.getBoundingClientRect(), kk = clamp((vh - pr.top) / (vh * 1.05), 0, 1);
      pilot.style.clipPath = kk >= 1 ? 'none' : 'circle(' + (3 + kk * kk * 115).toFixed(1) + '% at 50% 0%)';
      if (big) {
        var push = clamp((kk - 0.15) / 0.85, 0, 1);
        big.style.transform = 'scale(' + (1 - 0.07 * push).toFixed(3) + ')';
        big.style.filter = 'brightness(' + (1 - 0.18 * push).toFixed(3) + ')';
        big.style.borderRadius = (28 * push).toFixed(0) + 'px';
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
