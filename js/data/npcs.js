/**
 * NPC definitions.
 * Schema per data-model.md: id, name, dialog (string[]), questId (string | null),
 * spriteKey, x (tile), y (tile).
 */

const NPCS = {
  elder: {
    id: 'elder',
    name: 'Village Elder',
    dialog: [
      'Welcome, adventurer. Our village has been troubled by slimes lately.',
      'If you could defeat 3 of them, we would be forever grateful.',
      'Be careful out there — the wilderness is more dangerous than it looks.'
    ],
    questId: 'defeat_slimes',
    spriteKey: 'npc_elder',
    x: 24,
    y: 23
  },

  merchant: {
    id: 'merchant',
    name: 'Merchant',
    dialog: [
      'Greetings, traveler! I have wares if you have coin.',
      'Take a look around — I carry potions and equipment for adventurers.',
      'Stay safe on the road. Goblins have been spotted to the east.'
    ],
    questId: null,
    spriteKey: 'npc_merchant',
    x: 27,
    y: 24
  },

  scout: {
    id: 'scout',
    name: 'Forest Scout',
    dialog: [
      'Halt! The forest path ahead is crawling with wolves.',
      'I lost a precious amulet somewhere in the northern woods.',
      'Find it for me and I will reward you handsomely.'
    ],
    questId: 'find_amulet',
    spriteKey: 'npc_scout',
    x: 22,
    y: 30
  }
};

export default NPCS;
