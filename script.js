const datosDeRespaldo = [
  {
    categoria: "1. Arte visual",
    valor: 489,
    nota: "art,sketch,comics,fantasy,humanart,illustration,artist,artwork,manga,conceptart,humor,myart,humanartist,comic,synastry,synastrycomic,astrology,aries,ganador,nick,snake,snakes,capricorn,biker,mangaart,synastrymanga,satire,ripscottadams,dilbert,politicalmemes,politics,politicalcartoon,politicalcartoonist,cartoon,cartoons,handdrawn,politicalcartoons,conservative,libertarian,commentary,design,artbook,demon,darkart,creature,artistsoninstagram,instaart,painting"
  },
  {
    categoria: "2. IA creativa",
    valor: 287,
    nota: "ai,aivideo,creativeai,chatgpt,aiethics,tiktok,grok,buildinpublic,genai,artificialintelligence,anime"
  },
  {
    categoria: "3. Gaming viral",
    valor: 142,
    nota: "fyp,roblox,fortnite,ブレインロット,content,shorts,trending,real,williamest"
  },
  {
    categoria: "4. Innovación IA",
    valor: 138,
    nota: "innovation,aitools,aiinnovation,videogeneration,aidesign,aitrends,generativeai,futureofai,techtrends"
  },
  {
    categoria: "5. Marketing digital",
    valor: 106,
    nota: "contentcreation,digitalmarketing,aimarketing,futureofcontent,contentstrategy,aicommunity,aiworkflow,aiwriting,techinnovation,contentcreators,digitalwriting"
  },
  {
    categoria: "6. Arte y personajes",
    valor: 91,
    nota: "oc,characterdesign,smallartist,doodle,artistontwitter,artmoots"
  },
  {
    categoria: "7. Cripto-politica",
    valor: 88,
    nota: "trump,crypto,elonmusk,memecoin,aifun,helevier,invest,doge,binance,troll,elon,usa,bullish"
  },
  {
    categoria: "8. Diseño digital",
    valor: 65,
    nota: "visualstorytelling,aifashion,iacreator,ugc,aianimation,digitaldesign,fashiontech,aiinfluencer"
  },
  {
    categoria: "9. Comic tradicional",
    valor: 52,
    nota: "comicart,originalart,artinvestment,traditionalmedia,collectibles,arte,industriadelcomic,arteconomy,physicalart,cgc,inkandpaper,artmarket,nophotoshop"
  },
  {
    categoria: "10. Anti IA",
    valor: 37,
    nota: "noai,microslop"
  },
  {
    categoria: "11. Fotografia & IA",
    valor: 37,
    nota: "aiphotography,aiimages,digitalcreators,photomagic,ɪɴsᴛᴀʀᴇᴇʟs,winteraesthetic,christmasedit,christmasvibes,aitransformation,voymageai,voymage"
  },
  {
    categoria: "12. Galería IA",
    valor: 12,
    nota: "aiartworks"
  }
];

