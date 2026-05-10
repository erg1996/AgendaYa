# Plan: Múltiples empleados por negocio (cada uno con su propio horario)

> **Estado:** propuesta. No implementado todavía.
> **Rama sugerida:** `feature/multi-employee` (rama larga; se mergea por fases o de un solo PR grande al final).
> **Objetivo:** Permitir que un negocio (ej. una barbería con varios barberos) tenga N empleados, cada uno con su horario laboral propio, ofreciendo subconjuntos de servicios. Las citas quedan ligadas a un empleado específico, y el chequeo de overlaps deja de ser por-negocio y pasa a ser por-empleado.

---

## 1. Modelo actual (qué hay que romper)

- `Business 1—N WorkingHours` (un horario por día de la semana, pero del **negocio**, no de personas).
- `Business 1—N Service` (catálogo plano del negocio).
- `Appointment` apunta a `BusinessId + ServiceId`. **No hay empleado**.
- `AvailabilityService.GetAvailableSlotsAsync` arma slots a partir del horario del negocio y resta los appointments existentes del día.
- `AppointmentRepository.TryCreateWithOverlapCheckAsync` hace overlap check **por `BusinessId`** dentro de una transacción `Serializable`.
- `WhatsAppSession` es por-negocio (un teléfono por sucursal). Esto se queda igual.

Implicación: hoy un negocio con 2 barberos no puede tener 2 citas a las 10:00. El sistema lo bloquea como conflicto.

---

## 2. Modelo objetivo

```
Business 1───N Employee
Employee 1───N WorkingHours        (horario del empleado, no del negocio)
Employee N───M Service              (vía EmployeeService — qué hace cada empleado)
Appointment ──> EmployeeId          (FK obligatorio nuevo)
Appointment ──> ServiceId           (se queda)
Appointment ──> BusinessId          (se queda; redundante pero útil para queries y aislamiento)
```

### 2.1 Entidades nuevas

- **`Employee`**
  - `Id` (Guid), `BusinessId` (FK), `Name`, `Color` (hex, para diferenciar en el calendario), `Avatar` (url opcional), `IsActive` (bool, soft-delete tipo `IsDeleted` como `Service`), `DisplayOrder` (int, para fijar orden), `CreatedAt`.
  - Opcional: `UserId` nullable, si después un empleado quiere loguearse y ver solo su agenda. Para v1 lo dejamos en null y el dueño administra todo.

- **`EmployeeService`** (tabla puente N—M)
  - `EmployeeId`, `ServiceId`, PK compuesta. Sin payload extra al inicio.
  - Más adelante se podría añadir `OverrideDurationMinutes` o `OverridePrice` si un empleado tarda distinto, pero **no entra en v1**.

- **`WorkingHours`** muta:
  - Cambiar `BusinessId` → `EmployeeId`. La FK al negocio sale (se llega vía `Employee.BusinessId`).
  - El resto (`DayOfWeek`, `StartTime`, `EndTime`) se queda.
  - **Soporte de turnos partidos** (ej. 8–12 y 14–18): hoy el código lee `workingHoursList[0]` y descarta el resto. Aprovechar esta migración para iterar todos los rangos del día. Es un fix gratis ahora que ya estamos tocando el archivo.

- **`BlockedDate`** se queda **a nivel de negocio** (cuando el local entero cierra: feriado, vacaciones del dueño). Si en el futuro se necesita "vacaciones de un empleado solo", se añade `EmployeeBlockedDate` como tabla aparte. v1 no lo incluye.

### 2.2 Cambios en entidades existentes

- **`Appointment`**: agregar `EmployeeId` (FK, NOT NULL después del backfill).
- **`Service`**: se queda igual. La relación con empleados va por `EmployeeService`.
- **`Business`**: gana `List<Employee> Employees`. `WorkingHours` deja de colgar de `Business` directamente (ahora viene vía `Employees`).

---

## 3. Migración de datos (lo más delicado)

Hoy ya hay datos en producción (Supabase). El plan tiene que poder correr sobre una DB con citas existentes sin perder nada.

### Estrategia: empleado "default" sintético

