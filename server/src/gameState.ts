import {
  GameState,
  Player,
  Card,
  RankName,
  PlayResult,
  PlayEffect,
  CARD_RANKS_NORMAL,
  Rank,
  calculateRankList
} from './types.js';
import { initializeDeckForGame, sortHand } from './deck.js';
import { 
  validatePlay, 
  detectCombinationType, 
  calculateEffectiveRank,
  detectLock,
  containsEight,
  countJacks,
  containsSpade3,
  canTriggerRevolution,
  canTriggerGreatRevolution,
  canBeatMultipleJokers
} from './validators.js';

interface TradeInfo {
  fromPlayerId: string;
  toPlayerId: string;
  cards: Card[];
}

export class GameStateMachine {
  private state: GameState;
  private readonly minPlayers = 3;

  constructor(players: { id: string; name: string }[]) {
    this.state = this.createInitialState(players);
  }

  private createInitialState(players: { id: string; name: string }[]): GameState {
    return {
      phase: 'waiting',
      players: players.map(p => ({
        id: p.id,
        name: p.name,
        hand: [],
        rank: null,
        score: 0,
        isHost: false,
        isReady: false,
        hasPassed: false,
        finishOrder: 0
      })),
      currentPlayerIndex: 0,
      direction: 'clockwise',
      isRevolution: false,
      isGreatRevolution: false,
      isElevenRevolution: false,
      currentTrick: null,
      lockState: {
        isLocked: false,
        lockedSuit: null
      },
      passCount: 0,
      roundNumber: 1,
      finishOrder: [],
      leadPlayerId: null,
      useTwoDecks: false,
      maxRounds: 0
    };
  }

  getState(): GameState {
    return { ...this.state };
  }

  startGame(hostPlayerIndex: number = 0): { success: boolean; message?: string } {
    if (this.state.players.length < this.minPlayers) {
      return { success: false, message: `至少需要 ${this.minPlayers} 名玩家` };
    }

    if (this.state.phase !== 'waiting') {
      return { success: false, message: '游戏已经开始' };
    }

    this.state.phase = 'dealing';

    const hands = initializeDeckForGame(this.state.players.length);
    
    this.state.players.forEach((player, index) => {
      player.hand = hands[index];
      player.hasPassed = false;
      player.finishOrder = 0;
    });

    this.state.phase = 'playing';
    const leadPlayerIndex = (hostPlayerIndex + 1) % this.state.players.length;
    this.state.currentPlayerIndex = leadPlayerIndex;
    this.state.leadPlayerId = this.state.players[leadPlayerIndex].id;
    this.state.currentTrick = null;
    this.state.passCount = 0;
    this.state.finishOrder = [];
    this.state.isRevolution = false;
    this.state.isGreatRevolution = false;
    this.state.isElevenRevolution = false;
    this.state.useTwoDecks = this.state.players.length >= 6;
    this.state.lockState = {
      isLocked: false,
      lockedSuit: null
    };
    this.state.maxRounds = this.state.players.length;

    return { success: true };
  }

