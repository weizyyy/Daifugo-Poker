# 大富豪（大贫民）扑克游戏规则 - 伪代码说明

## 1. 游戏配置常量

```
CONSTANTS:
    CARD_RANKS_NORMAL = [3, 4, 5, 6, 7, 8, 9, 10, J, Q, K, A, 2]  // 从弱到强
    CARD_RANKS_REVOLUTION = [2, A, K, Q, J, 10, 9, 8, 7, 6, 5, 4, 3]  // 革命时逆转
    CARD_RANKS_ELEVEN_REVOLUTION = [3, 4, 5, 6, 7, 8, 9, 10]  // 11革命后只能打10或以下
    SUITS = [♠, ♥, ♦, ♣]
    JOKER = "JOKER"
    
    MIN_PLAYERS = 3
    MAX_PLAYERS = 9
    OPTIMAL_PLAYERS = [4, 5, 6]
    
    SPECIAL_CARDS = {
        EIGHT: 8,           // 8切牌
        JACK: J,            // 11革命
        THREE: 3,           // 3相关规则
        JOKER: JOKER        // 鬼牌
    }

FUNCTION getDeckConfig(playerCount: Integer) -> DeckConfig:
    IF playerCount >= 3 AND playerCount <= 5 THEN
        RETURN DeckConfig(deckCount: 1, jokerCount: 1, totalCards: 53)
    ELSE IF playerCount >= 6 AND playerCount <= 9 THEN
        RETURN DeckConfig(deckCount: 2, jokerCount: 2, totalCards: 106)
    END IF
END FUNCTION
```

## 2. 游戏状态

```
GAME_STATE:
    players: Array<Player>          // 玩家数组
    deck: Array<Card>               // 牌堆
    currentRound: Round             // 当前回合
    isRevolution: Boolean           // 是否处于革命状态
    isGreatRevolution: Boolean      // 是否处于大革命状态（不可反革命）
    isElevenRevolution: Boolean     // 是否处于11革命状态（临时）
    leadPlayer: Player              // 主导者
    lastPlay: CardCombination       // 最后打出的牌组
    passCount: Integer              // 连续PASS次数
    gamePhase: Enum[DEALING, PLAYING, TRADING, FINISHED]
    currentRoundNumber: Integer     // 当前局数
    roomOwner: Player               // 房主（发牌者）
```

## 3. 玩家状态

```
PLAYER:
    id: Integer
    name: String
    hand: Array<Card>               // 手牌
    rank: Enum[POPE, EMPEROR, DAIFUGO, FUGO, HEMIN, HINMIN, DAIHINMIN, SLAVE, LIVESTOCK]  // 阶级
    isLeadPlayer: Boolean           // 是否为主导者
    hasPassed: Boolean              // 本回合是否已PASS
    finishOrder: Integer            // 本局出完牌的顺序
```

## 4. 卡牌定义

```
CARD:
    suit: Enum[♠, ♥, ♦, ♣, JOKER]
    rank: Integer | String          // 3-10, J, Q, K, A, 2
    isJoker: Boolean
    deckId: Integer                 // 用于区分多副牌中的相同卡牌
    
    FUNCTION getEffectiveRank(isRevolution: Boolean, isGreatRevolution: Boolean) -> Integer:
        IF isJoker THEN
            // 鬼牌在任何状态下都是最大的
            RETURN HIGHEST_RANK  // 比所有数字牌都大
        END IF
        
        IF isRevolution OR isGreatRevolution THEN
            RETURN CARD_RANKS_REVOLUTION.indexOf(rank)
        ELSE
            RETURN CARD_RANKS_NORMAL.indexOf(rank)
        END IF
    END FUNCTION
```

## 5. 牌组类型

```
CARD_COMBINATION:
    type: Enum[SINGLE, PAIR, TRIPLE, QUAD, QUINT, SEXTUPLE, STAIRS, DOUBLE_STAIRS, JOKER_SINGLE, JOKER_COMBO]
    cards: Array<Card>
    effectiveRank: Integer
    
    FUNCTION validate() -> Boolean:
        SWITCH type:
            CASE SINGLE:
                RETURN cards.length == 1
            CASE PAIR:
                RETURN cards.length == 2 AND allSameRank(cards)
            CASE TRIPLE:
                RETURN cards.length == 3 AND allSameRank(cards)
            CASE QUAD:
                RETURN cards.length == 4 AND allSameRank(cards)
            CASE QUINT:
                RETURN cards.length == 5 AND allSameRank(cards)
            CASE SEXTUPLE:
                RETURN cards.length == 6 AND allSameRank(cards)
            CASE STAIRS:
                RETURN validateStairs(cards)
            CASE DOUBLE_STAIRS:
                RETURN validateDoubleStairs(cards)
        END SWITCH
    END FUNCTION
```

## 6. 游戏初始化

