import {
  Card,
  CombinationType,
  CurrentTrick,
  LockState,
  CARD_RANKS_NORMAL,
  CARD_RANKS_REVOLUTION,
  Rank,
  Suit
} from './types.js';

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export function detectCombinationType(cards: Card[]): CombinationType | null {
  if (cards.length === 0) return null;

  const nonJokers = cards.filter(c => !c.isJoker);
  const jokerCount = cards.filter(c => c.isJoker).length;

  if (cards.length === 1) {
    return 'single';
  }

  if (cards.length === 2) {
    if (nonJokers.length === 2 && nonJokers[0].rank === nonJokers[1].rank) {
      return 'pair';
    }
    if (nonJokers.length === 1 && jokerCount === 1) {
      return 'pair';
    }
    return null;
  }

  if (cards.length === 3) {
    if (nonJokers.length === 3 && nonJokers.every(c => c.rank === nonJokers[0].rank)) {
      return 'triple';
    }
    if (nonJokers.length === 2 && jokerCount === 1 && nonJokers[0].rank === nonJokers[1].rank) {
      return 'triple';
    }
    // Check 3-card stairs
    const stairs3 = checkStairs(cards);
    if (stairs3) {
      return 'stairs';
    }
    return null;
  }

  if (cards.length === 4) {
    if (nonJokers.length === 4 && nonJokers.every(c => c.rank === nonJokers[0].rank)) {
      return 'quad';
    }
    if (nonJokers.length === 3 && jokerCount === 1 && nonJokers.every(c => c.rank === nonJokers[0].rank)) {
      return 'quad';
    }
    if (cards.length >= 3) {
      const stairsResult = checkStairs(cards);
      if (stairsResult) {
        return 'stairs';
      }
    }
    return null;
  }

  if (cards.length === 5) {
    if (nonJokers.length === 5 && nonJokers.every(c => c.rank === nonJokers[0].rank)) {
      return 'quint';
    }
    if (nonJokers.length === 4 && jokerCount === 1 && nonJokers.every(c => c.rank === nonJokers[0].rank)) {
      return 'quint';
    }
    // Check 5-card stairs
    const stairs5 = checkStairs(cards);
    if (stairs5) {
      return 'stairs';
    }
    return null;
  }

  if (cards.length === 6) {
    if (nonJokers.length === 6 && nonJokers.every(c => c.rank === nonJokers[0].rank)) {
      return 'sextuple';
    }
    if (nonJokers.length === 5 && jokerCount === 1 && nonJokers.every(c => c.rank === nonJokers[0].rank)) {
      return 'sextuple';
    }
    if (cards.length >= 3) {
      const stairsResult = checkStairs(cards);
      if (stairsResult) {
        return 'stairs';
      }
    }
    const doubleStairsResult = checkDoubleStairs(cards);
    if (doubleStairsResult) {
      return 'double_stairs';
    }
    return null;
  }

  if (cards.length > 6) {
    if (nonJokers.length >= 6 && nonJokers.every(c => c.rank === nonJokers[0].rank)) {
      return 'sextuple';
    }
    const stairsResult = checkStairs(cards);
    if (stairsResult) {
      return 'stairs';
    }
    const doubleStairsResult = checkDoubleStairs(cards);
    if (doubleStairsResult) {
      return 'double_stairs';
    }
  }

  return null;
}