  playCards(playerId: string, cards: Card[]): PlayResult {
    const playerIndex = this.state.players.findIndex(p => p.id === playerId);
    
    if (playerIndex === -1) {
      return { success: false, message: '玩家不存在' };
    }

    if (playerIndex !== this.state.currentPlayerIndex) {
      return { success: false, message: '不是你的回合' };
    }

    if (this.state.phase !== 'playing') {
      return { success: false, message: '当前不是出牌阶段' };
    }

    const player = this.state.players[playerIndex];

    const hasAllCards = cards.every(card => 
      player.hand.some(h => h.id === card.id)
    );

    if (!hasAllCards) {
      return { success: false, message: '手牌中不存在这些牌' };
    }

    // Special rule: spade-3 beats a single joker on the table
    if (this.state.currentTrick && this.state.currentTrick.cards.length === 1 && this.state.currentTrick.cards[0].isJoker) {
      if (cards.length === 1 && containsSpade3(cards)) {
        this.removeCardsFromHand(player, cards);
        this.state.leadPlayerId = playerId;
        this.clearTrick();
        if (player.hand.length === 0) {
          this.handlePlayerFinish(playerId);
        }
        return {
          success: true,
          effects: [{ type: 'maxThree', description: '黑桃3压制鬼牌！' }]
        };
      }
    }

    // Special rule (2-deck mode): joker+two 3s beats multiple jokers on the table
    if (this.state.currentTrick && this.state.currentTrick.cards.length > 1 && this.state.currentTrick.cards.every(c => c.isJoker)) {
      if (canBeatMultipleJokers(cards, this.state.currentTrick.cards, this.state.useTwoDecks)) {
        this.removeCardsFromHand(player, cards);
        this.state.leadPlayerId = playerId;
        this.clearTrick();
        if (player.hand.length === 0) {
          this.handlePlayerFinish(playerId);
        }
        return {
          success: true,
          effects: [{ type: 'jokerThreeCombo', description: '鬼牌+3压制多张鬼牌！' }]
        };
      }
    }

    const validation = validatePlay(
      cards,
      this.state.currentTrick,
      this.state.isRevolution,
      this.state.isElevenRevolution,
      this.state.lockState
    );

    if (!validation.valid) {
      return { success: false, message: validation.message };
    }

    const effects: PlayEffect[] = [];
    const combinationType = detectCombinationType(cards)!;
    const effectiveRank = calculateEffectiveRank(cards, this.state.isRevolution);

    this.removeCardsFromHand(player, cards);

    if (this.state.currentTrick) {
      const newLockState = detectLock(cards, this.state.currentTrick.cards);
      if (newLockState.isLocked) {
        this.state.lockState = newLockState;
      }
    }

    this.state.currentTrick = {
      cards,
      type: combinationType,
      playerId,
      effectiveRank
    };

    this.state.passCount = 0;
    this.state.players.forEach(p => p.hasPassed = false);
    this.state.leadPlayerId = playerId;
    this.recordLastPlay(playerId, cards);

    if (containsEight(cards)) {
      effects.push({
        type: 'eightCut',
        description: '8切！回合结束'
      });
      this.handleEightCut(playerId);
      return { success: true, effects };
    }

    if (canTriggerGreatRevolution(player.rank, cards)) {
      this.state.isGreatRevolution = true;
      this.state.isRevolution = true;
      effects.push({
        type: 'greatRevolution',
        description: '大革命发动！点数大小永久逆转！无法被反革命！'
      });
      this.state.leadPlayerId = playerId;
      this.clearTrick();
      return { success: true, effects };
    }

    if (canTriggerRevolution(player.rank, this.state.isGreatRevolution, cards, this.state.currentTrick, this.state.isRevolution, this.state.isElevenRevolution)) {
      this.state.isRevolution = !this.state.isRevolution;
      effects.push({
        type: 'revolution',
        description: this.state.isRevolution ? '革命发动！点数大小逆转！' : '反革命！点数恢复正常！'
      });
      this.state.leadPlayerId = playerId;
      this.resortAllHands();
      this.clearTrick();
      return { success: true, effects };
    }

    const jackCount = countJacks(cards);
    if (jackCount >= 1 && jackCount <= 3 && !this.state.isElevenRevolution && !this.state.isRevolution && !this.state.isGreatRevolution) {
      this.state.isElevenRevolution = true;
      this.state.isRevolution = true;
      effects.push({
        type: 'elevenRevolution',
        description: '11革命发动！点数大小逆转！只能打出10或以下的牌！'
      });
      this.resortAllHands();
      if (this.state.currentTrick) {
        this.state.currentTrick.effectiveRank = calculateEffectiveRank(
          this.state.currentTrick.cards,
          this.state.isRevolution
        );
      }
    }

    if (player.hand.length === 0) {
      this.handlePlayerFinish(playerId);
    }

    this.advanceTurn();

    return { success: true, effects };
  }

