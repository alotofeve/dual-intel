(function () {
  var slider = document.querySelector('.banner-slider');
  if (!slider) return;

  var slides = Array.prototype.slice.call(slider.querySelectorAll('.banner-slide'));
  var dots = Array.prototype.slice.call(slider.querySelectorAll('.banner-dot'));
  var prevBtn = slider.querySelector('.banner-prev');
  var nextBtn = slider.querySelector('.banner-next');
  var intervalMs = 5500;
  var current = slides.findIndex(function (s) { return s.classList.contains('is-active'); });
  if (current < 0) current = 0;
  var timer = null;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function goTo(index) {
    if (!slides.length) return;
    slides[current].classList.remove('is-active');
    if (dots[current]) {
      dots[current].classList.remove('is-active');
      dots[current].setAttribute('aria-selected', 'false');
    }

    current = (index + slides.length) % slides.length;

    slides[current].classList.add('is-active');
    if (dots[current]) {
      dots[current].classList.add('is-active');
      dots[current].setAttribute('aria-selected', 'true');
    }
  }

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  function start() {
    if (reduceMotion || slides.length < 2) return;
    stop();
    timer = setInterval(next, intervalMs);
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  dots.forEach(function (dot, i) {
    dot.addEventListener('click', function () {
      goTo(i);
      start();
    });
  });

  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      next();
      start();
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', function () {
      prev();
      start();
    });
  }

  slider.addEventListener('mouseenter', stop);
  slider.addEventListener('mouseleave', start);
  slider.addEventListener('focusin', stop);
  slider.addEventListener('focusout', start);

  start();
})();