function checkStairs(cards: Card[]): boolean {
  const nonJokers = cards.filter(c => !c.isJoker);
  const jokerCount = cards.filter(c => c.isJoker).length;

  if (nonJokers.length < 1) return false;

  const total = nonJokers.length + jokerCount;
  if (total < 3) return false;

  const suits = [...new Set(nonJokers.map(c => c.suit))];
  if (suits.length !== 1) return false;

  const ranks = nonJokers.map(c => c.rank as Rank);
  const uniqueRanks = [...new Set(ranks)];

  if (uniqueRanks.length !== nonJokers.length) return false;

  const rankIndices = uniqueRanks.map(r => CARD_RANKS_NORMAL.indexOf(r)).sort((a, b) => a - b);

  const minIndex = rankIndices[0];
  const maxIndex = rankIndices[rankIndices.length - 1];
  const span = maxIndex - minIndex + 1;

  // Non-joker cards must form a contiguous range when jokers fill the gaps.
  // The span must not exceed total (jokers can fill gaps within the range).
  // If total > span, jokers extend the sequence beyond the non-joker range.
  return span <= total;
}

function checkDoubleStairs(cards: Card[]): boolean {
  const nonJokers = cards.filter(c => !c.isJoker);
  
  if (cards.length < 6 || cards.length % 2 !== 0) return false;
  if (nonJokers.length < 6) return false;

  const suits = [...new Set(nonJokers.map(c => c.suit))];
  if (suits.length !== 1) return false;

  const ranks = nonJokers.map(c => c.rank as Rank);
  const sortedRanks = [...ranks].sort((a, b) => CARD_RANKS_NORMAL.indexOf(a) - CARD_RANKS_NORMAL.indexOf(b));

  for (let i = 0; i < sortedRanks.length; i += 2) {
    if (sortedRanks[i] !== sortedRanks[i + 1]) {
      return false;
    }
    if (i + 2 < sortedRanks.length) {
      const currentIdx = CARD_RANKS_NORMAL.indexOf(sortedRanks[i]);
      const nextIdx = CARD_RANKS_NORMAL.indexOf(sortedRanks[i + 2]);
      if (nextIdx - currentIdx !== 1) {
        return false;
      }
    }
  }

  return true;
}

export function calculateEffectiveRank(cards: Card[], isRevolution: boolean): number {
  // In both normal and revolution mode, the rank array is ordered weakest->strongest.
  // Higher index = stronger card. Just return the max index.
  const ranks = isRevolution ? CARD_RANKS_REVOLUTION : CARD_RANKS_NORMAL;
  const MAX_RANK_INDEX = ranks.length - 1;

  const nonJokers = cards.filter(c => !c.isJoker);
  const jokerCount = cards.filter(c => c.isJoker).length;

  if (jokerCount > 0 && nonJokers.length === 0) {
    // Joker only: always strongest
    return MAX_RANK_INDEX + 1;
  }

  const rankIndices = nonJokers.map(c => ranks.indexOf(c.rank as Rank));
  const maxIndex = Math.max(...rankIndices);

  // If jokers are mixed in, treat as slightly stronger than max non-joker
  if (jokerCount > 0) {
    return maxIndex + 0.5;
  }

  return maxIndex;
}

export function allCardsRankTenOrBelow(cards: Card[]): boolean {
  for (const card of cards) {
    if (!card.isJoker) {
      const rankIndex = CARD_RANKS_NORMAL.indexOf(card.rank as Rank);
      if (rankIndex > 7) {
        return false;
      }
    }
  }
  return true;
}

export function validatePlay(
  cards: Card[],
  currentTrick: CurrentTrick | null,
  isRevolution: boolean,
  isElevenRevolution: boolean,
  lockState: LockState
): ValidationResult {
  if (cards.length === 0) {
    return { valid: false, message: '请选择要出的牌' };
  }

  const combinationType = detectCombinationType(cards);
  
  if (!combinationType) {
    return { valid: false, message: '无效的牌型组合' };
  }

  if (isElevenRevolution && !allCardsRankTenOrBelow(cards)) {
    return { valid: false, message: '11革命期间只能出10或以下的牌' };
  }

  if (currentTrick === null) {
    return { valid: true };
  }

  if (!matchCombinationType(cards, currentTrick.type, currentTrick.cards.length)) {
    return { valid: false, message: `必须出 ${getCombinationTypeName(currentTrick.type)} 牌型` };
  }

  const playRank = calculateEffectiveRank(cards, isRevolution);
  const trickRank = currentTrick.effectiveRank;

  if (playRank <= trickRank) {
    return { valid: false, message: '必须出比桌面上更大的牌' };
  }

  if (lockState.isLocked) {
    const lockValidation = validateLockConstraint(cards, lockState);
    if (!lockValidation.valid) {
      return lockValidation;
    }
  }

  return { valid: true };
}