  private handleEightCut(playerId: string): void {
    this.state.leadPlayerId = playerId;
    this.clearTrick();
  }

  pass(playerId: string): PlayResult {
    const playerIndex = this.state.players.findIndex(p => p.id === playerId);
    
    if (playerIndex === -1) {
      return { success: false, message: '玩家不存在' };
    }

    if (playerIndex !== this.state.currentPlayerIndex) {
      return { success: false, message: '不是你的回合' };
    }

    if (this.state.phase !== 'playing') {
      return { success: false, message: '当前不是出牌阶段' };
    }

    if (this.state.currentTrick === null) {
      return { success: false, message: '你是首家，必须出牌' };
    }

    const player = this.state.players[playerIndex];
    player.hasPassed = true;
    this.state.passCount++;

    const activePlayers = this.state.players.filter(p => 
      p.hand.length > 0 && !p.hasPassed
    );

    if (activePlayers.length === 0 || this.state.passCount >= this.getActivePlayersCount() - 1) {
      this.clearTrick();
    } else {
      this.advanceTurn();
    }

    return { success: true };
  }

  private getActivePlayersCount(): number {
    return this.state.players.filter(p => p.hand.length > 0).length;
  }

  private advanceTurn(): void {
    const startIndex = this.state.currentPlayerIndex;
    
    do {
      if (this.state.direction === 'clockwise') {
        this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length;
      } else {
        this.state.currentPlayerIndex = (this.state.currentPlayerIndex - 1 + this.state.players.length) % this.state.players.length;
      }

      const currentPlayer = this.state.players[this.state.currentPlayerIndex];
      if (currentPlayer.hand.length > 0 && !currentPlayer.hasPassed) {
        break;
      }
    } while (this.state.currentPlayerIndex !== startIndex);
  }

  private clearTrick(): void {
    if (this.state.isElevenRevolution) {
      this.state.isRevolution = !this.state.isRevolution;
      this.state.isElevenRevolution = false;
      this.resortAllHands();
    }

    this.state.currentTrick = null;
    this.state.passCount = 0;
    this.state.lockState = {
      isLocked: false,
      lockedSuit: null
    };

    this.state.players.forEach(p => {
      p.hasPassed = false;
    });

    if (this.state.leadPlayerId) {
      const leadIndex = this.state.players.findIndex(p => p.id === this.state.leadPlayerId);
      if (leadIndex !== -1 && this.state.players[leadIndex].hand.length > 0) {
        this.state.currentPlayerIndex = leadIndex;
      } else {
        this.findNextActivePlayer();
      }
    }
  }

  private findNextActivePlayer(): void {
    const startIndex = this.state.currentPlayerIndex;
    
    do {
      if (this.state.direction === 'clockwise') {
        this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length;
      } else {
        this.state.currentPlayerIndex = (this.state.currentPlayerIndex - 1 + this.state.players.length) % this.state.players.length;
      }

      if (this.state.players[this.state.currentPlayerIndex].hand.length > 0) {
        break;
      }
    } while (this.state.currentPlayerIndex !== startIndex);
  }

  // Track the last cards played by each player who finished (for punishment check)
  private lastPlayCards: Map<string, Card[]> = new Map();

