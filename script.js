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

  const polaroidFan = document.querySelector(".polaroid-fan");
  const communityMosaic = document.querySelector(".community-mosaic");
  if (polaroidFan) {
    const toggle = () => {
      const open = polaroidFan.classList.toggle("is-open");
      if (communityMosaic) communityMosaic.classList.toggle("is-open", open);
      polaroidFan.setAttribute("aria-expanded", String(open));
    };
    polaroidFan.addEventListener("click", toggle);
    polaroidFan.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggle();
      }
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