function matchCombinationType(cards: Card[], type: CombinationType, lastCardsLength: number): boolean {
  switch (type) {
    case 'single':
      return cards.length === 1;
    case 'pair':
      return cards.length === 2;
    case 'triple':
      return cards.length === 3;
    case 'quad':
      return cards.length === 4;
    case 'quint':
      return cards.length === 5;
    case 'sextuple':
      return cards.length === 6;
    case 'stairs':
      return isStairs(cards) && cards.length === lastCardsLength;
    case 'double_stairs':
      return isDoubleStairs(cards) && cards.length === lastCardsLength;
    default:
      return false;
  }
}

function isStairs(cards: Card[]): boolean {
  return checkStairs(cards);
}

function isDoubleStairs(cards: Card[]): boolean {
  return checkDoubleStairs(cards);
}

function validateLockConstraint(cards: Card[], lockState: LockState): ValidationResult {
  if (!lockState.isLocked || !lockState.lockedSuit) {
    return { valid: true };
  }

  const nonJokers = cards.filter(c => !c.isJoker);
  const jokerCount = cards.filter(c => c.isJoker).length;

  // Joker alone (single) can always be played - it's the strongest card
  if (nonJokers.length === 0 && jokerCount > 0) {
    return { valid: true };
  }

  // Joker acts as wild card including wild suit - if there's at least one joker
  // and the non-jokers match the type, the joker can fill the suit requirement
  if (jokerCount > 0) {
    return { valid: true };
  }

  const hasMatchingSuit = nonJokers.some(c => c.suit === lockState.lockedSuit);
  if (hasMatchingSuit) {
    return { valid: true };
  }

  return { valid: false, message: `必须出 ${lockState.lockedSuit} 花色的牌` };
}

export function detectLock(cards: Card[], lastCards: Card[]): LockState {
  if (!lastCards || lastCards.length === 0) {
    return { isLocked: false, lockedSuit: null };
  }

  const nonJokers = cards.filter(c => !c.isJoker);
  const lastNonJokers = lastCards.filter(c => !c.isJoker);
  const jokerCount = cards.filter(c => c.isJoker).length;

  // If current play contains jokers and last play has non-jokers,
  // joker can match any suit → trigger lock with the last play's suit
  if (jokerCount > 0 && lastNonJokers.length > 0) {
    return {
      isLocked: true,
      lockedSuit: lastNonJokers[0].suit as Suit
    };
  }

  if (nonJokers.length === 0 || lastNonJokers.length === 0) {
    return { isLocked: false, lockedSuit: null };
  }

  for (const card of nonJokers) {
    for (const lastCard of lastNonJokers) {
      if (card.suit === lastCard.suit) {
        return {
          isLocked: true,
          lockedSuit: card.suit as Suit
        };
      }
    }
  }

  return { isLocked: false, lockedSuit: null };
}

function getCombinationTypeName(type: CombinationType): string {
  const names: Record<CombinationType, string> = {
    single: '单张',
    pair: '对子',
    triple: '三张',
    quad: '四张',
    quint: '五张',
    sextuple: '六张',
    stairs: '阶梯',
    double_stairs: '二列阶梯'
  };
  return names[type];
}

export function canPlayJoker(cards: Card[], currentTrick: CurrentTrick | null): boolean {
  const jokerCount = cards.filter(c => c.isJoker).length;
  
  if (jokerCount === 0) return true;
  
  if (currentTrick === null) return true;

  if (jokerCount > 1) return false;

  return true;
}

