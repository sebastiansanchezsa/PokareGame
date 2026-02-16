import { Card3D, SUITS, RANKS } from './Card.js';

export class Deck {
  constructor() {
    this.cards = [];
    this.dealt = [];
    this.reset();
  }

  reset() {
    // Dispose old cards
    this.cards.forEach(c => c.dispose());
    this.dealt.forEach(c => c.dispose());

    this.cards = [];
    this.dealt = [];

    // Create full 52-card deck
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        this.cards.push(new Card3D(rank, suit));
      }
    }

    this.shuffle();
  }

  shuffle() {
    // Fisher-Yates shuffle
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  peek() {
    if (this.cards.length === 0) return null;
    return this.cards[this.cards.length - 1];
  }

  peekAt(offset = 0) {
    const idx = this.cards.length - 1 - offset;
    if (idx < 0 || idx >= this.cards.length) return null;
    return this.cards[idx];
  }

  deal() {
    if (this.cards.length === 0) return null;
    const card = this.cards.pop();
    this.dealt.push(card);
    return card;
  }

  dealMultiple(count) {
    const cards = [];
    for (let i = 0; i < count; i++) {
      const card = this.deal();
      if (card) cards.push(card);
    }
    return cards;
  }

  get remaining() {
    return this.cards.length;
  }

  disposeAll() {
    this.cards.forEach(c => c.dispose());
    this.dealt.forEach(c => c.dispose());
    this.cards = [];
    this.dealt = [];
  }
}
