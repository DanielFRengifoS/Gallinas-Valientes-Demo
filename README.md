# Gallinas y Valientes · Tres demos en un solo sitio

Este ZIP **ya está listo para subir**. Las tres demos se despliegan juntas. El `index.html` de la raíz abre la bienvenida de GTL AI. **Empezar el demo** revela el selector 01, 02 y 03 sin salir del sitio. No necesitas crear tres proyectos ni instalar dependencias.

## 1. Probar antes de subir

Descomprime el ZIP y abre **el `index.html` de la raíz**. Pulsa **Empezar el demo** y prueba los tres botones del selector. Comprueba que cada portada tiene **Reservar · Ver carta · Visita**.

Si el navegador no carga las páginas al abrir el archivo directamente, abre una terminal en esa misma carpeta y ejecuta:

```bash
python3 -m http.server 8765
```

Luego abre `http://localhost:8765/`. En Windows, si `python3` no existe, usa `py -m http.server 8765`.

## 2. Desplegar en Cloudflare Pages

1. En el panel de Cloudflare, abre **Workers & Pages**.
2. Selecciona **Create application → Get started → Drag and drop your files**. Elige la opción de **Pages / Direct Upload**, no un Worker.
3. Ponle un nombre al proyecto y arrastra **este ZIP completo**. Cloudflare Pages también acepta la carpeta descomprimida. Si subes una carpeta, selecciona la que contiene el `index.html` de la raíz y las tres carpetas de demo juntas.
4. Pulsa **Deploy site**. Abre la URL `https://<nombre-del-proyecto>.pages.dev/` y prueba el selector y los tres botones de cada portada.

No hay comando de compilación, npm ni backend. Si ya tienes un proyecto Pages de Direct Upload, abre ese proyecto y usa **Create a new deployment** para subir la versión actualizada.

[Guía oficial de Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)

## 3. Activar la reserva real

En el ZIP, **Reservar** ya funciona como enlace. De momento lleva a un aviso que dice que el canal oficial está por confirmar. No crea reservas ni recoge datos.

Cuando el restaurante confirme el enlace oficial HTTPS:

1. Abre el archivo **`reservas.js` de la raíz** con un editor de texto.
2. En `var RESERVATION_URL = '';`, pega el enlace real **entre las comillas**.
3. Guarda y vuelve a desplegar la carpeta completa. Los tres botones abrirán el mismo canal oficial en una pestaña nueva.

## 4. Links para el pitch

- `/` abre la bienvenida. Pulsa **Empezar el demo** para entrar en la 01.
- `/#01` va directo al selector en la demo 01.
- `/#02` abre el selector directamente en la demo 02.
- `/#03` abre el selector directamente en la demo 03.
- `/02-del-gesto-a-la-mesa/` abre solo la demo 02, sin el selector. Lo mismo funciona con `/01-mesa-ab/` y `/03-desde-la-mesa/`.

**Importante si la demo debe ser privada.** Una URL normal de Pages es accesible para quien tenga el enlace. `noindex` no pone contraseña. Si necesitas restringir el acceso, configúralo en el hosting y comprueba que también protege las tres rutas directas antes de compartir.
