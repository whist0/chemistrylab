// ====================== СЛАЙДЕР ОТЗЫВОВ ======================
function getReviews() {
    return Array.from(document.querySelectorAll(".review"));
}

const reviewsTrack = document.querySelector(".reviews__track");
const nextBtn = document.getElementById("next");
const prevBtn = document.getElementById("prev");
const sliderDotsContainer = document.getElementById("sliderDots");
const reviewForm = document.getElementById("reviewForm");
let currentIndex = 0;
let autoSlideTimer = null;

function showReview(index) {
    const reviews = getReviews();
    if (!reviews.length || !reviewsTrack) return;

    reviewsTrack.style.transform = `translateX(-${index * 100}%)`;
    reviews.forEach((review, reviewIndex) => {
        review.classList.toggle("active", reviewIndex === index);
    });

    const dots = sliderDotsContainer?.querySelectorAll(".slider-dot") || [];
    dots.forEach((dot, dotIndex) => {
        dot.classList.toggle("active", dotIndex === index);
    });
}

function createSliderDots() {
    const reviews = getReviews();
    if (!sliderDotsContainer || !reviews.length) return;

    sliderDotsContainer.innerHTML = "";
    reviews.forEach((_, index) => {
        const dot = document.createElement("button");
        dot.className = "slider-dot";
        dot.type = "button";
        dot.setAttribute("aria-label", `Показать отзыв ${index + 1}`);
        dot.addEventListener("click", () => {
            currentIndex = index;
            showReview(currentIndex);
            resetAutoSlide();
        });
        sliderDotsContainer.append(dot);
    });
}

function moveReview(step) {
    const reviews = getReviews();
    if (!reviews.length) return;
    currentIndex = (currentIndex + step + reviews.length) % reviews.length;
    showReview(currentIndex);
}

function startAutoSlide() {
    const reviews = getReviews();
    if (!reviews.length) return;
    autoSlideTimer = setInterval(() => moveReview(1), 5000);
}

function resetAutoSlide() {
    clearInterval(autoSlideTimer);
    startAutoSlide();
}

if (getReviews().length && nextBtn && prevBtn && reviewsTrack) {
    createSliderDots();
    showReview(currentIndex);
    startAutoSlide();

    nextBtn.addEventListener("click", () => {
        moveReview(1);
        resetAutoSlide();
    });

    prevBtn.addEventListener("click", () => {
        moveReview(-1);
        resetAutoSlide();
    });
}

function getApiBase() {
    const base = typeof window.API_URL === "string" ? window.API_URL.replace(/\/$/, "") : "";
    return base;
}

function buildAvatar(author) {
    return (author || "А").trim().charAt(0).toUpperCase();
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function appendReviewCard({ author, meta, text }, prepend = false) {
    if (!reviewsTrack) return;
    const avatar = escapeHtml(buildAvatar(author));
    const safeAuthor = escapeHtml(author);
    const safeMeta = escapeHtml(meta || "");
    const safeText = escapeHtml(text);
    const review = document.createElement("div");
    review.className = "review";
    review.innerHTML = `
        <div class="review__avatar"><span>${avatar}</span></div>
        <p>"${safeText}"</p>
        <span>${safeAuthor}${safeMeta ? `, ${safeMeta}` : ""}</span>
    `;

    if (prepend) {
        reviewsTrack.prepend(review);
    } else {
        reviewsTrack.append(review);
    }
}

async function loadSavedReviews() {
    const base = getApiBase();
    if (!base || !reviewsTrack) return;

    try {
        const res = await fetch(`${base}/api/reviews?limit=12`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !Array.isArray(data.items) || !data.items.length) return;

        data.items
            .slice()
            .reverse()
            .forEach((item) =>
                appendReviewCard(
                    { author: item.author, meta: item.meta, text: item.text },
                    false
                )
            );

        currentIndex = 0;
        createSliderDots();
        showReview(currentIndex);
        resetAutoSlide();
    } catch (err) {
        console.error("Не удалось загрузить отзывы:", err);
    }
}

loadSavedReviews();

// ====================== TEACHERS DRAG SLIDER ======================
const teachersSlider = document.querySelector(".teachers__grid");

if (teachersSlider) {
    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    const stopDragging = () => {
        isDown = false;
        teachersSlider.classList.remove("is-dragging");
    };

    teachersSlider.addEventListener("mousedown", (e) => {
        isDown = true;
        teachersSlider.classList.add("is-dragging");
        startX = e.pageX - teachersSlider.offsetLeft;
        scrollLeft = teachersSlider.scrollLeft;
    });

    teachersSlider.addEventListener("mouseleave", stopDragging);
    teachersSlider.addEventListener("mouseup", stopDragging);

    teachersSlider.addEventListener("mousemove", (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - teachersSlider.offsetLeft;
        const walk = (x - startX) * 1.2;
        teachersSlider.scrollLeft = scrollLeft - walk;
    });
}

// ====================== SCROLL REVEAL ======================
const revealItems = document.querySelectorAll(
    ".trial__card, .about__content, .about__text, .about__stat, .teacher-card, .program-card, .advantage, .reviews__slider, .form, .contacts__info, .contacts__map, .contacts__nav"
);

revealItems.forEach((item) => item.classList.add("reveal"));

const observer = new IntersectionObserver(
    (entries, currentObserver) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
                currentObserver.unobserve(entry.target);
            }
        });
    },
    { threshold: 0.2 }
);

