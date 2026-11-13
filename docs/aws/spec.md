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
- Arquitectura: ALB + 2 EC2 en 2 AZ (ASG) + RDS Multi-AZ.

- ALB: para hostear un backend de node.js es el load balancer indicado.
       Trabaja sobre el nivel de aplicación (OSI 7) y trae cross-zone gratis por defecto. 
- AGS: No sé cuantas instancias voy a necesitar para 1000 usuarios. 
       El mínimo son dos instancias repartidas en dos AZ. No sé el deseado ni el máximo. Tendríamos que probar.
- AZ: En dos AZs para tener mayor disponibilidad. Si se cae una AZ se redirige el trafico
      en el otro AZ y se escalan los EC2.

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
  
  Para solucionar esto, vamos a añadir un nuevo campo  en la tabla posts, donde se va a
   guardar el timestamp desde que un worker ha codigo el registro para evaluarlo (o NULL). 
  
  Actualmente, tenemos una función que coge el post más viejo que no ha sido evaluado. 
  Tendriamos que cambiar para que en vez de ser un SELECT, sea un UPDATE con un RETURNING donde
  actualizase este nuevo campo. En la condicion actual que tenemos en ese SELECT (que pasaría a
  ser UPDATE), tendriamos que añadir la condicion de mirar si el valor de este nuevo campo es NULL
  o la diferencia con el tiempo actual de la maquina es mayor que el timeout de la IA + un margen, 
  se coge para evaluar, si no significa que otro worker lo está evaluando y seguiriamos con el siguiente post si la hay.

### Base de datos: RDS Multi-AZ

- Usamos **RDS** en vez de instalar Postgres en una EC2. Prefiero aprender un servicio que
  puedo usar en las empresas: dejas de reinventar la rueda y te quitas el lío de instalar,
  manejar y gestionar una base de datos. Es una cosa que nunca he hecho y me da tiempo extra
  para centrarme en cosas más importantes.
- Familia de la instancia: por ahora general purpose; si vemos que necesita más RAM, memory
  optimized. **Provisional.**
- Las migraciones no se van a ejecutar en las instancias, se va a ejecutar en el CI.
  El CI va a crear una instancia nueva de EC2 para la migración (una EC2 de usar y tirar).
  Cuando se hace merge a main, primero se actualiza la base de datos y si todo ha ido bien 
  las instancias se actualizan de version.
- Como vamos a tener muchas lecturas necesitamos read replicas. Cómo vamos a pagar por el disco
  de cada replica, tenemos que calcular las metricas de la app y ajustar la cantidad de replicas
  que necesitamos entorno a ello. Al menos una maquina en Multi-AZ para tener una maquina de
  respaldo si se cae la AZ. 
- Cómo no sabemos la máxima cantidad de EC2 que podemos tener, porque hemos dicho que lo vamos a decidir
  en entorno real analizando el consuma de cada instancia y viendo si necesitamós más o menos con datos objetivos,
  no podemos decidir si necesitariamos un **RDS proxy** para solucionar el problema de tener muchas conexiones abiertas. 
- Las intancias EC2 (backend + worker) se conectarían a la base de datos usando **Roles IAM**, es lo que he aprendido
  que se tiene que hacer para que dos servicios se conecten de manera segura.
- Tenemos que distinguir las consultas que se hacen a las Read Replicas porque pueden tener restrasos en cuanto a 
  los datos que se tienen guardados de hasta algunos segundos. Cómo tenemos una red social, cómo regla general
  re harán peticiones a la base de datos principal si son consultas sobre el mismo usuario (datos del usuario, 
  posts del usuario...) y se harán consultas a las replicas si son de salas. En los casos donde es una mezcla, como
  a la hora de crear recursos la base de datos los devuelve, se pueden poblar en el frontend.
- Empezaríamos **sin read replicas** porque al principio las lecturas no serán un cuello de botella en una app con muy
  pocos usuarios. Sí tendremos una base principal y una copia standby (Multi-AZ) para mantener una mayor disponivilidad
- Como la base de datos que tenemos es muy pequeña, podemos permitirnos el lujo de guardar 35 (máximo) 
  backups. Aunque esta base de datos esté vacía, nuestra lógica de negocio y el alcance que tiene
  la app no es muy grande, por lo que nos podemos permitir tener 35 copias. Aún así tendriamos que poner avisos 
  de CloudWatch para monitorizar el tamaño que acumulan los backups para no pasar de la cuota gratuita.
- En cuanto a las politicas de añadir más replicas, tendriamos que ver cúantas lecturas se están haciendo y si
  se están saturando las replicas. Cómo nuestra aplicación tendria un uso previsible (el aumento de usuarios es
  orgánico y no es de pico, va por fases) tendriamos tiempo para añadir nuevas replicas si son necesarios. Para 
  refozar una buena experiencia de usuario, no podemos dejar que caigan las replicas para añadir nuevas, añadiríamos
  alarmas de CloudWatch para saber que necesitamos añadir más (añadir replicas se hace manualmente). 