  private handlePlayerFinish(playerId: string): void {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return;

    if (this.state.finishOrder.includes(playerId)) {
      return;
    }

    this.state.finishOrder.push(playerId);
    player.finishOrder = this.state.finishOrder.length;

    const rankList = calculateRankList(this.state.players.length);
    const playerFinishIndex = this.state.finishOrder.length - 1;

    if (playerFinishIndex < rankList.length) {
      player.rank = rankList[playerFinishIndex];
      // Rule: Score = (playerCount - 1) - finishIndex
      const roundScore = (this.state.players.length - 1) - playerFinishIndex;
      player.score += roundScore;
    }

    const activePlayers = this.state.players.filter(p => p.hand.length > 0);
    if (activePlayers.length === 1) {
      const lastPlayer = activePlayers[0];
      if (!this.state.finishOrder.includes(lastPlayer.id)) {
        this.state.finishOrder.push(lastPlayer.id);
        lastPlayer.finishOrder = this.state.finishOrder.length;

        const lastRankIndex = this.state.finishOrder.length - 1;
        if (lastRankIndex < rankList.length) {
          lastPlayer.rank = rankList[lastRankIndex];
          // Last player gets 0 points: (playerCount - 1) - (playerCount - 1) = 0
          const lastRoundScore = (this.state.players.length - 1) - lastRankIndex;
          lastPlayer.score += lastRoundScore;
        }
      }
      this.state.phase = 'roundEnd';
    }
  }

  // Record the cards played for punishment detection
  recordLastPlay(playerId: string, cards: Card[]): void {
    this.lastPlayCards.set(playerId, cards);
  }

  // Check if the last play contains the highest rank card (punishment trigger)
  private checkPunishment(playerId: string): boolean {
    const lastCards = this.lastPlayCards.get(playerId);
    if (!lastCards || lastCards.length === 0) return false;

    // Highest rank cards:
    // - Joker (always)
    // - Normal mode: 2
    // - Revolution mode: 3
    for (const card of lastCards) {
      if (card.isJoker) return true;
      if (this.state.isRevolution || this.state.isGreatRevolution) {
        if (card.rank === '3') return true;
      } else {
        if (card.rank === '2') return true;
      }
    }
    return false;
  }

  // Check sudden fall: previous daifugo didn't win again
  checkSuddenFall(): void {
    const previousDaifugo = this.state.players.find(p => p.rank === 'daifugo');
    if (!previousDaifugo) return;

    const firstFinishPlayerId = this.state.finishOrder[0];
    if (firstFinishPlayerId && firstFinishPlayerId !== previousDaifugo.id) {
      // Sudden fall: daifugo didn't win, demoted to daihinmin
      previousDaifugo.rank = 'daihinmin';
    }
  }

  private resortAllHands(): void {
    this.state.players.forEach(player => {
      player.hand = sortHand(player.hand, this.state.isRevolution);
    });
  }

  getCurrentPlayer(): Player | null {
    return this.state.players[this.state.currentPlayerIndex] || null;
  }

  isGameOver(): boolean {
    return this.state.phase === 'roundEnd' || this.state.phase === 'gameEnd';
  }

  getWinners(): { rank: RankName; player: Player }[] {
    return this.state.players
      .filter(p => p.rank !== null)
      .map(p => ({ rank: p.rank!, player: p }))
      .sort((a, b) => {
        const rankList = calculateRankList(this.state.players.length);
        return rankList.indexOf(a.rank) - rankList.indexOf(b.rank);
      });
  }

  dealCards(): { success: boolean } {
    if (this.state.phase !== 'roundEnd') {
      return { success: false };
    }

    const hands = initializeDeckForGame(this.state.players.length);
    this.state.players.forEach((player, index) => {
      player.hand = hands[index];
    });

    this.state.phase = 'trading';
    return { success: true };
  }

