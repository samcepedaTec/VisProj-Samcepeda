import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.join(__dirname, "..");
const dataPath = path.join(__dirname, "data.json");

const ESCALA_COLOR = {
  inicio: [28, 107, 130],
  fin: [196, 85, 45]
};

function colorPorValor(valor, minimo, maximo) {
  const t = maximo === minimo ? 1 : (valor - minimo) / (maximo - minimo);
  const canal = (i) =>
    Math.round(ESCALA_COLOR.inicio[i] + t * (ESCALA_COLOR.fin[i] - ESCALA_COLOR.inicio[i]));
  return `rgb(${canal(0)}, ${canal(1)}, ${canal(2)})`;
}

function parsearLineaCSV(linea) {
  const valores = [];
  let actual = "";
  let entreComillas = false;

  for (let i = 0; i < linea.length; i += 1) {
    const caracter = linea[i];
    if (caracter === '"') {
      if (entreComillas && linea[i + 1] === '"') {
        actual += '"';
        i += 1;
      } else {
        entreComillas = !entreComillas;
      }
    } else if (caracter === "," && !entreComillas) {
      valores.push(actual.trim());
      actual = "";
    } else {
      actual += caracter;
    }
  }
  valores.push(actual.trim());
  return valores;
}

function cargarCategorias() {
  const texto = fs.readFileSync(path.join(raiz, "datos.csv"), "utf8").replace(/^\uFEFF/, "");
  const lineas = texto.trim().split(/\r?\n/).slice(1);

  const categorias = lineas.map((linea) => {
    const [categoria, valor, nota] = parsearLineaCSV(linea);
    const etiquetas = nota
      .replace(/^"|"$/g, "")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);

    return {
      categoria,
      valor: Number(valor) || 0,
      etiquetas
    };
  });

  const valores = categorias.map((c) => c.valor);
  const minimo = Math.min(...valores);
  const maximo = Math.max(...valores);

  for (const cat of categorias) {
    cat.color = colorPorValor(cat.valor, minimo, maximo);
    cat.tamano = 1 + ((cat.valor - minimo) / (maximo - minimo || 1)) * 6;
  }

  return categorias;
}

function idNodo(etiqueta) {
  const base = etiqueta
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "");
  return `hashtags-${base || "tag"}`;
}

function claveEtiqueta(etiqueta) {
  return etiqueta.trim().toLowerCase();
}

function atributosBase(fila) {
  return {
    "Grupo temático": fila.categoria,
    "Modularity Class": fila.categoria,
    "Inferred Class": fila.categoria,
    Degree: "0",
    "Weighted Degree": "0"
  };
}

function centroNodos(nodos) {
  if (!nodos.length) return { x: 0, y: 0 };
  const suma = nodos.reduce(
    (acc, n) => ({ x: acc.x + n.x, y: acc.y + n.y }),
    { x: 0, y: 0 }
  );
  return { x: suma.x / nodos.length, y: suma.y / nodos.length };
}

