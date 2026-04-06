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
		createdAt: new Date(note.createdAt),
		updatedAt: new Date(note.updatedAt)
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

/** Update a note by ID */
export function updateNoteById(id: string, updates: { title: string; content: string }): Note | null {
	const noteIndex = notesState.notes.findIndex(note => note.id === id);
	if (noteIndex === -1) {
		return null;
	}
	
	const existingNote = notesState.notes[noteIndex];
	const updatedNote: Note = {
		...existingNote,
		title: updates.title,
		content: updates.content,
		updatedAt: new Date() // Update the timestamp
	};
	
	notesState.notes[noteIndex] = updatedNote;
	return updatedNote;
}

/** Update existing notes to include both timestamps if missing */
export function migrateNotesToIncludeTimestamps(): void {
	const now = new Date();
	notesState.notes = notesState.notes.map(note => ({
		...note,
		// Ensure createdAt exists (use current time if missing)
		createdAt: note.createdAt ? new Date(note.createdAt) : now,
		// Ensure updatedAt exists (use current time if missing)
		updatedAt: note.updatedAt ? new Date(note.updatedAt) : now
	}));
}