```
FUNCTION initializeGame(playerCount: Integer, roomOwner: Player):
    // 验证玩家数量
    IF playerCount < MIN_PLAYERS OR playerCount > MAX_PLAYERS THEN
        THROW InvalidPlayerCountError
    END IF
    
    // 根据人数获取牌组配置
    deckConfig = getDeckConfig(playerCount)
    
    // 创建牌堆
    deck = createDeck(deckConfig)
    shuffle(deck)
    
    // 初始化玩家
    FOR i = 0 TO playerCount - 1:
        players[i] = Player(id: i, rank: HEMIN)
    END FOR
    
    // 发牌
    dealCards()
    
    // 确定第一局主导者（发牌者左方的玩家）
    leadPlayer = getPlayerToLeft(roomOwner)
    
    gamePhase = PLAYING
    currentRoundNumber = 1
END FUNCTION

FUNCTION createDeck(deckConfig: DeckConfig) -> Array<Card>:
    deck = []
    FOR deckId = 1 TO deckConfig.deckCount:
        FOR EACH suit IN SUITS:
            FOR EACH rank IN CARD_RANKS_NORMAL:
                deck.append(Card(suit, rank, deckId: deckId))
            END FOR
        END FOR
    END FOR
    
    FOR i = 1 TO deckConfig.jokerCount:
        deck.append(Card(JOKER, null, deckId: i))
    END FOR
    
    RETURN deck
END FUNCTION

FUNCTION dealCards():
    cardIndex = 0
    WHILE cardIndex < deck.length:
        playerIndex = cardIndex MOD players.length
        players[playerIndex].hand.append(deck[cardIndex])
        cardIndex++
    END WHILE
    // 多出的零星牌按照顺序派给下一位玩家（发牌者左方开始）
END FUNCTION

FUNCTION getPlayerToLeft(player: Player) -> Player:
    currentIndex = players.indexOf(player)
    leftIndex = (currentIndex + 1) MOD players.length
    RETURN players[leftIndex]
END FUNCTION
```

## 7. 回合流程

```
FUNCTION playRound():
    currentRound = Round()
    passCount = 0
    currentPlayer = leadPlayer
    
    WHILE NOT allPlayersFinished():
        // 检查当前玩家是否已出完牌
        IF currentPlayer.hand.length == 0 THEN
            currentPlayer = getNextPlayer(currentPlayer)
            CONTINUE
        END IF
        
        // 等待玩家出牌或PASS
        action = waitForPlayerAction(currentPlayer)
        
        IF action.type == PASS THEN
            passCount++
            currentPlayer.hasPassed = true
            
            // 检查是否所有人都PASS
            IF passCount >= getActivePlayerCount() - 1 THEN
                endCurrentRound()
                RETURN
            END IF
        ELSE IF action.type == PLAY THEN
            // 验证出牌
            IF validatePlay(action.cards, lastPlay) THEN
                executePlay(currentPlayer, action.cards)
                passCount = 0
                resetAllPassFlags()
                
                // 检查特殊效果
                processSpecialEffects(action.cards)
                
                // 检查玩家是否出完牌
                IF currentPlayer.hand.length == 0 THEN
                    handlePlayerFinish(currentPlayer)
                END IF
            ELSE
                // 无效出牌，重新等待
                CONTINUE
            END IF
        END IF
        
        currentPlayer = getNextPlayer(currentPlayer)
    END WHILE
END FUNCTION

FUNCTION endCurrentRound():
    // 主导者成为下一回合的起始者
    leadPlayer = lastPlay.player
    lastPlay = null
    resetAllPassFlags()
    passCount = 0
    
    // 11革命效果结束
    IF isElevenRevolution THEN
        isElevenRevolution = false
    END IF
END FUNCTION
```

## 8. 出牌验证

```
FUNCTION validatePlay(cards: Array<Card>, lastPlay: CardCombination) -> Boolean:
    // 空牌堆时可以出任何牌
    IF lastPlay == null THEN
        RETURN validateCardCombination(cards)
    END IF
    
    // 检查牌型是否匹配
    IF NOT matchCombinationType(cards, lastPlay.type) THEN
        RETURN false
    END IF
    
    // 检查锁定状态
    IF isLocked THEN
        IF NOT checkLockConstraint(cards) THEN
            RETURN false
        END IF
    END IF
    
    // 11革命限制：只能打10或以下的牌
    IF isElevenRevolution THEN
        IF NOT allCardsRankTenOrBelow(cards) THEN
            RETURN false
        END IF
    END IF
    
    // 比较点数大小
    currentRank = calculateEffectiveRank(cards)
    lastRank = lastPlay.effectiveRank
    
    RETURN currentRank > lastRank
END FUNCTION

FUNCTION validateCardCombination(cards: Array<Card>) -> Boolean:
    IF cards.length == 0 THEN RETURN false
    
    // 单张
    IF cards.length == 1 THEN RETURN true
    
    // 对子、三张、四张、五张、六张
    IF allSameRank(cards) THEN
        RETURN cards.length IN [2, 3, 4, 5, 6]
    END IF
    
    // 阶梯
    IF isStairs(cards) THEN
        RETURN validateStairs(cards)
    END IF
    
    // 二列阶梯（需要2副牌）
    IF isDoubleStairs(cards) THEN
        RETURN validateDoubleStairs(cards)
    END IF
    
    // 鬼牌组合
    RETURN validateJokerCombination(cards)
END FUNCTION

FUNCTION matchCombinationType(cards: Array<Card>, type: CombinationType) -> Boolean:
    SWITCH type:
        CASE SINGLE:
            RETURN cards.length == 1
        CASE PAIR:
            RETURN cards.length == 2 AND allSameRank(cards)
        CASE TRIPLE:
            RETURN cards.length == 3 AND allSameRank(cards)
        CASE QUAD:
            RETURN cards.length == 4 AND allSameRank(cards)
        CASE QUINT:
            RETURN cards.length == 5 AND allSameRank(cards)
        CASE SEXTUPLE:
            RETURN cards.length == 6 AND allSameRank(cards)
        CASE STAIRS:
            RETURN isStairs(cards) AND cards.length == lastPlay.cards.length
        CASE DOUBLE_STAIRS:
            RETURN isDoubleStairs(cards) AND cards.length == lastPlay.cards.length
    END SWITCH
END FUNCTION

FUNCTION allCardsRankTenOrBelow(cards: Array<Card>) -> Boolean:
    FOR EACH card IN cards:
        IF NOT card.isJoker THEN
            rankIndex = CARD_RANKS_NORMAL.indexOf(card.rank)
            IF rankIndex > 7 THEN  // 10的索引是7
                RETURN false
            END IF
        END IF
    END FOR
    RETURN true
END FUNCTION
```

