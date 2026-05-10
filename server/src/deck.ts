import { Card, Suit, Rank, SUITS, CARD_RANKS_NORMAL, CARD_RANKS_REVOLUTION } from './types.js';
import { getDeckConfig } from './types.js';

let cardIdCounter = 0;

function generateCardId(): string {
  return `card_${cardIdCounter++}`;
}

export function createDeck(deckIndex: number = 0): Card[] {
  const deck: Card[] = [];

  for (const suit of SUITS) {
    for (const rank of CARD_RANKS_NORMAL) {
      deck.push({
        id: generateCardId(),
        suit,
        rank,
        isJoker: false,
        deckIndex
      });
    }
  }

  return deck;
}

export function createDecks(playerCount: number): Card[] {
  const config = getDeckConfig(playerCount);
  const decks: Card[] = [];

  for (let i = 0; i < config.deckCount; i++) {
    const deck = createDeck(i);
    deck.push({
      id: generateCardId(),
      suit: 'joker',
      rank: null,
      isJoker: true,
      deckIndex: i
    });
    decks.push(...deck);
  }

  return decks;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

export function distributeCards(deck: Card[], playerCount: number): Card[][] {
  const hands: Card[][] = Array.from({ length: playerCount }, () => []);
  
  for (let i = 0; i < deck.length; i++) {
    const playerIndex = i % playerCount;
    hands[playerIndex].push(deck[i]);
  }

  return hands;
}

export function sortHand(hand: Card[], isRevolution: boolean = false): Card[] {
  const rankOrder = isRevolution 
    ? CARD_RANKS_REVOLUTION
    : CARD_RANKS_NORMAL;

  return [...hand].sort((a, b) => {
    if (a.isJoker && !b.isJoker) return 1;
    if (!a.isJoker && b.isJoker) return -1;
    if (a.isJoker && b.isJoker) return 0;

    const rankDiff = rankOrder.indexOf(a.rank as Rank) - rankOrder.indexOf(b.rank as Rank);
    if (rankDiff !== 0) return rankDiff;

    const suitOrder: Suit[] = ['spade', 'heart', 'diamond', 'club'];
    return suitOrder.indexOf(a.suit as Suit) - suitOrder.indexOf(b.suit as Suit);
  });
}

export function getCardRankValue(card: Card, isRevolution: boolean = false): number {
  if (card.isJoker) {
    // Joker is always strongest
    return 100;
  }

  const ranks = isRevolution ? CARD_RANKS_REVOLUTION : CARD_RANKS_NORMAL;
  // Both arrays are ordered weakest->strongest, so higher index = stronger card
  return ranks.indexOf(card.rank as Rank);
}

export function initializeDeckForGame(playerCount: number): Card[][] {
  const decks = createDecks(playerCount);
  const shuffled = shuffleDeck(decks);
  const hands = distributeCards(shuffled, playerCount);
  
  return hands.map(hand => sortHand(hand, false));
}
