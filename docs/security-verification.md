# Verificacion de seguridad

## Verificado localmente

- `npm run test`: pruebas de integracion con mocks para permisos de pedidos, bloqueo de creacion directa de pedidos PayPal y validacion de captura PayPal.
- `npm run typecheck`: validacion estricta de TypeScript sin `ignoreBuildErrors`.
- `npm run lint`: validacion ESLint sin `ignoreDuringBuilds`.
- `npm run build`: build de produccion exitoso sin DB real configurada, usando fallbacks de build.
- `npm audit`: sin vulnerabilidades conocidas tras actualizar dependencias y retirar PWA vulnerable.

## Bloqueado sin entorno real

- Login, registro, reset de contrasena y cambio de contrasena con usuarios reales.
- Flujo completo de checkout contra una base PostgreSQL real.
- Captura PayPal real en sandbox o produccion con `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` y `PAYPAL_API_BASE` validos.
- Verificacion en navegador de cookies seguras bajo HTTPS real, incluyendo `AUTH_SECRET` estable y `Secure` activo en produccion.
- Confirmacion externa de headers CSP/HSTS en el dominio final desplegado.

## Checklist para validar en staging

- Configurar `AUTH_SECRET`, credenciales DB y credenciales PayPal sandbox.
- Ejecutar una compra PayPal completa y confirmar que el pedido queda creado antes de la captura y pasa a `Procesando` despues de una captura `COMPLETED`.
- Intentar reutilizar el mismo capture ID y confirmar que se rechaza por unicidad.
- Intentar capturar un PayPal order ID con otro usuario y confirmar que se rechaza.
- Repetir intentos de login/reset hasta superar el limite y confirmar el bloqueo temporal.
- Revisar con DevTools que la cookie de sesion es `HttpOnly`, `SameSite=Lax` y `Secure` en HTTPS.
- Revisar los headers `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` y `Permissions-Policy` en respuestas reales.