- En cuanto al tamaño de base de datos, vamos a empezar con uno pequeño y si hay mucho CUD (sin R), y vemos que 
  necesitamos mas RAM o CPU, escalaríamos verticalmente. Para nuestro alcance será más que suficiente.
 
### Frontend: S3 + CloudFront

- Cuesta céntimos y voy a aprender a tener frontend y backend desacoplados. **Provisional**
  hasta las secciones de S3 y CloudFront.

### Modelo de IA: API gestionada por tokens

- Dejamos aparte la IA local porque necesitamos modelos que entiendan bien el euskera y los
  dialectos cerrados. Vamos con modelos más potentes por API.
- **Bedrock** si no es caro, para aprender más servicios de AWS, si nos da tiempo. Si vamos
  justos de tiempo, tiene prioridad aprender para la SAA y tiraríamos de **Gemini**.
- Modelo concreto: **a decidir**.

### Application Load Balancer (Reverse proxy + Load balancer)

- Tendremos un ALB que funcionará como reverse proxy y balancedor de carga + DNS fijo.
  Además el ALB tiene por defecto (y gratis) activado el cross-zone. 
- El HTTPS termina en el ALB, y a partir de ahi, en la red interna se usará HTTP.
- El tráfico HTTP será redirigido a HTTPS. 
- Si el healthcheck del ALB o el de EC2 dice que la máquina no responde, quitamos la instancia
  y creamos otra. Usaremos el método tracking, si supera un limite de CPU hace scale out y si
  se baja de un limite se hace in scale in. Tendriamos que ver los limites en realidad.
- El deregistration delay se va a quedar por defecto: 5 minutos.

## Security groups

- **SG separados** (por ejemplo, uno para SSH y otro para el acceso a la base de datos),
  porque así puedo reutilizarlos en diferentes servicios y me es más sencillo aplicar cambios.
- **Máquina de backend y worker** (una máquina con varios SG):
  - entrada: Solo del SG del ALB y SSH (con Instance Connect, en el SG va el prefix list)
  - salida: RDS, la API del modelo, GHRC (por ahora), ASM y S3
- **Base de datos:**
  - entrada: la maquina de backend + worker y la maquina de las migraciones
  - salida: no puede abrir una nueva conexión.
- **Pregunta abierta:** sin salida, ¿cómo se bajan los cambios y las nuevas versiones de
  Postgres? **A revisar** en las secciones de VPC y RDS.

## Almacenamiento

- **Backend y worker:**: 
  - tipo: EBS, gp3. Son aplicaciones de uso general. 
  
  - on terminate: Vamos a tener la politica de delete on terminate porque las instancias son stateless. 
                  No guardamos información que queremos guardar, y si dejamos sin esta politica podriamos 
                  estar acumulando discos y gastando de más. El contenido multimedia será guardado en buckets S3
                  y tambien los logs (¿como se mandarian?). Los logs tambien porque asi nos da igual apagar y encender maquinas, 
                  no tenemos que preocuparnos de sacar los logs cada vez que queramos terminar las instancias.  
  - cifrada: Disco cifrado desde el inicio porque luego se complica cifrar y tenemos que mantener seguridad. 
  
  - tamaño: 12GB. Aunque para los contenedores necesitamos muy poco espacio vamos a optar por 12GB de espacio porque 
            la diferencia con el mínimo son centimos y ganamos en comodidad. Además, podemos ampliar cuando queramos.
  
  - datos: se va a usar la AMI de Linux AWS 2023 con el user data que cree el directorio donde se van a bajar las imagenes,
           que descargué git y docker si son necesarios, que baje las imagenes con manejo de secretos adecuado desde GHRC privado.
            Con un token solo lectura del registro y si es posible solo los registros que usamos. Y que el almacen de secretos 
            que la instancia lee con el Role.

- **Base de datos:**:
  - tipo: EBS, gp3. Para la cantidad de 1000 usuarios a la vez tenemos suficiente con un gp3, no necesitamos un io2. 
                    Los datos caben en la RAM porque hay pocas escritouras y quedan por debajo de 3000 IOPS. 
                    Si en CloudWatch vemos que las IOPS se acercan a 3000, los subiriamos en el gp3. 
  
  - cifrada: Disco cifrado desde el inicio porque luego se complica cifrar y tenemos que mantener seguridad. 

  - tamaño: 20GB. Es lo minimo que nos deja para RDS. Tenemos espacio de sobra. Las opciones de RDS se veŕan más adelante.