## 9. 特殊牌效果

```
FUNCTION processSpecialEffects(cards: Array<Card>):
    // 8切牌
    IF containsEight(cards) THEN
        triggerEightCut()
        RETURN
    END IF
    
    // 11革命（单张或牌组包含J）
    IF containsJack(cards) THEN
        triggerElevenRevolution()
        // 11革命不结束回合，继续出牌
    END IF
    
    // 大革命（6张及以上相同）
    IF cards.length >= 6 AND allSameRank(cards) THEN
        triggerGreatRevolution(cards)
        RETURN
    END IF
    
    // 革命（4张或5张相同，或4张及以上阶梯）
    IF canTriggerRevolution(currentPlayer, cards) THEN
        triggerRevolution(cards)
        RETURN
    END IF
    
    // 鬼牌特殊处理
    IF containsJoker(cards) THEN
        processJokerEffect(cards)
    END IF
END FUNCTION

// ========== 8切牌 ==========
FUNCTION triggerEightCut():
    // 打出8的玩家立即成为主导者
    leadPlayer = currentPlayer
    lastPlay = null
    endCurrentRound()
END FUNCTION

FUNCTION containsEight(cards: Array<Card>) -> Boolean:
    FOR EACH card IN cards:
        IF card.rank == 8 THEN RETURN true
    END FOR
    RETURN false
END FUNCTION

// ========== 11革命 ==========
FUNCTION triggerElevenRevolution():
    // J打出时引发临时革命：点数大小逆转 + 只能打10或以下的牌
    isElevenRevolution = true
    isRevolution = true  // 11革命时点数逆转
    announce("11革命发动！点数大小逆转！只能打出10或以下的牌！")
    // 效果持续到当前回合结束
END FUNCTION

FUNCTION getEffectiveRankForElevenRevolution(card: Card) -> Integer:
    // 11革命时：点数逆转 + 只能打10或以下
    IF card.isJoker THEN
        RETURN HIGHEST_RANK  // 鬼牌仍然最大
    END IF
    
    // 使用逆转后的排名
    reversedRank = CARD_RANKS_REVOLUTION.indexOf(card.rank)
    
    // 但只能打10或以下的牌（10的索引在逆转数组中是4）
    // CARD_RANKS_REVOLUTION = [2, A, K, Q, J, 10, 9, 8, 7, 6, 5, 4, 3]
    // 10在逆转数组中的索引是5
    IF CARD_RANKS_NORMAL.indexOf(card.rank) > 7 THEN  // 原数组中10的索引是7
        RETURN INVALID  // J、Q、K、A、2不能打
    END IF
    
    RETURN reversedRank
END FUNCTION

FUNCTION containsJack(cards: Array<Card>) -> Boolean:
    FOR EACH card IN cards:
        IF card.rank == J THEN RETURN true
    END FOR
    RETURN false
END FUNCTION

// ========== 革命 ==========
FUNCTION triggerRevolution(cards: Array<Card>):
    // 大革命状态下不能发动普通革命
    IF isGreatRevolution THEN
        RETURN
    END IF

    isRevolution = NOT isRevolution

    IF isRevolution THEN
        announce("革命发动！点数大小逆转！")
    ELSE
        announce("反革命！点数恢复正常！")
    END IF

    // 回合结束
    leadPlayer = currentPlayer
    lastPlay = null
    endCurrentRound()
END FUNCTION

FUNCTION canTriggerRevolution(player: Player, cards: Array<Card>) -> Boolean:
    // 大富豪及以上阶级不能发动革命/反革命
    // 包括：大富豪、皇帝、教皇
    IF player.rank == DAIFUGO OR player.rank == EMPEROR OR player.rank == POPE THEN
        RETURN false
    END IF

    // 大革命状态下不能反革命
    IF isGreatRevolution THEN
        RETURN false
    END IF

    // 4张或5张相同牌，或4张及以上阶梯
    isQuadOrQuint = (cards.length == 4 OR cards.length == 5) AND allSameRank(cards)
    isStairs4Plus = isStairs(cards) AND cards.length >= 4

    IF NOT (isQuadOrQuint OR isStairs4Plus) THEN
        RETURN false
    END IF

    // 检查是否对应之前打出的张数与牌型（用于反革命）
    IF isRevolution AND lastPlay != null THEN
        // 反革命：需要对应之前打出的张数与牌型
        IF isQuadOrQuint AND lastPlay.cards.length == cards.length AND allSameRank(lastPlay.cards) THEN
            RETURN true
        END IF
        IF isStairs4Plus AND isStairs(lastPlay.cards) AND lastPlay.cards.length == cards.length THEN
            RETURN true
        END IF
        RETURN false
    END IF

    // 非革命状态，发动革命
    RETURN true
END FUNCTION

// ========== 大革命 ==========
FUNCTION triggerGreatRevolution(cards: Array<Card>):
    // 大富豪及以上阶级不能发动大革命
    // 包括：大富豪、皇帝、教皇
    IF currentPlayer.rank == DAIFUGO OR currentPlayer.rank == EMPEROR OR currentPlayer.rank == POPE THEN
        RETURN false
    END IF

    isGreatRevolution = true
    isRevolution = true

    announce("大革命发动！点数大小永久逆转！无法被反革命！")

    // 回合结束
    leadPlayer = currentPlayer
    lastPlay = null
    endCurrentRound()

    RETURN true
END FUNCTION

// ========== 鬼牌效果 ==========
FUNCTION processJokerEffect(cards: Array<Card>):
    // 单张鬼牌
    IF cards.length == 1 AND cards[0].isJoker THEN
        // 鬼牌成为该回合最大点数
        // 但出牌顺序之后的玩家可出黑桃3压过鬼牌
        // 该回合无条件结束，打出黑桃3的玩家成为新的主导者
        RETURN
    END IF
    
    // 鬼牌不单出时，可当作任意牌使用（百搭牌）
    IF cards.length > 1 THEN
        jokerAsWildCard(cards)
    END IF
END FUNCTION

FUNCTION checkSpade3CanBeatJoker(cards: Array<Card>) -> Boolean:
    // 检查是否可以通过黑桃3压过鬼牌
    // 仅当上一家打出单张鬼牌时有效
    IF lastPlay == null THEN RETURN false
    IF lastPlay.cards.length == 1 AND lastPlay.cards[0].isJoker THEN
        // 检查当前打出的牌是否包含黑桃3
        FOR EACH card IN cards:
            IF card.rank == 3 AND card.suit == SPADE THEN
                RETURN true
            END IF
        END FOR
    END IF
    RETURN false
END FUNCTION

// 鬼牌+2张及以上黑桃3压制多张鬼牌（使用2副牌时）
FUNCTION jokerThreeComboRule(cards: Array<Card>):
    IF useTwoDecks AND lastPlay.type IN [PAIR, TRIPLE, QUAD, QUINT, SEXTUPLE] THEN
        IF lastPlay.allCardsAreJokers() THEN
            jokerCount = countJokers(cards)
            threeCount = countThrees(cards)
            
            IF jokerCount >= 1 AND threeCount >= 2 THEN
                // 鬼牌+2张及以上黑桃3压制多张鬼牌成功
                leadPlayer = currentPlayer
                lastPlay = null
                endCurrentRound()
                RETURN true
            END IF
        END IF
    END IF
    RETURN false
END FUNCTION
```

