# Clover Propiedades

Sitio corporativo estatico para Clover Propiedades, construido con Astro, CSS propio y Cloudflare Pages.

## Enfoque del sitio

La web esta pensada como presencia digital corporativa, no como panel de propiedades activas. Su objetivo es transmitir confianza, experiencia real y facilitar contacto comercial.

Incluye:

- Presentacion corporativa de Clover Propiedades.
- Servicios de venta, arriendo y administracion.
- Galeria compacta con material real de propiedades gestionadas.
- Resultados y publicaciones reales.
- Contacto directo por WhatsApp e Instagram.
- Sitio estatico sin backend ni base de datos.

## Ejecutar localmente

```powershell
npm install
npm run dev
```

Luego abrir:

```text
http://localhost:4321
```

## Compilar

```powershell
npm run build
```

La carpeta final se genera en `dist`.

## Deploy en Cloudflare Pages

Configuracion recomendada:

```text
Framework preset: Astro
Build command: npm run build
Build output directory: dist
```

Cada cambio subido a GitHub en `main` se publica automaticamente en Cloudflare Pages.

## Editar contenido

Los textos principales estan en:

```text
src/components/
src/data/site.json
src/data/successes.json
```

Las imagenes reales estan organizadas en:

```text
public/images/corporate/
public/images/portfolio/
public/images/proof/
```

Para agregar nuevas evidencias o publicaciones reales, subir la imagen a `public/images/proof/` y agregar un registro en:

```text
src/data/successes.json
```

## Seguridad

Este sitio no guarda datos de clientes, no tiene login, no tiene base de datos, no tiene WordPress y no tiene panel administrativo. El contacto ocurre por WhatsApp e Instagram.

Recomendado:

- Activar 2FA en GitHub.
- Activar 2FA en Cloudflare.
- No subir documentos privados, contratos, cedulas ni datos sensibles.
- Mantener el repositorio con acceso solo a personas autorizadas.

## Transferir mantenimiento al cliente

1. Invitar al cliente como colaborador del repositorio en GitHub.
2. Darle acceso a Cloudflare Pages o transferir el proyecto a su cuenta Cloudflare.
3. Mantener el dominio en la cuenta final del cliente si compran `cloverpropiedades.cl`.
4. Una vez confirmado el acceso del cliente, se puede borrar la copia local del computador.
