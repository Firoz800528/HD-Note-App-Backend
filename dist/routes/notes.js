"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const mongodb_1 = require("mongodb");
const router = (0, express_1.Router)();
// Zod schema for note validation
const noteSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(120),
    content: zod_1.z.string().min(1).max(5000),
});
// GET all notes for the logged-in user
router.get('/', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const notes = await db
            .collection('notes')
            .find({ userId: new mongodb_1.ObjectId(req.user.id) })
            .sort({ createdAt: -1 })
            .toArray();
        res.json({ notes });
    }
    catch (e) {
        res.status(500).json({ message: e.message || 'Failed to fetch notes' });
    }
});
// CREATE a new note
router.post('/', async (req, res) => {
    try {
        const db = req.app.locals.db;
        // Validate request body
        const { title, content } = noteSchema.parse(req.body);
        // Prepare note for insertion
        const noteToInsert = {
            userId: new mongodb_1.ObjectId(req.user.id),
            title,
            content,
            createdAt: new Date(),
        };
        // Insert into MongoDB
        const result = await db.collection('notes').insertOne(noteToInsert);
        // Add generated _id to return
        const note = { _id: result.insertedId, ...noteToInsert };
        res.status(201).json({ note });
    }
    catch (e) {
        res.status(400).json({ message: e.message || 'Invalid note' });
    }
});
// DELETE a note by ID
router.delete('/:id', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const id = req.params.id;
        // Find note to ensure it belongs to the user
        const note = await db.collection('notes').findOne({
            _id: new mongodb_1.ObjectId(id),
            userId: new mongodb_1.ObjectId(req.user.id),
        });
        if (!note)
            return res.status(404).json({ message: 'Note not found' });
        // Delete the note
        await db.collection('notes').deleteOne({ _id: new mongodb_1.ObjectId(id) });
        res.json({ message: 'Deleted' });
    }
    catch (e) {
        res.status(500).json({ message: e.message || 'Failed to delete note' });
    }
});
exports.default = router;
