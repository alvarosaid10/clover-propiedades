# Clover Propiedades

Web estatica para Clover Propiedades, creada con Astro, TailwindCSS y preparada para publicar en Cloudflare Pages.

## Que incluye

- Pagina estatica, sin backend y sin base de datos.
- Propiedades editables desde `src/data/properties.json`.
- Contacto directo por WhatsApp e Instagram.
- SEO basico, sitemap y robots.txt.
- Headers de seguridad para Cloudflare Pages.
- Diseno responsive con estilo minimalista premium.

## Instalar lo necesario

1. Instala Node.js LTS desde `https://nodejs.org/`.
2. Instala Git desde `https://git-scm.com/download/win`.
3. Cierra y abre nuevamente PowerShell.
4. Verifica:

```powershell
node --version
npm --version
git --version
```

## Ejecutar el proyecto

```powershell
npm install
npm run dev
```

Luego abre la URL que muestre la terminal, normalmente:

```text
http://localhost:4321
```

## Generar version final

```powershell
npm run build
```

La web final queda en la carpeta `dist`.

## Subir a GitHub

```powershell
git init
git add .
git commit -m "Crear web Clover Propiedades"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/clover-propiedades.git
git push -u origin main
```

Cambia `TU_USUARIO` por tu usuario real de GitHub.

## Publicar en Cloudflare Pages

1. Entra a `https://dash.cloudflare.com/`.
2. Ve a Workers & Pages.
3. Elige Create application.
4. Selecciona Pages.
5. Conecta tu cuenta de GitHub.
6. Elige el repositorio `clover-propiedades`.
7. Configura:

```text
Framework preset: Astro
Build command: npm run build
Build output directory: dist
```

8. Presiona Deploy.

Cloudflare Pages activa HTTPS automaticamente.

## Comprar y conectar dominio .cl

1. Compra el dominio en NIC Chile: `https://www.nic.cl/`.
2. Ejemplo recomendado: `cloverpropiedades.cl`.
3. En Cloudflare agrega el dominio.
4. Cloudflare te dara dos nameservers.
5. En NIC Chile cambia los DNS del dominio por los nameservers de Cloudflare.
6. En Cloudflare Pages entra al proyecto y agrega el Custom domain.
7. Espera la propagacion DNS. Puede tardar desde minutos hasta algunas horas.

## Actualizar propiedades

Edita este archivo:

```text
src/data/properties.json
```

Forma mas simple para el dueno, desde internet:

1. Entra al repositorio en GitHub.
2. Abre `src/data/properties.json`.
3. Presiona el icono del lapiz.
4. Edita, agrega o cambia `"visible": false`.
5. Presiona `Commit changes`.
6. Cloudflare Pages actualiza la web automaticamente.

Cada propiedad usa pocos datos. Copia este ejemplo, pegalo dentro del listado y cambia los textos:

```json
{
  "id": "casa-renca-ejemplo",
  "visible": true,
  "operation": "Venta",
  "title": "Casa familiar en Renca",
  "location": "Renca, Santiago",
  "price": "$120.000.000",
  "bedrooms": 3,
  "bathrooms": 2,
  "parking": 1,
  "total": "90 m2",
  "image": "/images/properties/casa-renca.jpg",
  "summary": "Descripcion breve de la propiedad, maximo una o dos lineas."
}
```

Campos realmente importantes:

- `visible`: usa `true` para mostrar y `false` para ocultar.
- `operation`: Venta o Arriendo.
- `title`: nombre corto de la propiedad.
- `location`: comuna o sector.
- `price`: precio visible.
- `image`: ruta de la imagen.
- `summary`: descripcion corta.

Para ocultar una propiedad sin borrarla:

```json
"visible": false
```

Para volver a mostrarla:

```json
"visible": true
```

Si no hay ninguna propiedad visible, la web no se ve vacia: muestra un mensaje elegante invitando a contactar por WhatsApp.

## Actualizar ventas o asesorias realizadas

Edita este archivo:

```text
src/data/successes.json
```

Se actualiza igual desde GitHub: abrir archivo, lapiz, editar y `Commit changes`.

Ejemplo:

```json
{
  "id": "venta-renca-2026",
  "title": "Venta finalizada con exito",
  "location": "Renca, La Hacienda",
  "kind": "Venta",
  "image": "/images/successes/venta-renca.jpg"
}
```

Para ocultar una operacion realizada, agrega:

```json
"visible": false
```

## Cambiar imagenes

Guarda fotos reales en:

```text
public/images/properties/
```

Desde GitHub tambien se pueden subir:

1. Entra a `public/images/properties/`.
2. Presiona `Add file`.
3. Presiona `Upload files`.
4. Sube la foto.
5. Presiona `Commit changes`.
6. Usa esa ruta en el JSON.

Luego cambia el campo `image` en `src/data/properties.json`.

Ejemplo:

```json
"image": "/images/properties/casa-renca-1.jpg"
```

Para imagenes de ventas o asesorias realizadas, guarda las fotos en:

```text
public/images/successes/
```

Para usar las 3 imagenes reales de Instagram en la seccion circular, guardalas con estos nombres exactos:

```text
public/images/successes/la-hacienda-venta-1.png
public/images/successes/la-hacienda-clientes.png
public/images/successes/renca-gestion.png
```

Si el nombre cambia, tambien debes cambiar la ruta en:

```text
src/data/successes.json
```

## Seguridad

La web no guarda datos personales, no tiene panel administrativo, no tiene base de datos y no ejecuta codigo de servidor. El contacto ocurre por WhatsApp e Instagram, reduciendo la superficie de ataque.