## 10. 锁定机制

```
LOCK_STATE:
    isLocked: Boolean
    lockedSuit: String  // 只保留花色锁

FUNCTION checkLock(cards: Array<Card>):
    // 触发花色锁定：打出花色与前一位玩家相同（组合牌中一张相同即触发）
    IF lastPlay != null THEN
        IF hasAnySameSuit(cards, lastPlay.cards) THEN
            lockState = LockState(isLocked: true, lockedSuit: getMatchingSuit(cards, lastPlay.cards))
        END IF
    END IF
END FUNCTION

FUNCTION checkLockConstraint(cards: Array<Card>) -> Boolean:
    IF NOT lockState.isLocked THEN RETURN true
    
    // 只需包含一张花色相同的牌即可
    RETURN hasCardWithSuit(cards, lockState.lockedSuit)
END FUNCTION

FUNCTION hasAnySameSuit(cards: Array<Card>, lastCards: Array<Card>) -> Boolean:
    FOR EACH card IN cards:
        FOR EACH lastCard IN lastCards:
            IF card.suit == lastCard.suit AND NOT card.isJoker THEN
                RETURN true
            END IF
        END FOR
    END FOR
    RETURN false
END FUNCTION
```

## 11. 阶梯规则

```
FUNCTION validateStairs(cards: Array<Card>) -> Boolean:
    // 检查是否为连续数字
    IF cards.length < 3 THEN RETURN false
    
    // 按点数排序
    sortedCards = sortByRank(cards)
    
    // 检查连续性
    FOR i = 1 TO sortedCards.length - 1:
        IF sortedCards[i].rank != sortedCards[i-1].rank + 1 THEN
            RETURN false
        END IF
    END FOR
    
    // 检查花色（必须同花色）
    IF NOT allSameSuit(sortedCards) THEN
        RETURN false
    END IF
    
    RETURN true
END FUNCTION

// 二列阶梯（使用2副牌时的特殊牌型）
FUNCTION validateDoubleStairs(cards: Array<Card>) -> Boolean:
    // 需要至少6张牌（3对连续）
    IF cards.length < 6 OR cards.length MOD 2 != 0 THEN RETURN false
    
    // 按点数排序
    sortedCards = sortByRank(cards)
    
    // 检查是否为重复的阶梯（每两张相同点数）
    FOR i = 0 TO sortedCards.length - 1 STEP 2:
        // 检查相邻两张是否相同点数
        IF sortedCards[i].rank != sortedCards[i+1].rank THEN
            RETURN false
        END IF
        // 检查与下一对是否连续
        IF i + 2 < sortedCards.length THEN
            IF sortedCards[i].rank + 1 != sortedCards[i+2].rank THEN
                RETURN false
            END IF
        END IF
    END FOR
    
    // 检查花色（必须同花色）
    IF NOT allSameSuit(sortedCards) THEN
        RETURN false
    END IF
    
    RETURN true
END FUNCTION

FUNCTION compareStairs(current: Array<Card>, last: Array<Card>) -> Boolean:
    // 比较阶梯大小时只比较最大的一张
    currentMax = getMaxRank(current)
    lastMax = getMaxRank(last)
    
    RETURN currentMax > lastMax
END FUNCTION

FUNCTION compareDoubleStairs(current: Array<Card>, last: Array<Card>) -> Boolean:
    // 二列阶梯同理，只比较最大的一张
    currentMax = getMaxRank(current)
    lastMax = getMaxRank(last)
    
    RETURN currentMax > lastMax
END FUNCTION
```

