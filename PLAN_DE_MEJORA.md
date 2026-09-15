# Plan de mejora sustancial de la app Viento Sur FM

## 1. Visión general

La aplicación actual ya tiene una base sólida: una interfaz de control visual, un motor de audio con Web Audio API, presets, y una estructura de panels para procesamiento FM. Sin embargo, para convertirla en una herramienta útil, robusta y escalable, debe evolucionar desde una demo funcional hacia una aplicación de radio profesional con mejor arquitectura, experiencia de usuario, estabilidad y calidad de audio.

El objetivo principal es mejorar la percepción de producto, la confiabilidad técnica y la utilidad operativa, sin perder la identidad visual actual inspirada en consola de procesamiento FM.

---

## 2. Diagnóstico general

### Fortalezas actuales

- Interfaz clara y visualmente consistente.
- Estructura modular por paneles funcionales.
- Base de audio con Web Audio API que permite manipular señales en tiempo real.
- Soporte para presets y personalización local.
- Preparación para entorno móvil con Capacitor.
- Modelo de estado bien orientado a la lógica de un procesador de audio.

### Debilidades principales

- La lógica de audio y la lógica de UI están muy acopladas.
- El estado global crece y puede volverse difícil de mantener.
- La experiencia de usuario todavía se parece más a una maqueta funcional que a una consola operativa real.
- Hay poca capa de validación, testeo y observabilidad.
- El sistema de presets y la persistencia necesita reforzarse.
- La gestión de archivos, micrófono y reproducción de audio en móvil puede ser frágil.
- La señal de audio se modela de forma simplificada; no existe aún un DSP más semántico ni una arquitectura clara de módulos.

---

## 3. Objetivos estratégicos

### Objetivo 1: convertir la app en una herramienta de radio usable

La interfaz debe permitir operar con rapidez, responder a acciones con claridad y ofrecer una sensación de control profesional.

### Objetivo 2: estabilizar la capa de audio

El motor de audio debe ser más robusto, más predecible y más fácil de depurar.

### Objetivo 3: mejorar la experiencia operativa

El flujo de trabajo desde iniciar sesión, cargar archivo, ajustar presets, guardar configuración y monitorizar niveles debe ser mucho más intuitivo.

### Objetivo 4: facilitar mantenimiento y escalabilidad

La estructura debe prepararse para más módulos, más opciones y más tipos de fuentes de entrada.

---

## 4. Plan de mejora por áreas

## A. Arquitectura y mantenibilidad

### Mejora propuesta

1. Centralizar toda la lógica del procesador en un reducer o store con estado explícito.
2. Separar completamente:
   - Estado de configuración
   - Lógica de audio
   - Lógica de presets
   - Lógica de UI
   - Persistencia y sincronización
3. Introducir un servicio de dominio para el audio, con interfaces bien definidas.
4. Reducir la dependencia directa entre componentes y nodos de Web Audio API.
5. Crear un sistema de eventos y callbacks con nombres claros y un único flujo de actualización.

### Beneficio

Se reduce el riesgo de bugs por estado inconsistente, se hace más fácil depurar y se simplifica la incorporación de nuevas funciones.

### Acciones concretas

- Reestructurar el estado en slices: audio, processing, monitor, presets, system.
- Mover la lógica de audio a un hook más especializado o a un módulo separado.
- Introducir validaciones de rango y estados de error.
- Crear una capa de serialización y restauración más segura para presets y ajustes.

---

## B. Mejora del motor de audio

### Mejora propuesta

1. Reforzar la cadena de procesamiento con un modelo más claro de etapas:
   - entrada
   - AGC
   - multibanda
   - compresión/limitado
   - preénfasis
   - clipper
   - salida/stereo/MPX
2. Definir claramente qué parámetros son reales, simulados o representativos.
3. Añadir filtros, barridos, cronogramas y medición por banda para reflejar mejor el comportamiento de un sistema FM real.
4. Mejorar la lógica de monitorización de niveles para mostrar valores más útiles y estables.
5. Resolver la disparidad entre observación visual y comportamiento real del volumen.

### Beneficio

La app dejará de sentirse como una simulación parcial y se convertirá en un entorno más creíble y operable.

