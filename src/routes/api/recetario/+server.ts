import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { API_URL } from '$lib/api';

export const GET: RequestHandler = async () => {
	try {
		const response = await fetch(API_URL, {
			method: 'GET',
			redirect: 'follow'
		});

		const text = await response.text();

		if (response.url.includes('accounts.google.com')) {
			return json({
				success: false,
				reason: 'AUTH_REQUIRED',
				error:
					'La URL de Google Apps Script está pidiendo iniciar sesión en Google (accounts.google.com).'
			});
		}

		try {
			const data = JSON.parse(text);
			return json(data);
		} catch {
			return json({
				success: false,
				reason: 'INVALID_JSON',
				error: 'Google Apps Script devolvió HTML en lugar de JSON.',
				preview: text.slice(0, 200)
			});
		}
	} catch (error) {
		return json({
			success: false,
			reason: 'NETWORK_ERROR',
			error: error instanceof Error ? error.message : 'Error de red al conectar con Apps Script'
		});
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.text();
		const response = await fetch(API_URL, {
			method: 'POST',
			redirect: 'follow',
			headers: {
				'Content-Type': 'text/plain;charset=utf-8'
			},
			body
		});

		const text = await response.text();
		const data = JSON.parse(text);
		return json(data);
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Error procesando POST en Apps Script'
			},
			{ status: 500 }
		);
	}
};