  executeCardTrading(): { success: boolean; trades?: TradeInfo[]; effects?: PlayEffect[] } {
    if (this.state.phase !== 'trading') {
      return { success: false };
    }

    const trades: TradeInfo[] = [];
    const effects: PlayEffect[] = [];
    const playerCount = this.state.players.length;
    const rankList = calculateRankList(playerCount);
    // rankList[0] = winner (best rank, e.g., daifugo)
    // rankList[playerCount-1] = loser (worst rank, e.g., daihinmin)

    // Helper: loser gives strongest cards to winner, winner gives weakest cards to loser
    const performTrade = (winnerRank: RankName, loserRank: RankName, count: number) => {
      const winner = this.state.players.find(p => p.rank === winnerRank);
      const loser = this.state.players.find(p => p.rank === loserRank);

      if (winner && loser) {
        // Loser gives strongest cards (tribute / 进贡)
        const tributeCards = this.getStrongestCards(loser.hand, count);
        // Winner gives weakest cards (return gift / 回礼)
        const returnCards = this.getWeakestCards(winner.hand, count);

        if (tributeCards.length === count && returnCards.length === count) {
          // Remove cards from hands
          tributeCards.forEach(card => {
            const idx = loser.hand.findIndex(c => c.id === card.id);
            if (idx !== -1) loser.hand.splice(idx, 1);
          });
          returnCards.forEach(card => {
            const idx = winner.hand.findIndex(c => c.id === card.id);
            if (idx !== -1) winner.hand.splice(idx, 1);
          });

          // Exchange: loser receives weak cards, winner receives strong cards
          loser.hand.push(...returnCards);
          winner.hand.push(...tributeCards);

          // Record trades
          trades.push({
            fromPlayerId: loser.id,
            toPlayerId: winner.id,
            cards: tributeCards
          });
          trades.push({
            fromPlayerId: winner.id,
            toPlayerId: loser.id,
            cards: returnCards
          });
        }
      }
    };

    if (playerCount === 3) {
      // 3 players: Fugo(winner, index 0) <-> Hinmin(loser, index 2), 1 card each
      performTrade(rankList[0], rankList[2], 1);
    } else if (playerCount >= 4) {
      // 4+ players:
      // Best(winner, index 0) <-> Worst(loser, index N-1), 2 cards each
      performTrade(rankList[0], rankList[playerCount - 1], 2);

      // 2nd best(winner, index 1) <-> 2nd worst(loser, index N-2), 1 card each
      performTrade(rankList[1], rankList[playerCount - 2], 1);
    }

    // Punishment phase: players who played the highest rank card (Joker/2/3) must tribute
    if (this.state.roundNumber > 1) {
      const winner = this.state.players.find(p => p.rank === rankList[0]);
      if (winner) {
        this.state.players.forEach((player) => {
          if (player.id === winner.id) return;
          if (this.checkPunishment(player.id)) {
            const tributeCards = this.getStrongestCards(player.hand, 1);
            const returnCards = this.getWeakestCards(winner.hand, 1);
            if (tributeCards.length === 1 && returnCards.length === 1) {
              const idx1 = player.hand.findIndex(c => c.id === tributeCards[0].id);
              if (idx1 !== -1) player.hand.splice(idx1, 1);
              const idx2 = winner.hand.findIndex(c => c.id === returnCards[0].id);
              if (idx2 !== -1) winner.hand.splice(idx2, 1);
              player.hand.push(returnCards[0]);
              winner.hand.push(tributeCards[0]);
              trades.push({
                fromPlayerId: player.id,
                toPlayerId: winner.id,
                cards: tributeCards
              });
              trades.push({
                fromPlayerId: winner.id,
                toPlayerId: player.id,
                cards: returnCards
              });
              effects.push({
                type: 'jokerPlay',
                description: `${player.name} 打出${tributeCards[0].isJoker ? '鬼牌' : tributeCards[0].rank}受罚，额外进贡！`,
              });
            }
          }
        });
      }
    }

    if (trades.length > 0) {
      effects.push({
        type: 'cardTrading',
        description: '换牌完成！',
        trades: trades
      });
    }

    // Clear last play records after punishment is applied
    this.lastPlayCards.clear();

    // Re-sort all hands after card trading
    this.state.players.forEach(player => {
      player.hand = sortHand(player.hand, this.state.isRevolution);
    });

    this.state.phase = 'trading';
    return { success: true, trades, effects };
  }

