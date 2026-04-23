# WhatsApp Automation — Plan Técnico

Rama: `feat/whatsapp-automation`
Objetivo: cada negocio vincula su propio número de WhatsApp escaneando un QR, y AgendaYa envía recordatorios de citas automáticamente desde ese número (sin clicks manuales).

---

## 1. Arquitectura

```
┌─────────────┐       ┌──────────────┐       ┌───────────────────┐
│  Frontend   │──HTTP─│  .NET API    │──HTTP─│  Node WA Service  │
│  (React)    │       │  (puerto     │ (red  │  (puerto 3001,    │
│             │       │   8080)      │interna│   interno only)   │
└─────────────┘       └──────┬───────┘       └────────┬──────────┘
                             │                        │
                      ┌──────▼──────┐         ┌───────▼────────┐
                      │  Postgres   │         │  Sessions vol  │
                      │  (Supabase) │         │  (Baileys auth │
                      └─────────────┘         │   files)       │
                                              └────────────────┘
```

**Decisiones clave:**
- **Dos servicios separados.** .NET no puede hablar protocolo WhatsApp nativo; Node + Baileys es el estándar de facto. Mezclarlos en un solo contenedor es frágil.
- **Node expuesto solo en red interna de Docker Compose.** Nunca se publica al host ni a internet. Toda comunicación externa pasa por el .NET API (que tiene auth JWT + CSRF).
- **Shared secret** entre .NET ↔ Node para autenticar llamadas internas. Header `X-Internal-Secret`.
- **Un Business = una sesión de WhatsApp.** Identificada por `businessId` (UUID). Aislamiento estricto — el path de sesión incluye el UUID, el .NET valida que el `businessId` viene del JWT del usuario.
- **Fallback graceful.** Si el servicio Node está caído o la sesión del negocio está desconectada, el recordatorio cae al flujo actual (link `wa.me` manual). Nunca se pierde un recordatorio.

---

## 2. Componentes nuevos

### 2.1 Servicio Node (`whatsapp-service/`)

Nuevo directorio raíz:
```
whatsapp-service/
├── package.json
├── Dockerfile
├── src/
│   ├── index.js           # Express server
│   ├── auth.js            # middleware shared-secret
│   ├── sessions.js        # gestor de sesiones Baileys
│   ├── routes/
│   │   ├── sessions.js    # POST /sessions/:id/start, DELETE /sessions/:id
│   │   ├── messages.js    # POST /sessions/:id/send
│   │   └── status.js      # GET /sessions/:id/status, /qr
│   ├── webhooks.js        # outbound → .NET (session state changes)
│   └── ratelimit.js       # random delay + per-session quota
└── data/                  # bind mount → volumen Docker
    └── <businessId>/      # Baileys auth files
```

**Dependencias:**
- `@whiskeysockets/baileys` (librería principal, más activa que whatsapp-web.js)
- `express` (HTTP server)
- `pino` (logs)
- `qrcode` (convertir QR a imagen PNG/SVG)

**Endpoints (internos):**
| Método | Path                            | Propósito                                          |
|--------|---------------------------------|----------------------------------------------------|
| POST   | `/sessions/:businessId/start`   | Inicia Baileys, genera QR si no hay auth guardada  |
| GET    | `/sessions/:businessId/qr`      | Devuelve QR actual (imagen PNG) para escanear      |
| GET    | `/sessions/:businessId/status`  | `{status, phoneNumber, lastConnectedAt}`           |
| POST   | `/sessions/:businessId/send`    | `{to, body}` → encola envío con delay aleatorio    |
| DELETE | `/sessions/:businessId`         | Cierra sesión, borra auth files (opt-out del dueño)|
| GET    | `/health`                       | Healthcheck Docker                                 |

**Webhook outbound (Node → .NET):**
- `POST {dotnetApiUrl}/api/internal/whatsapp/webhook` con `{businessId, event, payload}`
- Eventos: `session.connected`, `session.disconnected`, `session.qr_refreshed`, `message.delivered`, `message.failed`
- Autenticado con el mismo shared secret

**Estados de sesión (máquina):**
```
DISCONNECTED → STARTING → WAITING_QR → CONNECTING → CONNECTED
                                              ↓
                                        DISCONNECTED (sesión caducada, teléfono offline >14d)
                                              ↓
                                        FAILED (banned, error irrecuperable)
```

### 2.2 Cambios en .NET