export function containsEight(cards: Card[]): boolean {
  return cards.some(card => card.rank === '8' && !card.isJoker);
}

export function countJacks(cards: Card[]): number {
  return cards.filter(card => card.rank === 'J' && !card.isJoker).length;
}

export function containsSpade3(cards: Card[]): boolean {
  return cards.some(card => card.rank === '3' && card.suit === 'spade');
}

export function countJokers(cards: Card[]): number {
  return cards.filter(c => c.isJoker).length;
}

export function countThrees(cards: Card[]): number {
  return cards.filter(c => c.rank === '3' && c.suit === 'spade').length;
}

export function canBeatMultipleJokers(cards: Card[], lastCards: Card[], useTwoDecks: boolean): boolean {
  if (!useTwoDecks) return false;
  
  const lastJokerCount = lastCards.filter(c => c.isJoker).length;
  if (lastJokerCount <= 1) return false;
  
  const jokerCount = countJokers(cards);
  const threeCount = countThrees(cards);
  
  if (jokerCount >= 1 && threeCount >= 2) {
    return true;
  }
  
  return false;
}

export function allSameRank(cards: Card[]): boolean {
  const nonJokers = cards.filter(c => !c.isJoker);
  if (nonJokers.length < 2) return false;
  return nonJokers.every(c => c.rank === nonJokers[0].rank);
}

export function canTriggerRevolution(
  playerRank: string | null,
  isGreatRevolution: boolean,
  cards: Card[],
  lastTrick: CurrentTrick | null,
  isRevolution: boolean,
  isElevenRevolution: boolean = false
): boolean {
  if (playerRank === 'daifugo' || playerRank === 'emperor' || playerRank === 'pope') {
    return false;
  }

  if (isGreatRevolution) {
    return false;
  }

  const nonJokers = cards.filter(c => !c.isJoker);
  const isQuadOrQuint = (cards.length === 4 || cards.length === 5) && allSameRank(cards);
  const isStairs4Plus = isStairs(cards) && cards.length >= 4;

  if (!isQuadOrQuint && !isStairs4Plus) {
    return false;
  }

  if (isRevolution && lastTrick && !isElevenRevolution) {
    if (isQuadOrQuint && lastTrick.cards.length === cards.length && allSameRank(lastTrick.cards)) {
      return true;
    }
    if (isStairs4Plus && isStairs(lastTrick.cards) && lastTrick.cards.length === cards.length) {
      return true;
    }
    return false;
  }

  return true;
}

export function canTriggerGreatRevolution(
  playerRank: string | null,
  cards: Card[]
): boolean {
  if (playerRank === 'daifugo' || playerRank === 'emperor' || playerRank === 'pope') {
    return false;
  }

  return cards.length >= 6 && allSameRank(cards);
}