## 12. 阶级系统

```
ENUM RANK:
    POPE         // 教皇（9人游戏第1名）
    EMPEROR      // 皇帝（9人游戏第2名）
    DAIFUGO      // 大富豪
    FUGO         // 富豪
    HEMIN        // 平民
    HINMIN       // 贫民
    DAIHINMIN    // 大贫民
    SLAVE        // 奴隶（9人游戏第8名）
    LIVESTOCK    // 家畜（9人游戏第9名）

FUNCTION assignRanks():
    finishOrder = getFinishOrder()  // 按出完牌顺序排列
    
    rankList = calculateRankList(players.length)
    
    FOR i = 0 TO finishOrder.length - 1:
        finishOrder[i].rank = rankList[i]
    END FOR
END FUNCTION

FUNCTION calculateRankList(playerCount: Integer) -> Array<Rank>:
    SWITCH playerCount:
        CASE 3: RETURN [FUGO, HEMIN, HINMIN]
        CASE 4: RETURN [DAIFUGO, FUGO, HEMIN, HINMIN]
        CASE 5: RETURN [DAIFUGO, FUGO, HEMIN, HINMIN, DAIHINMIN]
        CASE 6: RETURN [EMPEROR, DAIFUGO, FUGO, HEMIN, HINMIN, DAIHINMIN]
        CASE 7: RETURN [EMPEROR, DAIFUGO, FUGO, HEMIN, HINMIN, DAIHINMIN, SLAVE]
        CASE 8: RETURN [POPE, EMPEROR, DAIFUGO, FUGO, HEMIN, HINMIN, DAIHINMIN, SLAVE]
        CASE 9: RETURN [POPE, EMPEROR, DAIFUGO, FUGO, HEMIN, HINMIN, DAIHINMIN, SLAVE, LIVESTOCK]
        DEFAULT: RETURN generateExtendedRanks(playerCount)
    END SWITCH
END FUNCTION

// 通用阶级生成（人数减少时按两端向中间删减，优先删除序号小的）
FUNCTION generateExtendedRanks(playerCount: Integer) -> Array<Rank>:
    extendedRanks = [
        POPE,        // 教皇
        EMPEROR,     // 皇帝
        DAIFUGO,     // 大富豪
        FUGO,        // 富豪
        HEMIN,       // 平民
        HINMIN,      // 贫民
        DAIHINMIN,   // 大贫民
        SLAVE,       // 奴隶
        LIVESTOCK    // 家畜
    ]
    RETURN extendedRanks[0:playerCount]
END FUNCTION
```

## 13. 换牌规则（进贡）与出牌顺序