async function cargarDatos() {
  try {
    const respuesta = await fetch("datos.csv");
    if (!respuesta.ok) throw new Error("No se pudo cargar datos.csv");
    const texto = await respuesta.text();
    return normalizarDatos(parsearCSV(texto));
  } catch {
    try {
      const respuesta = await fetch("datos.json");
      if (!respuesta.ok) throw new Error("No se pudo cargar datos.json");
      const json = await respuesta.json();
      return normalizarDatos(json);
    } catch {
      return normalizarDatos(datosDeRespaldo);
    }
  }
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

function parsearCSV(texto) {
  const lineas = texto.trim().split(/\r?\n/).filter(Boolean);
  const encabezados = parsearLineaCSV(lineas.shift().replace(/^\uFEFF/, ""));

  return lineas.map((linea) => {
    const valores = parsearLineaCSV(linea);
    return Object.fromEntries(encabezados.map((encabezado, indice) => [encabezado, valores[indice] ?? ""]));
  });
}

function normalizarDatos(filas) {
  return filas
    .map((fila) => {
      const nota = String(fila.nota ?? "").trim();
      const etiquetas = nota
        ? nota.split(",").map((etiqueta) => etiqueta.trim()).filter(Boolean)
        : [];

      return {
        categoria: String(fila.categoria ?? "").trim(),
        valor: Number(fila.valor) || 0,
        nota,
        etiquetas
      };
    })
    .sort((a, b) => b.valor - a.valor);
}

const ESCALA_COLOR = {
  inicio: [28, 107, 130],
  fin: [196, 85, 45]
};

function colorPorValor(valor, minimo, maximo) {
  const t = maximo === minimo ? 1 : (valor - minimo) / (maximo - minimo);
  const canal = (indice) =>
    Math.round(ESCALA_COLOR.inicio[indice] + t * (ESCALA_COLOR.fin[indice] - ESCALA_COLOR.inicio[indice]));
  return `rgb(${canal(0)}, ${canal(1)}, ${canal(2)})`;
}

function escaparHtml(texto) {
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatearNumero(numero) {
  return new Intl.NumberFormat("es-CO").format(numero);
}

function formatearHashtag(etiqueta) {
  const limpia = String(etiqueta).trim();
  return limpia.startsWith("#") ? limpia : `#${limpia}`;
}

function htmlEtiquetasTooltip(etiquetas) {
  if (!etiquetas.length) {
    return '<span class="sin-etiquetas">Sin hashtags registrados</span>';
  }

  return etiquetas
    .map((etiqueta) => `<span class="tag">${escaparHtml(formatearHashtag(etiqueta))}</span>`)
    .join("");
}

function actualizarResumen(datos) {
  const totalFrecuencia = datos.reduce((suma, fila) => suma + fila.valor, 0);
  const totalEtiquetas = datos.reduce((suma, fila) => suma + fila.etiquetas.length, 0);
  const mayor = datos[0];

  document.querySelector("#total-registros").textContent = formatearNumero(datos.length);
  document.querySelector("#valor-total").textContent = formatearNumero(totalFrecuencia);
  document.querySelector("#categoria-mayor").textContent = mayor.categoria;
  document.querySelector("#valor-total").title = `${formatearNumero(totalEtiquetas)} etiquetas en total`;
}

function dibujarGrafica(datos) {
  const grafica = document.querySelector("#grafica");
  const valores = datos.map((fila) => fila.valor);
  const maximo = Math.max(...valores, 1);
  const minimo = Math.min(...valores);

  grafica.innerHTML = datos
    .map((fila, indice) => {
      const ancho = (fila.valor / maximo) * 100;
      const color = colorPorValor(fila.valor, minimo, maximo);
      const idTooltip = `tooltip-barra-${indice}`;
      const categoriaEscapada = escaparHtml(fila.categoria);

      return `
        <div class="barra">
          <strong style="color: ${color}">${fila.categoria}</strong>
          <div class="riel-interactivo">
            <div
              class="riel"
              tabindex="0"
              aria-describedby="${idTooltip}"
              aria-label="Hashtags de ${categoriaEscapada}"
            >
              <div class="relleno" style="width: ${ancho}%; background: ${color}"></div>
            </div>
            <div class="tooltip-hashtags" id="${idTooltip}" role="tooltip">
              <p class="tooltip-encabezado">Hashtags del grupo</p>
              <div class="tooltip-notas">${htmlEtiquetasTooltip(fila.etiquetas)}</div>
            </div>
          </div>
          <span>${formatearNumero(fila.valor)}</span>
        </div>
      `;
    })
    .join("");
}

function iniciarScrollytelling() {
  const pasos = [...document.querySelectorAll(".paso")];
  const lienzo = document.querySelector("#lienzo");
  const barraProgreso = document.querySelector("#barra-progreso");
  const rotuloEtapa = document.querySelector("#rotulo-etapa");
  const rotuloTitulo = document.querySelector("#rotulo-titulo");

  if (!pasos.length || !lienzo) return;

  function activarPaso(paso) {
    pasos.forEach((item) => item.classList.toggle("activo", item === paso));
    lienzo.dataset.escena = paso.dataset.escena;
    rotuloEtapa.textContent = paso.dataset.etapa || "";
    rotuloTitulo.textContent = paso.dataset.titulo || "";

    const indice = pasos.indexOf(paso);
    const progreso = ((indice + 1) / pasos.length) * 100;
    barraProgreso.style.width = `${progreso}%`;
  }

  const observador = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada) => {
        if (entrada.isIntersecting) activarPaso(entrada.target);
      });
    },
    { root: null, rootMargin: "-42% 0px -42% 0px", threshold: 0 }
  );

  pasos.forEach((paso) => observador.observe(paso));

  function actualizarParallaxPortada() {
    const desplazamiento = window.scrollY;
    document.documentElement.style.setProperty("--parallax-1", `${desplazamiento * 0.18}px`);
    document.documentElement.style.setProperty("--parallax-2", `${desplazamiento * 0.1}px`);
    document.documentElement.style.setProperty("--parallax-3", `${desplazamiento * 0.05}px`);
  }

  window.addEventListener("scroll", actualizarParallaxPortada, { passive: true });
  actualizarParallaxPortada();
  activarPaso(pasos[0]);
}

cargarDatos().then((datos) => {
  actualizarResumen(datos);
  dibujarGrafica(datos);
  iniciarScrollytelling();
});
