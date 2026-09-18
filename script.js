document.addEventListener("DOMContentLoaded", () => {
  const nav = document.querySelector(".site-nav");
  const navToggle = document.querySelector(".nav-toggle");

  if (nav && navToggle) {
    navToggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        nav.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  const revealItems = document.querySelectorAll(".reveal");
  if (revealItems.length) {
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.14 });

      revealItems.forEach((item, index) => {
        item.style.transitionDelay = `${Math.min(index * 55, 220)}ms`;
        observer.observe(item);
        // Safety net: if the observer never fires for this item (paused
        // observers, unusual scroll patterns, etc.), force it visible so
        // content can never be permanently stuck at opacity:0.
        window.setTimeout(() => item.classList.add("visible"), 1400);
      });
    } else {
      revealItems.forEach((item) => item.classList.add("visible"));
    }
  }

  const magnetTargets = document.querySelectorAll(".btn-primary, .btn-pink");
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    magnetTargets.forEach((btn) => {
      btn.addEventListener("mouseenter", () => {
        btn.style.transition = "transform 0.1s ease";
      });
      btn.addEventListener("mousemove", (event) => {
        const rect = btn.getBoundingClientRect();
        const dx = (event.clientX - (rect.left + rect.width / 2)) * 0.25;
        const dy = (event.clientY - (rect.top + rect.height / 2)) * 0.25;
        btn.style.transform = `translate(${dx}px, ${dy}px)`;
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.transition = "transform 0.4s cubic-bezier(0.23, 1, 0.32, 1)";
        btn.style.transform = "translate(0, 0)";
      });
    });
  }

  /* ============================================================
     Hero mosaic — a full-bleed field of translucent tiles behind the
     headline, styled after Terra Labs' hero: soft, low-opacity shapes
     that fade out toward the edges (a radial density gradient, not a
     hard-edged grid), each drifting color on its own slow randomly-
     offset cycle, brightening toward the cursor with distance falloff.
     Capped to ~30fps and paused while the tab is hidden.
     ============================================================ */
  const heroCanvas = document.querySelector(".terra-canvas");
  if (heroCanvas) {
    const heroEl = heroCanvas.parentElement;
    const ctx = heroCanvas.getContext("2d");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const CELL = 26;
    const PALE = [239, 106, 167];  // pink
    const DEEP = [199, 53, 120];   // pink-deep
    const HOT = [255, 79, 155];    // pink-hot, for the cursor highlight
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0, cols = 0, rows = 0;
    let tiles = [];
    const mouse = { x: -9999, y: -9999, active: false };

    function lerp(a, b, t) { return a + (b - a) * t; }
    function lerpColor(c1, c2, t) {
      return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
    }

    function buildGrid() {
      cols = Math.ceil(w / CELL);
      rows = Math.ceil(h / CELL);
      const cx = cols / 2, cy = rows / 2;
      // The field is an oval, not a tile spanning the hero corner-to-corner —
      // matches Terra Labs' actual hero, where the dot cloud sits centered
      // with clear empty space at the sides and corners, not a hard rectangle.
      const rx = cols * 0.4;
      const ry = rows * 0.44;
      tiles = new Array(cols * rows).fill(0).map((_, i) => {
        const col = i % cols, row = (i / cols) | 0;
        const dx = (col - cx) / rx;
        const dy = (row - cy) / ry;
        // per-tile jitter on the boundary itself so the edge feathers
        // organically instead of reading as a crisp ellipse outline.
        const jitter = 0.82 + Math.random() * 0.36;
        const d = Math.hypot(dx, dy) * jitter;
        return {
          phase: Math.random() * Math.PI * 2,
          speed: 0.2 + Math.random() * 0.3,
          sizeFactor: 0.35 + Math.random() * 0.55,
          shape: Math.random() < 0.35 ? "circle" : "square",
          falloff: Math.max(0, 1 - d * d),
        };
      });
    }

    function resize() {
      const rect = heroEl.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      heroCanvas.width = w * dpr;
      heroCanvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildGrid();
    }

    const RADIUS = 170;
    let lastFrame = 0;
    function frame(now) {
      requestAnimationFrame(frame);
      if (now - lastFrame < 33) return; // ~30fps cap
      lastFrame = now;

      ctx.clearRect(0, 0, w, h);
      const t = now / 1000;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const tile = tiles[row * cols + col];
          if (tile.falloff < 0.02) continue;
          const x = col * CELL;
          const y = row * CELL;
          const cx = x + CELL / 2, cy = y + CELL / 2;
          const pulse = reduceMotion ? 0.5 : (Math.sin(t * tile.speed + tile.phase) + 1) / 2;
          let color = lerpColor(PALE, DEEP, pulse);
          let alpha = tile.falloff * lerp(0.14, 0.4, pulse);

          if (mouse.active) {
            const dist = Math.hypot(cx - mouse.x, cy - mouse.y);
            if (dist < RADIUS) {
              const strength = 1 - dist / RADIUS;
              color = lerpColor(color, HOT, strength * 0.9);
              alpha = Math.min(0.8, alpha + strength * 0.5);
            }
          }

          const size = CELL * tile.sizeFactor;
          ctx.fillStyle = `rgba(${color[0] | 0}, ${color[1] | 0}, ${color[2] | 0}, ${alpha.toFixed(3)})`;
          if (tile.shape === "circle") {
            ctx.beginPath();
            ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillRect(cx - size / 2, cy - size / 2, size, size);
          }
        }
      }
    }

    resize();
    requestAnimationFrame(frame);

    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      heroEl.addEventListener("mousemove", (e) => {
        const rect = heroEl.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
        mouse.active = true;
      });
      heroEl.addEventListener("mouseleave", () => { mouse.active = false; });
    }

    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    });
  }

  document.querySelectorAll(".js-form").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const confirm = form.querySelector(".form-confirm");
      if (confirm) confirm.style.display = "block";
      form.querySelectorAll("input, textarea, button").forEach((el) => {
        if (el.tagName !== "BUTTON") el.setAttribute("disabled", "true");
      });
    });
  });
});

