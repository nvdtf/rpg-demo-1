/**
 * Quest definitions.
 * Schema per data-model.md: id, title, description, objectiveType
 * ("defeat" | "find_item" | "talk_to_npc"), targetId, targetCount,
 * rewardXp, rewardGold, rewardItemId (string | null).
 */

const QUESTS = {
  defeat_slimes: {
    id: 'defeat_slimes',
    title: 'Slime Trouble',
    description: 'The Village Elder asks you to defeat 3 slimes threatening the village.',
    objectiveType: 'defeat',
    targetId: 'slime',
    targetCount: 3,
    rewardXp: 80,
    rewardGold: 50,
    rewardItemId: 'iron_sword'
  },

  find_amulet: {
    id: 'find_amulet',
    title: 'The Lost Amulet',
    description: 'The Forest Scout lost a precious amulet somewhere in the northern woods. Find it and return it to her.',
    objectiveType: 'find_item',
    targetId: 'lost_amulet',
    targetCount: 1,
    rewardXp: 120,
    rewardGold: 75,
    rewardItemId: 'chain_mail'
  }
};

export default QUESTS;