1. **Migration 1 (additive)**: crea `Employees`, `EmployeeServices`, agrega `Appointments.EmployeeId` (nullable temporalmente), agrega `WorkingHours.EmployeeId` (nullable temporalmente).
2. **Backfill (mismo script EF migration o post-migration runner)**:
   - Por cada `Business`, crea un `Employee` "Default" (Name="Principal", Color del brand, IsActive=true).
   - `UPDATE Appointments SET EmployeeId = (default employee del business)` para todas las citas existentes.
   - `UPDATE WorkingHours SET EmployeeId = (default employee del business)` para todos los horarios existentes.
   - Inserta `EmployeeService` enlazando al empleado default con todos los servicios del negocio (mantiene comportamiento actual: el empleado puede agendar cualquier servicio).
3. **Migration 2 (constrain)**: quita la FK `WorkingHours.BusinessId`, hace `Appointments.EmployeeId` y `WorkingHours.EmployeeId` NOT NULL, crea índices (`Appointments(EmployeeId, AppointmentDate)`, `WorkingHours(EmployeeId, DayOfWeek)`).

> **Por qué dos migraciones:** Si la app vieja queda corriendo unos minutos contra la DB nueva durante el deploy, las columnas tienen que ser nullables hasta el redeploy. Dos migraciones permiten un deploy seguro: aplicas la 1, redespliegas el código nuevo, después aplicas la 2.

> **Importante:** dado el `Program.cs` actual hace `db.Database.Migrate()` al arranque, las dos migraciones se aplican juntas en el mismo redeploy. Para v1 pequeño esto basta — el riesgo de que haya un cliente reservando justo durante el redeploy es bajo. Vale la pena documentarlo pero no sobre-ingeniar.

---

## 4. Disponibilidad y reserva (la lógica que cambia más)

### 4.1 `AvailabilityService.GetAvailableSlotsAsync`

Firma actual: `(businessId, date, serviceId)` → `List<Slot>`.

Nueva firma: `(businessId, date, serviceId, employeeId?)`:
- Si `employeeId` viene → calcula slots solo para ese empleado.
- Si viene null o "any" → calcula slots **agregados** (un slot está disponible si **al menos un** empleado que ofrece ese servicio lo tiene libre). En la respuesta cada slot incluye la lista de `availableEmployeeIds` para que el frontend muestre "con quién" o reparta automáticamente.

Implementación:
- Cargar empleados activos del negocio que estén en `EmployeeService` para `serviceId`.
- Para cada empleado, leer su `WorkingHours` del día y sus citas del día.
- Generar slots por empleado (mismo algoritmo de hoy, pero por persona).
- Si el caller pidió un empleado específico → devolver sus slots.
- Si no → unir todos los slots y deduplicar por hora; cada slot trae `availableEmployees: [...]`.

### 4.2 `AppointmentRepository.TryCreateWithOverlapCheckAsync`

Cambio crítico: el overlap check pasa de `BusinessId` a `EmployeeId`.

```csharp
.Where(a => a.EmployeeId == appointment.EmployeeId
         && a.Status != AppointmentStatus.Cancelled
         && a.AppointmentDate >= dayStart
         && a.AppointmentDate < dayEnd)
```

Mantener el `IsolationLevel.Serializable` y la `ExecutionStrategy` envolvente — eso ya está bien.

Edge case: si el frontend pidió "any employee", el backend tiene que **elegir uno** antes de insertar. Estrategia recomendada:
1. Resolver `employeeId` antes de la transacción consultando disponibilidad otra vez (fuera de la transacción, "best guess").
2. Dentro de la transacción serializable, validar overlap para ese empleado.
3. Si la inserción colisiona (otro cliente reservó al mismo empleado), reintenta con otro empleado disponible. Máximo 3 reintentos antes de devolver `ConflictException` ("ya no hay nadie libre a esa hora").

> Sin reintento, dos clientes pidiendo "cualquier barbero a las 10am" pueden colisionar aunque haya 2 barberos. El reintento es lo que hace funcionar el flujo "any" sin reportar conflicto falso.

### 4.3 `AppointmentService.CreateAsync`

- Aceptar `EmployeeId?` en `CreateAppointmentRequest` (null = "cualquiera disponible").
- Validar que el empleado pertenece al negocio y ofrece el servicio (`EmployeeService` join).
- Validar que el slot cae dentro del horario **del empleado**, no del negocio.
- El resto del flujo (email, WhatsApp confirmation) se queda igual. La plantilla de WhatsApp puede sumar `{empleado}` como nuevo placeholder opcional — no rompe templates viejos porque `Replace` sobre un placeholder ausente es no-op.

---