/* ============================================================
   Site editor — sticker picker + on-page comments.
   Local-only review tool: everything saves to this browser's
   localStorage, scoped per page. Nothing is sent anywhere, and
   other visitors never see it.
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  const gems = Array.from({ length: 50 }, (_, i) => ({
    src: `images/gems/gem-${String(i).padStart(2, "0")}.png`,
    cat: "gems",
    w: 34,
  }));

  const stickers = [
    "heart-lace", "xoxo", "ticket", "sparkle", "doily", "phone-nokia", "text-bubble", "popup",
  ].map((name) => ({ src: `images/stickers/${name}.${name === "popup" ? "jpg" : "png"}`, cat: "stickers", w: 100 }));

  const words = ["girl", "s", "just"].map((w) => ({ src: `images/stickers/word-${w}.png`, cat: "words", w: 90 }));

  const prints = [
    "97f0add12094b5a224c1ed46d8f5cdc7.jpg", "dark-stripes.jpg", "pink-circle.jpg",
    "pink-disco.png", "pink-yellow-check.png", "pink-yellow-circle.jpg",
    "pink-yellow-star.jpg", "pink-yellow-stripe.jpg",
  ].map((name) => ({ src: `pink-print/${name}`, cat: "prints", w: 90 }));

  const catalog = [...gems, ...stickers, ...words, ...prints];
  const categories = [
    { id: "gems", label: "gems" },
    { id: "stickers", label: "stickers" },
    { id: "words", label: "words" },
    { id: "prints", label: "prints" },
  ];

  const pageKey = "givc-editor:" + location.pathname;
  let state = { stickers: [], comments: [] };
  try {
    state = JSON.parse(localStorage.getItem(pageKey) || "null") || state;
  } catch (err) { /* storage unavailable — start fresh in-memory */ }
  const save = () => {
    try { localStorage.setItem(pageKey, JSON.stringify(state)); } catch (err) { /* storage unavailable — keep working in-memory */ }
  };
  let uid = 1;

  // ---------- toolbar ----------
  const toolbar = document.createElement("div");
  toolbar.className = "editor-toolbar";
  toolbar.innerHTML = `
    <div class="editor-panel" id="editorPanel">
      <div class="editor-panel-head">
        <strong>decorate this page</strong>
        <button class="editor-close" type="button" aria-label="Close">&times;</button>
      </div>
      <div class="editor-tabs" id="editorTabs"></div>
      <div class="editor-grid" id="editorGrid"></div>
      <p class="editor-hint">click to place &middot; drag to move &middot; hover + &times; to remove</p>
      <div class="editor-panel-foot">
        <button type="button" id="editorCommentBtn">comment mode</button>
        <button type="button" id="editorExportBtn">export notes</button>
        <button type="button" id="editorClearBtn">clear page</button>
      </div>
    </div>
    <button class="editor-toggle" id="editorToggle" type="button">&#10024; decorate</button>
  `;
  document.body.appendChild(toolbar);

  const panel = toolbar.querySelector("#editorPanel");
  const toggleBtn = toolbar.querySelector("#editorToggle");
  const closeBtn = toolbar.querySelector(".editor-close");
  const tabsEl = toolbar.querySelector("#editorTabs");
  const gridEl = toolbar.querySelector("#editorGrid");
  const commentBtn = toolbar.querySelector("#editorCommentBtn");
  const exportBtn = toolbar.querySelector("#editorExportBtn");
  const clearBtn = toolbar.querySelector("#editorClearBtn");

  toggleBtn.addEventListener("click", () => {
    const open = panel.classList.toggle("open");
    toggleBtn.classList.toggle("active", open);
  });
  closeBtn.addEventListener("click", () => {
    panel.classList.remove("open");
    toggleBtn.classList.remove("active");
  });

  let activeCat = "gems";
  categories.forEach((cat) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "editor-tab" + (cat.id === activeCat ? " active" : "");
    btn.textContent = cat.label;
    btn.addEventListener("click", () => {
      activeCat = cat.id;
      tabsEl.querySelectorAll(".editor-tab").forEach((t) => t.classList.remove("active"));
      btn.classList.add("active");
      renderGrid();
    });
    tabsEl.appendChild(btn);
  });

  function renderGrid() {
    gridEl.innerHTML = "";
    catalog.filter((it) => it.cat === activeCat).forEach((item) => {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "editor-item";
      cell.innerHTML = `<img src="${item.src}" alt="" loading="lazy">`;
      cell.addEventListener("click", () => placeSticker(item.src, item.w));
      gridEl.appendChild(cell);
    });
  }
  renderGrid();

  // ---------- placed stickers ----------
  function mountSticker(rec) {
    const el = document.createElement("div");
    el.className = "placed-sticker";
    el.style.left = rec.x + "px";
    el.style.top = rec.y + "px";
    el.style.width = rec.w + "px";
    el.style.transform = `rotate(${rec.r}deg)`;
    el.dataset.id = rec.id;
    el.innerHTML = `<img src="${rec.src}" alt="" draggable="false"><span class="sticker-delete" title="remove">&times;</span><span class="sticker-resize" title="drag to resize">&#8599;</span>`;
    document.body.appendChild(el);

    // Drag — listens on document once a drag starts, rather than relying on
    // pointer capture, so it keeps working even if a browser's capture
    // support is flaky.
    let dragging = false, startX = 0, startY = 0, origX = 0, origY = 0;
    const onMove = (e) => {
      if (!dragging) return;
      rec.x = origX + (e.clientX - startX);
      rec.y = origY + (e.clientY - startY);
      el.style.left = rec.x + "px";
      el.style.top = rec.y + "px";
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      el.classList.remove("dragging");
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      save();
    };
    el.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".sticker-delete, .sticker-resize")) return;
      e.preventDefault();
      dragging = true;
      el.classList.add("dragging");
      startX = e.clientX; startY = e.clientY;
      origX = rec.x; origY = rec.y;
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    });

    // Resize — drag the corner handle to scale the sticker.
    let resizing = false, rStartX = 0, origW = 0;
    const onResizeMove = (e) => {
      if (!resizing) return;
      rec.w = Math.max(24, Math.min(500, origW + (e.clientX - rStartX)));
      el.style.width = rec.w + "px";
    };
    const onResizeUp = () => {
      if (!resizing) return;
      resizing = false;
      document.removeEventListener("pointermove", onResizeMove);
      document.removeEventListener("pointerup", onResizeUp);
      save();
    };
    el.querySelector(".sticker-resize").addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      resizing = true;
      rStartX = e.clientX;
      origW = rec.w;
      document.addEventListener("pointermove", onResizeMove);
      document.addEventListener("pointerup", onResizeUp);
    });

    el.querySelector(".sticker-delete").addEventListener("click", (e) => {
      e.stopPropagation();
      state.stickers = state.stickers.filter((s) => s.id !== rec.id);
      save();
      el.remove();
    });
  }

  function placeSticker(src, w) {
    const size = w || 90;
    const rec = {
      id: uid++,
      src,
      x: window.scrollX + window.innerWidth / 2 - size / 2 + (Math.random() * 60 - 30),
      y: window.scrollY + window.innerHeight / 2 - size / 2 + (Math.random() * 60 - 30),
      w: size,
      r: Math.round(Math.random() * 30 - 15),
    };
    state.stickers.push(rec);
    save();
    mountSticker(rec);
  }

  state.stickers.forEach((rec) => { if (!rec.id) rec.id = uid; uid = Math.max(uid, rec.id + 1); mountSticker(rec); });

  // ---------- comments ----------
  let commentMode = false;
  commentBtn.addEventListener("click", () => {
    commentMode = !commentMode;
    document.body.classList.toggle("editor-comment-mode", commentMode);
    commentBtn.textContent = commentMode ? "click page to drop a note" : "comment mode";
    commentBtn.classList.toggle("active", commentMode);
  });

  document.addEventListener("click", (e) => {
    if (!commentMode) return;
    if (e.target.closest(".editor-toolbar, .placed-comment, .comment-popover, .placed-sticker")) return;
    const rec = {
      id: uid++,
      x: window.scrollX + e.clientX,
      y: window.scrollY + e.clientY,
      text: "",
    };
    state.comments.push(rec);
    save();
    mountComment(rec, true);
  });

  function mountComment(rec, openNow) {
    const pin = document.createElement("div");
    pin.className = "placed-comment";
    pin.textContent = String(state.comments.indexOf(rec) + 1);
    pin.style.left = rec.x + "px";
    pin.style.top = rec.y + "px";

    const pop = document.createElement("div");
    pop.className = "comment-popover";
    pop.style.left = rec.x + 20 + "px";
    pop.style.top = rec.y + "px";
    pop.innerHTML = `
      <textarea placeholder="leave a note...">${rec.text}</textarea>
      <div class="comment-actions">
        <button type="button" class="comment-delete">delete</button>
        <button type="button" class="comment-save">save</button>
      </div>
    `;
    document.body.appendChild(pin);
    document.body.appendChild(pop);

    const openPopover = () => {
      document.querySelectorAll(".comment-popover.open").forEach((p) => p.classList.remove("open"));
      pop.classList.add("open");
      pop.querySelector("textarea").focus();
    };
    pin.addEventListener("click", (e) => { e.stopPropagation(); openPopover(); });
    pop.querySelector(".comment-save").addEventListener("click", () => {
      rec.text = pop.querySelector("textarea").value;
      save();
      pop.classList.remove("open");
    });
    pop.querySelector(".comment-delete").addEventListener("click", () => {
      state.comments = state.comments.filter((c) => c.id !== rec.id);
      save();
      pin.remove();
      pop.remove();
    });
    if (openNow) openPopover();
  }

  state.comments.forEach((rec) => { if (!rec.id) rec.id = uid; uid = Math.max(uid, rec.id + 1); mountComment(rec, false); });

  exportBtn.addEventListener("click", async () => {
    if (!state.comments.length) {
      exportBtn.textContent = "no notes yet";
      window.setTimeout(() => { exportBtn.textContent = "export notes"; }, 1400);
      return;
    }
    const text = state.comments
      .filter((c) => c.text.trim())
      .map((c, i) => `${i + 1}. ${c.text.trim()}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(`Notes on ${location.pathname}:\n${text}`);
      exportBtn.textContent = "copied!";
    } catch {
      exportBtn.textContent = "copy failed";
    }
    window.setTimeout(() => { exportBtn.textContent = "export notes"; }, 1400);
  });

  let clearArmed = false;
  let clearArmedTimer = null;
  clearBtn.addEventListener("click", () => {
    if (!clearArmed) {
      clearArmed = true;
      clearBtn.textContent = "sure? tap again";
      clearArmedTimer = window.setTimeout(() => {
        clearArmed = false;
        clearBtn.textContent = "clear page";
      }, 3000);
      return;
    }
    window.clearTimeout(clearArmedTimer);
    clearArmed = false;
    clearBtn.textContent = "clear page";
    document.querySelectorAll(".placed-sticker, .placed-comment, .comment-popover").forEach((el) => el.remove());
    state.stickers = [];
    state.comments = [];
    save();
  });
});
