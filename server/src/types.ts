export type Suit = 'spade' | 'heart' | 'diamond' | 'club';

export type Rank = '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A' | '2';

export interface Card {
  id: string;
  suit: Suit | 'joker';
  rank: Rank | null;
  isJoker: boolean;
  deckIndex: number;
}

export type CombinationType = 
  | 'single' 
  | 'pair' 
  | 'triple' 
  | 'quad' 
  | 'quint' 
  | 'sextuple' 
  | 'stairs' 
  | 'double_stairs';

export interface CardCombination {
  type: CombinationType;
  cards: Card[];
  effectiveRank: number;
}

export type RankName = 
  | 'pope'        
  | 'emperor'     
  | 'daifugo'    
  | 'fugo'       
  | 'hemin'      
  | 'hinmin'      
  | 'daihinmin'   
  | 'slave'       
  | 'livestock';

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  rank: RankName | null;
  score: number;
  isHost: boolean;
  isReady: boolean;
  hasPassed: boolean;
  finishOrder: number;
}

export type Direction = 'clockwise' | 'counterclockwise';

export type GamePhase = 
  | 'waiting'
  | 'dealing'
  | 'trading'
  | 'playing'
  | 'roundEnd'
  | 'gameEnd';

export interface LockState {
  isLocked: boolean;
  lockedSuit: Suit | null;
}

export interface CurrentTrick {
  cards: Card[];
  type: CombinationType;
  playerId: string;
  effectiveRank: number;
}

export interface GameState {
  phase: GamePhase;
  players: Player[];
  currentPlayerIndex: number;
  direction: Direction;
  isRevolution: boolean;
  isGreatRevolution: boolean;
  isElevenRevolution: boolean;
  currentTrick: CurrentTrick | null;
  lockState: LockState;
  passCount: number;
  roundNumber: number;
  finishOrder: string[];
  leadPlayerId: string | null;
  useTwoDecks: boolean;
  maxRounds: number;
}

export interface Room {
  id: string;
  players: Player[];
  maxPlayers: number;
  status: 'waiting' | 'playing';
  gameState: GameState | null;
  disconnectedPlayers: Map<string, Player>;
}

export interface PlayResult {
  success: boolean;
  message?: string;
  effects?: PlayEffect[];
}

export interface PlayEffect {
  type: 'eightCut' | 'revolution' | 'greatRevolution' | 'elevenRevolution' | 'maxThree' | 'jokerPlay' | 'cardTrading' | 'newRound' | 'jokerThreeCombo';
  description: string;
  trades?: CardTrade[];
}

export interface CardTrade {
  fromPlayerId: string;
  toPlayerId: string;
  cards: Card[];
}

export const CARD_RANKS_NORMAL: Rank[] = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];

// Revolution order: 2 is weakest, 3 is strongest (reversed from normal)
export const CARD_RANKS_REVOLUTION: Rank[] = ['2', 'A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3'];

export const SUITS: Suit[] = ['spade', 'heart', 'diamond', 'club'];

export const SUIT_SYMBOLS: Record<Suit, string> = {
  spade: '♠',
  heart: '♥',
  diamond: '♦',
  club: '♣'
};

export const RANK_ORDER: Record<RankName, number> = {
  pope: 1,
  emperor: 2,
  daifugo: 3,
  fugo: 4,
  hemin: 5,
  hinmin: 6,
  daihinmin: 7,
  slave: 8,
  livestock: 9
};

export const RANK_NAMES: Record<RankName, string> = {
  pope: '教皇',
  emperor: '皇帝',
  daifugo: '大富豪',
  fugo: '富豪',
  hemin: '平民',
  hinmin: '贫民',
  daihinmin: '大贫民',
  slave: '奴隶',
  livestock: '家畜'
};

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 9;

export function getDeckConfig(playerCount: number): { deckCount: number; jokerCount: number; totalCards: number } {
  if (playerCount >= 3 && playerCount <= 5) {
    return { deckCount: 1, jokerCount: 1, totalCards: 53 };
  } else if (playerCount >= 6 && playerCount <= 9) {
    return { deckCount: 2, jokerCount: 2, totalCards: 106 };
  }
  return { deckCount: 1, jokerCount: 1, totalCards: 53 };
}

export function calculateRankList(playerCount: number): RankName[] {
  switch (playerCount) {
    case 3:
      return ['fugo', 'hemin', 'hinmin'];
    case 4:
      return ['daifugo', 'fugo', 'hemin', 'hinmin'];
    case 5:
      return ['daifugo', 'fugo', 'hemin', 'hinmin', 'daihinmin'];
    case 6:
      return ['emperor', 'daifugo', 'fugo', 'hemin', 'hinmin', 'daihinmin'];
    case 7:
      return ['emperor', 'daifugo', 'fugo', 'hemin', 'hinmin', 'daihinmin', 'slave'];
    case 8:
      return ['pope', 'emperor', 'daifugo', 'fugo', 'hemin', 'hinmin', 'daihinmin', 'slave'];
    case 9:
      return ['pope', 'emperor', 'daifugo', 'fugo', 'hemin', 'hinmin', 'daihinmin', 'slave', 'livestock'];
    default:
      return ['daifugo', 'fugo', 'hemin', 'hinmin'];
  }
}
