// Conocimiento completo de las 78 cartas para el prompt de Luna
// Solo se inyectan las cartas que salieron en la tirada

const CARTAS = {
  // ── ARCANOS MAYORES ──────────────────────────────────────────────────────

  el_loco: {
    nombre: "El Loco",
    arcano: "Mayor — 0",
    derecha: "Nuevo comienzo absoluto. Salto de fe. Energía pura sin condicionamientos. Libertad, inocencia valiente, confianza ciega en el universo.",
    invertida: "Imprudencia sin red. Miedo al salto que paraliza. Ingenuidad que lleva al error.",
    amor: "Nuevo amor inesperado, relación fresca sin ataduras del pasado. Inv: inmadurez emocional, evitar el compromiso.",
    trabajo: "Nuevo proyecto, emprendimiento, cambio radical de carrera. Inv: falta de planificación, caos.",
    dinero: "Inv especialmente: gastos impulsivos, inversiones sin análisis.",
    mensaje: "El Loco no es un necio — es el único que entiende que sin riesgo no hay vida verdadera. La pregunta no es si saltar, sino si confiás en tus alas."
  },

  el_mago: {
    nombre: "El Mago",
    arcano: "Mayor — I",
    derecha: "Voluntad + herramientas = manifestación. Tenés todo lo necesario para crear. Maestría, poder personal, acción consciente.",
    invertida: "Manipulación, talentos desperdiciados, bloqueo creativo. Alguien puede estar manipulándote.",
    amor: "Atracción magnética y consciente, alguien que sabe lo que quiere. Inv: seducción con segundas intenciones.",
    trabajo: "Momento de máxima eficiencia. Actuá ahora. Inv: sabotaje propio o ajeno.",
    dinero: "Capacidad de generar riqueza con inteligencia. Inv: estafas, mal uso de recursos.",
    mensaje: "Todo lo que necesitás ya está en tus manos. El Mago no espera — convoca. ¿Estás convocando o esperando que la vida te regale lo que vos podés crear?"
  },

  la_sacerdotisa: {
    nombre: "La Sacerdotisa",
    arcano: "Mayor — II",
    derecha: "Intuición en su máxima expresión. Lo que no se dice, se siente. Secretos, subconsciente, sabiduría interior. Escuchá hacia adentro.",
    invertida: "Ignorar la intuición. Secretos que salen a la luz. Represión emocional.",
    amor: "Sentimientos profundos no expresados. Paciencia. Inv: engaños, cosas ocultas en la relación.",
    trabajo: "Información que aún no tenés. Esperá antes de decidir. Inv: intrigas en el entorno laboral.",
    dinero: "Hay más de lo que parece. Investigá antes de invertir.",
    mensaje: "Tu cuerpo sabe lo que tu mente se niega a admitir. La Sacerdotisa te pide que cierres los ojos y escuches ese susurro que llevás semanas ignorando."
  },

  la_emperatriz: {
    nombre: "La Emperatriz",
    arcano: "Mayor — III",
    derecha: "Abundancia, fertilidad, creación. Todo lo que florece. Sensualidad, placer, amor generoso. Proyectos que maduran. Puede indicar embarazo.",
    invertida: "Bloqueo creativo, dependencia emocional, sobreprotección que asfixia.",
    amor: "Amor maduro, nutricio, sensual. Potencial de familia. Inv: dependencia, amor que ahoga.",
    trabajo: "Proyectos creativos que dan fruto. Inv: bloqueo, falta de productividad.",
    dinero: "Abundancia material. Inv: gastos excesivos por placer.",
    mensaje: "La Emperatriz te recuerda que sos naturaleza. Y la naturaleza nunca duda de su derecho a florecer. ¿Qué te impide reclamar tu abundancia?"
  },

  el_emperador: {
    nombre: "El Emperador",
    arcano: "Mayor — IV",
    derecha: "Estructura, autoridad, disciplina. Liderazgo firme, responsabilidad. Poder que construye orden. Confianza sin necesitar aprobación.",
    invertida: "Autoritarismo, rigidez, control excesivo. Figura paterna conflictiva.",
    amor: "Hombre fuerte, protector, estable. Inv: tiranía, control en la relación.",
    trabajo: "Liderazgo, ascenso, responsabilidades mayores. Inv: jefe tiránico.",
    dinero: "Estabilidad financiera con disciplina. Inv: mal manejo por rigidez o descontrol.",
    mensaje: "El Emperador no pide permiso para ocupar su lugar. Ha construido ese trono con cada decisión difícil que tomó. ¿Estás construyendo el tuyo?"
  },

  el_hierofante: {
    nombre: "El Hierofante",
    arcano: "Mayor — V",
    derecha: "Tradición, guía espiritual, maestro que transmite. Matrimonio formal, rituales, pertenencia. Consejo sabio de alguien con experiencia.",
    invertida: "Dogmatismo, falso maestro, ruptura necesaria con estructuras que ya no sirven.",
    amor: "Formalización, propuesta de matrimonio. Inv: relación que va contra las normas.",
    trabajo: "Seguir canales correctos, formación, certificaciones. Inv: conflicto con las normas.",
    mensaje: "Hay sabiduría en lo que fue construido antes que vos. El Hierofante no te pide obediencia ciega — te pide que antes de romper algo, entiendas por qué fue construido."
  },

  los_enamorados: {
    nombre: "Los Enamorados",
    arcano: "Mayor — VI",
    derecha: "Elección consciente del corazón. Unión de opuestos, química real, almas que se reconocen. Decisión que define quiénes somos.",
    invertida: "Decisión evadida, valores en conflicto, separación inminente.",
    amor: "Amor real, elección mutua, compatibilidad verdadera. Inv: conflicto de valores.",
    trabajo: "Elección de carrera que alinea con los valores. Inv: dilema profesional.",
    mensaje: "Los Enamorados no preguntan '¿me quiere?'. Preguntan '¿me elijo yo primero?'. Nadie puede amarte genuinamente si vos no te elegiste antes."
  },

  el_carro: {
    nombre: "El Carro",
    arcano: "Mayor — VII",
    derecha: "Victoria por control y determinación. Avance, triunfo, movimiento. El guerrero que gana por disciplina mental, no fuerza bruta.",
    invertida: "Pérdida de control, dirección dispersa, obstáculos que detienen.",
    amor: "Conquista activa, ir por lo que se desea. Inv: perseguir a alguien que no está disponible.",
    trabajo: "Triunfo merecido, logro de objetivos. Inv: proyectos que se dispersan.",
    mensaje: "El campo de batalla más difícil no está afuera — está en tu mente. Cuando dominás tus contradicciones internas, nada externo puede detenerte."
  },

  la_fuerza: {
    nombre: "La Fuerza",
    arcano: "Mayor — VIII",
    derecha: "Valentía suave. Domar al león con amor, no con cadenas. Paciencia, compasión, resiliencia. El poder que viene de aceptar la propia sombra.",
    invertida: "Debilidad, cobardía emocional, dudas paralizantes.",
    amor: "Amor que requiere paciencia. Inv: relación que te drena, das todo y recibís poco.",
    trabajo: "Perseverar cuando todo parece difícil. Liderazgo con humanidad. Inv: rendirse antes de tiempo.",
    mensaje: "La Fuerza no ruge. Susurra. Y en ese susurro hay más poder que en cualquier grito. Tu verdadera fortaleza no asusta a nadie — los transforma."
  },

  el_ermitano: {
    nombre: "El Ermitaño",
    arcano: "Mayor — IX",
    derecha: "Soledad elegida para encontrar la propia luz. Introspección profunda, búsqueda espiritual. El sabio que ilumina su propio camino.",
    invertida: "Aislamiento patológico, rechazo al autoconocimiento.",
    amor: "Momento de soledad necesaria antes de una nueva relación. Inv: soledad dolorosa.",
    trabajo: "Trabajo independiente, expertise profundo. Inv: aislamiento laboral.",
    mensaje: "El Ermitaño lleva su propia luz porque aprendió que depender de la luz ajena es vivir a oscuras. ¿Cuándo fue la última vez que te preguntaste qué pensás vos, sin que nadie te lo dijera?"
  },

  la_rueda_fortuna: {
    nombre: "La Rueda de la Fortuna",
    arcano: "Mayor — X",
    derecha: "El ciclo eterno. Cambio favorable, giro del destino. Karma que retorna. Sincronías, suerte inesperada.",
    invertida: "Resistencia al cambio inevitable. Repetición de patrones no aprendidos.",
    amor: "Giro inesperado, reencuentro, nueva oportunidad. Inv: repetir los mismos errores.",
    trabajo: "Oportunidad que llega en el momento justo. Inv: ciclo de mala suerte que requiere introspección.",
    mensaje: "La Rueda no distingue quién merece subir o bajar. Solo gira. Tu poder está en decidir qué hacés mientras todo cambia a tu alrededor."
  },

  la_justicia: {
    nombre: "La Justicia",
    arcano: "Mayor — XI",
    derecha: "Causa y efecto. Verdad que sale a la luz. Decisiones con equilibrio y claridad. Karma en acción consciente.",
    invertida: "Injusticia, falta de responsabilidad, huir de las consecuencias.",
    amor: "Relación equilibrada o necesidad urgente de equilibrarla. Inv: desequilibrio de poder.",
    trabajo: "Procesos justos, resolución favorable. Inv: discriminación, problemas legales.",
    mensaje: "La Justicia no es venganza — es equilibrio. El universo siempre, siempre, encuentra la manera de restaurarlo."
  },

  el_colgado: {
    nombre: "El Colgado",
    arcano: "Mayor — XII",
    derecha: "Pausa voluntaria. Ver el mundo desde otro ángulo. Hay algo que no podés controlar — rendite ante eso. En la rendición está la sabiduría.",
    invertida: "Resistencia inútil. Martirio sin propósito. O al contrario: fin del período de espera.",
    amor: "Pausa necesaria. Reflexión antes de comprometerse. Inv: victimismo en el amor.",
    trabajo: "No es momento de actuar — es momento de observar. Inv: estancamiento por resistencia.",
    mensaje: "El Colgado sonríe. Porque descubrió que cuando parás de luchar contra lo que no podés cambiar, el universo te muestra un camino que nunca hubieras visto de pie."
  },

  la_muerte: {
    nombre: "La Muerte",
    arcano: "Mayor — XIII",
    derecha: "Transformación radical. Fin de un ciclo que ya no puede continuar. No es muerte física — es la muerte de lo que ya no sirve. Del fin nace lo nuevo.",
    invertida: "Resistencia al cambio necesario. Aferrarse a lo que ya murió.",
    amor: "Fin de una relación que cumplió su ciclo. O transformación profunda de la relación. Inv: incapacidad de soltar.",
    trabajo: "Fin de una etapa laboral necesario para abrir algo nuevo. Inv: seguir en un trabajo muerto por miedo.",
    mensaje: "La Muerte no es tu enemiga — es la matrona del renacer. Todo lo que alguna vez dolió terminar te hizo espacio para lo que hoy amás. Confiá en el proceso."
  },

  la_templanza: {
    nombre: "La Templanza",
    arcano: "Mayor — XIV",
    derecha: "Alquimia interior. Mezcla perfecta de opuestos. Equilibrio, moderación, paciencia. Proceso de integración que está funcionando.",
    invertida: "Excesos, impaciencia, desequilibrios.",
    amor: "Relación que crece con paciencia. Sanación de heridas. Inv: relación desequilibrada.",
    trabajo: "Proyecto que avanza con la velocidad correcta. Inv: impaciencia que arruina procesos.",
    mensaje: "La Templanza mezcla el fuego y el agua sin que ninguno apague al otro. Eso te pide la vida: que aprendas a ser intenso/a y tranquilo/a al mismo tiempo."
  },

  el_diablo: {
    nombre: "El Diablo",
    arcano: "Mayor — XV",
    derecha: "Las cadenas que uno mismo se pone. Adicciones, obsesiones, vínculos tóxicos. La ilusión de no tener salida — pero las cadenas están flojas.",
    invertida: "Liberación de una adicción o vínculo tóxico. Recuperación del poder personal.",
    amor: "Atracción obsesiva, dependencia emocional, relación tóxica difícil de dejar. Inv: liberación.",
    trabajo: "Trabajo que esclaviza, jefe manipulador. Inv: liberación de situación opresiva.",
    mensaje: "El Diablo te muestra tus cadenas. Y lo primero que notarás es que son más delgadas de lo que creías. La jaula no es de hierro — es de miedo."
  },

  la_torre: {
    nombre: "La Torre",
    arcano: "Mayor — XVI",
    derecha: "Revelación disruptiva. Lo construido sobre bases falsas se derrumba. Doloroso e inesperado, pero necesario. La Torre destruye lo que no era real.",
    invertida: "El derrumbe se retrasa pero no se evita. Crisis interna menos visible.",
    amor: "Ruptura repentina, revelación que cambia todo. Inv: relación que sobrevive una crisis pero queda debilitada.",
    trabajo: "Cambio radical no planificado, despido inesperado. Inv: situación inestable que se sostiene poco.",
    mensaje: "La Torre cae. Y en las ruinas, respirás el aire más limpio que respiraste en años. A veces el universo tiene que demoler lo que vos no te atrevías a abandonar."
  },

  la_estrella: {
    nombre: "La Estrella",
    arcano: "Mayor — XVII",
    derecha: "Esperanza renovada después de la tormenta. Sanación profunda, fe restaurada. Guía espiritual, conexión con el propósito del alma.",
    invertida: "Desesperanza, pérdida de fe, desconexión del propósito.",
    amor: "Amor que sana heridas viejas. Relación que inspira. Inv: amor idealizado que decepciona.",
    trabajo: "Vocación encontrada, trabajo con sentido. Inv: vacío profesional.",
    mensaje: "La Estrella brilla más después de la noche más oscura. El universo te dice: lo peor ya pasó. ¿Te permitís volver a confiar?"
  },

  la_luna: {
    nombre: "La Luna",
    arcano: "Mayor — XVIII",
    derecha: "Ilusión, confusión, lo que no es lo que parece. Subconsciente poderoso. Miedos irracionales, sueños significativos. No tomes decisiones aún.",
    invertida: "La niebla se levanta. Salida de la confusión. Secretos que salen a la luz.",
    amor: "Algo no está claro. Posible engaño. Atracción intensa que mezcla amor con obsesión. Inv: claridad.",
    trabajo: "Información incompleta. No actúes aún. Inv: verdad que sale a la luz.",
    mensaje: "La Luna distorsiona. Transforma el árbol en monstruo. Antes de actuar desde el miedo, preguntate: ¿estás viendo la realidad o la sombra que le proyectás vos?"
  },

  el_sol: {
    nombre: "El Sol",
    arcano: "Mayor — XIX",
    derecha: "La carta más luminosa del mazo. Alegría pura, éxito, vitalidad, claridad absoluta. Las cosas son buenas. Niño interior libre.",
    invertida: "Alegría temporalmente bloqueada. Optimismo excesivo. El Sol invertido sigue siendo buen augurio.",
    amor: "Felicidad, amor correspondido, relación que brilla. Inv: pequeños nubarrones en relación sana.",
    trabajo: "Éxito reconocido, logros celebrados. Inv: éxito que tarda un poco más.",
    mensaje: "El Sol no te pide que merezcas su luz. Simplemente brilla sobre todos. Hoy las cartas dicen: merecés brillar sin disculparte."
  },

  el_juicio: {
    nombre: "El Juicio",
    arcano: "Mayor — XX",
    derecha: "El llamado del alma. Despertar espiritual, renacimiento, misión más grande. Reconciliación con el pasado. Reencuentros significativos.",
    invertida: "Sordera al llamado interior. Juicio severo sobre uno mismo que paraliza.",
    amor: "Reencuentro importante, segunda oportunidad. Inv: juicio severo sobre la pareja o uno mismo.",
    trabajo: "Llamado a carrera más significativa. Reconocimiento importante. Inv: miedo al salto.",
    mensaje: "El Juicio no es castigo — es invitación. El ángel pregunta: ¿quién sos cuando no tenés miedo? Ese es el que está esperando para vivir."
  },

  el_mundo: {
    nombre: "El Mundo",
    arcano: "Mayor — XXI",
    derecha: "Completitud. El ciclo termina en victoria. Todo lo que sembraste con consciencia dio su fruto. Éxito global, expansión, plenitud.",
    invertida: "Ciclo que no termina de cerrarse. Miedo al éxito mismo. Retrasos en lo que ya se merece.",
    amor: "Amor completo, plenitud emocional. Inv: miedo al compromiso total.",
    trabajo: "El mejor resultado posible. Culminación de proyecto importante. Inv: empuje final necesario.",
    mensaje: "El Mundo baila. Baila libre, baila completa, baila sabiendo que llegó. Vos también llegás. Y cuando lo hagás — no lo celebrés tímidamente."
  },

  // ── ARCANOS MENORES — BASTOS ─────────────────────────────────────────────

  as_bastos: {
    nombre: "As de Bastos",
    arcano: "Menor — Bastos",
    derecha: "Semilla de nueva energía creativa. Inspiración que llega de golpe. Inicio de proyecto con mucha fuerza. Chispa sexual, pasión, ganas de vivir.",
    invertida: "Energía bloqueada, creatividad estancada, inicio falso.",
    mensaje: "Esta semilla de fuego quiere crecer. ¿La regás o la guardás en el cajón?"
  },
  "2_bastos": { nombre: "2 de Bastos", arcano: "Menor — Bastos", derecha: "Planificación del futuro desde posición de poder. El mundo como posibilidad.", invertida: "Miedo a salir de la zona conocida.", mensaje: "El horizonte te espera. ¿Estás mirándolo o caminando hacia él?" },
  "3_bastos": { nombre: "3 de Bastos", arcano: "Menor — Bastos", derecha: "Los barcos ya partieron. Lo que sembraste está en camino. Expansión mayor de lo esperado.", invertida: "Retrasos inesperados, falta de previsión.", mensaje: "Lo que lanzaste al mundo ya está navegando. Confiá en lo que pusiste en marcha." },
  "4_bastos": { nombre: "4 de Bastos", arcano: "Menor — Bastos", derecha: "Celebración merecida. Estabilidad lograda con esfuerzo. Hogar, comunidad, fiesta.", invertida: "Inestabilidad doméstica, celebración que se retrasa.", mensaje: "Hay algo que merece ser celebrado. ¿Lo estás celebrando o lo estás minimizando?" },
  "5_bastos": { nombre: "5 de Bastos", arcano: "Menor — Bastos", derecha: "Competencia, conflicto de ideas, caos productivo.", invertida: "Conflicto evitado pero no resuelto.", mensaje: "No todo conflicto es destructivo. A veces del choque de ideas nace algo nuevo." },
  "6_bastos": { nombre: "6 de Bastos", arcano: "Menor — Bastos", derecha: "Victoria pública. Reconocimiento, triunfo celebrado.", invertida: "Arrogancia, retraso del reconocimiento merecido.", mensaje: "El reconocimiento que merecés está llegando. ¿Estás lista para recibirlo?" },
  "7_bastos": { nombre: "7 de Bastos", arcano: "Menor — Bastos", derecha: "Defender lo propio. Posición de ventaja que requiere esfuerzo.", invertida: "Ceder terreno por agotamiento.", mensaje: "Vale la pena defender lo que construiste. No cedas terreno ahora." },
  "8_bastos": { nombre: "8 de Bastos", arcano: "Menor — Bastos", derecha: "Todo se mueve rápido. Noticias, viajes, comunicaciones velozas.", invertida: "Retrasos, confusión en comunicación.", mensaje: "La energía se acelera. Estate atenta a lo que llega." },
  "9_bastos": { nombre: "9 de Bastos", arcano: "Menor — Bastos", derecha: "Resiliencia. Has sido golpeada pero seguís en pie. Un último esfuerzo.", invertida: "Agotamiento total, rendirse antes de la meta.", mensaje: "Estás más cerca de lo que creés. Un último empuje." },
  "10_bastos": { nombre: "10 de Bastos", arcano: "Menor — Bastos", derecha: "Sobrecarga. Llevás demasiado. Necesitás delegar.", invertida: "Liberación de la carga o derrumbe bajo el peso.", mensaje: "No todo lo tenés que cargar vos. ¿A quién podés soltar algo?" },
  paje_bastos: { nombre: "Paje de Bastos", arcano: "Menor — Bastos", derecha: "Buenas noticias. Joven entusiasta, explorador, lleno de ideas.", invertida: "Inmadurez, proyectos sin seguimiento.", mensaje: "Una energía nueva y fresca está tocando tu puerta." },
  caballero_bastos: { nombre: "Caballero de Bastos", arcano: "Menor — Bastos", derecha: "Acción impulsiva pero emocionante. Aventura, pasión intensa.", invertida: "Imprudencia, agresividad, caos.", mensaje: "Esta energía quiere moverse. Canalizala bien." },
  reina_bastos: { nombre: "Reina de Bastos", arcano: "Menor — Bastos", derecha: "Mujer carismática, creativa, segura de sí misma. Lideresa natural.", invertida: "Manipulación, celos, energía creativa usada negativamente.", mensaje: "Hay una fuerza solar en vos que no siempre reconocés." },
  rey_bastos: { nombre: "Rey de Bastos", arcano: "Menor — Bastos", derecha: "Líder visionario, emprendedor, carismático.", invertida: "Tiranía, impulsividad sin control.", mensaje: "La visión existe. Lo que falta es la acción sostenida." },

  // ── ARCANOS MENORES — COPAS ──────────────────────────────────────────────

  as_copas: {
    nombre: "As de Copas",
    arcano: "Menor — Copas",
    derecha: "Desborde de amor. Nuevos sentimientos, apertura emocional. Oferta de amor puro. Puede indicar embarazo.",
    invertida: "Bloqueo emocional, no poder recibir ni dar amor.",
    mensaje: "El corazón quiere abrirse. ¿Le das permiso?"
  },
  "2_copas": { nombre: "2 de Copas", arcano: "Menor — Copas", derecha: "Unión de dos. Amor correspondido, asociación equilibrada, química real.", invertida: "Ruptura, falta de reciprocidad.", mensaje: "Lo que une a estas dos personas es más fuerte de lo que parece." },
  "3_copas": { nombre: "3 de Copas", arcano: "Menor — Copas", derecha: "Celebración con amigas, comunidad, alegría compartida.", invertida: "Chismes, triángulo amoroso.", mensaje: "La alegría se multiplica cuando se comparte." },
  "4_copas": { nombre: "4 de Copas", arcano: "Menor — Copas", derecha: "Contemplación, apatía. Una nueva oportunidad que se ofrece pero no se ve.", invertida: "Salir de la inercia, aceptar lo que se ofrece.", mensaje: "Hay algo frente a vos que todavía no estás viendo." },
  "5_copas": { nombre: "5 de Copas", arcano: "Menor — Copas", derecha: "Pérdida y duelo. Llorar lo que se fue mientras se ignora lo que queda.", invertida: "Superación del duelo, ver las copas que siguen de pie.", mensaje: "El duelo es necesario. Pero cuando estés lista, girá la cabeza y mirá lo que todavía te queda." },
  "6_copas": { nombre: "6 de Copas", arcano: "Menor — Copas", derecha: "Nostalgia dulce, infancia, reencuentro con el pasado. Amor puro.", invertida: "Vivir en el pasado, idealizar lo que fue.", mensaje: "El pasado tiene cosas hermosas. Solo asegurate de que no sea el único lugar donde vivís." },
  "7_copas": { nombre: "7 de Copas", arcano: "Menor — Copas", derecha: "Ilusiones, fantasías, demasiadas opciones. Soñar despierta sin actuar.", invertida: "Claridad sobre lo que realmente se quiere.", mensaje: "Tantas posibilidades pueden ser una trampa. ¿Cuál es la que de verdad querés?" },
  "8_copas": { nombre: "8 de Copas", arcano: "Menor — Copas", derecha: "Dejar ir algo que ya no llena. Alejarse con dignidad de lo que cumplió su propósito.", invertida: "Quedarse por miedo.", mensaje: "Hay cosas que ya cumplieron su ciclo con vos. Soltarlas no es perder — es hacerle espacio a lo que viene." },
  "9_copas": { nombre: "9 de Copas", arcano: "Menor — Copas", derecha: "La carta del deseo cumplido. Lo que pediste está por llegar. Satisfacción, placer.", invertida: "Satisfacción superficial, deseos cumplidos que no llenan.", mensaje: "Lo que pediste está en camino. El universo escuchó." },
  "10_copas": { nombre: "10 de Copas", arcano: "Menor — Copas", derecha: "Felicidad familiar completa. El hogar del corazón. Todo en armonía.", invertida: "Disfunción familiar, apariencias de felicidad.", mensaje: "Esta es la carta de la felicidad real, construida ladrillo a ladrillo." },
  paje_copas: { nombre: "Paje de Copas", arcano: "Menor — Copas", derecha: "Mensaje emocional. Joven sensible, creativo, romántico. Intuición nueva.", invertida: "Inmadurez emocional, dramas innecesarios.", mensaje: "Algo nuevo y tierno está despertando en el plano emocional." },
  caballero_copas: { nombre: "Caballero de Copas", arcano: "Menor — Copas", derecha: "El romántico por excelencia. Llega con propuestas, amor. Hombre sensible.", invertida: "Manipulación emocional, promesas vacías.", mensaje: "Alguien llega con intenciones del corazón. ¿Estás abierta a recibirlo?" },
  reina_copas: { nombre: "Reina de Copas", arcano: "Menor — Copas", derecha: "Mujer intuitiva, empática, amorosa profunda. Madre espiritual.", invertida: "Manipulación desde el victimismo, codependencia.", mensaje: "La sensibilidad no es debilidad — es tu mayor poder." },
  rey_copas: { nombre: "Rey de Copas", arcano: "Menor — Copas", derecha: "Hombre emocionalmente maduro, sabio, contenedor.", invertida: "Represión emocional, adicciones, frialdad.", mensaje: "La madurez emocional es el regalo más raro y más valioso." },

  // ── ARCANOS MENORES — ESPADAS ────────────────────────────────────────────

  as_espadas: {
    nombre: "As de Espadas",
    arcano: "Menor — Espadas",
    derecha: "Claridad mental absoluta. Verdad que corta. Nuevo comienzo desde la lucidez.",
    invertida: "Confusión, mentiras, uso de la mente para el mal.",
    mensaje: "La verdad puede cortar, pero también libera. ¿Estás lista para verla?"
  },
  "2_espadas": { nombre: "2 de Espadas", arcano: "Menor — Espadas", derecha: "Decisión difícil que se evita. Equilibrio precario. Información insuficiente.", invertida: "El momento de decidir. La venda cae.", mensaje: "Hay una decisión pendiente. No tomarla también es una decisión." },
  "3_espadas": { nombre: "3 de Espadas", arcano: "Menor — Espadas", derecha: "Dolor emocional profundo. Traición, pérdida, corazón roto.", invertida: "El duelo se procesa, el dolor empieza a sanar.", mensaje: "Este dolor ya pasó o está pasando. Llorá lo que necesitás llorar. Las espadas que duelen también curan." },
  "4_espadas": { nombre: "4 de Espadas", arcano: "Menor — Espadas", derecha: "Descanso necesario después de la batalla. No es momento de actuar.", invertida: "Descanso que se convierte en estancamiento.", mensaje: "El cuerpo y la mente necesitan parar. No es cobardía — es sabiduría." },
  "5_espadas": { nombre: "5 de Espadas", arcano: "Menor — Espadas", derecha: "Victoria sin honor. Ganar a cualquier costo deja heridas.", invertida: "Conflicto que finalmente termina.", mensaje: "No toda batalla vale la pena ganar. ¿Vale la pena el precio que estás pagando?" },
  "6_espadas": { nombre: "6 de Espadas", arcano: "Menor — Espadas", derecha: "Transición hacia aguas más calmas. Alejarse de un problema.", invertida: "El viaje hacia la sanación se complica.", mensaje: "Te estás alejando de algo difícil hacia algo mejor. Seguí remando." },
  "7_espadas": { nombre: "7 de Espadas", arcano: "Menor — Espadas", derecha: "Estrategia, a veces engaño. Actuar solo, en secreto.", invertida: "Secretos que salen a la luz.", mensaje: "Hay algo que se mueve en las sombras. Prestá atención a lo que no se dice." },
  "8_espadas": { nombre: "8 de Espadas", arcano: "Menor — Espadas", derecha: "Atrapada en la propia mente. Restricciones más mentales que reales.", invertida: "Liberación de las cadenas mentales.", mensaje: "La jaula que te tiene encerrada la construiste vos. Y vos la podés desarmar." },
  "9_espadas": { nombre: "9 de Espadas", arcano: "Menor — Espadas", derecha: "Ansiedad nocturna, catastrofismo mental. El peor escenario imaginado.", invertida: "El miedo empieza a ceder.", mensaje: "El miedo de las 3 de la mañana rara vez es proporcional a la realidad. ¿Cuánto de lo que temés ya pasó?" },
  "10_espadas": { nombre: "10 de Espadas", arcano: "Menor — Espadas", derecha: "El golpe más bajo. Traición total, fin doloroso. Pero: la aurora siempre sigue a la noche más oscura.", invertida: "Recuperación después del golpe.", mensaje: "Cuando ya tocaste el fondo, lo único que queda es subir. Y subís." },
  paje_espadas: { nombre: "Paje de Espadas", arcano: "Menor — Espadas", derecha: "Mente curiosa, vigilante. Noticias inesperadas.", invertida: "Habladuría, palabras que dañan.", mensaje: "Algo nuevo llega a nivel mental. Prestá atención a la información." },
  caballero_espadas: { nombre: "Caballero de Espadas", arcano: "Menor — Espadas", derecha: "Acción rápida, determinación, ir directo al grano.", invertida: "Impulsividad destructiva, palabras que hieren.", mensaje: "La velocidad puede ser virtud o trampa. ¿Estás avanzando o huyendo?" },
  reina_espadas: { nombre: "Reina de Espadas", arcano: "Menor — Espadas", derecha: "Mujer inteligente, directa, independiente. Ha sufrido y aprendió.", invertida: "Frialdad, amargura, lengua que daña.", mensaje: "Tu claridad y tu experiencia son un escudo. Usálos con sabiduría, no con dureza." },
  rey_espadas: { nombre: "Rey de Espadas", arcano: "Menor — Espadas", derecha: "Mente brillante, autoridad intelectual, juicio claro.", invertida: "Tiranía intelectual, crueldad disfrazada de lógica.", mensaje: "La mente más poderosa es la que sabe cuándo callar." },

  // ── ARCANOS MENORES — PENTÁCULOS ─────────────────────────────────────────

  as_pentaculos: {
    nombre: "As de Pentáculos",
    arcano: "Menor — Pentáculos",
    derecha: "Semilla de abundancia material. Nueva oportunidad financiera o de trabajo. Prosperidad que comienza.",
    invertida: "Oportunidad perdida, dinero que se va antes de llegar.",
    mensaje: "Una semilla de prosperidad está siendo plantada. ¿La estás cuidando?"
  },
  "2_pentaculos": { nombre: "2 de Pentáculos", arcano: "Menor — Pentáculos", derecha: "Malabarismo financiero. Equilibrio entre recursos limitados. Adaptabilidad.", invertida: "Desbalance financiero, más gastos que ingresos.", mensaje: "Podés manejarlo todo — pero necesitás priorizar." },
  "3_pentaculos": { nombre: "3 de Pentáculos", arcano: "Menor — Pentáculos", derecha: "Trabajo en equipo, artesanía de calidad, reconocimiento del talento.", invertida: "Trabajo mal reconocido, conflictos en el equipo.", mensaje: "Tu trabajo tiene valor. ¿Lo estás mostrando?" },
  "4_pentaculos": { nombre: "4 de Pentáculos", arcano: "Menor — Pentáculos", derecha: "Seguridad financiera. Puede ser ahorro sano o avaricia que bloquea.", invertida: "Miedo a perder lo acumulado, tacañería.", mensaje: "Cuidar lo que tenés es sabio. Aferrarte a ello por miedo es otra cosa." },
  "5_pentaculos": { nombre: "5 de Pentáculos", arcano: "Menor — Pentáculos", derecha: "Dificultad económica, sensación de exclusión. Pero hay ayuda cerca que no se ve.", invertida: "Mejora económica gradual.", mensaje: "La ayuda existe. A veces hay que levantar la vista del piso para verla." },
  "6_pentaculos": { nombre: "6 de Pentáculos", arcano: "Menor — Pentáculos", derecha: "Dar y recibir en equilibrio. Generosidad, intercambio justo.", invertida: "Generosidad con condiciones, dar para controlar.", mensaje: "Lo que das vuelve. Y lo que recibís con gratitud se multiplica." },
  "7_pentaculos": { nombre: "7 de Pentáculos", arcano: "Menor — Pentáculos", derecha: "Espera de la cosecha. El trabajo está hecho, ahora se espera el resultado.", invertida: "Impaciencia, invertir esfuerzo en lo que no da frutos.", mensaje: "Sembraste bien. Ahora toca esperar con confianza." },
  "8_pentaculos": { nombre: "8 de Pentáculos", arcano: "Menor — Pentáculos", derecha: "Artesanía, dedicación, aprendizaje de un oficio con amor.", invertida: "Perfeccionismo paralizante, trabajo mecánico sin alma.", mensaje: "El trabajo hecho con amor y detalle siempre deja huella." },
  "9_pentaculos": { nombre: "9 de Pentáculos", arcano: "Menor — Pentáculos", derecha: "Independencia económica ganada. Disfrutar de los propios logros. Elegancia.", invertida: "Dependencia financiera, éxito por caminos no del todo limpios.", mensaje: "Lo que construiste con tus propias manos no te lo saca nadie." },
  "10_pentaculos": { nombre: "10 de Pentáculos", arcano: "Menor — Pentáculos", derecha: "Legado familiar, riqueza multigeneracional, hogar sólido y próspero.", invertida: "Conflictos en la familia por dinero o herencias.", mensaje: "Lo que estás construyendo trasciende lo material. Estás construyendo legado." },
  paje_pentaculos: { nombre: "Paje de Pentáculos", arcano: "Menor — Pentáculos", derecha: "Estudiante dedicado, nuevas oportunidades de aprendizaje.", invertida: "Falta de ambición, estudio sin aplicación.", mensaje: "Hay algo nuevo para aprender que va a cambiar tu camino material." },
  caballero_pentaculos: { nombre: "Caballero de Pentáculos", arcano: "Menor — Pentáculos", derecha: "Trabajo constante y confiable. Avance lento pero seguro.", invertida: "Estancamiento, rigidez.", mensaje: "Lento y constante. No todo tiene que ser rápido para ser real." },
  reina_pentaculos: { nombre: "Reina de Pentáculos", arcano: "Menor — Pentáculos", derecha: "Mujer práctica, generosa, que cuida el hogar y los recursos.", invertida: "Materialismo excesivo, inseguridad disfrazada de abundancia.", mensaje: "Tenés el don de crear abundancia y calidez donde pisás." },
  rey_pentaculos: { nombre: "Rey de Pentáculos", arcano: "Menor — Pentáculos", derecha: "Hombre exitoso, emprendedor realizado, abundancia creada con esfuerzo.", invertida: "Corrupción, codicia, éxito a costa de otros.", mensaje: "La riqueza real se construye con integridad. No hay atajo que valga." }
};

// Devuelve el conocimiento de las cartas específicas que salieron en la tirada
function getConocimientoTirada(cartasIds) {
  return cartasIds
    .map(id => {
      const carta = CARTAS[id];
      if (!carta) return null;
      return `**${carta.nombre}** (${carta.arcano})
Derecha: ${carta.derecha}
${carta.invertida ? `Invertida: ${carta.invertida}` : ''}
Amor: ${carta.amor || 'Ver significado general'}
Trabajo/Dinero: ${carta.trabajo || carta.dinero || 'Ver significado general'}
Mensaje de Luna: "${carta.mensaje}"`;
    })
    .filter(Boolean)
    .join('\n\n');
}

module.exports = { CARTAS, getConocimientoTirada };
