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

# Shaw 2-layer (shift) keyboard layout (no number row)
# Base layer
LAYOUT_2LAYER_BASE = {
    'qwerty': '𐑵𐑧𐑨𐑭𐑬𐑝𐑢𐑞𐑣',  # q to p keys (minus punctuation)
    'home': '𐑤𐑦𐑩𐑯𐑷𐑖𐑑𐑕𐑒𐑐',  # a to ; keys
    'bottom': '𐑪𐑳𐑼𐑴𐑗'  # z to m keys (minus punctuation)
}

# Shift layer
LAYOUT_2LAYER_SHIFT = {
    'qwerty': '𐑿𐑱𐑲𐑸𐑶𐑓𐑘𐑔𐑙',  # q to p keys (shifted, minus punctuation)
    'home': '𐑮𐑰𐑾𐑥𐑹𐑠𐑛𐑟𐑜𐑚',  # a to ; keys (shifted)
    'bottom': '𐑺𐑻𐑽𐑫𐑡'  # z to m keys (shifted, minus punctuation)
}

# Combine both layers for Shaw 2-layer
LAYOUT_2LAYER = {
    'qwerty': LAYOUT_2LAYER_BASE['qwerty'] + LAYOUT_2LAYER_SHIFT['qwerty'],
    'home': LAYOUT_2LAYER_BASE['home'] + LAYOUT_2LAYER_SHIFT['home'],
    'bottom': LAYOUT_2LAYER_BASE['bottom'] + LAYOUT_2LAYER_SHIFT['bottom']
}

# Shaw-JAFL keyboard layout (no number row)
# Base layer
LAYOUT_JAFL_BASE = {
    'qwerty': '𐑱𐑧𐑰𐑥𐑒𐑐𐑑𐑛𐑓',  # q to p keys (minus punctuation)
    'home': '𐑪𐑨𐑩𐑦𐑳𐑤𐑮𐑕𐑯𐑢',  # a to ; keys
    'bottom': '𐑲𐑴𐑞𐑟𐑣𐑝𐑚'  # z to m keys (minus punctuation)
}

# Shift layer
LAYOUT_JAFL_SHIFT = {
    'qwerty': '𐑬𐑹𐑸𐑿𐑜𐑗𐑡',  # q to p keys (shifted, minus punctuation)
    'home': '𐑷𐑭𐑩𐑵𐑫𐑮𐑖𐑙𐑘',  # a to ; keys (shifted, note 𐑩 appears in both)
    'bottom': '𐑶𐑔𐑠'  # z to m keys (shifted, minus punctuation)
}