**Nueva entidad:**
```csharp
// Domain/Entities/WhatsAppSession.cs
public class WhatsAppSession
{
    public Guid Id { get; set; }
    public Guid BusinessId { get; set; }           // FK unique
    public WhatsAppSessionStatus Status { get; set; } // enum
    public string? PhoneNumber { get; set; }       // set después del QR scan
    public DateTime? LastConnectedAt { get; set; }
    public DateTime? LastQrGeneratedAt { get; set; }
    public string? LastError { get; set; }
    public bool AutoRemindersEnabled { get; set; } // toggle del dueño
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Business Business { get; set; } = null!;
}

public enum WhatsAppSessionStatus
{
    Disconnected = 0,
    Starting = 1,
    WaitingQr = 2,
    Connected = 3,
    Failed = 4
}
```

**Migración EF:** nueva tabla `WhatsAppSessions`, índice único en `BusinessId`.

**Nuevos endpoints públicos (.NET) — bajo `/api/whatsapp-session`, require JWT + ownership:**
| Método | Path                          | Propósito                                 |
|--------|-------------------------------|-------------------------------------------|
| GET    | `/api/whatsapp-session`       | Estado actual de la sesión del negocio    |
| POST   | `/api/whatsapp-session/start` | Llama Node → devuelve QR                  |
| GET    | `/api/whatsapp-session/qr`    | Proxy al QR de Node (auth chequeado)      |
| DELETE | `/api/whatsapp-session`       | Desvincula sesión                         |
| PATCH  | `/api/whatsapp-session`       | Toggle `AutoRemindersEnabled`             |
| POST   | `/api/whatsapp-session/test`  | Envía mensaje de prueba al número del dueño |

**Endpoint webhook (Node → .NET):**
- `POST /api/internal/whatsapp/webhook` — NO público, protegido por shared secret en header, permitido solo desde IPs internas.

**Modificación `ReminderBackgroundService`:**
- Al procesar cada appointment, chequear `WhatsAppSession` del `BusinessId`.
- Si `Status == Connected && AutoRemindersEnabled == true && appointment.WhatsAppOptIn == true`:
  - Llamar `POST /sessions/:id/send` al servicio Node
  - Marcar `WhatsAppReminderSent = true` solo si Node responde 200
- Si no, dejar el flujo actual (link manual, sin enviar automático).
- `ClaimWhatsAppReminderAsync` analogo al de email.

**Nuevo cliente HTTP:**
```csharp
// Application/Services/WhatsAppClient.cs
public interface IWhatsAppClient
{
    Task<StartSessionResult> StartSessionAsync(Guid businessId, CancellationToken ct);
    Task<SessionStatus> GetStatusAsync(Guid businessId, CancellationToken ct);
    Task<byte[]?> GetQrAsync(Guid businessId, CancellationToken ct);
    Task<bool> SendMessageAsync(Guid businessId, string toPhone, string body, CancellationToken ct);
    Task DisconnectAsync(Guid businessId, CancellationToken ct);
}
// Implementación usa HttpClient tipado, con Polly retry y timeout corto (5s).
```

### 2.3 Cambios en Appointment

**Nuevo campo:** `WhatsAppOptIn` (bool, default false). Solo se envía recordatorio automático si el cliente marcó el checkbox al agendar.

**Migración:** add column + default false para existentes.

### 2.4 Cambios en Frontend

**Nueva tab en BusinessPanel: "WhatsApp Automático"**
```
- Si session.status == Disconnected:
    [botón "Vincular WhatsApp"] → click → POST /start → muestra QR
- Si session.status == WaitingQr:
    [muestra QR grande] [texto "Abre WhatsApp → Dispositivos vinculados → Escanear"]
    [botón "Cancelar"]
    [polling cada 2s a /status hasta Connected o timeout 60s]
- Si session.status == Connected:
    [✓ Conectado como +52 55 1234 5678]
    [toggle "Recordatorios automáticos: ON/OFF"]
    [botón "Enviar mensaje de prueba"]
    [botón "Desvincular" con confirm]
- Si session.status == Failed:
    [⚠ Error: {lastError}] [botón "Reintentar"]
```

**Nuevo checkbox en PublicBooking:**
```
[ ] Acepto recibir recordatorio de mi cita por WhatsApp al número +{teléfono}
     Puedes darte de baja respondiendo "BAJA" en cualquier momento.
```
(Checkbox seleccionado por default solo si el negocio tiene sesión activa).

---

## 3. Flujos

### 3.1 Vinculación inicial

