import type { RequestHandler } from './$types';

interface CalculateRequest {
	a: number;
	b: number;
	operator: string;
}

interface CalculateResponse {
	result: number;
}

interface ErrorResponse {
	error: string;
}

/** POST /api/calculate — perform basic arithmetic */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body: CalculateRequest = await request.json();
		const { a, b, operator } = body;

		// Validate inputs
		if (typeof a !== 'number' || typeof b !== 'number') {
			return new Response(
				JSON.stringify({ error: 'Invalid input: a and b must be numbers' } as ErrorResponse),
				{ status: 400, headers: { 'Content-Type': 'application/json' } }
			);
		}

		if (typeof operator !== 'string') {
			return new Response(
				JSON.stringify({ error: 'Invalid input: operator must be a string' } as ErrorResponse),
				{ status: 400, headers: { 'Content-Type': 'application/json' } }
			);
		}

		let result: number;

		switch (operator) {
			case '+':
				result = a + b;
				break;
			case '-':
				result = a - b;
				break;
			case '*':
				result = a * b;
				break;
			case '/':
				if (b === 0) {
					return new Response(
						JSON.stringify({ error: 'Division by zero' } as ErrorResponse),
						{ status: 400, headers: { 'Content-Type': 'application/json' } }
					);
				}
				result = a / b;
				break;
			default:
				return new Response(
					JSON.stringify({ error: `Invalid operator: ${operator}. Supported: +, -, *, /` } as ErrorResponse),
					{ status: 400, headers: { 'Content-Type': 'application/json' } }
				);
		}

		return new Response(
			JSON.stringify({ result } as CalculateResponse),
			{ headers: { 'Content-Type': 'application/json' } }
		);
	} catch (err: any) {
		return new Response(
			JSON.stringify({ error: 'Invalid JSON body' } as ErrorResponse),
			{ status: 400, headers: { 'Content-Type': 'application/json' } }
		);
	}
};
