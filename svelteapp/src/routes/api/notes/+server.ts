import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { createNoteSchema, type CreateNoteRequest, type GetNotesResponse, type CreateNoteResponse } from './types';
import { getAllNotes, addNote, generateNoteId } from './state';

/** GET /api/notes — returns all notes */
export const GET: RequestHandler = async () => {
	try {
		const notes = getAllNotes();
		
		const response: GetNotesResponse = {
			notes,
			count: notes.length
		};

		return json(response);
	} catch (err) {
		console.error('Error fetching notes:', err);
		throw error(500, 'Failed to fetch notes');
	}
};

/** POST /api/notes — create a new note */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		
		// Validate request body using Zod
		const validationResult = createNoteSchema.safeParse(body);
		
		if (!validationResult.success) {
			const errorMessage = validationResult.error.issues
				.map(issue => `${issue.path.join('.')}: ${issue.message}`)
				.join(', ');
			
			throw error(400, `Validation error: ${errorMessage}`);
		}

		const { title, content } = validationResult.data as CreateNoteRequest;
		
		// Create new note with generated ID and timestamp
		const now = new Date();
		const newNote = {
			id: generateNoteId(),
			title,
			content,
			createdAt: now
		};

		// Add to storage
		addNote(newNote);

		const response: CreateNoteResponse = {
			note: newNote
		};

		return json(response, { status: 201 });
	} catch (err) {
		// Check if it's a SvelteKit HttpError (has status property)
		if (err && typeof err === 'object' && 'status' in err) {
			// Re-throw SvelteKit errors (like validation errors) as-is
			throw err;
		}
		
		console.error('Error creating note:', err);
		throw error(500, 'Failed to create note');
	}
};