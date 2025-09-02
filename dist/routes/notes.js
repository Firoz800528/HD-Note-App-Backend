"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const mongodb_1 = require("mongodb");
const router = (0, express_1.Router)();
const noteSchema = zod_1.z.object({ title: zod_1.z.string().min(1).max(120), content: zod_1.z.string().min(1).max(5000) });
// Get all notes
router.get('/', async (req, res) => {
    const db = req.app.locals.db;
    const notes = await db
        .collection('notes')
        .find({ userId: new mongodb_1.ObjectId(req.user.id) })
        .sort({ createdAt: -1 })
        .toArray();
    res.json({ notes });
});
// Create a note
router.post('/', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { title, content } = noteSchema.parse(req.body);
        const noteToInsert = {
            userId: new mongodb_1.ObjectId(req.user.id),
            title,
            content,
            createdAt: new Date(),
        };
        const result = await db.collection('notes').insertOne(noteToInsert);
        const note = { _id: result.insertedId, ...noteToInsert }; // include _id
        res.status(201).json({ note });
    }
    catch (e) {
        res.status(400).json({ message: e.message || 'Invalid note' });
    }
});
// Delete a note
router.delete('/:id', async (req, res) => {
    const db = req.app.locals.db;
    const id = req.params.id;
    const note = await db.collection('notes').findOne({ _id: new mongodb_1.ObjectId(id), userId: new mongodb_1.ObjectId(req.user.id) });
    if (!note)
        return res.status(404).json({ message: 'Note not found' });
    await db.collection('notes').deleteOne({ _id: new mongodb_1.ObjectId(id) });
    res.json({ message: 'Deleted' });
});
exports.default = router;
