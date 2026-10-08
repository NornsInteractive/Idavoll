import { AIProvider } from './types';

export class LocalFallbackAIProvider implements AIProvider {
  private fallbackWords: Record<string, string[]> = {
    fruits: ['西瓜', '苹果', '香蕉', '草莓', '葡萄', '柠檬', '菠萝', '水蜜桃'],
    animals: ['小猫', '小狗', '大熊猫', '兔子', '长颈鹿', '企鹅', '海豚', '小松鼠'],
    items: ['雨伞', '眼镜', '耳机', '吉他', '茶杯', '自行车', '时钟', '书包'],
    daily: ['刷牙', '跑步', '做梦', '下棋', '拍照', '看电影', '做饭', '打篮球'],
  };

  async generateWordCandidates(category: string, difficulty: 'easy' | 'medium' | 'hard', count: number): Promise<string[]> {
    const list = this.fallbackWords[category] || this.fallbackWords.items;
    const shuffled = [...list].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  async generateHint(word: string, currentHintsGiven: number): Promise<string> {
    if (currentHintsGiven === 0) {
      return `字数: ${word.length} 个字`;
    }
    if (word.length >= 2) {
      return `第 1 个字以 "${word[0]}" 开头`;
    }
    return `包含提示: ${word[0]}`;
  }
}
