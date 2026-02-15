// Animated tutorial system

const SUIT_SYM = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };

const SLIDES = [
  {
    title: 'BIENVENIDO A POKARE',
    icon: '🎰',
    html: `<p>Un juego de <strong>Texas Hold'em Poker</strong> en primera persona con estética retrowave de los 80.</p>
           <p>Siéntate a la mesa, juega tus cartas y domina la noche de neón.</p>`,
  },
  {
    title: 'TUS CARTAS',
    icon: '🃏',
    html: `<p>Recibes <strong>2 cartas privadas</strong> (hole cards) que solo tú puedes ver.</p>
           <div class="tut-cards">
             <div class="tut-card red"><div>A</div><div>♥</div></div>
             <div class="tut-card white"><div>K</div><div>♠</div></div>
           </div>
           <p>Las verás en 3D sobre la mesa y en miniatura abajo a la izquierda.</p>`,
  },
  {
    title: 'CARTAS COMUNITARIAS',
    icon: '🎴',
    html: `<p>Se reparten <strong>5 cartas comunitarias</strong> en el centro de la mesa en 3 fases:</p>
           <p><strong>FLOP</strong> (3 cartas) → <strong>TURN</strong> (1 carta) → <strong>RIVER</strong> (1 carta)</p>
           <div class="tut-cards">
             <div class="tut-card red"><div>Q</div><div>♦</div></div>
             <div class="tut-card white"><div>J</div><div>♣</div></div>
             <div class="tut-card red"><div>10</div><div>♥</div></div>
             <div class="tut-card white"><div>9</div><div>♠</div></div>
             <div class="tut-card red"><div>8</div><div>♦</div></div>
           </div>
           <p>Combina tus 2 cartas con las 5 comunitarias para formar la mejor mano de 5.</p>`,
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
    title: 'MANOS DE PÓKER',
    icon: '👑',
    html: `<p>De menor a mayor valor:</p>
           <p><strong>Carta Alta</strong> → <strong>Par</strong> → <strong>Doble Par</strong> → <strong>Trío</strong></p>
           <p><strong>Escalera</strong> → <strong>Color</strong> → <strong>Full House</strong></p>
           <p><strong>Póker</strong> → <strong style="color:#ff6ec7">Escalera de Color</strong> → <strong style="color:#ffd700">Escalera Real</strong></p>`,
  },
  {
    title: 'HABILIDADES ESPECIALES',
    icon: '⚡',
    html: `<p>POKARE incluye <strong>habilidades únicas</strong> que cuestan fichas:</p>
           <p><strong style="color:#bb88ff">👁 Visión ($100)</strong> — Ve la próxima carta comunitaria en secreto</p>
           <p><strong style="color:#bb88ff">🛡 Escudo ($150)</strong> — Protege tu apuesta de raises</p>
           <p><strong style="color:#bb88ff">😠 Intimidar ($75)</strong> — Presiona a los oponentes</p>
           <p><strong style="color:#bb88ff">🍀 Fortuna ($200)</strong> — Gana +50% del pozo si ganas</p>
           <p>Cada habilidad tiene un <strong>cooldown</strong> de varias rondas.</p>`,
  },
  {
    title: 'MULTIJUGADOR',
    icon: '🌐',
    html: `<p>Juega con amigos creando una <strong>sala con código</strong>.</p>
           <p>1. Configura tu <strong>nombre y foto</strong> (opcional)</p>
           <p>2. <strong>Crea una sala</strong> y comparte el código</p>
           <p>3. Tus amigos se unen con el código</p>
           <p>4. El host inicia la partida</p>
           <p>También hay <strong>chat en vivo</strong> durante la partida.</p>`,
  },
  {
    title: 'ELIMINACIÓN',
    icon: '☠',
    html: `<p>Cuando un jugador pierde todas sus fichas, es <strong>eliminado</strong> con una animación dramática estilo glitch.</p>
           <p>El último jugador con fichas <strong>gana la partida</strong>.</p>
           <p style="color:#ff6ec7; margin-top:1rem">¡Buena suerte en la mesa!</p>`,
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
