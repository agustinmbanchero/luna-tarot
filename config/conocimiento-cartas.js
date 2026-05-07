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
    dinero: "Canales formales, inversiones seguras y establecidas. Inv: pérdidas por saltarse las reglas.",
    mensaje: "Hay sabiduría en lo que fue construido antes que vos. El Hierofante no te pide obediencia ciega — te pide que antes de romper algo, entiendas por qué fue construido."
  },

  los_enamorados: {
    nombre: "Los Enamorados",
    arcano: "Mayor — VI",
    derecha: "Elección consciente del corazón. Unión de opuestos, química real, almas que se reconocen. Decisión que define quiénes somos.",
    invertida: "Decisión evadida, valores en conflicto, separación inminente.",
    amor: "Amor real, elección mutua, compatibilidad verdadera. Inv: conflicto de valores.",
    trabajo: "Elección de carrera que alinea con los valores. Inv: dilema profesional.",
    dinero: "Decisión financiera que viene del corazón, no solo del cálculo. Inv: sociedad con valores opuestos.",
    mensaje: "Los Enamorados no preguntan '¿me quiere?'. Preguntan '¿me elijo yo primero?'. Nadie puede amarte genuinamente si vos no te elegiste antes."
  },

  el_carro: {
    nombre: "El Carro",
    arcano: "Mayor — VII",
    derecha: "Victoria por control y determinación. Avance, triunfo, movimiento. El guerrero que gana por disciplina mental, no fuerza bruta.",
    invertida: "Pérdida de control, dirección dispersa, obstáculos que detienen.",
    amor: "Conquista activa, ir por lo que se desea. Inv: perseguir a alguien que no está disponible.",
    trabajo: "Triunfo merecido, logro de objetivos. Inv: proyectos que se dispersan.",
    dinero: "Meta financiera que se alcanza con disciplina. Inv: dispersión que impide acumular.",
    mensaje: "El campo de batalla más difícil no está afuera — está en tu mente. Cuando dominás tus contradicciones internas, nada externo puede detenerte."
  },

  la_fuerza: {
    nombre: "La Fuerza",
    arcano: "Mayor — VIII",
    derecha: "Valentía suave. Domar al león con amor, no con cadenas. Paciencia, compasión, resiliencia. El poder que viene de aceptar la propia sombra.",
    invertida: "Debilidad, cobardía emocional, dudas paralizantes.",
    amor: "Amor que requiere paciencia. Inv: relación que te drena, das todo y recibís poco.",
    trabajo: "Perseverar cuando todo parece difícil. Liderazgo con humanidad. Inv: rendirse antes de tiempo.",
    dinero: "Sostener la situación económica con calma en momentos de presión. Inv: ceder ante el miedo financiero.",
    mensaje: "La Fuerza no ruge. Susurra. Y en ese susurro hay más poder que en cualquier grito. Tu verdadera fortaleza no asusta a nadie — los transforma."
  },

  el_ermitano: {
    nombre: "El Ermitaño",
    arcano: "Mayor — IX",
    derecha: "Soledad elegida para encontrar la propia luz. Introspección profunda, búsqueda espiritual. El sabio que ilumina su propio camino.",
    invertida: "Aislamiento patológico, rechazo al autoconocimiento.",
    amor: "Momento de soledad necesaria antes de una nueva relación. Inv: soledad dolorosa.",
    trabajo: "Trabajo independiente, expertise profundo. Inv: aislamiento laboral.",
    dinero: "Gestión financiera reflexiva y autónoma. Inv: aislamiento que lleva a malas decisiones sin consejo.",
    mensaje: "El Ermitaño lleva su propia luz porque aprendió que depender de la luz ajena es vivir a oscuras. ¿Cuándo fue la última vez que te preguntaste qué pensás vos, sin que nadie te lo dijera?"
  },

  la_rueda_fortuna: {
    nombre: "La Rueda de la Fortuna",
    arcano: "Mayor — X",
    derecha: "El ciclo eterno. Cambio favorable, giro del destino. Karma que retorna. Sincronías, suerte inesperada.",
    invertida: "Resistencia al cambio inevitable. Repetición de patrones no aprendidos.",
    amor: "Giro inesperado, reencuentro, nueva oportunidad. Inv: repetir los mismos errores.",
    trabajo: "Oportunidad que llega en el momento justo. Inv: ciclo de mala suerte que requiere introspección.",
    dinero: "Cambio de fortuna financiera, buena o mala. El ciclo gira. Inv: resistencia al cambio económico inevitable.",
    mensaje: "La Rueda no distingue quién merece subir o bajar. Solo gira. Tu poder está en decidir qué hacés mientras todo cambia a tu alrededor."
  },

  la_justicia: {
    nombre: "La Justicia",
    arcano: "Mayor — XI",
    derecha: "Causa y efecto. Verdad que sale a la luz. Decisiones con equilibrio y claridad. Karma en acción consciente.",
    invertida: "Injusticia, falta de responsabilidad, huir de las consecuencias.",
    amor: "Relación equilibrada o necesidad urgente de equilibrarla. Inv: desequilibrio de poder.",
    trabajo: "Procesos justos, resolución favorable. Inv: discriminación, problemas legales.",
    dinero: "Acuerdos justos, contratos que se respetan. Inv: fraude, deuda mal manejada, consecuencias de malas decisiones.",
    mensaje: "La Justicia no espera — ya está pesando. La pregunta no es si va a haber consecuencias. Es si estás lista para ver cuáles son las tuyas."
  },

  el_colgado: {
    nombre: "El Colgado",
    arcano: "Mayor — XII",
    derecha: "Pausa voluntaria. Ver el mundo desde otro ángulo. Hay algo que no podés controlar — rendite ante eso. En la rendición está la sabiduría.",
    invertida: "Resistencia inútil. Martirio sin propósito. O al contrario: fin del período de espera.",
    amor: "Pausa necesaria. Reflexión antes de comprometerse. Inv: victimismo en el amor.",
    trabajo: "No es momento de actuar — es momento de observar. Inv: estancamiento por resistencia.",
    dinero: "No mover el dinero ahora. Esperar con conciencia. Inv: parálisis financiera que ya no tiene sentido.",
    mensaje: "El Colgado sonríe. Porque descubrió que cuando parás de luchar contra lo que no podés cambiar, el universo te muestra un camino que nunca hubieras visto de pie."
  },

  la_muerte: {
    nombre: "La Muerte",
    arcano: "Mayor — XIII",
    derecha: "Transformación radical. Fin de un ciclo que ya no puede continuar. No es muerte física — es la muerte de lo que ya no sirve. Del fin nace lo nuevo.",
    invertida: "Resistencia al cambio necesario. Aferrarse a lo que ya murió.",
    amor: "Fin de una relación que cumplió su ciclo. O transformación profunda de la relación. Inv: incapacidad de soltar.",
    trabajo: "Fin de una etapa laboral necesario para abrir algo nuevo. Inv: seguir en un trabajo muerto por miedo.",
    dinero: "Cierre de un ciclo económico. Deudas que se saldan, etapas que terminan. Inv: aferrarse a un modelo que ya no funciona.",
    mensaje: "La Muerte no es tu enemiga — es la matrona del renacer. Todo lo que alguna vez dolió terminar te hizo espacio para lo que hoy amás. Confiá en el proceso."
  },

  la_templanza: {
    nombre: "La Templanza",
    arcano: "Mayor — XIV",
    derecha: "Alquimia interior. Mezcla perfecta de opuestos. Equilibrio, moderación, paciencia. Proceso de integración que está funcionando.",
    invertida: "Excesos, impaciencia, desequilibrios.",
    amor: "Relación que crece con paciencia. Sanación de heridas. Inv: relación desequilibrada.",
    trabajo: "Proyecto que avanza con la velocidad correcta. Inv: impaciencia que arruina procesos.",
    dinero: "Finanzas en equilibrio, ni derroche ni avaricia. Inv: excesos o restricciones extremas.",
    mensaje: "La Templanza mezcla el fuego y el agua sin que ninguno apague al otro. Eso te pide la vida: que aprendas a ser intenso/a y tranquilo/a al mismo tiempo."
  },

  el_diablo: {
    nombre: "El Diablo",
    arcano: "Mayor — XV",
    derecha: "Las cadenas que uno mismo se pone. Adicciones, obsesiones, vínculos tóxicos. La ilusión de no tener salida — pero las cadenas están flojas.",
    invertida: "Liberación de una adicción o vínculo tóxico. Recuperación del poder personal.",
    amor: "Atracción obsesiva, dependencia emocional, relación tóxica difícil de dejar. Inv: liberación.",
    trabajo: "Trabajo que esclaviza, jefe manipulador. Inv: liberación de situación opresiva.",
    dinero: "Deudas, adicciones financieras, gastos compulsivos. La trampa del dinero fácil. Inv: liberación de cadenas económicas.",
    mensaje: "El Diablo te muestra tus cadenas. Y lo primero que notarás es que son más delgadas de lo que creías. La jaula no es de hierro — es de miedo."
  },

  la_torre: {
    nombre: "La Torre",
    arcano: "Mayor — XVI",
    derecha: "Revelación disruptiva. Lo construido sobre bases falsas se derrumba. Doloroso e inesperado, pero necesario. La Torre destruye lo que no era real.",
    invertida: "El derrumbe se retrasa pero no se evita. Crisis interna menos visible.",
    amor: "Ruptura repentina, revelación que cambia todo. Inv: relación que sobrevive una crisis pero queda debilitada.",
    trabajo: "Cambio radical no planificado, despido inesperado. Inv: situación inestable que se sostiene poco.",
    dinero: "Pérdida financiera inesperada, quiebre de proyecto. Destrucción de lo construido sobre base falsa. Inv: crisis que se retrasa.",
    mensaje: "La Torre cae. Y en las ruinas, respirás el aire más limpio que respiraste en años. A veces el universo tiene que demoler lo que vos no te atrevías a abandonar."
  },

  la_estrella: {
    nombre: "La Estrella",
    arcano: "Mayor — XVII",
    derecha: "Esperanza renovada después de la tormenta. Sanación profunda, fe restaurada. Guía espiritual, conexión con el propósito del alma.",
    invertida: "Desesperanza, pérdida de fe, desconexión del propósito.",
    amor: "Amor que sana heridas viejas. Relación que inspira. Inv: amor idealizado que decepciona.",
    trabajo: "Vocación encontrada, trabajo con sentido. Inv: vacío profesional.",
    dinero: "Recuperación económica después de un período difícil. La esperanza como motor. Inv: desesperanza que paraliza las decisiones.",
    mensaje: "La Estrella brilla más después de la noche más oscura. El universo te dice: lo peor ya pasó. ¿Te permitís volver a confiar?"
  },

  la_luna: {
    nombre: "La Luna",
    arcano: "Mayor — XVIII",
    derecha: "Ilusión, confusión, lo que no es lo que parece. Subconsciente poderoso. Miedos irracionales, sueños significativos. No tomes decisiones aún.",
    invertida: "La niebla se levanta. Salida de la confusión. Secretos que salen a la luz.",
    amor: "Algo no está claro. Posible engaño. Atracción intensa que mezcla amor con obsesión. Inv: claridad.",
    trabajo: "Información incompleta. No actúes aún. Inv: verdad que sale a la luz.",
    dinero: "No es el momento de tomar decisiones financieras importantes. Hay engaño o confusión. Inv: la situación real se aclara.",
    mensaje: "La Luna distorsiona. Transforma el árbol en monstruo. Antes de actuar desde el miedo, preguntate: ¿estás viendo la realidad o la sombra que le proyectás vos?"
  },

  el_sol: {
    nombre: "El Sol",
    arcano: "Mayor — XIX",
    derecha: "La carta más luminosa del mazo. Alegría pura, éxito, vitalidad, claridad absoluta. Las cosas son buenas. Niño interior libre.",
    invertida: "Alegría temporalmente bloqueada. Optimismo excesivo. El Sol invertido sigue siendo buen augurio.",
    amor: "Felicidad, amor correspondido, relación que brilla. Inv: pequeños nubarrones en relación sana.",
    trabajo: "Éxito reconocido, logros celebrados. Inv: éxito que tarda un poco más.",
    dinero: "Abundancia clara y disfrutada. Buena racha financiera. Inv: prosperidad que se demora pero viene.",
    mensaje: "El Sol no te pide que merezcas su luz. Simplemente brilla sobre todos. Hoy las cartas dicen: merecés brillar sin disculparte."
  },

  el_juicio: {
    nombre: "El Juicio",
    arcano: "Mayor — XX",
    derecha: "El llamado del alma. Despertar espiritual, renacimiento, misión más grande. Reconciliación con el pasado. Reencuentros significativos.",
    invertida: "Sordera al llamado interior. Juicio severo sobre uno mismo que paraliza.",
    amor: "Reencuentro importante, segunda oportunidad. Inv: juicio severo sobre la pareja o uno mismo.",
    trabajo: "Llamado a carrera más significativa. Reconocimiento importante. Inv: miedo al salto.",
    dinero: "Evaluación honesta de la situación financiera. Momento de rendir cuentas y redireccionar. Inv: negarse a ver la realidad económica.",
    mensaje: "El Juicio no es castigo — es invitación. El ángel pregunta: ¿quién sos cuando no tenés miedo? Ese es el que está esperando para vivir."
  },

  el_mundo: {
    nombre: "El Mundo",
    arcano: "Mayor — XXI",
    derecha: "Completitud. El ciclo termina en victoria. Todo lo que sembraste con consciencia dio su fruto. Éxito global, expansión, plenitud.",
    invertida: "Ciclo que no termina de cerrarse. Miedo al éxito mismo. Retrasos en lo que ya se merece.",
    amor: "Amor completo, plenitud emocional. Inv: miedo al compromiso total.",
    trabajo: "El mejor resultado posible. Culminación de proyecto importante. Inv: empuje final necesario.",
    dinero: "Plenitud financiera, ciclo económico que cierra en victoria. Inv: éxito material casi alcanzado que necesita un empuje.",
    mensaje: "El Mundo baila. Baila libre, baila completa, baila sabiendo que llegó. Vos también llegás. Y cuando lo hagás — no lo celebrés tímidamente."
  },

  // ── ARCANOS MENORES — BASTOS ─────────────────────────────────────────────

  as_bastos: {
    nombre: "As de Bastos",
    arcano: "Menor — Bastos",
    derecha: "Semilla de nueva energía creativa. Inspiración que llega de golpe, sin avisar. Inicio de proyecto con mucha fuerza, chispa sexual, pasión encendida, ganas de vivir que no se explican pero se sienten.",
    invertida: "Energía bloqueada en la garganta. La idea existe pero no arranca. Inicio falso, entusiasmo que se apaga antes de transformarse en acción.",
    amor: "Atracción repentina e intensa. Comienzo de algo que quema. Inv: deseo que no termina de concretarse.",
    trabajo: "La chispa de un proyecto nuevo que puede ser grande. Creatividad en su punto de ignición. Inv: bloqueo creativo, postergación.",
    dinero: "Energía de inicio — todavía no es dinero, pero tiene potencial. Inv: inversiones a medias.",
    mensaje: "Esta semilla de fuego quiere crecer. La pregunta no es si va a crecer — la pregunta es si vos la regás o la guardás en el cajón."
  },

  "2_bastos": {
    nombre: "2 de Bastos",
    arcano: "Menor — Bastos",
    derecha: "Estás parada en la cima con el mundo en tus manos. Visión clara del futuro, planificación desde una posición de poder. El mundo no es un obstáculo — es una posibilidad.",
    invertida: "Miedo a salir de lo conocido disfrazado de prudencia. La visión existe pero los pies no se mueven.",
    amor: "Relación que necesita expansión — decidir si avanzar juntos o separados. Inv: estancamiento por miedo al compromiso.",
    trabajo: "Momento de planificar el siguiente paso grande. ¿Seguís en el mismo lugar o expandís? Inv: parálisis por análisis.",
    dinero: "Evaluar opciones de inversión con calma. El dinero existe para crecer. Inv: oportunidad que se pierde por indecisión.",
    mensaje: "El horizonte te espera. La diferencia entre soñar y vivir está en el momento en que dejás de mirar el mapa y empezás a caminar."
  },

  "3_bastos": {
    nombre: "3 de Bastos",
    arcano: "Menor — Bastos",
    derecha: "Los barcos ya partieron. Lo que sembraste está en camino. No hay más que hacer — solo confiar y esperar que llegue. La expansión viene de lejos.",
    invertida: "Retrasos que no esperabas. Planes que se complican en la ejecución. Falta de previsión en los detalles.",
    amor: "Una relación que crece más allá de los límites conocidos. Alguien que llega de lejos. Inv: relación que no termina de despegar.",
    trabajo: "Los primeros resultados de lo que pusiste en marcha se aproximan. Expansión, nuevos mercados, oportunidades que vienen desde afuera. Inv: retrasos en proyectos lanzados.",
    dinero: "Ingresos que llegan de fuentes que sembraste antes. Paciencia. Inv: esperas que se extienden.",
    mensaje: "Lo que lanzaste al mundo ya está navegando. Tu único trabajo ahora es confiar en lo que pusiste en marcha y no ir a buscar los barcos a mitad del océano."
  },

  "4_bastos": {
    nombre: "4 de Bastos",
    arcano: "Menor — Bastos",
    derecha: "Celebración merecida. Estabilidad lograda con esfuerzo. Un hogar, una comunidad, una fiesta — algo que se construyó y merece ser festejado en voz alta.",
    invertida: "Inestabilidad en el hogar o en la base. Celebración que se retrasa o que se siente hueca.",
    amor: "Relación que llega a una etapa de estabilidad y fiesta. Posible convivencia, compromiso, celebración pública. Inv: tensiones domésticas.",
    trabajo: "Proyecto completado. Momento de celebrar con el equipo antes de arrancar el siguiente. Inv: logros que no se reconocen.",
    dinero: "Base financiera sólida que permite festejar sin culpa. Inv: inestabilidad en los ingresos del hogar.",
    mensaje: "Hay algo que construiste y que merece ser celebrado. No lo minimicés. No le digas 'fue de casualidad'. Fue tuyo y fue real."
  },

  "5_bastos": {
    nombre: "5 de Bastos",
    arcano: "Menor — Bastos",
    derecha: "Competencia, conflicto de ideas, caos aparentemente improductivo. Múltiples fuerzas empujando en distintas direcciones. Energía que no sabe todavía dónde ir.",
    invertida: "Conflicto evitado pero no resuelto. Tensión acumulada que va a salir por otro lado.",
    amor: "Diferencias que se vuelven roces frecuentes. Puede ser caos creativo en la pareja o pelea que no tiene fin. Inv: discusiones que se suprimen y envenenan.",
    trabajo: "Competencia interna, ideas en choque, reuniones que no llegan a ningún lado. Inv: conflicto profesional que se niega.",
    dinero: "Múltiples demandas económicas al mismo tiempo. Falta de enfoque. Inv: disputa económica latente.",
    mensaje: "No todo conflicto es destrucción. A veces del choque de ideas nace algo que ninguna de las dos hubiera creado sola. La pregunta es si esta pelea tiene algo para enseñarte."
  },

  "6_bastos": {
    nombre: "6 de Bastos",
    arcano: "Menor — Bastos",
    derecha: "Victoria pública. Reconocimiento que llega desde afuera, no solo desde adentro. Triunfo celebrado, liderazgo validado. El esfuerzo que todos finalmente ven.",
    invertida: "Arrogancia que aleja. Reconocimiento que se demora o que llega pero no se puede disfrutar.",
    amor: "Una relación que se muestra al mundo con orgullo. Persona que llega con energía triunfante. Inv: ego que daña el vínculo.",
    trabajo: "Ascenso, reconocimiento público, logro visible. Tu trabajo empieza a tener el lugar que merece. Inv: éxito que se retrasa o que otros se atribuyen.",
    dinero: "Mejora económica visible y concreta. Inv: ganancias que no llegan a pesar del esfuerzo.",
    mensaje: "El reconocimiento que merecés está llegando. Y cuando llegue, recibílo derecha, sin disculparte ni achicarte. Se ganó."
  },

  "7_bastos": {
    nombre: "7 de Bastos",
    arcano: "Menor — Bastos",
    derecha: "Defender lo propio desde una posición de ventaja. Hay presión desde abajo pero vos estás arriba. El esfuerzo vale — no cedas terreno ahora.",
    invertida: "Agotamiento que lleva a ceder lo que no deberías. O sobredefensa innecesaria donde nadie te ataca.",
    amor: "Una relación donde estás dando más de lo que recibís y aun así la defendés. Inv: rendirse o pelear por algo que ya no vale.",
    trabajo: "Mantener tu posición frente a la competencia o críticas. Seguir parada en lo que construiste. Inv: ceder por cansancio.",
    dinero: "Defender recursos o posición económica bajo presión. Inv: perder terreno financiero por no mantenerse firme.",
    mensaje: "Vale la pena defender lo que construiste. Hay momentos en que no avanzar también es ganar — lo importante es no bajar la guardia ahora que más importa."
  },

  "8_bastos": {
    nombre: "8 de Bastos",
    arcano: "Menor — Bastos",
    derecha: "Todo se mueve rápido. Noticias importantes, viajes, comunicaciones veloces. La energía se acelera y el universo entrega de golpe lo que venía preparando.",
    invertida: "Retrasos inesperados. Mensajes que no llegan o se malinterpretan. Velocidad que se convierte en caos.",
    amor: "Noticias que mueven lo que estaba quieto. Si esperabas señal, puede ser esta. Si no esperabas nada, preparate para lo que llega rápido. Relación que se acelera de golpe. Inv: comunicación que falla en el momento clave.",
    trabajo: "Proyectos que avanzan rápido, viajes de trabajo, información que llega y hay que procesar. Inv: retrasos en proyectos urgentes.",
    dinero: "Dinero en movimiento — llega y sale rápido. Inv: transacciones que se complican.",
    mensaje: "La energía se acelera. Lo que pediste está en tránsito. Estate atenta porque lo que llega, llega rápido."
  },

  "9_bastos": {
    nombre: "9 de Bastos",
    arcano: "Menor — Bastos",
    derecha: "Resiliencia en su estado más puro. Golpeada pero de pie. Cansada pero sin rendirse. Hay un último esfuerzo entre vos y la meta, y ese esfuerzo sí vale.",
    invertida: "Agotamiento total que lleva a rendirse antes de llegar. O paranoia que convierte cada obstáculo en catástrofe.",
    amor: "Relación que ha sobrevivido pruebas difíciles. Vale la pena seguir. Inv: cansancio emocional que lleva al abandono.",
    trabajo: "Proyecto que está en su etapa más dura pero que está por terminar. No ahora. Inv: burnout real que necesita atención.",
    dinero: "Situación económica ajustada pero manejable con esfuerzo. Inv: agotamiento de recursos.",
    mensaje: "Estás más cerca de lo que creés. Todo lo que viviste hasta acá no fue en vano — fue entrenamiento para este momento. Un último empuje."
  },

  "10_bastos": {
    nombre: "10 de Bastos",
    arcano: "Menor — Bastos",
    derecha: "Sobrecarga real. Llevás demasiado — responsabilidades, compromisos, expectativas propias y ajenas. El cuerpo y la mente lo sienten.",
    invertida: "Liberación de la carga — o derrumbe bajo el peso antes de poder soltarla.",
    amor: "Una relación donde una persona carga con todo. Desequilibrio de responsabilidades. Inv: derrumbe de la relación por sobrecarga.",
    trabajo: "Exceso de trabajo, demasiados proyectos simultáneos. Necesidad urgente de delegar. Inv: colapso profesional.",
    dinero: "Deudas o compromisos financieros que pesan más de lo que parecen. Inv: crisis por no haber pedido ayuda antes.",
    mensaje: "No todo lo tenés que cargar vos. Eso que sentís en los hombros no es fuerza — es peso innecesario. ¿Quién puede agarrar algo de lo que llevás?"
  },

  paje_bastos: {
    nombre: "Paje de Bastos",
    arcano: "Menor — Bastos",
    derecha: "Una energía nueva y fresca que llega con entusiasmo, ideas, y una confianza que todavía no fue golpeada por la realidad. Buenas noticias en camino.",
    invertida: "Entusiasmo sin seguimiento. Muchas ideas, ningún plan concreto. Inmadurez creativa.",
    amor: "Alguien joven o con energía fresca entra en escena. Flirteo, primeras señales. Inv: coqueteo sin intención real.",
    trabajo: "Mensaje o propuesta laboral que llega. Nuevo proyecto con energía potente. Inv: promesas que no se cumplen.",
    dinero: "Oportunidad económica en sus primeros pasos. Inv: oferta que no tiene sustancia.",
    mensaje: "Algo nuevo y con fuego propio está tocando tu puerta. La pregunta no es si abrís — es qué hacés con eso cuando entre."
  },

  caballero_bastos: {
    nombre: "Caballero de Bastos",
    arcano: "Menor — Bastos",
    derecha: "Acción impulsiva pero llena de vida. Aventura, pasión intensa, movimiento sin plan fijo. Energía que contagia y arrastra.",
    invertida: "Imprudencia que daña. Agresividad mal canalizada. Caos por no parar a pensar.",
    amor: "Alguien apasionado, aventurero, que seduce pero no siempre puede sostener. Amor de llama alta. Inv: infidelidad, fuga.",
    trabajo: "Cambio rápido y audaz en la carrera. Viajes, acciones atrevidas. Inv: movimientos precipitados que salen mal.",
    dinero: "Inversiones impulsivas, riesgos. Puede salir bien si hay algo de estructura. Inv: pérdidas por no pensar.",
    mensaje: "Esta energía quiere moverse — y va a hacerlo con o sin vos. La pregunta es si la montás o la dejás pasar."
  },

  reina_bastos: {
    nombre: "Reina de Bastos",
    arcano: "Menor — Bastos",
    derecha: "Mujer carismática, creativa, segura de sí misma sin necesitar aprobación. Lideresa natural que calienta los ambientes donde entra. Pasión que no pide permiso.",
    invertida: "Manipulación, celos, energía creativa usada para controlar o destruir.",
    amor: "Mujer segura que sabe lo que quiere en el amor. Atracción magnética. Inv: celos, posesividad.",
    trabajo: "Liderazgo poderoso y creativo. La persona que inspira al equipo. Inv: uso del poder para intimidar.",
    dinero: "Capacidad de generar abundancia con creatividad y confianza. Inv: gastos excesivos por imagen.",
    mensaje: "Hay una fuerza solar en vos que no siempre reconocés. Cuando la reconocés — y la dejás ser — nada ni nadie puede apagarla."
  },

  rey_bastos: {
    nombre: "Rey de Bastos",
    arcano: "Menor — Bastos",
    derecha: "Líder visionario, emprendedor, carismático. Alguien que convierte ideas en realidad con voluntad y fuego. Autoridad que inspira en vez de imponer.",
    invertida: "Tiranía, impulsividad sin control. Visión sin ejecución. Energía que se consume a sí misma.",
    amor: "Hombre apasionado, líder, con mucha presencia. Puede ser difícil de acompañar. Inv: dominación, infidelidad por aburrimiento.",
    trabajo: "Emprendimiento exitoso, liderazgo visionario. El que mueve al equipo con su sola presencia. Inv: autoritarismo, caos por ego.",
    dinero: "Capacidad de crear grandes proyectos económicos. Visión de largo plazo. Inv: inversiones megalómanas.",
    mensaje: "La visión existe. El fuego existe. Lo único que a veces falta es la constancia para sostenerlos más allá de la emoción inicial."
  },

  // ── ARCANOS MENORES — COPAS ──────────────────────────────────────────────

  as_copas: {
    nombre: "As de Copas",
    arcano: "Menor — Copas",
    derecha: "Desborde de amor en su forma más pura. Nuevos sentimientos que llegan sin que los hayas buscado. Apertura emocional, corazón que se abre, abundancia interior. Puede indicar embarazo.",
    invertida: "Bloqueo emocional profundo. No poder recibir ni dar amor sin que duela. Copa volcada.",
    amor: "Inicio de amor intenso y genuino. Amor que llega solo. Inv: incapacidad de abrirse.",
    trabajo: "Trabajo con vocación, amor por lo que hacés. Inv: trabajo que drena emocionalmente.",
    dinero: "Abundancia emocional que puede traducirse en material. Inv: bloqueos que impiden recibir.",
    mensaje: "El corazón quiere abrirse. Siempre quiere abrirse. La única pregunta es si vos le das permiso o seguís poniéndole candado."
  },

  "2_copas": {
    nombre: "2 de Copas",
    arcano: "Menor — Copas",
    derecha: "Unión de dos que se eligen. Amor correspondido, química real, dos personas que se miran y se reconocen. La más romántica de las cartas menores.",
    invertida: "Ruptura, desbalance en los sentimientos. Uno quiere más que el otro.",
    amor: "Amor mutuo y equilibrado. Relación que tiene futuro real. Inv: separación o frialdad creciente.",
    trabajo: "Sociedad o asociación que funciona. Colaboración genuina. Inv: conflicto entre socios.",
    dinero: "Acuerdo económico justo y beneficioso para ambas partes. Inv: desequilibrio en acuerdos.",
    mensaje: "Lo que une a estas dos personas es más fuerte de lo que parece desde afuera. Pero requiere que los dos elijan — no uno solo."
  },

  "3_copas": {
    nombre: "3 de Copas",
    arcano: "Menor — Copas",
    derecha: "Celebración con amigas, comunidad que sostiene, alegría que se multiplica cuando se comparte. Vínculos femeninos poderosos.",
    invertida: "Chismes, triángulo amoroso, celebración excesiva que cubre algo que no está bien.",
    amor: "Buenas noticias en el amor que se festejan. O apoyo de amigas en momento importante. Inv: tercero en discordia.",
    trabajo: "Equipo que funciona, ambiente laboral sano, logros que se festejan colectivamente. Inv: celos profesionales.",
    dinero: "Abundancia que viene de proyectos colaborativos. Inv: gastos sociales excesivos.",
    mensaje: "La alegría no se divide cuando se comparte — se multiplica. ¿Cuándo fue la última vez que festejaste algo con las personas que te importan?"
  },

  "4_copas": {
    nombre: "4 de Copas",
    arcano: "Menor — Copas",
    derecha: "Contemplación que se vuelve apatía. Una nueva oportunidad se ofrece desde afuera mientras la atención está adentro. Lo que se busca puede estar justo ahí.",
    invertida: "Salida de la inercia. Apertura a lo que se ofrece. Despertarse.",
    amor: "Estar tan metida en uno misma que no se ve al que llega. Inv: apertura a una nueva relación.",
    trabajo: "Insatisfacción laboral que nubla las oportunidades reales. Inv: renovación de la motivación.",
    dinero: "Oportunidad económica que no se está viendo. Inv: claridad sobre opciones.",
    mensaje: "Hay algo frente a vos que todavía no estás viendo. No porque no exista — sino porque estás mirando para adentro. Levantá la vista."
  },

  "5_copas": {
    nombre: "5 de Copas",
    arcano: "Menor — Copas",
    derecha: "Pérdida real y duelo necesario. Llorar lo que se fue mientras se ignoran las dos copas que siguen de pie. El dolor es verdadero y merece ser sentido.",
    invertida: "Superación del duelo. Mirar lo que queda en pie. Empezar a reconstruir.",
    amor: "Pérdida en el amor — ruptura, decepción, traición. Inv: empezar a sanar.",
    trabajo: "Proyecto o trabajo perdido. Frustración real. Inv: volver a empezar con lo que quedó.",
    dinero: "Pérdida económica. El duelo antes de reconstruir. Inv: recuperación gradual.",
    mensaje: "El duelo es necesario. Llorá lo que perdiste — tiene sentido perderlo. Pero cuando estés lista, girá la cabeza y mirá las dos copas que todavía están de pie."
  },

  "6_copas": {
    nombre: "6 de Copas",
    arcano: "Menor — Copas",
    derecha: "Nostalgia dulce, infancia, amor puro que viene del pasado. Reencuentros, recuerdos que consuelan. A veces indica la llegada de alguien del pasado.",
    invertida: "Vivir en el pasado. Idealizar lo que fue hasta el punto de no poder ver lo que hay ahora.",
    amor: "Ex que reaparece. O relación que tiene raíces en algo viejo y conocido. Inv: incapacidad de soltar el pasado.",
    trabajo: "Trabajo que conecta con una vocación de infancia. Inv: nostalgia que impide avanzar.",
    dinero: "Herencia, regalo, ayuda de alguien del pasado. Inv: anclarse en lo que fue.",
    mensaje: "El pasado tiene cosas hermosas — eso es verdad. Solo asegurate de que no sea el único lugar donde vivís, porque la vida sucede en el presente."
  },

  "7_copas": {
    nombre: "7 de Copas",
    arcano: "Menor — Copas",
    derecha: "Demasiadas opciones, ilusiones hermosas pero difusas. Soñar despierta con posibilidades sin anclarlas en la realidad. La mente crea mundos paralelos.",
    invertida: "Claridad repentina sobre lo que se quiere. Elegir una copa y soltar las otras seis.",
    amor: "Fantasear con el amor ideal mientras se ignora lo real. Inv: claridad sobre lo que realmente querés en una pareja.",
    trabajo: "Muchas ideas pero ningún foco. Inv: elegir un camino y comprometerse.",
    dinero: "Ilusiones financieras, esquemas poco realistas. Inv: plan concreto y anclado.",
    mensaje: "Tantas posibilidades pueden ser una trampa tan efectiva como ninguna. ¿Cuál de todas estas copas es la que de verdad querés?"
  },

  "8_copas": {
    nombre: "8 de Copas",
    arcano: "Menor — Copas",
    derecha: "Partir. Dejar ir algo que ya no llena aunque todavía esté ahí. Alejarse con dignidad de lo que cumplió su ciclo, aunque duela.",
    invertida: "Quedarse por miedo al vacío. Saber que algo no funciona y no poder irse.",
    amor: "Salida de una relación que ya no da lo que una necesita. Inv: parálisis emocional, quedarse por costumbre.",
    trabajo: "Dejar un trabajo que ya cumplió su función. Inv: continuar en algo que agota.",
    dinero: "Soltar inversiones o proyectos que no están dando fruto. Inv: insistir por no querer reconocer la pérdida.",
    mensaje: "Hay cosas que ya cumplieron su ciclo con vos. Soltarlas no es perder — es hacerle espacio a lo que todavía no llegó pero que necesita que vos estés disponible."
  },

  "9_copas": {
    nombre: "9 de Copas",
    arcano: "Menor — Copas",
    derecha: "La carta del deseo cumplido. Lo que pediste, en silencio o en voz alta, está en camino. Satisfacción real, placer legítimo, abundancia emocional.",
    invertida: "Deseos cumplidos que no llenan. Satisfacción superficial. O excesos que terminan en vacío.",
    amor: "Lo que deseás en el amor se está acercando. Inv: relación perfecta por fuera, vacía por dentro.",
    trabajo: "El proyecto que soñabas empieza a materializarse. Inv: éxito que no da satisfacción.",
    dinero: "Llegada de dinero esperado. Abundancia que se disfruta. Inv: dinero que llega pero no alcanza para llenar.",
    mensaje: "Lo que pediste está en camino. El universo escuchó. Tu trabajo ahora es estar disponible para recibirlo."
  },

  "10_copas": {
    nombre: "10 de Copas",
    arcano: "Menor — Copas",
    derecha: "Felicidad familiar completa y genuina. El hogar del corazón. Vínculos que sostienen. Todo en armonía — no la armonía perfecta, sino la real.",
    invertida: "Disfunción familiar debajo de la superficie. Apariencia de felicidad que esconde fracturas.",
    amor: "La relación que tiene todo para durar. Amor que construye hogar. Inv: conflictos familiares que afectan a la pareja.",
    trabajo: "Equipo que funciona como familia. Ambiente laboral que nutre. Inv: conflictos internos que rompen la armonía.",
    dinero: "Estabilidad económica que permite construir un futuro familiar. Inv: tensiones por dinero en el hogar.",
    mensaje: "Esta es la carta de la felicidad real — no la de Instagram, sino la de todos los días. La que se construye ladrillo a ladrillo con las personas que elegiste."
  },

  paje_copas: {
    nombre: "Paje de Copas",
    arcano: "Menor — Copas",
    derecha: "Mensaje emocional que llega. Joven sensible, creativo, romántico, con una intuición que recién despierta. Algo tierno y nuevo en el plano sentimental.",
    invertida: "Inmadurez emocional, dramas innecesarios, sensibilidad que no sabe canalizarse.",
    amor: "Declaración, mensaje amoroso, primeras señales de algo nuevo. Inv: persona inmadura emocionalmente.",
    trabajo: "Propuesta creativa con potencial emocional. Inv: promesa sin sustancia.",
    dinero: "Pequeña entrada inesperada. Inv: gasto impulsivo por emoción.",
    mensaje: "Algo nuevo y tierno está despertando. Tratalo con cuidado — lo que es tierno puede ser también lo más poderoso si se cuida bien."
  },

  caballero_copas: {
    nombre: "Caballero de Copas",
    arcano: "Menor — Copas",
    derecha: "El romántico por excelencia. Llega con propuestas, poesía, sentimientos profundos. Hombre sensible que sabe hablar al corazón.",
    invertida: "Manipulación emocional. Promesas vacías que suenan hermosas. El seductor sin intención real.",
    amor: "Propuesta de amor genuina. Alguien que llega con el corazón en la mano. Inv: seducción sin compromiso.",
    trabajo: "Propuesta laboral cargada de entusiasmo. Inv: proyectos que se venden bien pero no se sostienen.",
    dinero: "Oferta que parece buena. Evaluar bien antes de aceptar. Inv: estafa disfrazada de oportunidad.",
    mensaje: "Alguien llega con las mejores intenciones del corazón. ¿Estás abierta para recibirlo, o ya empezaste a construir la excusa para no hacerlo?"
  },

  reina_copas: {
    nombre: "Reina de Copas",
    arcano: "Menor — Copas",
    derecha: "Mujer de intuición profunda, empatía que lee sin que le cuenten, amor que nutre sin ahogar. La que siente todo y aun así sigue de pie.",
    invertida: "Manipulación desde el victimismo. Codependencia. Empatía que se convierte en perder el propio centro.",
    amor: "Amor profundo e incondicional. Mujer que contiene. Inv: codependencia, dar sin recibir.",
    trabajo: "Trabajo que ayuda, cuida o crea. Vocación del corazón. Inv: trabajo que drena por falta de límites.",
    dinero: "Intuición financiera. Inv: dar dinero sin pedir nada.",
    mensaje: "La sensibilidad no es debilidad — es información. Vos sentís cosas que otros no perciben, y eso es un poder enorme si aprendés a usarlo sin que te consuma."
  },

  rey_copas: {
    nombre: "Rey de Copas",
    arcano: "Menor — Copas",
    derecha: "Hombre emocionalmente maduro, sabio, que contiene sin invadir. El raro: alguien que siente todo y lo maneja con dignidad.",
    invertida: "Represión emocional, adicciones, frialdad que lastima aunque no sea la intención.",
    amor: "Pareja emocionalmente madura que acompaña de verdad. Inv: hombre frío o emocionalmente ausente.",
    trabajo: "Líder que sabe gestionar lo emocional del equipo. Consejero, terapeuta, mentor. Inv: mal manejo de las emociones en el trabajo.",
    dinero: "Manejo equilibrado y maduro de los recursos. Inv: gastos por evasión emocional.",
    mensaje: "La madurez emocional es el regalo más raro que existe. Y el más valioso — porque la persona que puede estar con vos en lo difícil sin derrumbarse ni huir no tiene precio."
  },

  // ── ARCANOS MENORES — ESPADAS ────────────────────────────────────────────

  as_espadas: {
    nombre: "As de Espadas",
    arcano: "Menor — Espadas",
    derecha: "Claridad mental absoluta que corta como bisturí. Verdad que sale a la luz sin importar si duele. Nuevo comienzo desde la lucidez total.",
    invertida: "Confusión deliberada. Mentiras. Mente que se usa para el mal propio o ajeno.",
    amor: "Conversación difícil pero necesaria. Verdad que libera. Inv: engaños, comunicación que daña.",
    trabajo: "Decisión clara y definitiva. Empezar algo con total lucidez. Inv: información falsa, mala comunicación.",
    dinero: "Claridad sobre la situación económica real. Inv: mentiras financieras.",
    mensaje: "La verdad puede cortar. Pero lo que corta también cauteriza. ¿Estás lista para verla sin que te sorprenda tanto?"
  },

  "2_espadas": {
    nombre: "2 de Espadas",
    arcano: "Menor — Espadas",
    derecha: "Decisión difícil que se evita. Equilibrio precario entre dos opciones que se ignoran con los ojos vendados. Falta de información o miedo a elegir.",
    invertida: "La venda cae. La decisión ya no puede postergarse más. Hay que elegir.",
    amor: "Pararse entre dos personas o entre quedarse e irse. Inv: claridad que obliga a actuar.",
    trabajo: "Dilema profesional que paraliza. Inv: elección definitiva que no admite más demoras.",
    dinero: "Indecisión sobre una inversión o gasto importante. Inv: decidir con la información disponible.",
    mensaje: "Hay una decisión pendiente. La estás evitando porque sabés lo que vas a elegir y todavía no estás lista para las consecuencias. No tomarla también es una decisión — y tiene sus propias consecuencias."
  },

  "3_espadas": {
    nombre: "3 de Espadas",
    arcano: "Menor — Espadas",
    derecha: "Dolor emocional profundo y real. Traición, pérdida, corazón roto. Esta carta no se disfraza — dice la verdad del sufrimiento sin decoración.",
    invertida: "El duelo se está procesando. El dolor empieza a bajar. Todavía duele pero ya no inmoviliza.",
    amor: "Ruptura dolorosa, traición de pareja, pérdida de alguien amado. Inv: el corazón empieza a cicatrizar.",
    trabajo: "Decepción profesional, traición de un colega o jefe. Inv: recuperación después del golpe.",
    dinero: "Pérdida financiera que duele. Inv: lenta recuperación.",
    mensaje: "Este dolor tiene nombre y merece ser llorado. Llorá lo que necesitás llorar — es real. Las espadas que duelen también curan. Pero primero tienen que pasar."
  },

  "4_espadas": {
    nombre: "4 de Espadas",
    arcano: "Menor — Espadas",
    derecha: "Descanso necesario e imperioso después de la batalla. No es momento de actuar, es momento de parar. El cuerpo y la mente necesitan recuperarse.",
    invertida: "Descanso que se convierte en estancamiento. O salida del período de recuperación — ya es momento de moverse.",
    amor: "Pausa en una relación intensa. Tiempo para recuperarse antes de avanzar. Inv: fin de la pausa.",
    trabajo: "Tomarse un respiro es estratégico. No es cobardía. Inv: volver a la acción con fuerzas renovadas.",
    dinero: "Momento para no mover el dinero. Esperar. Inv: volver a las inversiones cuando se está descansado.",
    mensaje: "El guerrero que no descansa pierde la próxima batalla. No es cobardía hacer silencio — es táctica. ¿Qué pasaría si pararas de luchar por tres días?"
  },

  "5_espadas": {
    nombre: "5 de Espadas",
    arcano: "Menor — Espadas",
    derecha: "Victoria sin honor. Ganar a cualquier costo. Puede haber triunfo pero las heridas que se dejan son reales. No toda batalla vale lo que cuesta.",
    invertida: "El conflicto finalmente termina. O reconocer que esta guerra no vale la pena y soltar.",
    amor: "Conflicto destructivo, humillación, relación donde alguien siempre pierde. Inv: fin de la pelea.",
    trabajo: "Competencia desleal, alguien que juega sucio. Inv: resolución del conflicto.",
    dinero: "Ganar dinero de maneras que tienen un costo mayor. Inv: pérdida que finalmente termina.",
    mensaje: "Hay batallas que se ganan y dejan todo destruido. ¿Vale la pena el precio que estás pagando — o lo que estás defendiendo ya no es lo que creías?"
  },

  "6_espadas": {
    nombre: "6 de Espadas",
    arcano: "Menor — Espadas",
    derecha: "Transición hacia aguas más calmas. Alejarse de un problema que ya no tiene solución donde estás. No es derrota — es inteligencia.",
    invertida: "El viaje de sanación se complica. Resistencia a alejarse o regreso al lugar que se intentaba dejar.",
    amor: "Alejarse de una relación o situación amorosa tóxica. Inv: no poder irse todavía.",
    trabajo: "Cambio de trabajo o ambiente laboral. Inv: situación que sigue.",
    dinero: "Reorganización financiera, alejarse de una situación económica complicada. Inv: cambio que se demora.",
    mensaje: "Te estás alejando de algo difícil hacia algo que todavía no podés ver pero que es mejor. No tiene que sentirse bien — solo seguí remando."
  },

  "7_espadas": {
    nombre: "7 de Espadas",
    arcano: "Menor — Espadas",
    derecha: "Estrategia, a veces engaño. Alguien actúa en secreto o en forma independiente. Puede ser inteligencia táctica o manipulación — depende de quién lo hace.",
    invertida: "Secretos que salen a la luz. Lo que se hizo en la sombra se expone.",
    amor: "Alguien que no está siendo completamente honesto. Secretos en la relación. Inv: la verdad sale.",
    trabajo: "Alguien actúa por su cuenta o hay movimientos que no se dicen. Inv: exposición de lo que se ocultaba.",
    dinero: "Cuidado con fraudes o acuerdos que tienen letra chica. Inv: engaño descubierto.",
    mensaje: "Hay algo que se mueve en las sombras. Puede ser tuyo o puede ser de otro. En cualquier caso, prestá atención a lo que no se dice."
  },

  "8_espadas": {
    nombre: "8 de Espadas",
    arcano: "Menor — Espadas",
    derecha: "Atrapada dentro de la propia mente. Las restricciones son más mentales que reales — pero eso no las hace menos paralizantes.",
    invertida: "Liberación de las cadenas mentales. Ver que la jaula siempre estuvo abierta.",
    amor: "Sentirse atrapada en una relación o en la soledad por creencias propias. Inv: apertura.",
    trabajo: "Limitaciones autoimpuestas que impiden avanzar. Inv: nueva perspectiva que abre posibilidades.",
    dinero: "Creencias limitantes sobre el dinero. Inv: liberación de esas creencias.",
    mensaje: "La jaula que te tiene encerrada la construiste vos, ladrillo a ladrillo. Y eso, que suena mal, en realidad es buena noticia — porque vos también podés desarmarla."
  },

  "9_espadas": {
    nombre: "9 de Espadas",
    arcano: "Menor — Espadas",
    derecha: "Ansiedad nocturna, catastrofismo mental, el peor escenario imaginado repetido hasta el cansancio. La mente que no deja dormir.",
    invertida: "El miedo empieza a ceder. La noche larga está terminando.",
    amor: "Preocupación excesiva por la relación, miedos que amplifica la mente. Inv: tranquilidad después de la angustia.",
    trabajo: "Estrés laboral que se lleva a casa. Inv: alivio de la presión.",
    dinero: "Miedo a la pérdida económica que puede ser desproporcionado. Inv: alivio financiero.",
    mensaje: "El miedo de las 3 de la mañana rara vez es proporcional a la realidad. Preguntate: ¿cuánto de lo que estás temiendo ya pasó, y cuánto solo existe en tu cabeza?"
  },

  "10_espadas": {
    nombre: "10 de Espadas",
    arcano: "Menor — Espadas",
    derecha: "El golpe más bajo. Traición total, fin doloroso, el momento en que ya no se puede caer más. Pero la aurora existe — siempre existe después de la noche más oscura.",
    invertida: "Recuperación después del golpe. El dolor empieza a transformarse.",
    amor: "Fin de una relación de la peor manera. Traición profunda. Inv: empezar a levantarse.",
    trabajo: "Despido, traición profesional, pérdida de algo muy construido. Inv: reconstrucción.",
    dinero: "Pérdida económica grave. El punto más bajo. Inv: primer paso hacia la recuperación.",
    mensaje: "Cuando ya tocaste el fondo, lo único que queda es subir. No porque la vida sea justa — sino porque literalmente no hay más para abajo. Y subís."
  },

  paje_espadas: {
    nombre: "Paje de Espadas",
    arcano: "Menor — Espadas",
    derecha: "Mente inquieta y vigilante que observa antes de actuar. Hay información circulando — noticias, mensajes, conversaciones — que vale más de lo que parece. Este paje todavía no cortó nada con su espada: está aprendiendo a sostenerla. Si no se usa con cuidado, puede haber malentendidos o chisme disfrazado de dato.",
    invertida: "Habladuría, chismes, palabras que dañan sin intención o con ella.",
    amor: "Comunicación importante que llega. Alguien que habla mucho pero puede decir poco. Inv: rumores o palabras hirientes.",
    trabajo: "Información nueva que cambia el panorama. Inv: mal uso de la información.",
    dinero: "Noticias económicas que hay que escuchar con atención. Inv: desinformación.",
    mensaje: "La espada del paje todavía no cortó nada — está aprendiendo a sostenerla. Ojo con lo que decís antes de tener la información completa."
  },

  caballero_espadas: {
    nombre: "Caballero de Espadas",
    arcano: "Menor — Espadas",
    derecha: "Acción rápida, determinación sin dudar, ir directo al grano sin parar a pensar en el camino. Velocidad que puede ser virtud o desastre.",
    invertida: "Impulsividad destructiva. Palabras que hieren sin querer — o queriendo. Conflicto por actuar sin pensar.",
    amor: "Alguien que viene con todo o no viene. Relación intensa y rápida. Inv: heridas por palabras dichas en el calor del momento.",
    trabajo: "Acción decisiva y veloz. Cortar lo que no funciona. Inv: decisiones precipitadas con consecuencias.",
    dinero: "Movimientos financieros rápidos. Inv: pérdidas por apresurarse.",
    mensaje: "La velocidad puede ser virtud o trampa. ¿Estás avanzando hacia algo o huyendo de algo? La diferencia importa más de lo que parece."
  },

  reina_espadas: {
    nombre: "Reina de Espadas",
    arcano: "Menor — Espadas",
    derecha: "Mujer inteligente, directa, independiente, que ha sufrido y aprendió de eso. Mente brillante que no se deja engañar dos veces.",
    invertida: "Frialdad que lastima, amargura que se volvió carácter, lengua cortante que ya no distingue a quién daña.",
    amor: "Mujer que no tolera medias verdades. Sola por elección o herida vieja que no terminó de cerrar. Inv: dureza que aleja al amor.",
    trabajo: "Liderazgo intelectual, claridad que otros no tienen. Inv: clima laboral helado.",
    dinero: "Claridad financiera, decisiones sin sentimentalismos. Inv: frialdad que corta vínculos útiles.",
    mensaje: "Tu claridad y tu experiencia son un escudo que forjaste con todo lo que viviste. Usálos con sabiduría — no con dureza. Hay gente que merece que los dejes entrar."
  },

  rey_espadas: {
    nombre: "Rey de Espadas",
    arcano: "Menor — Espadas",
    derecha: "Mente brillante, autoridad intelectual, juicio claro y sin concesiones. El que ve lo que otros no ven y lo dice aunque no sea cómodo.",
    invertida: "Tiranía intelectual. Crueldad disfrazada de lógica. Usar la inteligencia para herir.",
    amor: "Hombre inteligente pero emocionalmente distante. Inv: frialdad que destruye vínculos.",
    trabajo: "Autoridad que genera respeto. Decisiones difíciles tomadas con claridad. Inv: liderazgo que aplasta.",
    dinero: "Gestión inteligente y sin emociones de los recursos. Inv: frialdad en negociaciones que rompe acuerdos.",
    mensaje: "La mente más poderosa no es la que siempre tiene razón — es la que sabe cuándo callar, cuándo ceder y cuándo la lógica sola no alcanza."
  },

  // ── ARCANOS MENORES — PENTÁCULOS ─────────────────────────────────────────

  as_pentaculos: {
    nombre: "As de Pentáculos",
    arcano: "Menor — Pentáculos",
    derecha: "Semilla de abundancia material. Nueva oportunidad financiera o de trabajo que tiene raíces reales. El comienzo concreto de algo próspero.",
    invertida: "Oportunidad que se escapa. Dinero que se va antes de llegar. Inicio fallido por falta de base.",
    amor: "Relación que ofrece estabilidad y seguridad real. Inv: relación que tiene costo económico o emocional alto.",
    trabajo: "Nueva oportunidad laboral o de negocio concreta y real. Inv: propuesta que no tiene sustancia.",
    dinero: "Semilla de riqueza. Invertir con base sólida. Inv: perder la oportunidad por no actuar.",
    mensaje: "Una semilla de prosperidad está siendo plantada. La pregunta no es si va a crecer — las semillas crecen cuando se cuidan. ¿La estás cuidando?"
  },

  "2_pentaculos": {
    nombre: "2 de Pentáculos",
    arcano: "Menor — Pentáculos",
    derecha: "Malabarismo financiero con gracia. Equilibrar recursos limitados con adaptabilidad. Se puede, pero requiere atención constante.",
    invertida: "Desbalance real. Más gastos que ingresos. El malabaris se cae.",
    amor: "Equilibrar la relación con otras responsabilidades. Inv: relación descuidada por otras prioridades.",
    trabajo: "Manejar múltiples proyectos simultáneos. Adaptarse rápido. Inv: demasiado para una sola persona.",
    dinero: "Ingresos y gastos en tensión constante. Necesidad de priorizar. Inv: deuda o desbalance grave.",
    mensaje: "Podés manejar todo esto — pero no podés manejarlo todo al mismo tiempo y con la misma intensidad. Necesitás priorizar."
  },

  "3_pentaculos": {
    nombre: "3 de Pentáculos",
    arcano: "Menor — Pentáculos",
    derecha: "Trabajo en equipo que produce resultados reales. Artesanía de calidad, talento reconocido, colaboración que suma más que las partes.",
    invertida: "Trabajo mal reconocido o no valorado. Conflictos que arruinan la colaboración.",
    amor: "Construir algo juntos, proyecto en común que une. Inv: desacuerdo sobre el futuro compartido.",
    trabajo: "Reconocimiento profesional merecido. Equipo que funciona. Inv: celos o conflicto profesional.",
    dinero: "Ingresos por trabajo colaborativo o proyectos en equipo. Inv: pagos retenidos o mal distribuidos.",
    mensaje: "Tu trabajo tiene valor real. ¿Lo estás mostrando o lo estás escondiendo esperando que alguien lo descubra solo?"
  },

  "4_pentaculos": {
    nombre: "4 de Pentáculos",
    arcano: "Menor — Pentáculos",
    derecha: "Seguridad financiera que se construyó con esfuerzo. Puede ser ahorro sano y necesario — o puede ser avaricia y miedo que bloquea el flujo.",
    invertida: "Miedo patológico a perder lo acumulado. Tacañería que impide crecer o dar.",
    amor: "Estabilidad material que da base a la relación. Inv: avaro con el amor y con el dinero.",
    trabajo: "Consolidación financiera, ahorro estratégico. Inv: rigidez que impide crecer.",
    dinero: "Reservas sólidas. Pero si el miedo a perderlas es más grande que la alegría de tenerlas, algo está fallando. Inv: acumulación que bloquea.",
    mensaje: "Cuidar lo que tenés es sabiduría. Aferrarte a ello por miedo es otra cosa — es vivir trabajando para el dinero en vez de que el dinero trabaje para vos."
  },

  "5_pentaculos": {
    nombre: "5 de Pentáculos",
    arcano: "Menor — Pentáculos",
    derecha: "Dificultad económica real, sensación de exclusión. Frío afuera, luz adentro que no se ve. Hay ayuda disponible que no se está buscando.",
    invertida: "Mejora económica gradual que empieza. El período más duro está pasando.",
    amor: "Relación en dificultades materiales. Inv: relación que se fortalece después de superar una crisis.",
    trabajo: "Período de escasez laboral o desempleo. Inv: nueva oportunidad que empieza a aparecer.",
    dinero: "Momento económico difícil. La ayuda existe pero hay que pedirla y buscarla. Inv: el piso ya fue tocado y empieza a subir.",
    mensaje: "La ayuda existe — no siempre llega sola. A veces hay que levantar la vista del piso y mirar si la puerta de la iglesia está abierta."
  },

  "6_pentaculos": {
    nombre: "6 de Pentáculos",
    arcano: "Menor — Pentáculos",
    derecha: "Dar y recibir en equilibrio real. Generosidad que fluye en ambas direcciones. Intercambio justo donde nadie queda debiendo.",
    invertida: "Generosidad con condiciones ocultas. Dar para controlar o para que te deban.",
    amor: "Relación de intercambio justo, dar y recibir en equilibrio. Inv: dar demasiado sin recibir nada.",
    trabajo: "Pago justo por trabajo bien hecho. Intercambio que beneficia a todos. Inv: explotación laboral.",
    dinero: "Dinero que entra y sale en flujo sano. Donaciones, generosidad que vuelve. Inv: desequilibrio en transacciones.",
    mensaje: "Lo que das con el corazón abierto vuelve. Y lo que recibís con gratitud genuina se multiplica. Eso no es magia — es la ley del intercambio."
  },

  "7_pentaculos": {
    nombre: "7 de Pentáculos",
    arcano: "Menor — Pentáculos",
    derecha: "Pausa para evaluar lo sembrado. El trabajo ya está hecho y ahora hay que esperar la cosecha. Paciencia estratégica, no pasividad.",
    invertida: "Impaciencia que arruina procesos. Invertir esfuerzo en lo que no da frutos y no verlo.",
    amor: "Relación que necesita tiempo para crecer sin apresurarse. Inv: querer resultados inmediatos.",
    trabajo: "Proyecto a largo plazo que está madurando. Inv: cambiar de plan cuando estaba casi listo.",
    dinero: "Inversiones que necesitan tiempo. No tocar. Inv: impaciencia que genera pérdidas.",
    mensaje: "Sembraste bien. El trabajo ya está hecho. Ahora solo toca esperar — que es la parte que más le cuesta a quien trabaja duro."
  },

  "8_pentaculos": {
    nombre: "8 de Pentáculos",
    arcano: "Menor — Pentáculos",
    derecha: "Artesanía, dedicación profunda, aprender un oficio con amor y detalle. El trabajo hecho una y otra vez hasta que sale perfecto.",
    invertida: "Perfeccionismo paralizante. Trabajo mecánico sin alma. Rutina que aburre.",
    amor: "Trabajo en la relación, dedicación consciente. Inv: relación en piloto automático.",
    trabajo: "Maestría que se construye con práctica. Formación, especialización. Inv: trabajo sin compromiso.",
    dinero: "Ingresos sólidos por habilidad bien desarrollada. Inv: esfuerzo sin retribución justa.",
    mensaje: "El trabajo hecho con amor y detalle siempre deja huella — en quien lo recibe y en quien lo hace. No hay atajo que valga lo que vale hacer bien lo que sabés hacer."
  },

  "9_pentaculos": {
    nombre: "9 de Pentáculos",
    arcano: "Menor — Pentáculos",
    derecha: "Independencia económica ganada con el propio esfuerzo. Disfrutar los logros sin culpa. Elegancia, autonomía, mujer que no necesita a nadie para vivir bien.",
    invertida: "Dependencia financiera. Éxito por caminos no del todo propios o no del todo limpios.",
    amor: "Mujer que elige amar desde la abundancia, no desde la necesidad. Inv: dependencia económica que compromete el amor.",
    trabajo: "Éxito económico consolidado. Cosecha de años de trabajo. Inv: éxito frágil o logrado con compromisos.",
    dinero: "Abundancia real y disfrutada. Inv: depender económicamente de otros.",
    mensaje: "Lo que construiste con tus propias manos y tu propia inteligencia no te lo saca nadie. Disfrutalo — no te lo ganaste para guardarlo."
  },

  "10_pentaculos": {
    nombre: "10 de Pentáculos",
    arcano: "Menor — Pentáculos",
    derecha: "Legado familiar, riqueza que trasciende lo material, hogar sólido y próspero construido para durar. Lo que se deja a quienes vienen después.",
    invertida: "Conflictos familiares por dinero, herencias disputadas, riqueza que divide en vez de unir.",
    amor: "Amor que construye familia y legado. Relación que tiene futuro real. Inv: familia que presiona o conflictos por herencias.",
    trabajo: "Empresa familiar, negocio que trasciende generaciones. Estabilidad máxima. Inv: disputas internas.",
    dinero: "Riqueza multigeneracional, patrimonio sólido. Inv: conflictos de herencia.",
    mensaje: "Lo que estás construyendo trasciende lo material. Estás construyendo legado — algo que va a existir cuando vos ya no estés. Eso tiene un peso diferente."
  },

  paje_pentaculos: {
    nombre: "Paje de Pentáculos",
    arcano: "Menor — Pentáculos",
    derecha: "Estudiante dedicado con hambre genuina de aprender. Nuevas oportunidades de formación o trabajo que requieren esfuerzo real.",
    invertida: "Falta de ambición. Estudio sin aplicación. Quedarse en la teoría sin dar el paso.",
    amor: "Relación nueva que tiene potencial pero necesita tiempo para crecer. Inv: inmadurez que frena.",
    trabajo: "Oportunidad de aprendizaje o trabajo de base. Inv: oportunidad desaprovechada por falta de compromiso.",
    dinero: "Ingresos modestos pero reales. Primer trabajo. Inv: plata que no alcanza por falta de esfuerzo.",
    mensaje: "Hay algo nuevo para aprender que tiene el potencial de cambiar tu camino material. La pregunta es si estás lista para poner el trabajo que eso requiere."
  },

  caballero_pentaculos: {
    nombre: "Caballero de Pentáculos",
    arcano: "Menor — Pentáculos",
    derecha: "Trabajo constante, confiable, metódico. Avance lento pero real y sostenido. El que termina lo que empieza aunque no sea emocionante.",
    invertida: "Estancamiento disfrazado de constancia. Rigidez que no permite adaptarse.",
    amor: "Persona confiable, leal, que está en las malas. Lento para demostrar el amor pero profundo. Inv: aburrimiento o falta de estímulo.",
    trabajo: "Trabajo metódico que produce resultados sólidos. Inv: rutina que paraliza.",
    dinero: "Crecimiento financiero lento y seguro. No hay atajos pero tampoco hay sorpresas. Inv: estancamiento.",
    mensaje: "Lento y constante. En un mundo que te pide todo ya y todo rápido, la constancia es una forma de rebeldía — y una de las más efectivas."
  },

  reina_pentaculos: {
    nombre: "Reina de Pentáculos",
    arcano: "Menor — Pentáculos",
    derecha: "Mujer práctica, generosa, que sabe crear abundancia y calidez donde pisa. El hogar florece con su presencia, el dinero se multiplica con su gestión.",
    invertida: "Materialismo que tapa el vacío interno. Inseguridad disfrazada de practicidad.",
    amor: "Mujer que ama con hechos, no con palabras. Que cuida y nutre. Inv: usar lo material para controlar.",
    trabajo: "Gestión brillante de recursos. Empresa o proyecto que prospera bajo su cuidado. Inv: exceso de control.",
    dinero: "Abundancia creada con inteligencia práctica y generosidad. Inv: acumular por inseguridad.",
    mensaje: "Tenés el don de crear abundancia y calidez donde pisás. Cuando entrás a un lugar, algo mejora — no siempre lo ven, pero está."
  },

  rey_pentaculos: {
    nombre: "Rey de Pentáculos",
    arcano: "Menor — Pentáculos",
    derecha: "Hombre exitoso, emprendedor realizado, que construyó su abundancia con esfuerzo y visión de largo plazo. Generoso con lo que tiene.",
    invertida: "Corrupción, codicia, éxito construido a costa de otros. Riqueza que no da satisfacción.",
    amor: "Hombre que ofrece estabilidad y protección real. Inv: usar el dinero para controlar.",
    trabajo: "Emprendimiento exitoso, inversiones que rinden. El que sabe construir y mantener. Inv: negocios dudosos.",
    dinero: "Riqueza real, construida con trabajo y visión. Inv: corrupción, pérdida de lo acumulado.",
    mensaje: "La riqueza real se construye con integridad. No hay atajo que te dé lo mismo — porque lo que se construye rápido y sucio también se derrumba rápido y en público."
  }
};

// Devuelve el conocimiento de las cartas específicas que salieron en la tirada
function getConocimientoTirada(cartasIds) {
  return cartasIds
    .map(id => {
      const carta = CARTAS[id];
      if (!carta) return null;
      const trabajoDinero = [carta.trabajo, carta.dinero].filter(Boolean).join(' | ');
      return `**${carta.nombre}** (${carta.arcano})
Derecha: ${carta.derecha}
${carta.invertida ? `Invertida: ${carta.invertida}` : ''}
Amor: ${carta.amor || 'Ver significado general'}
Trabajo/Dinero: ${trabajoDinero || 'Ver significado general'}
Mensaje de Luna: "${carta.mensaje}"`;
    })
    .filter(Boolean)
    .join('\n\n');
}

module.exports = { CARTAS, getConocimientoTirada };
