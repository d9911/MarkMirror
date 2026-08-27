[English](README.md) | Español | [Русский](README.ru.md)

# MarkMirror

## Propósito

MarkMirror es un editor Markdown basado en navegador con paneles de edición y vista previa.

## Dirección web

<https://mark-mirror.d9911.org/>

## Funciones verificadas

- Edita Markdown y actualiza las vistas previas de texto sin formato y HTML; el analizador incluido admite encabezados, formato, enlaces, imágenes, listas, tablas, listas de tareas, bloques de código delimitados, citas e HTML en línea.
- Carga dinámicamente un editor CodeMirror y usa un editor simple si esa importación falla.
- Importa archivos `.md` y `.txt`, exporta el contenido actual como Markdown o HTML y limpia el editor.
- Proporciona ajustes para autocompletado, desplazamiento sincronizado, selección de analizador, estilos de exportación incrustados, resaltado Markdown y zoom de vista previa.
- Proporciona controles de búsqueda y reemplazo, incluidas opciones de expresiones regulares, distinción de mayúsculas, palabras completas y confirmación, además de un panel de analítica.
- Guarda el contenido del documento y los ajustes en `localStorage` del navegador.
- Incluye un manifiesto web; `PWAManager` registra `sw.js` y gestiona una solicitud de instalación cuando el navegador la proporciona. El service worker almacena archivos estáticos del mismo origen. Esto describe solamente la implementación incluida; la compatibilidad del navegador y la disponibilidad de recursos determinan su comportamiento.

## Uso

1. Escribe Markdown en el editor o importa un archivo `.md`/`.txt`.
2. Consulta la vista previa y usa los controles de ajustes, búsqueda/reemplazo o analítica según lo necesites.
3. Exporta el documento como `.md` o `.html` cuando sea necesario.

## Desarrollo local y compilación

El repositorio no contiene un manifiesto de paquetes, lockfile ni configuración de compilación local. Es una aplicación estática de módulos ES: sirve el repositorio mediante un servidor HTTP local al probar la carga de módulos o el comportamiento del service worker. No se define ningún comando local de instalación o compilación.

## Estructura

- `index.html` define la interfaz, importa bibliotecas externas del navegador y carga el módulo de la aplicación.
- `src/script/` inicializa la aplicación y los controles de idioma.
- `src/ui/` ofrece componentes de editor, vista previa, analítica y búsqueda/reemplazo; `src/utils/` ofrece utilidades de análisis, almacenamiento, archivos, analítica, acciones del editor y PWA.
- `manifest.json` define el manifiesto de la app, `sw.js` contiene la estrategia de caché del mismo origen y `src/tests/` contiene pruebas de navegador para el analizador Markdown.

## Tecnologías y dependencias de ejecución

La app usa HTML, CSS, módulos JavaScript, `localStorage`, Web App Manifest y Service Worker del navegador. El documento carga módulos CodeMirror 6 desde esm.sh, Highlight.js 11.9.0 desde cdnjs y DOMPurify 3.0.5 junto con Marked 9.1.6 desde jsDelivr. No hay configuración de dependencias de Node.js en el repositorio.

## Licencia

Los términos de distribución y licencia están en [LICENSE](LICENSE), incluidos los términos adicionales específicos del proyecto.

## Autor

El aviso de copyright del repositorio identifica a Denis Gutsuliak (`d9911.org`), 2024–2025.