1. Dueño click "Vincular WhatsApp" en panel.
2. Frontend → `POST /api/whatsapp-session/start` → backend llama Node `POST /sessions/:id/start`.
3. Node inicia Baileys, genera QR, lo guarda en memoria, cambia estado a `WAITING_QR`, webhook → .NET.
4. .NET actualiza BD (`Status = WaitingQr, LastQrGeneratedAt = now`).
5. Frontend empieza polling `GET /api/whatsapp-session/qr` cada 2s.
6. Dueño escanea QR con su celular.
7. Baileys detecta conexión → Node guarda auth files en `data/<businessId>/` → webhook `session.connected` con `phoneNumber`.
8. .NET actualiza BD (`Status = Connected, PhoneNumber = ...`).
9. Frontend detecta cambio de estado, muestra UI de "Conectado".

### 3.2 Envío automático

1. `ReminderBackgroundService` tick (cada hora).
2. Query appointments en ventana 22-26h con `WhatsAppOptIn = true && !WhatsAppReminderSent`.
3. Para cada cita:
   - Cargar `WhatsAppSession` del business.
   - Si `Connected && AutoRemindersEnabled`:
     - Claim reminder (atomic update WHERE `WhatsAppReminderSent = false`).
     - Renderizar template con `WhatsAppTemplateRenderer`.
     - `IWhatsAppClient.SendMessageAsync(businessId, toPhone, body)`.
     - Si Node responde 200 → mensaje encolado; si 503 (session down) → no marcar, intentar siguiente hora.
4. Node recibe send request → push a cola in-memory por sesión → procesa con delay aleatorio 5-30s.
5. Baileys envía → evento `messages.update` → webhook `message.delivered` o `message.failed` → .NET log.

### 3.3 Reconexión automática

Si el celular del dueño está offline >14 días, WhatsApp desvincula el dispositivo. Baileys emite `connection.close` con razón `loggedOut`.
- Node webhook `session.disconnected`, auth files borrados, estado → `Disconnected`.
- .NET envía email al dueño: "Tu WhatsApp se desvinculó, vuelve a escanear el QR".
- Appointments futuros caen al flujo manual hasta re-escaneo.

---

## 4. Seguridad

### 4.1 Autenticación entre servicios
- **Shared secret** en env var `WHATSAPP_INTERNAL_SECRET` (32+ chars, generado random).
- Ambos servicios validan header `X-Internal-Secret` en cada request.
- Constant-time comparison (no `==` directo).

### 4.2 Aislamiento tenant
- El `businessId` en cada endpoint .NET se valida contra el JWT (usuario tiene rol en ese business via `UserBusiness`).
- Node confía en el `businessId` que le pasa .NET (el .NET ya validó ownership).
- Path de sesión `data/<businessId>/` — validar formato UUID antes de cualquier operación de fs para prevenir path traversal.

### 4.3 Exposición
- Servicio Node: puerto 3001 solo en red interna Docker Compose. No `ports:` en compose. Solo accesible por el servicio `api`.
- Session volume: permisos `700`, owner uid del proceso Node.
- Logs: nunca loggear contenido de mensajes ni archivos de auth. Solo metadata (businessId, phoneNumber, status, timestamps).

### 4.4 Consentimiento
- `WhatsAppOptIn = true` obligatorio para enviar automático.
- Keyword "BAJA" (configurable): Node detecta mensajes entrantes del cliente, si contienen "BAJA" → webhook → .NET marca al customerPhone como opt-out en una tabla blacklist.
- Política de privacidad actualizada en PublicBooking.

### 4.5 Rate limiting anti-ban (ESTRICTO — volumen bajo esperado)
En Node, política conservadora al extremo porque preferimos enviar despacio a que baneen un número de un cliente:

**Límites duros por sesión:**
- **Máximo 20 msgs/hora** (1 cada ~3 min promedio con jitter).
- **Máximo 100 msgs/día** por sesión madura.
- **Warm-up 14 días**: día 1-3 → 10 msgs/día, día 4-7 → 20/día, día 8-14 → 50/día, día 15+ → 100/día.
- **Ventana horaria**: envíos solo entre 08:00 y 21:00 en el timezone del negocio. Fuera de esa ventana, encolar para el siguiente slot válido (o dropear si ya pasó el appointment). Mandar WhatsApp a las 3am es flag de bot clarísimo.

**Patrón de envío humano (por cada mensaje):**
1. Delay aleatorio **45-120 segundos** antes del mensaje (distribución: uniforme con pequeño sesgo a los valores más altos).
2. **Presence update**: marcar "typing..." por 3-8s aleatorios (Baileys `sendPresenceUpdate('composing')`).
3. **Pequeño delay extra** 1-3s.
4. Enviar mensaje.
5. **Presence update**: "available" / paused.

