const adjectives = [
  'Brave', 'Bright', 'Calm', 'Cheerful', 'Clever', 'Cozy', 'Curious', 'Daring',
  'Dreamy', 'Eager', 'Fancy', 'Fearless', 'Friendly', 'Gentle', 'Happy', 'Jolly',
  'Kind', 'Lively', 'Lucky', 'Merry', 'Mighty', 'Nimble', 'Playful', 'Quick',
  'Quiet', 'Sleepy', 'Smiling', 'Sneaky', 'Snug', 'Sparkly', 'Speedy', 'Sunny',
  'Swift', 'Tiny', 'Witty', 'Bouncy', 'Charming', 'Dizzy', 'Peppy', 'Zesty',
];
const themes = [
  'Amber', 'Aqua', 'Azure', 'Berry', 'Blue', 'Cherry', 'Coral', 'Copper',
  'Crimson', 'Crystal', 'Dawn', 'Emerald', 'Golden', 'Hazel', 'Indigo', 'Jade',
  'Lemon', 'Lilac', 'Lunar', 'Maple', 'Mint', 'Moss', 'Neon', 'Olive',
  'Orchid', 'Peach', 'Pearl', 'Ruby', 'Silver', 'Solar', 'Violet', 'Winter',
];
const animals = [
  'Fox', 'Cat', 'Bear', 'Rabbit', 'Panda', 'Otter', 'Owl', 'Tiger',
  'Lion', 'Wolf', 'Deer', 'Moose', 'Koala', 'Seal', 'Dolphin', 'Whale',
  'Penguin', 'Puffin', 'Robin', 'Sparrow', 'Falcon', 'Eagle', 'Parrot', 'Toucan',
  'Swan', 'Duck', 'Goose', 'Peacock', 'Flamingo', 'Crane', 'Finch', 'Heron',
  'Frog', 'Turtle', 'Gecko', 'Iguana', 'Dragon', 'Phoenix', 'Unicorn', 'Badger',
  'Beaver', 'Squirrel', 'Hamster', 'Hedgehog', 'Raccoon', 'Lemur', 'Llama', 'Alpaca',
  'Horse', 'Pony', 'Donkey', 'Goat', 'Sheep', 'Yak', 'Bison', 'Buffalo',
  'Cheetah', 'Leopard', 'Panther', 'Lynx', 'Capybara', 'Marmot', 'Meerkat', 'Zebra',
];

export function generateRandomNickname(previous?: string): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const theme = themes[Math.floor(Math.random() * themes.length)];
  const animalIndex = Math.floor(Math.random() * animals.length);
  const nickname = adjective + theme + animals[animalIndex];
  return nickname === previous
    ? adjective + theme + animals[(animalIndex + 1) % animals.length]
    : nickname;
}
