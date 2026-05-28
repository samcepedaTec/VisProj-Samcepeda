const datosDeRespaldo = [
  { categoria: "Categoría A", valor: 34, nota: "Mayor concentración del conjunto." },
  { categoria: "Categoría B", valor: 21, nota: "Valor intermedio con tendencia estable." },
  { categoria: "Categoría C", valor: 13, nota: "Caso menor, pero relevante para comparar." },
  { categoria: "Categoría D", valor: 8, nota: "Categoría pequeña que puede requerir contexto." }
];

async function cargarDatos() {
  try {
    const respuesta = await fetch("datos.csv");
    if (!respuesta.ok) throw new Error("No se pudo cargar datos.csv");
    const texto = await respuesta.text();
    return parsearCSV(texto);
  } catch (error) {
    return datosDeRespaldo;
  }
}

function parsearCSV(texto) {
  const lineas = texto.trim().split(/\r?\n/);
  const encabezados = lineas.shift().split(",").map((columna) => columna.trim());

  return lineas.map((linea) => {
    const valores = linea.split(",").map((valor) => valor.trim());
    const fila = Object.fromEntries(encabezados.map((encabezado, indice) => [encabezado, valores[indice]]));

    return {
      categoria: fila.categoria,
      valor: Number(fila.valor),
      nota: fila.nota
    };
  });
}

function formatearNumero(numero) {
  return new Intl.NumberFormat("es-CO").format(numero);
}

function actualizarResumen(datos) {
  const total = datos.reduce((suma, fila) => suma + fila.valor, 0);
  const mayor = [...datos].sort((a, b) => b.valor - a.valor)[0];

  document.querySelector("#total-registros").textContent = formatearNumero(datos.length);
  document.querySelector("#valor-total").textContent = formatearNumero(total);
  document.querySelector("#categoria-mayor").textContent = mayor.categoria;
}

function dibujarGrafica(datos) {
  const grafica = document.querySelector("#grafica");
  const maximo = Math.max(...datos.map((fila) => fila.valor));

  grafica.innerHTML = datos
    .map((fila) => {
      const ancho = (fila.valor / maximo) * 100;

      return `
        <div class="barra">
          <strong>${fila.categoria}</strong>
          <div class="riel" aria-hidden="true">
            <div class="relleno" style="width: ${ancho}%"></div>
          </div>
          <span>${formatearNumero(fila.valor)}</span>
        </div>
      `;
    })
    .join("");
}

function escribirLectura(datos) {
  const mayor = [...datos].sort((a, b) => b.valor - a.valor)[0];
  const menor = [...datos].sort((a, b) => a.valor - b.valor)[0];

  document.querySelector("#lectura").textContent =
    `${mayor.categoria} concentra el valor más alto del conjunto, mientras ${menor.categoria} aparece como el menor. ` +
    `Esta diferencia puede convertirse en el punto de partida para explicar causas, consecuencias o límites de los datos.`;
}

cargarDatos().then((datos) => {
  actualizarResumen(datos);
  dibujarGrafica(datos);
  escribirLectura(datos);
});