**Personalización obligatoria (no duplicados byte-a-byte):**
- Cada mensaje incluye: nombre del cliente, fecha/hora específica, nombre del servicio, nombre del negocio.
- Usar **template rotation**: 3-5 variantes del mensaje por negocio, elegidas pseudoaleatoriamente por `hash(appointmentId) % N`. Mismo cliente siempre recibe la misma variante para esa cita (consistencia), pero el conjunto completo de envíos diarios usa variantes distintas.
- Diferencias entre variantes: saludo ("Hola", "Buenas", "Hey"), orden de datos, uso de emoji o no, despedida.

**Espaciado por destinatario:**
- **Mínimo 18h entre 2 mensajes al mismo número** desde la misma sesión. Si un cliente tiene 2 citas en 24h (raro), solo se envía 1 recordatorio (el más próximo).

**Proceso de ramp-up de sesión nueva:**
- Al vincular, la sesión queda en estado `WARMING_UP` por 14 días.
- Frontend muestra badge "Calentando cuenta — envío limitado los primeros 14 días" con contador de días.
- Límites anteriores aplican automáticamente.

**Detección de riesgo:**
- Si Baileys reporta 3+ fallos consecutivos de envío en <10 min → pausa automática de 1 hora, notifica al dueño por email.
- Si `connection.close` con reason `ban` o `401` → marca sesión `FAILED`, notifica dueño.

**Lo que explícitamente NO hacemos (para minimizar riesgo):**
- No enviar a números que el dueño NO tenga guardado (heurística: si número del cliente empieza por prefijo distinto al del dueño y no hay historial → delay extra + solo warm-up avanzado).
- No enviar mensajes en ráfaga (nunca 2 en <45s).
- No enviar media ni links que requieran preview (preview generation es otra señal de bot).
- No enviar mensajes idénticos consecutivos aunque sean a números diferentes.

---

## 5. Modos de falla y mitigaciones

| Falla                                   | Detección                  | Mitigación                                        |
|-----------------------------------------|----------------------------|---------------------------------------------------|
| Node service caído                      | HTTP timeout/503           | .NET hace fallback a wa.me link manual            |
| Baileys roto por update WhatsApp        | `connection.close` persist | Log error, fallback, avisar admin por email       |
| Sesión desvinculada (phone offline 14d) | `loggedOut` reason         | Email al dueño + UI pide re-escaneo               |
| Número baneado por spam                 | `connection.close`+401     | Marca `Failed`, dueño debe cambiar número         |
| Webhook .NET no disponible              | Node retry 3x luego drop   | Node persiste último estado, .NET polls al arrancar|
| Cliente responde "BAJA"                 | Mensaje entrante           | Blacklist customerPhone para ese business         |
| Volumen de sesión corrupto              | Baileys error al cargar    | Borrar auth files, forzar re-scan                 |

---

## 6. Compliance

- **Opt-in explícito** al agendar (checkbox no preseleccionado si negocio nuevo).
- **Política de privacidad** en PublicBooking con link visible.
- **Mecanismo de baja** (keyword "BAJA" + desvinculación desde panel).
- **Logs mínimos**: no contenido de mensajes, solo metadata.
- **Responsabilidad del dueño**: términos de uso de AgendaYa deben aclarar que el dueño es responsable del uso legal de su cuenta de WhatsApp. Texto al vincular:
  > "Al vincular, aceptas que el uso no-oficial de WhatsApp puede resultar en la suspensión de tu número. AgendaYa implementa buenas prácticas (delays, personalización) pero no garantiza inmunidad. Úsalo solo para comunicación legítima con clientes que hayan aceptado recibir mensajes."

---

## 7. Deploy

### 7.1 docker-compose.yml (adición)
```yaml
services:
  whatsapp:
    build: ./whatsapp-service
    container_name: agendaya-whatsapp
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 3001
      INTERNAL_SECRET: ${WHATSAPP_INTERNAL_SECRET:?required}
      DOTNET_WEBHOOK_URL: http://api:8080/api/internal/whatsapp/webhook
    volumes:
      - whatsapp-sessions:/app/data
    # NO ports — solo red interna
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3001/health"]
      interval: 30s

  api:
    # añadir:
    environment:
      WhatsApp__ServiceUrl: http://whatsapp:3001
      WhatsApp__InternalSecret: ${WHATSAPP_INTERNAL_SECRET:?required}
    depends_on:
      whatsapp:
        condition: service_healthy

volumes:
  whatsapp-sessions:
```

### 7.2 Env vars nuevas
- `WHATSAPP_INTERNAL_SECRET` (generar con `openssl rand -hex 32`)

