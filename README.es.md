<div align="center">

[🇮🇹 Italiano](README.md) · [🇬🇧 English](README.en.md) · 🇪🇸 **Español** · [🇫🇷 Français](README.fr.md) · [🇩🇪 Deutsch](README.de.md) · [🇧🇷 Português (Brasil)](README.pt-BR.md)

</div>

<div align="center">

# 👁️ Scrywall

**Muchas pantallas, una sola mirada.**

Un muro de vídeos de YouTube y directos de Twitch en una sola página.
Todos empiezan juntos y en silencio: el audio lo activas tú, uno a la vez.

![Stack](https://img.shields.io/badge/stack-HTML%20%C2%B7%20CSS%20%C2%B7%20JS-e3b95f?style=flat-square)
![Cero dependencias](https://img.shields.io/badge/dependencias-cero-8fb4ff?style=flat-square)
![Sin build](https://img.shields.io/badge/build-ninguno-7be0c3?style=flat-square)
![Hosting](https://img.shields.io/badge/hosting-GitHub%20Pages-9146ff?style=flat-square)

</div>

---

## ✨ Qué hace

*Scry*: ver lugares lejanos en una bola de cristal. Scrywall es la misma idea, pero con un muro de pantallas: pegas los enlaces, pulsas un botón y lo tienes todo a la vista.

- 🧱 **Cuadrícula automática.** Todos los recuadros tienen el mismo tamaño y el sitio elige solo la disposición que mejor aprovecha la pantalla. Si hay demasiados vídeos para caber, pasa a desplazamiento.
- 🔇 **Todo en silencio, audio por turnos.** Los vídeos empiezan sin sonido. Con el botón de cada recuadro activas el audio de uno solo, y los demás se silencian automáticamente.
- ⤢ **Botón para ampliar.** Cada recuadro tiene su propio botón: lo amplía y coloca los demás en una columna lateral, y el mismo botón (o la tecla `Esc`) lo vuelve a reducir.
- 🎬 **Controles nativos del reproductor.** Reproducir, pausar y avanzar son los controles reales de YouTube/Twitch, usables directamente en cada recuadro, incluso pequeño.
- 🖐️ **Arrastra para reordenar.** Mantén pulsada la cabecera de un recuadro y arrástralo sobre otro para intercambiar sus posiciones.
- ✎ **Gestiona todo desde el muro.** Añade un vídeo desde la barra superior, edita un enlace con el lápiz o elimínalo con la ✕ (con "Deshacer" durante unos segundos), sin tocar nunca los vídeos que ya se están reproduciendo.
- ⌨️ **Atajos de teclado.** `k` reproducir/pausa, `j`/`l` retroceder/avanzar 10s, `m` silenciar, `,`/`.` pequeños ajustes, sobre el vídeo que tengas el ratón encima.
- 🔁 **Bucle ajustable.** Los vídeos de YouTube vuelven a empezar solos al terminar; se desactiva con un clic desde la barra superior.
- 🌍 **Interfaz en 6 idiomas.** Italiano, inglés, español, francés, alemán y portugués (Brasil), detectado automáticamente por el navegador o elegible a mano.
- 🟥🟪 **YouTube y Twitch juntos.** Vídeos, directos, Shorts y transmisiones de Twitch en el mismo muro.
- 🏷️ **Título fuera del vídeo.** Encima de cada recuadro está el título del vídeo, así nunca tapa la imagen. En Twitch se muestra el nombre del canal.
- 🔗 **Enlace para compartir.** Quien prepara el muro copia un enlace, y quien lo abre ve los mismos vídeos. Sin cuentas, sin servidor.
- ☕🍺 **Donaciones.** Un botón "Buy me a coffee or a beer" con importes rápidos o libres, a través de PayPal.me.

## 🚀 Pruébalo en local

No hace falta instalar nada ni compilar. Sí necesitas un servidor local, porque Twitch se niega a arrancar desde `file://`.

```bash
# desde la carpeta del proyecto
python -m http.server 8000
```

Luego abre `http://localhost:8000`.

> **Nota:** si abres `index.html` con doble clic (dirección `file://`), los reproductores de YouTube y Twitch pueden negarse a arrancar. Usa siempre el servidor local.

## 🧙 Cómo usarlo

1. Pega un enlace de YouTube o Twitch en una línea. La línea vacía de abajo se rellena para el siguiente enlace.
2. Pulsa **▶ Mostrar todos los vídeos**.
3. Activa el audio con el botón 🔇/🔊 de un recuadro: se apaga solo en los demás.
4. Pulsa **⤢** en un recuadro para ampliarlo, **⤡** (o `Esc`) para volver a la cuadrícula. Arrastra la cabecera de una tarjeta sobre otra para intercambiar sus posiciones.
5. Desde el muro también puedes: **+ Añadir vídeo** desde la barra superior, **✎** para editar un enlace, **✕** para quitarlo (con "Deshacer"), o el modo **Seleccionar** para quitar varios a la vez.
6. Pulsa **🔗 Compartir** para copiar un enlace con los vídeos ya incluidos.

### Enlaces aceptados

| Tipo | Ejemplos |
|---|---|
| YouTube | `youtube.com/watch?v=…`, `youtu.be/…`, `/shorts/…`, `/live/…`, `/embed/…`, o solo el ID de 11 caracteres |
| Twitch | `twitch.tv/nombredelcanal` (también en variantes móvil y popout) |

## 🔗 Cómo funciona el enlace compartido

Todo está en la parte después del `#` de la dirección, así que **nunca pasa por ningún servidor**:

```
https://tudominio.com/#v=dQw4w9WgXcQ,t:nombredelcanal,aBcDeFgHiJk
```

- un ID de 11 caracteres es un vídeo de YouTube;
- `t:nombre` es un canal de Twitch.

## 🛠️ Por dentro

- HTML, CSS y JavaScript puros, en tres archivos separados. Sin framework, sin bundler.
- [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference) y [Twitch Embed](https://dev.twitch.tv/docs/embed/) para los reproductores.
- Un algoritmo de cuadrícula que prueba todas las combinaciones de columnas y filas y elige la que da los recuadros más grandes, manteniendo el formato 16:9.
- Los controles del reproductor son los nativos: en la cuadrícula se mantiene una fina capa de seguridad que impide silenciar más de un vídeo a la vez, mientras una comprobación en segundo plano mantiene sincronizado el estado del sitio con el real del reproductor en lugar de forzarlo.
- Arrastrar para reordenar nunca mueve el iframe en el DOM (eso lo recargaría desde cero): solo cambia el orden visual, vía CSS.
- Los enlaces guardados se quedan en el `localStorage` de tu navegador. Sin seguimiento, sin cookies.

## ⚠️ Cosas que hay que saber

- **¿Cuántos vídeos?** Depende de tu ordenador y tu conexión, no del sitio: cada recuadro es un reproductor real que descarga un flujo de vídeo. Con una conexión doméstica normal y pocos recuadros va bien, pero con muchos vídeos juntos el navegador empieza a sufrir.
- **Algunos vídeos no se incorporan.** Si el autor desactivó la incorporación, YouTube muestra un error en ese recuadro y el resto del muro sigue funcionando.
- **Twitch no expone los títulos de las retransmisiones.** Por eso aparece el nombre del canal.
- **Reproducción automática.** Por las normas de los navegadores, los vídeos siempre empiezan en silencio: el audio solo se activa tras tu clic.

## 🤝 Aviso legal

Scrywall es un proyecto independiente y **no está afiliado ni respaldado por YouTube, Google o Twitch**. Los vídeos se muestran con los reproductores oficiales incorporables y siguen siendo propiedad de sus respectivos dueños.

## ☕🍺 Apoyo

El sitio es gratuito. Si te resulta útil, puedes invitarme a un café o una cerveza desde el botón dentro del sitio.

---

<div align="center">

*Mira lejos. Mira todo.* 👁️

</div>