### Acciones concretas

- Añadir una etapa de análisis por banda y nivel de cada canal.
- Mejorar la visualización del espectro y la forma de onda.
- Establecer reglas más consistentes para AGC, clipper y limitador HF.
- Crear una vista de “modo de operación” con métricas en tiempo real.
- Detectar y mostrar errores de contexto de audio o permisos del navegador/dispositivo.

---

## C. Rediseño de UX y flujo de trabajo

### Mejora propuesta

1. Reorganizar la navegación por tareas, no solo por panels.
2. Añadir flujos operativos:
   - iniciar fuente
   - ajustar preset
   - verificar niveles
   - guardar preset
   - exportar configuración
3. Mejorar la legibilidad de los controles, con etiquetas, ayuda contextual e indicadores de estado.
4. Añadir feedback visual claro cuando una opción está activa, desactivada o en conflicto.
5. Reducir la densidad visual sin perder información crítica.

### Beneficio

La aplicación será más rápida de aprender y más útil para una operación real enadio o radio.

### Acciones concretas

- Crear vistas por “Procesamiento”, “Monitoreo”, “Perfil de salida”, “FX/voz” y “Sistema”.
- Añadir tooltips y descripciones breves en controles complejos.
- Implementar estados de “modo profesional”, “modo presentación” y “modo de edición”.
- Mejorar la organización de los presets por estilo y contexto de uso.

---

## D. Presets, personalización y persistencia

### Mejora propuesta

1. Ampliar el sistema de presets con:
   - presets por tipo de emisora
   - presets por horario/segmento
   - presets por fuente (voz, música, deportes, noticias)
2. Añadir importación/exportación de configuraciones.
3. Guardar snapshots temporales del sistema con nombre y fecha.
4. Añadir historial de ajustes recientes.
5. Mejorar la seguridad y validación al cargar configuraciones guardadas.

### Beneficio

El operador podrá reutilizar rápidamente configuraciones válidas y comparar cambios entre escenarios.

### Acciones concretas

- Crear una colección de presets “estándar” y “personalizados”.
- Añadir soporte a JSON para exportar/importar archivos de configuración.
- Guardar sólo ajustes válidos y evitar estados corruptos.
- Implementar versiones de preset para compatibilidad futura.

---

## E. Gestión de audio, archivos y fuentes de entrada

### Mejora propuesta

1. Mejorar la experiencia para archivos locales y biblioteca de audio.
2. Añadir gestión de cola de reproducción por panel.
3. Permitir más controles de reproducción: pausar, adelantar, rebobinar, mute, volumen por panel, y sincronización.
4. Mejorar el flujo de entrada de micrófono con permisos claros y manejo de error.
5. Añadir fuentes de prueba reproducibles para calibración.

### Beneficio

Se reduce la fricción operativa y el sistema se vuelve más útil en pruebas, composición y control en vivo.

### Acciones concretas

- Añadir un panel de “fuentes” con estado claro de cada una.
- Añadir una lista de archivos recientes.
- Incluir un generador de tone y señal de prueba.
- Mejorar el manejo del evento de finalización de archivo y errores de fetch/decodificación.

---

## F. Visualización de métricas y monitorización

### Mejora propuesta

1. Mejorar los medidores de entrada/salida con una escala más útil para audio FM.
2. Añadir representación por bandas (graves, medios, agudos).
3. Crear un panel de estado con:
   - nivel de entrada
   - nivel de salida
   - reducción AGC
   - ganancia por banda
   - desviación MPX
   - estado de pilot
   - latencia
   - errores del sistema
4. Añadir colorimetría y reglas de alerta por nivel crítico.

### Beneficio

La sensación de control aumenta y el usuario puede tomar decisiones más rápidas.

### Acciones concretas

- Añadir indicadores con colores semánticos: normal, advertencia, crítico.
- Mostrar tendencias temporales de nivel.
- Añadir un modo “monitor de emergencia” más compacto.

---

## G. Calidad, pruebas y estabilidad

### Mejora propuesta

1. Añadir pruebas unitarias y de integración para:
   - presets
   - serialización
   - state updates
   - hook de audio
   - validación de inputs
