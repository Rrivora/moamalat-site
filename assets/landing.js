/* شركتي — حركة صفحة المنتج.
   بلا مكتبات. وكلُّ ما هنا تحسينٌ فوق صفحةٍ تعمل بدونه:
   الشيفرة هي من يضيف `js-anim` فتُخفى العناصر استعدادًا للكشف.
   فمن عطّل JavaScript، أو فشل تحميل هذا الملفّ، يرى الصفحة كاملةً. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  // من طلب سكونًا فلا شيء يتحرّك — ولا حتى الإخفاء الابتدائيّ.
  if (reduced.matches) return;
  if (!('IntersectionObserver' in window)) return;

  root.classList.add('js-anim');

  function bail(e) {
    root.classList.remove('js-anim');
    if (window.console && console.warn) console.warn('[شركتي] تعطّلت الحركة، والصفحة تُعرض ساكنة:', e);
  }

  try {
  /* ── 1) الكشف بالتمرير، بتدرّجٍ زمنيّ للمتجاورات ── */
  var revealables = document.querySelectorAll('.rv');
  var groups = new Map();

  revealables.forEach(function (el) {
    var parent = el.parentElement;
    if (!groups.has(parent)) groups.set(parent, 0);
  });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var above = entry.boundingClientRect.bottom < 0;
      if (!entry.isIntersecting && !above) return;
      var el = entry.target;
      var parent = el.parentElement;
      var i = groups.get(parent) || 0;
      // 70ms بين كل عنصرٍ وأخيه، بسقف 5 — ما بعده يصير انتظارًا لا إيقاعًا.
      el.style.transitionDelay = Math.min(i, 5) * 70 + 'ms';
      groups.set(parent, i + 1);
      el.classList.add('in');
      io.unobserve(el);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

  revealables.forEach(function (el) { io.observe(el); });

  /* ── 2) العدّادات ── */
  function runCount(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    if (isNaN(target)) return;
    var dur = 1500, t0 = 0;

    function frame(ts) {
      if (!t0) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      // تباطؤٌ في النهاية، فيبدو كاستقرارٍ لا كتوقّف
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toLocaleString('en-US');
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = target.toLocaleString('en-US');
    }
    requestAnimationFrame(frame);
  }

  var counters = document.querySelectorAll('[data-count]');
  if (counters.length) {
    var ioCount = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        runCount(e.target);
        ioCount.unobserve(e.target);
      });
    }, { threshold: 0.5 });
    counters.forEach(function (c) { ioCount.observe(c); });
  }

  /* ── 3) ترويسةٌ تعرف أنها التصقت ── */
  var nav = document.getElementById('nav');
  if (nav) {
    var sentinel = document.createElement('div');
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.cssText = 'position:absolute;top:0;height:1px;width:1px';
    document.body.prepend(sentinel);
    new IntersectionObserver(function (e) {
      nav.classList.toggle('stuck', !e[0].isIntersecting);
    }).observe(sentinel);
  }

  /* ── 4) اختلافُ منظرٍ خفيف لهاتف البطل ──
     translate3d وحده (بلا top/margin) فيبقى العمل على الرسوميّات،
     وداخل rAF فلا يُحسب التخطيط مرّتين في الإطار الواحد. */
  var heroPhone = document.getElementById('heroPhone');
  if (heroPhone && window.innerWidth > 940) {
    var ticking = false;
    var onScroll = function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = window.scrollY;
        if (y < 900) heroPhone.style.transform = 'translate3d(0,' + (y * -0.055) + 'px,0)';
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ── 5) الرحلات: الخطوة تُضيء، والإطار يتبدّل معها ──
     دورةٌ واحدة لكل رحلة، تعمل وهي في الشاشة وتتوقّف إذا غادرتها.
     فلا مؤقّتاتٌ تدور في الخلفية على صفحةٍ لا يراها أحد. */
  document.querySelectorAll('[data-journey]').forEach(function (journey) {
    var steps = journey.querySelectorAll('[data-steps] li');
    var frames = journey.querySelectorAll('[data-frames] img');
    if (!steps.length || !frames.length) return;

    var i = 0, timer = null;

    function paint() {
      steps.forEach(function (s, n) { s.classList.toggle('on', n === i); });
      // الخطوة تسمّي إطارها بـ data-frame إن لم يكن إطارُها بترتيبها
      var named = steps[i].getAttribute('data-frame');
      var fi = Math.min(named !== null ? +named : i, frames.length - 1);
      frames.forEach(function (f, n) {
        if (n === 0) f.classList.toggle('hide', fi !== 0);
        else f.classList.toggle('show', n === fi);
      });
    }

    function tick() { i = (i + 1) % steps.length; paint(); }

    paint();

    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && !timer) {
          timer = setInterval(tick, 2600);
        } else if (!e.isIntersecting && timer) {
          clearInterval(timer);
          timer = null;
        }
      });
    }, { threshold: 0.35 }).observe(journey);
  });
  } catch (e) { bail(e); }
})();