### 7.3 Migración
- EF migration `AddWhatsAppSessionAndOptIn`: tabla `WhatsAppSessions` + columna `WhatsAppOptIn` en `Appointments`.

---

## 8. Fases de implementación

Cada fase es un commit ejecutable (tests verdes, deploy-able aunque incompleto).

**Fase 1 — Scaffolding** (1 día)
- Estructura Node service con health check y auth middleware
- Dockerfile Node
- docker-compose actualizado
- Shared secret working end-to-end (endpoint dummy `/ping` desde .NET → Node)

**Fase 2 — Sesión + QR** (1-2 días)
- Entity `WhatsAppSession` + migración
- `IWhatsAppClient` + implementación HttpClient
- Endpoints .NET `/api/whatsapp-session` (start, status, qr, delete)
- Node endpoints de sesión con Baileys real
- Webhook Node → .NET

**Fase 3 — Frontend QR** (0.5 día)
- Tab "WhatsApp Automático" en BusinessPanel
- Polling estado + display QR
- Test manual: escaneo real funcionando

**Fase 4 — Envío automático** (1 día)
- Campo `WhatsAppOptIn` + migración
- Checkbox en PublicBooking
- `ReminderBackgroundService` integrado con WhatsAppClient
- Rate limit + delays en Node
- `ClaimWhatsAppReminderAsync`

**Fase 5 — Compliance + polish** (0.5 día)
- Keyword "BAJA" + blacklist
- Política de privacidad update
- Términos al vincular
- Email al dueño si sesión cae
- Test de prueba desde panel

**Fase 6 — Tests** (0.5 día)
- Tests unitarios `WhatsAppClient` con HttpClient mockeado
- Tests de `ReminderBackgroundService` con mock `IWhatsAppClient`
- Test manual end-to-end con número real

**Total estimado: 4-5 días.**

---

## 9. Riesgos conocidos y mitigación

| Riesgo                                      | Probabilidad | Impacto | Mitigación                                            |
|---------------------------------------------|--------------|---------|-------------------------------------------------------|
| Baileys rompe con update WhatsApp           | Media        | Alto    | Fallback a wa.me, monitoreo, upgrade rápido           |
| Ban de número del cliente                   | Baja-Media   | Medio   | Delays, personalización, límites conservadores, opt-in|
| Sesión se cae por phone offline             | Alta (>30d)  | Bajo    | Email automático + UI para re-scan                    |
| Concurrencia: mismo reminder enviado 2x     | Baja         | Medio   | `ClaimWhatsAppReminderAsync` atomic con WHERE guard   |
| Path traversal con businessId malformado    | Baja         | Alto    | Regex UUID antes de tocar fs en Node                  |
| Webhook replay attack                       | Baja         | Medio   | Shared secret + nonce+timestamp si se vuelve crítico  |
| Volumen de sesiones corrupto                | Baja         | Medio   | Backup semanal del volumen, recovery con re-scan      |

---

## 10. No-goals (explícito)

- **NO** soporte multi-número por negocio (1 negocio = 1 WhatsApp).
- **NO** envío de imágenes/stickers/audio (solo texto por ahora).
- **NO** recibir mensajes/responder conversaciones (solo detectar "BAJA").
- **NO** broadcast masivo promocional (eso ya existe como feature manual y no se va a automatizar aquí — uso agresivo = ban garantizado).
- **NO** migrar los recordatorios por email a WhatsApp. Ambos coexisten.

---

## 11. Decisiones confirmadas

1. **Envío automático reemplaza el link wa.me manual cuando la sesión está conectada.** El botón manual solo aparece como fallback cuando la sesión está desconectada o el servicio Node no responde. Nunca ambos visibles a la vez — evita confusión del dueño.

2. **Volumen Docker local al servidor.** Si se migra de host, re-escanear todas las sesiones. Aceptado como trade-off.

3. **Timeout del QR: 90 segundos** desde que se genera. Si no se escanea, el estado vuelve a `Disconnected` y el dueño debe pedir uno nuevo. (Baileys internamente rota el QR cada ~20s; guardamos siempre el último; el timeout de 90s es a nivel aplicación.)

4. **Retry policy: 1 solo intento.** Si falla el envío (session down, número inválido, error de Baileys), se marca `WhatsAppReminderFailed=true` y no se reintenta. El email ya se envió en paralelo como red de seguridad.

5. **Feature flag `Features:WhatsAppAutomation`** en appsettings (default `false`). Si está `false`: la tab no aparece en el panel, los endpoints `/api/whatsapp-session` responden 404, el background service ni siquiera consulta sesiones. Lanzamos primero a los 3 pilotos con flag `true` en sus env vars.