export function getPlayableCards(
  hand: Card[],
  currentTrick: CurrentTrick | null,
  isRevolution: boolean,
  isElevenRevolution: boolean,
  lockState: LockState
): Card[][] {
  const playableCombinations: Card[][] = [];

  if (currentTrick === null) {
    if (isElevenRevolution) {
      const validSingleCards = hand.filter(card => 
        card.isJoker || CARD_RANKS_NORMAL.indexOf(card.rank as Rank) <= 7
      );
      validSingleCards.forEach(card => {
        playableCombinations.push([card]);
      });

      const pairs = findPairs(hand);
      pairs.forEach(pair => {
        if (allCardsRankTenOrBelow(pair)) {
          playableCombinations.push(pair);
        }
      });

      const triples = findTriples(hand);
      triples.forEach(triple => {
        if (allCardsRankTenOrBelow(triple)) {
          playableCombinations.push(triple);
        }
      });

      const quads = findQuads(hand);
      quads.forEach(quad => {
        if (allCardsRankTenOrBelow(quad)) {
          playableCombinations.push(quad);
        }
      });

      const stairs = findStairs(hand);
      stairs.forEach(stair => {
        if (allCardsRankTenOrBelow(stair)) {
          playableCombinations.push(stair);
        }
      });
    } else {
      const singles = hand.map(card => [card]);
      playableCombinations.push(...singles);

      const pairs = findPairs(hand);
      playableCombinations.push(...pairs);

      const triples = findTriples(hand);
      playableCombinations.push(...triples);

      const quads = findQuads(hand);
      playableCombinations.push(...quads);

      const stairs = findStairs(hand);
      playableCombinations.push(...stairs);
    }

    return playableCombinations;
  }

  const targetType = currentTrick.type;
  const targetLength = currentTrick.cards.length;

  if (targetType === 'single') {
    hand.forEach(card => {
      if (isElevenRevolution && card.rank && CARD_RANKS_NORMAL.indexOf(card.rank) > 7) {
        return;
      }
      const rank = calculateEffectiveRank([card], isRevolution);
      if (rank > currentTrick.effectiveRank) {
        playableCombinations.push([card]);
      }
    });
  }

  if (targetType === 'pair') {
    const pairs = findPairs(hand);
    pairs.forEach(pair => {
      if (isElevenRevolution && !allCardsRankTenOrBelow(pair)) {
        return;
      }
      const rank = calculateEffectiveRank(pair, isRevolution);
      if (rank > currentTrick.effectiveRank) {
        playableCombinations.push(pair);
      }
    });
  }

  if (targetType === 'triple') {
    const triples = findTriples(hand);
    triples.forEach(triple => {
      if (isElevenRevolution && !allCardsRankTenOrBelow(triple)) {
        return;
      }
      const rank = calculateEffectiveRank(triple, isRevolution);
      if (rank > currentTrick.effectiveRank) {
        playableCombinations.push(triple);
      }
    });
  }

  if (targetType === 'quad' || targetType === 'quint' || targetType === 'sextuple') {
    const quads = findQuads(hand);
    quads.forEach(quad => {
      if (quad.length === targetLength) {
        if (isElevenRevolution && !allCardsRankTenOrBelow(quad)) {
          return;
        }
        const rank = calculateEffectiveRank(quad, isRevolution);
        if (rank > currentTrick.effectiveRank) {
          playableCombinations.push(quad);
        }
      }
    });
  }

  if (targetType === 'stairs') {
    const stairs = findStairs(hand);
    stairs.forEach(stair => {
      if (stair.length === targetLength) {
        if (isElevenRevolution && !allCardsRankTenOrBelow(stair)) {
          return;
        }
        const rank = calculateEffectiveRank(stair, isRevolution);
        if (rank > currentTrick.effectiveRank) {
          playableCombinations.push(stair);
        }
      }
    });
  }

  if (targetType === 'double_stairs') {
    const doubleStairs = findDoubleStairs(hand);
    doubleStairs.forEach(ds => {
      if (ds.length === targetLength) {
        if (isElevenRevolution && !allCardsRankTenOrBelow(ds)) {
          return;
        }
        const rank = calculateEffectiveRank(ds, isRevolution);
        if (rank > currentTrick.effectiveRank) {
          playableCombinations.push(ds);
        }
      }
    });
  }

  return playableCombinations;
}

function findPairs(hand: Card[]): Card[][] {
  const pairs: Card[][] = [];
  const rankGroups = new Map<string, Card[]>();

  hand.forEach(card => {
    if (!card.isJoker) {
      const rank = card.rank as string;
      if (!rankGroups.has(rank)) {
        rankGroups.set(rank, []);
      }
      rankGroups.get(rank)!.push(card);
    }
  });

  rankGroups.forEach((cards) => {
    if (cards.length >= 2) {
      for (let i = 0; i < cards.length - 1; i++) {
        for (let j = i + 1; j < cards.length; j++) {
          pairs.push([cards[i], cards[j]]);
        }
      }
    }
  });

  const jokers = hand.filter(c => c.isJoker);
  if (jokers.length > 0) {
    rankGroups.forEach((cards) => {
      if (cards.length >= 1) {
        pairs.push([cards[0], jokers[0]]);
      }
    });
  }

  return pairs;
}