2. Añadir pruebas de interacción para la UI principal.
3. Crear validación automática del tipo de configuración.
4. Añadir logs y diagnósticos del motor de audio.

### Beneficio

La base técnica estará preparada para cambios futuros con menor riesgo.

### Acciones concretas

- Usar Vitest para pruebas de lógica.
- Usar React Testing Library para pruebas de UI.
- Añadir pruebas para una configuración válida y otra inválida.
- Incluir manejo de errores para casos sin contexto de audio, permisos denegados o dispositivos no compatibles.

---

## H. Capacidad para móvil y packaging

### Mejora propuesta

1. Reforzar la compatibilidad con Android/Capacitor.
2. Mejorar permisos y flujo de archivo/audio en móvil.
3. Añadir modo offline y persistencia local más fiable.
4. Preparar soporte para fondo operativo y control del ciclo de vida.

### Beneficio

La app podrá usarse en más entornos reales y con mejor experiencia móvil.

### Acciones concretas

- Revisar permisos de micrófono y almacenamiento.
- Añadir manejo de app lifecycle y reanudación del contexto de audio.
- Mejorar la compatibilidad de audio con dispositivos Android.
- Añadir estados de carga y error para flujos nativos.

---

## 5. Roadmap recomendado

## Fase 1: estabilización y organización (0-30 días)

- Revisar arquitectura del estado.
- Separar audio y UI.
- Definir modelo de configuración y presets.
- Mejorar validación de inputs.
- Corregir bugs de reproducción y audio context.
- Añadir una capa básica de pruebas.

## Fase 2: experiencia de operación (31-60 días)

- Rediseñar paneles principales.
- Mejorar presets y almacenamiento local.
- Añadir monitorización por banda y niveles.
- Mejorar flujo de archivo/micrófono.
- Optimizar carga y respuestas visuales.

## Fase 3: profesionalización del producto (61-90 días)

- Añadir exportación/importación de perfiles.
- Mejorar flujos de radio profesional.
- Crear dashboard de control operativo.
- Añadir soporte avanzado de dispositivos y mejor compatibilidad móvil.
- Preparar un entorno de QA más completo.

---

## 6. Prioridades de implementación

### Prioridad alta

1. Refactor de estado y lógica de audio.
2. Mejor manejo de errores y permiso de micrófono.
3. Rediseño de presets y persistencia.
4. Sistema de métricas/monitoreo más útil.
5. Pruebas base de componentes y lógica.

### Prioridad media

1. Mejor flujo de fuentes y archivos.
2. UX por tareas y paneles operativos.
3. Mejor administración de perfiles de salida.
4. Compatibilidad móvil refinada.

### Prioridad baja / futura

1. Modo offline intensivo.
2. Integración con servicios externos.
3. Exportación avanzada para ingeniería de audio.
4. Módulos de automatización y scripting.

---

## 7. Indicadores de éxito

La mejora será exitosa si se cumplen estos objetivos:

- La app no presenta errores de audio al iniciar, pausar, cambiar de preset o cambiar de fuente.
- Los niveles y métricas son consistentes y comprensibles.
- El operador puede completar una sesión de prueba sin dudas de navegación.
- Los presets personalizados son seguros, reutilizables y verificables.
- La interfaz se mantiene clara incluso con más funciones.
- El proyecto es más fácil de mantener y evolucionar.

---

## 8. Recomendación final

La aplicación tiene una base emocionante y visualmente atractiva, pero necesita pasar de una demostración funcional a una herramienta de operación profesional. La estrategia más efectiva es una mejora incremental con enfoque en cuatro ejes: arquitectura, audio, UX y pruebas.

Si se hace bien, este proyecto puede convertirse en una plataforma muy sólida para control de procesamiento de señal y radio FM en navegador o dispositivo móvil.

---

## 9. Siguiente paso inmediato

Se recomienda empezar con una prueba de refactor de arquitectura del estado y audio, priorizando:

1. Estado centralizado y tipado.
2. Lógica de audio desacoplada de la UI.
3. Mejor manejo de errores.
4. Validación de presets y persistencia.
5. Un primer conjunto de pruebas automáticas.

Este primer bloque permitirá construir el resto de mejoras sobre una base más estable y menos frágil.
