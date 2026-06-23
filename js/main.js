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

        // 페이지 맨 아래(footer/CTA)에 거의 닿아 있으면 헤더를 토글하지 않는다.
        // 바닥에서 브라우저 스크롤 보정(스크롤 앵커링)·관성 등으로 y가 살짝 줄어
        // "올린 적 없는데" 헤더가 노출되는 현상 방지.
        var atBottom = docH() - (y + viewH()) <= 40;
        if (y <= 0) {
            setHeaderHidden(false);
        } else if (!atBottom) {
            if (y > lastHeaderY + 4) {
                setHeaderHidden(true); // 내릴 때 숨김
            } else if (y < lastHeaderY - 4) {
                setHeaderHidden(false); // 올릴 때 노출
            }
        }
        lastHeaderY = y;
    }
    /* ---------------------------------------------------------
     2) hamburger버튼 (1280px 이하: 메뉴 패널 토글)
  --------------------------------------------------------- */
    const mq = window.matchMedia("(min-width: 1281px)");

    //1280px 이하- 레이어팝업 노출
    const HAMBURGER_TRANSITION_MS = 250;
    const closeMenuPops = (options = {}) => {
        const animate = !!options.animate;

        document.querySelectorAll(".layerPop.menuPop").forEach((pop) => {
            const isVisible = pop.style.display === "flex";

            if (animate && isVisible) {
                pop.classList.remove("is-open");
                window.setTimeout(() => {
                    if (!pop.classList.contains("is-open")) {
                        pop.style.display = "none";
                    }
                }, HAMBURGER_TRANSITION_MS);
                return;
            }

            pop.classList.remove("is-open");
            pop.style.display = "none";
        });
        // 햄버거 아이콘을 다시 ≡ 모양으로(부드럽게 X→≡ 전환)
        $(".btn-hamburger").removeClass("active").attr("aria-expanded", "false");
    };

    const bindHamburger = () => {
        const $btn = $(".btn-hamburger");
        if (!$btn.length) return;
        $btn.off("click.hamburger");

        if (mq.matches) {
            // 1281px 이상: 햄버거 숨김(데스크톱 메뉴 노출) → 열려있던 모바일 패널만 정리
            closeMenuPops();
        } else {
            $btn.on("click.hamburger", function () {
                const targetSel = this.dataset.target;
                const target = targetSel ? document.querySelector(targetSel) : null;
                if (!target) return;

                const isOpen = target.style.display === "flex";
                if (isOpen) {
                    closeMenuPops({ animate: true });
                    return;
                }

                closeMenuPops();
                target.style.display = "flex";
                target.classList.remove("is-open");
                window.requestAnimationFrame(() => {
                    target.classList.add("is-open");
                });
                // 햄버거 → X 부드럽게 전환(.active 모핑 트리거)
                this.classList.add("active");
                this.setAttribute("aria-expanded", "true");
            });
        }
    };

    if (mq.addEventListener) {
        mq.addEventListener("change", bindHamburger);
    } else if (mq.addListener) {
        mq.addListener(bindHamburger);
    }
    bindHamburger();

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

    // 스냅 중 보류(reveal-pending)된 요소들을 도착 후 재생한다(is-in 부여 → 트랜지션 등장)
    function releasePendingReveals() {
        var pend = document.querySelectorAll(".reveal-pending");
        for (var i = 0; i < pend.length; i++) {
            pend[i].classList.remove("reveal-pending");
            pend[i].classList.add("is-in");
        }
    }
    function animateScroll(target, dur) {
        target = Math.max(0, Math.min(Math.round(target), docH() - viewH()));
        animating = true;
        $doc.stop(true).animate({ scrollTop: target }, dur, "swing", function () {
            window.setTimeout(function () {
                animating = false;
                releasePendingReveals(); // 도착 후 보류분 재생
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

        // 미세한 '위로' 휠(마우스 모멘텀·트랙패드 관성·바닥에서의 되튐 등)은 무시한다.
        // → 바닥(푸터)에서 스크롤을 올리지 않았는데 헤더가 튀어나오거나 의도치 않게
        //   위로 스냅되는 현상 방지. 분명한 위로 스크롤(한 노치 이상)만 인정.
        if (dir < 0 && Math.abs(e.deltaY) < 15) {
            e.preventDefault();
            return;
        }

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

    /* ---------------------------------------------------------
     7) Scroll reveal — 뷰포트 진입 시 .is-in 부여
        - CSS의 .reveal / .section4.is-in 효과를 구동한다
        - 모션 비선호 사용자 / 미지원 브라우저는 그대로 노출
  --------------------------------------------------------- */
    var prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if ("IntersectionObserver" in window && !prefersReduced) {
        var heroShown = false; // section1 첫 등장 여부
        var io = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (en) {
                    var el = en.target;
                    if (en.isIntersecting) {
                        if (animating) {
                            // 데스크톱 씬 스냅 중 진입한 요소는 보류 → 스냅이 끝나 도착한 뒤
                            // 재생(효과가 스냅 도중 지나가버리지 않고 화면에서 또렷이 보이게).
                            // 이미 보이던(떠나는) 섹션의 is-in은 건드리지 않으므로 깜빡임 없음.
                            el.classList.add("reveal-pending");
                        } else {
                            el.classList.remove("reveal-pending");
                            el.classList.add("is-in");
                        }
                    } else {
                        // 나가면 숨김 (올렸다 내릴 때도 매번 재생)
                        el.classList.remove("is-in", "reveal-pending");
                    }
                });
            },
            // 요소가 화면에 충분히 들어온 뒤 재생(미리 시작해 꼬리만 보이는 현상 방지):
            // 뷰포트 하단에서 18% 안쪽으로 들어왔을 때 트리거(전체적으로 조금 더 늦게 등장)
            { threshold: 0, rootMargin: "0px 0px -18% 0px" },
        );

        // 관찰 대상을 모은 뒤, 숨김 상태가 paint된 다음 한꺼번에 관찰을 시작한다.
        // (그래야 첫 화면에 이미 보이는 요소[hero]도 트랜지션이 생략되지 않고 등장한다)
        var toObserve = [];
        // reveal: 숨겼다가 등장. stagger=true 면 형제 순서대로 지연
        // step: stagger 간격(초). 기본 0.1 (또렷한 순차 등장)
        function reveal(sel, stagger, step) {
            var s = step || 0.1;
            $(sel).each(function (i) {
                this.classList.add("reveal");
                if (stagger) this.style.setProperty("--reveal-delay", i * s + "s");
                toObserve.push(this);
            });
        }
        // watch: 숨기지 않고 .is-in 만 부여(섹션 단위 효과 트리거용)
        function watch(sel) {
            $(sel).each(function () {
                toObserve.push(this);
            });
        }

        // section2
        reveal(".section2 .section-head");
        reveal(".cards .card", true);
        // section3 — rev-left 먼저, rev-right(테이블) 각자 진입 시 등장(특수 지연/스태거 없음)
        reveal(".section3 .section-head");
        reveal(".rev-left");
        reveal(".rev-right");
        // section4
        reveal(".section4 .section-head");
        reveal(".before");
        reveal(".after"); // '자동 관리' 강조점 트리거(.after.is-in)
        watch(".arrow-down"); // 화살표 흐름 트리거(.arrow-down.is-in)
        // section5
        reveal(".section5 .section-head");
        reveal(".ipo-flow .ipo-card", true, 0.22); // 겹친 셰브론이라 간격을 크게(1→2→3 또렷이)
        // section6
        reveal(".section6 .section-head");
        reveal(".product-cols .product-col", true);
        // section7
        reveal(".section7 .section-head");
        reveal(".benefit-grid .benefit-card", true, 0.08); // 약간 빠른 stagger
        // section8
        reveal(".section8 .section-head");
        reveal(".road-label");
        reveal(".roadmap .road-col", true);
        // CTA + 푸터(푸터는 cta-box보다 조금 늦게 — 아래 CSS --reveal-delay)
        reveal(".cta-box");
        reveal(".footer");

        // 숨김 상태(opacity:0)를 먼저 강제로 반영(reflow)한 뒤 모두 관찰한다.
        // 모든 요소를 IO로 관찰 → 뷰포트 진입 시 등장, 이탈 시 숨김(재진입 때 재생).
        // (hero[section1]은 IO 대상이 아니라 CSS 로드 애니메이션이 담당)
        void document.documentElement.offsetHeight;
        window.requestAnimationFrame(function () {
            window.requestAnimationFrame(function () {
                toObserve.forEach(function (el) {
                    io.observe(el);
                });
            });
        });

        // section1(hero): 별도 옵저버 + 임계값으로 진입/이탈을 확실히 감지(닿기 경계 모호성 제거)
        // → section2↔section1 오갈 때마다 매번 재생. 재진입 시 reflow로 애니메이션 재시작.
        var $section1 = $(".section1");
        if ($section1.length) {
            var heroIO = new IntersectionObserver(
                function (entries) {
                    entries.forEach(function (en) {
                        var el = en.target;
                        if (en.isIntersecting) {
                            el.classList.remove("is-in");
                            void el.offsetWidth; // reflow → 애니메이션 리셋
                            if (heroShown) el.style.setProperty("--hero-extra", "0.4s");
                            heroShown = true;
                            el.classList.add("is-in");
                        } else {
                            el.classList.remove("is-in");
                        }
                    });
                },
                { threshold: 0.12 },
            );
            heroIO.observe($section1[0]);
        }
    }
});

/* =========================================================
   모바일 햄버거 메뉴 토글 (씬 네비게이션과 독립)
   ========================================================= */
$(function () {
    var $header = $("#header");
    var $toggle = $(".btn-hamburger");

    // 헤더 로고를 모바일 메뉴 패널에도 재사용(복제) — path를 중복 작성하지 않고
    // 헤더의 동일 로고를 그대로 가져온다. 흰 배경이라 .on-dark 불필요(기본 색이 어두움).
    var $panelLogo = $(".menuPop .logos .logo");
    var headerLogoSvg = $("#header > .contents-wrap > .logo .logo-svg")[0];
    if ($panelLogo.length && headerLogoSvg && !$panelLogo.children("svg").length) {
        $panelLogo.append(headerLogoSvg.cloneNode(true));
    }

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
