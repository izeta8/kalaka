---
proyecto: Kalaka (ancla)
funcionalidad: despliegue en AWS
bloque: 3
entrega: 2027-01-29
creado: 2026-11-10
fuente: "decisiones de Izeta en la sesión del 10-nov; la IA las ordena con sus palabras, sin añadir decisiones"
---

# Kalaka en AWS — spec

Lo marcado **a decidir** depende de secciones del curso (Maarek SAA) que todavía no he visto:
se decide cuando sepa defenderlo.

## Limitaciones

- No tenemos un presupuesto fijo, pero quiero gastar la menor cantidad posible para estudiar
  una aplicación de alcance medio.
- Free tier: **140 $ de créditos y 181 días** (a 10-nov).
- No es un producto real: nadie la está usando. **Solo tendremos encendidos los servicios
  cuando esté aprendiendo**, para ahorrar el coste de tenerlos alojados (opción B). En el
  futuro, la opción de añadir un tier **S** con menos usuarios, pero siempre encendido
  (opción A): sería solo añadir esa capa para cuando no estoy estudiando.

## Objetivo de escala: M

- **~1000 usuarios a la vez, sin caerse si cae una AZ.**
- Arquitectura: ALB + 2 EC2 en 2 AZ (ASG) + RDS Multi-AZ. **A decidir**: no entiendo
  todavía estas piezas; se decide cuando sepa qué significan.

## Cómo se paga

- **On-demand.** El tiempo de estudio es de unos meses, y los planes reserved y savings plan
  obligan a un compromiso de mínimo 1 año, por lo que no casan con nuestra situación.
- Para el worker no usamos spot ni Spot Fleet porque empeoraría la UX: un usuario solo verá
  que su post se ha publicado si ha sido aprobado por el worker, y con spot podríamos no tener
  ningún worker corriendo cuando los usuarios están publicando.

## Piezas

### Backend y worker

- Van en la **misma máquina, on-demand, de familia general purpose**. Como el ámbito de
  nuestra aplicación es pequeño y los servicios no son intensivos en recursos, para este
  tamaño tiene sentido mantener ambos servicios en una misma máquina.
- **Consecuencia:** si se crean dos instancias de la misma máquina, tendríamos dos workers, y
  podrían intentar moderar el mismo post.

### Base de datos: RDS Multi-AZ

- Usamos **RDS** en vez de instalar Postgres en una EC2. Prefiero aprender un servicio que
  puedo usar en las empresas: dejas de reinventar la rueda y te quitas el lío de instalar,
  manejar y gestionar una base de datos. Es una cosa que nunca he hecho y me da tiempo extra
  para centrarme en cosas más importantes.
- Familia de la instancia: por ahora general purpose; si vemos que necesita más RAM, memory
  optimized. **Provisional.**
- Multi-AZ y el detalle de RDS: **a decidir** en la sección de RDS.

### Frontend: S3 + CloudFront

- Cuesta céntimos y voy a aprender a tener frontend y backend desacoplados. **Provisional**
  hasta las secciones de S3 y CloudFront.

### Modelo de IA: API gestionada por tokens

- Dejamos aparte la IA local porque necesitamos modelos que entiendan bien el euskera y los
  dialectos cerrados. Vamos con modelos más potentes por API.
- **Bedrock** si no es caro, para aprender más servicios de AWS, si nos da tiempo. Si vamos
  justos de tiempo, tiene prioridad aprender para la SAA y tiraríamos de **Gemini**.
- Modelo concreto: **a decidir**.

### Reverse proxy

- Tendremos un reverse proxy para gestionar el tráfico. El backend solo responderá al proxy,
  no al frontend.
- Sus reglas: **a decidir** (todavía no sé bien cómo funcionan).

## Security groups

- **SG separados** (por ejemplo, uno para SSH y otro para el acceso a la base de datos),
  porque así puedo reutilizarlos en diferentes servicios y me es más sencillo aplicar cambios.
- Todas las máquinas tienen reglas de SSH para que pueda entrar.
- **Máquina de backend y worker** (una máquina con varios SG):
  - entrada: solo desde el reverse proxy;
  - salida: a la base de datos y a la API del modelo.
- **Base de datos:**
  - entrada: solo desde backend y worker;
  - salida: solo las respuestas a las peticiones que han entrado; no puede abrir una nueva
    conexión.
- **Pregunta abierta:** sin salida, ¿cómo se bajan los cambios y las nuevas versiones de
  Postgres? **A revisar** en las secciones de VPC y RDS.
