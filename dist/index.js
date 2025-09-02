"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const mongodb_1 = require("mongodb");
const auth_1 = __importDefault(require("./routes/auth"));
const notes_1 = __importDefault(require("./routes/notes"));
const auth_2 = require("./middleware/auth");
const app = (0, express_1.default)();
// Middleware
app.use((0, helmet_1.default)());
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
    credentials: true,
}));
// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
async function main() {
    try {
        // Connect to MongoDB
        const client = new mongodb_1.MongoClient(process.env.MONGO_URI);
        await client.connect();
        const db = client.db();
        app.locals.db = db;
        console.log('MongoDB connected');
        // Routes
        app.use('/api/auth', auth_1.default);
        app.use('/api/notes', auth_2.auth, notes_1.default);
        app.get('/api/me', auth_2.auth, (req, res) => {
            res.json({ user: req.user });
        });
        // Root route
        app.get('/', (_req, res) => {
            res.send('API is running');
        });
        // Catch-all for 404
        app.use((_req, res) => {
            res.status(404).json({ error: 'Route not found' });
        });
        const PORT = parseInt(process.env.PORT || '5174', 10);
        app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
    }
    catch (err) {
        console.error('Server startup error', err);
        process.exit(1);
    }
}
// Start server
main();