  startNewRound(): { success: boolean; effects?: PlayEffect[] } {
    if (this.state.phase !== 'trading') {
      return { success: false };
    }

    // Check if max rounds reached → game ends
    if (this.state.roundNumber >= this.state.maxRounds) {
      this.state.phase = 'gameEnd';
      return { success: true, effects: [{ type: 'newRound', description: '游戏结束！' }] };
    }

    // Reset player states but KEEP HANDS and RANKS
    this.state.players.forEach((player, index) => {
      // Hand is already dealt and traded in executeCardTrading
      player.hasPassed = false;
      player.finishOrder = 0;
    });

    this.state.phase = 'playing';
    this.state.roundNumber++;
    this.state.currentTrick = null;
    this.state.passCount = 0;
    this.state.finishOrder = [];
    this.state.isRevolution = false;
    this.state.isGreatRevolution = false;
    this.state.isElevenRevolution = false;
    this.state.useTwoDecks = this.state.players.length >= 6;
    this.state.lockState = {
      isLocked: false,
      lockedSuit: null
    };

    // Find the lowest rank player (worst rank = last in rankList) to start the new round
    const rankList = calculateRankList(this.state.players.length);
    const worstRank = rankList[rankList.length - 1]; // e.g., daihinmin for 5 players, hinmin for 3 players
    const lowestRankPlayer = this.state.players.find(p => p.rank === worstRank);
    
    if (lowestRankPlayer) {
      const idx = this.state.players.findIndex(p => p.id === lowestRankPlayer.id);
      this.state.currentPlayerIndex = idx;
      this.state.leadPlayerId = lowestRankPlayer.id;
    } else {
      // Fallback: first player with cards
      const firstActivePlayer = this.state.players.find(p => p.hand.length > 0);
      if (firstActivePlayer) {
        const idx = this.state.players.findIndex(p => p.id === firstActivePlayer.id);
        this.state.currentPlayerIndex = idx;
        this.state.leadPlayerId = firstActivePlayer.id;
      } else {
        this.state.currentPlayerIndex = 0;
        this.state.leadPlayerId = this.state.players[0]?.id || null;
      }
    }

    // Do NOT reset ranks here, as they are needed for revolution rules and next round trading
    // this.state.players.forEach(p => p.rank = null); 

    return { 
      success: true, 
      effects: [{ type: 'newRound', description: `第 ${this.state.roundNumber} 局开始！` }]
    };
  }

  private removeCardsFromHand(player: Player, cards: Card[]): void {
    cards.forEach(card => {
      const cardIndex = player.hand.findIndex(h => h.id === card.id);
      if (cardIndex !== -1) {
        player.hand.splice(cardIndex, 1);
      }
    });
  }

  private getStrongestCards(hand: Card[], count: number): Card[] {
    if (hand.length === 0) return [];
    
    const sortedHand = [...hand].sort((a, b) => {
      const rankA = this.getCardRankValue(a);
      const rankB = this.getCardRankValue(b);
      return rankB - rankA;
    });

    return sortedHand.slice(0, count);
  }

  private getWeakestCards(hand: Card[], count: number): Card[] {
    if (hand.length === 0) return [];
    
    const sortedHand = [...hand].sort((a, b) => {
      const rankA = this.getCardRankValue(a);
      const rankB = this.getCardRankValue(b);
      return rankA - rankB;
    });

    return sortedHand.slice(0, count);
  }

  private getCardRankValue(card: Card): number {
    if (card.isJoker) {
      return 100;
    }
    return CARD_RANKS_NORMAL.indexOf(card.rank as Rank);
  }

  rejoinPlayer(player: Player): void {
    const existingIndex = this.state.players.findIndex(p => p.name === player.name);
    
    if (existingIndex >= 0) {
      this.state.players[existingIndex] = {
        ...this.state.players[existingIndex],
        id: player.id,
        hand: player.hand,
        rank: player.rank,
        isHost: player.isHost,
        hasPassed: player.hasPassed,
        finishOrder: player.finishOrder
      };
    }
  }
}