revealItems.forEach((item) => observer.observe(item));

// ====================== FORM → API ======================
const form = document.getElementById("contactForm");

function setFieldError(input, hasError) {
    if (hasError) {
        input.style.borderColor = "#2f8667";
        input.style.boxShadow = "0 0 0 2px rgba(47, 134, 103, 0.2)";
    } else {
        input.style.borderColor = "#9fd2c2";
        input.style.boxShadow = "none";
    }
}

if (reviewForm) {
    reviewForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const authorInput = reviewForm.querySelector('[name="author"]');
        const metaInput = reviewForm.querySelector('[name="meta"]');
        const textInput = reviewForm.querySelector('[name="text"]');
        const author = authorInput?.value.trim() ?? "";
        const meta = metaInput?.value.trim() ?? "";
        const text = textInput?.value.trim() ?? "";

        if (!author || text.length < 10) {
            alert("Введите имя и отзыв не короче 10 символов.");
            return;
        }

        const base = getApiBase();
        if (!base) {
            alert("Не задан window.API_URL — укажите адрес API в index.html.");
            return;
        }

        const submitBtn = reviewForm.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;

        try {
            const res = await fetch(`${base}/api/reviews`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ author, meta, text }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                const msg =
                    Array.isArray(data.errors) && data.errors.length
                        ? data.errors.map((x) => x.msg).join("\n")
                        : data.error || `Ошибка ${res.status}`;
                alert(msg);
                return;
            }

            appendReviewCard({ author, meta: meta || "Ученик", text }, true);
            currentIndex = 0;
            createSliderDots();
            showReview(currentIndex);
            resetAutoSlide();
            reviewForm.reset();
            alert("Спасибо! Отзыв сохранен.");
        } catch (err) {
            console.error(err);
            alert("Не удалось отправить отзыв. Попробуйте позже.");
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    });
}

if (form) {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const inputs = form.querySelectorAll("input");
        let isValid = true;

        inputs.forEach((input) => {
            const empty = !input.value.trim();
            setFieldError(input, empty);
            if (empty) isValid = false;
        });

        if (!isValid) {
            alert("Пожалуйста, заполните все поля!");
            return;
        }

        const name = form.querySelector('[name="name"]')?.value.trim() ?? "";
        const email = form.querySelector('[name="email"]')?.value.trim() ?? "";
        const phone = form.querySelector('[name="phone"]')?.value.trim() ?? "";

        const base = typeof window.API_URL === "string" ? window.API_URL.replace(/\/$/, "") : "";
        if (!base) {
            alert("Не задан window.API_URL — укажите адрес API в index.html.");
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;

        try {
            const res = await fetch(`${base}/api/leads`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, phone }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                const msg =
                    Array.isArray(data.errors) && data.errors.length
                        ? data.errors.map((x) => x.msg).join("\n")
                        : data.error || `Ошибка ${res.status}`;
                alert(msg);
                return;
            }

            alert("Заявка успешно отправлена!");
            form.reset();
            inputs.forEach((input) => setFieldError(input, false));
        } catch (err) {
            console.error(err);
            const siteOrigin = typeof window.location?.origin === "string" ? window.location.origin : "";
            alert(
                `Не удалось отправить заявку на ${base}/api/leads.\n\n` +
                    `Проверьте: 1) в index.html window.API_URL — HTTPS-адрес Railway; ` +
                    `2) изменения запушены на GitHub (Pages обновился); ` +
                    `3) в Railway CORS_ORIGIN = ${siteOrigin || "https://ВАШ-логин.github.io"} (только схема и хост, без пути к репозиторию).`
            );
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    });
}