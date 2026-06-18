# Propiedades futuras en Clover Propiedades

Este sitio está pensado para seguir siendo estático, gratuito y seguro en Cloudflare Pages. Por ahora no existe un catálogo público de propiedades porque faltan datos completos y confirmados de cada inmueble. No conviene mostrar fichas incompletas ni propiedades que podrían no estar disponibles.

## Objetivo futuro

Cuando Clover Propiedades tenga información suficiente, el catálogo puede implementarse con archivos locales y Astro, sin base de datos, sin panel pagado y sin servicios externos obligatorios.

La opción recomendada es usar Astro Content Collections con archivos Markdown o JSON versionados en GitHub.

## Estructura sugerida

```text
src/content/propiedades/
  casa-en-comuna-ejemplo.md
  departamento-en-comuna-ejemplo.md

public/images/propiedades/
  casa-en-comuna-ejemplo/
    portada.webp
    living.webp
    cocina.webp
```

Cada propiedad podría tener campos como:

```yaml
---
title: "Casa familiar en comuna"
slug: "casa-familiar-comuna"
operation: "venta"
status: "disponible"
comuna: "Comuna"
region: "Región Metropolitana"
price: "$000.000.000"
bedrooms: 3
bathrooms: 2
builtSurface: "90 m2"
totalSurface: "120 m2"
cover: "/images/propiedades/casa-familiar-comuna/portada.webp"
gallery:
  - "/images/propiedades/casa-familiar-comuna/living.webp"
  - "/images/propiedades/casa-familiar-comuna/cocina.webp"
visible: true
---

Descripción comercial breve de la propiedad.
```

## Estados permitidos

- `disponible`
- `reservada`
- `vendida`
- `arrendada`
- `no-disponible`

Una propiedad con `visible: false` no debería aparecer en listados públicos.

## Páginas futuras

Cuando se implemente esta fase, Astro puede generar:

- `/propiedades/`
- `/propiedades/[slug]/`
- Listados por operación: venta o arriendo.
- Historial de propiedades vendidas o arrendadas, si el propietario confirma que puede mostrarse.
- Inclusión automática en `sitemap.xml`.

## Reglas editoriales

- No publicar precios, superficies ni características sin confirmación.
- No publicar datos sensibles del propietario.
- No mostrar direcciones exactas si no están aprobadas.
- Usar fotografías optimizadas en WebP o AVIF.
- Mantener un texto claro y verificable.
- Evitar fichas incompletas.

## Cómo actualizar una propiedad en el futuro

1. Crear o editar un archivo en `src/content/propiedades/`.
2. Subir fotografías optimizadas a `public/images/propiedades/nombre-de-la-propiedad/`.
3. Revisar que `status`, `operation` y `visible` estén correctos.
4. Ejecutar `npm run build`.
5. Subir cambios a GitHub.
6. Cloudflare Pages publicará automáticamente.

## Contenido SEO futuro

También puede agregarse una colección gratuita de guías en Markdown:

```text
src/content/guias/
  documentos-para-vender-una-propiedad.md
  como-preparar-una-propiedad-para-publicarla.md
```

Temas útiles:

- Documentos necesarios para vender una propiedad en Chile.
- Cómo funciona el proceso de venta.
- Cómo preparar una propiedad para publicarla.
- Qué revisar antes de arrendar.
- Qué hace una corredora de propiedades.
- Cómo funciona la administración de una propiedad.
- Gastos comunes en una compraventa.
- Diferencias entre vender directamente y trabajar con una corredora.

Cada guía debe revisarse con criterio profesional. No debe presentarse como asesoría legal, tributaria o financiera definitiva.
