export const API_URL =
	'https://script.google.com/macros/s/AKfycby-iuMONzDe_IPIulZ-RWDST8aM_saJJukGHctZhgKToAYhTf9---JBmZDKVE2fOKZn6Q/exec';

export async function fetchRecetario() {
	try {
		const response = await fetch('/api/recetario', { redirect: 'follow' });
		const data = await response.json();

		if (data.success) {
			return data.data;
		}
		console.warn('Aviso al consultar Google Apps Script:', data.error);
		return null;
	} catch (error) {
		console.error('Error obteniendo datos:', error);
		return null;
	}
}

export async function uploadImageToDrive(file: File): Promise<string> {
	const base64String = await new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const result = String(reader.result ?? '');
			const base64 = result.includes(',') ? result.split(',')[1] : result;
			resolve(base64);
		};
		reader.onerror = (error) => reject(error);
		reader.readAsDataURL(file);
	});

	try {
		const response = await fetch('/api/recetario', {
			method: 'POST',
			redirect: 'follow',
			headers: {
				'Content-Type': 'text/plain;charset=utf-8'
			},
			body: JSON.stringify({
				action: 'uploadImage',
				filename: file.name,
				mimeType: file.type,
				base64: base64String
			})
		});

		const data = await response.json();

		if (data.success) {
			return String(data.url ?? data.imageUrl ?? data.data?.url ?? data.data ?? '');
		}
		throw new Error(data.error || 'Error al subir la imagen a Drive');
	} catch (error) {
		console.error('Error subiendo imagen:', error);
		throw error;
	}
}

export async function saveNewReceta(
	recetaData: Record<string, unknown>,
	ingredientesData: Record<string, unknown>[]
): Promise<boolean> {
	try {
		const response = await fetch('/api/recetario', {
			method: 'POST',
			redirect: 'follow',
			headers: {
				'Content-Type': 'text/plain;charset=utf-8'
			},
			body: JSON.stringify({
				action: 'saveReceta',
				receta: recetaData,
				ingredientes: ingredientesData
			})
		});

		const data = await response.json();

		if (data.success) {
			return true;
		}
		throw new Error(data.error || 'Error al guardar la receta');
	} catch (error) {
		console.error('Error guardando nueva receta:', error);
		return false;
	}
}

export async function saveNewIngrediente(ingredienteData: Record<string, unknown>) {
	try {
		const response = await fetch('/api/recetario', {
			method: 'POST',
			redirect: 'follow',
			headers: {
				'Content-Type': 'text/plain;charset=utf-8'
			},
			body: JSON.stringify({
				action: 'saveIngrediente',
				ingrediente: ingredienteData
			})
		});

		const data = await response.json();
		return data;
	} catch (error) {
		console.error('Error guardando nuevo ingrediente:', error);
		return { success: false, error: 'Error al guardar el ingrediente' };
	}
}
