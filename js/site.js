(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ----- Theme toggle -----
  var toggle = document.querySelector('.theme-toggle');
  function currentTheme() {
    if (root.dataset.theme) return root.dataset.theme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
  }

  // ----- Nav: border on scroll + active section -----
  var nav = document.querySelector('.nav');
  function onScroll() { nav.classList.toggle('scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var links = Array.prototype.slice.call(document.querySelectorAll('.nav-links a'));
  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) {
          a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    links.forEach(function (a) {
      var target = document.querySelector(a.getAttribute('href'));
      if (target) spy.observe(target);
    });

    // ----- Reveal on scroll -----
    if (!reduceMotion) {
      var reveal = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            reveal.unobserve(entry.target);
          }
        });
      }, { rootMargin: '0px 0px -8% 0px' });
      document.querySelectorAll('.card, .stack-grid > div, .timeline li, .section .big')
        .forEach(function (el) { el.classList.add('reveal'); reveal.observe(el); });
    }
  }

  // ----- Attitude indicator: gentle hover drift -----
  var horizon = document.querySelector('.hud .horizon');
  var rollOut = document.querySelector('[data-t="roll"]');
  var pitchOut = document.querySelector('[data-t="pitch"]');
  function fmt(v) { return (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1) + '°'; }
  function setAttitude(roll, pitch) {
    horizon.setAttribute('transform', 'rotate(' + (-roll) + ' 100 100) translate(0 ' + (pitch * 2) + ')');
    rollOut.textContent = fmt(roll);
    pitchOut.textContent = fmt(pitch);
  }
  if (horizon && rollOut && pitchOut) {
    if (reduceMotion) {
      setAttitude(4, 2);
    } else {
      var start = performance.now();
      var frame;
      var tick = function (now) {
        var t = (now - start) / 1000;
        var roll = 9 * Math.sin(t * 0.5) + 3 * Math.sin(t * 1.3);
        var pitch = 4 * Math.sin(t * 0.37 + 1) + 1.2 * Math.sin(t * 1.1);
        setAttitude(roll, pitch);
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) cancelAnimationFrame(frame);
        else frame = requestAnimationFrame(tick);
      });
    }
  }

  // ----- Recent GitHub activity -----
  var list = document.getElementById('activity');
  // Repos that shouldn't be advertised here (client / restricted work, old sites).
  var HIDE = ['project-trishul-525', 'prashant9316.github.io', 'profile'];

  function ago(iso) {
    var s = (Date.now() - new Date(iso).getTime()) / 1000;
    var units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600]];
    for (var i = 0; i < units.length; i++) {
      var n = Math.floor(s / units[i][1]);
      if (n >= 1) return n + ' ' + units[i][0] + (n > 1 ? 's' : '') + ' ago';
    }
    return 'just now';
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  function renderRepos(repos) {
    list.textContent = '';
    repos.forEach(function (r) {
      var li = el('li');
      var a = el('a');
      a.href = r.html_url;
      a.target = '_blank';
      a.rel = 'noopener';
      var name = el('span', 'repo', r.name);
      if (r.description) name.appendChild(el('small', null, r.description));
      a.appendChild(name);
      a.appendChild(el('span', 'lang', r.language || ''));
      a.appendChild(el('span', 'ago', ago(r.pushed_at)));
      li.appendChild(a);
      list.appendChild(li);
    });
  }

  function fallback() {
    list.textContent = '';
    var li = el('li', 'muted');
    var a = el('a', null, 'Browse everything on GitHub ↗');
    a.href = 'https://github.com/prashant9316?tab=repositories';
    a.target = '_blank';
    a.rel = 'noopener';
    li.appendChild(a);
    list.appendChild(li);
  }

  if (list && window.fetch) {
    fetch('https://api.github.com/users/prashant9316/repos?sort=pushed&per_page=30')
      .then(function (res) { if (!res.ok) throw new Error(res.status); return res.json(); })
      .then(function (repos) {
        var shown = repos.filter(function (r) {
          return !r.fork && !r.archived && HIDE.indexOf(r.name.toLowerCase()) === -1;
        }).slice(0, 5);
        if (shown.length) renderRepos(shown); else fallback();
      })
      .catch(fallback);
  }

  // ----- Copy email -----
  var copyBtn = document.querySelector('[data-copy]');
  if (copyBtn && navigator.clipboard) {
    copyBtn.addEventListener('click', function () {
      navigator.clipboard.writeText(copyBtn.dataset.copy).then(function () {
        var label = copyBtn.textContent;
        copyBtn.textContent = 'Copied ✓';
        setTimeout(function () { copyBtn.textContent = label; }, 1600);
      });
    });
  } else if (copyBtn) {
    copyBtn.hidden = true;
  }

  // ----- Footer year -----
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
