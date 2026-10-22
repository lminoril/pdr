/* ============================================================
   PDR Балашиха — интерактив сайта
   Темы · меню · анимации при прокрутке · параллакс · лайтбокс
   ============================================================ */
(function () {
  "use strict";

  var root = document.documentElement;
  var reducedMotion = false;
  try {
    reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) { /* noop */ }

  /* ---------- Страница всегда открывается с начала ----------
     На телефонах браузер часто возвращает страницу на прежнее место прокрутки
     или сразу переходит к якорю из ссылки (#works и т.п.), из-за чего посетитель
     попадает в середину сайта. Отключаем восстановление прокрутки и поднимаем
     страницу вверх — до тех пор, пока посетитель сам не начал листать. */
  try {
    if (window.history && "scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    var userScrolled = false;
    ["wheel", "touchstart", "touchmove", "keydown", "pointerdown"].forEach(function (evt) {
      window.addEventListener(evt, function () { userScrolled = true; }, { passive: true, once: true });
    });

    var scrollToTop = function () {
      if (!userScrolled) window.scrollTo(0, 0);
    };

    /* убираем якорь из адреса, чтобы браузер не «прыгал» в раздел при загрузке */
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }

    scrollToTop();
    window.addEventListener("load", scrollToTop);
    window.addEventListener("pageshow", function (e) { if (!e.persisted) scrollToTop(); });
  } catch (e) { /* noop */ }

  try {

    /* ---------- Переключатель темы ---------- */
    var themeToggle = document.getElementById("themeToggle");

    function applyTheme(theme) {
      root.setAttribute("data-theme", theme);
      try { localStorage.setItem("pdr-theme", theme); } catch (e) { /* noop */ }
      if (themeToggle) {
        themeToggle.setAttribute("aria-label", theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему");
      }
    }

    if (themeToggle) {
      themeToggle.addEventListener("click", function () {
        var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
        root.classList.add("theme-anim");            // плавный переход цветов
        applyTheme(next);
        window.setTimeout(function () {
          root.classList.remove("theme-anim");
        }, 420);
      });
    }

    /* Следим за системной темой, пока пользователь не выбрал свою */
    try {
      if (!localStorage.getItem("pdr-theme") && window.matchMedia) {
        var mq = window.matchMedia("(prefers-color-scheme: dark)");
        var onSystemTheme = function (e) {
          if (!localStorage.getItem("pdr-theme")) {
            root.setAttribute("data-theme", e.matches ? "dark" : "light");
          }
        };
        if (typeof mq.addEventListener === "function") {
          mq.addEventListener("change", onSystemTheme);
        } else if (typeof mq.addListener === "function") {
          mq.addListener(onSystemTheme);
        }
      }
    } catch (e) { /* noop */ }

    /* ---------- Бургер-меню ---------- */
    var burger = document.getElementById("burger");
    var nav = document.getElementById("siteNav");

    function closeMenu() {
      if (!burger || !nav) return;
      burger.classList.remove("open");
      nav.classList.remove("open");
      burger.setAttribute("aria-expanded", "false");
      burger.setAttribute("aria-label", "Открыть меню");
    }

    if (burger && nav) {
      burger.addEventListener("click", function () {
        var isOpen = nav.classList.toggle("open");
        burger.classList.toggle("open", isOpen);
        burger.setAttribute("aria-expanded", String(isOpen));
        burger.setAttribute("aria-label", isOpen ? "Закрыть меню" : "Открыть меню");
      });

      nav.addEventListener("click", function (e) {
        if (e.target && e.target.tagName === "A") closeMenu();
      });

      document.addEventListener("click", function (e) {
        if (nav.classList.contains("open") && !nav.contains(e.target) && !burger.contains(e.target)) {
          closeMenu();
        }
      });
    }

    /* ---------- Каскадная задержка для групп элементов ---------- */
    var staggerGroups = document.querySelectorAll("[data-stagger]");
    Array.prototype.forEach.call(staggerGroups, function (group) {
      var items = group.querySelectorAll("[data-anim]");
      Array.prototype.forEach.call(items, function (item, i) {
        var step = 90;                       // мс между соседними элементами
        var delay = Math.min(i, 6) * step;   // не растягиваем слишком длинно
        item.style.setProperty("--anim-delay", delay + "ms");
      });
    });

    /* ---------- Появление блоков при прокрутке ---------- */
    var animEls = document.querySelectorAll("[data-anim]");

    function showAll() {
      Array.prototype.forEach.call(animEls, function (el) { el.classList.add("in-view"); });
    }

    if (reducedMotion || !("IntersectionObserver" in window)) {
      showAll();
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.14, rootMargin: "0px 0px -60px 0px" });
      Array.prototype.forEach.call(animEls, function (el) { io.observe(el); });

      /* Если что-то осталось скрытым (например, элемент уже за экраном) — показываем */
      window.setTimeout(function () {
        Array.prototype.forEach.call(animEls, function (el) {
          var r = el.getBoundingClientRect();
          if (r.top < window.innerHeight * 0.95 && r.bottom > 0) el.classList.add("in-view");
        });
      }, 900);
    }

    /* ---------- Шапка, полоса прогресса и параллакс ---------- */
    var header = document.getElementById("siteHeader");
    var progress = document.getElementById("scrollProgress");
    var heroMedia = document.querySelector(".hero-media");
    var ticking = false;

    function onFrame() {
      var y = window.scrollY || window.pageYOffset || 0;

      if (header) header.classList.toggle("scrolled", y > 8);

      if (progress) {
        var docHeight = document.documentElement.scrollHeight - window.innerHeight;
        var ratio = docHeight > 0 ? Math.min(y / docHeight, 1) : 0;
        progress.style.transform = "scaleX(" + ratio + ")";
      }

      if (heroMedia && !reducedMotion) {
        var shift = Math.min(y * 0.18, 140);         // мягкий параллакс фона
        heroMedia.style.setProperty("--hero-shift", shift.toFixed(1) + "px");
      }

      ticking = false;
    }

    function requestFrame() {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(onFrame);
      }
    }

    window.addEventListener("scroll", requestFrame, { passive: true });
    window.addEventListener("resize", requestFrame);
    onFrame();

    /* ---------- Подсветка активного пункта меню ---------- */
    var sections = Array.prototype.slice.call(document.querySelectorAll("section[id]"));
    var navLinks = Array.prototype.slice.call(document.querySelectorAll(".nav a"));
    if ("IntersectionObserver" in window && navLinks.length) {
      var spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            navLinks.forEach(function (link) {
              var href = link.getAttribute("href");
              link.classList.toggle("active", href === "#" + entry.target.id);
            });
          }
        });
      }, { rootMargin: "-40% 0px -55% 0px" });
      sections.forEach(function (s) { spy.observe(s); });
    }

    /* ---------- Просмотр фото работ (лайтбокс) ---------- */
    var lightbox = document.getElementById("lightbox");
    var lightboxImg = document.getElementById("lightboxImg");
    var lightboxCaption = document.getElementById("lightboxCaption");
    var lightboxClose = document.getElementById("lightboxClose");
    var lastFocused = null;

    function openLightbox(img) {
      if (!lightbox || !lightboxImg) return;
      lastFocused = document.activeElement;
      lightboxImg.src = img.getAttribute("src");
      lightboxImg.alt = img.getAttribute("alt") || "";
      if (lightboxCaption) {
        /* подписи под фото не показываем — только пояснение про формат кадра */
        lightboxCaption.textContent = "Слева — до ремонта, справа — после";
      }
      lightbox.classList.add("open");
      lightbox.setAttribute("aria-hidden", "false");
      document.body.classList.add("lightbox-open");
      if (lightboxClose) lightboxClose.focus();
    }

    function closeLightbox() {
      if (!lightbox) return;
      lightbox.classList.remove("open");
      lightbox.setAttribute("aria-hidden", "true");
      document.body.classList.remove("lightbox-open");
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }

    Array.prototype.forEach.call(document.querySelectorAll(".zoomable"), function (img) {
      img.addEventListener("click", function () { openLightbox(img); });
      img.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openLightbox(img);
        }
      });
      img.setAttribute("tabindex", "0");
      img.setAttribute("role", "button");
    });

    if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
    if (lightbox) {
      lightbox.addEventListener("click", function (e) {
        if (e.target === lightbox) closeLightbox();
      });
    }
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && lightbox && lightbox.classList.contains("open")) closeLightbox();
    });

    /* ---------- Год в подвале ---------- */
    var yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  } catch (err) {
    /* Если что-то пошло не так — контент должен остаться видимым */
    root.classList.add("no-anim");
    if (window.console && console.warn) console.warn("PDR site script:", err);
  }
})();
