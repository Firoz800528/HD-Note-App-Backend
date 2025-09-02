import { Router } from 'express';
import { z } from 'zod';
import { Db, ObjectId } from 'mongodb';

const router = Router();
const noteSchema = z.object({ title: z.string().min(1).max(120), content: z.string().min(1).max(5000) });

// Define Note type including _id
type Note = {
  _id: ObjectId;
  userId: ObjectId;
  title: string;
  content: string;
  createdAt: Date;
};

// Get all notes
router.get('/', async (req, res) => {
  const db: Db = req.app.locals.db;
  const notes = await db
    .collection<Note>('notes')
    .find({ userId: new ObjectId(req.user!.id) })
    .sort({ createdAt: -1 })
    .toArray();
  res.json({ notes });
});

// Create a note
router.post('/', async (req, res) => {
  try {
    const db: Db = req.app.locals.db;
    const { title, content } = noteSchema.parse(req.body);

    const noteToInsert = {
      userId: new ObjectId(req.user!.id),
      title,
      content,
      createdAt: new Date(),
    };

    const result = await db.collection<Note>('notes').insertOne(noteToInsert);

    const note: Note = { _id: result.insertedId, ...noteToInsert }; // include _id
    res.status(201).json({ note });
  } catch (e: any) {
    res.status(400).json({ message: e.message || 'Invalid note' });
  }
});

// Delete a note
router.delete('/:id', async (req, res) => {
  const db: Db = req.app.locals.db;
  const id = req.params.id;

  const note = await db.collection<Note>('notes').findOne({ _id: new ObjectId(id), userId: new ObjectId(req.user!.id) });
  if (!note) return res.status(404).json({ message: 'Note not found' });

  await db.collection<Note>('notes').deleteOne({ _id: new ObjectId(id) });
  res.json({ message: 'Deleted' });
});

export default router;
