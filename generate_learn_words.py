#!/usr/bin/env python3
"""
Generate word lists for Learn mode based on Shaw Imperial keyboard layout.
Progressive levels based on finger travel distance from home row.
"""

import json

# Shaw Imperial keyboard layout (ANSI US)
LAYOUT = {
    'number': '𐑶𐑬𐑫𐑜𐑖𐑗𐑙𐑘𐑡𐑔',  # 1-0 keys
    'qwerty': '𐑭𐑷𐑵𐑱𐑳𐑓𐑞𐑤𐑥𐑒𐑢𐑣𐑠',  # q to \ keys
    'home': '𐑪𐑨𐑦𐑩𐑧𐑐𐑯𐑑𐑮𐑕𐑛',  # a to ; keys (home row)
    'bottom': '𐑾𐑲𐑴𐑰𐑚𐑝𐑟'  # z to / keys
}

# Ligatures: compound letters formed by typing two characters
# Format: ligature -> (char1, char2)
LIGATURES = {
    '𐑼': ('𐑩', '𐑮'),  # ER ligature
    '𐑸': ('𐑭', '𐑮'),  # AR ligature
    '𐑹': ('𐑷', '𐑮'),  # OR ligature
    '𐑿': ('𐑘', '𐑵'),  # YEW ligature
    '𐑽': ('𐑾', '𐑮')   # AIR ligature
}

# Define progressive levels based on finger reach
# Each level adds more characters
LEARN_LEVELS = {
    1: {
        'name': 'Home Row Center',
        'chars': '𐑦𐑩𐑧𐑐𐑯𐑑',  # Middle 6 keys of home row
        'description': 'Middle fingers only, home row'
    },
    2: {
        'name': 'Full Home Row',
        'chars': '𐑪𐑨𐑦𐑩𐑧𐑐𐑯𐑑𐑮𐑕𐑛',  # All home row
        'description': 'All fingers, home row'
    },
    3: {
        'name': 'Index Finger Reach',
        'chars': '𐑪𐑨𐑦𐑩𐑧𐑐𐑯𐑑𐑮𐑕𐑛𐑓𐑒𐑝𐑚',  # Home + index reaches
        'description': 'Add index finger upper/lower reaches'
    },
    4: {
        'name': 'Upper & Lower Rows',
        'chars': '𐑪𐑨𐑦𐑩𐑧𐑐𐑯𐑑𐑮𐑕𐑛𐑓𐑒𐑝𐑚𐑱𐑳𐑞𐑤𐑥𐑾𐑲𐑴𐑰',  # Add more upper/lower
        'description': 'Extend to more keys above and below'
    },
    5: {
        'name': 'Almost Complete',
        'chars': '𐑪𐑨𐑦𐑩𐑧𐑐𐑯𐑑𐑮𐑕𐑛𐑓𐑒𐑝𐑚𐑱𐑳𐑞𐑤𐑥𐑾𐑲𐑴𐑰𐑭𐑷𐑵𐑢𐑣𐑟',  # Most keys
        'description': 'Add outer columns'
    },
    6: {
        'name': 'All Keys',
        'chars': '𐑪𐑨𐑦𐑩𐑧𐑐𐑯𐑑𐑮𐑕𐑛𐑓𐑒𐑝𐑚𐑱𐑳𐑞𐑤𐑥𐑾𐑲𐑴𐑰𐑭𐑷𐑵𐑢𐑣𐑟𐑶𐑬𐑫𐑜𐑖𐑗𐑙𐑘𐑡𐑔𐑠',  # All
        'description': 'Complete keyboard including number row'
    }
}


def expand_ligatures(word):
    """
    Expand ligatures in a word to their component characters.
    Returns the expanded form that would be typed.
    """
    expanded = word
    for ligature, (char1, char2) in LIGATURES.items():
        expanded = expanded.replace(ligature, char1 + char2)
    return expanded


def can_type_with_chars(word, available_chars):
    """
    Check if a word can be typed using only the available characters.
    Expands ligatures first.
    """
    expanded = expand_ligatures(word)
    return all(char in available_chars for char in expanded)


def generate_learn_word_lists(word_freq_file, output_file):
    """
    Generate word lists for each learning level.
    """
    # Load all words
    all_words = []
    with open(word_freq_file, 'r', encoding='utf-8') as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) >= 2:
                word = parts[0]
                all_words.append(word)
    
    print(f"Loaded {len(all_words)} words from frequency file")
    
    # Generate word lists for each level
    learn_words = {}
    
    for level_num, level_info in LEARN_LEVELS.items():
        available_chars = level_info['chars']
        level_words = []
        
        for word in all_words:
            if can_type_with_chars(word, available_chars):
                level_words.append(word)
        
        learn_words[str(level_num)] = {
            'name': level_info['name'],
            'description': level_info['description'],
            'chars': level_info['chars'],
            'words': level_words[:100]  # Limit to top 100 by frequency
        }
        
        print(f"Level {level_num} ({level_info['name']}): {len(level_words[:100])} words")
    
    # Save to JSON
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(learn_words, f, ensure_ascii=False, indent=2)
    
    print(f"\nLearn mode words saved to {output_file}")


if __name__ == '__main__':
    generate_learn_word_lists(
        'shavian-gb-word-frequencies.txt',
        'learn_words.json'
    )