# Combine both layers for Shaw-JAFL
LAYOUT_JAFL = {
    'qwerty': LAYOUT_JAFL_BASE['qwerty'] + LAYOUT_JAFL_SHIFT['qwerty'],
    'home': LAYOUT_JAFL_BASE['home'] + LAYOUT_JAFL_SHIFT['home'],
    'bottom': LAYOUT_JAFL_BASE['bottom'] + LAYOUT_JAFL_SHIFT['bottom']
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

# Define progressive levels for Shaw 2-layer (creative!)
LEARN_LEVELS_2LAYER = {
    1: {
        'name': 'Essential Phonemes',
        'chars': '𐑩𐑯𐑑𐑛𐑕𐑝𐑞𐑤𐑮',  # Most frequent sounds: schwa, n, t, d, s, v, th, l, r
        'description': 'Master the 9 most common sounds in English'
    },
    2: {
        'name': 'Vowel Voyage',
        'chars': '𐑩𐑯𐑑𐑛𐑕𐑝𐑞𐑤𐑮𐑦𐑧𐑨𐑪𐑳𐑴𐑵𐑬𐑭𐑷',  # Add vowels from base layer
        'description': 'Navigate through English vowel sounds'
    },
    3: {
        'name': 'Consonant Command',
        'chars': '𐑩𐑯𐑑𐑛𐑕𐑝𐑞𐑤𐑮𐑦𐑧𐑨𐑪𐑳𐑴𐑵𐑬𐑭𐑷𐑖𐑒𐑐𐑢𐑣𐑗',  # Add remaining base consonants
        'description': 'Build confidence with base layer consonants'
    },
    4: {
        'name': 'Ligature Power',
        'chars': '𐑩𐑯𐑑𐑛𐑕𐑝𐑞𐑤𐑮𐑦𐑧𐑨𐑪𐑳𐑴𐑵𐑬𐑭𐑷𐑖𐑒𐑐𐑢𐑣𐑗𐑼𐑸𐑹𐑽𐑺𐑻',  # Add ligatures from both layers
        'description': 'Harness the efficiency of compound letters'
    },
    5: {
        'name': 'Shift Mastery',
        'chars': '𐑩𐑯𐑑𐑛𐑕𐑝𐑞𐑤𐑮𐑦𐑧𐑨𐑪𐑳𐑴𐑵𐑬𐑭𐑷𐑖𐑒𐑐𐑢𐑣𐑗𐑼𐑸𐑹𐑽𐑺𐑻𐑿𐑱𐑲𐑰𐑾𐑶𐑓𐑘𐑔𐑙𐑥𐑠𐑜𐑚𐑟𐑫𐑡',  # Add most shift keys
        'description': 'Unlock the full potential of the shift layer'
    },
    6: {
        'name': 'Complete Control',
        'chars': '𐑩𐑯𐑑𐑛𐑕𐑝𐑞𐑤𐑮𐑦𐑧𐑨𐑪𐑳𐑴𐑵𐑬𐑭𐑷𐑖𐑒𐑐𐑢𐑣𐑗𐑼𐑸𐑹𐑽𐑺𐑻𐑿𐑱𐑲𐑰𐑾𐑶𐑓𐑘𐑔𐑙𐑥𐑠𐑜𐑚𐑟𐑫𐑡',  # All keys
        'description': 'Command every key with confidence'
    }
}

# Define progressive levels for Shaw-JAFL (creative!)
LEARN_LEVELS_JAFL = {
    1: {
        'name': 'Core Foundation',
        'chars': '𐑩𐑯𐑑𐑛𐑕𐑤𐑮𐑦𐑝𐑞',  # Most frequent letters available
        'description': 'Build your foundation with essential sounds'
    },
    2: {
        'name': 'Home Sweet Home',
        'chars': '𐑪𐑨𐑩𐑦𐑳𐑤𐑮𐑕𐑯𐑢',  # Full home row (base)
        'description': 'Master the comfort of the home row'
    },
    3: {
        'name': 'Upper Expedition',
        'chars': '𐑪𐑨𐑩𐑦𐑳𐑤𐑮𐑕𐑯𐑢𐑱𐑧𐑰𐑥𐑒𐑐𐑑𐑛𐑓',  # Add upper row (base)
        'description': 'Journey to the upper reaches of your keyboard'
    },
    4: {
        'name': 'Lower Exploration',
        'chars': '𐑪𐑨𐑩𐑦𐑳𐑤𐑮𐑕𐑯𐑢𐑱𐑧𐑰𐑥𐑒𐑐𐑑𐑛𐑓𐑲𐑴𐑞𐑟𐑣𐑝𐑚',  # Add lower row (base)
        'description': 'Explore the depths below home position'
    },
    5: {
        'name': 'Shift Introduction',
        'chars': '𐑪𐑨𐑩𐑦𐑳𐑤𐑮𐑕𐑯𐑢𐑱𐑧𐑰𐑥𐑒𐑐𐑑𐑛𐑓𐑲𐑴𐑞𐑟𐑣𐑝𐑚𐑷𐑭𐑵𐑫𐑖𐑙𐑘',  # Add common shift keys
        'description': 'Discover new dimensions with the shift key'
    },
    6: {
        'name': 'Master Typist',
        'chars': '𐑪𐑨𐑩𐑦𐑳𐑤𐑮𐑕𐑯𐑢𐑱𐑧𐑰𐑥𐑒𐑐𐑑𐑛𐑓𐑲𐑴𐑞𐑟𐑣𐑝𐑚𐑷𐑭𐑵𐑫𐑖𐑙𐑘𐑬𐑹𐑸𐑿𐑜𐑗𐑡𐑶𐑔𐑠',  # All keys
        'description': 'Achieve mastery over the complete keyboard'
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


def generate_learn_word_lists(word_freq_file, learn_levels, output_file, layout_name, use_ligatures=True, dialect='gb'):
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

    print(f"\n{layout_name} Layout ({dialect.upper()}):")
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


def generate_compound_letters_lesson(word_freq_file, available_chars, output_file, dialect='gb'):
    """
    Generate a special lesson focusing on words containing ligatures.
    """
    # Load all words
    all_words = []
    with open(word_freq_file, 'r', encoding='utf-8') as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) >= 2:
                word = parts[0]
                all_words.append(word)

    print(f"\nCompound Letters Lesson ({dialect.upper()}):")

    # Find words that contain ligatures
    ligature_words = []
    for word in all_words:
        for ligature in LIGATURES.keys():
            if ligature in word and can_type_with_chars(word, available_chars, use_ligatures=True):
                ligature_words.append(word)
                break

    lesson_data = {
        'name': 'Compound Letters',
        'description': 'Practice typing ligatures: 𐑼 𐑸 𐑹 𐑿 𐑽',
        'chars': available_chars,
        'words': ligature_words[:100]  # Top 100
    }

    print(f"  Found {len(ligature_words[:100])} words with ligatures")

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({'1': lesson_data}, f, ensure_ascii=False, indent=2)

    print(f"  Saved to {output_file}")


if __name__ == '__main__':
    # All imperial chars for compound letters lesson
    all_imperial_chars = ''.join([
        LAYOUT_IMPERIAL['number'],
        LAYOUT_IMPERIAL['qwerty'],
        LAYOUT_IMPERIAL['home'],
        LAYOUT_IMPERIAL['bottom']
    ])

    # Generate for both GB and US dialects
    for dialect in ['gb', 'us']:
        word_freq_file = f'shavian-{dialect}-word-frequencies.txt'

        print(f"\n{'='*60}")
        print(f"Generating word lists for {dialect.upper()} English")
        print(f"{'='*60}")

        # Generate for Shaw Imperial (with ligatures)
        generate_learn_word_lists(
            word_freq_file,
            LEARN_LEVELS_IMPERIAL,
            f'learn_words_imperial_{dialect}.json',
            'Shaw Imperial',
            use_ligatures=True,
            dialect=dialect
        )

        # Generate for Shaw Imperial (without ligatures)
        generate_learn_word_lists(
            word_freq_file,
            LEARN_LEVELS_IMPERIAL,
            f'learn_words_imperial_{dialect}_no_lig.json',
            'Shaw Imperial (No Ligatures)',
            use_ligatures=False,
            dialect=dialect
        )

        # Generate for Shaw QWERTY (no ligatures)
        generate_learn_word_lists(
            word_freq_file,
            LEARN_LEVELS_QWERTY,
            f'learn_words_qwerty_{dialect}.json',
            'Shaw QWERTY',
            use_ligatures=False,
            dialect=dialect
        )

        # Generate compound letters lesson (all Imperial keys)
        generate_compound_letters_lesson(
            word_freq_file,
            all_imperial_chars,
            f'learn_words_compound_{dialect}.json',
            dialect=dialect
        )

        # Generate for Shaw 2-layer (no ligature support - ligatures are direct keys)
        generate_learn_word_lists(
            word_freq_file,
            LEARN_LEVELS_2LAYER,
            f'learn_words_2layer_{dialect}.json',
            'Shaw 2-layer (shift)',
            use_ligatures=False,
            dialect=dialect
        )

        # Generate for Shaw-JAFL (with ligatures)
        generate_learn_word_lists(
            word_freq_file,
            LEARN_LEVELS_JAFL,
            f'learn_words_jafl_{dialect}.json',
            'Shaw-JAFL',
            use_ligatures=True,
            dialect=dialect
        )

        # Generate for Shaw-JAFL (without ligatures)
        generate_learn_word_lists(
            word_freq_file,
            LEARN_LEVELS_JAFL,
            f'learn_words_jafl_{dialect}_no_lig.json',
            'Shaw-JAFL (No Ligatures)',
            use_ligatures=False,
            dialect=dialect
        )