## 5. API (endpoints nuevos y cambios)

### Nuevos
- `GET /api/employees` (autenticado, contexto de negocio) → lista empleados del negocio.
- `POST /api/employees` → crear.
- `PUT /api/employees/{id}` → actualizar nombre/color/orden/servicios asignados.
- `DELETE /api/employees/{id}` → soft-delete (`IsActive = false`). No permitir si tiene citas activas futuras; pedirle al dueño reasignarlas primero.
- `GET /api/employees/{id}/services`, `PUT /api/employees/{id}/services` → manejar relación N—M.
- `GET /api/employees/{id}/working-hours`, `PUT /api/employees/{id}/working-hours` → CRUD de horario por empleado.

### Cambios en endpoints existentes
- `GET /api/availability?businessId&date&serviceId&employeeId?` → `employeeId` opcional.
- `POST /api/appointments` → request gana `employeeId?`.
- `GET /api/appointments` (listado dueño) → response gana `employeeName`, `employeeColor`. Filtros opcionales `?employeeId=`.
- **Booking público (`/api/business/slug/{slug}/...`)**: agregar endpoint que devuelva los empleados activos del negocio que ofrecen un `serviceId` dado. El frontend público lo llamará después de elegir servicio.

### Lo que NO cambia
- `WhatsAppSession` y todo el flujo de Baileys: sigue siendo por-negocio. Un solo teléfono manda confirmaciones de las citas de todos los empleados del local.
- `BlockedDate` y feriados: por-negocio.

---

## 6. Frontend

### Panel del dueño (autenticado)
- Pantalla nueva: **Equipo / Empleados** (`/team`).
  - Lista con avatar, color, servicios que hace, horario resumido.
  - Form para crear/editar empleado (nombre, color hex con paleta sugerida, foto opcional, checkbox de servicios, horario semanal).
- `CalendarView.jsx`: agregar columnas/filas por empleado, o un filtro lateral "ver solo a María". Cada cita pintada con el color del empleado. Esto es la mejora visual más vendible — vale la pena cuidar el detalle.
- `AppointmentsList.jsx`: columna nueva "Empleado".
- `Dashboard.jsx`: agregar breakdown por empleado (citas / ingresos del mes por persona). Útil de cara a la venta — el dueño puede pagar comisiones con esto.
- `WorkingHours` UI: hoy edita el horario del negocio. Se mueve a "horario por empleado".

### Booking público (`PublicBooking.jsx`)
- Después de elegir servicio, mostrar paso nuevo: "¿Con quién?" — lista de empleados que hacen ese servicio + opción "Cualquiera disponible". Si solo hay 1 empleado activo, saltar este paso.
- Slots filtrados por empleado seleccionado.
- Al confirmar, mandar `employeeId` (o null si "cualquiera").
- Pantalla de confirmación: mostrar el nombre del empleado asignado.

> **Detalle de UX importante:** la elección de empleado tiene que ser opcional y bien comunicada. Mucha gente no tiene preferencia. Forzarlos a elegir agrega fricción y baja conversión. "Cualquiera disponible" debe estar destacado y ser el default.

---

## 7. Edge cases que hay que pensar antes de codear

1. **Negocio con 1 empleado** (la mayoría hoy): el empleado default sintético es el dueño. La UI no debe mostrar el selector de empleado en el booking ni la columna en el calendario hasta que haya 2+. Detectar `employees.length > 1` para activar UI multi-empleado.
2. **Eliminar empleado con citas futuras**: bloquear soft-delete, pedir reasignación (modal "estas N citas pendientes — reasigna a X o cancela").
3. **Empleado deja de ofrecer un servicio**: las citas existentes con ese servicio se mantienen, pero ya no aparece como opción en el booking nuevo.
4. **Un empleado es eliminado a la mitad de un día con citas**: si pasa, el dueño tiene que verlo en su panel; las citas siguen vivas atadas al empleado inactivo (la cita aparece en el listado con el nombre del empleado deshabilitado, marcado).
5. **Backfill no-determinista**: cuando no hay un "dueño obvio" para cada `WorkingHours` (caso raro: si el negocio tenía dos rangos solapados, ahora pertenecen al mismo empleado default — esto está bien, no se pierde info).
6. **Token de acción del WhatsApp** (`AppointmentActionToken`): bindea solo `appointmentId + action`. No hace falta tocar; el empleado se deriva del appointment.
7. **Cita con "cualquiera disponible" + cancelación rápida del empleado asignado**: si la cita se cancela, libera el slot del empleado asignado, no de "cualquiera". Eso ya queda bien con la lógica de overlap por-empleado.
8. **Working hours del empleado más amplios que del negocio**: hoy no hay "horario del negocio" después de la migración (el negocio no tiene horario propio, solo los empleados lo tienen). Un empleado puede trabajar fuera del horario "tradicional" del local y eso está bien — refleja la realidad.

