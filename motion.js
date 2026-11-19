/* 413 Growth motion layer (v3.1, Nov 14, 2026). No libraries.
   Everything here is extra: with JS off, or with "reduce motion" on, the page is complete and still.
   1. scroll progress bar        5. typing dots in the hero phone, replayed when it comes back into view
   2. hero headline word reveal  6. count-ups (calculator total, prices)
   3. the big 413 draws itself   7. work cards: tilt + shine, cursor spotlight on dark bands, magnetic buttons
   4. floating badges by phone   8. before/after handle sweeps once to show it can be dragged */
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  document.documentElement.classList.add('has-motion-js');
  if (reduce) return;
  document.documentElement.classList.add('motion');

  /* 1. Scroll progress bar under the header */
  var bar = document.createElement('div');
  bar.className = 'progress'; bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);
  var ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      var h = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, scrollY / h) : 0) + ')';
      ticking = false;
    });
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* 2. Hero headline: each word rises out of a mask, one after another */
  $$('.hero h1').forEach(function (h1) {
    var i = 0;
    (function wrap(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var o = document.createElement('span'); o.className = 'w';
            var inner = document.createElement('span'); inner.className = 'w__i'; inner.textContent = part;
            inner.style.animationDelay = (0.08 + i++ * 0.07) + 's';
            o.appendChild(inner); frag.appendChild(o);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.classList.contains('pop')) {
          n.classList.add('pop--late'); n.style.animationDelay = (0.2 + i * 0.07) + 's';
        } else if (n.nodeType === 1) { wrap(n); }
      });
    })(h1);
    h1.classList.add('split');
  });

  /* 3. The big outlined 413 behind the hero draws itself, then glows faintly */
  $$('.hero').forEach(function (hero) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'hero__413'); svg.setAttribute('viewBox', '0 0 1000 560'); svg.setAttribute('aria-hidden', 'true');
    var t = document.createElementNS(ns, 'text');
    t.setAttribute('x', '50%'); t.setAttribute('y', '86%'); t.setAttribute('text-anchor', 'middle'); t.textContent = '413';
    svg.appendChild(t); hero.insertBefore(svg, hero.firstChild); hero.classList.add('hero--drawn');
  });

  /* 4. Little badges that drift beside the hero phone (homepage hero only) */
  $$('.hero .phone-wrap').forEach(function (wrap) {
    [['Texted back in 38 sec', 'b1'], ['Job booked', 'b2'], ['No missed call left behind', 'b3']].forEach(function (b) {
      var s = document.createElement('span'); s.className = 'float-badge ' + b[1]; s.setAttribute('aria-hidden', 'true'); s.textContent = b[0];
      wrap.appendChild(s);
    });
  });

  /* 5. Phone conversation: typing dots before each message; replays when the phone scrolls back into view */
  $$('.phone__screen:not(.story__screen)').forEach(function (screen) {
    var items = $$(':scope > *', screen);
    if (!items.length) return;
    screen.classList.add('scripted');
    var timers = [];
    function typing(side) {
      var t = document.createElement('p'); t.className = 'typing ' + side; t.setAttribute('aria-hidden', 'true');
      t.innerHTML = '<i></i><i></i><i></i>'; return t;
    }
    function play() {
      timers.forEach(clearTimeout); timers = [];
      $$('.typing', screen).forEach(function (t) { t.remove(); });
      items.forEach(function (el) { el.classList.remove('shown'); });
      var at = 350;
      items.forEach(function (el) {
        var isBubble = el.classList.contains('bubble');
        if (isBubble) {
          var side = el.classList.contains('in') ? 'in' : 'out';
          var dots = typing(side);
          timers.push(setTimeout(function () { screen.insertBefore(dots, el); }, at));
          at += side === 'in' ? 1100 : 750;
          timers.push(setTimeout(function () { dots.remove(); el.classList.add('shown'); }, at));
        } else {
          timers.push(setTimeout(function () { el.classList.add('shown'); }, at));
        }
        at += isBubble ? 500 : 450;
      });
    }
    var seen = false;
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting && !seen) { seen = true; play(); }
        if (!e.isIntersecting && seen && e.boundingClientRect.top > innerHeight) { seen = false; }
      });
    }, { threshold: 0.45 }).observe(screen);
  });

  /* 6. Count-ups. Calculator: the yearly total tweens to its new value. Prices count up once on view. */
  function tween(el, from, to, ms, fmt) {
    var start = performance.now();
    (function step(now) {
      var k = Math.min(1, (now - start) / ms), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(from + (to - from) * e);
      if (k < 1) requestAnimationFrame(step);
    })(start);
  }
  var money = function (n) { return '$' + Math.round(n).toLocaleString('en-US'); };
  var year = document.getElementById('o-year');
  if (year) {
    /* The calculator writes the new total; we notice, and animate from what's on screen to it.
       Our own frames are recognised by value, so they don't retrigger this. */
    var parse = function () { return parseInt(year.textContent.replace(/\D/g, ''), 10) || 0; };
    var shown = parse(), written = shown, raf = 0, box = year.closest('.calc__result');
    new MutationObserver(function () {
      var target = parse();
      if (target === written) return;
      var from = shown, t0 = performance.now();
      cancelAnimationFrame(raf);
      box.classList.remove('bump'); void box.offsetWidth; box.classList.add('bump');
      (function step(now) {
        var k = Math.min(1, (now - t0) / 420), e = 1 - Math.pow(1 - k, 3);
        shown = Math.round(from + (target - from) * e); written = shown;
        year.textContent = money(shown);
        if (k < 1) raf = requestAnimationFrame(step);
      })(t0);
    }).observe(year, { childList: true, characterData: true, subtree: true });
  }
  var priceIO = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      priceIO.unobserve(e.target);
      var node = e.target.firstChild, m = node && node.nodeType === 3 && node.textContent.match(/\$(\d[\d,]*)/);
      if (!m) return;
      var to = parseInt(m[1].replace(/,/g, ''), 10), rest = node.textContent.slice(node.textContent.indexOf(m[0]) + m[0].length);
      tween({ set textContent(v) { node.textContent = v + rest; } }, 0, to, 900, money);
    });
  }, { threshold: 0.6 });
  $$('.plan__price').forEach(function (p) { priceIO.observe(p); });

  /* 7a. Work cards: tilt toward the cursor, with a moving shine */
  if (finePointer) {
    $$('.work__card, .case__desk').forEach(function (card) {
      var shot = card.classList.contains('case__desk') ? card : card.querySelector('.work__shot');
      if (!shot) return;
      shot.classList.add('tilt');
      card.addEventListener('pointermove', function (ev) {
        var r = shot.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width - 0.5, y = (ev.clientY - r.top) / r.height - 0.5;
        shot.style.setProperty('--rx', (-y * 7).toFixed(2) + 'deg');
        shot.style.setProperty('--ry', (x * 9).toFixed(2) + 'deg');
        shot.style.setProperty('--sx', ((x + 0.5) * 100).toFixed(1) + '%');
        shot.style.setProperty('--sy', ((y + 0.5) * 100).toFixed(1) + '%');
      });
      card.addEventListener('pointerleave', function () { shot.style.setProperty('--rx', '0deg'); shot.style.setProperty('--ry', '0deg'); });
    });

    /* 7b. A soft spotlight follows the cursor on the dark bands */
    $$('.hero, .stage, .deep, .work, .pilot').forEach(function (band) {
      band.classList.add('spot');
      var glow = document.createElement('span'); glow.className = 'spotlight'; glow.setAttribute('aria-hidden', 'true');
      band.insertBefore(glow, band.firstChild);
      band.addEventListener('pointermove', function (ev) {
        var r = band.getBoundingClientRect();
        band.style.setProperty('--mx', (ev.clientX - r.left) + 'px');
        band.style.setProperty('--my', (ev.clientY - r.top) + 'px');
      });
    });

    /* 7c. Main buttons lean a little toward the cursor */
    $$('.btn--pop').forEach(function (b) {
      if (b.closest('.callbar') || b.classList.contains('btn--block')) return;
      b.addEventListener('pointermove', function (ev) {
        var r = b.getBoundingClientRect();
        b.style.transform = 'translate(' + ((ev.clientX - r.left - r.width / 2) * 0.3).toFixed(1) + 'px,' + ((ev.clientY - r.top - r.height / 2) * 0.35).toFixed(1) + 'px)';
      });
      b.addEventListener('pointerleave', function () { b.style.transform = ''; });
    });
  }

  /* 8. Before/after: the handle sweeps once the first time it's on screen, unless someone grabs it first */
  $$('.ba__frame').forEach(function (f) {
    var r = f.querySelector('.ba__range'), touched = false;
    ['pointerdown', 'keydown', 'focus'].forEach(function (ev) { r.addEventListener(ev, function () { touched = true; }); });
    var io = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return; io.disconnect();
      var keys = [[0, 50], [700, 22], [1500, 80], [2300, 50]], t0 = performance.now();
      (function step(now) {
        if (touched) return;
        var t = now - t0, v = 50;
        for (var i = 1; i < keys.length; i++) {
          if (t <= keys[i][0]) { var a = keys[i - 1], b = keys[i], k = (t - a[0]) / (b[0] - a[0]); k = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; v = a[1] + (b[1] - a[1]) * k; break; }
        }
        r.value = Math.round(v); r.dispatchEvent(new Event('input'));
        if (t < keys[keys.length - 1][0]) requestAnimationFrame(step);
      })(t0);
    }, { threshold: 0.6 });
    io.observe(f);
  });
})();
