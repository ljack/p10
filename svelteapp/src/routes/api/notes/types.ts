import { z } from 'zod';

/** Zod schema for creating a new note */
export const createNoteSchema = z.object({
	title: z.string().min(1, 'Title is required').max(255, 'Title must be 255 characters or less'),
	content: z.string().max(10000, 'Content must be 10,000 characters or less')
});

/** Zod schema for a complete note (includes ID and timestamps) */
export const noteSchema = createNoteSchema.extend({
	id: z.string(),
	createdAt: z.date()
});

/** TypeScript types derived from Zod schemas */
export type CreateNoteRequest = z.infer<typeof createNoteSchema>;
export type Note = z.infer<typeof noteSchema>;

/** API response types */
export type GetNotesResponse = {
	notes: Note[];
	count: number;
};

export type CreateNoteResponse = {
	note: Note;
};

export type DeleteNoteResponse = {
	message: string;
	id: string;
};