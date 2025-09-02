import { Router } from 'express';
import { z } from 'zod';
import { Db, ObjectId } from 'mongodb';

const router = Router();

// Zod schema for note validation
const noteSchema = z.object({
  title: z.string().min(1).max(120),
  content: z.string().min(1).max(5000),
});

// Define Note type with optional _id for inserts
type Note = {
  _id?: ObjectId;  // optional because MongoDB generates it
  userId: ObjectId;
  title: string;
  content: string;
  createdAt: Date;
};

// GET all notes for the logged-in user
router.get('/', async (req, res) => {
  try {
    const db: Db = req.app.locals.db;

    const notes = await db
      .collection<Note>('notes')
      .find({ userId: new ObjectId(req.user!.id) })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ notes });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Failed to fetch notes' });
  }
});

// CREATE a new note
router.post('/', async (req, res) => {
  try {
    const db: Db = req.app.locals.db;

    // Validate request body
    const { title, content } = noteSchema.parse(req.body);

    // Prepare note for insertion
    const noteToInsert: Omit<Note, '_id'> = {
      userId: new ObjectId(req.user!.id),
      title,
      content,
      createdAt: new Date(),
    };

    // Insert into MongoDB
    const result = await db.collection<Note>('notes').insertOne(noteToInsert);

    // Add generated _id to return
    const note: Note = { _id: result.insertedId, ...noteToInsert };

    res.status(201).json({ note });
  } catch (e: any) {
    res.status(400).json({ message: e.message || 'Invalid note' });
  }
});

// DELETE a note by ID
router.delete('/:id', async (req, res) => {
  try {
    const db: Db = req.app.locals.db;
    const id = req.params.id;

    // Find note to ensure it belongs to the user
    const note = await db.collection<Note>('notes').findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.user!.id),
    });

    if (!note) return res.status(404).json({ message: 'Note not found' });

    // Delete the note
    await db.collection<Note>('notes').deleteOne({ _id: new ObjectId(id) });

    res.json({ message: 'Deleted' });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Failed to delete note' });
  }
});

export default router;
