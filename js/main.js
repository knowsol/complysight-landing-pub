/* =========================================================
   ComplySight Landing — main.js (jQuery)
   ========================================================= */
$(function () {
    var $win = $(window);
    var $doc = $("html,body");
    var $header = $("#header");
    var $scenes = $(".scene");
    var scenes = $scenes.toArray();

    // 1280px 이하(태블릿/모바일)에서는 씬 단위 스냅 없이 일반 스크롤 사용
    function isDesktop() {
        return window.innerWidth > 1280;
    }
    function scrollTop() {
        return window.pageYOffset || document.documentElement.scrollTop;
    }
    function viewH() {
        return window.innerHeight;
    }
    function docH() {
        return document.documentElement.scrollHeight;
    }
    /* ---------------------------------------------------------
     1) Header background + 스크롤 방향에 따른 노출/숨김
        - 아래로 스크롤: 헤더 숨김 (콘텐츠 영역 확보)
        - 위로 스크롤: 헤더 노출 (메뉴 접근)
        - 최상단(hero): 항상 노출
  --------------------------------------------------------- */
    var lastHeaderY = scrollTop();
    function setHeaderHidden(hidden) {
        $header.toggleClass("hide", !!hidden);
    }
    function updateHeader() {
        var y = scrollTop();
        if (y > 60) $header.addClass("solid");
        else $header.removeClass("solid");

        // 자동 씬 스냅 중에는 헤더를 다시 토글하지 않음 (씬과 함께 들썩이는 현상 방지).
        // 헤더 노출/숨김은 휠 동작 시점(onWheel)에 한 번만 결정한다.
        if (animating) {
            lastHeaderY = y;
            return;
        }

        if (y <= 0) {
            setHeaderHidden(false);
        } else if (y > lastHeaderY + 4) {
            setHeaderHidden(true); // 내릴 때 숨김
        } else if (y < lastHeaderY - 4) {
            setHeaderHidden(false); // 올릴 때 노출
        }
        lastHeaderY = y;
    }
    /* ---------------------------------------------------------
     4) Scene navigation dots
  --------------------------------------------------------- */
    var $nav = $("#sceneNav");
    var darkScenes = { hero: 1, table: 1, benefit: 1 };
    $scenes.each(function (i) {
        var id = this.id;
        $('<button type="button" aria-label="' + (this.getAttribute("data-scene") || "scene" + i) + '"></button>')
            .on("click", function () {
                snapToIndex(i);
            })
            .appendTo($nav);
    });
    var $navBtns = $nav.children("button");

    function currentSceneIndex() {
        var center = scrollTop() + viewH() / 2;
        var idx = 0;
        for (var i = 0; i < scenes.length; i++) {
            if (center >= scenes[i].offsetTop) idx = i;
        }
        return idx;
    }
    // 현재 위치(y) 아래/위의 가장 가까운 씬 top (없으면 null)
    function nextSceneTop(y) {
        for (var i = 0; i < scenes.length; i++) {
            if (scenes[i].offsetTop > y + 4) return scenes[i].offsetTop;
        }
        return null;
    }
    function prevSceneTop(y) {
        for (var i = scenes.length - 1; i >= 0; i--) {
            if (scenes[i].offsetTop < y - 4) return scenes[i].offsetTop;
        }
        return null;
    }

    function updateSceneNav() {
        var idx = currentSceneIndex();
        var onDark = !!darkScenes[scenes[idx].getAttribute("data-scene")];
        $navBtns.removeClass("active").eq(idx).addClass("active");
        $nav.toggleClass("on-dark", onDark);
        $header.toggleClass("on-dark", onDark);
        // 현재 씬 이름을 헤더에 표기(반응형에서 씬별 헤더 색상 분기에 사용)
        $header.attr("data-active-scene", scenes[idx].getAttribute("data-scene"));
    }

    /* ---------------------------------------------------------
     5) PC: smooth scene-by-scene wheel navigation
        - 일반 섹션: 한 번의 휠 = 다음 씬으로 부드럽게 이동
        - 화면보다 긴 섹션 / CTA·푸터(tail): 내부를 부드럽게 단계 이동
        모바일은 네이티브 스크롤 유지
  --------------------------------------------------------- */
    var animating = false;

    function animateScroll(target, dur) {
        target = Math.max(0, Math.min(Math.round(target), docH() - viewH()));
        animating = true;
        $doc.stop(true).animate({ scrollTop: target }, dur, "swing", function () {
            window.setTimeout(function () {
                animating = false;
            }, 60);
        });
    }
    function snapToIndex(idx) {
        idx = Math.max(0, Math.min(idx, scenes.length - 1));
        animateScroll(scenes[idx].offsetTop, 700);
    }

    function onWheel(e) {
        if (!isDesktop()) return; // mobile = native scroll
        if (animating) {
            e.preventDefault();
            return;
        }

        var dir = e.deltaY > 0 ? 1 : -1;
        if (e.deltaY === 0) return;

        // 헤더 노출/숨김은 휠 의도 시점에 한 번만 결정 (스냅 애니메이션과 분리)
        // 아래로 → 숨김(hero에서 떠날 때 포함), 위로 → 노출
        if (dir > 0) setHeaderHidden(true);
        else if (dir < 0) setHeaderHidden(false);

        var vh = viewH(),
            st = scrollTop();
        var step = vh * 0.88;
        // 다음 씬 top이 이 거리 안이면 한 번에 스냅, 더 멀면(긴 씬 내부 또는
        // 씬이 아닌 섹션[section6] 구간) 단계 스크롤로 자연스럽게 통과
        var snapDist = vh * 1.5;

        if (dir > 0) {
            // scrolling down
            var nextTop = nextSceneTop(st);
            if (nextTop !== null) {
                e.preventDefault();
                if (nextTop - st <= snapDist) animateScroll(nextTop, 700);
                else animateScroll(Math.min(nextTop, st + step), 480);
            } else if (docH() - (st + vh) > 4) {
                // tail (CTA/footer) below last scene
                e.preventDefault();
                animateScroll(Math.min(docH() - vh, st + step), 560);
            }
        } else {
            // scrolling up
            var prevTop = prevSceneTop(st);
            if (prevTop !== null) {
                e.preventDefault();
                if (st - prevTop <= snapDist) animateScroll(prevTop, 700);
                else animateScroll(Math.max(prevTop, st - step), 480);
            } else if (st > 4) {
                e.preventDefault();
                animateScroll(Math.max(0, st - step), 480);
            }
        }
    }
    window.addEventListener("wheel", onWheel, { passive: false });

    // keyboard support (PC)
    window.addEventListener("keydown", function (e) {
        if (!isDesktop() || animating) return;
        var tag = (e.target.tagName || "").toLowerCase();
        if (tag === "input" || tag === "textarea") return;
        var idx = currentSceneIndex();
        if (e.key === "PageDown" || e.key === "ArrowDown") {
            e.preventDefault();
            snapToIndex(idx + 1);
        } else if (e.key === "PageUp" || e.key === "ArrowUp") {
            e.preventDefault();
            snapToIndex(idx - 1);
        } else if (e.key === "Home") {
            e.preventDefault();
            snapToIndex(0);
        } else if (e.key === "End") {
            e.preventDefault();
            snapToIndex(scenes.length - 1);
        }
    });

    /* ---------------------------------------------------------
     Master scroll handler (rAF throttled)
  --------------------------------------------------------- */
    var ticking = false;
    function onScroll() {
        if (!ticking) {
            window.requestAnimationFrame(function () {
                updateHeader();
                updateSceneNav();
                ticking = false;
            });
            ticking = true;
        }
    }
    $win.on("scroll", onScroll);
    $win.on("resize", function () {
        updateSceneNav();
    });
    updateHeader();
    updateSceneNav();

    /* ---------------------------------------------------------
     6) Smooth anchor scrolling for header / nav links
  --------------------------------------------------------- */
    $('a[href^="#"]').on("click", function (e) {
        var href = $(this).attr("href");
        if (href === "#" || href.length < 2) return;
        var $t = $(href);
        if (!$t.length) return;
        e.preventDefault();
        var offset = isDesktop() ? 0 : 50;
        animateScroll($t.offset().top - offset, 650);
    });
});

/* =========================================================
   모바일 햄버거 메뉴 토글 (씬 네비게이션과 독립)
   ========================================================= */
$(function () {
    var $header = $("#header");
    var $toggle = $(".btn-hamburger");

    function setOpen(open) {
        $header.toggleClass("nav-open", open);
        $toggle.attr("aria-expanded", open ? "true" : "false");
    }

    $toggle.on("click", function (e) {
        e.stopPropagation();
        setOpen(!$header.hasClass("nav-open"));
    });

    // 메뉴 항목 클릭 시 닫기
    $(".mobile-nav a").on("click", function () {
        setOpen(false);
    });

    // 바깥 영역 클릭 시 닫기
    $(document).on("click", function (e) {
        if (!$(e.target).closest(".header").length) setOpen(false);
    });
});