```
FUNCTION executeCardTradingAndSetPlayOrder():
    // 第二局开始前执行

    IF players.length == 3 THEN
        // 3人游戏：进贡与换牌A
        // 由系统抽出贫民手上最大的1张牌进贡给富豪
        // 进贡后，由系统抽出富豪手上点数最小的1张牌给贫民
        hinmin = getPlayerByRank(HINMIN)
        fugo = getPlayerByRank(FUGO)

        IF hinmin != null AND fugo != null THEN
            maxCard = getMaxCard(hinmin.hand)  // 贫民最大的1张牌进贡
            minCard = getMinCard(fugo.hand)    // 富豪最小的1张牌换给贫民

            transferCard(hinmin, fugo, maxCard)
            transferCard(fugo, hinmin, minCard)
        END IF

        // 3人出牌顺序：按阶级倒序出牌（如贫民最先，富豪最后）
        playOrder = getRankDescendingPlayOrder()

    ELSE
        // 4人及以上游戏：进贡与换牌B
        // 由系统抽出阶级序号最高玩家手上最大的2张牌进贡给阶级序号最低玩家
        // 由系统抽出阶级序号次高玩家手上最大的1张牌进贡给阶级序号次低玩家
        // 进贡后，由系统抽出阶级序号最低玩家手上点数最小的2张牌换给阶级序号最高玩家
        // 进贡后，由系统抽出阶级序号次低玩家手上点数最小的1张牌给阶级序号次高玩家

        // 阶级序号最高玩家（最后一名）进贡2张给阶级序号最低玩家（第一名）
        highestRankPlayer = getPlayerByRank(getHighestRank())  // 阶级序号最高 = 最后一名
        lowestRankPlayer = getPlayerByRank(getLowestRank())    // 阶级序号最低 = 第一名

        IF highestRankPlayer != null AND lowestRankPlayer != null THEN
            maxCards = getMaxCards(highestRankPlayer.hand, 2)  // 最大的2张牌进贡
            minCards = getMinCards(lowestRankPlayer.hand, 2)  // 最小的2张牌换给最高

            transferCards(highestRankPlayer, lowestRankPlayer, maxCards)
            transferCards(lowestRankPlayer, highestRankPlayer, minCards)
        END IF

        // 阶级序号次高玩家进贡1张给阶级序号次低玩家
        secondHighestRankPlayer = getPlayerByRank(getSecondHighestRank())
        secondLowestRankPlayer = getPlayerByRank(getSecondLowestRank())

        IF secondHighestRankPlayer != null AND secondLowestRankPlayer != null THEN
            maxCard = getMaxCard(secondHighestRankPlayer.hand)  // 最大的1张进贡
            minCard = getMinCard(secondLowestRankPlayer.hand)   // 最小的1张换给次高

            transferCard(secondHighestRankPlayer, secondLowestRankPlayer, maxCard)
            transferCard(secondLowestRankPlayer, secondHighestRankPlayer, minCard)
        END IF

        // 4人及以上出牌顺序：按阶级倒序出牌（如家畜最先，教皇最后）
        playOrder = getRankDescendingPlayOrder()
    END IF

    // 设置当前出牌顺序
    currentPlayerIndex = 0

    RETURN playOrder
END FUNCTION

FUNCTION getRankDescendingPlayOrder() -> Array<Player>:
    // 按阶级序号倒序排列（阶级序号最大的最先出牌）
    sortedPlayers = sortByRankDescending(players)
    RETURN sortedPlayers
END FUNCTION

FUNCTION getPlayerByRank(rank: Rank) -> Player:
    FOR EACH player IN players:
        IF player.rank == rank THEN
            RETURN player
        END IF
    END FOR
    RETURN null
END FUNCTION

FUNCTION getHighestRank() -> Rank:
    // 获取阶级序号最高的Rank（最后一名）
    playerCount = players.length
    rankList = calculateRankList(playerCount)
    RETURN rankList[playerCount - 1]
END FUNCTION

FUNCTION getLowestRank() -> Rank:
    // 获取阶级序号最低的Rank（第一名）
    playerCount = players.length
    rankList = calculateRankList(playerCount)
    RETURN rankList[0]
END FUNCTION

FUNCTION getSecondHighestRank() -> Rank:
    // 获取阶级序号次高的Rank（倒数第二名）
    playerCount = players.length
    rankList = calculateRankList(playerCount)
    IF playerCount >= 2 THEN
        RETURN rankList[playerCount - 2]
    END IF
    RETURN null
END FUNCTION

FUNCTION getSecondLowestRank() -> Rank:
    // 获取阶级序号次低的Rank（第二名）
    playerCount = players.length
    rankList = calculateRankList(playerCount)
    IF playerCount >= 2 THEN
        RETURN rankList[1]
    END IF
    RETURN null
END FUNCTION

FUNCTION getMaxCards(hand: Array<Card>, count: Integer) -> Array<Card>:
    sortedHand = sortByRankDescending(hand)
    RETURN sortedHand[0:count]
END FUNCTION

FUNCTION getMinCards(hand: Array<Card>, count: Integer) -> Array<Card>:
    sortedHand = sortByRankAscending(hand)
    RETURN sortedHand[0:count]
END FUNCTION

FUNCTION getMaxCard(hand: Array<Card>) -> Card:
    maxCard = hand[0]
    FOR EACH card IN hand:
        IF compareCards(card, maxCard) > 0 THEN
            maxCard = card
        END IF
    END FOR
    RETURN maxCard
END FUNCTION

FUNCTION getMinCard(hand: Array<Card>) -> Card:
    minCard = hand[0]
    FOR EACH card IN hand:
        IF compareCards(card, minCard) < 0 THEN
            minCard = card
        END IF
    END FOR
    RETURN minCard
END FUNCTION
```

## 14. 一落千丈规则

