const nav = document.getElementById("nav");
const navLinks = document.getElementById("navLinks");

// Navbar turns solid green after scrolling
function onScroll() {
    nav.classList.toggle("scrolled", window.scrollY > 40);
}
window.addEventListener("scroll", onScroll);
onScroll();

// Mobile menu
document.getElementById("menuBtn").addEventListener("click", () => {
    navLinks.classList.toggle("open");
});
navLinks.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => navLinks.classList.remove("open"));
});

// Reveal sections as they scroll into view
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.15 });

document.querySelectorAll(".reveal").forEach(el => revealObserver.observe(el));

// Count-up numbers
function animateCount(el) {
    const target = Number(el.dataset.count);
    const duration = 1600;
    const start = performance.now();

    function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.floor(eased * target);
        if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

const countObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            animateCount(entry.target);
            countObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.6 });

document.querySelectorAll("[data-count]").forEach(el => countObserver.observe(el));