---

## 8. Tests que hay que escribir

- `AvailabilityServiceTests`:
  - Slots por empleado específico, con citas existentes solo de otro empleado (no debe haber conflicto cruzado).
  - Modo "any" con 2 empleados, una cita en uno → el otro empleado sigue disponible a esa hora.
  - Modo "any" con todos ocupados → slot no disponible.
  - Empleado que no ofrece el servicio no aparece en el modo "any".
- `AppointmentServiceTests`:
  - Crear cita con `employeeId` válido → ok.
  - Crear cita con empleado que no ofrece ese servicio → 400.
  - Crear cita con empleado de otro negocio → 403.
  - Crear cita en horario fuera del rango del empleado → 409.
  - Crear cita con `employeeId=null` (any), un empleado libre → asigna ese empleado.
  - Crear cita any, dos empleados libres, simulación de race condition → reintento elige el segundo.
- `AppointmentRepositoryTests`:
  - Overlap check por-empleado: dos citas a la misma hora con empleados distintos → ambas se insertan.
  - Overlap check por-empleado: dos citas misma hora mismo empleado → la segunda falla.

---

## 9. Roadmap de fases sugerido

> **Recomendación:** mergeá fase 1 a `main` antes de empezar la 2 — separa el riesgo de migración de datos del riesgo de cambio funcional. Si la fase 1 rompe en producción, podés rollbackear la app sin perder citas.

**Fase 1 — Esquema y backfill (PR aparte, mergeable solo)**
- Entidades nuevas, migrations 1 y 2, backfill al empleado default. La app sigue funcionando exactamente igual de cara al usuario porque todo apunta al empleado default. Nadie nota el cambio.
- Tests del repositorio para validar el nuevo overlap check.

**Fase 2 — Backend de empleados**
- CRUD de empleados, CRUD de horarios por empleado, asignación de servicios.
- AvailabilityService nuevo.
- AppointmentService acepta `employeeId` opcional. Si null y hay un solo empleado, lo elige. Si hay varios, el frontend todavía no manda `employeeId` así que retomamos el comportamiento "default".

**Fase 3 — Panel del dueño**
- Pantalla Equipo, edición de horarios por persona, calendario coloreado por empleado.
- Filtros y stats por empleado.

**Fase 4 — Booking público multi-empleado**
- Paso de selección "¿con quién?" en `PublicBooking.jsx`.
- Pantalla de confirmación menciona al empleado.
- WhatsApp template gana `{empleado}` opcional.

**Fase 5 — Pulido y venta**
- Dashboard con comisiones / ingresos por empleado (gancho de venta clave para barberías y salones de belleza).
- Si tiene sentido: que el empleado pueda loguearse y ver su agenda (aprovechando el `Employee.UserId` que dejamos preparado).

---

## 10. Decisiones que hay que tomar antes de empezar (preguntas para Eduardo)

1. **Precio/duración del servicio por empleado**: ¿el barbero senior cobra más por el mismo corte? Si la respuesta es "sí, eventualmente", agregar `OverridePrice`/`OverrideDurationMinutes` a `EmployeeService` desde el inicio. Si es "no por ahora", v1 lo deja afuera y se agrega después.
2. **Login de empleado**: ¿en algún momento querés que cada barbero entre con su propio usuario y vea solo su agenda? Si sí, dejamos el `Employee.UserId` desde la fase 1 (gratis). Si nunca, lo quitamos del schema.
3. **Comisiones**: ¿el dashboard tiene que calcular cuánto le toca a cada empleado del mes? Si sí, agregar `CommissionPercent` a `Employee` (default 100% para el dueño). Es un gancho de venta enorme para salones — mencionar en demos.
4. **Servicios por empleado vs catálogo común**: ¿todos los empleados hacen todos los servicios la mayor parte del tiempo? Si la respuesta es sí, el form de "qué servicios hace este empleado" puede tener todo marcado por default — quita fricción.
