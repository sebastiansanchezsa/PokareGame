// Animated tutorial system

const SUIT_SYM = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };

const SLIDES = [
  {
    title: 'BIENVENIDO A POKARE',
    icon: '🎰',
    html: `<p>Un juego de <strong>Texas Hold'em Poker</strong> en primera persona con estética retrowave de los 80.</p>
           <p>Juega contra <strong>bots</strong> o con <strong>amigos online</strong>. Todas las mecánicas funcionan en ambos modos.</p>
           <p style="color:#ff6ec7">Habilidades, rachas, ruleta rusa y más...</p>`,
  },
  {
    title: 'TUS CARTAS',
    icon: '🃏',
    html: `<p>Recibes <strong>2 cartas privadas</strong> (hole cards) que solo tú puedes ver.</p>
           <div class="tut-cards">
             <div class="tut-card red"><div>A</div><div>♥</div></div>
             <div class="tut-card white"><div>K</div><div>♠</div></div>
           </div>
           <p>Las verás en <strong>3D sobre la mesa</strong> y en miniatura abajo a la izquierda.</p>
           <p>Las cartas tienen diseño realista con el número correcto de símbolos.</p>`,
  },
  {
    title: 'CARTAS COMUNITARIAS',
    icon: '🎴',
    html: `<p>Se reparten <strong>5 cartas comunitarias</strong> en 3 fases:</p>
           <p><strong>FLOP</strong> (3 cartas) → <strong>TURN</strong> (1 carta) → <strong style="color:#ffd700">RIVER</strong> (1 carta)</p>
           <div class="tut-cards">
             <div class="tut-card red"><div>Q</div><div>♦</div></div>
             <div class="tut-card white"><div>J</div><div>♣</div></div>
             <div class="tut-card red"><div>10</div><div>♥</div></div>
             <div class="tut-card white"><div>9</div><div>♠</div></div>
             <div class="tut-card red"><div>8</div><div>♦</div></div>
           </div>
           <p>La última carta (River) tiene una <strong>animación de suspenso épica</strong>.</p>`,
  },
  {
    title: 'MANOS DE PÓKER',
    icon: '👑',
    html: `<p>Al final de cada ronda se muestra <strong>qué mano sacó cada jugador</strong>:</p>
           <p><strong>Carta Alta</strong> → <strong>Par</strong> → <strong>Doble Par</strong> → <strong>Trío</strong></p>
           <p><strong>Escalera</strong> → <strong>Color</strong> → <strong>Full House</strong></p>
           <p><strong>Póker</strong> → <strong style="color:#ff6ec7">Escalera de Color</strong> → <strong style="color:#ffd700">Escalera Real</strong></p>
           <p>Verás el nombre de la jugada junto a las cartas de cada jugador.</p>`,
  },
  {
    title: 'ACCIONES',
    icon: '🎯',
    html: `<p>En cada ronda de apuestas puedes:</p>
           <p><strong style="color:#00d4ff">CHECK</strong> — Pasar (si nadie apostó)</p>
           <p><strong style="color:#00ff88">CALL</strong> — Igualar la apuesta actual</p>
           <p><strong style="color:#ff6ec7">RAISE</strong> — Subir la apuesta</p>
           <p><strong style="color:#ffd700">ALL IN</strong> — Apostar todas tus fichas</p>
           <p><strong style="color:#ff2d55">FOLD</strong> — Retirarte de la mano</p>`,
  },
  {
    title: 'HABILIDADES ESPECIALES',
    icon: '⚡',
    html: `<p>Disponibles en <strong>ambos modos</strong> (bots y multijugador):</p>
           <p><strong style="color:#00d4ff">👁 Visión ($100)</strong> — Ve la próxima carta comunitaria en secreto</p>
           <p><strong style="color:#bb88ff">🛡 Escudo ($150)</strong> — Protege tu apuesta de raises</p>
           <p><strong style="color:#ff6ec7">👁 Intimidar ($75)</strong> — Revela el palo de una carta del oponente</p>
           <p><strong style="color:#ffd700">🔄 Cambio ($200)</strong> — Cambia una de tus cartas por una nueva</p>
           <p><strong style="color:#ff2d55">⚔ Doble o Nada (GRATIS)</strong> — Duplica el pozo si ganas, pierdes el doble si no</p>
           <p>Cada habilidad tiene <strong>cooldown</strong> de varias rondas.</p>`,
  },
  {
    title: 'RULETA RUSA',
    icon: '🔫',
    html: `<p>Cuando <strong>pierdes una mano</strong>, se activa la <strong style="color:#ff2d55">Ruleta Rusa</strong>.</p>
           <p>Un revólver aparece con <strong>1 bala en 6 cámaras</strong>.</p>
           <p>El cilindro gira, se apunta... y se dispara.</p>
           <p><strong style="color:#00ff88">5/6</strong> — Sobrevives y sigues jugando</p>
           <p><strong style="color:#ff2d55">1/6</strong> — ¡BANG! Animación de muerte</p>
           <p style="color:#888">Puedes desactivar esto en Opciones.</p>`,
  },
  {
    title: 'RACHAS Y BONOS',
    icon: '🔥',
    html: `<p>Gana manos seguidas para activar <strong style="color:#ffd700">rachas de victoria</strong>:</p>
           <p><strong>2 seguidas</strong> — <span style="color:#ffd700">+10% bonus</span> al pozo</p>
           <p><strong>3 seguidas</strong> — <span style="color:#ff6ec7">+25% bonus</span> al pozo</p>
           <p><strong>5+ seguidas</strong> — <span style="color:#ff2d55">+50% bonus</span> + efecto visual épico</p>
           <p>Los bots también tienen <strong>frases provocadoras</strong> cuando ganan o pierden.</p>
           <p>¡Mantén tu racha viva!</p>`,
  },
  {
    title: 'MULTIJUGADOR',
    icon: '🌐',
    html: `<p>Juega con amigos creando una <strong>sala con código</strong>:</p>
           <p>1. Menú → <strong>MULTIJUGADOR</strong> → configura nombre y foto</p>
           <p>2. <strong>Crea una sala</strong> y comparte el código de 5 letras</p>
           <p>3. Tus amigos se unen con el código</p>
           <p>4. El host inicia la partida</p>
           <p>Incluye <strong>chat en vivo</strong> y todas las habilidades.</p>`,
  },
  {
    title: 'OPCIONES',
    icon: '⚙',
    html: `<p>Personaliza tu experiencia en <strong>Opciones</strong>:</p>
           <p><strong>Brillo</strong> — Ajusta la iluminación de la escena</p>
           <p><strong>Bloom</strong> — Activa/desactiva el brillo neón</p>
           <p><strong>Efecto VHS</strong> — Scanlines y ruido retro</p>
           <p><strong>Ruleta Rusa</strong> — On/Off</p>
           <p><strong>Volúmenes</strong> — Música y efectos por separado</p>
           <p style="color:#ff6ec7; margin-top:1rem">¡Buena suerte en la mesa, jugador!</p>`,
  },
];

