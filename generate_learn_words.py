#!/usr/bin/env python3
"""
Generate word lists for Learn mode based on Shavian keyboard layouts.
Progressive levels based on finger travel distance from home row.
"""

import json

# Shaw Imperial keyboard layout (ANSI US)
LAYOUT_IMPERIAL = {
    'number': '𐑶𐑬𐑫𐑜𐑖𐑗𐑙𐑘𐑡𐑔',  # 1-0 keys
    'qwerty': '𐑭𐑷𐑵𐑱𐑳𐑓𐑞𐑤𐑥𐑒𐑢𐑣𐑠',  # q to \ keys
    'home': '𐑪𐑨𐑦𐑩𐑧𐑐𐑯𐑑𐑮𐑕𐑛',  # a to ; keys (home row)
    'bottom': '𐑾𐑲𐑴𐑰𐑚𐑝𐑟'  # z to / keys
}

# Shaw QWERTY keyboard layout (no number row)
# Base layer (unshifted)
LAYOUT_QWERTY_BASE = {
    'qwerty': '𐑶𐑢𐑧𐑮𐑑𐑭𐑳𐑦𐑪𐑐',  # q to p keys
    'home': '𐑩𐑕𐑛𐑓𐑜𐑣𐑘𐑒𐑤',  # a to l keys (home row)
    'bottom': '𐑟𐑻𐑗𐑝𐑚𐑯𐑥'  # z to m keys
}

# Shift layer
LAYOUT_QWERTY_SHIFT = {
    'qwerty': '𐑬𐑾𐑱𐑸𐑔𐑷𐑫𐑰𐑴𐑹',  # q to p keys (shifted)
    'home': '𐑨𐑖𐑼𐑲·𐑞𐑡',  # a to l keys (shifted)
    'bottom': '𐑠𐑺𐑽𐑿⸰𐑙𐑵'  # z to m keys (shifted)
}

# Combine both layers for Shaw QWERTY
LAYOUT_QWERTY = {
    'qwerty': LAYOUT_QWERTY_BASE['qwerty'] + LAYOUT_QWERTY_SHIFT['qwerty'],
    'home': LAYOUT_QWERTY_BASE['home'] + LAYOUT_QWERTY_SHIFT['home'],
    'bottom': LAYOUT_QWERTY_BASE['bottom'] + LAYOUT_QWERTY_SHIFT['bottom']
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

# Define progressive levels for Shaw Imperial
LEARN_LEVELS_IMPERIAL = {
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

# Define progressive levels for Shaw QWERTY
LEARN_LEVELS_QWERTY = {
    1: {
        'name': 'Home Row Center',
        'chars': '𐑛𐑓𐑜𐑣𐑘𐑒',  # Middle 6 keys of home row
        'description': 'Middle fingers only, home row'
    },
    2: {
        'name': 'Full Home Row',
        'chars': '𐑩𐑕𐑛𐑓𐑜𐑣𐑘𐑒𐑤',  # All home row (base layer)
        'description': 'All fingers, home row (unshifted)'
    },
    3: {
        'name': 'Home Row + Shift',
        'chars': '𐑩𐑕𐑛𐑓𐑜𐑣𐑘𐑒𐑤𐑨𐑖𐑼𐑲·𐑞𐑡',  # Home row both layers
        'description': 'Home row with shift layer'
    },
    4: {
        'name': 'Add Upper Row',
        'chars': '𐑩𐑕𐑛𐑓𐑜𐑣𐑘𐑒𐑤𐑨𐑖𐑼𐑲·𐑞𐑡𐑧𐑮𐑑𐑦𐑪𐑱𐑸𐑔𐑰𐑴𐑹',  # Add upper row
        'description': 'Add upper row (both layers)'
    },
    5: {
        'name': 'Add Lower Row',
        'chars': '𐑩𐑕𐑛𐑓𐑜𐑣𐑘𐑒𐑤𐑨𐑖𐑼𐑲·𐑞𐑡𐑧𐑮𐑑𐑦𐑪𐑱𐑸𐑔𐑰𐑴𐑹𐑟𐑻𐑗𐑝𐑚𐑯𐑥𐑺𐑽𐑿𐑙𐑵',  # Add lower row
        'description': 'Add lower row (both layers)'
    },
    6: {
        'name': 'All Keys',
        'chars': '𐑩𐑕𐑛𐑓𐑜𐑣𐑘𐑒𐑤𐑨𐑖𐑼𐑲·𐑞𐑡𐑧𐑮𐑑𐑦𐑪𐑱𐑸𐑔𐑰𐑴𐑹𐑟𐑻𐑗𐑝𐑚𐑯𐑥𐑺𐑽𐑿𐑙𐑵𐑶𐑢𐑭𐑳𐑐𐑬𐑾𐑷𐑫𐑠⸰',  # All
        'description': 'Complete keyboard (all layers)'
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


def can_type_with_chars(word, available_chars, use_ligatures=True):
    """
    Check if a word can be typed using only the available characters.
    Expands ligatures first if use_ligatures is True.
    """
    if use_ligatures:
        expanded = expand_ligatures(word)
    else:
        expanded = word
    return all(char in available_chars for char in expanded)


def generate_learn_word_lists(word_freq_file, learn_levels, output_file, layout_name, use_ligatures=True):
    """
    Generate word lists for each learning level for a specific layout.
    """
    # Load all words
    all_words = []
    with open(word_freq_file, 'r', encoding='utf-8') as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) >= 2:
                word = parts[0]
                all_words.append(word)

    print(f"\n{layout_name} Layout:")
    print(f"Loaded {len(all_words)} words from frequency file")
    if use_ligatures:
        print(f"  Using ligature expansion")
    else:
        print(f"  No ligature expansion (raw characters only)")

    # Generate word lists for each level
    learn_words = {}

    for level_num, level_info in learn_levels.items():
        available_chars = level_info['chars']
        level_words = []

        for word in all_words:
            if can_type_with_chars(word, available_chars, use_ligatures):
                level_words.append(word)

        learn_words[str(level_num)] = {
            'name': level_info['name'],
            'description': level_info['description'],
            'chars': level_info['chars'],
            'words': level_words[:100]  # Limit to top 100 by frequency
        }

        print(f"  Level {level_num} ({level_info['name']}): {len(level_words[:100])} words")

    # Save to JSON
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(learn_words, f, ensure_ascii=False, indent=2)

    print(f"  Saved to {output_file}")


if __name__ == '__main__':
    # Generate for Shaw Imperial (with ligatures)
    generate_learn_word_lists(
        'shavian-gb-word-frequencies.txt',
        LEARN_LEVELS_IMPERIAL,
        'learn_words_imperial.json',
        'Shaw Imperial',
        use_ligatures=True
    )

    # Generate for Shaw QWERTY (no ligatures)
    generate_learn_word_lists(
        'shavian-gb-word-frequencies.txt',
        LEARN_LEVELS_QWERTY,
        'learn_words_qwerty.json',
        'Shaw QWERTY',
        use_ligatures=False
    )