```
FUNCTION checkSuddenFall():
    // 大富豪未能再次获胜时立即降为大贫民
    previousDaifugo = getPreviousDaifugo()
    currentWinner = getCurrentWinner()  // 第一个出完牌的玩家
    
    IF previousDaifugo != null AND previousDaifugo != currentWinner THEN
        // 一落千丈
        previousDaifugo.rank = DAIHINMIN
        announce("一落千丈！" + previousDaifugo.name + "降为大贫民！")
        
        // 一直到他率先胜出之前都继续是大贫民
        previousDaifugo.suddenFallActive = true
    END IF
END FUNCTION

// 检查一落千丈状态是否解除
FUNCTION checkSuddenFallRelease(player: Player):
    IF player.suddenFallActive AND player == getCurrentWinner() THEN
        player.suddenFallActive = false
        announce(player.name + "解除一落千丈状态！")
    END IF
END FUNCTION
```

## 15. 惩罚规则

```
FUNCTION checkPunishment(player: Player, cards: Array<Card>):
    // 玩家出完牌时最后出的牌包含点数最大的牌，触发惩罚
    // 鬼牌、平常的2、(大)革命时的3 为最大点数
    
    lastCard = cards[cards.length - 1]  // 最后一张牌
    
    IF lastCard.isJoker THEN
        // 鬼牌是最大点数
        applyPunishment(player)
        RETURN
    END IF
    
    IF isRevolution OR isGreatRevolution THEN
        // (大)革命状态时，3是最大点数
        IF lastCard.rank == 3 THEN
            applyPunishment(player)
        END IF
    ELSE
        // 非革命状态时，2是最大点数
        IF lastCard.rank == 2 THEN
            applyPunishment(player)
        END IF
    END IF
END FUNCTION

FUNCTION applyPunishment(player: Player):
    // 检查是否有人触发了一落千丈
    IF suddenFallTriggered THEN
        // 有人触发了一落千丈，降为次低阶级
        player.nextGameRank = getSecondHighestRank()
        announce(player.name + " 触发惩罚！但因有人触发一落千丈，降为次低阶级！")
    ELSE
        // 正常情况，降为最低阶级
        player.nextGameRank = getHighestRank()
        announce(player.name + " 触发惩罚！下一局降为最低阶级！")
    END IF
END FUNCTION

FUNCTION getHighestRank() -> Rank:
    // 获取阶级序号最高的Rank（最后一名/最低级）
    playerCount = players.length
    rankList = calculateRankList(playerCount)
    RETURN rankList[playerCount - 1]
END FUNCTION

FUNCTION getSecondHighestRank() -> Rank:
    // 获取阶级序号次高的Rank（倒数第二名）
    playerCount = players.length
    IF playerCount >= 2 THEN
        RETURN rankList[playerCount - 2]
    END IF
    RETURN getHighestRank()
END FUNCTION
```

## 16. 主游戏循环

```
FUNCTION mainGameLoop():
    // 初始化游戏
    initializeGame(playerCount, roomOwner)
    
    roundNumber = 1
    
    WHILE NOT gameEnded:
        // 第一局不需要换牌
        IF roundNumber > 1 THEN
            // 执行换牌（进贡）
            executeCardTrading()
            
            // 确定主导者：按阶级倒序出牌（最低阶级先出）
            leadPlayer = getLowestRankPlayer()
        END IF
        
        // 进行一局游戏
        playGame()
        
        // 分配阶级
        assignRanks()
        
        // 检查一落千丈
        checkSuddenFall()
        
        // 检查游戏是否结束
        IF checkGameEnd() THEN
            gameEnded = true
        ELSE
            // 询问是否继续
            IF roomOwner.wantsToContinue() THEN
                roundNumber++
                resetForNewRound()
            ELSE
                gameEnded = true
            END IF
        END IF
    END WHILE
    
    announceFinalResults()
END FUNCTION

FUNCTION playGame():
    WHILE playersWithCards() > 1:
        playRound()
    END WHILE
END FUNCTION

FUNCTION getLowestRankPlayer() -> Player:
    lowestRank = getLowestRank(players)
    FOR EACH player IN players:
        IF player.rank == lowestRank THEN
            RETURN player
        END IF
    END FOR
    RETURN players[0]
END FUNCTION

FUNCTION getLowestRank(players: Array<Player>) -> Rank:
    rankOrder = [LIVESTOCK, SLAVE, DAIHINMIN, HINMIN, HEMIN, FUGO, DAIFUGO, EMPEROR, POPE]
    FOR EACH rank IN rankOrder:
        FOR EACH player IN players:
            IF player.rank == rank THEN
                RETURN rank
            END IF
        END FOR
    END FOR
    RETURN HEMIN
END FUNCTION
```

## 17. 辅助函数