export class Tutorial {
  constructor() {
    this.currentSlide = 0;
    this.overlay = document.getElementById('tutorial-overlay');
    this.slidesContainer = document.getElementById('tutorial-slides');
    this.progress = document.getElementById('tut-progress');
    this.btnPrev = document.getElementById('btn-tut-prev');
    this.btnNext = document.getElementById('btn-tut-next');
    this.btnClose = document.getElementById('btn-tutorial-close');

    this.buildSlides();
    this.setupEvents();
  }

  buildSlides() {
    this.slidesContainer.innerHTML = '';
    SLIDES.forEach((slide, i) => {
      const div = document.createElement('div');
      div.className = `tutorial-slide${i === 0 ? ' active' : ''}`;
      div.innerHTML = `
        <div class="tut-icon">${slide.icon}</div>
        <h3>${slide.title}</h3>
        ${slide.html}
      `;
      this.slidesContainer.appendChild(div);
    });
  }

  setupEvents() {
    this.btnPrev.addEventListener('click', () => this.prev());
    this.btnNext.addEventListener('click', () => this.next());
    this.btnClose.addEventListener('click', () => this.close());
  }

  open() {
    this.currentSlide = 0;
    this.updateSlide();
    this.overlay.classList.remove('hidden');
  }

  close() {
    this.overlay.classList.add('hidden');
  }

  prev() {
    if (this.currentSlide > 0) {
      this.currentSlide--;
      this.updateSlide();
    }
  }

  next() {
    if (this.currentSlide < SLIDES.length - 1) {
      this.currentSlide++;
      this.updateSlide();
    } else {
      this.close();
    }
  }

  updateSlide() {
    const slides = this.slidesContainer.querySelectorAll('.tutorial-slide');
    slides.forEach((s, i) => {
      s.classList.toggle('active', i === this.currentSlide);
    });
    this.progress.textContent = `${this.currentSlide + 1} / ${SLIDES.length}`;
    this.btnPrev.style.visibility = this.currentSlide === 0 ? 'hidden' : 'visible';
    this.btnNext.textContent = this.currentSlide === SLIDES.length - 1 ? 'CERRAR ✕' : 'SIGUIENTE ▶';
  }
}
