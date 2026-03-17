# WebHouse Network — Contexto Completo del Proyecto

## Qué es esto
Una red social 3D descentralizada inspirada en https://bruno-simon.com/. Cada persona tiene una "casa" (su web personal) que existe como edificio en un mundo 3D compartido. Los usuarios manejan un carro y visitan las casas de otros.

## La Visión
- Tiene que verse y sentirse como bruno-simon.com (mundo 3D, carro manejable, polish visual alto)
- Empieza con 2 casas (Fabrizio + un amigo) pero debe escalar a muchas personas
- Casas personalizables tipo MySpace — cada persona tiene su tema, salas, contenido
- Features sociales: posts/feed, chat P2P via WebRTC, galerías, portfolios, multimedia
- Eventualmente evolucionar a metaverso
- Hosting gratis (GitHub Pages / Netlify)
- Protocolo descentralizado usando archivos manifest.json

## Stack Técnico
- Three.js v0.164 — Motor 3D
- Vite — Build tool
- Física arcade custom (Rapier fue removido por ahora, se puede re-agregar)
- JavaScript vanilla, ES modules, sin frameworks

## Arquitectura (basada en el código de Bruno Simon folio-2025)

```
src/index.js              → Entry point, crea Game con data de casas
src/Game/Game.js          → Orquestador, inicializa todos los sistemas en orden
src/Game/Ticker.js        → Game loop con prioridades (menor número = corre primero)
src/Game/Rendering.js     → Renderer WebGL (bloom desactivado, se puede re-activar)
src/Game/View.js          → Cámara con sistema "magnético" (técnica CLAVE de Bruno Simon)
src/Game/Player.js        → Controlador del vehículo con suspensión, partículas de polvo
src/Game/Lighting.js      → Luces direccional + ambiente + hemisférica, niebla
src/Game/Wind.js          → Campo de viento procedural para árboles
src/Game/HUD.js           → Velocímetro, minimapa, prompts de interacción, panel de casa
src/Game/World/
  World.js                → Compone piso, casas, árboles, escenografía, cielo, estrellas
  Floor.js                → ShaderMaterial custom con grid, gradiente, fog, glow del jugador
  House.js                → Edificios 3D con ventanas, beacon, letrero, marco de puerta
  Trees.js                → 50 árboles procedurales (3 variantes) con animación de viento
  Scenery.js              → Farolas, rocas, señales, bancos
```

## Técnicas Clave de Bruno Simon (ya implementadas)

1. CAMERA MAGNET SYSTEM (View.js) — El punto focal se atrae hacia el carro con decaimiento exponencial, no snapping directo. Esto es lo que hace que la cámara se sienta cinemática.

2. PRIORITY TICKER (Ticker.js) — Callbacks ordenados por prioridad: 1=input, 3=physics, 6=visuals, 7=camera, 8=world, 9=wind, 10=HUD, 99=render

3. VISUAL SUSPENSION (Player.js) — Física de resorte (stiffness + damping) para el rebote visual del carro

4. SHADER FLOOR (Floor.js) — Interpolación de 4 colores en esquinas, grid procedural, glow que sigue al jugador

5. DYNAMIC FOV — Se ensancha con velocidad para efecto cinemático

6. CAMERA ROLL — Se inclina al girar proporcional a la velocidad

7. WIND SYSTEM — Ruido pseudo-Perlin de dos octavas que afecta el follaje

## Estado Actual
- FUNCIONA: Mundo 3D con piso, cielo, estrellas, carreteras
- FUNCIONA: Carro se maneja con WASD, boost (Shift), freno (Space)
- FUNCIONA: Cámara sigue el carro con sistema magnético
- FUNCIONA: 2 casas (Fabrizio + Amigo) con colores temáticos, ventanas, beacons, letreros flotantes
- FUNCIONA: 50 árboles con animación de viento
- FUNCIONA: Farolas, rocas, señales de dirección, bancos
- FUNCIONA: HUD con velocímetro, minimapa, prompts de interacción
- FUNCIONA: Panel lateral slide-in al presionar E cerca de una casa
- FUNCIONA: Ghost plots para casas futuras
- FUNCIONA: Niebla, tone mapping, estética cyberpunk nocturna

## Lo Que Falta (en orden de prioridad)

1. POLISH VISUAL — Re-activar bloom (UnrealBloomPass), activar sombras, más detalle
2. INTERIORES DE CASAS — Al entrar a una casa, transicionar a salas interiores
3. SISTEMA DE PASTO — Bruno Simon usa pasto instanciado con viento (gran impacto visual)
4. MEJOR MODELO DE CARRO — Cargar GLTF en vez de geometría de cajas
5. RAPIER PHYSICS — Re-agregar para colisiones reales (carro vs casas, límites)
6. PROTOCOLO DESCENTRALIZADO — manifest.json por casa, network.json como directorio, chat WebRTC
7. PERSONALIZACIÓN DE CASAS — Cada casa lee su tema/contenido de manifest.json
8. MULTIPLAYER — Ver carros de otros jugadores via WebRTC/PeerJS
9. AUDIO — Sonidos de motor, música ambiental, audio espacial cerca de casas
10. DEPLOY — Hosting en GitHub Pages o Netlify

## Notas de Performance
- Sombras están desactivadas en Rendering.js línea 19 — cambiar a true para activar
- Bloom fue removido de Rendering.js — re-agregar EffectComposer + UnrealBloomPass
- Farolas: solo cada 3ra tiene PointLight real (las demás son emissive visual)
- Cada casa tiene 1 PointLight (porche). Beacon es solo emissive.
- Árboles reducidos a 50. Se puede aumentar cuando se optimice.
- Total de luces dinámicas en escena: ~10

## Comandos
```
npm install       → Instalar dependencias (solo Three.js + Vite)
npm run dev       → Servidor dev en http://localhost:3000
npm run build     → Build de producción a dist/
```

## Controles
- WASD / Flechas — Manejar
- Shift — Boost
- Space — Freno
- E — Entrar a casa (cuando estás cerca)
- Escape — Cerrar panel de casa
- Mouse — Orbitar cámara (después de hacer clic para capturar pointer)
- Scroll — Zoom in/out

## Código de Bruno Simon Estudiado
- Repo: https://github.com/brunosimon/folio-2025
- Archivos clave: PhysicsVehicle.js, View.js, Floor.js, Grass.js, Wind.js, Rendering.js
- Su sitio: https://bruno-simon.com/

## Dueño del Proyecto
Fabrizio Hernandez (fzpank.mov@gmail.com)
