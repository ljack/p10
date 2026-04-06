import type { Note } from './types';

/** In-memory notes storage */
export const notesState = {
	notes: [] as Note[],
	nextId: 1
};

/** Generate a unique ID for a new note */
export function generateNoteId(): string {
	return `note-${notesState.nextId++}`;
}

/** Get all notes (returns a copy to prevent external mutations) */
export function getAllNotes(): Note[] {
	return notesState.notes.map(note => ({
		...note,
		createdAt: new Date(note.createdAt)
	}));
}

/** Add a new note to storage */
export function addNote(note: Note): void {
	notesState.notes.push(note);
}

/** Find a note by ID */
export function findNoteById(id: string): Note | undefined {
	return notesState.notes.find(note => note.id === id);
}

/** Delete a note by ID */
export function deleteNoteById(id: string): boolean {
	const initialLength = notesState.notes.length;
	notesState.notes = notesState.notes.filter(note => note.id !== id);
	return notesState.notes.length < initialLength;
}