```
FUNCTION allSameRank(cards: Array<Card>) -> Boolean:
    IF cards.length == 0 THEN RETURN false
    firstRank = cards[0].rank
    FOR EACH card IN cards:
        IF card.rank != firstRank THEN RETURN false
    END FOR
    RETURN true
END FUNCTION

FUNCTION allSameSuit(cards: Array<Card>) -> Boolean:
    IF cards.length == 0 THEN RETURN false
    firstSuit = cards[0].suit
    FOR EACH card IN cards:
        IF card.suit != firstSuit THEN RETURN false
    END FOR
    RETURN true
END FUNCTION

FUNCTION compareCards(card1: Card, card2: Card) -> Integer:
    rank1 = card1.getEffectiveRank(isRevolution, isGreatRevolution)
    rank2 = card2.getEffectiveRank(isRevolution, isGreatRevolution)
    
    IF rank1 > rank2 THEN RETURN 1
    IF rank1 < rank2 THEN RETURN -1
    RETURN 0
END FUNCTION

FUNCTION getNextPlayer(currentPlayer: Player) -> Player:
    currentIndex = players.indexOf(currentPlayer)
    nextIndex = (currentIndex + 1) MOD players.length
    
    // 跳过已出完牌的玩家
    WHILE players[nextIndex].hand.length == 0:
        nextIndex = (nextIndex + 1) MOD players.length
    END WHILE
    
    RETURN players[nextIndex]
END FUNCTION

FUNCTION getActivePlayerCount() -> Integer:
    count = 0
    FOR EACH player IN players:
        IF player.hand.length > 0 THEN
            count++
        END IF
    END FOR
    RETURN count
END FUNCTION

FUNCTION countJokers(cards: Array<Card>) -> Integer:
    count = 0
    FOR EACH card IN cards:
        IF card.isJoker THEN count++
    END FOR
    RETURN count
END FUNCTION

FUNCTION countThrees(cards: Array<Card>) -> Integer:
    count = 0
    FOR EACH card IN cards:
        IF card.rank == 3 AND card.suit == SPADE THEN count++
    END FOR
    RETURN count
END FUNCTION

## 17.5 一落千丈规则

```
FUNCTION checkOneThousandFeetFall():
    // 当阶级序号为1以外的玩家率先胜出时触发
    // 原阶级序号为1的玩家（第一名）的阶级立刻无条件降为阶级序号最大的阶级
    // 且一直到他率先胜出之前都继续是阶级序号最大的阶级

    firstFinisher = getFinishOrder()[0]

    // 查找原阶级序号为1的玩家（即上一局的第一名）
    originalTopPlayer = getPlayerByRank(getLowestRank())

    IF originalTopPlayer != null AND firstFinisher != originalTopPlayer THEN
        // 阶级序号为1以外的玩家率先胜出，触发一落千丈
        lowestRank = getHighestRank()  // 获取阶级序号最大的阶级

        // 原第一名降为阶级序号最大的阶级
        originalTopPlayer.rank = lowestRank
        // 标记一落千丈状态：一直到他率先胜出之前都继续是阶级序号最大的阶级
        originalTopPlayer.suddenFallActive = true

        announce("一落千丈！原第一名 " + originalTopPlayer.name + " 降级为 " + lowestRank)
    END IF
END FUNCTION

// 检查一落千丈状态是否解除
FUNCTION checkSuddenFallRelease(player: Player):
    // 当玩家率先胜出时，解除一落千丈状态
    IF player.suddenFallActive THEN
        player.suddenFallActive = false
        announce(player.name + " 解除一落千丈状态！")
    END IF
END FUNCTION

FUNCTION handlePlayerFinishes(player: Player):
    // 玩家出完牌时的处理

    // 记录完成顺序
    player.finishOrder = getNextFinishOrder()

    // 如果是第一个出完牌的玩家，检查一落千丈
    IF getActiveFinisherCount() == 0 THEN
        checkOneThousandFeetFall()
    ELSE
        // 检查是否解除一落千丈状态
        checkSuddenFallRelease(player)
    END IF

    // 继续处理剩余玩家
    // 该玩家打出的最后一张或一组牌照常计算，轮到下一顺位的玩家操作
END FUNCTION
```

## 18. 积分系统

```
FUNCTION calculateScores():
    // 按出完牌的先后顺序决定阶级称号
    // 序号最大的阶级（最后一名）积0分
    // 此外的阶级按序号递减逐级多积1分
    
    finishOrder = getFinishOrder()
    playerCount = finishOrder.length
    
    FOR i = 0 TO playerCount - 1:
        player = finishOrder[i]
        // 第i名（0-based）的分数 = (playerCount - 1) - i
        // 第一名得最高分，最后一名得0分
        player.score = playerCount - 1 - i
    END FOR
END FUNCTION

FUNCTION getTotalScores() -> Array<PlayerScore>:
    scores = []
    FOR EACH player IN players:
        scores.append(PlayerScore(player: player, totalScore: player.totalScore))
    END FOR
    RETURN sortByScoreDescending(scores)
END FUNCTION
```

## 19. 实现建议

1. 使用状态机管理游戏流程
2. 使用观察者模式处理事件通知
3. 使用策略模式处理不同的牌型验证
4. 使用工厂模式创建不同配置的游戏实例
5. Socket.io事件设计：
   - `game:join` - 加入游戏
   - `game:start` - 开始游戏
   - `game:play` - 出牌
   - `game:pass` - 跳过
   - `game:state` - 同步游戏状态
   - `game:trade` - 换牌阶段
   - `game:end` - 游戏结束