function findTriples(hand: Card[]): Card[][] {
  const triples: Card[][] = [];
  const rankGroups = new Map<string, Card[]>();

  hand.forEach(card => {
    if (!card.isJoker) {
      const rank = card.rank as string;
      if (!rankGroups.has(rank)) {
        rankGroups.set(rank, []);
      }
      rankGroups.get(rank)!.push(card);
    }
  });

  rankGroups.forEach((cards) => {
    if (cards.length >= 3) {
      for (let i = 0; i < cards.length - 2; i++) {
        for (let j = i + 1; j < cards.length - 1; j++) {
          for (let k = j + 1; k < cards.length; k++) {
            triples.push([cards[i], cards[j], cards[k]]);
          }
        }
      }
    }
  });

  const jokers = hand.filter(c => c.isJoker);
  if (jokers.length > 0) {
    const pairs = findPairs(hand);
    pairs.forEach(pair => {
      if (!pair.some(c => c.isJoker)) {
        triples.push([...pair, jokers[0]]);
      }
    });
  }

  return triples;
}

function findQuads(hand: Card[]): Card[][] {
  const quads: Card[][] = [];
  const rankGroups = new Map<string, Card[]>();

  hand.forEach(card => {
    if (!card.isJoker) {
      const rank = card.rank as string;
      if (!rankGroups.has(rank)) {
        rankGroups.set(rank, []);
      }
      rankGroups.get(rank)!.push(card);
    }
  });

  rankGroups.forEach((cards) => {
    if (cards.length >= 4) {
      for (let i = 0; i < cards.length - 3; i++) {
        quads.push([cards[i], cards[i+1], cards[i+2], cards[i+3]]);
      }
    }
  });

  const jokers = hand.filter(c => c.isJoker);
  if (jokers.length > 0) {
    rankGroups.forEach((cards) => {
      if (cards.length >= 3) {
        quads.push([cards[0], cards[1], cards[2], jokers[0]]);
      }
    });
  }

  return quads;
}