function integrar() {
  const categorias = cargarCategorias();
  const red = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  const nodosPorEtiqueta = new Map();

  for (const nodo of red.nodes) {
    nodosPorEtiqueta.set(claveEtiqueta(nodo.label), nodo);
  }

  const layoutGrupo = new Map(
    categorias.map((cat, indice) => [
      cat.categoria,
      {
        x: (indice % 4) * 1400 - 2100,
        y: Math.floor(indice / 4) * 1100 - 1200
      }
    ])
  );

  let creados = 0;
  let actualizados = 0;

  for (const fila of categorias) {
    for (const etiqueta of fila.etiquetas) {
      const clave = claveEtiqueta(etiqueta);
      const existente = nodosPorEtiqueta.get(clave);

      if (existente) {
        existente.attributes = { ...existente.attributes, ...atributosBase(fila) };
        existente.color = fila.color;
        if (!existente.size || existente.size < 1) existente.size = fila.tamano;
        actualizados += 1;
        continue;
      }

      const ancla = fila.etiquetas
        .map((e) => nodosPorEtiqueta.get(claveEtiqueta(e)))
        .find((n) => n && typeof n.x === "number");

      const centro = ancla
        ? { x: ancla.x, y: ancla.y }
        : layoutGrupo.get(fila.categoria);

      const pendientes = fila.etiquetas.filter(
        (e) => !nodosPorEtiqueta.has(claveEtiqueta(e))
      ).length;
      const indiceEnGrupo = fila.etiquetas.indexOf(etiqueta);
      const angulo = (indiceEnGrupo / Math.max(pendientes, 1)) * Math.PI * 2;
      const radio = 120 + pendientes * 4;

      const nuevo = {
        label: etiqueta,
        id: idNodo(etiqueta),
        x: centro.x + Math.cos(angulo) * radio,
        y: centro.y + Math.sin(angulo) * radio,
        attributes: atributosBase(fila),
        color: fila.color,
        size: Math.max(1, fila.tamano * 0.65)
      };

      red.nodes.push(nuevo);
      nodosPorEtiqueta.set(clave, nuevo);
      creados += 1;
    }
  }

  const idsValidos = new Set(red.nodes.map((n) => n.id));
  red.edges = red.edges.filter(
    (e) => idsValidos.has(e.source) && idsValidos.has(e.target)
  );

  const grado = new Map(red.nodes.map((n) => [n.id, 0]));
  for (const e of red.edges) {
    grado.set(e.source, (grado.get(e.source) || 0) + 1);
    grado.set(e.target, (grado.get(e.target) || 0) + 1);
  }

  let edgeId =
    Math.max(0, ...red.edges.map((e) => Number(e.id) || 0).filter(Number.isFinite)) + 1;
  const parejas = new Set(
    red.edges.map((e) => [e.source, e.target].sort().join("|"))
  );

  function agregarEnlace(origen, destino, color) {
    if (!origen || !destino || origen === destino) return;
    const clave = [origen, destino].sort().join("|");
    if (parejas.has(clave)) return;
    parejas.add(clave);
    red.edges.push({
      source: origen,
      target: destino,
      id: String(edgeId++),
      attributes: {
        edge_weight: "1",
        edge_frequency: "1",
        source_label: red.nodes.find((n) => n.id === origen)?.label || "",
        target_label: red.nodes.find((n) => n.id === destino)?.label || ""
      },
      color,
      size: 1
    });
    grado.set(origen, (grado.get(origen) || 0) + 1);
    grado.set(destino, (grado.get(destino) || 0) + 1);
  }

  for (const fila of categorias) {
    const nodosGrupo = fila.etiquetas
      .map((e) => nodosPorEtiqueta.get(claveEtiqueta(e)))
      .filter(Boolean);

    if (nodosGrupo.length < 2) continue;

    const hub = nodosGrupo.reduce((mejor, n) =>
      (grado.get(n.id) || 0) > (grado.get(mejor.id) || 0) ? n : mejor
    );

    for (const nodo of nodosGrupo) {
      if (nodo.id !== hub.id) agregarEnlace(hub.id, nodo.id, fila.color);
    }
  }

  for (const nodo of red.nodes) {
    const g = grado.get(nodo.id) || 0;
    nodo.attributes.Degree = String(g);
    nodo.attributes["Weighted Degree"] = String(g);
  }

  fs.writeFileSync(dataPath, JSON.stringify(red));

  const conteo = {};
  for (const n of red.nodes) {
    const g = n.attributes["Grupo temático"];
    conteo[g] = (conteo[g] || 0) + 1;
  }

  console.log(`Nodos: ${red.nodes.length} (${creados} nuevos, ${actualizados} actualizados)`);
  console.log(`Enlaces: ${red.edges.length}`);
  console.log("Hashtags por grupo:");
  categorias.forEach((c) => {
    console.log(`  ${c.categoria}: ${conteo[c.categoria] || 0} / ${c.etiquetas.length} esperados`);
  });
}

integrar();
