export function getOwnedCardStat(playerCard, card, stat) {
  if (stat === 'attack') {
    return Number(
      playerCard?.attack ??
        playerCard?.stage_base_attack ??
        card?.base_attack ??
        0
    );
  }

  if (stat === 'defense') {
    return Number(
      playerCard?.defense ??
        playerCard?.stage_base_defense ??
        card?.base_defense ??
        0
    );
  }

  if (stat === 'hp') {
    return Number(
      playerCard?.hp ??
        playerCard?.max_hp ??
        playerCard?.stage_base_hp ??
        card?.base_hp ??
        0
    );
  }

  return 0;
}

export function getOwnedCardStats(playerCard, card) {
  const attack = getOwnedCardStat(playerCard, card, 'attack');
  const defense = getOwnedCardStat(playerCard, card, 'defense');
  const hp = getOwnedCardStat(playerCard, card, 'hp');

  return {
    attack,
    defense,
    hp,
    total: attack + defense + hp,
  };
}