function findStairs(hand: Card[]): Card[][] {
  const stairs: Card[][] = [];
  const jokers = hand.filter(c => c.isJoker);
  
  if (jokers.length === 0) {
    const suitGroups = new Map<string, Map<string, Card>>();

    hand.forEach(card => {
      if (!card.isJoker) {
        if (!suitGroups.has(card.suit)) {
          suitGroups.set(card.suit, new Map());
        }
        suitGroups.get(card.suit)!.set(card.rank as string, card);
      }
    });

    suitGroups.forEach((suitRankMap) => {
      const sortedRanks = CARD_RANKS_NORMAL.filter(r => suitRankMap.has(r));

      for (let length = 3; length <= sortedRanks.length; length++) {
        for (let start = 0; start <= sortedRanks.length - length; start++) {
          const stairRanks = sortedRanks.slice(start, start + length);
          const stairCards: Card[] = [];

          let valid = true;
          for (const rank of stairRanks) {
            const card = suitRankMap.get(rank);
            if (card) {
              stairCards.push(card);
            } else {
              valid = false;
              break;
            }
          }

          if (valid && stairCards.length === length) {
            stairs.push(stairCards);
          }
        }
      }
    });
    
    return stairs;
  }

  const suitGroups = new Map<string, Set<string>>();
  const suitCardsMap = new Map<string, Map<string, Card>>();

  hand.forEach(card => {
    if (!card.isJoker) {
      if (!suitGroups.has(card.suit)) {
        suitGroups.set(card.suit, new Set());
        suitCardsMap.set(card.suit, new Map());
      }
      suitGroups.get(card.suit)!.add(card.rank as string);
      suitCardsMap.get(card.suit)!.set(card.rank as string, card);
    }
  });

  suitGroups.forEach((rankSet, suit) => {
    const availableRanks = CARD_RANKS_NORMAL.filter(r => rankSet.has(r));
    if (availableRanks.length < 2) return;
    
    const suitCards = suitCardsMap.get(suit)!;
    const minRankIdx = CARD_RANKS_NORMAL.indexOf(availableRanks[0]);
    const maxRankIdx = CARD_RANKS_NORMAL.indexOf(availableRanks[availableRanks.length - 1]);
    
    for (let start = minRankIdx; start <= maxRankIdx; start++) {
      for (let end = start + 2; end <= maxRankIdx + 1; end++) {
        const neededLength = end - start;
        if (neededLength < 3) continue;
        
        const missingCount = neededLength - availableRanks.filter(r => {
          const idx = CARD_RANKS_NORMAL.indexOf(r);
          return idx >= start && idx < end;
        }).length;
        
        if (missingCount > jokers.length) continue;
        
        const stairCards: Card[] = [];
        let jokerUsed = 0;
        for (let idx = start; idx < end; idx++) {
          const rank = CARD_RANKS_NORMAL[idx];
          if (rankSet.has(rank)) {
            stairCards.push(suitCards.get(rank)!);
          } else {
            if (jokerUsed < jokers.length) {
              stairCards.push(jokers[jokerUsed]);
            }
            jokerUsed++;
          }
        }
        
        if (stairCards.length >= 3) {
          stairs.push(stairCards);
        }
      }
    }
  });

  return stairs;
}

function findDoubleStairs(hand: Card[]): Card[][] {
  const doubleStairs: Card[][] = [];
  const rankGroups = new Map<string, Card[]>();

  hand.forEach(card => {
    if (!card.isJoker) {
      const rank = card.rank as string;
      if (!rankGroups.has(rank)) {
        rankGroups.set(rank, []);
      }
      rankGroups.get(rank)!.push(card);
    }
  });

  const suitGroups = new Map<string, Map<string, Card[]>>();
  rankGroups.forEach((cards, rank) => {
    cards.forEach(card => {
      if (!suitGroups.has(card.suit)) {
        suitGroups.set(card.suit, new Map());
      }
      const suitMap = suitGroups.get(card.suit)!;
      if (!suitMap.has(rank)) {
        suitMap.set(rank, []);
      }
      suitMap.get(rank)!.push(card);
    });
  });

  suitGroups.forEach((suitRankMap) => {
    const ranksWithMultiple = CARD_RANKS_NORMAL.filter(r => {
      const cards = suitRankMap.get(r);
      return cards && cards.length >= 2;
    });

    if (ranksWithMultiple.length < 3) return;

    for (let start = 0; start <= ranksWithMultiple.length - 3; start++) {
      const selectedRanks = ranksWithMultiple.slice(start, start + 3);
      const dsCards: Card[] = [];

      let valid = true;
      for (const rank of selectedRanks) {
        const cards = suitRankMap.get(rank);
        if (cards && cards.length >= 2) {
          dsCards.push(cards[0], cards[1]);
        } else {
          valid = false;
          break;
        }
      }

      if (valid) {
        doubleStairs.push(dsCards);

        for (let ext = start + 3; ext < ranksWithMultiple.length; ext++) {
          const extendedRanks = ranksWithMultiple.slice(start, ext + 1);
          const extCards: Card[] = [...dsCards];
          const lastRank = ranksWithMultiple[ext];
          const lastCards = suitRankMap.get(lastRank);
          if (lastCards && lastCards.length >= 2) {
            extCards.push(lastCards[0], lastCards[1]);
            doubleStairs.push(extCards);
          }
        }
      }
    }
  });

  return doubleStairs;
}
