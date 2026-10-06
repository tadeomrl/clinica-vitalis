"use strict";

const CLAVE = "citasVitalis";

const formulario = document.querySelector("#formularioCita");
const fechaInput = document.querySelector("#fecha");
const horaSelect = document.querySelector("#hora");
const confirmacion = document.querySelector("#confirmacion");
const listaCitas = document.querySelector("#listaCitas");
const aviso = document.querySelector("#aviso");

/* ---------- Datos ---------- */

function cargarCitas() {
    try {
        const datos = JSON.parse(localStorage.getItem(CLAVE)) || [];
        // Las citas antiguas no tenían id: se les asigna uno
        return datos.map(function (c, i) {
            return { ...c, id: c.id || Date.now() + i };
        });
    } catch (e) {
        return [];
    }
}

let citas = cargarCitas();

function guardarCitas() {
    try {
        localStorage.setItem(CLAVE, JSON.stringify(citas));
    } catch (e) {
        mostrarAviso("No se pudo guardar en este navegador.");
    }
}

/* ---------- Utilidades ---------- */

function fechaLocal(fecha) {
    // toISOString usa UTC y puede dar el día equivocado; se arma en hora local
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, "0");
    const d = String(fecha.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function formatearFecha(texto) {
    return new Date(texto + "T00:00:00").toLocaleDateString("es-MX", {
        weekday: "long", day: "numeric", month: "long", year: "numeric"
    });
}

function horasDelDia(texto) {
    // Lunes a viernes 9-18, sábados 9-14 (última cita una hora antes del cierre)
    const dia = new Date(texto + "T00:00:00").getDay();
    const ultima = dia === 6 ? 13 : 17;
    const horas = [];
    for (let h = 9; h <= ultima; h++) {
        horas.push(String(h).padStart(2, "0") + ":00");
    }
    return horas;
}

function mostrarAviso(mensaje) {
    aviso.textContent = mensaje;
    aviso.classList.add("visible");
    clearTimeout(mostrarAviso.t);
    mostrarAviso.t = setTimeout(function () {
        aviso.classList.remove("visible");
    }, 3000);
}

function crear(etiqueta, texto, clase) {
    const el = document.createElement(etiqueta);
    el.textContent = texto; // textContent evita inyección de HTML
    if (clase) el.className = clase;
    return el;
}

/* ---------- Fecha y horas ---------- */

fechaInput.min = fechaLocal(new Date());

function actualizarHoras() {
    const fecha = fechaInput.value;
    horaSelect.innerHTML = "";

    if (!fecha) {
        horaSelect.disabled = true;
        horaSelect.append(new Option("Elige primero la fecha", ""));
        return;
    }

    const ahora = new Date();
    const esHoy = fecha === fechaLocal(ahora);
    const ocupadas = citas.filter(function (c) { return c.fecha === fecha; })
        .map(function (c) { return c.hora; });

    horaSelect.append(new Option("Selecciona una hora", ""));

    horasDelDia(fecha).forEach(function (hora) {
        const ocupada = ocupadas.includes(hora);
        const pasada = esHoy && parseInt(hora, 10) <= ahora.getHours();
        const opcion = new Option(ocupada ? hora + " (ocupada)" : hora, hora);
        opcion.disabled = ocupada || pasada;
        horaSelect.append(opcion);
    });

    horaSelect.disabled = false;
}

fechaInput.addEventListener("change", function () {
    if (this.value && new Date(this.value + "T00:00:00").getDay() === 0) {
        mostrarError("fecha", "La clínica no atiende los domingos.");
        this.value = "";
    }
    actualizarHoras();
});

/* ---------- Validación ---------- */

function mostrarError(campo, mensaje) {
    const caja = document.querySelector(`[data-error="${campo}"]`);
    const input = document.querySelector("#" + campo);
    if (caja) caja.textContent = mensaje;
    if (input) input.classList.toggle("invalido", Boolean(mensaje));
}

function limpiarErrores() {
    ["nombre", "telefono", "servicio", "fecha", "hora"].forEach(function (c) {
        mostrarError(c, "");
    });
}

function validar(datos) {
    limpiarErrores();
    let valido = true;

    if (datos.nombre.length < 3) {
        mostrarError("nombre", "Escribe tu nombre completo.");
        valido = false;
    }
    if (!/^\d{10}$/.test(datos.telefono)) {
        mostrarError("telefono", "Escribe 10 dígitos, sin espacios ni guiones.");
        valido = false;
    }
    if (!datos.servicio) {
        mostrarError("servicio", "Selecciona un servicio.");
        valido = false;
    }
    if (!datos.fecha) {
        mostrarError("fecha", "Selecciona una fecha.");
        valido = false;
    }
    if (!datos.hora) {
        mostrarError("hora", "Selecciona una hora.");
        valido = false;
    }
    return valido;
}

document.querySelector("#telefono").addEventListener("input", function () {
    this.value = this.value.replace(/\D/g, "");
});

/* ---------- Enviar formulario ---------- */

formulario.addEventListener("submit", function (evento) {
    evento.preventDefault();

    const datos = {
        nombre: document.querySelector("#nombre").value.trim(),
        telefono: document.querySelector("#telefono").value.trim(),
        servicio: document.querySelector("#servicio").value,
        fecha: fechaInput.value,
        hora: horaSelect.value,
        notas: document.querySelector("#notas").value.trim()
    };

    if (!validar(datos)) return;

    const ocupada = citas.some(function (c) {
        return c.fecha === datos.fecha && c.hora === datos.hora;
    });
    if (ocupada) {
        mostrarError("hora", "Ese horario ya está ocupado. Elige otro.");
        actualizarHoras();
        return;
    }

    citas.push({ id: Date.now(), ...datos });
    guardarCitas();

    confirmacion.innerHTML = "";
    confirmacion.append(
        crear("h3", "Cita agendada"),
        crear("p", "Paciente: " + datos.nombre),
        crear("p", "Servicio: " + datos.servicio),
        crear("p", "Fecha: " + formatearFecha(datos.fecha)),
        crear("p", "Hora: " + datos.hora)
    );

    formulario.reset();
    limpiarErrores();
    actualizarHoras();
    mostrarCitas();
    mostrarAviso("Cita agendada correctamente.");
});

/* ---------- Botón limpiar ---------- */

document.querySelector("#limpiarCita").addEventListener("click", function () {
    formulario.reset();
    limpiarErrores();
    confirmacion.innerHTML = "";
    actualizarHoras();
});

/* ---------- Lista de citas ---------- */

function mostrarCitas() {
    listaCitas.innerHTML = "";
    listaCitas.append(crear("h3", "Citas agendadas"));

    if (citas.length === 0) {
        listaCitas.append(crear("p", "Aún no hay citas. Agenda la primera con el formulario.", "vacio"));
        return;
    }

    const ordenadas = [...citas].sort(function (a, b) {
        return new Date(`${a.fecha}T${a.hora}`) - new Date(`${b.fecha}T${b.hora}`);
    });

    ordenadas.forEach(function (cita) {
        const item = crear("div", "", "cita-item");
        const info = document.createElement("div");
        info.append(
            crear("strong", cita.nombre),
            crear("span", cita.servicio + " · Tel. " + cita.telefono),
            crear("span", formatearFecha(cita.fecha) + ", " + cita.hora)
        );

        const boton = crear("button", "Cancelar", "btn-eliminar");
        boton.type = "button";
        boton.dataset.id = cita.id;

        item.append(info, boton);
        listaCitas.append(item);
    });
}

listaCitas.addEventListener("click", function (evento) {
    const boton = evento.target.closest(".btn-eliminar");
    if (!boton) return;

    if (!confirm("¿Seguro que quieres cancelar esta cita?")) return;

    citas = citas.filter(function (c) { return String(c.id) !== boton.dataset.id; });
    guardarCitas();
    mostrarCitas();
    actualizarHoras();
    mostrarAviso("Cita cancelada.");
});

/* ---------- Inicio ---------- */

mostrarCitas();
