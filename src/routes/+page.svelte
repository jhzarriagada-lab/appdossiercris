<script lang="ts">
	import { onMount } from 'svelte';
	import {
		fetchRecetario,
		uploadImageToDrive,
		saveNewReceta,
		saveNewIngrediente
	} from '$lib/api';

	interface Ingrediente {
		id_ingrediente?: string | number;
		id?: string | number;
		nombre?: string;
		unidad_medida?: string;
		costo_unitario?: number | string;
		porcentaje_merma?: string | number;
		alergenos?: string;
		[key: string]: unknown;
	}

	interface Receta {
		id_receta?: string | number;
		id?: string | number;
		nombre_plato?: string;
		nombre?: string;
		categoria?: string;
		rendimiento_base?: number | string;
		tiempo_preparacion?: string;
		instrucciones?: string;
		url_imagen?: string;
		[key: string]: unknown;
	}

	interface Ficha {
		id_receta?: string | number;
		id_ingrediente?: string | number;
		cantidad_bruta?: number | string;
		cantidad?: number | string;
		[key: string]: unknown;
	}

	interface RecetarioDB {
		ingredientes: Ingrediente[];
		recetas: Receta[];
		fichas: Ficha[];
	}

	interface IngredienteSeleccionado {
		id_ingrediente: string;
		cantidad_bruta: number;
	}

	interface NuevaRecetaForm {
		nombre: string;
		categoria: string;
		rendimiento: number;
		miseEnPlace: string;
		instrucciones: string;
		ingredientesSeleccionados: IngredienteSeleccionado[];
	}

	let db: RecetarioDB = {
		ingredientes: [],
		recetas: [],
		fichas: []
	};
	let recetaSeleccionada: Receta | null = null;
	let porcionesDeseadas: number = 1;
	let cargando: boolean = true;

	// Estado para modo de creación
	let modoCreacion: boolean = false;
	let archivoImagen: File | null = null;
	let guardando: boolean = false;

	// Estado para el modal de Nuevo Ingrediente
	let mostrarModalIngrediente: boolean = false;
	let indiceFilaActiva: number | null = null;
	let guardandoIngrediente: boolean = false;
	let nuevoIngredienteForm = {
		nombre: '',
		unidad_medida: '',
		costo_unitario: '',
		porcentaje_merma: '',
		alergenos: ''
	};

	function resetearNuevoIngredienteForm() {
		nuevoIngredienteForm = {
			nombre: '',
			unidad_medida: '',
			costo_unitario: '',
			porcentaje_merma: '',
			alergenos: ''
		};
	}

	function manejarCambioSelectIngrediente(event: Event, index: number) {
		const target = event.currentTarget as HTMLSelectElement;
		if (target.value === 'NUEVO') {
			indiceFilaActiva = index;
			resetearNuevoIngredienteForm();
			mostrarModalIngrediente = true;
		}
	}

	function cancelarModalIngrediente() {
		if (
			indiceFilaActiva !== null &&
			nuevaReceta.ingredientesSeleccionados[indiceFilaActiva]?.id_ingrediente === 'NUEVO'
		) {
			const primerId = String(db.ingredientes[0]?.id_ingrediente ?? db.ingredientes[0]?.id ?? '');
			nuevaReceta.ingredientesSeleccionados[indiceFilaActiva].id_ingrediente = primerId;
			nuevaReceta.ingredientesSeleccionados = [...nuevaReceta.ingredientesSeleccionados];
		}
		mostrarModalIngrediente = false;
		indiceFilaActiva = null;
	}

	async function submitNuevoIngrediente() {
		if (!nuevoIngredienteForm.nombre.trim()) {
			alert('Por favor ingresa el nombre del ingrediente.');
			return;
		}

		guardandoIngrediente = true;
		try {
			const respuesta = await saveNewIngrediente({
				nombre: nuevoIngredienteForm.nombre.trim(),
				unidad_medida: nuevoIngredienteForm.unidad_medida.trim() || 'kg',
				costo_unitario: nuevoIngredienteForm.costo_unitario,
				porcentaje_merma: nuevoIngredienteForm.porcentaje_merma.trim() || '0%',
				alergenos: nuevoIngredienteForm.alergenos.trim() || 'Ninguno'
			});

			if (respuesta && respuesta.success) {
				const ingredienteCreado: Ingrediente = respuesta.data ??
					respuesta.ingrediente ?? {
						...nuevoIngredienteForm,
						id_ingrediente: respuesta.id_ingrediente ?? respuesta.id ?? `ING-${Date.now()}`
					};

				db = {
					...db,
					ingredientes: [...db.ingredientes, ingredienteCreado]
				};

				const nuevoId = String(
					ingredienteCreado.id_ingrediente ?? ingredienteCreado.id ?? ''
				);

				if (
					indiceFilaActiva !== null &&
					nuevaReceta.ingredientesSeleccionados[indiceFilaActiva]
				) {
					nuevaReceta.ingredientesSeleccionados[indiceFilaActiva].id_ingrediente = nuevoId;
					nuevaReceta.ingredientesSeleccionados = [...nuevaReceta.ingredientesSeleccionados];
				}

				mostrarModalIngrediente = false;
				indiceFilaActiva = null;
				resetearNuevoIngredienteForm();
			} else {
				alert(respuesta?.error || 'No se pudo guardar el nuevo ingrediente.');
			}
		} catch (error) {
			console.error('Error al guardar ingrediente:', error);
			alert('Ocurrió un error al guardar el ingrediente.');
		} finally {
			guardandoIngrediente = false;
		}
	}

	let nuevaReceta: NuevaRecetaForm = {
		nombre: '',
		categoria: '',
		rendimiento: 1,
		miseEnPlace: '',
		instrucciones: '',
		ingredientesSeleccionados: []
	};

	function resetearFormulario() {
		nuevaReceta = {
			nombre: '',
			categoria: '',
			rendimiento: 1,
			miseEnPlace: '',
			instrucciones: '',
			ingredientesSeleccionados: []
		};
		archivoImagen = null;
	}

	function activarModoCreacion() {
		modoCreacion = true;
		recetaSeleccionada = null;
		if (nuevaReceta.ingredientesSeleccionados.length === 0 && db.ingredientes.length > 0) {
			agregarIngrediente();
		}
	}

	function agregarIngrediente() {
		const primerId = String(db.ingredientes[0]?.id_ingrediente ?? db.ingredientes[0]?.id ?? '');
		nuevaReceta.ingredientesSeleccionados = [
			...nuevaReceta.ingredientesSeleccionados,
			{
				id_ingrediente: primerId,
				cantidad_bruta: 0
			}
		];
	}

	function eliminarIngrediente(index: number) {
		nuevaReceta.ingredientesSeleccionados = nuevaReceta.ingredientesSeleccionados.filter(
			(_, i) => i !== index
		);
	}

	function manejarCambioImagen(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		archivoImagen = target.files && target.files.length > 0 ? target.files[0] : null;
	}

	async function submitReceta() {
		if (!nuevaReceta.nombre.trim()) {
			alert('Por favor ingresa el nombre de la receta.');
			return;
		}

		guardando = true;
		try {
			let urlImagen = '';
			if (archivoImagen) {
				urlImagen = await uploadImageToDrive(archivoImagen);
			}

			const bloquesTexto: string[] = [];
			if (nuevaReceta.miseEnPlace.trim()) {
				bloquesTexto.push(`Mise en place:\n${nuevaReceta.miseEnPlace.trim()}`);
			}
			if (nuevaReceta.instrucciones.trim()) {
				bloquesTexto.push(`Paso a paso:\n${nuevaReceta.instrucciones.trim()}`);
			}
			const instruccionesConcatenadas = bloquesTexto.join('\n\n');

			const recetaPayload = {
				nombre: nuevaReceta.nombre.trim(),
				nombre_plato: nuevaReceta.nombre.trim(),
				categoria: nuevaReceta.categoria.trim(),
				rendimiento: Number(nuevaReceta.rendimiento) || 1,
				rendimiento_base: Number(nuevaReceta.rendimiento) || 1,
				instrucciones: instruccionesConcatenadas,
				url_imagen: urlImagen
			};

			const ingredientesPayload = nuevaReceta.ingredientesSeleccionados
				.filter((item) => item.id_ingrediente && Number(item.cantidad_bruta) > 0)
				.map((item) => ({
					id_ingrediente: item.id_ingrediente,
					cantidad_bruta: Number(item.cantidad_bruta),
					cantidad: Number(item.cantidad_bruta)
				}));

			const exito = await saveNewReceta(recetaPayload, ingredientesPayload);

			if (exito) {
				resetearFormulario();
				modoCreacion = false;
				cargando = true;
				const data = await fetchRecetario();
				if (data) {
					db = {
						ingredientes: Array.isArray(data.ingredientes) ? data.ingredientes : [],
						recetas: Array.isArray(data.recetas) ? data.recetas : [],
						fichas: Array.isArray(data.fichas) ? data.fichas : []
					};
					if (db.recetas.length > 0) {
						const ultimaReceta = db.recetas[db.recetas.length - 1];
						recetaSeleccionada = ultimaReceta;
						porcionesDeseadas = obtenerRendimientoBase(ultimaReceta);
					}
				}
				cargando = false;
			} else {
				alert('No se pudo guardar la receta. Verifica la conexión con Google Apps Script.');
			}
		} catch (error) {
			console.error('Error en submitReceta:', error);
			alert('Ocurrió un error al guardar la receta.');
		} finally {
			guardando = false;
		}
	}

	async function cargarDatos() {
		cargando = true;
		const data = await fetchRecetario();
		if (data) {
			db = {
				ingredientes: Array.isArray(data.ingredientes) ? data.ingredientes : [],
				recetas: Array.isArray(data.recetas) ? data.recetas : [],
				fichas: Array.isArray(data.fichas) ? data.fichas : []
			};
		}
		cargando = false;
	}

	onMount(() => {
		cargarDatos();
	});

	function parsearCantidad(valor: unknown): number {
		if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0;
		if (typeof valor === 'string') {
			const limpio = valor.trim().replace(/\s/g, '');
			if (!limpio) return 0;
			const normalizado = limpio.includes(',')
				? limpio.replace(/\./g, '').replace(',', '.')
				: limpio;
			const num = parseFloat(normalizado);
			return Number.isFinite(num) ? num : 0;
		}
		return 0;
	}

	function parsearCosto(valor: unknown): number {
		if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0;
		if (typeof valor === 'string') {
			const limpio = valor.replace(/[$\s.]/g, '').replace(',', '.');
			const num = parseFloat(limpio);
			return Number.isFinite(num) ? num : 0;
		}
		return 0;
	}

	function obtenerNombreReceta(receta: Receta): string {
		return String(
			receta.nombre_plato ?? receta.nombre ?? receta.id_receta ?? 'Receta sin nombre'
		);
	}

	function obtenerRendimientoBase(receta: Receta | null): number {
		if (!receta) return 1;
		const valor = parsearCantidad(receta.rendimiento_base ?? 1);
		return valor > 0 ? valor : 1;
	}

	function seleccionarReceta(receta: Receta) {
		modoCreacion = false;
		recetaSeleccionada = receta;
		porcionesDeseadas = obtenerRendimientoBase(receta);
	}

	// Bloques reactivos ($:) para cálculo en tiempo real
	$: rendimiento_base = obtenerRendimientoBase(recetaSeleccionada);

	$: factorMultiplicador =
		recetaSeleccionada && rendimiento_base > 0
			? Math.max(0, Number(porcionesDeseadas) || 0) / rendimiento_base
			: 0;

	$: detalleIngredientes = recetaSeleccionada
		? db.fichas
				.filter(
					(ficha) =>
						String(ficha.id_receta).trim() ===
						String(recetaSeleccionada?.id_receta ?? recetaSeleccionada?.id).trim()
				)
				.map((ficha) => {
					const ingredienteEncontrado = db.ingredientes.find(
						(ing) =>
							String(ing.id_ingrediente ?? ing.id).trim() ===
							String(ficha.id_ingrediente).trim()
					);

					const nombre = String(
						ingredienteEncontrado?.nombre ?? ficha.id_ingrediente ?? 'Ingrediente'
					);
					const unidad = String(ingredienteEncontrado?.unidad_medida ?? '');
					const cantidadBase = parsearCantidad(ficha.cantidad_bruta ?? ficha.cantidad ?? 0);
					const costoUnitario = parsearCosto(ingredienteEncontrado?.costo_unitario ?? 0);

					const cantidadNecesaria = cantidadBase * factorMultiplicador;
					const costo = cantidadNecesaria * costoUnitario;

					return {
						nombre,
						unidad,
						cantidadNecesaria,
						costo
					};
				})
		: [];

	$: costoTotalReceta = detalleIngredientes.reduce((acumulado, item) => acumulado + item.costo, 0);
	$: costoTotal = costoTotalReceta;

	let porcentajeFoodCost = 30;

	$: precioSugerido =
		costoTotalReceta > 0 && porcentajeFoodCost > 0
			? costoTotalReceta / (porcentajeFoodCost / 100)
			: 0;
	$: margenBruto = precioSugerido - costoTotalReceta;

	function formatearCantidad(valor: number): string {
		return new Intl.NumberFormat('es-CL', {
			minimumFractionDigits: 0,
			maximumFractionDigits: 3
		}).format(valor);
	}

	function formatearMoneda(valor: number): string {
		return new Intl.NumberFormat('es-CL', {
			style: 'currency',
			currency: 'CLP',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(valor);
	}
</script>

<div class="min-h-screen bg-slate-100 text-slate-800">
	<!-- Encabezado corporativo -->
	<header class="border-b border-slate-200 bg-slate-900 text-white shadow-sm">
		<div class="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
			<button
				type="button"
				on:click={() => {
					recetaSeleccionada = null;
					modoCreacion = false;
				}}
				class="text-left focus:outline-none"
			>
				<h1 class="text-xl font-semibold tracking-tight">Sistema de Recetario y Costos</h1>
				<p class="text-xs text-slate-300">Fichas técnicas y cálculo dinámico de porciones</p>
			</button>
			<div class="flex items-center gap-3">
				<span class="hidden rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 sm:inline-block">
					{db.recetas.length} {db.recetas.length === 1 ? 'receta disponible' : 'recetas disponibles'}
				</span>
				<button
					type="button"
					on:click={activarModoCreacion}
					class="rounded-md bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-900 shadow-2xs transition hover:bg-slate-100"
				>
					+ Nueva Receta
				</button>
			</div>
		</div>
	</header>

	{#if cargando}
		<!-- Estado de carga centrado -->
		<div class="flex min-h-[calc(100vh-4.5rem)] flex-col items-center justify-center p-6">
			<div
				class="h-12 w-12 animate-spin rounded-full border-4 border-slate-300 border-t-slate-900"
				role="status"
				aria-label="Cargando recetario"
			></div>
			<p class="mt-4 text-sm font-medium text-slate-600">Cargando datos del recetario...</p>
		</div>
	{:else}
		<main class="mx-auto max-w-7xl p-6">
			{#if modoCreacion}
				<!-- Vista de Formulario de Creación -->
				<div class="mx-auto max-w-4xl">
					<div class="mb-5">
						<button
							type="button"
							on:click={() => {
								modoCreacion = false;
								recetaSeleccionada = null;
							}}
							class="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-2xs transition hover:bg-slate-50"
						>
							⬅ Volver a la Biblioteca
						</button>
					</div>

					<form
						on:submit|preventDefault={submitReceta}
						class="rounded-xl border border-slate-200 bg-white shadow-sm"
					>
						<div class="border-b border-slate-200 bg-slate-50 px-6 py-5">
							<span class="text-xs font-semibold tracking-wider text-slate-500 uppercase">
								Registro de Ficha Técnica
							</span>
							<h2 class="mt-0.5 text-2xl font-bold text-slate-900">Crear Nueva Receta</h2>
						</div>

						<div class="space-y-6 p-6">
							<!-- Datos principales: Nombre, Categoría y Rendimiento Base -->
							<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
								<div class="sm:col-span-1">
									<label
										for="nombre-receta"
										class="block text-xs font-semibold tracking-wide text-slate-700 uppercase"
									>
										Nombre
									</label>
									<input
										id="nombre-receta"
										type="text"
										required
										placeholder="Ej. Focaccia de Romero"
										bind:value={nuevaReceta.nombre}
										class="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 focus:outline-none"
									/>
								</div>

								<div class="sm:col-span-1">
									<label
										for="categoria-receta"
										class="block text-xs font-semibold tracking-wide text-slate-700 uppercase"
									>
										Categoría
									</label>
									<input
										id="categoria-receta"
										type="text"
										placeholder="Ej. Masas, Panadería..."
										bind:value={nuevaReceta.categoria}
										class="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 focus:outline-none"
									/>
								</div>

								<div class="sm:col-span-1">
									<label
										for="rendimiento-receta"
										class="block text-xs font-semibold tracking-wide text-slate-700 uppercase"
									>
										Rendimiento Base
									</label>
									<input
										id="rendimiento-receta"
										type="number"
										min="1"
										step="1"
										required
										bind:value={nuevaReceta.rendimiento}
										class="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 focus:outline-none"
									/>
								</div>
							</div>

							<!-- Textareas: Mise en place y Paso a paso -->
							<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<div>
									<label
										for="mise-en-place"
										class="block text-xs font-semibold tracking-wide text-slate-700 uppercase"
									>
										Mise en place
									</label>
									<textarea
										id="mise-en-place"
										rows="4"
										placeholder="Pesar ingredientes, precalentar horno..."
										bind:value={nuevaReceta.miseEnPlace}
										class="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 focus:outline-none"
									></textarea>
								</div>

								<div>
									<label
										for="paso-a-paso"
										class="block text-xs font-semibold tracking-wide text-slate-700 uppercase"
									>
										Paso a paso
									</label>
									<textarea
										id="paso-a-paso"
										rows="4"
										placeholder="1. Mezclar secos...\n2. Amasar durante 10 min..."
										bind:value={nuevaReceta.instrucciones}
										class="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 focus:outline-none"
									></textarea>
								</div>
							</div>

							<!-- Fotografía de la receta -->
							<div>
								<label
									for="foto-receta"
									class="block text-xs font-semibold tracking-wide text-slate-700 uppercase"
								>
									Fotografía del plato
								</label>
								<input
									id="foto-receta"
									type="file"
									accept="image/*"
									on:change={manejarCambioImagen}
									class="mt-1.5 block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-slate-800"
								/>
								{#if archivoImagen}
									<p class="mt-1 text-xs text-slate-500">
										Archivo seleccionado: <strong>{archivoImagen.name}</strong>
									</p>
								{/if}
							</div>

							<!-- Sección dinámica de ingredientes -->
							<div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
								<div class="flex items-center justify-between border-b border-slate-200 pb-3">
									<div>
										<h3 class="text-xs font-semibold tracking-wider text-slate-700 uppercase">
											Ingredientes de la Receta
										</h3>
										<p class="text-xs text-slate-500">
											Selecciona los insumos y define su cantidad bruta para el rendimiento base
										</p>
									</div>
									<button
										type="button"
										on:click={agregarIngrediente}
										class="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
									>
										+ Añadir ingrediente
									</button>
								</div>

								{#if nuevaReceta.ingredientesSeleccionados.length === 0}
									<p class="py-6 text-center text-xs text-slate-500">
										Aún no has agregado ingredientes. Haz clic en "+ Añadir ingrediente".
									</p>
								{:else}
									<div class="mt-3 space-y-3">
										{#each nuevaReceta.ingredientesSeleccionados as item, idx (idx)}
											<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
												<div class="flex-1">
													<select
														bind:value={item.id_ingrediente}
														on:change={(e) => manejarCambioSelectIngrediente(e, idx)}
														class="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 focus:outline-none"
													>
														{#each db.ingredientes as ing (ing.id_ingrediente ?? ing.id)}
															<option value={String(ing.id_ingrediente ?? ing.id)}>
																{ing.nombre} ({ing.unidad_medida}) - {ing.costo_unitario}
															</option>
														{/each}
														<option value="NUEVO" class="font-semibold text-slate-900">
															➕ Agregar nuevo ingrediente...
														</option>
													</select>
												</div>

												<div class="flex items-center gap-2 sm:w-48">
													<input
														type="number"
														min="0"
														step="0.001"
														placeholder="Cantidad bruta"
														bind:value={item.cantidad_bruta}
														class="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-right text-sm text-slate-900 shadow-2xs focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 focus:outline-none"
													/>
													<button
														type="button"
														on:click={() => eliminarIngrediente(idx)}
														title="Eliminar ingrediente"
														class="rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
													>
														✕
													</button>
												</div>
											</div>
										{/each}
									</div>
								{/if}
							</div>

							<!-- Botones de acción del formulario -->
							<div class="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
								<button
									type="button"
									on:click={() => {
										modoCreacion = false;
										recetaSeleccionada = null;
									}}
									class="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
								>
									Cancelar
								</button>
								<button
									type="submit"
									disabled={guardando}
									class="rounded-md bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
								>
									{guardando ? 'Guardando receta...' : 'Guardar Receta'}
								</button>
							</div>
						</div>
					</form>
				</div>
			{:else if recetaSeleccionada === null}
				<!-- Vista de Galería (Cuando recetaSeleccionada es null) -->
				<div class="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
					<div>
						<h2 class="text-2xl font-bold tracking-tight text-slate-900">Biblioteca de Recetas</h2>
						<p class="mt-1 text-sm text-slate-500">
							Selecciona una receta para consultar su ficha técnica, escalar porciones y calcular su
							rentabilidad
						</p>
					</div>
					<button
						type="button"
						on:click={activarModoCreacion}
						class="self-start rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-slate-800 sm:self-auto"
					>
						+ Nueva Receta
					</button>
				</div>

				{#if db.recetas.length === 0}
					<div
						class="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center"
					>
						<p class="text-sm font-medium text-slate-600">
							No se encontraron recetas registradas en la biblioteca.
						</p>
						<button
							type="button"
							on:click={activarModoCreacion}
							class="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
						>
							+ Crear primera receta
						</button>
					</div>
				{:else}
					<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
						{#each db.recetas as receta (receta.id_receta ?? obtenerNombreReceta(receta))}
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<div
								on:click={() => seleccionarReceta(receta)}
								class="flex cursor-pointer flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-shadow hover:shadow-lg"
							>
								{#if receta.url_imagen && String(receta.url_imagen).trim() !== ''}
									<img
										src={String(receta.url_imagen)}
										alt={obtenerNombreReceta(receta)}
										class="h-48 w-full object-cover"
									/>
								{:else}
									<div
										class="flex h-48 w-full flex-col items-center justify-center bg-slate-200/70 text-slate-400"
									>
										<span class="text-3xl" aria-hidden="true">🍽️</span>
										<span class="mt-2 text-xs font-medium tracking-wide uppercase">
											Sin imagen
										</span>
									</div>
								{/if}

								<div class="flex flex-1 flex-col justify-between p-4">
									<div>
										<div class="mb-2 flex items-center justify-between gap-2">
											{#if receta.categoria}
												<span
													class="inline-block rounded-md bg-slate-900/10 px-2.5 py-0.5 text-xs font-semibold text-slate-800"
												>
													{receta.categoria}
												</span>
											{:else}
												<span
													class="inline-block rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500"
												>
													General
												</span>
											{/if}

											{#if receta.id_receta}
												<span class="text-[11px] font-medium text-slate-400">
													{receta.id_receta}
												</span>
											{/if}
										</div>

										<h3 class="line-clamp-2 text-base font-bold text-slate-900">
											{obtenerNombreReceta(receta)}
										</h3>
									</div>

									<div
										class="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500"
									>
										<span>
											⏱ {receta.tiempo_preparacion || 'Tiempo no esp.'}
										</span>
										<span class="font-medium text-slate-600">
											Base: {obtenerRendimientoBase(receta)}
											{obtenerRendimientoBase(receta) === 1 ? 'porción' : 'porciones'}
										</span>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			{:else}
				<!-- Vista de Detalle (Cuando recetaSeleccionada NO es null) -->
				<div class="mx-auto max-w-4xl">
					<div class="mb-5">
						<button
							type="button"
							on:click={() => (recetaSeleccionada = null)}
							class="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-slate-800"
						>
							⬅ Volver a la Biblioteca
						</button>
					</div>

					<div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
						{#if recetaSeleccionada.url_imagen && String(recetaSeleccionada.url_imagen).trim() !== ''}
							<img
								src={String(recetaSeleccionada.url_imagen)}
								alt={obtenerNombreReceta(recetaSeleccionada)}
								class="h-64 w-full object-cover"
							/>
						{/if}

						<!-- Cabecera del panel y control de porciones -->
						<div
							class="flex flex-col justify-between gap-4 border-b border-slate-200 bg-slate-50 px-6 py-5 sm:flex-row sm:items-center"
						>
							<div>
								<div class="flex flex-wrap items-center gap-2">
									<span class="text-xs font-semibold tracking-wider text-slate-500 uppercase">
										Ficha Técnica · {recetaSeleccionada.id_receta}
									</span>
									{#if recetaSeleccionada.categoria}
										<span
											class="rounded bg-slate-900 px-2 py-0.5 text-xs font-medium text-white"
										>
											{recetaSeleccionada.categoria}
										</span>
									{/if}
									{#if recetaSeleccionada.tiempo_preparacion}
										<span
											class="rounded bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700"
										>
											⏱ {recetaSeleccionada.tiempo_preparacion}
										</span>
									{/if}
								</div>
								<h2 class="mt-1 text-2xl font-bold text-slate-900">
									{obtenerNombreReceta(recetaSeleccionada)}
								</h2>
								<p class="mt-1 text-xs text-slate-500">
									Rendimiento base: <strong>{rendimiento_base}</strong>
									{rendimiento_base === 1 ? 'porción' : 'porciones'} · Factor multiplicador:
									<strong>{formatearCantidad(factorMultiplicador)}x</strong>
								</p>
							</div>

							<div class="flex items-center gap-3 self-start sm:self-auto">
								<label
									for="input-porciones"
									class="text-sm font-medium whitespace-nowrap text-slate-700"
								>
									Porciones deseadas:
								</label>
								<input
									id="input-porciones"
									type="number"
									min="1"
									step="1"
									bind:value={porcionesDeseadas}
									class="w-24 rounded-md border border-slate-300 bg-white px-3 py-2 text-right text-sm font-semibold text-slate-900 shadow-2xs transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 focus:outline-none"
								/>
							</div>
						</div>

						<!-- Tabla de ingredientes, cantidades y costos -->
						<div class="overflow-x-auto p-6">
							<table class="w-full border-collapse text-left text-sm">
								<thead>
									<tr class="border-b border-slate-200 bg-slate-50 text-xs uppercase">
										<th class="px-4 py-3 font-semibold text-slate-600">Ingrediente</th>
										<th class="px-4 py-3 text-right font-semibold text-slate-600">Cantidad</th>
										<th class="px-4 py-3 text-right font-semibold text-slate-600">Costo</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-slate-200">
									{#if detalleIngredientes.length === 0}
										<tr>
											<td colspan="3" class="px-4 py-8 text-center text-slate-500">
												No hay ingredientes asociados a esta receta en la tabla de fichas.
											</td>
										</tr>
									{:else}
										{#each detalleIngredientes as item, index (index)}
											<tr class="transition-colors hover:bg-slate-50/80">
												<td class="px-4 py-3.5 font-medium text-slate-800">
													{item.nombre}
												</td>
												<td class="px-4 py-3.5 text-right text-slate-700 tabular-nums">
													{formatearCantidad(item.cantidadNecesaria)}
													{#if item.unidad}
														<span class="ml-1 text-xs text-slate-500">{item.unidad}</span>
													{/if}
												</td>
												<td class="px-4 py-3.5 text-right font-medium text-slate-800 tabular-nums">
													{formatearMoneda(item.costo)}
												</td>
											</tr>
										{/each}
									{/if}
								</tbody>
								<tfoot>
									<tr class="border-t-2 border-slate-300 bg-slate-900 text-white">
										<td colspan="2" class="px-4 py-3.5 text-right font-semibold uppercase">
											Total
										</td>
										<td class="px-4 py-3.5 text-right text-base font-bold tabular-nums">
											{formatearMoneda(costoTotalReceta)}
										</td>
									</tr>
								</tfoot>
							</table>

							<!-- Calculadora de Precio de Venta (Food Cost) -->
							<div class="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
								<h3 class="text-xs font-semibold tracking-wider text-slate-700 uppercase">
									Fijación de Precio y Rentabilidad
								</h3>

								<div
									class="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"
								>
									<!-- Input Target Food Cost -->
									<div class="flex items-center gap-3">
										<label for="input-food-cost" class="text-sm font-medium text-slate-700">
											Target Food Cost
										</label>
										<div class="relative flex items-center">
											<input
												id="input-food-cost"
												type="number"
												min="1"
												max="100"
												step="1"
												bind:value={porcentajeFoodCost}
												class="w-24 rounded-md border border-slate-300 bg-white py-2 pr-7 pl-3 text-right text-sm font-semibold text-slate-900 shadow-2xs transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 focus:outline-none"
											/>
											<span
												class="pointer-events-none absolute right-2.5 text-sm font-semibold text-slate-500"
											>
												%
											</span>
										</div>
									</div>

									<!-- Bloque destacado Precio de Venta Sugerido y Ganancia Bruta -->
									<div
										class="rounded-md border border-slate-200 bg-white px-5 py-3 text-right shadow-2xs"
									>
										<span class="block text-xs font-semibold tracking-wide text-slate-500 uppercase">
											Precio de Venta Sugerido
										</span>
										<p class="mt-0.5 text-3xl font-bold text-emerald-700 tabular-nums">
											{formatearMoneda(precioSugerido)}
										</p>
										<p class="mt-1 text-xs font-medium text-slate-600 tabular-nums">
											Ganancia Bruta: <strong class="text-slate-900">{formatearMoneda(margenBruto)}</strong>
										</p>
									</div>
								</div>
							</div>

							{#if recetaSeleccionada.instrucciones}
								<div class="mt-6 rounded-md border border-slate-200 bg-slate-50 p-4">
									<h3 class="text-xs font-semibold tracking-wider text-slate-600 uppercase">
										Instrucciones de preparación
									</h3>
									<p class="mt-1.5 text-sm leading-relaxed whitespace-pre-line text-slate-700">
										{recetaSeleccionada.instrucciones}
									</p>
								</div>
							{/if}
						</div>
					</div>
				</div>
			{/if}
		</main>
	{/if}

	<!-- Modal para Crear Nuevo Ingrediente -->
	{#if mostrarModalIngrediente}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
			<div class="w-full max-w-md overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
				<div class="border-b border-slate-200 bg-slate-900 px-6 py-4 text-white">
					<span class="text-xs font-semibold tracking-wider text-slate-300 uppercase">
						Catálogo de Insumos
					</span>
					<h3 class="mt-0.5 text-lg font-bold">Nuevo Ingrediente</h3>
				</div>

				<form on:submit|preventDefault={submitNuevoIngrediente} class="space-y-4 p-6">
					<div>
						<label
							for="ing-nombre"
							class="block text-xs font-semibold tracking-wide text-slate-700 uppercase"
						>
							Nombre del Ingrediente
						</label>
						<input
							id="ing-nombre"
							type="text"
							required
							placeholder="Ej. Queso Mozzarella"
							bind:value={nuevoIngredienteForm.nombre}
							class="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 focus:outline-none"
						/>
					</div>

					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div>
							<label
								for="ing-unidad"
								class="block text-xs font-semibold tracking-wide text-slate-700 uppercase"
							>
								Unidad de Medida
							</label>
							<input
								id="ing-unidad"
								type="text"
								required
								placeholder="Ej. kg, litro, unidad"
								bind:value={nuevoIngredienteForm.unidad_medida}
								class="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 focus:outline-none"
							/>
						</div>

						<div>
							<label
								for="ing-costo"
								class="block text-xs font-semibold tracking-wide text-slate-700 uppercase"
							>
								Costo Unitario (CLP)
							</label>
							<input
								id="ing-costo"
								type="number"
								min="0"
								step="any"
								required
								placeholder="Ej. 6500"
								bind:value={nuevoIngredienteForm.costo_unitario}
								class="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 focus:outline-none"
							/>
						</div>
					</div>

					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div>
							<label
								for="ing-merma"
								class="block text-xs font-semibold tracking-wide text-slate-700 uppercase"
							>
								Porcentaje de Merma
							</label>
							<input
								id="ing-merma"
								type="text"
								placeholder="Ej. 0%, 5%"
								bind:value={nuevoIngredienteForm.porcentaje_merma}
								class="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 focus:outline-none"
							/>
						</div>

						<div>
							<label
								for="ing-alergenos"
								class="block text-xs font-semibold tracking-wide text-slate-700 uppercase"
							>
								Alérgenos
							</label>
							<input
								id="ing-alergenos"
								type="text"
								placeholder="Ej. Lácteos, Gluten, Ninguno"
								bind:value={nuevoIngredienteForm.alergenos}
								class="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 focus:outline-none"
							/>
						</div>
					</div>

					<div class="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
						<button
							type="button"
							disabled={guardandoIngrediente}
							on:click={cancelarModalIngrediente}
							class="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
						>
							Cancelar
						</button>
						<button
							type="submit"
							disabled={guardandoIngrediente}
							class="rounded-md bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
						>
							{guardandoIngrediente ? 'Guardando...' : 'Guardar'}
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>
