# AgendaYa — Proceso de Onboarding White Glove

**Fecha del documento:** Abril 2026  
**Versión:** 1.0  
**Uso:** Interno — proceso operacional para incorporar nuevos clientes al sistema AgendaYa.

---

## ¿Qué significa White Glove aquí?

El administrador (tú) es quien registra el negocio, configura todo el sistema y le entrega credenciales listas al cliente. El cliente **nunca** interactúa con formularios de registro ni con la API. Recibe acceso a su panel el mismo día del onboarding.

---

## Fase 1 — Preventa: Recolección de información

Antes de cobrar o comenzar la configuración, recolectar los siguientes datos del cliente mediante formulario (Google Forms, Notion, o equivalente):

### Datos del negocio

| Campo | Ejemplo | Requerido |
|-------|---------|-----------|
| Nombre del negocio | "Barbería El Corte" | Sí |
| Logo (PNG/JPG, fondo transparente) | archivo adjunto | Recomendado |
| Color de marca (hex) | #2D6A4F | Recomendado |
| Email del dueño | dueno@email.com | Sí |
| Teléfono WhatsApp (para recordatorios) | +1 809 555 1234 | Opcional |

### Servicios

Para cada servicio del negocio:

| Campo | Ejemplo |
|-------|---------|
| Nombre del servicio | "Corte clásico" |
| Duración (minutos) | 30 |
| Precio | $500 RD |
| Descripción breve | "Corte, lavado y peinado" |

### Horarios de atención

Días y horas de operación. Por ejemplo:  
- Lunes a Viernes: 9:00 AM – 6:00 PM  
- Sábado: 10:00 AM – 3:00 PM  
- Domingo: Cerrado

### Días bloqueados iniciales

Feriados del año, vacaciones planificadas, días de cierre especial.

---

## Fase 2 — Setup técnico (~30 minutos por cliente)

### Paso 1: Crear la cuenta

```http
POST /api/auth/register
{
  "email": "dueno@email.com",
  "password": "<generar contraseña segura>",
  "fullName": "Nombre Completo del Dueño",
  "businessName": "Nombre del Negocio",
  "inviteCode": "<REGISTRATION_INVITE_CODE configurado en servidor>"
}
```

Guardar en un lugar seguro: el token JWT de respuesta, el `businessId` y el `userId`.

### Paso 2: Subir el logo

```http
POST /api/upload/logo
Authorization: Bearer <token>
Content-Type: multipart/form-data

[archivo del logo]
```

Guardar la URL devuelta (`logoUrl`).

### Paso 3: Configurar branding del negocio

```http
PATCH /api/business/{businessId}
Authorization: Bearer <token>
{
  "logoUrl": "<url devuelta en paso 2>",
  "brandColor": "#hexcolor"
}
```

### Paso 4: Crear los servicios

Repetir por cada servicio:

```http
POST /api/services
Authorization: Bearer <token>
{
  "name": "Nombre del servicio",
  "durationMinutes": 30,
  "price": 500.00,
  "description": "Descripción del servicio"
}
```

### Paso 5: Configurar horarios de atención

```http
PUT /api/working-hours
Authorization: Bearer <token>
[
  { "dayOfWeek": 1, "openTime": "09:00", "closeTime": "18:00", "isOpen": true },
  { "dayOfWeek": 2, "openTime": "09:00", "closeTime": "18:00", "isOpen": true },
  ...
  { "dayOfWeek": 0, "isOpen": false }
]
```

> **DayOfWeek:** 0=Domingo, 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado

### Paso 6: Bloquear días especiales

```http
POST /api/blocked-dates
Authorization: Bearer <token>
{
  "date": "2026-12-25",
  "reason": "Navidad"
}
```

### Paso 7: Verificación final

1. Abrir `https://app.agendaya.com/book/{slug}` en modo incógnito
2. Confirmar que el logo, colores y servicios se muestran correctamente
3. Hacer una reserva de prueba y verificar que se recibe el email de confirmación
4. Acceder al panel con las credenciales del cliente y verificar la cita de prueba
5. Cancelar la cita de prueba desde el panel

---

## Fase 3 — Entrega al cliente

### Kit de entrega (enviar por email o WhatsApp)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ACCESO A TU SISTEMA — [Nombre Negocio]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Tu panel de administración:
  https://app.agendaya.com
  Usuario: tu@email.com
  Contraseña temporal: [contraseña]
  ⚠️ Cámbiala al entrar en Configuración

Tu página pública de reservas:
  https://app.agendaya.com/book/[slug]
  → Comparte este link con tus clientes

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Soporte: [tu contacto]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Sesión de entrega presencial o por videollamada (15-20 min)

Agenda cubiertos en esta sesión:

- [ ] Mostrar el dashboard (citas de hoy, semana, mes)
- [ ] Navegar la página pública como lo vería un cliente
- [ ] Hacer una reserva de prueba juntos en tiempo real
- [ ] Cambiar la contraseña temporal desde el panel
- [ ] Explicar los estados de cita: **Pendiente → Confirmada → Completada**
- [ ] Mostrar cómo bloquear un día desde el panel (vacaciones, etc.)
- [ ] Mostrar cómo ver y exportar el reporte mensual
- [ ] Entregar link de soporte / canal de comunicación

---

## Fase 4 — Seguimiento post-lanzamiento

| Hito | Acción | Tiempo estimado |
|------|--------|-----------------|
| Día 3 | Mensaje de check-in: ¿llegaron reservas? ¿alguna duda? | 5 min |
| Semana 1 | Llamada breve de seguimiento | 10-15 min |
| Mes 1 | Revisión de métricas — mostrar pantalla de analytics | 20 min |
| Mensual | Recordatorio de actualizar horarios o servicios si cambian | 5 min |

---

## Checklist operacional por cliente

### Pre-setup
- [ ] Formulario de datos completado por el cliente
- [ ] Logo recibido en formato adecuado
- [ ] Servicios y precios confirmados
- [ ] Horarios confirmados
- [ ] Email de acceso confirmado

### Setup técnico
- [ ] Cuenta creada exitosamente
- [ ] Logo subido y visible
- [ ] Color de marca aplicado
- [ ] Todos los servicios creados
- [ ] Horarios configurados
- [ ] Días bloqueados cargados
- [ ] Verificación en modo incógnito completada
- [ ] Email de prueba recibido

### Entrega
- [ ] Kit de acceso enviado al cliente
- [ ] Sesión de entrega realizada
- [ ] Contraseña temporal cambiada
- [ ] Cliente puede ver y gestionar citas por su cuenta

### Post-lanzamiento
- [ ] Check-in día 3 completado
- [ ] Seguimiento semana 1 completado
- [ ] Revisión mes 1 agendada

---

## Tiempo estimado por cliente

| Fase | Tiempo |
|------|--------|
| Recolección de datos | 10 min (cliente llena el formulario) |
| Setup técnico | 25-35 min |
| Sesión de entrega | 15-20 min |
| **Total operacional** | **~1 hora por cliente** |

---

*Documento interno — AgendaYa © 2026*
