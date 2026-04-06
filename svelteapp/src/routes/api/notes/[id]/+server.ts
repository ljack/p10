import type { RequestHandler } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';
import { deleteNoteById, findNoteById, updateNoteById } from '../state';
import { createNoteSchema, type DeleteNoteResponse, type UpdateNoteResponse } from '../types';

/** DELETE /api/notes/:id — delete a note by ID */
export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const { id } = params;
		
		if (!id) {
			throw error(400, 'Note ID is required');
		}

		// Check if note exists before attempting to delete
		const existingNote = findNoteById(id);
		if (!existingNote) {
			throw error(404, 'Note not found');
		}

		// Attempt to delete the note
		const wasDeleted = deleteNoteById(id);
		
		if (!wasDeleted) {
			// This shouldn't happen if findNoteById worked, but added for safety
			throw error(404, 'Note not found');
		}

		const response: DeleteNoteResponse = {
			message: 'Note deleted successfully',
			id
		};

		return json(response, { status: 200 });
	} catch (err) {
		// Check if it's a SvelteKit HttpError (has status property)
		if (err && typeof err === 'object' && 'status' in err) {
			// Re-throw SvelteKit errors (like 404, 400) as-is
			throw err;
		}
		
		console.error('Error deleting note:', err);
		throw error(500, 'Failed to delete note');
	}
};

/** PUT /api/notes/:id — update a note by ID */
export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const { id } = params;
		
		if (!id) {
			throw error(400, 'Note ID is required');
		}

		// Check if note exists
		const existingNote = findNoteById(id);
		if (!existingNote) {
			throw error(404, 'Note not found');
		}

		// Parse and validate request body
		const body = await request.json();
		const validationResult = createNoteSchema.safeParse(body);
		
		if (!validationResult.success) {
			const errorMessage = validationResult.error.issues
				.map(issue => `${issue.path.join('.')}: ${issue.message}`)
				.join(', ');
			
			throw error(400, `Validation error: ${errorMessage}`);
		}

		const { title, content } = validationResult.data;
		
		// Update the note
		const updatedNote = updateNoteById(id, { title, content });
		
		if (!updatedNote) {
			throw error(500, 'Failed to update note');
		}

		const response: UpdateNoteResponse = {
			note: updatedNote
		};

		return json(response, { status: 200 });
	} catch (err) {
		// Check if it's a SvelteKit HttpError (has status property)
		if (err && typeof err === 'object' && 'status' in err) {
			// Re-throw SvelteKit errors (like validation errors) as-is
			throw err;
		}
		
		console.error('Error updating note:', err);
		throw error(500, 'Failed to update note');
	}
};