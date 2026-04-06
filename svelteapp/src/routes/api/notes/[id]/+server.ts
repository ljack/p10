import type { RequestHandler } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';
import { deleteNoteById, findNoteById } from '../state';
import type { DeleteNoteResponse } from '../types';

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