export interface WordEntry {
  word: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  hint: string;
}

export const WordBank: WordEntry[] = [
  // Fruits & Food
  { word: '西瓜', category: '水果食物', difficulty: 'easy', hint: '夏天常吃的大瓜' },
  { word: '苹果', category: '水果食物', difficulty: 'easy', hint: '红彤彤的水果' },
  { word: '香蕉', category: '水果食物', difficulty: 'easy', hint: '弯弯的黄色水果' },
  { word: '草莓', category: '水果食物', difficulty: 'easy', hint: '红色带芝麻点' },
  { word: '柠檬', category: '水果食物', difficulty: 'easy', hint: '酸溜溜的黄色水果' },
  { word: '汉堡包', category: '水果食物', difficulty: 'medium', hint: '两片面包夹肉' },
  { word: '冰淇淋', category: '水果食物', difficulty: 'easy', hint: '甜甜的冷饮' },
  { word: '珍珠奶茶', category: '水果食物', difficulty: 'medium', hint: '有嚼劲黑球的饮品' },

  // Animals
  { word: '小猫', category: '可爱动物', difficulty: 'easy', hint: '喵喵叫的宠物' },
  { word: '大熊猫', category: '可爱动物', difficulty: 'easy', hint: '国宝黑白相间' },
  { word: '企鹅', category: '可爱动物', difficulty: 'medium', hint: '南极走起路摇摇晃晃' },
  { word: '长颈鹿', category: '可爱动物', difficulty: 'medium', hint: '脖子特别长的动物' },
  { word: '袋鼠', category: '可爱动物', difficulty: 'medium', hint: '肚子上有育儿袋' },
  { word: '海豚', category: '可爱动物', difficulty: 'medium', hint: '在海洋里跳跃' },
  { word: '霸王龙', category: '可爱动物', difficulty: 'hard', hint: '史前巨兽小短手' },

  // Daily Items & Technology
  { word: '雨伞', category: '生活日常', difficulty: 'easy', hint: '下雨天撑开' },
  { word: '眼镜', category: '生活日常', difficulty: 'easy', hint: '戴在眼睛前' },
  { word: '吉他', category: '生活日常', difficulty: 'medium', hint: '弹奏六弦乐器' },
  { word: '自行车', category: '生活日常', difficulty: 'medium', hint: '两个轮子靠脚蹬' },
  { word: '无人机', category: '生活日常', difficulty: 'hard', hint: '空中飞行四旋翼' },
  { word: '智能手表', category: '生活日常', difficulty: 'medium', hint: '戴在手腕上的数码产品' },
  { word: '火箭', category: '生活日常', difficulty: 'medium', hint: '发射飞向太空' },
];

export function getRandomWordOptions(count = 3, difficulty?: 'easy' | 'medium' | 'hard'): WordEntry[] {
  let pool = WordBank;
  if (difficulty) {
    pool = pool.filter((w) => w.difficulty === difficulty);
  }
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}
