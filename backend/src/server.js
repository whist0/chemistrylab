import "dotenv/config";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import { body, validationResult } from "express-validator";
import { getLatestReviews, saveLead, saveReview } from "./db.js";

const app = express();
const port = Number(process.env.PORT) || 3000;
const host = "0.0.0.0";

app.set("trust proxy", 1);

/** Список origin через запятую; слэш в конце не важен (браузер шлёт Origin без пути). */
function parseAllowedOrigins(raw) {
    if (!raw || typeof raw !== "string") return null;
    const list = raw
        .split(",")
        .map((s) => s.trim().replace(/\/+$/, ""))
        .filter(Boolean);
    return list.length ? list : null;
}

const allowedOrigins = parseAllowedOrigins(process.env.CORS_ORIGIN);

app.use(
    cors({
        origin(origin, callback) {
            if (!allowedOrigins) {
                return callback(null, true);
            }
            if (!origin) {
                return callback(null, true);
            }
            const norm = origin.replace(/\/+$/, "");
            if (allowedOrigins.includes(norm)) {
                return callback(null, true);
            }
            return callback(null, false);
        },
        methods: ["GET", "POST", "OPTIONS"],
        allowedHeaders: ["Content-Type"],
    })
);

app.use(express.json({ limit: "32kb" }));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
});

app.use("/api/", limiter);

function normalizePhone(raw) {
    const digits = String(raw).replace(/\D/g, "");
    if (digits.length === 11 && digits.startsWith("8")) {
        return `7${digits.slice(1)}`;
    }
    if (digits.length === 10) {
        return `7${digits}`;
    }
    return digits;
}

const leadValidators = [
    body("name")
        .trim()
        .notEmpty()
        .withMessage("Укажите имя")
        .isLength({ max: 120 })
        .withMessage("Имя слишком длинное"),
    body("email")
        .trim()
        .notEmpty()
        .withMessage("Укажите email")
        .isEmail()
        .withMessage("Некорректный email")
        .normalizeEmail(),
    body("phone")
        .trim()
        .notEmpty()
        .withMessage("Укажите телефон")
        .custom((value) => {
            const n = normalizePhone(value);
            if (n.length < 10 || n.length > 12) {
                throw new Error("Некорректный номер телефона");
            }
            return true;
        }),
];

const reviewValidators = [
    body("author")
        .trim()
        .notEmpty()
        .withMessage("Укажите имя")
        .isLength({ min: 2, max: 80 })
        .withMessage("Имя должно быть от 2 до 80 символов"),
    body("meta")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 80 })
        .withMessage("Поле класса/статуса слишком длинное"),
    body("text")
        .trim()
        .notEmpty()
        .withMessage("Введите текст отзыва")
        .isLength({ min: 10, max: 500 })
        .withMessage("Отзыв должен быть от 10 до 500 символов"),
];

app.post("/api/leads", leadValidators, (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            ok: false,
            errors: errors.array().map((e) => ({ field: e.path, msg: e.msg })),
        });
    }

    const name = String(req.body.name).trim();
    const email = String(req.body.email).trim();
    const phone = normalizePhone(req.body.phone);

    try {
        const { id } = saveLead({ name, email, phone });
        return res.status(201).json({ ok: true, id: Number(id) });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ ok: false, error: "Не удалось сохранить заявку" });
    }
});

app.post("/api/reviews", reviewValidators, (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            ok: false,
            errors: errors.array().map((e) => ({ field: e.path, msg: e.msg })),
        });
    }

    const author = String(req.body.author).trim();
    const meta = String(req.body.meta || "").trim() || "Ученик";
    const text = String(req.body.text).trim();

    try {
        const { id } = saveReview({ author, meta, text });
        return res.status(201).json({ ok: true, id: Number(id) });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ ok: false, error: "Не удалось сохранить отзыв" });
    }
});

app.get("/api/reviews", (req, res) => {
    const rawLimit = Number.parseInt(String(req.query.limit ?? "20"), 10);
    const limit = Number.isFinite(rawLimit) ? rawLimit : 20;

    try {
        const items = getLatestReviews(limit);
        return res.json({ ok: true, items });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ ok: false, error: "Не удалось получить отзывы" });
    }
});

app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "chemistry-lab-api" });
});

app.get("/", (_req, res) => {
    res.json({ ok: true, service: "chemistry-lab-api", hint: "POST /api/leads" });
});

app.use((_req, res) => {
    res.status(404).json({ ok: false, error: "Not found" });
});

const server = app.listen(port, host);

server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
        console.error(
            `\nПорт ${port} уже занят (часто это незакрытый предыдущий запуск API).\n` +
                `— Закройте тот терминал / остановите процесс node, или\n` +
                `— В backend/.env укажите другой порт, например: PORT=3001\n` +
                `Узнать PID на Windows: netstat -ano | findstr :${port}\n` +
                `Завершить: taskkill /PID <номер_из_последней_колонки> /F\n`
        );
        process.exit(1);
    }
    throw err;
});

server.on("listening", () => {
    console.log(`API слушает http://${host}:${port} (Railway: наружу через $PORT)`);
    console.log(`Health: GET /api/health`);
});
